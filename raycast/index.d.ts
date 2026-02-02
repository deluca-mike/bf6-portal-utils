import { Logging } from '../logging/index.ts';
export declare class Raycast {
    private static _logging;
    private static _nextRayId;
    private static _state;
    private static readonly _DISTANCE_EPSILON;
    private static readonly _DEFAULT_TTL_MS;
    private static readonly _PRUNE_INTERVAL_MS;
    private constructor();
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
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
     * @param eventPlayer - The player the ray was assigned to.
     * @param eventPoint - The point where the ray hit a target.
     * @param eventNormal - The normal of the surface where the ray hit the target.
     */
    static handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void;
    /**
     * Handles a ray miss event from `mod.OnRayCastMissed`.
     * Note that misses are only attributable to an active ray if the number of pending (yet attributed) misses equals
     * the number of active rays. If not, the miss is stored as a pending miss and wil be attributed later.
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
     * Prunes a single player's state. Used during 'cast' to keep the active player's logic clean.
     * @param state - The player state to prune.
     */
    private static _prunePlayerState;
    /**
     * Checks if the number of pending misses equals the number of active rays.
     * If so, all active rays are considered misses.
     * @param state - The player state to resolve pending misses for.
     */
    private static _resolvePendingMisses;
    private static _handleMissCallback;
    private static _popBestRay;
    private static _distance;
    private static _parseModVector;
    private static _isVector3;
}
export declare namespace Raycast {
    /**
     * A simple transparent 3D vector interface.
     */
    interface Vector3 {
        x: number;
        y: number;
        z: number;
    }
    /**
     * A callback function type for ray hits.
     */
    type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => Promise<void> | void;
    /**
     * A callback function type for ray misses.
     */
    type MissCallback = () => Promise<void> | void;
    /**
     * A callback object type for the `cast()` method. Must have Hit (Miss optional) or Miss (Hit optional).
     */
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
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
}
