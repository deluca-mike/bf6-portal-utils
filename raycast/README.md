# Raycast Module

This TypeScript `Raycast` class abstracts the raycasting functionality of BF6 Portal and handles attributing raycast
hits and misses to the correct raycasts created, since the native functionality does not do this. This significantly
improves the developer experience, along with being able to pass hit and miss callbacks, which makes code more readable
and modular.

The class tracks active rays per player, uses geometric distance calculations to match hit points to ray segments, and
automatically handles cleanup of expired rays and player states. A time-to-live (TTL) system ensures that old rays don't
accumulate in memory, and a sophisticated pending misses resolution system correctly attributes misses to rays when the
native API provides ambiguous information.

> **Note** The `Raycast` class depends on the `Timers` module (which is also maintained in this repository) for
> automatic state pruning. All Battlefield Portal types referenced below (`mod.Player`, `mod.Vector`, etc.) come from
> [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **Event handlers** – Wire `Raycast.handleHit()` and `Raycast.handleMiss()` into your `OnRayCastHit()` and
   `OnRayCastMissed()` event handlers.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Raycast } from 'bf6-portal-utils/raycast';
    ```
3. Wire the event handlers in your `OnRayCastHit()` and `OnRayCastMissed()` events.
4. Call `Raycast.cast()` with your player, start/end positions (either `mod.Vector` or `Raycast.Vector3`), and a
   callbacks object (at least one of `onHit` or `onMiss` must be provided).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { Raycast } from 'bf6-portal-utils/raycast';

export function OnRayCastHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void {
    // Required: Forward the event to Raycast so it can attribute the hit to the correct ray
    Raycast.handleHit(eventPlayer, eventPoint, eventNormal);
}

export function OnRayCastMissed(eventPlayer: mod.Player): void {
    // Required: Forward the event to Raycast so it can attribute the miss to the correct ray
    Raycast.handleMiss(eventPlayer);
}

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
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
            onHit: (hitPoint, normal) => {
                // Called when the ray hits a target
                console.log(`Ray hit at <${hitPoint.x}, ${hitPoint.y}, ${hitPoint.z}>`);
                console.log(`Surface normal: <${normal.x}, ${normal.y}, ${normal.z}>`);
            },
            onMiss: () => {
                // Called when the ray misses (no target found)
                console.log('Ray missed - no obstacle detected');
            },
        }
    );
}
```

---

## Core Concepts

- **State Tracking** – The class maintains per-player state to track active rays, their callbacks, and pending misses.
- **Geometric Attribution** – Hits are attributed to rays using distance calculations to find the best-fitting ray: the
  class searches through all active (non-stale) rays and selects the one where the distance from ray start to hit point
  plus the distance from hit point to ray end most closely matches the total ray length.
- **Pending Misses** – The native API doesn't provide enough information to attribute misses to specific rays, so misses
  are stored as "pending" and resolved when the number of pending misses equals the number of active rays (at which
  point all remaining rays are considered misses).
- **Time-to-Live (TTL)** – Each ray has a timestamp and expires after 2 seconds (default). Expired (stale) rays are
  skipped during hit attribution and trigger their miss callbacks and are cleaned up automatically.
- **Automatic Pruning** – The class automatically prunes expired rays every 5 seconds to prevent memory leaks. You can
  also manually call `pruneAllStates()` when players leave.

---

## API Reference

### `class Raycast`

All methods are static. The class does not need to be instantiated.

#### Static Methods

| Method                                                                                                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cast(player: mod.Player, start: mod.Vector \| Raycast.Vector3, end: mod.Vector \| Raycast.Vector3, callbacks: Raycast.Callbacks): void` | Casts a ray from `start` to `end` for the given `player`. The `callbacks` object (of type `Raycast.Callbacks<T>`) must contain at least one of `onHit` or `onMiss`. The type of `start` and `end` (either `mod.Vector` or `Raycast.Vector3`) determines the generic type `T`, which in turn determines the type of `hitPoint` and `hitNormal` in the `onHit` callback. The ray is tracked internally and automatically cleaned up after the TTL expires. |
| `handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void`                                              | Handles a ray hit event from `mod.OnRayCastHit`. Should be called in your `OnRayCastHit()` event handler. Matches the hit to the best-fitting ray using geometric calculations (skipping stale rays) and invokes the corresponding `onHit` callback.                                                                                                                                                                                                     |
| `handleMiss(eventPlayer: mod.Player): void`                                                                                              | Handles a ray miss event from `mod.OnRayCastMissed`. Should be called in your `OnRayCastMissed()` event handler. Stores the miss as pending and resolves it when the number of pending misses equals the number of active rays.                                                                                                                                                                                                                          |
| `pruneAllStates(): void`                                                                                                                 | Manually prunes all expired rays and removes empty player states. Ideally called in `OnPlayerLeaveGame()` to clean up memory, but automatic pruning runs every 5 seconds.                                                                                                                                                                                                                                                                                |

---

## Usage Patterns

- **Obstacle Detection** – Cast rays from players to detect walls, terrain, or other obstacles ahead of them.
- **Line of Sight Checks** – Verify if a player has line of sight to another player or target.
- **Weapon Targeting** – Use raycasts to determine where a weapon shot would hit before actually firing.
- **Spawn Point Validation** – Check if a potential spawn location is clear of obstacles before spawning a player.
- **Interactive Objects** – Detect what objects a player is looking at or pointing at for interaction systems.

### Example: Line of Sight Check

Note: This example is not technically a sufficient LOS check implementation as it does not correctly use the player's
eye position, nor does it take into account if the target is without a cone of view of the player's eye direction.

```ts
import { Raycast } from 'bf6-portal-utils/raycast';

