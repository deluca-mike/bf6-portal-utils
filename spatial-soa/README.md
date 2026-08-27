# SpatialSOA (Structure of Arrays) Module

<ai>

The `SpatialSOA` namespace provides an ultra-high-performance, data-oriented 3D scene graph and hierarchical transformation system for Battlefield 6 Portal using a **Structure of Arrays (SoA)** pure functional architecture.

Instead of allocating individual object instances and Vector/Quaternion properties on the QuickJS heap, `SpatialSOA` stores transforms, hierarchies, and states in **flat, pre-allocated TypedArrays** (`Float32Array`, `Int16Array`, `Uint8Array`).

Every node is referenced purely by a type-safe `SpatialNodeID` (1-based generation-encoded `number`), with zero heap objects created during gameplay queries and transformations. Node ID 0 is reserved for the exported constant `ROOT_NODE_ID`.

This architecture:

- **Reduces memory consumption by ~85%** (from ~700 bytes/node to ~109 bytes/slot).
- **Completely eliminates GC tracing and transient garbage churn** for scene graph properties.
- **Uses Left-Child Right-Sibling (LCRS) hierarchy indexing** in 16-bit integers (`Int16Array`) for $\mathcal{O}(1)$ zero-allocation parent-child relationships.
- **Unified Triple-Duty Intrusive Linking**: Chained free-slots, active root nodes, and parent-child siblings all share the same `_nextSibling` buffer, eliminating auxiliary array overhead.
- **Prevents stale ID reuse** via generation-encoded node IDs (`Uint16Array`) with slot retirement at 65,535 generations to eliminate wrap-around collisions.
- **Explicit Root Node ID (`ROOT_NODE_ID = 0`)**: Top-level nodes are children of `ROOT_NODE_ID`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { SpatialSOA } from 'bf6-portal-utils/spatial-soa';
    ```
3. Create root anchors and attach virtual children.
4. Call `SpatialSOA.update(deltaTimeSeconds)` or `SpatialSOA.sync()` in your ongoing tick loop.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

---

## Key Features

- **Pure Functional ID-First API**: Nodes are type-safe integer IDs (`SpatialNodeID`), eliminating wrapper class heap objects.
- **Flat TypedArray Storage**: Position, rotation, scale, pivot offsets, and hierarchy pointers are stored in continuous flat memory buffers.
- **Intrusive Triple-Duty Linking (`_nextSibling`)**:
    - **FREE Slot**: Points to the next free slot on the intrusive free-list (`_firstFree`).
    - **ROOT Node (`_parent === -1`)**: Points to the next root node on the active root chain (`_firstRoot`).
    - **CHILD Node (`_parent !== -1`)**: Points to the next sibling under the same parent (`_firstChild[parent]`).
- **Generation-Encoded IDs**: Stale references to destroyed nodes are instantly rejected (`Uint16Array` generation storage; retired upon reaching 65,535 generations).
- **16-Bit Integer Hierarchy (`Int16Array`)**: Stores parent, first-child, and sibling pointers in only 6 bytes per node.
- **Zero-Allocation Out Parameters**: All getters and projections support optional `out` vectors/quaternions.
- **Top-Down Dirty Transform Caching**: World transforms and native `mod.SetObjectTransform` bridge calls only execute for objects that have actually moved or rotated.
- **High-Level Motion Controllers**: Built-in `setOrbit()`, `setLookAt()`, `setFollow()`, and `setKinematics()` (supporting linear & angular acceleration).

---

## Complete Example

```ts
import { SpatialSOA } from 'bf6-portal-utils/spatial-soa';

// Configure logging
SpatialSOA.setLogging((text) => console.log(text), SpatialSOA.LogLevel.Warning);

let playerOrbitRoot: SpatialSOA.SpatialNodeID | undefined;

export function OnPlayerJoinGame(player: mod.Player) {
    // 1. Create a virtual parent anchor following the player's position and orientation
    playerOrbitRoot = SpatialSOA.createEmpty() ?? undefined;
    if (playerOrbitRoot !== undefined) {
        SpatialSOA.setFollow(playerOrbitRoot, {
            target: player,
            offset: { x: 0, y: 1.5, z: 0 },
            trackRotation: true,
            yawOnly: true,
            smoothing: 0, // Instant snap to match player motion exactly
        });
    }

    const radius = 3.5;
    const count = 3;
    const prefab = mod.RuntimeSpawn_Common.FiringRange_Floor_01;
    const floorOffset = { x: -10.25, y: 0, z: -10.25 };

    // 2. Spawn 3 child objects orbiting the player at 120-degree intervals
    for (let i = 0; i < count; ++i) {
        const angle = (i * 2 * Math.PI) / count;
        const localX = radius * Math.sin(angle);
        const localZ = radius * Math.cos(angle);

        const orbiter = SpatialSOA.createRuntime(prefab, {
            parentId: playerOrbitRoot,
            position: { x: localX, y: 0, z: localZ },
            pivotOffset: floorOffset,
        });

        if (orbiter !== null) {
            // Configure smooth orbital revolution and continuous self-spin
            SpatialSOA.setOrbit(orbiter, {
                axis: { x: 0, y: 1, z: 0 },
                speedRadPerSec: Math.PI, // 180 deg/sec
                faceTangent: true,
                selfSpinSpeedRadPerSec: 2 * Math.PI,
            });
        }
    }
}

export function OngoingPlayer(player: mod.Player) {
    const dt = 0.0166; // Standard 60 Hz tick delta

    // 3. Step all kinematics, trackers, and sync dirty transforms in one pass
    SpatialSOA.update(dt);
}

