import { Logging } from '../logging/index.ts';
export declare namespace PortalGadget {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * A handler function for the Portal Gadget's events.
     * @param player - The player who started or stopped the fire.
     * @param isZooming - Whether the player was zooming when the event fired.
     * @param getTarget - An async function that returns the target position.
     */
    type Handler = (player: mod.Player, isZooming: boolean, getTarget: () => Promise<mod.Vector | undefined>) => void;
    /**
     * Subscribes to the Portal Gadget's fire start event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    function onFireStart(handler: Handler): () => void;
    /**
     * Subscribes to the Portal Gadget's fire stop event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    function onFireStop(handler: Handler): () => void;
    /**
     * Gets the target position of the Portal Gadget's laser pointer.
     * @param player - The player to get the target position for.
     * @returns The target position (undefined if no target is found).
     */
    function getLaserTarget(player: mod.Player): Promise<mod.Vector | undefined>;
}
