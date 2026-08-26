import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version: 1.7.0
namespace EventsTypes {
    /**
     * Map of each event name to its trigger function. Use for typed references to event payloads
     * (e.g. `Parameters<typeof Events.Type.OnPlayerDied>`) or dynamic dispatch. Prefer the channel API
     * (`Events.OnPlayerDied.subscribe(handler)`) for subscribe/trigger with full IntelliSense.
     */
    export const Type = {
        OngoingGlobal,
        OngoingAreaTrigger,
        OngoingBomb,
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
        OnBombDropped,
        OnBombPickedUp,
        OnBombStateChanged,
        OnCapturePointCaptured,
        OnCapturePointCapturing,
        OnCapturePointLost,
        OnGameModeEnding,
        OnGameModeStarted,
        OnGolmudTrainStopped,
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
        OnPlayerEnterVL7Cloud,
        OnPlayerExitAreaTrigger,
        OnPlayerExitCapturePoint,
        OnPlayerExitVehicle,
        OnPlayerExitVehicleSeat,
        OnPlayerExitVL7Cloud,
        OnPlayerInteract,
        OnPlayerJoinGame,
        OnPlayerLeaveGame,
        OnPlayerSwitchTeam,
        OnPlayerUIButtonEvent,
        OnPlayerUndeploy,
        OnPortalGadgetAimStart,
        OnPortalGadgetAimStop,
        OnPortalGadgetFireStart,
        OnPortalGadgetFireStop,
        OnPortalGadgetLaserToggle,
        OnRayCastHit,
        OnRayCastMissed,
        OnRevived,
        OnRingOfFireZoneSizeChange,
        OnSpawnerSpawned,
        OnTimeLimitReached,
        OnVehicleDestroyed,
        OnVehicleSpawned,
    } as const;

    /**
     * Extract parameters from a function type.
     */
    export type Parameters<T> = T extends (...args: infer P) => void ? P : never;

    /**
     * Trigger function types (single source of truth); same shape as Events.Type.
     */
    export type Signature = typeof Type;

    /**
     * One of the trigger function names (a key from Events.Type).
     */
    export type SignatureKey = keyof Signature;

    /**
     * One of the trigger functions (a value from Events.Type).
     */
    export type TypeValue = Signature[SignatureKey];

    /**
     * Typed channel for a single event. Each event (e.g. `Events.OngoingInteractPoint`, `Events.OnPlayerDied`)
     * exposes this interface with `subscribe`, `unsubscribe`, and `trigger` typed to that event's payload.
     * @template K - Event name; handler and trigger args are inferred from the corresponding trigger function.
     */
    export type Channel<K extends SignatureKey> = EventChannel<K>;

    /**
     * Map of each event name to its typed channel (`subscribe`, `unsubscribe`, `trigger`, `handlerCount`).
     * Merged onto the Events namespace so you get e.g. `Events.OngoingInteractPoint.subscribe(handler)`.
     */
    export type ChannelsMap = {
        [K in SignatureKey]: K extends SignatureKey ? Channel<K> : never;
    };

    // Get the event key (name) from a trigger function value.
    type TypeName<T extends TypeValue> = {
        [K in SignatureKey]: Signature[K] extends T ? K : never;
    }[SignatureKey];

    /**
     * Get the handler function type for a specific event type.
     * Handlers can be synchronous or asynchronous (returning void or Promise<void>).
     */
    export type HandlerForType<T extends TypeValue> =
        TypeName<T> extends SignatureKey
            ? Signature[TypeName<T>] extends (...args: infer P) => void
                ? (...args: P) => void | Promise<void>
                : never
            : never;

    /**
     * Get the parameter tuple for a specific event type.
     */
    export type EventParameters<T extends TypeValue> =
        TypeName<T> extends SignatureKey ? Parameters<Signature[TypeName<T>]> : never;

    /**
     * Create a union of all possible handler types.
     * Handlers can be synchronous or asynchronous (returning void or Promise<void>).
     */
    export type AllHandlers = {
        [K in SignatureKey]: Signature[K] extends (...args: infer P) => void
            ? (...args: P) => void | Promise<void>
            : never;
    }[SignatureKey];

    export type TriggerWithChannel = TypeValue & {
        _channel?: EventChannel<SignatureKey>;
    };
}

