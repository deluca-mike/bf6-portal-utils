# Raycast Module

<ai>

This TypeScript `Raycast` namespace abstracts the raycasting functionality of BF6 Portal and handles attributing raycast hits and misses to the correct raycasts created, since the native functionality does not do this. It subscribes to `OnRayCastHit` and `OnRayCastMissed` via the `Events` module at load time, so hit and miss events are routed automatically—no manual event wiring is required. You pass hit and miss callbacks when calling `Raycast.cast()`, which keeps code readable and modular.

The namespace tracks active rays per player, uses geometric distance calculations to match hit points to ray segments, and automatically handles cleanup of expired rays and player states. A time-to-live (TTL) system ensures that old rays don't accumulate in memory, and a sophisticated pending misses resolution system correctly attributes misses to rays when the native API provides ambiguous information. The module uses the `Logging` module for internal logging, allowing you to monitor callback errors and debug raycast behavior.

> **Note** Since this module uses the `Events` module for `OnRayCastHit` and `OnRayCastMissed`, you **must** use the `Events` module as your only mechanism to subscribe to game events. Do not implement or export any Battlefield Portal event handler functions (`OnRayCastHit`, `OnRayCastMissed`, `OnPlayerDeployed`, etc.) in your code. The `Events` module owns those hooks and this module relies on it; only one implementation of each event handler can exist per project. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code (importing it subscribes to `OnRayCastHit` and `OnRayCastMissed` via the Events module; no manual event wiring is required):
    ```ts
    import { Raycast } from 'bf6-portal-utils/raycast';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Call `Raycast.cast()` with your player, start/end positions (either `mod.Vector` or `Raycast.Vector3`), and a callbacks object (at least one of `onHit` or `onMiss` must be provided).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Raycast } from 'bf6-portal-utils/raycast';
import { Events } from 'bf6-portal-utils/events';

// Optional: Configure logging for raycast callback error monitoring
Raycast.setLogging((text) => console.log(text), Raycast.LogLevel.Error);

// Raycast subscribes to OnRayCastHit and OnRayCastMissed via Events automatically.
// Use Events for your own logic (e.g. when to cast a ray).
Events.OnPlayerDeployed.subscribe((eventPlayer: mod.Player) => {
    const playerPosition = mod.GetSoldierState(eventPlayer, mod.SoldierStateVector.GetPosition);

    // Cast a ray from the player's position forward to detect obstacles
    const forwardDirection = mod.GetSoldierState(eventPlayer, mod.SoldierStateVector.GetDirection);
    const rayEnd = mod.VectorAdd(playerPosition, mod.VectorScale(forwardDirection, 100));

    Raycast.cast(
        eventPlayer,
        {
            x: mod.XComponentOf(playerPosition),
            y: mod.YComponentOf(playerPosition),
            z: mod.ZComponentOf(playerPosition),
        },
        {
            x: mod.XComponentOf(rayEnd),
            y: mod.YComponentOf(rayEnd),
            z: mod.ZComponentOf(rayEnd),
        },
        {
            onHit: async (hitPoint, normal) => {
                // Called when the ray hits a target
                // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
                console.log(`Ray hit at <${hitPoint.x}, ${hitPoint.y}, ${hitPoint.z}>`);
                console.log(`Surface normal: <${normal.x}, ${normal.y}, ${normal.z}>`);
            },
            onMiss: () => {
                // Called when the ray misses (no target found)
                // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
                console.log('Ray missed - no obstacle detected');
            },
        }
    );
});
```

</ai>

---

## Core Concepts

