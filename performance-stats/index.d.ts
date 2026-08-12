import { Logging } from '../logging/index.ts';
export declare namespace PerformanceStats {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
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
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * @returns The smoothed tick rate. Good/stable for UI display.
     */
    function getSmoothedTickRate(): number;
    /**
     * @returns The smoothed lag time. Good/stable for UI display.
     */
    function getSmoothedTimeoutLagMs(): number;
    /**
     * Returns the value that is somewhat analogous to SFT when above 33ms.
     * @returns The raw delta time between the last two ticks. Good for compute scaling.
     */
    function getSpotDeltaMs(): number;
    /**
     * Returns the value that is analogous to STR.
     * @returns The tick rate in Hz. Good for compute scaling.
     */
    function getSpotTickRate(): number;
    /**
     * @returns A normalized health factor from 0.0 to 1.0. Good for compute scaling.
     * 1.0 = Perfect 30Hz performance.
     * < 1.0 = Engine is bogged down, scale your compute back.
     */
    function getSpotHealthFactor(): number;
}
