import { Logging } from '../logging/index.ts';

// version 2.0.1
export class MultiClickDetector {
    private static _logging = new Logging('MCD');

    private static _detectors = new Map<number, Set<MultiClickDetector>>();

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    public static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        this._logging.setLogging(log, logLevel, includeError);
    }

    /**
     * Handles the ongoing player event for a player so it needs to be called in the `OngoingPlayer` event handler.
     * @param player - The player to handle the ongoing player event for.
     */
    public static handleOngoingPlayer(player: mod.Player): void {
        const detectors = MultiClickDetector._detectors.get(mod.GetObjId(player));

        if (!detectors) return;

        for (const detector of detectors) {
            detector._handleOngoing();
        }
    }

    /**
     * Prunes multi-click detectors associated to invalid players.
     * This can be called periodically or called in the `OnPlayerLeaveGame` event handler, to clean up.
     */
    public static pruneInvalidPlayers(): void {
        for (const [playerId, detectors] of MultiClickDetector._detectors.entries()) {
            const player = detectors.values().next().value?._player;

            if (player && mod.IsPlayerValid(player)) continue; // Valid player, skip.

            // Clear the Set to release references to detector instances before deleting the Map entry.
            detectors.clear();
            MultiClickDetector._detectors.delete(playerId);
        }
    }

    /**
     * Creates a new multi-click detector with specific options.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     * @param options.soldierState - The soldier state boolean to use for the multi-click detector.
     * @param options.windowMs - The window in milliseconds for a valid multi-click sequence.
     * @param options.requiredClicks - The number of clicks required to trigger a multi-click sequence.
     */
    public constructor(player: mod.Player, callback: () => Promise<void> | void, options?: MultiClickDetector.Options) {
        const playerId = mod.GetObjId(player);

        this._player = player;
        this._callback = callback;

        if (!MultiClickDetector._detectors.has(playerId)) {
            MultiClickDetector._detectors.set(playerId, new Set());
        }

        MultiClickDetector._detectors.get(playerId)!.add(this);

        if (!options) return;

        this._soldierState = options.soldierState ?? this._soldierState;
        this._window = options.windowMs ?? this._window;
        this._requiredClicks = options.requiredClicks ?? this._requiredClicks;
    }

    private _player: mod.Player;

    private _lastState = false;

    private _clickCount = 0;

    private _sequenceStartTime = 0;

    private _callback: () => Promise<void> | void;

    private _soldierState = mod.SoldierStateBool.IsInteracting;

    private _window = 1_000; // Time window in milliseconds for a valid multi-click sequence.

    private _requiredClicks = 3; // Number of clicks required to trigger a multi-click sequence.

    private _handleOngoing(): void {
        const currentState = mod.GetSoldierState(this._player, this._soldierState);

        if (currentState === this._lastState) return; // Fast exit for the vast majority of ticks.

        this._lastState = currentState;

        if (!currentState) return; // Return on a falling edge.

        const now = Date.now();

        // If the time window has passed, reset the sequence.
        if (this._clickCount > 0 && now - this._sequenceStartTime > this._window) {
            this._clickCount = 0;
        }

        if (this._clickCount === 0) {
            this._sequenceStartTime = now;
            this._clickCount = 1;

            return;
        }

        if (++this._clickCount !== this._requiredClicks) return;

        this._clickCount = 0; // Reset for next unique sequence.

        try {
            const result = this._callback();

            if (result instanceof Promise) {
                result.catch((error: unknown) => {
                    // Catch and log async callback errors to prevent unhandled promise rejections.
                    MultiClickDetector._logging.log(
                        'Error in async callback:',
                        MultiClickDetector.LogLevel.Error,
                        error
                    );
                });
            }
        } catch (error: unknown) {
            // Catch and log sync callback errors so the multi-click detector functionality can still run.
            MultiClickDetector._logging.log('Error in sync callback:', MultiClickDetector.LogLevel.Error, error);
        }
    }

    /**
     * Destroys the multi-click detector.
     */
    public destroy(): void {
        MultiClickDetector._detectors.get(mod.GetObjId(this._player))?.delete(this);
    }
}

export namespace MultiClickDetector {
    /**
     * The options for the multi-click detector.
     */
    export interface Options {
        /**
         * The soldier state boolean to use for the multi-click detector.
         */
        soldierState?: mod.SoldierStateBool;
        /**
         * The window in milliseconds for a valid multi-click sequence.
         */
        windowMs?: number;
        /**
         * The number of clicks required to trigger a multi-click sequence.
         */
        requiredClicks?: number;
    }

    /**
     * The log levels.
     */
    export const LogLevel = Logging.LogLevel;
}
