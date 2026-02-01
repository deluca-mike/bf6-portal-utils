import { Logging } from '../logging/index.ts';

// version: 1.3.0
export namespace Events {
    const logging = new Logging('Events');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Enum of event type identifiers. Use these values with `Events.subscribe(type, handler)` and
     * `Events.trigger(type, ...args)` when you need to pass an event type by value (e.g. dynamic
     * dispatch, iteration). For direct subscribe/trigger with full IntelliSense, prefer the
     * per-event channels instead (e.g. `Events.OnPlayerDied.subscribe(handler)`,
     * `Events.OnPlayerDied.trigger(player, otherPlayer, deathType, weaponUnlock)`).
     */
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

    /** Trigger function signatures derived from the exported trigger functions below (single source of truth). */
    type Signature = {
        OngoingGlobal: typeof OngoingGlobal;
        OngoingAreaTrigger: typeof OngoingAreaTrigger;
        OngoingCapturePoint: typeof OngoingCapturePoint;
        OngoingEmplacementSpawner: typeof OngoingEmplacementSpawner;
        OngoingHQ: typeof OngoingHQ;
        OngoingInteractPoint: typeof OngoingInteractPoint;
        OngoingLootSpawner: typeof OngoingLootSpawner;
        OngoingMCOM: typeof OngoingMCOM;
        OngoingPlayer: typeof OngoingPlayer;
        OngoingRingOfFire: typeof OngoingRingOfFire;
        OngoingSector: typeof OngoingSector;
        OngoingSpawner: typeof OngoingSpawner;
        OngoingSpawnPoint: typeof OngoingSpawnPoint;
        OngoingTeam: typeof OngoingTeam;
        OngoingVehicle: typeof OngoingVehicle;
        OngoingVehicleSpawner: typeof OngoingVehicleSpawner;
        OngoingWaypointPath: typeof OngoingWaypointPath;
        OngoingWorldIcon: typeof OngoingWorldIcon;
        OnAIMoveToFailed: typeof OnAIMoveToFailed;
        OnAIMoveToRunning: typeof OnAIMoveToRunning;
        OnAIMoveToSucceeded: typeof OnAIMoveToSucceeded;
        OnAIParachuteRunning: typeof OnAIParachuteRunning;
        OnAIParachuteSucceeded: typeof OnAIParachuteSucceeded;
        OnAIWaypointIdleFailed: typeof OnAIWaypointIdleFailed;
        OnAIWaypointIdleRunning: typeof OnAIWaypointIdleRunning;
        OnAIWaypointIdleSucceeded: typeof OnAIWaypointIdleSucceeded;
        OnCapturePointCaptured: typeof OnCapturePointCaptured;
        OnCapturePointCapturing: typeof OnCapturePointCapturing;
        OnCapturePointLost: typeof OnCapturePointLost;
        OnGameModeEnding: typeof OnGameModeEnding;
        OnGameModeStarted: typeof OnGameModeStarted;
        OnMandown: typeof OnMandown;
        OnMCOMArmed: typeof OnMCOMArmed;
        OnMCOMDefused: typeof OnMCOMDefused;
        OnMCOMDestroyed: typeof OnMCOMDestroyed;
        OnPlayerDamaged: typeof OnPlayerDamaged;
        OnPlayerDeployed: typeof OnPlayerDeployed;
        OnPlayerDied: typeof OnPlayerDied;
        OnPlayerEarnedKill: typeof OnPlayerEarnedKill;
        OnPlayerEarnedKillAssist: typeof OnPlayerEarnedKillAssist;
        OnPlayerEnterAreaTrigger: typeof OnPlayerEnterAreaTrigger;
        OnPlayerEnterCapturePoint: typeof OnPlayerEnterCapturePoint;
        OnPlayerEnterVehicle: typeof OnPlayerEnterVehicle;
        OnPlayerEnterVehicleSeat: typeof OnPlayerEnterVehicleSeat;
        OnPlayerExitAreaTrigger: typeof OnPlayerExitAreaTrigger;
        OnPlayerExitCapturePoint: typeof OnPlayerExitCapturePoint;
        OnPlayerExitVehicle: typeof OnPlayerExitVehicle;
        OnPlayerExitVehicleSeat: typeof OnPlayerExitVehicleSeat;
        OnPlayerInteract: typeof OnPlayerInteract;
        OnPlayerJoinGame: typeof OnPlayerJoinGame;
        OnPlayerLeaveGame: typeof OnPlayerLeaveGame;
        OnPlayerSwitchTeam: typeof OnPlayerSwitchTeam;
        OnPlayerUIButtonEvent: typeof OnPlayerUIButtonEvent;
        OnPlayerUndeploy: typeof OnPlayerUndeploy;
        OnRayCastHit: typeof OnRayCastHit;
        OnRayCastMissed: typeof OnRayCastMissed;
        OnRevived: typeof OnRevived;
        OnRingOfFireZoneSizeChange: typeof OnRingOfFireZoneSizeChange;
        OnSpawnerSpawned: typeof OnSpawnerSpawned;
        OnTimeLimitReached: typeof OnTimeLimitReached;
        OnVehicleDestroyed: typeof OnVehicleDestroyed;
        OnVehicleSpawned: typeof OnVehicleSpawned;
    };

