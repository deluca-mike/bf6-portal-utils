import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 3.0.0
export namespace Raycast {
    const logging = new Logging('Raycast');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /**
     * A re-export of the `Vectors.Vector3` type.
     */
    export type Vector3 = Vectors.Vector3;

    /**
     * A callback function type for ray hits or misses.
     * @param hit - True if the ray struck geometry, false if missed or timed out.
     * @param hitPoint - The intersection point (defined when hit is true).
     * @param hitNormal - The surface normal at the intersection (defined when hit is true).
     */
    export type RaycastCallback = (hit: boolean, hitPoint?: Vector3, hitNormal?: Vector3) => Promise<void> | void;

    /**
     * Options for raycast dispatch and lifecycle management.
     */
    export interface CastOptions {
        /** Request priority level (default: Priority.Standard). */
        priority?: Priority;
        /** Maximum age in server ticks before this request is automatically dropped if not yet dispatched. */
        maxAgeTicks?: number;
        /** Maximum age in milliseconds before this request is automatically dropped if not yet dispatched. */
        timeoutMs?: number;
    }

    /**
     * Unique generation-encoded identifier for an enqueued or in-flight raycast request.
     */
    export type RaycastID = number & { readonly __brand: 'RaycastID' };

    /**
     * Constant representing an invalid/unallocated RaycastID.
     */
    export const INVALID_RAYCAST_ID = -1 as RaycastID;

    /**
     * Priority levels for raycast requests.
     */
    export const enum Priority {
        /** Immediate player actions: weapon hitscans, grapple hooks, instant melee (front of queue). */
        Critical = 0,
        /** Time-sensitive simulation: dynamic physics collision sweeps, terrain probes, anti-tunneling. */
        Physics = 1,
        /** Default: general gameplay scripts, placement previews, custom trigger logic, line-of-sight. */
        Standard = 2,
        /** Low-urgency background tasks: distant AI perception, audio occlusion probes, cosmetic FX. */
        Ambient = 3,
    }

    const NUM_PRIORITIES = 4;
    const DEFAULT_PRIORITY = Priority.Standard;

    const MAX_PLAYERS = 100;
    const GLOBAL_SLOT_INDEX = 100; // Slot index for player-less global raycasts
    const TOTAL_WORKER_SLOTS = 101; // 0..99 for players, 100 for global

    const QUEUE_CAPACITY = 512;
    const TOTAL_QUEUE_ENTRIES = QUEUE_CAPACITY * NUM_PRIORITIES;
    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 10_000;
    const TIMEOUT_MS = 2_000;
    const SERVER_START_TIME = Date.now();

    const FLAG_IN_FLIGHT = 1 << 0;
    const FLAG_PLAYER_CONNECTED = 1 << 1;
    const FLAG_CANCELED = 1 << 2;

    // --- Circular Ring Buffers for 4 Priority Levels (32-bit Float Coordinate Storage) ---
    const _queueHead = new Uint16Array(NUM_PRIORITIES);
    const _queueTail = new Uint16Array(NUM_PRIORITIES);
    const _queueCount = new Uint16Array(NUM_PRIORITIES);
    let _totalQueueCount = 0;

    const _queueStartX = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueStartY = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueStartZ = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueEndX = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueEndY = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueEndZ = new Float32Array(TOTAL_QUEUE_ENTRIES);
    const _queueFlags = new Uint8Array(TOTAL_QUEUE_ENTRIES);
    const _queueGenerations = new Uint16Array(TOTAL_QUEUE_ENTRIES);
    const _queueExpiryTick = new Uint32Array(TOTAL_QUEUE_ENTRIES);
    const _queueExpiryTime = new Uint32Array(TOTAL_QUEUE_ENTRIES);
    const _queueCallback = new Array<RaycastCallback | null>(TOTAL_QUEUE_ENTRIES);

    // --- In-Flight Worker Slots (0..99: player ID, 100: global) ---
    let _inFlightCount = 0;
    let _initializedPlayers = false;
    let _currentTick = 0;

