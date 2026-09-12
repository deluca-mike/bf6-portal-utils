import { Clocks } from '../clocks/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UITextButton } from '../ui/components/text-button/index.ts';
import { UIText } from '../ui/components/text/index.ts';

/**
 * Class managing Free-For-All aerial drop-in spawn points, spawn regions, and spawning queues.
 * @version 2.0.0
 */
export class FFADropIns {
    public static readonly logging = new Logging('FDI');

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
        FFADropIns.logging.setLogging(log, logLevel, includeRawError);
    }

    private static readonly _scratchVector: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

    private readonly _count: number;
    private readonly _posX: Float32Array;
    private readonly _posY: Float32Array;
    private readonly _posZ: Float32Array;
    private readonly _spawnPoints: mod.SpawnPoint[];

    private readonly _rectMinX: Float32Array;
    private readonly _rectMinZ: Float32Array;
    private readonly _rectMaxX: Float32Array;
    private readonly _rectMaxZ: Float32Array;
    private readonly _cumulativeAreas: Float32Array;
    private readonly _totalArea: number;

    private readonly _players = new Map<number, FFADropIns.PlayerRecord>();
    private readonly _spawnQueue: FFADropIns.PlayerRecord[] = [];
    private readonly _leaveGameUnsubscribe: () => void;

    private readonly _initialPromptDelay: number;
    private readonly _promptDelay: number;
    private readonly _queueProcessingDelay: number;

    private _queueProcessingEnabled: boolean = false;
    private _queueProcessingActive: boolean = false;
    private _queueProcessingTimerId: Timers.TimerID | null = null;

    /**
     * Initializes the drop-in spawning system with the given region rectangles, altitude, and options.
     * @param spawnData - The drop-in spawning region (rectangles and altitude).
     * @param options - Optional configuration overrides for spawn points and delays.
     */
    constructor(spawnData: FFADropIns.SpawnData, options?: FFADropIns.Options) {
        if (!spawnData || !spawnData.spawnRectangles || spawnData.spawnRectangles.length === 0) {
            FFADropIns.logging.log('No drop-in rectangles provided.', FFADropIns.LogLevel.Error);
        }

        mod.EnableHQ(mod.GetHQ(1), false);
        mod.EnableHQ(mod.GetHQ(2), false);

        // Pre-filter valid zones with area > 0
        const rawZones = spawnData?.spawnRectangles ?? [];
        const validZones: FFADropIns.SpawnRectangle[] = [];
        let runningTotalArea = 0;

        for (let i = 0; i < rawZones.length; ++i) {
            const zone = rawZones[i];
            const width = Math.abs(zone.maxX - zone.minX);
            const depth = Math.abs(zone.maxZ - zone.minZ);
            const area = width * depth;

            if (area > 0) {
                validZones.push({
                    minX: Math.min(zone.minX, zone.maxX),
                    maxX: Math.max(zone.minX, zone.maxX),
                    minZ: Math.min(zone.minZ, zone.maxZ),
                    maxZ: Math.max(zone.minZ, zone.maxZ),
                });
            }
        }

        const zoneCount = validZones.length;
        this._rectMinX = new Float32Array(zoneCount);
        this._rectMinZ = new Float32Array(zoneCount);
        this._rectMaxX = new Float32Array(zoneCount);
        this._rectMaxZ = new Float32Array(zoneCount);
        this._cumulativeAreas = new Float32Array(zoneCount);

        for (let i = 0; i < zoneCount; ++i) {
            const zone = validZones[i];
            const width = zone.maxX - zone.minX;
            const depth = zone.maxZ - zone.minZ;
            const area = width * depth;

            runningTotalArea += area;
            this._rectMinX[i] = zone.minX;
            this._rectMinZ[i] = zone.minZ;
            this._rectMaxX[i] = zone.maxX;
            this._rectMaxZ[i] = zone.maxZ;
            this._cumulativeAreas[i] = runningTotalArea;
        }

        this._totalArea = runningTotalArea;

        if (zoneCount === 0 || runningTotalArea <= 0) {
            this._count = 0;
            this._posX = new Float32Array(0);
            this._posY = new Float32Array(0);
            this._posZ = new Float32Array(0);
            this._spawnPoints = [];
        } else {
            const requestedPoints = options?.dropInPoints ?? 64;
            const dropInPoints = Math.max(1, requestedPoints);
            this._count = dropInPoints;

            this._posX = new Float32Array(dropInPoints);
            this._posY = new Float32Array(dropInPoints);
            this._posZ = new Float32Array(dropInPoints);
            this._spawnPoints = new Array(dropInPoints);

            const tempPt = { x: 0, z: 0 };
            const zeroRot = Vectors.toVector(Vectors.ZERO);
            const altitude = spawnData.y;

            for (let i = 0; i < dropInPoints; ++i) {
                this._sampleRandomPoint(tempPt);
                const x = tempPt.x;
                const y = altitude;
                const z = tempPt.z;

                this._posX[i] = x;
                this._posY[i] = y;
                this._posZ[i] = z;

                const location = mod.CreateVector(x, y, z);
                this._spawnPoints[i] = mod.SpawnObject(
                    mod.RuntimeSpawn_Common.PlayerSpawner,
                    location,
                    zeroRot
                ) as mod.SpawnPoint;
            }
        }

        this._initialPromptDelay = options?.initialPromptDelay ?? 10;
        this._promptDelay = options?.promptDelay ?? 10;
        this._queueProcessingDelay = options?.queueProcessingDelay ?? 2;

        this._leaveGameUnsubscribe = Events.OnPlayerLeaveGame.subscribe((playerId) => {
            this.removePlayer(playerId);
        });

        if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Info)) {
            FFADropIns.logging.log(
                `Initialized with ${this._count} drop-in spawn points across ${zoneCount} rectangles.`,
                FFADropIns.LogLevel.Info
            );
        }
    }

    /**
     * Total number of spawn points managed by this instance.
     * @returns The spawn count.
     */
    public get spawnCount(): number {
        return this._count;
    }

    private _sampleRandomPoint(out: { x: number; z: number }): void {
        const randomValue = Math.random() * this._totalArea;

        let low = 0;
        let high = this._cumulativeAreas.length - 1;
        let selectedIndex = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);

            if (this._cumulativeAreas[mid] >= randomValue) {
                selectedIndex = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        const minX = this._rectMinX[selectedIndex];
        const maxX = this._rectMaxX[selectedIndex];
        const minZ = this._rectMinZ[selectedIndex];
        const maxZ = this._rectMaxZ[selectedIndex];

        out.x = minX + Math.random() * (maxX - minX);
        out.z = minZ + Math.random() * (maxZ - minZ);
    }

    /**
     * Adds and registers a player to be managed by this drop-in spawning system.
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

        const record: FFADropIns.PlayerRecord = {
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
            anchor: mod.UIAnchor.Center,
            visible: false,
            bgColor: UI.COLORS.BF_GREY_4,
            bgAlpha: 0.5,
            bgFill: mod.UIBgFill.Blur,
            receiver: player,
            uiInputModeWhenVisible: true,
        });

        new UITextButton({
            parent: record.promptUI,
            x: 0,
            y: 20,
            width: 400,
            height: 40,
            anchor: mod.UIAnchor.TopCenter,
            bgColor: UI.COLORS.BF_GREY_2,
            baseColor: UI.COLORS.BF_GREY_2,
            baseAlpha: 1,
            pressedColor: UI.COLORS.BF_GREEN_DARK,
            pressedAlpha: 1,
            focusedColor: UI.COLORS.BF_GREY_1,
            focusedAlpha: 1,
            label: mod.Message(mod.stringkeys.ffaDropIns.buttons.spawn),
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
            anchor: mod.UIAnchor.TopCenter,
            bgColor: UI.COLORS.BF_GREY_2,
            baseColor: UI.COLORS.BF_GREY_2,
            baseAlpha: 1,
            pressedColor: UI.COLORS.BF_YELLOW_DARK,
            pressedAlpha: 1,
            focusedColor: UI.COLORS.BF_GREY_1,
            focusedAlpha: 1,
            label: mod.Message(mod.stringkeys.ffaDropIns.buttons.delay, this._promptDelay),
            textSize: 30,
            textColor: UI.COLORS.BF_YELLOW_BRIGHT,
            onClickUp: () => this.startDelayForPrompt(playerId, this._promptDelay),
        });

        record.countdownUI = new UIText({
            x: 0,
            y: 60,
            width: 400,
            height: 50,
            anchor: mod.UIAnchor.TopCenter,
            label: mod.Message(mod.stringkeys.ffaDropIns.countdown, 0),
            textSize: 30,
            textColor: UI.COLORS.BF_GREEN_BRIGHT,
            bgColor: UI.COLORS.BF_GREY_4,
            bgAlpha: 0.5,
            bgFill: mod.UIBgFill.Solid,
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

                record.countdownUI?.setLabel(mod.Message(mod.stringkeys.ffaDropIns.countdown, seconds));
            },
        });

        if (showDebugPosition) {
            record.debugPositionUI = new UIText({
                width: 360,
                height: 26,
                anchor: mod.UIAnchor.BottomCenter,
                label: mod.Message(mod.stringkeys.ffaDropIns.debug.position, 0, 0, 0),
                textSize: 20,
                textColor: UI.COLORS.BF_GREEN_BRIGHT,
                bgColor: UI.COLORS.BF_GREY_4,
                bgAlpha: 0.75,
                bgFill: mod.UIBgFill.Blur,
                receiver: player,
            });

            const updatePosition = () => {
                const { x, y, z } = this._getPlayerPosition(player);
                record.debugPositionUI?.setLabel(mod.Message(mod.stringkeys.ffaDropIns.debug.position, x, y, z));
            };

            record.updatePositionIntervalId = Timers.setInterval(updatePosition, 1_000);
        }
    }

    /**
     * Removes and unregisters a player from the drop-in spawning system.
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

        if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
            FFADropIns.logging.log(`Starting ${delay}s delay for P_${record.playerId}.`, FFADropIns.LogLevel.Debug);
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
     * Selects a random drop-in spawn point index.
     * @returns The zero-based index of the chosen spawn point, or null if no spawn points are set.
     */
    public getRandomSpawnIndex(): number | null {
        if (this._count === 0) return null;
        return Math.floor(Math.random() * this._count);
    }

    /**
     * Evaluates and returns the best spawn point index.
     * For drop-ins without proximity scoring, uniformly selects a random drop point.
     * Provided for full interface polymorphism with `FFASpawnPoints`.
     * @returns The zero-based index of the chosen spawn point, or null if no spawn points are set.
     */
    public getBestSpawnIndex(): number | null {
        return this.getRandomSpawnIndex();
    }

    /**
     * Enables automatic processing of the spawn queue.
     */
    public enableSpawnQueueProcessing(): void {
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
     * Clears all players currently waiting in the spawn queue without spawning them.
     */
    public clearSpawnQueue(): void {
        this._spawnQueue.length = 0;
    }

    /**
     * Destroys this `FFADropIns` instance, removing all player UI, timers, and event listeners.
     */
    public destroy(): void {
        this._leaveGameUnsubscribe();

        if (this._queueProcessingTimerId !== null) {
            Timers.clearTimeout(this._queueProcessingTimerId);
            this._queueProcessingTimerId = null;
        }

        this._queueProcessingEnabled = false;
        this._queueProcessingActive = false;

        const playerIds = Array.from(this._players.keys());

        for (let i = 0; i < playerIds.length; ++i) {
            this.removePlayer(playerIds[i]);
        }

        this._spawnQueue.length = 0;
    }

    private _addToQueue(record: FFADropIns.PlayerRecord): void {
        if (!record.isAI) {
            if (record.delayCountdownClockId !== null) {
                Clocks.reset(record.delayCountdownClockId);
            }

            record.promptUI?.show();
        }

        if (!this._spawnQueue.includes(record)) {
            this._spawnQueue.push(record);
        }

        if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
            FFADropIns.logging.log(
                `P_${record.playerId} added to queue (${this._spawnQueue.length} total).`,
                FFADropIns.LogLevel.Debug
            );
        }

        if (!this._queueProcessingEnabled || this._queueProcessingActive) return;

        if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
            FFADropIns.logging.log('Restarting spawn queue processing.', FFADropIns.LogLevel.Debug);
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
            FFADropIns.logging.log('No spawn points set.', FFADropIns.LogLevel.Warning);
            this._queueProcessingActive = false;
            return;
        }

        if (this._spawnQueue.length === 0) {
            if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
                FFADropIns.logging.log('No players in queue. Suspending processing.', FFADropIns.LogLevel.Debug);
            }

            this._queueProcessingActive = false;
            return;
        } else if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
            FFADropIns.logging.log(`Processing ${this._spawnQueue.length} in queue.`, FFADropIns.LogLevel.Debug);
        }

        while (this._spawnQueue.length > 0) {
            const record = this._spawnQueue.shift();

            if (!record || !this._isPlayerRecordValid(record)) continue;

            const spawnIndex = this.getRandomSpawnIndex();

            if (spawnIndex === null) continue;

            const spawnPoint = this._spawnPoints[spawnIndex];

            if (FFADropIns.logging.willLog(FFADropIns.LogLevel.Debug)) {
                FFADropIns._scratchVector.x = this._posX[spawnIndex];
                FFADropIns._scratchVector.y = this._posY[spawnIndex];
                FFADropIns._scratchVector.z = this._posZ[spawnIndex];

                FFADropIns.logging.log(
                    `Spawning P_${record.playerId} at ${Vectors.getVectorString(FFADropIns._scratchVector)}.`,
                    FFADropIns.LogLevel.Debug
                );
            }

            mod.SpawnPlayerFromSpawnPoint(record.player, spawnPoint);
        }

        this._queueProcessingTimerId = Timers.setTimeout(
            () => this._processSpawnQueue(),
            this._queueProcessingDelay * 1000
        );
    }

    private _isPlayerRecordValid(record: FFADropIns.PlayerRecord): boolean {
        if (mod.IsPlayerValid(record.player)) return true;

        this.removePlayer(record.playerId);

        return false;
    }

    private _getPlayerPosition(player: mod.Player): Vectors.Vector3 {
        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) return Vectors.ZERO;

        const position = mod.GetObjectPosition(player);

        return Vectors.truncate(
            Vectors.multiply(Vectors.toVector3(position), 100, FFADropIns._scratchVector),
            0,
            FFADropIns._scratchVector
        );
    }

    private _getPlayerRecord(playerOrId: mod.Player | number): FFADropIns.PlayerRecord | null {
        const playerId = typeof playerOrId === 'number' ? playerOrId : mod.GetObjId(playerOrId);

        return playerId === undefined ? null : (this._players.get(playerId) ?? null);
    }
}

export namespace FFADropIns {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Type for defining rectangle components of a drop-in spawning region.
     */
    export type SpawnRectangle = {
        minX: number;
        minZ: number;
        maxX: number;
        maxZ: number;
    };

    /**
     * Type for defining drop-in spawn data when initializing the system.
     */
    export type SpawnData = {
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
     * Optional configuration overrides for drop-in spawning points and delays:
     */
    export type Options = {
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