namespace EventsPrivate {
    export const LOG_TIMEOUT_MS = 10_000;

    export const logging = new Logging('Events');
}

class EventChannel<K extends EventsTypes.SignatureKey> {
    public handlers: EventsTypes.HandlerForType<EventsTypes.Signature[K]>[] | null = null;
    public incompleteTriggers = 0;
    public logTimeout: number | null = null;

    constructor(public readonly typeValue: EventsTypes.Signature[K]) {}

    public subscribe(handler: EventsTypes.HandlerForType<EventsTypes.Signature[K]>): () => void {
        if (!this.handlers) {
            this.handlers = [];
        }

        this.handlers.push(handler);
        return () => this.unsubscribe(handler);
    }

    public unsubscribe(handler: EventsTypes.HandlerForType<EventsTypes.Signature[K]>): void {
        if (!this.handlers) return;

        const idx = this.handlers.indexOf(handler);

        if (idx !== -1) {
            this.handlers.splice(idx, 1);
        }
    }

    public trigger(...args: EventsTypes.EventParameters<EventsTypes.Signature[K]>): void;
    public trigger(a?: unknown, b?: unknown, c?: unknown, d?: unknown): void {
        const handlers = this.handlers;

        if (!handlers) return;

        const len = handlers.length;

        if (len === 0) return;

        // Incomplete-trigger accounting: Portal servers previously aborted the JS thread for a block of synchronous
        // work after ~50ms, so a trigger can be started (increment below) but never reach the decrement. We schedule a
        // one-shot timeout to log how many such incomplete triggers occurred in the last _LOG_TIMEOUT_MS window in
        // order to avoid spamming the log, especially for high-frequency triggers like any of the Ongoing events.
        if (this.incompleteTriggers > 0 && !this.logTimeout) {
            const processIncompleteTriggers = () => {
                this.logTimeout = null;

                EventsPrivate.logging.log(
                    `${this.incompleteTriggers} incomplete triggers for ${this.typeValue?.name ?? 'unknown'} in last ${EventsPrivate.LOG_TIMEOUT_MS}ms`,
                    Logging.LogLevel.Warning
                );

                this.incompleteTriggers = 0;
            };

            this.logTimeout = Timers.setTimeout(processIncompleteTriggers, EventsPrivate.LOG_TIMEOUT_MS);
        }

        ++this.incompleteTriggers;

        // Execute each handler asynchronously and non-blocking.
        // Errors in one handler won't prevent other handlers from executing.
        for (let i = 0; i < len; ++i) {
            CallbackHandler.invoke(
                handlers[i] as (...args: unknown[]) => Promise<void> | void,
                a,
                b,
                c,
                d,
                EventsPrivate.logging,
                'trigger'
            );
        }

        // Decrement runs synchronously after the loop; the only way it is skipped is tick abort.
        --this.incompleteTriggers;
    }

    public handlerCount(): number {
        return this.handlers?.length ?? 0;
    }
}

class EventsImplementation {
    /**
     * The event types.
     */
    public static readonly Type = EventsTypes.Type;

    /**
     * The logging levels.
     */
    public static readonly LogLevel = Logging.LogLevel;

    static {
        /** Build per-event channel objects so users can call Events.OngoingInteractPoint.subscribe(handler), etc. */
        const typeKeys = Object.keys(EventsTypes.Type) as EventsTypes.SignatureKey[];

        for (const key of typeKeys) {
            const typeValue = EventsTypes.Type[key];
            const channel = new EventChannel(typeValue);

            // Link channel to the trigger function object for fast retrieval.
            (typeValue as EventsTypes.TriggerWithChannel)._channel = channel;

            (
                EventsImplementation as unknown as Record<
                    EventsTypes.SignatureKey,
                    EventChannel<EventsTypes.SignatureKey>
                >
            )[key] = channel;
        }
    }

    private constructor() {}

