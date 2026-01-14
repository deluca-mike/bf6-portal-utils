import { Timers } from '../timers/index.ts';

// version 2.0.0
export class Sounds {
    private static readonly _DURATION_BUFFER: number = 1_000; // 1 second buffer (in milliseconds) to add onto duration before making the sound object available for reuse.

    private static readonly _DEFAULT_2D_DURATION: number = 3_000; // 3 seconds default duration (in milliseconds) for 2D sounds.

    private static readonly _DEFAULT_3D_DURATION: number = 10_000; // 10 seconds default duration (in milliseconds) for 3D sounds.

    // A mapping of arrays of sound objects for each sfx asset that has been requested.
    // This mechanism ensures efficient sound management by reusing sound objects and avoiding unnecessary spawns.
    private static readonly _SOUND_OBJECT_POOL: Map<mod.RuntimeSpawn_Common, Sounds.SoundObject[]> = new Map();

    private static _logger?: (text: string) => void;

    private static _logLevel: Sounds.LogLevel = 2;

    private static _soundObjectsCount: number = 0;

    private static _log(logLevel: Sounds.LogLevel, text: string): void {
        if (logLevel < this._logLevel) return;

        this._logger?.(`<Sounds> ${text}`);
    }

    private static _getVectorString(vector: mod.Vector): string {
        return `<${mod.XComponentOf(vector).toFixed(2)}, ${mod.YComponentOf(vector).toFixed(2)}, ${mod
            .ZComponentOf(vector)
            .toFixed(2)}>`;
    }

    // Returns the array of `SoundObject` for the given sfx asset, and initializes the array if it doesn't exist.
    private static _getSoundObjects(sfxAsset: mod.RuntimeSpawn_Common): Sounds.SoundObject[] {
        const soundObjects = this._SOUND_OBJECT_POOL.get(sfxAsset);

        if (soundObjects) return soundObjects;

        this._SOUND_OBJECT_POOL.set(sfxAsset, []);

        this._log(Sounds.LogLevel.Debug, `SoundObjects for new SFX asset initialized.`);

        return this._SOUND_OBJECT_POOL.get(sfxAsset)!;
    }

    // By default, the new `SoundObject` via `_getAvailableSoundObject` within `_DURATION_BUFFER` from now.
    private static _createSoundObject(
        soundObjects: Sounds.SoundObject[],
        sfxAsset: mod.RuntimeSpawn_Common,
        availableTime: number = Date.now() + this._DURATION_BUFFER
    ): Sounds.SoundObject {
        const newSoundObject = {
            sfx: mod.SpawnObject(sfxAsset, mod.CreateVector(0, 0, 0), mod.CreateVector(0, 0, 0)),
            availableTime,
        };

        this._soundObjectsCount++;

        soundObjects.push(newSoundObject);

        this._log(
            Sounds.LogLevel.Debug,
            `New SoundObject created. SFX asset now has ${soundObjects.length} SoundObjects.`
        );

        return newSoundObject;
    }

    // Returns the first available `SoundObject` for the given sfx asset, and creates a new `SoundObject` if none
    // is available.
    private static _getAvailableSoundObject(
        sfxAsset: mod.RuntimeSpawn_Common,
        currentTime: number = Date.now()
    ): Sounds.SoundObject {
        const soundObjects = this._getSoundObjects(sfxAsset);

        const soundObject = soundObjects.find((soundObject) => currentTime >= soundObject.availableTime);

        if (soundObject) {
            this._log(
                Sounds.LogLevel.Debug,
                `Available SoundObject found (in array of ${soundObjects.length} SoundObjects).`
            );
            return soundObject;
        }

        return this._createSoundObject(soundObjects, sfxAsset);
    }

    // Creates a `PlayedSound` with that will automatically stop the underlying sound after the specified duration, and
    // that can be stopped manually.
    private static _createPlayedSound(
        soundObject: Sounds.SoundObject,
        duration: number,
        currentTime: number = Date.now()
    ): Sounds.PlayedSound {
        duration = ~~duration; // Truncate to integer.

        soundObject.availableTime =
            duration == 0
                ? Number.MAX_SAFE_INTEGER
                : (soundObject.availableTime = currentTime + duration + this._DURATION_BUFFER);

        if (duration > 0) {
            soundObject.stopTimerId = Timers.setTimeout(() => {
                this._log(Sounds.LogLevel.Debug, `Sound stopped automatically after ${duration}ms.`);
                this._stop(soundObject);
            }, duration);
        }

        return {
            stop: () => this.stop(soundObject),
        };
    }

    private static _play2DSound(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number
    ): Sounds.PlayedSound {
        const currentTime = Date.now();
        const soundObject = this._getAvailableSoundObject(sfxAsset, currentTime);

        mod.PlaySound(soundObject.sfx, amplitude);

        this._log(
            Sounds.LogLevel.Info,
            `2D sound played for all players (amplitude ${amplitude.toFixed(2)}, duration ${duration}ms).`
        );

        return this._createPlayedSound(soundObject, duration, currentTime);
    }

    private static _play2DSoundForPlayer(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number,
        player: mod.Player
    ): Sounds.PlayedSound {
        const currentTime = Date.now();
        const soundObject = this._getAvailableSoundObject(sfxAsset, currentTime);

        mod.PlaySound(soundObject.sfx, amplitude, player);

        this._log(
            Sounds.LogLevel.Info,
            `2D sound played for player ${mod.GetObjId(player)} (amplitude ${amplitude.toFixed(
                2
            )}, duration ${duration}ms).`
        );

        return this._createPlayedSound(soundObject, duration, currentTime);
    }

