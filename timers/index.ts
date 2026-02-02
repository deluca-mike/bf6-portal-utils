import { Logging } from '../logging/index.ts';

// version: 1.1.1
export class Timers {
    private static readonly _ACTIVE_IDS = new Set<number>();

    private static _logging = new Logging('Timers');

    private static _nextId: number = 1;

    private static async _executeTimeout(id: number, callback: () => Promise<void> | void, ms: number): Promise<void> {
        await Promise.resolve();

        try {
            await mod.Wait(ms / 1_000);

            if (!this._ACTIVE_IDS.has(id)) return; // Exit if the timer is no longer active.

            this._ACTIVE_IDS.delete(id); // Cleanup one-time timer.

            const result = callback();

            if (result instanceof Promise) {
                result.catch((error: unknown) => {
                    // Catch and log async callback errors to prevent unhandled promise rejections.
                    this._logging.log(`Error in async setTimeout callback (ID ${id}).`, Timers.LogLevel.Error, error);
                });
            }
        } catch (error: unknown) {
            this._logging.log(`Error in setTimeout (ID ${id}).`, Timers.LogLevel.Error, error);
        }
    }

    private static async _executeInterval(
        id: number,
        callback: () => Promise<void> | void,
        ms: number,
        immediate: boolean
    ): Promise<void> {
        await Promise.resolve();

        try {
            // Skip the first wait if immediate is true.
            if (!immediate && this._ACTIVE_IDS.has(id)) {
                await mod.Wait(ms / 1_000);
            }

            do {
                if (!this._ACTIVE_IDS.has(id)) return;

                try {
                    const result = callback();

                    if (result instanceof Promise) {
                        result.catch((error: unknown) => {
                            // Catch and log async callback errors to prevent unhandled promise rejections.
                            this._logging.log(
                                `Error in async setInterval callback (ID ${id}).`,
                                Timers.LogLevel.Error,
                                error
                            );
                        });
                    }
                } catch (error: unknown) {
                    // Catch and log sync callback errors so the loop can continue.
                    this._logging.log(`Error in setInterval callback (ID ${id}).`, Timers.LogLevel.Error, error);
                }

                if (!this._ACTIVE_IDS.has(id)) return;

                await mod.Wait(ms / 1_000);
                // eslint-disable-next-line no-constant-condition
            } while (true);
        } catch (error: unknown) {
            // Catch and log system errors (e.g. mod.Wait failing) so the loop can continue.
            this._logging.log(`Error in setInterval (ID ${id}).`, Timers.LogLevel.Error, error);
            this._ACTIVE_IDS.delete(id);
        }
    }

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    public static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        this._logging.setLogging(log, logLevel, includeError);
    }

    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback - The callback to execute.
     * @param ms - The delay in milliseconds.
     * @returns The timer ID.
     */
    public static setTimeout(callback: () => Promise<void> | void, ms: number): number {
        const id = this._nextId++;
        this._ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        this._executeTimeout(id, callback, ms);

        return id;
    }

    /**
     * Schedules a repeated execution after the specified interval.
     * @param callback - The callback to execute.
     * @param ms - The interval in milliseconds.
     * @param immediate - If true, runs the callback immediately before the first wait period.
     * @returns The timer ID.
     */
    public static setInterval(callback: () => Promise<void> | void, ms: number, immediate: boolean = false): number {
        const id = this._nextId++;
        this._ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        this._executeInterval(id, callback, ms, immediate);

        return id;
    }

    /**
     * Cancels a timeout (or interval). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    public static clearTimeout(id: number | undefined | null): void {
        this.clear(id);
    }

    /**
     * Cancels an interval (or timeout). Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    public static clearInterval(id: number | undefined | null): void {
        this.clear(id);
    }

    /**
     * Cancels a timeout or interval. Silently ignores null, undefined, or invalid IDs.
     * @param id - The timer ID to cancel.
     */
    public static clear(id: number | undefined | null): void {
        if (id === undefined || id === null) return;

        this._ACTIVE_IDS.delete(id);
    }

    /**
     * @returns The number of active timers.
     */
    public static getActiveTimerCount(): number {
        return this._ACTIVE_IDS.size;
    }
}

export namespace Timers {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;
}
