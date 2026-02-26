import { Logging } from '../logging/index.ts';
export declare namespace CallbackHandler {
    /**
     * Safely invokes a callback that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined).
     * @param args - Arguments to pass to the callback.
     * @param errorContext - Context for error messages.
     * @param logging - Logging instance to use for error reporting.
     * @param logLevel - Log level for error messages.
     */
    function invoke<T extends (...args: any[]) => Promise<void> | void>(
        callback: T | undefined,
        args: Parameters<T>,
        errorContext: string,
        logging: Logging,
        logLevel?: Logging.LogLevel
    ): void;
    /**
     * Safely invokes a callback with no arguments that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined).
     * @param errorContext - Context for error messages.
     * @param logging - Logging instance to use for error reporting.
     * @param logLevel - Log level for error messages.
     */
    function invokeNoArgs(
        callback: (() => Promise<void> | void) | undefined,
        errorContext: string,
        logging: Logging,
        logLevel?: Logging.LogLevel
    ): void;
}
