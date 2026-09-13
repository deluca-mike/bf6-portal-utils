import { Clocks } from '../clocks/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { PlayerLocations } from '../player-locations/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UITextButton } from '../ui/components/text-button/index.ts';
import { UIText } from '../ui/components/text/index.ts';

/**
 * Class managing Free-For-All player spawn points, fitness scoring, and spawning queues.
 * @version 7.0.0
 */
export class FFASpawnPoints {
    public static readonly logging = new Logging('FSP');

    /**
     * Timestamp (in ms) when the server runtime started.
     */
    public static readonly SERVER_START_TIME = Date.now();

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
    public static setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        FFASpawnPoints.logging.setLogging(log, logLevel, includeRawError);
    }

    private static readonly _scratchVector: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

    private readonly _count: number;
    private readonly _posX: Float32Array;
    private readonly _posY: Float32Array;
    private readonly _posZ: Float32Array;
    private readonly _orientations: Float32Array;
    private readonly _lastUsedTimes: Uint32Array;
    private readonly _topIndices: Uint16Array;
    private readonly _topScores: Float32Array;
    private readonly _spawnPoints: mod.SpawnPoint[];

    private readonly _players = new Map<number, FFASpawnPoints.PlayerRecord>();
    private readonly _spawnQueue: FFASpawnPoints.PlayerRecord[] = [];
    private readonly _leaveGameUnsubscribe: () => void;

    private readonly _customScorer: FFASpawnPoints.Scorer;

    private readonly _initialPromptDelay: number;
    private readonly _promptDelay: number;
    private readonly _queueProcessingDelay: number;

    private _queueProcessingEnabled: boolean = false;
    private _queueProcessingActive: boolean = false;
    private _queueProcessingTimerId: Timers.TimerID | null = null;

    /**
     * Initializes the spawning system with the given spawn points and options.
     * @param spawns - Array of spawn point tuples: [x, y, z, orientation].
     * @param options - Optional configuration overrides for scoring, delays, and thresholds.
     */
    constructor(spawns: FFASpawnPoints.SpawnData[], options?: FFASpawnPoints.Options) {
        if (!spawns || spawns.length === 0) {
            FFASpawnPoints.logging.log('No spawn points provided.', FFASpawnPoints.LogLevel.Error);
        }

        PlayerLocations.initialize();

        mod.EnableHQ(mod.GetHQ(1), false);
        mod.EnableHQ(mod.GetHQ(2), false);

        const count = spawns ? spawns.length : 0;
        this._count = count;

        this._posX = new Float32Array(count);
        this._posY = new Float32Array(count);
        this._posZ = new Float32Array(count);
        this._orientations = new Float32Array(count);
        this._lastUsedTimes = new Uint32Array(count);
        this._spawnPoints = new Array(count);

        for (let i = 0; i < count; ++i) {
            const spawn = spawns[i];
            const x = spawn[0];
            const y = spawn[1];
            const z = spawn[2];
            const orientation = spawn[3];
            const location = mod.CreateVector(x, y, z);

            this._posX[i] = x;
            this._posY[i] = y;
            this._posZ[i] = z;
            this._orientations[i] = orientation;

            this._spawnPoints[i] = mod.SpawnObject(
                mod.RuntimeSpawn_Common.PlayerSpawner,
                location,
                Vectors.toVector(Vectors.getRotationVector(orientation))
            );
        }

        const selectionPoolSize = Math.max(1, options?.selectionPoolSize ?? 3);
        const poolCap = Math.min(selectionPoolSize, count);
        this._topIndices = new Uint16Array(poolCap);
        this._topScores = new Float32Array(poolCap);

        const defaultScorerOpts = options?.defaultScorerOptions;

        this._customScorer =
            options?.customScorer ??
            (defaultScorerOpts
                ? (x, y, z, ori, el) => FFASpawnPoints.defaultScorer(x, y, z, ori, el, defaultScorerOpts)
                : FFASpawnPoints.defaultScorer);

        this._initialPromptDelay = options?.initialPromptDelay ?? 10;
        this._promptDelay = options?.promptDelay ?? 10;
        this._queueProcessingDelay = options?.queueProcessingDelay ?? 1;

        this._leaveGameUnsubscribe = Events.OnPlayerLeaveGame.subscribe((playerId) => {
            this.removePlayer(playerId);
        });

        if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Info)) {
            FFASpawnPoints.logging.log(`Initialized with ${count} spawn points.`, FFASpawnPoints.LogLevel.Info);
        }
    }

    /**
     * Total number of spawn points managed by this instance.
     * @returns The spawn count.
     */
    public get spawnCount(): number {
        return this._count;
    }

    /**
     * Adds and registers a player to be managed by this spawning system.
     * Usually called in `Events.OnPlayerJoinGame`.
     * @param player - The player to add.
     * @param showDebugPosition - Whether to display a debug position HUD for this player.
     */
    public addPlayer(player: mod.Player, showDebugPosition: boolean = false): void {
        const playerId = mod.GetObjId(player);

        if (playerId === undefined) return;

        if (this._players.has(playerId)) {
            this.removePlayer(playerId);
        }

        const isAI = mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier);

        const record: FFASpawnPoints.PlayerRecord = {
            player,
            playerId,
            isAI,
            delayCountdownClockId: null,
            updatePositionIntervalId: null,
        };

        this._players.set(playerId, record);

        if (isAI) return;

        record.promptUI = new UIContainer({
            x: 0,
            y: 0,
            width: 440,
            height: 140,
            anchor: UI.Anchor.Center,
            visible: false,
            bgColor: UI.COLORS.BF_GREY_4,
            bgAlpha: 0.5,
            bgFill: UI.BgFill.Blur,
            receiver: player,
            uiInputModeWhenVisible: true,
        });

        new UITextButton({
            parent: record.promptUI,
            x: 0,
            y: 20,
            width: 400,
            height: 40,
            anchor: UI.Anchor.TopCenter,
            bgColor: UI.COLORS.BF_GREY_2,
            baseColor: UI.COLORS.BF_GREY_2,
            baseAlpha: 1,
            pressedColor: UI.COLORS.BF_GREEN_DARK,
            pressedAlpha: 1,
            focusedColor: UI.COLORS.BF_GREY_1,
            focusedAlpha: 1,
            label: mod.Message(mod.stringkeys.ffaSpawnPoints.buttons.spawn),
            textSize: 30,
            textColor: UI.COLORS.BF_GREEN_BRIGHT,
            onClickUp: () => this._addToQueue(record),
        });

        new UITextButton({
            parent: record.promptUI,
            x: 0,
            y: 80,
            width: 400,
            height: 40,
            anchor: UI.Anchor.TopCenter,
            bgColor: UI.COLORS.BF_GREY_2,
            baseColor: UI.COLORS.BF_GREY_2,
            baseAlpha: 1,
            pressedColor: UI.COLORS.BF_YELLOW_DARK,
            pressedAlpha: 1,
            focusedColor: UI.COLORS.BF_GREY_1,
            focusedAlpha: 1,
            label: mod.Message(mod.stringkeys.ffaSpawnPoints.buttons.delay, this._promptDelay),
            textSize: 30,
            textColor: UI.COLORS.BF_YELLOW_BRIGHT,
            onClickUp: () => this.startDelayForPrompt(playerId, this._promptDelay),
        });

        record.countdownUI = new UIText({
            x: 0,
            y: 60,
            width: 400,
            height: 50,
            anchor: UI.Anchor.TopCenter,
            label: mod.Message(mod.stringkeys.ffaSpawnPoints.countdown, 0),
            textSize: 30,
            textColor: UI.COLORS.BF_GREEN_BRIGHT,
            bgColor: UI.COLORS.BF_GREY_4,
            bgAlpha: 0.5,
            bgFill: UI.BgFill.Solid,
            visible: false,
            receiver: player,
        });

        record.delayCountdownClockId = Clocks.createCountDown(this._initialPromptDelay, {
            onSecond: (seconds: number) => {
                if (Clocks.isComplete(record.delayCountdownClockId!)) {
                    record.countdownUI?.hide();
                    record.promptUI?.show();
                }

                if (Clocks.isRunning(record.delayCountdownClockId!)) {
                    record.promptUI?.hide();

                    if (!record.countdownUI?.visible) {
                        record.countdownUI?.show();
                    }
                }

                record.countdownUI?.setLabel(mod.Message(mod.stringkeys.ffaSpawnPoints.countdown, seconds));
            },
        });

        if (showDebugPosition) {
            record.debugPositionUI = new UIText({
                width: 360,
                height: 26,
                anchor: UI.Anchor.BottomCenter,
                label: mod.Message(mod.stringkeys.ffaSpawnPoints.debug.position, 0, 0, 0),
                textSize: 20,
                textColor: UI.COLORS.BF_GREEN_BRIGHT,
                bgColor: UI.COLORS.BF_GREY_4,
                bgAlpha: 0.75,
                bgFill: UI.BgFill.Blur,
                receiver: player,
            });

            const updatePosition = () => {
                const { x, y, z } = this._getPlayerPosition(player);
                record.debugPositionUI?.setLabel(mod.Message(mod.stringkeys.ffaSpawnPoints.debug.position, x, y, z));
            };

            record.updatePositionIntervalId = Timers.setInterval(updatePosition, 1_000);
        }
    }

    /**
     * Removes and unregisters a player from the spawning system.
     * @param playerOrId - The player or player ID to remove.
     * @returns Whether the player was found and removed.
     */
    public removePlayer(playerOrId: mod.Player | number): boolean {
        const record = this._getPlayerRecord(playerOrId);

        if (!record) return false;

        if (record.delayCountdownClockId !== null) {
            Clocks.stop(record.delayCountdownClockId);
            record.delayCountdownClockId = null;
        }

        if (record.updatePositionIntervalId !== null) {
            Timers.clearInterval(record.updatePositionIntervalId);
            record.updatePositionIntervalId = null;
        }

        record.promptUI?.delete();
        record.countdownUI?.delete();
        record.debugPositionUI?.delete();

        this._players.delete(record.playerId);

        const queueIndex = this._spawnQueue.indexOf(record);

        if (queueIndex !== -1) {
            this._spawnQueue.splice(queueIndex, 1);
        }

        return true;
    }

    /**
     * Starts the countdown before prompting the player to spawn or delay again.
     * Usually called in `Events.OnPlayerJoinGame` or `Events.OnPlayerUndeploy`.
     * AI soldiers skip the countdown and are added to the spawn queue immediately.
     * @param playerOrId - The player or player ID.
     * @param delay - Delay in seconds (defaults to initialPromptDelay).
     */
    public startDelayForPrompt(playerOrId: mod.Player | number, delay: number = this._initialPromptDelay): void {
        const record = this._getPlayerRecord(playerOrId);

        if (!record || !this._isPlayerRecordValid(record)) return;

        if (record.isAI) {
            this._addToQueue(record);
            return;
        }

        if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
            FFASpawnPoints.logging.log(
                `Starting ${delay}s delay for P_${record.playerId}.`,
                FFASpawnPoints.LogLevel.Debug
            );
        }

        if (delay <= 0) {
            this._addToQueue(record);
            return;
        }

        Clocks.setDuration(record.delayCountdownClockId!, delay);
        Clocks.start(record.delayCountdownClockId!);
    }

    /**
     * Forces a player into the spawn queue immediately, skipping any countdown and prompt.
     * @param playerOrId - The player or player ID to force into the queue.
     */
    public forceIntoQueue(playerOrId: mod.Player | number): void {
        const record = this._getPlayerRecord(playerOrId);

        if (!record || !this._isPlayerRecordValid(record)) return;

        this._addToQueue(record);
    }

    /**
     * Evaluates all spawn points using multi-factor fitness scoring and selects the best candidate.
     * @returns The zero-based index of the chosen spawn point, or null if no spawn points are set.
     */
    public getBestSpawnIndex(): number | null {
        const totalSpawns = this._count;

        if (totalSpawns === 0) return null;

        const now = Date.now() - FFASpawnPoints.SERVER_START_TIME;

        // Fast path: if no active players are on the field, pick a random spawn point in O(1)
        if (PlayerLocations.getActivePlayerCount() === 0) {
            const randomIndex = Math.floor(Math.random() * totalSpawns);
            this._lastUsedTimes[randomIndex] = now === 0 ? 1 : now;

            if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
                FFASpawnPoints.logging.log(
                    `No active players on map. Selected random spawn index ${randomIndex}.`,
                    FFASpawnPoints.LogLevel.Debug
                );
            }

            return randomIndex;
        }

        const posX = this._posX;
        const posY = this._posY;
        const posZ = this._posZ;
        const orientations = this._orientations;
        const lastUsedTimes = this._lastUsedTimes;
        const topIndices = this._topIndices;
        const topScores = this._topScores;

        const scorer = this._customScorer;
        const poolSize = topIndices.length;

        let topCount = 0;

        for (let i = 0; i < totalSpawns; ++i) {
            const lastUsed = lastUsedTimes[i];
            const elapsed = lastUsed > 0 ? now - lastUsed : Infinity;

            const score = scorer(posX[i], posY[i], posZ[i], orientations[i], elapsed);

            if (topCount >= poolSize && score <= topScores[poolSize - 1]) continue;

            // Insert into top-K buffer (sorted descending)
            let pos = topCount < poolSize ? topCount++ : poolSize - 1;

            while (pos > 0 && topScores[pos - 1] < score) {
                topScores[pos] = topScores[pos - 1];
                topIndices[pos] = topIndices[pos - 1];
                pos--;
            }

            topScores[pos] = score;
            topIndices[pos] = i;
        }

        // Select uniformly at random among Top-K candidate pool
        const selectedRank = Math.floor(Math.random() * topCount);
        const chosenIndex = topIndices[selectedRank];

        lastUsedTimes[chosenIndex] = now === 0 ? 1 : now;

        if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
            FFASpawnPoints.logging.log(
                `Spawn index ${chosenIndex} selected (score: ${topScores[selectedRank].toFixed(2)}, rank: ${selectedRank + 1}/${topCount}).`,
                FFASpawnPoints.LogLevel.Debug
            );
        }

        return chosenIndex;
    }

    /**
     * Enables automatic processing of the spawn queue.
     */
    public enableSpawnQueueProcessing(): void {
        if (this._count === 0) {
            FFASpawnPoints.logging.log(
                `No spawn points set. Aborting spawn queue processing.`,
                FFASpawnPoints.LogLevel.Warning
            );

            return;
        }

        if (this._queueProcessingEnabled) return;

        this._queueProcessingEnabled = true;
        this._processSpawnQueue();
    }

    /**
     * Disables automatic processing of the spawn queue.
     */
    public disableSpawnQueueProcessing(): void {
        this._queueProcessingEnabled = false;

        if (this._queueProcessingTimerId !== null) {
            Timers.clearTimeout(this._queueProcessingTimerId);
            this._queueProcessingTimerId = null;
        }

        this._queueProcessingActive = false;
    }

    /**
     * Destroys this `FFASpawnPoints` instance, removing all player UI, timers, and event listeners.
     */
    public destroy(): void {
        this.disableSpawnQueueProcessing();
        this._leaveGameUnsubscribe();

        for (const record of this._players.values()) {
            if (record.delayCountdownClockId !== null) {
                Clocks.stop(record.delayCountdownClockId);
            }

            if (record.updatePositionIntervalId !== null) {
                Timers.clearInterval(record.updatePositionIntervalId);
            }

            record.promptUI?.delete();
            record.countdownUI?.delete();
            record.debugPositionUI?.delete();
        }

        this._players.clear();
        this._spawnQueue.length = 0;
    }

    private _addToQueue(record: FFASpawnPoints.PlayerRecord): void {
        if (!record.isAI) {
            if (record.delayCountdownClockId !== null) {
                Clocks.reset(record.delayCountdownClockId);
            }

            record.promptUI?.show();
        }

        if (!this._spawnQueue.includes(record)) {
            this._spawnQueue.push(record);
        }

        if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
            FFASpawnPoints.logging.log(
                `P_${record.playerId} added to queue (${this._spawnQueue.length} total).`,
                FFASpawnPoints.LogLevel.Debug
            );
        }

        if (!this._queueProcessingEnabled || this._queueProcessingActive) return;

        if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
            FFASpawnPoints.logging.log(`Restarting spawn queue processing.`, FFASpawnPoints.LogLevel.Debug);
        }

        this._processSpawnQueue();
    }

    private _processSpawnQueue(): void {
        this._queueProcessingActive = true;

        if (!this._queueProcessingEnabled) {
            this._queueProcessingActive = false;
            return;
        }

        if (this._count === 0) {
            FFASpawnPoints.logging.log(`No spawn points set.`, FFASpawnPoints.LogLevel.Warning);
            this._queueProcessingActive = false;
            return;
        }

        if (this._spawnQueue.length === 0) {
            if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
                FFASpawnPoints.logging.log(
                    `No players in queue. Suspending processing.`,
                    FFASpawnPoints.LogLevel.Debug
                );
            }

            this._queueProcessingActive = false;
            return;
        } else if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
            FFASpawnPoints.logging.log(
                `Processing ${this._spawnQueue.length} in queue.`,
                FFASpawnPoints.LogLevel.Debug
            );
        }

        while (this._spawnQueue.length > 0) {
            const record = this._spawnQueue.shift();

            if (!record || !this._isPlayerRecordValid(record)) continue;

            const spawnIndex = this.getBestSpawnIndex();

            if (spawnIndex === null) continue;

            const spawnPoint = this._spawnPoints[spawnIndex];

            if (FFASpawnPoints.logging.willLog(FFASpawnPoints.LogLevel.Debug)) {
                FFASpawnPoints._scratchVector.x = this._posX[spawnIndex];
                FFASpawnPoints._scratchVector.y = this._posY[spawnIndex];
                FFASpawnPoints._scratchVector.z = this._posZ[spawnIndex];

                FFASpawnPoints.logging.log(
                    `Spawning P_${record.playerId} at ${Vectors.getVectorString(FFASpawnPoints._scratchVector)}.`,
                    FFASpawnPoints.LogLevel.Debug
                );
            }

            mod.SpawnPlayerFromSpawnPoint(record.player, spawnPoint);
        }

        this._queueProcessingTimerId = Timers.setTimeout(
            () => this._processSpawnQueue(),
            this._queueProcessingDelay * 1000
        );
    }

    private _isPlayerRecordValid(record: FFASpawnPoints.PlayerRecord): boolean {
        if (mod.IsPlayerValid(record.player)) return true;

        this.removePlayer(record.playerId);

        return false;
    }

    private _getPlayerPosition(player: mod.Player): Vectors.Vector3 {
        const pos = PlayerLocations.getPosition(player, FFASpawnPoints._scratchVector);

        if (!pos) return Vectors.ZERO;

        return Vectors.truncate(
            Vectors.multiply(pos, 100, FFASpawnPoints._scratchVector),
            0,
            FFASpawnPoints._scratchVector
        );
    }

    private _getPlayerRecord(playerOrId: mod.Player | number): FFASpawnPoints.PlayerRecord | null {
        const playerId = typeof playerOrId === 'number' ? playerOrId : mod.GetObjId(playerOrId);

        return playerId === undefined ? null : (this._players.get(playerId) ?? null);
    }

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
    public static defaultScorer(
        x: number,
        y: number,
        z: number,
        orientation: number,
        elapsed: number,
        options?: FFASpawnPoints.DefaultScorerOptions
    ): number {
        const minSafeDist = options?.minSafeDistance ?? 20;
        const idealDist = options?.idealDistance ?? 35;
        const maxDist = options?.maxDistance ?? 80;
        const crowdRadius = options?.crowdingRadius ?? 50;
        const crowdWeight = options?.crowdingWeight ?? 0.25;
        const cooldownMs = options?.spawnCooldownMs ?? 4000;
        const faceWeight = options?.facingWeight ?? 0.15;

        const closestPlayerId = PlayerLocations.getClosestPlayerId(x, y, z);

        let closestDist = Infinity;
        let facingAlignment = 0;

        if (closestPlayerId !== undefined) {
            const playerPos = PlayerLocations.getPosition(closestPlayerId, FFASpawnPoints._scratchVector);

            if (playerPos) {
                const dx = playerPos.x - x;
                const dy = playerPos.y - y;
                const dz = playerPos.z - z;
                closestDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                const horizDist = Math.sqrt(dx * dx + dz * dz);

                if (horizDist > 0.001) {
                    const rad = orientation * (Math.PI / 180);
                    const dirX = Math.sin(rad);
                    const dirZ = -Math.cos(rad);
                    facingAlignment = (dirX * dx + dirZ * dz) / horizDist;
                }
            }
        }

        const nearbyCount = PlayerLocations.findPlayersInSphere(x, y, z, crowdRadius);

        // 1. Proximity score with safe distance floor and ideal distance peak
        let distScore = 0;

        if (closestDist < minSafeDist) {
            distScore = -1000 * (1 - closestDist / minSafeDist);
        } else if (closestDist <= idealDist) {
            const range = idealDist - minSafeDist;
            distScore = range > 0 ? (closestDist - minSafeDist) / range : 1.0;
        } else if (closestDist <= maxDist) {
            const range = maxDist - idealDist;
            distScore = range > 0 ? 1.0 - (closestDist - idealDist) / range : 0.0;
        } else {
            distScore = 0.0;
        }

        // 2. Crowding penalty for high enemy concentration in nearby sector
        const crowdPenalty = Math.max(0, nearbyCount - 1) * crowdWeight;

        // 3. Temporal cooldown penalty to prevent consecutive respawns on the same spot
        const cooldownPenalty = elapsed < cooldownMs ? (1.0 - elapsed / cooldownMs) * 2.0 : 0.0;

        // 4. Facing alignment bonus when player spawns facing towards the action
        const facingBonus = ((facingAlignment + 1) / 2) * faceWeight;

        return distScore - crowdPenalty - cooldownPenalty + facingBonus;
    }
}

export namespace FFASpawnPoints {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Type for defining spawn point data:
     * <x, y, z> world position where the player should spawn.
     * Orientation is the compass angle (0-360) for spawn direction.
     */
    export type SpawnData = [x: number, y: number, z: number, orientation: number];

    /**
     * Internal player tracking record for FFA spawning and UI timers.
     */
    export interface PlayerRecord {
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
    export type Scorer = (
        x: number,
        y: number,
        z: number,
        orientation: number,
        elapsedSinceLastUsedMs: number
    ) => number;

    /**
     * Optional configuration overrides for the default fitness scoring algorithm.
     */
    export type DefaultScorerOptions = {
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
    export type Options = {
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
