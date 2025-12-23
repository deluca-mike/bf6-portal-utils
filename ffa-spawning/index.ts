import { SolidUI } from '../solid-ui/index.ts';
import { UI } from '../ui/index.ts';
import { Timers } from '../timers/index.ts';

// version: 3.2.0
export namespace FFASpawning {
    export enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }

    export type SpawnData = [x: number, y: number, z: number, orientation: number];

    export type Spawn = {
        index: number;
        spawnPoint: mod.SpawnPoint;
        location: mod.Vector;
    };

    export type InitializeOptions = {
        maxSpawnCandidates?: number;
        minimumSafeDistance?: number;
        maximumInterestingDistance?: number;
        safeOverInterestingFallbackFactor?: number;
        initialPromptDelay?: number;
        promptDelay?: number;
        queueProcessingDelay?: number;
    };

    export class Soldier {
        private static readonly _ALL_SOLDIERS: { [playerId: number]: Soldier } = {};

        private static readonly _PRIME_STEPS: number[] = [2039, 2027, 2017];

        private static _spawns: FFASpawning.Spawn[] = [];

        // The maximum number of random spawns to consider when trying to find a spawn point for a player.
        private static _maxSpawnCandidates: number = 12;

        // The minimum distance a spawn point must be to another player to be considered safe.
        private static _minimumSafeDistance: number = 20;

        // The maximum distance a spawn point must be to another player to be considered acceptable.
        private static _maximumInterestingDistance: number = 40;

        // The amount to scale the midpoint between the `_minimumSafeDistance` and `_maximumInterestingDistance` to evaluate a fallback spawn.
        private static _safeOverInterestingFallbackFactor: number = 1.5;

        private static _spawnQueue: Soldier[] = [];

        // Time subsequent delays between prompts.
        private static _promptDelay: number = 10;

        // Time initial delay until the player is asked to spawn.
        private static _initialPromptDelay: number = this._promptDelay;

        // The delay between processing the spawn queue.
        private static _queueProcessingDelay: number = 1;

        private static _queueProcessingEnabled: boolean = false;

        private static _queueProcessingActive: boolean = false;

        private static _logger?: (text: string) => void;

        private static _logLevel: FFASpawning.LogLevel = 2;

        private static _log(logLevel: FFASpawning.LogLevel, text: string): void {
            if (logLevel < this._logLevel) return;

            this._logger?.(`<FFAS> ${text}`);
        }

        private static _getRotationVector(orientation: number): mod.Vector {
            return mod.CreateVector(0, mod.DegreesToRadians(180 - orientation), 0);
        }

        private static _getBestSpawnPoint(): FFASpawning.Spawn {
            const primeSteps = this._PRIME_STEPS; // Prime Walking Algorithm
            const stepSize = primeSteps[~~mod.RandomReal(0, primeSteps.length) % primeSteps.length]; // Mod because `RandomReal` is apparently inclusive of the end value.
            const spawns = this._spawns;
            const startIndex = ~~mod.RandomReal(0, spawns.length) % spawns.length; // Mod because `RandomReal` is apparently inclusive of the end value.

            let safeFallbackSpawn: FFASpawning.Spawn | undefined = undefined;
            let safeFallbackDistance: number = Number.MAX_SAFE_INTEGER;

            let interestingFallbackSpawn: FFASpawning.Spawn | undefined = undefined;
            let interestingFallbackDistance: number = -1;

            for (let i = 0; i < this._maxSpawnCandidates; ++i) {
                const index = (startIndex + i * stepSize) % spawns.length;
                const candidate = spawns[index];
                const distance = this._getDistanceToClosestPlayer(candidate.location);

                // If the spawn is ideal, return it.
                if (distance >= this._minimumSafeDistance && distance <= this._maximumInterestingDistance) {
                    this._log(FFASpawning.LogLevel.Debug, `Spawn-${index} is ideal (${distance.toFixed(2)}m).`);
                    return candidate;
                }

                if (distance >= this._minimumSafeDistance) {
                    // If the spawn is safe but not interesting, check if its more interesting than the current most interesting safe fallback.
                    if (distance < safeFallbackDistance) {
                        safeFallbackSpawn = candidate;
                        safeFallbackDistance = distance;
                    }
                } else if (distance <= this._maximumInterestingDistance) {
                    // If the spawn is interesting but not safe, check if its safer than the current safest interesting fallback.
                    if (distance > interestingFallbackDistance) {
                        interestingFallbackSpawn = candidate;
                        interestingFallbackDistance = distance;
                    }
                }
            }

            if (!safeFallbackSpawn) return interestingFallbackSpawn ?? spawns[startIndex]; // No safe fallback, return the interesting fallback.

            if (!interestingFallbackSpawn) return safeFallbackSpawn; // No interesting fallback, return the safe fallback.

            // Get the midpoint between the `_minimumSafeDistance` and `_maximumInterestingDistance` and scale it by the `_safeOverInterestingFallbackFactor`.
            const scaledMidpoint =
                (this._safeOverInterestingFallbackFactor *
                    (this._minimumSafeDistance + this._maximumInterestingDistance)) /
                2;

            // Determine the fallback spawn by comparing the distance to the scaled midpoint. A higher `_safeOverInterestingFallbackFactor` will favour the safe fallback more.
            const { spawn, distance } =
                safeFallbackDistance - scaledMidpoint < scaledMidpoint - interestingFallbackDistance
                    ? { spawn: safeFallbackSpawn, distance: safeFallbackDistance }
                    : {
                          spawn: interestingFallbackSpawn,
                          distance: interestingFallbackDistance,
                      };

            this._log(
                FFASpawning.LogLevel.Info,
                `Spawn-${spawn.index} is the non-ideal fallback (${distance.toFixed(2)}m).`
            );

            return spawn;
        }

        private static _getDistanceToClosestPlayer(location: mod.Vector): number {
            const closestPlayer = mod.ClosestPlayerTo(location);

            if (!mod.IsPlayerValid(closestPlayer)) return this._minimumSafeDistance; // No players alive on the map.

            return mod.DistanceBetween(
                location,
                mod.GetSoldierState(closestPlayer, mod.SoldierStateVector.GetPosition)
            );
        }

        private static _processSpawnQueue(): void {
            this._queueProcessingActive = true;

            if (!this._queueProcessingEnabled) {
                this._queueProcessingActive = false;
                return;
            }

            if (this._spawns.length == 0) {
                this._log(FFASpawning.LogLevel.Error, `No spawn points set.`);
                this._queueProcessingActive = false;
                return;
            }

            this._log(FFASpawning.LogLevel.Debug, `Processing ${this._spawnQueue.length} in queue.`);

            if (this._spawnQueue.length == 0) {
                this._log(FFASpawning.LogLevel.Debug, `No players in queue. Suspending processing.`);
                this._queueProcessingActive = false;
                return;
            }

            while (this._spawnQueue.length > 0) {
                const soldier = this._spawnQueue.shift();

                if (!soldier || soldier._deleteIfNotValid()) continue;

                const spawn = this._getBestSpawnPoint();

                this._log(
                    FFASpawning.LogLevel.Debug,
                    `Spawning P_${soldier._playerId} at ${this.getVectorString(spawn.location)}.`
                );

                mod.EnableUIInputMode(false, soldier._player);
                mod.SpawnPlayerFromSpawnPoint(soldier._player, spawn.spawnPoint);
            }

            mod.Wait(this._queueProcessingDelay).then(() => this._processSpawnQueue());
        }

        public static getVectorString(vector: mod.Vector): string {
            return `<${mod.XComponentOf(vector).toFixed(2)}, ${mod.YComponentOf(vector).toFixed(2)}, ${mod
                .ZComponentOf(vector)
                .toFixed(2)}>`;
        }

        // Attaches a logger and defines a minimum log level.
        public static setLogging(log?: (text: string) => void, logLevel?: FFASpawning.LogLevel): void {
            this._logger = log;
            this._logLevel = logLevel ?? FFASpawning.LogLevel.Info;
        }

        // Should be called in the `OnGameModeStarted()` event. Orientation is the compass angle integer.
        public static initialize(spawns: FFASpawning.SpawnData[], options?: FFASpawning.InitializeOptions): void {
            mod.EnableHQ(mod.GetHQ(1), false);
            mod.EnableHQ(mod.GetHQ(2), false);

            this._spawns = spawns.map((spawn, index) => {
                const location = mod.CreateVector(spawn[0], spawn[1], spawn[2]);

                return {
                    index: index,
                    spawnPoint: mod.SpawnObject(
                        mod.RuntimeSpawn_Common.PlayerSpawner,
                        location,
                        this._getRotationVector(spawn[3])
                    ),
                    location: location,
                };
            });

            this._maxSpawnCandidates = options?.maxSpawnCandidates ?? this._maxSpawnCandidates;
            this._minimumSafeDistance = options?.minimumSafeDistance ?? this._minimumSafeDistance;
            this._maximumInterestingDistance = options?.maximumInterestingDistance ?? this._maximumInterestingDistance;

            this._safeOverInterestingFallbackFactor =
                options?.safeOverInterestingFallbackFactor ?? this._safeOverInterestingFallbackFactor;

            this._initialPromptDelay = options?.initialPromptDelay ?? this._initialPromptDelay;
            this._promptDelay = options?.promptDelay ?? this._promptDelay;
            this._queueProcessingDelay = options?.queueProcessingDelay ?? this._queueProcessingDelay;

            this._log(FFASpawning.LogLevel.Info, `Initialized with ${this._spawns.length} spawn points.`);
        }

        // Starts the countdown before prompting the player to spawn or delay again, usually in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
        // AI soldiers will skip the countdown and spawn immediately.
        public static startDelayForPrompt(player: mod.Player): void {
            this._log(FFASpawning.LogLevel.Debug, `Start delay request for P_${mod.GetObjId(player)}.`);

            const soldier = this._ALL_SOLDIERS[mod.GetObjId(player)];

            if (!soldier || soldier._deleteIfNotValid()) return;

            soldier.startDelayForPrompt();
        }

        // Forces a player to be added to the spawn queue, skipping the countdown and prompt.
        public static forceIntoQueue(player: mod.Player): void {
            if (!mod.IsPlayerValid(player)) return;

            const soldier = this._ALL_SOLDIERS[mod.GetObjId(player)];

            if (!soldier || soldier._deleteIfNotValid()) return;

            soldier._addToQueue();
        }

        // Enables the processing of the spawn queue.
        public static enableSpawnQueueProcessing(): void {
            if (this._queueProcessingEnabled) return;

            this._queueProcessingEnabled = true;
            this._processSpawnQueue();
        }

        // Disables the processing of the spawn queue.
        public static disableSpawnQueueProcessing(): void {
            this._queueProcessingEnabled = false;
        }

        // Every player that should be handled by this spawning system should be instantiated as a `FFASpawning`, usually in the `OnPlayerSpawned()` event.
        constructor(player: mod.Player) {
            this._player = player;
            this._playerId = mod.GetObjId(player);

            Soldier._ALL_SOLDIERS[this._playerId] = this;

            this._isAISoldier = mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier);

            if (this._isAISoldier) return;

            const [delayCountdown, setDelayCountdown] = SolidUI.createSignal(-1);

            this._delayCountdown = { get: delayCountdown, set: setDelayCountdown };

            this._promptUI = SolidUI.h(
                UI.Container,
                {
                    x: 0,
                    y: 0,
                    width: 440,
                    height: 140,
                    anchor: mod.UIAnchor.Center,
                    visible: () => {
                        const visible = delayCountdown() == 0;

                        if (!visible) return false;

                        mod.EnableUIInputMode(true, this._player); // Allow payer to click prompt buttons.

                        return true;
                    },
                    bgColor: UI.COLORS.BF_GREY_4,
                    bgAlpha: 0.5,
                    bgFill: mod.UIBgFill.Blur,
                },
                player
            );

            SolidUI.h(UI.TextButton, {
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
                message: mod.Message(mod.stringkeys.ffaSpawning.buttons.spawn),
                textSize: 30,
                textColor: UI.COLORS.BF_GREEN_BRIGHT,
                onClick: async (player: mod.Player): Promise<void> => this._addToQueue(),
            });

            SolidUI.h(UI.TextButton, {
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
                message: mod.Message(mod.stringkeys.ffaSpawning.buttons.delay, Soldier._promptDelay),
                textSize: 30,
                textColor: UI.COLORS.BF_YELLOW_BRIGHT,
                onClick: async (player: mod.Player): Promise<void> => this.startDelayForPrompt(Soldier._promptDelay),
            });

            this._countdownUI = SolidUI.h(
                UI.Text,
                {
                    x: 0,
                    y: 60,
                    width: 400,
                    height: 50,
                    anchor: mod.UIAnchor.TopCenter,
                    message: () => mod.Message(mod.stringkeys.ffaSpawning.countdown, delayCountdown()),
                    textSize: 30,
                    textColor: UI.COLORS.BF_GREEN_BRIGHT,
                    bgColor: UI.COLORS.BF_GREY_4,
                    bgAlpha: 0.5,
                    bgFill: mod.UIBgFill.Solid,
                    visible: () => delayCountdown() > 0,
                },
                player
            );
        }

        private _player: mod.Player;

        private _playerId: number;

        private _isAISoldier: boolean;

        private _delayCountdown: { get: () => number; set: (value: number) => void } = { get: () => -1, set: () => {} };

        private _delayCountdownInterval?: number;

        private _promptUI?: UI.Container;

        private _countdownUI?: UI.Text;

        public get player(): mod.Player {
            return this._player;
        }

        public get playerId(): number {
            return this._playerId;
        }

        // Starts the countdown before prompting the player to spawn or delay again, usually in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
        // AI soldiers will skip the countdown and spawn immediately.
        public startDelayForPrompt(delay: number = Soldier._initialPromptDelay): void {
            if (this._isAISoldier) return this._addToQueue();

            Soldier._log(FFASpawning.LogLevel.Debug, `Starting ${delay}s delay for P_${this._playerId}.`);

            mod.EnableUIInputMode(false, this._player);

            if (delay <= 0) return this._addToQueue();

            this._delayCountdown.set(delay);

            Timers.clearInterval(this._delayCountdownInterval);
            this._delayCountdownInterval = Timers.setInterval(() => this._handleDelayCountdown(), 1);
        }

        private _handleDelayCountdown(): void {
            if (this._deleteIfNotValid()) return;

            const timeLeft = this._delayCountdown.get();

            if (timeLeft > 0) return this._delayCountdown.set(timeLeft - 1);

            Timers.clearInterval(this._delayCountdownInterval);
        }

        private _addToQueue(): void {
            if (!this._isAISoldier) {
                this._delayCountdown.set(-1);
            }

            Soldier._spawnQueue.push(this);

            Soldier._log(
                FFASpawning.LogLevel.Debug,
                `P_${this._playerId} added to queue (${Soldier._spawnQueue.length} total).`
            );

            if (!Soldier._queueProcessingEnabled || Soldier._queueProcessingActive) return;

            Soldier._log(FFASpawning.LogLevel.Debug, `Restarting spawn queue processing.`);
            Soldier._processSpawnQueue();
        }

        private _deleteIfNotValid(): boolean {
            if (mod.IsPlayerValid(this._player)) return false;

            Soldier._log(FFASpawning.LogLevel.Info, `P_${this._playerId} is no longer valid.`);

            Timers.clearInterval(this._delayCountdownInterval);

            this._promptUI?.delete();
            this._countdownUI?.delete();

            delete Soldier._ALL_SOLDIERS[this._playerId];

            return true;
        }
    }
}