function checkLineOfSight(player: mod.Player, target: mod.Player): Promise<boolean> {
    return new Promise((resolve) => {
        const playerPos = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
        const targetPos = mod.GetSoldierState(target, mod.SoldierStateVector.GetPosition);

        Raycast.cast(player, playerPos, targetPos, {
            onHit: (hitPoint) => {
                // Ray hit something - check if it's the target (within 1 meter)
                // Since we passed mod.Vector for start/end, hitPoint is also mod.Vector
                const dx = mod.XComponentOf(hitPoint) - mod.XComponentOf(targetPos);
                const dy = mod.YComponentOf(hitPoint) - mod.YComponentOf(targetPos);
                const dz = mod.ZComponentOf(hitPoint) - mod.ZComponentOf(targetPos);
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // If hit point is close to target, we have line of sight
                resolve(distance < 1.0);
            },
            onMiss: () => {
                // Ray missed - no line of sight (obstacle or ray expired)
                resolve(false);
            },
        });
    });
}
```

### Example: Optional Player Cleanup

```ts
import { Raycast } from 'bf6-portal-utils/raycast';

export function OnPlayerLeaveGame(eventNumber: number): void {
    // Clean up expired rays for all players.
    // (Note: This is optional since automatic pruning runs every 5 seconds)
    Raycast.pruneAllStates();
}
```

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OnRayCastHit()`** – Call `Raycast.handleHit(eventPlayer, eventPoint, eventNormal)` to forward hit events.
2. **`OnRayCastMissed()`** – Call `Raycast.handleMiss(eventPlayer)` to forward miss events.

### Lifecycle Flow

1. Call `Raycast.cast()` with a player, start/end positions (either `mod.Vector` or `Raycast.Vector3`), and a callbacks
   object (at least one of `onHit` or `onMiss` must be provided).
2. The class stores the ray internally and calls the native `mod.RayCast()` function.
3. When the native `OnRayCastHit()` event fires, call `Raycast.handleHit()`.
4. The class matches the hit to the best-fitting ray using geometric distance calculations (skipping stale rays).
5. If a match is found, the `onHit` callback is invoked with the hit point and surface normal (the type matches the type
   of `start` and `end`).
6. If the native `OnRayCastMissed()` event fires, call `Raycast.handleMiss()`.
7. The class stores the miss as pending and resolves it when possible.
8. Expired rays (older than 2 seconds) automatically trigger their `onMiss` callbacks and are cleaned up.
9. Automatic pruning runs every 5 seconds to clean up expired rays and empty player states.

---

## How It Works

The `Raycast` class uses geometric distance calculations and a sophisticated state management system to attribute hits
and misses to the correct rays:

1. **Ray Storage** – When `cast()` is called, the ray's start/end positions, callbacks, and timestamp are stored in a
   per-player `Map`. Each ray is assigned a unique ID.

2. **Hit Attribution** – When `handleHit()` is called:
    - The class searches through all active rays for the player, skipping rays that are stale (expired due to TTL).
    - For each non-stale ray, it calculates: `distance(ray.start, hitPoint) + distance(hitPoint, ray.end)`
    - The error for each ray is computed as `|(d1 + d2) - ray.totalDistance|`, and the ray with the lowest error (within
      the 0.5m sanity cap) is selected as the best match.
    - The `onHit` callback is invoked for the best-matching ray, and the ray is removed from the active set.
    - The pending misses resolution is checked to see if any remaining rays should be considered misses.

