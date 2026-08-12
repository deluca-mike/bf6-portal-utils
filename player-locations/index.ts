import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace PlayerLocations {
    const logging = new Logging('PL');

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
    export function initialize(): void {
        if (_isInitialized) return;

        _isInitialized = true;

        _initConnectedPlayers();

        Events.OngoingGlobal.subscribe(_handleTick);
        Events.OnPlayerJoinGame.subscribe(_handlePlayerJoin);
        Events.OnPlayerLeaveGame.subscribe(_handlePlayerLeave);
    }

    /**
     * Checks whether the PlayerLocations spatial tracking engine has been initialized.
     * @returns True if initialize() has already been called, false otherwise.
     */
    export function isInitialized(): boolean {
        return _isInitialized;
    }

    // =========================================================================
    // Types & Callback Signatures
    // =========================================================================

    /** Callback invoked when a player enters or exits a spatial zone or crosses a boundary. */
    export type PlayerZoneCallback = (player: mod.Player, playerId: number) => Promise<void> | void;

    /** Callback invoked when the identity of an extremum player changes. */
    export type PlayerExtremaCallback = (
        newPlayer: mod.Player | undefined,
        prevPlayer: mod.Player | undefined,
        newPlayerId: number | undefined,
        prevPlayerId: number | undefined
    ) => Promise<void> | void;

    /** Handle returned by sphere zone subscriptions to allow updating parameters or unsubscribing. */
    export interface SphereHandle {
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
    export interface CylinderHandle {
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
    export interface AABBHandle {
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
    export type PrismVertex = {
        x: number;
        z: number;
    };

    /** Handle returned by polygonal prism subscriptions to allow updating parameters or unsubscribing. */
    export interface PrismHandle {
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
    export interface PlaneHandle {
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
    export interface ExtremaHandle {
        /** Cancels the subscription and removes the extremum listener. Safe to call multiple times. */
        unsubscribe(): void;
    }

    /** Handle returned by target point extrema subscriptions (closest/farthest) to allow updating target point or unsubscribing. */
    export interface TargetExtremaHandle extends ExtremaHandle {
        /**
         * Updates the target reference point coordinates on the fly.
         * Has no effect if the subscription has already been unsubscribed.
         * @param x - New target X coordinate in world meters.
         * @param y - New target Y coordinate in world meters.
         * @param z - New target Z coordinate in world meters.
         */
        update(x: number, y: number, z: number): void;
    }

    const enum AxisType {
        X = 0,
        Y = 1,
        Z = 2,
    }

    const enum ExtremaType {
        Closest = 0,
        Farthest = 1,
        Highest = 2,
        Lowest = 3,
    }

    interface BasePresenceMask {
        mask0: number;
        mask1: number;
        mask2: number;
        mask3: number;
        onEnter?: PlayerZoneCallback;
        onExit?: PlayerZoneCallback;
    }

    interface SphereListener extends BasePresenceMask {
        centerX: number;
        centerY: number;
        centerZ: number;
        radiusSq: number;
    }

    interface CylinderListener extends BasePresenceMask {
        centerX: number;
        centerZ: number;
        radiusSq: number;
        minY: number;
        maxY: number;
    }

    interface AABBListener extends BasePresenceMask {
        minX: number;
        minY: number;
        minZ: number;
        maxX: number;
        maxY: number;
        maxZ: number;
    }

    interface PrismListener extends BasePresenceMask {
        coords: Float32Array;
        vertexCount: number;
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        minY: number;
        maxY: number;
    }

    interface PlaneListener extends BasePresenceMask {
        axis: AxisType;
        threshold: number;
    }

    interface ExtremaListener {
        type: ExtremaType;
        callback: PlayerExtremaCallback;
        x: number;
        y: number;
        z: number;
        lastPlayerId: number | undefined;
    }

    interface PrismBounds {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    }

    // =========================================================================
    // Configuration & Pre-Allocated Storage (Zero-GC)
    // =========================================================================

    /** Maximum supported player slots in Battlefield 6 Portal (0-99). */
    export const MAX_PLAYERS = 100;

    /** Maximum supported vertices per polygonal prism (32 vertices). */
    export const MAX_PRISM_VERTICES = 32;

    /** Spatial Grid Voxel Size in world meters (25 meters). */
    const VOXEL_SIZE = 25;

    /** Hash table bucket count for the spatial grid (must be a power of 2). */
    const GRID_TABLE_SIZE = 512;

    /** Bitmask for spatial grid hash mapping (GRID_TABLE_SIZE - 1). */
    const GRID_MASK = GRID_TABLE_SIZE - 1;

    /** Sentinel coordinate value indicating an unspawned, dead, or inactive player. */
    const INVALID_POS = -99999.0;

    /** Tolerance in meters (1 millimeter) for filtering out unspawned/inactive players near origin. */
    const ORIGIN_TOLERANCE_METERS = 0.001;

    // --- State Bit Flags ---
    const FLAG_CONNECTED = 1 << 0; // 1 = Connected / In-Game slot
    const FLAG_ACTIVE = 1 << 1; // 2 = Spawned / Alive with valid 3D coordinates

    // --- 1. Struct of Arrays (SoA) Buffers (32-bit Float Coordinates in Meters) ---
    const posX = new Float32Array(MAX_PLAYERS);
    const posY = new Float32Array(MAX_PLAYERS);
    const posZ = new Float32Array(MAX_PLAYERS);
    const stateFlags = new Uint8Array(MAX_PLAYERS);

    // --- 2. Zero-GC Linked-List Spatial Grid ---
    const gridHead = new Int8Array(GRID_TABLE_SIZE);
    const nextPlayer = new Int8Array(MAX_PLAYERS);

    // --- 3. Three Sorted Axis Arrays (Sweep-and-Prune) ---
    const sortedX = new Uint8Array(MAX_PLAYERS);
    const sortedY = new Uint8Array(MAX_PLAYERS);
    const sortedZ = new Uint8Array(MAX_PLAYERS);

    // --- 4. Query Visit Tracking (Prevents duplicate processing on voxel hash collisions) ---
    const queryVisited = new Uint32Array(MAX_PLAYERS);
    let queryToken = 1;

    // --- Pre-Allocated mod.Player Cache (Fixed-Size Array: MAX_PLAYERS) ---
    const _players: (mod.Player | undefined)[] = new Array(MAX_PLAYERS);

    // --- Private Internal Scratch Buffers (Zero Heap Allocations, Never Exposed) ---
    const _internalScratchIds: number[] = [];
    const _scratchPos: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _scratchCoords = new Float32Array(MAX_PRISM_VERTICES * 2);

    const _scratchPrismBounds: PrismBounds = {
        minX: 0,
        maxX: 0,
        minZ: 0,
        maxZ: 0,
    };

    // Pre-allocated Heap Buffers for K-Closest / K-Farthest queries
    const heapDist = new Float64Array(MAX_PLAYERS);
    const heapId = new Uint8Array(MAX_PLAYERS);

    // Event Subscriptions Storage (Separated by Geometry Type for Monomorphic Efficiency)
    const sphereListeners: SphereListener[] = [];
    const cylinderListeners: CylinderListener[] = [];
    const aabbListeners: AABBListener[] = [];
    const prismListeners: PrismListener[] = [];
    const planeListeners: PlaneListener[] = [];
    const extremaListeners: ExtremaListener[] = [];

    // Track initialization and activity state
    let _isInitialized = false;
    let _lastActiveCount = 0;

    // Initialize ID index and coordinate arrays
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        sortedX[i] = i;
        sortedY[i] = i;
        sortedZ[i] = i;
        posX[i] = INVALID_POS;
        posY[i] = INVALID_POS;
        posZ[i] = INVALID_POS;
    }

    // =========================================================================
    // Internal State & Flag Helpers
    // =========================================================================

    function _getPlayerId(player: number | mod.Player): number | undefined {
        if (typeof player === 'number') return player >= 0 && player < MAX_PLAYERS ? player : undefined;

        const id = mod.GetObjId(player);

        if (id === undefined) return undefined;

        return id >= 0 && id < MAX_PLAYERS ? id : undefined;
    }

    function _isConnected(id: number | undefined): id is number {
        return id !== undefined && id >= 0 && id < MAX_PLAYERS && (stateFlags[id] & FLAG_CONNECTED) !== 0;
    }

    function _isActive(id: number | undefined): id is number {
        return id !== undefined && id >= 0 && id < MAX_PLAYERS && (stateFlags[id] & FLAG_ACTIVE) !== 0;
    }

    function _setFlag(id: number, flag: number): void {
        stateFlags[id] |= flag;
    }

    function _clearFlag(id: number, flag: number): void {
        stateFlags[id] &= ~flag;
    }

    function _clearPresence(mask: BasePresenceMask, id: number): boolean {
        const wordIdx = id >> 5;
        const bitMask = 1 << (id & 31);
        let wasInside = false;

        if (wordIdx === 0) {
            wasInside = (mask.mask0 & bitMask) !== 0;
            mask.mask0 &= ~bitMask;
        } else if (wordIdx === 1) {
            wasInside = (mask.mask1 & bitMask) !== 0;
            mask.mask1 &= ~bitMask;
        } else if (wordIdx === 2) {
            wasInside = (mask.mask2 & bitMask) !== 0;
            mask.mask2 &= ~bitMask;
        } else {
            wasInside = (mask.mask3 & bitMask) !== 0;
            mask.mask3 &= ~bitMask;
        }

        return wasInside;
    }

    function _updatePresence(mask: BasePresenceMask, id: number, isInsideNow: boolean): boolean {
        const wordIdx = id >> 5;
        const bitMask = 1 << (id & 31);
        let wasInside = false;

        if (wordIdx === 0) {
            wasInside = (mask.mask0 & bitMask) !== 0;

            if (isInsideNow) {
                mask.mask0 |= bitMask;
            } else {
                mask.mask0 &= ~bitMask;
            }
        } else if (wordIdx === 1) {
            wasInside = (mask.mask1 & bitMask) !== 0;

            if (isInsideNow) {
                mask.mask1 |= bitMask;
            } else {
                mask.mask1 &= ~bitMask;
            }
        } else if (wordIdx === 2) {
            wasInside = (mask.mask2 & bitMask) !== 0;

            if (isInsideNow) {
                mask.mask2 |= bitMask;
            } else {
                mask.mask2 &= ~bitMask;
            }
        } else {
            wasInside = (mask.mask3 & bitMask) !== 0;

            if (isInsideNow) {
                mask.mask3 |= bitMask;
            } else {
                mask.mask3 &= ~bitMask;
            }
        }

        return wasInside;
    }

    function _clearPlayerPresence(listener: BasePresenceMask, id: number): void {
        const wasInside = _clearPresence(listener, id);

        if (!wasInside || !listener.onExit) return;

        const player = _players[id];

        if (player) {
            CallbackHandler.invoke(listener.onExit, player, id, undefined, undefined, logging, 'clearPlayerPresence');
        }
    }

    function _resetPlayer(id: number): void {
        _clearFlag(id, FLAG_CONNECTED | FLAG_ACTIVE);

        posX[id] = INVALID_POS;
        posY[id] = INVALID_POS;
        posZ[id] = INVALID_POS;
        nextPlayer[id] = -1;

        for (let i = 0; i < sphereListeners.length; ++i) {
            _clearPlayerPresence(sphereListeners[i], id);
        }

        for (let i = 0; i < cylinderListeners.length; ++i) {
            _clearPlayerPresence(cylinderListeners[i], id);
        }

        for (let i = 0; i < aabbListeners.length; ++i) {
            _clearPlayerPresence(aabbListeners[i], id);
        }

        for (let i = 0; i < prismListeners.length; ++i) {
            _clearPlayerPresence(prismListeners[i], id);
        }

        for (let i = 0; i < planeListeners.length; ++i) {
            _clearPlayerPresence(planeListeners[i], id);
        }

        _players[id] = undefined;
    }

    function _initConnectedPlayers(): void {
        const all = mod.AllPlayers();
        const count = mod.CountOf(all);

        for (let i = 0; i < count; ++i) {
            const player = mod.ValueInArray(all, i) as mod.Player;
            const id = mod.GetObjId(player);

            if (id < 0 || id >= MAX_PLAYERS) continue;

            _setFlag(id, FLAG_CONNECTED);
            _players[id] = player;
        }
    }

    function _countPlayersByFlag(flag: number): number {
        let count = 0;

        for (let i = 0; i < MAX_PLAYERS; ++i) {
            if ((stateFlags[i] & flag) === 0) continue;

            ++count;
        }

        return count;
    }

    function _findPlayersByFlag(
        flag: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        // Fast count-only path.
        if (!filterFn && !idsOut && !playersOut) return _countPlayersByFlag(flag);

        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        let count = 0;

        for (let i = 0; i < MAX_PLAYERS; ++i) {
            if ((stateFlags[i] & flag) === 0) continue;

            const p = _players[i]!;

            if (filterFn && !filterFn(p, i)) continue;

            if (idsOut) {
                idsOut[count] = i;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    function _handlePlayerJoin(player: mod.Player): void {
        const id = mod.GetObjId(player);

        if (id < 0 || id >= MAX_PLAYERS) return;

        _setFlag(id, FLAG_CONNECTED);
        _players[id] = player;
    }

    function _handlePlayerLeave(id: number): void {
        if (id < 0 || id >= MAX_PLAYERS) return;

        _resetPlayer(id);
    }

    function _updateListenerPresence(listener: BasePresenceMask, id: number, isInsideNow: boolean): void {
        const wasInside = _updatePresence(listener, id, isInsideNow);

        if (!wasInside && isInsideNow) {
            if (!listener.onEnter) return;

            const player = _players[id];

            if (player) {
                CallbackHandler.invoke(listener.onEnter, player, id, undefined, undefined, logging, 'onEnter');
            }
        } else if (wasInside && !isInsideNow) {
            if (!listener.onExit) return;

            const player = _players[id];

            if (player) {
                CallbackHandler.invoke(listener.onExit, player, id, undefined, undefined, logging, 'onExit');
            }
        }
    }

    function _evaluateSphereSubscriptions(): void {
        const sphereCount = sphereListeners.length;

        if (sphereCount === 0) return;

        for (let z = 0; z < sphereCount; ++z) {
            const l = sphereListeners[z];
            const cx = l.centerX;
            const cy = l.centerY;
            const cz = l.centerZ;
            const rSq = l.radiusSq;

            for (let id = 0; id < MAX_PLAYERS; ++id) {
                let isInside = false;

                if (_isActive(id)) {
                    const dx = posX[id] - cx;
                    const dy = posY[id] - cy;
                    const dz = posZ[id] - cz;
                    isInside = dx * dx + dy * dy + dz * dz <= rSq;
                }

                _updateListenerPresence(l, id, isInside);
            }
        }
    }

    function _evaluateCylinderSubscriptions(): void {
        const cylinderCount = cylinderListeners.length;

        if (cylinderCount === 0) return;

        for (let z = 0; z < cylinderCount; ++z) {
            const l = cylinderListeners[z];
            const cx = l.centerX;
            const cz = l.centerZ;
            const rSq = l.radiusSq;
            const minY = l.minY;
            const maxY = l.maxY;

            for (let id = 0; id < MAX_PLAYERS; ++id) {
                let isInside = false;

                if (_isActive(id)) {
                    const y = posY[id];

                    if (y >= minY && y <= maxY) {
                        const dx = posX[id] - cx;
                        const dz = posZ[id] - cz;
                        isInside = dx * dx + dz * dz <= rSq;
                    }
                }

                _updateListenerPresence(l, id, isInside);
            }
        }
    }

    function _evaluateAabbSubscriptions(): void {
        const aabbCount = aabbListeners.length;

        if (aabbCount === 0) return;

        for (let z = 0; z < aabbCount; ++z) {
            const l = aabbListeners[z];
            const minX = l.minX;
            const minY = l.minY;
            const minZ = l.minZ;
            const maxX = l.maxX;
            const maxY = l.maxY;
            const maxZ = l.maxZ;

            for (let id = 0; id < MAX_PLAYERS; ++id) {
                let isInside = false;

                if (_isActive(id)) {
                    const x = posX[id];
                    const y = posY[id];
                    const z = posZ[id];
                    isInside = x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
                }

                _updateListenerPresence(l, id, isInside);
            }
        }
    }

    function _evaluatePrismSubscriptions(): void {
        const prismCount = prismListeners.length;

        if (prismCount === 0) return;

        for (let z = 0; z < prismCount; ++z) {
            const l = prismListeners[z];
            const count = l.vertexCount;

            if (count < 3) continue;

            const minX = l.minX;
            const maxX = l.maxX;
            const minZ = l.minZ;
            const maxZ = l.maxZ;
            const minY = l.minY;
            const maxY = l.maxY;
            const coords = l.coords;

            for (let id = 0; id < MAX_PLAYERS; ++id) {
                let isInside = false;

                if (_isActive(id)) {
                    const y = posY[id];

                    if (y >= minY && y <= maxY) {
                        const x = posX[id];
                        const pz = posZ[id];

                        if (x >= minX && x <= maxX && pz >= minZ && pz <= maxZ) {
                            isInside = _isPointInPolygon(x, pz, coords, count);
                        }
                    }
                }

                _updateListenerPresence(l, id, isInside);
            }
        }
    }

    function _evaluatePlaneSubscriptions(): void {
        const planeCount = planeListeners.length;

        if (planeCount === 0) return;

        for (let z = 0; z < planeCount; ++z) {
            const l = planeListeners[z];
            const thresh = l.threshold;
            const posArr = l.axis === AxisType.X ? posX : l.axis === AxisType.Y ? posY : posZ;

            for (let id = 0; id < MAX_PLAYERS; ++id) {
                const isInside = _isActive(id) && posArr[id] >= thresh;

                _updateListenerPresence(l, id, isInside);
            }
        }
    }

    function _evaluateExtremaSubscriptions(): void {
        const extremaCount = extremaListeners.length;

        if (extremaCount === 0) return;

        for (let i = 0; i < extremaCount; ++i) {
            const l = extremaListeners[i];
            let currId: number | undefined = undefined;

            if (l.type === ExtremaType.Highest) {
                currId = getHighestPlayerId();
            } else if (l.type === ExtremaType.Lowest) {
                currId = getLowestPlayerId();
            } else if (l.type === ExtremaType.Closest) {
                currId = getClosestPlayerId(l.x, l.y, l.z);
            } else if (l.type === ExtremaType.Farthest) {
                currId = getFarthestPlayerId(l.x, l.y, l.z);
            }

            if (currId === l.lastPlayerId) continue;

            const prevId = l.lastPlayerId;
            l.lastPlayerId = currId;

            const newPlayer = currId !== undefined ? _players[currId] : undefined;
            const prevPlayer = prevId !== undefined ? _players[prevId] : undefined;

            CallbackHandler.invoke(l.callback, newPlayer, prevPlayer, currId, prevId, logging, 'onExtremaChange');
        }
    }

    function _handleTick(): void {
        // Fast path: if no players are connected to the server, skip all tick processing
        if (_countPlayersByFlag(FLAG_CONNECTED) === 0) {
            _lastActiveCount = 0;
            return;
        }

        // Clear Grid Head Table
        gridHead.fill(-1);

        let activeCount = 0;

        // Phase 1: Fetch positions for connected players, convert to scaled ints, update SoA & Grid
        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isConnected(id)) continue;

            const player = _players[id];

            if (player === undefined) {
                _resetPlayer(id);
                continue;
            }

            Vectors.toVector3(mod.GetObjectPosition(player), _scratchPos);

            // Filter out inactive/dead/unspawned players near origin (within 1mm tolerance)
            if (Vectors.isZero(_scratchPos, ORIGIN_TOLERANCE_METERS)) {
                _clearFlag(id, FLAG_ACTIVE);
                posX[id] = INVALID_POS;
                posY[id] = INVALID_POS;
                posZ[id] = INVALID_POS;
                nextPlayer[id] = -1;

                continue;
            }

            _setFlag(id, FLAG_ACTIVE);
            ++activeCount;

            const x = _scratchPos.x;
            const y = _scratchPos.y;
            const z = _scratchPos.z;

            posX[id] = x;
            posY[id] = y;
            posZ[id] = z;

            // Insert into 3D Linked Voxel Grid
            const gx = Math.floor(x / VOXEL_SIZE) | 0;
            const gy = Math.floor(y / VOXEL_SIZE) | 0;
            const gz = Math.floor(z / VOXEL_SIZE) | 0;
            const cellHash = _hashVoxel(gx, gy, gz);

            nextPlayer[id] = gridHead[cellHash];
            gridHead[cellHash] = id;
        }

        // If no players are active this tick and were not active last tick, skip sorting and subscriptions
        if (activeCount === 0 && _lastActiveCount === 0) return;

        _lastActiveCount = activeCount;

        // Phase 2: Update 3 Sorted Axis Arrays via Insertion Sort (O(N) near-linear time)
        _insertionSort(sortedX, posX);
        _insertionSort(sortedY, posY);
        _insertionSort(sortedZ, posZ);

        // Phase 3: Evaluate Active Reactive Subscriptions (Zero-GC Bitmask Diffing)
        _evaluateSphereSubscriptions();
        _evaluateCylinderSubscriptions();
        _evaluateAabbSubscriptions();
        _evaluatePrismSubscriptions();
        _evaluatePlaneSubscriptions();
        _evaluateExtremaSubscriptions();
    }

    // =========================================================================
    // Internal Helper Math & Sorting
    // =========================================================================

    /**
     * Unpacks an array of PrismVertex points into a flat interleaved Float32Array buffer
     * [x0, z0, x1, z1, ...] and computes the 2D bounding box (minX, maxX, minZ, maxZ).
     *
     * Bounding box values are written into the targetBounds target object to eliminate heap allocations.
     * @param vertices - Array of {x, z} vertex objects defining the polygon.
     * @param targetCoords - Target Float32Array to write interleaved coordinates [x0, z0, x1, z1, ...] into.
     * @param targetBounds - Target object to populate with bounding box.
     */
    function _unpackVertices(vertices: PrismVertex[], targetCoords: Float32Array, targetBounds: PrismBounds): void {
        const count = vertices.length;

        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;

        for (let i = 0; i < count; ++i) {
            const v = vertices[i];
            const vx = v.x;
            const vz = v.z;
            const i2 = i << 1;

            targetCoords[i2] = vx;
            targetCoords[i2 + 1] = vz;

            if (vx < minX) {
                minX = vx;
            }

            if (vx > maxX) {
                maxX = vx;
            }

            if (vz < minZ) {
                minZ = vz;
            }

            if (vz > maxZ) {
                maxZ = vz;
            }
        }

        targetBounds.minX = minX;
        targetBounds.maxX = maxX;
        targetBounds.minZ = minZ;
        targetBounds.maxZ = maxZ;
    }

    /**
     * Determines whether a 2D point (px, pz) lies inside a polygon defined by interleaved coordinates.
     * Uses the Jordan Curve Theorem (Ray-Casting even-odd rule).
     * @param px - Point X coordinate in meters.
     * @param pz - Point Z coordinate in meters.
     * @param coords - Flat Float32Array of interleaved polygon coordinates [x0, z0, x1, z1, ...].
     * @param count - Total number of vertices.
     * @returns True if point is inside the polygon, false otherwise.
     */
    function _isPointInPolygon(px: number, pz: number, coords: Float32Array, count: number): boolean {
        if (count < 3) return false;

        let inside = false;

        for (let i = 0, j = count - 1; i < count; j = i++) {
            const i2 = i << 1;
            const j2 = j << 1;
            const xi = coords[i2];
            const zi = coords[i2 + 1];
            const xj = coords[j2];
            const zj = coords[j2 + 1];

            const intersect = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;

            if (!intersect) continue;

            inside = !inside;
        }

        return inside;
    }

    function _hashVoxel(gx: number, gy: number, gz: number): number {
        // Fast spatial integer hash mapped to 0..511
        return ((gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791)) & GRID_MASK;
    }

    function _insertionSort(sortedArray: Uint8Array, posArray: Float32Array): void {
        for (let i = 1; i < MAX_PLAYERS; ++i) {
            const keyId = sortedArray[i];
            const keyVal = posArray[keyId];
            let j = i - 1;

            while (j >= 0 && posArray[sortedArray[j]] > keyVal) {
                sortedArray[j + 1] = sortedArray[j];
                --j;
            }

            sortedArray[j + 1] = keyId;
        }
    }

    function _findLowerBound(sortedArray: Uint8Array, posArray: Float32Array, targetVal: number): number {
        let low = 0;
        let high = MAX_PLAYERS - 1;
        let ans = MAX_PLAYERS;

        while (low <= high) {
            const mid = (low + high) >> 1;

            if (posArray[sortedArray[mid]] >= targetVal) {
                ans = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        return ans;
    }

    function _findUpperBound(sortedArray: Uint8Array, posArray: Float32Array, targetVal: number): number {
        let low = 0;
        let high = MAX_PLAYERS - 1;
        let ans = -1;

        while (low <= high) {
            const mid = (low + high) >> 1;

            if (posArray[sortedArray[mid]] <= targetVal) {
                ans = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return ans;
    }

    function _findPlayersGte(
        sortedArray: Uint8Array,
        posArray: Float32Array,
        valMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        const lx = _findLowerBound(sortedArray, posArray, valMeters);
        let count = 0;

        // Fast count-only path.
        if (!filterFn && !idsOut && !playersOut) {
            for (let i = lx; i < MAX_PLAYERS; ++i) {
                if (!_isActive(sortedArray[i])) continue;

                ++count;
            }

            return count;
        }

        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        for (let i = lx; i < MAX_PLAYERS; ++i) {
            const id = sortedArray[i];

            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

    function _findPlayersLte(
        sortedArray: Uint8Array,
        posArray: Float32Array,
        valMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        const ux = _findUpperBound(sortedArray, posArray, valMeters);
        let count = 0;

        // Fast count-only path.
        if (!filterFn && !idsOut && !playersOut) {
            for (let i = 0; i <= ux; ++i) {
                if (!_isActive(sortedArray[i])) continue;

                ++count;
            }

            return count;
        }

        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        for (let i = 0; i <= ux; ++i) {
            const id = sortedArray[i];

            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

    // =========================================================================
    // Internal Heap Helpers (Zero-GC)
    // =========================================================================

    function _heapPush(distSq: number, id: number, heapSize: number, isMax: boolean): void {
        let idx = heapSize;
        heapDist[idx] = distSq;
        heapId[idx] = id;

        while (idx > 0) {
            const parent = (idx - 1) >> 1;

            if (isMax ? heapDist[idx] <= heapDist[parent] : heapDist[idx] >= heapDist[parent]) break;

            const td = heapDist[idx];
            heapDist[idx] = heapDist[parent];
            heapDist[parent] = td;

            const ti = heapId[idx];
            heapId[idx] = heapId[parent];
            heapId[parent] = ti;

            idx = parent;
        }
    }

    function _heapReplaceRoot(distSq: number, id: number, heapSize: number, isMax: boolean): void {
        heapDist[0] = distSq;
        heapId[0] = id;
        let idx = 0;

        while (true) {
            let best = idx;
            const left = (idx << 1) + 1;
            const right = left + 1;

            if (left < heapSize && (isMax ? heapDist[left] > heapDist[best] : heapDist[left] < heapDist[best])) {
                best = left;
            }

            if (right < heapSize && (isMax ? heapDist[right] > heapDist[best] : heapDist[right] < heapDist[best])) {
                best = right;
            }

            if (best === idx) break;

            const td = heapDist[idx];
            heapDist[idx] = heapDist[best];
            heapDist[best] = td;

            const ti = heapId[idx];
            heapId[idx] = heapId[best];
            heapId[best] = ti;

            idx = best;
        }
    }

    function _getExtremumPlayer(
        x: number,
        y: number,
        z: number,
        findClosest: boolean,
        filterFn?: (player: mod.Player, id: number) => boolean
    ): number | undefined {
        let bestId: number | undefined = undefined;
        let bestDistSq = findClosest ? Infinity : -1;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            if (filterFn && !filterFn(_players[id]!, id)) continue;

            const dx = posX[id] - x;
            const dy = posY[id] - y;
            const dz = posZ[id] - z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (findClosest ? distSq < bestDistSq : distSq > bestDistSq) {
                bestDistSq = distSq;
                bestId = id;
            }
        }

        return bestId;
    }

    function _getKExtremumDistancePlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        isClosest: boolean,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        if (k <= 0) return 0;

        const targetK = k > MAX_PLAYERS ? MAX_PLAYERS : k;
        let heapSize = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            if (filterFn && !filterFn(_players[id]!, id)) continue;

            const dx = posX[id] - x;
            const dy = posY[id] - y;
            const dz = posZ[id] - z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (heapSize < targetK) {
                _heapPush(distSq, id, heapSize, isClosest);
                ++heapSize;
            } else if (isClosest ? distSq < heapDist[0] : distSq > heapDist[0]) {
                _heapReplaceRoot(distSq, id, heapSize, isClosest);
            }
        }

        if (idsOut) {
            idsOut.length = heapSize;
        }

        if (playersOut) {
            playersOut.length = heapSize;
        }

        let currentSize = heapSize;

        for (let i = heapSize - 1; i >= 0; --i) {
            const id = heapId[0];

            if (idsOut) {
                idsOut[i] = id;
            }

            if (playersOut) {
                playersOut[i] = _players[id]!;
            }

            if (i <= 0) break;

            _heapReplaceRoot(heapDist[currentSize - 1], heapId[currentSize - 1], currentSize - 1, isClosest);
            --currentSize;
        }

        return heapSize;
    }

    function _getKExtremes(
        sortedArray: Uint8Array,
        k: number,
        reverse: boolean,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        if (k <= 0) return 0;

        const targetK = k > MAX_PLAYERS ? MAX_PLAYERS : k;
        let count = 0;

        const start = reverse ? MAX_PLAYERS - 1 : 0;
        const end = reverse ? -1 : MAX_PLAYERS;
        const step = reverse ? -1 : 1;

        for (let i = start; i !== end; i += step) {
            const id = sortedArray[i];

            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            if (++count === targetK) break;
        }

        return count;
    }

    // =========================================================================
    // Exposed Player State Functions
    // =========================================================================

    /**
     * Gets world coordinates in meters for an active player.
     * Pass an `out` vector for zero-allocation reuse.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param out - Optional target Vector3 to write coordinates into.
     * @returns The Vector3 position in meters, null if the player is connected but unspawned/inactive, or undefined if not connected.
     */
    export function getPosition(
        player: number | mod.Player,
        out?: Vectors.Vector3
    ): Vectors.Vector3 | null | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return null;

        const res = out || { x: 0, y: 0, z: 0 };
        res.x = posX[id];
        res.y = posY[id];
        res.z = posZ[id];

        return res;
    }

    /**
     * Checks if a player slot is currently connected to the server.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns True if the player is connected, false otherwise.
     */
    export function isPlayerConnected(player: number | mod.Player): boolean {
        return _isConnected(_getPlayerId(player));
    }

    /**
     * Checks if a player is active (connected, spawned, and tracked with a valid 3D position).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns True if active/spawned, false if connected but inactive, or undefined if the player is not connected.
     */
    export function isPlayerActive(player: number | mod.Player): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        return _isActive(id);
    }

    /**
     * Returns the total count of currently connected players.
     * @returns The number of connected players.
     */
    export function getConnectedPlayerCount(): number {
        return _countPlayersByFlag(FLAG_CONNECTED);
    }

    /**
     * Returns the total count of currently active (spawned) players.
     * @returns The number of active players.
     */
    export function getActivePlayerCount(): number {
        return _countPlayersByFlag(FLAG_ACTIVE);
    }

    /**
     * Retrieves the cached engine `mod.Player` object for a given player ID or object.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns The engine mod.Player object, or undefined if the player is not connected or invalid.
     */
    export function getPlayer(player: number | mod.Player): mod.Player | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        return _players[id!];
    }

    /**
     * Resolves the integer slot ID (0-99) for a given player ID or engine mod.Player object.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @returns The integer player slot ID (0-99), or undefined if the player is not connected or invalid.
     */
    export function getPlayerId(player: number | mod.Player): number | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        return id;
    }

    /**
     * Zero-GC batch utility to map an array of player IDs to their corresponding cached `mod.Player` objects.
     * Populates and returns the provided `playersOut` array.
     * Non-connected or invalid player IDs are set to `undefined`.
     * @param ids - Array of player IDs to convert.
     * @param playersOut - Optional target array to write mod.Player objects into.
     * @returns The players array.
     */
    export function toPlayers(
        ids: (number | undefined)[],
        playersOut?: (mod.Player | undefined)[]
    ): (mod.Player | undefined)[] {
        const out = playersOut ?? [];
        out.length = 0;
        const length = ids.length;

        for (let i = 0; i < length; ++i) {
            const id = ids[i];

            out[i] = _isConnected(id) ? _players[id] : undefined;
        }

        return out;
    }

    /**
     * Zero-GC batch utility to resolve an array of engine `mod.Player` objects to their integer slot IDs.
     * Populates and returns the provided `idsOut` array.
     * Non-connected or invalid players are set to `undefined`.
     * @param players - Array of mod.Player objects to convert.
     * @param idsOut - Optional target array to write player IDs into.
     * @returns The ids array.
     */
    export function toPlayerIds(
        players: (mod.Player | undefined)[],
        idsOut?: (number | undefined)[]
    ): (number | undefined)[] {
        const out = idsOut ?? [];
        out.length = 0;
        const length = players.length;

        for (let i = 0; i < length; ++i) {
            const p = players[i];

            if (!p) {
                out[i] = undefined;
                continue;
            }

            const id = _getPlayerId(p);

            out[i] = _isConnected(id) ? id : undefined;
        }

        return out;
    }

    /**
     * Finds all currently connected players.
     * If no buffers are provided, simply returns the connected player count with zero memory writes.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write connected player IDs into.
     * @param playersOut - Optional target array to write connected mod.Player objects into.
     * @returns The total number of connected players found.
     */
    export function findConnectedPlayers(
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersByFlag(FLAG_CONNECTED, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all currently active (spawned) players with valid 3D coordinates.
     * If no buffers are provided, simply returns the active player count with zero memory writes.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players found.
     */
    export function findActivePlayers(
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersByFlag(FLAG_ACTIVE, filterFn, idsOut, playersOut);
    }

    // =========================================================================
    // Exposed Distance Functions
    // =========================================================================

    /**
     * Returns the squared 3D Euclidean distance in meters squared (m^2) between two active players.
     * Avoids square root overhead.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The squared distance in meters squared, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    export function getDistanceSq(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined {
        const idA = _getPlayerId(playerA);
        const idB = _getPlayerId(playerB);

        if (!_isConnected(idA) || !_isConnected(idB)) return undefined;

        if (!_isActive(idA) || !_isActive(idB)) return Infinity;

        const dx = posX[idA] - posX[idB];
        const dy = posY[idA] - posY[idB];
        const dz = posZ[idA] - posZ[idB];

        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Returns the 3D Euclidean distance in meters between two active players.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The distance in meters, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    export function getDistance(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined {
        const distSq = getDistanceSq(playerA, playerB);

        if (distSq === undefined) return undefined;

        return distSq === Infinity ? Infinity : Math.sqrt(distSq);
    }

    /**
     * Returns the squared 2D horizontal distance in meters squared (m^2) on the XZ plane between two active players.
     * Avoids square root overhead and ignores vertical elevation differences.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The horizontal squared distance in meters squared, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    export function getDistanceSqXZ(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined {
        const idA = _getPlayerId(playerA);
        const idB = _getPlayerId(playerB);

        if (!_isConnected(idA) || !_isConnected(idB)) return undefined;

        if (!_isActive(idA) || !_isActive(idB)) return Infinity;

        const dx = posX[idA] - posX[idB];
        const dz = posZ[idA] - posZ[idB];

        return dx * dx + dz * dz;
    }

    /**
     * Returns the 2D horizontal distance in meters on the XZ plane between two active players.
     * Ignores vertical elevation differences.
     * @param playerA - The first player slot ID (0-99) or engine mod.Player object.
     * @param playerB - The second player slot ID (0-99) or engine mod.Player object.
     * @returns The horizontal distance in meters, Infinity if either player is inactive, or undefined if either player is not connected.
     */
    export function getDistanceXZ(playerA: number | mod.Player, playerB: number | mod.Player): number | undefined {
        const distSq = getDistanceSqXZ(playerA, playerB);

        if (distSq === undefined) return undefined;

        return distSq === Infinity ? Infinity : Math.sqrt(distSq);
    }

    // =========================================================================
    // Exposed Proximity Query Functions
    // =========================================================================

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
    export function findPlayersInSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        if (radiusMeters <= 0) return 0;

        const radiusSq = radiusMeters * radiusMeters;
        const minGx = Math.floor((x - radiusMeters) / VOXEL_SIZE);
        const maxGx = Math.floor((x + radiusMeters) / VOXEL_SIZE);
        const minGy = Math.floor((y - radiusMeters) / VOXEL_SIZE);
        const maxGy = Math.floor((y + radiusMeters) / VOXEL_SIZE);
        const minGz = Math.floor((z - radiusMeters) / VOXEL_SIZE);
        const maxGz = Math.floor((z + radiusMeters) / VOXEL_SIZE);

        // Advance query token for visit stamping
        ++queryToken;

        if (queryToken === 0xffffffff) {
            queryVisited.fill(0);
            queryToken = 1;
        }

        const currentToken = queryToken;
        let count = 0;

        for (let gx = minGx; gx <= maxGx; ++gx) {
            for (let gy = minGy; gy <= maxGy; ++gy) {
                for (let gz = minGz; gz <= maxGz; ++gz) {
                    const hash = _hashVoxel(gx, gy, gz);

                    for (let pId = gridHead[hash]; pId !== -1; pId = nextPlayer[pId]) {
                        if (queryVisited[pId] === currentToken) continue;

                        queryVisited[pId] = currentToken;

                        if (!_isActive(pId)) continue;

                        const dx = posX[pId] - x;
                        const dy = posY[pId] - y;
                        const dz = posZ[pId] - z;

                        if (dx * dx + dy * dy + dz * dz > radiusSq) continue;

                        const p = _players[pId]!;

                        if (filterFn && !filterFn(p, pId)) continue;

                        if (idsOut) {
                            idsOut[count] = pId;
                        }

                        if (playersOut) {
                            playersOut[count] = p;
                        }

                        ++count;
                    }
                }
            }
        }

        return count;
    }

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
    export function findPlayersOutsideSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        const radiusSq = radiusMeters * radiusMeters;
        let count = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            const dx = posX[id] - x;
            const dy = posY[id] - y;
            const dz = posZ[id] - z;

            if (dx * dx + dy * dy + dz * dz <= radiusSq) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

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
    export function findPlayersInCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        if (radiusMeters <= 0) return 0;

        const radiusSq = radiusMeters * radiusMeters;
        const minX = centerX - radiusMeters;
        const maxX = centerX + radiusMeters;
        const minZ = centerZ - radiusMeters;
        const maxZ = centerZ + radiusMeters;

        const lx = _findLowerBound(sortedX, posX, minX);
        const ux = _findUpperBound(sortedX, posX, maxX);
        const lz = _findLowerBound(sortedZ, posZ, minZ);
        const uz = _findUpperBound(sortedZ, posZ, maxZ);

        const countX = ux >= lx ? ux - lx + 1 : 0;
        const countZ = uz >= lz ? uz - lz + 1 : 0;

        const bestSorted = countX <= countZ ? sortedX : sortedZ;
        const start = countX <= countZ ? lx : lz;
        const end = countX <= countZ ? ux : uz;
        let count = 0;

        for (let i = start; i <= end; ++i) {
            const id = bestSorted[i];

            if (!_isActive(id) || posY[id] < minY || posY[id] > maxY) continue;

            const dx = posX[id] - centerX;
            const dz = posZ[id] - centerZ;

            if (dx * dx + dz * dz > radiusSq) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

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
    export function findPlayersOutsideCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        const radiusSq = radiusMeters * radiusMeters;
        let count = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            const y = posY[id];

            if (y < minY || y > maxY) {
                if (idsOut) {
                    idsOut[count] = id;
                }

                if (playersOut) {
                    playersOut[count] = p;
                }

                ++count;

                continue;
            }

            const dx = posX[id] - centerX;
            const dz = posZ[id] - centerZ;

            if (dx * dx + dz * dz > radiusSq) {
                if (idsOut) {
                    idsOut[count] = id;
                }

                if (playersOut) {
                    playersOut[count] = p;
                }

                ++count;
            }
        }

        return count;
    }

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
    export function findPlayersInAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        // Binary search bounds across all 3 sorted axes
        const lx = _findLowerBound(sortedX, posX, minX);
        const ux = _findUpperBound(sortedX, posX, maxX);

        const ly = _findLowerBound(sortedY, posY, minY);
        const uy = _findUpperBound(sortedY, posY, maxY);

        const lz = _findLowerBound(sortedZ, posZ, minZ);
        const uz = _findUpperBound(sortedZ, posZ, maxZ);

        const countX = ux >= lx ? ux - lx + 1 : 0;
        const countY = uy >= ly ? uy - ly + 1 : 0;
        const countZ = uz >= lz ? uz - lz + 1 : 0;

        // Disjoint axis: zero players can possibly match
        if (countX === 0 || countY === 0 || countZ === 0) return 0;

        // Pick whichever sorted axis has the fewest candidate elements
        let sorted = sortedZ;
        let start = lz;
        let end = uz;

        if (countX <= countY && countX <= countZ) {
            sorted = sortedX;
            start = lx;
            end = ux;
        } else if (countY <= countX && countY <= countZ) {
            sorted = sortedY;
            start = ly;
            end = uy;
        }

        let count = 0;

        for (let i = start; i <= end; ++i) {
            const id = sorted[i];

            if (!_isActive(id)) continue;

            if (posX[id] < minX || posX[id] > maxX) continue;

            if (posY[id] < minY || posY[id] > maxY) continue;

            if (posZ[id] < minZ || posZ[id] > maxZ) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

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
    export function findPlayersOutsideAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        let count = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            const x = posX[id];
            const y = posY[id];
            const z = posZ[id];

            if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = p;
            }

            ++count;
        }

        return count;
    }

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
    export function findPlayersInPrism(
        vertices: PrismVertex[],
        minY: number = -Infinity,
        maxY: number = Infinity,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number | undefined {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        const vertCount = vertices.length;

        if (vertCount < 3 || vertCount > MAX_PRISM_VERTICES) {
            logging.log(`Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`, LogLevel.Warning);
            return undefined;
        }

        _unpackVertices(vertices, _scratchCoords, _scratchPrismBounds);

        // 1. Let findPlayersInAABB perform Sweep-and-Prune candidate selection using internal scratch
        const candidateCount = findPlayersInAABB(
            _scratchPrismBounds.minX,
            minY,
            _scratchPrismBounds.minZ,
            _scratchPrismBounds.maxX,
            maxY,
            _scratchPrismBounds.maxZ,
            filterFn,
            _internalScratchIds
        );

        // 2. In-place filter candidate players against the 2D polygon with Zero-GC
        let count = 0;

        for (let i = 0; i < candidateCount; ++i) {
            const id = _internalScratchIds[i];

            if (!_isPointInPolygon(posX[id], posZ[id], _scratchCoords, vertCount)) continue;

            if (idsOut) {
                idsOut[count] = id;
            }

            if (playersOut) {
                playersOut[count] = _players[id]!;
            }

            ++count;
        }

        return count;
    }

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
    export function findPlayersOutsidePrism(
        vertices: PrismVertex[],
        minY: number = -Infinity,
        maxY: number = Infinity,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number | undefined {
        if (idsOut) {
            idsOut.length = 0;
        }

        if (playersOut) {
            playersOut.length = 0;
        }

        const vertCount = vertices.length;

        if (vertCount < 3 || vertCount > MAX_PRISM_VERTICES) {
            logging.log(`Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`, LogLevel.Warning);
            return undefined;
        }

        _unpackVertices(vertices, _scratchCoords, _scratchPrismBounds);

        const minX = _scratchPrismBounds.minX;
        const maxX = _scratchPrismBounds.maxX;
        const minZ = _scratchPrismBounds.minZ;
        const maxZ = _scratchPrismBounds.maxZ;
        let count = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (filterFn && !filterFn(p, id)) continue;

            const y = posY[id];

            if (y < minY || y > maxY) {
                if (idsOut) {
                    idsOut[count] = id;
                }

                if (playersOut) {
                    playersOut[count] = p;
                }

                ++count;

                continue;
            }

            const x = posX[id];
            const z = posZ[id];

            if (x < minX || x > maxX || z < minZ || z > maxZ) {
                if (idsOut) {
                    idsOut[count] = id;
                }

                if (playersOut) {
                    playersOut[count] = p;
                }

                ++count;

                continue;
            }

            if (!_isPointInPolygon(x, z, _scratchCoords, vertCount)) {
                if (idsOut) {
                    idsOut[count] = id;
                }

                if (playersOut) {
                    playersOut[count] = p;
                }

                ++count;
            }
        }

        return count;
    }

    // =========================================================================
    // Exposed Directional & Extremum Query Functions
    // =========================================================================

    /**
     * Finds all active players located at or above a given Y elevation (altitude).
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param y - The elevation threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players at or above the elevation.
     */
    export function findPlayersAbove(
        y: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersGte(sortedY, posY, y, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all active players located at or below a given Y elevation (altitude).
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param y - The elevation threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players at or below the elevation.
     */
    export function findPlayersBelow(
        y: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersLte(sortedY, posY, y, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all active players located east of (positive X) a given X coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - The X coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players east of the coordinate.
     */
    export function findPlayersEastOf(
        x: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersGte(sortedX, posX, x, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all active players located west of (negative X) a given X coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param x - The X coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players west of the coordinate.
     */
    export function findPlayersWestOf(
        x: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersLte(sortedX, posX, x, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all active players located north of (negative Z) a given Z coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param z - The Z coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players north of the coordinate.
     */
    export function findPlayersNorthOf(
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersLte(sortedZ, posZ, z, filterFn, idsOut, playersOut);
    }

    /**
     * Finds all active players located south of (positive Z) a given Z coordinate.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param z - The Z coordinate threshold in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of active players south of the coordinate.
     */
    export function findPlayersSouthOf(
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _findPlayersGte(sortedZ, posZ, z, filterFn, idsOut, playersOut);
    }

    /**
     * Finds the single closest active player to a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the closest player, or undefined if no active player satisfies the condition.
     */
    export function getClosestPlayerId(
        x: number,
        y: number,
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean
    ): number | undefined {
        return _getExtremumPlayer(x, y, z, true, filterFn);
    }

    /**
     * Finds the single farthest active player from a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the farthest player, or undefined if no active player satisfies the condition.
     */
    export function getFarthestPlayerId(
        x: number,
        y: number,
        z: number,
        filterFn?: (player: mod.Player, id: number) => boolean
    ): number | undefined {
        return _getExtremumPlayer(x, y, z, false, filterFn);
    }

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
    export function findKClosestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _getKExtremumDistancePlayers(x, y, z, k, true, filterFn, idsOut, playersOut);
    }

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
    export function findKFarthestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _getKExtremumDistancePlayers(x, y, z, k, false, filterFn, idsOut, playersOut);
    }

    /**
     * Gets the highest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the highest active player, or undefined if no active player satisfies the condition.
     */
    export function getHighestPlayerId(filterFn?: (player: mod.Player, id: number) => boolean): number | undefined {
        for (let i = MAX_PLAYERS - 1; i >= 0; --i) {
            const id = sortedY[i];

            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (!filterFn || filterFn(p, id)) return id;
        }

        return undefined;
    }

    /**
     * Gets the lowest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @returns The ID of the lowest active player, or undefined if no active player satisfies the condition.
     */
    export function getLowestPlayerId(filterFn?: (player: mod.Player, id: number) => boolean): number | undefined {
        for (let i = 0; i < MAX_PLAYERS; ++i) {
            const id = sortedY[i];

            if (!_isActive(id)) continue;

            const p = _players[id]!;

            if (!filterFn || filterFn(p, id)) return id;
        }

        return undefined;
    }

    /**
     * Finds the 'k' highest altitude active players, sorted from highest to lowest.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param k - Number of highest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    export function findKHighestPlayers(
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _getKExtremes(sortedY, k, true, filterFn, idsOut, playersOut);
    }

    /**
     * Finds the 'k' lowest altitude active players, sorted from lowest to highest.
     * If no buffers are provided, simply returns the matching count with zero memory writes.
     * @param k - Number of lowest players to find.
     * @param filterFn - Optional filter predicate returning true for candidates to consider. Receives (player, id).
     * @param idsOut - Optional target array to write active player IDs into.
     * @param playersOut - Optional target array to write active mod.Player objects into.
     * @returns The total number of players found (up to k).
     */
    export function findKLowestPlayers(
        k: number,
        filterFn?: (player: mod.Player, id: number) => boolean,
        idsOut?: number[],
        playersOut?: mod.Player[]
    ): number {
        return _getKExtremes(sortedY, k, false, filterFn, idsOut, playersOut);
    }

    // =========================================================================
    // Exposed Proximity Check Functions
    // =========================================================================

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
    export function isPlayerInCylinder(
        player: number | mod.Player,
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        const y = posY[id];

        if (y < minY || y > maxY) return false;

        const dx = posX[id] - centerX;
        const dz = posZ[id] - centerZ;

        return dx * dx + dz * dz <= radiusMeters * radiusMeters;
    }

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
    export function isPlayerOutsideCylinder(
        player: number | mod.Player,
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        return !isPlayerInCylinder(id, centerX, centerZ, radiusMeters, minY, maxY);
    }

    /**
     * Checks if an active player lies within a 3D sphere.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Sphere center X coordinate in world meters.
     * @param centerY - Sphere center Y coordinate in world meters.
     * @param centerZ - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @returns True if active and inside, false if active and outside or inactive, or undefined if not connected.
     */
    export function isPlayerInSphere(
        player: number | mod.Player,
        centerX: number,
        centerY: number,
        centerZ: number,
        radiusMeters: number
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        const dx = posX[id] - centerX;
        const dy = posY[id] - centerY;
        const dz = posZ[id] - centerZ;

        return dx * dx + dy * dy + dz * dz <= radiusMeters * radiusMeters;
    }

    /**
     * Checks if an active player lies strictly outside a 3D sphere.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param centerX - Sphere center X coordinate in world meters.
     * @param centerY - Sphere center Y coordinate in world meters.
     * @param centerZ - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @returns True if active and outside, false if active and inside or inactive, or undefined if not connected.
     */
    export function isPlayerOutsideSphere(
        player: number | mod.Player,
        centerX: number,
        centerY: number,
        centerZ: number,
        radiusMeters: number
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        return !isPlayerInSphere(id, centerX, centerY, centerZ, radiusMeters);
    }

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
    export function isPlayerInAABB(
        player: number | mod.Player,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        const x = posX[id];
        const y = posY[id];
        const z = posZ[id];

        return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    }

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
    export function isPlayerOutsideAABB(
        player: number | mod.Player,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number
    ): boolean | undefined {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        return !isPlayerInAABB(id, minX, minY, minZ, maxX, maxY, maxZ);
    }

    /**
     * Checks if an active player lies within a 2.5D polygonal prism (extruded polygon on XZ plane with vertical Y bounds).
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and inside, false if active and outside or inactive, undefined if not connected, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    export function isPlayerInPrism(
        player: number | mod.Player,
        vertices: PrismVertex[],
        minY: number = -Infinity,
        maxY: number = Infinity
    ): boolean | undefined | null {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        const count = vertices.length;

        if (count < 3 || count > MAX_PRISM_VERTICES) {
            logging.log(`Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`, LogLevel.Warning);
            return null;
        }

        _unpackVertices(vertices, _scratchCoords, _scratchPrismBounds);

        if (
            !isPlayerInAABB(
                id,
                _scratchPrismBounds.minX,
                minY,
                _scratchPrismBounds.minZ,
                _scratchPrismBounds.maxX,
                maxY,
                _scratchPrismBounds.maxZ
            )
        ) {
            return false;
        }

        return _isPointInPolygon(posX[id], posZ[id], _scratchCoords, count);
    }

    /**
     * Checks if an active player lies strictly outside a 2.5D polygonal prism.
     * @param player - The player slot ID (0-99) or engine mod.Player object.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Optional minimum Y elevation bound in meters (default: -Infinity).
     * @param maxY - Optional maximum Y elevation bound in meters (default: Infinity).
     * @returns True if active and outside, false if active and inside or inactive, undefined if not connected, or null if the vertices array is invalid (< 3 or > 32 vertices).
     */
    export function isPlayerOutsidePrism(
        player: number | mod.Player,
        vertices: PrismVertex[],
        minY: number = -Infinity,
        maxY: number = Infinity
    ): boolean | undefined | null {
        const id = _getPlayerId(player);

        if (!_isConnected(id)) return undefined;

        if (!_isActive(id)) return false;

        const count = vertices.length;

        if (count < 3 || count > MAX_PRISM_VERTICES) {
            logging.log(`Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`, LogLevel.Warning);
            return null;
        }

        const isInside = isPlayerInPrism(id, vertices, minY, maxY);

        return typeof isInside === 'boolean' ? !isInside : isInside;
    }

    // =========================================================================
    // Exposed Reactive Event Subscriptions
    // =========================================================================

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
    export function onSphere(
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
    export function onSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): SphereHandle;
    /**
     * Implementation for {@link onSphere} subscriptions.
     * @param x - Sphere center X coordinate in world meters.
     * @param y - Sphere center Y coordinate in world meters.
     * @param z - Sphere center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param onEnter - Optional callback invoked when a player enters the sphere.
     * @param onExit - Optional callback invoked when a player exits the sphere.
     * @returns A {@link SphereHandle} to update parameters or unsubscribe.
     */
    export function onSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        onEnter?: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): SphereHandle {
        const listener: SphereListener = {
            centerX: x,
            centerY: y,
            centerZ: z,
            radiusSq: radiusMeters * radiusMeters,
            onEnter,
            onExit,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        };

        sphereListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = sphereListeners.indexOf(listener);

                if (idx !== -1) {
                    sphereListeners.splice(idx, 1);
                }
            },
            update(newX: number, newY: number, newZ: number, newRadius?: number): void {
                listener.centerX = newX;
                listener.centerY = newY;
                listener.centerZ = newZ;

                if (newRadius !== undefined) {
                    listener.radiusSq = newRadius * newRadius;
                }
            },
        };
    }

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
    export function onCylinder(
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
    export function onCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): CylinderHandle;
    /**
     * Implementation for {@link onCylinder} subscriptions.
     * @param centerX - Cylinder center X coordinate in world meters.
     * @param centerZ - Center Z coordinate in world meters.
     * @param radiusMeters - Cylinder radius in meters.
     * @param minY - Minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Maximum Y elevation in meters (default: Infinity).
     * @param onEnter - Optional callback invoked when a player enters the cylinder.
     * @param onExit - Optional callback invoked when a player exits the cylinder.
     * @returns A {@link CylinderHandle} to update parameters or unsubscribe.
     */
    export function onCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity,
        onEnter?: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): CylinderHandle {
        const listener: CylinderListener = {
            centerX,
            centerZ,
            radiusSq: radiusMeters * radiusMeters,
            minY: minY !== undefined ? minY : -Infinity,
            maxY: maxY !== undefined ? maxY : Infinity,
            onEnter,
            onExit,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        };

        cylinderListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = cylinderListeners.indexOf(listener);

                if (idx !== -1) {
                    cylinderListeners.splice(idx, 1);
                }
            },
            update(
                newCenterX: number,
                newCenterZ: number,
                newRadius?: number,
                newMinY?: number,
                newMaxY?: number
            ): void {
                listener.centerX = newCenterX;
                listener.centerZ = newCenterZ;

                if (newRadius !== undefined) {
                    listener.radiusSq = newRadius * newRadius;
                }

                if (newMinY !== undefined) {
                    listener.minY = newMinY;
                }

                if (newMaxY !== undefined) {
                    listener.maxY = newMaxY;
                }
            },
        };
    }

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
    export function onAABB(
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
    export function onAABB(
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
     * Implementation for {@link onAABB} subscriptions.
     * @param minX - Minimum X coordinate in world meters.
     * @param minY - Minimum Y coordinate in world meters.
     * @param minZ - Minimum Z coordinate in world meters.
     * @param maxX - Maximum X coordinate in world meters.
     * @param maxY - Maximum Y coordinate in world meters.
     * @param maxZ - Maximum Z coordinate in world meters.
     * @param onEnter - Optional callback invoked when a player enters the box.
     * @param onExit - Optional callback invoked when a player exits the box.
     * @returns An {@link AABBHandle} to update parameters or unsubscribe.
     */
    export function onAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        onEnter?: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): AABBHandle {
        const listener: AABBListener = {
            minX,
            minY,
            minZ,
            maxX,
            maxY,
            maxZ,
            onEnter,
            onExit,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        };

        aabbListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = aabbListeners.indexOf(listener);

                if (idx !== -1) {
                    aabbListeners.splice(idx, 1);
                }
            },
            update(
                newMinX: number,
                newMinY: number,
                newMinZ: number,
                newMaxX: number,
                newMaxY: number,
                newMaxZ: number
            ): void {
                listener.minX = newMinX;
                listener.minY = newMinY;
                listener.minZ = newMinZ;
                listener.maxX = newMaxX;
                listener.maxY = newMaxY;
                listener.maxZ = newMaxZ;
            },
        };
    }

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
    export function onPrism(
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
    export function onPrism(
        vertices: PrismVertex[],
        minY: number | undefined,
        maxY: number | undefined,
        onEnter: undefined,
        onExit: PlayerZoneCallback
    ): PrismHandle | null;
    /**
     * Implementation for {@link onPrism} subscriptions.
     * @param vertices - Array of polygon vertices ({x, z}). Capped at 32 vertices.
     * @param minY - Minimum Y elevation in meters (default: -Infinity).
     * @param maxY - Maximum Y elevation in meters (default: Infinity).
     * @param onEnter - Optional callback invoked when a player enters the prism volume.
     * @param onExit - Optional callback invoked when a player exits the prism volume.
     * @returns A {@link PrismHandle} to update parameters or unsubscribe, or null if vertices are invalid (< 3 or > 32 vertices).
     */
    export function onPrism(
        vertices: PrismVertex[],
        minY: number = -Infinity,
        maxY: number = Infinity,
        onEnter?: PlayerZoneCallback,
        onExit?: PlayerZoneCallback
    ): PrismHandle | null {
        const count = vertices.length;

        if (count < 3 || count > MAX_PRISM_VERTICES) {
            logging.log(`Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`, LogLevel.Warning);
            return null;
        }

        const coords = new Float32Array(MAX_PRISM_VERTICES * 2);
        _unpackVertices(vertices, coords, _scratchPrismBounds);

        const listener: PrismListener = {
            coords,
            vertexCount: count,
            minX: _scratchPrismBounds.minX,
            maxX: _scratchPrismBounds.maxX,
            minZ: _scratchPrismBounds.minZ,
            maxZ: _scratchPrismBounds.maxZ,
            minY: minY !== undefined ? minY : -Infinity,
            maxY: maxY !== undefined ? maxY : Infinity,
            onEnter,
            onExit,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        };

        prismListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = prismListeners.indexOf(listener);

                if (idx !== -1) {
                    prismListeners.splice(idx, 1);
                }
            },
            update(newVertices: PrismVertex[], newMinY?: number, newMaxY?: number): void {
                const newCount = newVertices.length;

                if (newCount < 3 || newCount > MAX_PRISM_VERTICES) {
                    logging.log(
                        `Polygonal prism requires between 3 and ${MAX_PRISM_VERTICES} vertices.`,
                        LogLevel.Warning
                    );

                    listener.vertexCount = 0;
                } else {
                    _unpackVertices(newVertices, listener.coords, _scratchPrismBounds);

                    listener.vertexCount = newCount;
                    listener.minX = _scratchPrismBounds.minX;
                    listener.maxX = _scratchPrismBounds.maxX;
                    listener.minZ = _scratchPrismBounds.minZ;
                    listener.maxZ = _scratchPrismBounds.maxZ;
                }

                if (newMinY !== undefined) {
                    listener.minY = newMinY;
                }

                if (newMaxY !== undefined) {
                    listener.maxY = newMaxY;
                }
            },
        };
    }

    function _createPlaneHandle(listener: PlaneListener): PlaneHandle {
        planeListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = planeListeners.indexOf(listener);

                if (idx !== -1) {
                    planeListeners.splice(idx, 1);
                }
            },
            update(newThreshold: number): void {
                listener.threshold = newThreshold;
            },
        };
    }

    /**
     * Subscribes to events when any player crosses an altitude threshold (Y elevation).
     * At least one callback (onAbove or onBelow) must be provided.
     * @param y - Elevation threshold in world meters.
     * @param onAbove - Callback invoked when crossing at or above the elevation.
     * @param onBelow - Optional callback invoked when crossing below the elevation.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossAltitude(y: number, onAbove: PlayerZoneCallback, onBelow?: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses below an altitude threshold (Y elevation).
     * @param y - Elevation threshold in world meters.
     * @param onAbove - Explicitly undefined to indicate no above callback.
     * @param onBelow - Callback invoked when crossing below the elevation.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossAltitude(y: number, onAbove: undefined, onBelow: PlayerZoneCallback): PlaneHandle;
    /**
     * Implementation for {@link onCrossAltitude} subscriptions.
     * @param y - Elevation threshold in world meters.
     * @param onAbove - Optional callback invoked when crossing at or above the elevation.
     * @param onBelow - Optional callback invoked when crossing below the elevation.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossAltitude(
        y: number,
        onAbove?: PlayerZoneCallback,
        onBelow?: PlayerZoneCallback
    ): PlaneHandle {
        return _createPlaneHandle({
            axis: AxisType.Y,
            threshold: y,
            onEnter: onAbove,
            onExit: onBelow,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        });
    }

    /**
     * Subscribes to events when any player crosses an East-West threshold (X axis).
     * At least one callback (onEast or onWest) must be provided.
     * @param x - X coordinate threshold in world meters.
     * @param onEast - Callback invoked when crossing east (+X) of the coordinate.
     * @param onWest - Optional callback invoked when crossing west (-X) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossEastWest(x: number, onEast: PlayerZoneCallback, onWest?: PlayerZoneCallback): PlaneHandle;
    /**
     * Subscribes to events when any player crosses west of an East-West threshold (X axis).
     * @param x - X coordinate threshold in world meters.
     * @param onEast - Explicitly undefined to indicate no east callback.
     * @param onWest - Callback invoked when crossing west (-X) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossEastWest(x: number, onEast: undefined, onWest: PlayerZoneCallback): PlaneHandle;
    /**
     * Implementation for {@link onCrossEastWest} subscriptions.
     * @param x - X coordinate threshold in world meters.
     * @param onEast - Optional callback invoked when crossing east (+X) of the coordinate.
     * @param onWest - Optional callback invoked when crossing west (-X) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossEastWest(x: number, onEast?: PlayerZoneCallback, onWest?: PlayerZoneCallback): PlaneHandle {
        return _createPlaneHandle({
            axis: AxisType.X,
            threshold: x,
            onEnter: onEast,
            onExit: onWest,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        });
    }

    /**
     * Subscribes to events when any player crosses a North-South threshold (Z axis).
     * At least one callback (onSouth or onNorth) must be provided.
     * @param z - Z coordinate threshold in world meters.
     * @param onSouth - Callback invoked when crossing south (+Z) of the coordinate.
     * @param onNorth - Optional callback invoked when crossing north (-Z) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossNorthSouth(
        z: number,
        onSouth: PlayerZoneCallback,
        onNorth?: PlayerZoneCallback
    ): PlaneHandle;
    /**
     * Subscribes to events when any player crosses north of a North-South threshold (Z axis).
     * @param z - Z coordinate threshold in world meters.
     * @param onSouth - Explicitly undefined to indicate no south callback.
     * @param onNorth - Callback invoked when crossing north (-Z) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossNorthSouth(z: number, onSouth: undefined, onNorth: PlayerZoneCallback): PlaneHandle;
    /**
     * Implementation for {@link onCrossNorthSouth} subscriptions.
     * @param z - Z coordinate threshold in world meters.
     * @param onSouth - Optional callback invoked when crossing south (+Z) of the coordinate.
     * @param onNorth - Optional callback invoked when crossing north (-Z) of the coordinate.
     * @returns A {@link PlaneHandle} to update parameters or unsubscribe.
     */
    export function onCrossNorthSouth(
        z: number,
        onSouth?: PlayerZoneCallback,
        onNorth?: PlayerZoneCallback
    ): PlaneHandle {
        return _createPlaneHandle({
            axis: AxisType.Z,
            threshold: z,
            onEnter: onSouth,
            onExit: onNorth,
            mask0: 0,
            mask1: 0,
            mask2: 0,
            mask3: 0,
        });
    }

    function _createExtremaHandle(listener: ExtremaListener): ExtremaHandle {
        extremaListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = extremaListeners.indexOf(listener);

                if (idx !== -1) {
                    extremaListeners.splice(idx, 1);
                }
            },
        };
    }

    function _createTargetExtremaHandle(listener: ExtremaListener): TargetExtremaHandle {
        extremaListeners.push(listener);

        return {
            unsubscribe(): void {
                const idx = extremaListeners.indexOf(listener);

                if (idx !== -1) {
                    extremaListeners.splice(idx, 1);
                }
            },
            update(newX: number, newY: number, newZ: number): void {
                listener.x = newX;
                listener.y = newY;
                listener.z = newZ;
            },
        };
    }

    /**
     * Subscribes to events when the identity of the highest altitude active player changes.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    export function onHighestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle {
        return _createExtremaHandle({
            type: ExtremaType.Highest,
            callback,
            x: 0,
            y: 0,
            z: 0,
            lastPlayerId: getHighestPlayerId(),
        });
    }

    /**
     * Subscribes to events when the identity of the lowest altitude active player changes.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    export function onLowestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle {
        return _createExtremaHandle({
            type: ExtremaType.Lowest,
            callback,
            x: 0,
            y: 0,
            z: 0,
            lastPlayerId: getLowestPlayerId(),
        });
    }

    /**
     * Subscribes to events when the identity of the closest active player to a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns A {@link TargetExtremaHandle} to update target coordinates or unsubscribe.
     */
    export function onClosestPlayerChanged(
        x: number,
        y: number,
        z: number,
        callback: PlayerExtremaCallback
    ): TargetExtremaHandle {
        return _createTargetExtremaHandle({
            type: ExtremaType.Closest,
            callback,
            x,
            y,
            z,
            lastPlayerId: getClosestPlayerId(x, y, z),
        });
    }

    /**
     * Subscribes to events when the identity of the farthest active player from a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newPlayer, prevPlayer, newPlayerId, prevPlayerId).
     * @returns A {@link TargetExtremaHandle} to update target coordinates or unsubscribe.
     */
    export function onFarthestPlayerChanged(
        x: number,
        y: number,
        z: number,
        callback: PlayerExtremaCallback
    ): TargetExtremaHandle {
        return _createTargetExtremaHandle({
            type: ExtremaType.Farthest,
            callback,
            x,
            y,
            z,
            lastPlayerId: getFarthestPlayerId(x, y, z),
        });
    }
}
