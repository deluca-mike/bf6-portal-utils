import { Logging } from '../logging/index.ts';
export declare class ScavengerDrop {
    private static _logging;
    private static _nextDropId;
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
    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param options - The options for the scavenger drop.
     */
    constructor(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        options?: ScavengerDrop.Options
    );
    private _id;
    private _checkTickDown;
    private _intervalId;
    private _endTimeoutId;
    private clearTimers;
    private _check;
    private _expire;
    /**
     * Stops the scavenger drop.
     */
    stop(): void;
}
export declare namespace ScavengerDrop {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * The options for the ScavengerDrop instance.
     */
    interface Options {
        /**
         * The duration of the scavenger drop in milliseconds.
         */
        duration?: number;
        /**
         * The interval at which to check for scavengers in milliseconds.
         */
        checkInterval?: number;
    }
}
