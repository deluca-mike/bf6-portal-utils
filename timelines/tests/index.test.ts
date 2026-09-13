import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Animations } from '../../animations/animations.ts';
import { Events } from '../../events/index.ts';
import { Timelines } from '../index.ts';

describe('Timelines Module', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Timelines.setLogging(undefined);
    });

    afterEach(() => {
        // Stop all timelines and animations to clean pool
        Timelines.stopAll();
        for (let i = 0; i < Animations.MAX_ANIMATIONS; ++i) {
            Animations.stop(i as unknown as Animations.AnimationID);
        }
        vi.useRealTimers();
    });

    describe('Sequential Step Execution', () => {
        it('should execute tween, wait, and call steps in exact sequence', () => {
            const updates: number[] = [];
            const calls: string[] = [];
            let completed = false;

            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });
            expect(id).not.toBeNull();

            Timelines.addTween(id!, {
                from: 0,
                to: 100,
                duration: 200,
                onUpdate: (v) => updates.push(v),
            });
            Timelines.addWait(id!, 100);
            Timelines.addCall(id!, () => {
                calls.push('callStep');
            });
            Timelines.addTween(id!, {
                from: 100,
                to: 200,
                duration: 200,
                onUpdate: (v) => updates.push(v),
            });

            Timelines.play(id!);
            expect(Timelines.isRunning(id!)).toBe(true);
            expect(Timelines.getCurrentStep(id!)).toBe(0);

            // 1. Advance first tween (200ms)
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBeGreaterThan(0);
            expect(updates[updates.length - 1]).toBeCloseTo(50, -1);

            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(updates[updates.length - 1]).toBe(100);

            // Step should have transitioned to wait step (step 1)
            expect(Timelines.getCurrentStep(id!)).toBe(1);
            expect(calls.length).toBe(0);

            // 2. Advance wait step (100ms) -> triggers call (step 2) and starts second tween (step 3)
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(calls).toEqual(['callStep']);
            expect(Timelines.getCurrentStep(id!)).toBe(3);

            // 3. Advance second tween (200ms)
            vi.advanceTimersByTime(200);
            Events.OngoingGlobal.trigger();

            expect(updates[updates.length - 1]).toBe(200);
            expect(completed).toBe(true);
            expect(Timelines.isActive(id!)).toBe(false);
        });

        it('should execute spring physics step inside a timeline', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addSpring(id!, {
                from: 0,
                to: 50,
                stiffness: 200,
                damping: 25,
                precision: 0.01,
                onUpdate: (v) => updates.push(v),
            });

            Timelines.play(id!);
            expect(Timelines.isRunning(id!)).toBe(true);

            // Advance through ticks
            for (let i = 0; i < 60; ++i) {
                vi.advanceTimersByTime(16.67);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBeCloseTo(50, 0);
        });

        it('should execute decay physics step inside a timeline', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addDecay(id!, {
                from: 0,
                velocity: 300,
                deceleration: 0.99,
                precision: 1.0,
                onUpdate: (v) => updates.push(v),
            });

            Timelines.play(id!);
            expect(Timelines.isRunning(id!)).toBe(true);

            for (let i = 0; i < 100; ++i) {
                vi.advanceTimersByTime(16.67);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(updates.length).toBeGreaterThan(1);
            expect(updates[updates.length - 1]).toBeGreaterThan(0);
        });
    });

    describe('Parallel Step Execution', () => {
        it('should run parallel tweens simultaneously and advance only when all finish', () => {
            const track1: number[] = [];
            const track2: number[] = [];
            let parallelDone = false;

            const id = Timelines.create({
                onComplete: () => {
                    parallelDone = true;
                },
            });

            Timelines.addParallel(id!, [
                {
                    type: 'tween',
                    from: 0,
                    to: 100,
                    duration: 100,
                    onUpdate: (v) => track1.push(v),
                },
                {
                    type: 'tween',
                    from: 0,
                    to: 500,
                    duration: 300,
                    onUpdate: (v) => track2.push(v),
                },
            ]);

            Timelines.play(id!);

            // After 100ms, track 1 finishes, but track 2 is still running
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();

            expect(track1[track1.length - 1]).toBe(100);
            expect(track2[track2.length - 1]).toBeCloseTo(166, -1);
            expect(parallelDone).toBe(false);
            expect(Timelines.isRunning(id!)).toBe(true);

            // After another 200ms (total 300ms), track 2 finishes and timeline completes
            vi.advanceTimersByTime(200);
            Events.OngoingGlobal.trigger();

            expect(track2[track2.length - 1]).toBe(500);
            expect(parallelDone).toBe(true);
            expect(Timelines.isActive(id!)).toBe(false);
        });

        it('should support decay animation in parallel child tracks', () => {
            const trackTween: number[] = [];
            const trackDecay: number[] = [];
            let completed = false;

            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addParallel(id!, [
                {
                    type: 'tween',
                    from: 0,
                    to: 100,
                    duration: 100,
                    onUpdate: (v) => trackTween.push(v),
                },
                {
                    type: 'decay',
                    from: 0,
                    velocity: 200,
                    deceleration: 0.98,
                    precision: 1.0,
                    onUpdate: (v) => trackDecay.push(v),
                },
            ]);

            Timelines.play(id!);

            for (let i = 0; i < 50; ++i) {
                vi.advanceTimersByTime(20);
                Events.OngoingGlobal.trigger();
                if (completed) break;
            }

            expect(completed).toBe(true);
            expect(trackTween[trackTween.length - 1]).toBe(100);
            expect(trackDecay.length).toBeGreaterThan(1);
        });
    });

    describe('Lifecycle Controls (Pause, Resume, Stop, Restart)', () => {
        it('should pause and resume active child animation and wait steps', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addTween(id!, {
                from: 0,
                to: 100,
                duration: 400,
                onUpdate: (v) => updates.push(v),
            });

            Timelines.play(id!);

            // Run for 100ms
            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            const valAtPause = updates[updates.length - 1];

            // Pause
            expect(Timelines.pause(id!)).toBe(true);
            expect(Timelines.isPaused(id!)).toBe(true);
            expect(Timelines.isRunning(id!)).toBe(false);

            // Time passes while paused
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            expect(updates[updates.length - 1]).toBe(valAtPause);

            // Resume
            expect(Timelines.resume(id!)).toBe(true);
            expect(Timelines.isPaused(id!)).toBe(false);
            expect(Timelines.isRunning(id!)).toBe(true);

            // Progress remaining 300ms
            vi.advanceTimersByTime(300);
            Events.OngoingGlobal.trigger();

            expect(updates[updates.length - 1]).toBe(100);
            expect(completed).toBe(true);
        });

        it('should stop immediately and cancel child animations', () => {
            let completed = false;
            const id = Timelines.create({
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addTween(id!, {
                from: 0,
                to: 100,
                duration: 500,
                onUpdate: () => {},
            });

            Timelines.play(id!);
            expect(Animations.getRunningCount()).toBe(1);

            Timelines.stop(id!);

            expect(Timelines.isActive(id!)).toBe(false);
            expect(Timelines.isRunning(id!)).toBeUndefined();
            expect(Animations.getRunningCount()).toBe(0);

            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            expect(completed).toBe(false);
        });

        it('should support restart from step 0', () => {
            const steps: number[] = [];
            const id = Timelines.create({
                onStep: (s) => steps.push(s),
            });

            Timelines.addWait(id!, 100);
            Timelines.addWait(id!, 100);

            Timelines.play(id!);
            expect(Timelines.getCurrentStep(id!)).toBe(0);

            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(Timelines.getCurrentStep(id!)).toBe(1);

            Timelines.restart(id!);
            expect(Timelines.getCurrentStep(id!)).toBe(0);
        });
    });

    describe('Looping', () => {
        it('should replay for a finite loop count', () => {
            const loops: number[] = [];
            let completed = false;

            const id = Timelines.create({
                loop: 3,
                onLoop: (c) => loops.push(c),
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addWait(id!, 50);
            Timelines.play(id!);

            // Loop 1
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(loops).toEqual([1]);
            expect(completed).toBe(false);

            // Loop 2
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(loops).toEqual([1, 2]);
            expect(completed).toBe(false);

            // Loop 3 -> complete
            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();
            expect(loops).toEqual([1, 2, 3]);
            expect(completed).toBe(true);
            expect(Timelines.isActive(id!)).toBe(false);
        });
    });

    describe('playAsync Promise Integration', () => {
        it('should resolve playAsync promise on completion', async () => {
            const id = Timelines.create();
            Timelines.addWait(id!, 100);

            let resolved = false;
            Timelines.playAsync(id!).then(() => {
                resolved = true;
            });

            expect(resolved).toBe(false);

            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(resolved).toBe(true);
        });
    });

    describe('OOP Timeline Wrapper Class', () => {
        it('should support fluent method chaining with Timeline class wrapper', () => {
            const updates: number[] = [];
            let completed = false;

            const tl = new Timelines.Timeline({
                onComplete: () => {
                    completed = true;
                },
            })
                .addTween({
                    from: 0,
                    to: 50,
                    duration: 100,
                    onUpdate: (v) => updates.push(v),
                })
                .addWait(50)
                .addCall(() => {})
                .play();

            expect(tl.isValid).toBe(true);
            expect(tl.isRunning).toBe(true);
            expect(tl.currentStep).toBe(0);

            vi.advanceTimersByTime(100);
            Events.OngoingGlobal.trigger();
            expect(tl.currentStep).toBe(1);

            vi.advanceTimersByTime(50);
            Events.OngoingGlobal.trigger();

            expect(completed).toBe(true);
            expect(tl.isValid).toBe(false);
        });

        it('should resolve wrapper from existing ID via Timeline.fromId', () => {
            const id = Timelines.create();
            expect(id).not.toBeNull();

            const tl = Timelines.Timeline.fromId(id!);
            expect(tl).not.toBeNull();
            expect(tl!.id).toBe(id);
            expect(tl!.isValid).toBe(true);

            Timelines.stop(id!);
            expect(Timelines.Timeline.fromId(id!)).toBeNull();
        });
    });

    describe('Pool Boundaries and Generational Slot Recycling', () => {
        it('should return null when timeline pool reaches capacity', () => {
            const allocatedIds: Timelines.TimelineID[] = [];

            for (let i = 0; i < Timelines.MAX_TIMELINES; ++i) {
                const id = Timelines.create();
                expect(id).not.toBeNull();
                allocatedIds.push(id!);
            }

            expect(Timelines.getActiveCount()).toBe(Timelines.MAX_TIMELINES);

            // Next allocation fails
            const overflowId = Timelines.create();
            expect(overflowId).toBeNull();

            // Free one slot
            Timelines.stop(allocatedIds[0]);
            expect(Timelines.getActiveCount()).toBe(Timelines.MAX_TIMELINES - 1);

            // Reclaim
            const reclaimedId = Timelines.create();
            expect(reclaimedId).not.toBeNull();
        });

        it('should reject adding more steps than MAX_STEPS_PER_TIMELINE and log warning', () => {
            const logs: string[] = [];
            Timelines.setLogging((text) => {
                logs.push(text);
            });

            const id = Timelines.create();
            expect(id).not.toBeNull();

            for (let i = 0; i < Timelines.MAX_STEPS_PER_TIMELINE; ++i) {
                const added = Timelines.addWait(id!, 10);
                expect(added).toBe(true);
            }

            // 33rd step fails
            const overflowTween = Timelines.addTween(id!, { duration: 10, onUpdate: () => {} });
            expect(overflowTween).toBe(false);

            const overflowSpring = Timelines.addSpring(id!, { onUpdate: () => {} });
            expect(overflowSpring).toBe(false);

            const overflowParallel = Timelines.addParallel(id!, []);
            expect(overflowParallel).toBe(false);

            const overflowWait = Timelines.addWait(id!, 100);
            expect(overflowWait).toBe(false);

            const overflowCall = Timelines.addCall(id!, () => {});
            expect(overflowCall).toBe(false);

            expect(logs.length).toBeGreaterThanOrEqual(1);
            expect(logs[0]).toContain(`Timeline step limit of ${Timelines.MAX_STEPS_PER_TIMELINE} reached`);
        });
    });

    describe('Update Throttling with minUpdateDeltaMs', () => {
        it('should propagate timeline-level minUpdateDeltaMs default to child steps', () => {
            const updates: number[] = [];
            let completed = false;

            const id = Timelines.create({
                minUpdateDeltaMs: 50,
                onComplete: () => {
                    completed = true;
                },
            });

            Timelines.addTween(id!, {
                from: 0,
                to: 100,
                duration: 200,
                onUpdate: (v) => updates.push(v),
            });

            Timelines.play(id!);

            // 1st tick fires
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // Next 3 ticks within 30ms skipped (< 50ms)
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(1);

            // 50ms elapsed -> fires
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            expect(updates.length).toBe(2);

            // Finish timeline
            vi.advanceTimersByTime(150);
            Events.OngoingGlobal.trigger();

            expect(completed).toBe(true);
            expect(updates[updates.length - 1]).toBe(100);
        });

        it('should allow individual steps to override timeline minUpdateDeltaMs', () => {
            const updatesStep1: number[] = [];
            const updatesStep2: number[] = [];

            const id = Timelines.create({
                minUpdateDeltaMs: 100, // Timeline default: 100ms
            });

            // Step 1 overrides to 20ms
            Timelines.addTween(id!, {
                from: 0,
                to: 50,
                duration: 100,
                minUpdateDeltaMs: 20,
                onUpdate: (v) => updatesStep1.push(v),
            });

            // Step 2 inherits 100ms default
            Timelines.addTween(id!, {
                from: 50,
                to: 100,
                duration: 200,
                onUpdate: (v) => updatesStep2.push(v),
            });

            Timelines.play(id!);

            // In step 1: tick at 10ms (1st tick)
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updatesStep1.length).toBe(1);

            // In step 1: tick after +20ms (at 30ms total) -> fires because step minUpdateDeltaMs = 20
            vi.advanceTimersByTime(20);
            Events.OngoingGlobal.trigger();
            expect(updatesStep1.length).toBe(2);

            // Advance to complete step 1 and start step 2
            vi.advanceTimersByTime(80);
            Events.OngoingGlobal.trigger();
            expect(updatesStep1[updatesStep1.length - 1]).toBe(50);

            // Step 2 now starts: 1st tick fires
            vi.advanceTimersByTime(10);
            Events.OngoingGlobal.trigger();
            expect(updatesStep2.length).toBe(1);

            // In step 2: tick after +30ms -> skipped because timeline default is 100ms
            vi.advanceTimersByTime(30);
            Events.OngoingGlobal.trigger();
            expect(updatesStep2.length).toBe(1);

            // Tick after total 100ms elapsed in step 2 -> fires
            vi.advanceTimersByTime(70);
            Events.OngoingGlobal.trigger();
            expect(updatesStep2.length).toBe(2);
        });
    });
});
