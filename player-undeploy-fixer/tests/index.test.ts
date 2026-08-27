import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockPlayer {
    _id: number;
    isAlive: boolean;
}

describe('PlayerUndeployFixer Module Tests', () => {
    let mockPlayers: Map<number, MockPlayer>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetModules();
        mockPlayers = new Map();

        const mockMod: Record<string, unknown> = {
            SoldierStateBool: {
                IsAlive: 0,
            },
            GetObjId: (p: MockPlayer) => p._id,
            GetPlayer: (id: number) => mockPlayers.get(id),
            GetSoldierState: (p: MockPlayer, state: number) => {
                if (state === 0) return p.isAlive;
                return false;
            },
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    });

    function createPlayer(id: number, isAlive = false): MockPlayer {
        const player: MockPlayer = { _id: id, isAlive };
        mockPlayers.set(id, player);
        return player;
    }

    it('should force undeploy when player is dead longer than 30s', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PlayerUndeployFixer } = await import('../index.ts');
        const { Logging } = await import('../../logging/index.ts');

        const logSpy = vi.fn();
        PlayerUndeployFixer.setLogging(logSpy, Logging.LogLevel.Warning);

        const undeployListener = vi.fn();
        Events.OnPlayerUndeploy.subscribe(undeployListener);

        const player1 = createPlayer(1, false);

        // Player dies
        Events.OnPlayerDied.trigger(player1 as unknown as mod.Player);

        // Advance 25s - under threshold (30s)
        vi.advanceTimersByTime(25_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).not.toHaveBeenCalled();

        // Advance another 6s (total 31s > 30s threshold)
        vi.advanceTimersByTime(6_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).toHaveBeenCalledWith(player1, undefined, undefined, undefined);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('P_1 stuck in limbo; forcing undeployment'),
            undefined
        );
    });

    it('should not force undeploy if player manually undeployed before timeout', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const player2 = createPlayer(2, false);
        Events.OnPlayerDied.trigger(player2 as unknown as mod.Player);

        // Advance 10s
        vi.advanceTimersByTime(10_000);
        Events.OngoingGlobal.trigger();

        // Player normal undeploy
        Events.OnPlayerUndeploy.trigger(player2 as unknown as mod.Player);

        const forcedUndeploySpy = vi.fn();
        Events.OnPlayerUndeploy.subscribe(forcedUndeploySpy);

        // Advance past 30s
        vi.advanceTimersByTime(30_000);
        Events.OngoingGlobal.trigger();

        expect(forcedUndeploySpy).not.toHaveBeenCalled();
    });

    it('should not force undeploy if player left the game before timeout', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const player3 = createPlayer(3, false);
        Events.OnPlayerDied.trigger(player3 as unknown as mod.Player);

        // Player leaves game
        Events.OnPlayerLeaveGame.trigger(3);

        const forcedUndeploySpy = vi.fn();
        Events.OnPlayerUndeploy.subscribe(forcedUndeploySpy);

        // Advance past 30s
        vi.advanceTimersByTime(35_000);
        Events.OngoingGlobal.trigger();

        expect(forcedUndeploySpy).not.toHaveBeenCalled();
    });

    it('should ignore alive players even if death timeout expired', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const player4 = createPlayer(4, false);
        Events.OnPlayerDied.trigger(player4 as unknown as mod.Player);

        // Player was revived / is alive now
        player4.isAlive = true;

        const forcedUndeploySpy = vi.fn();
        Events.OnPlayerUndeploy.subscribe(forcedUndeploySpy);

        // Advance past 30s
        vi.advanceTimersByTime(35_000);
        Events.OngoingGlobal.trigger();

        expect(forcedUndeploySpy).not.toHaveBeenCalled();
    });
});
