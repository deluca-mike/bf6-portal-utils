import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version 4.0.0
export namespace MultiClickDetector {
    /**
     * The log levels.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * The options for the multi-click detector.
     */
    export interface Options {
        /**
         * The soldier state boolean to use for the multi-click detector.
         */
        soldierState?: mod.SoldierStateBool;
        /**
         * The window in milliseconds for a valid multi-click sequence (clamped between 1 and 65,535 ms).
         */
        windowMs?: number;
        /**
         * The number of clicks required to trigger a multi-click sequence (clamped between 1 and 255).
         */
        requiredClicks?: number;
    }

    const logging = new Logging('MCD');

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
     * Unique generation-encoded identifier for a MultiClickDetector.
     */
    export type DetectorID = number & { readonly __brand: 'DetectorID' };

    /**
     * Maximum multi-click detection window in milliseconds (unsigned 16-bit integer limit: 65,535 ms).
     */
    export const MAX_WINDOW_MS = 65_535;

    /**
     * Maximum required clicks supported for a sequence (unsigned 8-bit integer limit: 255).
     */
    export const MAX_REQUIRED_CLICKS = 255;

    const MAX_DETECTORS = 300;
    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 10_000;
    const INVALID_INDEX = -1;
    const SERVER_START_TIME = Date.now();

    // Bits for flags
    const FLAG_IN_USE = 1 << 0;
    const FLAG_ENABLED = 1 << 1;
    const FLAG_PLAYER_DEPLOYED = 1 << 2;
    const FLAG_LAST_STATE = 1 << 3;

    const _generations = new Uint16Array(MAX_DETECTORS);
    const _flags = new Uint8Array(MAX_DETECTORS);
    const _playerIds = new Uint8Array(MAX_DETECTORS);
    const _players = new Array<mod.Player | null>(MAX_DETECTORS);
    const _callbacks = new Array<(() => Promise<void> | void) | null>(MAX_DETECTORS);
    const _clickCounts = new Uint8Array(MAX_DETECTORS);

    /**
     * Intrusive link / sequence start time array:
     * - Free slot (!FLAG_IN_USE): Points to the next free slot on the intrusive free list (`_firstFree`).
     * - In-use slot (FLAG_IN_USE): Stores the sequence start timestamp in milliseconds uptime.
     */
    const _sequenceStartTimes = new Int32Array(MAX_DETECTORS);

    for (let i = 0; i < MAX_DETECTORS - 1; ++i) {
        _sequenceStartTimes[i] = i + 1;
    }

    _sequenceStartTimes[MAX_DETECTORS - 1] = INVALID_INDEX;

    let _firstFree = 0;

    const _soldierStates = new Array<mod.SoldierStateBool | null>(MAX_DETECTORS);
    const _windows = new Uint16Array(MAX_DETECTORS);
    const _requiredClicks = new Uint8Array(MAX_DETECTORS);

    let _activeDetectorCount = 0;

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    function _isInUse(flags: number): boolean {
        return (flags & FLAG_IN_USE) !== 0;
    }

    function _isEnabled(flags: number): boolean {
        return (flags & FLAG_ENABLED) !== 0;
    }

    function _isPlayerDeployedFlag(flags: number): boolean {
        return (flags & FLAG_PLAYER_DEPLOYED) !== 0;
    }

    function _hasLastState(flags: number): boolean {
        return (flags & FLAG_LAST_STATE) !== 0;
    }

    function _setFlag(index: number, flag: number): void {
        _flags[index] |= flag;
    }

    function _clearFlag(index: number, flag: number): void {
        _flags[index] &= ~flag;
    }

    Events.OngoingGlobal.subscribe(_handleOngoingGlobal);
    Events.OnPlayerDeployed.subscribe(_handlePlayerDeployed);
    Events.OnPlayerUndeploy.subscribe(_handlePlayerUndeployed);
    Events.OnPlayerLeaveGame.subscribe(_handlePlayerLeaveGame);

    function _handleOngoingGlobal(): void {
        if (_activeDetectorCount === 0) return;

        const now = getUptime();

        for (let i = 0; i < MAX_DETECTORS; ++i) {
            const flags = _flags[i];

            if (!_isInUse(flags)) continue;
            if (!_isEnabled(flags)) continue;
            if (!_isPlayerDeployedFlag(flags)) continue;

            const currentState = mod.GetSoldierState(_players[i]!, _soldierStates[i]!);

            if (currentState === _hasLastState(flags)) continue;

            if (currentState) {
                _setFlag(i, FLAG_LAST_STATE);
            } else {
                _clearFlag(i, FLAG_LAST_STATE);
                continue; // Falling edge
            }

            if (_clickCounts[i] > 0 && now - _sequenceStartTimes[i] > _windows[i]) {
                _clickCounts[i] = 0;
            }

            if (_clickCounts[i] === 0) {
                _sequenceStartTimes[i] = now;
                _clickCounts[i] = 1;
            } else {
                ++_clickCounts[i];
            }

            if (_clickCounts[i] !== _requiredClicks[i]) continue;

            _clickCounts[i] = 0;

            CallbackHandler.invokeNoArgs(_callbacks[i], logging);

            if (logging.willLog(Logging.LogLevel.Info)) {
                logging.log(`P-${_playerIds[i]} performed sequence`, Logging.LogLevel.Info);
            }
        }
    }

