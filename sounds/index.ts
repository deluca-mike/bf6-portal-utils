import { Timers } from '../timers/index.ts';
import { Logging } from '../logging/index.ts';

// version 3.0.0
export class Sounds {
    private static readonly _ZERO_VECTOR: mod.Vector = mod.CreateVector(0, 0, 0);

    private static readonly _DEFAULT_2D_DURATION: number = 3_000; // 3 seconds default duration (in milliseconds) for 2D sounds.

    private static readonly _DEFAULT_3D_DURATION: number = 10_000; // 10 seconds default duration (in milliseconds) for 3D sounds.

    // A mapping of sound object pools for each sfx asset that has been requested.
    // This mechanism ensures efficient sound management by reusing sound objects and avoiding unnecessary spawns.
    private static readonly _POOLS: Map<mod.RuntimeSpawn_Common, Sounds.ObjectPool> = new Map();

    private static _logging = new Logging('Sounds');

    private static _totalObjectCount: number = 0;

    private constructor() {}

    private static _getVectorString(vector: mod.Vector): string {
        return `<${mod.XComponentOf(vector).toFixed(2)}, ${mod.YComponentOf(vector).toFixed(2)}, ${mod
            .ZComponentOf(vector)
            .toFixed(2)}>`;
    }

    // Returns the array of `SoundObject` for the given sfx asset, and initializes the array if it doesn't exist.
    private static _getSoundObjectPool(sfxAsset: mod.RuntimeSpawn_Common): Sounds.ObjectPool {
        const soundObjectPool = this._POOLS.get(sfxAsset);

        if (soundObjectPool) return soundObjectPool;

        this._POOLS.set(sfxAsset, { available: new Set(), active: new Set() });

        if (this._logging.willLog(Sounds.LogLevel.Debug)) {
            this._logging.log(`ObjectPool for new SFX asset initialized.`, Sounds.LogLevel.Debug);
        }

        return this._POOLS.get(sfxAsset)!;
    }

    private static _createSoundObject(sfxAsset: mod.RuntimeSpawn_Common, reserve: boolean = true): Sounds.SoundObject {
        const objectPool = this._getSoundObjectPool(sfxAsset);

        const newSoundObject: Sounds.SoundObject = {
            sfx: mod.SpawnObject(sfxAsset, this._ZERO_VECTOR, this._ZERO_VECTOR),
            objectPool,
        };

        (reserve ? objectPool.active : objectPool.available).add(newSoundObject);
        ++this._totalObjectCount;

        if (this._logging.willLog(Sounds.LogLevel.Debug)) {
            this._logging.log(
                `New ${reserve ? 'reserved' : 'available'} SoundObject created. Total SoundObjects is now ${this._totalObjectCount}.`,
                Sounds.LogLevel.Debug
            );
        }

        return newSoundObject;
    }

    // Reserves an available `SoundObject` for the given sfx asset or creates a new reserved `SoundObject`.
    private static _reserveSoundObject(sfxAsset: mod.RuntimeSpawn_Common): Sounds.SoundObject {
        const soundObjects = this._getSoundObjectPool(sfxAsset);
        const soundObject = soundObjects.available.values().next().value;

        if (!soundObject) return this._createSoundObject(sfxAsset);

        soundObjects.available.delete(soundObject);
        soundObjects.active.add(soundObject);

        if (this._logging.willLog(Sounds.LogLevel.Debug)) {
            this._logging.log(
                `SoundObject found 1 out of ${soundObjects.available.size} available SoundObjects.`,
                Sounds.LogLevel.Debug
            );
        }

        return soundObject;
    }

    // Creates a timer that will automatically stop the underlying sound after the specified duration, and returns a
    // function that can be called to stop the sound manually. Once stopped, the sound object is returned to it's
    // object pool's available set.
    private static _createSoundStopper(soundObject: Sounds.SoundObject, duration: number): () => void {
        let stopped = false;

        if (duration > 0) {
            Timers.setTimeout(() => {
                if (stopped) return;

                stopped = true;
                this._stopAndMakeAvailable(soundObject);

                if (this._logging.willLog(Sounds.LogLevel.Debug)) {
                    this._logging.log(`Sound stopped automatically after ${duration}ms.`, Sounds.LogLevel.Debug);
                }
            }, duration);
        }

        return () => {
            if (stopped) {
                this._logging.log(`Sound already stopped.`, Sounds.LogLevel.Warning);
                return;
            }

            stopped = true;
            this._stopAndMakeAvailable(soundObject);

            if (this._logging.willLog(Sounds.LogLevel.Debug)) {
                this._logging.log(`Sound stopped manually.`, Sounds.LogLevel.Debug);
            }
        };
    }

