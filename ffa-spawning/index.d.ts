import { Logging } from '../logging/index.ts';
export declare namespace FFASpawning {
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
     * Internal type representing a processed spawn point:
     */
    type Spawn = {
        /**
         * Index in the spawns array.
         */
        index: number;
        /**
         * Battlefield Portal spawn point object.
         */
        spawnPoint: mod.SpawnPoint;
        /**
         * World position.
         */
        location: mod.Vector;
    };
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
         * The amount to scale the midpoint between the `_minimumSafeDistance` and `_maximumInterestingDistance` to evaluate a fallback spawn.
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
     * Class representing a soldier who spawning will be managed by this module.
     */
    class Soldier {
        private static readonly _ALL_SOLDIERS;
        private static readonly _PRIME_STEPS;
        private static _spawns;
        private static _maxSpawnCandidates;
        private static _minimumSafeDistance;
        private static _maximumInterestingDistance;
        private static _safeOverInterestingFallbackFactor;
        private static _spawnQueue;
        private static _promptDelay;
        private static _initialPromptDelay;
        private static _queueProcessingDelay;
        private static _queueProcessingEnabled;
        private static _queueProcessingActive;
        private static _getRotationVector;
        private static _getBestSpawnPoint;
        private static _getDistanceToClosestPlayer;
        private static _processSpawnQueue;
        private static _getPosition;
        /**
         * Converts a mod.Vector to a string in the format `<x, y, z>`.
         * @param vector - The mod.Vector to convert.
         * @returns The string representation of the mod.Vector.
         */
        static getVectorString(vector: mod.Vector): string;
        /**
         * Initializes the spawning system. Should be called in the `OnGameModeStarted()` event.
         * @param spawns - The spawn points to use.
         * @param options - The options to use.
         */
        static initialize(spawns: FFASpawning.SpawnData[], options?: FFASpawning.InitializeOptions): void;
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
         * Enables the processing of the spawn queue.
         */
        static enableSpawnQueueProcessing(): void;
        /**
         * Disables the processing of the spawn queue.
         */
        static disableSpawnQueueProcessing(): void;
        /**
         * Every player that should be handled by this spawning system should be instantiated as a `FFASpawning`,
         * usually in the `OnPlayerJoinGame()` event.
         * @param player - The player to instantiate the `FFASpawning` for.
         * @param showDebugPosition - Whether to show the debug position.
         */
        constructor(player: mod.Player, showDebugPosition?: boolean);
        private _player;
        private _playerId;
        private _isAISoldier;
        private _delayCountdown;
        private _delayCountdownInterval?;
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
        private _handleDelayCountdown;
        private _addToQueue;
        private _deleteIfNotValid;
    }
}
