import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';
import { Vectors } from '../vectors/index.ts';

// version: 1.0.2
export class ScavengerDrop {
    private static _logging = new Logging('SCAV');

    private static _nextDropId: number = 1;

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
        ScavengerDrop._logging.setLogging(log, logLevel, includeError);
    }

    /**
     * Creates a new scavenger drop.
     * Should be called immediately after a player dies in the `OnPlayerDied` event handler so that the player's position is still valid.
     * @param body - The body of the player that the scavenger drop is on.
     * @param onScavenge - The callback to invoke when a scavenger is found.
     * @param options - The options for the scavenger drop.
     */
    public constructor(
        body: mod.Player,
        onScavenge: (player: mod.Player) => Promise<void> | void,
        options?: ScavengerDrop.Options
    ) {
        const position = mod.GetSoldierState(body, mod.SoldierStateVector.GetPosition);
        const duration = options?.duration ?? 37_000; // 37 seconds is how long a dead player's bag stays on the ground.
        const checkInterval = options?.checkInterval ?? 200; // 0.2 seconds between checks.

        this._id = ScavengerDrop._nextDropId++;

        const check = () => this._check(position, onScavenge);
        this._intervalId = Timers.setInterval(check, checkInterval);

        const expire = () => this._expire();
        this._endTimeoutId = Timers.setTimeout(expire, duration);

        if (ScavengerDrop._logging.willLog(ScavengerDrop.LogLevel.Debug)) {
            ScavengerDrop._logging.log(
                `Drop ${this._id} created on P-${mod.GetObjId(body)}'s body at ${Vectors.getVectorString(position)}.`,
                ScavengerDrop.LogLevel.Debug
            );
        }
    }

    private _id: number;

    private _checkTickDown: number = 1; // First check will be in 1 check interval.'

    private _intervalId: number;

    private _endTimeoutId: number;

    private clearTimers(): void {
        Timers.clear(this._intervalId);
        Timers.clear(this._endTimeoutId);
    }

    private _check(position: mod.Vector, onScavenge: (player: mod.Player) => Promise<void> | void): void {
        if (--this._checkTickDown > 0) return; // Skip

        const closestScavenger = mod.ClosestPlayerTo(position);

        if (!mod.IsPlayerValid(closestScavenger)) {
            this._checkTickDown = 10; // Check back in 10 ticks.
            return;
        }

        const distance = mod.DistanceBetween(
            position,
            mod.GetSoldierState(closestScavenger, mod.SoldierStateVector.GetPosition)
        );

        // If closest scavenger is too far, check again in a few ticks, scaled by distance.
        if (distance > 2) {
            this._checkTickDown = Math.min(10, Math.max(1, Math.floor(distance / 4)));
            return;
        }

        this.clearTimers();

        CallbackHandler.invoke(
            onScavenge,
            [closestScavenger],
            `drop ${this._id}`,
            ScavengerDrop._logging,
            Logging.LogLevel.Error
        );

        if (ScavengerDrop._logging.willLog(ScavengerDrop.LogLevel.Info)) {
            ScavengerDrop._logging.log(
                `P-${mod.GetObjId(closestScavenger)} found drop ${this._id}.`,
                ScavengerDrop.LogLevel.Info
            );
        }
    }

    private _expire(): void {
        this.clearTimers();

        if (ScavengerDrop._logging.willLog(ScavengerDrop.LogLevel.Debug)) {
            ScavengerDrop._logging.log(`Drop ${this._id} expired.`, ScavengerDrop.LogLevel.Debug);
        }
    }

    /**
     * Stops the scavenger drop.
     */
    public stop(): void {
        this.clearTimers();

        if (ScavengerDrop._logging.willLog(ScavengerDrop.LogLevel.Debug)) {
            ScavengerDrop._logging.log(`Drop ${this._id} stopped.`, ScavengerDrop.LogLevel.Debug);
        }
    }
}

export namespace ScavengerDrop {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * The options for the ScavengerDrop instance.
     */
    export interface Options {
        /**
         * The duration of the scavenger drop in milliseconds.
         */
        duration?: number;
        /**
         * The interval at which to check for scavengers in milliseconds.
         */
        checkInterval?: number;
    }
}
