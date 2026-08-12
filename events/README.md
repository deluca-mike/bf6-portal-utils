# Events Module

<ai>

This TypeScript `Events` namespace provides a centralized event subscription system for Battlefield Portal experience developers. In Battlefield Portal, each event handler function (like `OnPlayerDeployed`, `OngoingPlayer`, etc.) can only be implemented and exported once per entire project. This module implements all event handlers once, automatically hooking into every Battlefield Portal event, and exposes an API that allows you to subscribe to and unsubscribe from any event from multiple places in your codebase. This keeps your code clean, modular, and maintainable.

</ai>

You can use **two styles of API**:

- **Event-channel style (recommended)** – Each event is exposed as a channel object (e.g. `Events.OnPlayerDied`, `Events.OngoingInteractPoint`) with `subscribe`, `unsubscribe`, `trigger`, and `handlerCount` functions. This style typically has **better full IntelliSense compatibility** and is **more readable**, since the event name and method are colocated (e.g. `Events.OnPlayerDied.subscribe(handler)`).
- **Object style** – Pass the event type as the first argument (e.g. `Events.subscribe(Events.Type.OnPlayerDeployed, handler)`). Useful when you need to pass an event type by value (e.g. dynamic dispatch, iteration).

The module provides full type safety through TypeScript generics, ensuring that event handlers match the correct signature for each event type. Handlers can be synchronous or asynchronous (returning `void` or `Promise<void>`). Synchronous handlers run synchronously when the event fires (so short, simple handlers execute immediately instead of being queued as a microtask). The module uses `CallbackHandler` to invoke each handler so that no handler—synchronous or asynchronous—can throw and prevent the rest from running; errors are caught and logged. Asynchronous handlers are preferred for any non-trivial work, but short synchronous handlers are safe.

<ai>

> **Note** Do not implement or export any Battlefield Portal event handler functions in your codebase. This module handles all event hooking automatically and it owns all those hooks.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Subscribe to events using the **event-channel style** (e.g. `Events.OnPlayerDeployed.subscribe(handler)`) for the best IntelliSense and readability, or the **object style** (`Events.subscribe(Events.Type.OnPlayerDeployed, handler)`). Both return an unsubscribe function for convenience.
4. Unsubscribe when needed by calling the returned unsubscribe function, or use `Events.OnPlayerDeployed.unsubscribe(handler)` (channel style) or `Events.unsubscribe(Events.Type.OnPlayerDeployed, handler)` (object style).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Events } from 'bf6-portal-utils/events';

// Optional: Configure error logging for handler failures
Events.setLogging((text) => console.log(text), Events.LogLevel.Warning, true);

// Subscribe to player deployment events
function handlePlayerDeployed(player: mod.Player): void {
    console.log(`Player ${mod.GetObjId(player)} deployed`);
}

// Subscribe to player death events with async handler
async function handlePlayerDied(
    player: mod.Player,
    otherPlayer: mod.Player,
    deathType: mod.DeathType,
    weaponUnlock: mod.WeaponUnlock
): Promise<void> {
    // Async operations are fully supported
    await mod.Wait(0.1);
    console.log(`Player ${mod.GetObjId(player)} died`);
}

// Subscribe to ongoing player events
function handleOngoingPlayer(player: mod.Player): void {
    // This will be called every tick for every player
    const health = mod.GetSoldierState(player, mod.SoldierStateNumber.Health);

    if (health < 10) {
        // Low health logic
    }
}

// Set up subscriptions at module load time (top-level code)
const unsubscribeDeployed = Events.OnPlayerDeployed.subscribe(handlePlayerDeployed);
const unsubscribeDied = Events.OnPlayerDied.subscribe(handlePlayerDied);
const unsubscribeOngoing = Events.OngoingPlayer.subscribe(handleOngoingPlayer);