    /**
     * Typed channel for a single event. Each event (e.g. `Events.OngoingInteractPoint`, `Events.OnPlayerDied`)
     * exposes this interface with `subscribe`, `unsubscribe`, and `trigger` typed to that event's payload.
     * @template K - Event name; handler and trigger args are inferred from the corresponding trigger function.
     */
    export type EventChannel<K extends keyof Signature> = {
        /**
         * Subscribe a handler for this event. The handler receives the same arguments as this event's trigger.
         * @param handler - Callback invoked when the event is triggered; args match the event's payload.
         * @returns Function to call to unsubscribe this handler.
         */
        subscribe(handler: (...args: Parameters<Signature[K]>) => void | Promise<void>): () => void;

        /**
         * Unsubscribe a handler previously added with `subscribe`. Pass the same function reference.
         * @param handler - The same function reference that was passed to `subscribe`.
         */
        unsubscribe(handler: (...args: Parameters<Signature[K]>) => void | Promise<void>): void;

        /**
         * Trigger this event. Pass the same arguments as the exported trigger function for this event.
         * @param args - Event payload; types match the corresponding standalone trigger function (e.g. `OnPlayerDied`).
         */
        trigger(...args: Parameters<Signature[K]>): void;

        /**
         * Return the number of handlers currently subscribed to this event.
         * @returns Count of subscribed handlers (0 if none).
         */
        handlerCount(): number;
    };

    /**
     * Map of each event name to its typed channel (`subscribe`, `unsubscribe`, `trigger`).
     * Merged onto the Events namespace so you get e.g. `Events.OngoingInteractPoint.subscribe(handler)`.
     */
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

    /**
     * Return the number of handlers currently subscribed to an event.
     * @param type - The event type to query.
     * @returns Count of subscribed handlers (0 if none).
     */
    export function handlerCount<T extends Type>(type: T): number {
        return handlers.get(type)?.size ?? 0;
    }

    /** Build per-event channel objects so users can call Events.OngoingInteractPoint.subscribe(handler), etc. */
    (function initChannels(): void {
        const typeKeys = Object.keys(Type) as (keyof typeof Type)[];

        for (const key of typeKeys) {
            const typeValue = Type[key];

            if (typeof typeValue !== 'number') continue; // skip reverse enum entries

            (Events as unknown as Record<string, EventChannel<keyof Signature>>)[key] = {
                subscribe(handler: AllHandlers): () => void {
                    return subscribe(typeValue, handler as HandlerForType<typeof typeValue>);
                },
                unsubscribe(handler: AllHandlers): void {
                    unsubscribe(typeValue, handler as HandlerForType<typeof typeValue>);
                },
                trigger(...args: Parameters<AllHandlers>): void {
                    trigger(typeValue, ...(args as EventParameters<typeof typeValue>));
                },
                handlerCount(): number {
                    return handlerCount(typeValue);
                },
            };
        }
    })();
}

