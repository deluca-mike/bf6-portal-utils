export declare class Sounds {
    private static readonly _DURATION_BUFFER;
    private static readonly _DEFAULT_2D_DURATION;
    private static readonly _DEFAULT_3D_DURATION;
    private static readonly _SOUND_OBJECT_POOL;
    private static _logger?;
    private static _logLevel;
    private static _soundObjectsCount;
    private static _log;
    private static _getVectorString;
    private static _getSoundObjects;
    private static _createSoundObject;
    private static _getAvailableSoundObject;
    private static _createPlayedSound;
    private static _play2DSound;
    private static _play2DSoundForPlayer;
    private static _play2DSoundForSquad;
    private static _play2DSoundForTeam;
    static play2D(sfxAsset: mod.RuntimeSpawn_Common, params?: Sounds.Params2D): Sounds.PlayedSound;
    static play3D(
        sfxAsset: mod.RuntimeSpawn_Common,
        position: mod.Vector,
        params?: Sounds.Params3D
    ): Sounds.PlayedSound;
    static setLogging(log?: (text: string) => void, logLevel?: Sounds.LogLevel): void;
    static preload(sfxAsset: mod.RuntimeSpawn_Common): void;
    static get objectCount(): number;
    static objectCountForAsset(sfxAsset: mod.RuntimeSpawn_Common): number;
}
export declare namespace Sounds {
    type SoundObject = {
        sfx: mod.SFX;
        availableTime: number;
    };
    type PlayedSound = {
        stop: () => void;
    };
    type Params2D = {
        amplitude?: number;
        player?: mod.Player;
        squad?: mod.Squad;
        team?: mod.Team;
        duration?: number;
    };
    type Params3D = {
        amplitude?: number;
        attenuationRange?: number;
        duration?: number;
    };
    enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }
}
