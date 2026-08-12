# Player Locations Module

<ai>

`PlayerLocations` is a high-performance, **Zero-Garbage-Collection (Zero-GC)** TypeScript spatial query engine built specifically for Battlefield 6 Portal experiences running an embedded QuickJS engine on a C++ server backend.

In Battlefield 6 Portal, querying player coordinates via engine Foreign Function Interface (FFI) calls (such as `mod.GetSoldierState`) in hot gameplay loops introduces noticeable C++ FFI overhead and garbage collection pressure. `PlayerLocations` eliminates this bottleneck by querying player positions once per tick (`OngoingGlobal`), transforming world coordinates into scaled integer representations inside cache-dense contiguous Typed Arrays, and providing a comprehensive suite of spatial, proximity, directional, and nearest-neighbor queries entirely within local JavaScript memory.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { PlayerLocations } from 'bf6-portal-utils/player-locations';
    import { Vectors } from 'bf6-portal-utils/vectors';
    ```
3. Use any spatial query function anywhere in your game mode logic. Player positions, connection states, and spatial structures update automatically every tick.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';
import { Events } from 'bf6-portal-utils/events';

// Example: 2.5D Capture Zone Check (Radius: 15m, Y bounds: 10m to 30m)
const CAPTURE_ZONE = {
    x: 100.0,
    z: -250.0,
    radius: 15.0,
    minY: 10.0,
    maxY: 30.0,
};

Events.OngoingGlobal.subscribe(() => {
    // Zero-GC query: returns pre-allocated internal array buffer of player IDs
    const playersInZone = PlayerLocations.getPlayersInCylinder(
        CAPTURE_ZONE.x,
        CAPTURE_ZONE.z,
        CAPTURE_ZONE.radius,
        CAPTURE_ZONE.minY,
        CAPTURE_ZONE.maxY
    );

    if (playersInZone.length > 0) {
        // Find closest active player to the center of the objective
        const closestId = PlayerLocations.getClosestPlayer(CAPTURE_ZONE.x, 20.0, CAPTURE_ZONE.z);
        // ... execute objective scoring or UI updates ...
    }
});
```

</ai>

---

## Architecture & Core Algorithms

The engine is engineered around cache-friendly memory layouts and algorithmic pruning to maximize QuickJS execution throughput:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │          Engine Tick (OngoingGlobal / 30Hz)             │
                  └──────────────────────────┬──────────────────────────────┘
                                             │
                       ┌─────────────────────┴──────────────────────┐
                       │ Samples Connected Players via FFI Once     │
                       │ Scales World Meters -> Millimeter Integers │
                       └─────────────────────┬──────────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
  ┌────────────────────────┐     ┌───────────────────────┐      ┌─────────────────────────┐
  │  Struct of Arrays      │     │  Linked Voxel Grid    │      │  Sorted Axis Arrays     │
  │  (posX, posY, posZ)    │     │  (512-Bucket Hash)    │      │  (Sweep-and-Prune)      │
  ├────────────────────────┤     ├───────────────────────┤      ├─────────────────────────┤
  │ • O(1) Pos by ID       │     │ • 25m 3D Voxels       │      │ • Incremental Sort      │
  │ • L1/L2 Cache Locality │     │ • O(cells) Sphere     │      │ • O(log N) AABB Pruning │
  │ • Integer Scaling      │     │ • Visit Stamping      │      │ • O(1) Altitude Extrema │
  └────────────────────────┘     └───────────────────────┘      └─────────────────────────┘
