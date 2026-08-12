# Spatial Scene Graph & Multi-Object Kinematics Module

<ai>

The `SpatialOC` namespace provides a high-performance, zero-allocation 3D scene graph and hierarchical transformation system for Battlefield 6 Portal. Because the Frostbite/Portal engine only natively supports absolute, distinct spatial objects without a scene graph or parent-child hierarchy, this module virtualizes compound parent-child relationships, arbitrary-axis rotations, in-game model pivot offsets, and multi-object orbital kinematics (such as items orbiting a moving player or vehicle, like in Mario Kart).

`SpatialOC` uses **canonical local transformations**, **top-down dirty-flag caching**, and **pure JS zero-allocation Quaternion/Vector math**, generating **0 heap allocations** per frame in active game loops.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { SpatialOC } from 'bf6-portal-utils/spatial-oc';
    ```
3. Create root anchors and attach virtual children.
4. Call `SpatialOC.update(deltaTimeSeconds)` or `SpatialOC.sync()` in your ongoing tick loop.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

---

## Key Features

- **Hierarchical 3D Scene Graph**: Create nested parent-child object structures with accurate translation, rotation, and scale inheritance.
- **Zero-Allocation Architecture**: In-place mutations and pre-allocated scratch vectors/quaternions eliminate garbage collection stalls during active 60 Hz gameplay.
- **Top-Down Dirty Transform Caching**: World transforms and native `mod.SetObjectTransform` bridge calls only execute for objects that have actually moved or rotated.
- **Prefab Pivot Alignment (`pivotOffset`)**: Corrects for prefabs whose origin is at a corner or edge rather than the geometric center, automatically adjusting the visual transform when objects rotate.
- **External Parent Tracking**: Attach root nodes directly to moving `mod.Player`, `mod.Vehicle`, or `mod.SpatialObject` entities with optional yaw-only constraints.
- **High-Level Motion Controllers**: Built-in `.setOrbit()`, `.setLookAt()`, `.setFollow()`, and `.setKinematics()` controllers.

---

## Complete Examples

<ai>

### 1. Mario Kart Orbital Items Attached to a Moving Player

In this sample, 3 orbiting shield objects revolve around a player while tracking their position and facing direction in real time:

```ts
import { SpatialOC } from 'bf6-portal-utils/spatial-oc';

// Configure logging
SpatialOC.setLogging((text) => console.log(text), SpatialOC.LogLevel.Warning);

let playerOrbitRoot: SpatialOC.SpatialNode | undefined;