// Optional: Clean up subscriptions when the game mode ends
Events.OnGameModeEnding.subscribe(() => {
    unsubscribeDeployed();
    unsubscribeDied();
    unsubscribeOngoing();
});
```

</ai>

---

## Core Concepts

- **Single Event Hook** – This module implements all Battlefield Portal event handler functions once. You should not implement or export any event handlers in your own code.

- **Multiple Subscriptions** – You can subscribe multiple handlers to the same event type. All subscribed handlers will be called when the event fires.

- **Type Safety** – TypeScript ensures that your handler function signature matches the event type. For example, `OnPlayerDeployed` handlers must accept a single `mod.Player` parameter. The event-channel style (`Events.OnPlayerDeployed.subscribe(...)`) typically gives the best IntelliSense (parameter types and completion) because the event is known at the call site.

- **Synchronous and Asynchronous Handlers** – Handlers can be synchronous (returning `void`) or asynchronous (returning `Promise<void>`). Synchronous handlers are run synchronously when the event is triggered (immediately, in the same turn), so short/simple logic runs without being queued as a microtask. Asynchronous handlers are preferred for anything that may take time or perform I/O.

- **Error Isolation** – Each handler is invoked via `CallbackHandler`, so errors (sync or async) in one handler are caught and logged and do not prevent other handlers from executing. A bug in one subscription cannot break the rest of the event system.

- **Execution & Priority** – Handlers execute synchronously in ascending order of their priority (`EventPriority.First` (-100) $\to$ `EventPriority.Normal` (0) $\to$ `EventPriority.Last` (100) or custom integer values). Within the same priority level, handlers execute in deterministic FIFO (order of subscription) sequence. Synchronous handlers run to completion before the next handler is invoked; the trigger does not wait for asynchronous handlers' promises to settle. Long-running synchronous handlers will block other handlers and the caller; keep sync work short or use async handlers.

- **Tick Lifecycle Architecture (`OnTickStart` vs `OnTickEnd`)** – Battlefield Portal processes each frame across distinct phases. The `Events` module standardizes this via `OnTickStart` (aliased to `OngoingGlobal`) and a virtual `OnTickEnd` event driven by scheduled microtask resolution:
    - **Phase 1: `OnTickStart` (Input & Early Engine Events)**: Runs at priority `Normal` (`0`). Handlers that capture raw engine state, poll player positions, or dispatch requests early in the frame subscribe here (e.g. `Timers`, `PlayerLocations`, `Raycast`, `ScavengerDrop`, `MultiClickDetector`, `PerformanceStats`, and standard user game logic).
    - **Phase 2: Mid-Tick Engine Events**: The Portal server dispatches discrete macro-events (e.g. `OnPlayerUIButtonEvent`, `OnPlayerDamaged`, `OnRayCastHit`).
    - **Phase 3: `OnTickEnd` (Simulation, Reactivity & Commit Pipeline)**: Runs after all macro-events and their microtasks have finished. Modules subscribe here using a strict priority ladder to guarantee deterministic, same-frame simulation and presentation without multi-tick latency:
        1. **`Timelines` (`-100` / `First`)**: Advances high-level step sequences, starts/stops tweens.
        2. **`Solid` (`-95`)**: Advances the reactive scheduler, evaluates deferred reactive effects (`deferTicks`), and propagates dirty signals.
        3. **`Animations` (`-90`)**: Interpolates active tweens, evaluates harmonic springs and momentum decay, and applies values to target objects.
        4. **`Spatial` (`-80`)**: Computes continuous kinematics, look-at/follow trackers, and updates world transform matrices across the scene graph hierarchy.
        5. **Late Game Logic (`0` / `Normal`)**: Custom post-processing and late HUD updates.
        6. **`UI.flush()` (`100` / `Last`)**: Coalesces all accumulated dirty UI properties across the entire frame and issues a single batch of native C++ FFI calls before client rendering.

- **Configurable Error Logging** – Handler errors are automatically logged using the `Logging` module. Use `Events.setLogging()` to configure a logger function, minimum log level, and whether to include error details. This provides visibility into handler failures without requiring manual error handling in every handler.

---

## API Reference

### `Events`

The `Events` class exposes two styles of API: **per-event channels** (e.g. `Events.OnPlayerDied.subscribe(handler)`), which typically have better IntelliSense and readability, and the **object-based API** (e.g. `Events.subscribe(Events.Type.OnPlayerDeployed, handler)`), which is useful when you need to pass an event type by value (e.g. iteration, dynamic dispatch).

#### Subscribe

Subscribes a handler function to an event. The handler will be called whenever the event fires. Handlers can be synchronous or asynchronous. Returns a function that can be called to unsubscribe the handler.

**Channel style** – Prefer this for better IntelliSense; the handler signature is fully typed for that event.

- **Signature:** `Events.<EventName>.subscribe(handler, priority?): () => void`
- **Parameters:** `handler` – A function matching the signature for this event. Parameter types are inferred; `priority` – (Optional) Handler priority (e.g. `EventPriority.First`, `EventPriority.Normal`, `EventPriority.Last`, or custom integer). Lower values run earlier. Defaults to `EventPriority.Normal` (0).
- **Returns:** A function that can be called to unsubscribe the handler.

**Object style** – Use when you need to pass the event type by value.

- **Signature:** `Events.subscribe<T extends Type>(type: T, handler: HandlerForType<T>, priority?): () => void`
- **Parameters:** `type` – The event type from `Events.Type` (trigger function for that event); `handler` – A function matching the signature for the event type; `priority` – (Optional) Handler priority. Defaults to `EventPriority.Normal` (0).
- **Returns:** A function that can be called to unsubscribe the handler.

**Examples:**

<ai>

```ts
import { Events, EventPriority } from 'bf6-portal-utils/events';

