import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Raycast } from '../raycast/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 2.0.0
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

    // Laser offsets relative to eyes (X=Right, Y=Up, Z=Forward)
    const AIMING_OFFSET: Vectors.Vector3 = { x: -0.49, y: -0.17, z: 0.2 };
    const HIP_OFFSET: Vectors.Vector3 = { x: -0.49, y: -0.23, z: 0.4 };

    const HIP_YAW_DEG = -13.25;
    const HIP_PITCH_DEG = 28;

    const _scratchEye: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _scratchFacing: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _scratchOrigin: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _scratchDirection: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
    const _scratchDestination: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

    /**
     * A handler function for the Portal Gadget's events.
     * @param player - The player who started or stopped the fire.
     * @param isZooming - Whether the player was zooming when the event fired.
     * @param getTarget - An async function that returns the target position.
     */
    export type Handler = (
        player: mod.Player,
        isZooming: boolean,
        getTarget: () => Promise<mod.Vector | undefined>
    ) => void;

    const _fireStartHandlers: Handler[] = [];
    const _fireStopHandlers: Handler[] = [];

    Events.OnPortalGadgetFireStart.subscribe(handleFireStart);
    Events.OnPortalGadgetFireStop.subscribe(handleFireStop);

    function _castLaserRay(
        eyeVec: mod.Vector,
        facingVec: mod.Vector,
        isZooming: boolean
    ): Promise<mod.Vector | undefined> {
        return new Promise((resolve) => {
            Vectors.toVector3(eyeVec, _scratchEye);
            Vectors.toVector3(facingVec, _scratchFacing);

            const offset = isZooming ? AIMING_OFFSET : HIP_OFFSET;
            const yaw = isZooming ? 0 : HIP_YAW_DEG;
            const pitch = isZooming ? 0 : HIP_PITCH_DEG;

            Vectors.transformLocalOffset(_scratchEye, _scratchFacing, offset, _scratchOrigin);
            Vectors.rotateYawPitch(_scratchFacing, yaw, pitch, _scratchDirection);

            _scratchDestination.x = _scratchOrigin.x + _scratchDirection.x * RAYCAST_DISTANCE;
            _scratchDestination.y = _scratchOrigin.y + _scratchDirection.y * RAYCAST_DISTANCE;
            _scratchDestination.z = _scratchOrigin.z + _scratchDirection.z * RAYCAST_DISTANCE;

            try {
                Raycast.cast(_scratchOrigin, _scratchDestination, {
                    onHit: (hitPoint) => resolve(Vectors.toVector(hitPoint)),
                    onMiss: () => resolve(undefined),
                });
            } catch (error: unknown) {
                logging.log('Error casting ray', LogLevel.Error, error);
                resolve(undefined);
            }
        });
    }

    function _dispatchHandlers(handlers: Handler[], player: mod.Player): void {
        const count = handlers.length;

        if (count === 0) return;

        const eyeVec = mod.GetSoldierState(player, mod.SoldierStateVector.EyePosition);
        const faceVec = mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection);
        const isZooming = mod.GetSoldierState(player, mod.SoldierStateBool.IsZooming);

        let cachedPromise: Promise<mod.Vector | undefined> | null = null;

        const getTarget = () => {
            if (cachedPromise === null) {
                cachedPromise = _castLaserRay(eyeVec, faceVec, isZooming);
            }

            return cachedPromise;
        };

        for (let i = 0; i < count; ++i) {
            CallbackHandler.invoke(handlers[i]!, player, isZooming, getTarget, undefined, logging, 'dispatchHandlers');
        }
    }

    function handleFireStart(player: mod.Player): void {
        try {
            _dispatchHandlers(_fireStartHandlers, player);
        } catch (error: unknown) {
            logging.log('Error handling onFireStart event', LogLevel.Error, error);
        }
    }

    function handleFireStop(player: mod.Player): void {
        try {
            _dispatchHandlers(_fireStopHandlers, player);
        } catch (error: unknown) {
            logging.log('Error handling onFireStop event', LogLevel.Error, error);
        }
    }

    /**
     * Subscribes to the Portal Gadget's fire start event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    export function onFireStart(handler: Handler): () => void {
        _fireStartHandlers.push(handler);

        const unsubscribe = () => {
            const index = _fireStartHandlers.indexOf(handler);

            if (index !== -1) {
                _fireStartHandlers.splice(index, 1);
            }
        };

        return unsubscribe;
    }

    /**
     * Subscribes to the Portal Gadget's fire stop event.
     * @param handler - The handler function to subscribe.
     * @returns A function to unsubscribe from the event.
     */
    export function onFireStop(handler: Handler): () => void {
        _fireStopHandlers.push(handler);

        const unsubscribe = () => {
            const index = _fireStopHandlers.indexOf(handler);

            if (index !== -1) {
                _fireStopHandlers.splice(index, 1);
            }
        };

        return unsubscribe;
    }

    /**
     * Gets the target position of the Portal Gadget's laser pointer.
     * @param player - The player to get the target position for.
     * @returns The target position (undefined if no target is found).
     */
    export async function getLaserTarget(player: mod.Player): Promise<mod.Vector | undefined> {
        const eyeVec = mod.GetSoldierState(player, mod.SoldierStateVector.EyePosition);
        const faceVec = mod.GetSoldierState(player, mod.SoldierStateVector.GetFacingDirection);
        const isZooming = mod.GetSoldierState(player, mod.SoldierStateBool.IsZooming);

        return _castLaserRay(eyeVec, faceVec, isZooming);
    }
}