```

### 1. Struct of Arrays (SoA) Contiguous Buffers

Instead of an Array of Objects (`Array<{ x, y, z }>` which incurs GC pointer chasing and fragmented memory), `PlayerLocations` stores coordinates in parallel, contiguous Typed Arrays:

- `posX: Int32Array(100)`
- `posY: Int32Array(100)`
- `posZ: Int32Array(100)`
- `stateFlags: Uint8Array(100)`

**Key Benefits:**

- **$O(1)$ Direct Lookup**: Coordinates for player slot `id` are indexed directly via `posX[id]`, `posY[id]`, `posZ[id]`.
- **Cache-Dense Sequential Access**: 1-to-all distance sweeps scan contiguous 32-bit integers, keeping memory lines hot in CPU L1/L2 cache.
- **Millimeter Integer Scaling ($1000\times$)**: World coordinates (meters) are scaled by $1000$ to integers, eliminating floating-point rounding divergence and enabling bitwise integer math.

---

### 2. Zero-GC Linked-List Spatial Voxel Grid

To perform fast volumetric proximity queries without testing all 100 players, the 3D world is partitioned into a uniform $25\text{m}$ ($25,000\text{mm}$) voxel grid backed by a fixed-size flat array linked list:

- `gridHead: Int8Array(512)` (stores the head player ID for each of the 512 hash buckets, or `-1` if empty)
- `nextPlayer: Int8Array(100)` (stores the next player ID in the linked list chain)

$$\text{hash}(g_x, g_y, g_z) = \left((g_x \times 73856093) \oplus (g_y \times 19349663) \oplus (g_z \times 83492791)\right) \mathbin{\&} 511$$

**Key Benefits:**

- **Zero Allocations**: Inserting and clearing voxels requires only `gridHead.fill(-1)` and flat array writes—no object allocations, nodes, or dynamic collections.
- **$O(\text{cells})$ Sphere Queries**: `getPlayersInSphere` evaluates only the voxel buckets intersecting the bounding box of the sphere.
- **Visit Stamping (`queryVisited` + `queryToken`)**: In the event that distinct voxel coordinates map to the same hash bucket, a monotonically increasing `queryToken` stamped in `queryVisited: Uint32Array(100)` guarantees each candidate player is evaluated and added at most once per query with 0 array allocations.

---

### 3. Three Sorted Axis Arrays (Sweep-and-Prune)

The engine maintains three player-ID index arrays sorted along each respective coordinate axis:

- `sortedX: Uint8Array(100)`
- `sortedY: Uint8Array(100)`
- `sortedZ: Uint8Array(100)`

Every tick, these arrays are updated via **Insertion Sort**. Because players move continuous distances frame-to-frame, the arrays exhibit near-perfect temporal coherence, completing insertion sort in near $O(N)$ time.

**Key Benefits:**

- **Dynamic Axis Selection for 3D AABBs**: `getPlayersInAABB` performs binary searches (`_findLowerBound`, `_findUpperBound`) across $X$, $Y$, and $Z$ axes simultaneously, determines which axis contains the fewest candidate players, and iterates _only_ along that narrowest candidate slice. This prunes 90%+ of off-axis players immediately.
- **$O(1)$ Altitude Extrema**: `getHighestPlayer`, `getLowestPlayer`, `getKHighestPlayers`, and `getKLowestPlayers` read directly from the endpoints of `sortedY` without computing distances or scanning the whole player set.
- **Fast Directional Queries**: `getPlayersAbove`, `getPlayersBelow`, `getPlayersEastOf`, `getPlayersWestOf`, `getPlayersNorthOf`, and `getPlayersSouthOf` execute in $O(\log N + K)$ time via binary search.

---

### 4. Bounded Binary Heaps for $K$-Nearest / $K$-Farthest

For top-$K$ queries (`getKClosestPlayers` and `getKFarthestPlayers`), the engine maintains in-place binary heap structures (`heapDist: Float64Array(100)`, `heapId: Uint8Array(100)`).

- `getKClosestPlayers` maintains a **Max-Heap** bounded to capacity $K$.
- `getKFarthestPlayers` maintains a **Min-Heap** bounded to capacity $K$.
- Executes in $O(N \log K)$ time with **0 heap allocations**.

---

### 5. Reactive Spatial Event Subscriptions (Zero-GC Bitmask Diffing)

`PlayerLocations` provides high-level reactive event subscriptions (`onSphereEnter`, `onCylinderEnter`, `onAABBEnter`, `onCrossAbove`, `onHighestPlayerChanged`, etc.) that allow mod developers to respond instantly to spatial transitions without polling queries inside per-tick game loops.

```mermaid
flowchart TD
    Tick["Engine Tick (OngoingGlobal / 30Hz)"] --> Update["Update SoA Buffers, Voxel Grid, & Sorted Axes"]
    Update --> Eval["Evaluate Active Reactive Subscriptions"]

    Eval --> Zones["Iterate Spatial Zone Listeners"]
    Eval --> Extrema["Check Extrema Listeners"]

    Zones --> Mask["Bitwise Presence Diff (prevMask vs currMask)"]
    Mask -->|~prev & curr| Enter["Dispatch onEnter(playerId)"]
    Mask -->|prev & ~curr| Exit["Dispatch onExit(playerId)"]

    Extrema -->|currId !== lastId| Changed["Dispatch onExtremaChanged(newId, prevId)"]
