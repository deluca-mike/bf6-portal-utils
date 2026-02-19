// version: 1.0.2
export class Logging {
    constructor(tag: string) {
        this._tag = tag;
    }

    private _tag: string;

    private _logLevel: Logging.LogLevel = Logging.LogLevel.Info;

    private _includeError: boolean = false;

    private _logger?: (text: string) => Promise<void> | void;

    /**
     * Safely converts an error of unknown type to a string.
     * This method cannot throw - it will always return a string.
     * @param error - The error to convert to a string.
     * @returns The error as a string.
     */
    private _safeErrorToString(error: unknown): string {
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
        return this._logger !== undefined && logLevel >= this._logLevel;
    }

    public log(text: string, logLevel: Logging.LogLevel = Logging.LogLevel.Warning, error?: unknown): void {
        if (!this._logger || logLevel < this._logLevel) return;

        try {
            const errorText = this._includeError && error ? ` - Error: ${this._safeErrorToString(error)}` : '';
            const result = this._logger(`<${this._tag}> ${text}${errorText}`);

            if (result instanceof Promise) {
                result.catch((error) => {
                    // Catch and log async logger errors to prevent unhandled promise rejections.
                    console.log(`<${this._tag}> Error in async logger:`, error);
                });
            }
        } catch (error: unknown) {
            // Catch and log sync logger errors so the logging functionality can still run.
            console.log(`<${this._tag}> Error in sync logger:`, error);
        }
    }

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to attempt to include the runtime error, if any, as a string in the log.
     */
    public setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        this._logger = log;
        this._logLevel = logLevel ?? Logging.LogLevel.Warning;
        this._includeError = includeError ?? false;
    }
}

export namespace Logging {
    /**
     * The log levels.
     */
    export enum LogLevel {
        Debug = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
    }
}
