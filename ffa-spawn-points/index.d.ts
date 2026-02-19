import { Logging } from '../logging/index.ts';
export declare namespace FFASpawnPoints {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    /**
     * Type for defining spawn point data when initializing the system:
     * <x, y, z> world position where the player should spawn.
     * Orientation is the compass angle (0-360) for spawn direction.
     */
    type SpawnData = [x: number, y: number, z: number, orientation: number];
    /**
     * Optional overrides for spawn selection thresholds, delays, and candidate limits when calling `initialize()`:
     */
    type InitializeOptions = {
        /**
         * The maximum number of random spawns to consider when trying to find a spawn point for a player.
         */
        maxSpawnCandidates?: number;
        /**
         * The minimum distance a spawn point must be to another player to be considered safe.
         */
        minimumSafeDistance?: number;
        /**
         * The maximum distance a spawn point must be to another player to be considered acceptable.
         */
        maximumInterestingDistance?: number;
        /**
         * The amount to scale the midpoint between the `minimumSafeDistance` and `maximumInterestingDistance` to evaluate a fallback spawn.
         */
        safeOverInterestingFallbackFactor?: number;
        /**
         * The initial delay before prompting the player to spawn (in seconds).
         */
        initialPromptDelay?: number;
        /**
         * The delay between prompts (in seconds).
         */
        promptDelay?: number;
        /**
         * The delay between processing the spawn queue (in seconds).
         */
        queueProcessingDelay?: number;
    };
    /**
     * Initializes the spawning system. Should be called in the `OnGameModeStarted()` event.
     * @param spawns - The spawn points to use.
     * @param options - The options to use for overriding the defaults.
     */
    function initialize(spawns: SpawnData[], options?: InitializeOptions): void;
    /**
     * Enables the processing of the spawn queue.
     */
    function enableSpawnQueueProcessing(): void;
    /**
     * Disables the processing of the spawn queue.
     */
    function disableSpawnQueueProcessing(): void;
    /**
     * Class representing a soldier whose spawning will be managed by this module.
     */
    class Soldier {
        private static readonly _ALL_SOLDIERS;
        private static _deleteSoldierIfNotValid;
        private static _getPosition;
        /**
         * Starts the countdown before prompting the player to spawn or delay again.
         * Usually called in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
         * AI soldiers will skip the countdown and spawn immediately.
         * @param player - The player to start the delay for.
         */
        static startDelayForPrompt(player: mod.Player): void;
        /**
         * Forces a player to be added to the spawn queue, skipping the countdown and prompt.
         * @param player - The player to force into the queue.
         */
        static forceIntoQueue(player: mod.Player): void;
        /**
         * Every player that should be handled by this spawning system should be instantiated as a `Soldier`,
         * usually in the `OnPlayerJoinGame()` event.
         * @param player - The player to instantiate the `Soldier` for.
         * @param showDebugPosition - Whether to show the debug position.
         */
        constructor(player: mod.Player, showDebugPosition?: boolean);
        private _player;
        private _playerId;
        private _isAISoldier;
        private _delayCountdownClock?;
        private _promptUI?;
        private _countdownUI?;
        private _updatePositionInterval?;
        private _debugPositionUI?;
        /**
         * @returns The player associated with this `Soldier` instance.
         */
        get player(): mod.Player;
        /**
         * @returns The unique ID of the player associated with this instance.
         */
        get playerId(): number;
        /**
         * Starts the countdown before prompting the player to spawn or delay again.
         * Usually called in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
         * AI soldiers will skip the countdown and spawn immediately.
         * @param delay - The delay to start the countdown for (in seconds). Defaults to the initial prompt delay.
         */
        startDelayForPrompt(delay?: number): void;
        /**
         * Deletes the `Soldier` instance if the player is no longer valid.
         * @returns Whether the `Soldier` instance was deleted.
         */
        deleteIfNotValid(): boolean;
        private _addToQueue;
    }
}
