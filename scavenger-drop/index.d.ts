import { Logging } from '../logging/index.ts';
export declare namespace ScavengerDrop {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * Unique generation-encoded identifier for a Scavenger Drop.
     */
    type DropID = number & {
        readonly __brand: 'DropID';
    };
    /**
     * Maximum drop duration in milliseconds (signed 32-bit integer limit: 2,147,483,647 ms).
     */
    const MAX_DURATION_MS = 2147483647;
    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * Subscribes to `PlayerLocations.onSphere` for a 2-meter radius to reactively detect scavengers.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param duration - The duration of the scavenger drop in milliseconds (clamped to positive integer range, max 2,147,483,647 ms, default: 37,000 ms).
     * @returns A generational drop ID, or null if the pre-allocated drop pool is full or the player position is unavailable.
     */
    function create(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        duration?: number
    ): DropID | null;
    /**
     * Stops/cancels an active scavenger drop by ID.
     * @param id - The drop ID returned by `create`.
     */
    function stop(id: DropID): void;
    /**
     * Stops and cleans up all active scavenger drops.
     */
    function stopAll(): void;
    /**
     * Checks if a drop ID is currently active.
     * @param id - The drop ID to check.
     * @returns True if the drop is active, false otherwise.
     */
    function isActive(id: DropID): boolean;
    /**
     * Gets the number of currently active scavenger drops.
     * @returns The number of active drops.
     */
    function getActiveDropCount(): number;
}
