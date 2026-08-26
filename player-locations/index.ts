import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace PlayerLocations {
    // =========================================================================
    // Types & Callback Signatures
    // =========================================================================

    /** Callback invoked when a player enters or exits a spatial zone or crosses a boundary. */
    export type PlayerZoneCallback = (playerId: number) => Promise<void> | void;

    /** Callback invoked when the identity of an extremum player changes. */
    export type PlayerExtremaCallback = (
        newPlayerId: number | null,
        prevPlayerId: number | null
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
        lastPlayerId: number | null;
    }

    // =========================================================================
    // Configuration & Pre-Allocated Storage (Zero-GC)
    // =========================================================================

    /** Maximum supported player slots in Battlefield 6 Portal (0-99). */
    export const MAX_PLAYERS = 100;

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

    // --- Reusable Output & Scratch Buffers (Zero Heap Allocations) ---
    const queryResultBuffer: number[] = [];
    const _scratchPos: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

    // Pre-allocated Heap Buffers for K-Closest / K-Farthest queries
    const heapDist = new Float64Array(MAX_PLAYERS);
    const heapId = new Uint8Array(MAX_PLAYERS);

    // Event Subscriptions Storage (Separated by Geometry Type for Monomorphic Efficiency)
    const logging = new Logging('PL');
    const sphereListeners: SphereListener[] = [];
    const cylinderListeners: CylinderListener[] = [];
    const aabbListeners: AABBListener[] = [];
    const planeListeners: PlaneListener[] = [];
    const extremaListeners: ExtremaListener[] = [];

    // Track initialization state
    let _initializedPlayers = false;

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

    function _getPlayerId(player: number | mod.Player): number {
        if (typeof player === 'number') return player >= 0 && player < MAX_PLAYERS ? player : -1;

        const id = mod.GetObjId(player);

        if (id === undefined) return -1;

        return id >= 0 && id < MAX_PLAYERS ? id : -1;
    }

    function _isConnected(id: number): boolean {
        return id >= 0 && id < MAX_PLAYERS && (stateFlags[id] & FLAG_CONNECTED) !== 0;
    }

    function _isActive(id: number): boolean {
        return id >= 0 && id < MAX_PLAYERS && (stateFlags[id] & FLAG_ACTIVE) !== 0;
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

        if (wasInside && listener.onExit) {
            CallbackHandler.invoke(
                listener.onExit,
                id,
                undefined,
                undefined,
                undefined,
                logging,
                'clearPlayerPresence'
            );
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

        for (let i = 0; i < planeListeners.length; ++i) {
            _clearPlayerPresence(planeListeners[i], id);
        }
    }

    function _initConnectedPlayers(): void {
        _initializedPlayers = true;

        const all = mod.AllPlayers();
        const count = mod.CountOf(all);

        for (let i = 0; i < count; ++i) {
            const player = mod.ValueInArray(all, i) as mod.Player;
            const id = mod.GetObjId(player);

            if (id >= 0 && id < MAX_PLAYERS) {
                _setFlag(id, FLAG_CONNECTED);
            }
        }
    }

    function _countPlayersByFlag(flag: number): number {
        let count = 0;

        for (let i = 0; i < MAX_PLAYERS; ++i) {
            if ((stateFlags[i] & flag) !== 0) {
                ++count;
            }
        }

        return count;
    }

    function _getPlayersByFlag(flag: number, outArray: number[]): number[] {
        outArray.length = 0;

        for (let i = 0; i < MAX_PLAYERS; ++i) {
            if ((stateFlags[i] & flag) !== 0) {
                outArray.push(i);
            }
        }

        return outArray;
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    function _handlePlayerJoin(player: mod.Player): void {
        const id = mod.GetObjId(player);

        if (id < 0 || id >= MAX_PLAYERS) return;

        _setFlag(id, FLAG_CONNECTED);
    }

    function _handlePlayerLeave(id: number): void {
        if (id < 0 || id >= MAX_PLAYERS) return;

        _resetPlayer(id);
    }

    function _updateListenerPresence(listener: BasePresenceMask, id: number, isInsideNow: boolean): void {
        const wasInside = _updatePresence(listener, id, isInsideNow);

        if (!wasInside && isInsideNow) {
            if (!listener.onEnter) return;

            CallbackHandler.invoke(listener.onEnter, id, undefined, undefined, undefined, logging, 'onEnter');
        } else if (wasInside && !isInsideNow) {
            if (!listener.onExit) return;

            CallbackHandler.invoke(listener.onExit, id, undefined, undefined, undefined, logging, 'onExit');
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
            let currId: number | null = null;

            if (l.type === ExtremaType.Highest) {
                currId = getHighestPlayer();
            } else if (l.type === ExtremaType.Lowest) {
                currId = getLowestPlayer();
            } else if (l.type === ExtremaType.Closest) {
                currId = getClosestPlayer(l.x, l.y, l.z);
            } else if (l.type === ExtremaType.Farthest) {
                currId = getFarthestPlayer(l.x, l.y, l.z);
            }

            if (currId === l.lastPlayerId) continue;

            const prevId = l.lastPlayerId;
            l.lastPlayerId = currId;

            CallbackHandler.invoke(l.callback, currId, prevId, undefined, undefined, logging, 'onExtremaChange');
        }
    }

    function _handleTick(): void {
        if (!_initializedPlayers) {
            _initConnectedPlayers();
        }

        // Clear Grid Head Table
        gridHead.fill(-1);

        // Phase 1: Fetch positions for connected players, convert to scaled ints, update SoA & Grid
        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isConnected(id)) continue;

            const player = mod.GetPlayer(id);

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

        // Phase 2: Update 3 Sorted Axis Arrays via Insertion Sort (O(N) near-linear time)
        _insertionSort(sortedX, posX);
        _insertionSort(sortedY, posY);
        _insertionSort(sortedZ, posZ);

        // Phase 3: Evaluate Active Reactive Subscriptions (Zero-GC Bitmask Diffing)
        _evaluateSphereSubscriptions();
        _evaluateCylinderSubscriptions();
        _evaluateAabbSubscriptions();
        _evaluatePlaneSubscriptions();
        _evaluateExtremaSubscriptions();
    }

    Events.OngoingGlobal.subscribe(_handleTick);
    Events.OnPlayerJoinGame.subscribe(_handlePlayerJoin);
    Events.OnPlayerLeaveGame.subscribe(_handlePlayerLeave);

    // =========================================================================
    // Internal Helper Math & Sorting
    // =========================================================================

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

    function _getPlayersGte(
        sortedArray: Uint8Array,
        posArray: Float32Array,
        valMeters: number,
        outArray: number[]
    ): number[] {
        outArray.length = 0;

        const lx = _findLowerBound(sortedArray, posArray, valMeters);

        for (let i = lx; i < MAX_PLAYERS; ++i) {
            const id = sortedArray[i];

            if (_isActive(id)) {
                outArray.push(id);
            }
        }

        return outArray;
    }

    function _getPlayersLte(
        sortedArray: Uint8Array,
        posArray: Float32Array,
        valMeters: number,
        outArray: number[]
    ): number[] {
        outArray.length = 0;

        const ux = _findUpperBound(sortedArray, posArray, valMeters);

        for (let i = 0; i <= ux; ++i) {
            const id = sortedArray[i];

            if (_isActive(id)) {
                outArray.push(id);
            }
        }

        return outArray;
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
        filterFn?: (id: number) => boolean
    ): number | null {
        let bestId: number | null = null;
        let bestDistSq = findClosest ? Infinity : -1;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id) || (filterFn && !filterFn(id))) continue;

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
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        if (k <= 0) return outArray;

        const targetK = k > MAX_PLAYERS ? MAX_PLAYERS : k;
        let heapSize = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id) || (filterFn && !filterFn(id))) continue;

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

        outArray.length = heapSize;
        let currentSize = heapSize;

        for (let i = heapSize - 1; i >= 0; --i) {
            outArray[i] = heapId[0];

            if (i <= 0) break;

            _heapReplaceRoot(heapDist[currentSize - 1], heapId[currentSize - 1], currentSize - 1, isClosest);
            --currentSize;
        }

        return outArray;
    }

    function _getKExtremes(
        sortedArray: Uint8Array,
        k: number,
        reverse: boolean,
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        if (k <= 0) return outArray;

        const targetK = k > MAX_PLAYERS ? MAX_PLAYERS : k;
        let count = 0;

        if (reverse) {
            for (let i = MAX_PLAYERS - 1; i >= 0; --i) {
                const id = sortedArray[i];

                if (!_isActive(id) || (filterFn && !filterFn(id))) continue;

                outArray.push(id);

                if (++count === targetK) break;
            }
        } else {
            for (let i = 0; i < MAX_PLAYERS; ++i) {
                const id = sortedArray[i];

                if (!_isActive(id) || (filterFn && !filterFn(id))) continue;

                outArray.push(id);

                if (++count === targetK) break;
            }
        }

        return outArray;
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
     * Populates an array with the IDs of all currently connected players (Zero-GC).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of connected player IDs.
     */
    export function getConnectedPlayers(outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersByFlag(FLAG_CONNECTED, outArray);
    }

    /**
     * Populates an array with the IDs of all currently active (spawned) players (Zero-GC).
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs.
     */
    export function getActivePlayers(outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersByFlag(FLAG_ACTIVE, outArray);
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
     * Executes in O(cells) with ZERO Garbage Collection pressure and eliminates duplicate results.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param radiusMeters - Search sphere radius in meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs within the sphere radius.
     */
    export function getPlayersInSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        if (radiusMeters <= 0) return outArray;

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

        for (let gx = minGx; gx <= maxGx; ++gx) {
            for (let gy = minGy; gy <= maxGy; ++gy) {
                for (let gz = minGz; gz <= maxGz; ++gz) {
                    const hash = _hashVoxel(gx, gy, gz);
                    let pId = gridHead[hash];

                    while (pId !== -1) {
                        if (queryVisited[pId] !== currentToken) {
                            queryVisited[pId] = currentToken;

                            if (_isActive(pId)) {
                                const dx = posX[pId] - x;
                                const dy = posY[pId] - y;
                                const dz = posZ[pId] - z;

                                if (dx * dx + dy * dy + dz * dz <= radiusSq) {
                                    outArray.push(pId);
                                }
                            }
                        }

                        pId = nextPlayer[pId];
                    }
                }
            }
        }

        return outArray;
    }

    /**
     * Returns all active players outside a 3D sphere.
     * @param x - Center X coordinate in world meters.
     * @param y - Center Y coordinate in world meters.
     * @param z - Center Z coordinate in world meters.
     * @param radiusMeters - Sphere radius in meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs strictly outside the sphere.
     */
    export function getPlayersOutsideSphere(
        x: number,
        y: number,
        z: number,
        radiusMeters: number,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        const radiusSq = radiusMeters * radiusMeters;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const dx = posX[id] - x;
            const dy = posY[id] - y;
            const dz = posZ[id] - z;

            if (dx * dx + dy * dy + dz * dz > radiusSq) {
                outArray.push(id);
            }
        }

        return outArray;
    }

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
    export function getPlayersInCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        if (radiusMeters <= 0) return outArray;

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

        for (let i = start; i <= end; ++i) {
            const id = bestSorted[i];

            if (!_isActive(id) || posY[id] < minY || posY[id] > maxY) continue;

            const dx = posX[id] - centerX;
            const dz = posZ[id] - centerZ;

            if (dx * dx + dz * dz <= radiusSq) {
                outArray.push(id);
            }
        }

        return outArray;
    }

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
    export function getPlayersOutsideCylinder(
        centerX: number,
        centerZ: number,
        radiusMeters: number,
        minY: number = -Infinity,
        maxY: number = Infinity,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        const radiusSq = radiusMeters * radiusMeters;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const y = posY[id];

            if (y < minY || y > maxY) {
                outArray.push(id);
                continue;
            }

            const dx = posX[id] - centerX;
            const dz = posZ[id] - centerZ;

            if (dx * dx + dz * dz > radiusSq) {
                outArray.push(id);
            }
        }

        return outArray;
    }

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
    export function getPlayersInAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

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

        // Evaluate whichever axis has the fewest candidate elements
        if (countX <= countY && countX <= countZ) {
            for (let i = lx; i <= ux; ++i) {
                const id = sortedX[i];

                if (_isActive(id) && posY[id] >= minY && posY[id] <= maxY && posZ[id] >= minZ && posZ[id] <= maxZ) {
                    outArray.push(id);
                }
            }
        } else if (countY <= countX && countY <= countZ) {
            for (let i = ly; i <= uy; ++i) {
                const id = sortedY[i];

                if (_isActive(id) && posX[id] >= minX && posX[id] <= maxX && posZ[id] >= minZ && posZ[id] <= maxZ) {
                    outArray.push(id);
                }
            }
        } else {
            for (let i = lz; i <= uz; ++i) {
                const id = sortedZ[i];

                if (_isActive(id) && posX[id] >= minX && posX[id] <= maxX && posY[id] >= minY && posY[id] <= maxY) {
                    outArray.push(id);
                }
            }
        }

        return outArray;
    }

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
    export function getPlayersOutsideAABB(
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
        outArray: number[] = queryResultBuffer
    ): number[] {
        outArray.length = 0;

        for (let id = 0; id < MAX_PLAYERS; ++id) {
            if (!_isActive(id)) continue;

            const x = posX[id];
            const y = posY[id];
            const z = posZ[id];

            if (x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ) {
                outArray.push(id);
            }
        }

        return outArray;
    }

    // =========================================================================
    // Exposed Directional & Extremum Query Functions
    // =========================================================================

    /**
     * Returns all active players located at or above a given Y elevation (altitude).
     * @param y - The elevation threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs at or above the elevation.
     */
    export function getPlayersAbove(y: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersGte(sortedY, posY, y, outArray);
    }

    /**
     * Returns all active players located at or below a given Y elevation (altitude).
     * @param y - The elevation threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs at or below the elevation.
     */
    export function getPlayersBelow(y: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersLte(sortedY, posY, y, outArray);
    }

    /**
     * Returns all active players located east of (positive X) a given X coordinate.
     * @param x - The X coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs east of the coordinate.
     */
    export function getPlayersEastOf(x: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersGte(sortedX, posX, x, outArray);
    }

    /**
     * Returns all active players located west of (negative X) a given X coordinate.
     * @param x - The X coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs west of the coordinate.
     */
    export function getPlayersWestOf(x: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersLte(sortedX, posX, x, outArray);
    }

    /**
     * Returns all active players located north of (negative Z) a given Z coordinate.
     * @param z - The Z coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs north of the coordinate.
     */
    export function getPlayersNorthOf(z: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersLte(sortedZ, posZ, z, outArray);
    }

    /**
     * Returns all active players located south of (positive Z) a given Z coordinate.
     * @param z - The Z coordinate threshold in world meters.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of active player IDs south of the coordinate.
     */
    export function getPlayersSouthOf(z: number, outArray: number[] = queryResultBuffer): number[] {
        return _getPlayersGte(sortedZ, posZ, z, outArray);
    }

    /**
     * Finds the single closest active player to a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the closest player, or null if no active player satisfies the condition.
     */
    export function getClosestPlayer(
        x: number,
        y: number,
        z: number,
        filterFn?: (id: number) => boolean
    ): number | null {
        return _getExtremumPlayer(x, y, z, true, filterFn);
    }

    /**
     * Finds the single farthest active player from a 3D target point.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the farthest player, or null if no active player satisfies the condition.
     */
    export function getFarthestPlayer(
        x: number,
        y: number,
        z: number,
        filterFn?: (id: number) => boolean
    ): number | null {
        return _getExtremumPlayer(x, y, z, false, filterFn);
    }

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
    export function getKClosestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        return _getKExtremumDistancePlayers(x, y, z, k, true, filterFn, outArray);
    }

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
    export function getKFarthestPlayers(
        x: number,
        y: number,
        z: number,
        k: number,
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        return _getKExtremumDistancePlayers(x, y, z, k, false, filterFn, outArray);
    }

    /**
     * Gets the highest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the highest active player, or null if no active player satisfies the condition.
     */
    export function getHighestPlayer(filterFn?: (id: number) => boolean): number | null {
        for (let i = MAX_PLAYERS - 1; i >= 0; --i) {
            const id = sortedY[i];

            if (_isActive(id) && (!filterFn || filterFn(id))) return id;
        }

        return null;
    }

    /**
     * Gets the lowest altitude (Y axis) active player in near O(1) time using the Y-axis sorted array.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @returns The ID of the lowest active player, or null if no active player satisfies the condition.
     */
    export function getLowestPlayer(filterFn?: (id: number) => boolean): number | null {
        for (let i = 0; i < MAX_PLAYERS; ++i) {
            const id = sortedY[i];

            if (_isActive(id) && (!filterFn || filterFn(id))) return id;
        }

        return null;
    }

    /**
     * Returns the 'k' highest altitude active players, sorted from highest to lowest.
     * @param k - Number of highest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted from highest to lowest altitude.
     */
    export function getKHighestPlayers(
        k: number,
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        return _getKExtremes(sortedY, k, true, filterFn, outArray);
    }

    /**
     * Returns the 'k' lowest altitude active players, sorted from lowest to highest.
     * @param k - Number of lowest players to return.
     * @param filterFn - Optional filter predicate returning true for candidates to consider.
     * @param outArray - Optional target array to write results into. Defaults to reusable internal buffer.
     * @returns Array of player IDs sorted from lowest to highest altitude.
     */
    export function getKLowestPlayers(
        k: number,
        filterFn?: (id: number) => boolean,
        outArray: number[] = queryResultBuffer
    ): number[] {
        return _getKExtremes(sortedY, k, false, filterFn, outArray);
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
     * @param callback - Function invoked with (newHighestId, prevHighestId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    export function onHighestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle {
        return _createExtremaHandle({
            type: ExtremaType.Highest,
            callback,
            x: 0,
            y: 0,
            z: 0,
            lastPlayerId: getHighestPlayer(),
        });
    }

    /**
     * Subscribes to events when the identity of the lowest altitude active player changes.
     * @param callback - Function invoked with (newLowestId, prevLowestId).
     * @returns An {@link ExtremaHandle} to unsubscribe.
     */
    export function onLowestPlayerChanged(callback: PlayerExtremaCallback): ExtremaHandle {
        return _createExtremaHandle({
            type: ExtremaType.Lowest,
            callback,
            x: 0,
            y: 0,
            z: 0,
            lastPlayerId: getLowestPlayer(),
        });
    }

    /**
     * Subscribes to events when the identity of the closest active player to a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newClosestId, prevClosestId).
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
            lastPlayerId: getClosestPlayer(x, y, z),
        });
    }

    /**
     * Subscribes to events when the identity of the farthest active player from a 3D point changes.
     * @param x - Target X coordinate in world meters.
     * @param y - Target Y coordinate in world meters.
     * @param z - Target Z coordinate in world meters.
     * @param callback - Function invoked with (newFarthestId, prevFarthestId).
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
            lastPlayerId: getFarthestPlayer(x, y, z),
        });
    }
}
