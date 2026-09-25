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
         * The window in milliseconds for a valid multi-click sequence (clamped between 1 and 65,535 ms).
         */
        windowMs?: number;
        /**
         * The number of clicks required to trigger a multi-click sequence (clamped between 1 and 255).
         */
        requiredClicks?: number;
    }
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
     * Unique generation-encoded identifier for a MultiClickDetector.
     */
    type DetectorID = number & {
        readonly __brand: 'DetectorID';
    };
    /**
     * Maximum multi-click detection window in milliseconds (unsigned 16-bit integer limit: 65,535 ms).
     */
    const MAX_WINDOW_MS = 65535;
    /**
     * Maximum required clicks supported for a sequence (unsigned 8-bit integer limit: 255).
     */
    const MAX_REQUIRED_CLICKS = 255;
    /**
     * Creates a new multi-click detector for the specified player.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     * @returns The ID of the created multi-click detector, or null if the pool is full.
     */
    function create(player: mod.Player, callback: () => Promise<void> | void, options?: Options): DetectorID | null;
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