- **Automatic event wiring** – The namespace subscribes to `Events.OnRayCastHit` and `Events.OnRayCastMissed` at load time. You must not implement or export `OnRayCastHit` or `OnRayCastMissed`; use the Events module for all event subscription.
- **State Tracking** – The module maintains per-player state to track active rays, their callbacks, and pending misses.
- **Geometric Attribution** – Hits are attributed to rays using distance calculations to find the best-fitting ray: the module searches through all active (non-stale) rays and selects the one where the distance from ray start to hit point plus the distance from hit point to ray end most closely matches the total ray length.
- **Pending Misses** – The native API doesn't provide enough information to attribute misses to specific rays, so misses are stored as "pending" and resolved when the number of pending misses equals the number of active rays (at which point all remaining rays are considered misses).
- **Time-to-Live (TTL)** – Each ray has a timestamp and expires after 2 seconds (default). Expired (stale) rays are skipped during hit attribution and trigger their miss callbacks and are cleaned up automatically.
- **Automatic Pruning** – The module automatically prunes expired rays every 5 seconds to prevent memory leaks. You can also call `Raycast.pruneAllStates()` from a handler subscribed to `Events.OnPlayerLeaveGame` for immediate cleanup when players leave.
- **Configurable Error Logging** – Callback errors (both synchronous and asynchronous) are automatically logged using the `Logging` module. Use `Raycast.setLogging()` to configure a logger function, minimum log level, and whether to include error details. This provides visibility into callback failures without requiring manual error handling in every callback.

---

## API Reference

### `namespace Raycast`

The namespace is not instantiated; all members are static or types.

#### `Raycast.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `Raycast.setLogging()` to configure the minimum log level for raycast callback error logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the Raycast module. Callback errors (both synchronous and asynchronous) are automatically caught and logged using the configured logger. This allows you to monitor and debug callback failures without breaking the raycast system. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. The runtime error can be very large and may cause issues with UI loggers. For more information, see the [`Logging` module documentation](../logging/README.md). |
| `cast(player: mod.Player, start: mod.Vector \| Raycast.Vector3, end: mod.Vector \| Raycast.Vector3, callbacks: Raycast.Callbacks): void` | Casts a ray from `start` to `end` for the given `player`. The `callbacks` object (of type `Raycast.Callbacks<T>`) must contain at least one of `onHit` or `onMiss`. The type of `start` and `end` (either `mod.Vector` or `Raycast.Vector3`) determines the generic type `T`, which in turn determines the type of `hitPoint` and `hitNormal` in the `onHit` callback. The ray is tracked internally and automatically cleaned up after the TTL expires. Hit and miss events are received automatically via the Events module. |
| `pruneAllStates(): void` | Manually prunes all expired rays and removes empty player states. Optionally call from a handler subscribed to `Events.OnPlayerLeaveGame` to clean up when players leave; automatic pruning also runs every 5 seconds. |

---

<ai>

## Usage Patterns

- **Obstacle Detection** – Cast rays from players to detect walls, terrain, or other obstacles ahead of them.
- **Line of Sight Checks** – Verify if a player has line of sight to another player or target.
- **Weapon Targeting** – Use raycasts to determine where a weapon shot would hit before actually firing.
- **Spawn Point Validation** – Check if a potential spawn location is clear of obstacles before spawning a player.
- **Interactive Objects** – Detect what objects a player is looking at or pointing at for interaction systems.

</ai>

<ai>

### Example: Line of Sight Check

Note: This example is not technically a sufficient LOS check implementation as it does not correctly use the player's eye position, nor does it take into account if the target is without a cone of view of the player's eye direction.

```ts
import { Raycast } from 'bf6-portal-utils/raycast';

function checkLineOfSight(player: mod.Player, target: mod.Player): Promise<boolean> {
    return new Promise((resolve) => {
        const playerPos = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
        const targetPos = mod.GetSoldierState(target, mod.SoldierStateVector.GetPosition);

        Raycast.cast(player, playerPos, targetPos, {
            onHit: async (hitPoint) => {
                // Ray hit something - check if it's the target (within 1 meter)
                // Since we passed mod.Vector for start/end, hitPoint is also mod.Vector
                // Callbacks can be async (return Promise<void>) or sync (return void)
                const dx = mod.XComponentOf(hitPoint) - mod.XComponentOf(targetPos);
                const dy = mod.YComponentOf(hitPoint) - mod.YComponentOf(targetPos);
                const dz = mod.ZComponentOf(hitPoint) - mod.ZComponentOf(targetPos);
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // If hit point is close to target, we have line of sight
                resolve(distance < 1.0);
            },
            onMiss: () => {
                // Ray missed - no line of sight (obstacle or ray expired)
                // Callbacks can be async (return Promise<void>) or sync (return void)
                resolve(false);
            },
        });
    });
}
```

