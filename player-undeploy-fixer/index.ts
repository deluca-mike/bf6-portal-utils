import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version 1.1.0
export namespace PlayerUndeployFixer {
    const logging = new Logging('PUF');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    const MAX_TIME_TO_UNDEPLOY_MS: number = 30_000;
    const MAX_PLAYERS = 100;
    const SERVER_START_TIME = Date.now();

    /**
     * @returns The current server uptime in milliseconds (guaranteed >= 1).
     */
    function getUptime(): number {
        return Date.now() - SERVER_START_TIME + 1;
    }

    const deathTimes = new Uint32Array(MAX_PLAYERS);

    let pendingDeadCount = 0;

    Events.OnPlayerDied.subscribe(handlePlayerDied);
    Events.OnPlayerUndeploy.subscribe(handlePlayerUndeployed);
    Events.OnPlayerLeaveGame.subscribe(handlePlayerLeaveGame);

    Timers.setInterval(checkPendingUndeploys, 1000);

    function handlePlayerDied(player: mod.Player): void {
        const playerId = mod.GetObjId(player);

        if (typeof playerId !== 'number' || playerId < 0 || playerId >= MAX_PLAYERS) return;

        if (!deathTimes[playerId]) {
            ++pendingDeadCount;
        }

        deathTimes[playerId] = getUptime();
    }

    function handlePlayerUndeployed(player: mod.Player): void {
        const playerId = mod.GetObjId(player);

        if (typeof playerId !== 'number' || playerId < 0 || playerId >= MAX_PLAYERS) return;

        if (deathTimes[playerId]) {
            deathTimes[playerId] = 0;
            --pendingDeadCount;
        }
    }

    function handlePlayerLeaveGame(playerId: number): void {
        if (typeof playerId !== 'number' || playerId < 0 || playerId >= MAX_PLAYERS) return;

        if (deathTimes[playerId]) {
            deathTimes[playerId] = 0;
            --pendingDeadCount;
        }
    }

    function checkPendingUndeploys(): void {
        if (pendingDeadCount <= 0) return;

        const now = getUptime();

        for (let i = 0; i < MAX_PLAYERS; ++i) {
            const deathTime = deathTimes[i];

            if (!deathTime || now - deathTime < MAX_TIME_TO_UNDEPLOY_MS) continue;

            // NOTE: Might need to handle clearing this only after fetching soldier state does not throw.
            deathTimes[i] = 0;
            --pendingDeadCount;

            const player = mod.GetPlayer(i);

            if (player === undefined || mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) continue;

            logging.log(`P_${i} stuck in limbo; forcing undeployment`, LogLevel.Warning);

            Events.OnPlayerUndeploy.trigger(player);
        }
    }
}