    private static getChannel(type: EventsTypes.TypeValue): EventChannel<EventsTypes.SignatureKey> {
        const typeWithChannel = type as EventsTypes.TriggerWithChannel;

        let channel = typeWithChannel._channel;

        if (!channel) {
            channel = new EventChannel(type);
            typeWithChannel._channel = channel;
        }

        return channel;
    }

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    public static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        EventsPrivate.logging.setLogging(log, logLevel, includeRawError);
    }

    /**
     * Subscribe to an event.
     * @param type - The event type to subscribe to.
     * @param handler - The handler function to call when the event is triggered.
     * @returns A function to unsubscribe from the event.
     */
    public static subscribe<T extends EventsTypes.TypeValue>(
        type: T,
        handler: EventsTypes.HandlerForType<T>
    ): () => void {
        return EventsImplementation.getChannel(type).subscribe(
            handler as unknown as EventsTypes.HandlerForType<EventsTypes.Signature[EventsTypes.SignatureKey]>
        );
    }

    /**
     * Unsubscribe from an event.
     * @param type - The event type to unsubscribe from.
     * @param handler - The handler function that was subscribed.
     */
    public static unsubscribe<T extends EventsTypes.TypeValue>(type: T, handler: EventsTypes.HandlerForType<T>): void {
        EventsImplementation.getChannel(type).unsubscribe(
            handler as unknown as EventsTypes.HandlerForType<EventsTypes.Signature[EventsTypes.SignatureKey]>
        );
    }

    /**
     * Triggers an event.
     * @param type - The event type to trigger.
     * @param args - The arguments to pass to the handler function.
     */
    public static trigger<T extends EventsTypes.TypeValue>(type: T, ...args: EventsTypes.EventParameters<T>): void {
        (
            EventsImplementation.getChannel(type) as unknown as {
                trigger(a?: unknown, b?: unknown, c?: unknown, d?: unknown): void;
            }
        ).trigger(args[0], args[1], args[2], args[3]);
    }

    /**
     * Return the number of handlers currently subscribed to an event.
     * @param type - The event type to query.
     * @returns Count of subscribed handlers (0 if none).
     */
    public static handlerCount<T extends EventsTypes.TypeValue>(type: T): number {
        return EventsImplementation.getChannel(type).handlerCount();
    }
}

export const Events = EventsImplementation as typeof EventsImplementation & EventsTypes.ChannelsMap;

/* eslint-disable jsdoc/require-jsdoc */
export function OngoingGlobal(): void {
    Events.OngoingGlobal.trigger();
}

export function OngoingAreaTrigger(areaTrigger: mod.AreaTrigger): void {
    Events.OngoingAreaTrigger.trigger(areaTrigger);
}

export function OngoingBomb(bomb: mod.Bomb): void {
    Events.OngoingBomb.trigger(bomb);
}

export function OngoingCapturePoint(capturePoint: mod.CapturePoint): void {
    Events.OngoingCapturePoint.trigger(capturePoint);
}

export function OngoingEmplacementSpawner(emplacementSpawner: mod.EmplacementSpawner): void {
    Events.OngoingEmplacementSpawner.trigger(emplacementSpawner);
}

export function OngoingHQ(hq: mod.HQ): void {
    Events.OngoingHQ.trigger(hq);
}

export function OngoingInteractPoint(interactPoint: mod.InteractPoint): void {
    Events.OngoingInteractPoint.trigger(interactPoint);
}

export function OngoingLootSpawner(lootSpawner: mod.LootSpawner): void {
    Events.OngoingLootSpawner.trigger(lootSpawner);
}

export function OngoingMCOM(mcom: mod.MCOM): void {
    Events.OngoingMCOM.trigger(mcom);
}

export function OngoingPlayer(player: mod.Player): void {
    Events.OngoingPlayer.trigger(player);
}

export function OngoingRingOfFire(ringOfFire: mod.RingOfFire): void {
    Events.OngoingRingOfFire.trigger(ringOfFire);
}

export function OngoingSector(sector: mod.Sector): void {
    Events.OngoingSector.trigger(sector);
}

export function OngoingSpawner(spawner: mod.Spawner): void {
    Events.OngoingSpawner.trigger(spawner);
}

export function OngoingSpawnPoint(spawnPoint: mod.SpawnPoint): void {
    Events.OngoingSpawnPoint.trigger(spawnPoint);
}

export function OngoingTeam(team: mod.Team): void {
    Events.OngoingTeam.trigger(team);
}

export function OngoingVehicle(vehicle: mod.Vehicle): void {
    Events.OngoingVehicle.trigger(vehicle);
}

