export declare namespace Events {
    export enum Type {
        OngoingGlobal = 0,
        OngoingAreaTrigger = 1,
        OngoingCapturePoint = 2,
        OngoingEmplacementSpawner = 3,
        OngoingHQ = 4,
        OngoingInteractPoint = 5,
        OngoingLootSpawner = 6,
        OngoingMCOM = 7,
        OngoingPlayer = 8,
        OngoingRingOfFire = 9,
        OngoingSector = 10,
        OngoingSpawner = 11,
        OngoingSpawnPoint = 12,
        OngoingTeam = 13,
        OngoingVehicle = 14,
        OngoingVehicleSpawner = 15,
        OngoingWaypointPath = 16,
        OngoingWorldIcon = 17,
        OnAIMoveToFailed = 18,
        OnAIMoveToRunning = 19,
        OnAIMoveToSucceeded = 20,
        OnAIParachuteRunning = 21,
        OnAIParachuteSucceeded = 22,
        OnAIWaypointIdleFailed = 23,
        OnAIWaypointIdleRunning = 24,
        OnAIWaypointIdleSucceeded = 25,
        OnCapturePointCaptured = 26,
        OnCapturePointCapturing = 27,
        OnCapturePointLost = 28,
        OnGameModeEnding = 29,
        OnGameModeStarted = 30,
        OnMandown = 31,
        OnMCOMArmed = 32,
        OnMCOMDefused = 33,
        OnMCOMDestroyed = 34,
        OnPlayerDamaged = 35,
        OnPlayerDeployed = 36,
        OnPlayerDied = 37,
        OnPlayerEarnedKill = 38,
        OnPlayerEarnedKillAssist = 39,
        OnPlayerEnterAreaTrigger = 40,
        OnPlayerEnterCapturePoint = 41,
        OnPlayerEnterVehicle = 42,
        OnPlayerEnterVehicleSeat = 43,
        OnPlayerExitAreaTrigger = 44,
        OnPlayerExitCapturePoint = 45,
        OnPlayerExitVehicle = 46,
        OnPlayerExitVehicleSeat = 47,
        OnPlayerInteract = 48,
        OnPlayerJoinGame = 49,
        OnPlayerLeaveGame = 50,
        OnPlayerSwitchTeam = 51,
        OnPlayerUIButtonEvent = 52,
        OnPlayerUndeploy = 53,
        OnRayCastHit = 54,
        OnRayCastMissed = 55,
        OnRevived = 56,
        OnRingOfFireZoneSizeChange = 57,
        OnSpawnerSpawned = 58,
        OnTimeLimitReached = 59,
        OnVehicleDestroyed = 60,
        OnVehicleSpawned = 61
    }
    type Signature = {
        OngoingGlobal: () => void;
        OngoingAreaTrigger: (areaTrigger: mod.AreaTrigger) => void;
        OngoingCapturePoint: (capturePoint: mod.CapturePoint) => void;
        OngoingEmplacementSpawner: (emplacementSpawner: mod.EmplacementSpawner) => void;
        OngoingHQ: (hq: mod.HQ) => void;
        OngoingInteractPoint: (interactPoint: mod.InteractPoint) => void;
        OngoingLootSpawner: (lootSpawner: mod.LootSpawner) => void;
        OngoingMCOM: (mcom: mod.MCOM) => void;
        OngoingPlayer: (player: mod.Player) => void;
        OngoingRingOfFire: (ringOfFire: mod.RingOfFire) => void;
        OngoingSector: (sector: mod.Sector) => void;
        OngoingSpawner: (spawner: mod.Spawner) => void;
        OngoingSpawnPoint: (spawnPoint: mod.SpawnPoint) => void;
        OngoingTeam: (team: mod.Team) => void;
        OngoingVehicle: (vehicle: mod.Vehicle) => void;
        OngoingVehicleSpawner: (vehicleSpawner: mod.VehicleSpawner) => void;
        OngoingWaypointPath: (waypointPath: mod.WaypointPath) => void;
        OngoingWorldIcon: (worldIcon: mod.WorldIcon) => void;
        OnAIMoveToFailed: (player: mod.Player) => void;
        OnAIMoveToRunning: (player: mod.Player) => void;
        OnAIMoveToSucceeded: (player: mod.Player) => void;
        OnAIParachuteRunning: (player: mod.Player) => void;
        OnAIParachuteSucceeded: (player: mod.Player) => void;
        OnAIWaypointIdleFailed: (player: mod.Player) => void;
        OnAIWaypointIdleRunning: (player: mod.Player) => void;
        OnAIWaypointIdleSucceeded: (player: mod.Player) => void;
        OnCapturePointCaptured: (capturePoint: mod.CapturePoint) => void;
        OnCapturePointCapturing: (capturePoint: mod.CapturePoint) => void;
        OnCapturePointLost: (capturePoint: mod.CapturePoint) => void;
        OnGameModeEnding: () => void;
        OnGameModeStarted: () => void;
        OnMandown: (player: mod.Player, otherPlayer: mod.Player) => void;
        OnMCOMArmed: (mcom: mod.MCOM) => void;
        OnMCOMDefused: (mcom: mod.MCOM) => void;
        OnMCOMDestroyed: (mcom: mod.MCOM) => void;
        OnPlayerDamaged: (player: mod.Player, otherPlayer: mod.Player, damageType: mod.DamageType, weaponUnlock: mod.WeaponUnlock) => void;
        OnPlayerDeployed: (player: mod.Player) => void;
        OnPlayerDied: (player: mod.Player, otherPlayer: mod.Player, deathType: mod.DeathType, weaponUnlock: mod.WeaponUnlock) => void;
        OnPlayerEarnedKill: (player: mod.Player, otherPlayer: mod.Player, deathType: mod.DeathType, weaponUnlock: mod.WeaponUnlock) => void;
        OnPlayerEarnedKillAssist: (player: mod.Player, otherPlayer: mod.Player) => void;
        OnPlayerEnterAreaTrigger: (player: mod.Player, areaTrigger: mod.AreaTrigger) => void;
        OnPlayerEnterCapturePoint: (player: mod.Player, capturePoint: mod.CapturePoint) => void;
        OnPlayerEnterVehicle: (player: mod.Player, vehicle: mod.Vehicle) => void;
        OnPlayerEnterVehicleSeat: (player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object) => void;
        OnPlayerExitAreaTrigger: (player: mod.Player, areaTrigger: mod.AreaTrigger) => void;
        OnPlayerExitCapturePoint: (player: mod.Player, capturePoint: mod.CapturePoint) => void;
        OnPlayerExitVehicle: (player: mod.Player, vehicle: mod.Vehicle) => void;
        OnPlayerExitVehicleSeat: (player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object) => void;
        OnPlayerInteract: (player: mod.Player, interactPoint: mod.InteractPoint) => void;
        OnPlayerJoinGame: (player: mod.Player) => void;
        OnPlayerLeaveGame: (number: number) => void;
        OnPlayerSwitchTeam: (player: mod.Player, team: mod.Team) => void;
        OnPlayerUIButtonEvent: (player: mod.Player, uiWidget: mod.UIWidget, uiButtonEvent: mod.UIButtonEvent) => void;
        OnPlayerUndeploy: (player: mod.Player) => void;
        OnRayCastHit: (player: mod.Player, point: mod.Vector, normal: mod.Vector) => void;
        OnRayCastMissed: (player: mod.Player) => void;
        OnRevived: (player: mod.Player, otherPlayer: mod.Player) => void;
        OnRingOfFireZoneSizeChange: (ringOfFire: mod.RingOfFire, number: number) => void;
        OnSpawnerSpawned: (player: mod.Player, spawner: mod.Spawner) => void;
        OnTimeLimitReached: () => void;
        OnVehicleDestroyed: (vehicle: mod.Vehicle) => void;
        OnVehicleSpawned: (vehicle: mod.Vehicle) => void;
    };
    type EventTypeName<T extends Type> = {
        [K in keyof typeof Type]: (typeof Type)[K] extends T ? K : never;
    }[keyof typeof Type];
    type Parameters<T> = T extends (...args: infer P) => void ? P : never;
    type HandlerForType<T extends Type> = EventTypeName<T> extends keyof Signature ? Signature[EventTypeName<T>] extends (...args: infer P) => void ? (...args: P) => void | Promise<void> : never : never;
    type EventParameters<T extends Type> = EventTypeName<T> extends keyof Signature ? Parameters<Signature[EventTypeName<T>]> : never;
    export function subscribe<T extends Type>(type: T, handler: HandlerForType<T>): void;
    export function unsubscribe<T extends Type>(type: T, handler: HandlerForType<T>): void;
    export function trigger<T extends Type>(type: T, ...args: EventParameters<T>): void;
    export {};
}
export declare function OngoingGlobal(): void;
export declare function OngoingAreaTrigger(areaTrigger: mod.AreaTrigger): void;
export declare function OngoingCapturePoint(capturePoint: mod.CapturePoint): void;
export declare function OngoingEmplacementSpawner(emplacementSpawner: mod.EmplacementSpawner): void;
export declare function OngoingHQ(hq: mod.HQ): void;
export declare function OngoingInteractPoint(interactPoint: mod.InteractPoint): void;
export declare function OngoingLootSpawner(lootSpawner: mod.LootSpawner): void;
export declare function OngoingMCOM(mcom: mod.MCOM): void;
export declare function OngoingPlayer(player: mod.Player): void;
export declare function OngoingRingOfFire(ringOfFire: mod.RingOfFire): void;
export declare function OngoingSector(sector: mod.Sector): void;
export declare function OngoingSpawner(spawner: mod.Spawner): void;
export declare function OngoingSpawnPoint(spawnPoint: mod.SpawnPoint): void;
export declare function OngoingTeam(team: mod.Team): void;
export declare function OngoingVehicle(vehicle: mod.Vehicle): void;
export declare function OngoingVehicleSpawner(vehicleSpawner: mod.VehicleSpawner): void;
export declare function OngoingWaypointPath(waypointPath: mod.WaypointPath): void;
export declare function OngoingWorldIcon(worldIcon: mod.WorldIcon): void;
export declare function OnAIMoveToFailed(player: mod.Player): void;
export declare function OnAIMoveToRunning(player: mod.Player): void;
export declare function OnAIMoveToSucceeded(player: mod.Player): void;
export declare function OnAIParachuteRunning(player: mod.Player): void;
export declare function OnAIParachuteSucceeded(player: mod.Player): void;
export declare function OnAIWaypointIdleFailed(player: mod.Player): void;
export declare function OnAIWaypointIdleRunning(player: mod.Player): void;
export declare function OnAIWaypointIdleSucceeded(player: mod.Player): void;
export declare function OnCapturePointCaptured(capturePoint: mod.CapturePoint): void;
export declare function OnCapturePointCapturing(capturePoint: mod.CapturePoint): void;
export declare function OnCapturePointLost(capturePoint: mod.CapturePoint): void;
export declare function OnGameModeEnding(): void;
export declare function OnGameModeStarted(): void;
export declare function OnMandown(player: mod.Player, otherPlayer: mod.Player): void;
export declare function OnMCOMArmed(mcom: mod.MCOM): void;
export declare function OnMCOMDefused(mcom: mod.MCOM): void;
export declare function OnMCOMDestroyed(mcom: mod.MCOM): void;
export declare function OnPlayerDamaged(player: mod.Player, otherPlayer: mod.Player, damageType: mod.DamageType, weaponUnlock: mod.WeaponUnlock): void;
export declare function OnPlayerDeployed(player: mod.Player): void;
export declare function OnPlayerDied(player: mod.Player, otherPlayer: mod.Player, deathType: mod.DeathType, weaponUnlock: mod.WeaponUnlock): void;
export declare function OnPlayerEarnedKill(player: mod.Player, otherPlayer: mod.Player, deathType: mod.DeathType, weaponUnlock: mod.WeaponUnlock): void;
export declare function OnPlayerEarnedKillAssist(player: mod.Player, otherPlayer: mod.Player): void;
export declare function OnPlayerEnterAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void;
export declare function OnPlayerEnterCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void;
export declare function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle): void;
export declare function OnPlayerEnterVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void;
export declare function OnPlayerExitAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void;
export declare function OnPlayerExitCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void;
export declare function OnPlayerExitVehicle(player: mod.Player, vehicle: mod.Vehicle): void;
export declare function OnPlayerExitVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void;
export declare function OnPlayerInteract(player: mod.Player, interactPoint: mod.InteractPoint): void;
export declare function OnPlayerJoinGame(player: mod.Player): void;
export declare function OnPlayerLeaveGame(number: number): void;
export declare function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void;
export declare function OnPlayerUIButtonEvent(player: mod.Player, uiWidget: mod.UIWidget, uiButtonEvent: mod.UIButtonEvent): void;
export declare function OnPlayerUndeploy(player: mod.Player): void;
export declare function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void;
export declare function OnRayCastMissed(player: mod.Player): void;
export declare function OnRevived(player: mod.Player, otherPlayer: mod.Player): void;
export declare function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void;
export declare function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void;
export declare function OnTimeLimitReached(): void;
export declare function OnVehicleDestroyed(vehicle: mod.Vehicle): void;
export declare function OnVehicleSpawned(vehicle: mod.Vehicle): void;