```

**Key Architectural Properties:**

- **128-Bit Presence Bitmasks**: Each active spatial zone listener maintains 4 compact 32-bit integers (`mask0..mask3`), tracking the presence of all 100 player slots in just **16 bytes** of raw bitmask data.
- **Zero-Allocation Execution**: Transition evaluations perform bitwise operations (`&`, `|`, `^`, `~`) in CPU registers. Primitive integer player IDs are dispatched directly to callbacks through `CallbackHandler.invoke` with **0 heap allocations per tick**.
- **Automatic Disconnect/Death Clean-up**: If a player disconnects or dies while inside a zone, the engine immediately dispatches `onExit(id)` and clears their presence bit, preventing stale exit triggers.

---

## Memory Footprint & QuickJS Performance

Under maximum load (100 connected and active players), `PlayerLocations` maintains a constant, deterministic memory footprint:

### 1. Pre-Allocated Contiguous Typed Arrays

| Buffer | Type & Elements | Purpose | Raw Data Size |
| :-- | :-- | :-- | :-- |
| **`posX`** | `Int32Array(100)` | Scaled $X$ coordinates (mm) | **400 Bytes** |
| **`posY`** | `Int32Array(100)` | Scaled $Y$ coordinates (mm) | **400 Bytes** |
| **`posZ`** | `Int32Array(100)` | Scaled $Z$ coordinates (mm) | **400 Bytes** |
| **`stateFlags`** | `Uint8Array(100)` | Connected & Active bit flags | **100 Bytes** |
| **`gridHead`** | `Int8Array(512)` | Spatial grid hash table head pointers | **512 Bytes** |
| **`nextPlayer`** | `Int8Array(100)` | Spatial grid linked-list node pointers | **100 Bytes** |
| **`sortedX`** | `Uint8Array(100)` | $X$-axis sorted player ID indices | **100 Bytes** |
| **`sortedY`** | `Uint8Array(100)` | $Y$-axis sorted player ID indices | **100 Bytes** |
| **`sortedZ`** | `Uint8Array(100)` | $Z$-axis sorted player ID indices | **100 Bytes** |
| **`queryVisited`** | `Uint32Array(100)` | Query token visit stamping timestamps | **400 Bytes** |
| **`heapDist`** | `Float64Array(100)` | Exact $m^2$ distances for priority queues | **800 Bytes** |
| **`heapId`** | `Uint8Array(100)` | Player ID indices for priority queues | **100 Bytes** |
| **Subtotal (Raw Contiguous Data)** |  |  | **3,512 Bytes (~3.4 KB)** |

### 2. QuickJS Runtime Overhead (64-Bit Architecture)

| Component | QuickJS Internal Structure | Memory Size |
| :-- | :-- | :-- |
| **12 TypedArray & ArrayBuffer wrappers** | `JSObject` + `JSArrayBuffer` headers (~160 B each) | **~1,920 Bytes** |
| **`queryResultBuffer` (`number[]`)** | Fast Array object + backing store for 100 `JSValue` elements | **~1,664 Bytes** |
| **`_scratchPos` (`Vector3`)** | Object header + 3 properties (`x`, `y`, `z`) | **~96 Bytes** |
| **5 Monomorphic Listener Arrays** | Fast Array objects for sphere, cylinder, aabb, plane & extrema | **~320 Bytes** |
| **Function Closures & Module Scope** | `JSFunctionBytecode` & namespace property table | **~2,500 Bytes** |
| **Subtotal (QuickJS Runtime Wrappers)** |  | **~6,500 Bytes (~6.3 KB)** |
| **Active Spatial Subscription (per zone)** | Listener (geom + 128-bit mask ~220 B) + Handle (`unsubscribe`, `update` ~160 B) | **~370–400 Bytes / active subscription** |

### 3. Total Memory & Zero-GC Guarantees

$$\text{Total Base Memory Footprint} \approx \mathbf{10.0\text{ KB}}$$

- **Per-Tick Heap Allocation Rate**: **0 Bytes / tick** (steady-state game ticks)
- **Per-Query Heap Allocation Rate**: **0 Bytes / query** (when using default `queryResultBuffer` or scalar returns)
- **Dynamic Zone Update Allocation Rate**: **0 Bytes / update** (in-place integer coordinate mutation)
- **Garbage Collector Pause Time**: **0.00 ms**

### 4. Execution Benchmarks & Allocation Rates

| Operation | Time Complexity | Typical CPU Time (QuickJS) | Allocation Rate (Bytes/Tick) | GC Pause |
| :-- | :-- | :-- | :-- | :-- |
| **`onGameTick` Update Cycle** | $O(N)$ near-linear | **~35–60 $\mu\text{s}$** (for 100 players) | **0 Bytes** | **0.00 ms** |
| **`getPosition`** (with `out`) | $O(1)$ | **~0.2 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getDistanceSq` / `XZ`** | $O(1)$ | **~0.3 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getPlayersInSphere`** | $O(\text{cells})$ | **~4–12 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getPlayersInCylinder`** | $O(\log N + K)$ | **~3–8 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getPlayersInAABB`** | $O(\log N + K)$ | **~4–10 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getPlayersAbove` / `Below`** | $O(\log N + K)$ | **~2–5 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getHighest` / `LowestPlayer`** | $O(1)$ | **~0.1 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getKClosestPlayers`** (top-$K$) | $O(N \log K)$ | **~15–30 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **`getKFarthestPlayers`** (top-$K$) | $O(N \log K)$ | **~15–30 $\mu\text{s}$** | **0 Bytes** | **0.00 ms** |
| **Spatial Zone Subscriptions** | $O(\text{zones} \times N)$ | **~2–6 $\mu\text{s}$** per active zone | **0 Bytes** | **0.00 ms** |