export function OngoingVehicleSpawner(vehicleSpawner: mod.VehicleSpawner): void {
    Events.OngoingVehicleSpawner.trigger(vehicleSpawner);
}

export function OngoingWaypointPath(waypointPath: mod.WaypointPath): void {
    Events.OngoingWaypointPath.trigger(waypointPath);
}

export function OngoingWorldIcon(worldIcon: mod.WorldIcon): void {
    Events.OngoingWorldIcon.trigger(worldIcon);
}

export function OnAIMoveToFailed(player: mod.Player): void {
    Events.OnAIMoveToFailed.trigger(player);
}

export function OnAIMoveToRunning(player: mod.Player): void {
    Events.OnAIMoveToRunning.trigger(player);
}

export function OnAIMoveToSucceeded(player: mod.Player): void {
    Events.OnAIMoveToSucceeded.trigger(player);
}

export function OnAIParachuteRunning(player: mod.Player): void {
    Events.OnAIParachuteRunning.trigger(player);
}

export function OnAIParachuteSucceeded(player: mod.Player): void {
    Events.OnAIParachuteSucceeded.trigger(player);
}

export function OnAIWaypointIdleFailed(player: mod.Player): void {
    Events.OnAIWaypointIdleFailed.trigger(player);
}

export function OnAIWaypointIdleRunning(player: mod.Player): void {
    Events.OnAIWaypointIdleRunning.trigger(player);
}

export function OnAIWaypointIdleSucceeded(player: mod.Player): void {
    Events.OnAIWaypointIdleSucceeded.trigger(player);
}

export function OnBombDropped(bomb: mod.Bomb, player: mod.Player): void {
    Events.OnBombDropped.trigger(bomb, player);
}

export function OnBombPickedUp(bomb: mod.Bomb, player: mod.Player): void {
    Events.OnBombPickedUp.trigger(bomb, player);
}

export function OnBombStateChanged(bomb: mod.Bomb, state: mod.BombState): void {
    Events.OnBombStateChanged.trigger(bomb, state);
}

export function OnCapturePointCaptured(capturePoint: mod.CapturePoint): void {
    Events.OnCapturePointCaptured.trigger(capturePoint);
}

export function OnCapturePointCapturing(capturePoint: mod.CapturePoint): void {
    Events.OnCapturePointCapturing.trigger(capturePoint);
}

export function OnCapturePointLost(capturePoint: mod.CapturePoint): void {
    Events.OnCapturePointLost.trigger(capturePoint);
}

export function OnGameModeEnding(): void {
    Events.OnGameModeEnding.trigger();
}

export function OnGameModeStarted(): void {
    Events.OnGameModeStarted.trigger();
}

export function OnGolmudTrainStopped(reason: mod.GolmudTrainStopReason): void {
    Events.OnGolmudTrainStopped.trigger(reason);
}

export function OnMandown(player: mod.Player, otherPlayer: mod.Player): void {
    Events.OnMandown.trigger(player, otherPlayer);
}

export function OnMCOMArmed(mcom: mod.MCOM): void {
    Events.OnMCOMArmed.trigger(mcom);
}

export function OnMCOMDefused(mcom: mod.MCOM): void {
    Events.OnMCOMDefused.trigger(mcom);
}

export function OnMCOMDestroyed(mcom: mod.MCOM): void {
    Events.OnMCOMDestroyed.trigger(mcom);
}

export function OnPlayerDamaged(
    damagedPlayer: mod.Player,
    damagingPlayer: mod.Player,
    damageType: mod.DamageType,
    weapon: mod.WeaponUnlock
): void {
    Events.OnPlayerDamaged.trigger(damagedPlayer, damagingPlayer, damageType, weapon);
}

export function OnPlayerDeployed(player: mod.Player): void {
    Events.OnPlayerDeployed.trigger(player);
}

export function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void {
    Events.OnPlayerDied.trigger(victim, killer, deathType, weapon);
}

export function OnPlayerEarnedKill(
    killer: mod.Player,
    victim: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void {
    Events.OnPlayerEarnedKill.trigger(killer, victim, deathType, weapon);
}

export function OnPlayerEarnedKillAssist(assistingPlayer: mod.Player, victim: mod.Player): void {
    Events.OnPlayerEarnedKillAssist.trigger(assistingPlayer, victim);
}

export function OnPlayerEnterAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    Events.OnPlayerEnterAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerEnterCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    Events.OnPlayerEnterCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    Events.OnPlayerEnterVehicle.trigger(player, vehicle);
}

