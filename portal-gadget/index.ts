import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Raycast } from '../raycast/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.1
export namespace PortalGadget {
    const logging = new Logging('PG');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    const RAYCAST_DISTANCE = 3_000;
    const RAYCAST_TIMEOUT_MS = 2_500;

    const AIMING_OFFSET: Vectors.Vector3 = { x: -0.49, y: -0.17, z: 0.2 }; // right positive, up positive, forward positive
    const AIMING_VERTICAL_ANGLE_DELTA = 0; // up positive
    const AIMING_HORIZONTAL_ANGLE_DELTA = 0; // left positive

    const HIP_OFFSET: Vectors.Vector3 = { x: -0.49, y: -0.23, z: 0.4 }; // right positive, up positive, forward positive
    const HIP_VERTICAL_ANGLE_DELTA = 28; // up positive
    const HIP_HORIZONTAL_ANGLE_DELTA = -13.25; // left positive

    /**
     * A handler function for the Portal Gadget's events.
     * @param player - The player who started the fire.
     * @param isZooming - Whether the player is zooming.
     * @param getTarget - An async function that returns the target position.
     */
    export type Handler = (
        player: mod.Player,
        isZooming: boolean,
        getTarget: () => Promise<mod.Vector | undefined>
    ) => void;

    const FIRE_START_HANDLERS: Set<Handler> = new Set();
    const FIRE_STOP_HANDLERS: Set<Handler> = new Set();

    Events.OnPortalGadgetFireStart.subscribe(handleFireStart);
    Events.OnPortalGadgetFireStop.subscribe(handleFireStop);

    /**
     * Computes the absolute tip position and direction of the Portal Gadget's laser pointer.
     * @param eyePosition Absolute 3D world position of the player's eyes.
     * @param facingDirection Normalized 3D vector of the player's looking direction.
     * @param localLaserOffset Offset of the laser relative to the eyes (X=Right, Y=Up, Z=Forward).
     * @param verticalAngleDelta Deg offset from facing direction (pitch).
     * @param horizontalAngleDelta Deg offset from facing direction (yaw).
     */
    function computeLaserTransform(
        eyePosition: Vectors.Vector3,
        facingDirection: Vectors.Vector3,
        localLaserOffset: Vectors.Vector3,
        verticalAngleDelta: number,
        horizontalAngleDelta: number
    ): { position: Vectors.Vector3; direction: Vectors.Vector3 } {
        // --- 1. Establish the Local Coordinate Basis ---
        const forward = Vectors.normalize(facingDirection);

        // Default world up is Y. If looking straight up/down, use X to avoid breaking the cross product.
        const worldUp = Math.abs(forward.y) > 0.999 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };

        // Right = Forward x WorldUp
        const right = Vectors.normalize(Vectors.cross(forward, worldUp));

        // True Local Up = Right x Forward
        const up = Vectors.cross(right, forward);

        // --- 2. Calculate Laser Origin (World Space) ---
        const position: Vectors.Vector3 = {
            x:
                eyePosition.x +
                right.x * localLaserOffset.x +
                up.x * localLaserOffset.y +
                forward.x * localLaserOffset.z,
            y:
                eyePosition.y +
                right.y * localLaserOffset.x +
                up.y * localLaserOffset.y +
                forward.y * localLaserOffset.z,
            z:
                eyePosition.z +
                right.z * localLaserOffset.x +
                up.z * localLaserOffset.y +
                forward.z * localLaserOffset.z,
        };

        // --- 3. Calculate Laser Direction ---
        // Convert degrees to radians
        const hRad = horizontalAngleDelta * (Math.PI / 180);
        const vRad = verticalAngleDelta * (Math.PI / 180);

        // Apply horizontal offset (Yaw) by rotating around the Local Up axis.
        // Apply vertical offset (Pitch) by rotating around the Local Right axis.
        // Ensure the final direction is perfectly normalized.
        const direction = Vectors.normalize(
            Vectors.rotateAroundAxis(Vectors.rotateAroundAxis(forward, up, hRad), right, vRad)
        );

