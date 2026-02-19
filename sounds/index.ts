import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 4.0.0.
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

    type SoundObject = {
        sfx: mod.SFX;
        objectPool: ObjectPool;
    };

    type ObjectPool = {
        available: Set<SoundObject>;
        active: Set<SoundObject>;
    };

    /**
     * The number of `SoundObject`s available and active for the given sfx asset.
     */
    export type ObjectCounts = {
        available: number;
        active: number;
    };

    /**
     * The parameters for 2D sound playback.
     */
    export type Params2D = {
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
    export type Params3D = {
        /**
         * The amplitude of the sound. Default is 1.
         */
        amplitude?: number;
        /**
         * The attenuation range of the sound. Default is 10 meters.
         */
        attenuationRange?: number;
        /**
         * The target to play the sound for. Default is undefined, which means all players in range hear the sound.
         * If specified, only this player/squad/team in range hears the sound. If undefined, all players in range hear the sound.
         */
        target?: mod.Player | mod.Squad | mod.Team;
        /**
         * The duration of the sound in milliseconds, 0 for infinite duration (i.e. for looping assets).
         * Default is 10,000 milliseconds.
         */
        duration?: number;
    };

    const DEFAULT_2D_DURATION: number = 3_000; // 3 seconds default duration (in milliseconds) for 2D sounds.

    const DEFAULT_3D_DURATION: number = 10_000; // 10 seconds default duration (in milliseconds) for 3D sounds.

    // A mapping of sound object pools for each sfx asset that has been requested.
    // This mechanism ensures efficient sound management by reusing sound objects and avoiding unnecessary spawns.
    const POOLS: Map<mod.RuntimeSpawn_Common, ObjectPool> = new Map();

    let totalObjectCount: number = 0;

    // Returns the array of `SoundObject` for the given sfx asset, and initializes the array if it doesn't exist.
    function getSoundObjectPool(sfxAsset: mod.RuntimeSpawn_Common): ObjectPool {
        const soundObjectPool = POOLS.get(sfxAsset);

        if (soundObjectPool) return soundObjectPool;

        POOLS.set(sfxAsset, { available: new Set(), active: new Set() });

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(`ObjectPool for new SFX asset initialized.`, LogLevel.Debug);
        }

        return POOLS.get(sfxAsset)!;
    }

    function createSoundObject(sfxAsset: mod.RuntimeSpawn_Common, reserve: boolean = true): SoundObject {
        const objectPool = getSoundObjectPool(sfxAsset);

        const newSoundObject: SoundObject = {
            sfx: mod.SpawnObject(sfxAsset, Vectors.ZERO_VECTOR, Vectors.ZERO_VECTOR),
            objectPool,
        };

        (reserve ? objectPool.active : objectPool.available).add(newSoundObject);
        ++totalObjectCount;

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(
                `New ${reserve ? 'reserved' : 'available'} SoundObject created. Total SoundObjects is now ${totalObjectCount}.`,
                LogLevel.Debug
            );
        }

        return newSoundObject;
    }

    // Reserves an available `SoundObject` for the given sfx asset or creates a new reserved `SoundObject`.
    function reserveSoundObject(sfxAsset: mod.RuntimeSpawn_Common): SoundObject {
        const soundObjects = getSoundObjectPool(sfxAsset);
        const soundObject = soundObjects.available.values().next().value;

        if (!soundObject) return createSoundObject(sfxAsset);

        soundObjects.available.delete(soundObject);
        soundObjects.active.add(soundObject);

        if (logging.willLog(LogLevel.Debug)) {
            logging.log(
                `SoundObject found 1 out of ${soundObjects.available.size} available SoundObjects.`,
                LogLevel.Debug
            );
        }

        return soundObject;
    }

    async function stopAndMakeAvailable(soundObject: SoundObject): Promise<void> {
        mod.StopSound(soundObject.sfx);
        soundObject.objectPool.active.delete(soundObject);

        const makeAvailable = () => {
            soundObject.objectPool.available.add(soundObject);
        };

        Timers.setTimeout(makeAvailable, 1_000);
    }

    // Creates a timer that will automatically stop the underlying sound after the specified duration, and returns a
    // function that can be called to stop the sound manually. Once stopped, the sound object is returned to it's
    // object pool's available set.
    function createSoundStopper(soundObject: SoundObject, duration: number): () => void {
        let stopped = false;

        if (duration > 0) {
            const stop = () => {
                if (stopped) return;

                stopped = true;
                stopAndMakeAvailable(soundObject);

                if (logging.willLog(LogLevel.Debug)) {
                    logging.log(`Sound stopped automatically after ${duration}ms.`, LogLevel.Debug);
                }
            };

            Timers.setTimeout(stop, duration);
        }

        return () => {
            if (stopped) {
                logging.log(`Sound already stopped.`, LogLevel.Warning);
                return;
            }

            stopped = true;
            stopAndMakeAvailable(soundObject);

            if (logging.willLog(LogLevel.Debug)) {
                logging.log(`Sound stopped manually.`, LogLevel.Debug);
            }
        };
    }

    function log2D(targetString: string, amplitude: number, duration: number): void {
        logging.log(
            `2D sound played for ${targetString} (amplitude ${amplitude.toFixed(2)}, duration ${duration}ms).`,
            LogLevel.Info
        );
    }

    function log3D(
        position: mod.Vector,
        targetString: string,
        amplitude: number,
        attenuationRange: number,
        duration: number
    ): void {
        logging.log(
            `3D sound played at position ${Vectors.getVectorString(position)} for ${targetString} (amplitude ${amplitude.toFixed(
                2
            )}, att. range ${attenuationRange.toFixed(2)}m, duration ${duration}ms).`,
            LogLevel.Info
        );
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
    export function play2D(sfxAsset: mod.RuntimeSpawn_Common, params: Params2D = {}): () => void {
        const duration = params.duration ?? DEFAULT_2D_DURATION;
        const amplitude = params.amplitude ?? 1;
        const soundObject = reserveSoundObject(sfxAsset);

        if (!params.target) {
            mod.PlaySound(soundObject.sfx, amplitude);

            if (logging.willLog(LogLevel.Info)) {
                log2D('all players', amplitude, duration);
            }
        } else if (mod.IsType(params.target, mod.Types.Player)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Player);

            if (logging.willLog(LogLevel.Info)) {
                log2D(`player ${mod.GetObjId(params.target as mod.Player)}`, amplitude, duration);
            }
        } else if (mod.IsType(params.target, mod.Types.Squad)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Squad);

            if (logging.willLog(LogLevel.Info)) {
                log2D(`squad ${mod.GetSquadName(params.target as mod.Squad)}`, amplitude, duration);
            }
        } else if (mod.IsType(params.target, mod.Types.Team)) {
            mod.PlaySound(soundObject.sfx, amplitude, params.target as mod.Team);

            if (logging.willLog(LogLevel.Info)) {
                log2D(`team ${mod.GetObjId(params.target as mod.Team)}`, amplitude, duration);
            }
        }

        return createSoundStopper(soundObject, duration);
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
    export function play3D(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, params: Params3D = {}): () => void {
        const soundObject = reserveSoundObject(sfxAsset);
        const amplitude = params.amplitude ?? 1;
        const attenuationRange = params.attenuationRange ?? 10;
        const duration = params.duration ?? DEFAULT_3D_DURATION;

        if (!params.target) {
            mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange);

            if (logging.willLog(LogLevel.Info)) {
                log3D(position, 'all players', amplitude, attenuationRange, duration);
            }
        } else if (mod.IsType(params.target, mod.Types.Player)) {
            mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange, params.target as mod.Player);

            if (logging.willLog(LogLevel.Info)) {
                log3D(
                    position,
                    `player ${mod.GetObjId(params.target as mod.Player)}`,
                    amplitude,
                    attenuationRange,
                    duration
                );
            }
        } else if (mod.IsType(params.target, mod.Types.Squad)) {
            mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange, params.target as mod.Squad);

            if (logging.willLog(LogLevel.Info)) {
                log3D(
                    position,
                    `squad ${mod.GetSquadName(params.target as mod.Squad)}`,
                    amplitude,
                    attenuationRange,
                    duration
                );
            }
        } else if (mod.IsType(params.target, mod.Types.Team)) {
            mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange, params.target as mod.Team);

            if (logging.willLog(LogLevel.Info)) {
                log3D(
                    position,
                    `team ${mod.GetObjId(params.target as mod.Team)}`,
                    amplitude,
                    attenuationRange,
                    duration
                );
            }
        }

        return createSoundStopper(soundObject, duration);
    }

    /**
     * Creates a new `SoundObject` for the given sfx asset, if it doesn't exist. This helps the game client load the
     * sound asset in memory so it can play quicker when needed. This is only needed once per asset, if at all.
     * @param sfxAsset - The sfx asset to preload.
     */
    export function preload(sfxAsset: mod.RuntimeSpawn_Common): void {
        if (POOLS.get(sfxAsset)) return; // Already loaded.

        createSoundObject(sfxAsset, false);
    }

    // Returns the total number of `SoundObject`s created.
    export function objectCount(): number {
        return totalObjectCount;
    }

    // Returns the number of `SoundObject`s created for the given sfx asset.
    export function objectCountsForAsset(sfxAsset: mod.RuntimeSpawn_Common): ObjectCounts {
        const objectPool = POOLS.get(sfxAsset);

        return {
            available: objectPool?.available.size ?? 0,
            active: objectPool?.active.size ?? 0,
        };
    }
}
