import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 6.0.0
export namespace Sounds {
    const logging = new Logging('Sounds');

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

    const DEFAULT_FADE_DURATION: number = 2_000; // 2 seconds default fade duration (in milliseconds).
    const DEFAULT_FADE_STEPS: number = 10;
    const DEFAULT_ATTENUATION_RANGE: number = 10; // 10 meters default attenuation range (in meters).

    const _ZERO_VECTOR = mod.CreateVector(0, 0, 0);

    export type Target = mod.Player | mod.Squad | mod.Team;

    /**
     * The options for sound fading.
     */
    export type FadeOptions = {
        /**
         * The starting amplitude of the fade.
         */
        startAmplitude: number;
        /**
         * The target amplitude of the sound.
         * Default is 0 (which is a fade out).
         */
        targetAmplitude?: number;
        /**
         * The delay before the fade starts in milliseconds.
         * Default is 0.
         */
        delay?: number;
        /**
         * The duration of the fade in milliseconds.
         * Default is 2,000 milliseconds.
         */
        duration?: number;
        /**
         * The number of steps to use for the fade.
         * Default is 10.
         */
        steps?: number;
        /**
         * Whether to stop the sound when the fade is complete.
         * Default is true if `targetAmplitude` is 0, false otherwise.
         */
        stopOnComplete?: boolean;
    };

    /**
     * The options for sound playback.
     */
    export type PlayOptions = {
        /**
         * The target to play the sound for. Default is undefined, which means all players hear the sound.
         */
        target?: Target;
        /**
         * The world position to play the sound at (mod.Vector or Vectors.Vector3).
         * Note: Ignored for 2D sounds.
         */
        position?: mod.Vector | Vectors.Vector3;
        /**
         * The attenuation range of the sound in meters. Default is 10 meters if position is specified.
         * Note: Ignored for 2D sounds.
         */
        attenuationRange?: number;
        /**
         * The optional playback duration in milliseconds after which the sound is automatically stopped.
         */
        duration?: number;
        /**
         * Optional fade options applied during playback.
         */
        fadeOptions?: Omit<FadeOptions, 'startAmplitude'>;
    };

    /**
     * The options for one-shot sound playback.
     */
    export type PlayOneShotOptions = PlayOptions;

    type SFXState = {
        stopTimerId?: Timers.TimerID;
        fadeTimerId?: Timers.TimerID;
    };

    const _states = new Map<number, SFXState>();

    function _playSound(
        sfx: mod.SFX,
        amplitude: number,
        position?: mod.Vector,
        attenuationRange?: number,
        target?: Target
    ): void {
        if (position !== undefined || attenuationRange !== undefined) {
            position = position ?? mod.GetObjectPosition(sfx);
            attenuationRange = attenuationRange ?? DEFAULT_ATTENUATION_RANGE;

            if (target === undefined) {
                mod.PlaySound(sfx, amplitude, position, attenuationRange);
            } else if (mod.IsType(target, mod.Types.Player)) {
                mod.PlaySound(sfx, amplitude, position, attenuationRange, target as mod.Player);
            } else if (mod.IsType(target, mod.Types.Squad)) {
                mod.PlaySound(sfx, amplitude, position, attenuationRange, target as mod.Squad);
            } else if (mod.IsType(target, mod.Types.Team)) {
                mod.PlaySound(sfx, amplitude, position, attenuationRange, target as mod.Team);
            } else {
                logging.log('Target type is invalid', LogLevel.Error);
            }
        } else {
            if (target === undefined) {
                mod.PlaySound(sfx, amplitude);
            } else if (mod.IsType(target, mod.Types.Player)) {
                mod.PlaySound(sfx, amplitude, target as mod.Player);
            } else if (mod.IsType(target, mod.Types.Squad)) {
                mod.PlaySound(sfx, amplitude, target as mod.Squad);
            } else if (mod.IsType(target, mod.Types.Team)) {
                mod.PlaySound(sfx, amplitude, target as mod.Team);
            } else {
                logging.log('Target type is invalid', LogLevel.Error);
            }
        }
    }

    function _getOrCreateState(sfxId: number): SFXState {
        let state = _states.get(sfxId);

        if (!state) {
            state = {};
            _states.set(sfxId, state);
        }

        return state;
    }

    function _cancelStop(sfxId: number): void {
        const state = _states.get(sfxId);

        if (state?.stopTimerId === undefined) return;

        Timers.clearTimeout(state.stopTimerId);
        state.stopTimerId = undefined;

        if (state.fadeTimerId === undefined) {
            _states.delete(sfxId);
        }
    }

    function _cancelFade(sfxId: number): void {
        const state = _states.get(sfxId);

        if (state?.fadeTimerId === undefined) return;

        Timers.clearInterval(state.fadeTimerId);
        state.fadeTimerId = undefined;

        if (state.stopTimerId === undefined) {
            _states.delete(sfxId);
        }
    }

