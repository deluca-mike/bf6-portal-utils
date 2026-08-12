import { Logging } from '../logging/index.ts';
export declare namespace CallbackHandler {
    /**
     * Safely invokes a callback with no arguments that may be sync or async, catching and logging errors.
     * @param callback - The callback to invoke (may be undefined or null).
     * @param logging - Logging instance to use for error reporting.
     * @param context - Optional context for error messages.
     */
    function invokeNoArgs(
        callback: (() => Promise<void> | void) | null | undefined,
        logging: Logging,
        context?: string
    ): void;
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
    function invoke<T extends (...args: any[]) => Promise<void> | void>(
        callback: T | null | undefined,
        a: unknown,
        b: unknown,
        c: unknown,
        d: unknown,
        logging: Logging,
        context?: string
    ): void;
}
