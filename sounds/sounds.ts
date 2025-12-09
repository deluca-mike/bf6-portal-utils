// version 1.0.0

// TODO: Consider a `play` function on `Sounds.PlayedSound` that plays it again and extended the time, or if not available, provisions a new sound object.
// TODO: A purge function or dispose function for old sound objects.
class Sounds {

    private static readonly DURATION_BUFFER: number = 1;

    private static readonly DEFAULT_2D_DURATION: number = 3;

    private static readonly DEFAULT_3D_DURATION: number = 10;

    private static logger?: (text: string) => void;

    private static logLevel: Sounds.LogLevel = 2;

    private static log(logLevel: Sounds.LogLevel, text: string): void {
        if (logLevel < Sounds.logLevel) return;

        Sounds.logger?.(`<Sounds> ${text}`);
    }
    
    private static getVectorString(vector: mod.Vector): string {
        return `<${mod.XComponentOf(vector).toFixed(2)}, ${mod.YComponentOf(vector).toFixed(2)}, ${mod.ZComponentOf(vector).toFixed(2)}>`;
    }

    // A mapping of arrays of sound objects for each sfx asset that has been requested.
    // This mechanism ensures efficient sound management by reusing sound objects and avoiding unnecessary spawns.
    private static soundObjects: Map<mod.RuntimeSpawn_Common, Sounds.SoundObject[]> = new Map();

    // Returns the array of `SoundObject` for the given sfx asset, and initializes the array if it doesn't exist.
    private static getSoundObjects(sfxAsset: mod.RuntimeSpawn_Common): Sounds.SoundObject[] {
        const soundObjects = this.soundObjects.get(sfxAsset);

        if (soundObjects) return soundObjects;

        this.soundObjects.set(sfxAsset, []);

        this.log(Sounds.LogLevel.Debug, `SoundObjects for new SFX asset initialized.`);

        return this.soundObjects.get(sfxAsset)!;
    }

    // Returns the first available `SoundObject` for the given sfx asset, and creates a new `SoundObject` if none is available.
    private static getAvailableSoundObject(sfxAsset: mod.RuntimeSpawn_Common, curentTime: number = mod.GetMatchTimeElapsed()): Sounds.SoundObject {
        const soundObjects = this.getSoundObjects(sfxAsset);

        const soundObject = soundObjects.find((soundObject) => curentTime >= soundObject.availableTime);

        if (soundObject) {
            this.log(Sounds.LogLevel.Debug, `Available SoundObject found.`);
            return soundObject;
        }

        const newSoundObject = {
            sfx: mod.SpawnObject(sfxAsset, mod.CreateVector(0, 0, 0), mod.CreateVector(0, 0, 0)),
            availableTime: 0,
        }

        soundObjects.push(newSoundObject);

        this.log(Sounds.LogLevel.Debug, `New SoundObject created. SFX ssset now has ${soundObjects.length} SoundObjects.`);

        return newSoundObject;
    }

    // Creates a `PlayedSound` with that will automatically stop the underlying sound after the specified duration, and that can be stopped manually.
    private static createPlayedSound(soundObject: Sounds.SoundObject, currentTime: number, duration: number): Sounds.PlayedSound {
        const availableTime = duration == 0 ? Number.MAX_SAFE_INTEGER : soundObject.availableTime = currentTime + duration + this.DURATION_BUFFER;

        const stop = () => {
            soundObject.availableTime = 0;
            mod.StopSound(soundObject.sfx);
        };

        if (duration > 0) {
            mod.Wait(duration).then(() => {
                this.log(Sounds.LogLevel.Debug, `Sound stopped automatically after ${duration} seconds.`);
                stop();
            });
        }

        return {
            stop: () => {
                if (mod.GetMatchTimeElapsed() > availableTime) {
                    this.log(Sounds.LogLevel.Error, `Sound already stopped.`);
                    return;
                }

                this.log(Sounds.LogLevel.Debug, `Sound stopped manually.`);

                stop();
            },
        };
    }

    private static play2DSound(sfxAsset: mod.RuntimeSpawn_Common, currentTime: number, duration: number, amplitude: number): Sounds.PlayedSound {
        const soundObject = this.getAvailableSoundObject(sfxAsset, currentTime);
        mod.PlaySound(soundObject.sfx, amplitude);
        this.log(Sounds.LogLevel.Info, `2D sound played for all players (amplitude ${amplitude.toFixed(2)}, duration ${duration.toFixed(2)}s).`);
        return this.createPlayedSound(soundObject, currentTime, duration);
    }