    private static _stopAndMakeAvailable(soundObject: Sounds.SoundObject): void {
        mod.StopSound(soundObject.sfx);
        soundObject.objectPool.active.delete(soundObject);
        soundObject.objectPool.available.add(soundObject);
    }

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
    public static play2D(sfxAsset: mod.RuntimeSpawn_Common, params: Sounds.Params2D = {}): () => void {
        const duration = params.duration ?? this._DEFAULT_2D_DURATION; // Truncate to integer.
        const amplitude = params.amplitude ?? 1;
        const soundObject = this._reserveSoundObject(sfxAsset);

        if (!params.target) {
            mod.PlaySound(soundObject.sfx, amplitude);

            if (this._logging.willLog(Sounds.LogLevel.Info)) {
                this._logging.log(
                    `2D sound played for all players (amplitude ${amplitude.toFixed(2)}, duration ${duration}ms).`,
                    Sounds.LogLevel.Info
                );
            }
        } else if (mod.IsType(params.target, mod.Types.Player)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Player);

            if (this._logging.willLog(Sounds.LogLevel.Info)) {
                this._logging.log(
                    `2D sound played for player ${mod.GetObjId(params.target as mod.Player)} (amplitude ${amplitude.toFixed(
                        2
                    )}, duration ${duration}ms).`,
                    Sounds.LogLevel.Info
                );
            }
        } else if (mod.IsType(params.target, mod.Types.Squad)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Squad);

            if (this._logging.willLog(Sounds.LogLevel.Info)) {
                this._logging.log(
                    `2D sound played for squad (amplitude ${amplitude.toFixed(2)}, duration ${duration}ms).`,
                    Sounds.LogLevel.Info
                ); // TODO: Get Squad ID if and when API is fixed.
            }
        } else if (mod.IsType(params.target, mod.Types.Team)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Team);

            if (this._logging.willLog(Sounds.LogLevel.Info)) {
                this._logging.log(
                    `2D sound played for player ${mod.GetObjId(params.target as mod.Team)} (amplitude ${amplitude.toFixed(
                        2
                    )}, duration ${duration}ms).`,
                    Sounds.LogLevel.Info
                );
            }
        }

        return this._createSoundStopper(soundObject, duration);
    }

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
    public static play3D(
        sfxAsset: mod.RuntimeSpawn_Common,
        position: mod.Vector,
        params: Sounds.Params3D = {}
    ): () => void {
        const soundObject = this._reserveSoundObject(sfxAsset);
        const amplitude = params.amplitude ?? 1;
        const attenuationRange = params.attenuationRange ?? 10;
        const duration = params.duration ?? this._DEFAULT_3D_DURATION;

        mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange);

        if (this._logging.willLog(Sounds.LogLevel.Info)) {
            this._logging.log(
                `3D sound played at position ${this._getVectorString(position)} (amplitude ${amplitude.toFixed(
                    2
                )}, att. range ${attenuationRange.toFixed(2)}m, duration ${duration}ms).`,
                Sounds.LogLevel.Info
            );
        }

        return this._createSoundStopper(soundObject, duration);
    }

    /**
     * Creates a new `SoundObject` for the given sfx asset, if it doesn't exist. This helps the game client load the
     * sound asset in memory so it can play quicker when needed. This is only needed once per asset, if at all.
     * @param sfxAsset - The sfx asset to preload.
     */
    public static preload(sfxAsset: mod.RuntimeSpawn_Common): void {
        if (this._POOLS.get(sfxAsset)) return; // Already loaded.

        this._createSoundObject(sfxAsset, false);
    }

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    public static setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        this._logging.setLogging(log, logLevel, includeError);
    }

    // Returns the total number of `SoundObject`s created.
    public static get objectCount(): number {
        return this._totalObjectCount;
    }

    // Returns the number of `SoundObject`s created for the given sfx asset.
    public static objectCountsForAsset(sfxAsset: mod.RuntimeSpawn_Common): Sounds.ObjectCounts {
        const objectPool = this._POOLS.get(sfxAsset);

        return {
            available: objectPool?.available.size ?? 0,
            active: objectPool?.active.size ?? 0,
        };
    }
}

export namespace Sounds {
    export type SoundObject = {
        sfx: mod.SFX;
        objectPool: ObjectPool;
    };

    export type ObjectPool = {
        available: Set<SoundObject>;
        active: Set<SoundObject>;
    };

    export type ObjectCounts = {
        available: number;
        active: number;
    };

    export type Params2D = {
        amplitude?: number;
        target?: mod.Player | mod.Squad | mod.Team;
        duration?: number; // In milliseconds, 0 for infinite duration (i.e. for looping assets)
    };

    export type Params3D = {
        amplitude?: number;
        attenuationRange?: number;
        duration?: number; // In milliseconds, 0 for infinite duration (i.e. for looping assets)
    };

    export const LogLevel = Logging.LogLevel;
}
