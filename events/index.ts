import { Logging } from '../logging/index.ts';

// version: 1.2.0
export namespace Events {
    const logging = new Logging('Events');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

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

    /** Typed channel for a single event: subscribe(handler), unsubscribe(handler), and trigger(...args). */
    export type EventChannel<K extends keyof Signature> = {
        subscribe(handler: (...args: Parameters<Signature[K]>) => void | Promise<void>): () => void;
        unsubscribe(handler: (...args: Parameters<Signature[K]>) => void | Promise<void>): void;
        trigger(...args: Parameters<Signature[K]>): void;
    };

    /** Map of event name -> { subscribe, unsubscribe, trigger } with correct handler/args types. */
    export type EventChannelsMap = {
        [K in keyof typeof Type]: K extends keyof Signature ? EventChannel<K> : never;
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
     * Subscribe to an event.
     * @param type - The event type to subscribe to.
     * @param handler - The handler function to call when the event is triggered.
     * @returns A function to unsubscribe from the event.
     */
    export function subscribe<T extends Type>(type: T, handler: HandlerForType<T>): () => void {
        if (!handlers.has(type)) {
            handlers.set(type, new Set());
        }

        handlers.get(type)!.add(handler as AllHandlers);

        return () => unsubscribe(type, handler);
    }

    /**
     * Unsubscribe from an event.
     * @param type - The event type to unsubscribe from.
     * @param handler - The handler function that was subscribed.
     */
    export function unsubscribe<T extends Type>(type: T, handler: HandlerForType<T>): void {
        handlers.get(type)?.delete(handler as AllHandlers);
    }

    /**
     * Executes a handler function.
     * @param handler - The handler function to execute.
     * @param args - The arguments to pass to the handler function.
     */
    function executeHandler<T extends Type>(handler: AllHandlers, args: Parameters<AllHandlers>): void {
        Promise.resolve()
            .then(() => (handler as HandlerForType<T>)(...args))
            .catch((error: unknown) => {
                logging.log(`Error in handler ${handler.name}:`, LogLevel.Error, error);
            });
    }

    /**
     * Triggers an event.
     * @param type - The event type to trigger.
     * @param args - The arguments to pass to the handler function.
     */
    export function trigger<T extends Type>(type: T, ...args: EventParameters<T>): void {
        const typeHandlers = handlers.get(type);

        if (!typeHandlers) return;

        // Execute each handler asynchronously and non-blocking.
        // Errors in one handler won't prevent other handlers from executing.
        for (const handler of typeHandlers) {
            executeHandler(handler as AllHandlers, args as Parameters<AllHandlers>);
        }
    }

    /** Build per-event channel objects so users can call Events.OngoingInteractPoint.subscribe(handler), etc. */
    (function initChannels(): void {
        const sub = subscribe;
        const unsub = unsubscribe;
        const trig = trigger;
        const typeKeys = Object.keys(Type) as (keyof typeof Type)[];
        for (const key of typeKeys) {
            const typeValue = Type[key];
            if (typeof typeValue !== 'number') continue; // skip reverse enum entries
            (Events as unknown as Record<string, EventChannel<keyof Signature>>)[key] = {
                subscribe(handler: AllHandlers): () => void {
                    return sub(typeValue, handler as HandlerForType<typeof typeValue>);
                },
                unsubscribe(handler: AllHandlers): void {
                    unsub(typeValue, handler as HandlerForType<typeof typeValue>);
                },
                trigger(...args: Parameters<AllHandlers>): void {
                    trig(typeValue, ...(args as EventParameters<typeof typeValue>));
                },
            };
        }
    })();
}

/** Declare Events namespace also has per-event channels (OngoingInteractPoint, OnPlayerDied, etc.). */
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Declaration merge only; members come from EventChannelsMap. */
export interface Events extends Events.EventChannelsMap {}

/** Typed ref for same-file standalone trigger functions (channels are assigned at runtime). */
const E = Events as typeof Events & Events.EventChannelsMap;

/* eslint-disable jsdoc/require-jsdoc */
export function OngoingGlobal(): void {
    E.OngoingGlobal.trigger();
}

export function OngoingAreaTrigger(areaTrigger: mod.AreaTrigger): void {
    E.OngoingAreaTrigger.trigger(areaTrigger);
}

export function OngoingCapturePoint(capturePoint: mod.CapturePoint): void {
    E.OngoingCapturePoint.trigger(capturePoint);
}

export function OngoingEmplacementSpawner(emplacementSpawner: mod.EmplacementSpawner): void {
    E.OngoingEmplacementSpawner.trigger(emplacementSpawner);
}

export function OngoingHQ(hq: mod.HQ): void {
    E.OngoingHQ.trigger(hq);
}

export function OngoingInteractPoint(interactPoint: mod.InteractPoint): void {
    E.OngoingInteractPoint.trigger(interactPoint);
}

export function OngoingLootSpawner(lootSpawner: mod.LootSpawner): void {
    E.OngoingLootSpawner.trigger(lootSpawner);
}

export function OngoingMCOM(mcom: mod.MCOM): void {
    E.OngoingMCOM.trigger(mcom);
}

export function OngoingPlayer(player: mod.Player): void {
    E.OngoingPlayer.trigger(player);
}

export function OngoingRingOfFire(ringOfFire: mod.RingOfFire): void {
    E.OngoingRingOfFire.trigger(ringOfFire);
}

export function OngoingSector(sector: mod.Sector): void {
    E.OngoingSector.trigger(sector);
}

export function OngoingSpawner(spawner: mod.Spawner): void {
    E.OngoingSpawner.trigger(spawner);
}

export function OngoingSpawnPoint(spawnPoint: mod.SpawnPoint): void {
    E.OngoingSpawnPoint.trigger(spawnPoint);
}

export function OngoingTeam(team: mod.Team): void {
    E.OngoingTeam.trigger(team);
}

export function OngoingVehicle(vehicle: mod.Vehicle): void {
    E.OngoingVehicle.trigger(vehicle);
}

export function OngoingVehicleSpawner(vehicleSpawner: mod.VehicleSpawner): void {
    E.OngoingVehicleSpawner.trigger(vehicleSpawner);
}

export function OngoingWaypointPath(waypointPath: mod.WaypointPath): void {
    E.OngoingWaypointPath.trigger(waypointPath);
}

export function OngoingWorldIcon(worldIcon: mod.WorldIcon): void {
    E.OngoingWorldIcon.trigger(worldIcon);
}

export function OnAIMoveToFailed(player: mod.Player): void {
    E.OnAIMoveToFailed.trigger(player);
}

export function OnAIMoveToRunning(player: mod.Player): void {
    E.OnAIMoveToRunning.trigger(player);
}

export function OnAIMoveToSucceeded(player: mod.Player): void {
    E.OnAIMoveToSucceeded.trigger(player);
}

export function OnAIParachuteRunning(player: mod.Player): void {
    E.OnAIParachuteRunning.trigger(player);
}

export function OnAIParachuteSucceeded(player: mod.Player): void {
    E.OnAIParachuteSucceeded.trigger(player);
}

export function OnAIWaypointIdleFailed(player: mod.Player): void {
    E.OnAIWaypointIdleFailed.trigger(player);
}

export function OnAIWaypointIdleRunning(player: mod.Player): void {
    E.OnAIWaypointIdleRunning.trigger(player);
}

export function OnAIWaypointIdleSucceeded(player: mod.Player): void {
    E.OnAIWaypointIdleSucceeded.trigger(player);
}

export function OnCapturePointCaptured(capturePoint: mod.CapturePoint): void {
    E.OnCapturePointCaptured.trigger(capturePoint);
}

export function OnCapturePointCapturing(capturePoint: mod.CapturePoint): void {
    E.OnCapturePointCapturing.trigger(capturePoint);
}

export function OnCapturePointLost(capturePoint: mod.CapturePoint): void {
    E.OnCapturePointLost.trigger(capturePoint);
}

export function OnGameModeEnding(): void {
    E.OnGameModeEnding.trigger();
}

export function OnGameModeStarted(): void {
    E.OnGameModeStarted.trigger();
}

export function OnMandown(player: mod.Player, otherPlayer: mod.Player): void {
    E.OnMandown.trigger(player, otherPlayer);
}

export function OnMCOMArmed(mcom: mod.MCOM): void {
    E.OnMCOMArmed.trigger(mcom);
}

export function OnMCOMDefused(mcom: mod.MCOM): void {
    E.OnMCOMDefused.trigger(mcom);
}

export function OnMCOMDestroyed(mcom: mod.MCOM): void {
    E.OnMCOMDestroyed.trigger(mcom);
}

export function OnPlayerDamaged(
    player: mod.Player,
    otherPlayer: mod.Player,
    damageType: mod.DamageType,
    weaponUnlock: mod.WeaponUnlock
): void {
    E.OnPlayerDamaged.trigger(player, otherPlayer, damageType, weaponUnlock);
}

export function OnPlayerDeployed(player: mod.Player): void {
    E.OnPlayerDeployed.trigger(player);
}

export function OnPlayerDied(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    E.OnPlayerDied.trigger(player, otherPlayer, deathType, weaponUnlock);
}

export function OnPlayerEarnedKill(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    E.OnPlayerEarnedKill.trigger(player, otherPlayer, deathType, weaponUnlock);
}

export function OnPlayerEarnedKillAssist(player: mod.Player, otherPlayer: mod.Player): void {
    E.OnPlayerEarnedKillAssist.trigger(player, otherPlayer);
}

export function OnPlayerEnterAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    E.OnPlayerEnterAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerEnterCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    E.OnPlayerEnterCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    E.OnPlayerEnterVehicle.trigger(player, vehicle);
}