        return { position, direction };
    }

    async function getRaycastTarget(
        player: mod.Player,
        eyePosition: Vectors.Vector3,
        facingDirection: Vectors.Vector3,
        isZooming: boolean
    ): Promise<mod.Vector | undefined> {
        return new Promise((resolve) => {
            const { position, direction } = computeLaserTransform(
                eyePosition,
                facingDirection,
                isZooming ? AIMING_OFFSET : HIP_OFFSET,
                isZooming ? AIMING_VERTICAL_ANGLE_DELTA : HIP_VERTICAL_ANGLE_DELTA,
                isZooming ? AIMING_HORIZONTAL_ANGLE_DELTA : HIP_HORIZONTAL_ANGLE_DELTA
            );

            const destination = Vectors.add(position, Vectors.multiply(direction, RAYCAST_DISTANCE));

            const timeout = Timers.setTimeout(() => {
                resolve(undefined);
                logging.log(`Raycast timed out.`, LogLevel.Warning);
            }, RAYCAST_TIMEOUT_MS);

            try {
                Raycast.cast(player, position, destination, {
                    onHit: (hitPoint) => {
                        Timers.clearTimeout(timeout);
                        resolve(Vectors.toVector(hitPoint));
                    },
                    onMiss: () => {
                        Timers.clearTimeout(timeout);
                        resolve(undefined);
                    },
                });
            } catch (error: unknown) {
                Timers.clearTimeout(timeout);
                logging.log('Error casting ray.', LogLevel.Error, error);
                resolve(undefined);
            }
        });
    }

    function getPlayerState(player: mod.Player): {
        eyePosition: Vectors.Vector3;
        facingDirection: Vectors.Vector3;
        isZooming: boolean;
        getTarget: () => Promise<mod.Vector | undefined>;
    } {
        const eyePosition = Vectors.toVector3(mod.GetSoldierState(player, mod.SoldierStateVector.EyePosition));
        const isZooming = mod.GetSoldierState(player, mod.SoldierStateBool.IsZooming);

        const facingDirection = Vectors.toVector3(
            mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection)
        );

        const getTarget = () => getRaycastTarget(player, eyePosition, facingDirection, isZooming);

        return {
            eyePosition,
            facingDirection,
            isZooming,
            getTarget,
        };
    }

    function handleFireStart(player: mod.Player): void {
        try {
            const { isZooming, getTarget } = getPlayerState(player);

            for (const handler of FIRE_START_HANDLERS) {
                CallbackHandler.invoke(handler, [player, isZooming, getTarget], 'onFireStart', logging, LogLevel.Error);
            }
        } catch (error: unknown) {
            logging.log('Error handling fire start event.', LogLevel.Error, error);
        }
    }

    function handleFireStop(player: mod.Player): void {
        try {
            const { isZooming, getTarget } = getPlayerState(player);

            for (const handler of FIRE_STOP_HANDLERS) {
                CallbackHandler.invoke(handler, [player, isZooming, getTarget], 'onFireStop', logging, LogLevel.Error);
            }
        } catch (error: unknown) {
            logging.log('Error handling fire stop event.', LogLevel.Error, error);
        }
    }

    /**
     * Subscribes to the Portal Gadget's fire start event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    export function onFireStart(handler: Handler): () => void {
        FIRE_START_HANDLERS.add(handler);
        const unsubscribe = () => FIRE_START_HANDLERS.delete(handler);
        return unsubscribe;
    }

    /**
     * Subscribes to the Portal Gadget's fire stop event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    export function onFireStop(handler: Handler): () => void {
        FIRE_STOP_HANDLERS.add(handler);
        const unsubscribe = () => FIRE_STOP_HANDLERS.delete(handler);
        return unsubscribe;
    }

    /**
     * Gets the target position of the Portal Gadget's laser pointer.
     * @param player - The player to get the target position for.
     * @returns The target position (undefined if no target is found).
     */
    export async function getLaserTarget(player: mod.Player): Promise<mod.Vector | undefined> {
        return getPlayerState(player).getTarget();
    }
}