    private static _play2DSoundForSquad(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number,
        squad: mod.Squad
    ): Sounds.PlayedSound {
        const currentTime = Date.now();
        const soundObject = this._getAvailableSoundObject(sfxAsset, currentTime);

        mod.PlaySound(soundObject.sfx, amplitude, squad);

        this._log(
            Sounds.LogLevel.Info,
            `2D sound played for squad (amplitude ${amplitude.toFixed(2)}, duration ${duration}ms).`
        ); // TODO: Get Squad ID if and when API is fixed.

        return this._createPlayedSound(soundObject, duration, currentTime);
    }

    private static _play2DSoundForTeam(
        sfxAsset: mod.RuntimeSpawn_Common,
        duration: number,
        amplitude: number,
        team: mod.Team
    ): Sounds.PlayedSound {
        const currentTime = Date.now();
        const soundObject = this._getAvailableSoundObject(sfxAsset, currentTime);

        mod.PlaySound(soundObject.sfx, amplitude, team);

        this._log(
            Sounds.LogLevel.Info,
            `2D sound played for player ${mod.GetObjId(team)} (amplitude ${amplitude.toFixed(
                2
            )}, duration ${duration}ms).`
        );

        return this._createPlayedSound(soundObject, duration, currentTime);
    }

    private static _stop(soundObject: Sounds.SoundObject): void {
        mod.StopSound(soundObject.sfx);
        Timers.clearTimeout(soundObject.stopTimerId);
        soundObject.availableTime = 0;
    }

    public static stop(soundObject: Sounds.SoundObject): void {
        Timers.clearTimeout(soundObject.stopTimerId);

        if (Date.now() > soundObject.availableTime) {
            this._log(Sounds.LogLevel.Info, `Sound already stopped.`);
            return;
        }

        this._log(Sounds.LogLevel.Debug, `Sound stopped manually.`);

        this._stop(soundObject);
    }

    public static play2D(sfxAsset: mod.RuntimeSpawn_Common, params: Sounds.Params2D = {}): Sounds.PlayedSound {
        const duration = ~~(params.duration ?? this._DEFAULT_2D_DURATION); // Truncate to integer.
        const amplitude = params.amplitude ?? 1;

        if (params.player) return this._play2DSoundForPlayer(sfxAsset, duration, amplitude, params.player);

        if (params.squad) return this._play2DSoundForSquad(sfxAsset, duration, amplitude, params.squad);

        if (params.team) return this._play2DSoundForTeam(sfxAsset, duration, amplitude, params.team);

        return this._play2DSound(sfxAsset, duration, amplitude);
    }

    public static play3D(
        sfxAsset: mod.RuntimeSpawn_Common,
        position: mod.Vector,
        params: Sounds.Params3D = {}
    ): Sounds.PlayedSound {
        const currentTime = mod.GetMatchTimeElapsed();
        const soundObject = this._getAvailableSoundObject(sfxAsset, currentTime);
        const amplitude = params.amplitude ?? 1;
        const attenuationRange = params.attenuationRange ?? 10;
        const duration = ~~(params.duration ?? this._DEFAULT_3D_DURATION); // Truncate to integer.

        mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange);

        this._log(
            Sounds.LogLevel.Info,
            `3D sound played at position ${this._getVectorString(position)} (amplitude ${amplitude.toFixed(
                2
            )}, att. range ${attenuationRange.toFixed(2)}m, duration ${duration}ms).`
        ); // TODO: Get Squad ID if and when API is fixed.

        return this._createPlayedSound(soundObject, duration, currentTime);
    }

    // Attaches a logger and defines a minimum log level.
    public static setLogging(log?: (text: string) => void, logLevel?: Sounds.LogLevel): void {
        this._logger = log;
        this._logLevel = logLevel ?? Sounds.LogLevel.Info;
    }

    // Creates a new `SoundObject` for the given sfx asset if it doesn't exist.
    // This helps the game client load the sound asset in memory to it can play quicker when needed.
    // This is only needed once per asset, if at all.
    public static preload(sfxAsset: mod.RuntimeSpawn_Common): void {
        const soundObjects = this._getSoundObjects(sfxAsset);

        if (soundObjects.length) return;

        this._createSoundObject(soundObjects, sfxAsset, 0); // Available time is 0 (i.e. immediately available).
    }

    // Returns the total number of `SoundObject`s created.
    public static get objectCount(): number {
        return this._soundObjectsCount;
    }

    // Returns the number of `SoundObject`s created for the given sfx asset.
    public static objectCountForAsset(sfxAsset: mod.RuntimeSpawn_Common): number {
        return this._getSoundObjects(sfxAsset).length;
    }
}

export namespace Sounds {
    export type SoundObject = {
        sfx: mod.SFX;
        availableTime: number;
        stopTimerId?: number;
    };

    export type PlayedSound = {
        stop: () => void;
    };

    export type Params2D = {
        amplitude?: number;
        player?: mod.Player;
        squad?: mod.Squad;
        team?: mod.Team;
        duration?: number; // In milliseconds, 0 for infinite duration (i.e. for looping assets)
    };

    export type Params3D = {
        amplitude?: number;
        attenuationRange?: number;
        duration?: number; // In milliseconds, 0 for infinite duration (i.e. for looping assets)
    };

    export enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }
}
