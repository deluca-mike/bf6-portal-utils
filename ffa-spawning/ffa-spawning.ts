// version: 1.0.0

// NOTE: Requires the UI module.

class FFASpawningSoldier {

    private static allSoldiers: { [playerId: number]: FFASpawningSoldier } = {};

    // Time until the player is asked to spawn to delay the prompt again.
    private static readonly DELAY: number = 10;

    // The minimum distance a spawn point must be to another player to be considered safe.
    private static readonly SAFE_MINIMUM_DISTANCE: number = 20;
    
    // The maximum distance a spawn point must be to another player to be considered acceptable.
    private static readonly ACCEPTABLE_MAXIMUM_DISTANCE: number = 40;

    private static readonly PRIME_STEPS: number[] = [2039, 2027, 2017];

    // The maximum number of random spawns to consider when trying to find a spawn point for a player.
    private static readonly MAX_SPAWN_CHECKS: number = 10;

    // The delay between processing the spawn queue.
    private static readonly QUEUE_PROCESSING_DELAY: number = 1;

    private static spawns: FFASpawningSoldier.Spawn[] = [];

    private static spawnQueue: FFASpawningSoldier[] = [];

    private static queueProcessingEnabled: boolean = false;

    private static queueProcessingActive: boolean = false;

    private static logger?: (text: string) => void;

    private static logLevel: FFASpawningSoldier.LogLevel = 2;

    private static log(logLevel: FFASpawningSoldier.LogLevel, text: string): void {
        if (logLevel < FFASpawningSoldier.logLevel) return;

        FFASpawningSoldier.logger?.(`<FFASS> ${text}`);
    }

    private static getRotationVector(orientation: number): mod.Vector {
        return mod.CreateVector(0, mod.DegreesToRadians(180 - orientation), 0);
    }

    private static getBestSpawnPoint(): FFASpawningSoldier.Spawn {
        // Prime Walking Algorithm
        const primeSteps = FFASpawningSoldier.PRIME_STEPS;
        const stepSize = primeSteps[~~mod.RandomReal(0, primeSteps.length) % primeSteps.length]; // Mod because `RandomReal` is apparently inclusive of the end value.
        const spawns = FFASpawningSoldier.spawns;
        const startIndex = ~~mod.RandomReal(0, spawns.length) % spawns.length; // Mod because `RandomReal` is apparently inclusive of the end value.

        let bestFallback: FFASpawningSoldier.Spawn = spawns[startIndex];
        let maxDistance = -1;

        for (let i = 0; i < FFASpawningSoldier.MAX_SPAWN_CHECKS; ++i) {
            const index = (startIndex + (i * stepSize)) % spawns.length;
            const candidate = spawns[index];
            const distanceToClosestPlayer = FFASpawningSoldier.getDistanceToClosestPlayer(candidate.location);
        
            if (distanceToClosestPlayer >= FFASpawningSoldier.SAFE_MINIMUM_DISTANCE && distanceToClosestPlayer <= FFASpawningSoldier.ACCEPTABLE_MAXIMUM_DISTANCE) {
                FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Spawn-${index} is ideal (${distanceToClosestPlayer.toFixed(2)}m).`);
                return candidate; 
            }

            if (distanceToClosestPlayer <= maxDistance) continue;
        
            bestFallback = candidate;
            maxDistance = distanceToClosestPlayer;
        }

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Spawn-${bestFallback.index} is the non-ideal fallback (${maxDistance.toFixed(2)}m).`);

        return bestFallback;
    }

    private static getDistanceToClosestPlayer(location: mod.Vector): number {
        const closestPlayer = mod.ClosestPlayerTo(location);

        if (!mod.IsPlayerValid(closestPlayer)) return FFASpawningSoldier.SAFE_MINIMUM_DISTANCE; // No players alive on the map.

        return mod.DistanceBetween(location, mod.GetSoldierState(closestPlayer, mod.SoldierStateVector.GetPosition));
    }

    private static processSpawnQueue(): void {
        FFASpawningSoldier.queueProcessingActive = true;

        if (!FFASpawningSoldier.queueProcessingEnabled) {
            FFASpawningSoldier.queueProcessingActive = false;
            return;
        }

        if (FFASpawningSoldier.spawns.length == 0) {
            FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Error, `No spawn points set.`);
            FFASpawningSoldier.queueProcessingActive = false;
            return;
        }

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Processing ${FFASpawningSoldier.spawnQueue.length} in queue.`);

        if (FFASpawningSoldier.spawnQueue.length == 0) {
            FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `No players in queue. Suspending processing.`);
            FFASpawningSoldier.queueProcessingActive = false;
            return;
        }

        while (FFASpawningSoldier.spawnQueue.length > 0) {
            const soldier = FFASpawningSoldier.spawnQueue.shift();

            if (!soldier || soldier.deleteIfNotValid()) continue;

            const spawn = FFASpawningSoldier.getBestSpawnPoint();

            FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Spawning Player-${soldier.playerId} at ${FFASpawningSoldier.getVectorString(spawn.location)}.`);

