import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clocks } from '../index.ts';
import { Events } from '../../events/index.ts';

describe('Clocks Module Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Destroy any remaining active clocks
        for (let i = 0; i < 256; ++i) {
            Clocks.destroy(i as Clocks.ClockID);
        }
        vi.useRealTimers();
    });

    describe('Basic Lifecycle & Intrusive Free-List Allocation', () => {
        it('should create and destroy count-up and countdown clocks and track active count', () => {
            expect(Clocks.getActiveClockCount()).toBe(0);

            const c1 = Clocks.createCountUp()!;
            const c2 = Clocks.createCountDown(60)!;

            expect(Clocks.getActiveClockCount()).toBe(2);
            expect(Clocks.isActive(c1)).toBe(true);
            expect(Clocks.isActive(c2)).toBe(true);
            expect(Clocks.isActive(-1 as Clocks.ClockID)).toBe(false);
            expect(Clocks.isActive(99999 as Clocks.ClockID)).toBe(false);

            // Test undefined returns for non-existent clocks
            expect(Clocks.getSeconds(-1 as Clocks.ClockID)).toBeUndefined();
            expect(Clocks.getDuration(-1 as Clocks.ClockID)).toBeUndefined();
            expect(Clocks.isRunning(-1 as Clocks.ClockID)).toBeUndefined();
            expect(Clocks.isPaused(-1 as Clocks.ClockID)).toBeUndefined();
            expect(Clocks.isComplete(-1 as Clocks.ClockID)).toBeUndefined();

            Clocks.destroy(c1);
            expect(Clocks.isActive(c1)).toBe(false);
            expect(Clocks.getActiveClockCount()).toBe(1);

            Clocks.destroy(c2);
            expect(Clocks.isActive(c2)).toBe(false);
            expect(Clocks.getActiveClockCount()).toBe(0);
        });

        it('should recycle slot indices with incremented generations', () => {
            const id1 = Clocks.createCountUp()!;
            const slot1 = (id1 as number) % 10_000;

            Clocks.destroy(id1);

            // Re-allocate from the free list - should reuse slot1 with next generation
            const id2 = Clocks.createCountUp()!;
            const slot2 = (id2 as number) % 10_000;

            expect(slot2).toBe(slot1);
            expect(id2 as number).toBe((id1 as number) + 10_000);
            expect(Clocks.isActive(id1)).toBe(false);
            expect(Clocks.isActive(id2)).toBe(true);

            Clocks.destroy(id2);
        });

        it('should return null when clock pool is full and recover when freed', () => {
            const createdIds: Clocks.ClockID[] = [];

            for (let i = 0; i < 256; ++i) {
                createdIds.push(Clocks.createCountUp()!);
            }

            expect(Clocks.getActiveClockCount()).toBe(256);

            expect(Clocks.createCountUp()).toBeNull();

            // Destroy one clock and verify allocation succeeds again
            const freedId = createdIds.pop()!;
            Clocks.destroy(freedId);

            expect(Clocks.getActiveClockCount()).toBe(255);

            const newId = Clocks.createCountDown(10)!;
            expect(Clocks.isActive(newId)).toBe(true);
            createdIds.push(newId);

            for (const id of createdIds) {
                Clocks.destroy(id);
            }
            expect(Clocks.getActiveClockCount()).toBe(0);
        });
    });

    describe('CountUp Execution & Callbacks', () => {
        it('should trigger onSecond, onMinute, and onComplete as time advances', async () => {
            const onSecond = vi.fn();
            const onMinute = vi.fn();
            const onComplete = vi.fn();

            const clockId = Clocks.createCountUp({
                timeLimitSeconds: 65,
                onSecond,
                onMinute,
                onComplete,
            })!;

            Clocks.start(clockId);
            expect(Clocks.isRunning(clockId)).toBe(true);

            // Flush microtasks for start
            await Promise.resolve();

            // First tick on start
            expect(onSecond).toHaveBeenCalledWith(0, undefined, undefined, undefined);
            expect(onMinute).toHaveBeenCalledWith(0, undefined, undefined, undefined);

            // Advance 1 second
            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(onSecond).toHaveBeenCalledWith(1, undefined, undefined, undefined);

            // Advance 59 seconds (to reach 60s / 1m)
            vi.advanceTimersByTime(59000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(onSecond).toHaveBeenCalledWith(60, undefined, undefined, undefined);
            expect(onMinute).toHaveBeenCalledWith(1, undefined, undefined, undefined);

            // Advance to limit (65s)
            vi.advanceTimersByTime(5000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(onComplete).toHaveBeenCalled();
            expect(Clocks.isComplete(clockId)).toBe(true);
            expect(Clocks.isRunning(clockId)).toBe(false);

            Clocks.destroy(clockId);
        });
    });

    describe('CountDown Execution & Callbacks', () => {
        it('should trigger onSecond, onMinute, and onComplete counting down', async () => {
            const onSecond = vi.fn();
            const onMinute = vi.fn();
            const onComplete = vi.fn();

            const clockId = Clocks.createCountDown(62, {
                onSecond,
                onMinute,
                onComplete,
            })!;

            Clocks.start(clockId);
            await Promise.resolve();

            // Initial start tick
            expect(onSecond).toHaveBeenCalledWith(62, undefined, undefined, undefined);
            expect(onMinute).toHaveBeenCalledWith(2, undefined, undefined, undefined);

            // Advance 2 seconds (to reach 60s / 1m)
            vi.advanceTimersByTime(2000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(onSecond).toHaveBeenCalledWith(60, undefined, undefined, undefined);
            expect(onMinute).toHaveBeenCalledWith(1, undefined, undefined, undefined);

            // Advance remaining 60 seconds (to reach 0s)
            vi.advanceTimersByTime(60000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(onComplete).toHaveBeenCalled();
            expect(Clocks.isComplete(clockId)).toBe(true);
            expect(Clocks.getSeconds(clockId)).toBe(0);

            Clocks.destroy(clockId);
        });
    });

    describe('Pause, Resume, and Time Adjustments', () => {
        it('should pause and resume without losing elapsed time', async () => {
            const clockId = Clocks.createCountUp()!;
            Clocks.start(clockId);
            await Promise.resolve();

            vi.advanceTimersByTime(5000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            Clocks.pause(clockId);
            expect(Clocks.isPaused(clockId)).toBe(true);

            const pausedSeconds = Clocks.getSeconds(clockId);
            expect(pausedSeconds).toBeCloseTo(5, 1);

            // Advance time while paused
            vi.advanceTimersByTime(10000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(Clocks.getSeconds(clockId)).toBeCloseTo(5, 1);

            Clocks.resume(clockId);
            expect(Clocks.isRunning(clockId)).toBe(true);

            vi.advanceTimersByTime(3000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(Clocks.getSeconds(clockId)).toBeCloseTo(8, 1);

            Clocks.destroy(clockId);
        });

        it('should add and subtract seconds', async () => {
            const clockId = Clocks.createCountUp()!;
            Clocks.start(clockId);
            await Promise.resolve();

            vi.advanceTimersByTime(10000);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            Clocks.addSeconds(clockId, 15);
            await Promise.resolve();
            expect(Clocks.getSeconds(clockId)).toBeCloseTo(25, 1);

            Clocks.subtractSeconds(clockId, 5);
            await Promise.resolve();
            expect(Clocks.getSeconds(clockId)).toBeCloseTo(20, 1);

            Clocks.destroy(clockId);
        });
    });
});