3. **Miss Attribution** – The native API doesn't provide enough information to attribute misses to specific rays, so the
   class uses a counting system:
    - Each miss increments a `pendingMisses` counter for the player.
    - When `pendingMisses >= activeRays.size`, all remaining rays are considered misses.
    - Their `onMiss` callbacks are invoked, and the state is cleared.

4. **TTL System** – Each ray has a timestamp. Rays older than 2 seconds (default) are considered expired (stale):
    - Stale rays are skipped during hit attribution (they are not considered as potential matches).
    - Expired rays trigger their `onMiss` callbacks.
    - They are removed from the active set during pruning operations.
    - Lazy pruning runs before adding new rays to keep the active set clean.

5. **Automatic Pruning** – A static initializer sets up a timer that calls `pruneAllStates()` every 5 seconds:
    - Expired rays are removed from each player's state.
    - Player states with no active rays and no pending misses are deleted entirely.
    - This prevents unbounded memory growth in long-running sessions.

---

## Known Limitations & Caveats

- **Multiple Simultaneous Rays** – The class can handle multiple rays from the same player, but if many rays are cast in
  quick succession, the geometric attribution algorithm may become less efficient. In practice, this is rarely an issue
  since the linear scan is very fast for small ray counts.

- **Miss Attribution Ambiguity** – The native API doesn't distinguish which specific ray missed, so the class uses a
  counting heuristic. In rare cases with many simultaneous rays, misses may be attributed slightly later than ideal, but
  they will always be correctly resolved.

- **TTL Precision** – Expired rays trigger their miss callbacks after the TTL expires, not at the exact expiration time.
  The actual cleanup happens during pruning operations (every 5 seconds) or lazy pruning (before adding new rays).

- **Callback Errors** – Callback errors are silently caught and ignored to prevent one failing callback from breaking
  the entire raycast system. If you need error handling, implement it inside your callbacks.

- **Player State Cleanup** – While automatic pruning runs every 5 seconds, it's good practice to call `pruneAllStates()`
  in `OnPlayerLeaveGame()` to immediately clean up state for disconnected players.

- **Distance Epsilon** – The hit attribution uses a 0.5m (`_DISTANCE_EPSILON`) sanity cap for distance comparisons. The
  algorithm finds the best-fitting ray (lowest error) among all candidates, and only considers rays where the error is
  within this tolerance. This acts as a sanity check to prevent misattribution rather than a strict matching threshold.

---

## Configuration & Defaults

The following static readonly properties control raycast behavior. While these are marked as `readonly`, they can be
modified in the source code as needed for your use case.

| Property             | Type     | Default | Description                                                                                                                                                                                  |
| -------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_DISTANCE_EPSILON`  | `number` | `0.5`   | Distance tolerance in meters (50cm) acting as a sanity cap for hit attribution. The algorithm finds the best-fitting ray (lowest error) and only considers candidates within this tolerance. |
| `_DEFAULT_TTL_MS`    | `number` | `2_000` | Time-to-live in milliseconds (2 seconds) for rays. Rays older than this are considered expired (stale) and are skipped during hit attribution, then trigger their miss callbacks.            |
| `_PRUNE_INTERVAL_MS` | `number` | `5_000` | Interval in milliseconds (5 seconds) between automatic pruning operations that clean up expired rays and empty player states.                                                                |

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
type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => void;
```

The `hitPoint` parameter is the 3D position where the ray hit, and `hitNormal` is the surface normal at the hit point.
The type `T` matches the type of `start` and `end` passed to `cast()`—if you pass `mod.Vector`, the callbacks receive
`mod.Vector`; if you pass `Raycast.Vector3`, they receive `Raycast.Vector3`.

### `Raycast.MissCallback`

Callback function type for ray misses:

```ts
type MissCallback = () => void;
```

Called when a ray misses (no target found) or expires due to TTL.

### `Raycast.Callbacks`

Callback object type for the `cast()` method. At least one of `onHit` or `onMiss` must be provided:

```ts
type Callbacks<T extends mod.Vector | Vector3> =
    | { onHit: HitCallback<T>; onMiss?: MissCallback }
    | { onHit?: HitCallback<T>; onMiss: MissCallback };
```

This union type ensures type safety: you must provide at least one callback, but both are optional individually. The
generic type `T` matches the type of `start` and `end` passed to `cast()`.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.
- [`timers/README.md`](../timers/README.md) – Documentation for the Timers module used internally for automatic pruning.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are
welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases
help shape the roadmap (configurable TTL per ray, additional callback options, performance optimizations, etc.), so
please share your experiences.

---
