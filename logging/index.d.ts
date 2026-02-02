export declare class Logging {
    constructor(tag: string);
    private _tag;
    private _logLevel;
    private _includeError;
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
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to attempt to include the runtime error, if any, as a string in the log.
     */
    setLogging(log?: (text: string) => Promise<void> | void, logLevel?: Logging.LogLevel, includeError?: boolean): void;
}
export declare namespace Logging {
    /**
     * The log levels.
     */
    enum LogLevel {
        Debug = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
    }
}
