import { Timers } from '../timers/index.ts';

// version: 1.0.0
export class Raycast {
    private static _nextRayId: number = 0;

    private static _state: Map<number, Raycast.PlayerState> = new Map();

    private static readonly _DISTANCE_EPSILON = 0.5; // 0.5 meters

    private static readonly _DEFAULT_TTL_MS = 2_000; // 2 Seconds

    private static readonly _PRUNE_INTERVAL_MS = 5_000; // 5 Seconds

    static {
        // Automatically prunes all player states every _PRUNE_INTERVAL_MS.
        Timers.setInterval(() => this.pruneAllStates(), this._PRUNE_INTERVAL_MS);
    }

    static cast(
        player: mod.Player,
        start: Raycast.Vector3,
        end: Raycast.Vector3,
        callbacks: Raycast.Callbacks<Raycast.Vector3>
    ): void;

    static cast(player: mod.Player, start: mod.Vector, end: mod.Vector, callbacks: Raycast.Callbacks<mod.Vector>): void;

    /**
     * Casts a ray with specific callbacks.
     *
     * @param player - The player to assign the ray to.
     * @param start - The start position of the ray.
     * @param end - The end position of the ray.
     * @param callbacks - The callbacks to be called (at least one must be provided).
     *   - `onHit`: The callback to be called when the ray hits a target.
     *   - `onMiss`: The callback to be called when the ray misses a target.
     */
    public static cast(
        player: mod.Player,
        start: Raycast.Vector3 | mod.Vector,
        end: Raycast.Vector3 | mod.Vector,
        callbacks: Raycast.Callbacks<mod.Vector | Raycast.Vector3>
    ): void {
        // Don't even fire the ray if someone ignores type safety (Optional, but good practice).
        if (typeof callbacks?.onHit !== 'function' && typeof callbacks?.onMiss !== 'function') return;

        const playerId = mod.GetObjId(player);

        if (!this._state.has(playerId)) {
            this._state.set(playerId, { pendingMisses: 0, rays: new Map() });
        }

        const state = this._state.get(playerId)!;

        this._prunePlayerState(state); // Lazy Cleanup: Remove expired rays before adding new ones.

        const nativeVectorReturn = !this._isVector3(start);

        let startVector3: Raycast.Vector3;
        let endVector3: Raycast.Vector3;
        let startVector: mod.Vector;
        let endVector: mod.Vector;

        // We check 'start' to decide the mode.
        if (nativeVectorReturn) {
            startVector3 = this._parseModVector(start as mod.Vector);
            endVector3 = this._parseModVector(end as mod.Vector);
            startVector = start as mod.Vector;
            endVector = end as mod.Vector;
        } else {
            startVector3 = start as Raycast.Vector3;
            endVector3 = end as Raycast.Vector3;
            startVector = mod.CreateVector(startVector3.x, startVector3.y, startVector3.z);
            endVector = mod.CreateVector(endVector3.x, endVector3.y, endVector3.z);
        }

        state.rays.set(this._nextRayId++, {
            start: startVector3,
            end: endVector3,
            totalDistance: this._distance(startVector3, endVector3), // Pre-compute length for faster math later.
            timestamp: Date.now(),
            nativeVectorReturn,
            onHit: callbacks.onHit,
            onMiss: callbacks.onMiss,
        });

        mod.RayCast(player, startVector, endVector);
    }

    /**
     * Handles a ray hit event from `mod.OnRayCastHit`.
     * O(N) search (but this is fine given the expected low active ray count per player).
     *
     * @param eventPlayer - The player the ray was assigned to.
     * @param eventPoint - The point where the ray hit a target.
     * @param eventNormal - The normal of the surface where the ray hit the target.
     */
    public static handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void {
        const state = this._state.get(mod.GetObjId(eventPlayer));

        if (!state || state.rays.size === 0) return;

        const point = this._parseModVector(eventPoint);
        const ray = this._popBestRay(point, state.rays);

        if (!ray) return;

        if (ray.onHit) {
            try {
                if (ray.nativeVectorReturn) {
                    (ray.onHit as Raycast.HitCallback<mod.Vector>)?.(eventPoint, eventNormal);
                } else {
                    (ray.onHit as Raycast.HitCallback<Raycast.Vector3>)?.(point, this._parseModVector(eventNormal));
                }
            } catch {
                // Silently ignore errors.
            }
        }

        this._resolvePendingMisses(state);
    }

    /**
     * Handles a ray miss event from `mod.OnRayCastMissed`.
     * Note that misses are only attributable to an active ray if the number of pending (yet attributed) misses equals
     * the number of active rays. If not, the miss is stored as a pending miss and wil be attributed later.
     *
     * @param eventPlayer - The player the ray was assigned to.
     */
    public static handleMiss(eventPlayer: mod.Player): void {
        const state = this._state.get(mod.GetObjId(eventPlayer));

        if (!state || state.rays.size === 0) return;

        state.pendingMisses++;
        this._resolvePendingMisses(state);
    }

