// version: 1.0.0
export namespace Events {
    export enum Type {
        OngoingGlobal,
        OngoingAreaTrigger,
        OngoingCapturePoint,
        OngoingEmplacementSpawner,
        OngoingHQ,
        OngoingInteractPoint,
        OngoingLootSpawner,
        OngoingMCOM,
        OngoingPlayer,
        OngoingRingOfFire,
        OngoingSector,
        OngoingSpawner,
        OngoingSpawnPoint,
        OngoingTeam,
        OngoingVehicle,
        OngoingVehicleSpawner,
        OngoingWaypointPath,
        OngoingWorldIcon,
        OnAIMoveToFailed,
        OnAIMoveToRunning,
        OnAIMoveToSucceeded,
        OnAIParachuteRunning,
        OnAIParachuteSucceeded,
        OnAIWaypointIdleFailed,
        OnAIWaypointIdleRunning,
        OnAIWaypointIdleSucceeded,
        OnCapturePointCaptured,
        OnCapturePointCapturing,
        OnCapturePointLost,
        OnGameModeEnding,
        OnGameModeStarted,
        OnMandown,
        OnMCOMArmed,
        OnMCOMDefused,
        OnMCOMDestroyed,
        OnPlayerDamaged,
        OnPlayerDeployed,
        OnPlayerDied,
        OnPlayerEarnedKill,
        OnPlayerEarnedKillAssist,
        OnPlayerEnterAreaTrigger,
        OnPlayerEnterCapturePoint,
        OnPlayerEnterVehicle,
        OnPlayerEnterVehicleSeat,
        OnPlayerExitAreaTrigger,
        OnPlayerExitCapturePoint,
        OnPlayerExitVehicle,
        OnPlayerExitVehicleSeat,
        OnPlayerInteract,
        OnPlayerJoinGame,
        OnPlayerLeaveGame,
        OnPlayerSwitchTeam,
        OnPlayerUIButtonEvent,
        OnPlayerUndeploy,
        OnRayCastHit,
        OnRayCastMissed,
        OnRevived,
        OnRingOfFireZoneSizeChange,
        OnSpawnerSpawned,
        OnTimeLimitReached,
        OnVehicleDestroyed,
        OnVehicleSpawned,
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
        OnPlayerDamaged: (
            player: mod.Player,
            otherPlayer: mod.Player,
            damageType: mod.DamageType,
            weaponUnlock: mod.WeaponUnlock
        ) => void;
        OnPlayerDeployed: (player: mod.Player) => void;
        OnPlayerDied: (
            player: mod.Player,
            otherPlayer: mod.Player,
            deathType: mod.DeathType,
            weaponUnlock: mod.WeaponUnlock
        ) => void;
        OnPlayerEarnedKill: (
            player: mod.Player,
            otherPlayer: mod.Player,
            deathType: mod.DeathType,
            weaponUnlock: mod.WeaponUnlock
        ) => void;
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

    // Get the enum key name from the enum value.
    type EventTypeName<T extends Type> = {
        [K in keyof typeof Type]: (typeof Type)[K] extends T ? K : never;
    }[keyof typeof Type];

    // Extract parameters from a function type.
    type Parameters<T> = T extends (...args: infer P) => void ? P : never;

    // Get the handler function type for a specific event type.
    // Handlers can be synchronous or asynchronous (returning void or Promise<void>).
    type HandlerForType<T extends Type> =
        EventTypeName<T> extends keyof Signature
            ? Signature[EventTypeName<T>] extends (...args: infer P) => void
                ? (...args: P) => void | Promise<void>
                : never
            : never;

    // Get the parameter tuple for a specific event type.
    type EventParameters<T extends Type> =
        EventTypeName<T> extends keyof Signature ? Parameters<Signature[EventTypeName<T>]> : never;

    // Create a union of all possible handler types.
    // Handlers can be synchronous or asynchronous (returning void or Promise<void>).
    type AllHandlers = {
        [K in keyof typeof Type]: (typeof Type)[K] extends number
            ? K extends keyof Signature
                ? Signature[K] extends (...args: infer P) => void
                    ? (...args: P) => void | Promise<void>
                    : never
                : never
            : never;
    }[keyof typeof Type];

    const handlers = new Map<Type, Set<AllHandlers>>();

    export function subscribe<T extends Type>(type: T, handler: HandlerForType<T>): void {
        if (!handlers.has(type)) {
            handlers.set(type, new Set());
        }

        handlers.get(type)!.add(handler as AllHandlers);
    }

    export function unsubscribe<T extends Type>(type: T, handler: HandlerForType<T>): void {
        handlers.get(type)?.delete(handler as AllHandlers);
    }

