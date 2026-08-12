import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace SpatialOC {
    const logging = new Logging('SPOC');

    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

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

    // =========================================================================
    // Quaternions & Rotations
    // =========================================================================

    /**
     * A transparent 3D vector representing a point, direction, scale, or euler rotation in 3D space.
     */
    export type Vector3 = Vectors.Vector3;

    /**
     * A transparent 4D Quaternion representing 3D spatial rotation.
     */
    export type Quaternion = Quaternions.Quaternion;

    // Module-level zero-allocation contextual scratch variables
    // -------------------------------------------------------------------------
    // World transform evaluation (ensureWorldTransformUpdated)
    const _worldEvalScaledPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _worldEvalRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };

    // Render placement & engine synchronization (computeRenderPosition, createRuntime, internalSync)
    const _renderPivotScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderPivotRotated: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _renderEuler: Vector3 = { x: 0, y: 0, z: 0 };

    // Coordinate space projections (localToWorldPoint, worldToLocalPoint, worldToLocalVector)
    const _projLocalScaled: Vector3 = { x: 0, y: 0, z: 0 };
    const _projWorldDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _projInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // World setters (worldPosition, worldRotation, worldRotationEuler)
    const _worldSetLocalPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _worldSetInvRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _worldSetEulerRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // Node-level transformations (translateLocal, rotateAroundAxis, lookAt)
    const _translateRotatedDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateAroundAxisRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _rotateAroundDisplacedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _rotateAroundRotatedPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtDeltaPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _lookAtRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // Entity attachment & trackers (attachToPlayer, attachToVehicle, attachToObject, attachToTracker, _applyAttachmentTransform)
    const _attachRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachPlayerPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachPlayerFacing: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachPlayerRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _attachVehiclePos: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachVehicleFacing: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachVehicleRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _attachObjectPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachObjectEuler: Vector3 = { x: 0, y: 0, z: 0 };
    const _attachObjectRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _trackerEulerRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

    // Active controllers & kinematics (_stepKinematics, _stepOrbit, _stepLookAt, _stepFollow)
    const _kinematicsStepDelta: Vector3 = { x: 0, y: 0, z: 0 };
    const _kinematicsAngularRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _orbitRotatedOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitTangentCross: Vector3 = { x: 0, y: 0, z: 0 };
    const _orbitSpinRot: Quaternion = { w: 1, x: 0, y: 0, z: 0 };
    const _lookAtPlayerPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followPlayerPos: Vector3 = { x: 0, y: 0, z: 0 };
    const _followTargetWithOffset: Vector3 = { x: 0, y: 0, z: 0 };
    const _followLerpedPos: Vector3 = { x: 0, y: 0, z: 0 };

    const _UP_AXIS: Readonly<Vector3> = Object.freeze({ x: 0, y: 1, z: 0 });

    // Node Lifecycle & State Bitmask Flags
    const FLAG_DIRTY = 1 << 0; // 1: Local transform changed, world matrices need evaluation
    const FLAG_ENGINE_TRANSFORM_DIRTY = 1 << 1; // 2: Evaluated transform needs syncing to native mod.Object
    const FLAG_RUNTIME_SPAWNED = 1 << 2; // 4: Created via SpawnObject; should be UnspawnObject'd on destroy
    const FLAG_DELETED = 1 << 3; // 8: Destroyed node; ignored in update/sync loops

    // Module-scoped private symbols for recursive hierarchy operations
    const _UPDATE_INTERNAL = Symbol('updateInternal');
    const _SYNC_INTERNAL = Symbol('syncInternal');

    // =========================================================================
    // Options Interfaces
    // =========================================================================

    /**
     * Common initialization options for creating SpatialNodes.
     */
    export interface NodeOptions {
        /** Optional parent node to attach this node to upon creation. If undefined, creates a root node. */
        parent?: SpatialNode;
        /** Initial local or world position. */
        position?: Vector3;
        /** Initial local or world rotation (as a Quaternion or Euler angles in radians). */
        rotation?: Vector3 | Quaternion;
        /** Initial local or world scale (uniform or per-axis). Default: 1. */
        scale?: number | Vector3;
        /** In-game model offset correction (to adjust prefab origins to mesh center). */
        pivotOffset?: Vector3;
    }

    /**
     * Options for attaching a root node to follow an entity (player, vehicle, object) in real time.
     */
    export interface AttachOptions {
        /** Positional offset relative to the target's orientation coordinate frame. */
        offset?: Vector3;
        /** Whether to track and match the target's rotation. Default: true. */
        trackRotation?: boolean;
        /** When tracking rotation, whether to constrain rotation to yaw (horizontal) only. Default: true for Player, false for Vehicle and Object. */
        yawOnly?: boolean;
    }

    /**
     * Options for configuring an Orbit controller on a node.
     */
    export interface OrbitOptions {
        /** The rotation axis of the orbit in parent or world space. Default: (0, 1, 0). */
        axis?: Vector3;
        /** The orbital speed in radians per second. Positive is counter-clockwise. */
        speedRadPerSec: number;
        /** Radius of orbit. If omitted, calculated from initial distance to center. */
        radius?: number;
        /** Optional custom orbit center position in parent space. Default: parent origin (0, 0, 0). */
        center?: Vector3;
        /** Whether the node automatically rotates to face its tangential orbital motion. Default: false. */
        faceTangent?: boolean;
        /** Optional simultaneous self-spin speed in radians per second around local up axis. */
        selfSpinSpeedRadPerSec?: number;
    }

    /**
     * Options for configuring a LookAt controller on a node.
     */
    export interface LookAtOptions {
        /** The target to continuously look at (world position, Player, or SpatialNode). */
        target?: Vector3 | mod.Player | SpatialNode;
        /** The up axis reference vector. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }

    /**
     * Options for configuring a Smooth Follow controller on a node.
     */
    export interface FollowOptions {
        /** The target to follow (SpatialNode or Player). */
        target?: SpatialNode | mod.Player;
        /** Desired offset from the target in world space. */
        offset?: Vector3;
        /** Smooth damping / lerp speed factor (0 for instant snap, > 0 for smooth). Default: 10. */
        smoothSpeed?: number;
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
    // SpatialNode Class (Scene Graph Node)
    // =========================================================================

    /**
     * Represents a 3D spatial node within the virtual hierarchy.
     * Manages canonical local transforms, cached world matrices, model offsets, and engine synchronization.
     */
    export class SpatialNode {
        private _object?: TransformableObject;
        private _parent?: SpatialNode;
        private _children: SpatialNode[] = [];

        // Pivot / origin alignment
        private _pivotOffset?: Vector3;

        // Canonical Local Transform
        private _localPos: Vector3;
        private _localRot: Quaternion;
        private _localScale: Vector3;

        // Evaluated Cached World Transform
        private _worldPos: Vector3;
        private _worldRot: Quaternion;
        private _worldScale: Vector3;

        // Lifecycle & Dirty State Bitmask
        private _flags: number = FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY;

        // Bitmask Helpers
        private _hasFlag(flag: number): boolean {
            return (this._flags & flag) !== 0;
        }

        private _setFlag(flag: number): void {
            this._flags |= flag;
        }

        private _clearFlag(flag: number): void {
            this._flags &= ~flag;
        }

        // Controllers & Trackers
        private _tracker?: () => void;
        private _orbitConfig?: OrbitOptions & { currentAngleRad: number; initialOffset: Vector3 };
        private _lookAtConfig?: LookAtOptions;
        private _followConfig?: FollowOptions;
        private _linearVelocity?: Vector3;
        private _angularVelocity?: Vector3;
        private _linearAcceleration?: Vector3;
        private _angularAcceleration?: Vector3;

        /**
         * Internal constructor for SpatialNode. Use `SpatialOC.createEmpty`, `createRuntime`, or `createExisting`.
         * @param options - Initialization options.
         * @param isRuntimeSpawned - Whether the native object was spawned dynamically at runtime.
         * @param nativeObject - The native engine object handle.
         */
        public constructor(
            options?: NodeOptions,
            isRuntimeSpawned: boolean = false,
            nativeObject?: TransformableObject
        ) {
            ++_activeNodeCount;
            this._object = nativeObject;

            if (isRuntimeSpawned) {
                this._setFlag(FLAG_RUNTIME_SPAWNED);
            }

            const pos = options?.position;
            this._localPos = pos ? Vectors.clone(pos) : { x: 0, y: 0, z: 0 };
            this._localRot = { w: 1, x: 0, y: 0, z: 0 };

            if (options?.rotation) {
                if ('w' in options.rotation) {
                    Quaternions.copy(this._localRot, options.rotation);
                } else {
                    Quaternions.setFromEuler(
                        this._localRot,
                        options.rotation.x,
                        options.rotation.y,
                        options.rotation.z
                    );
                }
            }

            const scale = options?.scale;

            if (typeof scale === 'number') {
                this._localScale = { x: scale, y: scale, z: scale };
            } else if (scale) {
                this._localScale = Vectors.clone(scale);
            } else {
                this._localScale = { x: 1, y: 1, z: 1 };
            }

            if (options?.pivotOffset) {
                this._pivotOffset = Vectors.clone(options.pivotOffset);
            }

            this._worldPos = Vectors.clone(this._localPos);
            this._worldRot = Quaternions.clone(this._localRot);
            this._worldScale = Vectors.clone(this._localScale);
        }

        // ---------------------------------------------------------------------
        // Properties & Lifecycle
        // ---------------------------------------------------------------------

        /**
         * Checks whether this node and its native object (if any) are valid and alive.
         * @returns True if valid and alive, false otherwise.
         */
        public get isValid(): boolean {
            if (this._hasFlag(FLAG_DELETED)) return false;

            return this._object ? mod.IsValid(this._object) : true;
        }

        /**
         * Whether this node has been deleted/destroyed.
         * @returns True if deleted/destroyed, false otherwise.
         */
        public get isDeleted(): boolean {
            return this._hasFlag(FLAG_DELETED);
        }

        /**
         * The parent node in the hierarchy, or undefined if this is a root node.
         * @returns The parent node, or undefined.
         */
        public get parent(): SpatialNode | undefined {
            return this._parent;
        }

        /**
         * The total number of direct child nodes.
         * @returns The child count.
         */
        public get childCount(): number {
            return this._children.length;
        }

        /**
         * Returns a shallow copy of the list of direct child nodes.
         * @returns Array of direct children.
         */
        public get children(): readonly SpatialNode[] {
            return this._children.slice();
        }

        /**
         * Retrieves a child node at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child node, or undefined if out of bounds.
         */
        public getChild(index: number): SpatialNode | undefined {
            return this._children[index];
        }

        /**
         * Iterates over all direct child nodes without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        public forEachChild(callback: (child: SpatialNode, index: number) => void): void {
            const count = this._children.length;

            for (let i = 0; i < count; ++i) {
                CallbackHandler.invoke(callback, this._children[i], i, undefined, undefined, logging, 'forEachChild');
            }
        }

        /**
         * Gets the in-game model offset correction, or undefined if zero.
         * @returns The pivot offset vector, or undefined.
         */
        public get pivotOffset(): Vector3 | undefined {
            return this._pivotOffset ? Vectors.clone(this._pivotOffset) : undefined;
        }

        /**
         * Sets the in-game model offset correction for prefab centering.
         */
        public set pivotOffset(offset: Vector3 | undefined) {
            if (offset) {
                if (!this._pivotOffset) {
                    this._pivotOffset = { x: 0, y: 0, z: 0 };
                }

                Vectors.copy(this._pivotOffset, offset);
            } else {
                this._pivotOffset = undefined;
            }

            this._setFlag(FLAG_ENGINE_TRANSFORM_DIRTY);
        }

        /**
         * Gets the local position relative to parent.
         * @returns The local position vector.
         */
        public get localPosition(): Vector3 {
            return Vectors.clone(this._localPos);
        }

        /**
         * Sets the local position relative to parent.
         */
        public set localPosition(pos: Vector3) {
            Vectors.copy(this._localPos, pos);
            this._markDirty();
        }

        /**
         * Gets the local rotation Quaternion relative to parent.
         * @returns The local rotation quaternion.
         */
        public get localRotation(): Quaternion {
            return Quaternions.clone(this._localRot);
        }

        /**
         * Sets the local rotation Quaternion relative to parent.
         */
        public set localRotation(rot: Quaternion) {
            Quaternions.copy(this._localRot, rot);
            this._markDirty();
        }

        /**
         * Gets the local rotation as Euler angles in radians (ZYX order).
         * @returns The local Euler angles vector in radians.
         */
        public get localRotationEuler(): Vector3 {
            return Quaternions.toEuler(this._localRot);
        }

        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         */
        public set localRotationEuler(euler: Vector3) {
            Quaternions.setFromEuler(this._localRot, euler.x, euler.y, euler.z);
            this._markDirty();
        }

        /**
         * Gets the local scale relative to parent.
         * @returns The local scale vector.
         */
        public get localScale(): Vector3 {
            return Vectors.clone(this._localScale);
        }

        /**
         * Sets the local scale relative to parent.
         */
        public set localScale(scale: Vector3 | number) {
            if (typeof scale === 'number') {
                Vectors.set(this._localScale, scale, scale, scale);
            } else {
                Vectors.copy(this._localScale, scale);
            }

            this._markDirty();
        }

        /**
         * Gets the evaluated world position.
         * @returns The evaluated world position vector.
         */
        public get worldPosition(): Vector3 {
            this.ensureWorldTransformUpdated();
            return Vectors.clone(this._worldPos);
        }

        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         */
        public set worldPosition(worldPos: Vector3) {
            if (!this._parent) {
                this.localPosition = worldPos;
                return;
            }

            this._parent.ensureWorldTransformUpdated();
            this._parent.worldToLocalPoint(worldPos, _worldSetLocalPos);
            this.localPosition = _worldSetLocalPos;
        }

        /**
         * Gets the evaluated world rotation Quaternion.
         * @returns The evaluated world rotation quaternion.
         */
        public get worldRotation(): Quaternion {
            this.ensureWorldTransformUpdated();
            return Quaternions.clone(this._worldRot);
        }

        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         */
        public set worldRotation(worldRot: Quaternion) {
            if (!this._parent) {
                this.localRotation = worldRot;
                return;
            }

            this._parent.ensureWorldTransformUpdated();
            Quaternions.conjugate(this._parent._worldRot, _worldSetInvRot);
            Quaternions.multiply(_worldSetInvRot, worldRot, _worldSetInvRot);
            this.localRotation = _worldSetInvRot;
        }

        /**
         * Gets the evaluated world rotation as Euler angles in radians (ZYX order).
         * @returns The evaluated world Euler angles vector in radians.
         */
        public get worldRotationEuler(): Vector3 {
            this.ensureWorldTransformUpdated();
            return Quaternions.toEuler(this._worldRot);
        }

        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         */
        public set worldRotationEuler(worldEuler: Vector3) {
            Quaternions.setFromEuler(_worldSetEulerRot, worldEuler.x, worldEuler.y, worldEuler.z);
            this.worldRotation = _worldSetEulerRot;
        }

        /**
         * Gets the evaluated world scale.
         * @returns The evaluated world scale vector.
         */
        public get worldScale(): Vector3 {
            this.ensureWorldTransformUpdated();
            return Vectors.clone(this._worldScale);
        }

        // ---------------------------------------------------------------------
        // Spatial Transformations & Manipulations
        // ---------------------------------------------------------------------

        /**
         * Translates the node in local coordinates.
         * @param delta - Vector delta in local space.
         * @returns This node for chaining.
         */
        public translateLocal(delta: Vector3): this {
            Quaternions.rotateVector(delta, this._localRot, _translateRotatedDelta);
            Vectors.add(this._localPos, _translateRotatedDelta, this._localPos);
            this._markDirty();
            return this;
        }

        /**
         * Translates the node in parent / world coordinates.
         * @param delta - Vector delta in parent coordinate space.
         * @returns This node for chaining.
         */
        public translate(delta: Vector3): this {
            Vectors.add(this._localPos, delta, this._localPos);
            this._markDirty();
            return this;
        }

        /**
         * Rotates the node locally by multiplying with a delta Quaternion.
         * @param deltaRot - Quaternion delta to multiply.
         * @returns This node for chaining.
         */
        public rotateLocal(deltaRot: Quaternion): this {
            Quaternions.multiply(this._localRot, deltaRot, this._localRot);
            this._markDirty();
            return this;
        }

        /**
         * Rotates the node around an arbitrary axis and optional pivot center in parent/world space.
         * @param axis - The unit axis to rotate around.
         * @param angleRad - The angle in radians.
         * @param pivotCenter - Optional center point in parent space (default: node's local position).
         * @returns This node for chaining.
         */
        public rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this {
            Quaternions.setFromAxisAngle(_rotateAroundAxisRot, axis, angleRad);

            if (pivotCenter) {
                // Orbital displacement around pivotCenter
                Vectors.subtract(this._localPos, pivotCenter, _rotateAroundDisplacedPos);
                Quaternions.rotateVector(_rotateAroundDisplacedPos, _rotateAroundAxisRot, _rotateAroundRotatedPos);
                Vectors.add(pivotCenter, _rotateAroundRotatedPos, this._localPos);
            }

            Quaternions.multiply(_rotateAroundAxisRot, this._localRot, this._localRot);
            this._markDirty();
            return this;
        }

        /**
         * Rotates this node to face a target point in world coordinates.
         * @param targetWorld - The world coordinate to face.
         * @param upAxis - The world up reference axis (default: 0, 1, 0).
         * @returns This node for chaining.
         */
        public lookAt(targetWorld: Vector3, upAxis?: Vector3): this {
            this.ensureWorldTransformUpdated();
            Vectors.subtract(targetWorld, this._worldPos, _lookAtDeltaPos);
            Quaternions.setFromLookRotation(_lookAtRot, _lookAtDeltaPos, upAxis ?? _UP_AXIS);
            this.worldRotation = _lookAtRot;
            return this;
        }

        // ---------------------------------------------------------------------
        // Coordinate Space Projections
        // ---------------------------------------------------------------------

        /**
         * Converts a local point to world space.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world space point.
         */
        public localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 {
            this.ensureWorldTransformUpdated();
            const target = out ?? { x: 0, y: 0, z: 0 };
            Vectors.hadamardMultiply(localPoint, this._worldScale, _projLocalScaled);
            Quaternions.rotateVector(_projLocalScaled, this._worldRot, target);
            return Vectors.add(target, this._worldPos, target);
        }

        /**
         * Converts a world space point to local coordinate space.
         * @param worldPoint - Point in world coordinates.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local space point.
         */
        public worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 {
            this.ensureWorldTransformUpdated();
            const target = out ?? { x: 0, y: 0, z: 0 };

            Vectors.subtract(worldPoint, this._worldPos, _projWorldDelta);
            Quaternions.conjugate(this._worldRot, _projInvRot);
            Quaternions.rotateVector(_projWorldDelta, _projInvRot, target);

            // Not using Vectors.hadamardDivide since it can produce Infinity if worldScale has 0s.
            const ws = this._worldScale;
            target.x = Math.abs(ws.x) > 1e-6 ? target.x / ws.x : 0;
            target.y = Math.abs(ws.y) > 1e-6 ? target.y / ws.y : 0;
            target.z = Math.abs(ws.z) > 1e-6 ? target.z / ws.z : 0;

            return target;
        }

        /**
         * Converts a local direction vector to world space (ignores translation).
         * @param localVec - Direction vector in local space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world direction vector.
         */
        public localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 {
            this.ensureWorldTransformUpdated();
            return Quaternions.rotateVector(localVec, this._worldRot, out);
        }

        /**
         * Converts a world direction vector to local space (ignores translation).
         * @param worldVec - Direction vector in world space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local direction vector.
         */
        public worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 {
            this.ensureWorldTransformUpdated();
            Quaternions.conjugate(this._worldRot, _projInvRot);
            return Quaternions.rotateVector(worldVec, _projInvRot, out);
        }

        // ---------------------------------------------------------------------
        // Hierarchy Management
        // ---------------------------------------------------------------------

        /**
         * Adds an existing SpatialNode as a child of this node.
         * @param child - The node to add as child.
         * @returns True if added successfully, false if rejected (e.g. circular hierarchy or deleted).
         */
        public addChild(child: SpatialNode): boolean {
            if (this._hasFlag(FLAG_DELETED) || child._hasFlag(FLAG_DELETED) || child === this) return false;

            // Circular hierarchy check: ensure this node is not a descendant of child
            let ancestor: SpatialNode | undefined = this._parent;

            while (ancestor) {
                if (ancestor === child) {
                    logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                    return false;
                }

                ancestor = ancestor._parent;
            }

            if (child._parent === this) return true;

            child.detachFromParent();
            child._parent = this;
            child._tracker = undefined;
            child._followConfig = undefined;
            this._children.push(child);
            child._markDirty();

            _removeRoot(child);
            return true;
        }

        /**
         * Removes a child from this node.
         * @param child - The child node to remove.
         * @returns True if removed, false otherwise.
         */
        public removeChild(child: SpatialNode): boolean {
            const index = this._children.indexOf(child);

            if (index === -1) return false;

            // Swap and pop
            const last = this._children.pop()!;

            if (index < this._children.length) {
                this._children[index] = last;
            }

            child._parent = undefined;
            child._markDirty();

            if (!child._hasFlag(FLAG_DELETED)) {
                _addRoot(child);
            }

            return true;
        }

        /**
         * Detaches this node from its parent, making it a root node.
         * @returns This node for chaining.
         */
        public detachFromParent(): this {
            if (!this._parent) return this;

            this._parent.removeChild(this);
            return this;
        }

        /**
         * Recursively destroys this node and all of its descendants, unspawning native objects.
         */
        public destroy(): void {
            if (this._hasFlag(FLAG_DELETED)) return;

            this._setFlag(FLAG_DELETED);
            --_activeNodeCount;

            // Remove from parent or root
            if (this._parent) {
                const parent = this._parent;
                this._parent = undefined;
                parent.removeChild(this);
            }

            _removeRoot(this);

            // Recursively destroy children
            const children = this._children;
            this._children = [];
            const count = children.length;

            for (let i = 0; i < count; ++i) {
                children[i].destroy();
            }

            // Unspawn native object if spawned by this module
            if (this._hasFlag(FLAG_RUNTIME_SPAWNED) && this._object && mod.IsValid(this._object)) {
                try {
                    mod.UnspawnObject(this._object);
                } catch (error: unknown) {
                    logging.log('Error unspawning object on destroy', LogLevel.Warning, error);
                }
            }

            this._object = undefined;
            this._tracker = undefined;
            this._orbitConfig = undefined;
            this._lookAtConfig = undefined;
            this._followConfig = undefined;
            this._linearVelocity = undefined;
            this._angularVelocity = undefined;
            this._linearAcceleration = undefined;
            this._angularAcceleration = undefined;
        }

        // ---------------------------------------------------------------------
        // High-Level Controllers & Behaviors
        // ---------------------------------------------------------------------

        /**
         * Computes orientation quaternion looking in a given 3D facing direction with yaw constraints.
         * @param facing - Facing direction vector.
         * @param yawOnly - Whether to constrain rotation to yaw only.
         * @param out - Destination quaternion.
         * @returns The evaluated quaternion.
         */
        private _computeFacingQuaternion(facing: Vector3, yawOnly: boolean, out: Quaternion): Quaternion {
            const yawRad = Math.atan2(facing.x, facing.z);
            const pitchRad = yawOnly ? 0 : -Math.asin(Math.max(-1, Math.min(1, facing.y)));
            return Quaternions.setFromEuler(out, pitchRad, yawRad, 0);
        }

        /**
         * Applies computed attachment transform and offset to this node.
         * @param pos - Evaluated position vector.
         * @param rot - Evaluated rotation quaternion (if trackRotation is true).
         * @param offset - Optional relative offset vector.
         * @param trackRotation - Whether rotation tracking is active.
         */
        private _applyAttachmentTransform(
            pos: Vector3,
            rot: Quaternion | undefined,
            offset: Vector3 | undefined,
            trackRotation: boolean
        ): void {
            if (trackRotation && rot) {
                if (offset) {
                    Quaternions.rotateVector(offset, rot, _attachRotatedOffset);
                    Vectors.add(pos, _attachRotatedOffset, pos);
                }

                this.worldPosition = pos;
                this.worldRotation = rot;
            } else {
                if (offset) {
                    Vectors.add(pos, offset, pos);
                }

                this.worldPosition = pos;
            }
        }

        /**
         * Attaches this node to follow a player's real-time position/orientation in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param player - The player to track.
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        public attachToPlayer(player: mod.Player, options?: AttachOptions): this {
            this.detachFromParent();
            this._followConfig = undefined;
            this._orbitConfig = undefined;
            this._linearVelocity = undefined;
            this._linearAcceleration = undefined;

            const offset = options?.offset ? Vectors.clone(options.offset) : undefined;
            const trackRot = options?.trackRotation ?? true;
            const yawOnly = options?.yawOnly ?? true;

            const playerTracker = () => {
                if (!mod.IsValid(player)) return;

                Vectors.toVector3(mod.GetObjectPosition(player), _attachPlayerPos);

                Vectors.toVector3(
                    mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection),
                    _attachPlayerFacing
                );

                const rot = trackRot
                    ? this._computeFacingQuaternion(_attachPlayerFacing, yawOnly, _attachPlayerRot)
                    : undefined;

                this._applyAttachmentTransform(_attachPlayerPos, rot, offset, trackRot);
            };

            this._tracker = playerTracker;

            return this;
        }

        /**
         * Attaches this node to follow a vehicle's real-time position/orientation in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param vehicle - The vehicle to track.
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        public attachToVehicle(vehicle: mod.Vehicle, options?: AttachOptions): this {
            this.detachFromParent();
            this._followConfig = undefined;
            this._orbitConfig = undefined;
            this._linearVelocity = undefined;
            this._linearAcceleration = undefined;

            const offset = options?.offset ? Vectors.clone(options.offset) : undefined;
            const trackRot = options?.trackRotation ?? true;
            const yawOnly = options?.yawOnly ?? false;

            const vehicleTracker = () => {
                if (!mod.IsValid(vehicle)) return;

                Vectors.toVector3(
                    mod.GetVehicleState(vehicle, mod.VehicleStateVector.VehiclePosition),
                    _attachVehiclePos
                );

                Vectors.toVector3(
                    mod.GetVehicleState(vehicle, mod.VehicleStateVector.FacingDirection),
                    _attachVehicleFacing
                );

                const rot = trackRot
                    ? this._computeFacingQuaternion(_attachVehicleFacing, yawOnly, _attachVehicleRot)
                    : undefined;

                this._applyAttachmentTransform(_attachVehiclePos, rot, offset, trackRot);
            };

            this._tracker = vehicleTracker;

            return this;
        }

        /**
         * Attaches this node to follow an in-game object (props, spawners, etc.) in real time in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param object - The native in-game object to track (excluding Player and Vehicle).
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        public attachToObject(object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): this {
            this.detachFromParent();
            this._followConfig = undefined;
            this._orbitConfig = undefined;
            this._linearVelocity = undefined;
            this._linearAcceleration = undefined;

            const offset = options?.offset ? Vectors.clone(options.offset) : undefined;
            const trackRot = options?.trackRotation ?? true;
            const yawOnly = options?.yawOnly ?? false;

            const objectTracker = () => {
                if (!mod.IsValid(object)) return;

                Vectors.toVector3(mod.GetObjectPosition(object), _attachObjectPos);

                let rot: Quaternion | undefined;

                if (trackRot) {
                    Vectors.toVector3(mod.GetObjectRotation(object), _attachObjectEuler);

                    const pitch = yawOnly ? 0 : _attachObjectEuler.x;
                    const roll = yawOnly ? 0 : _attachObjectEuler.z;
                    rot = Quaternions.setFromEuler(_attachObjectRot, pitch, _attachObjectEuler.y, roll);
                }

                this._applyAttachmentTransform(_attachObjectPos, rot, offset, trackRot);
            };

            this._tracker = objectTracker;

            return this;
        }

        /**
         * Attaches a custom dynamic tracker callback in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param tracker - Custom tracking function.
         * @returns This node for chaining.
         */
        public attachToTracker(
            tracker: () => { position: Vector3; rotation?: Quaternion | Vector3 } | undefined
        ): this {
            this.detachFromParent();
            this._followConfig = undefined;
            this._orbitConfig = undefined;
            this._linearVelocity = undefined;
            this._linearAcceleration = undefined;

            const customTracker = () => {
                const result = tracker();

                if (!result) return;

                this.worldPosition = result.position;

                if (!result.rotation) return;

                if ('w' in result.rotation) {
                    this.worldRotation = result.rotation as Quaternion;
                } else {
                    const euler = result.rotation as Vector3;
                    Quaternions.setFromEuler(_trackerEulerRot, euler.x, euler.y, euler.z);
                    this.worldRotation = _trackerEulerRot;
                }
            };

            this._tracker = customTracker;

            return this;
        }

        /**
         * Clears any active attachment tracker on this node.
         * @returns This node for chaining.
         */
        public detachTracker(): this {
            this._tracker = undefined;
            return this;
        }

        /**
         * Configures orbital motion on this node around its parent or a specified center point.
         * Clears any active attachment tracker, follow controller, or linear kinematics.
         * @param options - Orbit configuration options, or null to disable orbit.
         * @returns This node for chaining.
         */
        public setOrbit(options?: OrbitOptions | null): this {
            if (!options) {
                this._orbitConfig = undefined;
                return this;
            }

            this._tracker = undefined;
            this._followConfig = undefined;
            this._linearVelocity = undefined;
            this._linearAcceleration = undefined;

            if (this._lookAtConfig?.target !== undefined) {
                options.faceTangent = false;
                options.selfSpinSpeedRadPerSec = undefined;
            }

            if (this._orbitConfig) {
                this._orbitConfig.speedRadPerSec = options.speedRadPerSec;
                this._orbitConfig.axis = options.axis;
                this._orbitConfig.center = options.center;
                this._orbitConfig.radius = options.radius;
                this._orbitConfig.faceTangent = options.faceTangent;
                this._orbitConfig.selfSpinSpeedRadPerSec = options.selfSpinSpeedRadPerSec;
                this._orbitConfig.currentAngleRad = 0;

                Vectors.subtract(this._localPos, options.center ?? Vectors.ZERO, this._orbitConfig.initialOffset);
            } else {
                this._orbitConfig = {
                    ...options,
                    currentAngleRad: 0,
                    initialOffset: Vectors.subtract(this._localPos, options.center ?? Vectors.ZERO),
                };
            }

            return this;
        }

        /**
         * Configures continuous look-at behavior on this node.
         * Clears any active angular kinematics or orbit faceTangent/spin conflicting with look-at.
         * @param options - LookAt configuration options, or null to disable.
         * @returns This node for chaining.
         */
        public setLookAt(options?: LookAtOptions | null): this {
            if (options?.target !== undefined) {
                this._angularVelocity = undefined;
                this._angularAcceleration = undefined;

                if (this._orbitConfig) {
                    this._orbitConfig.faceTangent = false;
                    this._orbitConfig.selfSpinSpeedRadPerSec = undefined;
                }
            }

            this._lookAtConfig = options ?? undefined;
            return this;
        }

        /**
         * Configures continuous smooth follow behavior on this node in world space.
         * If configuring follow on a child node, it is automatically detached and promoted to a root node.
         * Clears any active attachment tracker, orbit controller, or linear kinematics.
         * @param options - Follow configuration options, or null to disable.
         * @returns This node for chaining.
         */
        public setFollow(options?: FollowOptions | null): this {
            if (options?.target !== undefined) {
                this.detachFromParent();
                this._tracker = undefined;
                this._orbitConfig = undefined;
                this._linearVelocity = undefined;
                this._linearAcceleration = undefined;
            }

            this._followConfig = options ?? undefined;
            return this;
        }

        /**
         * Configures kinematic velocity and acceleration integration on this node.
         * Linear kinematics clear conflicting positional controllers (orbit, follow, tracker).
         * Angular kinematics clear conflicting rotational controllers (lookAt, orbit spin).
         * @param options - Kinematics options, or null to disable.
         * @returns This node for chaining.
         */
        public setKinematics(options?: KinematicsOptions | null): this {
            if (!options) {
                this._linearVelocity = undefined;
                this._angularVelocity = undefined;
                this._linearAcceleration = undefined;
                this._angularAcceleration = undefined;

                return this;
            }

            if (options.linearVelocity !== undefined || options.linearAcceleration !== undefined) {
                this._orbitConfig = undefined;
                this._followConfig = undefined;
                this._tracker = undefined;
            }

            if (options.angularVelocity !== undefined || options.angularAcceleration !== undefined) {
                this._lookAtConfig = undefined;

                if (this._orbitConfig) {
                    this._orbitConfig.faceTangent = false;
                    this._orbitConfig.selfSpinSpeedRadPerSec = undefined;
                }
            }

            this._linearVelocity = options.linearVelocity ? Vectors.clone(options.linearVelocity) : undefined;
            this._angularVelocity = options.angularVelocity ? Vectors.clone(options.angularVelocity) : undefined;

            this._linearAcceleration = options.linearAcceleration
                ? Vectors.clone(options.linearAcceleration)
                : undefined;

            this._angularAcceleration = options.angularAcceleration
                ? Vectors.clone(options.angularAcceleration)
                : undefined;

            return this;
        }

        // ---------------------------------------------------------------------
        // Internal Engine Synchronization & Evaluation
        // ---------------------------------------------------------------------

        /**
         * Marks this node and all descendants as dirty.
         */
        private _markDirty(): void {
            this._setFlag(FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY);
            const count = this._children.length;

            for (let i = 0; i < count; ++i) {
                this._children[i]._markDirty();
            }
        }

        /**
         * Ensures that the world transform of this node (and its ancestors) is fresh and up to date.
         */
        public ensureWorldTransformUpdated(): void {
            if (!this._hasFlag(FLAG_DIRTY)) return;

            if (this._parent) {
                this._parent.ensureWorldTransformUpdated();

                // World Scale = Parent World Scale * Local Scale
                Vectors.hadamardMultiply(this._parent._worldScale, this._localScale, this._worldScale);

                // World Rotation = Parent World Rotation * Local Rotation
                Quaternions.multiply(this._parent._worldRot, this._localRot, this._worldRot);

                // Scaled Local Position
                Vectors.hadamardMultiply(this._localPos, this._parent._worldScale, _worldEvalScaledPos);

                // Rotated by Parent World Rotation
                Quaternions.rotateVector(_worldEvalScaledPos, this._parent._worldRot, _worldEvalRotatedPos);

                // World Position = Parent World Position + Rotated Scaled Local Position
                Vectors.add(this._parent._worldPos, _worldEvalRotatedPos, this._worldPos);
            } else {
                Vectors.copy(this._worldPos, this._localPos);
                Quaternions.copy(this._worldRot, this._localRot);
                Vectors.copy(this._worldScale, this._localScale);
            }

            this._clearFlag(FLAG_DIRTY);
        }

        /**
         * Computes the visual placement position of the native model accounting for pivot offset.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The render position.
         */
        public computeRenderPosition(out?: Vector3): Vector3 {
            const target = out ?? { x: 0, y: 0, z: 0 };

            if (!this._pivotOffset) return Vectors.copy(target, this._worldPos);

            Vectors.hadamardMultiply(this._pivotOffset, this._worldScale, _renderPivotScaled);
            Quaternions.rotateVector(_renderPivotScaled, this._worldRot, _renderPivotRotated);
            return Vectors.add(this._worldPos, _renderPivotRotated, target);
        }

        /**
         * Steps kinematic linear and angular velocities and accelerations.
         * @param dt - Delta time in seconds.
         */
        private _stepKinematics(dt: number): void {
            if (
                !this._linearVelocity &&
                !this._angularVelocity &&
                !this._linearAcceleration &&
                !this._angularAcceleration
            ) {
                return;
            }

            // 1. Integrate Linear Acceleration into Velocity
            if (this._linearAcceleration) {
                if (!this._linearVelocity) {
                    this._linearVelocity = { x: 0, y: 0, z: 0 };
                }

                Vectors.multiply(this._linearAcceleration, dt, _kinematicsStepDelta);
                Vectors.add(this._linearVelocity, _kinematicsStepDelta, this._linearVelocity);
            }

            // 2. Integrate Linear Velocity into Local Position
            if (this._linearVelocity) {
                Vectors.multiply(this._linearVelocity, dt, _kinematicsStepDelta);
                Vectors.add(this._localPos, _kinematicsStepDelta, this._localPos);
                this._markDirty();
            }

            // 3. Integrate Angular Acceleration into Angular Velocity
            if (this._angularAcceleration) {
                if (!this._angularVelocity) {
                    this._angularVelocity = { x: 0, y: 0, z: 0 };
                }

                Vectors.multiply(this._angularAcceleration, dt, _kinematicsStepDelta);
                Vectors.add(this._angularVelocity, _kinematicsStepDelta, this._angularVelocity);
            }

            // 4. Integrate Angular Velocity into Local Rotation
            if (this._angularVelocity) {
                const angle = Vectors.length(this._angularVelocity) * dt;

                if (angle > 0) {
                    Quaternions.setFromAxisAngle(_kinematicsAngularRot, this._angularVelocity, angle);
                    this.rotateLocal(_kinematicsAngularRot);
                }
            }
        }

        /**
         * Steps orbital kinematics around parent or center point.
         * @param dt - Delta time in seconds.
         */
        private _stepOrbit(dt: number): void {
            if (!this._orbitConfig) return;

            const conf = this._orbitConfig;
            conf.currentAngleRad += conf.speedRadPerSec * dt;

            const axis = conf.axis ?? _UP_AXIS;
            const center = conf.center ?? Vectors.ZERO;

            Quaternions.setFromAxisAngle(_orbitRot, axis, conf.currentAngleRad);
            Quaternions.rotateVector(conf.initialOffset, _orbitRot, _orbitRotatedOffset);
            Vectors.add(center, _orbitRotatedOffset, this._localPos);

            if (conf.faceTangent) {
                Vectors.cross(axis, _orbitRotatedOffset, _orbitTangentCross);

                if (Vectors.lengthSquared(_orbitTangentCross) > 0) {
                    const yaw = Math.atan2(_orbitTangentCross.x, _orbitTangentCross.z);
                    Quaternions.setFromEuler(this._localRot, 0, yaw, 0);
                }
            }

            if (conf.selfSpinSpeedRadPerSec) {
                Quaternions.setFromAxisAngle(_orbitSpinRot, _UP_AXIS, conf.selfSpinSpeedRadPerSec * dt);
                Quaternions.multiply(this._localRot, _orbitSpinRot, this._localRot);
            }

            this._markDirty();
        }

        /**
         * Steps continuous LookAt targeting.
         */
        private _stepLookAt(): void {
            if (!this._lookAtConfig?.target) return;

            const target = this._lookAtConfig.target;
            const upAxis = this._lookAtConfig.upAxis;

            if (target instanceof SpatialNode) {
                if (!target.isDeleted) {
                    target.ensureWorldTransformUpdated();
                    this.lookAt(target._worldPos, upAxis);
                }
            } else if ('x' in target && 'y' in target && 'z' in target) {
                this.lookAt(target, upAxis);
            } else if (mod.IsValid(target)) {
                Vectors.toVector3(mod.GetObjectPosition(target), _lookAtPlayerPos);
                this.lookAt(_lookAtPlayerPos, upAxis);
            }
        }

        /**
         * Steps continuous smooth follow behavior.
         * @param dt - Delta time in seconds.
         */
        private _stepFollow(dt: number): void {
            if (!this._followConfig?.target) return;

            const target = this._followConfig.target;
            let targetPos: Vector3 | undefined;

            if (target instanceof SpatialNode) {
                if (!target.isDeleted) {
                    target.ensureWorldTransformUpdated();
                    targetPos = target._worldPos;
                }
            } else if (mod.IsValid(target)) {
                targetPos = Vectors.toVector3(mod.GetObjectPosition(target), _followPlayerPos);
            }

            if (!targetPos) return;

            const smooth = this._followConfig.smoothSpeed ?? 10;
            const factor = smooth <= 0 ? 1 : Math.min(1, smooth * dt);
            const off = this._followConfig.offset ?? Vectors.ZERO;

            this.ensureWorldTransformUpdated();
            Vectors.add(targetPos, off, _followTargetWithOffset);
            Vectors.lerp(this._worldPos, _followTargetWithOffset, factor, _followLerpedPos);
            this.worldPosition = _followLerpedPos;
        }

        /**
         * Internal method to step active controllers, velocities, and trackers.
         * @param dt - Delta time in seconds.
         * @internal
         */
        [_UPDATE_INTERNAL](dt: number): void {
            if (this._hasFlag(FLAG_DELETED)) return;

            if (this._tracker) {
                this._tracker();
            }

            this._stepKinematics(dt);
            this._stepOrbit(dt);
            this._stepLookAt();
            this._stepFollow(dt);

            // Recurse to children
            const childCount = this._children.length;

            for (let i = 0; i < childCount; ++i) {
                this._children[i][_UPDATE_INTERNAL](dt);
            }
        }

        /**
         * Internal method to synchronize dirty transforms to native engine objects.
         * @internal
         */
        [_SYNC_INTERNAL](): void {
            if (this._hasFlag(FLAG_DELETED)) return;

            this.ensureWorldTransformUpdated();

            if (this._hasFlag(FLAG_ENGINE_TRANSFORM_DIRTY) && this._object && mod.IsValid(this._object)) {
                const renderPos = this.computeRenderPosition(_renderPos);
                const rotEuler = Quaternions.toEuler(this._worldRot, _renderEuler);

                try {
                    mod.SetObjectTransform(
                        this._object as mod.SpatialObject,
                        mod.CreateTransform(Vectors.toVector(renderPos), Vectors.toVector(rotEuler))
                    );
                } catch (error: unknown) {
                    logging.log('Error applying transform to native object', LogLevel.Warning, error);
                }

                this._clearFlag(FLAG_ENGINE_TRANSFORM_DIRTY);
            }

            const childCount = this._children.length;

            for (let i = 0; i < childCount; ++i) {
                this._children[i][_SYNC_INTERNAL]();
            }
        }
    }

    // =========================================================================
    // Scene Graph Manager & Static Factory
    // =========================================================================

    let _activeNodeCount = 0;
    const _rootNodes: SpatialNode[] = [];

    const SERVER_START_TIME = Date.now();
    let _lastUpdateTime = 0;

    /**
     * @returns The current server uptime in milliseconds.
     */
    function _getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    /**
     * Internal helper to register a root node.
     * @param node - The node to register.
     */
    function _addRoot(node: SpatialNode): void {
        if (_rootNodes.indexOf(node) === -1) {
            _rootNodes.push(node);
        }
    }

    /**
     * Internal helper to unregister a root node.
     * @param node - The node to unregister.
     */
    function _removeRoot(node: SpatialNode): void {
        const index = _rootNodes.indexOf(node);

        if (index === -1) return;

        const last = _rootNodes.pop()!;

        if (index < _rootNodes.length) {
            _rootNodes[index] = last;
        }
    }

    /**
     * Creates an empty SpatialNode (virtual root anchor or child node).
     * @param options - Initialization options (including optional parent).
     * @returns The created node.
     */
    export function createEmpty(options?: NodeOptions): SpatialNode {
        const node = new SpatialNode(options, false);

        if (options?.parent) {
            options.parent.addChild(node);
        } else {
            _addRoot(node);
        }

        return node;
    }

    /**
     * Spawns a runtime prefab as a new SpatialNode (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parent).
     * @returns The created node, or undefined if spawning failed or parent is deleted.
     */
    export function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNode | undefined {
        if (options?.parent && options.parent.isDeleted) return undefined;

        const node = new SpatialNode(options, true);

        if (options?.parent) {
            options.parent.addChild(node);
        } else {
            _addRoot(node);
        }

        node.ensureWorldTransformUpdated();

        const renderPos = node.computeRenderPosition(_renderPos);
        const rotEuler = Quaternions.toEuler(node.worldRotation, _renderEuler);
        const scaleVec = Vectors.toVector(node.worldScale);

        try {
            const spawned = mod.SpawnObject(prefab, Vectors.toVector(renderPos), Vectors.toVector(rotEuler), scaleVec);

            if (!mod.IsValid(spawned)) {
                logging.log('Failed to spawn runtime object prefab', LogLevel.Warning);
                node.destroy();
                return undefined;
            }

            (node as unknown as { _object?: TransformableObject })._object = spawned as TransformableObject;
            return node;
        } catch (error: unknown) {
            logging.log('Error spawning runtime object', LogLevel.Error, error);
            node.destroy();
            return undefined;
        }
    }

    /**
     * Wraps an existing in-game object as a SpatialNode (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parent).
     * @returns The created node, or undefined if parent is deleted.
     */
    export function createExisting(object: TransformableObject, options?: NodeOptions): SpatialNode | undefined {
        if (options?.parent && options.parent.isDeleted) return undefined;

        const node = new SpatialNode(options, false, object);

        if (options?.parent) {
            options.parent.addChild(node);
        } else {
            _addRoot(node);
        }

        return node;
    }

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

        const rootCount = _rootNodes.length;

        for (let i = 0; i < rootCount; ++i) {
            _rootNodes[i][_UPDATE_INTERNAL](dt);
        }

        sync();
    }

    /**
     * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
     * to all modified native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void {
        const rootCount = _rootNodes.length;

        for (let i = 0; i < rootCount; ++i) {
            _rootNodes[i][_SYNC_INTERNAL]();
        }
    }

    /**
     * Returns the total count of active root nodes.
     * @returns The number of root nodes.
     */
    export function getRootCount(): number {
        return _rootNodes.length;
    }

    /**
     * Returns the total count of active nodes in the scene graph (roots + children).
     * @returns The number of active nodes.
     */
    export function getActiveNodeCount(): number {
        return _activeNodeCount;
    }

    /**
     * Recursively destroys all managed nodes in the scene graph and unspawns runtime entities.
     */
    export function destroyAll(): void {
        _lastUpdateTime = 0;

        while (_rootNodes.length > 0) {
            const node = _rootNodes.pop()!;
            node.destroy();
        }
    }
}
