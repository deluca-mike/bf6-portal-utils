import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';

// version: 1.2.0
export namespace Timers {
    const logging = new Logging('Timers');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    const ACTIVE_IDS = new Set<number>();

    let nextId: number = 1;

    async function executeTimeout(id: number, callback: () => Promise<void> | void, ms: number): Promise<void> {
        await Promise.resolve();
        await mod.Wait(ms / 1_000);

        if (!ACTIVE_IDS.has(id)) return; // Exit if the timer is no longer active.

        ACTIVE_IDS.delete(id); // Cleanup one-time timer.

        CallbackHandler.invokeNoArgs(callback, `timeout ${id}`, logging, LogLevel.Error);
    }

    async function executeInterval(
        id: number,
        callback: () => Promise<void> | void,
        ms: number,
        immediate: boolean
    ): Promise<void> {
        await Promise.resolve();

        // Skip the first wait if immediate is true.
        if (!immediate && ACTIVE_IDS.has(id)) {
            await mod.Wait(ms / 1_000);
        }

        do {
            if (!ACTIVE_IDS.has(id)) return;

            CallbackHandler.invokeNoArgs(callback, `interval ${id}`, logging, LogLevel.Error);

            if (!ACTIVE_IDS.has(id)) return;

            await mod.Wait(ms / 1_000);
            // eslint-disable-next-line no-constant-condition
        } while (true);
    }

    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback - The callback to execute.
     * @param ms - The delay in milliseconds.
     * @returns The timer ID.
     */
    export function setTimeout(callback: () => Promise<void> | void, ms: number): number {
        const id = nextId++;
        ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        executeTimeout(id, callback, ms < 0 ? 0 : ms);

        return id;
    }

    /**
     * Schedules a repeated execution after the specified interval.
     * @param callback - The callback to execute. Synchronous callbacks will delay the start of the next interval.
     * @param ms - The interval in milliseconds.
     * @param immediate - If true, runs the callback immediately before the first wait period.
     * @returns The timer ID.
     */
    export function setInterval(callback: () => Promise<void> | void, ms: number, immediate: boolean = false): number {
        const id = nextId++;
        ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        executeInterval(id, callback, ms < 0 ? 0 : ms, immediate);

        return id;
    }

    /**
     * Cancels a timeout (or interval). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clearTimeout(id: number | undefined | null): void {
        clear(id);
    }

    /**
     * Cancels an interval (or timeout). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clearInterval(id: number | undefined | null): void {
        clear(id);
    }

    /**
     * Cancels a timeout or interval. Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clear(id: number | undefined | null): void {
        if (id === undefined || id === null) return;

        ACTIVE_IDS.delete(id);
    }

    /**
     * @returns The number of active timers.
     */
    export function getActiveTimerCount(): number {
        return ACTIVE_IDS.size;
    }
}
