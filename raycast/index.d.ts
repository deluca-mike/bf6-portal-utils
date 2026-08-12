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
    function cast(start: Vector3, end: Vector3, callbacks: Callbacks<Vector3>): void;
    function cast(start: mod.Vector, end: mod.Vector, callbacks: Callbacks<mod.Vector>): void;
    /**
     * Gets the number of currently queued raycast requests.
     * @returns The number of queued raycasts awaiting dispatch.
     */
    function getPendingRayCount(): number;
    /**
     * Gets the number of currently in-flight raycast requests.
     * @returns The number of dispatched raycasts awaiting physics engine resolution.
     */
    function getInFlightRayCount(): number;
}
