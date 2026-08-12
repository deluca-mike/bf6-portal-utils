import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PerformanceStats Module Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetModules();
    });

    it('should provide default/initial spot metrics', async () => {
        const { PerformanceStats } = await import('../index.ts');

        expect(PerformanceStats.getSmoothedTickRate()).toBe(30);
        expect(PerformanceStats.getSmoothedTimeoutLagMs()).toBe(0);
        expect(PerformanceStats.getSpotDeltaMs()).toBeCloseTo(1000 / 30, 2);
        expect(PerformanceStats.getSpotTickRate()).toBeCloseTo(1, 2);
        expect(PerformanceStats.getSpotHealthFactor()).toBeCloseTo(1, 2);
    });

    it('should track ticks and update spot metrics when game mode starts', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PerformanceStats } = await import('../index.ts');

        // Start game mode
        Events.OnGameModeStarted.trigger();

        // Advance 33ms and trigger a tick
        vi.advanceTimersByTime(33);
        Events.OngoingGlobal.trigger();

        expect(PerformanceStats.getSpotDeltaMs()).toBe(33);
        expect(PerformanceStats.getSpotTickRate()).toBeCloseTo(1000 / 30 / 33, 2);
        expect(PerformanceStats.getSpotHealthFactor()).toBeLessThanOrEqual(1.0);

        // Advance 100ms (slow tick)
        vi.advanceTimersByTime(100);
        Events.OngoingGlobal.trigger();

        expect(PerformanceStats.getSpotDeltaMs()).toBe(100);
        expect(PerformanceStats.getSpotTickRate()).toBeCloseTo(1000 / 30 / 100, 2);
        expect(PerformanceStats.getSpotHealthFactor()).toBeCloseTo(1000 / 30 / 100, 2);
    });

    it('should calculate smoothed metrics on interval and log warnings on lag spikes or tick drops', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PerformanceStats } = await import('../index.ts');
        const { Logging } = await import('../../logging/index.ts');

        const logSpy = vi.fn();
        PerformanceStats.setLogging(logSpy, Logging.LogLevel.Warning);

        Events.OnGameModeStarted.trigger();

        // Trigger 20 ticks across 1000ms (20Hz, which is < 25Hz threshold)
        for (let i = 0; i < 20; ++i) {
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
        }

        // Trigger the interval timer (Timers runs on OngoingGlobal ticks)
        vi.advanceTimersByTime(50);
        Events.OngoingGlobal.trigger();

        expect(PerformanceStats.getSmoothedTickRate()).toBeLessThan(30);

        // Should log warning for tick rate drop (<25Hz)
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tick rate dropped:'), undefined);
    });

    it('should log warning when timeout lag spike occurs', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PerformanceStats } = await import('../index.ts');
        const { Logging } = await import('../../logging/index.ts');

        const logSpy = vi.fn();
        PerformanceStats.setLogging(logSpy, Logging.LogLevel.Warning);

        Events.OnGameModeStarted.trigger();

        // Jump 1200ms without intermediate interval execution, then trigger tick
        vi.advanceTimersByTime(1200);
        Events.OngoingGlobal.trigger();

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Timeout lag spike:'), undefined);
    });
});