    private static play2DSoundForPlayer(sfxAsset: mod.RuntimeSpawn_Common, currentTime: number, duration: number, amplitude: number, player: mod.Player): Sounds.PlayedSound {
        const soundObject = this.getAvailableSoundObject(sfxAsset, currentTime);
        mod.PlaySound(soundObject.sfx, amplitude, player);
        this.log(Sounds.LogLevel.Info, `2D sound played for player ${mod.GetObjId(player)} (amplitude ${amplitude.toFixed(2)}, duration ${duration.toFixed(2)}s).`);
        return this.createPlayedSound(soundObject, currentTime, duration);
    }

    private static play2DSoundForSquad(sfxAsset: mod.RuntimeSpawn_Common, currentTime: number, duration: number, amplitude: number, squad: mod.Squad): Sounds.PlayedSound {
        const soundObject = this.getAvailableSoundObject(sfxAsset, currentTime);
        mod.PlaySound(soundObject.sfx, amplitude, squad);
        this.log(Sounds.LogLevel.Info, `2D sound played for squad (amplitude ${amplitude.toFixed(2)}, duration ${duration.toFixed(2)}s).`); // TODO: Get Squad ID if and when API is fixed.
        return this.createPlayedSound(soundObject, currentTime, duration);
    }

    private static play2DSoundForTeam(sfxAsset: mod.RuntimeSpawn_Common, currentTime: number, duration: number, amplitude: number, team: mod.Team): Sounds.PlayedSound {
        const soundObject = this.getAvailableSoundObject(sfxAsset, currentTime);
        mod.PlaySound(soundObject.sfx, amplitude, team);
        this.log(Sounds.LogLevel.Info, `2D sound played for player ${mod.GetObjId(team)} (amplitude ${amplitude.toFixed(2)}, duration ${duration.toFixed(2)}s).`);
        return this.createPlayedSound(soundObject, currentTime, duration);
    }

    public static play2D(sfxAsset: mod.RuntimeSpawn_Common, params: Sounds.Params2D = {}): Sounds.PlayedSound {
        const duration = params.duration ?? this.DEFAULT_2D_DURATION;
        const currentTime = mod.GetMatchTimeElapsed();
        const amplitude = params.amplitude ?? 1;

        if (params.player) return this.play2DSoundForPlayer(sfxAsset, currentTime, duration, amplitude, params.player);

        if (params.squad) return this.play2DSoundForSquad(sfxAsset, currentTime, duration, amplitude, params.squad);

        if (params.team) return this.play2DSoundForTeam(sfxAsset, currentTime, duration, amplitude, params.team);

        return this.play2DSound(sfxAsset, currentTime, duration, amplitude);
    }

    public static play3D(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, params: Sounds.Params3D = {}): Sounds.PlayedSound {
        const currentTime = mod.GetMatchTimeElapsed();
        const soundObject = this.getAvailableSoundObject(sfxAsset, currentTime);
        const amplitude = params.amplitude ?? 1;
        const attenuationRange = params.attenuationRange ?? 10;
        const duration = params.duration ?? this.DEFAULT_3D_DURATION;

        mod.PlaySound(soundObject.sfx, amplitude, position, attenuationRange);

        this.log(Sounds.LogLevel.Info, `3D sound played at position ${this.getVectorString(position)} (amplitude ${amplitude.toFixed(2)}, att. range ${attenuationRange.toFixed(2)}m, duration ${duration.toFixed(2)}s).`); // TODO: Get Squad ID if and when API is fixed.

        return this.createPlayedSound(soundObject, currentTime, duration);
    }

    // Attaches a logger and defines a minimum log level.
    public static setLogging(log?: (text: string) => void, logLevel?: Sounds.LogLevel): void {
        Sounds.logger = log;
        Sounds.logLevel = logLevel ?? Sounds.LogLevel.Info;
    }

}

namespace Sounds {

    export type SoundObject = {
        sfx: mod.SFX,
        availableTime: number,
    }

    export type PlayedSound = {
        stop: () => void,
    }
    
    export type Params2D = {
        amplitude?: number,
        player?: mod.Player,
        squad?: mod.Squad,
        team?: mod.Team,
        duration?: number, // 0 for infinite duration (i.e. for looping assets)
    }

    export type Params3D = {
        amplitude?: number,
        attenuationRange?: number,
        duration?: number, // 0 for infinite duration (i.e. for looping assets)
    }

    export enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }

}
