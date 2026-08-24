# SpatialSOA (Structure of Arrays) Module

<ai>

The `SpatialSOA` namespace provides an ultra-high-performance, data-oriented 3D scene graph and hierarchical transformation system for Battlefield 6 Portal using a **Structure of Arrays (SoA)** pure functional architecture.

Instead of allocating individual object instances and Vector/Quaternion properties on the QuickJS heap, `SpatialSOA` stores transforms, hierarchies, and states in **flat, pre-allocated TypedArrays** (`Float32Array`, `Int16Array`, `Uint8Array`).

Every node is referenced purely by a type-safe `SpatialNodeID` (generation-encoded `number`), with zero heap objects created during gameplay queries and transformations.

This architecture:

- **Reduces memory consumption by ~85%** (from ~700 bytes/node to ~109 bytes/slot).
- **Completely eliminates GC tracing and transient garbage churn** for scene graph properties.
- **Uses Left-Child Right-Sibling (LCRS) hierarchy indexing** in 16-bit integers (`Int16Array`) for $\mathcal{O}(1)$ zero-allocation parent-child relationships.
- **Unified Triple-Duty Intrusive Linking**: Chained free-slots, active root nodes, and parent-child siblings all share the same `_nextSibling` buffer, eliminating auxiliary array overhead.
- **Prevents stale ID reuse** via generation-encoded node IDs (`Uint16Array`) with slot retirement at 65,535 generations to eliminate wrap-around collisions.

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
    // 1. Create a virtual parent anchor attached to the player's position
    playerOrbitRoot = SpatialSOA.createEmpty();
    SpatialSOA.attachToPlayer(playerOrbitRoot, player, {
        offset: { x: 0, y: 1.5, z: 0 },
        trackRotation: true,
        yawOnly: true,
    });

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

        if (orbiter !== SpatialSOA.INVALID_NODE_ID) {
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

#### Node Creation & Lifecycle

- `createEmpty(options?: NodeOptions): SpatialNodeID` (returns `INVALID_NODE_ID` if pool is full or `parentId` is invalid)
- `createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNodeID` (returns `INVALID_NODE_ID` if spawning failed, pool is full, or `parentId` is invalid)
- `createExisting(object: TransformableObject, options?: NodeOptions): SpatialNodeID` (returns `INVALID_NODE_ID` if pool is full or `parentId` is invalid)
- `destroy(id: SpatialNodeID): void`
- `destroyAll(): void`
- `isValid(id: SpatialNodeID): boolean`
- `isDeleted(id: SpatialNodeID): boolean`

#### Hierarchy Operations

- `addChild(parentId: SpatialNodeID, childId: SpatialNodeID): boolean` (attaches child to parent; clears any active attachment tracker or follow controller on the child)
- `removeChild(parentId: SpatialNodeID, childId: SpatialNodeID): boolean`
- `detachFromParent(id: SpatialNodeID): void`
- `getParent(id: SpatialNodeID): SpatialNodeID`
- `getChildCount(id: SpatialNodeID): number`
- `getChildren(id: SpatialNodeID): SpatialNodeID[]`
- `getChild(id: SpatialNodeID, index: number): SpatialNodeID`
- `forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void` (safely invoked with error isolation via `CallbackHandler`)
- `getRootCount(): number`
- `getRootNodes(): SpatialNodeID[]`
- `getActiveNodeCount(): number`

#### Local & World Transforms

- `getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3` / `setLocalPosition(id: SpatialNodeID, pos: Vector3): void`
- `getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion` / `setLocalRotation(id: SpatialNodeID, rot: Quaternion): void`
- `getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3` / `setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void`
- `getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3` / `setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void`
- `getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3` / `setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void`
- `getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion` / `setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void`
- `getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3` / `setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void`
- `getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3`
- `getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | undefined` / `setPivotOffset(id: SpatialNodeID, offset?: Vector3): void`

#### Manipulations & Space Projections

- `translateLocal(id: SpatialNodeID, delta: Vector3): void`
- `translate(id: SpatialNodeID, delta: Vector3): void`
- `rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void`
- `rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void`
- `lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void`
- `ensureWorldTransformUpdated(id: SpatialNodeID): void`
- `computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3`
- `localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3`
- `worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3`
- `localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3`
- `worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3`

#### Attachments & Controllers

- `attachToPlayer(id: SpatialNodeID, player: mod.Player, options?: AttachOptions): void` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `attachToVehicle(id: SpatialNodeID, vehicle: mod.Vehicle, options?: AttachOptions): void` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `attachToObject(id: SpatialNodeID, object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): void` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `attachToTracker(id: SpatialNodeID, tracker: () => { position: Vector3; rotation?: Quaternion | Vector3 } | undefined): void` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `detachTracker(id: SpatialNodeID): void`
- `setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void` (orbits in parent space; clears attach trackers, follow options, and linear kinematics)
- `setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void` (aims orientation at target; clears angular kinematics and disables orbit spin/tangent alignment)
- `setFollow(id: SpatialNodeID, options?: FollowOptions | null): void` (follows target in world space; auto-detaches from parent and clears attach trackers, orbit options, and linear kinematics)
- `setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void` (linear kinematics clear positional controllers; angular kinematics clear rotational controllers)

#### Engine Synchronization

- `update(deltaTimeSeconds?: number): void` – Advances active controllers and trackers, then synchronizes all dirty transforms. If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime (throttled to a minimum of 0.01s / 10ms and clamped to 0.1s).
- `sync(): void`

---

### Configuration Options

#### `NodeOptions`

- `parentId?: SpatialNodeID` – Optional parent node ID to attach to upon creation. If omitted, creates a root node.
- `position?: Vector3` – Initial local position.
- `rotation?: Vector3 | Quaternion` – Initial local rotation (Quaternion or Euler angles in radians).
- `scale?: Vector3 | number` – Initial local scale (uniform or per-axis). Default: 1.
- `pivotOffset?: Vector3` – Prefab model offset correction.

#### `LookAtOptions`

- `target?: Vector3 | mod.Player | SpatialNodeID` – The target to continuously look at (world coordinate, Player, or SpatialNodeID).
- `upAxis?: Vector3` – World up reference vector. Default: (0, 1, 0).
- _Note: Configuring look-at behavior clears angular kinematics and disables orbit spin/tangent alignment._

#### `AttachOptions`

- `offset?: Vector3` – Positional offset relative to the target's orientation coordinate frame.
- `trackRotation?: boolean` – Whether to track and match the target's rotation. Default: true.
- `yawOnly?: boolean` – When tracking rotation, whether to constrain rotation to yaw (horizontal) only. Default: true for Player, false for Vehicle and Object.
- _Note: Attaching a node automatically detaches it from its parent (making it a root node) and clears any active follow, orbit, or linear kinematics._

#### `OrbitOptions`

- `axis?: Vector3` – Rotation axis in parent or world space. Default: (0, 1, 0).
- `speedRadPerSec: number` – Orbital speed in radians per second. Positive is counter-clockwise.
- `center?: Vector3` – Custom orbit center in parent coordinates. Default: (0, 0, 0).
- `faceTangent?: boolean` – Automatically align node forward direction tangent to the orbital path. Default: false.
- `selfSpinSpeedRadPerSec?: number` – Simultaneous self-spin speed around local up axis in radians per second.
- _Note: Configuring orbit behavior clears any active attachment trackers, follow controllers, or linear kinematics._

#### `FollowOptions`

- `target?: SpatialNodeID | mod.Player` – The target to follow (SpatialNodeID or Player).
- `offset?: Vector3` – Desired offset from the target in world space.
- `smoothSpeed?: number` – Damping speed factor (0 for instant snap, > 0 for smooth lerp). Default: 10.
- _Note: Configuring follow behavior automatically detaches the node from its parent (making it a root node) and clears any active attachment trackers, orbit controllers, or linear kinematics._

#### `KinematicsOptions`

- `linearVelocity?: Vector3` – Linear velocity vector in parent space (meters/second).
- `angularVelocity?: Vector3` – Angular velocity vector (axis-angle in radians/second).
- `linearAcceleration?: Vector3` – Linear acceleration vector (meters/second²).
- `angularAcceleration?: Vector3` – Angular acceleration vector (radians/second²).
- _Note: Specifying linear velocity/acceleration clears positional controllers (orbit, follow, attach); specifying angular velocity/acceleration clears look-at and orbit spin._
