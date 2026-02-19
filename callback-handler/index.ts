import { Logging } from '../logging/index.ts';

// version: 1.0.0
export namespace CallbackHandler {
    /**
     * Safely invokes a callback that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined).
     * @param args - Arguments to pass to the callback.
     * @param errorContext - Context for error messages.
     * @param logging - Logging instance to use for error reporting.
     * @param logLevel - Log level for error messages.
     */
    export function invoke<T extends (...args: any[]) => Promise<void> | void>(
        callback: T | undefined,
        args: Parameters<T>,
        errorContext: string,
        logging: Logging,
        logLevel: Logging.LogLevel = Logging.LogLevel.Error
    ): void {
        if (!callback) return;

        try {
            const result = callback(...args);

            if (result instanceof Promise) {
                result.catch((error: unknown) => {
                    // Catch and log async errors to prevent unhandled promise rejections.
                    logging.log(
                        `Error in async ${errorContext} ${callback.name ?? 'anonymous'} callback:`,
                        logLevel,
                        error
                    );
                });
            }
        } catch (error: unknown) {
            // Catch and log sync errors so the invoking code can still run.
            logging.log(`Error in sync ${errorContext} ${callback?.name ?? 'anonymous'} callback:`, logLevel, error);
        }
    }

    /**
     * Safely invokes a callback with no arguments that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined).
     * @param errorContext - Context for error messages.
     * @param logging - Logging instance to use for error reporting.
     * @param logLevel - Log level for error messages.
     */
    export function invokeNoArgs(
        callback: (() => Promise<void> | void) | undefined,
        errorContext: string,
        logging: Logging,
        logLevel: Logging.LogLevel = Logging.LogLevel.Error
    ): void {
        invoke(callback, [], errorContext, logging, logLevel);
    }
}
