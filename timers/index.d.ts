import { Logging } from '../logging/index.ts';
export declare namespace Timers {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * Unique generation-encoded identifier for a Timer.
     */
    type TimerID = number & {
        readonly __brand: 'TimerID';
    };
    /**
     * Maximum timer delay or interval in milliseconds (signed 32-bit integer limit: 2,147,483,647 ms).
     */
    const MAX_TIMER_DELAY_MS = 2147483647;
    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback - The callback to execute.
     * @param ms - The delay in milliseconds (clamped between 0 and 2,147,483,647 ms).
     * @returns The timer ID, or null if the pool is full.
     */
    function setTimeout(callback: () => Promise<void> | void, ms: number): TimerID | null;
    /**
     * Schedules a repeated execution after the specified interval.
     * @param callback - The callback to execute.
     * @param ms - The interval in milliseconds (clamped between 0 and 2,147,483,647 ms).
     * @param immediate - If true, runs the callback immediately.
     * @returns The timer ID, or null if the pool is full.
     */
    function setInterval(callback: () => Promise<void> | void, ms: number, immediate?: boolean): TimerID | null;
    /**
     * Cancels a timeout (or interval). Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    function clearTimeout(id: TimerID): void;
    /**
     * Cancels an interval (or timeout). Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    function clearInterval(id: TimerID): void;
    /**
     * Cancels a timeout or interval. Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    function clear(id: TimerID): void;
    /**
     * @param id The timer ID to check.
     * @returns True if the timer is active, false otherwise.
     */
    function isActive(id: TimerID): boolean;
    /**
     * @returns The number of active timers.
     */
    function getActiveTimerCount(): number;
}
