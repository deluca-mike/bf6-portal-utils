import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 5.0.0.
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
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    const DEFAULT_AMPLITUDE: number = 1.0;

    const DEFAULT_FADE_DURATION: number = 2_000; // 2 seconds default fade duration (in milliseconds).

    const DEFAULT_FADE_STEPS: number = 10;

    const DEFAULT_ATTENUATION_RANGE: number = 10; // 10 meters default attenuation range (in meters).

    const ONE_SHOT_DISPOSE_BUFFER_TIME: number = 100; // 100ms buffer time to ensure the stop or fade can occur.

    type Target = mod.Player | mod.Squad | mod.Team;

    abstract class Sound {
        protected constructor(sfxAsset: mod.RuntimeSpawn_Common, spawnSFX: () => mod.SFX, options?: Options) {
            this._sfxAsset = sfxAsset;
            this._amplitude = options?.amplitude ?? DEFAULT_AMPLITUDE;
            this._target = options?.target;
            this._sfx = spawnSFX();
            this._sfxId = mod.GetObjId(this._sfx);
        }

        protected _disposed: boolean = false;

        protected _playing: boolean = false;

        protected _sfxAsset: mod.RuntimeSpawn_Common;

        protected _amplitude: number;

        protected _target?: Target;

        protected _sfx: mod.SFX;

        protected _sfxId: number;

        protected _stopTimer?: number;

        protected _fadeTimer?: number;

        protected _play?: () => void;

        protected _getPlayLog?: (duration?: number) => string;

        protected _oneShot(options?: OneShotOptions): () => void {
            this.play(options?.duration);

            if (options?.fadeOptions) {
                this.fade(options.fadeOptions);
            }

            const playDuration = options?.duration ?? Number.MAX_SAFE_INTEGER;

            const fadeStopDuration = options?.fadeOptions?.stopOnComplete
                ? (options.fadeOptions?.delay ?? 0) + (options.fadeOptions?.duration ?? DEFAULT_FADE_DURATION)
                : Number.MAX_SAFE_INTEGER;

            const earliestStopDuration = Math.min(playDuration, fadeStopDuration);

            const stop = () => {
                this.cancelStop();
                this.cancelFade();
                this.stop();
                this.dispose();

                if (logging.willLog(LogLevel.Debug)) {
                    logging.log(`One-shot sound ${this._sfxId} auto-stopped.`, LogLevel.Debug);
                }
            };

            const autoStopTimer =
                earliestStopDuration < Number.MAX_SAFE_INTEGER
                    ? Timers.setTimeout(stop, earliestStopDuration + ONE_SHOT_DISPOSE_BUFFER_TIME)
                    : undefined;

            return () => {
                Timers.clearTimeout(autoStopTimer);
                stop();
            };
        }

        public get disposed(): boolean {
            return this._disposed;
        }

        public get playing(): boolean {
            return this._playing;
        }

        public get sfxAsset(): mod.RuntimeSpawn_Common {
            return this._sfxAsset;
        }

        public get amplitude(): number {
            return this._amplitude;
        }

        public set amplitude(amplitude: number) {
            if (this._playing) {
                mod.SetSoundAmplitude(this._sfx, amplitude);
            }

            this._amplitude = amplitude;
        }

        public setAmplitude(amplitude: number): this {
            this.amplitude = amplitude;
            return this;
        }

        public get target(): Target | undefined {
            return this._target;
        }

        public play(duration?: number): this {
            this.cancelStop();
            this.cancelFade();

            if (!this._play) return this;

            this._play();

            this._playing = true;

            if (duration !== undefined) {
                this._stopTimer = Timers.setTimeout(() => {
                    this.stop();
                }, duration);
            }

            if (logging.willLog(LogLevel.Info)) {
                logging.log(this._getPlayLog?.(duration) ?? `Sound ${this._sfxId} played`, LogLevel.Info);
            }

            return this;
        }

        public stop(): this {
            if (!this._playing) return this;

            this._playing = false;

            this.cancelStop();
            this.cancelFade();
            mod.StopSound(this._sfx);

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Sound ${this._sfxId} stopped.`, LogLevel.Info);
            }

            return this;
        }

        public fade(options?: FadeOptions): this {
            if (!this._playing) return this;

            const delay = options?.delay ?? 0;
            const targetAmplitude = options?.targetAmplitude ?? 0;
            const stopOnComplete = options?.stopOnComplete ?? targetAmplitude === 0;
            const duration = options?.duration ?? DEFAULT_FADE_DURATION;

            let steps = options?.steps ?? DEFAULT_FADE_STEPS;
            steps = steps > 0 ? steps : 1;

            const stepSize = (this._amplitude - targetAmplitude) / steps;
            const stepDuration = duration / steps;

            const fadeStep = () => {
                this.amplitude = this._amplitude - stepSize;

                if (--steps > 0) {
                    this._fadeTimer = Timers.setTimeout(fadeStep, stepDuration);
                } else {
                    this._fadeTimer = undefined;

                    if (stopOnComplete) {
                        this.stop();
                    }

                    if (logging.willLog(LogLevel.Debug)) {
                        logging.log(`Sound ${this._sfxId} completed fade to ${targetAmplitude}.`, LogLevel.Debug);
                    }
                }
            };

            this.cancelFade();

            this._fadeTimer = Timers.setTimeout(fadeStep, delay + stepDuration);

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Sound ${this._sfxId} fade to ${targetAmplitude} starting in ${delay}ms.`, LogLevel.Info);
            }

            return this;
        }

        public cancelStop(): this {
            if (this._stopTimer) {
                Timers.clearTimeout(this._stopTimer);
                this._stopTimer = undefined;
            }

            return this;
        }

        public cancelFade(): this {
            if (this._fadeTimer) {
                Timers.clearTimeout(this._fadeTimer);
                this._fadeTimer = undefined;
            }

            return this;
        }

        public dispose(): void {
            if (this._playing) {
                this.cancelStop();
                this.cancelFade();
                this.stop();
            }

            if (this._disposed) return;

            mod.UnspawnObject(this._sfx);
            this._disposed = true;

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Sound ${this._sfxId} disposed.`, LogLevel.Debug);
            }
        }
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
        private static _spawnSFX(sfxAsset: mod.RuntimeSpawn_Common): mod.SFX {
            return mod.SpawnObject(sfxAsset, Vectors.ZERO_VECTOR, Vectors.ZERO_VECTOR) as mod.SFX;
        }

        public static play(sfxAsset: mod.RuntimeSpawn_Common, options?: OneShotOptions2D): () => void {
            const sound = new Sound2D(sfxAsset, options);

            return sound._oneShot(options);
        }

        public constructor(sfxAsset: mod.RuntimeSpawn_Common, options?: Options2D) {
            super(sfxAsset, () => Sound2D._spawnSFX(sfxAsset), options);

            if (this._target === undefined) {
                this._play = () => mod.PlaySound(this._sfx, this._amplitude);
                const targetString = 'all players';
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Player)) {
                this._play = () => mod.PlaySound(this._sfx, this._amplitude, this._target as mod.Player);
                const targetString = `player ${mod.GetObjId(this._target as mod.Player)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Squad)) {
                this._play = () => mod.PlaySound(this._sfx, this._amplitude, this._target as mod.Squad);
                const targetString = `squad ${mod.GetSquadName(this._target as mod.Squad)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Team)) {
                this._play = () => mod.PlaySound(this._sfx, this._amplitude, this._target as mod.Team);
                const targetString = `team ${mod.GetObjId(this._target as mod.Team)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else {
                logging.log(`Target type is invalid.`, LogLevel.Error);
            }

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`2D Sound ${this._sfxId} initialized.`, LogLevel.Debug);
            }
        }

        private _buildPlayLogString(targetString?: string, duration?: number): string {
            if (duration !== undefined) {
                return `Sound ${this._sfxId} played for ${targetString} (amplitude ${this._amplitude.toFixed(2)}, duration ${duration}ms).`;
            } else {
                return `Sound ${this._sfxId} played for ${targetString} (amplitude ${this._amplitude.toFixed(2)}, indefinite duration).`;
            }
        }
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
        private static _spawnSFX(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector): mod.SFX {
            return mod.SpawnObject(sfxAsset, position, Vectors.ZERO_VECTOR) as mod.SFX;
        }

        public static play(
            sfxAsset: mod.RuntimeSpawn_Common,
            position: mod.Vector,
            options?: OneShotOptions3D
        ): () => void {
            const sound = new Sound3D(sfxAsset, position, options);

            return sound._oneShot(options);
        }

        public constructor(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, options?: Options3D) {
            super(sfxAsset, () => Sound3D._spawnSFX(sfxAsset, position), options);

            this._position = position;
            this._attenuationRange = options?.attenuationRange ?? DEFAULT_ATTENUATION_RANGE;

            if (this._target === undefined) {
                this._play = () => mod.PlaySound(this._sfx, this._amplitude, this._position, this._attenuationRange);
                const targetString = 'all players';
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Player)) {
                this._play = () =>
                    mod.PlaySound(
                        this._sfx,
                        this._amplitude,
                        this._position,
                        this._attenuationRange,
                        this._target as mod.Player
                    );

                const targetString = `player ${mod.GetObjId(this._target as mod.Player)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Squad)) {
                this._play = () =>
                    mod.PlaySound(
                        this._sfx,
                        this._amplitude,
                        this._position,
                        this._attenuationRange,
                        this._target as mod.Squad
                    );

                const targetString = `squad ${mod.GetSquadName(this._target as mod.Squad)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else if (mod.IsType(this._target, mod.Types.Team)) {
                this._play = () =>
                    mod.PlaySound(
                        this._sfx,
                        this._amplitude,
                        this._position,
                        this._attenuationRange,
                        this._target as mod.Team
                    );

                const targetString = `team ${mod.GetObjId(this._target as mod.Team)}`;
                this._getPlayLog = (duration?: number) => this._buildPlayLogString(targetString, duration);
            } else {
                logging.log(`Target type is invalid.`, LogLevel.Error);
            }

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(
                    `3D Sound ${this._sfxId} initialized at position ${Vectors.getVectorString(this._position)}.`,
                    LogLevel.Debug
                );
            }
        }

        private _position: mod.Vector;

        private _attenuationRange: number;

        public get location(): mod.Vector {
            return this._position;
        }

        public get attenuationRange(): number {
            return this._attenuationRange;
        }

        public set attenuationRange(attenuationRange: number) {
            this._attenuationRange = attenuationRange;

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Sound ${this._sfxId} attenuation range set to ${attenuationRange}m.`, LogLevel.Info);
            }
        }

        public setAttenuationRange(attenuationRange: number): this {
            this.attenuationRange = attenuationRange;
            return this;
        }

        private _buildPlayLogString(targetString?: string, duration?: number): string {
            if (duration !== undefined) {
                return `Sound ${this._sfxId} played for ${targetString} (amplitude ${this._amplitude.toFixed(2)}, att. range ${this._attenuationRange.toFixed(2)}m, duration ${duration}ms).`;
            } else {
                return `Sound ${this._sfxId} played for ${targetString} (amplitude ${this._amplitude.toFixed(2)}, att. range ${this._attenuationRange.toFixed(2)}m, indefinite duration).`;
            }
        }
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
}
