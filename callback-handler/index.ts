import { Logging } from '../logging/index.ts';

// version: 2.0.0
export namespace CallbackHandler {
    function getCallbackNamePart(callback: ((...args: any[]) => unknown) | null | undefined): string {
        const callbackName = callback?.name;

        return !callbackName ? 'anonymous callback' : `${callbackName} callback`;
    }

    function getContextPart(context?: string): string {
        return !context ? '' : `${context} `;
    }

    /**
     * Safely invokes a callback with no arguments that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined or null).
     * @param logging - Logging instance to use for error reporting.
     * @param context - Optional context for error messages.
     */
    export function invokeNoArgs(
        callback: (() => Promise<void> | void) | null | undefined,
        logging: Logging,
        context?: string
    ): void {
        invoke(callback, undefined, undefined, undefined, undefined, logging, context);
    }

    /**
     * Safely invokes a callback directly without rest parameters or array allocations, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined or null).
     * @param a - First argument.
     * @param b - Second argument.
     * @param c - Third argument.
     * @param d - Fourth argument.
     * @param logging - Logging instance to use for error reporting.
     * @param context - Optional context for error messages.
     */
    export function invoke<T extends (...args: any[]) => Promise<void> | void>(
        callback: T | null | undefined,
        a: unknown,
        b: unknown,
        c: unknown,
        d: unknown,
        logging: Logging,
        context?: string
    ): void {
        if (!callback) return;

        try {
            const result = (callback as (a: unknown, b: unknown, c: unknown, d: unknown) => Promise<void> | void)(
                a,
                b,
                c,
                d
            );

            if (result instanceof Promise) {
                result.catch((error: unknown) => {
                    logging.log(
                        `Error in ${getContextPart(context)}async ${getCallbackNamePart(callback)}:`,
                        Logging.LogLevel.Error,
                        error
                    );
                });
            }
        } catch (error: unknown) {
            logging.log(
                `Error in ${getContextPart(context)}sync ${getCallbackNamePart(callback)}:`,
                Logging.LogLevel.Error,
                error
            );
        }
    }
}