// Channel style (preferred)
const joinGameUnsubscribe = Events.OnPlayerJoinGame.subscribe((player: mod.Player) => {
    console.log(`Player joined game: ${mod.GetObjId(player)}`);
});
// Later, unsubscribe
joinGameUnsubscribe();

// Subscribe with priority
Events.OngoingGlobal.subscribe(() => {
    console.log('Runs before normal and late handlers');
}, EventPriority.First);

Events.OngoingGlobal.subscribe(() => {
    console.log('Runs after all game logic handlers (e.g. flushing UI dirty states)');
}, EventPriority.Last);

// Object style
const playerDeployedUnsubscribe = Events.subscribe(
    Events.Type.OnPlayerDeployed,
    (player: mod.Player) => {
        console.log(`Player deployed: ${mod.GetObjId(player)}`);
    },
    EventPriority.Normal
);
// Later, unsubscribe
playerDeployedUnsubscribe();
```

</ai>

#### Unsubscribe

Unsubscribes a handler function from an event. The handler must be the same function reference that was used in `subscribe()`.

**Channel style:**

- **Signature:** `Events.<EventName>.unsubscribe(handler): void`
- **Parameters:** `handler` – The same function reference that was passed to `subscribe()`.

**Enum style:**

- **Signature:** `Events.unsubscribe<T extends Type>(type: T, handler: HandlerForType<T>): void`
- **Parameters:** `type` – The event type from `Events.Type` (trigger function for that event); `handler` – The same function reference that was used in `subscribe()`.

**Examples:**

<ai>

```ts
const handler = (player: mod.Player) => console.log(`Player deployed: ${mod.GetObjId(player)}`);

// Channel style (preferred)
Events.OnPlayerDeployed.subscribe(handler);
// Later...
Events.OnPlayerDeployed.unsubscribe(handler);

