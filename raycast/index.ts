import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 2.0.0
export namespace Raycast {
    const logging = new Logging('Raycast');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    /**
     * A re-export of the `Vectors.Vector3` type.
     */
    export type Vector3 = Vectors.Vector3;

    /**
     * A callback function type for ray hits.
     */
    export type HitCallback<T extends mod.Vector | Vector3> = (hitPoint: T, hitNormal: T) => Promise<void> | void;

    /**
     * A callback function type for ray misses.
     */
    export type MissCallback = () => Promise<void> | void;

    /**
     * A callback object type for the `cast()` method. Must have Hit (Miss optional) or Miss (Hit optional).
     */
    export type Callbacks<T extends mod.Vector | Vector3> =
        | { onHit: HitCallback<T>; onMiss?: MissCallback }
        | { onHit?: HitCallback<T>; onMiss: MissCallback };

    type PendingRay = {
        start: Vector3;
        end: Vector3;
        totalDistance: number;
        timestamp: number;
        nativeVectorReturn: boolean;
        onHit?: HitCallback<mod.Vector | Vector3>;
        onMiss?: MissCallback;
    };

    type PlayerState = {
        pendingMisses: number;
        rays: Map<number, PendingRay>;
    };

    let nextRayId: number = 0;

    const states: Map<number, PlayerState> = new Map();

    const DISTANCE_EPSILON = 0.5; // 0.5 meters
    const DEFAULT_TTL_MS = 2_000; // 2 Seconds
    const PRUNE_INTERVAL_MS = 5_000; // 5 Seconds

    // Automatically prunes all player states every PRUNE_INTERVAL_MS.
    Timers.setInterval(pruneAllStates, PRUNE_INTERVAL_MS);

    Events.OnRayCastHit.subscribe(handleHit);
    Events.OnRayCastMissed.subscribe(handleMiss);

    export function cast(player: mod.Player, start: Vector3, end: Vector3, callbacks: Callbacks<Vector3>): void;

    export function cast(
        player: mod.Player,
        start: mod.Vector,
        end: mod.Vector,
        callbacks: Callbacks<mod.Vector>
    ): void;

    /**
     * Casts a ray with specific callbacks. The callback vector types must match the `start` and `end` vector types.
     * @example
     * Raycast.cast(player, { x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }, {
     *     onHit: (hitPoint, hitNormal) => {
     *         console.log(`Ray hit at ${hitPoint.x}, ${hitPoint.y}, ${hitPoint.z}`);
     *     },
     * });
     * Raycast.cast(player, mod.CreateVector(0, 0, 0), mod.CreateVector(10, 10, 10), {
     *     onHit: (hitPoint, hitNormal) => {
     *         console.log(`Ray hit at ${mod.XComponentOf(hitPoint)}, ${mod.YComponentOf(hitPoint)}, ${mod.ZComponentOf(hitPoint)}`);
     *     },
     * });
     * @param player - The player to assign the ray to.
     * @param start - The start position of the ray.
     * @param end - The end position of the ray.
     * @param callbacks - The callbacks to be called (at least one must be provided).
     *   - `onHit`: The callback to be called when the ray hits a target.
     *   - `onMiss`: The callback to be called when the ray misses a target.
     */
    export function cast<T extends mod.Vector | Vector3>(
        player: mod.Player,
        start: T,
        end: T,
        callbacks: Callbacks<T>
    ): void {
        // Don't even fire the ray if someone ignores type safety (Optional, but good practice).
        if (typeof callbacks?.onHit !== 'function' && typeof callbacks?.onMiss !== 'function') return;

        const playerId = mod.GetObjId(player);

        if (!states.has(playerId)) {
            states.set(playerId, { pendingMisses: 0, rays: new Map() });
        }

        const state = states.get(playerId)!;

        prunePlayerState(state); // Lazy Cleanup: Remove expired rays before adding new ones.

        const nativeVectorReturn = !Vectors.isVector3(start);

        let startVector3: Vector3;
        let endVector3: Vector3;
        let startVector: mod.Vector;
        let endVector: mod.Vector;

        // We check 'start' to decide the mode.
        if (nativeVectorReturn) {
            startVector3 = Vectors.toVector3(start as mod.Vector);
            endVector3 = Vectors.toVector3(end as mod.Vector);
            startVector = start as mod.Vector;
            endVector = end as mod.Vector;
        } else {
            startVector3 = start as Vector3;
            endVector3 = end as Vector3;
            startVector = Vectors.toVector(startVector3);
            endVector = Vectors.toVector(endVector3);
        }

        state.rays.set(nextRayId++, {
            start: startVector3,
            end: endVector3,
            totalDistance: Vectors.distance(startVector3, endVector3), // Pre-compute length for faster math later.
            timestamp: Date.now(),
            nativeVectorReturn,
            onHit: callbacks.onHit as HitCallback<mod.Vector | Vector3>,
            onMiss: callbacks.onMiss,
        });

        mod.RayCast(player, startVector, endVector);
    }

