# Spatial Module (Unified Hybrid Scene Graph)

<ai>

The `Spatial` namespace provides a high-performance, unified 3D scene graph and hierarchical transformation system for Battlefield 6 Portal.

It combines an **ergonomic, object-oriented class API** (`new Spatial.Empty()`, `new Spatial.Runtime()`, `new Spatial.Existing()`) with a **high-performance Structure of Arrays (SoA) backend** stored in flat TypedArrays (`Float32Array`, `Int16Array`, `Uint8Array`).

This architecture:

- Provides **100% native compatibility with [`Solid.h()`](../solid/README.md)** for declarative, fine-grained reactive 3D hierarchies.
- Uses **zero-allocation property setters** that write directly to contiguous flat buffers and set bitflags (`FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY`).
- Retains **~85% memory savings** over pure object scene graphs, storing all hierarchy pointers in a 16-bit Left-Child Right-Sibling (LCRS) buffer.
- Features complete **1:1 API symmetry** between OOP instance methods and raw integer ID functions (`Spatial.createRuntimeId()`, `Spatial.setLocalPosition()`) for high-throughput, zero-heap particle and projectile swarms.
- Prevents stale ID reuse with **generation-encoded IDs** (`SpatialNodeID`) with slot retirement at 65,535 generations to eliminate wrap-around collisions.
- Incorporates **deadband synchronization**: only issues native `mod.SetObjectTransform` calls when cumulative evaluated world transforms exceed configurable thresholds (`positionRenderPrecision`, `rotationRenderPrecision`), dramatically cutting Portal engine overhead.
- Supports **hierarchical scale propagation**: parent scale scales child spatial translation offsets and orbital distances in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`). _Note_: dynamic runtime scale modifications update hierarchical coordinates and space projections, but do not alter the visual draw mesh scale of already-spawned native engine objects (which is fixed at spawn by the engine via `spawnScale`).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Spatial } from 'bf6-portal-utils/spatial';
    ```
3. Create root anchors and attach virtual children.
4. Call `Spatial.sync()` in your ongoing tick loop (or throttled cadence) to flush dirty transforms to the engine (the scene graph auto-advances in memory via `Events.OngoingGlobal`).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

---

## Understanding Scale: Scene Graph Scale vs Engine Spawn Scale

In Battlefield 6 Portal, the native engine API only accepts position and rotation when syncing transforms (`mod.SetObjectTransform`). The physical 3D mesh model geometry size of an object is fixed at the moment of creation via `mod.SpawnObject(prefab, pos, rot, scale)`.

Because of this architectural constraint, `Spatial` strictly separates **Scene Graph Scale** from **Physical Spawn Scale**:

| Scale Concept | Property / Parameter | Mutable? | Purpose & Engine Interaction |
| :-- | :-- | :-- | :-- |
| **Physical Spawn Scale** | `params.spawnScale` (`RuntimeParams`) | **Immutable** (set at spawn) | Passed directly to `mod.SpawnObject` upon creation. Controls the physical 3D mesh model draw size in the engine (default: `1`). |
| **Scene Graph Scale** | `scale` / `localScale` / `worldScale` | **Dynamic & Mutable** | Controls hierarchical spatial translation offsets (`worldPos = parentPos + parentRot * (childPos * parentScale)`), model pivot offsets, and coordinate projections (`localToWorldPoint`, `worldToLocalPoint`). |

### How Scene Graph Scale Works in Hierarchies

When a parent node has a `scale` of `2`:

1. All direct children positioned at `{ x: 0, y: 0, z: 5 }` relative to the parent are spaced `10` meters away in world coordinates.
2. The parent's dynamic scale does **not** enlarge the visual mesh size of already spawned native engine objects.
3. Newly spawned child runtime objects inherit parent spatial spacing, but their physical model size defaults to `spawnScale: 1` unless explicitly specified.