// Object style
Events.subscribe(Events.Type.OnPlayerDeployed, handler);
// Later...
Events.unsubscribe(Events.Type.OnPlayerDeployed, handler);
```

</ai>

<ai>

#### Trigger

Manually triggers an event with the given parameters. Primarily useful for debugging or testing. In normal operation, events are automatically triggered by the Battlefield Portal runtime when the corresponding game events occur.

**Channel style:**

- **Signature:** `Events.<EventName>.trigger(...args): void`
- **Parameters:** `...args` – The parameters matching this event's signature (e.g. for `OnPlayerDeployed`: `player`).

**Enum style:**

- **Signature:** `Events.trigger<T extends Type>(type: T, ...args: EventParameters<T>): void`
- **Parameters:** `type` – The event type from `Events.Type` (trigger function for that event); `...args` – The parameters matching the event type's signature.

**Examples:**

```ts
const testPlayer = mod.ValueInArray(mod.AllPlayers(), 0) as mod.Player;

// Channel style (preferred)
Events.OnPlayerDeployed.trigger(testPlayer);

// Object style
Events.trigger(Events.Type.OnPlayerDeployed, testPlayer);
```

</ai>

#### Handler Count

Returns the number of handlers currently subscribed to an event. Useful for debugging (e.g. checking that subscriptions were cleaned up) or conditional logic.

**Channel style:**

- **Signature:** `Events.<EventName>.handlerCount(): number`
- **Returns:** The count of subscribed handlers (0 if none).

**Enum style:**

- **Signature:** `Events.handlerCount<T extends Type>(type: T): number`
- **Parameters:** `type` – The event type from `Events.Type` enum.
- **Returns:** The count of subscribed handlers (0 if none).

**Examples:**

<ai>

```ts
// Channel style (preferred)
Events.OnPlayerDeployed.subscribe(someHandler);
Events.OnPlayerDeployed.handlerCount(); // 1

// Object style
Events.subscribe(Events.Type.OnPlayerDeployed, someOtherHandler);
Events.handlerCount(Events.Type.OnPlayerDeployed); // 2
```

</ai>

<ai>

#### `Events.Type`

An object mapping each event name to its trigger function (e.g. `Events.Type.OnPlayerDeployed`). Use these values with the object-style API: `Events.subscribe(type, handler)`, `Events.unsubscribe(type, handler)`, `Events.trigger(type, ...args)`, and `Events.handlerCount(type)`. You can also use it for typed references to event payloads (e.g. `Parameters<typeof Events.Type.OnPlayerDied>`) or to call a trigger by name (e.g. `Events.Type.OnPlayerDeployed(somePlayer)`).

**Example (typed payload / dynamic dispatch):**

```ts
import { Events } from 'bf6-portal-utils/events';

// Typed payload for OnPlayerDied
type OnPlayerDiedPayload = Parameters<typeof Events.Type.OnPlayerDied>;
// [player: mod.Player, otherPlayer: mod.Player, deathType: mod.DeathType, weaponUnlock: mod.WeaponUnlock]

