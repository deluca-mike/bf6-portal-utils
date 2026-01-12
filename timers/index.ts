// version: 1.0.1
export class Timers {
    private static readonly _ACTIVE_IDS = new Set<number>();

    private static _nextId: number = 1;

    private static _logger?: (text: string) => void;

    private static _log(text: string): void {
        this._logger?.(`<Timers> ${text}`);
    }

    private static async _executeTimeout(id: number, callback: () => void, ms: number): Promise<void> {
        await Promise.resolve();

        try {
            await mod.Wait(ms / 1_000);

            if (!this._ACTIVE_IDS.has(id)) return; // Exit if the timer is no longer active.

            this._ACTIVE_IDS.delete(id); // Cleanup one-time timer.

            callback();
        } catch (error) {
            this._log(`Error in setTimeout (ID ${id}): ${error?.toString()}`);
        }
    }

    private static async _executeInterval(
        id: number,
        callback: () => void,
        ms: number,
        immediate: boolean
    ): Promise<void> {
        await Promise.resolve();

        try {
            if (immediate && this._ACTIVE_IDS.has(id)) {
                try {
                    callback();
                } catch (error) {
                    // Swallow the error here so the loop can still start.
                    this._log(`Error in setInterval immediate callback (ID ${id}): ${error?.toString()}`);
                }
            }

            while (this._ACTIVE_IDS.has(id)) {
                await mod.Wait(ms / 1_000);

                if (this._ACTIVE_IDS.has(id)) {
                    try {
                        callback();
                    } catch (error) {
                        // Swallow the error here so the loop can continue.
                        this._log(`Error in setInterval loop callback (ID ${id}): ${error?.toString()}`);
                    }
                }
            }
        } catch (error) {
            // This catches system errors (e.g. mod.Wait failing).
            this._log(`System error in setInterval (ID ${id}): ${error?.toString()}`);
            this._ACTIVE_IDS.delete(id);
        }
    }

    public static setLogging(log: (text: string) => void): void {
        this._logger = log;
    }

    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback Function to execute
     * @param ms Delay in milliseconds
     * @returns Timer ID
     */
    public static setTimeout(callback: () => void, ms: number): number {
        const id = this._nextId++;
        this._ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        this._executeTimeout(id, callback, ms);

        return id;
    }

    /**
     * @param callback Function to execute
     * @param ms Interval in milliseconds
     * @param immediate If true, runs the callback immediately before the first wait period.
     */
    public static setInterval(callback: () => void, ms: number, immediate: boolean = false): number {
        const id = this._nextId++;
        this._ACTIVE_IDS.add(id);

        // Run async without awaiting (fire-and-forget).
        this._executeInterval(id, callback, ms, immediate);

        return id;
    }

    /**
     * Cancels a timeout.
     * Silently ignores null, undefined, or invalid IDs.
     * @param id Timer ID
     */
    public static clearTimeout(id: number | undefined | null): void {
        this._clear(id);
    }

    /**
     * Cancels an interval.
     * Silently ignores null, undefined, or invalid IDs.
     * @param id Timer ID
     */
    public static clearInterval(id: number | undefined | null): void {
        this._clear(id);
    }

    private static _clear(id: number | undefined | null): void {
        if (id === undefined || id === null) return;

        this._ACTIVE_IDS.delete(id);
    }
}