/** Declare Events namespace also has per-event channels (OngoingInteractPoint, OnPlayerDied, etc.). */
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Declaration merge only; members come from EventChannelsMap. */
export interface Events extends Events.EventChannelsMap {}

/* eslint-disable jsdoc/require-jsdoc */
export function OngoingGlobal(): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingGlobal.trigger();
}

export function OngoingAreaTrigger(areaTrigger: mod.AreaTrigger): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingAreaTrigger.trigger(areaTrigger);
}

export function OngoingCapturePoint(capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingCapturePoint.trigger(capturePoint);
}

export function OngoingEmplacementSpawner(emplacementSpawner: mod.EmplacementSpawner): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingEmplacementSpawner.trigger(emplacementSpawner);
}

export function OngoingHQ(hq: mod.HQ): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingHQ.trigger(hq);
}

export function OngoingInteractPoint(interactPoint: mod.InteractPoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingInteractPoint.trigger(interactPoint);
}

export function OngoingLootSpawner(lootSpawner: mod.LootSpawner): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingLootSpawner.trigger(lootSpawner);
}

export function OngoingMCOM(mcom: mod.MCOM): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingMCOM.trigger(mcom);
}

export function OngoingPlayer(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingPlayer.trigger(player);
}

export function OngoingRingOfFire(ringOfFire: mod.RingOfFire): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingRingOfFire.trigger(ringOfFire);
}

export function OngoingSector(sector: mod.Sector): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingSector.trigger(sector);
}

export function OngoingSpawner(spawner: mod.Spawner): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingSpawner.trigger(spawner);
}

export function OngoingSpawnPoint(spawnPoint: mod.SpawnPoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingSpawnPoint.trigger(spawnPoint);
}

export function OngoingTeam(team: mod.Team): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingTeam.trigger(team);
}

export function OngoingVehicle(vehicle: mod.Vehicle): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingVehicle.trigger(vehicle);
}

export function OngoingVehicleSpawner(vehicleSpawner: mod.VehicleSpawner): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingVehicleSpawner.trigger(vehicleSpawner);
}

export function OngoingWaypointPath(waypointPath: mod.WaypointPath): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingWaypointPath.trigger(waypointPath);
}

export function OngoingWorldIcon(worldIcon: mod.WorldIcon): void {
    (Events as typeof Events & Events.EventChannelsMap).OngoingWorldIcon.trigger(worldIcon);
}

export function OnAIMoveToFailed(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIMoveToFailed.trigger(player);
}

export function OnAIMoveToRunning(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIMoveToRunning.trigger(player);
}

export function OnAIMoveToSucceeded(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIMoveToSucceeded.trigger(player);
}

export function OnAIParachuteRunning(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIParachuteRunning.trigger(player);
}

export function OnAIParachuteSucceeded(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIParachuteSucceeded.trigger(player);
}

export function OnAIWaypointIdleFailed(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIWaypointIdleFailed.trigger(player);
}

export function OnAIWaypointIdleRunning(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIWaypointIdleRunning.trigger(player);
}

export function OnAIWaypointIdleSucceeded(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnAIWaypointIdleSucceeded.trigger(player);
}

export function OnCapturePointCaptured(capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnCapturePointCaptured.trigger(capturePoint);
}

export function OnCapturePointCapturing(capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnCapturePointCapturing.trigger(capturePoint);
}

export function OnCapturePointLost(capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnCapturePointLost.trigger(capturePoint);
}

export function OnGameModeEnding(): void {
    (Events as typeof Events & Events.EventChannelsMap).OnGameModeEnding.trigger();
}

export function OnGameModeStarted(): void {
    (Events as typeof Events & Events.EventChannelsMap).OnGameModeStarted.trigger();
}