export function OnPlayerEnterVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    E.OnPlayerEnterVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerExitAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    E.OnPlayerExitAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerExitCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    E.OnPlayerExitCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerExitVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    E.OnPlayerExitVehicle.trigger(player, vehicle);
}

export function OnPlayerExitVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    E.OnPlayerExitVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerInteract(player: mod.Player, interactPoint: mod.InteractPoint): void {
    E.OnPlayerInteract.trigger(player, interactPoint);
}

export function OnPlayerJoinGame(player: mod.Player): void {
    E.OnPlayerJoinGame.trigger(player);
}

export function OnPlayerLeaveGame(number: number): void {
    E.OnPlayerLeaveGame.trigger(number);
}

export function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void {
    E.OnPlayerSwitchTeam.trigger(player, team);
}

export function OnPlayerUIButtonEvent(
    player: mod.Player,
    uiWidget: mod.UIWidget,
    uiButtonEvent: mod.UIButtonEvent
): void {
    E.OnPlayerUIButtonEvent.trigger(player, uiWidget, uiButtonEvent);
}

export function OnPlayerUndeploy(player: mod.Player): void {
    E.OnPlayerUndeploy.trigger(player);
}

export function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void {
    E.OnRayCastHit.trigger(player, point, normal);
}

export function OnRayCastMissed(player: mod.Player): void {
    E.OnRayCastMissed.trigger(player);
}

export function OnRevived(player: mod.Player, otherPlayer: mod.Player): void {
    E.OnRevived.trigger(player, otherPlayer);
}

export function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void {
    E.OnRingOfFireZoneSizeChange.trigger(ringOfFire, number);
}

export function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void {
    E.OnSpawnerSpawned.trigger(player, spawner);
}

export function OnTimeLimitReached(): void {
    E.OnTimeLimitReached.trigger();
}

export function OnVehicleDestroyed(vehicle: mod.Vehicle): void {
    E.OnVehicleDestroyed.trigger(vehicle);
}

export function OnVehicleSpawned(vehicle: mod.Vehicle): void {
    E.OnVehicleSpawned.trigger(vehicle);
}
/* eslint-enable jsdoc/require-jsdoc */