---

## API Reference

### `namespace PlayerLocations`

The namespace is not instantiated; all members are static or types. All functions accepting a player argument support either a numerical slot ID (`0..99`) or an engine `mod.Player` object.

### Exported Types

```ts
type PlayerZoneCallback = (playerId: number) => Promise<void> | void;
type PlayerExtremaCallback = (newPlayerId: number, prevPlayerId: number) => Promise<void> | void;

interface SphereHandle {
    unsubscribe(): void;
    update(x: number, y: number, z: number, radiusMeters?: number): void;
}

interface CylinderHandle {
    unsubscribe(): void;
    update(centerX: number, centerZ: number, radiusMeters?: number, minY?: number, maxY?: number): void;
}

interface AABBHandle {
    unsubscribe(): void;
    update(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void;
}

interface PlaneHandle {
    unsubscribe(): void;
    update(threshold: number): void;
}

interface ExtremaHandle {
    unsubscribe(): void;
}

interface TargetExtremaHandle extends ExtremaHandle {
    update(x: number, y: number, z: number): void;
}
```

---

#### Constants

| Constant | Type | Value | Description |
| :-- | :-- | :-- | :-- |
| `MAX_PLAYERS` | `number` | `100` | Maximum supported player slots in Battlefield 6 Portal (`0-99`). |
| `SCALE_FACTOR` | `number` | `1000` | Scale factor converting world meters to millimeter integers ($1\text{m} = 1000\text{mm}$). |

---

#### Player State Functions

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `getPosition(player: number \| mod.Player, out?: Vectors.Vector3)` | `Vectors.Vector3 \| null` | Returns world coordinates in meters for an active player. Pass `out` for zero-allocation reuse. Returns `null` if the player is unspawned/inactive. |
| `isPlayerConnected(player: number \| mod.Player)` | `boolean` | Checks if a player slot is currently connected to the server. |
| `isPlayerActive(player: number \| mod.Player)` | `boolean` | Checks if a player is active (connected, spawned, and tracked with valid 3D coordinates). |
| `getConnectedPlayerCount()` | `number` | Returns the total count of currently connected players. |
| `getActivePlayerCount()` | `number` | Returns the total count of currently active (spawned) players. |
| `getConnectedPlayers(outArray?: number[])` | `number[]` | Populates an array with all connected player IDs (Zero-GC). |
| `getActivePlayers(outArray?: number[])` | `number[]` | Populates an array with all active (spawned) player IDs (Zero-GC). |

---

#### Distance Functions

