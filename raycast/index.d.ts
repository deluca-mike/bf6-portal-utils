export declare class Raycast {
    private static _nextRayId;
    private static _state;
    private static readonly _DISTANCE_EPSILON;
    private static readonly _DEFAULT_TTL_MS;
    private static readonly _PRUNE_INTERVAL_MS;
    static cast(
        player: mod.Player,
        start: Raycast.Vector3,
        end: Raycast.Vector3,
        callbacks: Raycast.Callbacks<Raycast.Vector3>
    ): void;
    static cast(player: mod.Player, start: mod.Vector, end: mod.Vector, callbacks: Raycast.Callbacks<mod.Vector>): void;
    /**
     * Handles a ray hit event from `mod.OnRayCastHit`.
     * O(N) search (but this is fine given the expected low active ray count per player).
     *
     * @param eventPlayer - The player the ray was assigned to.
     * @param eventPoint - The point where the ray hit a target.
     * @param eventNormal - The normal of the surface where the ray hit the target.
     */
    static handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void;
    /**
     * Handles a ray miss event from `mod.OnRayCastMissed`.
     * Note that misses are only attributable to an active ray if the number of pending (yet attributed) misses equals
     * the number of active rays. If not, the miss is stored as a pending miss and wil be attributed later.
     *
     * @param eventPlayer - The player the ray was assigned to.
     */
    static handleMiss(eventPlayer: mod.Player): void;
    /**
     * Used when a player leaves to clean up memory leaks by pruning all player states, like a Garbage Collector.
     * You can hook this into the global `OnPlayerLeaveGame` event, but it will already be called automatically every
     * `_PRUNE_INTERVAL_MS`.
     */
    static pruneAllStates(): void;
    /**
     * Prunes a single player's state.
     * Used during 'cast' to keep the active player's logic clean.
     */
    private static _prunePlayerState;
    /**
     * Checks if the number of pending misses equals the number of active rays.
     * If so, all active rays are considered misses.
     */
    private static _resolvePendingMisses;
    private static _popBestRay;
    private static _distance;
    private static _parseModVector;
    private static _isVector3;
}
export declare namespace Raycast {
    interface Vector3 {
        x: number;
        y: number;
        z: number;
    }
    type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => void;
    type MissCallback = () => void;
    type Callbacks<T extends mod.Vector | Vector3> =
        | {
              onHit: HitCallback<T>;
              onMiss?: MissCallback;
          }
        | {
              onHit?: HitCallback<T>;
              onMiss: MissCallback;
          };
    interface PendingRay {
        start: Vector3;
        end: Vector3;
        totalDistance: number;
        timestamp: number;
        nativeVectorReturn: boolean;
        onHit?: HitCallback<mod.Vector | Vector3>;
        onMiss?: MissCallback;
    }
    interface PlayerState {
        pendingMisses: number;
        rays: Map<number, PendingRay>;
    }
}