    function _handlePlayerDeployed(player: mod.Player): void {
        const playerId = mod.GetObjId(player);

        for (let i = 0; i < MAX_DETECTORS; ++i) {
            if (_isInUse(_flags[i]) && _playerIds[i] === playerId) {
                _setFlag(i, FLAG_PLAYER_DEPLOYED);
            }
        }
    }

    function _handlePlayerUndeployed(player: mod.Player): void {
        const playerId = mod.GetObjId(player);

        for (let i = 0; i < MAX_DETECTORS; ++i) {
            if (_isInUse(_flags[i]) && _playerIds[i] === playerId) {
                _clearFlag(i, FLAG_PLAYER_DEPLOYED);
            }
        }
    }

    function _handlePlayerLeaveGame(playerId: number): void {
        for (let i = 0; i < MAX_DETECTORS; ++i) {
            if (_isInUse(_flags[i]) && _playerIds[i] === playerId) {
                _destroyInternal(i);
            }
        }

        logging.log(`P-${playerId} left the game: detectors cleaned up`, Logging.LogLevel.Warning);
    }

    function _isPlayerDeployed(player: mod.Player): boolean {
        // Need to try/catch since certain soldier state checks error for players that are not deployed.
        // TODO: Maybe change this to a "virtually zero" `mod.GetObjectPosition` check.
        try {
            return (
                mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive) ||
                mod.GetSoldierState(player, mod.SoldierStateBool.IsManDown)
            );
        } catch {
            return false;
        }
    }

    /**
     * Pops the next available slot from the intrusive free-list in O(1) time.
     * @returns The index of the allocated slot, or INVALID_INDEX if the pool is full.
     */
    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Pool is full', Logging.LogLevel.Error);
            return INVALID_INDEX;
        }

        const index = _firstFree;
        _firstFree = _sequenceStartTimes[index];
        _sequenceStartTimes[index] = 0;

        return index;
    }

    /**
     * Resolves a public DetectorID to its internal slot index.
     * @param id - The public DetectorID.
     * @returns The internal slot index, or INVALID_INDEX if invalid or inactive.
     */
    function _resolveIndex(id: DetectorID): number {
        if (id < 0) return INVALID_INDEX;

        const index = id % GENERATION_MULTIPLIER;

        if (index >= MAX_DETECTORS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[index] !== expectedGen || !_isInUse(_flags[index])) return INVALID_INDEX;

        return index;
    }

    function _destroyInternal(index: number): void {
        _flags[index] = 0;
        _players[index] = null;
        _callbacks[index] = null;
        _soldierStates[index] = null;
        --_activeDetectorCount;

        if (_generations[index] < MAX_GENERATIONS) {
            ++_generations[index];
            _sequenceStartTimes[index] = _firstFree;
            _firstFree = index;
        } else if (logging.willLog(Logging.LogLevel.Warning)) {
            logging.log(`Slot ${index} exhausted max generations and was retired`, Logging.LogLevel.Warning);
        }
    }

    /**
     * Creates a new multi-click detector for the specified player.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     * @returns The ID of the created multi-click detector, or null if the pool is full.
     */
    export function create(
        player: mod.Player,
        callback: () => Promise<void> | void,
        options?: Options
    ): DetectorID | null {
        const index = _allocateSlot();

        if (index === INVALID_INDEX) return null;

        const isDeployed = _isPlayerDeployed(player);

        _flags[index] = FLAG_IN_USE | FLAG_ENABLED | (isDeployed ? FLAG_PLAYER_DEPLOYED : 0);
        _playerIds[index] = mod.GetObjId(player);
        _players[index] = player;
        _callbacks[index] = callback;
        _clickCounts[index] = 0;
        _sequenceStartTimes[index] = 0;

        _soldierStates[index] = options?.soldierState ?? mod.SoldierStateBool.IsInteracting;
        _windows[index] = Math.min(MAX_WINDOW_MS, Math.max(1, options?.windowMs ?? 1000));
        _requiredClicks[index] = Math.min(MAX_REQUIRED_CLICKS, Math.max(1, options?.requiredClicks ?? 3));

        ++_activeDetectorCount;

        return (index + _generations[index] * GENERATION_MULTIPLIER) as DetectorID;
    }

    /**
     * Enables a detector.
     * @param id - The ID of the detector to enable.
     */
    export function enable(id: DetectorID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _setFlag(index, FLAG_ENABLED);
    }

    /**
     * Disables a detector.
     * @param id - The ID of the detector to disable.
     */
    export function disable(id: DetectorID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _clearFlag(index, FLAG_ENABLED);
    }

    /**
     * Destroys a detector.
     * @param id - The ID of the detector to destroy.
     */
    export function destroy(id: DetectorID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _destroyInternal(index);
    }

    /**
     * Checks if a detector ID is currently active.
     * @param id - The detector ID to check.
     * @returns True if the detector is active, false otherwise.
     */
    export function isActive(id: DetectorID): boolean {
        return _resolveIndex(id) !== INVALID_INDEX;
    }

    /**
     * Gets the number of currently active detectors.
     * @returns The number of active detectors.
     */
    export function getActiveDetectorCount(): number {
        return _activeDetectorCount;
    }
}