> **Note on Return Values:** Distance functions return `Infinity` if either player is invalid, dead, or disconnected. This prevents JavaScript coercion bugs (e.g. `null <= 25` evaluating to `true`) and allows safe direct usage in `Math.min()`.

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `getDistanceSq(playerA: number \| mod.Player, playerB: number \| mod.Player)` | `number` | Returns squared 3D Euclidean distance in meters squared ($m^2$) between two active players. Avoids square root overhead. |
| `getDistance(playerA: number \| mod.Player, playerB: number \| mod.Player)` | `number` | Returns 3D Euclidean distance in meters between two active players. |
| `getDistanceSqXZ(playerA: number \| mod.Player, playerB: number \| mod.Player)` | `number` | Returns squared 2D horizontal distance in $m^2$ on the XZ plane between two active players (ignores vertical elevation). |
| `getDistanceXZ(playerA: number \| mod.Player, playerB: number \| mod.Player)` | `number` | Returns 2D horizontal distance in meters on the XZ plane between two active players. |

---

#### Volumetric Proximity Queries

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `getPlayersInSphere(x: number, y: number, z: number, radiusMeters: number, outArray?: number[])` | `number[]` | Fast 3D sphere query using the 3D Linked Voxel Grid. Returns active player IDs within radius. |
| `getPlayersOutsideSphere(x: number, y: number, z: number, radiusMeters: number, outArray?: number[])` | `number[]` | Returns all active player IDs strictly outside the specified 3D sphere. |
| `getPlayersInCylinder(centerX: number, centerZ: number, radiusMeters: number, minY?: number, maxY?: number, outArray?: number[])` | `number[]` | Fast 2.5D cylinder query (horizontal XZ radius with optional vertical Y bounds). |
| `getPlayersOutsideCylinder(centerX: number, centerZ: number, radiusMeters: number, minY?: number, maxY?: number, outArray?: number[])` | `number[]` | Returns all active player IDs strictly outside the specified 2.5D cylinder. |
| `getPlayersInAABB(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, outArray?: number[])` | `number[]` | Fast 3D Axis-Aligned Bounding Box query using 3-Axis Sweep-and-Prune. |
| `getPlayersOutsideAABB(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, outArray?: number[])` | `number[]` | Returns all active player IDs strictly outside the specified 3D bounding box. |

---

#### Directional & Extremum Queries

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `getPlayersAbove(y: number, outArray?: number[])` | `number[]` | Returns all active players located at or above elevation $Y$ ($Y_{\text{player}} \ge y$). |
| `getPlayersBelow(y: number, outArray?: number[])` | `number[]` | Returns all active players located at or below elevation $Y$ ($Y_{\text{player}} \le y$). |
| `getPlayersEastOf(x: number, outArray?: number[])` | `number[]` | Returns all active players located east ($+X$) of $X$ ($X_{\text{player}} \ge x$). |
| `getPlayersWestOf(x: number, outArray?: number[])` | `number[]` | Returns all active players located west ($-X$) of $X$ ($X_{\text{player}} \le x$). |
| `getPlayersNorthOf(z: number, outArray?: number[])` | `number[]` | Returns all active players located north ($-Z$) of $Z$ ($Z_{\text{player}} \le z$). |
| `getPlayersSouthOf(z: number, outArray?: number[])` | `number[]` | Returns all active players located south ($+Z$) of $Z$ ($Z_{\text{player}} \ge z$). |
| `getClosestPlayer(x: number, y: number, z: number, filterFn?: (id: number) => boolean)` | `number` | Finds the single closest active player to target point. Returns ID, or `-1` if none found. |
| `getFarthestPlayer(x: number, y: number, z: number, filterFn?: (id: number) => boolean)` | `number` | Finds the single farthest active player from target point. Returns ID, or `-1` if none found. |
| `getHighestPlayer(filterFn?: (id: number) => boolean)` | `number` | Returns ID of the highest altitude active player ($O(1)$), or `-1` if none found. |
| `getLowestPlayer(filterFn?: (id: number) => boolean)` | `number` | Returns ID of the lowest altitude active player ($O(1)$), or `-1` if none found. |
| `getKHighestPlayers(k: number, filterFn?: (id: number) => boolean, outArray?: number[])` | `number[]` | Returns the top-$k$ highest altitude active players, sorted highest to lowest ($O(k)$). |
| `getKLowestPlayers(k: number, filterFn?: (id: number) => boolean, outArray?: number[])` | `number[]` | Returns the bottom-$k$ lowest altitude active players, sorted lowest to highest ($O(k)$). |
| `getKClosestPlayers(x: number, y: number, z: number, k: number, filterFn?: (id: number) => boolean, outArray?: number[])` | `number[]` | Returns the $k$ closest active players sorted closest-first ($O(N \log k)$ Max-Heap). |
| `getKFarthestPlayers(x: number, y: number, z: number, k: number, filterFn?: (id: number) => boolean, outArray?: number[])` | `number[]` | Returns the $k$ farthest active players sorted farthest-first ($O(N \log k)$ Min-Heap). |