export function OnPlayerLeaveGame(playerId: number) {
    if (playerOrbitRoot !== undefined) {
        SpatialSOA.destroy(playerOrbitRoot);
        playerOrbitRoot = undefined;
    }
}
```

---

## API Reference

### `namespace SpatialSOA`

#### Constants

- `ROOT_NODE_ID: SpatialNodeID` (value `0`) – The root node identifier.

#### Node Creation & Lifecycle

- `createEmpty(options?: NodeOptions): SpatialNodeID | null` (returns `null` if pool is full or `parentId` is invalid)
- `createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNodeID | null` (returns `null` if spawning failed, pool is full, or `parentId` is invalid)
- `createExisting(object: TransformableObject, options?: NodeOptions): SpatialNodeID | null` (returns `null` if pool is full or `parentId` is invalid)
- `destroy(id: SpatialNodeID): void`
- `isValid(id: SpatialNodeID): boolean`
- `isDeleted(id: SpatialNodeID): boolean`
- `getActiveNodeCount(): number`

#### Hierarchy Operations

- `setParent(id: SpatialNodeID, parentId: SpatialNodeID): boolean` (re-parents a node; returns `false` if invalid or cycle detected)
- `getParent(id: SpatialNodeID): SpatialNodeID | null | undefined` (returns `null` for `ROOT_NODE_ID`, `ROOT_NODE_ID` for top-level nodes, `undefined` if deleted)
- `getChildCount(id: SpatialNodeID): number | undefined` (returns `undefined` if deleted)
- `getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined` (returns `undefined` if deleted)
- `getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined` (returns `null` if index out of bounds, `undefined` if deleted)
- `forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void` (safely invoked with error isolation via `CallbackHandler`)

#### Local & World Transforms

- `getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setLocalPosition(id: SpatialNodeID, pos: Vector3): void`
- `getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined` / `setLocalRotation(id: SpatialNodeID, rot: Quaternion): void`
- `getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void`
- `getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void`
- `getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void`
- `getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined` / `setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void`
- `getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void`
- `getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined`
- `getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | null | undefined` / `setPivotOffset(id: SpatialNodeID, offset?: Vector3 | null): void`

#### Manipulations & Space Projections

- `translateLocal(id: SpatialNodeID, delta: Vector3): void`
- `translate(id: SpatialNodeID, delta: Vector3): void`
- `rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void`
- `rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void`
- `lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void`
- `ensureWorldTransformUpdated(id: SpatialNodeID): void`
- `computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined`
- `localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3 | undefined`
- `worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3 | undefined`
- `localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3 | undefined`
- `worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3 | undefined`

#### Controllers & Trackers

- `setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void` (orbits in parent space; clears follow options and linear kinematics)
- `setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void` (aims orientation at target; clears angular kinematics and disables orbit spin/tangent alignment)
- `setFollow(id: SpatialNodeID, options?: FollowOptions | null): void` (follows target in world space; sets parent to `ROOT_NODE_ID` and clears orbit options and linear kinematics)
- `setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void` (linear kinematics clear positional controllers; angular kinematics clear rotational controllers)

#### Engine Synchronization

- `update(deltaTimeSeconds?: number): void` – Advances active controllers and trackers, then synchronizes all dirty transforms. If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime (throttled to a minimum of 0.01s / 10ms and clamped to 0.1s).
- `sync(): void`

---

### Configuration Options

#### `NodeOptions`

- `parentId?: SpatialNodeID` – Optional parent node ID to attach to upon creation. If omitted, attaches to `ROOT_NODE_ID`.
- `position?: Vector3` – Initial local position.
- `rotation?: Vector3 | Quaternion` – Initial local rotation (Quaternion or Euler angles in radians).
- `scale?: Vector3 | number` – Initial local scale (uniform or per-axis). Default: 1.
- `pivotOffset?: Vector3` – Prefab model offset correction.

#### `LookAtOptions`

- `target?: Vector3 | mod.Player | SpatialNodeID` – The target to continuously look at (world coordinate, Player, or SpatialNodeID).
- `upAxis?: Vector3` – World up reference vector. Default: (0, 1, 0).
- _Note: Configuring look-at behavior clears angular kinematics and disables orbit spin/tangent alignment._

#### `FollowOptions`

- `target?: TrackableObject | SpatialNodeID | TransparentObject` – The target to follow (Player, Vehicle, native TrackableObject prop/spawner, SpatialNodeID, or plain TransparentObject `{ position, rotation }`).
- `offset?: Vector3` – Desired offset. If tracking rotation or the target has orientation, the offset is transformed into the target's coordinate frame.
- `smoothing?: number | FollowSmoothingFunction` – Damping speed factor (`0` for instant rigid snap, `> 0` for smooth lerp), or a custom interpolation function `(current, target, dt, out?: Vector3) => Vector3`. Default: `10`.
- `trackRotation?: boolean` – Whether to track and match target rotation. Default: `false`.
- `yawOnly?: boolean` – When tracking rotation, whether to constrain rotation to yaw (horizontal) only. Default: `false`.
- _Note: Configuring follow behavior automatically sets the node's parent to `ROOT_NODE_ID` and clears any active orbit controllers or linear kinematics._

#### `KinematicsOptions`

- `linearVelocity?: Vector3` – Linear velocity vector in parent space (meters/second).
- `angularVelocity?: Vector3` – Angular velocity vector (axis-angle in radians/second).
- `linearAcceleration?: Vector3` – Linear acceleration vector (meters/second²).
- `angularAcceleration?: Vector3` – Angular acceleration vector (radians/second²).
- _Note: Specifying linear velocity/acceleration clears positional controllers (orbit, follow); specifying angular velocity/acceleration clears look-at and orbit spin._
