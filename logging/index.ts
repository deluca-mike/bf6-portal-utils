// version: 1.1.1
export class Logging {
    constructor(tag: string) {
        this._tag = tag;
    }

    private _tag: string;

    private _logLevel: Logging.LogLevel = Logging.LogLevel.Info;

    private _includeRawError: boolean = false;

    private _logger?: (text: string, error?: unknown) => Promise<void> | void;

    private readonly _asyncErrorHandler = (loggingError: unknown): void => {
        // Catch and log async logger errors to prevent unhandled promise rejections.
        console.log(`<${this._tag}> Error in async logger:`, loggingError);
    };

    /**
     * Safely converts an error of unknown type to a string.
     * This method cannot throw - it will always return a string.
     * @param error - The error to convert to a string.
     * @returns The error as a string.
     */
    private static _safeErrorToString(error: unknown): string {
        try {
            if (error instanceof Error) {
                // Try to get the message, but handle cases where .message might throw.
                try {
                    return error.message || 'Error';
                } catch {
                    return 'Error (message unavailable)';
                }
            }
            // Try `String()` conversion, but handle cases where `toString()` might throw.
            try {
                return String(error);
            } catch {
                return '[Error object]';
            }
        } catch {
            // Ultimate fallback - this should never happen, but ensures we always return a string.
            return '[Unable to stringify error]';
        }
    }

    /**
     * Checks if a message with the given log level would actually be logged.
     * Use this to avoid building expensive log messages when logging is disabled or below the threshold.
     * @param logLevel - The log level to check.
     * @returns True if logging will occur, false otherwise.
     */
    public willLog(logLevel: Logging.LogLevel): boolean {
        return this._logger != null && logLevel >= this._logLevel;
    }

    /**
     * Logs a message with the given log level.
     * @param text - The text to log.
     * @param logLevel - The log level to use.
     * @param error - The error to include in the log.
     */
    public log(text: string, logLevel: Logging.LogLevel = Logging.LogLevel.Warning, error?: unknown): void {
        if (!this._logger || logLevel < this._logLevel) return;

        try {
            const errorText = this._includeRawError && error ? ` - Error: ${Logging._safeErrorToString(error)}` : '';

            const result = this._logger(`<${this._tag}> ${text}${errorText}`, error);

            if (result instanceof Promise) {
                result.catch(this._asyncErrorHandler);
            }
        } catch (logError: unknown) {
            // Catch and log sync logger errors so the logging functionality can still run.
            console.log(`<${this._tag}> Error in sync logger:`, logError);
        }
    }

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
    public setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        this._logger = log;
        this._logLevel = logLevel ?? Logging.LogLevel.Warning;
        this._includeRawError = includeRawError ?? false;
    }
}

export namespace Logging {
    /**
     * The log levels.
     */
    export enum LogLevel {
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