---

#### Containment Check Functions

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `isPlayerInCylinder(player: number \| mod.Player, centerX: number, centerZ: number, radiusMeters: number, minY?: number, maxY?: number)` | `boolean` | Tests if player is active and inside a 2.5D cylinder (inclusive). |
| `isPlayerOutsideCylinder(player: number \| mod.Player, centerX: number, centerZ: number, radiusMeters: number, minY?: number, maxY?: number)` | `boolean` | Tests if player is active and strictly outside a 2.5D cylinder. |
| `isPlayerInSphere(player: number \| mod.Player, centerX: number, centerY: number, centerZ: number, radiusMeters: number)` | `boolean` | Tests if player is active and inside a 3D sphere (inclusive). |
| `isPlayerOutsideSphere(player: number \| mod.Player, centerX: number, centerY: number, centerZ: number, radiusMeters: number)` | `boolean` | Tests if player is active and strictly outside a 3D sphere. |
| `isPlayerInAABB(player: number \| mod.Player, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number)` | `boolean` | Tests if player is active and inside a 3D AABB bounding box (inclusive). |
| `isPlayerOutsideAABB(player: number \| mod.Player, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number)` | `boolean` | Tests if player is active and strictly outside a 3D AABB bounding box. |

---

#### Reactive Event Subscriptions & Dynamic Handles

> **Dynamic Zone Updates & Safety**: All reactive subscriptions return an interactive handle (`SphereHandle`, `CylinderHandle`, etc.). You can modify spatial properties (e.g. moving a payload zone or resizing a capture radius) on the fly via `handle.update(...)` with **0 heap allocations**. Subscriptions can be cancelled at any time via `handle.unsubscribe()`, which is idempotent and safely ignores subsequent `update(...)` calls.
>
> **Callback Requirements**: For multi-callback subscriptions (`onSphere`, `onCylinder`, `onAABB`, `onCrossAltitude`, `onCrossEastWest`, `onCrossNorthSouth`), TypeScript enforces that at least one callback must be provided. If only the secondary transition callback is needed, pass `undefined` as the first callback argument (e.g., `PlayerLocations.onSphere(x, y, z, r, undefined, onExit)`).

| Function | Return Type | Description |
| :-- | :-- | :-- |
| `onSphere(x, y, z, radiusMeters, onEnter?, onExit?)` | `SphereHandle` | Subscribes to events when any player enters or exits a 3D sphere. Supports `.update(x, y, z, radius?)`. |
| `onCylinder(centerX, centerZ, radiusMeters, minY?, maxY?, onEnter?, onExit?)` | `CylinderHandle` | Subscribes to events when any player enters or exits a 2.5D cylinder. Supports `.update(centerX, centerZ, radius?, minY?, maxY?)`. |
| `onAABB(minX, minY, minZ, maxX, maxY, maxZ, onEnter?, onExit?)` | `AABBHandle` | Subscribes to events when any player enters or exits a 3D AABB bounding box. Supports `.update(minX, minY, minZ, maxX, maxY, maxZ)`. |
| `onCrossAltitude(y, onAbove?, onBelow?)` | `PlaneHandle` | Subscribes to events when any player crosses an altitude threshold ($Y$ elevation). Supports `.update(threshold)`. |
| `onCrossEastWest(x, onEast?, onWest?)` | `PlaneHandle` | Subscribes to events when any player crosses an East-West threshold ($X$ axis). Supports `.update(threshold)`. |
| `onCrossNorthSouth(z, onSouth?, onNorth?)` | `PlaneHandle` | Subscribes to events when any player crosses a North-South threshold ($Z$ axis). Supports `.update(threshold)`. |
| `onHighestPlayerChanged(callback)` | `ExtremaHandle` | Subscribes to events when the identity of the highest active player changes `(newId, prevId)`. |
| `onLowestPlayerChanged(callback)` | `ExtremaHandle` | Subscribes to events when the identity of the lowest active player changes `(newId, prevId)`. |
| `onClosestPlayerChanged(x, y, z, callback)` | `TargetExtremaHandle` | Subscribes to events when the closest active player to target point changes `(newId, prevId)`. Supports `.update(x, y, z)`. |
| `onFarthestPlayerChanged(x, y, z, callback)` | `TargetExtremaHandle` | Subscribes to events when the farthest active player from target point changes `(newId, prevId)`. Supports `.update(x, y, z)`. |

