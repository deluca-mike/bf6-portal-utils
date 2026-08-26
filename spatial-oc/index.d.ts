import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace SpatialOC {
    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    type TransformableObject =
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
    type RuntimeSpawnPrefab =
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
     * A transparent 3D vector representing a point, direction, scale, or euler rotation in 3D space.
     */
    type Vector3 = Vectors.Vector3;
    /**
     * A transparent 4D Quaternion representing 3D spatial rotation.
     */
    type Quaternion = Quaternions.Quaternion;
    /**
     * Common initialization options for creating SpatialElements.
     */
    interface NodeOptions {
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
    interface AttachOptions {
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
    interface OrbitOptions {
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
    interface LookAtOptions {
        /** The target to continuously look at (world position, Player, or SpatialElement). */
        target?: Vector3 | mod.Player | SpatialElement;
        /** The up axis reference vector. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }
    /**
     * Options for configuring a Smooth Follow controller on a node.
     */
    interface FollowOptions {
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
    interface KinematicsOptions {
        /** Linear velocity vector in parent space (meters per second). */
        linearVelocity?: Vector3;
        /** Angular velocity vector (axis * radians per second) in local space. */
        angularVelocity?: Vector3;
        /** Linear acceleration vector in parent space (meters per second squared). */
        linearAcceleration?: Vector3;
        /** Angular acceleration vector (axis * radians per second squared) in local space. */
        angularAcceleration?: Vector3;
    }
    /**
     * Base class representing a node within the virtual spatial hierarchy.
     */
    abstract class SpatialNode {
        protected _parent: SpatialNode | null;
        protected _children: SpatialElement[];
        protected _isDeletedAndLogWarning(): boolean;
        /**
         * Whether this node is deleted.
         * @returns True if deleted, false otherwise.
         */
        protected _isDeleted(): boolean;
        /**
         * The parent node in the hierarchy, or null for the root node, or undefined if deleted.
         * @returns The parent node, null, or undefined.
         */
        get parent(): SpatialNode | null | undefined;
        /**
         * Retrieves the parent node in the hierarchy.
         * @returns The parent node, null for the root node, or undefined if deleted.
         */
        getParent(): SpatialNode | null | undefined;
        /**
         * The total number of direct child elements, or undefined if deleted.
         * @returns The child count, or undefined.
         */
        get childCount(): number | undefined;
        /**
         * Retrieves the total number of direct child elements.
         * @returns The child count, or undefined if deleted.
         */
        getChildCount(): number | undefined;
        /**
         * Returns a shallow copy of the list of direct child elements, or undefined if deleted.
         * @returns Array of direct children, or undefined.
         */
        get children(): readonly SpatialElement[] | undefined;
        /**
         * Retrieves a shallow copy of the list of direct child elements.
         * @returns Array of direct children, or undefined if deleted.
         */
        getChildren(): readonly SpatialElement[] | undefined;
        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, null if out of bounds, or undefined if deleted.
         */
        getChild(index: number): SpatialElement | null | undefined;
        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child element.
         */
        forEachChild(callback: (child: SpatialElement, index: number) => void): void;
        /**
         * Internal helper to add a child element.
         * @param child - The child element to add.
         * @returns True if added, false otherwise.
         */
        protected _addChild(child: SpatialElement): boolean;
        /**
         * Internal helper to remove a child element.
         * @param child - The child element to remove.
         * @returns True if removed, false otherwise.
         */
        protected _removeChild(child: SpatialElement): boolean;
        /**
         * Links a child element to a parent node.
         * @param parent - The parent node.
         * @param child - The child element to link.
         */
        protected static _link(parent: SpatialNode, child: SpatialElement): void;
        /**
         * Unlinks a child element from its parent node.
         * @param child - The child element to unlink.
         */
        protected static _unlink(child: SpatialElement): void;
        /**
         * Internal self update lifecycle step.
         * @param _dt - Delta time in seconds.
         */
        protected _updateSelf(_dt: number): void;
        /**
         * Internal self sync lifecycle step.
         */
        protected _syncSelf(): void;
        /**
         * Internal update lifecycle step that updates self and all child elements.
         * @param dt - Delta time in seconds.
         */
        protected _updateInternal(dt: number): void;
        /**
         * Internal sync lifecycle step that syncs self and all child elements.
         */
        protected _syncInternal(): void;
        /**
         * Updates all active controllers, kinematics, and external trackers across the scene graph,
         * then synchronizes dirty transforms to the game engine.
         * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
         * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
         * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
         */
        static update(deltaTimeSeconds?: number): void;
        /**
         * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
         * to all modified native objects via `mod.SetObjectTransform`.
         */
        static sync(): void;
    }
    /**
     * The global root anchor of the scene graph.
     */
    const ROOT_NODE: SpatialNode;
    /**
     * Represents a 3D spatial transformable element within the virtual hierarchy.
     * Manages canonical local transforms, cached world matrices, model offsets, and engine synchronization.
     */
    class SpatialElement extends SpatialNode {
        private _object?;
        private _pivotOffset?;
        private _localPos;
        private _localRot;
        private _localScale;
        private _worldPos;
        private _worldRot;
        private _worldScale;
        private _flags;
        private _hasFlag;
        private _setFlag;
        private _clearFlag;
        private _tracker?;
        private _orbitConfig?;
        private _lookAtConfig?;
        private _followConfig?;
        private _linearVelocity?;
        private _angularVelocity?;
        private _linearAcceleration?;
        private _angularAcceleration?;
        /**
         * Creates an empty SpatialElement (virtual parent anchor or child element).
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if parent is deleted.
         */
        static createEmpty(options?: NodeOptions): SpatialElement | null;
        /**
         * Spawns a runtime prefab as a new SpatialElement (root or child).
         * @param prefab - The runtime spawn prefab enum.
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if spawning failed or parent is deleted.
         */
        static createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialElement | null;
        /**
         * Wraps an existing in-game object as a SpatialElement (root or child).
         * @param object - The existing native transformable object.
         * @param options - Initialization options (including optional parent).
         * @returns The created element, or null if parent is deleted.
         */
        static createExisting(object: TransformableObject, options?: NodeOptions): SpatialElement | null;
        /**
         * Private constructor for SpatialElement. Use `SpatialElement.createEmpty`, `createRuntime`, or `createExisting`.
         * @param options - Initialization options.
         * @param isRuntimeSpawned - Whether the native object was spawned dynamically at runtime.
         * @param nativeObject - The native engine object handle.
         */
        private constructor();
        /**
         * Checks whether this element and its native object (if any) are valid and alive.
         * @returns True if valid and alive, false otherwise.
         */
        get isValid(): boolean;
        /**
         * Whether this element has been deleted/destroyed.
         * @returns True if deleted/destroyed, false otherwise.
         */
        get isDeleted(): boolean;
        protected _isDeleted(): boolean;
        /**
         * The parent node in the hierarchy, or undefined if deleted.
         * @returns The parent node, or undefined if deleted.
         */
        get parent(): SpatialNode | undefined;
        /**
         * Sets the parent node in the hierarchy.
         * Automatically unlinks from current parent and links to the new parent.
         */
        set parent(newParent: SpatialNode);
        /**
         * Retrieves the parent node in the hierarchy.
         * @returns The parent node, or undefined if deleted.
         */
        getParent(): SpatialNode | undefined;
        /**
         * Sets the parent node in the hierarchy.
         * @param newParent - The new parent SpatialNode (e.g. ROOT_NODE or another SpatialElement).
         * @returns This element for chaining.
         */
        setParent(newParent: SpatialNode): this;
        /**
         * Gets the in-game model offset correction, null if unset, or undefined if deleted.
         * @returns The pivot offset vector, null, or undefined.
         */
        get pivotOffset(): Vector3 | null | undefined;
        /**
         * Sets the in-game model offset correction for prefab centering.
         */
        set pivotOffset(offset: Vector3 | null | undefined);
        /**
         * Retrieves the in-game model offset correction.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The pivot offset vector, null if unset, or undefined if deleted.
         */
        getPivotOffset(out?: Vector3): Vector3 | null | undefined;
        /**
         * Sets the in-game model offset correction for prefab centering.
         * @param offset - The offset vector, or null/undefined to clear.
         * @returns This element for chaining.
         */
        setPivotOffset(offset?: Vector3 | null): this;
        /**
         * Gets the local position relative to parent, or undefined if deleted.
         * @returns The local position vector, or undefined.
         */
        get localPosition(): Vector3 | undefined;
        /**
         * Sets the local position relative to parent.
         */
        set localPosition(pos: Vector3);
        /**
         * Retrieves the local position relative to parent.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local position vector, or undefined if deleted.
         */
        getLocalPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local position relative to parent.
         * @param pos - The new local position.
         * @returns This element for chaining.
         */
        setLocalPosition(pos: Vector3): this;
        /**
         * Gets the local rotation Quaternion relative to parent, or undefined if deleted.
         * @returns The local rotation quaternion, or undefined.
         */
        get localRotation(): Quaternion | undefined;
        /**
         * Sets the local rotation Quaternion relative to parent.
         */
        set localRotation(rot: Quaternion);
        /**
         * Retrieves the local rotation Quaternion relative to parent.
         * @param out - Optional target Quaternion to write into for zero-allocation reuse.
         * @returns The local rotation quaternion, or undefined if deleted.
         */
        getLocalRotation(out?: Quaternion): Quaternion | undefined;
        /**
         * Sets the local rotation Quaternion relative to parent.
         * @param rot - The new local rotation quaternion.
         * @returns This element for chaining.
         */
        setLocalRotation(rot: Quaternion): this;
        /**
         * Gets the local rotation as Euler angles in radians (ZYX order), or undefined if deleted.
         * @returns The local Euler angles vector in radians, or undefined.
         */
        get localRotationEuler(): Vector3 | undefined;
        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         */
        set localRotationEuler(euler: Vector3);
        /**
         * Retrieves the local rotation as Euler angles in radians (ZYX order).
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local Euler angles vector in radians, or undefined if deleted.
         */
        getLocalRotationEuler(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         * @param euler - The new local Euler angles in radians.
         * @returns This element for chaining.
         */
        setLocalRotationEuler(euler: Vector3): this;
        /**
         * Gets the local scale, or undefined if deleted.
         * @returns The local scale vector, or undefined.
         */
        get localScale(): Vector3 | undefined;
        /**
         * Sets the local scale (uniform or per-axis).
         */
        set localScale(scale: Vector3 | number);
        /**
         * Retrieves the local scale.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local scale vector, or undefined if deleted.
         */
        getLocalScale(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local scale (uniform or per-axis).
         * @param scale - The new uniform number or Vector3 scale.
         * @returns This element for chaining.
         */
        setLocalScale(scale: Vector3 | number): this;
        /**
         * Gets the evaluated world position, or undefined if deleted.
         * @returns The evaluated world position vector, or undefined.
         */
        get worldPosition(): Vector3 | undefined;
        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         */
        set worldPosition(worldPos: Vector3);
        /**
         * Retrieves the evaluated world position.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world position vector, or undefined if deleted.
         */
        getWorldPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         * @param worldPos - The desired world position.
         * @returns This element for chaining.
         */
        setWorldPosition(worldPos: Vector3): this;
        /**
         * Gets the evaluated world rotation Quaternion, or undefined if deleted.
         * @returns The evaluated world rotation quaternion, or undefined.
         */
        get worldRotation(): Quaternion | undefined;
        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         */
        set worldRotation(worldRot: Quaternion);
        /**
         * Retrieves the evaluated world rotation Quaternion.
         * @param out - Optional target Quaternion to write into for zero-allocation reuse.
         * @returns The evaluated world rotation quaternion, or undefined if deleted.
         */
        getWorldRotation(out?: Quaternion): Quaternion | undefined;
        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         * @param worldRot - The desired world rotation quaternion.
         * @returns This element for chaining.
         */
        setWorldRotation(worldRot: Quaternion): this;
        /**
         * Gets the evaluated world rotation as Euler angles in radians (ZYX order), or undefined if deleted.
         * @returns The evaluated world Euler angles vector in radians, or undefined.
         */
        get worldRotationEuler(): Vector3 | undefined;
        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         */
        set worldRotationEuler(worldEuler: Vector3);
        /**
         * Retrieves the evaluated world rotation as Euler angles in radians (ZYX order).
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world Euler angles vector in radians, or undefined if deleted.
         */
        getWorldRotationEuler(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         * @param worldEuler - The desired world Euler angles in radians.
         * @returns This element for chaining.
         */
        setWorldRotationEuler(worldEuler: Vector3): this;
        /**
         * Gets the evaluated world scale, or undefined if deleted.
         * @returns The evaluated world scale vector, or undefined.
         */
        get worldScale(): Vector3 | undefined;
        /**
         * Retrieves the evaluated world scale.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated world scale vector, or undefined if deleted.
         */
        getWorldScale(out?: Vector3): Vector3 | undefined;
        /**
         * Translates the element in local coordinates.
         * @param delta - Vector delta in local space.
         * @returns This element for chaining.
         */
        translateLocal(delta: Vector3): this;
        /**
         * Translates the element in parent / world coordinates.
         * @param delta - Vector delta in parent coordinate space.
         * @returns This element for chaining.
         */
        translate(delta: Vector3): this;
        /**
         * Rotates the element locally by multiplying with a delta Quaternion.
         * @param deltaRot - Quaternion delta to multiply.
         * @returns This element for chaining.
         */
        rotateLocal(deltaRot: Quaternion): this;
        /**
         * Rotates the element around an arbitrary axis and optional pivot center in parent/world space.
         * @param axis - The unit axis to rotate around.
         * @param angleRad - The angle in radians.
         * @param pivotCenter - Optional center point in parent space (default: element's local position).
         * @returns This element for chaining.
         */
        rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this;
        /**
         * Rotates this element to face a target point in world coordinates.
         * @param targetWorld - The world coordinate to face.
         * @param upAxis - The world up reference axis (default: 0, 1, 0).
         * @returns This element for chaining.
         */
        lookAt(targetWorld: Vector3, upAxis?: Vector3): this;
        /**
         * Converts a local point to world space.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world space point, or undefined if deleted.
         */
        localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a world space point to local coordinate space.
         * @param worldPoint - Point in world coordinates.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local space point, or undefined if deleted.
         */
        worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a local direction vector to world space (ignores translation).
         * @param localVec - Direction vector in local space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world direction vector, or undefined if deleted.
         */
        localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a world direction vector to local space (ignores translation).
         * @param worldVec - Direction vector in world space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local direction vector, or undefined if deleted.
         */
        worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Recursively destroys this element and all of its descendants, unspawning native objects.
         */
        destroy(): void;
        /**
         * Computes orientation quaternion looking in a given 3D facing direction with yaw constraints.
         * @param facing - Facing direction vector.
         * @param yawOnly - Whether to constrain rotation to yaw only.
         * @param out - Destination quaternion.
         * @returns The evaluated quaternion.
         */
        private _computeFacingQuaternion;
        /**
         * Applies computed attachment transform and offset to this element.
         * @param pos - Evaluated position vector.
         * @param rot - Evaluated rotation quaternion (if trackRotation is true).
         * @param offset - Optional relative offset vector.
         * @param trackRotation - Whether rotation tracking is active.
         */
        private _applyAttachmentTransform;
        /**
         * Attaches this element to follow a player's real-time position/orientation in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param player - The player to track.
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        attachToPlayer(player: mod.Player, options?: AttachOptions): this;
        /**
         * Attaches this element to follow a vehicle's real-time position/orientation in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param vehicle - The vehicle to track.
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        attachToVehicle(vehicle: mod.Vehicle, options?: AttachOptions): this;
        /**
         * Attaches this element to follow an in-game object (props, spawners, etc.) in real time in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param object - The native in-game object to track (excluding Player and Vehicle).
         * @param options - Attachment options.
         * @returns This element for chaining.
         */
        attachToObject(object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): this;
        /**
         * Attaches a custom dynamic tracker callback in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears any active follow, orbit, or linear kinematics.
         * @param tracker - Custom tracking function.
         * @returns This element for chaining.
         */
        attachToTracker(
            tracker: () =>
                | {
                      position: Vector3;
                      rotation?: Quaternion | Vector3;
                  }
                | undefined
        ): this;
        /**
         * Clears any active attachment tracker on this element.
         * @returns This element for chaining.
         */
        detachTracker(): this;
        /**
         * Configures orbital rotation motion on this element around an axis and pivot center.
         * Clears any active attachment tracker, follow controller, or linear kinematics.
         * @param options - Orbit configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        setOrbit(options?: OrbitOptions | null): this;
        /**
         * Configures LookAt target tracking on this element.
         * Clears conflicting angular kinematics and orbit tangent/spin options.
         * @param options - LookAt configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        setLookAt(options?: LookAtOptions | null): this;
        /**
         * Configures continuous smooth follow behavior on this element in world space.
         * Automatically sets parent to ROOT_NODE.
         * Clears conflicting attachment trackers, orbit controllers, and linear kinematics.
         * @param options - Follow configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        setFollow(options?: FollowOptions | null): this;
        /**
         * Configures kinematic velocity and acceleration integration on this element.
         * Setting linear kinematics clears conflicting positional controllers (orbit, follow, tracker).
         * Setting angular kinematics clears conflicting rotational controllers (lookAt, orbit spin).
         * @param options - Kinematics configuration, or null/undefined to clear.
         * @returns This element for chaining.
         */
        setKinematics(options?: KinematicsOptions | null): this;
        private _stepKinematics;
        private _stepOrbit;
        private _stepLookAt;
        private _stepFollow;
        /**
         * Re-evaluates world transform hierarchy matrices top-down if dirty.
         */
        ensureWorldTransformUpdated(): void;
        /**
         * Computes the visual placement position of the native model accounting for pivot offset.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The evaluated visual placement vector, or undefined if deleted.
         */
        computeRenderPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Marks this element and all of its descendants as dirty.
         */
        private _markDirty;
        /**
         * Internal update step for this element's active controllers and kinematics.
         * @param dt - Delta time in seconds.
         */
        protected _updateSelf(dt: number): void;
        /**
         * Internal method to synchronize dirty transforms of this element to native engine objects.
         */
        protected _syncSelf(): void;
    }
    /**
     * Creates an empty SpatialElement (virtual parent anchor or child element).
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if parent is deleted.
     */
    function createEmpty(options?: NodeOptions): SpatialElement | null;
    /**
     * Spawns a runtime prefab as a new SpatialElement (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if spawning failed or parent is deleted.
     */
    function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialElement | null;
    /**
     * Wraps an existing in-game object as a SpatialElement (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parent).
     * @returns The created element, or null if parent is deleted.
     */
    function createExisting(object: TransformableObject, options?: NodeOptions): SpatialElement | null;
    /**
     * Updates all active controllers, kinematics, and external trackers across the scene graph,
     * then synchronizes dirty transforms to the game engine.
     * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
     * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
     * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
     */
    function update(deltaTimeSeconds?: number): void;
    /**
     * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
     * to all modified native objects via `mod.SetObjectTransform`.
     */
    function sync(): void;
    /**
     * Returns the total count of active elements in the scene graph.
     * @returns The number of active elements.
     */
    function getActiveNodeCount(): number;
}
