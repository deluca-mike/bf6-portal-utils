# ScavengerDrop Module

<ai>

The `ScavengerDrop` namespace provides functionality for Battlefield Portal experiences to detect when a player scavenges a dead player's kit bag. In Battlefield 6, when a player dies, they drop a bag containing their kit that despawns after approximately 37 seconds. Players can pick up weapons from these bags, but the default behavior does not replenish the scavenging player's ammo. This module allows you to perform custom actions (such as resupplying ammo, displaying messages, or any other logic) when the first player gets within 2 meters of a dead player's body.

**Why use ScavengerDrop?** The `ScavengerDrop` module offers significant advantages: automatic detection of players scavenging dead bodies powered by zero-GC reactive spatial tracking (`PlayerLocations.onSphere`), support for custom callbacks to handle scavenging events, and automatic cleanup when drops expire or are scavenged. Ideal for ammo resupply systems, custom loot mechanics, achievement tracking, or any scenario where you need to detect and respond to players picking up dropped kits.

Key features include zero-polling reactive proximity detection using 2-meter sphere zone subscriptions (`PlayerLocations.onSphere`), automatic expiration processing evaluated at the start of each tick (`Events.OnTickStart`) after the configured duration (defaulting to 37 seconds to match the game's bag despawn time), graceful error handling that prevents callback failures from crashing your mod, and configurable logging for debugging scavenger drop behavior. The module runs on flat typed arrays (Struct-of-Arrays) with an intrusive `Int8Array` free-list for zero runtime heap allocations.

> **Note:** Since this module imports and relies on `Events`, **you must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. See the [Events module](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { ScavengerDrop } from 'bf6-portal-utils/scavenger-drop';
    ```
3. Optionally set up logging for debugging (recommended during development).
4. Create a scavenger drop with `ScavengerDrop.create()` in your `OnPlayerDied` event handler.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { ScavengerDrop } from 'bf6-portal-utils/scavenger-drop';

// Optional: Configure logging for scavenger drop monitoring
ScavengerDrop.setLogging((text) => console.log(text), ScavengerDrop.LogLevel.Info);

export function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void {
    // Create a scavenger drop that triggers when a player gets within 2 meters
    // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
    ScavengerDrop.create(victim, (scavenger: mod.Player) => {
        // Resupply the scavenger's primary weapon magazine ammo
        mod.SetInventoryMagazineAmmo(
            scavenger,
            mod.InventorySlots.PrimaryWeapon,
            mod.GetInventoryMagazineAmmo(scavenger, mod.InventorySlots.PrimaryWeapon) + 30
        );

        // Display a message to the scavenger
        mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.scavengerLog), scavenger); // 'Scavenged ammo'
    });
}
```

</ai>

---

## Core Concepts

- **Drop Creation** – A scavenger drop is registered with a dead player's body (`mod.Player` object) via `ScavengerDrop.create()`. The module retrieves the player's position via `PlayerLocations.getPosition()` and sets up a 2-meter reactive sphere zone.
- **Proximity Detection** – The module subscribes to `PlayerLocations.onSphere()` with a 2-meter radius centered at the drop position. When any player enters the sphere (`onEnter`), the scavenging callback is invoked and the drop is automatically recycled.
- **Automatic Expiration** – Drops automatically expire after the configured duration (default 37 seconds, matching the game's bag despawn time). Once expired, the drop unsubscribes from `PlayerLocations` and automatically deactivates.
- **Single Trigger** – Each drop triggers its callback only once—when the first player gets within 2 meters. After triggering, the drop slot is automatically recycled.
- **Generational IDs** – Each created drop receives a unique generational ID (e.g., `10005`), preventing stale handle errors (ABA problem) if a drop is stopped after being reallocated.
- **Error Handling** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is configured) but do not prevent the drop from functioning. This ensures that callback failures don't crash your mod.
- **Configurable Error Logging** – Callback errors are automatically logged using the `Logging` module. Use `ScavengerDrop.setLogging()` to configure a logger function, minimum log level, and whether to include error details.

---

## API Reference

### `namespace ScavengerDrop`

#### `ScavengerDrop.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `ScavengerDrop.setLogging()` to configure the minimum log level for scavenger drop logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages. Includes drop creation, stop events, expiration events, and successful scavenge detection.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes full pool errors and callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string, error?: unknown) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Configures logging for the ScavengerDrop module. Callback errors (both synchronous and asynchronous) are automatically caught and logged using the configured logger. Pass `undefined` (or `null`) for `log` to disable logging. Default log level is `Warning`, default `includeRawError` is `false`. |
| `create(body: mod.Player, onScavenge: (player: mod.Player) => Promise<void> \| void, duration?: number): DropID \| null` | Creates a new scavenger drop. Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid. Takes an optional `duration` in milliseconds (clamped to `[0, MAX_DURATION_MS]`, default: 37,000 ms). Returns a generational `DropID`, or `null` if the pre-allocated drop pool is full or the player position is unavailable. |
| `stop(id: DropID): void` | Manually stops an active scavenger drop by its ID, preventing the callback from being triggered. |
| `stopAll(): void` | Stops and cleans up all currently active scavenger drops. |
| `isActive(id: DropID): boolean` | Checks whether the given drop ID is currently active. |
| `getActiveDropCount(): number` | Returns the number of currently active scavenger drops. |

#### Constants

| Constant | Type | Value | Description |
| --- | --- | --- | --- |
| `MAX_DURATION_MS` | `number` | `2_147_483_647` | Maximum drop duration in milliseconds (signed 32-bit positive limit). |
| `RADIUS` | `number` | `2` | Detection radius in meters for scavenging a dead player's kit bag. |

---

<ai>

## Usage Patterns

- **Basic ammo resupply** – Use `mod.Resupply()` in the callback to give players full ammo when they scavenge a kit.
- **Custom ammo management** – Use `mod.SetInventoryAmmo()` and `mod.SetInventoryMagazineAmmo()` for fine-grained ammo control.
- **Player notifications** – Use `mod.DisplayHighlightedWorldLogMessage()` to inform players when they scavenge a kit.
- **Kill Confirmed** – Spawn an item on the dead body and give points to the player or team that confirms the kill.
- **Achievement tracking** – Track scavenging events for statistics or achievements.
- **Custom loot systems** – Implement custom loot mechanics beyond the default kit bag behavior.
- **Drop cleanup** – Use `stop(id)` or `stopAll()` to manually cancel drops when needed (e.g., round end or game mode resets).

</ai>

<ai>

### Example: Custom Duration and Async Callback Handling

```ts
import { ScavengerDrop } from 'bf6-portal-utils/scavenger-drop';

export function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void {
    // Create a drop that lasts 20 seconds
    ScavengerDrop.create(
        victim,
        async (scavenger: mod.Player) => {
            // Perform async operations
            await someAsyncOperation();

            mod.Resupply(scavenger, mod.ResupplyTypes.AmmoBox);

            // Log to external service, update statistics, etc.
            await logScavengeEvent(scavenger, victim);
        },
        20_000 // 20 seconds duration
    );
}
```

</ai>

---

## How It Works

The `ScavengerDrop` module implements scavenger detection by integrating with the `PlayerLocations` module and `Events.OnTickStart` for centralized zero-allocation lifecycle management:

1. **Pre-allocated Zero-Allocation Pool** – State is stored across flat, contiguous typed arrays (Struct of Arrays) for up to 128 concurrent drops:
    - `_generations` (`Uint16Array`) – Generational counters for ABA safety. When a slot reaches the maximum generation of `65_535`, it is permanently retired to prevent generational wrap-around collisions.
    - `_expirationTimes` (`Uint32Array`) – Expiration timestamps based on server uptime (with `0` indicating an inactive slot).
    - `_freeList` (`Int8Array`) – Intrusive free-list tracking available slot indices (`0..127`, with `-1` indicating the end of the free list).
    - `_handles` (`Array<PlayerLocations.SphereHandle | null>`) – Fixed-size array storing active `PlayerLocations.onSphere` subscription handles. If the pool is full when `create()` is called, it logs an error and returns `null` without throwing an exception.

2. **Reactive Spatial Subscriptions** – When `create()` is called:
    - The module queries `PlayerLocations.getPosition(body)` to get the dead player's world position with zero heap allocation.
    - Subscribes to `PlayerLocations.onSphere(x, y, z, 2, onEnter)` with a 2-meter radius.
    - When any player enters the 2-meter sphere, the `onEnter` callback fires, automatically cleans up the drop subscription via `_destroy(index)`, and invokes the user's `onScavenge` callback via `CallbackHandler.invoke`.

3. **Centralized Expiration Loop** – Expiration is evaluated in a single global tick handler (`Events.OnTickStart`). When no drops are active (`_activeDropCount === 0`), the handler returns immediately in a single comparison. Drops that exceed their configured duration are automatically unsubscribed and recycled.

4. **Drop Cleanup** – Calling `stop(id)` or `stopAll()` immediately unsubscribes the sphere handle from `PlayerLocations` and frees slots without memory leaks.

---

<ai>

## Known Limitations & Caveats

- **Pool Capacity** – The drop pool is pre-allocated to 128 concurrent slots (`MAX_DROPS`). If the pool is full when calling `create()`, it logs an error via `Logging` and returns `null` without throwing an exception.
- **Position Capture** – The drop captures the position of the dead player's body at creation time. If the body moves (e.g., due to physics or explosions), the drop will continue monitoring the original position. Always create the drop immediately in `OnPlayerDied` to ensure the position is accurate.
- **Single Trigger** – Each drop triggers its callback only once—when the first player gets within 2 meters. If multiple players enter simultaneously, only the first triggering player receives the callback.
- **Distance Precision** – The 2-meter threshold is fixed and matches typical interaction ranges in Battlefield Portal.
- **Async Callbacks** – Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Async callbacks are not awaited by the drop; errors or rejections are caught and logged via `CallbackHandler`.

</ai>

---

## Further Reference

- [PlayerLocations module](../player-locations/README.md) – Used for reactive spatial proximity subscriptions and player position tracking.
- [Events module](../events/README.md) – Used internally for global tick subscription.
- [Logging module](../logging/README.md) – Used for internal error and debug logging.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
