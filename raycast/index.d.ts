import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace Raycast {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel: typeof Logging.LogLevel;
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
    ): void;
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
        | {
              onHit: HitCallback<T>;
              onMiss?: MissCallback;
          }
        | {
              onHit?: HitCallback<T>;
              onMiss: MissCallback;
          };
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
    export function cast(player: mod.Player, start: Vector3, end: Vector3, callbacks: Callbacks<Vector3>): void;
    export function cast(
        player: mod.Player,
        start: mod.Vector,
        end: mod.Vector,
        callbacks: Callbacks<mod.Vector>
    ): void;
    /**
     * Used when a player leaves to clean up memory leaks by pruning all player states, like a Garbage Collector.
     * You can hook this into the global `OnPlayerLeaveGame` event, but it will already be called automatically every
     * `PRUNE_INTERVAL_MS`.
     */
    export function pruneAllStates(): void;
    /**
     * Prunes a single player's state. Used during 'cast' to keep the active player's logic clean.
     * @param state - The player state to prune.
     */
    export function prunePlayerState(state: PlayerState): void;
    export {};
}