// Call a trigger by name (mostly for debugging or testing).
Events.Type.OnPlayerDeployed(somePlayer);
```

</ai>

<ai>

Available event types include:

- **Tick & Ongoing Loops**
    - _Tick Loops:_ `OngoingGlobal` (alias: `OnTickStart`), `OnTickEnd`
    - _Entity Ongoing:_ `OngoingAreaTrigger`, `OngoingBlockingSphere`, `OngoingBomb`, `OngoingCapturePoint`, `OngoingEmplacementSpawner`, `OngoingHQ`, `OngoingInteractPoint`, `OngoingLootSpawner`, `OngoingMCOM`, `OngoingPlayer`, `OngoingRingOfFire`, `OngoingSector`, `OngoingSpawner`, `OngoingSpawnPoint`, `OngoingTeam`, `OngoingVehicle`, `OngoingVehicleSpawner`, `OngoingWaypointPath`, `OngoingWorldIcon`
- **Player Lifecycle, Combat & Interaction**
    - _Session & Spawning:_ `OnPlayerJoinGame`, `OnPlayerLeaveGame`, `OnPlayerSwitchTeam`, `OnPlayerDeployed`, `OnPlayerUndeploy`
    - _Health & Combat:_ `OnPlayerDamaged`, `OnMandown`, `OnRevived`, `OnPlayerDied`, `OnPlayerEarnedKill`, `OnPlayerEarnedKillAssist`
    - _UI & Interaction:_ `OnPlayerInteract`, `OnPlayerUIButtonEvent`
- **Player Environment & Volumes**
    - _Triggers & Points:_ `OnPlayerEnterAreaTrigger`, `OnPlayerExitAreaTrigger`, `OnPlayerEnterCapturePoint`, `OnPlayerExitCapturePoint`
    - _Water:_ `OnPlayerEnteredWater`, `OnPlayerExitedWater`, `OnPlayerSubmerged`, `OnPlayerEmerged`
    - _Hazards:_ `OnPlayerEnterVL7Cloud`, `OnPlayerExitVL7Cloud`
- **Vehicles**
    - _Boarding & Seating:_ `OnPlayerEnterVehicle`, `OnPlayerExitVehicle`, `OnPlayerEnterVehicleSeat`, `OnPlayerExitVehicleSeat`
    - _Lifecycle:_ `OnVehicleSpawned`, `OnVehicleDestroyed`
- **Game Modes & Objectives**
    - _Match Flow:_ `OnGameModeStarted`, `OnGameModeEnding`, `OnTimeLimitReached`
    - _Capture Points:_ `OnCapturePointCapturing`, `OnCapturePointCaptured`, `OnCapturePointLost`
    - _MCOM / Rush:_ `OnMCOMArmed`, `OnMCOMDefused`, `OnMCOMDestroyed`
    - _Bomb / Delivery:_ `OnBombPickedUp`, `OnBombDropped`, `OnBombStateChanged`
    - _Ring of Fire:_ `OnRingOfFireZoneSizeChange`
- **AI & Bots**
    - _Movement:_ `OnAIMoveToRunning`, `OnAIMoveToSucceeded`, `OnAIMoveToFailed`
    - _Parachuting:_ `OnAIParachuteRunning`, `OnAIParachuteSucceeded`
    - _Waypoints:_ `OnAIWaypointIdleRunning`, `OnAIWaypointIdleSucceeded`, `OnAIWaypointIdleFailed`
- **Gadgets, Physics & World**
    - _Portal Gadget:_ `OnPortalGadgetAimStart`, `OnPortalGadgetAimStop`, `OnPortalGadgetFireStart`, `OnPortalGadgetFireStop`, `OnPortalGadgetLaserToggle`
    - _Raycasting:_ `OnRayCastHit`, `OnRayCastMissed`
    - _Spawners:_ `OnSpawnerSpawned`
    - _Map Specific:_ `OnGolmudTrainStopped`

</ai>

#### `Events.EventPriority`

An enum defining standard execution priority levels for event handlers. Handlers execute in ascending priority order (lower numbers run earlier).

Available priority levels:

- `First` (-100) – Runs before standard handlers. Useful for pre-processing, input capture, or initialization.
- `Normal` (0) – Default priority for all handlers when no priority argument is specified.
- `Last` (100) – Runs after standard handlers. Useful for post-processing, batch commits, UI dirty-state flushing, or cleanup tasks.

You may also pass any custom integer value (e.g. `-50`, `10`, `500`) for fine-grained execution ordering. Handlers with identical priority values execute in deterministic FIFO order (the sequence in which they were subscribed).

#### `Events.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `Events.setLogging()` to configure the minimum log level for error logging in event handlers.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### `Events.setLogging(log?: (text: string, error?: unknown) => Promise<void> | void, logLevel?: Events.LogLevel, includeRawError?: boolean): void`

Configures logging for the Events module. When event handlers throw errors, they are automatically caught and logged using the configured logger. This allows you to monitor and debug handler failures without crashing your mod.

**Parameters:**

- `log` – The logger function to use. Pass `undefined` (or `null`) to disable logging. Can be synchronous or asynchronous.
- `logLevel` – The minimum log level to use. Messages below this level will not be logged. Defaults to `Events.LogLevel.Warning`.
- `includeRawError` – Whether to include the runtime error details in the log message. Defaults to `false`. The runtime error can be very large and may cause issues with UI loggers.