    export function trigger<T extends Type>(type: T, ...args: EventParameters<T>): void {
        const typeHandlers = handlers.get(type);

        if (!typeHandlers) return;

        // Execute each handler asynchronously and non-blocking.
        // Errors in one handler won't prevent other handlers from executing.
        typeHandlers.forEach((handler) => {
            // Wrap in Promise.resolve to handle both sync and async handlers.
            // Don't await - fire and forget for non-blocking behavior.
            Promise.resolve()
                .then(() => {
                    // At runtime, we know handler matches the type, so this is safe.
                    return (handler as HandlerForType<T>)(...args);
                })
                .catch((error) => {
                    // Silently catch errors to prevent one handler from affecting others.
                });
        });
    }
}

export function OngoingGlobal(): void {
    Events.trigger(Events.Type.OngoingGlobal);
}

export function OngoingAreaTrigger(areaTrigger: mod.AreaTrigger): void {
    Events.trigger(Events.Type.OngoingAreaTrigger, areaTrigger);
}

export function OngoingCapturePoint(capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OngoingCapturePoint, capturePoint);
}

export function OngoingEmplacementSpawner(emplacementSpawner: mod.EmplacementSpawner): void {
    Events.trigger(Events.Type.OngoingEmplacementSpawner, emplacementSpawner);
}

export function OngoingHQ(hq: mod.HQ): void {
    Events.trigger(Events.Type.OngoingHQ, hq);
}

export function OngoingInteractPoint(interactPoint: mod.InteractPoint): void {
    Events.trigger(Events.Type.OngoingInteractPoint, interactPoint);
}

export function OngoingLootSpawner(lootSpawner: mod.LootSpawner): void {
    Events.trigger(Events.Type.OngoingLootSpawner, lootSpawner);
}

export function OngoingMCOM(mcom: mod.MCOM): void {
    Events.trigger(Events.Type.OngoingMCOM, mcom);
}

export function OngoingPlayer(player: mod.Player): void {
    Events.trigger(Events.Type.OngoingPlayer, player);
}

export function OngoingRingOfFire(ringOfFire: mod.RingOfFire): void {
    Events.trigger(Events.Type.OngoingRingOfFire, ringOfFire);
}

export function OngoingSector(sector: mod.Sector): void {
    Events.trigger(Events.Type.OngoingSector, sector);
}

export function OngoingSpawner(spawner: mod.Spawner): void {
    Events.trigger(Events.Type.OngoingSpawner, spawner);
}

export function OngoingSpawnPoint(spawnPoint: mod.SpawnPoint): void {
    Events.trigger(Events.Type.OngoingSpawnPoint, spawnPoint);
}

export function OngoingTeam(team: mod.Team): void {
    Events.trigger(Events.Type.OngoingTeam, team);
}

export function OngoingVehicle(vehicle: mod.Vehicle): void {
    Events.trigger(Events.Type.OngoingVehicle, vehicle);
}

export function OngoingVehicleSpawner(vehicleSpawner: mod.VehicleSpawner): void {
    Events.trigger(Events.Type.OngoingVehicleSpawner, vehicleSpawner);
}

export function OngoingWaypointPath(waypointPath: mod.WaypointPath): void {
    Events.trigger(Events.Type.OngoingWaypointPath, waypointPath);
}

export function OngoingWorldIcon(worldIcon: mod.WorldIcon): void {
    Events.trigger(Events.Type.OngoingWorldIcon, worldIcon);
}

export function OnAIMoveToFailed(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIMoveToFailed, player);
}

export function OnAIMoveToRunning(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIMoveToRunning, player);
}

export function OnAIMoveToSucceeded(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIMoveToSucceeded, player);
}

export function OnAIParachuteRunning(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIParachuteRunning, player);
}

export function OnAIParachuteSucceeded(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIParachuteSucceeded, player);
}

export function OnAIWaypointIdleFailed(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIWaypointIdleFailed, player);
}

export function OnAIWaypointIdleRunning(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIWaypointIdleRunning, player);
}

export function OnAIWaypointIdleSucceeded(player: mod.Player): void {
    Events.trigger(Events.Type.OnAIWaypointIdleSucceeded, player);
}

export function OnCapturePointCaptured(capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OnCapturePointCaptured, capturePoint);
}

export function OnCapturePointCapturing(capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OnCapturePointCapturing, capturePoint);
}

export function OnCapturePointLost(capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OnCapturePointLost, capturePoint);
}

export function OnGameModeEnding(): void {
    Events.trigger(Events.Type.OnGameModeEnding);
}

export function OnGameModeStarted(): void {
    Events.trigger(Events.Type.OnGameModeStarted);
}

