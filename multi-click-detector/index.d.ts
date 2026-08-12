import { Logging } from '../logging/index.ts';
export declare namespace MultiClickDetector {
    /**
     * The log levels.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * The options for the multi-click detector.
     */
    interface Options {
        /**
         * The soldier state boolean to use for the multi-click detector.
         */
        soldierState?: mod.SoldierStateBool;
        /**
         * The window in milliseconds for a valid multi-click sequence.
         */
        windowMs?: number;
        /**
         * The number of clicks required to trigger a multi-click sequence.
         */
        requiredClicks?: number;
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
     * Unique generation-encoded identifier for a MultiClickDetector.
     */
    type DetectorID = number & {
        readonly __brand: 'DetectorID';
    };
    /**
     * Sentinel value representing an invalid or uninitialized Detector ID.
     */
    const INVALID_DETECTOR_ID: DetectorID;
    /**
     * Creates a new multi-click detector for the specified player.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     * @returns The ID of the created multi-click detector, or INVALID_DETECTOR_ID if the pool is full.
     */
    function create(player: mod.Player, callback: () => Promise<void> | void, options?: Options): DetectorID;
    /**
     * Enables a detector.
     * @param id - The ID of the detector to enable.
     */
    function enable(id: DetectorID): void;
    /**
     * Disables a detector.
     * @param id - The ID of the detector to disable.
     */
    function disable(id: DetectorID): void;
    /**
     * Destroys a detector.
     * @param id - The ID of the detector to destroy.
     */
    function destroy(id: DetectorID): void;
    /**
     * Checks if a detector ID is currently active.
     * @param id - The detector ID to check.
     * @returns True if the detector is active, false otherwise.
     */
    function isActive(id: DetectorID): boolean;
    /**
     * Gets the number of currently active detectors.
     * @returns The number of active detectors.
     */
    function getActiveDetectorCount(): number;
}