**Example:**

<ai>

```ts
import { Events } from 'bf6-portal-utils/events';

// Configure logging with console.log, minimum level of Warning, and include error details
Events.setLogging(
    (text) => console.log(text),
    Events.LogLevel.Warning,
    true // includeRawError
);

// If a handler throws an error, it will be logged automatically
Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    // If this throws, it will be logged as: <Events> Error in handler handleDeployment: [error details]
    throw new Error('Something went wrong');
});
```

</ai>

**Note:** Error logging is automatic and fail-safe. Handler errors are caught and logged without affecting other handlers or the event system. For more information on the logging functionality, see the [`Logging` module documentation](../logging/README.md).

---

<ai>

## Usage Patterns

- **Modular Event Handling** – Split your event handling logic across multiple files or modules. Each module can subscribe to the events it needs without conflicts.

- **Conditional Subscriptions** – Subscribe and unsubscribe handlers dynamically based on game state. For example, only subscribe to vehicle events when vehicles are enabled.

- **Multiple Handlers per Event** – Subscribe multiple handlers to the same event to handle different concerns separately (e.g., one handler for logging, another for game logic, another for UI updates).

- **Async Operations** – Use async handlers for operations that require waiting, such as delayed actions or sequential operations.

- **Error Handling** – Since errors in handlers are isolated, you can add try-catch blocks within individual handlers for fine-grained error handling without affecting other subscriptions.

### Advanced Example

This example demonstrates how multiple modules across different files can subscribe to the same events independently, highlighting the key benefit of the Events system. Each module handles its own concerns without conflicts.

**File: `src/stats/player-stats.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Player statistics tracking module
class PlayerStats {
    private kills = new Map<number, number>();
    private deaths = new Map<number, number>();

    private unsubscribeFunctions: (() => void)[] = [];

    public constructor() {
        // Subscribe to player events for stats tracking
        this.unsubscribeFunctions.push(Events.OnPlayerEarnedKill.subscribe(this.handleKill.bind(this)));
        this.unsubscribeFunctions.push(Events.OnPlayerDied.subscribe(this.handleDeath.bind(this)));
        this.unsubscribeFunctions.push(Events.OnPlayerLeaveGame.subscribe(this.handleLeave.bind(this)));
    }

    private handleKill(
        player: mod.Player,
        otherPlayer: mod.Player,
        deathType: mod.DeathType,
        weaponUnlock: mod.WeaponUnlock
    ): void {
        const playerId = mod.GetObjId(player);
        this.kills.set(playerId, (this.kills.get(playerId) || 0) + 1);
    }

    private handleDeath(
        player: mod.Player,
        otherPlayer: mod.Player,
        deathType: mod.DeathType,
        weaponUnlock: mod.WeaponUnlock
    ): void {
        const playerId = mod.GetObjId(player);
        this.deaths.set(playerId, (this.deaths.get(playerId) || 0) + 1);
    }

    private handleLeave(playerId: number): void {
        this.kills.delete(playerId);
        this.deaths.delete(playerId);
    }

    public getKills(player: mod.Player): number {
        return this.kills.get(mod.GetObjId(player)) || 0;
    }

    public getDeaths(player: mod.Player): number {
        return this.deaths.get(mod.GetObjId(player)) || 0;
    }

    public cleanup(): void {
        this.unsubscribeFunctions.forEach((unsub) => unsub());
    }
}

let stats: PlayerStats;

Events.OnGameModeStarted.subscribe(() => {
    stats = new PlayerStats();
});

Events.OnGameModeEnding.subscribe(() => {
    stats?.cleanup();
});
```

