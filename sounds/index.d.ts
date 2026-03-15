import { Logging } from '../logging/index.ts';
export declare namespace Sounds {
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
    type Target = mod.Player | mod.Squad | mod.Team;
    abstract class Sound {
        protected constructor(sfxAsset: mod.RuntimeSpawn_Common, spawnSFX: () => mod.SFX, options?: Options);
        protected _disposed: boolean;
        protected _playing: boolean;
        protected _sfxAsset: mod.RuntimeSpawn_Common;
        protected _amplitude: number;
        protected _target?: Target;
        protected _sfx: mod.SFX;
        protected _sfxId: number;
        protected _stopTimer?: number;
        protected _fadeTimer?: number;
        protected _play?: () => void;
        protected _getPlayLog?: (duration?: number) => string;
        protected _oneShot(options?: OneShotOptions): () => void;
        get disposed(): boolean;
        get playing(): boolean;
        get sfxAsset(): mod.RuntimeSpawn_Common;
        get amplitude(): number;
        set amplitude(amplitude: number);
        setAmplitude(amplitude: number): this;
        get target(): Target | undefined;
        play(duration?: number): this;
        stop(): this;
        fade(options?: FadeOptions): this;
        cancelStop(): this;
        cancelFade(): this;
        dispose(): void;
    }
    /**
     * The options for sound creation.
     */
    type Options = {
        /**
         * The amplitude of the sound. Default is 1.
         */
        amplitude?: number;
        /**
         * The target to play the sound for. Default is undefined, which means all players hear the sound.
         * If specified, only this player/squad/team hears the sound. If undefined, all players hear the sound.
         */
        target?: Target;
    };
    /**
     * The options for sound fading.
     */
    export type FadeOptions = {
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
         * The target amplitude of the sound.
         * Default is 0 (which is a fade out).
         */
        targetAmplitude?: number;
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
     * The options for one-shot sound playback.
     */
    type OneShotOptions = {
        /**
         * The optional duration of the sound in milliseconds, leave undefined for infinite duration (i.e. for looping assets).
         * Note that a duration of 0 is effectively an immediate stop.
         */
        duration?: number;
        /**
         * The optional fade options.
         */
        fadeOptions?: FadeOptions;
    };
    export class Sound2D extends Sound {
        private static _spawnSFX;
        static play(sfxAsset: mod.RuntimeSpawn_Common, options?: OneShotOptions2D): () => void;
        constructor(sfxAsset: mod.RuntimeSpawn_Common, options?: Options2D);
        private _buildPlayLogString;
    }
    /**
     * The options for 2D sound creation.
     */
    export type Options2D = Options;
    /**
     * The options for 2D one-shot sound playback.
     */
    export type OneShotOptions2D = Options2D & OneShotOptions;
    export class Sound3D extends Sound {
        private static _spawnSFX;
        static play(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, options?: OneShotOptions3D): () => void;
        constructor(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, options?: Options3D);
        private _position;
        private _attenuationRange;
        get location(): mod.Vector;
        get attenuationRange(): number;
        set attenuationRange(attenuationRange: number);
        setAttenuationRange(attenuationRange: number): this;
        private _buildPlayLogString;
    }
    /**
     * The options for 3D sound creation.
     */
    export type Options3D = Options & {
        /**
         * The attenuation range of the sound. Default is 10 meters.
         */
        attenuationRange?: number;
    };
    /**
     * The options for 3D one-shot sound playback.
     */
    export type OneShotOptions3D = Options3D & OneShotOptions;
    export {};
}
