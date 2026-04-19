import { Logging } from '../logging/index.ts';
export declare namespace PerformanceStats {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
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
     * Returns the value that is somewhat analogous to SFT when above 33m.
     * @returns The raw delta time between the last two ticks. Good for compute scaling.
     */
    function getSpotDeltaMs(): number;
    /**
     * Returns the value that is analogous to STR.
     * @returns The tick rate. Good for compute scaling.
     */
    function getSpotTickRate(): number;
    /**
     * @returns A normalized health factor from 0.0 to 1.0. Good for compute scaling.
     * 1.0 = Perfect 30Hz performance.
     * < 1.0 = Engine is bogged down, scale your compute back.
     */
    function getSpotHealthFactor(): number;
}
