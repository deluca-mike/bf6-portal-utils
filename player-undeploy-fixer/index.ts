import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version 1.0.0
export namespace PlayerUndeployFixer {
    const logging = new Logging('PUF');

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

    const MAX_TIME_TO_UNDEPLOY_MS: number = 30_000;

    const lastPlayerDeathTime: Map<number, number> = new Map();
    const lastPlayerUndeployTime: Map<number, number> = new Map();

    Events.OnPlayerDied.subscribe(handlePlayerDied);
    Events.OnPlayerUndeploy.subscribe(handlePlayerUndeployed);
    Events.OnPlayerLeaveGame.subscribe(handlePlayerLeaveGame);

    function handlePlayerDied(player: mod.Player): void {
        const playerId = mod.GetObjId(player);
        const thisDeathTime = Date.now();

        lastPlayerDeathTime.set(playerId, thisDeathTime);

        const tryUndeploy = () => {
            const isSameDeathEvent = lastPlayerDeathTime.get(playerId) === thisDeathTime;
            const hasUndeployed = (lastPlayerUndeployTime.get(playerId) || 0) >= thisDeathTime;

            if (!isSameDeathEvent || hasUndeployed) return;

            try {
                if (!mod.IsPlayerValid(player) || mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) return;
            } catch (error) {
                logging.log(`P_${playerId} stuck in limbo. Error checking soldier state: ${error}`, LogLevel.Error);
                return;
            }

            logging.log(`P_${playerId} stuck in limbo. Forcing undeployment.`, LogLevel.Warning);

            Events.OnPlayerUndeploy.trigger(player);
        };

        Timers.setTimeout(tryUndeploy, MAX_TIME_TO_UNDEPLOY_MS);
    }

    function handlePlayerUndeployed(player: mod.Player): void {
        lastPlayerUndeployTime.set(mod.GetObjId(player), Date.now());
    }

    function handlePlayerLeaveGame(playerId: number): void {
        lastPlayerDeathTime.delete(playerId);
        lastPlayerUndeployTime.delete(playerId);
    }
}
