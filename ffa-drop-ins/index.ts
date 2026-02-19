import { Clocks } from '../clocks/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UITextButton } from '../ui/components/text-button/index.ts';
import { UIText } from '../ui/components/text/index.ts';

// version: 1.0.0
export namespace FFADropIns {
    const logging = new Logging('FDI');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    /**
     * Type for defining rectangle components of a drop-in spawning region.
     */
    export type SpawnRectangle = {
        minX: number;
        minZ: number;
        maxX: number;
        maxZ: number;
    };

    interface Point {
        x: number;
        z: number;
    }

    class SpawnRegion {
        private rectangles: SpawnRectangle[] = [];
        private cumulativeAreas: number[] = [];
        private totalArea: number = 0;

        constructor(zones: SpawnRectangle[]) {
            if (!zones || zones.length === 0) {
                throw new Error('SpawnRegion must be initialized with at least one rectangle.');
            }

            // Pre-calculate areas and weights
            for (const zone of zones) {
                // Ensure min is actually smaller than max to prevent negative areas
                const width = Math.abs(zone.maxX - zone.minX);
                const depth = Math.abs(zone.maxZ - zone.minZ);
                const area = width * depth;

                if (area <= 0) continue;

                // Only add zones that actually have size
                this.rectangles.push(zone);
                this.totalArea += area;
                this.cumulativeAreas.push(this.totalArea);
            }
        }

        private _randomFloat(min: number, max: number): number {
            return min + Math.random() * (max - min);
        }

        /**
         * Returns a random X/Z coordinate uniformly distributed across all zones.
         * Time Complexity: O(log N) where N is the number of rectangles.
         */
        public getSpawnPoint(): Point {
            // 1. Select which Rectangle to spawn in based on Area Weight
            // (Larger rectangles get picked more often)
            const randomValue = Math.random() * this.totalArea;

            // Binary Search to find the rectangle index
            let low = 0;
            let high = this.cumulativeAreas.length - 1;
            let selectedIndex = -1;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);

                if (this.cumulativeAreas[mid] >= randomValue) {
                    selectedIndex = mid;
                    high = mid - 1;
                } else {
                    low = mid + 1;
                }
            }

            const rectangle = this.rectangles[selectedIndex];

