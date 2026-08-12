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
        {
            onHit: async (hitPoint, normal) => {
                console.log(`Ray hit at <${hitPoint.x}, ${hitPoint.y}, ${hitPoint.z}>`);
                console.log(`Surface normal: <${normal.x}, ${normal.y}, ${normal.z}>`);
            },
            onMiss: () => {
                console.log('Ray missed - no obstacle detected');
            },
        }
    );
});
```

</ai>

---

## Core Concepts

- **Automatic Event Wiring** – The namespace subscribes to `Events.OngoingGlobal`, `Events.OnRayCastHit`, `Events.OnRayCastMissed`, `Events.OnPlayerJoinGame`, and `Events.OnPlayerLeaveGame` at load time. You must not implement or export any native event handlers; use the Events module for your own subscriptions.
- **Worker Slot Architecture & Throughput Scaling** – Battlefield Portal allows at most 1 raycast per tick per valid player via `mod.RayCast(player, start, end)` and 1 raycast per tick globally via `mod.RayCast(start, end)`. The module leverages all connected players plus the global slot as asynchronous worker pipelines, automatically maximizing throughput up to **$P + 1$ rays per tick** (where $P$ is the number of connected players, up to 100).
- **Deterministic $O(1)$ Attribution** – Because each worker slot (player $0..99$ or global) has at most one ray in flight at any moment, incoming `OnRayCastHit` and `OnRayCastMissed` events are directly and deterministically mapped to the initiating ray without geometric distance heuristics or fuzzy matching.
- **Zero-Allocation Ring Buffer Queue** – Queued ray requests are stored in a pre-allocated Structure-of-Arrays (SoA) circular ring buffer (`Int32Array` fixed-point, `Uint8Array`, reference arrays, capacity of 512). Enqueuing and dequeuing rays generates **0 bytes of GC garbage** during steady-state gameplay.
- **Fail-Safe Dispatch & Zero-Loss Recovery** – Requests are peeked from the queue and only popped after native dispatch succeeds. If an engine dispatch error occurs (e.g. an invalid player handle upon disconnect), the slot is cleared and the ray remains at the head of the queue to be dispatched by the next available worker slot.
- **Strict Capacity & Error Handling** – If the queue buffer reaches capacity (512 rays), `cast()` logs an error and returns early (no-op) instead of falsely triggering `onMiss` or throwing an unhandled exception, preventing incorrect gameplay outcomes and ensuring backpressure is logged.
- **Safety Watchdog & Timeout** – A 2-second watchdog automatically recovers any worker slots if the physics engine drops or delays an event, resolving stuck rays with `onMiss` and preventing slot starvation.
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

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Configures logging for the Raycast module. Callback errors (sync and async) are caught and logged via `CallbackHandler`. Pass `undefined` (or `null`) for `log` to disable logging. |
| `cast(start: Vector3, end: Vector3, callbacks: Callbacks<Vector3>): void` | Enqueues a raycast from `start` to `end` using `Vector3` coordinates. Callbacks receive `Vector3` hit and normal vectors. Returns early (no-op) if neither callback is provided or if the queue is full (capacity: 512). |
| `cast(start: mod.Vector, end: mod.Vector, callbacks: Callbacks<mod.Vector>): void` | Enqueues a raycast from `start` to `end` using native `mod.Vector` coordinates. Callbacks receive `mod.Vector` hit and normal vectors. Returns early (no-op) if neither callback is provided or if the queue is full (capacity: 512). |
| `getPendingRayCount(): number` | Returns the number of currently queued raycast requests waiting for an available worker slot. |
| `getInFlightRayCount(): number` | Returns the number of currently dispatched raycasts awaiting physics engine resolution. |

---

## Types & Interfaces

### `Raycast.Vector3`

```ts
interface Vector3 {
    x: number;
    y: number;
    z: number;
}
```

### `Raycast.HitCallback`

```ts
type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => Promise<void> | void;
```

The callback vector types match the `start` and `end` vector types passed to `cast()`.

### `Raycast.MissCallback`

```ts
type MissCallback = () => Promise<void> | void;
```

Invoked when a ray does not intersect any geometry or times out via the safety watchdog.

### `Raycast.Callbacks`

```ts
type Callbacks<T extends mod.Vector | Vector3> =
    | { onHit: HitCallback<T>; onMiss?: MissCallback }
    | { onHit?: HitCallback<T>; onMiss: MissCallback };
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