**File: `src/logging/game-logger.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Game event logging module - subscribes to the SAME events as PlayerStats
class GameLogger {
    private unsubscribeFunctions: (() => void)[] = [];

    public constructor() {
        // Multiple modules can subscribe to the same events!
        // This logger also listens to OnPlayerEarnedKill and OnPlayerDied
        this.unsubscribeFunctions.push(Events.OnPlayerEarnedKill.subscribe(this.logKill.bind(this)));
        this.unsubscribeFunctions.push(Events.OnPlayerDied.subscribe(this.logDeath.bind(this)));
        this.unsubscribeFunctions.push(Events.OnPlayerDeployed.subscribe(this.logDeployment.bind(this)));
        this.unsubscribeFunctions.push(Events.OnVehicleSpawned.subscribe(this.logVehicleSpawn.bind(this)));
    }

    private logKill(
        player: mod.Player,
        otherPlayer: mod.Player,
        deathType: mod.DeathType,
        weaponUnlock: mod.WeaponUnlock
    ): void {
        console.log(
            `[KILL] Player ${mod.GetObjId(player)} killed Player ${mod.GetObjId(otherPlayer)} with ${weaponUnlock}`
        );
    }

    private logDeath(
        player: mod.Player,
        otherPlayer: mod.Player,
        deathType: mod.DeathType,
        weaponUnlock: mod.WeaponUnlock
    ): void {
        console.log(`[DEATH] Player ${mod.GetObjId(player)} died`);
    }

    private logDeployment(player: mod.Player): void {
        console.log(`[DEPLOY] Player ${mod.GetObjId(player)} deployed`);
    }

    private logVehicleSpawn(vehicle: mod.Vehicle): void {
        console.log(`[VEHICLE] Vehicle ${mod.GetObjId(vehicle)} spawned`);
    }

    public cleanup(): void {
        this.unsubscribeFunctions.forEach((unsub) => unsub());
    }
}

let logger: GameLogger;

Events.OnGameModeStarted.subscribe(() => {
    logger = new GameLogger();
});

Events.OnGameModeEnding.subscribe(() => {
    logger?.cleanup();
});
```

**File: `src/index.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Main entry point - just import the modules, they handle their own subscriptions
import './stats/player-stats';
import './logging/game-logger';

// You can also subscribe to events directly in the main file
Events.OnGameModeStarted.subscribe(() => {
    console.log('Game mode started - all modules initialized');
});

// Multiple handlers for the same event work perfectly!
Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    // This handler runs alongside the HUD's handler
    console.log(`Main: Player ${mod.GetObjId(player)} deployed`);
});
```

This example demonstrates:

- **Multiple subscriptions to the same event** – `OnPlayerEarnedKill` is subscribed to by `PlayerStats` and `GameLogger`, and all handlers execute independently.

- **Modular code organization** – Each module manages its own subscriptions without knowing about other modules.

- **No conflicts** – All modules can subscribe to any event without interfering with each other.

- **Clean separation of concerns** – Stats tracking, logging, and UI updates are handled in separate files but all respond to the same game events.

</ai>

---

## How It Works

The `Events` module uses a centralized subscription system:

1. **Event Hook Implementation** – The module exports all Battlefield Portal event handler functions (e.g., `OnPlayerDeployed`, `OngoingPlayer`, etc.). These functions are automatically called by the Battlefield Portal runtime when events occur.

2. **Internal Triggering** – When a Battlefield Portal event occurs, the corresponding exported function calls `Events.trigger()` with the event type and parameters.

3. **Handler Storage** – Subscribed handlers are stored in a flat array (`handlers`) inside a prototype-based `EventChannel` object for each event. To optimize memory, this array is lazy-initialized on the first subscription.

4. **Handler Execution** – When an event is triggered, each subscribed handler is invoked in sequence using `CallbackHandler.invoke` with direct arguments, providing a completely zero-allocation execution path that avoids array or spread parameter allocations. Synchronous handlers run immediately (before the next handler); asynchronous handlers are invoked and their promises are not awaited, so they run without blocking. `CallbackHandler` catches any thrown or rejected errors so that one failing handler does not prevent the rest from running; errors are logged if logging is configured via `Events.setLogging()`. This design allows short synchronous handlers to run immediately instead of being queued as a microtask, while still isolating failures. Asynchronous handlers are preferred for non-trivial work.