            mod.SpawnPlayerFromSpawnPoint(soldier.player, spawn.spawnPoint);
        }

        mod.Wait(FFASpawningSoldier.QUEUE_PROCESSING_DELAY).then(() => FFASpawningSoldier.processSpawnQueue());
    }
    
    public static getVectorString(vector: mod.Vector): string {
        return `<${mod.XComponentOf(vector).toFixed(2)}, ${mod.YComponentOf(vector).toFixed(2)}, ${mod.ZComponentOf(vector).toFixed(2)}>`;
    }

    // Attaches a logger and defines a minimum log level.
    public static setLogging(log: (text: string) => void, logLevel?: FFASpawningSoldier.LogLevel): void {
        FFASpawningSoldier.logger = log;
        FFASpawningSoldier.logLevel = logLevel ?? FFASpawningSoldier.LogLevel.Info;
    }

    // Should be called in the `OnGameModeStarted()` event. Orientation is the compass angle integer.
    public static initialize(spawns: FFASpawningSoldier.SpawnData[]): void {
        mod.EnableHQ(mod.GetHQ(1), false);
        mod.EnableHQ(mod.GetHQ(2), false);

        FFASpawningSoldier.spawns = spawns.map((spawn, index) => {
            return {
                index: index,
                spawnPoint: mod.GetSpawnPoint(mod.GetObjId(mod.SpawnObject(mod.RuntimeSpawn_Common.PlayerSpawner, spawn.location, FFASpawningSoldier.getRotationVector(spawn.orientation)))), // TODO: check if this can be just `as mod.SpawnPoint`.
                location: spawn.location
            };
        });

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Set ${FFASpawningSoldier.spawns.length} spawn points.`);
    }

    // Starts the countdown before prompting the player to spawn or delay again, usually in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
    // AI soldiers will skip the countdown and spawn immediately.
    public static startDelayForPrompt(player: mod.Player): void {
        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Start delay request for Player-${mod.GetObjId(player)}.`);

        const soldier = FFASpawningSoldier.allSoldiers[mod.GetObjId(player)];

        if (!soldier || soldier.deleteIfNotValid()) return;

        soldier.startDelayForPrompt();
    }

    // Forces a player to be added to the spawn queue, skipping the countdown and prompt.
    public static forceIntoQueue(player: mod.Player): void {
        if (!mod.IsPlayerValid(player)) return;

        const soldier = FFASpawningSoldier.allSoldiers[mod.GetObjId(player)];

        if (!soldier || soldier.deleteIfNotValid()) return;

        soldier.addToQueue();
    }

    // Enables the processing of the spawn queue.
    public static enableSpawnQueueProcessing(): void {
        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Enabling processing spawn queue.`);

        if (FFASpawningSoldier.queueProcessingEnabled) return;

        FFASpawningSoldier.queueProcessingEnabled = true;
        FFASpawningSoldier.processSpawnQueue();
    }

    // Disables the processing of the spawn queue.
    public static disableSpawnQueueProcessing(): void {
        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Disabling processing spawn queue.`);

        FFASpawningSoldier.queueProcessingEnabled = false;
    }

    // Every player that should be handled by this spawning system should be instantiated as a `FFASpawningSoldier`, usually in the `OnPlayerJoinGame()` event.
    constructor(player: mod.Player) {
        this.player = player;
        this.playerId = mod.GetObjId(player);

        FFASpawningSoldier.allSoldiers[this.playerId] = this;

        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) return;

        this.promptUI = UI.createContainer({
            x: 0,
            y: 0,
            width: 400,
            height: 80,
            anchor: mod.UIAnchor.Center,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.5,
            visible: false,
            childrenParams: [
                {
                    type: UI.Type.Button,
                    x: 0,
                    y: 40,
                    width: 400,
                    height: 40,
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    label: {
                        message: mod.Message(mod.stringkeys.ffaAutoSpawningSoldier.buttons.spawn),
                        textSize: 30,
                        textColor: UI.COLORS.GREEN,
                    },
                    onClick: async (player: mod.Player): Promise<void> => {
                        this.addToQueue();
                    },
                },
                {
                    type: UI.Type.Button,
                    x: 0,
                    y: 0,
                    width: 400,
                    height: 40,
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    label: {
                        message: mod.Message(mod.stringkeys.ffaAutoSpawningSoldier.buttons.delay, FFASpawningSoldier.DELAY),
                        textSize: 30,
                        textColor: UI.COLORS.GREEN,
                    },
                    onClick: async (player: mod.Player): Promise<void> => {
                        this.startDelayForPrompt();
                    },
                },
            ]
        }, player);

        this.countdownUI = UI.createText({
            x: 0,
            y: 60,
            width: 400,
            height: 30,
            anchor: mod.UIAnchor.TopCenter,
            message: mod.Message(mod.stringkeys.ffaAutoSpawningSoldier.countdown, this.delayCountdown),
            textSize: 30,
            textColor: UI.COLORS.GREEN,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.5,
            bgFill: mod.UIBgFill.Solid,
            padding: 5,
            visible: false,
        }, player);
    }

    public player: mod.Player;

    private playerId: number;

    private delayCountdown: number = FFASpawningSoldier.DELAY;

    private promptUI?: UI.Container;

    private countdownUI?: UI.Text;

    // Starts the countdown before prompting the player to spawn or delay again, usually in the `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events.
    // AI soldiers will skip the countdown and spawn immediately.
    public startDelayForPrompt(): void {
        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Starting delay for Player-${this.playerId}.`);

        if (mod.GetSoldierState(this.player, mod.SoldierStateBool.IsAISoldier)) {
            this.addToQueue();
            return;
        }

        this.countdownUI?.show();
        this.promptUI?.hide();
        mod.EnableUIInputMode(false, this.player);

        this.delayCountdown = FFASpawningSoldier.DELAY;
        this.handleDelayCountdown();
    }

    private handleDelayCountdown(): void {
        if (this.deleteIfNotValid()) return;

        this.countdownUI?.setMessage(mod.Message(mod.stringkeys.ffaAutoSpawningSoldier.countdown, this.delayCountdown--));

        if (this.delayCountdown < 0) return this.showPrompt();

        mod.Wait(1).then(() => this.handleDelayCountdown());
    }

    private showPrompt(): void {
        this.countdownUI?.hide();
        mod.EnableUIInputMode(true, this.player);
        this.promptUI?.show();
    }

    private addToQueue(): void {
        FFASpawningSoldier.spawnQueue.push(this);

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Player-${this.playerId} added to queue (${FFASpawningSoldier.spawnQueue.length} total).`);

        this.countdownUI?.hide();
        this.promptUI?.hide();
        mod.EnableUIInputMode(false, this.player);

        if (!FFASpawningSoldier.queueProcessingEnabled || FFASpawningSoldier.queueProcessingActive) return;

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Debug, `Restarting spawn queue processing.`);
        FFASpawningSoldier.processSpawnQueue();
    }

    private deleteIfNotValid(): boolean {
        if (mod.IsPlayerValid(this.player)) return false;

        FFASpawningSoldier.log(FFASpawningSoldier.LogLevel.Info, `Player-${this.playerId} is no longer in the game.`);

        this.promptUI?.delete();
        this.countdownUI?.delete();
        delete FFASpawningSoldier.allSoldiers[this.playerId];
        return true;
    }

}

namespace FFASpawningSoldier {

    export enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }

    export interface SpawnData {
        location: mod.Vector;
        orientation: number;
    }

    export type Spawn = {
        index: number;
        spawnPoint: mod.SpawnPoint;
        location: mod.Vector;
    }

}