```ts
// 1. Create a parent anchor scaled 2x in spatial coordinate space
const parentAnchor = new Spatial.Empty({
    position: { x: 0, y: 0, z: 0 },
    scale: 2,
});

// 2. Spawn a child orb with an offset of 5m
const childOrb = new Spatial.Runtime({
    parent: parentAnchor,
    prefab: mod.RuntimeSpawn_Common.Sphere_01,
    position: { x: 0, y: 0, z: 5 }, // Evaluated world position will be 10m away
    spawnScale: 1.5, // Explicitly sets physical 3D mesh size to 1.5x
});
```

---

## Declarative 3D with `Solid`

Because `Spatial.Empty`, `Spatial.Runtime`, and `Spatial.Existing` expose public constructors and standard property getters and setters, they integrate seamlessly with `Solid.h()`:

```ts
import { Solid } from 'bf6-portal-utils/solid';
import { Spatial } from 'bf6-portal-utils/spatial';

export function createPlayerTurret(player: mod.Player) {
    // 1. Reactive state signals
    const [aimEuler, setAimEuler] = Solid.createSignal({ x: 0, y: 0, z: 0 });
    const [isFiring, setIsFiring] = Solid.createSignal(false);

    // 2. Base anchor attached to player
    const turretBase = Solid.h(Spatial.Empty, {
        position: () => mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition),
    });

    // 3. Aiming barrel with fine-grained reactive rotation
    const barrel = Solid.h(Spatial.Runtime, {
        parent: turretBase,
        prefab: mod.RuntimeSpawn_Common.FiringRange_Floor_01,
        position: { x: 0, y: 1.5, z: 0.5 },
        localRotationEuler: aimEuler, // Automatically creates effect + setter binding
    });

    // Cleaned up automatically when enclosing reactive scope is disposed
}
```

---

## High-Throughput Raw ID Bypass (Zero Heap Allocations)

For massive systems (e.g. 1,000+ projectiles, particles, or debris chunks), bypass class wrapper allocations entirely using raw integer IDs (`SpatialNodeID`):

```ts
import { Spatial } from 'bf6-portal-utils/spatial';

// Pre-allocate ID buffer
const projectileIds = new Int16Array(1000);

for (let i = 0; i < 1000; ++i) {
    // 0 heap objects allocated
    const id = Spatial.createRuntimeId({
        prefab: mod.RuntimeSpawn_Common.Sphere_01,
        position: { x: i * 2, y: 0, z: 0 },
    });
    if (id !== null) {
        projectileIds[i] = id;
    }
}

// In tick loop (0 allocations):
for (let i = 0; i < 1000; ++i) {
    const id = projectileIds[i] as Spatial.SpatialNodeID;
    Spatial.setLocalPosition(id, { x: i * 2, y: Math.sin(Date.now() / 1000 + i), z: 0 });
}
```

---

## API Reference

### Constants & Types

- `Spatial.ROOT_NODE: SpatialNode` – Singleton origin anchor of the global scene graph (ID `0`).
- `Spatial.ROOT_NODE_ID: SpatialNodeID` – Constant representing the root node identifier (`0`).
- `Spatial.INVALID_NODE_ID: SpatialNodeID` – Constant representing an unallocated/invalid node ID (`-1`).
- `Spatial.MAX_NODES: number` – Maximum supported node pool capacity (`1024`).
- `Spatial.DEFAULT_POSITION_RENDER_PRECISION: number` – Default minimum distance delta (`0.01` meters / 1 cm) before engine transform sync.
- `Spatial.DEFAULT_ROTATION_RENDER_PRECISION: number` – Default minimum rotation delta (`0.175` rad / ~10°) before engine transform sync.
- `Spatial.QueryableObject` – Interface for objects providing zero-allocation `getPosition(out?)` and optional `getRotation(out?)` query methods.
- `Spatial.TargetType` – Enum for target classification (`None = 0`, `SpatialNodeID = 1`, `SpatialNode = 2`, `Vector3 = 3`, `QueryableObject = 4`, `Player = 5`, `Vehicle = 6`, `TrackableObject = 7`).