            return {
                x: this._randomFloat(rectangle.minX, rectangle.maxX),
                z: this._randomFloat(rectangle.minZ, rectangle.maxZ),
            };
        }
    }

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

    type Spawn = {
        index: number;
        spawnPoint: mod.SpawnPoint;
        location: mod.Vector;
    };

    /**
     * Optional overrides for drop-in spawning points and delays when calling `initialize()`:
     */
    export type InitializeOptions = {
        /**
         * The number of drop-in spawn points to create.
         */
        dropInPoints?: number;
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

    const spawnQueue: Soldier[] = [];
    const ffaSpawns: Spawn[] = [];

    let promptDelay: number = 10;
    let initialPromptDelay: number = 10;
    let queueProcessingDelay: number = 2;
    let queueProcessingEnabled: boolean = false;
    let queueProcessingActive: boolean = false;

    /**
     * Initializes the spawning system. Should be called in the `OnGameModeStarted()` event.
     * @param spawnData - The data to use.
     * @param options - The options to use for overriding the defaults.
     */
    export function initialize(spawnData: SpawnData, options?: InitializeOptions): void {
        if (ffaSpawns.length > 0) {
            logging.log(`Already initialized.`, LogLevel.Warning);
            return;
        }

        if (spawnData.spawnRectangles.length === 0) {
            logging.log(`No drop-in rectangles provided. Initialization aborted.`, LogLevel.Warning);
            return;
        }

        mod.EnableHQ(mod.GetHQ(1), false);
        mod.EnableHQ(mod.GetHQ(2), false);

        const spawnRegion = new SpawnRegion(spawnData.spawnRectangles);

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Using ${spawnData.spawnRectangles.length} drop-in rectangles.`, LogLevel.Info);
        }

        const dropInPoints = options?.dropInPoints ?? 64;

        for (let i = 0; i < dropInPoints; ++i) {
            ffaSpawns.push(createRandomSpawnPoint(spawnRegion, spawnData.y, i));
        }

        initialPromptDelay = options?.initialPromptDelay ?? initialPromptDelay;
        promptDelay = options?.promptDelay ?? promptDelay;
        queueProcessingDelay = options?.queueProcessingDelay ?? queueProcessingDelay;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Initialized with ${dropInPoints} drop-in spawn points.`, LogLevel.Info);
        }
    }

    function createRandomSpawnPoint(spawnRegion: SpawnRegion, y: number, index: number): Spawn {
        const { x, z } = spawnRegion.getSpawnPoint();
        const location = mod.CreateVector(x, y, z);

        const spawnPoint = mod.SpawnObject(
            mod.RuntimeSpawn_Common.PlayerSpawner,
            location,
            Vectors.ZERO_VECTOR
        ) as mod.SpawnPoint;

        return {
            index,
            spawnPoint,
            location,
        };
    }

    function processSpawnQueue(): void {
        queueProcessingActive = true;

        if (!queueProcessingEnabled) {
            queueProcessingActive = false;
            return;
        }

        if (ffaSpawns.length == 0) {
            logging.log(`No spawn points set.`, LogLevel.Warning);
            queueProcessingActive = false;
            return;
        }

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(`Processing ${spawnQueue.length} in queue.`, LogLevel.Debug);
        }

        if (spawnQueue.length == 0) {
            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`No players in queue. Suspending processing.`, LogLevel.Debug);
            }

            queueProcessingActive = false;
            return;
        }

        while (spawnQueue.length > 0) {
            const soldier = spawnQueue.shift();

            if (!soldier || soldier.deleteIfNotValid()) continue;

            const spawn = ffaSpawns[Math.floor(Math.random() * ffaSpawns.length)];

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(
                    `Spawning P_${soldier.playerId} at ${Vectors.getVectorString(spawn.location)}.`,
                    LogLevel.Debug
                );
            }

            mod.SpawnPlayerFromSpawnPoint(soldier.player, spawn.spawnPoint);
        }

        Timers.setTimeout(processSpawnQueue, queueProcessingDelay * 1000);
    }

    /**
     * Enables the processing of the spawn queue.
     */
    export function enableSpawnQueueProcessing(): void {
        if (queueProcessingEnabled) return;

        queueProcessingEnabled = true;
        processSpawnQueue();
    }

    /**
     * Disables the processing of the spawn queue.
     */
    export function disableSpawnQueueProcessing(): void {
        queueProcessingEnabled = false;
    }

    /**
     * Class representing a soldier whose spawning will be managed by this module.
     */
    export class Soldier {
        private static readonly _ALL_SOLDIERS = new Map<number, Soldier>();

        static {
            Events.OnPlayerLeaveGame.subscribe(Soldier._deleteSoldierIfNotValid);
        }

        public static _deleteSoldierIfNotValid(playerId: number): void {
            Soldier._ALL_SOLDIERS.get(playerId)?.deleteIfNotValid();
        }

        private static _getPosition(player: mod.Player): Vectors.Vector3 {
            if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) return Vectors.ZERO_VECTOR3;

            const position = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);

            return Vectors.truncate(Vectors.multiply(Vectors.toVector3(position), 100), 0);
        }

        /**
         * Starts the countdown before prompting the player to spawn or delay again.
         * Usually called in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
         * AI soldiers will skip the countdown and spawn immediately.
         * @param player - The player to start the delay for.
         */
        public static startDelayForPrompt(player: mod.Player): void {
            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Start delay request for P_${mod.GetObjId(player)}.`, LogLevel.Debug);
            }

            const soldier = Soldier._ALL_SOLDIERS.get(mod.GetObjId(player));

            if (!soldier || soldier.deleteIfNotValid()) return;

            soldier.startDelayForPrompt();
        }

        /**
         * Forces a player to be added to the spawn queue, skipping the countdown and prompt.
         * @param player - The player to force into the queue.
         */
        public static forceIntoQueue(player: mod.Player): void {
            if (!mod.IsPlayerValid(player)) return;

            const soldier = Soldier._ALL_SOLDIERS.get(mod.GetObjId(player));

            if (!soldier || soldier.deleteIfNotValid()) return;

            soldier._addToQueue();
        }

        /**
         * Every player that should be handled by this spawning system should be instantiated as a `Soldier`,
         * usually in the `OnPlayerJoinGame()` event.
         * @param player - The player to instantiate the `Soldier` for.
         * @param showDebugPosition - Whether to show the debug position.
         */
        constructor(player: mod.Player, showDebugPosition: boolean = false) {
            this._player = player;
            this._playerId = mod.GetObjId(player);

            Soldier._ALL_SOLDIERS.set(this._playerId, this);

            this._isAISoldier = mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier);

            if (this._isAISoldier) return;

            this._promptUI = new UIContainer({
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
                parent: this._promptUI,
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
                hoverColor: UI.COLORS.BF_GREY_1,
                hoverAlpha: 1,
                focusedColor: UI.COLORS.BF_GREY_1,
                focusedAlpha: 1,
                message: mod.Message(mod.stringkeys.ffaDropIns.buttons.spawn),
                textSize: 30,
                textColor: UI.COLORS.BF_GREEN_BRIGHT,
                onClick: (player: mod.Player) => this._addToQueue(),
            });

            new UITextButton({
                parent: this._promptUI,
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
                hoverColor: UI.COLORS.BF_GREY_1,
                hoverAlpha: 1,
                focusedColor: UI.COLORS.BF_GREY_1,
                focusedAlpha: 1,
                message: mod.Message(mod.stringkeys.ffaDropIns.buttons.delay, promptDelay),
                textSize: 30,
                textColor: UI.COLORS.BF_YELLOW_BRIGHT,
                onClick: (player: mod.Player) => this.startDelayForPrompt(promptDelay),
            });

            this._countdownUI = new UIText({
                x: 0,
                y: 60,
                width: 400,
                height: 50,
                anchor: mod.UIAnchor.TopCenter,
                message: mod.Message(mod.stringkeys.ffaDropIns.countdown, 0),
                textSize: 30,
                textColor: UI.COLORS.BF_GREEN_BRIGHT,
                bgColor: UI.COLORS.BF_GREY_4,
                bgAlpha: 0.5,
                bgFill: mod.UIBgFill.Solid,
                visible: false,
                receiver: player,
            });

            this._delayCountdownClock = new Clocks.CountDownClock(initialPromptDelay, {
                onSecond: (seconds: number) => {
                    if (this._delayCountdownClock?.isComplete) {
                        this._countdownUI?.hide();
                        this._promptUI?.show();
                    }

                    if (this._delayCountdownClock?.isRunning) {
                        if (this._promptUI?.visible) {
                            this._promptUI?.hide();
                        }

                        if (!this._countdownUI?.visible) {
                            this._countdownUI?.show();
                        }
                    }

                    this._countdownUI?.setMessage(mod.Message(mod.stringkeys.ffaDropIns.countdown, seconds));
                },
            });

            if (showDebugPosition) {
                this._debugPositionUI = new UIText({
                    width: 360,
                    height: 26,
                    anchor: mod.UIAnchor.BottomCenter,
                    message: mod.Message(mod.stringkeys.ffaDropIns.debug.position, 0, 0, 0),
                    textSize: 20,
                    textColor: UI.COLORS.BF_GREEN_BRIGHT,
                    bgColor: UI.COLORS.BF_GREY_4,
                    bgAlpha: 0.75,
                    bgFill: mod.UIBgFill.Blur,
                    receiver: player,
                });

                const updatePosition = () => {
                    const { x, y, z } = Soldier._getPosition(player);
                    this._debugPositionUI?.setMessage(mod.Message(mod.stringkeys.ffaDropIns.debug.position, x, y, z));
                };

                this._updatePositionInterval = Timers.setInterval(updatePosition, 1_000);
            }
        }

        private _player: mod.Player;

        private _playerId: number;

        private _isAISoldier: boolean;

        private _delayCountdownClock?: Clocks.CountDownClock;

        private _promptUI?: UIContainer;

        private _countdownUI?: UIText;

        private _updatePositionInterval?: number;

        private _debugPositionUI?: UIText;

        /**
         * @returns The player associated with this `Soldier` instance.
         */
        public get player(): mod.Player {
            return this._player;
        }

        /**
         * @returns The unique ID of the player associated with this instance.
         */
        public get playerId(): number {
            return this._playerId;
        }

        /**
         * Starts the countdown before prompting the player to spawn or delay again.
         * Usually called in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
         * AI soldiers will skip the countdown and spawn immediately.
         * @param delay - The delay to start the countdown for (in seconds). Defaults to the initial prompt delay.
         */
        public startDelayForPrompt(delay: number = initialPromptDelay): void {
            if (this._isAISoldier) return this._addToQueue();

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Starting ${delay}s delay for P_${this._playerId}.`, LogLevel.Debug);
            }

            if (delay <= 0) return this._addToQueue();

            this._delayCountdownClock?.setDuration(delay).start();
        }

        /**
         * Deletes the `Soldier` instance if the player is no longer valid.
         * @returns Whether the `Soldier` instance was deleted.
         */
        public deleteIfNotValid(): boolean {
            if (mod.IsPlayerValid(this._player)) return false;

            logging.log(`P_${this._playerId} is no longer valid.`, LogLevel.Warning);

            this._delayCountdownClock?.stop();
            Timers.clearInterval(this._updatePositionInterval);

            this._promptUI?.delete();
            this._countdownUI?.delete();
            this._debugPositionUI?.delete();

            Soldier._ALL_SOLDIERS.delete(this._playerId);

            return true;
        }

        private _addToQueue(): void {
            if (!this._isAISoldier) {
                this._delayCountdownClock?.reset();
                this._promptUI?.hide();
            }

            spawnQueue.push(this);

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`P_${this._playerId} added to queue (${spawnQueue.length} total).`, LogLevel.Debug);
            }

            if (!queueProcessingEnabled || queueProcessingActive) return;

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Restarting spawn queue processing.`, LogLevel.Debug);
            }

            processSpawnQueue();
        }
    }
}