export function OnMandown(player: mod.Player, otherPlayer: mod.Player): void {
    Events.trigger(Events.Type.OnMandown, player, otherPlayer);
}

export function OnMCOMArmed(mcom: mod.MCOM): void {
    Events.trigger(Events.Type.OnMCOMArmed, mcom);
}

export function OnMCOMDefused(mcom: mod.MCOM): void {
    Events.trigger(Events.Type.OnMCOMDefused, mcom);
}

export function OnMCOMDestroyed(mcom: mod.MCOM): void {
    Events.trigger(Events.Type.OnMCOMDestroyed, mcom);
}

export function OnPlayerDamaged(
    player: mod.Player,
    otherPlayer: mod.Player,
    damageType: mod.DamageType,
    weaponUnlock: mod.WeaponUnlock
): void {
    Events.trigger(Events.Type.OnPlayerDamaged, player, otherPlayer, damageType, weaponUnlock);
}

export function OnPlayerDeployed(player: mod.Player): void {
    Events.trigger(Events.Type.OnPlayerDeployed, player);
}

export function OnPlayerDied(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    Events.trigger(Events.Type.OnPlayerDied, player, otherPlayer, deathType, weaponUnlock);
}

export function OnPlayerEarnedKill(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    Events.trigger(Events.Type.OnPlayerEarnedKill, player, otherPlayer, deathType, weaponUnlock);
}

export function OnPlayerEarnedKillAssist(player: mod.Player, otherPlayer: mod.Player): void {
    Events.trigger(Events.Type.OnPlayerEarnedKillAssist, player, otherPlayer);
}

export function OnPlayerEnterAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    Events.trigger(Events.Type.OnPlayerEnterAreaTrigger, player, areaTrigger);
}

export function OnPlayerEnterCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OnPlayerEnterCapturePoint, player, capturePoint);
}

export function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    Events.trigger(Events.Type.OnPlayerEnterVehicle, player, vehicle);
}

export function OnPlayerEnterVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    Events.trigger(Events.Type.OnPlayerEnterVehicleSeat, player, vehicle, seat);
}

export function OnPlayerExitAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    Events.trigger(Events.Type.OnPlayerExitAreaTrigger, player, areaTrigger);
}

export function OnPlayerExitCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    Events.trigger(Events.Type.OnPlayerExitCapturePoint, player, capturePoint);
}

export function OnPlayerExitVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    Events.trigger(Events.Type.OnPlayerExitVehicle, player, vehicle);
}

export function OnPlayerExitVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    Events.trigger(Events.Type.OnPlayerExitVehicleSeat, player, vehicle, seat);
}

export function OnPlayerInteract(player: mod.Player, interactPoint: mod.InteractPoint): void {
    Events.trigger(Events.Type.OnPlayerInteract, player, interactPoint);
}

export function OnPlayerJoinGame(player: mod.Player): void {
    Events.trigger(Events.Type.OnPlayerJoinGame, player);
}

export function OnPlayerLeaveGame(number: number): void {
    Events.trigger(Events.Type.OnPlayerLeaveGame, number);
}

export function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void {
    Events.trigger(Events.Type.OnPlayerSwitchTeam, player, team);
}

export function OnPlayerUIButtonEvent(
    player: mod.Player,
    uiWidget: mod.UIWidget,
    uiButtonEvent: mod.UIButtonEvent
): void {
    Events.trigger(Events.Type.OnPlayerUIButtonEvent, player, uiWidget, uiButtonEvent);
}

export function OnPlayerUndeploy(player: mod.Player): void {
    Events.trigger(Events.Type.OnPlayerUndeploy, player);
}

export function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void {
    Events.trigger(Events.Type.OnRayCastHit, player, point, normal);
}

export function OnRayCastMissed(player: mod.Player): void {
    Events.trigger(Events.Type.OnRayCastMissed, player);
}

export function OnRevived(player: mod.Player, otherPlayer: mod.Player): void {
    Events.trigger(Events.Type.OnRevived, player, otherPlayer);
}

export function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void {
    Events.trigger(Events.Type.OnRingOfFireZoneSizeChange, ringOfFire, number);
}

export function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void {
    Events.trigger(Events.Type.OnSpawnerSpawned, player, spawner);
}

export function OnTimeLimitReached(): void {
    Events.trigger(Events.Type.OnTimeLimitReached);
}

export function OnVehicleDestroyed(vehicle: mod.Vehicle): void {
    Events.trigger(Events.Type.OnVehicleDestroyed, vehicle);
}

export function OnVehicleSpawned(vehicle: mod.Vehicle): void {
    Events.trigger(Events.Type.OnVehicleSpawned, vehicle);
}
