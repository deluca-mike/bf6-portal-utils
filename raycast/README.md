# Raycast Module

<ai>

This TypeScript `Raycast` namespace provides high-throughput, zero-allocation asynchronous raycasting for Battlefield Portal experiences. It manages engine constraints by automatically queueing requests and dispatching them across all available worker slots each tick (1 ray per connected player + 1 player-less global ray per tick), providing deterministic $O(1)$ hit and miss attribution without fuzzy geometric heuristics.

The namespace subscribes to `Events.OngoingGlobal`, `Events.OnRayCastHit`, `Events.OnRayCastMissed`, `Events.OnPlayerJoinGame`, and `Events.OnPlayerLeaveGame` at load time—no manual event wiring is required. You simply pass start/end coordinates and callbacks (`onHit`, `onMiss`) to `Raycast.cast()`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Raycast } from 'bf6-portal-utils/raycast';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Call `Raycast.cast()` with start/end positions (either `mod.Vector` or `Raycast.Vector3`) and a callbacks object (providing `onHit` and/or `onMiss`).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

<ai>

### Example

```ts
import { Raycast } from 'bf6-portal-utils/raycast';
import { Events } from 'bf6-portal-utils/events';

// Optional: Configure logging for raycast callback error monitoring
Raycast.setLogging((text) => console.log(text), Raycast.LogLevel.Error);

Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    const playerPosition = mod.GetObjectPosition(player);
    const forwardDirection = mod.GetSoldierState(player, mod.SoldierStateVector.GetDirection);
    const rayEnd = mod.VectorAdd(playerPosition, mod.VectorScale(forwardDirection, 100));

    // Cast a ray from the player's position forward to detect obstacles
    Raycast.cast(
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
        (hit, hitPoint, normal) => {
            if (hit && hitPoint && normal) {
                console.log(`Ray hit at <${hitPoint.x}, ${hitPoint.y}, ${hitPoint.z}>`);
                console.log(`Surface normal: <${normal.x}, ${normal.y}, ${normal.z}>`);
            } else {
                console.log('Ray missed - no obstacle detected');
            }
        },
        { priority: Raycast.Priority.Standard, maxAgeTicks: 5 }
    );
});
```

</ai>

---

## Core Concepts

- **Automatic Event Wiring** – The namespace subscribes to `Events.OngoingGlobal`, `Events.OnRayCastHit`, `Events.OnRayCastMissed`, `Events.OnPlayerJoinGame`, and `Events.OnPlayerLeaveGame` at load time. You must not implement or export any native event handlers; use the Events module for your own subscriptions.
- **Worker Slot Architecture & Throughput Scaling** – Battlefield Portal allows at most 1 raycast per tick per valid player via `mod.RayCast(player, start, end)` and 1 raycast per tick globally via `mod.RayCast(start, end)`. The module leverages all connected players plus the global slot as asynchronous worker pipelines, automatically maximizing throughput up to **$P + 1$ rays per tick** (where $P$ is the number of connected players, up to 100).
- **Deterministic $O(1)$ Attribution** – Because each worker slot (player $0..99$ or global) has at most one ray in flight at any moment, incoming `OnRayCastHit` and `OnRayCastMissed` events are directly and deterministically mapped to the initiating ray without geometric distance heuristics or fuzzy matching.
- **Zero-Allocation Ring Buffer Queue** – Queued ray requests are stored in a pre-allocated Structure-of-Arrays (SoA) circular ring buffer (`Float32Array` coordinates in world meters, `Uint8Array` flags, reference arrays, capacity of 512). Enqueuing and dequeuing rays generates **0 bytes of GC garbage** and eliminates coordinate conversion arithmetic during steady-state gameplay.
- **In-Place Updates & Request Deadlines** – Pending rays can be modified in-place via `Raycast.update()` to preserve their position in the queue, and can specify `maxAgeTicks` or `timeoutMs` to automatically drop stale queries without wasting engine execution slots. Expired queries are pruned silently without native dispatch or false miss callbacks.
- **Raycast Lifecycle Queries** – `Raycast.isActive(id)` allows systems to verify in $O(1)$ time whether a raycast is currently enqueued or in flight, returning `false` as soon as it completes, cancels, or expires.
- **Fail-Safe Dispatch & Zero-Loss Recovery** – Requests are peeked from the queue and only popped after native dispatch succeeds. If an engine dispatch error occurs (e.g. an invalid player handle upon disconnect), the slot is cleared and the ray remains at the head of the queue to be dispatched by the next available worker slot.
- **Strict Capacity & Error Handling** – If the queue buffer reaches capacity (512 rays), `cast()` logs an error and returns `null` instead of throwing an unhandled exception.
- **Safety Watchdog & Timeout** – A 2-second watchdog automatically recovers any worker slots if the physics engine drops or delays an event, resolving stuck rays with `hit = false` and preventing slot starvation.
- **Configurable Error Logging** – Callback errors (sync and async) and native dispatch failures are caught and logged via `CallbackHandler` and `Logging` without breaking the raycast dispatch loop.

