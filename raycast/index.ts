import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 3.0.0
export namespace Raycast {
    const logging = new Logging('Raycast');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
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
     * A callback function type for ray hits.
     */
    export type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => Promise<void> | void;

    /**
     * A callback function type for ray misses.
     */
    export type MissCallback = () => Promise<void> | void;

    /**
     * A callback object type for the `cast()` method. Must have Hit (Miss optional) or Miss (Hit optional).
     */
    export type Callbacks<T extends mod.Vector | Vector3> =
        | { onHit: HitCallback<T>; onMiss?: MissCallback }
        | { onHit?: HitCallback<T>; onMiss: MissCallback };

    const MAX_PLAYERS = 100;
    const GLOBAL_SLOT_INDEX = 100; // Slot index for player-less global raycasts
    const TOTAL_WORKER_SLOTS = 101; // 0..99 for players, 100 for global

    const QUEUE_CAPACITY = 512;
    const TIMEOUT_MS = 2_000;
    const SERVER_START_TIME = Date.now();

    const FLAG_IN_FLIGHT = 1 << 0;
    const FLAG_NATIVE_VECTOR = 1 << 1;
    const FLAG_PLAYER_CONNECTED = 1 << 2;

    // --- Circular Ring Buffer for Queued Requests (32-bit Float Coordinate Storage) ---
    let _queueHead = 0;
    let _queueTail = 0;
    let _queueCount = 0;

    const _queueStartX = new Float32Array(QUEUE_CAPACITY);
    const _queueStartY = new Float32Array(QUEUE_CAPACITY);
    const _queueStartZ = new Float32Array(QUEUE_CAPACITY);
    const _queueEndX = new Float32Array(QUEUE_CAPACITY);
    const _queueEndY = new Float32Array(QUEUE_CAPACITY);
    const _queueEndZ = new Float32Array(QUEUE_CAPACITY);
    const _queueFlags = new Uint8Array(QUEUE_CAPACITY);
    const _queueOnHit = new Array<HitCallback<mod.Vector | Vector3> | null>(QUEUE_CAPACITY);
    const _queueOnMiss = new Array<MissCallback | null>(QUEUE_CAPACITY);

    // --- In-Flight Worker Slots (0..99: player ID, 100: global) ---
    let _inFlightCount = 0;
    let _initializedPlayers = false;

    const _inFlightFlags = new Uint8Array(TOTAL_WORKER_SLOTS);
    const _inFlightOnHit = new Array<HitCallback<mod.Vector | Vector3> | null>(TOTAL_WORKER_SLOTS);
    const _inFlightOnMiss = new Array<MissCallback | null>(TOTAL_WORKER_SLOTS);
    const _inFlightTimestamp = new Uint32Array(TOTAL_WORKER_SLOTS);

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

    function _isNativeVector(slotIndex: number): boolean {
        return (_inFlightFlags[slotIndex] & FLAG_NATIVE_VECTOR) !== 0;
    }

    function _getSlotIndex(eventPlayer: mod.Player): number {
        try {
            const objId = mod.GetObjId(eventPlayer);
            return objId >= 0 && objId < MAX_PLAYERS ? objId : GLOBAL_SLOT_INDEX;
        } catch {
            return GLOBAL_SLOT_INDEX;
        }
    }

    Events.OngoingGlobal.subscribe(_handleOngoingGlobal);
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
        _clearFlag(slotIndex, FLAG_IN_FLIGHT | FLAG_NATIVE_VECTOR);
        _inFlightOnHit[slotIndex] = null;
        _inFlightOnMiss[slotIndex] = null;
        _inFlightTimestamp[slotIndex] = 0;

