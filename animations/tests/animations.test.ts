import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from '../../events/index.ts';
import { Animations } from '../animations.ts';

describe('Animations Engine Module', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Animations.setLogging(undefined);
    });

    afterEach(() => {
        // Clean up any lingering animations
        for (let i = 0; i < Animations.MAX_ANIMATIONS; ++i) {
            Animations.stop(i as unknown as Animations.AnimationID);
        }
        vi.useRealTimers();
    });

    describe('Server Ticker & Running Queue Lifecycle', () => {
        it('should track active running count accurately and exit early when queue is empty', () => {
            expect(Events.OngoingGlobal.handlerCount()).toBeGreaterThanOrEqual(1);
            expect(Animations.getRunningCount()).toBe(0);

            // Ticking with 0 active animations does nothing
            expect(() => Events.OngoingGlobal.trigger()).not.toThrow();

            const id1 = Animations.start({
                from: 0,
                to: 100,
                duration: 500,
                onUpdate: () => {},
            });

            expect(id1).not.toBeNull();
            expect(Animations.getRunningCount()).toBe(1);

            const id2 = Animations.start({
                from: 0,
                to: 50,
                duration: 500,
                onUpdate: () => {},
            });

            expect(id2).not.toBeNull();
            expect(Animations.getRunningCount()).toBe(2);

            Animations.stop(id1!);
            expect(Animations.getRunningCount()).toBe(1);

            Animations.stop(id2!);
            expect(Animations.getRunningCount()).toBe(0);
        });

        it('should decrease running count when animations naturally complete', () => {
            let completed = false;
            Animations.start({
                from: 0,
                to: 100,
                duration: 100,
                onUpdate: () => {},
                onComplete: () => {
                    completed = true;
                },
            });

            expect(Animations.getRunningCount()).toBe(1);

            // Advance time and trigger tick
            vi.advanceTimersByTime(150);
            Events.OngoingGlobal.trigger();

            expect(completed).toBe(true);
            expect(Animations.getRunningCount()).toBe(0);
        });

        it('should return null when animation pool reaches MAX_ANIMATIONS capacity', () => {
            const allocatedIds: Animations.AnimationID[] = [];

            for (let i = 0; i < Animations.MAX_ANIMATIONS; ++i) {
                const id = Animations.start({
                    from: 0,
                    to: 10,
                    duration: 1000,
                    onUpdate: () => {},
                });
                expect(id).not.toBeNull();
                allocatedIds.push(id!);
            }

            expect(Animations.getActiveCount()).toBe(Animations.MAX_ANIMATIONS);

            // 1025th allocation fails and returns null
            const overflowId = Animations.start({
                from: 0,
                to: 10,
                duration: 1000,
                onUpdate: () => {},
            });
            expect(overflowId).toBeNull();

            // Spring allocation also returns null when full
            const overflowSpringId = Animations.startSpring({
                from: 0,
                to: 10,
                onUpdate: () => {},
            });
            expect(overflowSpringId).toBeNull();

            // Decay allocation also returns null when full
            const overflowDecayId = Animations.startDecay({
                from: 0,
                velocity: 100,
                onUpdate: () => {},
            });
            expect(overflowDecayId).toBeNull();

            // Free one slot
            Animations.stop(allocatedIds[0]);
            expect(Animations.getActiveCount()).toBe(Animations.MAX_ANIMATIONS - 1);

            // Now allocation succeeds
            const reclaimedId = Animations.start({
                from: 0,
                to: 10,
                duration: 1000,
                onUpdate: () => {},
            });
            expect(reclaimedId).not.toBeNull();
        });
    });

    describe('Tween Animation & Functional ID Lifecycle', () => {
        it('should interpolate values over duration and invoke onComplete', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Animations.start({
                from: 0,
                to: 100,
                duration: 1000,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            expect(typeof id).toBe('number');
            expect(Animations.isRunning(id!)).toBe(true);
            expect(Animations.isPaused(id!)).toBe(false);

            // Initial frame
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();

            expect(updates.length).toBeGreaterThan(0);
            expect(updates[updates.length - 1]).toBeCloseTo(25, -1);

            // Halfway
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect(updates[updates.length - 1]).toBeCloseTo(50, -1);

            // Finish
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();

            expect(updates[updates.length - 1]).toBe(100);
            expect(completed).toBe(true);
            expect(Animations.isActive(id!)).toBe(false);
            expect(Animations.isRunning(id!)).toBeUndefined();
            expect(Animations.isPaused(id!)).toBeUndefined();
        });

        it('should support stop() and return undefined for isRunning / isPaused on stopped IDs', () => {
            let completed = false;

            const id = Animations.start({
                from: 0,
                to: 100,
                duration: 1000,
                onUpdate: () => {},
                onComplete: () => {
                    completed = true;
                },
            });

            expect(Animations.isRunning(id!)).toBe(true);

            vi.advanceTimersByTime(300);
            Events.OngoingGlobal.trigger();

            Animations.stop(id!);

            expect(Animations.isActive(id!)).toBe(false);
            expect(Animations.isRunning(id!)).toBeUndefined();
            expect(Animations.isPaused(id!)).toBeUndefined();

            // Future ticks should not do anything
            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            expect(completed).toBe(false);
        });

        it('should support pause() and resume()', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Animations.start({
                from: 0,
                to: 100,
                duration: 1000,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            vi.advanceTimersByTime(300);
            Events.OngoingGlobal.trigger();

            const valAtPause = updates[updates.length - 1];

            Animations.pause(id!);
            expect(Animations.isPaused(id!)).toBe(true);
            expect(Animations.isRunning(id!)).toBe(false);
            expect(Animations.getRunningCount()).toBe(0);

            // Time passes while paused
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(updates[updates.length - 1]).toBe(valAtPause);

            // Resume
            Animations.resume(id!);
            expect(Animations.isPaused(id!)).toBe(false);
            expect(Animations.isRunning(id!)).toBe(true);
            expect(Animations.getRunningCount()).toBe(1);

            // Progress remaining 700ms
            vi.advanceTimersByTime(700);
            Events.OngoingGlobal.trigger();

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBe(100);
        });
    });

    describe('Spring Physics Animations', () => {
        it('should simulate spring movement and settle at target', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Animations.startSpring({
                from: 0,
                to: 50,
                stiffness: 200,
                damping: 25,
                precision: 0.01,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            expect(Animations.isRunning(id!)).toBe(true);

            // Advance through server ticks
            for (let i = 0; i < 60; ++i) {
                vi.advanceTimersByTime(16.67);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBe(50);
            expect(Animations.isRunning(id!)).toBeUndefined();
            expect(Animations.isActive(id!)).toBe(false);
        });
    });

    describe('Decay / Inertia Physics Animations', () => {
        it('should simulate friction decay and settle when velocity drops below precision', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Animations.startDecay({
                from: 0,
                velocity: 300,
                deceleration: 0.99,
                precision: 1.0,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            expect(Animations.isRunning(id!)).toBe(true);

            // Step through ticks until completion
            for (let i = 0; i < 100; ++i) {
                vi.advanceTimersByTime(16.67);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates.length).toBeGreaterThan(1);
            expect(updates[updates.length - 1]).toBeGreaterThan(0);
            expect(Animations.isActive(id!)).toBe(false);
        });

        it('should support pause and resume for decay animations', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Animations.startDecay({
                from: 0,
                velocity: 500,
                deceleration: 0.995,
                precision: 0.5,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();

            const valAtPause = updates[updates.length - 1];
            Animations.pause(id!);
            expect(Animations.isPaused(id!)).toBe(true);

            // Ticks while paused do not alter value
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(updates[updates.length - 1]).toBe(valAtPause);

            Animations.resume(id!);
            expect(Animations.isRunning(id!)).toBe(true);

            for (let i = 0; i < 100; ++i) {
                vi.advanceTimersByTime(20);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBeGreaterThan(valAtPause);
        });
    });

    describe('Update Throttling with minUpdateDeltaMs', () => {
        it('should throttle onUpdate invocations when ticks occur faster than minUpdateDeltaMs', () => {
            const updates: number[] = [];
            let completed = false;

            Animations.start({
                from: 0,
                to: 100,
                duration: 200,
                minUpdateDeltaMs: 50, // Only fire at most every 50ms
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            // Tick at 10ms (1st tick after start, fires and records timestamp)
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // Tick at 20ms (elapsed 10ms < 50ms, skipped)
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // Tick at 30ms (elapsed 20ms < 50ms, skipped)
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // Tick at 60ms (elapsed 50ms >= 50ms, fires!)
            vi.advanceTimersByTime(30);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(2);

            // Advance to end of animation (200ms total)
            vi.advanceTimersByTime(140);
            Events.OngoingGlobal.trigger();

            expect(completed).toBe(true);
            // Final frame must always fire with exact target value
            expect(updates[updates.length - 1]).toBe(100);
        });

        it('should throttle spring onUpdate while calculating accurate physics', () => {
            const updates: number[] = [];
            let completed = false;

            Animations.startSpring({
                from: 0,
                to: 50,
                stiffness: 100,
                damping: 20,
                precision: 0.01,
                minUpdateDeltaMs: 100,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            // 1st tick fires
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // Next 3 ticks within 60ms are skipped (< 100ms)
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // 100ms elapsed since last update -> fires
            vi.advanceTimersByTime(40);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(2);

            // Let spring run to completion
            for (let i = 0; i < 50; ++i) {
                vi.advanceTimersByTime(50);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBe(50);
        });
    });

    describe('Callback Safety and Error Resilience', () => {
        it('should catch errors in onUpdate without breaking other animations', () => {
            let healthyUpdated = false;

            Animations.start({
                from: 0,
                to: 100,
                duration: 500,
                onUpdate: () => {
                    throw new Error('Explosion in onUpdate');
                },
            });

            Animations.start({
                from: 0,
                to: 100,
                duration: 500,
                onUpdate: () => {
                    healthyUpdated = true;
                },
            });

            vi.advanceTimersByTime(100);
            expect(() => {
                Events.OngoingGlobal.trigger();
            }).not.toThrow();

            expect(healthyUpdated).toBe(true);
        });
    });

    describe('Start Delay with delayMs', () => {
        it('should delay start of tween animation until delayMs has elapsed', () => {
            const updates: number[] = [];
            let completed = false;

            Animations.start({
                from: 0,
                to: 100,
                duration: 200,
                delayMs: 100,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            // Advance by 50ms (still within delayMs)
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(0);
            expect(completed).toBe(false);

            // Advance by another 50ms (total 100ms -> delay passed, animation starts)
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);
            expect(updates[0]).toBe(0);

            // Advance by 100ms (total 200ms -> half duration)
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(2);
            expect(updates[1]).toBe(50);

            // Advance to finish (total 300ms)
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBe(100);
        });

        it('should delay start of spring animation until delayMs has elapsed', () => {
            const updates: number[] = [];
            let completed = false;

            Animations.startSpring({
                from: 0,
                to: 100,
                delayMs: 150,
                onUpdate: (v) => updates.push(v),
                onComplete: () => {
                    completed = true;
                },
            });

            // Ticks during delay window
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(0);
            expect(completed).toBe(false);

            // Ticks after delay passed
            vi.advanceTimersByTime(60);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBeGreaterThan(0);
        });

        it('should delay start of decay animation until delayMs has elapsed', () => {
            const updates: number[] = [];

            Animations.startDecay({
                from: 0,
                velocity: 500,
                delayMs: 200,
                onUpdate: (v) => updates.push(v),
            });

            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(0);

            vi.advanceTimersByTime(110);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBeGreaterThan(0);
        });
    });
});
