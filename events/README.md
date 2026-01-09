# Events Module

This TypeScript `Events` namespace provides a centralized event subscription system for Battlefield Portal experience
developers. In Battlefield Portal, each event handler function (like `OnPlayerDeployed`, `OngoingPlayer`, etc.) can only
be implemented and exported once per entire project. This module implements all event handlers once, automatically
hooking into every Battlefield Portal event, and exposes a single subscription API that allows you to subscribe and
unsubscribe to any event from multiple places in your codebase. This keeps your code clean, modular, and maintainable.

The module provides full type safety through TypeScript generics, ensuring that event handlers match the correct
signature for each event type. Handlers can be synchronous or asynchronous (returning `void` or `Promise<void>`), and
errors in one handler won't prevent other handlers from executing. All handlers are executed asynchronously and
non-blocking, ensuring optimal performance.

> **Note** All Battlefield Portal types referenced below (`mod.Player`, `mod.Vehicle`, `mod.AreaTrigger`, etc.) come
> from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **No duplicate event handlers** – Do not implement or export any Battlefield Portal event handler functions in your
   codebase. This module handles all event hooking automatically.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Subscribe to events using `Events.subscribe()` with the event type and your handler function.
4. Unsubscribe when needed using `Events.unsubscribe()` with the same event type and handler reference.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { Events } from 'bf6-portal-utils/events';

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
Events.subscribe(Events.Type.OnPlayerDeployed, handlePlayerDeployed);
Events.subscribe(Events.Type.OnPlayerDied, handlePlayerDied);
Events.subscribe(Events.Type.OngoingPlayer, handleOngoingPlayer);

// Optional: Clean up subscriptions when the game mode ends
Events.subscribe(Events.Type.OnGameModeEnding, () => {
    Events.unsubscribe(Events.Type.OnPlayerDeployed, handlePlayerDeployed);
    Events.unsubscribe(Events.Type.OnPlayerDied, handlePlayerDied);
    Events.unsubscribe(Events.Type.OngoingPlayer, handleOngoingPlayer);
});
```

---

## Core Concepts

- **Single Event Hook** – This module implements all Battlefield Portal event handler functions once. You should not
  implement or export any event handlers in your own code.

- **Multiple Subscriptions** – You can subscribe multiple handlers to the same event type. All subscribed handlers will
  be called when the event fires.

- **Type Safety** – TypeScript ensures that your handler function signature matches the event type. For example,
  `OnPlayerDeployed` handlers must accept a single `mod.Player` parameter.

- **Synchronous and Asynchronous Handlers** – Handlers can be synchronous (returning `void`) or asynchronous (returning
  `Promise<void>`). Both are fully supported.

- **Error Isolation** – Errors thrown in one handler are caught and do not prevent other handlers from executing. This
  ensures that a bug in one subscription doesn't break your entire event system.

- **Non-Blocking Execution** – All handlers are executed asynchronously and non-blocking. The event system will not wait
  for handlers to complete before continuing execution.

---

## API Reference

### `namespace Events`

#### `enum Events.Type`

An enum containing all available event types. Use these values with `subscribe()`, `unsubscribe()`, and `trigger()`.

Available event types include:

- `OngoingGlobal`, `OngoingAreaTrigger`, `OngoingCapturePoint`, `OngoingEmplacementSpawner`, `OngoingHQ`,
  `OngoingInteractPoint`, `OngoingLootSpawner`, `OngoingMCOM`, `OngoingPlayer`, `OngoingRingOfFire`, `OngoingSector`,
  `OngoingSpawner`, `OngoingSpawnPoint`, `OngoingTeam`, `OngoingVehicle`, `OngoingVehicleSpawner`,
  `OngoingWaypointPath`, `OngoingWorldIcon`
- `OnAIMoveToFailed`, `OnAIMoveToRunning`, `OnAIMoveToSucceeded`, `OnAIParachuteRunning`, `OnAIParachuteSucceeded`,
  `OnAIWaypointIdleFailed`, `OnAIWaypointIdleRunning`, `OnAIWaypointIdleSucceeded`
- `OnCapturePointCaptured`, `OnCapturePointCapturing`, `OnCapturePointLost`
- `OnGameModeEnding`, `OnGameModeStarted`
- `OnMandown`
- `OnMCOMArmed`, `OnMCOMDefused`, `OnMCOMDestroyed`
- `OnPlayerDamaged`, `OnPlayerDeployed`, `OnPlayerDied`, `OnPlayerEarnedKill`, `OnPlayerEarnedKillAssist`,
  `OnPlayerEnterAreaTrigger`, `OnPlayerEnterCapturePoint`, `OnPlayerEnterVehicle`, `OnPlayerEnterVehicleSeat`,
  `OnPlayerExitAreaTrigger`, `OnPlayerExitCapturePoint`, `OnPlayerExitVehicle`, `OnPlayerExitVehicleSeat`,
  `OnPlayerInteract`, `OnPlayerJoinGame`, `OnPlayerLeaveGame`, `OnPlayerSwitchTeam`, `OnPlayerUIButtonEvent`,
  `OnPlayerUndeploy`
- `OnRayCastHit`, `OnRayCastMissed`
- `OnRevived`
- `OnRingOfFireZoneSizeChange`
- `OnSpawnerSpawned`
- `OnTimeLimitReached`
- `OnVehicleDestroyed`, `OnVehicleSpawned`

#### `Events.subscribe<T extends Type>(type: T, handler: HandlerForType<T>): void`

Subscribes a handler function to an event type. The handler will be called whenever the event fires.

**Parameters:**

- `type` – The event type from `Events.Type` enum
- `handler` – A function matching the signature for the event type. Can be synchronous or asynchronous.

**Example:**

```ts
Events.subscribe(Events.Type.OnPlayerDeployed, (player: mod.Player) => {
    console.log(`Player deployed: ${mod.GetObjId(player)}`);
});
```

#### `Events.unsubscribe<T extends Type>(type: T, handler: HandlerForType<T>): void`

Unsubscribes a handler function from an event type. The handler must be the same function reference that was used in
`subscribe()`.

**Parameters:**

- `type` – The event type from `Events.Type` enum
- `handler` – The same function reference that was used in `subscribe()`

**Example:**

```ts
const handler = (player: mod.Player) => {
    console.log(`Player deployed: ${mod.GetObjId(player)}`);
};

