import { Logging } from '../logging/index.ts';
export declare namespace ScavengerDrop {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * The options for a scavenger drop.
     */
    interface Options {
        /**
         * The duration of the scavenger drop in milliseconds.
         */
        duration?: number;
        /**
         * The interval at which to check for scavengers in milliseconds.
         */
        checkInterval?: number;
    }
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
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
     * Sentinel value representing an invalid or uninitialized Drop ID.
     */
    const INVALID_DROP_ID: DropID;
    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param options - The options for the scavenger drop.
     * @returns A generational drop ID, or INVALID_DROP_ID if the pre-allocated drop pool is full.
     */
    function create(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        options?: Options
    ): DropID;
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