        if (_inFlightCount > 0) {
            --_inFlightCount;
        }
    }

    function _checkTimeouts(now: number): void {
        for (let i = 0; i < TOTAL_WORKER_SLOTS; ++i) {
            if (!_isInFlight(i)) continue;

            if (now - _inFlightTimestamp[i] <= TIMEOUT_MS) continue;

            const onMiss = _inFlightOnMiss[i];
            _freeSlot(i);

            if (onMiss) {
                CallbackHandler.invokeNoArgs(onMiss, logging);
            }
        }
    }

    function _tryDispatchSlot(slotIndex: number, player: mod.Player | null, now: number): boolean {
        if (_queueCount === 0) return false;

        const head = _queueHead;
        const startX = _queueStartX[head];
        const startY = _queueStartY[head];
        const startZ = _queueStartZ[head];
        const endX = _queueEndX[head];
        const endY = _queueEndY[head];
        const endZ = _queueEndZ[head];
        const flags = _queueFlags[head];
        const onHit = _queueOnHit[head];
        const onMiss = _queueOnMiss[head];

        const startVec = mod.CreateVector(startX, startY, startZ);
        const endVec = mod.CreateVector(endX, endY, endZ);

        try {
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

        _queueOnHit[head] = null;
        _queueOnMiss[head] = null;
        _queueHead = (_queueHead + 1) % QUEUE_CAPACITY;
        --_queueCount;

        _setFlag(slotIndex, FLAG_IN_FLIGHT | (flags & FLAG_NATIVE_VECTOR));
        _inFlightOnHit[slotIndex] = onHit;
        _inFlightOnMiss[slotIndex] = onMiss;
        _inFlightTimestamp[slotIndex] = now;
        ++_inFlightCount;

        return true;
    }

    function _handleOngoingGlobal(): void {
        const now = getUptime();

        if (_inFlightCount > 0) {
            _checkTimeouts(now);
        }

        if (_queueCount === 0) return;

        if (!_initializedPlayers) {
            _initConnectedPlayers();
        }

        // 1. Dispatch global player-less slot if idle
        if (!_isInFlight(GLOBAL_SLOT_INDEX)) {
            _tryDispatchSlot(GLOBAL_SLOT_INDEX, null, now);
        }

        // 2. Dispatch available player slots
        for (let playerId = 0; playerId < MAX_PLAYERS; ++playerId) {
            if (_queueCount === 0) break;

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

        const isNative = _isNativeVector(slotIndex);
        const onHit = _inFlightOnHit[slotIndex];

        _freeSlot(slotIndex);

        if (!onHit) return;

        if (isNative) {
            CallbackHandler.invoke(
                onHit as HitCallback<mod.Vector>,
                eventPoint,
                eventNormal,
                undefined,
                undefined,
                logging
            );
        } else {
            CallbackHandler.invoke(
                onHit as HitCallback<Vector3>,
                Vectors.toVector3(eventPoint),
                Vectors.toVector3(eventNormal),
                undefined,
                undefined,
                logging
            );
        }
    }

    function _handleMiss(eventPlayer: mod.Player): void {
        const slotIndex = _getSlotIndex(eventPlayer);

        if (!_isInFlight(slotIndex)) return;

        const onMiss = _inFlightOnMiss[slotIndex];

        _freeSlot(slotIndex);

        if (onMiss) {
            CallbackHandler.invokeNoArgs(onMiss, logging);
        }
    }

    export function cast(start: Vector3, end: Vector3, callbacks: Callbacks<Vector3>): void;

    export function cast(start: mod.Vector, end: mod.Vector, callbacks: Callbacks<mod.Vector>): void;

    /**
     * Casts a ray with specific callbacks. The callback vector types match the `start` and `end` vector types.
     * Requests are queued and dispatched across available worker slots (up to 1 ray per player + 1 global ray per tick).
     * Returns early (no-op) if neither `onHit` nor `onMiss` callback is provided, or if the raycast queue is full.
     * @param start - The start position of the ray.
     * @param end - The end position of the ray.
     * @param callbacks - The callbacks to be called.
     *   - `onHit`: The callback to be called when the ray hits a target.
     *   - `onMiss`: The callback to be called when the ray misses a target.
     */
    export function cast<T extends mod.Vector | Vector3>(start: T, end: T, callbacks: Callbacks<T>): void {
        if (typeof callbacks?.onHit !== 'function' && typeof callbacks?.onMiss !== 'function') {
            return;
        }

        if (_queueCount >= QUEUE_CAPACITY) {
            logging.log('Queue is full', Logging.LogLevel.Error);
            return;
        }

        const isV3 = Vectors.isVector3(start);
        let startX: number;
        let startY: number;
        let startZ: number;
        let endX: number;
        let endY: number;
        let endZ: number;

        if (isV3) {
            const s = start as Vector3;
            const e = end as Vector3;
            startX = s.x;
            startY = s.y;
            startZ = s.z;
            endX = e.x;
            endY = e.y;
            endZ = e.z;
        } else {
            const s = start as mod.Vector;
            const e = end as mod.Vector;
            startX = mod.XComponentOf(s);
            startY = mod.YComponentOf(s);
            startZ = mod.ZComponentOf(s);
            endX = mod.XComponentOf(e);
            endY = mod.YComponentOf(e);
            endZ = mod.ZComponentOf(e);
        }

        const tail = _queueTail;
        _queueStartX[tail] = startX;
        _queueStartY[tail] = startY;
        _queueStartZ[tail] = startZ;
        _queueEndX[tail] = endX;
        _queueEndY[tail] = endY;
        _queueEndZ[tail] = endZ;
        _queueFlags[tail] = isV3 ? 0 : FLAG_NATIVE_VECTOR;
        _queueOnHit[tail] = (callbacks.onHit as HitCallback<mod.Vector | Vector3>) ?? null;
        _queueOnMiss[tail] = callbacks.onMiss ?? null;

        _queueTail = (_queueTail + 1) % QUEUE_CAPACITY;
        ++_queueCount;
    }

    /**
     * Gets the number of currently queued raycast requests.
     * @returns The number of queued raycasts awaiting dispatch.
     */
    export function getPendingRayCount(): number {
        return _queueCount;
    }

    /**
     * Gets the number of currently in-flight raycast requests.
     * @returns The number of dispatched raycasts awaiting physics engine resolution.
     */
    export function getInFlightRayCount(): number {
        return _inFlightCount;
    }
}
