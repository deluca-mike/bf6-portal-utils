import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace Sounds {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    type Target = mod.Player | mod.Squad | mod.Team;
    /**
     * The options for sound fading.
     */
    type FadeOptions = {
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
    type PlayOptions = {
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
    type PlayOneShotOptions = PlayOptions;
    /**
     * Spawns a new native `mod.SFX` spatial object at the given position (default 0,0,0) with zero rotation.
     * @param sfxAsset - The runtime spawn asset.
     * @param position - Optional 3D spawn position (mod.Vector or Vectors.Vector3).
     * @returns The spawned `mod.SFX` spatial object.
     */
    function create(sfxAsset: mod.RuntimeSpawn_Common, position?: mod.Vector | Vectors.Vector3): mod.SFX;
    /**
     * Plays any `mod.SFX` object with the specified amplitude and optional configuration.
     * Note: `position` and `attenuationRange` in options are ignored for 2D sounds.
     * @param sfx - The `mod.SFX` object.
     * @param amplitude - The playback amplitude.
     * @param options - Optional playback configuration.
     * @throws {Error} If the target type is invalid.
     */
    function play(sfx: mod.SFX, amplitude: number, options?: PlayOptions): void;
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
    function playOneShot(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number,
        options?: PlayOneShotOptions
    ): mod.SFX;
    /**
     * Stops playback and clears any active stop or fade timers.
     * @param sfx - The `mod.SFX` object.
     * @param delay - Optional delay in milliseconds before stopping the sound. Default is 0 (stops immediately).
     */
    function stop(sfx: mod.SFX, delay?: number): void;
    /**
     * Fades the amplitude of a sound over time using a stepped interval.
     * @param sfx - The `mod.SFX` object.
     * @param options - Fade configuration options.
     */
    function fade(sfx: mod.SFX, options: FadeOptions): void;
    /**
     * Cancels an active auto-stop timer on the sound.
     * @param sfx - The `mod.SFX` object.
     */
    function cancelStop(sfx: mod.SFX): void;
    /**
     * Cancels an active fade timer on the sound.
     * @param sfx - The `mod.SFX` object.
     */
    function cancelFade(sfx: mod.SFX): void;
    /**
     * Sets the amplitude of a sound immediately.
     * @param sfx - The `mod.SFX` object.
     * @param amplitude - The target amplitude.
     */
    function setAmplitude(sfx: mod.SFX, amplitude: number): void;
    /**
     * Stops playback, clears timers, removes state, and unspawns the `mod.SFX` object.
     * @param sfx - The `mod.SFX` object.
     */
    function dispose(sfx: mod.SFX): void;
    /**
     * Checks if the sound ID is currently valid and spawned in the engine.
     * @param sfxId - The numeric object ID of the SFX.
     * @returns True if the SFX object exists and is valid.
     */
    function isValid(sfxId: number): boolean;
}
