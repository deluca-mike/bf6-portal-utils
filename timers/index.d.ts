import { Logging } from '../logging/index.ts';
export declare class Timers {
    private static readonly _ACTIVE_IDS;
    private static _logging;
    private static _nextId;
    private static _executeTimeout;
    private static _executeInterval;
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
     * Schedules a one-time execution after the specified delay.
     * @param callback - The callback to execute.
     * @param ms - The delay in milliseconds.
     * @returns The timer ID.
     */
    static setTimeout(callback: () => Promise<void> | void, ms: number): number;
    /**
     * Schedules a repeated execution after the specified interval.
     * @param callback - The callback to execute.
     * @param ms - The interval in milliseconds.
     * @param immediate - If true, runs the callback immediately before the first wait period.
     * @returns The timer ID.
     */
    static setInterval(callback: () => Promise<void> | void, ms: number, immediate?: boolean): number;
    /**
     * Cancels a timeout (or interval). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    static clearTimeout(id: number | undefined | null): void;
    /**
     * Cancels an interval (or timeout). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    static clearInterval(id: number | undefined | null): void;
    /**
     * Cancels a timeout or interval. Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    static clear(id: number | undefined | null): void;
    /**
     * Returns the number of active timers.
     * @returns The number of active timers.
     */
    static getActiveTimerCount(): number;
}
export declare namespace Timers {
    const LogLevel: typeof Logging.LogLevel;
}
