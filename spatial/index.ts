import { CallbackHandler } from '../callback-handler/index.ts';
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
        | mod.WorldIcon;

    /**
     * Supported runtime spawn prefab enum types in Battlefield 6 Portal.
     */
    export type RuntimeSpawnPrefab =
        | mod.RuntimeSpawn_Abbasid
        | mod.RuntimeSpawn_Aftermath
        | mod.RuntimeSpawn_Badlands
        | mod.RuntimeSpawn_Battery
        | mod.RuntimeSpawn_Capstone
        | mod.RuntimeSpawn_Common
        | mod.RuntimeSpawn_Contaminated
        | mod.RuntimeSpawn_Dumbo
        | mod.RuntimeSpawn_Eastwood
        | mod.RuntimeSpawn_FireStorm
        | mod.RuntimeSpawn_GolmudRailway
        | mod.RuntimeSpawn_Granite_Downtown
        | mod.RuntimeSpawn_Granite_Marina
        | mod.RuntimeSpawn_Granite_MilitaryRnD
        | mod.RuntimeSpawn_Granite_MilitaryStorage
        | mod.RuntimeSpawn_Granite_ResidentialNorth
        | mod.RuntimeSpawn_Granite_TechCenter
        | mod.RuntimeSpawn_Granite_Underground
        | mod.RuntimeSpawn_Isolated
        | mod.RuntimeSpawn_Limestone
        | mod.RuntimeSpawn_Outskirts
        | mod.RuntimeSpawn_Plaza
        | mod.RuntimeSpawn_Sand
        | mod.RuntimeSpawn_Subsurface
        | mod.RuntimeSpawn_Tungsten;

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
     * A plain object reference holding live position and optional rotation to track without closure allocations.
     */
    export interface TransparentObject {
        position: Vector3;
        rotation?: Quaternion | Vector3;
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
        /** Initial local or world scale (uniform or per-axis). Default: 1. */
        scale?: Vector3 | number;
        /** In-game model offset correction (to adjust prefab origins to mesh center). */
        pivotOffset?: Vector3;
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
        /** Additional self-rotation angular speed around local Y axis in radians per second. */
        selfSpinSpeedRadPerSec?: number;
    }

    /**
     * Options for continuous LookAt target tracking.
     */
    export interface LookAtOptions {
        /** The target to continuously look at (world position, Player, Vehicle, TrackableObject, SpatialNode, SpatialNodeID, or TransparentObject). */
        target?: TrackableObject | SpatialNode | SpatialNodeID | TransparentObject | Vector3;
        /** World up vector for camera/orientation leveling. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }

    /**
     * Options for continuous follow behavior on a node.
     */
    export interface FollowOptions {
        /** The target to follow (Player, Vehicle, TrackableObject, SpatialNode, SpatialNodeID, or TransparentObject). */
        target?: TrackableObject | SpatialNode | SpatialNodeID | TransparentObject;
        /** Desired offset. If tracking rotation or target has orientation, offset is oriented in target's frame. */
        offset?: Vector3;
        /** Smooth damping speed factor (0 for instant snap, > 0 for smooth), or custom smoothing function. Default: 10. */
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

    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 100_000;
    const INVALID_INDEX = -1;

    // Node Lifecycle & State Bitmask Flags
    const FLAG_ACTIVE = 1 << 0; // 1: Node is allocated and active
    const FLAG_DIRTY = 1 << 1; // 2: Local transform changed, world matrices need evaluation
    const FLAG_ENGINE_TRANSFORM_DIRTY = 1 << 2; // 4: Evaluated transform needs syncing to native mod.Object
    const FLAG_RUNTIME_SPAWNED = 1 << 3; // 8: Created via SpawnObject; should be UnspawnObject'd on delete
    const FLAG_HAS_PIVOT = 1 << 4; // 16: Has non-zero pivot offset

    const enum TargetType {
        None = 0,
        SpatialNodeID = 1,
        SpatialNode = 2,
        Vector3 = 3,
        TransparentObject = 4,
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
        initialOffset: Vector3;
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

    const SERVER_START_TIME = Date.now();
    let _lastUpdateTime = 0;

    /**
     * @returns The current server uptime in milliseconds.
     */
    function _getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    // =========================================================================
    // Contextual Scratch Variables for Zero-Allocation Math
    // =========================================================================

    // World transform evaluation (_ensureWorldTransformUpdated)
    const _worldEvalScaledPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _worldEvalRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _worldEvalRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };

    // Render placement & engine synchronization (_computeRenderPosition, createRuntime, _syncNode)
    const _renderPivotScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _renderPivotRotated: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderEuler: Vector3 = { x: 0, y: 0, z: 0 };

    // Coordinate space projections (localToWorldPoint, worldToLocalPoint, localToWorldVector, worldToLocalVector)
    const _projLocalScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _projWorldPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _projWorldDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _projRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _projInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // World setters & Euler (setWorldPosition, setWorldRotation, getWorldRotationEuler, setLocalRotationEuler, getLocalRotationEuler, setWorldScale)
    const _worldSetLocalPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _worldSetInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _worldSetEulerRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _worldSetLocalScale: Vector3 = { x: 1, y: 1, z: 1 };

    // Node-level transformations (translateLocal, rotateLocal, rotateAroundAxis, lookAt)
    const _translateRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _translateRotatedDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateLocalRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _rotateAroundAxisRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _rotateAroundDisplacedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateAroundRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtDeltaPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // Active controllers & kinematics (_stepKinematics, _stepOrbit, _stepLookAt, _stepFollow)
    const _kinematicsStepDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _kinematicsAngularRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _kinematicsRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitTangentCross: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitSpinRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _lookAtTargetPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followFacing: Vector3 = { x: 0, y: 0, z: 0 };
    const _followEuler: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _followRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetWithOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _followLerpedPos: Vector3 = { x: 0, y: 0, z: 0 };

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

        let child = _firstChild[slot];

        while (child !== INVALID_INDEX) {
            _markDirty(child);
            child = _nextSibling[child];
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

        _setVectorInArray(_localPos, slot, 0);
        _setQuaternionInArray(_localRot, slot, 0);
        _setVectorInArray(_localScale, slot, 1);
        _setVectorInArray(_pivotOffset, slot, 0);
        _setVectorInArray(_worldPos, slot, 0);
        _setQuaternionInArray(_worldRot, slot, 0);
        _setVectorInArray(_worldScale, slot, 1);

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
    // Vector and Quaternion Array Helpers
    // =========================================================================

    function _cloneVectorFromArray(target: Vector3, sourceArray: Float32Array, sIdx: number): Vector3 {
        const sIdx3 = sIdx * 3;
        target.x = sourceArray[sIdx3];
        target.y = sourceArray[sIdx3 + 1];
        target.z = sourceArray[sIdx3 + 2];
        return target;
    }

    function _copyVectorIntoArray(targetArray: Float32Array, tIdx: number, source: Vector3): void {
        const tIdx3 = tIdx * 3;
        targetArray[tIdx3] = source.x;
        targetArray[tIdx3 + 1] = source.y;
        targetArray[tIdx3 + 2] = source.z;
    }

    function _copyVectorFromArrayIntoArray(targetArray: Float32Array, sourceArray: Float32Array, idx: number): void {
        const idx3 = idx * 3;
        targetArray[idx3] = sourceArray[idx3];
        targetArray[idx3 + 1] = sourceArray[idx3 + 1];
        targetArray[idx3 + 2] = sourceArray[idx3 + 2];
    }

    function _setVectorInArray(targetArray: Float32Array, tIdx: number, source: number): void {
        const tIdx3 = tIdx * 3;
        targetArray[tIdx3] = source;
        targetArray[tIdx3 + 1] = source;
        targetArray[tIdx3 + 2] = source;
    }

    function _addVectorIntoArray(
        aArray: Float32Array,
        aIdx: number,
        b: Vector3,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const aIdx3 = aIdx * 3;
        const outIdx3 = outIdx * 3;
        outArray[outIdx3] = aArray[aIdx3] + b.x;
        outArray[outIdx3 + 1] = aArray[aIdx3 + 1] + b.y;
        outArray[outIdx3 + 2] = aArray[aIdx3 + 2] + b.z;
    }

    function _addVectorsIntoArray(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void {
        const outIdx3 = outIdx * 3;
        outArray[outIdx3] = a.x + b.x;
        outArray[outIdx3 + 1] = a.y + b.y;
        outArray[outIdx3 + 2] = a.z + b.z;
    }

    function _addArrayAndVectorIntoVector(aArray: Float32Array, aIdx: number, b: Vector3, outVector: Vector3): Vector3 {
        const aIdx3 = aIdx * 3;
        outVector.x = aArray[aIdx3] + b.x;
        outVector.y = aArray[aIdx3 + 1] + b.y;
        outVector.z = aArray[aIdx3 + 2] + b.z;
        return outVector;
    }

    function _hadamardMultiplyArraysIntoArray(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetArray: Float32Array,
        tIdx: number
    ): void {
        const aIdx3 = aIdx * 3;
        const bIdx3 = bIdx * 3;
        const tIdx3 = tIdx * 3;
        targetArray[tIdx3] = aArray[aIdx3] * bArray[bIdx3];
        targetArray[tIdx3 + 1] = aArray[aIdx3 + 1] * bArray[bIdx3 + 1];
        targetArray[tIdx3 + 2] = aArray[aIdx3 + 2] * bArray[bIdx3 + 2];
    }

    function _hadamardMultiplyArraysIntoVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetVector: Vector3
    ): Vector3 {
        const aIdx3 = aIdx * 3;
        const bIdx3 = bIdx * 3;
        targetVector.x = aArray[aIdx3] * bArray[bIdx3];
        targetVector.y = aArray[aIdx3 + 1] * bArray[bIdx3 + 1];
        targetVector.z = aArray[aIdx3 + 2] * bArray[bIdx3 + 2];
        return targetVector;
    }

    function _cloneQuaternionFromArray(
        target: Quaternions.Quaternion,
        sourceArray: Float32Array,
        sIdx: number
    ): Quaternions.Quaternion {
        const sIdx4 = sIdx * 4;
        target.w = sourceArray[sIdx4];
        target.x = sourceArray[sIdx4 + 1];
        target.y = sourceArray[sIdx4 + 2];
        target.z = sourceArray[sIdx4 + 3];
        return target;
    }

    function _copyQuaternionIntoArray(targetArray: Float32Array, tIdx: number, source: Quaternions.Quaternion): void {
        const tIdx4 = tIdx * 4;
        targetArray[tIdx4] = source.w;
        targetArray[tIdx4 + 1] = source.x;
        targetArray[tIdx4 + 2] = source.y;
        targetArray[tIdx4 + 3] = source.z;
    }

    function _copyQuaternionFromArrayIntoArray(
        targetArray: Float32Array,
        sourceArray: Float32Array,
        idx: number
    ): void {
        const idx4 = idx * 4;
        targetArray[idx4] = sourceArray[idx4];
        targetArray[idx4 + 1] = sourceArray[idx4 + 1];
        targetArray[idx4 + 2] = sourceArray[idx4 + 2];
        targetArray[idx4 + 3] = sourceArray[idx4 + 3];
    }

    function _setQuaternionInArray(targetArray: Float32Array, tIdx: number, source: number): void {
        const tIdx4 = tIdx * 4;
        targetArray[tIdx4] = source;
        targetArray[tIdx4 + 1] = source;
        targetArray[tIdx4 + 2] = source;
        targetArray[tIdx4 + 3] = source;
    }

    function _multiplyQuaternionsFromArraysIntoArray(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const a4 = aIdx * 4;
        const aw = aArray[a4];
        const ax = aArray[a4 + 1];
        const ay = aArray[a4 + 2];
        const az = aArray[a4 + 3];

        const b4 = bIdx * 4;
        const bw = bArray[b4];
        const bx = bArray[b4 + 1];
        const by = bArray[b4 + 2];
        const bz = bArray[b4 + 3];

        const out4 = outIdx * 4;
        outArray[out4] = aw * bw - ax * bx - ay * by - az * bz;
        outArray[out4 + 1] = aw * bx + ax * bw + ay * bz - az * by;
        outArray[out4 + 2] = aw * by - ax * bz + ay * bw + az * bx;
        outArray[out4 + 3] = aw * bz + ax * by - ay * bx + az * bw;
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
            _copyVectorIntoArray(_localPos, slot, pos);
        }

        const rot = params?.rotation;

        if (rot) {
            if ('w' in rot) {
                _copyQuaternionIntoArray(_localRot, slot, rot);
            } else {
                Quaternions.setFromEuler(_rotateLocalRot, rot.x, rot.y, rot.z);
                _copyQuaternionIntoArray(_localRot, slot, _rotateLocalRot);
            }
        }

        const scale = params?.scale;

        if (scale !== undefined) {
            if (typeof scale === 'number') {
                _setVectorInArray(_localScale, slot, scale);
            } else {
                _copyVectorIntoArray(_localScale, slot, scale);
            }
        }

        const pivot = params?.pivotOffset;

        if (pivot) {
            _copyVectorIntoArray(_pivotOffset, slot, pivot);
            _setFlag(slot, FLAG_HAS_PIVOT);
        }

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

    // =========================================================================
    // Transform Evaluation
    // =========================================================================

    function _getWorldPos(slot: number, out?: Vector3): Vector3 {
        return _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _worldPos, slot);
    }

    function _getWorldRot(slot: number, out?: Quaternion): Quaternion {
        return _cloneQuaternionFromArray(out ?? { w: 1, x: 0, y: 0, z: 0 }, _worldRot, slot);
    }

    function _getWorldScale(slot: number, out?: Vector3): Vector3 {
        return _cloneVectorFromArray(out ?? { x: 1, y: 1, z: 1 }, _worldScale, slot);
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
            _hadamardMultiplyArraysIntoArray(_worldScale, parent, _localScale, slot, _worldScale, slot);

            // World Rotation = Parent World Rotation * Local Rotation
            _multiplyQuaternionsFromArraysIntoArray(_worldRot, parent, _localRot, slot, _worldRot, slot);

            // Scaled Local Position = Local Pos * Parent World Scale
            _hadamardMultiplyArraysIntoVector(_localPos, slot, _worldScale, parent, _worldEvalScaledPos);

            // Rotate scaled local pos by parent world rotation
            _cloneQuaternionFromArray(_worldEvalRot, _worldRot, parent);
            Quaternions.rotateVector(_worldEvalScaledPos, _worldEvalRot, _worldEvalRotatedPos);

            // World Position = Parent World Position + Rotated Scaled Local Position
            _addVectorIntoArray(_worldPos, parent, _worldEvalRotatedPos, _worldPos, slot);
        } else {
            // Root Node
            _copyVectorFromArrayIntoArray(_worldPos, _localPos, slot);
            _copyQuaternionFromArrayIntoArray(_worldRot, _localRot, slot);
            _copyVectorFromArrayIntoArray(_worldScale, _localScale, slot);
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

        if (!_hasPivot(slot)) return _cloneVectorFromArray(target, _worldPos, slot);

        _hadamardMultiplyArraysIntoVector(_pivotOffset, slot, _worldScale, slot, _renderPivotScaled);
        _cloneQuaternionFromArray(_renderRot, _worldRot, slot);
        Quaternions.rotateVector(_renderPivotScaled, _renderRot, _renderPivotRotated);

        return _addArrayAndVectorIntoVector(_worldPos, slot, _renderPivotRotated, target);
    }

    function _syncNode(slot: number): void {
        if (!_isEngineTransformDirty(slot)) return;

        const obj = _objects[slot];

        if (obj && mod.IsValid(obj)) {
            _ensureWorldTransformUpdated(slot);
            const renderPos = _computeRenderPosition(slot, _renderPos)!;

            _cloneQuaternionFromArray(_renderRot, _worldRot, slot);
            Quaternions.toEuler(_renderRot, _renderEuler);

            try {
                mod.SetObjectTransform(
                    obj,
                    mod.CreateTransform(Vectors.toVector(renderPos), Vectors.toVector(_renderEuler))
                );
            } catch (error: unknown) {
                logging.log('Error syncing object transform to engine', LogLevel.Error, error);
            }
        }

        _clearFlag(slot, FLAG_ENGINE_TRANSFORM_DIRTY);
    }

    function _syncInternal(slot: number): void {
        _syncNode(slot);

        let child = _firstChild[slot];

        while (child !== INVALID_INDEX) {
            _syncInternal(child);
            child = _nextSibling[child];
        }
    }

    // =========================================================================
    // Target Helpers
    // =========================================================================

    function _classifyTarget(target: unknown): TargetType {
        if (!target) return TargetType.None;

        if (typeof target === 'number') return TargetType.SpatialNodeID;

        if (target instanceof SpatialNode) return TargetType.SpatialNode;

        if (typeof target === 'object') {
            if ('position' in target) return TargetType.TransparentObject;

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
        target: TrackableObject | SpatialNode | SpatialNodeID | TransparentObject | Vector3 | undefined,
        out: Vector3
    ): Vector3 | undefined | null {
        switch (targetType) {
            case TargetType.SpatialNodeID:
                return getWorldPosition(target as SpatialNodeID, out);
            case TargetType.SpatialNode:
                return (target as SpatialNode)._id === ROOT_NODE_ID
                    ? null
                    : getWorldPosition((target as SpatialNode)._id, out);
            case TargetType.TransparentObject:
                return Vectors.copy(out, (target as TransparentObject).position);
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
        target: TrackableObject | SpatialNode | SpatialNodeID | TransparentObject | Vector3 | undefined,
        out: Quaternion
    ): Quaternion | undefined | null {
        switch (targetType) {
            case TargetType.SpatialNodeID:
                return getWorldRotation(target as SpatialNodeID, out);
            case TargetType.SpatialNode:
                return (target as SpatialNode)._id === ROOT_NODE_ID
                    ? null
                    : getWorldRotation((target as SpatialNode)._id, out);
            case TargetType.TransparentObject: {
                const rot = (target as TransparentObject).rotation;

                if (!rot) return null;

                return 'w' in rot ? Quaternions.copy(out, rot) : Quaternions.setFromEuler(out, rot.x, rot.y, rot.z);
            }
            case TargetType.Vector3:
                return null;
            case TargetType.Player:
            case TargetType.Vehicle: {
                if (!mod.IsValid(target)) return undefined;

                const facing =
                    targetType === TargetType.Player
                        ? mod.GetSoldierState(target as mod.Player, mod.SoldierStateVector.GetFacingDirection)
                        : mod.GetVehicleState(target as mod.Vehicle, mod.VehicleStateVector.FacingDirection);

                if (!facing) return null;

                Vectors.toVector3(facing, _followFacing);
                const yawRad = Math.atan2(_followFacing.x, _followFacing.z);
                const pitchRad = -Math.asin(Math.max(-1, Math.min(1, _followFacing.y)));

                return Quaternions.setFromEuler(out, pitchRad, yawRad, 0);
            }
            case TargetType.TrackableObject: {
                if (!mod.IsValid(target)) return undefined;

                const rot = mod.GetObjectRotation(target as TrackableObject);

                if (!rot) return null;

                Vectors.toVector3(rot, _followEuler);

                return Quaternions.setFromEuler(out, _followEuler.x, _followEuler.y, _followEuler.z);
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

            Vectors.multiply(kin.linearAcceleration, dtSeconds, _kinematicsStepDelta);
            Vectors.add(kin.linearVelocity, _kinematicsStepDelta, kin.linearVelocity);
        }

        // 2. Linear Velocity -> Local Position
        if (kin.linearVelocity) {
            Vectors.multiply(kin.linearVelocity, dtSeconds, _kinematicsStepDelta);
            _addVectorIntoArray(_localPos, slot, _kinematicsStepDelta, _localPos, slot);
            _markDirty(slot);
        }

        // 3. Angular Acceleration -> Angular Velocity
        if (kin.angularAcceleration) {
            if (!kin.angularVelocity) {
                kin.angularVelocity = { x: 0, y: 0, z: 0 };
            }

            Vectors.multiply(kin.angularAcceleration, dtSeconds, _kinematicsStepDelta);
            Vectors.add(kin.angularVelocity, _kinematicsStepDelta, kin.angularVelocity);
        }

        // 4. Angular Velocity -> Local Rotation
        if (kin.angularVelocity) {
            const angle = Vectors.length(kin.angularVelocity) * dtSeconds;

            if (angle > 0) {
                Quaternions.setFromAxisAngle(_kinematicsAngularRot, kin.angularVelocity, angle);
                _cloneQuaternionFromArray(_kinematicsRot, _localRot, slot);
                Quaternions.multiply(_kinematicsRot, _kinematicsAngularRot, _kinematicsRot);
                _copyQuaternionIntoArray(_localRot, slot, _kinematicsRot);

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

        Quaternions.setFromAxisAngle(_orbitRot, axis, orb.currentAngleRad);
        Quaternions.rotateVector(orb.initialOffset, _orbitRot, _orbitRotatedOffset);
        _addVectorsIntoArray(center, _orbitRotatedOffset, _localPos, slot);

        if (orb.faceTangent) {
            Vectors.cross(axis, _orbitRotatedOffset, _orbitTangentCross);

            if (Vectors.lengthSquared(_orbitTangentCross) > 0) {
                const yaw = Math.atan2(_orbitTangentCross.x, _orbitTangentCross.z);
                _copyQuaternionIntoArray(_localRot, slot, Quaternions.setFromEuler(_orbitRot, 0, yaw, 0));
            }
        }

        if (orb.selfSpinSpeedRadPerSec) {
            Quaternions.setFromAxisAngle(_orbitSpinRot, _UP_AXIS, orb.selfSpinSpeedRadPerSec * dtSeconds);
            _cloneQuaternionFromArray(_orbitRot, _localRot, slot);
            Quaternions.multiply(_orbitRot, _orbitSpinRot, _orbitRot);
            _copyQuaternionIntoArray(_localRot, slot, _orbitRot);
        }

        _markDirty(slot);
    }

    function _stepLookAt(slot: number): void {
        const look = _controllers[slot]?.lookAt;

        if (!look || look.targetType === TargetType.None) return;

        const targetPos = _getTargetPosition(look.targetType, look.target, _lookAtTargetPos);

        if (targetPos) {
            lookAt(_encodeId(slot), targetPos, look.upAxis);
        }
    }

    function _stepFollow(slot: number, dtMs: number): void {
        const follow = _controllers[slot]?.follow;

        if (!follow || follow.targetType === TargetType.None) return;

        const targetPos = _getTargetPosition(follow.targetType, follow.target, _followTargetPos);

        if (!targetPos) return;

        const hasOrientation = follow.trackRotation
            ? Boolean(_getTargetRotation(follow.targetType, follow.target, _followTargetRot))
            : false;

        if (hasOrientation && follow.yawOnly) {
            Quaternions.toEuler(_followTargetRot, _followEuler);
            Quaternions.setFromEuler(_followTargetRot, 0, _followEuler.y, 0);
        }

        if (follow.offset) {
            if (hasOrientation) {
                Quaternions.rotateVector(follow.offset, _followTargetRot, _followRotatedOffset);
                Vectors.add(targetPos, _followRotatedOffset, _followTargetWithOffset);
            } else {
                Vectors.add(targetPos, follow.offset, _followTargetWithOffset);
            }
        } else {
            Vectors.copy(_followTargetWithOffset, targetPos);
        }

        _ensureWorldTransformUpdated(slot);
        _getWorldPos(slot, _worldEvalScaledPos);

        const smoothing = follow.smoothing ?? 10;

        if (typeof smoothing === 'function') {
            smoothing(_worldEvalScaledPos, _followTargetWithOffset, dtMs, _followLerpedPos);
        } else if (smoothing <= 0) {
            Vectors.copy(_followLerpedPos, _followTargetWithOffset);
        } else {
            const factor = 1 - Math.exp((-smoothing * dtMs) / 1000);
            Vectors.lerp(_worldEvalScaledPos, _followTargetWithOffset, factor, _followLerpedPos);
        }

        const nodeId = _encodeId(slot);
        setWorldPosition(nodeId, _followLerpedPos);

        if (follow.trackRotation && hasOrientation) {
            setWorldRotation(nodeId, _followTargetRot);
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
        const wScale = _cloneVectorFromArray(_projLocalScaled, _worldScale, slot);
        const wRot = _cloneQuaternionFromArray(_projRot, _worldRot, slot);
        const wPos = _cloneVectorFromArray(_projWorldPos, _worldPos, slot);

        Vectors.hadamardMultiply(localPoint, wScale, _projLocalScaled);
        Quaternions.rotateVector(_projLocalScaled, wRot, target);

        return Vectors.add(target, wPos, target);
    }

    function _worldToLocalPoint(slot: number, worldPoint: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);

        const target = out ?? { x: 0, y: 0, z: 0 };
        const wPos = _cloneVectorFromArray(_projWorldDelta, _worldPos, slot);
        const wRot = _cloneQuaternionFromArray(_projInvRot, _worldRot, slot);
        const ws = _cloneVectorFromArray(_projLocalScaled, _worldScale, slot);

        Vectors.subtract(worldPoint, wPos, _projWorldDelta);
        Quaternions.conjugate(wRot, _projInvRot);
        Quaternions.rotateVector(_projWorldDelta, _projInvRot, target);

        target.x = Math.abs(ws.x) > 1e-6 ? target.x / ws.x : 0;
        target.y = Math.abs(ws.y) > 1e-6 ? target.y / ws.y : 0;
        target.z = Math.abs(ws.z) > 1e-6 ? target.z / ws.z : 0;

        return target;
    }

    function _localToWorldVector(slot: number, localVec: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);
        _cloneQuaternionFromArray(_projRot, _worldRot, slot);
        return Quaternions.rotateVector(localVec, _projRot, out);
    }

    function _worldToLocalVector(slot: number, worldVec: Vector3, out?: Vector3): Vector3 {
        _ensureWorldTransformUpdated(slot);
        _cloneQuaternionFromArray(_projRot, _worldRot, slot);
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
            if (id === ROOT_NODE_ID) return ROOT_NODE;

            return SpatialElement.fromId(id);
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
         * @returns `this` instance for method chaining.
         */
        public setParent(newParent: SpatialNode | SpatialNodeID): this {
            setParent(this._id, typeof newParent === 'number' ? newParent : newParent._id);
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
         * @returns The scale vector.
         */
        public get localScale(): Vector3 | undefined {
            return this.getLocalScale();
        }

        /**
         * Sets the local scale (uniform or per-axis).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        public set localScale(scale: Vector3 | number) {
            this.setLocalScale(scale);
        }

        /**
         * Retrieves the local scale vector.
         * @param out - Optional target Vector3.
         * @returns The local scale vector.
         */
        public getLocalScale(out?: Vector3): Vector3 | undefined {
            return getLocalScale(this._id, out);
        }

        /**
         * Sets the local scale (uniform or per-axis).
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
         * The evaluated compound world scale vector.
         * @returns The world scale vector.
         */
        public get worldScale(): Vector3 | undefined {
            return this.getWorldScale();
        }

        /**
         * Sets the compound world scale (uniform or per-axis).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        public set worldScale(scale: Vector3 | number) {
            this.setWorldScale(scale);
        }

        /**
         * Retrieves the evaluated compound world scale vector.
         * @param out - Optional target Vector3.
         * @returns The world scale vector.
         */
        public getWorldScale(out?: Vector3): Vector3 | undefined {
            return getWorldScale(this._id, out);
        }

        /**
         * Sets the compound world scale (uniform or per-axis), automatically solving for required local scale under current parent.
         * @param scale - Uniform number or 3D Vector3 scale.
         * @returns `this` instance for chaining.
         */
        public setWorldScale(scale: Vector3 | number): this {
            setWorldScale(this._id, scale);
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

        // ---------------------------------------------------------------------
        // Controllers & Behaviors
        // ---------------------------------------------------------------------

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
            const slot = _allocateSlot();

            if (slot === INVALID_INDEX) {
                super(INVALID_NODE_ID);
                return;
            }

            super(_encodeId(slot));

            _instances[slot] = this;

            _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params?.parent), params);
        }
    }

    /**
     * A dynamically spawned runtime prefab object node.
     */
    export class Runtime extends SpatialElement {
        public constructor(params: RuntimeParams) {
            const slot = _allocateSlot();

            if (slot === INVALID_INDEX) {
                super(INVALID_NODE_ID);
                return;
            }

            super(_encodeId(slot));

            _instances[slot] = this;

            _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params.parent), params);

            _ensureWorldTransformUpdated(slot);
            const renderPos = _computeRenderPosition(slot, _renderPos)!;
            Quaternions.toEuler(_getWorldRot(slot, _renderRot), _renderEuler);
            const scaleVec = Vectors.toVector(_getWorldScale(slot, _renderPivotScaled));

            try {
                const spawned = mod.SpawnObject(
                    params.prefab,
                    Vectors.toVector(renderPos),
                    Vectors.toVector(_renderEuler),
                    scaleVec
                );

                if (!mod.IsValid(spawned)) {
                    this.delete();
                    return;
                }

                _objects[slot] = spawned as TransformableObject;
                _setFlag(slot, FLAG_RUNTIME_SPAWNED);
            } catch (error: unknown) {
                this.delete();
                logging.log('Create runtime failed, spawn object threw exception', LogLevel.Error, error);
            }
        }
    }

    /**
     * A wrapper element for an existing native in-game transformable object.
     */
    export class Existing extends SpatialElement {
        public constructor(params: ExistingParams) {
            const slot = _allocateSlot();

            if (slot === INVALID_INDEX) {
                super(INVALID_NODE_ID);
                logging.log('Spatial pool full, failed to create Existing element', LogLevel.Error);
                return;
            }

            super(_encodeId(slot));

            _instances[slot] = this;

            _objects[slot] = params.object;

            _initSlotTransforms(slot, _resolveNodeSlotAndLogWarning(params.parent), params);
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
     * Advances all controllers and kinematics across the scene graph, then syncs dirty transforms to the engine.
     * @param deltaTime - Optional delta time in milliseconds.
     */
    export function update(deltaTime?: number): void {
        let dt: number;

        if (deltaTime !== undefined) {
            dt = deltaTime;
        } else {
            const now = _getUptime();

            if (_lastUpdateTime === 0) {
                _lastUpdateTime = now;
                return;
            }

            const elapsedMs = now - _lastUpdateTime;

            if (elapsedMs < 10) return;

            _lastUpdateTime = now;
            dt = Math.min(elapsedMs, 100);
        }

        let root = _firstRoot;

        while (root !== INVALID_INDEX) {
            _updateInternal(root, dt);
            root = _nextSibling[root];
        }

        sync();
    }

    /**
     * Evaluates dirty node hierarchies top-down and synchronizes transformed native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void {
        let root = _firstRoot;

        while (root !== INVALID_INDEX) {
            _syncInternal(root);
            root = _nextSibling[root];
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

        const parentSlot = _resolveNodeSlotAndLogWarning(params?.parent);
        _initSlotTransforms(slot, parentSlot, params);

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

        const parentSlot = _resolveNodeSlotAndLogWarning(params.parent);
        _initSlotTransforms(slot, parentSlot, params);

        _ensureWorldTransformUpdated(slot);
        const renderPos = _computeRenderPosition(slot, _renderPos)!;
        Quaternions.toEuler(_getWorldRot(slot, _renderRot), _renderEuler);
        const scaleVec = Vectors.toVector(_getWorldScale(slot, _renderPivotScaled));

        try {
            const spawned = mod.SpawnObject(
                params.prefab,
                Vectors.toVector(renderPos),
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
        const parentSlot = _resolveNodeSlotAndLogWarning(params.parent);
        _initSlotTransforms(slot, parentSlot, params);

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

        return slot === INVALID_INDEX ? undefined : _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _localPos, slot);
    }

    /**
     * Sets the local position of a node by ID.
     * @param id - The node ID.
     * @param pos - The position vector.
     */
    export function setLocalPosition(id: SpatialNodeID, pos: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _copyVectorIntoArray(_localPos, slot, pos);
        _markDirty(slot);
    }

    function _getLocalRot(slot: number, out?: Quaternion): Quaternion {
        return _cloneQuaternionFromArray(out ?? { w: 1, x: 0, y: 0, z: 0 }, _localRot, slot);
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

        _copyQuaternionIntoArray(_localRot, slot, rot);
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

        return slot === INVALID_INDEX ? undefined : Quaternions.toEuler(_getLocalRot(slot, _rotateLocalRot), out);
    }

    /**
     * Sets the local rotation of a node by ID using Euler angles in radians.
     * @param id - The node ID.
     * @param euler - The Euler angles vector in radians.
     */
    export function setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        Quaternions.setFromEuler(_rotateLocalRot, euler.x, euler.y, euler.z);
        _copyQuaternionIntoArray(_localRot, slot, _rotateLocalRot);
        _markDirty(slot);
    }

    /**
     * Gets the local scale vector of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The local scale vector, or undefined if deleted.
     */
    export function getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const slot = _resolveSlot(id);

        return slot === INVALID_INDEX
            ? undefined
            : _cloneVectorFromArray(out ?? { x: 1, y: 1, z: 1 }, _localScale, slot);
    }

    /**
     * Sets the local scale (uniform or per-axis) of a node by ID.
     * @param id - The node ID.
     * @param scale - Uniform number or 3D Vector3 scale.
     */
    export function setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        if (typeof scale === 'number') {
            _setVectorInArray(_localScale, slot, scale);
        } else {
            _copyVectorIntoArray(_localScale, slot, scale);
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

        _worldToLocalPoint(parent, worldPos, _worldSetLocalPos);
        setLocalPosition(id, _worldSetLocalPos);
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
        _getWorldRot(parent, _worldSetInvRot);
        Quaternions.conjugate(_worldSetInvRot, _worldSetInvRot);
        Quaternions.multiply(_worldSetInvRot, worldRot, _worldSetInvRot);
        setLocalRotation(id, _worldSetInvRot);
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
        _getWorldRot(slot, _rotateLocalRot);

        return Quaternions.toEuler(_rotateLocalRot, out);
    }

    /**
     * Sets the world Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param worldEuler - Target world Euler angles vector in radians.
     */
    export function setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void {
        Quaternions.setFromEuler(_worldSetEulerRot, worldEuler.x, worldEuler.y, worldEuler.z);
        setWorldRotation(id, _worldSetEulerRot);
    }

    /**
     * Gets the evaluated compound world scale vector of a node by ID.
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
     * Sets the compound world scale (uniform or per-axis) of a node by ID.
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

        const wsX = typeof worldScale === 'number' ? worldScale : worldScale.x;
        const wsY = typeof worldScale === 'number' ? worldScale : worldScale.y;
        const wsZ = typeof worldScale === 'number' ? worldScale : worldScale.z;

        const pIdx = parent * 3;
        const pwX = _worldScale[pIdx];
        const pwY = _worldScale[pIdx + 1];
        const pwZ = _worldScale[pIdx + 2];

        _worldSetLocalScale.x = Math.abs(pwX) > 1e-6 ? wsX / pwX : 0;
        _worldSetLocalScale.y = Math.abs(pwY) > 1e-6 ? wsY / pwY : 0;
        _worldSetLocalScale.z = Math.abs(pwZ) > 1e-6 ? wsZ / pwZ : 0;

        setLocalScale(id, _worldSetLocalScale);
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

        return _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _pivotOffset, slot);
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
            _copyVectorIntoArray(_pivotOffset, slot, offset);
            _setFlag(slot, FLAG_HAS_PIVOT);
        } else {
            _setVectorInArray(_pivotOffset, slot, 0);
            _clearFlag(slot, FLAG_HAS_PIVOT);
        }

        _setFlag(slot, FLAG_ENGINE_TRANSFORM_DIRTY);
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
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _cloneQuaternionFromArray(_translateRot, _localRot, slot);
        Quaternions.rotateVector(delta, _translateRot, _translateRotatedDelta);
        _addVectorIntoArray(_localPos, slot, _translateRotatedDelta, _localPos, slot);
        _markDirty(slot);
    }

    /**
     * Translates a node in parent/world coordinate space.
     * @param id - The node ID.
     * @param delta - Translation delta vector.
     */
    export function translate(id: SpatialNodeID, delta: Vector3): void {
        const slot = _resolveSlotAndLogWarning(id);

        if (slot === INVALID_INDEX) return;

        _addVectorIntoArray(_localPos, slot, delta, _localPos, slot);
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

        _cloneQuaternionFromArray(_rotateLocalRot, _localRot, slot);
        Quaternions.multiply(_rotateLocalRot, deltaRot, _rotateLocalRot);
        _copyQuaternionIntoArray(_localRot, slot, _rotateLocalRot);
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

        Quaternions.setFromAxisAngle(_rotateAroundAxisRot, axis, angleRad);

        if (pivotCenter) {
            _cloneVectorFromArray(_rotateAroundDisplacedPos, _localPos, slot);
            Vectors.subtract(_rotateAroundDisplacedPos, pivotCenter, _rotateAroundDisplacedPos);
            Quaternions.rotateVector(_rotateAroundDisplacedPos, _rotateAroundAxisRot, _rotateAroundRotatedPos);
            Vectors.add(_rotateAroundRotatedPos, pivotCenter, _rotateAroundRotatedPos);
            _copyVectorIntoArray(_localPos, slot, _rotateAroundRotatedPos);
        }

        _cloneQuaternionFromArray(_rotateLocalRot, _localRot, slot);
        Quaternions.multiply(_rotateAroundAxisRot, _rotateLocalRot, _rotateLocalRot);
        _copyQuaternionIntoArray(_localRot, slot, _rotateLocalRot);
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

        _cloneVectorFromArray(_lookAtDeltaPos, _worldPos, slot);
        Vectors.subtract(targetWorld, _lookAtDeltaPos, _lookAtDeltaPos);
        Quaternions.setFromLookRotation(_lookAtRot, _lookAtDeltaPos, upAxis ?? _UP_AXIS);
        setWorldRotation(id, _lookAtRot);
    }

    /**
     * Sets the parent of a node by raw ID.
     * @param childId - Child node ID.
     * @param parentId - Target parent node ID.
     */
    export function setParent(childId: SpatialNodeID, parentId: SpatialNodeID): void {
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

        const center = options.center ?? Vectors.ZERO;

        const pIdx = slot * 3;
        const initOffset = {
            x: _localPos[pIdx] - center.x,
            y: _localPos[pIdx + 1] - center.y,
            z: _localPos[pIdx + 2] - center.z,
        };

        _controllers[slot]!.orbit = {
            ...options,
            currentAngleRad: 0,
            initialOffset: initOffset,
        };

        _controllers[slot]!.follow = undefined;

        if (_controllers[slot]!.kinematics) {
            _controllers[slot]!.kinematics!.linearVelocity = undefined;
            _controllers[slot]!.kinematics!.linearAcceleration = undefined;
        }
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

        _controllers[slot]!.lookAt = {
            ...options,
            targetType: _classifyTarget(options.target),
        };

        if (_controllers[slot]!.kinematics) {
            _controllers[slot]!.kinematics!.angularVelocity = undefined;
            _controllers[slot]!.kinematics!.angularAcceleration = undefined;
        }

        if (_controllers[slot]!.orbit) {
            _controllers[slot]!.orbit!.faceTangent = false;
            _controllers[slot]!.orbit!.selfSpinSpeedRadPerSec = undefined;
        }
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

        _controllers[slot]!.follow = {
            ...options,
            targetType: _classifyTarget(options.target),
        };

        setParent(id, ROOT_NODE_ID);
        _controllers[slot]!.orbit = undefined;

        if (_controllers[slot]!.kinematics) {
            _controllers[slot]!.kinematics!.linearVelocity = undefined;
            _controllers[slot]!.kinematics!.linearAcceleration = undefined;
        }
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

        _controllers[slot]!.kinematics = { ...options };

        if (options.linearVelocity || options.linearAcceleration) {
            _controllers[slot]!.orbit = undefined;
            _controllers[slot]!.follow = undefined;
        }

        if (options.angularVelocity || options.angularAcceleration) {
            _controllers[slot]!.lookAt = undefined;

            if (_controllers[slot]!.orbit) {
                _controllers[slot]!.orbit!.faceTangent = false;
                _controllers[slot]!.orbit!.selfSpinSpeedRadPerSec = undefined;
            }
        }
    }
}
