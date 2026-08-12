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

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Spatial } from 'bf6-portal-utils/spatial';
    ```
3. Create root anchors and attach virtual children.
4. Call `Spatial.update(deltaTime)` or `Spatial.sync()` in your ongoing tick loop.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

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
- `Spatial.TargetType` – Enum for target classification (`None = 0`, `SpatialNodeID = 1`, `SpatialNode = 2`, `Vector3 = 3`, `TransparentObject = 4`, `Player = 5`, `Vehicle = 6`, `TrackableObject = 7`).

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
    - `element.localScale: Vector3 | undefined` (setter accepts `Vector3 | number`)
    - `element.pivotOffset: Vector3 | null | undefined`
- **World Transforms (Get/Set)**:
    - `element.worldPosition: Vector3 | undefined`
    - `element.worldRotation: Quaternion | undefined`
    - `element.worldRotationEuler: Vector3 | undefined`
    - `element.worldScale: Vector3 | undefined` (setter accepts `Vector3 | number`)
- **Parent Mutation**:
    - `element.parent: SpatialNode | null | undefined` (get/set)
    - `element.setParent(parent: SpatialNode | SpatialNodeID): this`
- **Lifecycle**:
    - `element.delete(): void` – Deletes element and recursively cleans up all descendants and native spawned prefabs.
    - `SpatialElement.fromId(id: SpatialNodeID): SpatialElement | null` – Resolves/lazily wraps an active element ID (`null` for `ROOT_NODE_ID` or invalid).
- **Transform Queries (Zero-Allocation with `out` parameters)**:
    - `element.getLocalPosition(out?: Vector3): Vector3 | undefined`
    - `element.getLocalRotation(out?: Quaternion): Quaternion | undefined`
    - `element.getLocalRotationEuler(out?: Vector3): Vector3 | undefined`
    - `element.getLocalScale(out?: Vector3): Vector3 | undefined`
    - `element.getPivotOffset(out?: Vector3): Vector3 | null | undefined`
    - `element.getWorldPosition(out?: Vector3): Vector3 | undefined`
    - `element.getWorldRotation(out?: Quaternion): Quaternion | undefined`
    - `element.getWorldRotationEuler(out?: Vector3): Vector3 | undefined`
    - `element.getWorldScale(out?: Vector3): Vector3 | undefined`
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
- **Motion Controllers**:
    - `element.setOrbit(options?: OrbitOptions | null): this`
    - `element.setLookAt(options?: LookAtOptions | null): this`
    - `element.setFollow(options?: FollowOptions | null): this`
    - `element.setKinematics(options?: KinematicsOptions | null): this`

---

#### Constructable Subclasses

- `new Spatial.Empty(params?: EmptyParams): SpatialElement` – Creates a virtual transform group or anchor.
- `new Spatial.Runtime(params: RuntimeParams): SpatialElement` – Spawns an engine prefab (`mod.SpawnObject`) synchronized top-down.
- `new Spatial.Existing(params: ExistingParams): SpatialElement` – Wraps an already spawned or static engine object.

---

### Module-Level Functions & Raw ID API

#### Lifecycle & Synchronization

- `Spatial.update(deltaTime?: number): void` – Advances active motion controllers and top-down synchronizes dirty transforms to the engine.
- `Spatial.sync(): void` – Evaluates all dirty transforms and syncs native objects via `mod.SetObjectTransform`.
- `Spatial.deleteNode(target: SpatialNode | SpatialNodeID): void` – Recursively tears down the specified node.
- `Spatial.isValid(id: SpatialNodeID): boolean` – Checks whether a node ID is valid and active.
- `Spatial.isDeleted(id: SpatialNodeID): boolean | undefined` – Checks whether a node ID is deleted or inactive.
- `Spatial.getActiveNodeCount(): number` – Returns total active nodes count.
- `Spatial.fromId(id: SpatialNodeID): SpatialElement | null` – Resolves or instantiates the OOP wrapper for an ID.
- `Spatial.ensureWorldTransformUpdated(id: SpatialNodeID): void` – Evaluates dirty ancestors and world transform for a node.

#### Raw ID Creation (0 Heap Object Allocations)

- `Spatial.createEmptyId(params?: EmptyParams): SpatialNodeID | null`
- `Spatial.createRuntimeId(params: RuntimeParams): SpatialNodeID | null`
- `Spatial.createExistingId(params: ExistingParams): SpatialNodeID | null`

#### Hierarchy Operations by ID

- `Spatial.setParent(childId: SpatialNodeID, parentId: SpatialNodeID): void`
- `Spatial.getParent(id: SpatialNodeID): SpatialNodeID | null | undefined`
- `Spatial.getChildCount(id: SpatialNodeID): number | undefined`
- `Spatial.getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined`
- `Spatial.getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined`
- `Spatial.forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void`

#### Local & World Transforms by ID

- `Spatial.getLocalPosition(id, out?)` / `Spatial.setLocalPosition(id, pos)`
- `Spatial.getLocalRotation(id, out?)` / `Spatial.setLocalRotation(id, rot)`
- `Spatial.getLocalRotationEuler(id, out?)` / `Spatial.setLocalRotationEuler(id, euler)`
- `Spatial.getLocalScale(id, out?)` / `Spatial.setLocalScale(id, scale)`
- `Spatial.getPivotOffset(id, out?)` / `Spatial.setPivotOffset(id, offset)`
- `Spatial.getWorldPosition(id, out?)` / `Spatial.setWorldPosition(id, worldPos)`
- `Spatial.getWorldRotation(id, out?)` / `Spatial.setWorldRotation(id, worldRot)`
- `Spatial.getWorldRotationEuler(id, out?)` / `Spatial.setWorldRotationEuler(id, worldEuler)`
- `Spatial.getWorldScale(id, out?)` / `Spatial.setWorldScale(id, worldScale)`

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

- `Spatial.setOrbit(id, options?)` – Configures orbital revolution, optional tangent alignment, and self-spin.
- `Spatial.setLookAt(id, options?)` – Configures continuous LookAt target tracking (supports nodes, players, vehicles, objects, vectors).
- `Spatial.setFollow(id, options?)` – Configures continuous following with optional rotation tracking, `yawOnly` filtering, and exponential smoothing.
- `Spatial.setKinematics(id, options?)` – Configures continuous linear and angular velocity and acceleration.
