import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace Raycast {
    /**
     * A re-export of the `Logging.LogLevel` enum.
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
     * A re-export of the `Vectors.Vector3` type.
     */
    type Vector3 = Vectors.Vector3;
    /**
     * A callback function type for ray hits or misses.
     * @param hit - True if the ray struck geometry, false if missed or timed out.
     * @param hitPoint - The intersection point (defined when hit is true).
     * @param hitNormal - The surface normal at the intersection (defined when hit is true).
     */
    type RaycastCallback = (hit: boolean, hitPoint?: Vector3, hitNormal?: Vector3) => Promise<void> | void;
    /**
     * Options for raycast dispatch and lifecycle management.
     */
    interface CastOptions {
        /** Request priority level (default: Priority.Standard). */
        priority?: Priority;
        /** Maximum age in server ticks before this request is automatically dropped if not yet dispatched. */
        maxAgeTicks?: number;
        /** Maximum age in milliseconds before this request is automatically dropped if not yet dispatched. */
        timeoutMs?: number;
    }
    /**
     * Unique generation-encoded identifier for an enqueued or in-flight raycast request.
     */
    type RaycastID = number & {
        readonly __brand: 'RaycastID';
    };
    /**
     * Constant representing an invalid/unallocated RaycastID.
     */
    const INVALID_RAYCAST_ID: RaycastID;
    /**
     * Priority levels for raycast requests.
     */
    const enum Priority {
        /** Immediate player actions: weapon hitscans, grapple hooks, instant melee (front of queue). */
        Critical = 0,
        /** Time-sensitive simulation: dynamic physics collision sweeps, terrain probes, anti-tunneling. */
        Physics = 1,
        /** Default: general gameplay scripts, placement previews, custom trigger logic, line-of-sight. */
        Standard = 2,
        /** Low-urgency background tasks: distant AI perception, audio occlusion probes, cosmetic FX. */
        Ambient = 3,
    }
    /**
     * Casts a ray with a unified callback `(hit, hitPoint?, hitNormal?) => void`.
     * Requests are queued and dispatched across available worker slots strictly in priority order
     * (`Critical` -> `Physics` -> `Standard` -> `Ambient`).
     * @param start - The start position of the ray.
     * @param end - The end position of the ray.
     * @param callback - The callback invoked upon hit, miss, or timeout.
     * @param options - Optional priority level, maxAgeTicks, or timeoutMs.
     * @returns The unique RaycastID handle, or null if rejected.
     */
    function cast(start: Vector3, end: Vector3, callback: RaycastCallback, options?: CastOptions): RaycastID | null;
    /**
     * Updates the start and end coordinates (and optional deadline options) of an enqueued raycast in-place.
     * Preserves the ray's priority position in the queue.
     * @param id - The RaycastID to update.
     * @param start - The new start coordinate vector.
     * @param end - The new end coordinate vector.
     * @param options - Optional updated timeout/expiry options (calculated relative to current tick/time).
     * @returns True if successfully updated in the queue, false if invalid, completed, or already in flight.
     */
    function update(id: RaycastID, start: Vector3, end: Vector3, options?: CastOptions): boolean;
    /**
     * Cancels an enqueued or in-flight raycast request.
     * If the ray is still in the queue, it is dropped so native `mod.RayCast` is skipped.
     * If the ray is already in-flight in the native engine, its callback is suppressed upon resolution.
     * @param id - The RaycastID to cancel.
     * @returns True if the raycast was successfully marked canceled, false if invalid or already completed.
     */
    function cancel(id: RaycastID): boolean;
    /**
     * Checks whether a RaycastID is currently active (either waiting in queue or in-flight on a worker slot).
     * Returns false if the request has completed, was canceled, expired, or was never allocated.
     * @param id - The RaycastID to query.
     * @returns True if active, false otherwise.
     */
    function isActive(id: RaycastID): boolean;
    /**
     * Gets the number of currently queued raycast requests (globally or for a specific priority).
     * @param priority - Optional priority level to query. If omitted, returns total across all priority levels.
     * @returns The number of queued raycasts awaiting dispatch.
     */
    function getPendingRayCount(priority?: Priority): number;
    /**
     * Gets the number of currently in-flight raycast requests.
     * @returns The number of dispatched raycasts awaiting physics engine resolution.
     */
    function getInFlightRayCount(): number;
}
