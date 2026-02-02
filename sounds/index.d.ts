import { Logging } from '../logging/index.ts';
export declare class Sounds {
    private static readonly _ZERO_VECTOR;
    private static readonly _DEFAULT_2D_DURATION;
    private static readonly _DEFAULT_3D_DURATION;
    private static readonly _POOLS;
    private static _logging;
    private static _totalObjectCount;
    private constructor();
    private static _getVectorString;
    private static _getSoundObjectPool;
    private static _createSoundObject;
    private static _reserveSoundObject;
    private static _createSoundStopper;
    private static _stopAndMakeAvailable;
    /**
     * Plays a 2D sound.
     * @param sfxAsset - The sfx asset to play.
     * @param params - The parameters for the sound.
     *   - `amplitude`: The amplitude of the sound.
     *   - `target`: The target to play the sound for. Can be a `mod.Player`, `mod.Squad`, `mod.Team`, or `undefined` to
     *               play the sound for all players.
     *   - `duration`: The duration of the sound in milliseconds, 0 for infinite duration (i.e. for looping assets).
     * @returns The played sound.
     */
    static play2D(sfxAsset: mod.RuntimeSpawn_Common, params?: Sounds.Params2D): () => void;
    /**
     * Plays a 3D sound.
     * @param sfxAsset - The sfx asset to play.
     * @param position - The position to play the sound at.
     * @param params - The parameters for the sound.
     *   - `amplitude`: The amplitude of the sound.
     *   - `attenuationRange`: The attenuation range of the sound.
     *   - `duration`: The duration of the sound in milliseconds, 0 for infinite duration (i.e. for looping assets).
     * @returns The played sound.
     */
    static play3D(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, params?: Sounds.Params3D): () => void;
    /**
     * Creates a new `SoundObject` for the given sfx asset, if it doesn't exist. This helps the game client load the
     * sound asset in memory so it can play quicker when needed. This is only needed once per asset, if at all.
     * @param sfxAsset - The sfx asset to preload.
     */
    static preload(sfxAsset: mod.RuntimeSpawn_Common): void;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    static get objectCount(): number;
    static objectCountsForAsset(sfxAsset: mod.RuntimeSpawn_Common): Sounds.ObjectCounts;
}
export declare namespace Sounds {
    type SoundObject = {
        sfx: mod.SFX;
        objectPool: ObjectPool;
    };
    type ObjectPool = {
        available: Set<SoundObject>;
        active: Set<SoundObject>;
    };
    type ObjectCounts = {
        available: number;
        active: number;
    };
    /**
     * The parameters for 2D sound playback.
     */
    type Params2D = {
        /**
         * The amplitude of the sound. Default is 1.
         */
        amplitude?: number;
        /**
         * The target to play the sound for. Default is undefined, which means all players hear the sound.
         * If specified, only this player/squad/team hears the sound. If undefined, all players hear the sound.
         */
        target?: mod.Player | mod.Squad | mod.Team;
        /**
         * The duration of the sound in milliseconds, 0 for infinite duration (i.e. for looping assets).
         * Default is 3,000 milliseconds.
         */
        duration?: number;
    };
    /**
     * The parameters for 3D sound playback.
     */
    type Params3D = {
        /**
         * The amplitude of the sound. Default is 1.
         */
        amplitude?: number;
        /**
         * The attenuation range of the sound. Default is 10 meters.
         */
        attenuationRange?: number;
        /**
         * The duration of the sound in milliseconds, 0 for infinite duration (i.e. for looping assets).
         * Default is 10,000 milliseconds.
         */
        duration?: number;
    };
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
}