    const _inFlightFlags = new Uint8Array(TOTAL_WORKER_SLOTS);
    const _inFlightCallback = new Array<RaycastCallback | null>(TOTAL_WORKER_SLOTS);
    const _inFlightTimestamp = new Uint32Array(TOTAL_WORKER_SLOTS);
    const _inFlightRayIds = new Int32Array(TOTAL_WORKER_SLOTS).fill(INVALID_RAYCAST_ID);

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    function _setFlag(slotIndex: number, flag: number): void {
        _inFlightFlags[slotIndex] |= flag;
    }

    function _clearFlag(slotIndex: number, flag: number): void {
        _inFlightFlags[slotIndex] &= ~flag;
    }

    function _isInFlight(slotIndex: number): boolean {
        return (_inFlightFlags[slotIndex] & FLAG_IN_FLIGHT) !== 0;
    }

    function _isConnected(slotIndex: number): boolean {
        return (_inFlightFlags[slotIndex] & FLAG_PLAYER_CONNECTED) !== 0;
    }

    function _getSlotIndex(eventPlayer: mod.Player): number {
        try {
            const objId = mod.GetObjId(eventPlayer);
            return objId >= 0 && objId < MAX_PLAYERS ? objId : GLOBAL_SLOT_INDEX;
        } catch {
            return GLOBAL_SLOT_INDEX;
        }
    }

    // Subscribed to OnTickStart at priority Normal (0) to dispatch queued raycast requests to the engine
    // as early in the frame as possible, allowing ray hits/misses to be resolved promptly.
    Events.OnTickStart.subscribe(_handleOngoingGlobal);
    Events.OnRayCastHit.subscribe(_handleHit);
    Events.OnRayCastMissed.subscribe(_handleMiss);
    Events.OnPlayerJoinGame.subscribe(_handlePlayerJoin);
    Events.OnPlayerLeaveGame.subscribe(_handlePlayerLeave);

    function _handlePlayerJoin(player: mod.Player): void {
        const playerId = mod.GetObjId(player);

        if (playerId >= 0 && playerId < MAX_PLAYERS) {
            _setFlag(playerId, FLAG_PLAYER_CONNECTED);
        }
    }

    function _handlePlayerLeave(playerId: number): void {
        if (playerId >= 0 && playerId < MAX_PLAYERS) {
            _clearFlag(playerId, FLAG_PLAYER_CONNECTED);
        }
    }

    function _initConnectedPlayers(): void {
        _initializedPlayers = true;

        const all = mod.AllPlayers();
        const count = mod.CountOf(all);

        for (let i = 0; i < count; ++i) {
            const id = mod.GetObjId(mod.ValueInArray(all, i) as mod.Player);

            if (id >= 0 && id < MAX_PLAYERS) {
                _setFlag(id, FLAG_PLAYER_CONNECTED);
            }
        }
    }

    function _freeSlot(slotIndex: number): void {
        _clearFlag(slotIndex, FLAG_IN_FLIGHT | FLAG_CANCELED);
        _inFlightCallback[slotIndex] = null;
        _inFlightTimestamp[slotIndex] = 0;
        _inFlightRayIds[slotIndex] = INVALID_RAYCAST_ID;

        if (_inFlightCount > 0) {
            --_inFlightCount;
        }
    }

    function _dequeue(prio: number, head: number): void {
        _queueCallback[head] = null;
        _queueExpiryTick[head] = 0;
        _queueExpiryTime[head] = 0;
        _queueFlags[head] = 0;
        _queueHead[prio] = (_queueHead[prio] + 1) % QUEUE_CAPACITY;
        --_queueCount[prio];
        --_totalQueueCount;
    }

    function _getEntryIndex(id: RaycastID): number {
        if (typeof id !== 'number' || id <= 0) return -1;

        const entryIndex = id % GENERATION_MULTIPLIER;

        if (entryIndex < 0 || entryIndex >= TOTAL_QUEUE_ENTRIES) return -1;

        const expectedGen = (id - entryIndex) / GENERATION_MULTIPLIER - 1;

        if (expectedGen !== _queueGenerations[entryIndex]) return -1;

        return entryIndex;
    }