Events.subscribe(Events.Type.OnPlayerDeployed, handler);
// Later...
Events.unsubscribe(Events.Type.OnPlayerDeployed, handler);
```

#### `Events.trigger<T extends Type>(type: T, ...args: EventParameters<T>): void`

Manually triggers an event with the given parameters. This is primarily useful for debugging or testing purposes. In
normal operation, events are automatically triggered by the Battlefield Portal runtime when the corresponding game
events occur.

**Parameters:**

- `type` – The event type from `Events.Type` enum
- `...args` – The parameters matching the event type's signature

**Example:**

```ts
// For debugging: manually trigger OnPlayerDeployed
const testPlayer = mod.GetPlayers()[0];
Events.trigger(Events.Type.OnPlayerDeployed, testPlayer);
```

---

## Usage Patterns

- **Modular Event Handling** – Split your event handling logic across multiple files or modules. Each module can
  subscribe to the events it needs without conflicts.

- **Conditional Subscriptions** – Subscribe and unsubscribe handlers dynamically based on game state. For example, only
  subscribe to vehicle events when vehicles are enabled.

- **Multiple Handlers per Event** – Subscribe multiple handlers to the same event to handle different concerns
  separately (e.g., one handler for logging, another for game logic, another for UI updates).

- **Async Operations** – Use async handlers for operations that require waiting, such as delayed actions or sequential
  operations.

- **Error Handling** – Since errors in handlers are isolated, you can add try-catch blocks within individual handlers
  for fine-grained error handling without affecting other subscriptions.

### Advanced Example

This example demonstrates how multiple modules across different files can subscribe to the same events independently,
highlighting the key benefit of the Events system. Each module handles its own concerns without conflicts.

**File: `src/stats/player-stats.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Player statistics tracking module
class PlayerStats {
    private kills = new Map<number, number>();
    private deaths = new Map<number, number>();

