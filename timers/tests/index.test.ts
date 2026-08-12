import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timers } from '../index.ts';
import { Events } from '../../events/index.ts';

describe('Timers Module Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Clear all active timers
        for (let i = 0; i < 512; ++i) {
            Timers.clear(i as Timers.TimerID);
        }
        vi.useRealTimers();
    });

    describe('Basic Lifecycle & Free-List Allocation', () => {
        it('should create timeouts and intervals and track active count', () => {
            expect(Timers.getActiveTimerCount()).toBe(0);

            const t1 = Timers.setTimeout(() => {}, 1000);
            const t2 = Timers.setInterval(() => {}, 500);

            expect(Timers.getActiveTimerCount()).toBe(2);
            expect(Timers.isActive(t1!)).toBe(true);
            expect(Timers.isActive(t2!)).toBe(true);
            expect(Timers.isActive(-1 as Timers.TimerID)).toBe(false);
            expect(Timers.isActive(99999 as Timers.TimerID)).toBe(false);

            Timers.clearTimeout(t1!);
            expect(Timers.isActive(t1!)).toBe(false);
            expect(Timers.getActiveTimerCount()).toBe(1);

            Timers.clearInterval(t2!);
            expect(Timers.isActive(t2!)).toBe(false);
            expect(Timers.getActiveTimerCount()).toBe(0);
        });

        it('should recycle slot indices with incremented generations', () => {
            const id1 = Timers.setTimeout(() => {}, 1000)!;
            const slot1 = (id1 as number) % 10_000;

            Timers.clear(id1);

            // Re-allocate from the free list - should reuse slot1 with next generation
            const id2 = Timers.setTimeout(() => {}, 2000)!;
            const slot2 = (id2 as number) % 10_000;

            expect(slot2).toBe(slot1);
            expect(id2 as number).toBe((id1 as number) + 10_000);
            expect(Timers.isActive(id1)).toBe(false);
            expect(Timers.isActive(id2)).toBe(true);

            Timers.clear(id2);
        });

        it('should return null when timer pool is full and recover when freed', () => {
            const createdIds: Timers.TimerID[] = [];

            for (let i = 0; i < 512; ++i) {
                createdIds.push(Timers.setTimeout(() => {}, 10_000)!);
            }

            expect(Timers.getActiveTimerCount()).toBe(512);
            expect(Timers.setTimeout(() => {}, 1000)).toBeNull();
            expect(Timers.setInterval(() => {}, 1000)).toBeNull();

            // Clear one timer and verify allocation succeeds again
            const freedId = createdIds.pop()!;
            Timers.clear(freedId);

            expect(Timers.getActiveTimerCount()).toBe(511);

            const newId = Timers.setTimeout(() => {}, 5000);
            expect(Timers.isActive(newId)).toBe(true);
            createdIds.push(newId);

            for (const id of createdIds) {
                Timers.clear(id);
            }
            expect(Timers.getActiveTimerCount()).toBe(0);
        });
    });

    describe('Execution & Callbacks', () => {
        it('should execute setTimeout callback after specified delay', async () => {
            const callback = vi.fn();
            const timerId = Timers.setTimeout(callback, 1000);

            expect(Timers.isActive(timerId)).toBe(true);

            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(1);
            expect(Timers.isActive(timerId)).toBe(false);
            expect(Timers.getActiveTimerCount()).toBe(0);
        });

        it('should repeatedly execute setInterval callback', async () => {
            const callback = vi.fn();
            const intervalId = Timers.setInterval(callback, 500);

            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(2);

            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(3);

            Timers.clearInterval(intervalId);
            expect(Timers.isActive(intervalId)).toBe(false);
        });

        it('should support immediate setInterval execution on next tick', async () => {
            const callback = vi.fn();
            const intervalId = Timers.setInterval(callback, 1000, true);

            // Immediate execution runs on the first tick without waiting 1000ms
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(2);

            Timers.clear(intervalId);
        });
    });
});
