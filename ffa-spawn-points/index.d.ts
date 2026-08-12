import { Clocks } from '../clocks/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UIText } from '../ui/components/text/index.ts';
/**
 * Class managing Free-For-All player spawn points, fitness scoring, and spawning queues.
 * @version 7.0.0
 */
export declare class FFASpawnPoints {
    static readonly logging: Logging;
    /**
     * Timestamp (in ms) when the server runtime started.
     */
    static readonly SERVER_START_TIME: number;
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
    static setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    private static readonly _scratchVector;
    private readonly _count;
    private readonly _posX;
    private readonly _posY;
    private readonly _posZ;
    private readonly _orientations;
    private readonly _lastUsedTimes;
    private readonly _topIndices;
    private readonly _topScores;
    private readonly _spawnPoints;
    private readonly _players;
    private readonly _spawnQueue;
    private readonly _leaveGameUnsubscribe;
    private readonly _customScorer;
    private readonly _initialPromptDelay;
    private readonly _promptDelay;
    private readonly _queueProcessingDelay;
    private _queueProcessingEnabled;
    private _queueProcessingActive;
    private _queueProcessingTimerId;
    /**
     * Initializes the spawning system with the given spawn points and options.
     * @param spawns - Array of spawn point tuples: [x, y, z, orientation].
     * @param options - Optional configuration overrides for scoring, delays, and thresholds.
     */
    constructor(spawns: FFASpawnPoints.SpawnData[], options?: FFASpawnPoints.Options);
    /**
     * Total number of spawn points managed by this instance.
     * @returns The spawn count.
     */
    get spawnCount(): number;
    /**
     * Adds and registers a player to be managed by this spawning system.
     * Usually called in `Events.OnPlayerJoinGame`.
     * @param player - The player to add.
     * @param showDebugPosition - Whether to display a debug position HUD for this player.
     */
    addPlayer(player: mod.Player, showDebugPosition?: boolean): void;
    /**
     * Removes and unregisters a player from the spawning system.
     * @param playerOrId - The player or player ID to remove.
     * @returns Whether the player was found and removed.
     */
    removePlayer(playerOrId: mod.Player | number): boolean;
    /**
     * Starts the countdown before prompting the player to spawn or delay again.
     * Usually called in `Events.OnPlayerJoinGame` or `Events.OnPlayerUndeploy`.
     * AI soldiers skip the countdown and are added to the spawn queue immediately.
     * @param playerOrId - The player or player ID.
     * @param delay - Delay in seconds (defaults to initialPromptDelay).
     */
    startDelayForPrompt(playerOrId: mod.Player | number, delay?: number): void;
    /**
     * Forces a player into the spawn queue immediately, skipping any countdown and prompt.
     * @param playerOrId - The player or player ID to force into the queue.
     */
    forceIntoQueue(playerOrId: mod.Player | number): void;
    /**
     * Evaluates all spawn points using multi-factor fitness scoring and selects the best candidate.
     * @returns The zero-based index of the chosen spawn point, or null if no spawn points are set.
     */
    getBestSpawnIndex(): number | null;
    /**
     * Enables automatic processing of the spawn queue.
     */
    enableSpawnQueueProcessing(): void;
    /**
     * Disables automatic processing of the spawn queue.
     */
    disableSpawnQueueProcessing(): void;
    /**
     * Destroys this `FFASpawnPoints` instance, removing all player UI, timers, and event listeners.
     */
    destroy(): void;
    private _addToQueue;
    private _processSpawnQueue;
    private _isPlayerRecordValid;
    private _getPlayerPosition;
    private _getPlayerRecord;
    /**
     * Default fitness scoring algorithm evaluating proximity sweet-spot, sector crowding, temporal cooldown, and facing alignment.
     * @param x - X coordinate of candidate spawn.
     * @param y - Y coordinate of candidate spawn.
     * @param z - Z coordinate of candidate spawn.
     * @param orientation - Compass facing angle (in degrees).
     * @param elapsed - Milliseconds elapsed since last used.
     * @param options - Optional configuration overrides for thresholds, weights, and radius.
     * @returns Computed fitness score.
     */
    static defaultScorer(
        x: number,
        y: number,
        z: number,
        orientation: number,
        elapsed: number,
        options?: FFASpawnPoints.DefaultScorerOptions
    ): number;
}
export declare namespace FFASpawnPoints {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Type for defining spawn point data:
     * <x, y, z> world position where the player should spawn.
     * Orientation is the compass angle (0-360) for spawn direction.
     */
    type SpawnData = [x: number, y: number, z: number, orientation: number];
    /**
     * Internal player tracking record for FFA spawning and UI timers.
     */
    interface PlayerRecord {
        player: mod.Player;
        playerId: number;
        isAI: boolean;
        delayCountdownClockId: Clocks.ClockID | null;
        promptUI?: UIContainer;
        countdownUI?: UIText;
        updatePositionIntervalId: Timers.TimerID | null;
        debugPositionUI?: UIText;
    }
    /**
     * Fitness scoring function signature.
     * @param x - X coordinate of the candidate spawn point.
     * @param y - Y coordinate of the candidate spawn point.
     * @param z - Z coordinate of the candidate spawn point.
     * @param orientation - Compass facing angle (in degrees) of the candidate spawn point.
     * @param elapsedSinceLastUsedMs - Milliseconds elapsed since this spawn point was last used (Infinity if never used).
     * @returns The computed numerical fitness score.
     */
    type Scorer = (x: number, y: number, z: number, orientation: number, elapsedSinceLastUsedMs: number) => number;
    /**
     * Optional configuration overrides for the default fitness scoring algorithm.
     */
    type DefaultScorerOptions = {
        /**
         * Minimum distance (in meters) to any enemy player for a spawn to be considered safe.
         * Spawns with enemies closer than this receive severe danger penalties. (Default: 20m)
         */
        minSafeDistance?: number;
        /**
         * Target ideal distance (in meters) to the closest enemy. Spawns near this distance receive
         * the highest proximity score. (Default: 35m)
         */
        idealDistance?: number;
        /**
         * Maximum distance (in meters) beyond which a spawn is considered too far from the action
         * and receives zero proximity score. (Default: 80m)
         */
        maxDistance?: number;
        /**
         * Radius (in meters) around a spawn point to evaluate enemy crowding and crossfire risk. (Default: 50m)
         */
        crowdingRadius?: number;
        /**
         * Penalty weight subtracted per extra enemy in the crowding radius beyond the first. (Default: 0.25)
         */
        crowdingWeight?: number;
        /**
         * Cooldown time (in milliseconds) before a recently used spawn point regains full fitness.
         * Prevents consecutive respawns on the same spot. (Default: 4000ms)
         */
        spawnCooldownMs?: number;
        /**
         * Bonus weight added when the spawn point's forward orientation points toward the closest enemy
         * (action direction). (Default: 0.15)
         */
        facingWeight?: number;
    };
    /**
     * Optional configuration overrides for spawn selection, scoring, delays, and candidate limits:
     */
    type Options = {
        /**
         * Optional configuration overrides for the default fitness scoring algorithm.
         * Only used when `customScorer` is not provided.
         */
        defaultScorerOptions?: DefaultScorerOptions;
        /**
         * Number of top-scoring candidate spawns to randomly select from (Top-K selection).
         * Prevents deterministic spawn trapping while guaranteeing high quality. (Default: 3)
         */
        selectionPoolSize?: number;
        /**
         * Optional custom scoring function for mod developers who want full control over spawn fitness.
         * Receives the spawn coordinates, orientation, and elapsed time since the spawn point was last used (in milliseconds).
         */
        customScorer?: Scorer;
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
}