</ai>

---

## Event Wiring & Lifecycle

### Automatic Event Wiring

The `Raycast` namespace subscribes to `Events.OnRayCastHit` and `Events.OnRayCastMissed` at load time. **Do not implement or export `OnRayCastHit` or `OnRayCastMissed`** in your code; the module receives hit and miss events through the Events module and attributes them to the correct rays internally.

### Lifecycle Flow

1. Call `Raycast.cast()` with a player, start/end positions (either `mod.Vector` or `Raycast.Vector3`), and a callbacks object (at least one of `onHit` or `onMiss` must be provided).
2. The module stores the ray internally and calls the native `mod.RayCast()` function.
3. When the native engine fires a ray hit, the Events module invokes the Raycast handler; the module matches the hit to the best-fitting ray using geometric distance calculations (skipping stale rays).
4. If a match is found, the `onHit` callback is invoked with the hit point and surface normal (the type matches the type of `start` and `end`). Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Errors in callbacks are automatically caught and logged if logging is configured.
5. When the native engine fires a ray miss, the module stores the miss as pending and resolves it when possible.
6. Expired rays (older than 2 seconds) automatically trigger their `onMiss` callbacks and are cleaned up.
7. Automatic pruning runs every 5 seconds to clean up expired rays and empty player states.

---

## How It Works

The `Raycast` namespace uses geometric distance calculations and a sophisticated state management system to attribute hits and misses to the correct rays. It subscribes to `Events.OnRayCastHit` and `Events.OnRayCastMissed` at load time so hit and miss events are routed automatically.

1. **Ray Storage** – When `cast()` is called, the ray's start/end positions, callbacks, and timestamp are stored in a per-player `Map`. Each ray is assigned a unique ID.

2. **Hit Attribution** – When a hit event is received (via the Events subscription):
    - The module searches through all active rays for the player, skipping rays that are stale (expired due to TTL).
    - For each non-stale ray, it calculates: `distance(ray.start, hitPoint) + distance(hitPoint, ray.end)`
    - The error for each ray is computed as `|(d1 + d2) - ray.totalDistance|`, and the ray with the lowest error (within the 0.5m sanity cap) is selected as the best match.
    - The `onHit` callback is invoked for the best-matching ray, and the ray is removed from the active set.
    - The pending misses resolution is checked to see if any remaining rays should be considered misses.

3. **Miss Attribution** – The native API doesn't provide enough information to attribute misses to specific rays, so the module uses a counting system:
    - Each miss increments a `pendingMisses` counter for the player.
    - When `pendingMisses >= activeRays.size`, all remaining rays are considered misses.
    - Their `onMiss` callbacks are invoked, and the state is cleared.

4. **TTL System** – Each ray has a timestamp. Rays older than 2 seconds (default) are considered expired (stale):
    - Stale rays are skipped during hit attribution (they are not considered as potential matches).
    - Expired rays trigger their `onMiss` callbacks.
    - They are removed from the active set during pruning operations.
    - Lazy pruning runs before adding new rays to keep the active set clean.

5. **Automatic Pruning** – A timer calls `pruneAllStates()` every 5 seconds:
    - Expired rays are removed from each player's state.
    - Player states with no active rays and no pending misses are deleted entirely.
    - This prevents unbounded memory growth in long-running sessions.

6. **Error Logging** – Callback errors (both synchronous and asynchronous) are caught and logged using the `Logging` module. The logging configuration can be set via `Raycast.setLogging()`, allowing you to control verbosity and error detail inclusion. This provides visibility into callback failures without manual error handling.

---

<ai>

## Known Limitations & Caveats

