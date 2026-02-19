import { Logging } from '../logging/index.ts';
declare namespace EventsTypes {
    /**
     * Map of each event name to its trigger function. Use for typed references to event payloads
     * (e.g. `Parameters<typeof Events.Type.OnPlayerDied>`) or dynamic dispatch. Prefer the channel API
     * (`Events.OnPlayerDied.subscribe(handler)`) for subscribe/trigger with full IntelliSense.
     */
    export const Type: {
        readonly OngoingGlobal: typeof OngoingGlobal;
        readonly OngoingAreaTrigger: typeof OngoingAreaTrigger;
        readonly OngoingCapturePoint: typeof OngoingCapturePoint;
        readonly OngoingEmplacementSpawner: typeof OngoingEmplacementSpawner;
        readonly OngoingHQ: typeof OngoingHQ;
        readonly OngoingInteractPoint: typeof OngoingInteractPoint;
        readonly OngoingLootSpawner: typeof OngoingLootSpawner;
        readonly OngoingMCOM: typeof OngoingMCOM;
        readonly OngoingPlayer: typeof OngoingPlayer;
        readonly OngoingRingOfFire: typeof OngoingRingOfFire;
        readonly OngoingSector: typeof OngoingSector;
        readonly OngoingSpawner: typeof OngoingSpawner;
        readonly OngoingSpawnPoint: typeof OngoingSpawnPoint;
        readonly OngoingTeam: typeof OngoingTeam;
        readonly OngoingVehicle: typeof OngoingVehicle;
        readonly OngoingVehicleSpawner: typeof OngoingVehicleSpawner;
        readonly OngoingWaypointPath: typeof OngoingWaypointPath;
        readonly OngoingWorldIcon: typeof OngoingWorldIcon;
        readonly OnAIMoveToFailed: typeof OnAIMoveToFailed;
        readonly OnAIMoveToRunning: typeof OnAIMoveToRunning;
        readonly OnAIMoveToSucceeded: typeof OnAIMoveToSucceeded;
        readonly OnAIParachuteRunning: typeof OnAIParachuteRunning;
        readonly OnAIParachuteSucceeded: typeof OnAIParachuteSucceeded;
        readonly OnAIWaypointIdleFailed: typeof OnAIWaypointIdleFailed;
        readonly OnAIWaypointIdleRunning: typeof OnAIWaypointIdleRunning;
        readonly OnAIWaypointIdleSucceeded: typeof OnAIWaypointIdleSucceeded;
        readonly OnCapturePointCaptured: typeof OnCapturePointCaptured;
        readonly OnCapturePointCapturing: typeof OnCapturePointCapturing;
        readonly OnCapturePointLost: typeof OnCapturePointLost;
        readonly OnGameModeEnding: typeof OnGameModeEnding;
        readonly OnGameModeStarted: typeof OnGameModeStarted;
        readonly OnMandown: typeof OnMandown;
        readonly OnMCOMArmed: typeof OnMCOMArmed;
        readonly OnMCOMDefused: typeof OnMCOMDefused;
        readonly OnMCOMDestroyed: typeof OnMCOMDestroyed;
        readonly OnPlayerDamaged: typeof OnPlayerDamaged;
        readonly OnPlayerDeployed: typeof OnPlayerDeployed;
        readonly OnPlayerDied: typeof OnPlayerDied;
        readonly OnPlayerEarnedKill: typeof OnPlayerEarnedKill;
        readonly OnPlayerEarnedKillAssist: typeof OnPlayerEarnedKillAssist;
        readonly OnPlayerEnterAreaTrigger: typeof OnPlayerEnterAreaTrigger;
        readonly OnPlayerEnterCapturePoint: typeof OnPlayerEnterCapturePoint;
        readonly OnPlayerEnterVehicle: typeof OnPlayerEnterVehicle;
        readonly OnPlayerEnterVehicleSeat: typeof OnPlayerEnterVehicleSeat;
        readonly OnPlayerExitAreaTrigger: typeof OnPlayerExitAreaTrigger;
        readonly OnPlayerExitCapturePoint: typeof OnPlayerExitCapturePoint;
        readonly OnPlayerExitVehicle: typeof OnPlayerExitVehicle;
        readonly OnPlayerExitVehicleSeat: typeof OnPlayerExitVehicleSeat;
        readonly OnPlayerInteract: typeof OnPlayerInteract;
        readonly OnPlayerJoinGame: typeof OnPlayerJoinGame;
        readonly OnPlayerLeaveGame: typeof OnPlayerLeaveGame;
        readonly OnPlayerSwitchTeam: typeof OnPlayerSwitchTeam;
        readonly OnPlayerUIButtonEvent: typeof OnPlayerUIButtonEvent;
        readonly OnPlayerUndeploy: typeof OnPlayerUndeploy;
        readonly OnRayCastHit: typeof OnRayCastHit;
        readonly OnRayCastMissed: typeof OnRayCastMissed;
        readonly OnRevived: typeof OnRevived;
        readonly OnRingOfFireZoneSizeChange: typeof OnRingOfFireZoneSizeChange;
        readonly OnSpawnerSpawned: typeof OnSpawnerSpawned;
        readonly OnTimeLimitReached: typeof OnTimeLimitReached;
        readonly OnVehicleDestroyed: typeof OnVehicleDestroyed;
        readonly OnVehicleSpawned: typeof OnVehicleSpawned;
    };
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
    export type EventChannel<K extends SignatureKey> = {
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
     * Map of each event name to its typed channel (`subscribe`, `unsubscribe`, `trigger`, `handlerCount`).
     * Merged onto the Events namespace so you get e.g. `Events.OngoingInteractPoint.subscribe(handler)`.
     */
    export type EventChannelsMap = {
        [K in SignatureKey]: K extends SignatureKey ? EventChannel<K> : never;
    };
    type EventTypeName<T extends TypeValue> = {
        [K in SignatureKey]: Signature[K] extends T ? K : never;
    }[SignatureKey];
    /**
     * Get the handler function type for a specific event type.
     * Handlers can be synchronous or asynchronous (returning void or Promise<void>).
     */
    export type HandlerForType<T extends TypeValue> =
        EventTypeName<T> extends SignatureKey
            ? Signature[EventTypeName<T>] extends (...args: infer P) => void
                ? (...args: P) => void | Promise<void>
                : never
            : never;
    /**
     * Get the parameter tuple for a specific event type.
     */
    export type EventParameters<T extends TypeValue> =
        EventTypeName<T> extends SignatureKey ? Parameters<Signature[EventTypeName<T>]> : never;
    /**
     * Create a union of all possible handler types.
     * Handlers can be synchronous or asynchronous (returning void or Promise<void>).
     */
    export type AllHandlers = {
        [K in SignatureKey]: Signature[K] extends (...args: infer P) => void
            ? (...args: P) => void | Promise<void>
            : never;
    }[SignatureKey];
    export {};
}
declare class EventsImplementation {
    private static readonly _logging;
    private static readonly _handlers;
    /**
     * The event types.
     */
    static readonly Type: {
        readonly OngoingGlobal: typeof OngoingGlobal;
        readonly OngoingAreaTrigger: typeof OngoingAreaTrigger;
        readonly OngoingCapturePoint: typeof OngoingCapturePoint;
        readonly OngoingEmplacementSpawner: typeof OngoingEmplacementSpawner;
        readonly OngoingHQ: typeof OngoingHQ;
        readonly OngoingInteractPoint: typeof OngoingInteractPoint;
        readonly OngoingLootSpawner: typeof OngoingLootSpawner;
        readonly OngoingMCOM: typeof OngoingMCOM;
        readonly OngoingPlayer: typeof OngoingPlayer;
        readonly OngoingRingOfFire: typeof OngoingRingOfFire;
        readonly OngoingSector: typeof OngoingSector;
        readonly OngoingSpawner: typeof OngoingSpawner;
        readonly OngoingSpawnPoint: typeof OngoingSpawnPoint;
        readonly OngoingTeam: typeof OngoingTeam;
        readonly OngoingVehicle: typeof OngoingVehicle;
        readonly OngoingVehicleSpawner: typeof OngoingVehicleSpawner;
        readonly OngoingWaypointPath: typeof OngoingWaypointPath;
        readonly OngoingWorldIcon: typeof OngoingWorldIcon;
        readonly OnAIMoveToFailed: typeof OnAIMoveToFailed;
        readonly OnAIMoveToRunning: typeof OnAIMoveToRunning;
        readonly OnAIMoveToSucceeded: typeof OnAIMoveToSucceeded;
        readonly OnAIParachuteRunning: typeof OnAIParachuteRunning;
        readonly OnAIParachuteSucceeded: typeof OnAIParachuteSucceeded;
        readonly OnAIWaypointIdleFailed: typeof OnAIWaypointIdleFailed;
        readonly OnAIWaypointIdleRunning: typeof OnAIWaypointIdleRunning;
        readonly OnAIWaypointIdleSucceeded: typeof OnAIWaypointIdleSucceeded;
        readonly OnCapturePointCaptured: typeof OnCapturePointCaptured;
        readonly OnCapturePointCapturing: typeof OnCapturePointCapturing;
        readonly OnCapturePointLost: typeof OnCapturePointLost;
        readonly OnGameModeEnding: typeof OnGameModeEnding;
        readonly OnGameModeStarted: typeof OnGameModeStarted;
        readonly OnMandown: typeof OnMandown;
        readonly OnMCOMArmed: typeof OnMCOMArmed;
        readonly OnMCOMDefused: typeof OnMCOMDefused;
        readonly OnMCOMDestroyed: typeof OnMCOMDestroyed;
        readonly OnPlayerDamaged: typeof OnPlayerDamaged;
        readonly OnPlayerDeployed: typeof OnPlayerDeployed;
        readonly OnPlayerDied: typeof OnPlayerDied;
        readonly OnPlayerEarnedKill: typeof OnPlayerEarnedKill;
        readonly OnPlayerEarnedKillAssist: typeof OnPlayerEarnedKillAssist;
        readonly OnPlayerEnterAreaTrigger: typeof OnPlayerEnterAreaTrigger;
        readonly OnPlayerEnterCapturePoint: typeof OnPlayerEnterCapturePoint;
        readonly OnPlayerEnterVehicle: typeof OnPlayerEnterVehicle;
        readonly OnPlayerEnterVehicleSeat: typeof OnPlayerEnterVehicleSeat;
        readonly OnPlayerExitAreaTrigger: typeof OnPlayerExitAreaTrigger;
        readonly OnPlayerExitCapturePoint: typeof OnPlayerExitCapturePoint;
        readonly OnPlayerExitVehicle: typeof OnPlayerExitVehicle;
        readonly OnPlayerExitVehicleSeat: typeof OnPlayerExitVehicleSeat;
        readonly OnPlayerInteract: typeof OnPlayerInteract;
        readonly OnPlayerJoinGame: typeof OnPlayerJoinGame;
        readonly OnPlayerLeaveGame: typeof OnPlayerLeaveGame;
        readonly OnPlayerSwitchTeam: typeof OnPlayerSwitchTeam;
        readonly OnPlayerUIButtonEvent: typeof OnPlayerUIButtonEvent;
        readonly OnPlayerUndeploy: typeof OnPlayerUndeploy;
        readonly OnRayCastHit: typeof OnRayCastHit;
        readonly OnRayCastMissed: typeof OnRayCastMissed;
        readonly OnRevived: typeof OnRevived;
        readonly OnRingOfFireZoneSizeChange: typeof OnRingOfFireZoneSizeChange;
        readonly OnSpawnerSpawned: typeof OnSpawnerSpawned;
        readonly OnTimeLimitReached: typeof OnTimeLimitReached;
        readonly OnVehicleDestroyed: typeof OnVehicleDestroyed;
        readonly OnVehicleSpawned: typeof OnVehicleSpawned;
    };
    /**
     * The logging levels.
     */
    static readonly LogLevel: typeof Logging.LogLevel;
    private constructor();
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    /**
     * Subscribe to an event.
     * @param type - The event type to subscribe to.
     * @param handler - The handler function to call when the event is triggered.
     * @returns A function to unsubscribe from the event.
     */
    static subscribe<T extends EventsTypes.TypeValue>(type: T, handler: EventsTypes.HandlerForType<T>): () => void;
    /**
     * Unsubscribe from an event.
     * @param type - The event type to unsubscribe from.
     * @param handler - The handler function that was subscribed.
     */
    static unsubscribe<T extends EventsTypes.TypeValue>(type: T, handler: EventsTypes.HandlerForType<T>): void;
    /**
     * Triggers an event.
     * @param type - The event type to trigger.
     * @param args - The arguments to pass to the handler function.
     */
    static trigger<T extends EventsTypes.TypeValue>(type: T, ...args: EventsTypes.EventParameters<T>): void;
    /**
     * Return the number of handlers currently subscribed to an event.
     * @param type - The event type to query.
     * @returns Count of subscribed handlers (0 if none).
     */
    static handlerCount<T extends EventsTypes.TypeValue>(type: T): number;
}
export declare const Events: typeof EventsImplementation & EventsTypes.EventChannelsMap;
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
export declare function OnPlayerDamaged(
    damagedPlayer: mod.Player,
    damagingPlayer: mod.Player,
    damageType: mod.DamageType,
    weapon: mod.WeaponUnlock
): void;
export declare function OnPlayerDeployed(player: mod.Player): void;
export declare function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void;
export declare function OnPlayerEarnedKill(
    killer: mod.Player,
    victim: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void;
export declare function OnPlayerEarnedKillAssist(assistingPlayer: mod.Player, victim: mod.Player): void;
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
export declare function OnPlayerLeaveGame(playerId: number): void;
export declare function OnPlayerSwitchTeam(player: mod.Player, team: mod.Team): void;
export declare function OnPlayerUIButtonEvent(
    player: mod.Player,
    uiWidget: mod.UIWidget,
    uiButtonEvent: mod.UIButtonEvent
): void;
export declare function OnPlayerUndeploy(player: mod.Player): void;
export declare function OnRayCastHit(player: mod.Player, point: mod.Vector, normal: mod.Vector): void;
export declare function OnRayCastMissed(player: mod.Player): void;
export declare function OnRevived(revivedPlayer: mod.Player, revivingPlayer: mod.Player): void;
export declare function OnRingOfFireZoneSizeChange(ringOfFire: mod.RingOfFire, number: number): void;
export declare function OnSpawnerSpawned(player: mod.Player, spawner: mod.Spawner): void;
export declare function OnTimeLimitReached(): void;
export declare function OnVehicleDestroyed(vehicle: mod.Vehicle): void;
export declare function OnVehicleSpawned(vehicle: mod.Vehicle): void;
export {};