---

## API Reference

### `namespace Raycast`

#### `Raycast.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity:

- `Debug` (0) – Debug-level messages.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages (default minimum level).
- `Error` (3) – Error messages. Includes callback errors (sync and async) and dispatch failures.

#### `Raycast.Priority`

An enum for controlling raycast scheduling priority:

- `Critical` (0) – Immediate player actions (weapon hitscans, grapple hooks, instant melee). Preempts all other queues.
- `Physics` (1) – Time-sensitive simulation: dynamic physics collision sweeps, terrain probes, anti-tunneling.
- `Standard` (2) – Default. General gameplay scripts, placement previews, custom trigger logic, line-of-sight.
- `Ambient` (3) – Low-urgency background tasks: distant AI perception, audio occlusion probes, cosmetic FX.

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string, error?: unknown) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Configures logging for the Raycast module. Callback errors (sync and async) are caught and logged via `CallbackHandler`. Pass `undefined` (or `null`) for `log` to disable logging. |
| `cast(start: Vector3, end: Vector3, callback: RaycastCallback, options?: CastOptions): RaycastID \| null` | Enqueues a raycast from `start` to `end` using `Vector3` coordinates with optional priority or deadline options. Returns a generation-encoded `RaycastID`, or `null` if rejected. |
| `isActive(id: RaycastID): boolean` | Checks in $O(1)$ whether a raycast is currently active (waiting in queue or in-flight). Returns `false` if completed, canceled, expired, or invalid. |
| `update(id: RaycastID, start: Vector3, end: Vector3, options?: CastOptions): boolean` | Updates coordinates and optional deadlines of an enqueued ray in-place, preserving queue position. Returns `true` if updated in queue, `false` if invalid or already in flight. |
| `cancel(id: RaycastID): boolean` | Cancels an enqueued or in-flight raycast request. Drops queued rays to skip engine dispatch, or suppresses callbacks for rays already dispatched to the physics engine. Returns `true` if canceled, `false` if invalid or already completed. |
| `getPendingRayCount(priority?: Priority): number` | Returns the number of currently queued raycast requests waiting for an available worker slot (for a specific priority level or total). |
| `getInFlightRayCount(): number` | Returns the number of currently dispatched raycasts awaiting physics engine resolution. |

---

## Types & Interfaces

### `Raycast.RaycastCallback`

```ts
type RaycastCallback = (hit: boolean, hitPoint?: Vector3, hitNormal?: Vector3) => Promise<void> | void;
```

Invoked upon ray intersection, miss, or watchdog timeout.

### `Raycast.CastOptions`

```ts
interface CastOptions {
    priority?: Priority;
    maxAgeTicks?: number;
    timeoutMs?: number;
}
```

### `Raycast.RaycastID`

```ts
type RaycastID = number & { readonly __brand: 'RaycastID' };
```

A unique generation-encoded integer identifier for tracking, updating, and canceling enqueued or in-flight raycast requests.

### `Raycast.Priority`

```ts
const enum Priority {
    Critical = 0,
    Physics = 1,
    Standard = 2,
    Ambient = 3,
}
```

### `Raycast.Vector3`

```ts
interface Vector3 {
    x: number;
    y: number;
    z: number;
}
```

---

## Event Wiring & Lifecycle

1. Import `Raycast` and `Events`; subscribe to game events only via `Events`.
2. When `Raycast.cast()` is called, coordinates and callbacks are validated and written into the zero-allocation circular queue.
3. Every tick (`Events.OngoingGlobal`):
    - The safety watchdog checks for in-flight rays older than 2 seconds.
    - If the global slot is idle, 1 queued ray is peeked and dispatched via `mod.RayCast(start, end)`. Upon dispatch success, the ray is popped from the queue.
    - For each active connected player, if their worker slot is idle, 1 queued ray is peeked and dispatched via `mod.RayCast(player, start, end)`. If dispatch throws, the slot is marked disconnected, the ray remains in the queue, and the loop retries with subsequent worker slots.
4. When `Events.OnRayCastHit` or `Events.OnRayCastMissed` triggers:
    - The worker slot is resolved ($O(1)$ by player ID or global index).
    - The associated callback (`onHit` or `onMiss`) is invoked safely via `CallbackHandler`.
    - The worker slot is freed, becoming available for the next tick's queue drain.
