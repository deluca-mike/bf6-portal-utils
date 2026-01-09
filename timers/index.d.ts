export declare class Timers {
    private static readonly _ACTIVE_IDS;
    private static _nextId;
    private static _logger?;
    private static _log;
    static setLogging(log: (text: string) => void): void;
    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback Function to execute
     * @param seconds Delay in seconds
     * @returns Timer ID
     */
    static setTimeout(callback: () => void, seconds: number): number;
    /**
     * @param callback Function to execute
     * @param seconds Interval in seconds
     * @param immediate If true, runs the callback immediately before the first wait period.
     */
    static setInterval(callback: () => void, seconds: number, immediate?: boolean): number;
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
