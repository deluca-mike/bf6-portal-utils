import { Logging } from '../logging/index.ts';
export declare class MultiClickDetector {
    private static _logging;
    private static _detectors;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    private static _handleOngoingPlayer;
    private static _handlePlayerDeployed;
    private static _handlePlayerUndeployed;
    private static _handlePlayerLeaveGame;
    /**
     * Creates a new multi-click detector with specific options.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     */
    constructor(player: mod.Player, callback: () => Promise<void> | void, options?: MultiClickDetector.Options);
    private _player;
    private _playerId;
    private _enabled;
    private _lastState;
    private _clickCount;
    private _sequenceStartTime;
    private _callback;
    private _soldierState;
    private _window;
    private _requiredClicks;
    private _handleOngoing;
    enable(): void;
    disable(): void;
    /**
     * Destroys the multi-click detector.
     */
    destroy(): void;
}
export declare namespace MultiClickDetector {
    /**
     * The options for the multi-click detector.
     */
    interface Options {
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
    const LogLevel: typeof Logging.LogLevel;
}
