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

    it('should correctly handle player 0 (boundary check and zero-initialization)', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PlayerUndeployFixer } = await import('../index.ts');
        const { Logging } = await import('../../logging/index.ts');

        const logSpy = vi.fn();
        PlayerUndeployFixer.setLogging(logSpy, Logging.LogLevel.Warning);

        const undeployListener = vi.fn();
        Events.OnPlayerUndeploy.subscribe(undeployListener);

        const player0 = createPlayer(0, false);

        // Player 0 dies (verifies index 0 in Uint32Array starts at 0 and increments pendingDeadCount)
        Events.OnPlayerDied.trigger(player0 as unknown as mod.Player);

        // Advance 31s
        vi.advanceTimersByTime(31_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).toHaveBeenCalledWith(player0, undefined, undefined, undefined);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('P_0 stuck in limbo; forcing undeployment'),
            undefined
        );
    });

    it('should handle repeated death events for the same player without double-counting pendingDeadCount', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const player5 = createPlayer(5, false);
        const undeployListener = vi.fn();
        Events.OnPlayerUndeploy.subscribe(undeployListener);

        // Trigger died event first time at t=0
        Events.OnPlayerDied.trigger(player5 as unknown as mod.Player);

        // Advance 20s (uptime is 20s)
        vi.advanceTimersByTime(20_000);
        Events.OngoingGlobal.trigger();

        // Trigger died event again at t=20s (refreshes death timestamp, should not double-count pendingDeadCount)
        Events.OnPlayerDied.trigger(player5 as unknown as mod.Player);

        // Advance another 15s (total 35s from first death, but only 15s from second death)
        vi.advanceTimersByTime(15_000);
        Events.OngoingGlobal.trigger();

        // Should NOT have triggered undeploy yet because timeout reset at t=20s
        expect(undeployListener).not.toHaveBeenCalled();

        // Advance another 16s (now 31s from second death)
        vi.advanceTimersByTime(16_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).toHaveBeenCalledTimes(1);
        expect(undeployListener).toHaveBeenCalledWith(player5, undefined, undefined, undefined);
    });

    it('should ignore invalid player IDs (out of bounds)', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const invalidPlayerNegative = createPlayer(-1, false);
        const invalidPlayerOverflow = createPlayer(100, false);

        const undeployListener = vi.fn();
        Events.OnPlayerUndeploy.subscribe(undeployListener);

        Events.OnPlayerDied.trigger(invalidPlayerNegative as unknown as mod.Player);
        Events.OnPlayerDied.trigger(invalidPlayerOverflow as unknown as mod.Player);

        vi.advanceTimersByTime(35_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).not.toHaveBeenCalled();
    });

    it('should correctly track pendingDeadCount with multiple concurrent players', async () => {
        const { Events } = await import('../../events/index.ts');
        await import('../index.ts');

        const p10 = createPlayer(10, false);
        const p20 = createPlayer(20, false);
        const p30 = createPlayer(30, false);

        const undeployListener = vi.fn();
        Events.OnPlayerUndeploy.subscribe(undeployListener);

        // All 3 die at t=0
        Events.OnPlayerDied.trigger(p10 as unknown as mod.Player);
        Events.OnPlayerDied.trigger(p20 as unknown as mod.Player);
        Events.OnPlayerDied.trigger(p30 as unknown as mod.Player);

        // At t=10s, p10 normal undeploy
        vi.advanceTimersByTime(10_000);
        Events.OngoingGlobal.trigger();
        Events.OnPlayerUndeploy.trigger(p10 as unknown as mod.Player);

        // At t=15s, p20 leaves game
        vi.advanceTimersByTime(5_000);
        Events.OngoingGlobal.trigger();
        Events.OnPlayerLeaveGame.trigger(20);

        // At t=31s, only p30 should be forced to undeploy
        vi.advanceTimersByTime(16_000);
        Events.OngoingGlobal.trigger();

        expect(undeployListener).toHaveBeenCalledWith(p30, undefined, undefined, undefined);
        expect(undeployListener).not.toHaveBeenCalledWith(p20, undefined, undefined, undefined);
    });
});