export function OnMandown(player: mod.Player, otherPlayer: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnMandown.trigger(player, otherPlayer);
}

export function OnMCOMArmed(mcom: mod.MCOM): void {
    (Events as typeof Events & Events.EventChannelsMap).OnMCOMArmed.trigger(mcom);
}

export function OnMCOMDefused(mcom: mod.MCOM): void {
    (Events as typeof Events & Events.EventChannelsMap).OnMCOMDefused.trigger(mcom);
}

export function OnMCOMDestroyed(mcom: mod.MCOM): void {
    (Events as typeof Events & Events.EventChannelsMap).OnMCOMDestroyed.trigger(mcom);
}

export function OnPlayerDamaged(
    player: mod.Player,
    otherPlayer: mod.Player,
    damageType: mod.DamageType,
    weaponUnlock: mod.WeaponUnlock
): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerDamaged.trigger(
        player,
        otherPlayer,
        damageType,
        weaponUnlock
    );
}

export function OnPlayerDeployed(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerDeployed.trigger(player);
}

export function OnPlayerDied(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerDied.trigger(
        player,
        otherPlayer,
        deathType,
        weaponUnlock
    );
}

export function OnPlayerEarnedKill(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEarnedKill.trigger(
        player,
        otherPlayer,
        deathType,
        weaponUnlock
    );
}

export function OnPlayerEarnedKillAssist(player: mod.Player, otherPlayer: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEarnedKillAssist.trigger(player, otherPlayer);
}

export function OnPlayerEnterAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEnterAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerEnterCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEnterCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEnterVehicle.trigger(player, vehicle);
}

export function OnPlayerEnterVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerEnterVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerExitAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerExitAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerExitCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerExitCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerExitVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerExitVehicle.trigger(player, vehicle);
}

export function OnPlayerExitVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerExitVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerInteract(player: mod.Player, interactPoint: mod.InteractPoint): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerInteract.trigger(player, interactPoint);
}

export function OnPlayerJoinGame(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerJoinGame.trigger(player);
}

export function OnPlayerLeaveGame(number: number): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerLeaveGame.trigger(number);
}

export function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerSwitchTeam.trigger(player, team);
}

export function OnPlayerUIButtonEvent(
    player: mod.Player,
    uiWidget: mod.UIWidget,
    uiButtonEvent: mod.UIButtonEvent
): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerUIButtonEvent.trigger(player, uiWidget, uiButtonEvent);
}

export function OnPlayerUndeploy(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnPlayerUndeploy.trigger(player);
}

export function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void {
    (Events as typeof Events & Events.EventChannelsMap).OnRayCastHit.trigger(player, point, normal);
}

export function OnRayCastMissed(player: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnRayCastMissed.trigger(player);
}

export function OnRevived(player: mod.Player, otherPlayer: mod.Player): void {
    (Events as typeof Events & Events.EventChannelsMap).OnRevived.trigger(player, otherPlayer);
}

export function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void {
    (Events as typeof Events & Events.EventChannelsMap).OnRingOfFireZoneSizeChange.trigger(ringOfFire, number);
}

export function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void {
    (Events as typeof Events & Events.EventChannelsMap).OnSpawnerSpawned.trigger(player, spawner);
}

export function OnTimeLimitReached(): void {
    if (!mod.GetMatchTimeElapsed()) return; // Avoids a bug where this event is triggered by the server prematurely.

    (Events as typeof Events & Events.EventChannelsMap).OnTimeLimitReached.trigger();
}

export function OnVehicleDestroyed(vehicle: mod.Vehicle): void {
    (Events as typeof Events & Events.EventChannelsMap).OnVehicleDestroyed.trigger(vehicle);
}

export function OnVehicleSpawned(vehicle: mod.Vehicle): void {
    (Events as typeof Events & Events.EventChannelsMap).OnVehicleSpawned.trigger(vehicle);
}
/* eslint-enable jsdoc/require-jsdoc */
