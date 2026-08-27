import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace SpatialSOA {
    const logging = new Logging('SPSOA');

    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include raw errors.
     * @param log - The logger function. Pass undefined to disable.
     * @param logLevel - The minimum log level to output.
     * @param includeRawError - Whether to log raw error payloads.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    // =========================================================================
    // Types & Interfaces
    // =========================================================================

    /**
     * Unique generation-encoded identifier for a SpatialSOA node.
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
     * @param dt - Delta time in seconds.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The updated world position.
     */
    export type FollowSmoothingFunction = (current: Vector3, target: Vector3, dt: number, out?: Vector3) => Vector3;

    /**
     * Common initialization options for creating SpatialNodes.
     */
    export interface NodeOptions {
        /** Optional parent node ID to attach this node to upon creation. If undefined, attaches to ROOT_NODE_ID. */
        parentId?: SpatialNodeID;
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
        /** The target to continuously look at (world position, Player, or SpatialNodeID). */
        target?: Vector3 | mod.Player | SpatialNodeID;
        /** World up vector for camera/orientation leveling. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }

    /**
     * Options for continuous follow behavior on a node.
     */
    export interface FollowOptions {
        /** The target to follow (Player, Vehicle, TrackableObject, SpatialNodeID, or TransparentObject). */
        target?: TrackableObject | SpatialNodeID | TransparentObject;
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
    // CONSTANTS & ENUMS
    // =========================================================================

    /**
     * Constant representing the root anchor node ID in the scene graph.
     */
    export const ROOT_NODE_ID = 0 as SpatialNodeID;

    // Module-Level Configuration
    const MAX_NODES = 1024;
    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 100_000;
    const INVALID_INDEX = -1;

    // Node Lifecycle & State Bitmask Flags
    const FLAG_ACTIVE = 1 << 0; // 1: Node is allocated and active
    const FLAG_DIRTY = 1 << 1; // 2: Local transform changed, world matrices need evaluation
    const FLAG_ENGINE_TRANSFORM_DIRTY = 1 << 2; // 4: Evaluated transform needs syncing to native mod.Object
    const FLAG_RUNTIME_SPAWNED = 1 << 3; // 8: Created via SpawnObject; should be UnspawnObject'd on destroy
    const FLAG_HAS_PIVOT = 1 << 4; // 16: Has non-zero pivot offset

    const enum FollowTargetType {
        None = 0,
        Player = 1,
        Vehicle = 2,
        TrackableObject = 3,
        SpatialNode = 4,
        TransparentObject = 5,
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

    // Auxiliary Controller & Tracker Storage
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

    interface FollowState extends FollowOptions {
        targetType: FollowTargetType;
    }

    interface ControllerRecord {
        orbit?: OrbitState;
        lookAt?: LookAtOptions;
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

    // World setters & Euler (setWorldPosition, setWorldRotation, getWorldRotationEuler, setLocalRotationEuler, getLocalRotationEuler)
    const _worldSetLocalPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _worldSetInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _worldSetEulerRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // Node-level transformations (translateLocal, rotateLocal, rotateAroundAxis, lookAt)
    const _translateRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _translateRotatedDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateLocalRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _rotateAroundAxisRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _rotateAroundDisplacedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateAroundRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtDeltaPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _lookAtTargetPos: Vector3 = { x: 0, y: 0, z: 0 };

    // Active controllers & kinematics (_stepKinematics, _stepOrbit, _stepLookAt, _stepFollow)
    const _kinematicsStepDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _kinematicsAngularRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _kinematicsRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitTangentCross: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitSpinRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _lookAtPlayerPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followFacing: Vector3 = { x: 0, y: 0, z: 0 };
    const _followEuler: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _followRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetWithOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _followLerpedPos: Vector3 = { x: 0, y: 0, z: 0 };

    const _UP_AXIS: Readonly<Vector3> = Object.freeze({ x: 0, y: 1, z: 0 });

    // =========================================================================
    // Bitmask State Helpers
    // =========================================================================

    /**
     * Checks if a specific flag bit is set for a slot.
     * @param idx - The internal array index.
     * @param flag - The flag bitmask to check.
     * @returns True if the flag bit is set.
     */
    function _hasFlag(idx: number, flag: number): boolean {
        return (_flags[idx] & flag) !== 0;
    }

    /**
     * Sets one or more flag bits for a slot.
     * @param idx - The internal array index.
     * @param flag - The flag bitmask to set.
     */
    function _setFlag(idx: number, flag: number): void {
        _flags[idx] = _flags[idx] | flag;
    }

    /**
     * Clears one or more flag bits for a slot.
     * @param idx - The internal array index.
     * @param flag - The flag bitmask to clear.
     */
    function _clearFlag(idx: number, flag: number): void {
        _flags[idx] = _flags[idx] & ~flag;
    }

    /**
     * Checks if a slot is currently allocated and active.
     * @param idx - The internal array index.
     * @returns True if allocated and active.
     */
    function _isActive(idx: number): boolean {
        return _hasFlag(idx, FLAG_ACTIVE);
    }

    /**
     * Checks if a slot's world transform is dirty and needs re-evaluation.
     * @param idx - The internal array index.
     * @returns True if transform is dirty.
     */
    function _isDirty(idx: number): boolean {
        return _hasFlag(idx, FLAG_DIRTY);
    }

    /**
     * Checks if a slot's transform needs synchronization to the native mod.Object.
     * @param idx - The internal array index.
     * @returns True if engine transform is dirty.
     */
    function _isEngineTransformDirty(idx: number): boolean {
        return _hasFlag(idx, FLAG_ENGINE_TRANSFORM_DIRTY);
    }

    /**
     * Checks if a slot was spawned as a runtime entity that must be unspawned on destruction.
     * @param idx - The internal array index.
     * @returns True if runtime spawned.
     */
    function _isRuntimeSpawned(idx: number): boolean {
        return _hasFlag(idx, FLAG_RUNTIME_SPAWNED);
    }

    /**
     * Checks if a slot has a non-zero model pivot offset.
     * @param idx - The internal array index.
     * @returns True if pivot offset is active.
     */
    function _hasPivot(idx: number): boolean {
        return _hasFlag(idx, FLAG_HAS_PIVOT);
    }

    // =========================================================================
    // Slot & Handle Validation Helpers
    // =========================================================================

    /**
     * Resolves a public generation-encoded node ID to its internal array index.
     * @param id - The public generation-encoded node ID.
     * @returns The internal array index, or INVALID_INDEX if invalid, generation-mismatched, or inactive.
     */
    function _resolveIndex(id: SpatialNodeID): number {
        if (id <= 0) return INVALID_INDEX;

        const idx = (id % GENERATION_MULTIPLIER) - 1;

        if (idx < 0 || idx >= MAX_NODES) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[idx] !== expectedGen || !_isActive(idx)) return INVALID_INDEX;

        return idx;
    }

    /**
     * Encodes an internal array index and its current generation into a public node ID.
     * 1-based offset ensures slot 0 with generation 0 starts at ID 1, preserving ROOT_NODE_ID = 0.
     * @param idx - The internal array index.
     * @returns The encoded public node ID.
     */
    function _encodeId(idx: number): SpatialNodeID {
        return (idx + 1 + GENERATION_MULTIPLIER * _generations[idx]) as SpatialNodeID;
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

        const idx = _firstFree;
        _firstFree = _nextSibling[idx];
        _nextSibling[idx] = INVALID_INDEX;
        ++_activeNodeCount;

        return idx;
    }

    /**
     * Recycles a slot back into the intrusive free-list pool, incrementing its generation.
     * @param idx - The internal array index to recycle.
     */
    function _freeSlot(idx: number): void {
        _removeRoot(idx);
        _flags[idx] = 0;
        _parent[idx] = INVALID_INDEX;
        _firstChild[idx] = INVALID_INDEX;
        _objects[idx] = undefined;
        _controllers[idx] = undefined;
        --_activeNodeCount;

        if (_generations[idx] < MAX_GENERATIONS) {
            // Invalidate any outstanding handle IDs
            ++_generations[idx];

            // Intrusive push to free list
            _nextSibling[idx] = _firstFree;
            _firstFree = idx;
        } else if (logging.willLog(LogLevel.Warning)) {
            logging.log(`Slot ${idx} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    /**
     * Marks an index and all of its descendants as dirty.
     * @param idx - The internal array index.
     */
    function _markDirty(idx: number): void {
        _setFlag(idx, FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY);

        for (let cIdx = _firstChild[idx]; cIdx !== INVALID_INDEX; cIdx = _nextSibling[cIdx]) {
            _markDirty(cIdx);
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

    /**
     * Ensures that the world transform at `idx` and its ancestors are up to date.
     * @param idx - The internal array index.
     */
    function _ensureWorldTransformUpdated(idx: number): void {
        if (!_isDirty(idx)) return;

        const p = _parent[idx];

        if (p !== INVALID_INDEX) {
            _ensureWorldTransformUpdated(p);

            // World Scale = Parent World Scale * Local Scale
            _hadamardMultiplyArraysIntoArray(_worldScale, p, _localScale, idx, _worldScale, idx);

            // World Rotation = Parent World Rotation * Local Rotation
            _multiplyQuaternionsFromArraysIntoArray(_worldRot, p, _localRot, idx, _worldRot, idx);

            // Scaled Local Position = Local Pos * Parent World Scale
            _hadamardMultiplyArraysIntoVector(_localPos, idx, _worldScale, p, _worldEvalScaledPos);

            // Rotate scaled local pos by parent world rotation
            _cloneQuaternionFromArray(_worldEvalRot, _worldRot, p);
            Quaternions.rotateVector(_worldEvalScaledPos, _worldEvalRot, _worldEvalRotatedPos);

            // World Position = Parent World Position + Rotated Scaled Local Position
            _addVectorIntoArray(_worldPos, p, _worldEvalRotatedPos, _worldPos, idx);
        } else {
            // Root Node
            _copyVectorFromArrayIntoArray(_worldPos, _localPos, idx);
            _copyQuaternionFromArrayIntoArray(_worldRot, _localRot, idx);
            _copyVectorFromArrayIntoArray(_worldScale, _localScale, idx);
        }

        _clearFlag(idx, FLAG_DIRTY);
    }

    /**
     * Computes the visual placement position of the native model accounting for pivot offset.
     * @param idx - The internal array index.
     * @param out - Target Vector3.
     * @returns The evaluated visual placement vector.
     */
    function _computeRenderPosition(idx: number, out: Vector3): Vector3 {
        if (!_hasPivot(idx)) return _cloneVectorFromArray(out, _worldPos, idx);

        _hadamardMultiplyArraysIntoVector(_pivotOffset, idx, _worldScale, idx, _renderPivotScaled);
        _cloneQuaternionFromArray(_renderRot, _worldRot, idx);
        Quaternions.rotateVector(_renderPivotScaled, _renderRot, _renderPivotRotated);

        return _addArrayAndVectorIntoVector(_worldPos, idx, _renderPivotRotated, out);
    }

    // Root registration helpers

    /**
     * Registers an index as an active root node.
     * @param idx - The internal array index.
     */
    function _addRoot(idx: number): void {
        _parent[idx] = INVALID_INDEX;
        _nextSibling[idx] = _firstRoot;
        _firstRoot = idx;
    }

    /**
     * Unregisters a root node from the root chain.
     * @param idx - The internal array index.
     */
    function _removeRoot(idx: number): void {
        if (_firstRoot === INVALID_INDEX) return;

        if (_firstRoot === idx) {
            _firstRoot = _nextSibling[idx];
            _nextSibling[idx] = INVALID_INDEX;

            return;
        }

        for (let prev = _firstRoot; prev !== INVALID_INDEX; prev = _nextSibling[prev]) {
            if (_nextSibling[prev] !== idx) continue;

            _nextSibling[prev] = _nextSibling[idx];
            _nextSibling[idx] = INVALID_INDEX;

            return;
        }
    }

    /**
     * Unlinks a child node from its parent's child list.
     * @param parentIdx - The parent's internal array index.
     * @param childIdx - The child's internal array index.
     */
    function _unlinkChild(parentIdx: number, childIdx: number): void {
        if (_firstChild[parentIdx] === childIdx) {
            _firstChild[parentIdx] = _nextSibling[childIdx];
        } else {
            for (let prev = _firstChild[parentIdx]; prev !== INVALID_INDEX; prev = _nextSibling[prev]) {
                if (_nextSibling[prev] === childIdx) {
                    _nextSibling[prev] = _nextSibling[childIdx];
                    break;
                }
            }
        }
        _nextSibling[childIdx] = INVALID_INDEX;
    }

    function _initSlot(
        options?: NodeOptions,
        isRuntimeSpawned: boolean = false,
        object?: TransformableObject
    ): SpatialNodeID | null {
        const idx = _allocateSlot();

        if (idx === INVALID_INDEX) return null;

        _objects[idx] = object;
        _parent[idx] = INVALID_INDEX;
        _firstChild[idx] = INVALID_INDEX;
        _nextSibling[idx] = INVALID_INDEX;

        let flags = FLAG_ACTIVE | FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY;

        if (isRuntimeSpawned) {
            flags |= FLAG_RUNTIME_SPAWNED;
        }

        const pos = options?.position;
        const idx3 = idx * 3;
        _localPos[idx3] = pos ? pos.x : 0;
        _localPos[idx3 + 1] = pos ? pos.y : 0;
        _localPos[idx3 + 2] = pos ? pos.z : 0;

        if (options?.rotation) {
            if ('w' in options.rotation) {
                _copyQuaternionIntoArray(_localRot, idx, options.rotation);
            } else {
                Quaternions.setFromEuler(_worldSetEulerRot, options.rotation.x, options.rotation.y, options.rotation.z);
                _copyQuaternionIntoArray(_localRot, idx, _worldSetEulerRot);
            }
        } else {
            const idx4 = idx * 4;
            _localRot[idx4] = 1;
            _localRot[idx4 + 1] = 0;
            _localRot[idx4 + 2] = 0;
            _localRot[idx4 + 3] = 0;
        }

        const scale = options?.scale;

        if (typeof scale === 'number') {
            _setVectorInArray(_localScale, idx, scale);
        } else if (scale) {
            _copyVectorIntoArray(_localScale, idx, scale);
        } else {
            _setVectorInArray(_localScale, idx, 1);
        }

        if (options?.pivotOffset) {
            _copyVectorIntoArray(_pivotOffset, idx, options.pivotOffset);
            flags |= FLAG_HAS_PIVOT;
        } else {
            _setVectorInArray(_pivotOffset, idx, 0);
        }

        _copyVectorFromArrayIntoArray(_worldPos, _localPos, idx);
        _copyQuaternionFromArrayIntoArray(_worldRot, _localRot, idx);
        _copyVectorFromArrayIntoArray(_worldScale, _localScale, idx);

        _flags[idx] = flags;

        return _encodeId(idx);
    }

    function _computeFacingQuaternion(facing: Vector3, yawOnly: boolean, out: Quaternion): Quaternion {
        const yawRad = Math.atan2(facing.x, facing.z);
        const pitchRad = yawOnly ? 0 : -Math.asin(Math.max(-1, Math.min(1, facing.y)));

        return Quaternions.setFromEuler(out, pitchRad, yawRad, 0);
    }

    // =========================================================================
    // Scene Graph Updates & Controllers Evaluation
    // =========================================================================

    function _stepKinematics(idx: number, dt: number, ks?: KinematicsState): void {
        if (!ks) return;

        // 1. Linear Acceleration -> Linear Velocity
        if (ks.linearAcceleration) {
            if (!ks.linearVelocity) {
                ks.linearVelocity = { x: 0, y: 0, z: 0 };
            }

            Vectors.multiply(ks.linearAcceleration, dt, _kinematicsStepDelta);
            Vectors.add(ks.linearVelocity, _kinematicsStepDelta, ks.linearVelocity);
        }

        // 2. Linear Velocity -> Local Position
        if (ks.linearVelocity) {
            Vectors.multiply(ks.linearVelocity, dt, _kinematicsStepDelta);
            _addVectorIntoArray(_localPos, idx, _kinematicsStepDelta, _localPos, idx);
            _markDirty(idx);
        }

        // 3. Angular Acceleration -> Angular Velocity
        if (ks.angularAcceleration) {
            if (!ks.angularVelocity) {
                ks.angularVelocity = { x: 0, y: 0, z: 0 };
            }

            Vectors.multiply(ks.angularAcceleration, dt, _kinematicsStepDelta);
            Vectors.add(ks.angularVelocity, _kinematicsStepDelta, ks.angularVelocity);
        }

        // 4. Angular Velocity -> Local Rotation
        if (ks.angularVelocity) {
            const angle = Vectors.length(ks.angularVelocity) * dt;

            if (angle > 0) {
                Quaternions.setFromAxisAngle(_kinematicsAngularRot, ks.angularVelocity, angle);
                _cloneQuaternionFromArray(_kinematicsRot, _localRot, idx);
                Quaternions.multiply(_kinematicsRot, _kinematicsAngularRot, _kinematicsRot);
                _copyQuaternionIntoArray(_localRot, idx, _kinematicsRot);

                _markDirty(idx);
            }
        }
    }

    function _stepOrbit(idx: number, dt: number, os?: OrbitState): void {
        if (!os) return;

        os.currentAngleRad += os.speedRadPerSec * dt;

        const axis = os.axis ?? _UP_AXIS;
        const center = os.center ?? Vectors.ZERO;

        Quaternions.setFromAxisAngle(_orbitRot, axis, os.currentAngleRad);
        Quaternions.rotateVector(os.initialOffset, _orbitRot, _orbitRotatedOffset);

        // (add 2 vectors into array)
        const idx3 = idx * 3;
        _localPos[idx3] = center.x + _orbitRotatedOffset.x;
        _localPos[idx3 + 1] = center.y + _orbitRotatedOffset.y;
        _localPos[idx3 + 2] = center.z + _orbitRotatedOffset.z;

        if (os.faceTangent) {
            Vectors.cross(axis, _orbitRotatedOffset, _orbitTangentCross);

            if (Vectors.lengthSquared(_orbitTangentCross) > 0) {
                const yaw = Math.atan2(_orbitTangentCross.x, _orbitTangentCross.z);
                _copyQuaternionIntoArray(_localRot, idx, Quaternions.setFromEuler(_orbitRot, 0, yaw, 0));
            }
        }

        if (os.selfSpinSpeedRadPerSec) {
            Quaternions.setFromAxisAngle(_orbitSpinRot, _UP_AXIS, os.selfSpinSpeedRadPerSec * dt);
            _cloneQuaternionFromArray(_orbitRot, _localRot, idx);
            Quaternions.multiply(_orbitRot, _orbitSpinRot, _orbitRot);
            _copyQuaternionIntoArray(_localRot, idx, _orbitRot);
        }

        _markDirty(idx);
    }

    function _stepLookAt(idx: number, options?: LookAtOptions): void {
        if (!options?.target) return;

        const target = options.target;
        const nodeId = _encodeId(idx);

        if (typeof target === 'number') {
            const targetPos = getWorldPosition(target, _lookAtTargetPos);

            if (targetPos) {
                lookAt(nodeId, targetPos, options.upAxis);
            }
        } else if ('x' in target && 'y' in target && 'z' in target) {
            lookAt(nodeId, target, options.upAxis);
        } else if (mod.IsValid(target)) {
            Vectors.toVector3(mod.GetObjectPosition(target), _lookAtPlayerPos);
            lookAt(nodeId, _lookAtPlayerPos, options.upAxis);
        }
    }

    function _stepFollow(idx: number, dt: number, follow?: FollowState): void {
        if (!follow || follow.targetType === FollowTargetType.None) return;

        const target = follow.target;
        if (target === undefined || target === null) return;

        const nodeId = _encodeId(idx);
        let targetPos: Vector3 | undefined;
        let targetRot: Quaternion | undefined;
        const trackRot = follow.trackRotation ?? false;
        const yawOnly = follow.yawOnly ?? false;

        switch (follow.targetType) {
            case FollowTargetType.Player: {
                const player = target as mod.Player;
                if (!mod.IsValid(player)) return;

                targetPos = Vectors.toVector3(mod.GetObjectPosition(player), _followTargetPos);

                if (trackRot || follow.offset) {
                    Vectors.toVector3(
                        mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection),
                        _followFacing
                    );
                    targetRot = _computeFacingQuaternion(_followFacing, yawOnly, _followTargetRot);
                }
                break;
            }

            case FollowTargetType.Vehicle: {
                const vehicle = target as mod.Vehicle;
                if (!mod.IsValid(vehicle)) return;

                targetPos = Vectors.toVector3(
                    mod.GetVehicleState(vehicle, mod.VehicleStateVector.VehiclePosition),
                    _followTargetPos
                );

                if (trackRot || follow.offset) {
                    Vectors.toVector3(
                        mod.GetVehicleState(vehicle, mod.VehicleStateVector.FacingDirection),
                        _followFacing
                    );
                    targetRot = _computeFacingQuaternion(_followFacing, yawOnly, _followTargetRot);
                }
                break;
            }

            case FollowTargetType.TrackableObject: {
                const obj = target as mod.Object;
                if (!mod.IsValid(obj)) return;

                targetPos = Vectors.toVector3(mod.GetObjectPosition(obj), _followTargetPos);

                if (trackRot || follow.offset) {
                    Vectors.toVector3(mod.GetObjectRotation(obj), _followEuler);
                    const pitch = yawOnly ? 0 : _followEuler.x;
                    const roll = yawOnly ? 0 : _followEuler.z;
                    targetRot = Quaternions.setFromEuler(_followTargetRot, pitch, _followEuler.y, roll);
                }
                break;
            }

            case FollowTargetType.SpatialNode: {
                const targetNodeId = target as SpatialNodeID;
                const tIdx = _resolveIndex(targetNodeId);
                if (_isInvalidIndexAndLogWarning(tIdx)) return;

                targetPos = getWorldPosition(targetNodeId, _followTargetPos);

                if (trackRot || follow.offset) {
                    targetRot = getWorldRotation(targetNodeId, _followTargetRot);
                    if (targetRot && yawOnly) {
                        const euler = Quaternions.toEuler(targetRot, _followEuler);
                        targetRot = Quaternions.setFromEuler(_followTargetRot, 0, euler.y, 0);
                    }
                }
                break;
            }

            case FollowTargetType.TransparentObject: {
                const transparent = target as TransparentObject;
                targetPos = transparent.position;

                if (transparent.rotation && (trackRot || follow.offset)) {
                    if ('w' in transparent.rotation) {
                        targetRot = transparent.rotation as Quaternion;
                        if (yawOnly) {
                            const euler = Quaternions.toEuler(targetRot, _followEuler);
                            targetRot = Quaternions.setFromEuler(_followTargetRot, 0, euler.y, 0);
                        }
                    } else {
                        const euler = transparent.rotation as Vector3;
                        const pitch = yawOnly ? 0 : euler.x;
                        const roll = yawOnly ? 0 : euler.z;
                        targetRot = Quaternions.setFromEuler(_followTargetRot, pitch, euler.y, roll);
                    }
                }
                break;
            }
        }

        if (!targetPos) return;

        const offset = follow.offset;
        let finalTargetPos: Vector3;

        if (offset) {
            if (targetRot) {
                Quaternions.rotateVector(offset, targetRot, _followRotatedOffset);
                Vectors.add(targetPos, _followRotatedOffset, _followTargetWithOffset);
            } else {
                Vectors.add(targetPos, offset, _followTargetWithOffset);
            }
            finalTargetPos = _followTargetWithOffset;
        } else {
            finalTargetPos = targetPos;
        }

        const smoothing = follow.smoothing ?? 10;

        if (typeof smoothing === 'function') {
            const currentPos = getWorldPosition(nodeId, _followLerpedPos);

            if (!currentPos) return;

            const nextPos = smoothing(currentPos, finalTargetPos, dt, _followLerpedPos);
            setWorldPosition(nodeId, nextPos);
        } else if (smoothing <= 0) {
            setWorldPosition(nodeId, finalTargetPos);
        } else {
            const currentPos = getWorldPosition(nodeId, _followLerpedPos);

            if (!currentPos) return;

            const factor = Math.min(1, smoothing * dt);
            Vectors.lerp(currentPos, finalTargetPos, factor, _followLerpedPos);
            setWorldPosition(nodeId, _followLerpedPos);
        }

        if (trackRot && targetRot) {
            setWorldRotation(nodeId, targetRot);
        }
    }

    function _updateNode(idx: number, dt: number): void {
        if (!_isActive(idx)) return;

        const controller = _controllers[idx];

        if (controller) {
            _stepKinematics(idx, dt, controller.kinematics);
            _stepOrbit(idx, dt, controller.orbit);
            _stepLookAt(idx, controller.lookAt);
            _stepFollow(idx, dt, controller.follow);
        }

        for (let cIdx = _firstChild[idx]; cIdx !== INVALID_INDEX; cIdx = _nextSibling[cIdx]) {
            _updateNode(cIdx, dt);
        }
    }

    function _syncNode(idx: number): void {
        if (!_isActive(idx)) return;

        _ensureWorldTransformUpdated(idx);

        const obj = _objects[idx];

        if (_isEngineTransformDirty(idx) && obj && mod.IsValid(obj)) {
            const renderPos = _computeRenderPosition(idx, _renderPos);
            const rotEuler = Quaternions.toEuler(_cloneQuaternionFromArray(_renderRot, _worldRot, idx), _renderEuler);

            try {
                mod.SetObjectTransform(
                    obj as mod.SpatialObject,
                    mod.CreateTransform(Vectors.toVector(renderPos), Vectors.toVector(rotEuler))
                );
            } catch (error: unknown) {
                logging.log('Error applying transform to native object', LogLevel.Error, error);
            }

            _clearFlag(idx, FLAG_ENGINE_TRANSFORM_DIRTY);
        }

        for (let cIdx = _firstChild[idx]; cIdx !== INVALID_INDEX; cIdx = _nextSibling[cIdx]) {
            _syncNode(cIdx);
        }
    }

    function _isInvalidIndexAndLogWarning(idx: number): boolean {
        if (idx === INVALID_INDEX) {
            logging.log('Node is invalid', LogLevel.Warning);
            return true;
        }

        return false;
    }

    // =========================================================================
    // Public Functional API
    // =========================================================================

    // -------------------------------------------------------------------------
    // Node Creation & Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Creates an empty SpatialNode (virtual parent anchor or child node).
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or null if parentId is invalid or pool is full.
     */
    export function createEmpty(options?: NodeOptions): SpatialNodeID | null {
        const parentId = options?.parentId ?? ROOT_NODE_ID;

        if (parentId !== ROOT_NODE_ID && _resolveIndex(parentId) === INVALID_INDEX) {
            logging.log('Create empty failed, parent is invalid', LogLevel.Error);
            return null;
        }

        const id = _initSlot(options, false);

        if (id === null) return null;

        const idx = _resolveIndex(id);

        if (parentId === ROOT_NODE_ID) {
            _addRoot(idx);
        } else {
            setParent(id, parentId);
        }

        return id;
    }

    /**
     * Spawns a runtime prefab as a new SpatialNode (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or null if spawning failed, parentId is invalid, or pool is full.
     */
    export function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNodeID | null {
        const parentId = options?.parentId ?? ROOT_NODE_ID;

        if (parentId !== ROOT_NODE_ID && _resolveIndex(parentId) === INVALID_INDEX) {
            logging.log('Create runtime failed, parent is invalid', LogLevel.Error);
            return null;
        }

        const id = _initSlot(options, true);

        if (id === null) return null;

        const idx = _resolveIndex(id);

        if (parentId === ROOT_NODE_ID) {
            _addRoot(idx);
        } else {
            setParent(id, parentId);
        }

        _ensureWorldTransformUpdated(idx);

        const renderPos = _computeRenderPosition(idx, _renderPos);
        const rotEuler = Quaternions.toEuler(_cloneQuaternionFromArray(_renderRot, _worldRot, idx), _renderEuler);

        const c3 = idx * 3;
        const scaleVec = mod.CreateVector(_worldScale[c3], _worldScale[c3 + 1], _worldScale[c3 + 2]);

        try {
            const spawned = mod.SpawnObject(prefab, Vectors.toVector(renderPos), Vectors.toVector(rotEuler), scaleVec);

            if (!mod.IsValid(spawned)) {
                destroy(id);
                logging.log('Create runtime failed, failed to spawn object prefab', LogLevel.Error);
                return null;
            }

            _objects[idx] = spawned as TransformableObject;
            return id;
        } catch (error: unknown) {
            destroy(id);
            logging.log('Create runtime failed, spawn object threw exception', LogLevel.Error, error);
            return null;
        }
    }

    /**
     * Wraps an existing in-game object as a SpatialNode (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or null if parentId is invalid or pool is full.
     */
    export function createExisting(object: TransformableObject, options?: NodeOptions): SpatialNodeID | null {
        const parentId = options?.parentId ?? ROOT_NODE_ID;

        if (parentId !== ROOT_NODE_ID && _resolveIndex(parentId) === INVALID_INDEX) {
            logging.log('Create existing failed, parent is invalid', LogLevel.Error);
            return null;
        }

        const id = _initSlot(options, false, object);

        if (id === null) return null;

        const idx = _resolveIndex(id);

        if (parentId === ROOT_NODE_ID) {
            _addRoot(idx);
        } else {
            setParent(id, parentId);
        }

        return id;
    }

    /**
     * Checks whether a node ID is currently valid and active.
     * @param id - The node ID to check.
     * @returns True if valid and alive, false otherwise.
     */
    export function isValid(id: SpatialNodeID): boolean {
        if (id === ROOT_NODE_ID) return true;

        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return false;

        const obj = _objects[idx];

        return obj ? mod.IsValid(obj) : true;
    }

    /**
     * Checks whether a node ID has been deleted.
     * @param id - The node ID to check.
     * @returns True if the node was created and subsequently destroyed, false otherwise.
     */
    export function isDeleted(id: SpatialNodeID): boolean {
        if (id <= 0) return false;

        const idx = (id % GENERATION_MULTIPLIER) - 1;

        if (idx < 0 || idx >= MAX_NODES) return false;

        const expectedGeneration = Math.floor(id / GENERATION_MULTIPLIER);

        return expectedGeneration < _generations[idx];
    }

    /**
     * Recursively destroys a node and all of its descendants, unspawning native objects.
     * @param id - The node ID to destroy.
     */
    export function destroy(id: SpatialNodeID): void {
        if (id === ROOT_NODE_ID) {
            logging.log('Cannot destroy the root node', LogLevel.Warning);
            return;
        }

        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        // Recursively destroy children first
        let cIdx = _firstChild[idx];

        while (cIdx !== INVALID_INDEX) {
            const next = _nextSibling[cIdx];
            destroy(_encodeId(cIdx));
            cIdx = next;
        }

        const pIdx = _parent[idx];

        if (pIdx !== INVALID_INDEX) {
            _unlinkChild(pIdx, idx);
        } else {
            _removeRoot(idx);
        }

        const obj = _objects[idx];

        if (_isRuntimeSpawned(idx) && obj && mod.IsValid(obj)) {
            try {
                mod.UnspawnObject(obj);
            } catch (error: unknown) {
                logging.log('Error unspawning object on destroy', LogLevel.Error, error);
            }
        }

        _freeSlot(idx);
    }

    // -------------------------------------------------------------------------
    // Hierarchy Management
    // -------------------------------------------------------------------------

    /**
     * Sets the parent node of a node.
     * @param id - The child node ID.
     * @param parentId - The new parent node ID (can be ROOT_NODE_ID or another node).
     * @returns True if parent was set successfully, false if circular or invalid.
     */
    export function setParent(id: SpatialNodeID, parentId: SpatialNodeID): boolean {
        if (id === ROOT_NODE_ID) {
            logging.log('Cannot re-parent the root node', LogLevel.Warning);
            return false;
        }

        if (id === parentId) return false;

        const cIdx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(cIdx)) return false;

        if (parentId === ROOT_NODE_ID) {
            // Unlink from current parent if not already root
            const oldParentIdx = _parent[cIdx];

            if (oldParentIdx === INVALID_INDEX) return true; // Already top-level root child

            _unlinkChild(oldParentIdx, cIdx);
            _addRoot(cIdx);

            _markDirty(cIdx);

            return true;
        }

        const pIdx = _resolveIndex(parentId);

        if (_isInvalidIndexAndLogWarning(pIdx)) return false;

        // Check circular dependency
        for (let index = pIdx; index !== INVALID_INDEX; index = _parent[index]) {
            if (index === cIdx) {
                logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                return false;
            }
        }

        const oldParentIdx = _parent[cIdx];

        if (oldParentIdx === pIdx) return true;

        if (oldParentIdx !== INVALID_INDEX) {
            _unlinkChild(oldParentIdx, cIdx);
        } else {
            _removeRoot(cIdx);
        }

        _parent[cIdx] = pIdx;
        _nextSibling[cIdx] = INVALID_INDEX;

        if (_firstChild[pIdx] === INVALID_INDEX) {
            _firstChild[pIdx] = cIdx;
        } else {
            let last = _firstChild[pIdx];

            while (_nextSibling[last] !== INVALID_INDEX) {
                last = _nextSibling[last];
            }

            _nextSibling[last] = cIdx;
        }

        if (_controllers[cIdx]) {
            _controllers[cIdx].follow = undefined;
        }

        _markDirty(cIdx);

        return true;
    }

    /**
     * Returns the parent node ID of a node.
     * @param id - The node ID.
     * @returns The parent node ID, null for ROOT_NODE_ID, or undefined if the node does not exist.
     */
    export function getParent(id: SpatialNodeID): SpatialNodeID | null | undefined {
        if (id === ROOT_NODE_ID) return null;

        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        const pIdx = _parent[idx];

        return pIdx !== INVALID_INDEX ? _encodeId(pIdx) : ROOT_NODE_ID;
    }

    /**
     * Returns the total direct child count for a node or the root scene.
     * @param id - The node ID.
     * @returns The number of direct children, or undefined if the node does not exist.
     */
    export function getChildCount(id: SpatialNodeID): number | undefined {
        const idx = id === ROOT_NODE_ID ? -2 : _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        let count = 0;

        for (
            let cIdx = id === ROOT_NODE_ID ? _firstRoot : _firstChild[idx];
            cIdx !== INVALID_INDEX;
            cIdx = _nextSibling[cIdx]
        ) {
            ++count;
        }

        return count;
    }

    /**
     * Returns an array of direct child node IDs.
     * @param id - The node ID.
     * @returns Array of child node IDs, or undefined if the node does not exist.
     */
    export function getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined {
        const idx = id === ROOT_NODE_ID ? -2 : _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        const list: SpatialNodeID[] = [];

        for (
            let cIdx = id === ROOT_NODE_ID ? _firstRoot : _firstChild[idx];
            cIdx !== INVALID_INDEX;
            cIdx = _nextSibling[cIdx]
        ) {
            list.push(_encodeId(cIdx));
        }

        return list;
    }

    /**
     * Retrieves a child node ID at a specific zero-based index.
     * @param id - The node ID.
     * @param index - The child index.
     * @returns The child node ID, null if out of bounds, or undefined if the node does not exist.
     */
    export function getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined {
        if (index < 0) return null;

        const idx = id === ROOT_NODE_ID ? -2 : _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        let currentIndex = 0;

        for (
            let cIdx = id === ROOT_NODE_ID ? _firstRoot : _firstChild[idx];
            cIdx !== INVALID_INDEX;
            cIdx = _nextSibling[cIdx]
        ) {
            if (currentIndex === index) return _encodeId(cIdx);

            ++currentIndex;
        }

        return null;
    }

    /**
     * Iterates over all direct children of a node with zero allocations.
     * @param id - The node ID.
     * @param callback - Callback invoked for each child ID.
     */
    export function forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void {
        const idx = id === ROOT_NODE_ID ? -2 : _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        let currentIndex = 0;

        for (let cIdx = id === ROOT_NODE_ID ? _firstRoot : _firstChild[idx]; cIdx !== INVALID_INDEX; ) {
            const next = _nextSibling[cIdx];

            CallbackHandler.invoke(
                callback,
                _encodeId(cIdx),
                currentIndex++,
                undefined,
                undefined,
                logging,
                'forEachChild'
            );

            cIdx = next;
        }
    }

    // -------------------------------------------------------------------------
    // Local Transforms
    // -------------------------------------------------------------------------

    /**
     * Gets the local position of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local position vector, or undefined if the node does not exist.
     */
    export function getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        return idx === INVALID_INDEX ? undefined : _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _localPos, idx);
    }

    /**
     * Sets the local position of a node.
     * @param id - The node ID.
     * @param pos - The new local position.
     */
    export function setLocalPosition(id: SpatialNodeID, pos: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _copyVectorIntoArray(_localPos, idx, pos);
        _markDirty(idx);
    }

    /**
     * Gets the local rotation Quaternion of a node.
     * @param id - The node ID.
     * @param out - Optional target Quaternion for zero allocations.
     * @returns The local rotation quaternion, or undefined if the node does not exist.
     */
    export function getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined {
        const idx = _resolveIndex(id);

        return idx === INVALID_INDEX
            ? undefined
            : _cloneQuaternionFromArray(out ?? { w: 1, x: 0, y: 0, z: 0 }, _localRot, idx);
    }

    /**
     * Sets the local rotation Quaternion of a node.
     * @param id - The node ID.
     * @param rot - The new local rotation quaternion.
     */
    export function setLocalRotation(id: SpatialNodeID, rot: Quaternion): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _copyQuaternionIntoArray(_localRot, idx, rot);
        _markDirty(idx);
    }

    /**
     * Gets the local rotation as Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local Euler angles vector in radians, or undefined if the node does not exist.
     */
    export function getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        return idx === INVALID_INDEX
            ? undefined
            : Quaternions.toEuler(
                  _cloneQuaternionFromArray(_worldSetEulerRot, _localRot, idx),
                  out ?? { x: 0, y: 0, z: 0 }
              );
    }

    /**
     * Sets the local rotation using Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param euler - The Euler angles vector in radians.
     */
    export function setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _copyQuaternionIntoArray(
            _localRot,
            idx,
            Quaternions.setFromEuler(_worldSetEulerRot, euler.x, euler.y, euler.z)
        );

        _markDirty(idx);
    }

    /**
     * Gets the local scale of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local scale vector, or undefined if the node does not exist.
     */
    export function getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        return idx === INVALID_INDEX ? undefined : _cloneVectorFromArray(out ?? { x: 1, y: 1, z: 1 }, _localScale, idx);
    }

    /**
     * Sets the local scale of a node.
     * @param id - The node ID.
     * @param scale - The new uniform or per-axis scale.
     */
    export function setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        if (typeof scale === 'number') {
            _setVectorInArray(_localScale, idx, scale);
        } else {
            _copyVectorIntoArray(_localScale, idx, scale);
        }

        _markDirty(idx);
    }

    // -------------------------------------------------------------------------
    // World Transforms
    // -------------------------------------------------------------------------

    /**
     * Gets the evaluated world position of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world position vector, or undefined if the node does not exist.
     */
    export function getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        return _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _worldPos, idx);
    }

    /**
     * Sets the world position directly (calculates appropriate local coordinates).
     * @param id - The node ID.
     * @param worldPos - The desired world position.
     */
    export function setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        const pIdx = _parent[idx];

        if (pIdx === INVALID_INDEX) {
            setLocalPosition(id, worldPos);
            return;
        }

        worldToLocalPoint(_encodeId(pIdx), worldPos, _worldSetLocalPos);
        setLocalPosition(id, _worldSetLocalPos);
    }

    /**
     * Gets the evaluated world rotation Quaternion of a node.
     * @param id - The node ID.
     * @param out - Optional target Quaternion for zero allocations.
     * @returns The world rotation quaternion, or undefined if the node does not exist.
     */
    export function getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        return _cloneQuaternionFromArray(out ?? { w: 1, x: 0, y: 0, z: 0 }, _worldRot, idx);
    }

    /**
     * Sets the world rotation directly (calculates appropriate local quaternion).
     * @param id - The node ID.
     * @param worldRot - The desired world rotation quaternion.
     */
    export function setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        const pIdx = _parent[idx];

        if (pIdx === INVALID_INDEX) {
            setLocalRotation(id, worldRot);
            return;
        }

        _ensureWorldTransformUpdated(pIdx);

        Quaternions.conjugate(_cloneQuaternionFromArray(_worldSetInvRot, _worldRot, pIdx), _worldSetInvRot);
        Quaternions.multiply(_worldSetInvRot, worldRot, _worldSetInvRot);
        setLocalRotation(id, _worldSetInvRot);
    }

    /**
     * Gets the evaluated world rotation as Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world Euler angles vector in radians, or undefined if the node does not exist.
     */
    export function getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        return Quaternions.toEuler(
            _cloneQuaternionFromArray(_worldSetEulerRot, _worldRot, idx),
            out ?? { x: 0, y: 0, z: 0 }
        );
    }

    /**
     * Sets the world rotation directly using Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param worldEuler - The Euler angles vector in radians.
     */
    export function setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void {
        Quaternions.setFromEuler(_worldSetEulerRot, worldEuler.x, worldEuler.y, worldEuler.z);
        setWorldRotation(id, _worldSetEulerRot);
    }

    /**
     * Gets the evaluated world scale of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world scale vector, or undefined if the node does not exist.
     */
    export function getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        return _cloneVectorFromArray(out ?? { x: 1, y: 1, z: 1 }, _worldScale, idx);
    }

    /**
     * Gets the model pivot offset for a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3.
     * @returns The pivot offset vector, null if unset, or undefined if the node does not exist.
     */
    export function getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | null | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        if (!_hasPivot(idx)) return null;

        return _cloneVectorFromArray(out ?? { x: 0, y: 0, z: 0 }, _pivotOffset, idx);
    }

    /**
     * Sets the in-game model pivot offset correction on a node.
     * @param id - The node ID.
     * @param offset - The pivot offset vector or undefined/null to clear.
     */
    export function setPivotOffset(id: SpatialNodeID, offset?: Vector3 | null): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        // Pivot offset only affects visual model placement during engine sync (computeRenderPosition),
        // not the mathematical scene graph transform hierarchy, so only FLAG_ENGINE_TRANSFORM_DIRTY is set.
        if (offset) {
            _copyVectorIntoArray(_pivotOffset, idx, offset);
            _setFlag(idx, FLAG_HAS_PIVOT | FLAG_ENGINE_TRANSFORM_DIRTY);
        } else {
            _setVectorInArray(_pivotOffset, idx, 0);
            _clearFlag(idx, FLAG_HAS_PIVOT);
            _setFlag(idx, FLAG_ENGINE_TRANSFORM_DIRTY);
        }
    }

    // -------------------------------------------------------------------------
    // Transformations & Space Projections
    // -------------------------------------------------------------------------

    /**
     * Ensures that the world transform at `id` and its ancestors are up to date.
     * @param id - The node ID.
     */
    export function ensureWorldTransformUpdated(id: SpatialNodeID): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _ensureWorldTransformUpdated(idx);
    }

    /**
     * Computes the visual placement position of the native model accounting for pivot offset.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The render position vector, or undefined if the node does not exist.
     */
    export function computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        return _computeRenderPosition(idx, out ?? { x: 0, y: 0, z: 0 });
    }

    /**
     * Translates a node in local coordinate space.
     * @param id - The node ID.
     * @param delta - The local delta vector.
     */
    export function translateLocal(id: SpatialNodeID, delta: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _cloneQuaternionFromArray(_translateRot, _localRot, idx);
        Quaternions.rotateVector(delta, _translateRot, _translateRotatedDelta);
        _addVectorIntoArray(_localPos, idx, _translateRotatedDelta, _localPos, idx);
        _markDirty(idx);
    }

    /**
     * Translates a node in parent/world coordinate space.
     * @param id - The node ID.
     * @param delta - The delta vector.
     */
    export function translate(id: SpatialNodeID, delta: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _addVectorIntoArray(_localPos, idx, delta, _localPos, idx);
        _markDirty(idx);
    }

    /**
     * Rotates a node locally by multiplying with a delta Quaternion.
     * @param id - The node ID.
     * @param deltaRot - The delta quaternion.
     */
    export function rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _cloneQuaternionFromArray(_rotateLocalRot, _localRot, idx);
        Quaternions.multiply(_rotateLocalRot, deltaRot, _rotateLocalRot);
        _copyQuaternionIntoArray(_localRot, idx, _rotateLocalRot);
        _markDirty(idx);
    }

    /**
     * Rotates a node around an arbitrary axis and optional pivot center.
     * @param id - The node ID.
     * @param axis - The unit rotation axis.
     * @param angleRad - The angle in radians.
     * @param pivotCenter - Optional center point in parent space.
     */
    export function rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        Quaternions.setFromAxisAngle(_rotateAroundAxisRot, axis, angleRad);

        if (pivotCenter) {
            const localPos = _cloneVectorFromArray(_rotateAroundDisplacedPos, _localPos, idx);
            Vectors.subtract(localPos, pivotCenter, _rotateAroundDisplacedPos);
            Quaternions.rotateVector(_rotateAroundDisplacedPos, _rotateAroundAxisRot, _rotateAroundRotatedPos);
            Vectors.add(pivotCenter, _rotateAroundRotatedPos, localPos);
            _copyVectorIntoArray(_localPos, idx, localPos);
        }

        _cloneQuaternionFromArray(_rotateLocalRot, _localRot, idx);
        Quaternions.multiply(_rotateAroundAxisRot, _rotateLocalRot, _rotateLocalRot);
        _copyQuaternionIntoArray(_localRot, idx, _rotateLocalRot);
        _markDirty(idx);
    }

    /**
     * Rotates a node to face a target point in world coordinates.
     * @param id - The node ID.
     * @param targetWorld - The world coordinate to face.
     * @param upAxis - The world up reference vector (default: 0, 1, 0).
     */
    export function lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        _ensureWorldTransformUpdated(idx);

        const worldPos = _cloneVectorFromArray(_lookAtDeltaPos, _worldPos, idx);
        Vectors.subtract(targetWorld, worldPos, _lookAtDeltaPos);
        Quaternions.setFromLookRotation(_lookAtRot, _lookAtDeltaPos, upAxis ?? _UP_AXIS);
        setWorldRotation(id, _lookAtRot);
    }

    /**
     * Converts a local point to world coordinate space.
     * @param id - The node ID.
     * @param localPoint - Point in local coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed world space point, or undefined if the node does not exist.
     */
    export function localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        const target = out ?? { x: 0, y: 0, z: 0 };
        const wScale = _cloneVectorFromArray(_projLocalScaled, _worldScale, idx);
        const wRot = _cloneQuaternionFromArray(_projRot, _worldRot, idx);
        const wPos = _cloneVectorFromArray(_projWorldPos, _worldPos, idx);

        Vectors.hadamardMultiply(localPoint, wScale, _projLocalScaled);
        Quaternions.rotateVector(_projLocalScaled, wRot, target);

        return Vectors.add(target, wPos, target);
    }

    /**
     * Converts a world space point to local coordinate space.
     * @param id - The node ID.
     * @param worldPoint - Point in world coordinates.
     * @param out - Optional target Vector3.
     * @returns The transformed local space point, or undefined if the node does not exist.
     */
    export function worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        const target = out ?? { x: 0, y: 0, z: 0 };
        const wPos = _cloneVectorFromArray(_projWorldDelta, _worldPos, idx);
        const wRot = _cloneQuaternionFromArray(_projInvRot, _worldRot, idx);
        const ws = _cloneVectorFromArray(_projLocalScaled, _worldScale, idx);

        Vectors.subtract(worldPoint, wPos, _projWorldDelta);
        Quaternions.conjugate(wRot, _projInvRot);
        Quaternions.rotateVector(_projWorldDelta, _projInvRot, target);

        target.x = Math.abs(ws.x) > 1e-6 ? target.x / ws.x : 0;
        target.y = Math.abs(ws.y) > 1e-6 ? target.y / ws.y : 0;
        target.z = Math.abs(ws.z) > 1e-6 ? target.z / ws.z : 0;

        return target;
    }

    /**
     * Converts a local direction vector to world space (ignores translation).
     * @param id - The node ID.
     * @param localVec - Local direction vector.
     * @param out - Optional target Vector3.
     * @returns The transformed world direction vector, or undefined if the node does not exist.
     */
    export function localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        const wRot = _cloneQuaternionFromArray(_projRot, _worldRot, idx);

        return Quaternions.rotateVector(localVec, wRot, out ?? { x: 0, y: 0, z: 0 });
    }

    /**
     * Converts a world direction vector to local space (ignores translation).
     * @param id - The node ID.
     * @param worldVec - World direction vector.
     * @param out - Optional target Vector3.
     * @returns The transformed local direction vector, or undefined if the node does not exist.
     */
    export function worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3 | undefined {
        const idx = _resolveIndex(id);

        if (idx === INVALID_INDEX) return undefined;

        _ensureWorldTransformUpdated(idx);

        const wRot = _cloneQuaternionFromArray(_projInvRot, _worldRot, idx);
        Quaternions.conjugate(wRot, _projInvRot);

        return Quaternions.rotateVector(worldVec, _projInvRot, out ?? { x: 0, y: 0, z: 0 });
    }

    // -------------------------------------------------------------------------
    // Entity Controllers
    // -------------------------------------------------------------------------

    /**
     * Configures orbital rotation motion on a node.
     * Clears any active follow controller or linear kinematics.
     * @param id - The node ID.
     * @param options - Orbit configuration or null to disable.
     */
    export function setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        if (!options) {
            if (_controllers[idx]) {
                _controllers[idx].orbit = undefined;
            }

            return;
        }

        if (!_controllers[idx]) {
            _controllers[idx] = {};
        }

        _controllers[idx].follow = undefined;

        if (_controllers[idx].kinematics) {
            _controllers[idx].kinematics.linearVelocity = undefined;
            _controllers[idx].kinematics.linearAcceleration = undefined;
        }

        if (_controllers[idx].lookAt?.target !== undefined) {
            options.faceTangent = false;
            options.selfSpinSpeedRadPerSec = undefined;
        }

        const existing = _controllers[idx].orbit;

        if (existing) {
            existing.speedRadPerSec = options.speedRadPerSec;
            existing.axis = options.axis;
            existing.center = options.center;
            existing.faceTangent = options.faceTangent;
            existing.selfSpinSpeedRadPerSec = options.selfSpinSpeedRadPerSec;
            existing.currentAngleRad = 0;

            const localPos = _cloneVectorFromArray(_orbitRotatedOffset, _localPos, idx);
            Vectors.subtract(localPos, options.center ?? Vectors.ZERO, existing.initialOffset);
        } else {
            const localPos = _cloneVectorFromArray(_orbitRotatedOffset, _localPos, idx);

            _controllers[idx].orbit = {
                ...options,
                currentAngleRad: 0,
                initialOffset: Vectors.subtract(localPos, options.center ?? Vectors.ZERO),
            };
        }
    }

    /**
     * Configures LookAt target tracking on a node.
     * Clears any active angular kinematics or orbit faceTangent/spin conflicting with look-at.
     * @param id - The node ID.
     * @param options - LookAt configuration or null to disable.
     */
    export function setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        if (!_controllers[idx]) {
            _controllers[idx] = {};
        }

        if (options?.target !== undefined) {
            if (_controllers[idx].kinematics) {
                _controllers[idx].kinematics.angularVelocity = undefined;
                _controllers[idx].kinematics.angularAcceleration = undefined;
            }

            if (_controllers[idx].orbit) {
                _controllers[idx].orbit.faceTangent = false;
                _controllers[idx].orbit.selfSpinSpeedRadPerSec = undefined;
            }
        }

        _controllers[idx].lookAt = options ?? undefined;
    }

    /**
     * Configures continuous follow behavior on a node in world space.
     * Automatically sets parent to ROOT_NODE_ID.
     * Clears any active orbit controller or linear kinematics.
     * Target type is classified once upon configuration to avoid per-frame engine type checks.
     * @param id - The node ID.
     * @param options - Follow configuration or null to disable.
     */
    export function setFollow(id: SpatialNodeID, options?: FollowOptions | null): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        if (options?.target !== undefined && options.target !== null) {
            setParent(id, ROOT_NODE_ID);

            if (_controllers[idx]) {
                _controllers[idx].orbit = undefined;

                if (_controllers[idx].kinematics) {
                    _controllers[idx].kinematics.linearVelocity = undefined;
                    _controllers[idx].kinematics.linearAcceleration = undefined;
                }
            } else {
                _controllers[idx] = {};
            }

            const target = options.target;
            let targetType = FollowTargetType.None;

            if (typeof target === 'number') {
                targetType = FollowTargetType.SpatialNode;
            } else if (mod.IsType(target as mod.Object, mod.Types.Player)) {
                targetType = FollowTargetType.Player;
            } else if (mod.IsType(target as mod.Object, mod.Types.Vehicle)) {
                targetType = FollowTargetType.Vehicle;
            } else if (mod.IsValid(target as mod.Object)) {
                targetType = FollowTargetType.TrackableObject;
            } else if ('position' in target && typeof target.position === 'object') {
                targetType = FollowTargetType.TransparentObject;
            }

            if (targetType === FollowTargetType.None) {
                logging.log('Unable to determine follow target type', LogLevel.Warning);
                _controllers[idx]!.follow = undefined;
                return;
            }

            _controllers[idx]!.follow = {
                ...options,
                offset: options.offset ? Vectors.clone(options.offset) : undefined,
                targetType,
            };
        } else {
            if (_controllers[idx]) {
                _controllers[idx].follow = undefined;
            }
        }
    }

    /**
     * Configures kinematic velocity and acceleration integration on a node.
     * Linear kinematics clear conflicting positional controllers (orbit, follow).
     * Angular kinematics clear conflicting rotational controllers (lookAt, orbit spin).
     * @param id - The node ID.
     * @param options - Kinematics configuration or null to disable.
     */
    export function setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void {
        const idx = _resolveIndex(id);

        if (_isInvalidIndexAndLogWarning(idx)) return;

        if (!options) {
            if (_controllers[idx]) {
                _controllers[idx].kinematics = undefined;
            }

            return;
        }

        if (!_controllers[idx]) {
            _controllers[idx] = {};
        }

        if (options.linearVelocity !== undefined || options.linearAcceleration !== undefined) {
            _controllers[idx].orbit = undefined;
            _controllers[idx].follow = undefined;
        }

        if (options.angularVelocity !== undefined || options.angularAcceleration !== undefined) {
            _controllers[idx].lookAt = undefined;

            if (_controllers[idx].orbit) {
                _controllers[idx].orbit.faceTangent = false;
                _controllers[idx].orbit.selfSpinSpeedRadPerSec = undefined;
            }
        }

        _controllers[idx].kinematics = {
            linearVelocity: options.linearVelocity ? Vectors.clone(options.linearVelocity) : undefined,
            angularVelocity: options.angularVelocity ? Vectors.clone(options.angularVelocity) : undefined,
            linearAcceleration: options.linearAcceleration ? Vectors.clone(options.linearAcceleration) : undefined,
            angularAcceleration: options.angularAcceleration ? Vectors.clone(options.angularAcceleration) : undefined,
        };
    }

    // -------------------------------------------------------------------------
    // Global Loop Updates & Synchronization
    // -------------------------------------------------------------------------

    /**
     * Updates all active controllers, kinematics, and external trackers across the scene graph,
     * then synchronizes dirty transforms to the game engine.
     * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
     * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
     * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
     */
    export function update(deltaTimeSeconds?: number): void {
        let dt: number;

        if (deltaTimeSeconds !== undefined) {
            dt = deltaTimeSeconds;
        } else {
            const now = _getUptime();

            if (_lastUpdateTime === 0) {
                _lastUpdateTime = now;
                return;
            }

            const elapsedSec = (now - _lastUpdateTime) / 1000;

            if (elapsedSec < 0.01) return;

            _lastUpdateTime = now;
            dt = Math.min(elapsedSec, 0.1);
        }

        for (let root = _firstRoot; root !== INVALID_INDEX; root = _nextSibling[root]) {
            _updateNode(root, dt);
        }

        sync();
    }

    /**
     * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
     * to all modified native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void {
        for (let root = _firstRoot; root !== INVALID_INDEX; root = _nextSibling[root]) {
            _syncNode(root);
        }
    }

    /**
     * Returns the total count of active nodes in the scene graph (roots + children).
     * @returns The number of active nodes.
     */
    export function getActiveNodeCount(): number {
        return _activeNodeCount;
    }
}
