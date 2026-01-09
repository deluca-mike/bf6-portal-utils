export declare namespace FFASpawning {
    enum LogLevel {
        Debug = 0,
        Info = 1,
        Error = 2,
    }
    type SpawnData = [x: number, y: number, z: number, orientation: number];
    type Spawn = {
        index: number;
        spawnPoint: mod.SpawnPoint;
        location: mod.Vector;
    };
    type InitializeOptions = {
        maxSpawnCandidates?: number;
        minimumSafeDistance?: number;
        maximumInterestingDistance?: number;
        safeOverInterestingFallbackFactor?: number;
        initialPromptDelay?: number;
        promptDelay?: number;
        queueProcessingDelay?: number;
    };
    class Soldier {
        private static readonly _ALL_SOLDIERS;
        private static readonly _PRIME_STEPS;
        private static _spawns;
        private static _maxSpawnCandidates;
        private static _minimumSafeDistance;
        private static _maximumInterestingDistance;
        private static _safeOverInterestingFallbackFactor;
        private static _spawnQueue;
        private static _promptDelay;
        private static _initialPromptDelay;
        private static _queueProcessingDelay;
        private static _queueProcessingEnabled;
        private static _queueProcessingActive;
        private static _logger?;
        private static _logLevel;
        private static _log;
        private static _getRotationVector;
        private static _getBestSpawnPoint;
        private static _getDistanceToClosestPlayer;
        private static _processSpawnQueue;
        static getVectorString(vector: mod.Vector): string;
        static setLogging(log?: (text: string) => void, logLevel?: FFASpawning.LogLevel): void;
        static initialize(spawns: FFASpawning.SpawnData[], options?: FFASpawning.InitializeOptions): void;
        static startDelayForPrompt(player: mod.Player): void;
        static forceIntoQueue(player: mod.Player): void;
        static enableSpawnQueueProcessing(): void;
        static disableSpawnQueueProcessing(): void;
        constructor(player: mod.Player);
        private _player;
        private _playerId;
        private _isAISoldier;
        private _delayCountdown;
        private _delayCountdownInterval?;
        private _promptUI?;
        private _countdownUI?;
        get player(): mod.Player;
        get playerId(): number;
        startDelayForPrompt(delay?: number): void;
        private _handleDelayCountdown;
        private _addToQueue;
        private _deleteIfNotValid;
    }
}