    function _checkTimeouts(now: number): void {
        for (let i = 0; i < TOTAL_WORKER_SLOTS; ++i) {
            if (!_isInFlight(i)) continue;

            if (now - _inFlightTimestamp[i] <= TIMEOUT_MS) continue;

            const callback = _inFlightCallback[i];
            const isCanceled = (_inFlightFlags[i] & FLAG_CANCELED) !== 0;
            _freeSlot(i);

            if (callback && !isCanceled) {
                CallbackHandler.invoke(callback, false, undefined, undefined, undefined, logging, 'timeout');
            }
        }
    }

    function _tryDispatchSlot(slotIndex: number, player: mod.Player | null, now: number): boolean {
        if (_totalQueueCount === 0) return false;

        let prio = 0;

        while (prio < NUM_PRIORITIES) {
            if (_queueCount[prio] === 0) {
                ++prio;
                continue;
            }

            const head = prio * QUEUE_CAPACITY + _queueHead[prio];
            const flags = _queueFlags[head];
            const callback = _queueCallback[head];

            // If ray was canceled while sitting in queue, discard without native dispatch
            if ((flags & FLAG_CANCELED) !== 0 || callback === null) {
                _dequeue(prio, head);
                continue;
            }

            // If ray exceeded its queue deadline, discard without native dispatch
            const expiryTick = _queueExpiryTick[head];
            const expiryTime = _queueExpiryTime[head];

            if ((expiryTick !== 0 && _currentTick > expiryTick) || (expiryTime !== 0 && now > expiryTime)) {
                _dequeue(prio, head);
                continue;
            }

            try {
                const startVec = mod.CreateVector(_queueStartX[head], _queueStartY[head], _queueStartZ[head]);
                const endVec = mod.CreateVector(_queueEndX[head], _queueEndY[head], _queueEndZ[head]);

                if (player !== null) {
                    mod.RayCast(player, startVec, endVec);
                } else {
                    mod.RayCast(startVec, endVec);
                }
            } catch (error: unknown) {
                logging.log(`Failed to dispatch raycast for slot ${slotIndex}`, Logging.LogLevel.Warning, error);

                if (player !== null) {
                    _clearFlag(slotIndex, FLAG_PLAYER_CONNECTED);
                }

                return false;
            }

            _dequeue(prio, head);

            _setFlag(slotIndex, FLAG_IN_FLIGHT);
            _inFlightCallback[slotIndex] = callback;
            _inFlightTimestamp[slotIndex] = now;
            _inFlightRayIds[slotIndex] = ((_queueGenerations[head] + 1) * GENERATION_MULTIPLIER + head) as RaycastID;
            ++_inFlightCount;

            return true;
        }

        return false;
    }

    function _handleOngoingGlobal(): void {
        ++_currentTick;
        const now = getUptime();

        if (_inFlightCount > 0) {
            _checkTimeouts(now);
        }

        if (_totalQueueCount === 0) return;

        if (!_initializedPlayers) {
            _initConnectedPlayers();
        }

        // 1. Dispatch global player-less slot if idle
        if (!_isInFlight(GLOBAL_SLOT_INDEX)) {
            _tryDispatchSlot(GLOBAL_SLOT_INDEX, null, now);
        }

        // 2. Dispatch available player slots
        for (let playerId = 0; playerId < MAX_PLAYERS; ++playerId) {
            if (_totalQueueCount === 0) break;

            if (!_isConnected(playerId) || _isInFlight(playerId)) continue;

            const player = mod.GetPlayer(playerId);

            if (player === undefined) {
                _clearFlag(playerId, FLAG_PLAYER_CONNECTED);
                continue;
            }

            _tryDispatchSlot(playerId, player, now);
        }
    }

    function _handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void {
        const slotIndex = _getSlotIndex(eventPlayer);

        if (!_isInFlight(slotIndex)) return;

        const isCanceled = (_inFlightFlags[slotIndex] & FLAG_CANCELED) !== 0;
        const callback = _inFlightCallback[slotIndex];

        _freeSlot(slotIndex);

        if (!callback || isCanceled) return;

        CallbackHandler.invoke(
            callback,
            true,
            Vectors.toVector3(eventPoint),
            Vectors.toVector3(eventNormal),
            undefined,
            logging,
            'callback'
        );
    }

