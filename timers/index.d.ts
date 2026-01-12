export declare class Timers {
    private static readonly _ACTIVE_IDS;
    private static _nextId;
    private static _logger?;
    private static _log;
    private static _executeTimeout;
    private static _executeInterval;
    static setLogging(log: (text: string) => void): void;
    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback Function to execute
     * @param ms Delay in milliseconds
     * @returns Timer ID
     */
    static setTimeout(callback: () => void, ms: number): number;
    /**
     * @param callback Function to execute
     * @param ms Interval in milliseconds
     * @param immediate If true, runs the callback immediately before the first wait period.
     */
    static setInterval(callback: () => void, ms: number, immediate?: boolean): number;
    /**
     * Cancels a timeout.
     * Silently ignores null, undefined, or invalid IDs.
     * @param id Timer ID
     */
    static clearTimeout(id: number | undefined | null): void;
    /**
     * Cancels an interval.
     * Silently ignores null, undefined, or invalid IDs.
     * @param id Timer ID
     */
    static clearInterval(id: number | undefined | null): void;
    private static _clear;
}
