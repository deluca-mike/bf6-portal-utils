import { Logging } from '../logging/index.ts';
export declare namespace FFASpawning {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
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
        private static _getRotationVector;
        private static _getBestSpawnPoint;
        private static _getDistanceToClosestPlayer;
        private static _processSpawnQueue;
        private static _getPosition;
        static getVectorString(vector: mod.Vector): string;
        static initialize(spawns: FFASpawning.SpawnData[], options?: FFASpawning.InitializeOptions): void;
        static startDelayForPrompt(player: mod.Player): void;
        static forceIntoQueue(player: mod.Player): void;
        static enableSpawnQueueProcessing(): void;
        static disableSpawnQueueProcessing(): void;
        constructor(player: mod.Player, showDebugPosition?: boolean);
        private _player;
        private _playerId;
        private _isAISoldier;
        private _delayCountdown;
        private _delayCountdownInterval?;
        private _promptUI?;
        private _countdownUI?;
        private _updatePositionInterval?;
        private _debugPositionUI?;
        get player(): mod.Player;
        get playerId(): number;
        startDelayForPrompt(delay?: number): void;
        private _handleDelayCountdown;
        private _addToQueue;
        private _deleteIfNotValid;
    }
}