    /**
     * Handles a ray hit event from `mod.OnRayCastHit`.
     * O(N) search (but this is fine given the expected low active ray count per player).
     * @param eventPlayer - The player the ray was assigned to.
     * @param eventPoint - The point where the ray hit a target.
     * @param eventNormal - The normal of the surface where the ray hit the target.
     */
    function handleHit(eventPlayer: mod.Player, eventPoint: mod.Vector, eventNormal: mod.Vector): void {
        const state = states.get(mod.GetObjId(eventPlayer));

        if (!state || state.rays.size === 0) return;

        const point = Vectors.toVector3(eventPoint);
        const ray = popBestRay(point, state.rays);

        if (!ray) return;

        CallbackHandler.invoke(
            ray.nativeVectorReturn ? (ray.onHit as HitCallback<mod.Vector>) : (ray.onHit as HitCallback<Vector3>),
            ray.nativeVectorReturn ? [eventPoint, eventNormal] : [point, Vectors.toVector3(eventNormal)],
            'onHit',
            logging,
            LogLevel.Error
        );

        resolvePendingMisses(state);
    }

    /**
     * Handles a ray miss event from `mod.OnRayCastMissed`.
     * Note that misses are only attributable to an active ray if the number of pending (yet attributed) misses equals
     * the number of active rays. If not, the miss is stored as a pending miss and wil be attributed later.
     * @param eventPlayer - The player the ray was assigned to.
     */
    function handleMiss(eventPlayer: mod.Player): void {
        const state = states.get(mod.GetObjId(eventPlayer));

        if (!state || state.rays.size === 0) return;

        state.pendingMisses++;
        resolvePendingMisses(state);
    }

    /**
     * Used when a player leaves to clean up memory leaks by pruning all player states, like a Garbage Collector.
     * You can hook this into the global `OnPlayerLeaveGame` event, but it will already be called automatically every
     * `PRUNE_INTERVAL_MS`.
     */
    export function pruneAllStates(): void {
        // We can iterate the map keys (playerIds)
        for (const [playerId, state] of states.entries()) {
            prunePlayerState(state);

            // If the player is gone, their state will eventually be empty.
            // If empty, delete the player entry entirely.
            if (state.rays.size === 0 && state.pendingMisses === 0) {
                states.delete(playerId);
            }
        }
    }

    /**
     * Prunes a single player's state. Used during 'cast' to keep the active player's logic clean.
     * @param state - The player state to prune.
     */
    export function prunePlayerState(state: PlayerState) {
        const now = Date.now();
        let stateChanged = false;

        for (const [rayId, ray] of state.rays.entries()) {
            if (now - ray.timestamp <= DEFAULT_TTL_MS) continue;

            handleMissCallback(ray);

            if (state.pendingMisses > 0) {
                state.pendingMisses--;
            }

            state.rays.delete(rayId);
            stateChanged = true;
        }

        // If we removed rays, the ratio of Rays:Misses has changed. Check if this unblocked the remaining queue.
        if (stateChanged) {
            resolvePendingMisses(state);
        }
    }

    /**
     * Checks if the number of pending misses equals the number of active rays.
     * If so, all active rays are considered misses.
     * @param state - The player state to resolve pending misses for.
     */
    function resolvePendingMisses(state: PlayerState) {
        // If we have no rays, we cannot have pending misses, so clear the pending misses to prevent "orphan" miss
        // events from poisoning the next raycast.
        if (state.rays.size === 0) {
            state.pendingMisses = 0;
            return;
        }

        // We can only assume that every remaining ray is a miss if we have more (or equal) misses than rays.
        if (state.pendingMisses < state.rays.size) return;

        for (const ray of state.rays.values()) {
            handleMissCallback(ray);
        }

        state.rays.clear();
        state.pendingMisses = 0;
    }

    function handleMissCallback(ray: PendingRay): void {
        CallbackHandler.invokeNoArgs(ray.onMiss, 'onMiss', logging, LogLevel.Error);
    }

    function popBestRay(point: Vector3, activeRays: Map<number, PendingRay>): PendingRay | null {
        let bestRayKey: number | null = null;
        let lowestError = Number.MAX_SAFE_INTEGER;

        const now = Date.now();

        // Linear scan is unavoidable but very fast for small N.
        for (const [key, ray] of activeRays) {
            if (now - ray.timestamp > DEFAULT_TTL_MS) continue;

            const d1 = Vectors.distance(ray.start, point);
            const d2 = Vectors.distance(point, ray.end);

            // If Dist(Start->Hit) + Dist(Hit->End) ~= TotalLength, point is on line segment.
            // Calculate error |(d1 + d2) - TotalLength| (a perfect hit has an error of 0.0).
            const error = Math.abs(d1 + d2 - ray.totalDistance);

            if (error > DISTANCE_EPSILON || error > lowestError) continue;

            lowestError = error;
            bestRayKey = key;
        }

        if (bestRayKey === null) return null;

        const bestRay = activeRays.get(bestRayKey)!;
        activeRays.delete(bestRayKey);

        return bestRay;
    }
}