- **Events module required** – You **must** use the [Events module](../events/README.md) for all game event subscription and **must not** implement or export any Battlefield Portal event handler functions. This module subscribes to `OnRayCastHit` and `OnRayCastMissed` via Events. See [Events — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

- **Multiple Simultaneous Rays** – The module can handle multiple rays from the same player, but if many rays are cast in quick succession, the geometric attribution algorithm may become less efficient. In practice, this is rarely an issue since the linear scan is very fast for small ray counts.

- **Miss Attribution Ambiguity** – The native API doesn't distinguish which specific ray missed, so the module uses a counting heuristic. In rare cases with many simultaneous rays, misses may be attributed slightly later than ideal, but they will always be correctly resolved.

- **TTL Precision** – Expired rays trigger their miss callbacks after the TTL expires, not at the exact expiration time. The actual cleanup happens during pruning operations (every 5 seconds) or lazy pruning (before adding new rays).

- **Callback Errors** – Callback errors (both synchronous and asynchronous) are automatically caught and logged (if logging is configured via `Raycast.setLogging()`) to prevent one failing callback from breaking the entire raycast system. Errors are logged at the `Error` log level. If you need additional error handling, implement it inside your callbacks.

- **Player State Cleanup** – While automatic pruning runs every 5 seconds, you may call `Raycast.pruneAllStates()` from a handler subscribed to `Events.OnPlayerLeaveGame` to immediately clean up state when players leave.

- **Distance Epsilon** – The hit attribution uses a 0.5m (`_DISTANCE_EPSILON`) sanity cap for distance comparisons. The algorithm finds the best-fitting ray (lowest error) among all candidates, and only considers rays where the error is within this tolerance. This acts as a sanity check to prevent misattribution rather than a strict matching threshold.

</ai>

---

## Configuration & Defaults

The following static readonly properties control raycast behavior. While these are marked as `readonly`, they can be modified in the source code as needed for your use case.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `_DISTANCE_EPSILON` | `number` | `0.5` | Distance tolerance in meters (50cm) acting as a sanity cap for hit attribution. The algorithm finds the best-fitting ray (lowest error) and only considers candidates within this tolerance. |
| `_DEFAULT_TTL_MS` | `number` | `2_000` | Time-to-live in milliseconds (2 seconds) for rays. Rays older than this are considered expired (stale) and are skipped during hit attribution, then trigger their miss callbacks. |
| `_PRUNE_INTERVAL_MS` | `number` | `5_000` | Interval in milliseconds (5 seconds) between automatic pruning operations that clean up expired rays and empty player states. |

---

## Types & Interfaces

All types are defined inside the `Raycast` namespace in [`index.ts`](index.ts).

### `Raycast.Vector3`

Simple 3D vector interface:

```ts
interface Vector3 {
    x: number;
    y: number;
    z: number;
}
```

### `Raycast.HitCallback`

Generic callback function type for ray hits:

```ts
type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => Promise<void> | void;
```

The `hitPoint` parameter is the 3D position where the ray hit, and `hitNormal` is the surface normal at the hit point. The type `T` matches the type of `start` and `end` passed to `cast()`. If you pass `mod.Vector`, the callbacks receive `mod.Vector`. If you pass `Raycast.Vector3`, they receive `Raycast.Vector3`.

Callbacks can be synchronous (returning `void`) or asynchronous (returning `Promise<void>`). Errors in callbacks are automatically caught and logged if logging is configured via `Raycast.setLogging()`.

### `Raycast.MissCallback`

Called when a ray misses (no target found) or expires due to TTL:

```ts
type MissCallback = () => Promise<void> | void;
```

Called when a ray misses (no target found) or expires due to TTL. Callbacks can be synchronous (returning `void`) or asynchronous (returning `Promise<void>`). Errors in callbacks are automatically caught and logged if logging is configured via `Raycast.setLogging()`.

### `Raycast.Callbacks`

Callback object type for the `cast()` method. At least one of `onHit` or `onMiss` must be provided:

```ts
type Callbacks<T extends mod.Vector | Vector3> =
    | { onHit: HitCallback<T>; onMiss?: MissCallback }
    | { onHit?: HitCallback<T>; onMiss: MissCallback };
```

This union type ensures type safety: you must provide at least one callback, but both are optional individually. The generic type `T` matches the type of `start` and `end` passed to `cast()`.

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the detector to them.
- [CallbackHandler module](../callback-handler/README.md) – Used to invoke callbacks safely so errors do not crash the mod.
- [Timers module](../timers/README.md) – Used internally for automatic pruning.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (configurable TTL per ray, additional callback options, performance optimizations, etc.), so please share your experiences.

---