    constructor() {
        // Subscribe to player events for stats tracking
        Events.subscribe(Events.Type.OnPlayerEarnedKill, this.handleKill.bind(this));
        Events.subscribe(Events.Type.OnPlayerDied, this.handleDeath.bind(this));
        Events.subscribe(Events.Type.OnPlayerLeaveGame, this.handleLeave.bind(this));
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

    getKills(player: mod.Player): number {
        return this.kills.get(mod.GetObjId(player)) || 0;
    }

    getDeaths(player: mod.Player): number {
        return this.deaths.get(mod.GetObjId(player)) || 0;
    }
}

let stats: PlayerStats;

Events.subscribe(Events.Type.OnGameModeStarted, () => {
    stats = new PlayerStats();
});
```

**File: `src/logging/game-logger.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Game event logging module - subscribes to the SAME events as PlayerStats
class GameLogger {
    constructor() {
        // Multiple modules can subscribe to the same events!
        // This logger also listens to OnPlayerEarnedKill and OnPlayerDied
        Events.subscribe(Events.Type.OnPlayerEarnedKill, this.logKill.bind(this));
        Events.subscribe(Events.Type.OnPlayerDied, this.logDeath.bind(this));
        Events.subscribe(Events.Type.OnPlayerDeployed, this.logDeployment.bind(this));
        Events.subscribe(Events.Type.OnVehicleSpawned, this.logVehicleSpawn.bind(this));
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
}

let logger: GameLogger;

Events.subscribe(Events.Type.OnGameModeStarted, () => {
    logger = new GameLogger();
});
```

**File: `src/index.ts`**

```ts
import { Events } from 'bf6-portal-utils/events';

// Main entry point - just import the modules, they handle their own subscriptions
import './stats/player-stats';
import './logging/game-logger';

// You can also subscribe to events directly in the main file
Events.subscribe(Events.Type.OnGameModeStarted, () => {
    console.log('Game mode started - all modules initialized');
});

// Multiple handlers for the same event work perfectly!
Events.subscribe(Events.Type.OnPlayerDeployed, (player: mod.Player) => {
    // This handler runs alongside the HUD's handler
    console.log(`Main: Player ${mod.GetObjId(player)} deployed`);
});
```

This example demonstrates:

- **Multiple subscriptions to the same event** – `OnPlayerEarnedKill` is subscribed to by `PlayerStats` and
  `GameLogger`, and all handlers execute independently.

- **Modular code organization** – Each module manages its own subscriptions without knowing about other modules.

- **No conflicts** – All modules can subscribe to any event without interfering with each other.

- **Clean separation of concerns** – Stats tracking, logging, and UI updates are handled in separate files but all
  respond to the same game events.

---

## How It Works

The `Events` module uses a centralized subscription system:

1. **Event Hook Implementation** – The module exports all Battlefield Portal event handler functions (e.g.,
   `OnPlayerDeployed`, `OngoingPlayer`, etc.). These functions are automatically called by the Battlefield Portal
   runtime when events occur.

2. **Internal Triggering** – When a Battlefield Portal event occurs, the corresponding exported function calls
   `Events.trigger()` with the event type and parameters.

3. **Handler Storage** – Subscribed handlers are stored in a `Map<Type, Set<AllHandlers>>`, allowing multiple handlers
   per event type.

4. **Handler Execution** – When an event is triggered, all subscribed handlers are executed asynchronously using
   `Promise.resolve()`. This ensures:
    - Both sync and async handlers work correctly
    - Execution is non-blocking
    - Errors in one handler don't affect others

5. **Type Safety** – TypeScript generics ensure that handlers match the correct signature for each event type at compile
   time.

---

## Known Limitations & Caveats

- **Single Event Hook Requirement** – You must not implement or export any Battlefield Portal event handler functions in
  your own code. If you do, they will conflict with this module's implementations and cause undefined behavior.

- **Handler Reference Equality** – When unsubscribing, you must pass the exact same function reference that was used in
  `subscribe()`. Anonymous functions cannot be unsubscribed unless you store the reference.

- **Execution Order** – Handler execution order is not guaranteed. If you need handlers to execute in a specific order,
  chain them manually or use a single handler that calls other functions in order.

- **No Return Values** – Event handlers cannot return values to the caller. All handlers return `void` or
  `Promise<void>`. If you need to collect results, use shared state or callbacks.

- **Non-Blocking Nature** – Because handlers execute asynchronously and non-blocking, you cannot rely on handlers
  completing before other code executes. Use promises or callbacks if you need to wait for handler completion.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.
- Battlefield Builder docs – For information about available events and their parameters.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are
welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases
help shape the roadmap (additional event types, handler prioritization, execution order control, etc.), so please share
your experiences.

---
