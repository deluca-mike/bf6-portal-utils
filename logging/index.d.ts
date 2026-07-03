export declare class Logging {
    constructor(tag: string);
    private _tag;
    private _logLevel;
    private _includeRawError;
    private _logger?;
    /**
     * Safely converts an error of unknown type to a string.
     * This method cannot throw - it will always return a string.
     * @param error - The error to convert to a string.
     * @returns The error as a string.
     */
    private _safeErrorToString;
    /**
     * Checks if a message with the given log level would actually be logged.
     * Use this to avoid building expensive log messages when logging is disabled or below the threshold.
     * @param logLevel - The log level to check.
     * @returns True if logging will occur, false otherwise.
     */
    willLog(logLevel: Logging.LogLevel): boolean;
    log(text: string, logLevel?: Logging.LogLevel, error?: unknown): void;
    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
}
export declare namespace Logging {
    /**
     * The log levels.
     */
    enum LogLevel {
        /**
         * Debug-level messages. Most verbose, typically used during development.
         */
        Debug = 0,
        /**
         * Informational messages. General operational information.
         */
        Info = 1,
        /**
         * Warning messages. Indicates potential issues or unexpected conditions.
         */
        Warning = 2,
        /**
         * Error messages. Indicates errors that need attention. Least verbose.
         */
        Error = 3,
    }
}
