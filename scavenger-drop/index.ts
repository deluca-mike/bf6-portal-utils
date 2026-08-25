import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 2.0.0
export namespace ScavengerDrop {
    const logging = new Logging('SD');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * The options for a scavenger drop.
     */
    export interface Options {
        /**
         * The duration of the scavenger drop in milliseconds (clamped to positive integer range, max 2,147,483,647 ms).
         */
        duration?: number;
        /**
         * The interval at which to check for scavengers in milliseconds (clamped between 1 and 65,535 ms).
         */
        checkInterval?: number;
    }

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
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
     * Unique generation-encoded identifier for a Scavenger Drop.
     */
    export type DropID = number & { readonly __brand: 'DropID' };

    /**
     * Maximum check interval in milliseconds (unsigned 16-bit integer limit: 65,535 ms).
     */
    export const MAX_CHECK_INTERVAL_MS = 65_535;

    /**
     * Maximum drop duration in milliseconds (signed 32-bit integer limit: 2,147,483,647 ms).
     */
    export const MAX_DURATION_MS = 2_147_483_647;

    const MAX_DROPS = 128;
    const MAX_GENERATIONS = 65_535;
    const SERVER_START_TIME = Date.now();
    const GENERATION_MULTIPLIER = 10_000;
    const INVALID_INDEX = -1;

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME + 1;
    }

    const _generations = new Uint16Array(MAX_DROPS);
    const _expirationTimes = new Uint32Array(MAX_DROPS);
    const _checkIntervalMs = new Uint16Array(MAX_DROPS);

    /**
     * Intrusive link / next check time array:
     * - Free slot (!isInUse): Points to the next free slot on the intrusive free list (`_firstFree`).
     * - In-use slot (isInUse): Stores the next check timestamp in milliseconds uptime.
     */
    const _nextCheckTimes = new Int32Array(MAX_DROPS);

    for (let i = 0; i < MAX_DROPS - 1; ++i) {
        _nextCheckTimes[i] = i + 1;
    }

    _nextCheckTimes[MAX_DROPS - 1] = INVALID_INDEX;

    let _firstFree = 0;

    const _positions = new Array<mod.Vector | null>(MAX_DROPS).fill(null);
    const _callbacks = new Array<((player: mod.Player) => Promise<void> | void) | null>(MAX_DROPS).fill(null);

    let _activeDropCount = 0;

    Events.OngoingGlobal.subscribe(_handleOngoingGlobal);

    function _isInUse(index: number): boolean {
        return _expirationTimes[index] !== 0;
    }

    /**
     * Pops the next available slot from the intrusive free-list in O(1) time.
     * @returns The index of the allocated slot, or INVALID_INDEX if the pool is full.
     */
    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const index = _firstFree;
        _firstFree = _nextCheckTimes[index];
        _nextCheckTimes[index] = 0;

        return index;
    }

    /**
     * Resolves a public DropID to its internal slot index.
     * @param id - The public DropID.
     * @returns The internal slot index, or INVALID_INDEX if invalid or inactive.
     */
    function _resolveIndex(id: DropID): number {
        if (id < 0) return INVALID_INDEX;

        const index = id % GENERATION_MULTIPLIER;

        if (index >= MAX_DROPS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[index] !== expectedGen || !_isInUse(index)) return INVALID_INDEX;

        return index;
    }

    function _destroy(index: number): void {
        _expirationTimes[index] = 0;
        _positions[index] = null;
        _callbacks[index] = null;
        --_activeDropCount;

        if (_generations[index] < MAX_GENERATIONS) {
            ++_generations[index];
            _nextCheckTimes[index] = _firstFree;
            _firstFree = index;
        } else if (logging.willLog(LogLevel.Warning)) {
            logging.log(`Slot ${index} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    function _handleOngoingGlobal(): void {
        if (_activeDropCount === 0) return;

        const now = getUptime();

        for (let i = 0; i < MAX_DROPS; ++i) {
            if (!_isInUse(i)) continue;

            if (now >= _expirationTimes[i]) {
                const dropId = (i + GENERATION_MULTIPLIER * _generations[i]) as DropID;

                if (logging.willLog(LogLevel.Info)) {
                    logging.log(`Drop ${dropId} expired`, LogLevel.Info);
                }

                _destroy(i);
                continue;
            }

            if (now < _nextCheckTimes[i]) continue;

            const position = _positions[i];

            if (position === null) {
                _destroy(i);
                continue;
            }

            const closestPlayer = mod.ClosestPlayerTo(position);

            if (closestPlayer === undefined) {
                _nextCheckTimes[i] = now + 10 * _checkIntervalMs[i];
                continue;
            }

            const distance = mod.DistanceBetween(position, mod.GetObjectPosition(closestPlayer));

            if (distance > 2) {
                const factor = Math.min(10, Math.max(1, Math.floor(distance / 4)));
                _nextCheckTimes[i] = now + factor * _checkIntervalMs[i];
                continue;
            }

            const callback = _callbacks[i];
            const dropId = (i + GENERATION_MULTIPLIER * _generations[i]) as DropID;

            _destroy(i);

            CallbackHandler.invoke(callback, closestPlayer, undefined, undefined, undefined, logging);

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`P-${mod.GetObjId(closestPlayer)} found drop ${dropId}`, LogLevel.Info);
            }
        }
    }

    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param options - The options for the scavenger drop.
     * @returns A generational drop ID, or null if the pre-allocated drop pool is full.
     */
    export function create(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        options?: Options
    ): DropID | null {
        // Do this first to maximize the chances of the body still being valid and on the field.
        const position = mod.GetObjectPosition(body);

        const index = _allocateSlot();

        if (index === INVALID_INDEX) return null;

        const duration = Math.min(MAX_DURATION_MS, Math.max(0, options?.duration ?? 37_000)); // 37 seconds is how long a dead player's bag stays on the ground.
        const checkInterval = Math.min(MAX_CHECK_INTERVAL_MS, Math.max(1, options?.checkInterval ?? 200)); // 0.2 seconds between checks.
        const now = getUptime();

        _expirationTimes[index] = now + duration;
        _checkIntervalMs[index] = checkInterval;
        _nextCheckTimes[index] = now + checkInterval;
        _positions[index] = position;
        _callbacks[index] = onScavenge;
        ++_activeDropCount;

        const dropId = (index + GENERATION_MULTIPLIER * _generations[index]) as DropID;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(
                `Drop ${dropId} created on P-${mod.GetObjId(body)}'s body at ${Vectors.getVectorString(Vectors.toVector3(position))}`,
                LogLevel.Info
            );
        }

        return dropId;
    }

    /**
     * Stops/cancels an active scavenger drop by ID.
     * @param id - The drop ID returned by `create`.
     */
    export function stop(id: DropID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _destroy(index);

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Drop ${id} stopped`, LogLevel.Info);
        }
    }

    /**
     * Stops and cleans up all active scavenger drops.
     */
    export function stopAll(): void {
        for (let i = 0; i < MAX_DROPS; ++i) {
            if (_isInUse(i)) {
                _destroy(i);
            }
        }

        if (logging.willLog(LogLevel.Info)) {
            logging.log('All scavenger drops stopped', LogLevel.Info);
        }
    }

    /**
     * Checks if a drop ID is currently active.
     * @param id - The drop ID to check.
     * @returns True if the drop is active, false otherwise.
     */
    export function isActive(id: DropID): boolean {
        return _resolveIndex(id) !== INVALID_INDEX;
    }

    /**
     * Gets the number of currently active scavenger drops.
     * @returns The number of active drops.
     */
    export function getActiveDropCount(): number {
        return _activeDropCount;
    }
}
