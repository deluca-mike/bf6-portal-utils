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
    /** Callback invoked when a player enters or exits a spatial zone or crosses a boundary. */
    type PlayerZoneCallback = (playerId: number) => Promise<void> | void;
    /** Callback invoked when the identity of an extremum player changes. */
    type PlayerExtremaCallback = (newPlayerId: number | null, prevPlayerId: number | null) => Promise<void> | void;
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
     * Populates an array with the IDs of all currently connected players (Zero-GC).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of connected player IDs.
     */
    function getConnectedPlayers(outArray?: number[]): number[];
    /**
     * Populates an array with the IDs of all currently active (spawned) players (Zero-GC).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs.
     */
    function getActivePlayers(outArray?: number[]): number[];
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
     * Executes in O(cells) with ZERO Garbage Collection pressure and eliminates duplicate results.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param radiusMeters - Search sphere radius in meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs within the sphere radius.
     */
    function getPlayersInSphere(x: number, y: number, z: number, radiusMeters: number, outArray?: number[]): number[];
    /**
     * Returns all active players outside a 3D sphere.
     * @param x - Center X coordinate in world meters.
     * @param y - Center Y coordinate in world meters.
     * @param z - Center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs strictly outside the sphere.
     */
    function getPlayersOutsideSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        outArray?: number[]
    ): number[];
    /**
     * Fast 2.5D Volumetric Cylinder Query (horizontal radius on XZ plane with vertical Y bounds).
     * Uses sweep-and-prune axis selection for high performance.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder horizontal radius in meters.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs within the cylinder.
     */
    function getPlayersInCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number,
        outArray?: number[]
    ): number[];
    /**
     * Returns all active players outside a 2.5D vertical cylinder.
     * @param centerX - Center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder horizontal radius in meters.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs strictly outside the cylinder.
     */
    function getPlayersOutsideCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY?: number,
        maxY?: number,
        outArray?: number[]
    ): number[];
    /**
     * Fast 3D AABB Box Query using 3-Axis Sweep-and-Prune.
     * Evaluates binary search ranges across all 3 axes and iterates along the axis with the fewest candidate elements.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs within the bounding box.
     */
    function getPlayersInAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        outArray?: number[]
    ): number[];
    /**
     * Returns all active players outside a 3D Axis-Aligned Bounding Box (AABB).
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs strictly outside the bounding box.
     */
    function getPlayersOutsideAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        outArray?: number[]
    ): number[];
    /**
     * Fast 2.5D Polygonal Prism Query (extruded polygon on XZ plane with vertical Y bounds).
     * Uses 3-axis sweep-and-prune AABB filtering and ray-casting.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs within the prism volume, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function getPlayersInPrism(
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number,
        outArray?: number[]
    ): number[] | null;
    /**
     * Returns all active players outside a 2.5D polygonal prism.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation in meters (default: Infinity).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs strictly outside the prism volume, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    function getPlayersOutsidePrism(
        vertices: PrismVertex[],
        minY?: number,
        maxY?: number,
        outArray?: number[]
    ): number[] | null;
    /**
     * Returns all active players located at or above a given Y elevation (altitude).
     * @param y - The elevation threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs at or above the elevation.
     */
    function getPlayersAbove(y: number, outArray?: number[]): number[];
    /**
     * Returns all active players located at or below a given Y elevation (altitude).
     * @param y - The elevation threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs at or below the elevation.
     */
    function getPlayersBelow(y: number, outArray?: number[]): number[];
    /**
     * Returns all active players located east of (positive X) a given X coordinate.
     * @param x - The X coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs east of the coordinate.
     */
    function getPlayersEastOf(x: number, outArray?: number[]): number[];
    /**
     * Returns all active players located west of (negative X) a given X coordinate.
     * @param x - The X coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs west of the coordinate.
     */
    function getPlayersWestOf(x: number, outArray?: number[]): number[];
    /**
     * Returns all active players located north of (negative Z) a given Z coordinate.
     * @param z - The Z coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs north of the coordinate.
     */
    function getPlayersNorthOf(z: number, outArray?: number[]): number[];
    /**
     * Returns all active players located south of (positive Z) a given Z coordinate.
     * @param z - The Z coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs south of the coordinate.
     */
    function getPlayersSouthOf(z: number, outArray?: number[]): number[];
    /**
     * Finds the single closest active player to a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the closest player, or null if no active player satisfies the condition.
     */
    function getClosestPlayer(x: number, y: number, z: number, filterFn?: (id: number) => boolean): number | null;
    /**
     * Finds the single farthest active player from a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the farthest player, or null if no active player satisfies the condition.
     */
    function getFarthestPlayer(x: number, y: number, z: number, filterFn?: (id: number) => boolean): number | null;
    /**
     * Returns the 'k' closest active players to a target 3D point, sorted closest-first.
     * Executes in O(N log k) time using a bounded Max-Heap with ZERO Garbage Collection pressure.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param k - Number of nearest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted closest to farthest.
     */
    function getKClosestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (id: number) => boolean,
        outArray?: number[]
    ): number[];
    /**
     * Returns the 'k' farthest active players from a target 3D point, sorted farthest-first.
     * Executes in O(N log k) time using a bounded Min-Heap with ZERO Garbage Collection pressure.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param k - Number of farthest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted farthest to closest.
     */
    function getKFarthestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (id: number) => boolean,
        outArray?: number[]
    ): number[];
    /**
     * Gets the highest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the highest active player, or null if no active player satisfies the condition.
     */
    function getHighestPlayer(filterFn?: (id: number) => boolean): number | null;
    /**
     * Gets the lowest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the lowest active player, or null if no active player satisfies the condition.
     */
    function getLowestPlayer(filterFn?: (id: number) => boolean): number | null;
    /**
     * Returns the 'k' highest altitude active players, sorted from highest to lowest.
     * @param k - Number of highest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted from highest to lowest altitude.
     */
    function getKHighestPlayers(k: number, filterFn?: (id: number) => boolean, outArray?: number[]): number[];
    /**
     * Returns the 'k' lowest altitude active players, sorted from lowest to highest.
     * @param k - Number of lowest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted from lowest to highest altitude.
     */
    function getKLowestPlayers(k: number, filterFn?: (id: number) => boolean, outArray?: number[]): number[];
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
     * @param callback - Function invoked with (newHighestId, prevHighestId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    function onHighestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle;
    /**
     * Subscribes to events when the identity of the lowest altitude active player changes.
     * @param callback - Function invoked with (newLowestId, prevLowestId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    function onLowestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle;
    /**
     * Subscribes to events when the identity of the closest active player to a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newClosestId, prevClosestId).
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
     * @param callback - Function invoked with (newFarthestId, prevFarthestId).
     * @returns A {@link TargetExtremaHandle} to update target coordinates or unsubscribe.
     */
    function onFarthestPlayerChanged(
        x: number,
        y: number,
        z: number,
        callback: PlayerExtremaCallback
    ): TargetExtremaHandle;
}