export function OnPlayerEnterVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    Events.OnPlayerEnterVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerEnterVL7Cloud(player: mod.Player, cloud: mod.VL7Cloud): void {
    Events.OnPlayerEnterVL7Cloud.trigger(player, cloud);
}

export function OnPlayerExitAreaTrigger(player: mod.Player, areaTrigger: mod.AreaTrigger): void {
    Events.OnPlayerExitAreaTrigger.trigger(player, areaTrigger);
}

export function OnPlayerExitCapturePoint(player: mod.Player, capturePoint: mod.CapturePoint): void {
    Events.OnPlayerExitCapturePoint.trigger(player, capturePoint);
}

export function OnPlayerExitVehicle(player: mod.Player, vehicle: mod.Vehicle): void {
    Events.OnPlayerExitVehicle.trigger(player, vehicle);
}

export function OnPlayerExitVehicleSeat(player: mod.Player, vehicle: mod.Vehicle, seat: mod.Object): void {
    Events.OnPlayerExitVehicleSeat.trigger(player, vehicle, seat);
}

export function OnPlayerExitVL7Cloud(player: mod.Player, cloud: mod.VL7Cloud): void {
    Events.OnPlayerExitVL7Cloud.trigger(player, cloud);
}

export function OnPlayerInteract(player: mod.Player, interactPoint: mod.InteractPoint): void {
    Events.OnPlayerInteract.trigger(player, interactPoint);
}

export function OnPlayerJoinGame(player: mod.Player): void {
    Events.OnPlayerJoinGame.trigger(player);
}

export function OnPlayerLeaveGame(playerId: number): void {
    Events.OnPlayerLeaveGame.trigger(playerId);
}

export function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void {
    Events.OnPlayerSwitchTeam.trigger(player, team);
}

export function OnPlayerUIButtonEvent(
    player: mod.Player,
    uiWidget: mod.UIWidget,
    uiButtonEvent: mod.UIButtonEvent
): void {
    Events.OnPlayerUIButtonEvent.trigger(player, uiWidget, uiButtonEvent);
}

export function OnPlayerUndeploy(player: mod.Player): void {
    Events.OnPlayerUndeploy.trigger(player);
}

export function OnPortalGadgetAimStart(player: mod.Player): void {
    Events.OnPortalGadgetAimStart.trigger(player);
}

export function OnPortalGadgetAimStop(player: mod.Player): void {
    Events.OnPortalGadgetAimStop.trigger(player);
}

export function OnPortalGadgetFireStart(player: mod.Player): void {
    Events.OnPortalGadgetFireStart.trigger(player);
}

export function OnPortalGadgetFireStop(player: mod.Player): void {
    Events.OnPortalGadgetFireStop.trigger(player);
}

export function OnPortalGadgetLaserToggle(player: mod.Player, toggle: boolean): void {
    Events.OnPortalGadgetLaserToggle.trigger(player, toggle);
}

export function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void {
    Events.OnRayCastHit.trigger(player, point, normal);
}

export function OnRayCastMissed(player: mod.Player): void {
    Events.OnRayCastMissed.trigger(player);
}

export function OnRevived(revivedPlayer: mod.Player, revivingPlayer: mod.Player): void {
    Events.OnRevived.trigger(revivedPlayer, revivingPlayer);
}

export function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void {
    Events.OnRingOfFireZoneSizeChange.trigger(ringOfFire, number);
}

export function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void {
    Events.OnSpawnerSpawned.trigger(player, spawner);
}

export function OnTimeLimitReached(): void {
    if (!mod.GetMatchTimeElapsed()) return; // Avoids a bug where this event is triggered by the server prematurely.

    Events.OnTimeLimitReached.trigger();
}

export function OnVehicleDestroyed(vehicle: mod.Vehicle): void {
    Events.OnVehicleDestroyed.trigger(vehicle);
}

export function OnVehicleSpawned(vehicle: mod.Vehicle): void {
    Events.OnVehicleSpawned.trigger(vehicle);
}
/* eslint-enable jsdoc/require-jsdoc */