    function _handleMiss(eventPlayer: mod.Player): void {
        const slotIndex = _getSlotIndex(eventPlayer);

        if (!_isInFlight(slotIndex)) return;

        const isCanceled = (_inFlightFlags[slotIndex] & FLAG_CANCELED) !== 0;
        const callback = _inFlightCallback[slotIndex];

        _freeSlot(slotIndex);

        if (!callback || isCanceled) return;

        CallbackHandler.invoke(callback, false, undefined, undefined, undefined, logging, 'callback');
    }

    /**
     * Casts a ray with a unified callback `(hit, hitPoint?, hitNormal?) => void`.
     * Requests are queued and dispatched across available worker slots strictly in priority order
     * (`Critical` -> `Physics` -> `Standard` -> `Ambient`).
     * @param start - The start position of the ray.
     * @param end - The end position of the ray.
     * @param callback - The callback invoked upon hit, miss, or timeout.
     * @param options - Optional priority level, maxAgeTicks, or timeoutMs.
     * @returns The unique RaycastID handle, or null if rejected.
     */
    export function cast(
        start: Vector3,
        end: Vector3,
        callback: RaycastCallback,
        options?: CastOptions
    ): RaycastID | null {
        const prio =
            options?.priority !== undefined &&
            options.priority >= Priority.Critical &&
            options.priority <= Priority.Ambient
                ? options.priority
                : DEFAULT_PRIORITY;

        if (_queueCount[prio] >= QUEUE_CAPACITY) {
            logging.log(`Queue for priority ${prio} is full`, Logging.LogLevel.Error);
            return null;
        }

        const tail = prio * QUEUE_CAPACITY + _queueTail[prio];
        _queueStartX[tail] = start.x;
        _queueStartY[tail] = start.y;
        _queueStartZ[tail] = start.z;
        _queueEndX[tail] = end.x;
        _queueEndY[tail] = end.y;
        _queueEndZ[tail] = end.z;
        _queueFlags[tail] = 0;
        _queueCallback[tail] = callback;

        _queueExpiryTick[tail] =
            options?.maxAgeTicks && options.maxAgeTicks > 0 ? _currentTick + options.maxAgeTicks : 0;

        _queueExpiryTime[tail] = options?.timeoutMs && options.timeoutMs > 0 ? getUptime() + options.timeoutMs : 0;

        if (_queueGenerations[tail] < MAX_GENERATIONS) {
            _queueGenerations[tail]++;
        } else {
            _queueGenerations[tail] = 0;
        }

        const id = ((_queueGenerations[tail] + 1) * GENERATION_MULTIPLIER + tail) as RaycastID;

        _queueTail[prio] = (_queueTail[prio] + 1) % QUEUE_CAPACITY;
        ++_queueCount[prio];
        ++_totalQueueCount;

        return id;
    }

    /**
     * Updates the start and end coordinates (and optional deadline options) of an enqueued raycast in-place.
     * Preserves the ray's priority position in the queue.
     * @param id - The RaycastID to update.
     * @param start - The new start coordinate vector.
     * @param end - The new end coordinate vector.
     * @param options - Optional updated timeout/expiry options (calculated relative to current tick/time).
     * @returns True if successfully updated in the queue, false if invalid, completed, or already in flight.
     */
    export function update(id: RaycastID, start: Vector3, end: Vector3, options?: CastOptions): boolean {
        const entryIndex = _getEntryIndex(id);

        if (entryIndex === -1) return false;

        // If already in flight on a worker slot, native engine execution cannot be altered
        for (let s = 0; s < TOTAL_WORKER_SLOTS; ++s) {
            if (_isInFlight(s) && _inFlightRayIds[s] === id) return false;
        }

        // Must be currently active in queue
        if (_queueCallback[entryIndex] === null || (_queueFlags[entryIndex] & FLAG_CANCELED) !== 0) return false;

        _queueStartX[entryIndex] = start.x;
        _queueStartY[entryIndex] = start.y;
        _queueStartZ[entryIndex] = start.z;
        _queueEndX[entryIndex] = end.x;
        _queueEndY[entryIndex] = end.y;
        _queueEndZ[entryIndex] = end.z;
        _queueFlags[entryIndex] = 0;

        if (options !== undefined) {
            if (options.maxAgeTicks !== undefined) {
                _queueExpiryTick[entryIndex] = options.maxAgeTicks > 0 ? _currentTick + options.maxAgeTicks : 0;
            }

            if (options.timeoutMs !== undefined) {
                _queueExpiryTime[entryIndex] = options.timeoutMs > 0 ? getUptime() + options.timeoutMs : 0;
            }
        }

        return true;
    }