5. **Error Logging** – Handler errors are caught and logged using the `Logging` module. The logging configuration can be set via `Events.setLogging()`, allowing you to control verbosity and error detail inclusion. This provides visibility into handler failures without manual error handling.

6. **Type Safety** – TypeScript generics ensure that handlers match the correct signature for each event type at compile time.

---

## Tick Budget and Incomplete Triggers

Previously, Battlefield Portal servers applied a safety cap on every block of synchronous work (~50ms). So, if the entire block of synchronous work for an event handler exceeded that cap, the server silently ended that JavaScript thread and execution stopped mid-flow. While this "watchdog" had been removed, since there is a possibility of it returning, this module tracks incomplete event triggers and logs a warning if there are any.

To surface this, the Events module:

- **Counts incomplete triggers** – Each time a trigger runs, it increments a per-event counter before invoking handlers and decrements it after the handler loop. If the execution is aborted in between, the counter is left positive.
- **Logs periodically** – When there are incomplete triggers and no log timeout is currently scheduled, the module schedules a one-shot timeout (e.g. 10 seconds). When that fires, it logs a warning with the number of incomplete triggers for that event type in the last interval, then resets the counter so the next period can be measured separately.

You’ll see these warnings only if logging is configured with `Events.setLogging()` and the minimum log level includes `Warning`. If you see frequent incomplete-trigger warnings for an event (especially high-frequency ones like `OngoingPlayer` or `OngoingGlobal`), consider reducing the amount of synchronous work in those handlers, subscribing fewer handlers, or moving heavy work into asynchronous handlers so it can be spread across ticks.

---

<ai>

## Known Limitations & Caveats

- **Single Event Hook Requirement** – You must not implement or export any Battlefield Portal event handler functions in your own code. If you do, they will conflict with this module's implementations and cause undefined behavior.

- **Handler Reference Equality** – When unsubscribing, you must pass the exact same function reference that was used in `subscribe()`. Anonymous functions cannot be unsubscribed unless you store the reference. **Recommended:** Use the unsubscribe function returned by `subscribe()` instead of storing handler references.

- **Execution Order** – Handlers execute in ascending order of their priority (`First` $\to$ `Normal` $\to$ `Last` or custom numbers). Handlers with the same priority value execute in deterministic FIFO order (the order in which they were subscribed).

- **No Return Values** – Event handlers cannot return values to the caller. All handlers return `void` or `Promise<void>`. If you need to collect results, use shared state or callbacks.

- **Completion and Ordering** – Synchronous handlers complete before the trigger returns; asynchronous handlers are not awaited, so you cannot rely on async handlers finishing before other code runs. Long-running synchronous handlers block other handlers and the caller—prefer async handlers for non-trivial work. Use promises or callbacks if you need to wait for handler completion.

- **Tick Budget (~50ms)** – The server may abort the JavaScript process for a game tick if total work exceeds its per-tick cap, leading to incomplete event executions. This is mechanism has since been disabled, but the module will still log how many triggers did not complete per event type over a rolling window; see [Tick Budget and Incomplete Triggers](#tick-budget-and-incomplete-triggers) for details and mitigation.

</ai>

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Future Work

- **Subscribe-time filtering** – Most events are about a target (e.g. a specific player, vehicle, or object). A future version may allow specifying filter criteria at subscribe-time (e.g. “only when this player dies” for `OnPlayerDied`), so handlers run only when the event payload matches. That would make features like `once` (run handler once then unsubscribe), `clearAll`, and `removeAllListeners` meaningful at a filtered level (e.g. “once for this player” or “clear all listeners for this player”) instead of only at the whole-event level.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional event types, handler prioritization, execution order control, etc.), so please share your experiences.

---