    function _cancelTimers(sfxId: number): void {
        const state = _states.get(sfxId);

        if (!state) return;

        if (state.stopTimerId !== undefined) {
            Timers.clearTimeout(state.stopTimerId);
            state.stopTimerId = undefined;
        }

        if (state.fadeTimerId !== undefined) {
            Timers.clearInterval(state.fadeTimerId);
            state.fadeTimerId = undefined;
        }

        _states.delete(sfxId);
    }

    function _fadeInternal(
        sfx: mod.SFX,
        sfxId: number,
        startAmplitude: number,
        targetAmplitude: number = 0,
        delay: number = 0,
        duration: number = DEFAULT_FADE_DURATION,
        steps: number = DEFAULT_FADE_STEPS,
        stopOnComplete: boolean = targetAmplitude === 0,
        disposeOnComplete: boolean = false
    ): void {
        _cancelFade(sfxId);

        const stepCount = steps > 0 ? steps : 1;
        const stepSize = (startAmplitude - targetAmplitude) / stepCount;
        const stepDuration = duration / stepCount;

        let currentAmplitude = startAmplitude;
        let remainingSteps = stepCount;

        const stepFade = () => {
            if (!isValid(sfxId)) {
                _cancelFade(sfxId);
                return;
            }

            currentAmplitude = Math.max(0, currentAmplitude - stepSize);
            mod.SetSoundAmplitude(sfx, currentAmplitude);
            --remainingSteps;

            if (remainingSteps > 0) return;

            _cancelFade(sfxId);

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Sound ${sfxId} completed fade to ${targetAmplitude}`, LogLevel.Debug);
            }

            if (disposeOnComplete) {
                dispose(sfx);
            } else if (stopOnComplete) {
                stop(sfx);
            }
        };

        const startFade = () => {
            const state = _states.get(sfxId);

            if (!state || !isValid(sfxId)) return;

            state.fadeTimerId = Timers.setInterval(stepFade, stepDuration);
        };

        if (delay > 0) {
            _getOrCreateState(sfxId).fadeTimerId = Timers.setTimeout(startFade, delay);
        } else {
            startFade();
        }

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Sound ${sfxId} fade to ${targetAmplitude} starting in ${delay}ms`, LogLevel.Info);
        }
    }

    function _playInternal(
        sfx: mod.SFX,
        sfxId: number,
        amplitude: number,
        target?: Target,
        position?: mod.Vector | Vectors.Vector3,
        attenuationRange?: number,
        duration?: number,
        fadeOptions?: Omit<FadeOptions, 'startAmplitude'>,
        disposeOnComplete: boolean = false
    ): void {
        _playSound(sfx, amplitude, _getVector(position), attenuationRange, target);

        if (duration !== undefined) {
            const onStopTimeout = () => {
                _cancelStop(sfxId);

                if (disposeOnComplete) {
                    dispose(sfx);
                } else {
                    stop(sfx);
                }
            };

            _getOrCreateState(sfxId).stopTimerId = Timers.setTimeout(onStopTimeout, duration);
        }

        if (fadeOptions !== undefined) {
            _fadeInternal(
                sfx,
                sfxId,
                amplitude,
                fadeOptions.targetAmplitude,
                fadeOptions.delay,
                fadeOptions.duration,
                fadeOptions.steps,
                fadeOptions.stopOnComplete,
                disposeOnComplete
            );
        }

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Sound ${sfxId} played at amplitude ${amplitude.toFixed(2)}`, LogLevel.Info);
        }
    }

    function _getVector(vector?: mod.Vector | Vectors.Vector3): mod.Vector | undefined {
        return vector !== undefined ? (Vectors.isVector3(vector) ? Vectors.toVector(vector) : vector) : undefined;
    }

    /**
     * Spawns a new native `mod.SFX` spatial object at the given position (default 0,0,0) with zero rotation.
     * @param sfxAsset - The runtime spawn asset.
     * @param position - Optional 3D spawn position (mod.Vector or Vectors.Vector3).
     * @returns The spawned `mod.SFX` spatial object.
     */
    export function create(sfxAsset: mod.RuntimeSpawn_Common, position?: mod.Vector | Vectors.Vector3): mod.SFX {
        const sfx = mod.SpawnObject(sfxAsset, _getVector(position) ?? _ZERO_VECTOR, _ZERO_VECTOR) as mod.SFX;

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(`Sound ${mod.GetObjId(sfx)} created`, LogLevel.Debug);
        }

        return sfx;
    }

    /**
     * Plays any `mod.SFX` object with the specified amplitude and optional configuration.
     * Note: `position` and `attenuationRange` in options are ignored for 2D sounds.
     * @param sfx - The `mod.SFX` object.
     * @param amplitude - The playback amplitude.
     * @param options - Optional playback configuration.
     * @throws {Error} If the target type is invalid.
     */
    export function play(sfx: mod.SFX, amplitude: number, options?: PlayOptions): void {
        const sfxId = mod.GetObjId(sfx);

        _cancelTimers(sfxId);

        _playInternal(
            sfx,
            sfxId,
            amplitude,
            options?.target,
            options?.position,
            options?.attenuationRange,
            options?.duration,
            options?.fadeOptions,
            false
        );
    }

    /**
     * Fire-and-forget helper: creates an SFX, plays it for the specified duration,
     * and automatically unspawns/disposes it when finished.
     * Note: `position` and `attenuationRange` in options are ignored for 2D sounds.
     * @param sfxAsset - The runtime spawn asset.
     * @param duration - The playback duration in milliseconds.
     * @param amplitude - The playback amplitude.
     * @param options - Optional playback configuration.
     * @returns The spawned `mod.SFX` spatial object.
     * @throws {Error} If the target type is invalid.
     */
    export function playOneShot(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number,
        options?: PlayOneShotOptions
    ): mod.SFX {
        const sfx = create(sfxAsset, options?.position);

        _playInternal(
            sfx,
            mod.GetObjId(sfx),
            amplitude,
            options?.target,
            options?.position,
            options?.attenuationRange,
            duration,
            options?.fadeOptions,
            true
        );

        return sfx;
    }

    /**
     * Stops playback and clears any active stop or fade timers.
     * @param sfx - The `mod.SFX` object.
     * @param delay - Optional delay in milliseconds before stopping the sound. Default is 0 (stops immediately).
     */
    export function stop(sfx: mod.SFX, delay: number = 0): void {
        const sfxId = mod.GetObjId(sfx);

        _cancelStop(sfxId);
        _cancelFade(sfxId);

        if (delay > 0) {
            const state = _getOrCreateState(sfxId);

            state.stopTimerId = Timers.setTimeout(() => {
                _cancelStop(sfxId);

                if (isValid(sfxId)) {
                    mod.StopSound(sfx);
                }

                if (logging.willLog(LogLevel.Info)) {
                    logging.log(`Sound ${sfxId} stopped`, LogLevel.Info);
                }
            }, delay);

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Sound ${sfxId} scheduled to stop in ${delay}ms`, LogLevel.Info);
            }

            return;
        }

        if (isValid(sfxId)) {
            mod.StopSound(sfx);
        }

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Sound ${sfxId} stopped`, LogLevel.Info);
        }
    }

    /**
     * Fades the amplitude of a sound over time using a stepped interval.
     * @param sfx - The `mod.SFX` object.
     * @param options - Fade configuration options.
     */
    export function fade(sfx: mod.SFX, options: FadeOptions): void {
        const sfxId = mod.GetObjId(sfx);

        _fadeInternal(
            sfx,
            sfxId,
            options.startAmplitude,
            options.targetAmplitude,
            options.delay,
            options.duration,
            options.steps,
            options.stopOnComplete,
            false
        );
    }

    /**
     * Cancels an active auto-stop timer on the sound.
     * @param sfx - The `mod.SFX` object.
     */
    export function cancelStop(sfx: mod.SFX): void {
        _cancelStop(mod.GetObjId(sfx));
    }

    /**
     * Cancels an active fade timer on the sound.
     * @param sfx - The `mod.SFX` object.
     */
    export function cancelFade(sfx: mod.SFX): void {
        _cancelFade(mod.GetObjId(sfx));
    }

    /**
     * Sets the amplitude of a sound immediately.
     * @param sfx - The `mod.SFX` object.
     * @param amplitude - The target amplitude.
     */
    export function setAmplitude(sfx: mod.SFX, amplitude: number): void {
        const sfxId = mod.GetObjId(sfx);

        if (!isValid(sfxId)) return;

        mod.SetSoundAmplitude(sfx, amplitude);

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Sound ${sfxId} amplitude set to ${amplitude.toFixed(2)}`, LogLevel.Info);
        }
    }

    /**
     * Stops playback, clears timers, removes state, and unspawns the `mod.SFX` object.
     * @param sfx - The `mod.SFX` object.
     */
    export function dispose(sfx: mod.SFX): void {
        const sfxId = mod.GetObjId(sfx);

        _cancelTimers(sfxId);

        if (isValid(sfxId)) {
            mod.StopSound(sfx);
            mod.UnspawnObject(sfx);
        }

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(`Sound ${sfxId} disposed`, LogLevel.Debug);
        }
    }

    /**
     * Checks if the sound ID is currently valid and spawned in the engine.
     * @param sfxId - The numeric object ID of the SFX.
     * @returns True if the SFX object exists and is valid.
     */
    export function isValid(sfxId: number): boolean {
        return mod.IsValid(mod.GetSFX(sfxId));
    }
}