---

### Class Hierarchy

#### `Spatial.SpatialNode` (Abstract Base Class)

Base class for all scene graph nodes, including `ROOT_NODE`.

- `node.id: SpatialNodeID` – Generation-encoded node identifier.
- `node.isValid: boolean` – Whether the node is currently active and alive.
- `node.isDeleted: boolean | undefined` – `true` if deleted/outdated generation, `false` if active/`ROOT_NODE`, `undefined` if unallocated or invalid.
- `node.parent: SpatialNode | null | undefined` – Parent node (`null` for `ROOT_NODE`, `undefined` if deleted).
- `node.childCount: number | undefined` – Number of direct children.
- `node.children: readonly SpatialElement[] | undefined` – Snapshot array of direct child elements.
- `node.getChild(index: number): SpatialElement | null | undefined` – Direct child element at index (`null` if out of bounds).
- `node.forEachChild(callback: (child: SpatialElement, index: number) => void): void` – Zero-allocation iteration with error isolation.
- `SpatialNode.fromId(id: SpatialNodeID): SpatialNode | null` – Resolves any node by ID (returns `ROOT_NODE` for `0`, `SpatialElement` for element IDs, `null` if invalid).

---

#### `Spatial.SpatialElement extends SpatialNode` (Abstract Element Class)

Transformable scene graph element backed by SoA storage.

- **Local Transforms (Get/Set)**:
    - `element.localPosition: Vector3 | undefined`
    - `element.localRotation: Quaternion | undefined`
    - `element.localRotationEuler: Vector3 | undefined`
    - `element.localScale: Vector3 | undefined` (setter accepts `Vector3 | number`) – Local scene graph coordinate scale (scales child translation offsets in world space; does not alter native mesh draw scale; see `spawnScale` on `RuntimeParams`).
    - `element.pivotOffset: Vector3 | null | undefined`
- **World Transforms (Get/Set)**:
    - `element.worldPosition: Vector3 | undefined`
    - `element.worldRotation: Quaternion | undefined`
    - `element.worldRotationEuler: Vector3 | undefined`
    - `element.worldScale: Vector3 | undefined` (setter accepts `Vector3 | number`) – Evaluated compound world scene graph scale (`worldScale = parentWorldScale * localScale`).
- **Parent Mutation**:
    - `element.parent: SpatialNode | null | undefined` (get/set)
    - `element.setParent(parent: SpatialNode | SpatialNodeID, keepWorldTransform?: boolean): this` – Attaches element as a child of another node. When `keepWorldTransform` is `true` (default), preserves world position, rotation, and scale by updating its local transform. When `false`, preserves local coordinates under the new parent.
- **Render Precision & Deadband**:
    - `element.positionRenderPrecision: number | undefined` (get; set accepts `number`) – Minimum position delta in meters before engine sync (defaults to `0.01`).
    - `element.setPositionRenderPrecision(precision: number): this` – Fluent setter for position render precision.
    - `element.rotationRenderPrecision: number | undefined` (get; set accepts `number`) – Minimum rotation delta in radians before engine sync (defaults to `0.175`).
    - `element.setRotationRenderPrecision(precision: number): this` – Fluent setter for rotation render precision.
- **Lifecycle**:
    - `element.delete(): void` – Deletes element and recursively cleans up all descendants and native spawned prefabs.
    - `SpatialElement.fromId(id: SpatialNodeID): SpatialElement | null` – Resolves/lazily wraps an active element ID (`null` for `ROOT_NODE_ID` or invalid).
- **Transform Queries (Zero-Allocation with `out` parameters)**:
    - `element.getLocalPosition(out?: Vector3): Vector3 | undefined`
    - `element.getLocalRotation(out?: Quaternion): Quaternion | undefined`
    - `element.getLocalRotationEuler(out?: Vector3): Vector3 | undefined`
    - `element.getLocalScale(out?: Vector3): Vector3 | undefined` – Retrieves local scene graph coordinate scale.
    - `element.getPivotOffset(out?: Vector3): Vector3 | null | undefined`
    - `element.getWorldPosition(out?: Vector3): Vector3 | undefined`
    - `element.getWorldRotation(out?: Quaternion): Quaternion | undefined`
    - `element.getWorldRotationEuler(out?: Vector3): Vector3 | undefined`
    - `element.getWorldScale(out?: Vector3): Vector3 | undefined` – Retrieves compound world scene graph scale.