    /**
     * Cancels an enqueued or in-flight raycast request.
     * If the ray is still in the queue, it is dropped so native `mod.RayCast` is skipped.
     * If the ray is already in-flight in the native engine, its callback is suppressed upon resolution.
     * @param id - The RaycastID to cancel.
     * @returns True if the raycast was successfully marked canceled, false if invalid or already completed.
     */
    export function cancel(id: RaycastID): boolean {
        const entryIndex = _getEntryIndex(id);

        if (entryIndex === -1) return false;

        // 1. Check if currently in-flight on a worker slot
        for (let s = 0; s < TOTAL_WORKER_SLOTS; ++s) {
            if (!_isInFlight(s) || _inFlightRayIds[s] !== id) continue;

            if ((_inFlightFlags[s] & FLAG_CANCELED) !== 0) return false;

            _setFlag(s, FLAG_CANCELED);
            _inFlightCallback[s] = null;

            return true;
        }

        // 2. Check if currently waiting in the queue
        if (_queueCallback[entryIndex] === null) return false;

        if ((_queueFlags[entryIndex] & FLAG_CANCELED) !== 0) return false;

        _queueFlags[entryIndex] |= FLAG_CANCELED;
        _queueCallback[entryIndex] = null;
        _queueExpiryTick[entryIndex] = 0;
        _queueExpiryTime[entryIndex] = 0;

        return true;
    }

    /**
     * Checks whether a RaycastID is currently active (either waiting in queue or in-flight on a worker slot).
     * Returns false if the request has completed, was canceled, expired, or was never allocated.
     * @param id - The RaycastID to query.
     * @returns True if active, false otherwise.
     */
    export function isActive(id: RaycastID): boolean {
        const entryIndex = _getEntryIndex(id);

        if (entryIndex === -1) return false;

        // 1. Check if currently in-flight on a worker slot
        for (let s = 0; s < TOTAL_WORKER_SLOTS; ++s) {
            if (_isInFlight(s) && _inFlightRayIds[s] === id) {
                return (_inFlightFlags[s] & FLAG_CANCELED) === 0;
            }
        }

        // 2. Check if active in queue (has callback, not canceled, and not expired)
        if (_queueCallback[entryIndex] === null || (_queueFlags[entryIndex] & FLAG_CANCELED) !== 0) {
            return false;
        }

        const expiryTick = _queueExpiryTick[entryIndex];
        const expiryTime = _queueExpiryTime[entryIndex];

        if ((expiryTick !== 0 && _currentTick > expiryTick) || (expiryTime !== 0 && getUptime() > expiryTime)) {
            return false;
        }

        return true;
    }

    /**
     * Gets the number of currently queued raycast requests (globally or for a specific priority).
     * @param priority - Optional priority level to query. If omitted, returns total across all priority levels.
     * @returns The number of queued raycasts awaiting dispatch.
     */
    export function getPendingRayCount(priority?: Priority): number {
        return priority === undefined
            ? _totalQueueCount
            : priority >= Priority.Critical && priority <= Priority.Ambient
              ? _queueCount[priority]
              : 0;
    }

    /**
     * Gets the number of currently in-flight raycast requests.
     * @returns The number of dispatched raycasts awaiting physics engine resolution.
     */
    export function getInFlightRayCount(): number {
        return _inFlightCount;
    }
}