    /**
     * Used when a player leaves to clean up memory leaks by pruning all player states, like a Garbage Collector.
     * You can hook this into the global `OnPlayerLeaveGame` event, but it will already be called automatically every
     * `_PRUNE_INTERVAL_MS`.
     */
    public static pruneAllStates() {
        // We can iterate the map keys (playerIds)
        for (const [playerId, state] of this._state.entries()) {
            this._prunePlayerState(state);

            // If the player is gone, their state will eventually be empty.
            // If empty, delete the player entry entirely.
            if (state.rays.size === 0 && state.pendingMisses === 0) {
                this._state.delete(playerId);
            }
        }
    }

    /**
     * Prunes a single player's state.
     * Used during 'cast' to keep the active player's logic clean.
     */
    private static _prunePlayerState(state: Raycast.PlayerState) {
        const now = Date.now();
        let stateChanged = false;

        for (const [rayId, ray] of state.rays.entries()) {
            if (now - ray.timestamp <= this._DEFAULT_TTL_MS) continue;

            try {
                ray.onMiss?.();
            } catch {
                // Silently ignore errors.
            }

            if (state.pendingMisses > 0) {
                state.pendingMisses--;
            }

            state.rays.delete(rayId);
            stateChanged = true;
        }

        // If we removed rays, the ratio of Rays:Misses has changed. Check if this unblocked the remaining queue.
        if (stateChanged) {
            this._resolvePendingMisses(state);
        }
    }

    /**
     * Checks if the number of pending misses equals the number of active rays.
     * If so, all active rays are considered misses.
     */
    private static _resolvePendingMisses(state: Raycast.PlayerState) {
        // If we have no rays, we cannot have pending misses, so clear the pending misses to prevent "orphan" miss
        // events from poisoning the next raycast.
        if (state.rays.size === 0) {
            state.pendingMisses = 0;
            return;
        }

        // We can only assume that every remaining ray is a miss if we have more (or equal) misses than rays.
        if (state.pendingMisses < state.rays.size) return;

        for (const ray of state.rays.values()) {
            try {
                ray.onMiss?.();
            } catch {
                // Silently ignore errors.
            }
        }

        state.rays.clear();
        state.pendingMisses = 0;
    }

    private static _popBestRay(
        point: Raycast.Vector3,
        activeRays: Map<number, Raycast.PendingRay>
    ): Raycast.PendingRay | null {
        let bestRayKey: number | null = null;
        let lowestError = Number.MAX_SAFE_INTEGER;

        const now = Date.now();

        // Linear scan is unavoidable but very fast for small N.
        for (const [key, ray] of activeRays) {
            if (now - ray.timestamp > this._DEFAULT_TTL_MS) continue;

            const d1 = this._distance(ray.start, point);
            const d2 = this._distance(point, ray.end);

            // If Dist(Start->Hit) + Dist(Hit->End) ~= TotalLength, point is on line segment.
            // Calculate error |(d1 + d2) - TotalLength| (a perfect hit has an error of 0.0).
            const error = Math.abs(d1 + d2 - ray.totalDistance);

            if (error > this._DISTANCE_EPSILON || error > lowestError) continue;

            lowestError = error;
            bestRayKey = key;
        }

        if (bestRayKey === null) return null;

        const bestRay = activeRays.get(bestRayKey)!;
        activeRays.delete(bestRayKey);

        return bestRay;
    }

    private static _distance(a: Raycast.Vector3, b: Raycast.Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private static _parseModVector(v: mod.Vector): Raycast.Vector3 {
        return {
            x: mod.XComponentOf(v),
            y: mod.YComponentOf(v),
            z: mod.ZComponentOf(v),
        };
    }

    private static _isVector3(v: unknown): v is Raycast.Vector3 {
        return typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'z' in v;
    }
}

export namespace Raycast {
    export interface Vector3 {
        x: number;
        y: number;
        z: number;
    }

    export type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => void;

    export type MissCallback = () => void;

    // Must have Hit (Miss optional) or Miss (Hit optional).
    export type Callbacks<T extends mod.Vector | Vector3> =
        | { onHit: HitCallback<T>; onMiss?: MissCallback }
        | { onHit?: HitCallback<T>; onMiss: MissCallback };

    export interface PendingRay {
        start: Vector3;
        end: Vector3;
        totalDistance: number;
        timestamp: number;
        nativeVectorReturn: boolean;
        onHit?: HitCallback<mod.Vector | Vector3>;
        onMiss?: MissCallback;
    }

    export interface PlayerState {
        pendingMisses: number;
        rays: Map<number, PendingRay>;
    }
}