- **Transform Manipulations**:
    - `element.translateLocal(delta: Vector3): this`
    - `element.translate(delta: Vector3): this`
    - `element.rotateLocal(deltaRot: Quaternion): this`
    - `element.rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this`
    - `element.lookAt(targetWorld: Vector3, upAxis?: Vector3): this`
- **Space Projections**:
    - `element.computeRenderPosition(out?: Vector3): Vector3 | undefined`
    - `element.localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 | undefined`
    - `element.worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 | undefined`
    - `element.localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 | undefined`
    - `element.worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 | undefined`
- **Velocity Evaluation & Motion Controllers**:
    - `element.linearVelocity: Vector3 | undefined` (get)
    - `element.angularVelocity: Vector3 | undefined` (get)
    - `element.getLinearVelocity(out?: Vector3): Vector3 | undefined` – Evaluates world linear velocity including ancestor kinematics, orbital translation, and tangential velocities ($\vec{\omega} \times \vec{r}$).
    - `element.getAngularVelocity(out?: Vector3): Vector3 | undefined` – Evaluates world angular velocity across ancestor hierarchy and orbit controllers.
    - `element.setOrbit(options?: OrbitOptions | null): this`
    - `element.setLookAt(options?: LookAtOptions | null): this`
    - `element.setFollow(options?: FollowOptions | null): this`
    - `element.setKinematics(options?: KinematicsOptions | null): this`

---

#### Constructable Subclasses

All constructors accept options extending `NodeParams` (`parent`, `position`, `rotation`, `scale`, `pivotOffset`, `positionRenderPrecision`, `rotationRenderPrecision`):

- `new Spatial.Empty(params?: EmptyParams): SpatialElement` – Creates a virtual transform group or anchor.
- `new Spatial.Runtime(params: RuntimeParams): SpatialElement` – Spawns an engine prefab (`mod.SpawnObject`) synchronized top-down. `RuntimeParams` accepts `spawnScale?: Vector3 | number` to set the immutable physical 3D mesh model draw scale passed to `mod.SpawnObject` (default: `1`), while `params.scale` sets the initial scene graph coordinate hierarchy scale.
- `new Spatial.Existing(params: ExistingParams): SpatialElement` – Wraps an already spawned or static engine object.

---

### Module-Level Functions & Raw ID API

#### Lifecycle & Synchronization

- `Spatial.sync(): void` – Evaluates all dirty transforms and syncs native objects via `mod.SetObjectTransform`.
- `Spatial.deleteNode(target: SpatialNode | SpatialNodeID): void` – Recursively tears down the specified node.
- `Spatial.isValid(id: SpatialNodeID): boolean` – Checks whether a node ID is valid and active.
- `Spatial.isDeleted(id: SpatialNodeID): boolean | undefined` – Checks whether a node ID is deleted or inactive.
- `Spatial.getActiveNodeCount(): number` – Returns total active nodes count.
- `Spatial.fromId(id: SpatialNodeID): SpatialElement | null` – Resolves or instantiates the OOP wrapper for an ID.
- `Spatial.ensureWorldTransformUpdated(id: SpatialNodeID): void` – Evaluates dirty ancestors and world transform for a node.

#### Raw ID Creation (0 Heap Object Allocations)

- `Spatial.createEmptyId(params?: EmptyParams): SpatialNodeID | null`
- `Spatial.createRuntimeId(params: RuntimeParams): SpatialNodeID | null` – Spawns a runtime prefab returning its primitive integer ID. Accepts `params.spawnScale?: Vector3 | number` (default: `1`).
- `Spatial.createExistingId(params: ExistingParams): SpatialNodeID | null`

