import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace Spatial {
    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
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
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * Unique generation-encoded identifier for a Spatial node (0 represents ROOT_NODE_ID).
     */
    type SpatialNodeID = number & {
        readonly __brand: 'SpatialNodeID';
    };
    /**
     * A transparent 3D vector representing a point, direction, scale, or euler rotation in 3D space.
     */
    type Vector3 = Vectors.Vector3;
    /**
     * A transparent 4D Quaternion representing 3D spatial rotation.
     */
    type Quaternion = Quaternions.Quaternion;
    /**
     * Supported in-game transformable engine object types (players, vehicles, spawners, props, triggers).
     */
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
     * Supported in-game trackable engine object types (players, vehicles, spawners, props, triggers).
     */
    type TrackableObject =
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
    interface TransparentObject {
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
    type FollowSmoothingFunction = (current: Vector3, target: Vector3, dt: number, out?: Vector3) => Vector3;
    /**
     * Common initialization options for creating SpatialNodes.
     */
    interface NodeParams {
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
    type EmptyParams = NodeParams;
    /**
     * Initialization options for dynamically spawning runtime prefab nodes.
     */
    interface RuntimeParams extends NodeParams {
        /** The runtime spawn prefab enum to instantiate. */
        prefab: RuntimeSpawnPrefab;
    }
    /**
     * Initialization options for wrapping existing native engine objects.
     */
    interface ExistingParams extends NodeParams {
        /** The existing native transformable object to wrap. */
        object: TransformableObject;
    }
    /**
     * Options for continuous orbital rotation motion.
     */
    interface OrbitOptions {
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
    interface LookAtOptions {
        /** The target to continuously look at (world position, Player, Vehicle, TrackableObject, SpatialNode, SpatialNodeID, or TransparentObject). */
        target?: TrackableObject | SpatialNode | SpatialNodeID | TransparentObject | Vector3;
        /** World up vector for camera/orientation leveling. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }
    /**
     * Options for continuous follow behavior on a node.
     */
    interface FollowOptions {
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
     * Constant representing the root anchor node ID in the scene graph.
     */
    const ROOT_NODE_ID: SpatialNodeID;
    /**
     * Constant representing an invalid/unallocated spatial node ID.
     */
    const INVALID_NODE_ID: SpatialNodeID;
    const MAX_NODES = 1024;
    /**
     * Checks whether a given node ID is deleted.
     * @param id - The node ID to check.
     * @returns True if deleted, false if active, undefined if it never existed (i.e. invalid).
     */
    function isDeleted(id: SpatialNodeID): boolean | undefined;
    /**
     * Checks whether a given node ID is valid and active.
     * @param id - The node ID to check.
     * @returns True if valid and active, false otherwise.
     */
    function isValid(id: SpatialNodeID): boolean;
    /**
     * Base class representing a node in the virtual 3D spatial hierarchy.
     */
    abstract class SpatialNode {
        readonly _id: SpatialNodeID;
        protected constructor(id: SpatialNodeID);
        /**
         * Resolves any scene graph node by ID.
         * Returns ROOT_NODE for ID 0, the SpatialElement for element IDs, or null if deleted/invalid.
         * @param id - The SpatialNodeID.
         * @returns The SpatialNode instance (ROOT_NODE or SpatialElement), or null if deleted or invalid.
         */
        static fromId(id: SpatialNodeID): SpatialNode | null;
        /**
         * The public generation-encoded node ID.
         * @returns The node ID.
         */
        get id(): SpatialNodeID;
        /**
         * Checks whether this node is currently active and alive.
         * @returns True if the node is alive, false otherwise.
         */
        get isValid(): boolean;
        /**
         * Checks whether this node has been deleted.
         * @returns True if deleted, false if active, undefined if it never existed (i.e. invalid).
         */
        get isDeleted(): boolean | undefined;
        /**
         * The parent node in the hierarchy, null for ROOT_NODE, or undefined if deleted.
         * @returns The parent node.
         */
        get parent(): SpatialNode | null | undefined;
        /**
         * Total number of direct child nodes.
         * @returns The child count, or undefined if deleted.
         */
        get childCount(): number | undefined;
        /**
         * Returns a snapshot array of direct children.
         * @returns Array of direct child elements, or undefined if deleted.
         */
        get children(): readonly SpatialElement[] | undefined;
        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based child index.
         * @returns The child element, null if out of bounds, or undefined if deleted.
         */
        getChild(index: number): SpatialElement | null | undefined;
        /**
         * Iterates over all direct child elements without intermediate array allocation.
         * @param callback - Function invoked for each child element.
         */
        forEachChild(callback: (child: SpatialElement, index: number) => void): void;
    }
    /**
     * Singleton Root Node representing the global scene graph origin anchor.
     */
    const ROOT_NODE: SpatialNode;
    /**
     * A 3D spatial transformable element within the scene graph.
     * Backed entirely by flat TypedArrays with zero instance fields other than `_id`.
     */
    abstract class SpatialElement extends SpatialNode {
        protected constructor(id: SpatialNodeID);
        /**
         * Resolves or lazily instantiates the transformable SpatialElement facade wrapper for an active element ID.
         * @param id - The SpatialNodeID.
         * @returns The SpatialElement instance, or null if deleted, invalid, or ROOT_NODE_ID (0).
         */
        static fromId(id: SpatialNodeID): SpatialElement | null;
        get parent(): SpatialNode | null | undefined;
        /**
         * Sets the parent node in the hierarchy.
         * @param newParent - Target parent node instance or ID.
         */
        set parent(newParent: SpatialNode | SpatialNodeID);
        /**
         * Attaches this element as a child of another node.
         * @param newParent - Target parent node instance or ID.
         * @returns `this` instance for method chaining.
         */
        setParent(newParent: SpatialNode | SpatialNodeID): this;
        /**
         * Deletes this element and recursively tears down all descendants, unspawning native prefabs.
         */
        delete(): void;
        /**
         * The position of the element in local parent space.
         * @returns The local position vector.
         */
        get localPosition(): Vector3 | undefined;
        /**
         * Sets the local position of the element in parent coordinate space.
         * @param pos - The position vector.
         */
        set localPosition(pos: Vector3);
        /**
         * Retrieves the local position vector.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The local position vector.
         */
        getLocalPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local position of this element in parent coordinate space.
         * @param pos - The position vector.
         * @returns `this` instance for chaining.
         */
        setLocalPosition(pos: Vector3): this;
        /**
         * The orientation quaternion of the element in local parent space.
         * @returns The local rotation quaternion.
         */
        get localRotation(): Quaternion | undefined;
        /**
         * Sets the local rotation quaternion.
         * @param rot - The quaternion.
         */
        set localRotation(rot: Quaternion);
        /**
         * Retrieves the local rotation quaternion.
         * @param out - Optional target Quaternion to write into.
         * @returns The local rotation quaternion.
         */
        getLocalRotation(out?: Quaternion): Quaternion | undefined;
        /**
         * Sets the local rotation quaternion.
         * @param rot - The quaternion.
         * @returns `this` instance for chaining.
         */
        setLocalRotation(rot: Quaternion): this;
        /**
         * The Euler rotation angles (in radians) in local parent space.
         * @returns The Euler angles vector.
         */
        get localRotationEuler(): Vector3 | undefined;
        /**
         * Sets the local Euler rotation angles in radians.
         * @param euler - The Euler angles vector in radians.
         */
        set localRotationEuler(euler: Vector3);
        /**
         * Retrieves the local Euler rotation angles in radians.
         * @param out - Optional target Vector3 to write into.
         * @returns The Euler angles vector in radians.
         */
        getLocalRotationEuler(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local rotation using Euler angles in radians.
         * @param euler - The Euler angles vector in radians.
         * @returns `this` instance for chaining.
         */
        setLocalRotationEuler(euler: Vector3): this;
        /**
         * The scale vector of the element in local parent space.
         * @returns The scale vector.
         */
        get localScale(): Vector3 | undefined;
        /**
         * Sets the local scale (uniform or per-axis).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        set localScale(scale: Vector3 | number);
        /**
         * Retrieves the local scale vector.
         * @param out - Optional target Vector3.
         * @returns The local scale vector.
         */
        getLocalScale(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the local scale (uniform or per-axis).
         * @param scale - Uniform number or 3D Vector3 scale.
         * @returns `this` instance for chaining.
         */
        setLocalScale(scale: Vector3 | number): this;
        /**
         * The model pivot offset vector.
         * @returns The model pivot offset vector, null if unset, or undefined if deleted.
         */
        get pivotOffset(): Vector3 | null | undefined;
        /**
         * Sets the model mesh center pivot offset vector.
         * @param offset - Pivot offset vector or null/undefined to clear.
         */
        set pivotOffset(offset: Vector3 | null | undefined);
        /**
         * Retrieves the model pivot offset vector.
         * @param out - Optional target Vector3.
         * @returns The pivot offset vector, null if unset, or undefined if deleted.
         */
        getPivotOffset(out?: Vector3): Vector3 | null | undefined;
        /**
         * Sets the model mesh center pivot offset.
         * @param offset - Pivot offset vector or null/undefined to clear.
         * @returns `this` instance for chaining.
         */
        setPivotOffset(offset?: Vector3 | null): this;
        /**
         * The world position of this element in global coordinate space.
         * @returns The world position vector.
         */
        get worldPosition(): Vector3 | undefined;
        /**
         * Sets the world position, automatically computing required local coordinates under the current parent.
         * @param worldPos - Target world position.
         */
        set worldPosition(worldPos: Vector3);
        /**
         * Retrieves the evaluated world position of this element.
         * @param out - Optional target Vector3.
         * @returns The world position vector.
         */
        getWorldPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the world position, automatically computing required local coordinates under the current parent.
         * @param worldPos - Target world position.
         * @returns `this` instance for chaining.
         */
        setWorldPosition(worldPos: Vector3): this;
        /**
         * The world orientation quaternion of this element in global space.
         * @returns The world orientation quaternion.
         */
        get worldRotation(): Quaternion | undefined;
        /**
         * Sets the world rotation, automatically computing required local rotation under the current parent.
         * @param worldRot - Target world orientation quaternion.
         */
        set worldRotation(worldRot: Quaternion);
        /**
         * Retrieves the evaluated world orientation quaternion.
         * @param out - Optional target Quaternion.
         * @returns The world orientation quaternion.
         */
        getWorldRotation(out?: Quaternion): Quaternion | undefined;
        /**
         * Sets the world rotation quaternion, automatically computing required local rotation under the current parent.
         * @param worldRot - Target world orientation quaternion.
         * @returns `this` instance for chaining.
         */
        setWorldRotation(worldRot: Quaternion): this;
        /**
         * The world Euler rotation angles in radians.
         * @returns The world Euler angles vector in radians.
         */
        get worldRotationEuler(): Vector3 | undefined;
        /**
         * Sets the world rotation using Euler angles in radians.
         * @param worldEuler - Target world Euler angles vector.
         */
        set worldRotationEuler(worldEuler: Vector3);
        /**
         * Retrieves the evaluated world Euler rotation angles in radians.
         * @param out - Optional target Vector3.
         * @returns The world Euler angles vector in radians.
         */
        getWorldRotationEuler(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the world Euler rotation angles in radians.
         * @param worldEuler - Target world Euler angles vector.
         * @returns `this` instance for chaining.
         */
        setWorldRotationEuler(worldEuler: Vector3): this;
        /**
         * The evaluated compound world scale vector.
         * @returns The world scale vector.
         */
        get worldScale(): Vector3 | undefined;
        /**
         * Sets the compound world scale (uniform or per-axis).
         * @param scale - Uniform number or 3D Vector3 scale.
         */
        set worldScale(scale: Vector3 | number);
        /**
         * Retrieves the evaluated compound world scale vector.
         * @param out - Optional target Vector3.
         * @returns The world scale vector.
         */
        getWorldScale(out?: Vector3): Vector3 | undefined;
        /**
         * Sets the compound world scale (uniform or per-axis), automatically solving for required local scale under current parent.
         * @param scale - Uniform number or 3D Vector3 scale.
         * @returns `this` instance for chaining.
         */
        setWorldScale(scale: Vector3 | number): this;
        /**
         * Translates the element along its own rotated local axes.
         * @param delta - Translation delta vector.
         * @returns `this` instance for chaining.
         */
        translateLocal(delta: Vector3): this;
        /**
         * Translates the element in parent/world coordinate space.
         * @param delta - Translation delta vector.
         * @returns `this` instance for chaining.
         */
        translate(delta: Vector3): this;
        /**
         * Rotates the element locally by multiplying with a delta Quaternion.
         * @param deltaRot - Delta rotation quaternion.
         * @returns `this` instance for chaining.
         */
        rotateLocal(deltaRot: Quaternion): this;
        /**
         * Rotates the element around an arbitrary axis and optional pivot center.
         * @param axis - Unit rotation axis.
         * @param angleRad - Rotation angle in radians.
         * @param pivotCenter - Optional pivot center in parent coordinates.
         * @returns `this` instance for chaining.
         */
        rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this;
        /**
         * Rotates the element to face a target point in world coordinates.
         * @param targetWorld - Target point in world space.
         * @param upAxis - Reference up axis (default: 0, 1, 0).
         * @returns `this` instance for chaining.
         */
        lookAt(targetWorld: Vector3, upAxis?: Vector3): this;
        /**
         * Computes the visual placement position accounting for pivot offset.
         * @param out - Optional target Vector3.
         * @returns The render position vector.
         */
        computeRenderPosition(out?: Vector3): Vector3 | undefined;
        /**
         * Converts a point from local coordinates to world coordinates.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3.
         * @returns The transformed world coordinate point.
         */
        localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a point from world coordinates to local coordinates.
         * @param worldPoint - Point in world coordinate space.
         * @param out - Optional target Vector3.
         * @returns The transformed local coordinate point.
         */
        worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a direction vector from local orientation to world orientation.
         * @param localVec - Vector in local frame.
         * @param out - Optional target Vector3.
         * @returns The transformed world frame vector.
         */
        localToWorldVector(localVec: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Converts a direction vector from world orientation to local orientation.
         * @param worldVec - Vector in world frame.
         * @param out - Optional target Vector3.
         * @returns The transformed local frame vector.
         */
        worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3 | undefined;
        /**
         * Configures continuous orbital rotation motion around an axis.
         * @param options - Orbital rotation parameters, or null to clear.
         * @returns `this` instance for chaining.
         */
        setOrbit(options?: OrbitOptions | null): this;
        /**
         * Configures continuous LookAt target tracking.
         * @param options - LookAt configuration, or null to clear.
         * @returns `this` instance for chaining.
         */
        setLookAt(options?: LookAtOptions | null): this;
        /**
         * Configures continuous following behavior toward a target object or position.
         * @param options - Follow options, or null to clear.
         * @returns `this` instance for chaining.
         */
        setFollow(options?: FollowOptions | null): this;
        /**
         * Configures kinematic velocity and acceleration simulation.
         * @param options - Kinematics options, or null to clear.
         * @returns `this` instance for chaining.
         */
        setKinematics(options?: KinematicsOptions | null): this;
    }
    /**
     * An empty virtual spatial group or anchor node.
     */
    class Empty extends SpatialElement {
        constructor(params?: EmptyParams);
    }
    /**
     * A dynamically spawned runtime prefab object node.
     */
    class Runtime extends SpatialElement {
        constructor(params: RuntimeParams);
    }
    /**
     * A wrapper element for an existing native in-game transformable object.
     */
    class Existing extends SpatialElement {
        constructor(params: ExistingParams);
    }
    /**
     * Resolves or lazily instantiates the OOP facade wrapper for an active node ID.
     * @param id - The SpatialNodeID.
     * @returns The SpatialElement instance, or null if deleted or ROOT_NODE_ID.
     */
    function fromId(id: SpatialNodeID): SpatialElement | null;
    /**
     * Deletes an active node by its SpatialNode instance or raw ID.
     * @param target - The node instance or ID to delete.
     */
    function deleteNode(target: SpatialNode | SpatialNodeID): void;
    /**
     * Returns the total count of active elements in the scene graph.
     * @returns Total active nodes count.
     */
    function getActiveNodeCount(): number;
    /**
     * Advances all controllers and kinematics across the scene graph, then syncs dirty transforms to the engine.
     * @param deltaTime - Optional delta time in milliseconds.
     */
    function update(deltaTime?: number): void;
    /**
     * Evaluates dirty node hierarchies top-down and synchronizes transformed native objects via `mod.SetObjectTransform`.
     */
    function sync(): void;
    /**
     * Creates an empty virtual node returning only its primitive integer ID without allocating a class instance.
     * @param params - Optional node initialization parameters.
     * @returns The SpatialNodeID, or null if the pool is full.
     */
    function createEmptyId(params?: EmptyParams): SpatialNodeID | null;
    /**
     * Spawns a runtime prefab object node returning only its primitive integer ID without allocating a class instance.
     * @param params - Runtime prefab initialization parameters.
     * @returns The SpatialNodeID, or null if spawning failed or pool is full.
     */
    function createRuntimeId(params: RuntimeParams): SpatialNodeID | null;
    /**
     * Wraps an existing native object returning only its primitive integer ID without allocating a class instance.
     * @param params - Existing object initialization parameters.
     * @returns The SpatialNodeID, or null if the pool is full.
     */
    function createExistingId(params: ExistingParams): SpatialNodeID | null;
    /**
     * Gets the local position of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The local position vector, or undefined if deleted.
     */
    function getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the local position of a node by ID.
     * @param id - The node ID.
     * @param pos - The position vector.
     */
    function setLocalPosition(id: SpatialNodeID, pos: Vector3): void;
    /**
     * Gets the local rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Quaternion to write into.
     * @returns The local rotation quaternion, or undefined if deleted.
     */
    function getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined;
    /**
     * Sets the local rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param rot - The quaternion.
     */
    function setLocalRotation(id: SpatialNodeID, rot: Quaternion): void;
    /**
     * Gets the local Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The Euler angles vector in radians, or undefined if deleted.
     */
    function getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the local rotation of a node by ID using Euler angles in radians.
     * @param id - The node ID.
     * @param euler - The Euler angles vector in radians.
     */
    function setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void;
    /**
     * Gets the local scale vector of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The local scale vector, or undefined if deleted.
     */
    function getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the local scale (uniform or per-axis) of a node by ID.
     * @param id - The node ID.
     * @param scale - Uniform number or 3D Vector3 scale.
     */
    function setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void;
    /**
     * Gets the evaluated world position of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world position vector, or undefined if deleted.
     */
    function getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the world position of a node by ID.
     * @param id - The node ID.
     * @param worldPos - Target world position vector.
     */
    function setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void;
    /**
     * Gets the evaluated world rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Quaternion to write into.
     * @returns The world rotation quaternion, or undefined if deleted.
     */
    function getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion | undefined;
    /**
     * Sets the world rotation quaternion of a node by ID.
     * @param id - The node ID.
     * @param worldRot - Target world orientation quaternion.
     */
    function setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void;
    /**
     * Gets the evaluated world Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world Euler angles vector in radians, or undefined if deleted.
     */
    function getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the world Euler rotation angles in radians of a node by ID.
     * @param id - The node ID.
     * @param worldEuler - Target world Euler angles vector in radians.
     */
    function setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void;
    /**
     * Gets the evaluated compound world scale vector of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The world scale vector, or undefined if deleted.
     */
    function getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the compound world scale (uniform or per-axis) of a node by ID.
     * @param id - The node ID.
     * @param worldScale - Uniform number or 3D Vector3 scale.
     */
    function setWorldScale(id: SpatialNodeID, worldScale: Vector3 | number): void;
    /**
     * Gets the model pivot offset vector of a node by ID.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into.
     * @returns The model pivot offset vector, null if unset, or undefined if deleted.
     */
    function getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | null | undefined;
    /**
     * Sets the model pivot offset vector of a node by ID.
     * @param id - The node ID.
     * @param offset - Pivot offset vector or null/undefined to clear.
     */
    function setPivotOffset(id: SpatialNodeID, offset?: Vector3 | null): void;
    /**
     * Translates a node along its own rotated local axes.
     * @param id - The node ID.
     * @param delta - Translation delta vector.
     */
    function translateLocal(id: SpatialNodeID, delta: Vector3): void;
    /**
     * Translates a node in parent/world coordinate space.
     * @param id - The node ID.
     * @param delta - Translation delta vector.
     */
    function translate(id: SpatialNodeID, delta: Vector3): void;
    /**
     * Rotates a node locally by multiplying with a delta Quaternion.
     * @param id - The node ID.
     * @param deltaRot - Delta rotation quaternion.
     */
    function rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void;
    /**
     * Rotates a node around an arbitrary axis and optional pivot center.
     * @param id - The node ID.
     * @param axis - Unit rotation axis.
     * @param angleRad - Rotation angle in radians.
     * @param pivotCenter - Optional pivot center in parent coordinates.
     */
    function rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void;
    /**
     * Rotates a node to face a target point in world coordinates.
     * @param id - The node ID.
     * @param targetWorld - Target point in world space.
     * @param upAxis - Reference up axis (default: 0, 1, 0).
     */
    function lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void;
    /**
     * Sets the parent of a node by raw ID.
     * @param childId - Child node ID.
     * @param parentId - Target parent node ID.
     */
    function setParent(childId: SpatialNodeID, parentId: SpatialNodeID): void;
    /**
     * Gets the parent ID of a node by ID.
     * @param id - The node ID.
     * @returns Parent node ID, null for ROOT_NODE, or undefined if deleted.
     */
    function getParent(id: SpatialNodeID): SpatialNodeID | null | undefined;
    /**
     * Gets the number of direct children for a node by ID.
     * @param id - The node ID.
     * @returns Direct child count, or undefined if deleted.
     */
    function getChildCount(id: SpatialNodeID): number | undefined;
    /**
     * Gets an array of direct child IDs for a node by ID.
     * @param id - The node ID.
     * @returns Array of child IDs, or undefined if deleted.
     */
    function getChildren(id: SpatialNodeID): SpatialNodeID[] | undefined;
    /**
     * Gets the direct child node ID at a specific index.
     * @param id - The parent node ID.
     * @param index - Zero-based child index.
     * @returns The child node ID, null if out of bounds, or undefined if deleted.
     */
    function getChild(id: SpatialNodeID, index: number): SpatialNodeID | null | undefined;
    /**
     * Iterates over all direct child node IDs of a node without array allocation.
     * @param id - The parent node ID.
     * @param callback - Callback invoked for each child node ID.
     */
    function forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void;
    /**
     * Evaluates and updates cached world transform arrays for a node and all ancestors if dirty.
     * @param id - The node ID.
     */
    function ensureWorldTransformUpdated(id: SpatialNodeID): void;
    /**
     * Computes the visual placement position of a node accounting for pivot offset.
     * @param id - The node ID.
     * @param out - Optional target Vector3.
     * @returns The render position vector, or undefined if deleted.
     */
    function computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Converts a point from local coordinates to world coordinates for a node by ID.
     * @param id - The node ID.
     * @param localPoint - Point in local coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed world coordinate point, or undefined if deleted.
     */
    function localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3 | undefined;
    /**
     * Converts a point from world coordinates to local coordinates for a node by ID.
     * @param id - The node ID.
     * @param worldPoint - Point in world coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed local coordinate point, or undefined if deleted.
     */
    function worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3 | undefined;
    /**
     * Converts a direction vector from local orientation to world orientation for a node by ID.
     * @param id - The node ID.
     * @param localVec - Vector in local frame.
     * @param out - Optional target Vector3.
     * @returns The transformed world frame vector, or undefined if deleted.
     */
    function localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3 | undefined;
    /**
     * Converts a direction vector from world orientation to local orientation for a node by ID.
     * @param id - The node ID.
     * @param worldVec - Vector in world frame.
     * @param out - Optional target Vector3.
     * @returns The transformed local frame vector, or undefined if deleted.
     */
    function worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3 | undefined;
    /**
     * Configures continuous orbital rotation motion around an axis for a node by ID.
     * @param id - The node ID.
     * @param options - Orbital rotation parameters, or null to clear.
     */
    function setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void;
    /**
     * Configures continuous LookAt target tracking for a node by ID.
     * @param id - The node ID.
     * @param options - LookAt configuration, or null to clear.
     */
    function setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void;
    /**
     * Configures continuous following behavior toward a target object or position for a node by ID.
     * @param id - The node ID.
     * @param options - Follow options, or null to clear.
     */
    function setFollow(id: SpatialNodeID, options?: FollowOptions | null): void;
    /**
     * Configures kinematic velocity and acceleration simulation for a node by ID.
     * @param id - The node ID.
     * @param options - Kinematics options, or null to clear.
     */
    function setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void;
}
