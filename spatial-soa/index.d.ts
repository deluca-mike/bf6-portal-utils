import { Logging } from '../logging/index.ts';
import { Quaternions } from '../quaternions/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace SpatialSOA {
    /**
     * Re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include raw errors.
     * @param log - The logger function. Pass undefined to disable.
     * @param logLevel - The minimum log level to output.
     * @param includeRawError - Whether to log raw error payloads.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
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
     * Unique generation-encoded identifier for a SpatialSOA node.
     */
    type SpatialNodeID = number & {
        readonly __brand: 'SpatialNodeID';
    };
    /** Sentinel constant representing an invalid or non-existent node ID. */
    const INVALID_NODE_ID: SpatialNodeID;
    /**
     * Common initialization options for creating SpatialNodes.
     */
    interface NodeOptions {
        /** Optional parent node ID to attach this node to upon creation. If undefined, creates a root node. */
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
     * Options for continuous entity attachments.
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
        /** The target to continuously look at (world position, Player, or SpatialNodeID). */
        target?: Vector3 | mod.Player | SpatialNodeID;
        /** World up vector for camera/orientation leveling. Default: (0, 1, 0). */
        upAxis?: Vector3;
    }
    /**
     * Options for smooth follow behavior.
     */
    interface FollowOptions {
        /** The target to follow (SpatialNodeID or Player). */
        target?: SpatialNodeID | mod.Player;
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
     * Creates an empty SpatialNode (virtual parent anchor or child node).
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or INVALID_NODE_ID if parentId is invalid or pool is full.
     */
    function createEmpty(options?: NodeOptions): SpatialNodeID;
    /**
     * Spawns a runtime prefab as a new SpatialNode (root or child).
     * @param prefab - The runtime spawn prefab enum.
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or INVALID_NODE_ID if spawning failed, parentId is invalid, or pool is full.
     */
    function createRuntime(prefab: RuntimeSpawnPrefab, options?: NodeOptions): SpatialNodeID;
    /**
     * Wraps an existing in-game object as a SpatialNode (root or child).
     * @param object - The existing native transformable object.
     * @param options - Initialization options (including optional parentId).
     * @returns The created node ID, or INVALID_NODE_ID if parentId is invalid or pool is full.
     */
    function createExisting(object: TransformableObject, options?: NodeOptions): SpatialNodeID;
    /**
     * Checks whether a node ID is currently valid and active.
     * @param id - The node ID to check.
     * @returns True if valid and alive, false otherwise.
     */
    function isValid(id: SpatialNodeID): boolean;
    /**
     * Checks whether a node ID has been deleted.
     * @param id - The node ID to check.
     * @returns True if the node was created and subsequently destroyed, false otherwise.
     */
    function isDeleted(id: SpatialNodeID): boolean;
    /**
     * Recursively destroys a node and all of its descendants, unspawning native objects.
     * @param id - The node ID to destroy.
     */
    function destroy(id: SpatialNodeID): void;
    /**
     * Adds a child node under a parent node.
     * @param parentId - The parent node ID.
     * @param childId - The child node ID.
     * @returns True if added successfully, false if circular or invalid.
     */
    function addChild(parentId: SpatialNodeID, childId: SpatialNodeID): boolean;
    /**
     * Removes a child node from its parent.
     * @param parentId - The parent node ID.
     * @param childId - The child node ID.
     * @returns True if removed, false otherwise.
     */
    function removeChild(parentId: SpatialNodeID, childId: SpatialNodeID): boolean;
    /**
     * Detaches a node from its parent, making it a root node.
     * @param id - The node ID to detach.
     */
    function detachFromParent(id: SpatialNodeID): void;
    /**
     * Returns the parent node ID of a node.
     * @param id - The node ID.
     * @returns The parent node ID, or INVALID_NODE_ID if root or invalid.
     */
    function getParent(id: SpatialNodeID): SpatialNodeID;
    /**
     * Returns the total direct child count for a node.
     * @param id - The node ID.
     * @returns The number of direct children.
     */
    function getChildCount(id: SpatialNodeID): number;
    /**
     * Returns an array of direct child node IDs.
     * @param id - The node ID.
     * @returns Array of child node IDs.
     */
    function getChildren(id: SpatialNodeID): SpatialNodeID[];
    /**
     * Retrieves a child node ID at a specific zero-based index.
     * @param id - The node ID.
     * @param index - The child index.
     * @returns The child node ID, or INVALID_NODE_ID if out of bounds.
     */
    function getChild(id: SpatialNodeID, index: number): SpatialNodeID;
    /**
     * Iterates over all direct children of a node with zero allocations.
     * @param id - The node ID.
     * @param callback - Callback invoked for each child ID.
     */
    function forEachChild(id: SpatialNodeID, callback: (childId: SpatialNodeID, index: number) => void): void;
    /**
     * Gets the local position of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local position vector.
     */
    function getLocalPosition(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Sets the local position of a node.
     * @param id - The node ID.
     * @param pos - The new local position.
     */
    function setLocalPosition(id: SpatialNodeID, pos: Vector3): void;
    /**
     * Gets the local rotation Quaternion of a node.
     * @param id - The node ID.
     * @param out - Optional target Quaternion for zero allocations.
     * @returns The local rotation quaternion.
     */
    function getLocalRotation(id: SpatialNodeID, out?: Quaternion): Quaternion;
    /**
     * Sets the local rotation Quaternion of a node.
     * @param id - The node ID.
     * @param rot - The new local rotation quaternion.
     */
    function setLocalRotation(id: SpatialNodeID, rot: Quaternion): void;
    /**
     * Gets the local rotation as Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local Euler angles vector in radians.
     */
    function getLocalRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Sets the local rotation using Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param euler - The Euler angles vector in radians.
     */
    function setLocalRotationEuler(id: SpatialNodeID, euler: Vector3): void;
    /**
     * Gets the local scale of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The local scale vector.
     */
    function getLocalScale(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Sets the local scale of a node.
     * @param id - The node ID.
     * @param scale - The new uniform or per-axis scale.
     */
    function setLocalScale(id: SpatialNodeID, scale: Vector3 | number): void;
    /**
     * Gets the evaluated world position of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world position vector.
     */
    function getWorldPosition(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Sets the world position directly (calculates appropriate local coordinates).
     * @param id - The node ID.
     * @param worldPos - The desired world position.
     */
    function setWorldPosition(id: SpatialNodeID, worldPos: Vector3): void;
    /**
     * Gets the evaluated world rotation Quaternion of a node.
     * @param id - The node ID.
     * @param out - Optional target Quaternion for zero allocations.
     * @returns The world rotation quaternion.
     */
    function getWorldRotation(id: SpatialNodeID, out?: Quaternion): Quaternion;
    /**
     * Sets the world rotation directly (calculates appropriate local quaternion).
     * @param id - The node ID.
     * @param worldRot - The desired world rotation quaternion.
     */
    function setWorldRotation(id: SpatialNodeID, worldRot: Quaternion): void;
    /**
     * Gets the evaluated world rotation as Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world Euler angles vector in radians.
     */
    function getWorldRotationEuler(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Sets the world rotation directly using Euler angles in radians (ZYX order).
     * @param id - The node ID.
     * @param worldEuler - The Euler angles vector in radians.
     */
    function setWorldRotationEuler(id: SpatialNodeID, worldEuler: Vector3): void;
    /**
     * Gets the evaluated world scale of a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3 for zero allocations.
     * @returns The world scale vector.
     */
    function getWorldScale(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Gets the model pivot offset for a node.
     * @param id - The node ID.
     * @param out - Optional target Vector3.
     * @returns The pivot offset vector or undefined if none.
     */
    function getPivotOffset(id: SpatialNodeID, out?: Vector3): Vector3 | undefined;
    /**
     * Sets the in-game model pivot offset correction on a node.
     * @param id - The node ID.
     * @param offset - The pivot offset vector or undefined to clear.
     */
    function setPivotOffset(id: SpatialNodeID, offset?: Vector3): void;
    /**
     * Ensures that the world transform at `id` and its ancestors are up to date.
     * @param id - The node ID.
     */
    function ensureWorldTransformUpdated(id: SpatialNodeID): void;
    /**
     * Computes the visual placement position of the native model accounting for pivot offset.
     * @param id - The node ID.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The render position vector, or zero vector if invalid node ID.
     */
    function computeRenderPosition(id: SpatialNodeID, out?: Vector3): Vector3;
    /**
     * Translates a node in local coordinate space.
     * @param id - The node ID.
     * @param delta - The local delta vector.
     */
    function translateLocal(id: SpatialNodeID, delta: Vector3): void;
    /**
     * Translates a node in parent/world coordinate space.
     * @param id - The node ID.
     * @param delta - The delta vector.
     */
    function translate(id: SpatialNodeID, delta: Vector3): void;
    /**
     * Rotates a node locally by multiplying with a delta Quaternion.
     * @param id - The node ID.
     * @param deltaRot - The delta quaternion.
     */
    function rotateLocal(id: SpatialNodeID, deltaRot: Quaternion): void;
    /**
     * Rotates a node around an arbitrary axis and optional pivot center.
     * @param id - The node ID.
     * @param axis - The unit rotation axis.
     * @param angleRad - The angle in radians.
     * @param pivotCenter - Optional center point in parent space.
     */
    function rotateAroundAxis(id: SpatialNodeID, axis: Vector3, angleRad: number, pivotCenter?: Vector3): void;
    /**
     * Rotates a node to face a target point in world coordinates.
     * @param id - The node ID.
     * @param targetWorld - The world coordinate to face.
     * @param upAxis - The world up reference vector (default: 0, 1, 0).
     */
    function lookAt(id: SpatialNodeID, targetWorld: Vector3, upAxis?: Vector3): void;
    /**
     * Converts a local point to world coordinate space.
     * @param id - The node ID.
     * @param localPoint - Point in local coordinate space.
     * @param out - Optional target Vector3.
     * @returns The transformed world space point.
     */
    function localToWorldPoint(id: SpatialNodeID, localPoint: Vector3, out?: Vector3): Vector3;
    /**
     * Converts a world space point to local coordinate space.
     * @param id - The node ID.
     * @param worldPoint - Point in world coordinates.
     * @param out - Optional target Vector3.
     * @returns The transformed local space point.
     */
    function worldToLocalPoint(id: SpatialNodeID, worldPoint: Vector3, out?: Vector3): Vector3;
    /**
     * Converts a local direction vector to world space (ignores translation).
     * @param id - The node ID.
     * @param localVec - Local direction vector.
     * @param out - Optional target Vector3.
     * @returns The transformed world direction vector.
     */
    function localToWorldVector(id: SpatialNodeID, localVec: Vector3, out?: Vector3): Vector3;
    /**
     * Converts a world direction vector to local space (ignores translation).
     * @param id - The node ID.
     * @param worldVec - World direction vector.
     * @param out - Optional target Vector3.
     * @returns The transformed local direction vector.
     */
    function worldToLocalVector(id: SpatialNodeID, worldVec: Vector3, out?: Vector3): Vector3;
    /**
     * Attaches a node to follow a player's real-time position/orientation in world space.
     * If the node has a parent, it is automatically detached and promoted to a root node.
     * Clears any active follow, orbit, or linear kinematics.
     * @param id - The node ID.
     * @param player - The target player.
     * @param options - Attachment options.
     */
    function attachToPlayer(id: SpatialNodeID, player: mod.Player, options?: AttachOptions): void;
    /**
     * Attaches a node to follow a vehicle's real-time position/orientation in world space.
     * If the node has a parent, it is automatically detached and promoted to a root node.
     * Clears any active follow, orbit, or linear kinematics.
     * @param id - The node ID.
     * @param vehicle - The target vehicle.
     * @param options - Attachment options.
     */
    function attachToVehicle(id: SpatialNodeID, vehicle: mod.Vehicle, options?: AttachOptions): void;
    /**
     * Attaches a node to follow an in-game object (props, spawners, etc.) in real time in world space.
     * If the node has a parent, it is automatically detached and promoted to a root node.
     * Clears any active follow, orbit, or linear kinematics.
     * @param id - The node ID.
     * @param object - The native in-game object to track (excluding Player and Vehicle).
     * @param options - Attachment options.
     */
    function attachToObject(
        id: SpatialNodeID,
        object: Exclude<mod.Object, mod.Player | mod.Vehicle>,
        options?: AttachOptions
    ): void;
    /**
     * Attaches a custom dynamic tracker callback in world space.
     * If the node has a parent, it is automatically detached and promoted to a root node.
     * Clears any active follow, orbit, or linear kinematics.
     * @param id - The node ID.
     * @param tracker - Tracker callback function.
     */
    function attachToTracker(
        id: SpatialNodeID,
        tracker: () =>
            | {
                  position: Vector3;
                  rotation?: Quaternion | Vector3;
              }
            | undefined
    ): void;
    /**
     * Clears any active attachment tracker on a node.
     * @param id - The node ID.
     */
    function detachTracker(id: SpatialNodeID): void;
    /**
     * Configures orbital rotation motion on a node.
     * Clears any active attachment tracker, follow controller, or linear kinematics.
     * @param id - The node ID.
     * @param options - Orbit configuration or null to disable.
     */
    function setOrbit(id: SpatialNodeID, options?: OrbitOptions | null): void;
    /**
     * Configures LookAt target tracking on a node.
     * Clears any active angular kinematics or orbit faceTangent/spin conflicting with look-at.
     * @param id - The node ID.
     * @param options - LookAt configuration or null to disable.
     */
    function setLookAt(id: SpatialNodeID, options?: LookAtOptions | null): void;
    /**
     * Configures continuous smooth follow behavior on a node in world space.
     * If configuring follow on a child node, it is automatically detached and promoted to a root node.
     * Clears any active attachment tracker, orbit controller, or linear kinematics.
     * @param id - The node ID.
     * @param options - Follow configuration or null to disable.
     */
    function setFollow(id: SpatialNodeID, options?: FollowOptions | null): void;
    /**
     * Configures kinematic velocity and acceleration integration on a node.
     * Linear kinematics clear conflicting positional controllers (orbit, follow, tracker).
     * Angular kinematics clear conflicting rotational controllers (lookAt, orbit spin).
     * @param id - The node ID.
     * @param options - Kinematics configuration or null to disable.
     */
    function setKinematics(id: SpatialNodeID, options?: KinematicsOptions | null): void;
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
     * Returns the total count of active root nodes.
     * @returns The number of root nodes.
     */
    function getRootCount(): number;
    /**
     * Returns the total count of active nodes in the scene graph (roots + children).
     * @returns The number of active nodes.
     */
    function getActiveNodeCount(): number;
    /**
     * Returns an array of active root node IDs.
     * @returns Array of root node IDs.
     */
    function getRootNodes(): SpatialNodeID[];
    /**
     * Recursively destroys all managed nodes in the scene graph and unspawns runtime entities.
     */
    function destroyAll(): void;
}
