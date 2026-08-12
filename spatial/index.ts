import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { InterleavedQuaternions } from '../interleaved-quaternions/index.ts';
import { InterleavedVectors } from '../interleaved-vectors/index.ts';
import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace Spatial {
    const logging = new Logging('Spatial');

    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    // =========================================================================
    // Types & Interfaces
    // =========================================================================

    /**
     * Unique generation-encoded identifier for a Spatial node (0 represents ROOT_NODE_ID).
     */
    export type SpatialNodeID = number & { readonly __brand: 'SpatialNodeID' };

    /**
     * A transparent 3D vector representing a point, direction, scale, or euler rotation in 3D space.
     */
    export type Vector3 = Vectors.Vector3;

    /**
     * A transparent 4D Quaternion representing 3D spatial rotation.
     */
    export type Quaternion = Quaternions.Quaternion;

    /**
     * Supported in-game transformable engine object types (players, vehicles, spawners, props, triggers).
     */
    export type TransformableObject =
        | mod.Bomb
        | mod.EmplacementSpawner
        | mod.FixedCamera
        | mod.InteractPoint
        | mod.LootSpawner
        | mod.MCOM
        | mod.SFX
        | mod.SpatialObject
        | mod.Spawner
        | mod.VehicleSpawner
        | mod.VL7Cloud
        | mod.VO
        | mod.WorldIcon
        | mod.BlockingSphere
        | mod.Player;

    /**
     * Supported runtime spawn prefab enum types in Battlefield 6 Portal.
     */
    export type RuntimeSpawnPrefab =
        | mod.RuntimeSpawn_Common
        | mod.RuntimeSpawn_Abbasid
        | mod.RuntimeSpawn_Aftermath
        | mod.RuntimeSpawn_Badlands
        | mod.RuntimeSpawn_Battery
        | mod.RuntimeSpawn_Capstone
        | mod.RuntimeSpawn_Contaminated
        | mod.RuntimeSpawn_Dumbo
        | mod.RuntimeSpawn_Eastwood
        | mod.RuntimeSpawn_FireStorm
        | mod.RuntimeSpawn_Limestone
        | mod.RuntimeSpawn_Outskirts
        | mod.RuntimeSpawn_Subsurface
        | mod.RuntimeSpawn_Tungsten
        | mod.RuntimeSpawn_Granite_Downtown
        | mod.RuntimeSpawn_Granite_Marina
        | mod.RuntimeSpawn_Granite_MilitaryRnD
        | mod.RuntimeSpawn_Granite_MilitaryStorage
        | mod.RuntimeSpawn_Granite_ResidentialNorth
        | mod.RuntimeSpawn_Granite_TechCenter
        | mod.RuntimeSpawn_Granite_Underground
        | mod.RuntimeSpawn_Sand
        | mod.RuntimeSpawn_GolmudRailway
        | mod.RuntimeSpawn_Plaza
        | mod.RuntimeSpawn_Isolated
        | mod.RuntimeSpawn_Ocean
        | mod.RuntimeSpawn_Atoll;

    /**
     * Supported in-game trackable engine object types (players, vehicles, spawners, props, triggers).
     */
    export type TrackableObject =
        | mod.Player
        | mod.Vehicle
        | TransformableObject
        | mod.CapturePoint
        | mod.HQ
        | mod.RingOfFire
        | mod.Sector
        | mod.SpawnPoint;

    /**
     * An object providing zero-allocation query functions for live position and optional rotation tracking.
     */
    export interface QueryableObject {
        /**
         * Computes or retrieves the current world position.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world position, or null/undefined if unavailable.
         */
        getPosition(out?: Vector3): Vector3 | undefined | null;
        /**
         * Computes or retrieves the current world rotation (as a Quaternion or Euler angles in radians).
         * @param out - Optional target Quaternion or Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world rotation, or null/undefined if unavailable.
         */
        getRotation?(out?: Quaternion | Vector3 | undefined | null): Quaternion | Vector3 | undefined | null;
    }

    /**
     * Custom smoothing / interpolation function for follow motion.
     * @param current - Current world position of the follower.
     * @param target - Evaluated target world position (accounting for oriented offset).
     * @param dt - Delta time in milliseconds.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The updated world position.
     */
    export type FollowSmoothingFunction = (current: Vector3, target: Vector3, dt: number, out?: Vector3) => Vector3;

    /**
     * Common initialization options for creating SpatialNodes.
     */
    export interface NodeParams {
        /** Optional parent node or ID to attach this node to upon creation. If undefined, attaches to ROOT_NODE. */
        parent?: SpatialNode | SpatialNodeID;
        /** Initial local or world position. */
        position?: Vector3;
        /** Initial local or world rotation (as a Quaternion or Euler angles in radians). */
        rotation?: Vector3 | Quaternion;
        /**
         * Initial local or world scale (uniform or per-axis) in the scene graph hierarchy. Default: 1.
         * Controls hierarchical coordinate scaling, parent-child translation offsets, and space projections.
         * Note: This does NOT set the visual mesh draw scale of spawned objects; to configure the physical draw
         * size of a native prefab in the game engine, use `spawnScale` on `RuntimeParams`.
         */
        scale?: Vector3 | number;
        /** In-game model offset correction (to adjust prefab origins to mesh center). */
        pivotOffset?: Vector3;
        /**
         * Minimum position delta in meters before syncing to the native engine via `mod.SetObjectTransform`. Default: 0.01 (1cm).
         */
        positionRenderPrecision?: number;
        /**
         * Minimum rotation delta in radians before syncing to the native engine via `mod.SetObjectTransform`. Default: 0.175 (~10°).
         */
        rotationRenderPrecision?: number;
    }

    /**
     * Initialization options for creating Empty virtual spatial nodes.
     */
    export type EmptyParams = NodeParams;

    /**
     * Initialization options for dynamically spawning runtime prefab nodes.
     */
    export interface RuntimeParams extends NodeParams {
        /** The runtime spawn prefab enum to instantiate. */
        prefab: RuntimeSpawnPrefab;
        /**
         * The visual model draw scale passed to `mod.SpawnObject` upon creation (uniform or per-axis). Default: 1.
         * Unlike scene-graph `scale` / `localScale` / `worldScale` (which control hierarchical parent-child spatial offsets
         * and coordinate projections), `spawnScale` sets the immutable physical mesh size of the spawned prefab in the game engine.
         */
        spawnScale?: Vector3 | number;
    }

    /**
     * Initialization options for wrapping existing native engine objects.
     */
    export interface ExistingParams extends NodeParams {
        /** The existing native transformable object to wrap. */
        object: TransformableObject;
    }

    /**
     * Options for continuous orbital rotation motion.
     */
    export interface OrbitOptions {
        /** The rotation axis of the orbit in parent or world space. Default: (0, 1, 0). */
        axis?: Vector3;
        /** The orbital speed in radians per second. Positive is counter-clockwise. */
        speedRadPerSec: number;
        /** Center point of orbit in local/parent coordinates. Default: (0, 0, 0). */
        center?: Vector3;
        /** When true, automatically aligns node forward direction tangent to the orbital path. */
        faceTangent?: boolean;
    }

    /**
     * Options for continuous LookAt target tracking.
     */
    export interface LookAtOptions {
        /** The target to continuously look at (world position, Player, Vehicle, TrackableObject, SpatialNode, SpatialNodeID, or QueryableObject). */
        target?: TrackableObject | SpatialNode | SpatialNodeID | QueryableObject | Vector3;
        /** World up vector for camera/orientation leveling. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }

    /**
     * Options for continuous follow behavior on a node.
     */
    export interface FollowOptions {
        /** The target to follow (Player, Vehicle, TrackableObject, SpatialNode, SpatialNodeID, or QueryableObject). */
        target?: TrackableObject | SpatialNode | SpatialNodeID | QueryableObject;
        /** Desired offset. If tracking rotation or target has orientation, offset is oriented in target's frame. */
        offset?: Vector3;
        /** Smooth damping speed factor (0 for instant snap, > 0 for smooth), or custom smoothing function. Default: 0. */
        smoothing?: number | FollowSmoothingFunction;
        /** Whether to track and match target rotation. Default: false. */
        trackRotation?: boolean;
        /** When tracking rotation, whether to constrain rotation to yaw (horizontal) only. Default: false. */
        yawOnly?: boolean;
    }

    /**
     * Options for kinematic linear and angular velocity and acceleration integration.
     */
    export interface KinematicsOptions {
        /** Linear velocity vector in parent space (meters per second). */
        linearVelocity?: Vector3;
        /** Angular velocity vector (axis * radians per second) in local space. */
        angularVelocity?: Vector3;
        /** Linear acceleration vector in parent space (meters per second squared). */
        linearAcceleration?: Vector3;
        /** Angular acceleration vector (axis * radians per second squared) in local space. */
        angularAcceleration?: Vector3;
    }

    // =========================================================================
    // Constants & Enums
    // =========================================================================

    /**
     * Constant representing the root anchor node ID in the scene graph.
     */
    export const ROOT_NODE_ID = 0 as SpatialNodeID;

    /**
     * Constant representing an invalid/unallocated spatial node ID.
     */
    export const INVALID_NODE_ID = -1 as SpatialNodeID;

    // Module-Level Configuration
    export const MAX_NODES = 1024;

    /**
     * Default threshold in meters for position synchronization to native engine objects (0.01 = 1cm).
     */
    export const DEFAULT_POSITION_RENDER_PRECISION = 0.01;

    /**
     * Default threshold in radians for rotation synchronization to native engine objects (0.175 ≈ 10.027°).
     */
    export const DEFAULT_ROTATION_RENDER_PRECISION = 0.175;

    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 100_000;
    const INVALID_INDEX = -1;

    // Node Lifecycle & State Bitmask Flags
    const FLAG_ACTIVE = 1 << 0; // 1: Node is allocated and active
    const FLAG_DIRTY = 1 << 1; // 2: Local transform changed, world matrices need evaluation
    const FLAG_ENGINE_TRANSFORM_DIRTY = 1 << 2; // 4: Evaluated transform needs syncing to native mod.Object
    const FLAG_RUNTIME_SPAWNED = 1 << 3; // 8: Created via SpawnObject; should be UnspawnObject'd on delete
    const FLAG_HAS_PIVOT = 1 << 4; // 16: Has non-zero pivot offset
    const FLAG_HAS_SYNCED = 1 << 5; // 32: Has been synchronized to engine at least once

    const enum TargetType {
        None = 0,
        SpatialNodeID = 1,
        SpatialNode = 2,
        Vector3 = 3,
        QueryableObject = 4,
        Player = 5,
        Vehicle = 6,
        TrackableObject = 7,
    }

    // =========================================================================
    // Structure of Arrays (SoA) Buffers
    // =========================================================================

    // Canonical Local Transforms
    const _localPos = new Float32Array(MAX_NODES * 3);
    const _localRot = new Float32Array(MAX_NODES * 4); // w, x, y, z
    const _localScale = new Float32Array(MAX_NODES * 3);

    // Evaluated Cached World Transforms
    const _worldPos = new Float32Array(MAX_NODES * 3);
    const _worldRot = new Float32Array(MAX_NODES * 4); // w, x, y, z
    const _worldScale = new Float32Array(MAX_NODES * 3);

    // Model Prefab Pivot Offset
    const _pivotOffset = new Float32Array(MAX_NODES * 3);

    // Last Synced World Transforms for Deadband Change Detection
    const _lastSyncedPos = new Float32Array(MAX_NODES * 3);
    const _lastSyncedRot = new Float32Array(MAX_NODES * 4); // w, x, y, z

    // Per-Node Render Precision Thresholds
    const _posPrecision = new Float64Array(MAX_NODES);
    const _rotPrecision = new Float64Array(MAX_NODES);

    /**
     * Precomputed cosine of half the rotation precision angle: cos(theta / 2).
     * For unit quaternions, |dot(q1, q2)| = cos(theta / 2), where theta is the angular delta.
     * Precomputing this value avoids calling expensive transcendental Math.acos() every frame in _syncNode.
     * An angular difference >= rotPrecision corresponds to |dot(q1, q2)| <= cos(rotPrecision / 2).
     */
    const _cosHalfRotPrecision = new Float64Array(MAX_NODES);

    // Flags & Generations
    const _flags = new Uint8Array(MAX_NODES);
    const _generations = new Uint16Array(MAX_NODES);

    // Left-Child Right-Sibling (LCRS) Hierarchy in 16-bit integers
    const _parent = new Int16Array(MAX_NODES).fill(INVALID_INDEX);
    const _firstChild = new Int16Array(MAX_NODES).fill(INVALID_INDEX);

    /**
     * Unified Intrusive Link Array (`_nextSibling`):
     * Serves triple-duty across 3 mutually exclusive slot lifecycle states with 0 extra memory overhead:
     * 1. **FREE Slot**: Points to the next free slot on the intrusive free-list (`_firstFree`).
     * 2. **ROOT Node (`_parent === INVALID_INDEX`)**: Points to the next root node on the active root chain (`_firstRoot`).
     * 3. **CHILD Node (`_parent !== INVALID_INDEX`)**: Points to the next sibling under the same parent (`_firstChild[parent]`).
     */
    const _nextSibling = new Int16Array(MAX_NODES);

    // Intrusive Free-List Allocator (re-uses _nextSibling with 0 extra memory)
    let _firstFree = 0;

    for (let i = 0; i < MAX_NODES - 1; ++i) {
        _nextSibling[i] = i + 1;
    }
    _nextSibling[MAX_NODES - 1] = INVALID_INDEX;

    // Native Engine Object Pointers
    const _objects = new Array<TransformableObject | undefined>(MAX_NODES).fill(undefined);

    // Instances table for OOP facade wrappers
    const _instances = new Array<SpatialElement | null>(MAX_NODES).fill(null);

    // =========================================================================
    // Auxiliary Controller & Tracker Storage
    // =========================================================================

    interface OrbitState extends OrbitOptions {
        currentAngleRad: number;
        offset: Vector3;
    }

    interface KinematicsState {
        linearVelocity?: Vector3;
        angularVelocity?: Vector3;
        linearAcceleration?: Vector3;
        angularAcceleration?: Vector3;
    }

    interface LookAtState extends LookAtOptions {
        targetType: TargetType;
    }

    interface FollowState extends FollowOptions {
        targetType: TargetType;
    }

    interface ControllerRecord {
        orbit?: OrbitState;
        lookAt?: LookAtState;
        follow?: FollowState;
        kinematics?: KinematicsState;
    }

    const _controllers = new Array<ControllerRecord | undefined>(MAX_NODES).fill(undefined);

    let _firstRoot = INVALID_INDEX;
    let _activeNodeCount = 0;

    let _lastUpdateTime = 0;

    // =========================================================================
    // Phase-Grouped Contextual Scratch Variables for Zero-Allocation Math
    // =========================================================================

    // 1. World transform evaluation (_ensureWorldTransformUpdated)
    const _evalScaledPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _evalRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _evalRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // 2. Render placement & engine synchronization (_computeRenderPosition, createRuntime, _syncNode)
    const _renderPivotScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderPivotRotated: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderEuler: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // 3. Coordinate space projections (localToWorldPoint, worldToLocalPoint, localToWorldVector, worldToLocalVector)
    const _projScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _projWorldPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _projWorldDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _projRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _projInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // 4. Node transformations, world setters & reparenting (setWorld*, translate*, rotate*, lookAt, setParent)
    const _transPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _transRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _transScale: Vector3 = { x: 1, y: 1, z: 1 };
    const _transDeltaPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _transAxisRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _transInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // 5. Active controllers & kinematics (_stepKinematics, _stepOrbit, _stepLookAt, _stepFollow, _getTargetRotation)
    const _ctrlRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _ctrlRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlTangentCross: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlTargetPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlFacing: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlEuler: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlQueryRot: Quaternion = { w: NaN, x: 0, y: 0, z: 0 };
    const _ctrlTargetRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _ctrlTargetWithOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlLerpedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _ctrlPos: Vector3 = { x: 0, y: 0, z: 0 };

    // 6. Compound velocity evaluation (getLinearVelocity, getAngularVelocity)
    const _svTargetWorldPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _svParentWorldPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _svNodeWorldPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _svParentWorldRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _svNodeWorldRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _svOrbitCenterWorld: Vector3 = { x: 0, y: 0, z: 0 };
    const _svLeverArm: Vector3 = { x: 0, y: 0, z: 0 };
    const _svAngVelWorld: Vector3 = { x: 0, y: 0, z: 0 };
    const _svLinVelWorld: Vector3 = { x: 0, y: 0, z: 0 };
    const _svTangentialVel: Vector3 = { x: 0, y: 0, z: 0 };
    const _svScratchVec: Vector3 = { x: 0, y: 0, z: 0 };
    const _svChain: number[] = [];

    const _UP_AXIS: Readonly<Vector3> = Object.freeze({ x: 0, y: 1, z: 0 });

    // =========================================================================
    // Bitmask & Buffer Slot Access Helpers
    // =========================================================================

    function _hasFlag(slot: number, flag: number): boolean {
        return (_flags[slot] & flag) !== 0;
    }

    function _setFlag(slot: number, flag: number): void {
        _flags[slot] |= flag;
    }

    function _clearFlag(slot: number, flag: number): void {
        _flags[slot] &= ~flag;
    }

    function _isActive(slot: number): boolean {
        return _hasFlag(slot, FLAG_ACTIVE);
    }

    function _isDirty(slot: number): boolean {
        return _hasFlag(slot, FLAG_DIRTY);
    }

    function _isEngineTransformDirty(slot: number): boolean {
        return _hasFlag(slot, FLAG_ENGINE_TRANSFORM_DIRTY);
    }

    function _isRuntimeSpawned(slot: number): boolean {
        return _hasFlag(slot, FLAG_RUNTIME_SPAWNED);
    }

    function _hasPivot(slot: number): boolean {
        return _hasFlag(slot, FLAG_HAS_PIVOT);
    }

    function _hasSynced(slot: number): boolean {
        return _hasFlag(slot, FLAG_HAS_SYNCED);
    }

    /**
     * Encodes an internal array index and its current generation into a public node ID.
     * 1-based offset ensures slot 0 with generation 0 starts at ID 1, preserving ROOT_NODE_ID = 0.
     * @param slot - The internal array index.
     * @returns The encoded public node ID.
     */
    function _encodeId(slot: number): SpatialNodeID {
        return (slot + 1 + GENERATION_MULTIPLIER * _generations[slot]) as SpatialNodeID;
    }

    /**
     * Resolves a public generation-encoded node ID to its internal array index.
     * @param id - The public generation-encoded node ID.
     * @returns The internal array index, or INVALID_INDEX if invalid, generation-mismatched, or inactive.
     */
    function _resolveSlot(id: SpatialNodeID | number): number {
        if (id <= 0) return INVALID_INDEX;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_NODES) return INVALID_INDEX;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[slot] !== idGen || !_isActive(slot)) return INVALID_INDEX;

        return slot;
    }

    /**
     * Resolves a public generation-encoded node ID to its internal array index, and logs a warning if it is deleted.
     * @param id - The public generation-encoded node ID.
     * @returns The internal array index, or INVALID_INDEX if invalid, generation-mismatched, or inactive.
     */
    function _resolveSlotAndLogWarning(id: SpatialNodeID | number): number {
        if (id <= 0) return INVALID_INDEX;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_NODES) return INVALID_INDEX;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);
        const gen = _generations[slot];

        if (idGen < gen) {
            logging.log('Element is deleted', LogLevel.Warning);
            return INVALID_INDEX;
        }

        if (gen !== idGen || !_isActive(slot)) return INVALID_INDEX;

        return slot;
    }

    function _resolveNodeSlotAndLogWarning(target?: SpatialNode | SpatialNodeID | null): number {
        return !target ? INVALID_INDEX : _resolveSlotAndLogWarning(typeof target === 'number' ? target : target._id);
    }

    /**
     * Checks whether a given node ID is deleted.
     * @param id - The node ID to check.
     * @returns True if deleted, false if active, undefined if it never existed (i.e. invalid).
     */
    export function isDeleted(id: SpatialNodeID): boolean | undefined {
        if (id === ROOT_NODE_ID) return false;

        if (id <= 0) return undefined;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_NODES) return undefined;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);
        const gen = _generations[slot];

        if (idGen > gen) return undefined;

        if (idGen < gen) return true;

        // `_isActive(slot)` should never return false here, since we know `idGen === gen`.
        return _isActive(slot) ? false : undefined;
    }

    /**
     * Checks whether a given node ID is valid and active.
     * @param id - The node ID to check.
     * @returns True if valid and active, false otherwise.
     */
    export function isValid(id: SpatialNodeID): boolean {
        return id === ROOT_NODE_ID || _resolveSlot(id) !== INVALID_INDEX;
    }

    function _isValidSlot(slot: number): boolean {
        return slot >= 0 && slot < MAX_NODES && _isActive(slot);
    }

    /**
     * Marks an index and all of its descendants as dirty.
     * @param slot - The internal array index.
     */
    function _markDirty(slot: number): void {
        _setFlag(slot, FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY);

        for (let child = _firstChild[slot]; child !== INVALID_INDEX; child = _nextSibling[child]) {
            _markDirty(child);
        }
    }

    /**
     * Allocates a slot from the intrusive free-list pool.
     * @returns The allocated internal array index, or INVALID_INDEX if the pool is full.
     */
    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        _firstFree = _nextSibling[slot];

        _nextSibling[slot] = INVALID_INDEX;
        _firstChild[slot] = INVALID_INDEX;
        _parent[slot] = INVALID_INDEX;
        _flags[slot] = FLAG_ACTIVE | FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY;
        _instances[slot] = null;
        _objects[slot] = undefined;
        _controllers[slot] = undefined;

        _posPrecision[slot] = DEFAULT_POSITION_RENDER_PRECISION;
        _rotPrecision[slot] = DEFAULT_ROTATION_RENDER_PRECISION;
        _cosHalfRotPrecision[slot] = Math.cos(DEFAULT_ROTATION_RENDER_PRECISION / 2);

        InterleavedVectors.setSlice(_localPos, slot, 0);
        InterleavedQuaternions.setIdentity(_localRot, slot);
        InterleavedVectors.setSlice(_localScale, slot, 1);
        InterleavedVectors.setSlice(_pivotOffset, slot, 0);
        InterleavedVectors.setSlice(_worldPos, slot, 0);
        InterleavedQuaternions.setIdentity(_worldRot, slot);
        InterleavedVectors.setSlice(_worldScale, slot, 1);
        InterleavedVectors.setSlice(_lastSyncedPos, slot, 0);
        InterleavedQuaternions.setIdentity(_lastSyncedRot, slot);

        _activeNodeCount++;

        return slot;
    }

    /**
     * Recycles a slot back into the intrusive free-list pool, incrementing its generation.
     * @param slot - The internal array index to recycle.
     */
    function _freeSlot(slot: number): void {
        _flags[slot] = 0;
        _parent[slot] = INVALID_INDEX;
        _firstChild[slot] = INVALID_INDEX;
        _instances[slot] = null;
        _objects[slot] = undefined;
        _controllers[slot] = undefined;

        _activeNodeCount--;

        if (_generations[slot] < MAX_GENERATIONS) {
            ++_generations[slot];
            _nextSibling[slot] = _firstFree;
            _firstFree = slot;
        } else if (logging.willLog(LogLevel.Warning)) {
            logging.log(`Slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    // =========================================================================
    // Slot Hierarchy & Lifecycle Helpers
    // =========================================================================

    /**
     * Attaches/links a child node to its parent.
     * @param parentSlot - The parent's internal array index.
     * @param childSlot - The child's internal array index.
     */
    function _attachChild(parentSlot: number, childSlot: number): void {
        _parent[childSlot] = parentSlot;

        if (parentSlot === INVALID_INDEX) {
            _nextSibling[childSlot] = _firstRoot;
            _firstRoot = childSlot;
        } else {
            _nextSibling[childSlot] = _firstChild[parentSlot];
            _firstChild[parentSlot] = childSlot;
        }
    }

    /**
     * Detaches/unlinks a child node from its parent's child list.
     * @param parentSlot - The parent's internal array index.
     * @param childSlot - The child's internal array index.
     */
    function _detachChild(parentSlot: number, childSlot: number): void {
        const head = parentSlot === INVALID_INDEX ? _firstRoot : _firstChild[parentSlot];

        if (head === childSlot) {
            if (parentSlot === INVALID_INDEX) {
                _firstRoot = _nextSibling[childSlot];
            } else {
                _firstChild[parentSlot] = _nextSibling[childSlot];
            }
        } else {
            let curr = head;

            while (curr !== INVALID_INDEX && _nextSibling[curr] !== childSlot) {
                curr = _nextSibling[curr];
            }

            if (curr !== INVALID_INDEX) {
                _nextSibling[curr] = _nextSibling[childSlot];
            }
        }

        _parent[childSlot] = INVALID_INDEX;
        _nextSibling[childSlot] = INVALID_INDEX;
    }

    function _initSlotTransforms(slot: number, parentSlot: number, params?: NodeParams): void {
        _attachChild(parentSlot, slot);

        const pos = params?.position;

        if (pos) {
            InterleavedVectors.toSlice(pos, _localPos, slot);
        }

        const rot = params?.rotation;

        if (rot) {
            if ('w' in rot) {
                InterleavedQuaternions.toSlice(rot, _localRot, slot);
            } else {
                Quaternions.fromEuler(rot.x, rot.y, rot.z, _transRot);
                InterleavedQuaternions.toSlice(_transRot, _localRot, slot);
            }
        }

        const scale = params?.scale;

        if (scale !== undefined) {
            if (typeof scale === 'number') {
                InterleavedVectors.setSlice(_localScale, slot, scale);
            } else {
                InterleavedVectors.toSlice(scale, _localScale, slot);
            }
        }

        const pivot = params?.pivotOffset;

        if (pivot) {
            InterleavedVectors.toSlice(pivot, _pivotOffset, slot);
            _setFlag(slot, FLAG_HAS_PIVOT);
        }

        const posPrec =
            params?.positionRenderPrecision !== undefined
                ? params.positionRenderPrecision
                : DEFAULT_POSITION_RENDER_PRECISION;

        _posPrecision[slot] = posPrec;

        const rotPrec =
            params?.rotationRenderPrecision !== undefined
                ? params.rotationRenderPrecision
                : DEFAULT_ROTATION_RENDER_PRECISION;

        _rotPrecision[slot] = rotPrec;
        _cosHalfRotPrecision[slot] = rotPrec > 0 ? Math.cos(rotPrec / 2) : 1;

        _markDirty(slot);
    }

    function _deleteRecursiveSlot(slot: number): void {
        if (!_isValidSlot(slot)) return;

        let child = _firstChild[slot];

        while (child !== INVALID_INDEX) {
            const next = _nextSibling[child];
            _deleteRecursiveSlot(child);
            child = next;
        }

        _detachChild(_parent[slot], slot);

        if (_isRuntimeSpawned(slot)) {
            const obj = _objects[slot];

            if (obj && mod.IsValid(obj)) {
                try {
                    mod.UnspawnObject(obj);
                } catch (error: unknown) {
                    logging.log('Error unspawning object on delete', LogLevel.Error, error);
                }
            }
        }

        _freeSlot(slot);
    }

    function _clearPositionControllerConfigs(slot: number): void {
        _controllers[slot]!.orbit = undefined;
        _controllers[slot]!.follow = undefined;

        if (_controllers[slot]!.kinematics) {
            _controllers[slot]!.kinematics!.linearVelocity = undefined;
            _controllers[slot]!.kinematics!.linearAcceleration = undefined;
        }
    }

    function _clearRotationControllerConfigs(slot: number): void {
        _controllers[slot]!.lookAt = undefined;

        if (_controllers[slot]!.kinematics) {
            _controllers[slot]!.kinematics!.angularVelocity = undefined;
            _controllers[slot]!.kinematics!.angularAcceleration = undefined;
        }

        if (_controllers[slot]!.orbit) {
            _controllers[slot]!.orbit!.faceTangent = false;
        }

        if (_controllers[slot]!.follow) {
            _controllers[slot]!.follow!.trackRotation = false;
        }
    }

    // =========================================================================
    // Transform Evaluation
    // =========================================================================

    function _getWorldPos(slot: number, out?: Vector3): Vector3 {
        return InterleavedVectors.toVector(_worldPos, slot, out ?? { x: 0, y: 0, z: 0 });
    }

    function _getWorldRot(slot: number, out?: Quaternion): Quaternion {
        return InterleavedQuaternions.toQuaternion(_worldRot, slot, out ?? { w: 1, x: 0, y: 0, z: 0 });
    }

    function _getWorldScale(slot: number, out?: Vector3): Vector3 {
        return InterleavedVectors.toVector(_worldScale, slot, out ?? { x: 1, y: 1, z: 1 });
    }

    /**
     * Ensures that the world transform at `idx` and its ancestors are up to date.
     * @param slot - The internal array index.
     */
    function _ensureWorldTransformUpdated(slot: number): void {
        if (!_isDirty(slot)) return;

        const parent = _parent[slot];

        if (parent !== INVALID_INDEX) {
            _ensureWorldTransformUpdated(parent);

            // World Scale = Parent World Scale * Local Scale
            InterleavedVectors.hadamardMultiplyToSlice(_worldScale, parent, _localScale, slot, _worldScale, slot);

            // World Rotation = Parent World Rotation * Local Rotation
            InterleavedQuaternions.multiplyToSlice(_worldRot, parent, _localRot, slot, _worldRot, slot);

            // Scaled Local Position = Local Pos * Parent World Scale
            InterleavedVectors.hadamardMultiplyToVector(_localPos, slot, _worldScale, parent, _evalScaledPos);

            // Rotate scaled local pos by parent world rotation
            InterleavedQuaternions.toQuaternion(_worldRot, parent, _evalRot);
            Quaternions.rotateVector(_evalScaledPos, _evalRot, _evalRotatedPos);

            // World Position = Parent World Position + Rotated Scaled Local Position
            InterleavedVectors.addSliceAndVectorToSlice(_worldPos, parent, _evalRotatedPos, _worldPos, slot);
        } else {
            // Root Node
            InterleavedVectors.copySlice(_localPos, _worldPos, slot);
            InterleavedQuaternions.copySlice(_localRot, _worldRot, slot);
            InterleavedVectors.copySlice(_localScale, _worldScale, slot);
        }

        _clearFlag(slot, FLAG_DIRTY);
    }

    /**
     * Computes the visual placement position of the native model accounting for pivot offset.
     * @param slot - The internal array index.
     * @param out - Target Vector3.
     * @returns The evaluated visual placement vector.
     */
    function _computeRenderPosition(slot: number, out?: Vector3): Vector3 | undefined {
        if (!_isValidSlot(slot)) return undefined;

        _ensureWorldTransformUpdated(slot);

        const target = out ?? { x: 0, y: 0, z: 0 };

        if (!_hasPivot(slot)) return InterleavedVectors.toVector(_worldPos, slot, target);

        InterleavedVectors.hadamardMultiplyToVector(_pivotOffset, slot, _worldScale, slot, _renderPivotScaled);
        InterleavedQuaternions.toQuaternion(_worldRot, slot, _renderRot);
        Quaternions.rotateVector(_renderPivotScaled, _renderRot, _renderPivotRotated);

        return InterleavedVectors.addSliceAndVectorToVector(_worldPos, slot, _renderPivotRotated, target);
    }

    function _syncNode(slot: number): void {
        if (!_isEngineTransformDirty(slot)) return;

        _clearFlag(slot, FLAG_ENGINE_TRANSFORM_DIRTY);

        const obj = _objects[slot];

        if (!obj || !mod.IsValid(obj)) return;

        _ensureWorldTransformUpdated(slot);

        _computeRenderPosition(slot, _renderPos)!;
        InterleavedQuaternions.toQuaternion(_worldRot, slot, _renderRot);

        let shouldSync = !_hasSynced(slot);

        if (!shouldSync) {
            const distSq = InterleavedVectors.sliceToVectorDistanceSquared(_lastSyncedPos, slot, _renderPos);
            const posPrec = _posPrecision[slot];
            const posThreshSq = posPrec > 0 ? posPrec * posPrec : 0;

            if (posThreshSq <= 0 ? distSq > 0 : distSq >= posThreshSq) {
                shouldSync = true;
            } else {
                if (
                    Quaternions.lengthSquared(_renderRot) >= 1e-6 ||
                    InterleavedQuaternions.lengthSquared(_lastSyncedRot, slot) >= 1e-6
                ) {
                    const dot = Math.abs(
                        InterleavedQuaternions.dotSliceAndQuaternion(_lastSyncedRot, slot, _renderRot)
                    );

                    const rotPrec = _rotPrecision[slot];

                    // For unit quaternions, |dot(q1, q2)| = cos(theta / 2).
                    // Comparing |dot| <= cos(rotPrecision / 2) checks if angular displacement theta >= rotPrecision
                    // without calling expensive transcendental Math.acos().
                    if (rotPrec <= 0 ? dot < 1 - 1e-6 : dot <= _cosHalfRotPrecision[slot]) {
                        shouldSync = true;
                    }
                }
            }
        }

        if (!shouldSync) return;

        Quaternions.toEuler(_renderRot, _renderEuler);

        try {
            mod.SetObjectTransform(
                obj,
                mod.CreateTransform(Vectors.toVector(_renderPos), Vectors.toVector(_renderEuler))
            );

            InterleavedVectors.toSlice(_renderPos, _lastSyncedPos, slot);
            InterleavedQuaternions.toSlice(_renderRot, _lastSyncedRot, slot);
            _setFlag(slot, FLAG_HAS_SYNCED);
        } catch (error: unknown) {
            logging.log('Error syncing object transform to engine', LogLevel.Error, error);
        }
    }

    function _syncInternal(slot: number): void {
        _syncNode(slot);

        for (let child = _firstChild[slot]; child !== INVALID_INDEX; child = _nextSibling[child]) {
            _syncInternal(child);
        }
    }

    function _safeHadamardDivideVectors(num: Vector3, denom: Vector3, out: Vector3, epsilon: number = 1e-6): Vector3 {
        out.x = Math.abs(denom.x) > epsilon ? num.x / denom.x : 0;
        out.y = Math.abs(denom.y) > epsilon ? num.y / denom.y : 0;
        out.z = Math.abs(denom.z) > epsilon ? num.z / denom.z : 0;

        return out;
    }

    // =========================================================================
    // Target Helpers
    // =========================================================================

    function _classifyTarget(target: unknown): TargetType {
        if (!target) return TargetType.None;

        if (typeof target === 'number') return TargetType.SpatialNodeID;

        if (target instanceof SpatialNode) return TargetType.SpatialNode;

        if (typeof target === 'object') {
            if ('getPosition' in target && typeof (target as QueryableObject).getPosition === 'function') {
                return TargetType.QueryableObject;
            }

            if ('x' in target && 'y' in target && 'z' in target) return TargetType.Vector3;
        }

        if (!mod.IsValid(target)) return TargetType.None;

        try {
            if (mod.IsType(target as mod.Player, mod.Types.Player)) return TargetType.Player;

            if (mod.IsType(target as mod.Vehicle, mod.Types.Vehicle)) return TargetType.Vehicle;

            return TargetType.TrackableObject;
        } catch {
            return TargetType.None;
        }
    }

    function _getTargetPosition(
        targetType: TargetType,
        target: TrackableObject | SpatialNode | SpatialNodeID | QueryableObject | Vector3 | undefined,
        out: Vector3
    ): Vector3 | undefined | null {
        switch (targetType) {
            case TargetType.SpatialNodeID:
                return getWorldPosition(target as SpatialNodeID, out);
            case TargetType.SpatialNode:
                return (target as SpatialNode)._id === ROOT_NODE_ID
                    ? null
                    : getWorldPosition((target as SpatialNode)._id, out);
            case TargetType.QueryableObject: {
                const pos = (target as QueryableObject).getPosition(out);
                return !pos ? null : pos === out ? out : Vectors.copy(out, pos);
            }
            case TargetType.Vector3:
                return Vectors.copy(out, target as Vector3);
            case TargetType.Vehicle: {
                return mod.IsValid(target)
                    ? Vectors.toVector3(
                          mod.GetVehicleState(target as mod.Vehicle, mod.VehicleStateVector.VehiclePosition),
                          out
                      )
                    : undefined;
            }
            case TargetType.Player:
            case TargetType.TrackableObject:
                return mod.IsValid(target)
                    ? Vectors.toVector3(mod.GetObjectPosition(target as TrackableObject), out)
                    : undefined;
            default:
                return undefined;
        }
    }

    function _getTargetRotation(
        targetType: TargetType,
        target: TrackableObject | SpatialNode | SpatialNodeID | QueryableObject | Vector3 | undefined,
        out: Quaternion
    ): Quaternion | undefined | null {
        switch (targetType) {
            case TargetType.SpatialNodeID:
                return getWorldRotation(target as SpatialNodeID, out);
            case TargetType.SpatialNode:
                return (target as SpatialNode)._id === ROOT_NODE_ID
                    ? null
                    : getWorldRotation((target as SpatialNode)._id, out);
            case TargetType.QueryableObject: {
                const q = target as QueryableObject;

                if (!q.getRotation) return null;

                Quaternions.set(_ctrlQueryRot, NaN, 0, 0, 0);

                const rot = q.getRotation(_ctrlQueryRot);

                if (!rot) return null;

                if ('w' in rot && typeof rot.w === 'number' && !isNaN(rot.w)) {
                    return rot === out ? out : Quaternions.copy(out, rot);
                }

                return Quaternions.fromEuler(rot.x, rot.y, rot.z, out);
            }
            case TargetType.Vector3:
                return null;
            case TargetType.Vehicle: {
                if (!mod.IsValid(target)) return undefined;

                const facing = mod.GetVehicleState(target as mod.Vehicle, mod.VehicleStateVector.FacingDirection);

                if (!facing) return null;

                Vectors.toVector3(facing, _ctrlFacing);

                return Quaternions.fromFacing(_ctrlFacing, out);
            }
            case TargetType.Player: {
                if (!mod.IsValid(target)) return undefined;

                const rot = mod.GetObjectRotation(target as mod.Player);

                if (!rot) return null;

                Vectors.toVector3(rot, _ctrlEuler);

                return Quaternions.fromPlayerRotation(_ctrlEuler, out);
            }
            case TargetType.TrackableObject: {
                if (!mod.IsValid(target)) return undefined;

                const rot = mod.GetObjectRotation(target as TrackableObject);

                if (!rot) return null;

                Vectors.toVector3(rot, _ctrlEuler);

                return Quaternions.fromEuler(_ctrlEuler.x, _ctrlEuler.y, _ctrlEuler.z, out);
            }
            default:
                return undefined;
        }
    }

    // =========================================================================
    // Controllers & Kinematics Update Steps
    // =========================================================================

    function _stepKinematics(slot: number, dtSeconds: number): void {
        const kin = _controllers[slot]?.kinematics;

        if (!kin) return;

        // 1. Linear Acceleration -> Linear Velocity
        if (kin.linearAcceleration) {
            if (!kin.linearVelocity) {
                kin.linearVelocity = { x: 0, y: 0, z: 0 };
            }

            Vectors.addScaled(kin.linearVelocity, kin.linearAcceleration, dtSeconds, kin.linearVelocity);
        }

        // 2. Linear Velocity -> Local Position
        if (kin.linearVelocity) {
            InterleavedVectors.addScaledVectorOntoSlice(kin.linearVelocity, dtSeconds, _localPos, slot);
            _markDirty(slot);
        }

        // 3. Angular Acceleration -> Angular Velocity
        if (kin.angularAcceleration) {
            if (!kin.angularVelocity) {
                kin.angularVelocity = { x: 0, y: 0, z: 0 };
            }

            Vectors.addScaled(kin.angularVelocity, kin.angularAcceleration, dtSeconds, kin.angularVelocity);
        }

        // 4. Angular Velocity -> Local Rotation
        if (kin.angularVelocity) {
            const angle = Vectors.length(kin.angularVelocity) * dtSeconds;

            if (angle > 0) {
                Quaternions.fromAxisAngle(kin.angularVelocity, angle, _ctrlTargetRot);

                InterleavedQuaternions.multiplySliceAndQuaternionToSlice(
                    _localRot,
                    slot,
                    _ctrlTargetRot,
                    _localRot,
                    slot
                );

                _markDirty(slot);
            }
        }
    }

    function _stepOrbit(slot: number, dtSeconds: number): void {
        const orb = _controllers[slot]?.orbit;

        if (!orb) return;

        orb.currentAngleRad += orb.speedRadPerSec * dtSeconds;

        const axis = orb.axis ?? _UP_AXIS;
        const center = orb.center ?? Vectors.ZERO;

        Quaternions.fromAxisAngle(axis, orb.currentAngleRad, _ctrlRot);
        Quaternions.rotateVector(orb.offset, _ctrlRot, _ctrlRotatedOffset);
        InterleavedVectors.addVectorsToSlice(center, _ctrlRotatedOffset, _localPos, slot);

        if (orb.faceTangent) {
            Vectors.cross(axis, _ctrlRotatedOffset, _ctrlTangentCross);

            if (Vectors.lengthSquared(_ctrlTangentCross) > 0) {
                const yaw = Math.atan2(_ctrlTangentCross.x, _ctrlTangentCross.z);
                Quaternions.fromEuler(0, yaw, 0, _ctrlRot);
                InterleavedQuaternions.toSlice(_ctrlRot, _localRot, slot);
            }
        }

        _markDirty(slot);
    }

    function _stepLookAt(slot: number): void {
        const look = _controllers[slot]?.lookAt;

        if (!look || look.targetType === TargetType.None) return;

        const targetPos = _getTargetPosition(look.targetType, look.target, _ctrlTargetPos);

        if (targetPos) {
            lookAt(_encodeId(slot), targetPos, look.upAxis);
        }
    }

    function _stepFollow(slot: number, dtMs: number): void {
        const follow = _controllers[slot]?.follow;

        if (!follow || follow.targetType === TargetType.None) return;

        const targetPos = _getTargetPosition(follow.targetType, follow.target, _ctrlTargetPos);

        if (!targetPos) return;

        const hasOrientation = follow.trackRotation
            ? Boolean(_getTargetRotation(follow.targetType, follow.target, _ctrlTargetRot))
            : false;

        if (hasOrientation && follow.yawOnly) {
            Quaternions.toEuler(_ctrlTargetRot, _ctrlEuler);
            Quaternions.fromEuler(0, _ctrlEuler.y, 0, _ctrlTargetRot);
        }

        if (follow.offset) {
            if (hasOrientation) {
                Quaternions.rotateVector(follow.offset, _ctrlTargetRot, _ctrlRotatedOffset);
                Vectors.add(targetPos, _ctrlRotatedOffset, _ctrlTargetWithOffset);
            } else {
                Vectors.add(targetPos, follow.offset, _ctrlTargetWithOffset);
            }
        } else {
            Vectors.copy(_ctrlTargetWithOffset, targetPos);
        }

        _ensureWorldTransformUpdated(slot);

        _getWorldPos(slot, _ctrlPos);

        const smoothing = follow.smoothing ?? 0;

        if (typeof smoothing === 'function') {
            smoothing(_ctrlPos, _ctrlTargetWithOffset, dtMs, _ctrlLerpedPos);
        } else if (smoothing <= 0) {
            Vectors.copy(_ctrlLerpedPos, _ctrlTargetWithOffset);
        } else {
            const factor = 1 - Math.exp((-smoothing * dtMs) / 1000);
            Vectors.lerp(_ctrlPos, _ctrlTargetWithOffset, factor, _ctrlLerpedPos);

            // Asymptotic convergence snapping: Exponential smoothing approaches the target asymptotically
            // but never reaches exact bitwise equality. Snapping when within 0.1 mm (< 1e-4 m, distanceSquared < 1e-8)
            // allows subsequent setWorldPosition calls to hit the identical-coordinate deduplication check,
            // preventing continuous scene graph dirtying (FLAG_DIRTY) when the target is stationary.
            if (Vectors.distanceSquared(_ctrlLerpedPos, _ctrlTargetWithOffset) < 1e-8) {
                Vectors.copy(_ctrlLerpedPos, _ctrlTargetWithOffset);
            }
        }

        const nodeId = _encodeId(slot);
        setWorldPosition(nodeId, _ctrlLerpedPos);

        if (follow.trackRotation && hasOrientation) {
            setWorldRotation(nodeId, _ctrlTargetRot);
        }
    }

    function _updateInternal(slot: number, dtMs: number): void {
        const dtSeconds = dtMs / 1000;

        _stepKinematics(slot, dtSeconds);
        _stepOrbit(slot, dtSeconds);
        _stepLookAt(slot);
        _stepFollow(slot, dtMs);

        for (let cSlot = _firstChild[slot]; cSlot !== INVALID_INDEX; cSlot = _nextSibling[cSlot]) {
            _updateInternal(cSlot, dtMs);
        }
    }

    // =========================================================================
    // Space Projections
    // =========================================================================

    function _localToWorldPoint(slot: number, localPoint: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);

        const target = out ?? { x: 0, y: 0, z: 0 };
        InterleavedVectors.toVector(_worldScale, slot, _projScaled);
        InterleavedQuaternions.toQuaternion(_worldRot, slot, _projRot);
        InterleavedVectors.toVector(_worldPos, slot, _projWorldPos);

        Vectors.hadamardMultiply(localPoint, _projScaled, _projScaled);
        Quaternions.rotateVector(_projScaled, _projRot, target);

        return Vectors.add(target, _projWorldPos, target);
    }

    function _worldToLocalPoint(slot: number, worldPoint: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);

        const target = out ?? { x: 0, y: 0, z: 0 };
        InterleavedVectors.toVector(_worldPos, slot, _projWorldDelta);
        InterleavedQuaternions.toQuaternion(_worldRot, slot, _projInvRot);
        InterleavedVectors.toVector(_worldScale, slot, _projScaled);

        Vectors.subtract(worldPoint, _projWorldDelta, _projWorldDelta);
        Quaternions.conjugate(_projInvRot, _projInvRot);
        Quaternions.rotateVector(_projWorldDelta, _projInvRot, target);

        return _safeHadamardDivideVectors(target, _projScaled, target);
    }

    function _localToWorldVector(slot: number, localVec: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);

        InterleavedQuaternions.toQuaternion(_worldRot, slot, _projRot);

        return Quaternions.rotateVector(localVec, _projRot, out);
    }

    function _worldToLocalVector(slot: number, worldVec: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);

        InterleavedQuaternions.toQuaternion(_worldRot, slot, _projRot);
        Quaternions.conjugate(_projRot, _projInvRot);

        return Quaternions.rotateVector(worldVec, _projInvRot, out);
    }

    // =========================================================================
    // Base SpatialNode Class & ROOT_NODE
    // =========================================================================

    /**
     * Base class representing a node in the virtual 3D spatial hierarchy.
     */
    export abstract class SpatialNode {
        public readonly _id: SpatialNodeID;

        protected constructor(id: SpatialNodeID) {
            this._id = id;
        }

        /**
         * Resolves any scene graph node by ID.
         * Returns ROOT_NODE for ID 0, the SpatialElement for element IDs, or null if deleted/invalid.
         * @param id - The SpatialNodeID.
         * @returns The SpatialNode instance (ROOT_NODE or SpatialElement), or null if deleted or invalid.
         */
        public static fromId(id: SpatialNodeID): SpatialNode | null {
            return id === ROOT_NODE_ID ? ROOT_NODE : SpatialElement.fromId(id);
        }

        /**
         * The public generation-encoded node ID.
         * @returns The node ID.
         */
        public get id(): SpatialNodeID {
            return this._id;
        }

        /**
         * Checks whether this node is currently active and alive.
         * @returns True if the node is alive, false otherwise.
         */
        public get isValid(): boolean {
            return isValid(this._id);
        }

        /**
         * Checks whether this node has been deleted.
         * @returns True if deleted, false if active, undefined if it never existed (i.e. invalid).
         */
        public get isDeleted(): boolean | undefined {
            return isDeleted(this._id);
        }

        /**
         * The parent node in the hierarchy, null for ROOT_NODE, or undefined if deleted.
         * @returns The parent node.
         */
        public get parent(): SpatialNode | null | undefined {
            if (this._id === ROOT_NODE_ID) return null;

            const parentId = getParent(this._id);

            if (parentId === undefined) return undefined;

            if (parentId === null) return null;

            return SpatialNode.fromId(parentId) ?? ROOT_NODE;
        }

        /**
         * Total number of direct child nodes.
         * @returns The child count, or undefined if deleted.
         */
        public get childCount(): number | undefined {
            return getChildCount(this._id);
        }

        /**
         * Returns a snapshot array of direct children.
         * @returns Array of direct child elements, or undefined if deleted.
         */
        public get children(): readonly SpatialElement[] | undefined {
            const childIds = getChildren(this._id);

            if (!childIds) return undefined;

            const list: SpatialElement[] = [];

            for (let i = 0; i < childIds.length; ++i) {
                const elem = SpatialElement.fromId(childIds[i]);

                if (elem) {
                    list.push(elem);
                }
            }

            return list;
        }

        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based child index.
         * @returns The child element, null if out of bounds, or undefined if deleted.
         */
        public getChild(index: number): SpatialElement | null | undefined {
            const childId = getChild(this._id, index);

            return childId === undefined ? undefined : childId === null ? null : SpatialElement.fromId(childId);
        }

        /**
         * Iterates over all direct child elements without intermediate array allocation.
         * @param callback - Function invoked for each child element.
         */
        public forEachChild(callback: (child: SpatialElement, index: number) => void): void {
            forEachChild(this._id, (childId, index) => {
                const elem = SpatialElement.fromId(childId);

                if (elem) {
                    CallbackHandler.invoke(callback, elem, index, undefined, undefined, logging, 'forEachChild');
                }
            });
        }
    }

    class RootNode extends SpatialNode {
        public constructor() {
            super(ROOT_NODE_ID);
        }

        public override get parent(): null {
            return null;
        }
    }

    /**
     * Singleton Root Node representing the global scene graph origin anchor.
     */
    export const ROOT_NODE: SpatialNode = new RootNode();

    // =========================================================================
    // SpatialElement Class (OOP Facade with SoA Storage)
    // =========================================================================

    /**
     * A 3D spatial transformable element within the scene graph.
     * Backed entirely by flat TypedArrays with zero instance fields other than `_id`.
     */
    export abstract class SpatialElement extends SpatialNode {
        protected constructor(id: SpatialNodeID) {
            super(id);
        }

        /**
         * Resolves or lazily instantiates the transformable SpatialElement facade wrapper for an active element ID.
         * @param id - The SpatialNodeID.
         * @returns The SpatialElement instance, or null if deleted, invalid, or ROOT_NODE_ID (0).
         */
        public static override fromId(id: SpatialNodeID): SpatialElement | null {
            if (id === ROOT_NODE_ID) return null;

            const slot = _resolveSlot(id);

            if (slot === INVALID_INDEX) return null;

            let inst = _instances[slot];

            if (!inst || inst._id !== id) {
                inst = new GenericElement(id);
                _instances[slot] = inst;
            }

            return inst;
        }

        // ---------------------------------------------------------------------
        // Lifecycle & Parent Mutation
        // ---------------------------------------------------------------------

        public override get parent(): SpatialNode | null | undefined {
            return super.parent;
        }

        /**
         * Sets the parent node in the hierarchy.
         * @param newParent - Target parent node instance or ID.
         */
        public override set parent(newParent: SpatialNode | SpatialNodeID) {
            this.setParent(newParent);
        }

        /**
         * Attaches this element as a child of another node.
         * @param newParent - Target parent node instance or ID.
         * @param keepWorldTransform - When true (default), preserves the element's world position, rotation, and scale by updating its local transform. When false, preserves local coordinates under the new parent.
         * @returns `this` instance for method chaining.
         */
        public setParent(newParent: SpatialNode | SpatialNodeID, keepWorldTransform: boolean = true): this {
            setParent(this._id, typeof newParent === 'number' ? newParent : newParent._id, keepWorldTransform);
            return this;
        }

        /**
         * Deletes this element and recursively tears down all descendants, unspawning native prefabs.
         */
        public delete(): void {
            deleteNode(this._id);
        }

        // ---------------------------------------------------------------------
        // Local Transforms
        // ---------------------------------------------------------------------

        /**
         * The position of the element in local parent space.
         * @returns The local position vector.
         */
        public get localPosition(): Vector3 | undefined {
            return this.getLocalPosition();
        }

        /**
         * Sets the local position of the element in parent coordinate space.
         * @param pos - The position vector.
         */
        public set localPosition(pos: Vector3) {
            this.setLocalPosition(pos);
        }

        /**
         * Retrieves the local position vector.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local position vector.
         */
        public getLocalPosition(out?: Vector3): Vector3 | undefined {
            return getLocalPosition(this._id, out);
        }

        /**
         * Sets the local position of this element in parent coordinate space.
         * @param pos - The position vector.
         * @returns `this` instance for chaining.
         */
        public setLocalPosition(pos: Vector3): this {
            setLocalPosition(this._id, pos);
            return this;
        }

        /**
         * The orientation quaternion of the element in local parent space.
         * @returns The local rotation quaternion.
         */
        public get localRotation(): Quaternion | undefined {
            return this.getLocalRotation();
        }

        /**
         * Sets the local rotation quaternion.
         * @param rot - The quaternion.
         */
        public set localRotation(rot: Quaternion) {
            this.setLocalRotation(rot);
        }

        /**
         * Retrieves the local rotation quaternion.
         * @param out - Optional target Quaternion to write into.
         * @returns The local rotation quaternion.
         */
        public getLocalRotation(out?: Quaternion): Quaternion | undefined {
            return getLocalRotation(this._id, out);
        }

        /**
         * Sets the local rotation quaternion.
         * @param rot - The quaternion.
         * @returns `this` instance for chaining.
         */
        public setLocalRotation(rot: Quaternion): this {
            setLocalRotation(this._id, rot);
            return this;
        }

        /**
         * The Euler rotation angles (in radians) in local parent space.
         * @returns The Euler angles vector.
         */
        public get localRotationEuler(): Vector3 | undefined {
            return this.getLocalRotationEuler();
        }

        /**
         * Sets the local Euler rotation angles in radians.
         * @param euler - The Euler angles vector in radians.
         */
        public set localRotationEuler(euler: Vector3) {
            this.setLocalRotationEuler(euler);
        }

        /**
         * Retrieves the local Euler rotation angles in radians.
         * @param out - Optional target Vector3 to write into.
         * @returns The Euler angles vector in radians.
         */
        public getLocalRotationEuler(out?: Vector3): Vector3 | undefined {
            return getLocalRotationEuler(this._id, out);
        }

        /**
         * Sets the local rotation using Euler angles in radians.
         * @param euler - The Euler angles vector in radians.
         * @returns `this` instance for chaining.
         */
        public setLocalRotationEuler(euler: Vector3): this {
            setLocalRotationEuler(this._id, euler);
            return this;
        }

        /**
         * The scale vector of the element in local parent space.
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @returns The local scale vector, or undefined if deleted.
         */
        public get localScale(): Vector3 | undefined {
            return this.getLocalScale();
        }

        /**
         * Sets the local scale (uniform or per-axis).
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        public set localScale(scale: Vector3 | number) {
            this.setLocalScale(scale);
        }

        /**
         * Retrieves the local scale vector.
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param out - Optional target Vector3.
         * @returns The local scale vector, or undefined if deleted.
         */
        public getLocalScale(out?: Vector3): Vector3 | undefined {
            return getLocalScale(this._id, out);
        }

        /**
         * Sets the local scale (uniform or per-axis).
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param scale - Uniform number or 3D Vector3 scale.
         * @returns `this` instance for chaining.
         */
        public setLocalScale(scale: Vector3 | number): this {
            setLocalScale(this._id, scale);
            return this;
        }

        /**
         * The model pivot offset vector.
         * @returns The model pivot offset vector, null if unset, or undefined if deleted.
         */
        public get pivotOffset(): Vector3 | null | undefined {
            return this.getPivotOffset();
        }

        /**
         * Sets the model mesh center pivot offset vector.
         * @param offset - Pivot offset vector or null/undefined to clear.
         */
        public set pivotOffset(offset: Vector3 | null | undefined) {
            this.setPivotOffset(offset);
        }

        /**
         * Retrieves the model pivot offset vector.
         * @param out - Optional target Vector3.
         * @returns The pivot offset vector, null if unset, or undefined if deleted.
         */
        public getPivotOffset(out?: Vector3): Vector3 | null | undefined {
            return getPivotOffset(this._id, out);
        }

        /**
         * Sets the model mesh center pivot offset.
         * @param offset - Pivot offset vector or null/undefined to clear.
         * @returns `this` instance for chaining.
         */
        public setPivotOffset(offset?: Vector3 | null): this {
            setPivotOffset(this._id, offset);
            return this;
        }

        // ---------------------------------------------------------------------
        // World Transforms
        // ---------------------------------------------------------------------

        /**
         * The world position of this element in global coordinate space.
         * @returns The world position vector.
         */
        public get worldPosition(): Vector3 | undefined {
            return this.getWorldPosition();
        }

        /**
         * Sets the world position, automatically computing required local coordinates under the current parent.
         * @param worldPos - Target world position.
         */
        public set worldPosition(worldPos: Vector3) {
            this.setWorldPosition(worldPos);
        }

        /**
         * Retrieves the evaluated world position of this element.
         * @param out - Optional target Vector3.
         * @returns The world position vector.
         */
        public getWorldPosition(out?: Vector3): Vector3 | undefined {
            return getWorldPosition(this._id, out);
        }

        /**
         * Sets the world position, automatically computing required local coordinates under the current parent.
         * @param worldPos - Target world position.
         * @returns `this` instance for chaining.
         */
        public setWorldPosition(worldPos: Vector3): this {
            setWorldPosition(this._id, worldPos);
            return this;
        }

        /**
         * The world orientation quaternion of this element in global space.
         * @returns The world orientation quaternion.
         */
        public get worldRotation(): Quaternion | undefined {
            return this.getWorldRotation();
        }

        /**
         * Sets the world rotation, automatically computing required local rotation under the current parent.
         * @param worldRot - Target world orientation quaternion.
         */
        public set worldRotation(worldRot: Quaternion) {
            this.setWorldRotation(worldRot);
        }

        /**
         * Retrieves the evaluated world orientation quaternion.
         * @param out - Optional target Quaternion.
         * @returns The world orientation quaternion.
         */
        public getWorldRotation(out?: Quaternion): Quaternion | undefined {
            return getWorldRotation(this._id, out);
        }

        /**
         * Sets the world rotation quaternion, automatically computing required local rotation under the current parent.
         * @param worldRot - Target world orientation quaternion.
         * @returns `this` instance for chaining.
         */
        public setWorldRotation(worldRot: Quaternion): this {
            setWorldRotation(this._id, worldRot);
            return this;
        }

        /**
         * The world Euler rotation angles in radians.
         * @returns The world Euler angles vector in radians.
         */
        public get worldRotationEuler(): Vector3 | undefined {
            return this.getWorldRotationEuler();
        }

        /**
         * Sets the world rotation using Euler angles in radians.
         * @param worldEuler - Target world Euler angles vector.
         */
        public set worldRotationEuler(worldEuler: Vector3) {
            this.setWorldRotationEuler(worldEuler);
        }

        /**
         * Retrieves the evaluated world Euler rotation angles in radians.
         * @param out - Optional target Vector3.
         * @returns The world Euler angles vector in radians.
         */
        public getWorldRotationEuler(out?: Vector3): Vector3 | undefined {
            return getWorldRotationEuler(this._id, out);
        }

        /**
         * Sets the world Euler rotation angles in radians.
         * @param worldEuler - Target world Euler angles vector.
         * @returns `this` instance for chaining.
         */
        public setWorldRotationEuler(worldEuler: Vector3): this {
            setWorldRotationEuler(this._id, worldEuler);
            return this;
        }

        /**
         * The evaluated compound world scale vector (`worldScale = parentWorldScale * localScale`).
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @returns The world scale vector, or undefined if deleted.
         */
        public get worldScale(): Vector3 | undefined {
            return this.getWorldScale();
        }

        /**
         * Sets the compound world scale (uniform or per-axis), automatically solving for required local scale under current parent (`localScale = targetWorldScale / parentWorldScale`).
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        public set worldScale(scale: Vector3 | number) {
            this.setWorldScale(scale);
        }

        /**
         * Retrieves the evaluated compound world scale vector.
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param out - Optional target Vector3.
         * @returns The world scale vector, or undefined if deleted.
         */
        public getWorldScale(out?: Vector3): Vector3 | undefined {
            return getWorldScale(this._id, out);
        }

        /**
         * Sets the compound world scale (uniform or per-axis), automatically solving for required local scale under current parent (`localScale = targetWorldScale / parentWorldScale`).
         * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
         * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
         * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
         * @param scale - Uniform number or 3D Vector3 scale.
         * @returns `this` instance for chaining.
         */
        public setWorldScale(scale: Vector3 | number): this {
            setWorldScale(this._id, scale);
            return this;
        }

        // ---------------------------------------------------------------------
        // Render Precision
        // ---------------------------------------------------------------------

        /**
         * The minimum position delta in meters before syncing to the native engine via `mod.SetObjectTransform`.
         * @returns The position render precision in meters, or undefined if deleted.
         */
        public get positionRenderPrecision(): number | undefined {
            return getPositionRenderPrecision(this._id);
        }

        /**
         * Sets the minimum position delta in meters before syncing to the native engine via `mod.SetObjectTransform`.
         * @param precision - Threshold in meters (>= 0).
         */
        public set positionRenderPrecision(precision: number) {
            setPositionRenderPrecision(this._id, precision);
        }

        /**
         * Sets the minimum position delta in meters before syncing to the native engine via `mod.SetObjectTransform`.
         * @param precision - Threshold in meters (>= 0).
         * @returns `this` instance for chaining.
         */
        public setPositionRenderPrecision(precision: number): this {
            setPositionRenderPrecision(this._id, precision);
            return this;
        }

        /**
         * The minimum rotation delta in radians before syncing to the native engine via `mod.SetObjectTransform`.
         * @returns The rotation render precision in radians, or undefined if deleted.
         */
        public get rotationRenderPrecision(): number | undefined {
            return getRotationRenderPrecision(this._id);
        }

        /**
         * Sets the minimum rotation delta in radians before syncing to the native engine via `mod.SetObjectTransform`.
         * @param precision - Threshold in radians (>= 0).
         */
        public set rotationRenderPrecision(precision: number) {
            setRotationRenderPrecision(this._id, precision);
        }

        /**
         * Sets the minimum rotation delta in radians before syncing to the native engine via `mod.SetObjectTransform`.
         * @param precision - Threshold in radians (>= 0).
         * @returns `this` instance for chaining.
         */
        public setRotationRenderPrecision(precision: number): this {
            setRotationRenderPrecision(this._id, precision);
            return this;
        }

        // ---------------------------------------------------------------------
        // Manipulations & Projections
        // ---------------------------------------------------------------------

        /**
         * Translates the element along its own rotated local axes.
         * @param delta - Translation delta vector.
         * @returns `this` instance for chaining.
         */
        public translateLocal(delta: Vector3): this {
            translateLocal(this._id, delta);
            return this;
        }

        /**
         * Translates the element in parent/world coordinate space.
         * @param delta - Translation delta vector.
         * @returns `this` instance for chaining.
         */
        public translate(delta: Vector3): this {
            translate(this._id, delta);
            return this;
        }

        /**
         * Rotates the element locally by multiplying with a delta Quaternion.
         * @param deltaRot - Delta rotation quaternion.
         * @returns `this` instance for chaining.
         */
        public rotateLocal(deltaRot: Quaternion): this {
            rotateLocal(this._id, deltaRot);
            return this;
        }

        /**
         * Rotates the element around an arbitrary axis and optional pivot center.
         * @param axis - Unit rotation axis.
         * @param angleRad - Rotation angle in radians.
         * @param pivotCenter - Optional pivot center in parent coordinates.
         * @returns `this` instance for chaining.
         */
        public rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this {
            rotateAroundAxis(this._id, axis, angleRad, pivotCenter);
            return this;
        }

        /**
         * Rotates the element to face a target point in world coordinates.
         * @param targetWorld - Target point in world space.
         * @param upAxis - Reference up axis (default: 0, 1, 0).
         * @returns `this` instance for chaining.
         */
        public lookAt(targetWorld: Vector3, upAxis?: Vector3): this {
            lookAt(this._id, targetWorld, upAxis);
            return this;
        }

        /**
         * Computes the visual placement position accounting for pivot offset.
         * @param out - Optional target Vector3.
         * @returns The render position vector.
         */
        public computeRenderPosition(out?: Vector3): Vector3 | undefined {
            return computeRenderPosition(this._id, out);
        }

        /**
         * Converts a point from local coordinates to world coordinates.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3.
         * @returns The transformed world coordinate point.
         */
        public localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 | undefined {
            return localToWorldPoint(this._id, localPoint, out);
        }

        /**
         * Converts a point from world coordinates to local coordinates.
         * @param worldPoint - Point in world coordinate space.
         * @param out - Optional target Vector3.
         * @returns The transformed local coordinate point.
         */
        public worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 | undefined {
            return worldToLocalPoint(this._id, worldPoint, out);
        }

        /**
         * Converts a direction vector from local orientation to world orientation.
         * @param localVec - Vector in local frame.
         * @param out - Optional target Vector3.
         * @returns The transformed world frame vector.
         */
        public localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 | undefined {
            return localToWorldVector(this._id, localVec, out);
        }

        /**
         * Converts a direction vector from world orientation to local orientation.
         * @param worldVec - Vector in world frame.
         * @param out - Optional target Vector3.
         * @returns The transformed local frame vector.
         */
        public worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 | undefined {
            return worldToLocalVector(this._id, worldVec, out);
        }

        /**
         * Evaluates the compound world-space linear velocity vector at this node's current position,
         * aggregating linear kinematics, orbital translation, and parent angular/orbital tangential velocities
         * (omega x r) across its ancestor hierarchy.
         * @returns The evaluated world-space linear velocity vector in meters per second, or undefined if deleted.
         */
        public get linearVelocity(): Vector3 | undefined {
            return this.getLinearVelocity();
        }

        /**
         * Evaluates the compound world-space angular velocity vector for this node,
         * aggregating angular kinematics and orbital rotation across its ancestor hierarchy.
         * @returns The evaluated world-space angular velocity vector in radians per second, or undefined if deleted.
         */
        public get angularVelocity(): Vector3 | undefined {
            return this.getAngularVelocity();
        }

        /**
         * Evaluates the compound world-space linear velocity vector at this node's current position,
         * aggregating linear kinematics, orbital translation, and parent angular/orbital tangential velocities
         * (omega x r) across its ancestor hierarchy.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world-space linear velocity vector in meters per second, or undefined if deleted.
         */
        public getLinearVelocity(out?: Vector3): Vector3 | undefined {
            return getLinearVelocity(this._id, out);
        }

        /**
         * Evaluates the compound world-space angular velocity vector for this node,
         * aggregating angular kinematics and orbital rotation across its ancestor hierarchy.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world-space angular velocity vector in radians per second, or undefined if deleted.
         */
        public getAngularVelocity(out?: Vector3): Vector3 | undefined {
            return getAngularVelocity(this._id, out);
        }

        /**
         * Configures continuous orbital rotation motion around an axis.
         * @param options - Orbital rotation parameters, or null to clear.
         * @returns `this` instance for chaining.
         */
        public setOrbit(options?: OrbitOptions | null): this {
            setOrbit(this._id, options);
            return this;
        }

        /**
         * Configures continuous LookAt target tracking.
         * @param options - LookAt configuration, or null to clear.
         * @returns `this` instance for chaining.
         */
        public setLookAt(options?: LookAtOptions | null): this {
            setLookAt(this._id, options);
            return this;
        }

        /**
         * Configures continuous following behavior toward a target object or position.
         * @param options - Follow options, or null to clear.
         * @returns `this` instance for chaining.
         */
        public setFollow(options?: FollowOptions | null): this {
            setFollow(this._id, options);
            return this;
        }

        /**
         * Configures kinematic velocity and acceleration simulation.
         * @param options - Kinematics options, or null to clear.
         * @returns `this` instance for chaining.
         */
        public setKinematics(options?: KinematicsOptions | null): this {
            setKinematics(this._id, options);
            return this;
        }
    }

    class GenericElement extends SpatialElement {
        public constructor(id: SpatialNodeID) {
            super(id);
        }
    }

    // =========================================================================
    // Public Constructable Subclasses
    // =========================================================================

    /**
     * An empty virtual spatial group or anchor node.
     */
    export class Empty extends SpatialElement {
        public constructor(params?: EmptyParams) {
            const id = createEmptyId(params);

            if (id === null) {
                super(INVALID_NODE_ID);
                return;
            }

            super(id);

            _instances[_resolveSlot(id)] = this;
        }
    }

    /**
     * A dynamically spawned runtime prefab object node.
     */
    export class Runtime extends SpatialElement {
        public constructor(params: RuntimeParams) {
            const id = createRuntimeId(params);

            if (id === null) {
                super(INVALID_NODE_ID);
                return;
            }

            super(id);

            _instances[_resolveSlot(id)] = this;
        }
    }

    /**
     * A wrapper element for an existing native in-game transformable object.
     */
    export class Existing extends SpatialElement {
        public constructor(params: ExistingParams) {
            const id = createExistingId(params);

            if (id === null) {
                super(INVALID_NODE_ID);
                return;
            }

            super(id);

            _instances[_resolveSlot(id)] = this;
        }
    }

    // =========================================================================
    // Module-Level Static Functions & Raw ID Bypass API
    // =========================================================================

    /**
     * Resolves or lazily instantiates the OOP facade wrapper for an active node ID.
     * @param id - The SpatialNodeID.
     * @returns The SpatialElement instance, or null if deleted or ROOT_NODE_ID.
     */
    export function fromId(id: SpatialNodeID): SpatialElement | null {
        return SpatialElement.fromId(id);
    }

    /**
     * Deletes an active node by its SpatialNode instance or raw ID.
     * @param target - The node instance or ID to delete.
     */
    export function deleteNode(target: SpatialNode | SpatialNodeID): void {
        const slot = _resolveNodeSlotAndLogWarning(target);

        if (slot !== INVALID_INDEX) {
            _deleteRecursiveSlot(slot);
        }
    }

    /**
     * Returns the total count of active elements in the scene graph.
     * @returns Total active nodes count.
     */
    export function getActiveNodeCount(): number {
        return _activeNodeCount;
    }

    /**
     * Evaluates dirty node hierarchies top-down and synchronizes transformed native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void {
        for (let root = _firstRoot; root !== INVALID_INDEX; root = _nextSibling[root]) {
            _syncInternal(root);
        }
    }

    Events.OngoingGlobal.subscribe(_tick);

    function _tick(): void {
        const now = Date.now();
        const dtMs = _lastUpdateTime > 0 && now >= _lastUpdateTime ? now - _lastUpdateTime : 33.33;
        _lastUpdateTime = now;

        if (_activeNodeCount === 0 || dtMs <= 0) return;

        const dt = Math.min(dtMs, 100);

        for (let root = _firstRoot; root !== INVALID_INDEX; root = _nextSibling[root]) {
            _updateInternal(root, dt);
        }
    }

    // -------------------------------------------------------------------------
    // Raw ID-First Creation Bypasses (0 Heap Object Allocations)
    // -------------------------------------------------------------------------

    /**
     * Creates an empty virtual node returning only its primitive integer ID without allocating a class instance.
     * @param params - Optional node initialization parameters.
     * @returns The SpatialNodeID, or null if the pool is full.
     */
    export function createEmptyId(params?: EmptyParams): SpatialNodeID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params?.parent), params);

        return _encodeId(slot);
    }

    /**
     * Spawns a runtime prefab object node returning only its primitive integer ID without allocating a class instance.
     * @param params - Runtime prefab initialization parameters.
     * @returns The SpatialNodeID, or null if spawning failed or pool is full.
     */
    export function createRuntimeId(params: RuntimeParams): SpatialNodeID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params.parent), params);

        _ensureWorldTransformUpdated(slot);

        _computeRenderPosition(slot, _renderPos)!;
        Quaternions.toEuler(_getWorldRot(slot, _renderRot), _renderEuler);

        const spawnScale = params.spawnScale ?? 1;

        const scaleVec =
            typeof spawnScale === 'number'
                ? mod.CreateVector(spawnScale, spawnScale, spawnScale)
                : mod.CreateVector(spawnScale.x, spawnScale.y, spawnScale.z);

        try {
            const spawned = mod.SpawnObject(
                params.prefab,
                Vectors.toVector(_renderPos),
                Vectors.toVector(_renderEuler),
                scaleVec
            );

            if (!mod.IsValid(spawned)) {
                _deleteRecursiveSlot(slot);
                logging.log('Create runtime ID failed, failed to spawn prefab', LogLevel.Error);

                return null;
            }

            _objects[slot] = spawned as TransformableObject;
            _setFlag(slot, FLAG_RUNTIME_SPAWNED);

            return _encodeId(slot);
        } catch (error: unknown) {
            _deleteRecursiveSlot(slot);
            logging.log('Create runtime ID failed, spawn threw exception', LogLevel.Error, error);

            return null;
        }
    }

    /**
     * Wraps an existing native object returning only its primitive integer ID without allocating a class instance.
     * @param params - Existing object initialization parameters.
     * @returns The SpatialNodeID, or null if the pool is full.
     */
    export function createExistingId(params: ExistingParams): SpatialNodeID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _objects[slot] = params.object;
        _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params.parent), params);

        return _encodeId(slot);
    }

    // -------------------------------------------------------------------------
    // Raw ID Functional Transformations & Queries
    // -------------------------------------------------------------------------

    /**
     * Gets the local position of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The local position vector, or undefined if deleted.
     */
    export function getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX
            ? undefined
            : InterleavedVectors.toVector(_localPos, slot, out ?? { x: 0, y: 0, z: 0 });
    }

    /**
     * Sets the local position of a node by ID.
     * @param id - The node ID.
     * @param pos - The position vector.
     */
    export function setLocalPosition(id: SpatialNodeID, pos: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (InterleavedVectors.equalsVector(_localPos, slot, pos)) return;

        InterleavedVectors.toSlice(pos, _localPos, slot);
        _markDirty(slot);
    }

    function _getLocalRot(slot: number, out?: Quaternion): Quaternion {
        return InterleavedQuaternions.toQuaternion(_localRot, slot, out ?? { w: 1, x: 0, y: 0, z: 0 });
    }

    /**
     * Gets the local rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Quaternion to write into.
     * @returns The local rotation quaternion, or undefined if deleted.
     */
    export function getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX ? undefined : _getLocalRot(slot, out);
    }

    /**
     * Sets the local rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param rot - The quaternion.
     */
    export function setLocalRotation(id: SpatialNodeID, rot: Quaternion): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (InterleavedQuaternions.equalsQuaternion(_localRot, slot, rot)) return;

        InterleavedQuaternions.toSlice(rot, _localRot, slot);
        _markDirty(slot);
    }

    /**
     * Gets the local Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The Euler angles vector in radians, or undefined if deleted.
     */
    export function getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX ? undefined : Quaternions.toEuler(_getLocalRot(slot, _transRot), out);
    }

    /**
     * Sets the local Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param euler - Target local Euler angles vector in radians.
     */
    export function setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void {
        Quaternions.fromEuler(euler.x, euler.y, euler.z, _transRot);
        setLocalRotation(id, _transRot);
    }

    /**
     * Gets the local scale vector of a node by ID.
     * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
     * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
     * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The local scale vector, or undefined if deleted.
     */
    export function getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX
            ? undefined
            : InterleavedVectors.toVector(_localScale, slot, out ?? { x: 1, y: 1, z: 1 });
    }

    /**
     * Sets the local scale (uniform or per-axis) of a node by ID.
     * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
     * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
     * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
     * @param id - The node ID.
     * @param scale - Uniform number or 3D Vector3 scale.
     */
    export function setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (typeof scale === 'number') {
            const sIdx3 = slot * 3;

            if (_localScale[sIdx3] === scale && _localScale[sIdx3 + 1] === scale && _localScale[sIdx3 + 2] === scale) {
                return;
            }

            InterleavedVectors.setSlice(_localScale, slot, scale);
        } else {
            if (InterleavedVectors.equalsVector(_localScale, slot, scale)) return;

            InterleavedVectors.toSlice(scale, _localScale, slot);
        }

        _markDirty(slot);
    }

    /**
     * Gets the evaluated world position of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world position vector, or undefined if deleted.
     */
    export function getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(slot);

        return _getWorldPos(slot, out);
    }

    /**
     * Sets the world position of a node by ID.
     * @param id - The node ID.
     * @param worldPos - Target world position vector.
     */
    export function setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        const parent = _parent[slot];

        if (parent === INVALID_INDEX) {
            setLocalPosition(id, worldPos);
            return;
        }

        _worldToLocalPoint(parent, worldPos, _transPos);
        setLocalPosition(id, _transPos);
    }

    /**
     * Gets the evaluated world rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Quaternion to write into.
     * @returns The world rotation quaternion, or undefined if deleted.
     */
    export function getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(slot);

        return _getWorldRot(slot, out);
    }

    /**
     * Sets the world rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param worldRot - Target world orientation quaternion.
     */
    export function setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        const parent = _parent[slot];

        if (parent === INVALID_INDEX) {
            setLocalRotation(id, worldRot);
            return;
        }

        _ensureWorldTransformUpdated(parent);

        _getWorldRot(parent, _transInvRot);
        Quaternions.conjugate(_transInvRot, _transInvRot);
        Quaternions.multiply(_transInvRot, worldRot, _transInvRot);
        setLocalRotation(id, _transInvRot);
    }

    /**
     * Gets the evaluated world Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world Euler angles vector in radians, or undefined if deleted.
     */
    export function getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(slot);

        _getWorldRot(slot, _transRot);

        return Quaternions.toEuler(_transRot, out);
    }

    /**
     * Sets the world Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param worldEuler - Target world Euler angles vector in radians.
     */
    export function setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void {
        Quaternions.fromEuler(worldEuler.x, worldEuler.y, worldEuler.z, _transRot);
        setWorldRotation(id, _transRot);
    }

    /**
     * Gets the evaluated compound world scale vector of a node by ID (`worldScale = parentWorldScale * localScale`).
     * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
     * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
     * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world scale vector, or undefined if deleted.
     */
    export function getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(slot);

        return _getWorldScale(slot, out);
    }

    /**
     * Sets the compound world scale (uniform or per-axis) of a node by ID, automatically solving for required local scale under current parent (`localScale = targetWorldScale / parentWorldScale`).
     * Scales the spatial translation offsets of all direct children in world space (`worldPos = parentPos + parentRot * (childPos * parentScale)`).
     * Note: Modifying scale at runtime dynamically updates hierarchical child positions and space projections, but does not alter
     * the visual draw mesh scale of already spawned native engine objects (which is immutable after spawn; see `spawnScale` on `RuntimeParams`).
     * @param id - The node ID.
     * @param worldScale - Uniform number or 3D Vector3 scale.
     */
    export function setWorldScale(id: SpatialNodeID, worldScale: Vector3 | number): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        const parent = _parent[slot];

        if (parent === INVALID_INDEX) {
            setLocalScale(id, worldScale);
            return;
        }

        _ensureWorldTransformUpdated(parent);

        if (typeof worldScale === 'number') {
            Vectors.set(_transScale, worldScale, worldScale, worldScale);
        } else {
            Vectors.set(_transScale, worldScale.x, worldScale.y, worldScale.z);
        }

        InterleavedVectors.safeHadamardDivideVectorBySliceToVector(_transScale, _worldScale, parent, _transScale);

        setLocalScale(id, _transScale);
    }

    /**
     * Gets the model pivot offset vector of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The model pivot offset vector, null if unset, or undefined if deleted.
     */
    export function getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | null | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        if (!_hasPivot(slot)) return null;

        return InterleavedVectors.toVector(_pivotOffset, slot, out ?? { x: 0, y: 0, z: 0 });
    }

    /**
     * Sets the model pivot offset vector of a node by ID.
     * @param id - The node ID.
     * @param offset - Pivot offset vector or null/undefined to clear.
     */
    export function setPivotOffset(id: SpatialNodeID, offset?: Vector3 | null): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (offset) {
            if (_hasFlag(slot, FLAG_HAS_PIVOT) && InterleavedVectors.equalsVector(_pivotOffset, slot, offset)) return;

            InterleavedVectors.toSlice(offset, _pivotOffset, slot);
            _setFlag(slot, FLAG_HAS_PIVOT);
        } else {
            if (!_hasFlag(slot, FLAG_HAS_PIVOT)) return;

            InterleavedVectors.setSlice(_pivotOffset, slot, 0);
            _clearFlag(slot, FLAG_HAS_PIVOT);
        }

        _setFlag(slot, FLAG_ENGINE_TRANSFORM_DIRTY);
    }

    /**
     * Gets the minimum position delta in meters before syncing to the native engine for a node by ID.
     * @param id - The node ID.
     * @returns The position render precision in meters, or undefined if deleted.
     */
    export function getPositionRenderPrecision(id: SpatialNodeID): number | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX ? undefined : _posPrecision[slot];
    }

    /**
     * Sets the minimum position delta in meters before syncing to the native engine for a node by ID.
     * @param id - The node ID.
     * @param precision - Threshold in meters (>= 0).
     */
    export function setPositionRenderPrecision(id: SpatialNodeID, precision: number): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _posPrecision[slot] = precision;
    }

    /**
     * Gets the minimum rotation delta in radians before syncing to the native engine for a node by ID.
     * @param id - The node ID.
     * @returns The rotation render precision in radians, or undefined if deleted.
     */
    export function getRotationRenderPrecision(id: SpatialNodeID): number | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX ? undefined : _rotPrecision[slot];
    }

    /**
     * Sets the minimum rotation delta in radians before syncing to the native engine for a node by ID.
     * @param id - The node ID.
     * @param precision - Threshold in radians (>= 0).
     */
    export function setRotationRenderPrecision(id: SpatialNodeID, precision: number): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _rotPrecision[slot] = precision;
        _cosHalfRotPrecision[slot] = precision > 0 ? Math.cos(precision / 2) : 1;
    }

    // =========================================================================
    // Raw ID Node Transformations
    // =========================================================================

    /**
     * Translates a node along its own rotated local axes.
     * @param id - The node ID.
     * @param delta - Translation delta vector.
     */
    export function translateLocal(id: SpatialNodeID, delta: Vector3): void {
        if (Vectors.isZero(delta)) return;

        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        InterleavedQuaternions.toQuaternion(_localRot, slot, _transRot);
        Quaternions.rotateVector(delta, _transRot, _transDeltaPos);
        InterleavedVectors.addSliceAndVectorToSlice(_localPos, slot, _transDeltaPos, _localPos, slot);
        _markDirty(slot);
    }

    /**
     * Translates a node in parent/world coordinate space.
     * @param id - The node ID.
     * @param delta - Translation delta vector.
     */
    export function translate(id: SpatialNodeID, delta: Vector3): void {
        if (Vectors.isZero(delta)) return;

        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        InterleavedVectors.addSliceAndVectorToSlice(_localPos, slot, delta, _localPos, slot);
        _markDirty(slot);
    }

    /**
     * Rotates a node locally by multiplying with a delta Quaternion.
     * @param id - The node ID.
     * @param deltaRot - Delta rotation quaternion.
     */
    export function rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        InterleavedQuaternions.toQuaternion(_localRot, slot, _transRot);
        Quaternions.multiply(_transRot, deltaRot, _transRot);
        InterleavedQuaternions.toSlice(_transRot, _localRot, slot);
        _markDirty(slot);
    }

    /**
     * Rotates a node around an arbitrary axis and optional pivot center.
     * @param id - The node ID.
     * @param axis - Unit rotation axis.
     * @param angleRad - Rotation angle in radians.
     * @param pivotCenter - Optional pivot center in parent coordinates.
     */
    export function rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        Quaternions.fromAxisAngle(axis, angleRad, _transAxisRot);

        if (pivotCenter) {
            InterleavedVectors.toVector(_localPos, slot, _transDeltaPos);
            Vectors.subtract(_transDeltaPos, pivotCenter, _transDeltaPos);
            Quaternions.rotateVector(_transDeltaPos, _transAxisRot, _transPos);
            InterleavedVectors.addVectorsToSlice(_transPos, pivotCenter, _localPos, slot);
        }

        InterleavedQuaternions.multiplyQuaternionAndSliceToSlice(_transAxisRot, _localRot, slot, _localRot, slot);
        _markDirty(slot);
    }

    /**
     * Rotates a node to face a target point in world coordinates.
     * @param id - The node ID.
     * @param targetWorld - Target point in world space.
     * @param upAxis - Reference up axis (default: 0, 1, 0).
     */
    export function lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _ensureWorldTransformUpdated(slot);

        InterleavedVectors.toVector(_worldPos, slot, _transDeltaPos);
        Vectors.subtract(targetWorld, _transDeltaPos, _transDeltaPos);
        Quaternions.fromLookRotation(_transDeltaPos, upAxis ?? _UP_AXIS, _transRot);
        setWorldRotation(id, _transRot);
    }

    /**
     * Sets the parent of a node by raw ID.
     * @param childId - Child node ID.
     * @param parentId - Target parent node ID.
     * @param keepWorldTransform - When true (default), preserves the node's world position, rotation, and scale by updating its local transform. When false, preserves local coordinates under the new parent.
     */
    export function setParent(
        childId: SpatialNodeID,
        parentId: SpatialNodeID,
        keepWorldTransform: boolean = true
    ): void {
        const childSlot = _resolveSlotAndLogWarning(childId);

        if (childSlot === INVALID_INDEX) return;

        const parentSlot = parentId === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlotAndLogWarning(parentId);

        if (parentId !== ROOT_NODE_ID && parentSlot === INVALID_INDEX) return;

        if (childSlot === parentSlot) return;

        if (parentSlot !== INVALID_INDEX) {
            let ancestor = parentSlot;

            while (ancestor !== INVALID_INDEX) {
                if (ancestor === childSlot) {
                    logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                    return;
                }

                ancestor = _parent[ancestor];
            }
        }

        const currParent = _parent[childSlot];

        if (currParent === parentSlot) return;

        if (keepWorldTransform) {
            _ensureWorldTransformUpdated(childSlot);

            if (parentSlot === INVALID_INDEX) {
                InterleavedVectors.toVector(_worldPos, childSlot, _transPos);
                InterleavedQuaternions.toQuaternion(_worldRot, childSlot, _transRot);
                InterleavedVectors.toVector(_worldScale, childSlot, _transScale);
            } else {
                _ensureWorldTransformUpdated(parentSlot);

                InterleavedVectors.toVector(_worldScale, childSlot, _transScale);

                InterleavedVectors.safeHadamardDivideVectorBySliceToVector(
                    _transScale,
                    _worldScale,
                    parentSlot,
                    _transScale
                );

                InterleavedQuaternions.toQuaternion(_worldRot, childSlot, _transRot);
                InterleavedQuaternions.toQuaternion(_worldRot, parentSlot, _transInvRot);
                Quaternions.conjugate(_transInvRot, _transInvRot);
                Quaternions.multiply(_transInvRot, _transRot, _transRot);
                InterleavedVectors.toVector(_worldPos, childSlot, _transDeltaPos);
                _worldToLocalPoint(parentSlot, _transDeltaPos, _transPos);
            }

            InterleavedVectors.toSlice(_transPos, _localPos, childSlot);
            InterleavedQuaternions.toSlice(_transRot, _localRot, childSlot);
            InterleavedVectors.toSlice(_transScale, _localScale, childSlot);
        }

        _detachChild(currParent, childSlot);
        _attachChild(parentSlot, childSlot);

        if (parentSlot !== INVALID_INDEX) {
            const ctrl = _controllers[childSlot];

            if (ctrl?.follow) {
                ctrl.follow = undefined;
            }
        }

        _markDirty(childSlot);
    }

    /**
     * Gets the parent ID of a node by ID.
     * @param id - The node ID.
     * @returns Parent node ID, null for ROOT_NODE, or undefined if deleted.
     */
    export function getParent(id: SpatialNodeID): SpatialNodeID | null | undefined {
        if (id === ROOT_NODE_ID) return null;

        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        const parentSlot = _parent[slot];

        return parentSlot === INVALID_INDEX ? ROOT_NODE_ID : _encodeId(parentSlot);
    }

    /**
     * Gets the number of direct children for a node by ID.
     * @param id - The node ID.
     * @returns Direct child count, or undefined if deleted.
     */
    export function getChildCount(id: SpatialNodeID): number | undefined {
        const slot = id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlot(id);

        if (id !== ROOT_NODE_ID && slot === INVALID_INDEX) return undefined;

        let count = 0;

        for (
            let child = id === ROOT_NODE_ID ? _firstRoot : _firstChild[slot];
            child !== INVALID_INDEX;
            child = _nextSibling[child]
        ) {
            count++;
        }

        return count;
    }

    /**
     * Gets an array of direct child IDs for a node by ID.
     * @param id - The node ID.
     * @returns Array of child IDs, or undefined if deleted.
     */
    export function getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined {
        const slot = id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlot(id);

        if (id !== ROOT_NODE_ID && slot === INVALID_INDEX) return undefined;

        const list: SpatialNodeID[] = [];

        for (
            let child = id === ROOT_NODE_ID ? _firstRoot : _firstChild[slot];
            child !== INVALID_INDEX;
            child = _nextSibling[child]
        ) {
            list.push(_encodeId(child));
        }

        return list;
    }

    /**
     * Gets the direct child node ID at a specific index.
     * @param id - The parent node ID.
     * @param index - Zero-based child index.
     * @returns The child node ID, null if out of bounds, or undefined if deleted.
     */
    export function getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined {
        if (index < 0) return null;

        const slot = id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlot(id);

        if (id !== ROOT_NODE_ID && slot === INVALID_INDEX) return undefined;

        let currentIndex = 0;

        for (
            let curr = id === ROOT_NODE_ID ? _firstRoot : _firstChild[slot];
            curr !== INVALID_INDEX;
            curr = _nextSibling[curr]
        ) {
            if (currentIndex === index) return _encodeId(curr);

            currentIndex++;
        }

        return null;
    }

    /**
     * Iterates over all direct child node IDs of a node without array allocation.
     * @param id - The parent node ID.
     * @param callback - Callback invoked for each child node ID.
     */
    export function forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void {
        const slot = id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlotAndLogWarning(id);

        if (id !== ROOT_NODE_ID && slot === INVALID_INDEX) return;

        let currentIndex = 0;

        for (let curr = id === ROOT_NODE_ID ? _firstRoot : _firstChild[slot]; curr !== INVALID_INDEX; ) {
            const next = _nextSibling[curr];

            CallbackHandler.invoke(
                callback,
                _encodeId(curr),
                currentIndex++,
                undefined,
                undefined,
                logging,
                'forEachChild'
            );

            curr = next;
        }
    }

    /**
     * Evaluates and updates cached world transform arrays for a node and all ancestors if dirty.
     * @param id - The node ID.
     */
    export function ensureWorldTransformUpdated(id: SpatialNodeID): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _ensureWorldTransformUpdated(slot);
    }

    /**
     * Computes the visual placement position of a node accounting for pivot offset.
     * @param id - The node ID.
     * @param out - Optional target Vector3.
     * @returns The render position vector, or undefined if deleted.
     */
    export function computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _computeRenderPosition(slot, out);
    }

    /**
     * Converts a point from local coordinates to world coordinates for a node by ID.
     * @param id - The node ID.
     * @param localPoint - Point in local coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed world coordinate point, or undefined if deleted.
     */
    export function localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _localToWorldPoint(slot, localPoint, out);
    }

    /**
     * Converts a point from world coordinates to local coordinates for a node by ID.
     * @param id - The node ID.
     * @param worldPoint - Point in world coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed local coordinate point, or undefined if deleted.
     */
    export function worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _worldToLocalPoint(slot, worldPoint, out);
    }

    /**
     * Converts a direction vector from local orientation to world orientation for a node by ID.
     * @param id - The node ID.
     * @param localVec - Vector in local frame.
     * @param out - Optional target Vector3.
     * @returns The transformed world frame vector, or undefined if deleted.
     */
    export function localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _localToWorldVector(slot, localVec, out);
    }

    /**
     * Converts a direction vector from world orientation to local orientation for a node by ID.
     * @param id - The node ID.
     * @param worldVec - Vector in world frame.
     * @param out - Optional target Vector3.
     * @returns The transformed local frame vector, or undefined if deleted.
     */
    export function worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _worldToLocalVector(slot, worldVec, out);
    }

    /**
     * Configures continuous orbital rotation motion around an axis for a node by ID.
     * @param id - The node ID.
     * @param options - Orbital rotation parameters, or null to clear.
     */
    export function setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (!options) {
            if (_controllers[slot]) {
                _controllers[slot]!.orbit = undefined;
            }

            return;
        }

        if (!_controllers[slot]) {
            _controllers[slot] = {};
        }

        const offset = InterleavedVectors.subtractVectorFromSliceToVector(
            _localPos,
            slot,
            options.center ?? Vectors.ZERO,
            {
                x: 0,
                y: 0,
                z: 0,
            }
        );

        _clearPositionControllerConfigs(slot);

        if (options.faceTangent) {
            _clearRotationControllerConfigs(slot);
        }

        _controllers[slot]!.orbit = {
            ...options,
            currentAngleRad: 0,
            offset: offset,
        };
    }

    /**
     * Configures continuous LookAt target tracking for a node by ID.
     * @param id - The node ID.
     * @param options - LookAt configuration, or null to clear.
     */
    export function setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (!options) {
            if (_controllers[slot]) {
                _controllers[slot]!.lookAt = undefined;
            }

            return;
        }

        if (!_controllers[slot]) {
            _controllers[slot] = {};
        }

        _clearRotationControllerConfigs(slot);

        _controllers[slot]!.lookAt = {
            ...options,
            targetType: _classifyTarget(options.target),
        };
    }

    /**
     * Configures continuous following behavior toward a target object or position for a node by ID.
     * @param id - The node ID.
     * @param options - Follow options, or null to clear.
     */
    export function setFollow(id: SpatialNodeID, options?: FollowOptions | null): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (!options) {
            if (_controllers[slot]) {
                _controllers[slot]!.follow = undefined;
            }

            return;
        }

        if (!_controllers[slot]) {
            _controllers[slot] = {};
        }

        setParent(id, ROOT_NODE_ID);

        _clearPositionControllerConfigs(slot);

        if (options.trackRotation) {
            _clearRotationControllerConfigs(slot);
        }

        _controllers[slot]!.follow = {
            ...options,
            targetType: _classifyTarget(options.target),
        };
    }

    /**
     * Configures kinematic velocity and acceleration simulation for a node by ID.
     * @param id - The node ID.
     * @param options - Kinematics options, or null to clear.
     */
    export function setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (!options) {
            if (_controllers[slot]) {
                _controllers[slot]!.kinematics = undefined;
            }

            return;
        }

        if (!_controllers[slot]) {
            _controllers[slot] = {};
        }

        if (options.linearVelocity || options.linearAcceleration) {
            _clearPositionControllerConfigs(slot);
        }

        if (options.angularVelocity || options.angularAcceleration) {
            _clearRotationControllerConfigs(slot);
        }

        _controllers[slot]!.kinematics = { ...options };
    }

    // =========================================================================
    // Spatial Velocity Evaluation
    // =========================================================================

    /**
     * Accumulates kinematic linear velocity and ancestor rotational tangential velocity into an accumulator vector.
     * @param slot - The buffer slot index of the node being evaluated.
     * @param isTarget - Whether the node is the target node whose compound velocity is being evaluated.
     * @param targetWorldPos - World-space position of the target node.
     * @param parentWorldRot - World-space rotation of the node's parent.
     * @param accumulator - The accumulated world-space linear velocity vector to write into.
     */
    function _accumulateKinematicsLinearVelocity(
        slot: number,
        isTarget: boolean,
        targetWorldPos: Vector3,
        parentWorldRot: Quaternion,
        accumulator: Vector3
    ): void {
        const kin = _controllers[slot]?.kinematics;

        if (!kin) return;

        // Linear Velocity (defined in parent space)
        if (kin.linearVelocity && !Vectors.isZero(kin.linearVelocity)) {
            Quaternions.rotateVector(kin.linearVelocity, parentWorldRot, _svLinVelWorld);
            Vectors.add(accumulator, _svLinVelWorld, accumulator);
        }

        // Angular Velocity inducing tangential velocity on descendants (only for ancestors)
        if (!isTarget && kin.angularVelocity && !Vectors.isZero(kin.angularVelocity)) {
            _getWorldRot(slot, _svNodeWorldRot);
            _getWorldPos(slot, _svNodeWorldPos);

            Quaternions.rotateVector(kin.angularVelocity, _svNodeWorldRot, _svAngVelWorld);
            Vectors.subtract(targetWorldPos, _svNodeWorldPos, _svLeverArm);
            Vectors.cross(_svAngVelWorld, _svLeverArm, _svTangentialVel);
            Vectors.add(accumulator, _svTangentialVel, accumulator);
        }
    }

    /**
     * Accumulates orbital tangential linear velocity into an accumulator vector.
     * @param slot - The buffer slot index of the node being evaluated.
     * @param targetWorldPos - World-space position of the target node.
     * @param parentWorldPos - World-space position of the node's parent.
     * @param parentWorldRot - World-space rotation of the node's parent.
     * @param accumulator - The accumulated world-space linear velocity vector to write into.
     */
    function _accumulateOrbitLinearVelocity(
        slot: number,
        targetWorldPos: Vector3,
        parentWorldPos: Vector3,
        parentWorldRot: Quaternion,
        accumulator: Vector3
    ): void {
        const orb = _controllers[slot]?.orbit;

        if (!orb || orb.speedRadPerSec === 0) return;

        Vectors.multiply(orb.axis ?? _UP_AXIS, orb.speedRadPerSec, _svScratchVec);
        Quaternions.rotateVector(_svScratchVec, parentWorldRot, _svAngVelWorld);

        // Compute world orbit center: parentWorldPos + parentWorldRot * (orb.center ?? 0)
        if (orb.center) {
            Quaternions.rotateVector(orb.center, parentWorldRot, _svOrbitCenterWorld);
            Vectors.add(parentWorldPos, _svOrbitCenterWorld, _svOrbitCenterWorld);
        } else {
            Vectors.copy(_svOrbitCenterWorld, parentWorldPos);
        }

        // Linear velocity contribution at target: omega_orbit x (P_target - C_orbit)
        Vectors.subtract(targetWorldPos, _svOrbitCenterWorld, _svLeverArm);
        Vectors.cross(_svAngVelWorld, _svLeverArm, _svTangentialVel);
        Vectors.add(accumulator, _svTangentialVel, accumulator);
    }

    /**
     * Accumulates kinematic body angular velocity into an accumulator vector.
     * @param slot - The buffer slot index of the node being evaluated.
     * @param accumulator - The accumulated world-space angular velocity vector to write into.
     */
    function _accumulateKinematicsAngularVelocity(slot: number, accumulator: Vector3): void {
        const kin = _controllers[slot]?.kinematics;

        if (!kin?.angularVelocity || Vectors.isZero(kin.angularVelocity)) return;

        _getWorldRot(slot, _svNodeWorldRot);
        Quaternions.rotateVector(kin.angularVelocity, _svNodeWorldRot, _svAngVelWorld);
        Vectors.add(accumulator, _svAngVelWorld, accumulator);
    }

    /**
     * Accumulates orbital angular velocity (subtree revolution for ancestors or body spin for target) into an accumulator vector.
     * @param slot - The buffer slot index of the node being evaluated.
     * @param isTarget - Whether the node is the target node whose compound velocity is being evaluated.
     * @param parentWorldRot - World-space rotation of the node's parent.
     * @param accumulator - The accumulated world-space angular velocity vector to write into.
     */
    function _accumulateOrbitAngularVelocity(
        slot: number,
        isTarget: boolean,
        parentWorldRot: Quaternion,
        accumulator: Vector3
    ): void {
        const orb = _controllers[slot]?.orbit;

        if (!orb || orb.speedRadPerSec === 0) return;

        // If it's an ancestor, its orbit revolves the subtree.
        // If it's the target node, its orbit contributes to body rotation only if faceTangent is true.
        if (isTarget && !orb.faceTangent) return;

        Vectors.multiply(orb.axis ?? _UP_AXIS, orb.speedRadPerSec, _svScratchVec);
        Quaternions.rotateVector(_svScratchVec, parentWorldRot, _svAngVelWorld);
        Vectors.add(accumulator, _svAngVelWorld, accumulator);
    }

    function _getChainFromRoot(slot: number, out: number[]): number[] {
        out.length = 0;

        for (let currSlot: number = slot; currSlot !== INVALID_INDEX; currSlot = _parent[currSlot]) {
            out.push(currSlot);
        }

        out.reverse();
        return out;
    }

    /**
     * Computes the compound world-space linear velocity vector for a Spatial node at its current position,
     * aggregating linear kinematics, orbital translation, and parent angular/orbital tangential velocities
     * (omega x r) across its ancestor hierarchy.
     * @param node - The Spatial node instance or ID.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The evaluated world-space linear velocity vector in meters per second, or undefined if the node is deleted or invalid.
     */
    export function getLinearVelocity(node: SpatialNode | SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = !node ? INVALID_INDEX : _resolveSlot(typeof node === 'number' ? node : node._id);

        if (slot === INVALID_INDEX) return undefined;

        const accumulator = out ? Vectors.set(out, 0, 0, 0) : { x: 0, y: 0, z: 0 };

        _ensureWorldTransformUpdated(slot);

        _getWorldPos(slot, _svTargetWorldPos);
        _getChainFromRoot(slot, _svChain);

        for (let i = 0; i < _svChain.length; ++i) {
            const curr = _svChain[i];
            const isTarget = i === _svChain.length - 1;
            const parentSlot = _parent[curr];

            if (parentSlot !== INVALID_INDEX) {
                _getWorldRot(parentSlot, _svParentWorldRot);
                _getWorldPos(parentSlot, _svParentWorldPos);
            } else {
                Quaternions.identity(_svParentWorldRot);
                Vectors.set(_svParentWorldPos, 0, 0, 0);
            }

            _accumulateKinematicsLinearVelocity(curr, isTarget, _svTargetWorldPos, _svParentWorldRot, accumulator);
            _accumulateOrbitLinearVelocity(curr, _svTargetWorldPos, _svParentWorldPos, _svParentWorldRot, accumulator);
        }

        return accumulator;
    }

    /**
     * Computes the compound world-space angular velocity vector for a Spatial node,
     * aggregating angular kinematics and orbital rotation across its ancestor hierarchy.
     * @param node - The Spatial node instance or ID.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The evaluated world-space angular velocity vector in radians per second, or undefined if the node is deleted or invalid.
     */
    export function getAngularVelocity(node: SpatialNode | SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = !node ? INVALID_INDEX : _resolveSlot(typeof node === 'number' ? node : node._id);

        if (slot === INVALID_INDEX) return undefined;

        const accumulator = out ? Vectors.set(out, 0, 0, 0) : { x: 0, y: 0, z: 0 };

        _ensureWorldTransformUpdated(slot);

        _getChainFromRoot(slot, _svChain);

        for (let i = 0; i < _svChain.length; ++i) {
            const curr = _svChain[i];
            const isTarget = i === _svChain.length - 1;

            const parentSlot = _parent[curr];

            if (parentSlot !== INVALID_INDEX) {
                _getWorldRot(parentSlot, _svParentWorldRot);
            } else {
                Quaternions.identity(_svParentWorldRot);
            }

            _accumulateKinematicsAngularVelocity(curr, accumulator);
            _accumulateOrbitAngularVelocity(curr, isTarget, _svParentWorldRot, accumulator);
        }

        return accumulator;
    }
}
