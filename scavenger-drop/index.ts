import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { PlayerLocations } from '../player-locations/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 2.0.0
export namespace ScavengerDrop {
    const logging = new Logging('SD');

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
     * Unique generation-encoded identifier for a Scavenger Drop.
     */
    export type DropID = number & { readonly __brand: 'DropID' };

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

    const _scratchPos: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _generations = new Uint16Array(MAX_DROPS);
    const _expirationTimes = new Uint32Array(MAX_DROPS);

    /**
     * Intrusive free-list array:
     * - Free slot (!isInUse): Points to the next free slot on the intrusive free list (`_firstFree`), or `INVALID_INDEX` (-1).
     * - In-use slot (isInUse): Stored as `INVALID_INDEX` (-1).
     */
    const _freeList = new Int8Array(MAX_DROPS);
    const _handles = new Array<PlayerLocations.SphereHandle | null>(MAX_DROPS).fill(null);

    for (let i = 0; i < MAX_DROPS - 1; ++i) {
        _freeList[i] = i + 1;
    }

    _freeList[MAX_DROPS - 1] = INVALID_INDEX;

    let _firstFree = 0;
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
        _firstFree = _freeList[index];
        _freeList[index] = INVALID_INDEX;

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
        const handle = _handles[index];
        _handles[index] = null;

        if (handle !== null) {
            handle.unsubscribe();
        }

        --_activeDropCount;

        if (_generations[index] < MAX_GENERATIONS) {
            ++_generations[index];
            _freeList[index] = _firstFree;
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

            if (now < _expirationTimes[i]) continue;

            const dropId = (i + GENERATION_MULTIPLIER * _generations[i]) as DropID;

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Drop ${dropId} expired`, LogLevel.Info);
            }

            _destroy(i);
        }
    }

    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * Subscribes to `PlayerLocations.onSphere` for a 2-meter radius to reactively detect scavengers.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param duration - The duration of the scavenger drop in milliseconds (clamped to positive integer range, max 2,147,483,647 ms, default: 37,000 ms).
     * @returns A generational drop ID, or null if the pre-allocated drop pool is full or the player position is unavailable.
     */
    export function create(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        duration?: number
    ): DropID | null {
        PlayerLocations.initialize();

        const position = PlayerLocations.getPosition(body, _scratchPos);

        if (!position) return null;

        const index = _allocateSlot();

        if (index === INVALID_INDEX) return null;

        const currentGen = _generations[index];
        const dropDuration = Math.min(MAX_DURATION_MS, Math.max(0, duration ?? 37_000)); // 37 seconds is how long a dead player's bag stays on the ground.
        const now = getUptime();

        _expirationTimes[index] = now + dropDuration;
        ++_activeDropCount;

        const dropId = (index + GENERATION_MULTIPLIER * currentGen) as DropID;

        const handle = PlayerLocations.onSphere(position.x, position.y, position.z, 2, (scavenger) => {
            if (!_isInUse(index) || _generations[index] !== currentGen) return;

            _destroy(index);

            CallbackHandler.invoke(onScavenge, scavenger, undefined, undefined, undefined, logging, 'scavenger');

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`P-${mod.GetObjId(scavenger)} found drop ${dropId}`, LogLevel.Info);
            }
        });

        _handles[index] = handle;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(
                `Drop ${dropId} created on P-${mod.GetObjId(body)}'s body at ${Vectors.getVectorString(position)}`,
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