export function OnPlayerJoinGame(player: mod.Player) {
    // 1. Create a virtual parent anchor attached to the player's position
    playerOrbitRoot = SpatialOC.createEmpty();
    playerOrbitRoot.attachToPlayer(player, {
        offset: { x: 0, y: 1.5, z: 0 },
        trackRotation: true,
        yawOnly: true,
    });

    const radius = 3.5;
    const count = 3;
    const prefab = mod.RuntimeSpawn_Common.FiringRange_Floor_01;
    // Compensation for prefab corner origin:
    const floorOffset = { x: -10.25, y: 0, z: -10.25 };

    // 2. Spawn 3 child objects orbiting the player at 120-degree intervals
    for (let i = 0; i < count; ++i) {
        const angle = (i * 2 * Math.PI) / count;
        const localX = radius * Math.sin(angle);
        const localZ = radius * Math.cos(angle);

        const orbiter = SpatialOC.createRuntime(prefab, {
            parent: playerOrbitRoot,
            position: { x: localX, y: 0, z: localZ },
            pivotOffset: floorOffset,
        });

        if (orbiter) {
            // Configure smooth orbital revolution and continuous self-spin
            orbiter.setOrbit({
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
    SpatialOC.update(dt);
}

export function OnPlayerLeaveGame(playerId: number) {
    if (playerOrbitRoot) {
        playerOrbitRoot.destroy();
        playerOrbitRoot = undefined;
    }
}
```

---

### 2. Compound Virtual Robot / Turret Hierarchy

```ts
import { SpatialOC } from 'bf6-portal-utils/spatial-oc';

// Base pedestal
const turretBase = SpatialOC.createEmpty({ position: { x: 0, y: 10, z: 0 } });

// Turret yaw pivot (child of base)
const turretYaw = SpatialOC.createEmpty({ parent: turretBase });

// Gun pitch barrel (child of yaw pivot)
const barrel = SpatialOC.createEmpty({ parent: turretYaw, position: { x: 0, y: 1.2, z: 0.5 } });

// Aim at an enemy player coordinate
export function aimTurret(targetEnemyPos: mod.Vector) {
    turretYaw.lookAt(targetEnemyPos, { x: 0, y: 1, z: 0 });
    SpatialOC.sync();
}
```

</ai>

---

## Core Concepts

- **Canonical Local Transforms**: Each `SpatialNode` stores its canonical position, rotation quaternion, and scale in **local coordinates** relative to its parent.
- **Top-Down Dirty Caching**: World transforms are lazily evaluated only when marked dirty, and native `mod.SetObjectTransform` calls are issued only to objects that have actually moved or rotated.
- **Pure JS Math & Zero Allocations**: All vector and quaternion transformations run in pure JavaScript with pre-allocated module-level scratch instances (`_scratchV1..5`, `_scratchQ1..2`), avoiding QuickJS heap allocations and native engine bridge penalties.
- **Intuitive World Semantics**: Assigning `node.worldPosition`, `node.worldRotation`, or `node.worldRotationEuler` on a child node automatically performs zero-allocation inverse-transform resolution against the parent's world matrix, placing the node exactly at the intended world coordinate.
- **Prefab Pivot Alignment (`pivotOffset`)**: Compensates for map assets and runtime prefabs whose coordinate origin is located at a corner or boundary rather than the mesh center.
- **External Parent Tracking**: Root nodes can attach directly to `mod.Player`, `mod.Vehicle`, or native spatial objects with automatic transform extraction and yaw/pitch constraints.
- **Child Encapsulation Rule**: Virtual child nodes are managed entirely through the `SpatialNode` API. Native handles are private to prevent external modification and ensure hierarchy integrity.

---

## API Reference

### `namespace SpatialOC`

The `SpatialOC` namespace manages the global scene graph, factory functions, batch synchronization, and logging.

#### Static Methods

##### `SpatialOC.createEmpty(options?: NodeOptions): SpatialNode`

Creates an empty virtual root node or child node (via `options.parent`).

##### `SpatialOC.createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNode | undefined`

Spawns a runtime prefab as a new root node or child node (via `options.parent`).

##### `SpatialOC.createExisting(object: TransformableObject, options?: NodeOptions): SpatialNode | undefined`

Wraps an existing in-game object as a root node or child node (via `options.parent`).

##### `SpatialOC.update(deltaTimeSeconds?: number): void`

Advances active controllers (Orbit, LookAt, Follow, Kinematics) and trackers, then synchronizes all dirty transforms to the engine. If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime (throttled to a minimum of 0.01s / 10ms and clamped to 0.1s).

##### `SpatialOC.sync(): void`

Evaluates dirty transform hierarchies and writes modified positions/rotations to the game engine via `mod.SetObjectTransform`.

##### `SpatialOC.getRootCount(): number`

Returns the total count of active root nodes.

##### `SpatialOC.getActiveNodeCount(): number`

Returns the total count of active nodes in the scene graph (roots and children).

##### `SpatialOC.destroyAll(): void`

Recursively tears down all managed nodes in the scene graph and unspawns runtime entities.

##### `SpatialOC.setLogging(log?, logLevel?, includeRawError?): void`

Attaches a logging callback and minimum log level.

---

### `class SpatialNode`

#### Properties & Lifecycle

- `node.isValid`: `boolean` - Whether the node and native object are valid and alive.
- `node.isDeleted`: `boolean` - Whether the node has been destroyed.
- `node.parent`: `SpatialNode | undefined` - The parent node in the hierarchy.
- `node.childCount`: `number` - Total number of direct children ($O(1)$ query).
- `node.children`: `readonly SpatialNode[]` - Returns a safe shallow copy of direct children.
- `node.pivotOffset`: `Vector3 | undefined` - The in-game model offset correction (get/set).
- `node.localPosition`: `Vector3` - Local position relative to parent (get/set).
- `node.localRotation`: `Quaternion` - Local rotation quaternion relative to parent (get/set).
- `node.localRotationEuler`: `Vector3` - Local rotation as Euler angles in radians (ZYX order, get/set).
- `node.localScale`: `Vector3` - Local scale relative to parent (get/set with `number` or `Vector3`).
- `node.worldPosition`: `Vector3` - Evaluated world position (get/set; setting solves for local coordinates).
- `node.worldRotation`: `Quaternion` - Evaluated world rotation quaternion (get/set; setting solves for local rotation).
- `node.worldRotationEuler`: `Vector3` - Evaluated world Euler angles in radians (get/set; setting solves for local rotation).
- `node.worldScale`: `Vector3` - Evaluated world scale (get).

#### Hierarchy & Traversal Methods

- `node.getChild(index: number): SpatialNode | undefined`
- `node.forEachChild(callback: (child: SpatialNode, index: number) => void): void` (safely invoked with error isolation via `CallbackHandler`)
- `node.addChild(child: SpatialNode): boolean` (attaches child to parent; clears any active attachment tracker or follow controller on the child)
- `node.removeChild(child: SpatialNode): boolean`
- `node.detachFromParent(): this`
- `node.destroy(): void`

#### Transform & Matrix Manipulations

- `node.translateLocal(delta: Vector3): this`
- `node.translate(delta: Vector3): this`
- `node.rotateLocal(deltaRot: Quaternion): this`
- `node.rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this`
- `node.lookAt(targetWorld: Vector3, upAxis?: Vector3): this`
- `node.ensureWorldTransformUpdated(): void`
- `node.computeRenderPosition(out?: Vector3): Vector3`

#### Space Conversion

- `node.localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3`
- `node.worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3`
- `node.localToWorldVector(localVec: Vector3, out?: Vector3): Vector3`
- `node.worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3`

##### Controllers & Trackers

- `node.attachToPlayer(player: mod.Player, options?: AttachOptions): this` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `node.attachToVehicle(vehicle: mod.Vehicle, options?: AttachOptions): this` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `node.attachToObject(object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): this` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `node.attachToTracker(tracker: () => { position: Vector3; rotation?: Quaternion | Vector3 } | undefined): this` (attaches in world space; auto-detaches from parent and clears follow, orbit, and linear kinematics)
- `node.detachTracker(): this`
- `node.setOrbit(options?: OrbitOptions | null): this` (orbits in parent space; clears attach trackers, follow options, and linear kinematics)
- `node.setLookAt(options?: LookAtOptions | null): this` (aims orientation at target; clears angular kinematics and disables orbit spin/tangent alignment)
- `node.setFollow(options?: FollowOptions | null): this` (follows target in world space; auto-detaches from parent and clears attach trackers, orbit options, and linear kinematics)
- `node.setKinematics(options?: KinematicsOptions | null): this` (linear kinematics clear positional controllers; angular kinematics clear rotational controllers)

---

### Configuration Options

#### `NodeOptions`

- `parent?: SpatialNode` – Optional parent node to attach to upon creation. If omitted, creates a root node.
- `position?: Vector3` – Initial local position.
- `rotation?: Vector3 | Quaternion` – Initial local rotation (Quaternion or Euler angles in radians).
- `scale?: number | Vector3` – Initial local scale (uniform or per-axis). Default: 1.
- `pivotOffset?: Vector3` – Prefab model offset correction.

#### `LookAtOptions`

- `target?: Vector3 | mod.Player | SpatialNode` – The target to continuously look at (world coordinate, Player, or SpatialNode).
- `upAxis?: Vector3` – Up axis reference vector. Default: (0, 1, 0).
- _Note: Configuring look-at behavior clears angular kinematics and disables orbit spin/tangent alignment._

#### `AttachOptions`

- `offset?: Vector3` – Positional offset relative to the target's orientation coordinate frame.
- `trackRotation?: boolean` – Whether to track and match the target's rotation. Default: true.
- `yawOnly?: boolean` – When tracking rotation, whether to constrain rotation to yaw (horizontal) only. Default: true for Player, false for Vehicle and Object.
- _Note: Attaching a node automatically detaches it from its parent (making it a root node) and clears any active follow, orbit, or linear kinematics._

#### `OrbitOptions`

- `axis?: Vector3` – Rotation axis in parent or world space. Default: (0, 1, 0).
- `speedRadPerSec: number` – Orbital speed in radians per second. Positive is counter-clockwise.
- `radius?: number` – Orbit radius. If omitted, calculated from initial distance to center.
- `center?: Vector3` – Custom orbit center in parent coordinates. Default: (0, 0, 0).
- `faceTangent?: boolean` – Automatically align node forward direction tangent to the orbital path. Default: false.
- `selfSpinSpeedRadPerSec?: number` – Simultaneous self-spin speed around local up axis in radians per second.
- _Note: Configuring orbit behavior clears any active attachment trackers, follow controllers, or linear kinematics._

#### `FollowOptions`

- `target?: SpatialNode | mod.Player` – The target to follow (SpatialNode or Player).
- `offset?: Vector3` – Desired offset from the target in world space.
- `smoothSpeed?: number` – Damping speed factor (0 for instant snap, > 0 for smooth lerp). Default: 10.
- _Note: Configuring follow behavior automatically detaches the node from its parent (making it a root node) and clears any active attachment trackers, orbit controllers, or linear kinematics._

#### `KinematicsOptions`

- `linearVelocity?: Vector3` – Linear velocity vector in parent space (meters/second).
- `angularVelocity?: Vector3` – Angular velocity vector (axis-angle in radians/second).
- `linearAcceleration?: Vector3` – Linear acceleration vector (meters/second²).
- `angularAcceleration?: Vector3` – Angular acceleration vector (radians/second²).
- _Note: Specifying linear velocity/acceleration clears positional controllers (orbit, follow, attach); specifying angular velocity/acceleration clears look-at and orbit spin._
