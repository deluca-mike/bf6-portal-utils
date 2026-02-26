# ScavengerDrop Module

<ai>

This TypeScript `ScavengerDrop` class provides functionality for Battlefield Portal experiences to detect when a player scavenges a dead player's kit bag. In Battlefield 6, when a player dies, they drop a bag containing their kit that despawns after approximately 37 seconds. Players can pick up weapons from these bags, but the default behavior does not replenish the scavenging player's ammo. This module allows you to perform custom actions (such as resupplying ammo, displaying messages, or any other logic) when the first player gets within 2 meters of a dead player's body.

**Why use ScavengerDrop?** The `ScavengerDrop` module offers significant advantages: automatic detection of players scavenging dead bodies, performance-optimized checking that scales frequency based on proximity, support for custom callbacks to handle scavenging events, and automatic cleanup when drops expire or are scavenged. Ideal for ammo resupply systems, custom loot mechanics, achievement tracking, or any scenario where you need to detect and respond to players picking up dropped kits.

Key features include adaptive check frequency that increases as players get closer to drops (reducing overhead when drops are far away), automatic expiration after the configured duration (defaulting to 37 seconds to match the game's bag despawn time), graceful error handling that prevents callback failures from crashing your mod, and configurable logging for debugging scavenger drop behavior. The module uses the `Timers` module for interval management and the `Logging` module for internal logging.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { ScavengerDrop } from 'bf6-portal-utils/scavenger-drop';
    ```
3. Optionally set up logging for debugging (recommended during development).
4. Create a new `ScavengerDrop` instance in your `OnPlayerDied` event handler.
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
    new ScavengerDrop(victim, (scavenger: mod.Player) => {
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

- **Drop Creation** – A `ScavengerDrop` instance is created with a dead player's body (`mod.Player` object). The drop tracks the position of the body and monitors for nearby players.
- **Proximity Detection** – The module uses `mod.ClosestPlayerTo()` to find the nearest player to the drop position. When a player gets within 2 meters, the callback is triggered.
- **Adaptive Check Frequency** – To optimize performance, the module adjusts how frequently it checks for nearby players based on distance. When players are far away (more than 2 meters), checks occur less frequently. When players are close, checks occur more frequently to ensure accurate detection.
- **Automatic Expiration** – Drops automatically expire after the configured duration (default 37 seconds, matching the game's bag despawn time). Once expired, the drop stops checking and cleans up its timers.
- **Single Trigger** – Each drop triggers its callback only once—when the first player gets within range. After triggering, the drop is automatically cleaned up.
- **Error Handling** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is configured) but do not prevent the drop from functioning. This ensures that callback failures don't crash your mod.
- **Configurable Error Logging** – Callback errors are automatically logged using the `Logging` module. Use `ScavengerDrop.setLogging()` to configure a logger function, minimum log level, and whether to include error details. This provides visibility into callback failures without requiring manual error handling.

---

## API Reference

### `class ScavengerDrop`

The `ScavengerDrop` class is instantiated with a dead player's body and a callback function. Each instance monitors for players getting within 2 meters of the drop position.

#### `ScavengerDrop.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `ScavengerDrop.setLogging()` to configure the minimum log level for scavenger drop logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose. Includes drop creation, expiration, and stop events.
- `Info` (1) – Informational messages. Includes successful scavenge detection.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the ScavengerDrop module. Callback errors (both synchronous and asynchronous) are automatically caught and logged using the configured logger. This allows you to monitor and debug callback failures without breaking your mod. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. The runtime error can be very large and may cause issues with UI loggers. For more information, see the [`Logging` module documentation](../logging/README.md). |

#### Constructor

| Method | Description |
| --- | --- |
| `new ScavengerDrop(body: mod.Player, onScavenge: (player: mod.Player) => Promise<void> \| void, options?: ScavengerDrop.Options)` | Creates a new scavenger drop instance. Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid. The `body` parameter is the dead player's body. The `onScavenge` callback is invoked when the first player gets within 2 meters of the drop. Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). The optional `options` parameter allows customization of the drop duration and check interval. |

#### Instance Methods

| Method | Description |
| --- | --- |
| `stop(): void` | Manually stops the scavenger drop, canceling all timers and preventing the callback from being triggered. Useful for cleanup scenarios where you need to cancel a drop before it expires or is scavenged. |

#### `ScavengerDrop.Options`

An interface for configuring scavenger drop behavior.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | `number` | `37000` | The duration of the scavenger drop in milliseconds. After this time, the drop expires and stops checking for players. Defaults to 37 seconds to match the game's bag despawn time. |
| `checkInterval` | `number` | `200` | The base interval at which to check for scavengers in milliseconds. The actual check frequency adapts based on player proximity (see [How It Works](#how-it-works)). Defaults to 0.2 seconds (200ms). This is the minimum interval between checks when players are nearby. |

---

<ai>

## Usage Patterns

- **Basic ammo resupply** – Use `mod.Resupply()` in the callback to give players full ammo when they scavenge a kit.
- **Custom ammo management** – Use `mod.SetInventoryAmmo()` and `mod.SetInventoryMagazineAmmo()` for fine-grained ammo control.
- **Player notifications** – Use `mod.DisplayHighlightedWorldLogMessage()` to inform players when they scavenge a kit.
- **Kill Confirmed** – Spawn an item on the dead body and give points to the player or team that confirms the kill.
- **Achievement tracking** – Track scavenging events for statistics or achievements.
- **Custom loot systems** – Implement custom loot mechanics beyond the default kit bag behavior.
- **Drop cleanup** – Use `stop()` to manually cancel drops when needed (e.g., if a player respawns before the drop expires).

</ai>

<ai>

### Example: Custom Duration and Check Interval and Async Callback Handling

```ts
import { ScavengerDrop } from 'bf6-portal-utils/scavenger-drop';

export function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): void {
    // Create a drop that lasts 20 seconds with checks every 100ms if a player is nearby.
    new ScavengerDrop(
        victim,
        async (scavenger: mod.Player) => {
            // Perform async operations
            await someAsyncOperation();

            mod.Resupply(scavenger, mod.ResupplyTypes.AmmoBox);

            // Log to external service, update statistics, etc.
            await logScavengeEvent(scavenger, victim);
        },
        {
            duration: 20_000, // 20 seconds
            checkInterval: 100, // 100ms base check interval
        }
    );
}
```

</ai>

---

## How It Works

The `ScavengerDrop` class implements scavenger detection using Battlefield Portal's `mod.ClosestPlayerTo()` API and the `Timers` module for interval management:

1. **Drop Creation** – When a new `ScavengerDrop` is created:
    - The drop captures the position of the dead player's body using `mod.GetSoldierState()`.
    - An interval timer is started using `Timers.setInterval()` with the configured `checkInterval` (default 200ms).
    - An expiration timeout is set using `Timers.setTimeout()` with the configured `duration` (default 37 seconds).
    - A unique drop ID is assigned for logging purposes.

2. **Adaptive Check Frequency** – To optimize performance, the module uses an adaptive checking strategy:
    - When no valid player is found within range, the module waits 10 check intervals before calling `mod.ClosestPlayerTo()` again. This accounts for the possibility that players might spawn nearby or be in faster-moving vehicles (even though players cannot run faster than about 10 meters per second).
    - When a player is found but is more than 2 meters away, the check frequency scales based on distance: `Math.min(10, Math.max(1, Math.floor(distance / 4)))`. This means:
        - Players within 4 meters: check every interval (200ms default)
        - Players 4-8 meters away: check every 1-2 intervals
        - Players 8-40 meters away: check every 2-10 intervals (scaled by distance)
        - No players nearby: wait 10 intervals before checking again
    - This approach reduces overhead when there are many drops on the map and players are far away, while ensuring accurate detection when players are close.

3. **Proximity Detection** – On each check:
    - The module calls `mod.ClosestPlayerTo(position)` to find the nearest player to the drop.
    - If no valid player is found, the check is skipped and the tick-down counter is set to 10 intervals.
    - If a player is found, the distance between the drop position and the player's position is calculated using `mod.DistanceBetween()`.
    - If the distance is greater than 2 meters, the check frequency is adjusted based on distance and the check is skipped.
    - If the distance is 2 meters or less, the callback is triggered.

4. **Callback Execution** – When a player is detected within 2 meters:
    - All timers (interval and timeout) are cleared to prevent further checks and expiration.
    - The `onScavenge` callback is invoked with the scavenging player as an argument.
    - If the callback returns a `Promise`, any rejection is caught and logged (if logging is configured).
    - If the callback throws a synchronous error, it is caught and logged (if logging is configured).
    - Errors do not prevent the drop from completing its cleanup.

5. **Drop Expiration** – When the drop expires (after the configured duration):
    - The interval timer is cleared, stopping all further checks.
    - The drop is effectively deactivated and will not trigger its callback.

6. **Manual Stop** – The `stop()` method:
    - Clears both the interval and timeout timers.
    - Prevents the callback from being triggered.
    - Useful for cleanup scenarios where you need to cancel a drop before it expires or is scavenged.

7. **Error Isolation** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is configured via `ScavengerDrop.setLogging()`) but don't prevent the drop from completing its cleanup. This ensures that one failing callback doesn't break other drops or your mod's execution.

---

<ai>

## Known Limitations & Caveats

- **Position Capture** – The drop captures the position of the dead player's body at creation time. If the body moves (e.g., due to physics or explosions), the drop will continue checking the original position. Always create the drop immediately in `OnPlayerDied` to ensure the position is accurate.

- **Single Trigger** – Each drop triggers its callback only once—when the first player gets within 2 meters. If multiple players are close when the check occurs, only the closest player triggers the callback. If you need to handle multiple scavengers, create multiple drops or implement custom logic in your callback.

- **Distance Precision** – The 2-meter threshold is fixed and cannot be configured. The threshold matches typical interaction ranges in Battlefield Portal that feel reasonable and ergonomic.

- **Check Interval Precision** – The actual check frequency adapts based on player proximity, but the base `checkInterval` determines the minimum time between checks. Timer precision depends on `mod.Wait()`'s precision (used by the `Timers` module), which may vary slightly based on game performance and frame timing.

- **Performance Considerations** – While the adaptive check frequency reduces overhead, creating many drops simultaneously (e.g., during intense combat with many deaths) will still create multiple interval timers. The module is optimized for typical gameplay scenarios, but extreme cases with hundreds of concurrent drops may impact performance.

- **Async Callbacks** – Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Async callbacks are not awaited by the drop, meaning:
    - The drop doesn't wait for async operations to complete before cleaning up
    - Errors or rejections from async callbacks are automatically caught and logged (if logging is configured)
    - If you need to await async operations, handle that inside your callback

- **Concurrent Drops** – Multiple drops can exist simultaneously and operate independently. Each drop maintains its own timers and state. There is no built-in limit on the number of concurrent drops.

</ai>

---

## Further Reference

- [Timers module](../timers/README.md) – The timing module used internally.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (configurable distance thresholds, multiple scavenger support, drop pooling, additional optimization strategies, etc.), so please share your experiences.

---
