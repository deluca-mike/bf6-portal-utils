import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace SpatialOC {
    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel: typeof Logging.LogLevel;
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
    ): void;
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
     * A transparent 3D vector representing a point, direction, scale, or euler rotation in 3D space.
     */
    export type Vector3 = Vectors.Vector3;
    /**
     * A transparent 4D Quaternion representing 3D spatial rotation.
     */
    export type Quaternion = Quaternions.Quaternion;
    const _UPDATE_INTERNAL: unique symbol;
    const _SYNC_INTERNAL: unique symbol;
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
    /**
     * Represents a 3D spatial node within the virtual hierarchy.
     * Manages canonical local transforms, cached world matrices, model offsets, and engine synchronization.
     */
    export class SpatialNode {
        private _object?;
        private _parent?;
        private _children;
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
         * Internal constructor for SpatialNode. Use `SpatialOC.createEmpty`, `createRuntime`, or `createExisting`.
         * @param options - Initialization options.
         * @param isRuntimeSpawned - Whether the native object was spawned dynamically at runtime.
         * @param nativeObject - The native engine object handle.
         */
        constructor(options?: NodeOptions, isRuntimeSpawned?: boolean, nativeObject?: TransformableObject);
        /**
         * Checks whether this node and its native object (if any) are valid and alive.
         * @returns True if valid and alive, false otherwise.
         */
        get isValid(): boolean;
        /**
         * Whether this node has been deleted/destroyed.
         * @returns True if deleted/destroyed, false otherwise.
         */
        get isDeleted(): boolean;
        /**
         * The parent node in the hierarchy, or undefined if this is a root node.
         * @returns The parent node, or undefined.
         */
        get parent(): SpatialNode | undefined;
        /**
         * The total number of direct child nodes.
         * @returns The child count.
         */
        get childCount(): number;
        /**
         * Returns a shallow copy of the list of direct child nodes.
         * @returns Array of direct children.
         */
        get children(): readonly SpatialNode[];
        /**
         * Retrieves a child node at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child node, or undefined if out of bounds.
         */
        getChild(index: number): SpatialNode | undefined;
        /**
         * Iterates over all direct child nodes without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        forEachChild(callback: (child: SpatialNode, index: number) => void): void;
        /**
         * Gets the in-game model offset correction, or undefined if zero.
         * @returns The pivot offset vector, or undefined.
         */
        get pivotOffset(): Vector3 | undefined;
        /**
         * Sets the in-game model offset correction for prefab centering.
         */
        set pivotOffset(offset: Vector3 | undefined);
        /**
         * Gets the local position relative to parent.
         * @returns The local position vector.
         */
        get localPosition(): Vector3;
        /**
         * Sets the local position relative to parent.
         */
        set localPosition(pos: Vector3);
        /**
         * Gets the local rotation Quaternion relative to parent.
         * @returns The local rotation quaternion.
         */
        get localRotation(): Quaternion;
        /**
         * Sets the local rotation Quaternion relative to parent.
         */
        set localRotation(rot: Quaternion);
        /**
         * Gets the local rotation as Euler angles in radians (ZYX order).
         * @returns The local Euler angles vector in radians.
         */
        get localRotationEuler(): Vector3;
        /**
         * Sets the local rotation using Euler angles in radians (ZYX order).
         */
        set localRotationEuler(euler: Vector3);
        /**
         * Gets the local scale relative to parent.
         * @returns The local scale vector.
         */
        get localScale(): Vector3;
        /**
         * Sets the local scale relative to parent.
         */
        set localScale(scale: Vector3 | number);
        /**
         * Gets the evaluated world position.
         * @returns The evaluated world position vector.
         */
        get worldPosition(): Vector3;
        /**
         * Sets the world position directly (computes appropriate local coordinates so world position matches).
         */
        set worldPosition(worldPos: Vector3);
        /**
         * Gets the evaluated world rotation Quaternion.
         * @returns The evaluated world rotation quaternion.
         */
        get worldRotation(): Quaternion;
        /**
         * Sets the world rotation directly (computes appropriate local quaternion so world rotation matches).
         */
        set worldRotation(worldRot: Quaternion);
        /**
         * Gets the evaluated world rotation as Euler angles in radians (ZYX order).
         * @returns The evaluated world Euler angles vector in radians.
         */
        get worldRotationEuler(): Vector3;
        /**
         * Sets the world rotation directly using Euler angles in radians (ZYX order).
         */
        set worldRotationEuler(worldEuler: Vector3);
        /**
         * Gets the evaluated world scale.
         * @returns The evaluated world scale vector.
         */
        get worldScale(): Vector3;
        /**
         * Translates the node in local coordinates.
         * @param delta - Vector delta in local space.
         * @returns This node for chaining.
         */
        translateLocal(delta: Vector3): this;
        /**
         * Translates the node in parent / world coordinates.
         * @param delta - Vector delta in parent coordinate space.
         * @returns This node for chaining.
         */
        translate(delta: Vector3): this;
        /**
         * Rotates the node locally by multiplying with a delta Quaternion.
         * @param deltaRot - Quaternion delta to multiply.
         * @returns This node for chaining.
         */
        rotateLocal(deltaRot: Quaternion): this;
        /**
         * Rotates the node around an arbitrary axis and optional pivot center in parent/world space.
         * @param axis - The unit axis to rotate around.
         * @param angleRad - The angle in radians.
         * @param pivotCenter - Optional center point in parent space (default: node's local position).
         * @returns This node for chaining.
         */
        rotateAroundAxis(axis: Vector3, angleRad: number, pivotCenter?: Vector3): this;
        /**
         * Rotates this node to face a target point in world coordinates.
         * @param targetWorld - The world coordinate to face.
         * @param upAxis - The world up reference axis (default: 0, 1, 0).
         * @returns This node for chaining.
         */
        lookAt(targetWorld: Vector3, upAxis?: Vector3): this;
        /**
         * Converts a local point to world space.
         * @param localPoint - Point in local coordinate space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world space point.
         */
        localToWorldPoint(localPoint: Vector3, out?: Vector3): Vector3;
        /**
         * Converts a world space point to local coordinate space.
         * @param worldPoint - Point in world coordinates.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local space point.
         */
        worldToLocalPoint(worldPoint: Vector3, out?: Vector3): Vector3;
        /**
         * Converts a local direction vector to world space (ignores translation).
         * @param localVec - Direction vector in local space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed world direction vector.
         */
        localToWorldVector(localVec: Vector3, out?: Vector3): Vector3;
        /**
         * Converts a world direction vector to local space (ignores translation).
         * @param worldVec - Direction vector in world space.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The transformed local direction vector.
         */
        worldToLocalVector(worldVec: Vector3, out?: Vector3): Vector3;
        /**
         * Adds an existing SpatialNode as a child of this node.
         * @param child - The node to add as child.
         * @returns True if added successfully, false if rejected (e.g. circular hierarchy or deleted).
         */
        addChild(child: SpatialNode): boolean;
        /**
         * Removes a child from this node.
         * @param child - The child node to remove.
         * @returns True if removed, false otherwise.
         */
        removeChild(child: SpatialNode): boolean;
        /**
         * Detaches this node from its parent, making it a root node.
         * @returns This node for chaining.
         */
        detachFromParent(): this;
        /**
         * Recursively destroys this node and all of its descendants, unspawning native objects.
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
         * Applies computed attachment transform and offset to this node.
         * @param pos - Evaluated position vector.
         * @param rot - Evaluated rotation quaternion (if trackRotation is true).
         * @param offset - Optional relative offset vector.
         * @param trackRotation - Whether rotation tracking is active.
         */
        private _applyAttachmentTransform;
        /**
         * Attaches this node to follow a player's real-time position/orientation in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param player - The player to track.
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        attachToPlayer(player: mod.Player, options?: AttachOptions): this;
        /**
         * Attaches this node to follow a vehicle's real-time position/orientation in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param vehicle - The vehicle to track.
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        attachToVehicle(vehicle: mod.Vehicle, options?: AttachOptions): this;
        /**
         * Attaches this node to follow an in-game object (props, spawners, etc.) in real time in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param object - The native in-game object to track (excluding Player and Vehicle).
         * @param options - Attachment options.
         * @returns This node for chaining.
         */
        attachToObject(object: Exclude<mod.Object, mod.Player | mod.Vehicle>, options?: AttachOptions): this;
        /**
         * Attaches a custom dynamic tracker callback in world space.
         * If this node has a parent, it is automatically detached and promoted to a root node.
         * Clears any active follow, orbit, or linear kinematics.
         * @param tracker - Custom tracking function.
         * @returns This node for chaining.
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
         * Clears any active attachment tracker on this node.
         * @returns This node for chaining.
         */
        detachTracker(): this;
        /**
         * Configures orbital motion on this node around its parent or a specified center point.
         * Clears any active attachment tracker, follow controller, or linear kinematics.
         * @param options - Orbit configuration options, or null to disable orbit.
         * @returns This node for chaining.
         */
        setOrbit(options?: OrbitOptions | null): this;
        /**
         * Configures continuous look-at behavior on this node.
         * Clears any active angular kinematics or orbit faceTangent/spin conflicting with look-at.
         * @param options - LookAt configuration options, or null to disable.
         * @returns This node for chaining.
         */
        setLookAt(options?: LookAtOptions | null): this;
        /**
         * Configures continuous smooth follow behavior on this node in world space.
         * If configuring follow on a child node, it is automatically detached and promoted to a root node.
         * Clears any active attachment tracker, orbit controller, or linear kinematics.
         * @param options - Follow configuration options, or null to disable.
         * @returns This node for chaining.
         */
        setFollow(options?: FollowOptions | null): this;
        /**
         * Configures kinematic velocity and acceleration integration on this node.
         * Linear kinematics clear conflicting positional controllers (orbit, follow, tracker).
         * Angular kinematics clear conflicting rotational controllers (lookAt, orbit spin).
         * @param options - Kinematics options, or null to disable.
         * @returns This node for chaining.
         */
        setKinematics(options?: KinematicsOptions | null): this;
        /**
         * Marks this node and all descendants as dirty.
         */
        private _markDirty;
        /**
         * Ensures that the world transform of this node (and its ancestors) is fresh and up to date.
         */
        ensureWorldTransformUpdated(): void;
        /**
         * Computes the visual placement position of the native model accounting for pivot offset.
         * @param out - Optional target Vector3 to write into for zero-allocation reuse.
         * @returns The render position.
         */
        computeRenderPosition(out?: Vector3): Vector3;
        /**
         * Steps kinematic linear and angular velocities and accelerations.
         * @param dt - Delta time in seconds.
         */
        private _stepKinematics;
        /**
         * Steps orbital kinematics around parent or center point.
         * @param dt - Delta time in seconds.
         */
        private _stepOrbit;
        /**
         * Steps continuous LookAt targeting.
         */
        private _stepLookAt;
        /**
         * Steps continuous smooth follow behavior.
         * @param dt - Delta time in seconds.
         */
        private _stepFollow;
        /**
         * Internal method to step active controllers, velocities, and trackers.
         * @param dt - Delta time in seconds.
         * @internal
         */
        [_UPDATE_INTERNAL](dt: number): void;
        /**
         * Internal method to synchronize dirty transforms to native engine objects.
         * @internal
         */
        [_SYNC_INTERNAL](): void;
    }
    /**
     * Creates an empty SpatialNode (virtual root anchor or child node).
     * @param options - Initialization options (including optional parent).
     * @returns The created node.
     */
    export function createEmpty(options?: NodeOptions): SpatialNode;
    /**
     * Spawns a runtime prefab as a new SpatialNode (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parent).
     * @returns The created node, or undefined if spawning failed or parent is deleted.
     */
    export function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNode | undefined;
    /**
     * Wraps an existing in-game object as a SpatialNode (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parent).
     * @returns The created node, or undefined if parent is deleted.
     */
    export function createExisting(object: TransformableObject, options?: NodeOptions): SpatialNode | undefined;
    /**
     * Updates all active controllers, kinematics, and external trackers across the scene graph,
     * then synchronizes dirty transforms to the game engine.
     * If `deltaTimeSeconds` is omitted, delta time is automatically computed based on server uptime,
     * throttled to a minimum interval of 0.01s (10ms) and clamped to a maximum of 0.1s.
     * @param deltaTimeSeconds - Optional elapsed delta time in seconds.
     */
    export function update(deltaTimeSeconds?: number): void;
    /**
     * Evaluates dirty node hierarchies top-down and applies transformed positions and rotations
     * to all modified native objects via `mod.SetObjectTransform`.
     */
    export function sync(): void;
    /**
     * Returns the total count of active root nodes.
     * @returns The number of root nodes.
     */
    export function getRootCount(): number;
    /**
     * Returns the total count of active nodes in the scene graph (roots + children).
     * @returns The number of active nodes.
     */
    export function getActiveNodeCount(): number;
    /**
     * Recursively destroys all managed nodes in the scene graph and unspawns runtime entities.
     */
    export function destroyAll(): void;
    export {};
}
