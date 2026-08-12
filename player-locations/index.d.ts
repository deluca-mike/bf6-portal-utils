import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace PlayerLocations {
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
     * Explicitly initializes the PlayerLocations spatial tracking engine.
     *
     * Synchronizes currently connected players via `mod.AllPlayers()` and subscribes to
     * `Events.OngoingGlobal`, `Events.OnPlayerJoinGame`, and `Events.OnPlayerLeaveGame`.
     * Safe to call multiple times (idempotent).
     *
     * It is strongly recommended to call this inside `Events.OnGameModeStarted.subscribe(...)`
     * (or after initial match setup) to avoid running per-tick spatial tracking during initial server
     * world loading and entity spawning.
     */
    function initialize(): void;
    /**
     * Checks whether the PlayerLocations spatial tracking engine has been initialized.
     * @returns True if initialize() has already been called, false otherwise.
     */
    function isInitialized(): boolean;
    /** Callback invoked when a player enters or exits a spatial zone or crosses a boundary. */
    type PlayerZoneCallback = (player: mod.Player, playerId: number) => Promise<void> | void;
    /** Callback invoked when the identity of an extremum player changes. */
    type PlayerExtremaCallback = (
        newPlayer: mod.Player | undefined,
        prevPlayer: mod.Player | undefined,
        newPlayerId: number | undefined,
        prevPlayerId: number | undefined
    ) => Promise<void> | void;
    /** Handle returned by sphere zone subscriptions to allow updating parameters or unsubscribing. */
    interface SphereHandle {
        /** Cancels the subscription and removes the zone listener. Safe to call multiple times. */
        unsubscribe(): void;
        /**
         * Updates the center coordinates and optionally radius of the sphere on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param x - New center X coordinate in world meters.
         * @param y - New center Y coordinate in world meters.
         * @param z - New center Z coordinate in world meters.
         * @param radiusMeters - Optional new radius in meters.
         */
        update(x: number, y: number, z: number, radiusMeters?: number): void;
    }
    /** Handle returned by cylinder zone subscriptions to allow updating parameters or unsubscribing. */
    interface CylinderHandle {
        /** Cancels the subscription and removes the zone listener. Safe to call multiple times. */
        unsubscribe(): void;
        /**
         * Updates the cylinder center coordinates, radius, and elevation bounds on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param centerX - New center X coordinate in world meters.
         * @param centerZ - New center Z coordinate in world meters.
         * @param radiusMeters - Optional new radius in meters.
         * @param minY - Optional new minimum Y elevation in meters (default: -Infinity).
         * @param maxY - Optional new maximum Y elevation in meters (default: Infinity).
         */
        update(centerX: number, centerZ: number, radiusMeters?: number, minY?: number, maxY?: number): void;
    }
    /** Handle returned by AABB bounding box subscriptions to allow updating parameters or unsubscribing. */
    interface AABBHandle {
        /** Cancels the subscription and removes the zone listener. Safe to call multiple times. */
        unsubscribe(): void;
        /**
         * Updates the bounding box coordinate limits on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param minX - New minimum X coordinate in world meters.
         * @param minY - New minimum Y coordinate in world meters.
         * @param minZ - New minimum Z coordinate in world meters.
         * @param maxX - New maximum X coordinate in world meters.
         * @param maxY - New maximum Y coordinate in world meters.
         * @param maxZ - New maximum Z coordinate in world meters.
         */
        update(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void;
    }
    /** 2D Vertex representing a point on the XZ ground plane for polygonal prism volumes. */
    type PrismVertex = {
        x: number;
        z: number;
    };
    /** Handle returned by polygonal prism subscriptions to allow updating parameters or unsubscribing. */
    interface PrismHandle {
        /** Cancels the subscription and removes the zone listener. Safe to call multiple times. */
        unsubscribe(): void;
        /**
         * Updates the polygon vertices and elevation bounds on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param vertices - New polygon vertices on the XZ ground plane.
         * @param minY - Optional new minimum Y elevation in meters (default: -Infinity).
         * @param maxY - Optional new maximum Y elevation in meters (default: Infinity).
         */
        update(vertices: PrismVertex[], minY?: number, maxY?: number): void;
    }
    /** Handle returned by directional plane/boundary subscriptions to allow updating parameters or unsubscribing. */
    interface PlaneHandle {
        /** Cancels the subscription and removes the boundary listener. Safe to call multiple times. */
        unsubscribe(): void;
        /**
         * Updates the boundary coordinate threshold on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param threshold - New coordinate threshold in world meters.
         */
        update(threshold: number): void;
    }
    /** Handle returned by global extrema subscriptions (highest/lowest) to allow unsubscribing. */
    interface ExtremaHandle {
        /** Cancels the subscription and removes the extremum listener. Safe to call multiple times. */
        unsubscribe(): void;
    }
    /** Handle returned by target point extrema subscriptions (closest/farthest) to allow updating target point or unsubscribing. */
    interface TargetExtremaHandle extends ExtremaHandle {
        /**
         * Updates the target reference point coordinates on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param x - New target X coordinate in world meters.
         * @param y - New target Y coordinate in world meters.
         * @param z - New target Z coordinate in world meters.
         */
        update(x: number, y: number, z: number): void;
    }
    /** Maximum supported player slots in Battlefield 6 Portal (0-99). */
    const MAX_PLAYERS = 100;
    /** Maximum supported vertices per polygonal prism (32 vertices). */
    const MAX_PRISM_VERTICES = 32;
    /**
     * Gets world coordinates in meters for an active player.
     * Pass an `out` vector for zero-allocation reuse.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param out - Optional target Vector3 to write coordinates into.
     * @returns The Vector3 position in meters, null if the player is connected but unspawned/inactive, or undefined if not connected.
     */
    function getPosition(player: number | mod.Player, out?: Vectors.Vector3): Vectors.Vector3 | null | undefined;
    /**
     * Checks if a player slot is currently connected to the server.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns True if the player is connected, false otherwise.
     */
    function isPlayerConnected(player: number | mod.Player): boolean;
    /**
     * Checks if a player is active (connected, spawned, and tracked with a valid 3D position).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns True if active/spawned, false if connected but inactive, or undefined if the player is not connected.
     */
    function isPlayerActive(player: number | mod.Player): boolean | undefined;
    /**
     * Returns the total count of currently connected players.
     * @returns The number of connected players.
     */
    function getConnectedPlayerCount(): number;
    /**
     * Returns the total count of currently active (spawned) players.
     * @returns The number of active players.
     */
    function getActivePlayerCount(): number;
    /**
     * Retrieves the cached engine `mod.Player` object for a given player ID or object.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns The engine mod.Player object, or undefined if the player is not connected or invalid.
     */
    function getPlayer(player: number | mod.Player): mod.Player | undefined;
    /**
     * Resolves the integer slot ID (0-99) for a given player ID or engine mod.Player object.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns The integer player slot ID (0-99), or undefined if the player is not connected or invalid.
     */
    function getPlayerId(player: number | mod.Player): number | undefined;
    /**
     * Zero-GC batch utility to map an array of player IDs to their corresponding cached `mod.Player` objects.
     * Populates and returns the provided `playersOut` array.
     * Non-connected or invalid player IDs are set to `undefined`.
     * @param ids - Array of player IDs to convert.
     * @param playersOut - Optional target array to write mod.Player objects into.
     * @returns The players array.
     */
    function toPlayers(
        ids: (number | undefined)[],
        playersOut?: (mod.Player | undefined)[]
    ): (mod.Player | undefined)[];
    /**
     * Zero-GC batch utility to resolve an array of engine `mod.Player` objects to their integer slot IDs.
     * Populates and returns the provided `idsOut` array.
     * Non-connected or invalid players are set to `undefined`.
     * @param players - Array of mod.Player objects to convert.
     * @param idsOut - Optional target array to write player IDs into.
     * @returns The ids array.
     */
    function toPlayerIds(players: (mod.Player | undefined)[], idsOut?: (number | undefined)[]): (number | undefined)[];
    /**
     * Finds all currently connected players.
     * If no buffers are provided, simply returns the connected player count with zero memory writes.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write connected player IDs into.
     * @param playersOut - Optional target array to write connected mod.Player objects into.
     * @returns The total number of connected players found.
     */
    function findConnectedPlayers(
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all currently active (spawned) players with valid 3D coordinates.
     * If no buffers are provided, simply returns the active player count with zero memory writes.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found.
     */
    function findActivePlayers(
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Returns the squared 3D Euclidean distance in meters squared (m^2) between two active players.
     * Avoids square root overhead.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The squared distance in meters squared, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    function getDistanceSq(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined;
    /**
     * Returns the 3D Euclidean distance in meters between two active players.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The distance in meters, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    function getDistance(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined;
    /**
     * Returns the squared 2D horizontal distance in meters squared (m^2) on the XZ plane between two active players.
     * Avoids square root overhead and ignores vertical elevation differences.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The horizontal squared distance in meters squared, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    function getDistanceSqXZ(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined;
    /**
     * Returns the 2D horizontal distance in meters on the XZ plane between two active players.
     * Ignores vertical elevation differences.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The horizontal distance in meters, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    function getDistanceXZ(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined;
    /**
     * Fast 3D Volumetric Sphere Query using 3D Linked Voxel Grid.
     * Executes in O(cells) with ZERO Garbage Collection pressure.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param radiusMeters - Search sphere radius in meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found within the sphere.
     */
    function findPlayersInSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players outside a 3D sphere.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - Center X coordinate in world meters.
     * @param y - Center Y coordinate in world meters.
     * @param z - Center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found strictly outside the sphere.
     */
    function findPlayersOutsideSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Fast 2.5D Volumetric Cylinder Query (horizontal radius on XZ plane with vertical Y bounds).
     * Uses sweep-and-prune axis selection for high performance.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder horizontal radius in meters.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found within the cylinder.
     */
    function findPlayersInCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players outside a 2.5D vertical cylinder.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder horizontal radius in meters.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found strictly outside the cylinder.
     */
    function findPlayersOutsideCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Fast 3D AABB Box Query using 3-Axis Sweep-and-Prune.
     * Evaluates binary search ranges across all 3 axes and iterates along the axis with the fewest candidate elements.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found within the bounding box.
     */
    function findPlayersInAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players outside a 3D Axis-Aligned Bounding Box (AABB).
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found strictly outside the bounding box.
     */
    function findPlayersOutsideAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Fast 2.5D Polygonal Prism Query (extruded polygon on XZ plane with vertical Y bounds).
     * Uses 3-axis sweep-and-prune AABB filtering and ray-casting.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players within the prism volume, or undefined if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function findPlayersInPrism(
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number | undefined;
    /**
     * Finds all active players outside a 2.5D polygonal prism.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players strictly outside the prism volume, or undefined if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function findPlayersOutsidePrism(
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number | undefined;
    /**
     * Finds all active players located at or above a given Y elevation (altitude).
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param y - The elevation threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players at or above the elevation.
     */
    function findPlayersAbove(
        y: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players located at or below a given Y elevation (altitude).
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param y - The elevation threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players at or below the elevation.
     */
    function findPlayersBelow(
        y: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players located east of (positive X) a given X coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - The X coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players east of the coordinate.
     */
    function findPlayersEastOf(
        x: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players located west of (negative X) a given X coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - The X coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players west of the coordinate.
     */
    function findPlayersWestOf(
        x: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players located north of (negative Z) a given Z coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param z - The Z coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players north of the coordinate.
     */
    function findPlayersNorthOf(
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds all active players located south of (positive Z) a given Z coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param z - The Z coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players south of the coordinate.
     */
    function findPlayersSouthOf(
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds the single closest active player to a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the closest player, or undefined if no active player satisfies the condition.
     */
    function getClosestPlayerId(
        x: number,
        y: number,
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean
    ): number | undefined;
    /**
     * Finds the single farthest active player from a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the farthest player, or undefined if no active player satisfies the condition.
     */
    function getFarthestPlayerId(
        x: number,
        y: number,
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean
    ): number | undefined;
    /**
     * Finds the 'k' closest active players to a target 3D point, sorted closest-first.
     * Executes in O(N log k) time using a bounded Max-Heap with ZERO Garbage Collection pressure.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param k - Number of nearest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    function findKClosestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds the 'k' farthest active players from a target 3D point, sorted farthest-first.
     * Executes in O(N log k) time using a bounded Min-Heap with ZERO Garbage Collection pressure.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param k - Number of farthest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    function findKFarthestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Gets the highest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the highest active player, or undefined if no active player satisfies the condition.
     */
    function getHighestPlayerId(filterFn?: (player: mod.Player, id: number) => boolean): number | undefined;
    /**
     * Gets the lowest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the lowest active player, or undefined if no active player satisfies the condition.
     */
    function getLowestPlayerId(filterFn?: (player: mod.Player, id: number) => boolean): number | undefined;
    /**
     * Finds the 'k' highest altitude active players, sorted from highest to lowest.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param k - Number of highest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    function findKHighestPlayers(
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Finds the 'k' lowest altitude active players, sorted from lowest to highest.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param k - Number of lowest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    function findKLowestPlayers(
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number;
    /**
     * Fast 2.5D Cylinder / Capture Zone test for a player (horizontal radius on XZ plane with vertical Y bounds).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder radius in meters.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and inside, false if active and outside or inactive, or undefined if not connected.
     */
    function isPlayerInCylinder(
        player: number | mod.Player,
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies strictly outside a 2.5D vertical cylinder.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder radius in meters.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and outside, false if active and inside or inactive, or undefined if not connected.
     */
    function isPlayerOutsideCylinder(
        player: number | mod.Player,
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies within a 3D sphere.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Sphere center X coordinate in world meters.
     * @param centerY - Sphere center Y coordinate in world meters.
     * @param centerZ - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @returns True if active and inside, false if active and outside or inactive, or undefined if not connected.
     */
    function isPlayerInSphere(
        player: number | mod.Player,
        centerX: number,
        centerY: number,
        centerZ: number,
        radiusMeters: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies strictly outside a 3D sphere.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Sphere center X coordinate in world meters.
     * @param centerY - Sphere center Y coordinate in world meters.
     * @param centerZ - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @returns True if active and outside, false if active and inside or inactive, or undefined if not connected.
     */
    function isPlayerOutsideSphere(
        player: number | mod.Player,
        centerX: number,
        centerY: number,
        centerZ: number,
        radiusMeters: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies within a 3D Axis-Aligned Bounding Box (AABB).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @returns True if active and inside, false if active and outside or inactive, or undefined if not connected.
     */
    function isPlayerInAABB(
        player: number | mod.Player,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies strictly outside a 3D Axis-Aligned Bounding Box (AABB).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @returns True if active and outside, false if active and inside or inactive, or undefined if not connected.
     */
    function isPlayerOutsideAABB(
        player: number | mod.Player,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number
    ): boolean | undefined;
    /**
     * Checks if an active player lies within a 2.5D polygonal prism (extruded polygon on XZ plane with vertical Y bounds).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and inside, false if active and outside or inactive, undefined if not connected, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function isPlayerInPrism(
        player: number | mod.Player,
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number
    ): boolean | undefined | null;
    /**
     * Checks if an active player lies strictly outside a 2.5D polygonal prism.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and outside, false if active and inside or inactive, undefined if not connected, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function isPlayerOutsidePrism(
        player: number | mod.Player,
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number
    ): boolean | undefined | null;
    /**
     * Subscribes to events when any player enters or exits a 3D sphere.
     * At least one callback (onEnter or onExit) must be provided.
     * @param x - Sphere center X coordinate in world meters.
     * @param y - Sphere center Y coordinate in world meters.
     * @param z - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param onEnter - Callback invoked when a player enters the sphere.
     * @param onExit - Optional callback invoked when a player exits the sphere.
     * @returns A {@link SphereHandle} to update parameters or unsubscribe.
     */
    function onSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        onEnter: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): SphereHandle;
    /**
     * Subscribes to events when any player exits a 3D sphere.
     * @param x - Sphere center X coordinate in world meters.
     * @param y - Sphere center Y coordinate in world meters.
     * @param z - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param onEnter - Explicitly undefined to indicate no enter callback.
     * @param onExit - Callback invoked when a player exits the sphere.
     * @returns A {@link SphereHandle} to update parameters or unsubscribe.
     */
    function onSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): SphereHandle;
    /**
     * Subscribes to events when any player enters or exits a 2.5D cylinder (horizontal XZ radius with vertical elevation bounds).
     * At least one callback (onEnter or onExit) must be provided.
     * @param centerX - Cylinder center X coordinate in world meters.
     * @param centerZ - Cylinder center Z coordinate in world meters.
     * @param radiusMeters - Cylinder radius in meters.
     * @param minY - Minimum Y elevation in meters (pass undefined or -Infinity for unbounded).
     * @param maxY - Maximum Y elevation in meters (pass undefined or Infinity for unbounded).
     * @param onEnter - Callback invoked when a player enters the cylinder.
     * @param onExit - Optional callback invoked when a player exits the cylinder.
     * @returns A {@link CylinderHandle} to update parameters or unsubscribe.
     */
    function onCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): CylinderHandle;
    /**
     * Subscribes to events when any player exits a 2.5D cylinder.
     * @param centerX - Cylinder center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder radius in meters.
     * @param minY - Minimum Y elevation in meters (pass undefined or -Infinity for unbounded).
     * @param maxY - Maximum Y elevation in meters (pass undefined or Infinity for unbounded).
     * @param onEnter - Explicitly undefined to indicate no enter callback.
     * @param onExit - Callback invoked when a player exits the cylinder.
     * @returns A {@link CylinderHandle} to update parameters or unsubscribe.
     */
    function onCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): CylinderHandle;
    /**
     * Subscribes to events when any player enters or exits a 3D Axis-Aligned Bounding Box (AABB).
     * At least one callback (onEnter or onExit) must be provided.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param onEnter - Callback invoked when a player enters the box.
     * @param onExit - Optional callback invoked when a player exits the box.
     * @returns An {@link AABBHandle} to update parameters or unsubscribe.
     */
    function onAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        onEnter: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): AABBHandle;
    /**
     * Subscribes to events when any player exits a 3D Axis-Aligned Bounding Box (AABB).
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param onEnter - Explicitly undefined to indicate no enter callback.
     * @param onExit - Callback invoked when a player exits the box.
     * @returns An {@link AABBHandle} to update parameters or unsubscribe.
     */
    function onAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): AABBHandle;
    /**
     * Subscribes to events when any player enters or exits a 2.5D polygonal prism (extruded polygon on XZ plane with vertical elevation bounds).
     * At least one callback (onEnter or onExit) must be provided.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Minimum Y elevation in meters (pass undefined or -Infinity for unbounded).
     * @param maxY - Maximum Y elevation in meters (pass undefined or Infinity for unbounded).
     * @param onEnter - Callback invoked when a player enters the prism volume.
     * @param onExit - Optional callback invoked when a player exits the prism volume.
     * @returns A {@link PrismHandle} to update parameters or unsubscribe.
     */
    function onPrism(
        vertices: PrismVertex[],
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): PrismHandle | null;
    /**
     * Subscribes to events when any player exits a 2.5D polygonal prism.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Minimum Y elevation in meters (pass undefined or -Infinity for unbounded).
     * @param maxY - Maximum Y elevation in meters (pass undefined or Infinity for unbounded).
     * @param onEnter - Explicitly undefined to indicate no enter callback.
     * @param onExit - Callback invoked when a player exits the prism volume.
     * @returns A {@link PrismHandle} to update parameters or unsubscribe, or null if vertices are invalid (< 3 or > 32 vertices).
     */
    function onPrism(
        vertices: PrismVertex[],
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): PrismHandle | null;
    /**
     * Subscribes to events when any player crosses an altitude threshold (Y elevation).
     * At least one callback (onAbove or onBelow) must be provided.
     * @param y - Elevation threshold in world meters.
     * @param onAbove - Callback invoked when crossing at or above the elevation.
     * @param onBelow - Optional callback invoked when crossing below the elevation.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossAltitude(y: number, onAbove: PlayerZoneCallback, onBelow?: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses below an altitude threshold (Y elevation).
     * @param y - Elevation threshold in world meters.
     * @param onAbove - Explicitly undefined to indicate no above callback.
     * @param onBelow - Callback invoked when crossing below the elevation.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossAltitude(y: number, onAbove: undefined, onBelow: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses an East-West threshold (X axis).
     * At least one callback (onEast or onWest) must be provided.
     * @param x - X coordinate threshold in world meters.
     * @param onEast - Callback invoked when crossing east (+X) of the coordinate.
     * @param onWest - Optional callback invoked when crossing west (-X) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossEastWest(x: number, onEast: PlayerZoneCallback, onWest?: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses west of an East-West threshold (X axis).
     * @param x - X coordinate threshold in world meters.
     * @param onEast - Explicitly undefined to indicate no east callback.
     * @param onWest - Callback invoked when crossing west (-X) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossEastWest(x: number, onEast: undefined, onWest: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses a North-South threshold (Z axis).
     * At least one callback (onSouth or onNorth) must be provided.
     * @param z - Z coordinate threshold in world meters.
     * @param onSouth - Callback invoked when crossing south (+Z) of the coordinate.
     * @param onNorth - Optional callback invoked when crossing north (-Z) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossNorthSouth(z: number, onSouth: PlayerZoneCallback, onNorth?: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses north of a North-South threshold (Z axis).
     * @param z - Z coordinate threshold in world meters.
     * @param onSouth - Explicitly undefined to indicate no south callback.
     * @param onNorth - Callback invoked when crossing north (-Z) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    function onCrossNorthSouth(z: number, onSouth: undefined, onNorth: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when the identity of the highest altitude active player changes.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    function onHighestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle;
    /**
     * Subscribes to events when the identity of the lowest altitude active player changes.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    function onLowestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle;
    /**
     * Subscribes to events when the identity of the closest active player to a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns A {@link TargetExtremaHandle} to update target coordinates or unsubscribe.
     */
    function onClosestPlayerChanged(
        x: number,
        y: number,
        z: number,
        callback: PlayerExtremaCallback
    ): TargetExtremaHandle;
    /**
     * Subscribes to events when the identity of the farthest active player from a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns A {@link TargetExtremaHandle} to update target coordinates or unsubscribe.
     */
    function onFarthestPlayerChanged(
        x: number,
        y: number,
        z: number,
        callback: PlayerExtremaCallback
    ): TargetExtremaHandle;
}
