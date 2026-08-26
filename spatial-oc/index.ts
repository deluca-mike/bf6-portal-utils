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
    const _lookAtTargetPos: Vector3 = { x: 0, y: 0, z: 0 };
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

    // =========================================================================
    // Options Interfaces
    // =========================================================================

    /**
     * Common initialization options for creating SpatialElements.
     */
    export interface NodeOptions {
        /** Optional parent node to attach this element to upon creation. If undefined, attaches to ROOT_NODE. */
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
        /** The target to continuously look at (world position, Player, or SpatialElement). */
        target?: Vector3 | mod.Player | SpatialElement;
        /** The up axis reference vector. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }

    /**
     * Options for configuring a Smooth Follow controller on a node.
     */
    export interface FollowOptions {
        /** The target to follow (SpatialElement or Player). */
        target?: SpatialElement | mod.Player;
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
    // SpatialNode Class (Scene Graph Base Node)
    // =========================================================================

    /**
     * Base class representing a node within the virtual spatial hierarchy.
     */
    export abstract class SpatialNode {
        protected _parent: SpatialNode | null = null;
        protected _children: SpatialElement[] = [];

        protected _isDeletedAndLogWarning(): boolean {
            if (this._isDeleted()) {
                logging.log('Node is deleted', LogLevel.Warning);
                return true;
            }

            return false;
        }

        /**
         * Whether this node is deleted.
         * @returns True if deleted, false otherwise.
         */
        protected _isDeleted(): boolean {
            return false;
        }

        /**
         * The parent node in the hierarchy, or null for the root node, or undefined if deleted.
         * @returns The parent node, null, or undefined.
         */
        public get parent(): SpatialNode | null | undefined {
            return this.getParent();
        }

        /**
         * Retrieves the parent node in the hierarchy.
         * @returns The parent node, null for the root node, or undefined if deleted.
         */
        public getParent(): SpatialNode | null | undefined {
            return this._isDeleted() ? undefined : this._parent;
        }

        /**
         * The total number of direct child elements, or undefined if deleted.
         * @returns The child count, or undefined.
         */
        public get childCount(): number | undefined {
            return this.getChildCount();
        }

        /**
         * Retrieves the total number of direct child elements.
         * @returns The child count, or undefined if deleted.
         */
        public getChildCount(): number | undefined {
            return this._isDeleted() ? undefined : this._children.length;
        }

        /**
         * Returns a shallow copy of the list of direct child elements, or undefined if deleted.
         * @returns Array of direct children, or undefined.
         */
        public get children(): readonly SpatialElement[] | undefined {
            return this.getChildren();
        }

        /**
         * Retrieves a shallow copy of the list of direct child elements.
         * @returns Array of direct children, or undefined if deleted.
         */
        public getChildren(): readonly SpatialElement[] | undefined {
            return this._isDeleted() ? undefined : this._children.slice();
        }

        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, null if out of bounds, or undefined if deleted.
         */
        public getChild(index: number): SpatialElement | null | undefined {
            return this._isDeleted() ? undefined : (this._children[index] ?? null);
        }

        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child element.
         */
        public forEachChild(callback: (child: SpatialElement, index: number) => void): void {
            if (this._isDeletedAndLogWarning()) return;

            for (let i = 0; i < this._children.length; ++i) {
                CallbackHandler.invoke(callback, this._children[i], i, undefined, undefined, logging, 'forEachChild');
            }
        }

        /**
         * Internal helper to add a child element.
         * @param child - The child element to add.
         * @returns True if added, false otherwise.
         */
        protected _addChild(child: SpatialElement): boolean {
            if (this._children.indexOf(child) !== -1) return true;

            this._children.push(child);

            return true;
        }

        /**
         * Internal helper to remove a child element.
         * @param child - The child element to remove.
         * @returns True if removed, false otherwise.
         */
        protected _removeChild(child: SpatialElement): boolean {
            const index = this._children.indexOf(child);

            if (index === -1) return false;

            const last = this._children.pop()!;

            if (index < this._children.length) {
                this._children[index] = last;
            }

            return true;
        }

        /**
         * Links a child element to a parent node.
         * @param parent - The parent node.
         * @param child - The child element to link.
         */
        protected static _link(parent: SpatialNode, child: SpatialElement): void {
            if (child._parent && child._parent !== parent) {
                child._parent._removeChild(child);
            }

            parent._addChild(child);
            child._parent = parent;
        }

        /**
         * Unlinks a child element from its parent node.
         * @param child - The child element to unlink.
         */
        protected static _unlink(child: SpatialElement): void {
            if (child._parent) {
                child._parent._removeChild(child);
                child._parent = null;
            }
        }

        /**
         * Internal self update lifecycle step.
         * @param _dt - Delta time in seconds.
         */
        protected _updateSelf(_dt: number): void {
            // No-op for base SpatialNode / RootNode
        }

        /**
         * Internal self sync lifecycle step.
         */
        protected _syncSelf(): void {
            // No-op for base SpatialNode / RootNode
        }

        /**
         * Internal update lifecycle step that updates self and all child elements.
         * @param dt - Delta time in seconds.
         */
        protected _updateInternal(dt: number): void {
            this._updateSelf(dt);

            const childCount = this._children.length;

            for (let i = 0; i < childCount; ++i) {
                this._children[i]._updateInternal(dt);
            }
        }

        /**
         * Internal sync lifecycle step that syncs self and all child elements.
         */
        protected _syncInternal(): void {
            this._syncSelf();

            const childCount = this._children.length;

            for (let i = 0; i < childCount; ++i) {
                this._children[i]._syncInternal();
            }
        }

        /**
         * Updates all active controllers, kinematics, and external trackers across the scene graph,
         * then synchronizes dirty transforms to the game engine.
         * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
         * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
         * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
         */
        public static update(deltaTimeSeconds?: number): void {
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

            ROOT_NODE._updateInternal(dt);
            SpatialNode.sync();
        }

        /**
         * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
         * to all modified native objects via `mod.SetObjectTransform`.
         */
        public static sync(): void {
            ROOT_NODE._syncInternal();
        }
    }

    /**
     * Singleton Root Node representing the global scene graph origin anchor.
     */
    class RootNode extends SpatialNode {
        public override get parent(): null {
            return null;
        }

        public override getParent(): null {
            return null;
        }
    }

    /**
     * The global root anchor of the scene graph.
     */
    export const ROOT_NODE: SpatialNode = new RootNode();

    // =========================================================================
    // SpatialElement Class (Scene Graph Transformable Node)
    // =========================================================================

    /**
     * Represents a 3D spatial transformable element within the virtual hierarchy.
     * Manages canonical local transforms, cached world matrices, model offsets, and engine synchronization.
     */
    export class SpatialElement extends SpatialNode {
        private _object?: TransformableObject;

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
         * Creates an empty SpatialElement (virtual parent anchor or child element).
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if parent is deleted.
         */
        public static createEmpty(options?: NodeOptions): SpatialElement | null {
            const parent = options?.parent ?? ROOT_NODE;

            if (parent instanceof SpatialElement && parent.isDeleted) {
                logging.log('Create empty failed, parent is deleted', LogLevel.Error);
                return null;
            }

            const element = new SpatialElement(options, false);
            SpatialNode._link(parent, element);

            return element;
        }

        /**
         * Spawns a runtime prefab as a new SpatialElement (root or child).
         * @param prefab - The runtime spawn prefab enum.
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if spawning failed or parent is deleted.
         */
        public static createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialElement | null {
            const parent = options?.parent ?? ROOT_NODE;

            if (parent instanceof SpatialElement && parent.isDeleted) {
                logging.log('Create runtime failed, parent is deleted', LogLevel.Error);
                return null;
            }

            const element = new SpatialElement(options, true);
            SpatialNode._link(parent, element);

            element.ensureWorldTransformUpdated();

            const renderPos = element.computeRenderPosition(_renderPos)!;
            const rotEuler = Quaternions.toEuler(element._worldRot, _renderEuler);
            const scaleVec = Vectors.toVector(element._worldScale);

            try {
                const spawned = mod.SpawnObject(
                    prefab,
                    Vectors.toVector(renderPos),
                    Vectors.toVector(rotEuler),
                    scaleVec
                );

                if (!mod.IsValid(spawned)) {
                    element.destroy();
                    logging.log('Create runtime failed, failed to spawn object prefab', LogLevel.Error);
                    return null;
                }

                element._object = spawned as TransformableObject;

                return element;
            } catch (error: unknown) {
                element.destroy();
                logging.log('Create runtime failed, spawn object threw exception', LogLevel.Error, error);
                return null;
            }
        }

        /**
         * Wraps an existing in-game object as a SpatialElement (root or child).
         * @param object - The existing native transformable object.
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if parent is deleted.
         */
        public static createExisting(object: TransformableObject, options?: NodeOptions): SpatialElement | null {
            const parent = options?.parent ?? ROOT_NODE;

            if (parent instanceof SpatialElement && parent.isDeleted) {
                logging.log('Create existing failed, parent is deleted', LogLevel.Error);
                return null;
            }

            const element = new SpatialElement(options, false, object);
            SpatialNode._link(parent, element);

            return element;
        }

        /**
         * Private constructor for SpatialElement. Use `SpatialElement.createEmpty`, `createRuntime`, or `createExisting`.
         * @param options - Initialization options.
         * @param isRuntimeSpawned - Whether the native object was spawned dynamically at runtime.
         * @param nativeObject - The native engine object handle.
         */
        private constructor(
            options?: NodeOptions,
            isRuntimeSpawned: boolean = false,
            nativeObject?: TransformableObject
        ) {
            super();
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
         * Checks whether this element and its native object (if any) are valid and alive.
         * @returns True if valid and alive, false otherwise.
         */
        public get isValid(): boolean {
            if (this._isDeleted()) return false;

            return this._object ? mod.IsValid(this._object) : true;
        }

        /**
         * Whether this element has been deleted/destroyed.
         * @returns True if deleted/destroyed, false otherwise.
         */
        public get isDeleted(): boolean {
            return this._isDeleted();
        }

        protected override _isDeleted(): boolean {
            return this._hasFlag(FLAG_DELETED);
        }

        /**
         * The parent node in the hierarchy, or undefined if deleted.
         * @returns The parent node, or undefined if deleted.
         */
        public override get parent(): SpatialNode | undefined {
            return this.getParent();
        }

        /**
         * Sets the parent node in the hierarchy.
         * Automatically unlinks from current parent and links to the new parent.
         */
        public set parent(newParent: SpatialNode) {
            this.setParent(newParent);
        }

        /**
         * Retrieves the parent node in the hierarchy.
         * @returns The parent node, or undefined if deleted.
         */
        public override getParent(): SpatialNode | undefined {
            return this._isDeleted() ? undefined : (this._parent ?? ROOT_NODE);
        }

        /**
         * Sets the parent node in the hierarchy.
         * @param newParent - The new parent SpatialNode (e.g. ROOT_NODE or another SpatialElement).
         * @returns This element for chaining.
         */
        public setParent(newParent: SpatialNode): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (newParent instanceof SpatialElement && newParent._isDeletedAndLogWarning()) return this;

            if (newParent === this) return this;

            // Circular hierarchy check: ensure this element is not an ancestor of newParent
            let ancestor: SpatialNode | null | undefined = newParent;

            while (ancestor) {
                if (ancestor === this) {
                    logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                    return this;
                }

                ancestor = ancestor.parent;
            }

            if (this._parent === newParent) return this;

            SpatialNode._link(newParent, this);

            if (newParent !== ROOT_NODE) {
                this._tracker = undefined;
                this._followConfig = undefined;
            }

            this._markDirty();

            return this;
        }

        /**
         * Gets the in-game model offset correction, null if unset, or undefined if deleted.
         * @returns The pivot offset vector, null, or undefined.
         */
        public get pivotOffset(): Vector3 | null | undefined {
            return this.getPivotOffset();
        }

        /**
         * Sets the in-game model offset correction for prefab centering.
         */
        public set pivotOffset(offset: Vector3 | null | undefined) {
            this.setPivotOffset(offset);
        }

        /**
         * Retrieves the in-game model offset correction.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The pivot offset vector, null if unset, or undefined if deleted.
         */
        public getPivotOffset(out?: Vector3): Vector3 | null | undefined {
            if (this._isDeleted()) return undefined;

            if (!this._pivotOffset) return null;

            return Vectors.copy(out ?? { x: 0, y: 0, z: 0 }, this._pivotOffset);
        }

        /**
         * Sets the in-game model offset correction for prefab centering.
         * @param offset - The offset vector, or null/undefined to clear.
         * @returns This element for chaining.
         */
        public setPivotOffset(offset?: Vector3 | null): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (offset) {
                if (!this._pivotOffset) {
                    this._pivotOffset = { x: 0, y: 0, z: 0 };
                }

                Vectors.copy(this._pivotOffset, offset);
            } else {
                this._pivotOffset = undefined;
            }

            // Pivot offset only affects visual model placement during engine sync (computeRenderPosition),
            // not the mathematical scene graph transform hierarchy, so only FLAG_ENGINE_TRANSFORM_DIRTY is set.
            this._setFlag(FLAG_ENGINE_TRANSFORM_DIRTY);
            return this;
        }

        /**
         * Gets the local position relative to parent, or undefined if deleted.
         * @returns The local position vector, or undefined.
         */
        public get localPosition(): Vector3 | undefined {
            return this.getLocalPosition();
        }

        /**
         * Sets the local position relative to parent.
         */
        public set localPosition(pos: Vector3) {
            this.setLocalPosition(pos);
        }

        /**
         * Retrieves the local position relative to parent.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local position vector, or undefined if deleted.
         */
        public getLocalPosition(out?: Vector3): Vector3 | undefined {
            return this._isDeleted() ? undefined : Vectors.copy(out ?? { x: 0, y: 0, z: 0 }, this._localPos);
        }

        /**
         * Sets the local position relative to parent.
         * @param pos - The new local position.
         * @returns This element for chaining.
         */
        public setLocalPosition(pos: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            Vectors.copy(this._localPos, pos);
            this._markDirty();

            return this;
        }

        /**
         * Gets the local rotation Quaternion relative to parent, or undefined if deleted.
         * @returns The local rotation quaternion, or undefined.
         */
        public get localRotation(): Quaternion | undefined {
            return this.getLocalRotation();
        }

        /**
         * Sets the local rotation Quaternion relative to parent.
         */
        public set localRotation(rot: Quaternion) {
            this.setLocalRotation(rot);
        }

        /**
         * Retrieves the local rotation Quaternion relative to parent.
         * @param out - Optional target Quaternion to write into for zero-allocation reuse.
         * @returns The local rotation quaternion, or undefined if deleted.
         */
        public getLocalRotation(out?: Quaternion): Quaternion | undefined {
            return this._isDeleted() ? undefined : Quaternions.copy(out ?? { w: 1, x: 0, y: 0, z: 0 }, this._localRot);
        }

        /**
         * Sets the local rotation Quaternion relative to parent.
         * @param rot - The new local rotation quaternion.
         * @returns This element for chaining.
         */
        public setLocalRotation(rot: Quaternion): this {
            if (this._isDeletedAndLogWarning()) return this;

            Quaternions.copy(this._localRot, rot);
            this._markDirty();

            return this;
        }

        /**
         * Gets the local rotation as Euler angles in radians (ZYX order), or undefined if deleted.
         * @returns The local Euler angles vector in radians, or undefined.
         */
        public get localRotationEuler(): Vector3 | undefined {
            return this.getLocalRotationEuler();
        }

        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         */
        public set localRotationEuler(euler: Vector3) {
            this.setLocalRotationEuler(euler);
        }

        /**
         * Retrieves the local rotation as Euler angles in radians (ZYX order).
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local Euler angles vector in radians, or undefined if deleted.
         */
        public getLocalRotationEuler(out?: Vector3): Vector3 | undefined {
            return this._isDeleted() ? undefined : Quaternions.toEuler(this._localRot, out);
        }

        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         * @param euler - The new local Euler angles in radians.
         * @returns This element for chaining.
         */
        public setLocalRotationEuler(euler: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            Quaternions.setFromEuler(this._localRot, euler.x, euler.y, euler.z);
            this._markDirty();

            return this;
        }

        /**
         * Gets the local scale, or undefined if deleted.
         * @returns The local scale vector, or undefined.
         */
        public get localScale(): Vector3 | undefined {
            return this.getLocalScale();
        }

        /**
         * Sets the local scale (uniform or per-axis).
         */
        public set localScale(scale: Vector3 | number) {
            this.setLocalScale(scale);
        }

        /**
         * Retrieves the local scale.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local scale vector, or undefined if deleted.
         */
        public getLocalScale(out?: Vector3): Vector3 | undefined {
            return this._isDeleted() ? undefined : Vectors.copy(out ?? { x: 1, y: 1, z: 1 }, this._localScale);
        }

        /**
         * Sets the local scale (uniform or per-axis).
         * @param scale - The new uniform number or Vector3 scale.
         * @returns This element for chaining.
         */
        public setLocalScale(scale: Vector3 | number): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (typeof scale === 'number') {
                this._localScale.x = scale;
                this._localScale.y = scale;
                this._localScale.z = scale;
            } else {
                Vectors.copy(this._localScale, scale);
            }

            this._markDirty();

            return this;
        }

        /**
         * Gets the evaluated world position, or undefined if deleted.
         * @returns The evaluated world position vector, or undefined.
         */
        public get worldPosition(): Vector3 | undefined {
            return this.getWorldPosition();
        }

        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         */
        public set worldPosition(worldPos: Vector3) {
            this.setWorldPosition(worldPos);
        }

        /**
         * Retrieves the evaluated world position.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world position vector, or undefined if deleted.
         */
        public getWorldPosition(out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();

            return Vectors.copy(out ?? { x: 0, y: 0, z: 0 }, this._worldPos);
        }

        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         * @param worldPos - The desired world position.
         * @returns This element for chaining.
         */
        public setWorldPosition(worldPos: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (this._parent === ROOT_NODE) {
                this.setLocalPosition(worldPos);
                return this;
            }

            (this._parent as SpatialElement).worldToLocalPoint(worldPos, _worldSetLocalPos);
            this.setLocalPosition(_worldSetLocalPos);

            return this;
        }

        /**
         * Gets the evaluated world rotation Quaternion, or undefined if deleted.
         * @returns The evaluated world rotation quaternion, or undefined.
         */
        public get worldRotation(): Quaternion | undefined {
            return this.getWorldRotation();
        }

        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         */
        public set worldRotation(worldRot: Quaternion) {
            this.setWorldRotation(worldRot);
        }

        /**
         * Retrieves the evaluated world rotation Quaternion.
         * @param out - Optional target Quaternion to write into for zero-allocation reuse.
         * @returns The evaluated world rotation quaternion, or undefined if deleted.
         */
        public getWorldRotation(out?: Quaternion): Quaternion | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();

            return Quaternions.copy(out ?? { w: 1, x: 0, y: 0, z: 0 }, this._worldRot);
        }

        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         * @param worldRot - The desired world rotation quaternion.
         * @returns This element for chaining.
         */
        public setWorldRotation(worldRot: Quaternion): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (this._parent === ROOT_NODE) {
                this.setLocalRotation(worldRot);
                return this;
            }

            const parent = this._parent as SpatialElement;
            parent.ensureWorldTransformUpdated();
            Quaternions.conjugate(parent._worldRot, _worldSetInvRot);
            Quaternions.multiply(_worldSetInvRot, worldRot, _worldSetInvRot);
            this.setLocalRotation(_worldSetInvRot);

            return this;
        }

        /**
         * Gets the evaluated world rotation as Euler angles in radians (ZYX order), or undefined if deleted.
         * @returns The evaluated world Euler angles vector in radians, or undefined.
         */
        public get worldRotationEuler(): Vector3 | undefined {
            return this.getWorldRotationEuler();
        }

        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         */
        public set worldRotationEuler(worldEuler: Vector3) {
            this.setWorldRotationEuler(worldEuler);
        }

        /**
         * Retrieves the evaluated world rotation as Euler angles in radians (ZYX order).
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world Euler angles vector in radians, or undefined if deleted.
         */
        public getWorldRotationEuler(out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();

            return Quaternions.toEuler(this._worldRot, out);
        }

        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         * @param worldEuler - The desired world Euler angles in radians.
         * @returns This element for chaining.
         */
        public setWorldRotationEuler(worldEuler: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            Quaternions.setFromEuler(_worldSetEulerRot, worldEuler.x, worldEuler.y, worldEuler.z);
            this.setWorldRotation(_worldSetEulerRot);

            return this;
        }

        /**
         * Gets the evaluated world scale, or undefined if deleted.
         * @returns The evaluated world scale vector, or undefined.
         */
        public get worldScale(): Vector3 | undefined {
            return this.getWorldScale();
        }

        /**
         * Retrieves the evaluated world scale.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world scale vector, or undefined if deleted.
         */
        public getWorldScale(out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();

            return Vectors.copy(out ?? { x: 0, y: 0, z: 0 }, this._worldScale);
        }

        // ---------------------------------------------------------------------
        // Spatial Transformations & Manipulations
        // ---------------------------------------------------------------------

        /**
         * Translates the element in local coordinates.
         * @param delta - Vector delta in local space.
         * @returns This element for chaining.
         */
        public translateLocal(delta: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            Quaternions.rotateVector(delta, this._localRot, _translateRotatedDelta);
            Vectors.add(this._localPos, _translateRotatedDelta, this._localPos);
            this._markDirty();

            return this;
        }

        /**
         * Translates the element in parent / world coordinates.
         * @param delta - Vector delta in parent coordinate space.
         * @returns This element for chaining.
         */
        public translate(delta: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            Vectors.add(this._localPos, delta, this._localPos);
            this._markDirty();

            return this;
        }

        /**
         * Rotates the element locally by multiplying with a delta Quaternion.
         * @param deltaRot - Quaternion delta to multiply.
         * @returns This element for chaining.
         */
        public rotateLocal(deltaRot: Quaternion): this {
            if (this._isDeletedAndLogWarning()) return this;

            Quaternions.multiply(this._localRot, deltaRot, this._localRot);
            this._markDirty();

            return this;
        }

        /**
         * Rotates the element around an arbitrary axis and optional pivot center in parent/world space.
         * @param axis - The unit axis to rotate around.
         * @param angleRad - The angle in radians.
         * @param pivotCenter - Optional center point in parent space (default: element's local position).
         * @returns This element for chaining.
         */
        public rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

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
         * Rotates this element to face a target point in world coordinates.
         * @param targetWorld - The world coordinate to face.
         * @param upAxis - The world up reference axis (default: 0, 1, 0).
         * @returns This element for chaining.
         */
        public lookAt(targetWorld: Vector3, upAxis?: Vector3): this {
            if (this._isDeletedAndLogWarning()) return this;

            this.ensureWorldTransformUpdated();
            Vectors.subtract(targetWorld, this._worldPos, _lookAtDeltaPos);
            Quaternions.setFromLookRotation(_lookAtRot, _lookAtDeltaPos, upAxis ?? _UP_AXIS);
            this.setWorldRotation(_lookAtRot);

            return this;
        }

        // ---------------------------------------------------------------------
        // Coordinate Space Projections
        // ---------------------------------------------------------------------

        /**
         * Converts a local point to world space.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world space point, or undefined if deleted.
         */
        public localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

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
         * @returns The transformed local space point, or undefined if deleted.
         */
        public worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

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
         * @returns The transformed world direction vector, or undefined if deleted.
         */
        public localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();

            return Quaternions.rotateVector(localVec, this._worldRot, out);
        }

        /**
         * Converts a world direction vector to local space (ignores translation).
         * @param worldVec - Direction vector in world space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local direction vector, or undefined if deleted.
         */
        public worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 | undefined {
            if (this._isDeleted()) return undefined;

            this.ensureWorldTransformUpdated();
            Quaternions.conjugate(this._worldRot, _projInvRot);

            return Quaternions.rotateVector(worldVec, _projInvRot, out);
        }

        // ---------------------------------------------------------------------
        // Lifecycle & Destruction
        // ---------------------------------------------------------------------

        /**
         * Recursively destroys this element and all of its descendants, unspawning native objects.
         */
        public destroy(): void {
            if (this._isDeletedAndLogWarning()) return;

            this._setFlag(FLAG_DELETED);
            --_activeNodeCount;

            // Remove from parent
            SpatialNode._unlink(this);

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
                    logging.log('Error unspawning object on destroy', LogLevel.Error, error);
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
         * Applies computed attachment transform and offset to this element.
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
         * Attaches this element to follow a player's real-time position/orientation in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param player - The player to track.
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        public attachToPlayer(player: mod.Player, options?: AttachOptions): this {
            if (this._isDeletedAndLogWarning()) return this;

            this.setParent(ROOT_NODE);
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
         * Attaches this element to follow a vehicle's real-time position/orientation in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param vehicle - The vehicle to track.
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        public attachToVehicle(vehicle: mod.Vehicle, options?: AttachOptions): this {
            if (this._isDeletedAndLogWarning()) return this;

            this.setParent(ROOT_NODE);
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
         * Attaches this element to follow an in-game object (props, spawners, etc.) in real time in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param object - The native in-game object to track (excluding Player and Vehicle).
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        public attachToObject(object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): this {
            if (this._isDeletedAndLogWarning()) return this;

            this.setParent(ROOT_NODE);
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
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param tracker - Custom tracking function.
         * @returns This element for chaining.
         */
        public attachToTracker(
            tracker: () => { position: Vector3; rotation?: Quaternion | Vector3 } | undefined
        ): this {
            if (this._isDeletedAndLogWarning()) return this;

            this.setParent(ROOT_NODE);
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
         * Clears any active attachment tracker on this element.
         * @returns This element for chaining.
         */
        public detachTracker(): this {
            this._tracker = undefined;
            return this;
        }

        /**
         * Configures orbital rotation motion on this element around an axis and pivot center.
         * Clears any active attachment tracker, follow controller, or linear kinematics.
         * @param options - Orbit configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        public setOrbit(options?: OrbitOptions | null): this {
            if (this._isDeletedAndLogWarning()) return this;

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

            const center = options.center ?? Vectors.ZERO;
            const currentOffset = Vectors.subtract(this._localPos, center);

            this._orbitConfig = {
                ...options,
                currentAngleRad: 0,
                initialOffset: currentOffset,
            };

            return this;
        }

        /**
         * Configures LookAt target tracking on this element.
         * Clears conflicting angular kinematics and orbit tangent/spin options.
         * @param options - LookAt configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        public setLookAt(options?: LookAtOptions | null): this {
            if (this._isDeletedAndLogWarning()) return this;

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
         * Configures continuous smooth follow behavior on this element in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears conflicting attachment trackers, orbit controllers, and linear kinematics.
         * @param options - Follow configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        public setFollow(options?: FollowOptions | null): this {
            if (this._isDeletedAndLogWarning()) return this;

            if (options?.target !== undefined) {
                this.setParent(ROOT_NODE);
                this._tracker = undefined;
                this._orbitConfig = undefined;
                this._linearVelocity = undefined;
                this._linearAcceleration = undefined;
            }

            this._followConfig = options ?? undefined;

            return this;
        }

        /**
         * Configures kinematic velocity and acceleration integration on this element.
         * Setting linear kinematics clears conflicting positional controllers (orbit, follow, tracker).
         * Setting angular kinematics clears conflicting rotational controllers (lookAt, orbit spin).
         * @param options - Kinematics configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        public setKinematics(options?: KinematicsOptions | null): this {
            if (this._isDeletedAndLogWarning()) return this;

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
        // Internal Step Handlers
        // ---------------------------------------------------------------------

        private _stepKinematics(dt: number): void {
            // 1. Linear Acceleration -> Linear Velocity
            if (this._linearAcceleration) {
                if (!this._linearVelocity) {
                    this._linearVelocity = { x: 0, y: 0, z: 0 };
                }

                Vectors.multiply(this._linearAcceleration, dt, _kinematicsStepDelta);
                Vectors.add(this._linearVelocity, _kinematicsStepDelta, this._linearVelocity);
            }

            // 2. Linear Velocity -> Local Position
            if (this._linearVelocity) {
                Vectors.multiply(this._linearVelocity, dt, _kinematicsStepDelta);
                Vectors.add(this._localPos, _kinematicsStepDelta, this._localPos);
                this._markDirty();
            }

            // 3. Angular Acceleration -> Angular Velocity
            if (this._angularAcceleration) {
                if (!this._angularVelocity) {
                    this._angularVelocity = { x: 0, y: 0, z: 0 };
                }

                Vectors.multiply(this._angularAcceleration, dt, _kinematicsStepDelta);
                Vectors.add(this._angularVelocity, _kinematicsStepDelta, this._angularVelocity);
            }

            // 4. Angular Velocity -> Local Rotation
            if (this._angularVelocity) {
                const angle = Vectors.length(this._angularVelocity) * dt;

                if (angle > 0) {
                    Quaternions.setFromAxisAngle(_kinematicsAngularRot, this._angularVelocity, angle);
                    Quaternions.multiply(this._localRot, _kinematicsAngularRot, this._localRot);
                    this._markDirty();
                }
            }
        }

        private _stepOrbit(dt: number): void {
            if (!this._orbitConfig) return;

            const config = this._orbitConfig;
            config.currentAngleRad += config.speedRadPerSec * dt;

            const axis = config.axis ?? _UP_AXIS;
            const center = config.center ?? Vectors.ZERO;

            Quaternions.setFromAxisAngle(_orbitRot, axis, config.currentAngleRad);
            Quaternions.rotateVector(config.initialOffset, _orbitRot, _orbitRotatedOffset);
            Vectors.add(center, _orbitRotatedOffset, this._localPos);

            if (config.faceTangent) {
                Vectors.cross(axis, _orbitRotatedOffset, _orbitTangentCross);

                if (Vectors.lengthSquared(_orbitTangentCross) > 0) {
                    const yaw = Math.atan2(_orbitTangentCross.x, _orbitTangentCross.z);
                    Quaternions.setFromEuler(this._localRot, 0, yaw, 0);
                }
            }

            if (config.selfSpinSpeedRadPerSec) {
                Quaternions.setFromAxisAngle(_orbitSpinRot, _UP_AXIS, config.selfSpinSpeedRadPerSec * dt);
                Quaternions.multiply(this._localRot, _orbitSpinRot, this._localRot);
            }

            this._markDirty();
        }

        private _stepLookAt(): void {
            if (!this._lookAtConfig?.target) return;

            const target = this._lookAtConfig.target;

            if (target instanceof SpatialElement) {
                const targetPos = target.getWorldPosition(_lookAtTargetPos);

                if (targetPos) {
                    this.lookAt(targetPos, this._lookAtConfig.upAxis);
                }
            } else if ('x' in target && 'y' in target && 'z' in target) {
                this.lookAt(target, this._lookAtConfig.upAxis);
            } else if (mod.IsValid(target)) {
                Vectors.toVector3(mod.GetObjectPosition(target), _lookAtPlayerPos);
                this.lookAt(_lookAtPlayerPos, this._lookAtConfig.upAxis);
            }
        }

        private _stepFollow(dt: number): void {
            if (!this._followConfig?.target) return;

            const target = this._followConfig.target;
            let targetPos: Vector3 | undefined;

            if (target instanceof SpatialElement) {
                targetPos = target.worldPosition;
            } else if (mod.IsValid(target)) {
                targetPos = Vectors.toVector3(mod.GetObjectPosition(target), _followPlayerPos);
            }

            if (!targetPos) return;

            const smooth = this._followConfig.smoothSpeed ?? 10;
            const factor = smooth <= 0 ? 1 : Math.min(1, smooth * dt);
            const off = this._followConfig.offset ?? Vectors.ZERO;

            Vectors.add(targetPos, off, _followTargetWithOffset);
            this.getWorldPosition(_followLerpedPos);
            Vectors.lerp(_followLerpedPos, _followTargetWithOffset, factor, _followLerpedPos);
            this.worldPosition = _followLerpedPos;
        }

        // ---------------------------------------------------------------------
        // Transform Evaluation & Engine Synchronization
        // ---------------------------------------------------------------------

        /**
         * Re-evaluates world transform hierarchy matrices top-down if dirty.
         */
        public ensureWorldTransformUpdated(): void {
            if (!this._hasFlag(FLAG_DIRTY)) return;

            if (this._parent !== ROOT_NODE) {
                const parent = this._parent as SpatialElement;
                parent.ensureWorldTransformUpdated();

                // World Scale = Parent World Scale * Local Scale
                Vectors.hadamardMultiply(parent._worldScale, this._localScale, this._worldScale);

                // World Rotation = Parent World Rotation * Local Rotation
                Quaternions.multiply(parent._worldRot, this._localRot, this._worldRot);

                // Scaled Local Position = Local Pos * Parent World Scale
                Vectors.hadamardMultiply(this._localPos, parent._worldScale, _worldEvalScaledPos);

                // Rotate scaled local pos by parent world rotation
                Quaternions.rotateVector(_worldEvalScaledPos, parent._worldRot, _worldEvalRotatedPos);

                // World Position = Parent World Position + Rotated Scaled Local Position
                Vectors.add(parent._worldPos, _worldEvalRotatedPos, this._worldPos);
            } else {
                // Root Node
                Vectors.copy(this._worldPos, this._localPos);
                Quaternions.copy(this._worldRot, this._localRot);
                Vectors.copy(this._worldScale, this._localScale);
            }

            this._clearFlag(FLAG_DIRTY);
        }

        /**
         * Computes the visual placement position of the native model accounting for pivot offset.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated visual placement vector, or undefined if deleted.
         */
        public computeRenderPosition(out?: Vector3): Vector3 | undefined {
            if (this._hasFlag(FLAG_DELETED)) return undefined;

            this.ensureWorldTransformUpdated();

            const target = out ?? { x: 0, y: 0, z: 0 };

            if (!this._pivotOffset) {
                return Vectors.copy(target, this._worldPos);
            }

            Vectors.hadamardMultiply(this._pivotOffset, this._worldScale, _renderPivotScaled);
            Quaternions.rotateVector(_renderPivotScaled, this._worldRot, _renderPivotRotated);

            return Vectors.add(this._worldPos, _renderPivotRotated, target);
        }

        /**
         * Marks this element and all of its descendants as dirty.
         */
        private _markDirty(): void {
            this._setFlag(FLAG_DIRTY | FLAG_ENGINE_TRANSFORM_DIRTY);

            const childCount = this._children.length;

            for (let i = 0; i < childCount; ++i) {
                this._children[i]._markDirty();
            }
        }

        /**
         * Internal update step for this element's active controllers and kinematics.
         * @param dt - Delta time in seconds.
         */
        protected override _updateSelf(dt: number): void {
            if (this._isDeleted()) return;

            if (this._tracker) {
                this._tracker();
            }

            this._stepKinematics(dt);
            this._stepOrbit(dt);
            this._stepLookAt();
            this._stepFollow(dt);
        }

        /**
         * Internal method to synchronize dirty transforms of this element to native engine objects.
         */
        protected override _syncSelf(): void {
            if (this._isDeleted()) return;

            this.ensureWorldTransformUpdated();

            if (this._hasFlag(FLAG_ENGINE_TRANSFORM_DIRTY) && this._object && mod.IsValid(this._object)) {
                const renderPos = this.computeRenderPosition(_renderPos);

                if (renderPos) {
                    const rotEuler = Quaternions.toEuler(this._worldRot, _renderEuler);

                    try {
                        mod.SetObjectTransform(
                            this._object as mod.SpatialObject,
                            mod.CreateTransform(Vectors.toVector(renderPos), Vectors.toVector(rotEuler))
                        );
                    } catch (error: unknown) {
                        logging.log('Error applying transform to native object', LogLevel.Error, error);
                    }
                }

                this._clearFlag(FLAG_ENGINE_TRANSFORM_DIRTY);
            }
        }
    }

    // =========================================================================
    // Scene Graph Static Functions
    // =========================================================================

    let _activeNodeCount = 0;
    const SERVER_START_TIME = Date.now();
    let _lastUpdateTime = 0;

    /**
     * @returns The current server uptime in milliseconds.
     */
    function _getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    /**
     * Creates an empty SpatialElement (virtual parent anchor or child element).
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if parent is deleted.
     */
    export function createEmpty(options?: NodeOptions): SpatialElement | null {
        return SpatialElement.createEmpty(options);
    }

    /**
     * Spawns a runtime prefab as a new SpatialElement (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if spawning failed or parent is deleted.
     */
    export function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialElement | null {
        return SpatialElement.createRuntime(prefab, options);
    }

    /**
     * Wraps an existing in-game object as a SpatialElement (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if parent is deleted.
     */
    export function createExisting(object: TransformableObject, options?: NodeOptions): SpatialElement | null {
        return SpatialElement.createExisting(object, options);
    }

    /**
     * Updates all active controllers, kinematics, and external trackers across the scene graph,
     * then synchronizes dirty transforms to the game engine.
     * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
     * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
     * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
     */
    export function update(deltaTimeSeconds?: number): void {
        SpatialNode.update(deltaTimeSeconds);
    }

    /**
     * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
     * to all modified native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void {
        SpatialNode.sync();
    }

    /**
     * Returns the total count of active elements in the scene graph.
     * @returns The number of active elements.
     */
    export function getActiveNodeCount(): number {
        return _activeNodeCount;
    }
}