---

## Usage Patterns

<ai>

### Pattern 1: Moving Payload / Dynamic Area Subscription

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';

// Track players entering/exiting a moving payload vehicle's aura
const payloadZoneHandle = PlayerLocations.onSphere(
    0,
    0,
    0,
    15.0,
    (playerId) => {
        console.log(`Player ${playerId} is now pushing the payload!`);
        // Grant ammo aura / buff
    },
    (playerId) => {
        console.log(`Player ${playerId} left payload aura.`);
        // Remove ammo aura / buff
    }
);

// On each payload movement step or waypoint progression:
export function onPayloadMoved(newX: number, newY: number, newZ: number, isStopped: boolean): void {
    // Dynamically shift coordinates and double radius when stopped (0 heap allocations)
    payloadZoneHandle.update(newX, newY, newZ, isStopped ? 30.0 : 15.0);
}

// When the match ends or payload is destroyed:
export function onRoundEnd(): void {
    payloadZoneHandle.unsubscribe();
}
```

</ai>

<ai>

### Pattern 2: High-Altitude Flight Ceiling Alert

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';

const FLIGHT_CEILING_Y = 800.0;

// Trigger warning when crossing above or returning below flight ceiling
const unsubCeiling = PlayerLocations.onCrossAltitude(
    FLIGHT_CEILING_Y,
    (playerId) => {
        const pilot = mod.GetPlayer(playerId);
        // Play warning alarm sound or HUD warning
    },
    (playerId) => {
        // Clear HUD warning
    }
);
```

</ai>

<ai>

### Pattern 3: Dynamic VIP / King of the Hill Leader Tracking

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';

// Track when a new player takes the highest altitude lead
const unsubLeader = PlayerLocations.onHighestPlayerChanged((newHighestId, prevHighestId) => {
    if (prevHighestId !== -1) {
        console.log(`Player ${newHighestId} overtook player ${prevHighestId} for highest altitude!`);
    }
    // Update VIP scoreboard or 3D World Icon
});
```

</ai>

<ai>

### Pattern 4: Nearest Teammate Revive / Medic Aura

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';
import { Vectors } from 'bf6-portal-utils/vectors';

const scratchPos: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

export function findNearestTeammate(medic: mod.Player): number {
    const medicPos = PlayerLocations.getPosition(medic, scratchPos);
    if (!medicPos) return -1;

    const medicTeam = mod.GetPlayerTeam(medic);

    // Filter predicate executes inside single linear pass
    return PlayerLocations.getClosestPlayer(medicPos.x, medicPos.y, medicPos.z, (candidateId) => {
        const candidate = mod.GetPlayer(candidateId);
        return mod.GetPlayerTeam(candidate) === medicTeam && candidateId !== mod.GetObjId(medic);
    });
}
```

</ai>

<ai>

### Pattern 3: High-Altitude Airstrike Warning

```ts
import { PlayerLocations } from 'bf6-portal-utils/player-locations';

export function warnHighAltitudePilots(minAltitudeMeters: number): void {
    // Instantly queries Y-axis sorted bounds
    const highAltitudePilots = PlayerLocations.getPlayersAbove(minAltitudeMeters);

    for (let i = 0; i < highAltitudePilots.length; ++i) {
        const pilotId = highAltitudePilots[i];
        const pilot = mod.GetPlayer(pilotId);
        // Display SAM lock warning UI or sound
    }
}
```

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used for event handling and event subscriptions.
- [Vectors module](../vectors/README.md) – Used for vector math and conversions.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
