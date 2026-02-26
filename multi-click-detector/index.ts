import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version 3.0.0
export class MultiClickDetector {
    private static _logging = new Logging('MCD');

    private static _detectors = new Map<number, { enabled: boolean; detectors: Set<MultiClickDetector> }>();

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

    static {
        Events.OngoingPlayer.subscribe(MultiClickDetector._handleOngoingPlayer);
        Events.OnPlayerDeployed.subscribe(MultiClickDetector._handlePlayerDeployed);
        Events.OnPlayerUndeploy.subscribe(MultiClickDetector._handlePlayerUndeployed);
        Events.OnPlayerLeaveGame.subscribe(MultiClickDetector._handlePlayerLeaveGame);
    }

    private static _handleOngoingPlayer(player: mod.Player): void {
        const playerState = MultiClickDetector._detectors.get(mod.GetObjId(player));

        if (!playerState) return;

        if (!playerState.enabled) return;

        for (const detector of playerState.detectors) {
            detector._handleOngoing();
        }
    }

    private static _handlePlayerDeployed(player: mod.Player): void {
        const playerState = MultiClickDetector._detectors.get(mod.GetObjId(player));

        if (!playerState) return;

        playerState.enabled = true;
    }

    private static _handlePlayerUndeployed(player: mod.Player): void {
        const playerState = MultiClickDetector._detectors.get(mod.GetObjId(player));

        if (!playerState) return;

        playerState.enabled = false;
    }

    private static _handlePlayerLeaveGame(playerId: number): void {
        MultiClickDetector._detectors.delete(playerId);

        MultiClickDetector._logging.log(
            `Player ${playerId} left the game: multi-click detectors cleaned up.`,
            Logging.LogLevel.Warning
        );
    }

    /**
     * Creates a new multi-click detector with specific options.
     * @param player - The player to detect multi-click sequences for.
     * @param callback - The callback to call when a multi-click sequence is detected.
     * @param options - The options for the multi-click detector.
     */
    public constructor(player: mod.Player, callback: () => Promise<void> | void, options?: MultiClickDetector.Options) {
        this._playerId = mod.GetObjId(player);

        this._player = player;
        this._callback = callback;

        if (!MultiClickDetector._detectors.has(this._playerId)) {
            MultiClickDetector._detectors.set(this._playerId, { enabled: false, detectors: new Set() });
        }

        MultiClickDetector._detectors.get(this._playerId)!.detectors.add(this);

        if (!options) return;

        this._soldierState = options.soldierState ?? this._soldierState;
        this._window = options.windowMs ?? this._window;
        this._requiredClicks = options.requiredClicks ?? this._requiredClicks;
    }

    private _player: mod.Player;

    private _playerId: number;

    private _enabled = true;

    private _lastState = false;

    private _clickCount = 0;

    private _sequenceStartTime = 0;

    private _callback: () => Promise<void> | void;

    private _soldierState = mod.SoldierStateBool.IsInteracting;

    private _window = 1_000; // Time window in milliseconds for a valid multi-click sequence.

    private _requiredClicks = 3; // Number of clicks required to trigger a multi-click sequence.

    private _handleOngoing(): void {
        if (!this._enabled) return;

        const currentState = mod.GetSoldierState(this._player, this._soldierState);

        if (currentState === this._lastState) return; // Fast exit for the vast majority of ticks.

        this._lastState = currentState;

        if (!currentState) return; // Return on a falling edge.

        const now = Date.now();

        // If the time window has passed, reset the sequence.
        if (this._clickCount > 0 && now - this._sequenceStartTime > this._window) {
            this._clickCount = 0;
        }

        if (this._clickCount === 0) {
            this._sequenceStartTime = now;
            this._clickCount = 1;

            return;
        }

        if (++this._clickCount !== this._requiredClicks) return;

        this._clickCount = 0; // Reset for next unique sequence.

        CallbackHandler.invokeNoArgs(
            this._callback,
            `player ${this._playerId}`,
            MultiClickDetector._logging,
            Logging.LogLevel.Error
        );

        if (MultiClickDetector._logging.willLog(Logging.LogLevel.Info)) {
            MultiClickDetector._logging.log(
                `Player ${this._playerId} performed multi-click sequence.`,
                Logging.LogLevel.Info
            );
        }
    }

    public enable(): void {
        this._enabled = true;
    }

    public disable(): void {
        this._enabled = false;
    }

    /**
     * Destroys the multi-click detector.
     */
    public destroy(): void {
        const playerState = MultiClickDetector._detectors.get(this._playerId);

        if (!playerState) return;

        playerState.detectors.delete(this);

        if (playerState.detectors.size === 0) {
            MultiClickDetector._detectors.delete(this._playerId);
        }
    }
}

export namespace MultiClickDetector {
    /**
     * The options for the multi-click detector.
     */
    export interface Options {
        /**
         * The soldier state boolean to use for the multi-click detector.
         */
        soldierState?: mod.SoldierStateBool;
        /**
         * The window in milliseconds for a valid multi-click sequence.
         */
        windowMs?: number;
        /**
         * The number of clicks required to trigger a multi-click sequence.
         */
        requiredClicks?: number;
    }

    /**
     * The log levels.
     */
    export const LogLevel = Logging.LogLevel;
}
