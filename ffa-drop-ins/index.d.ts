import { Clocks } from '../clocks/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UIText } from '../ui/components/text/index.ts';
/**
 * Class managing Free-For-All aerial drop-in spawn points, spawn regions, and spawning queues.
 * @version 2.0.0
 */
export declare class FFADropIns {
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
    private readonly _spawnPoints;
    private readonly _rectMinX;
    private readonly _rectMinZ;
    private readonly _rectMaxX;
    private readonly _rectMaxZ;
    private readonly _cumulativeAreas;
    private readonly _totalArea;
    private readonly _players;
    private readonly _spawnQueue;
    private readonly _leaveGameUnsubscribe;
    private readonly _initialPromptDelay;
    private readonly _promptDelay;
    private readonly _queueProcessingDelay;
    private _queueProcessingEnabled;
    private _queueProcessingActive;
    private _queueProcessingTimerId;
    /**
     * Initializes the drop-in spawning system with the given region rectangles, altitude, and options.
     * @param spawnData - The drop-in spawning region (rectangles and altitude).
     * @param options - Optional configuration overrides for spawn points and delays.
     */
    constructor(spawnData: FFADropIns.SpawnData, options?: FFADropIns.Options);
    /**
     * Total number of spawn points managed by this instance.
     * @returns The spawn count.
     */
    get spawnCount(): number;
    private _sampleRandomPoint;
    /**
     * Adds and registers a player to be managed by this drop-in spawning system.
     * Usually called in `Events.OnPlayerJoinGame`.
     * @param player - The player to add.
     * @param showDebugPosition - Whether to display a debug position HUD for this player.
     */
    addPlayer(player: mod.Player, showDebugPosition?: boolean): void;
    /**
     * Removes and unregisters a player from the drop-in spawning system.
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
     * Selects a random drop-in spawn point index.
     * @returns The zero-based index of the chosen spawn point, or null if no spawn points are set.
     */
    getRandomSpawnIndex(): number | null;
    /**
     * Evaluates and returns the best spawn point index.
     * For drop-ins without proximity scoring, uniformly selects a random drop point.
     * Provided for full interface polymorphism with `FFASpawnPoints`.
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
     * Clears all players currently waiting in the spawn queue without spawning them.
     */
    clearSpawnQueue(): void;
    /**
     * Destroys this `FFADropIns` instance, removing all player UI, timers, and event listeners.
     */
    destroy(): void;
    private _addToQueue;
    private _processSpawnQueue;
    private _isPlayerRecordValid;
    private _getPlayerPosition;
    private _getPlayerRecord;
}
export declare namespace FFADropIns {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Type for defining rectangle components of a drop-in spawning region.
     */
    type SpawnRectangle = {
        minX: number;
        minZ: number;
        maxX: number;
        maxZ: number;
    };
    /**
     * Type for defining drop-in spawn data when initializing the system.
     */
    type SpawnData = {
        /**
         * The rectangles that make up the drop-in spawning region.
         */
        spawnRectangles: SpawnRectangle[];
        /**
         * The Y coordinate of the drop-in spawning region (altitude).
         */
        y: number;
    };
    /**
     * Internal player tracking record for FFA drop-in spawning and UI timers.
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
     * Optional configuration overrides for drop-in spawning points and delays:
     */
    type Options = {
        /**
         * The number of drop-in spawn points to create. (Default: 64)
         */
        dropInPoints?: number;
        /**
         * The initial delay before prompting the player to spawn (in seconds). (Default: 10)
         */
        initialPromptDelay?: number;
        /**
         * The delay between prompts (in seconds). (Default: 10)
         */
        promptDelay?: number;
        /**
         * The delay between processing the spawn queue (in seconds). (Default: 2)
         */
        queueProcessingDelay?: number;
    };
}