#### Hierarchy Operations by ID

- `Spatial.setParent(childId: SpatialNodeID, parentId: SpatialNodeID, keepWorldTransform?: boolean): void` – Sets parent in the hierarchy. Preserves world coordinates by default (`keepWorldTransform = true`).
- `Spatial.getParent(id: SpatialNodeID): SpatialNodeID | null | undefined`
- `Spatial.getChildCount(id: SpatialNodeID): number | undefined`
- `Spatial.getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined`
- `Spatial.getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined`
- `Spatial.forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void`

#### Local & World Transforms by ID

- `Spatial.getLocalPosition(id, out?)` / `Spatial.setLocalPosition(id, pos)`
- `Spatial.getLocalRotation(id, out?)` / `Spatial.setLocalRotation(id, rot)`
- `Spatial.getLocalRotationEuler(id, out?)` / `Spatial.setLocalRotationEuler(id, euler)`
- `Spatial.getLocalScale(id, out?)` / `Spatial.setLocalScale(id, scale)` – Gets or sets local scene graph coordinate scale (scales child translation offsets; does not alter native mesh draw scale).
- `Spatial.getPivotOffset(id, out?)` / `Spatial.setPivotOffset(id, offset)`
- `Spatial.getWorldPosition(id, out?)` / `Spatial.setWorldPosition(id, worldPos)`
- `Spatial.getWorldRotation(id, out?)` / `Spatial.setWorldRotation(id, worldRot)`
- `Spatial.getWorldRotationEuler(id, out?)` / `Spatial.setWorldRotationEuler(id, worldEuler)`
- `Spatial.getWorldScale(id, out?)` / `Spatial.setWorldScale(id, worldScale)` – Gets or sets evaluated compound world scene graph scale.

#### Velocity Evaluation

- `Spatial.getLinearVelocity(node: SpatialNode | SpatialNodeID, out?: Vector3): Vector3 | undefined` – Evaluates world linear velocity including ancestor kinematics, orbital translation, and tangential velocities ($\vec{\omega} \times \vec{r}$).
- `Spatial.getAngularVelocity(node: SpatialNode | SpatialNodeID, out?: Vector3): Vector3 | undefined` – Evaluates world angular velocity across ancestor hierarchy and orbit controllers.

#### Render Precision by ID

- `Spatial.getPositionRenderPrecision(id: SpatialNodeID): number | undefined`
- `Spatial.setPositionRenderPrecision(id: SpatialNodeID, precision: number): void`
- `Spatial.getRotationRenderPrecision(id: SpatialNodeID): number | undefined`
- `Spatial.setRotationRenderPrecision(id: SpatialNodeID, precision: number): void`

#### Manipulations & Projections by ID

- `Spatial.translateLocal(id, delta)`
- `Spatial.translate(id, delta)`
- `Spatial.rotateLocal(id, deltaRot)`
- `Spatial.rotateAroundAxis(id, axis, angleRad, pivotCenter?)`
- `Spatial.lookAt(id, targetWorld, upAxis?)`
- `Spatial.computeRenderPosition(id, out?)`
- `Spatial.localToWorldPoint(id, localPoint, out?)`
- `Spatial.worldToLocalPoint(id, worldPoint, out?)`
- `Spatial.localToWorldVector(id, localVec, out?)`
- `Spatial.worldToLocalVector(id, worldVec, out?)`

#### Motion Controllers by ID

- `Spatial.setOrbit(id, options?)` – Configures orbital revolution and optional tangent alignment.
- `Spatial.setLookAt(id, options?)` – Configures continuous LookAt target tracking (supports nodes, players, vehicles, objects, vectors).
- `Spatial.setFollow(id, options?)` – Configures continuous following with optional rotation tracking, `yawOnly` filtering, and exponential smoothing.
- `Spatial.setKinematics(id, options?)` – Configures continuous linear and angular velocity and acceleration.
