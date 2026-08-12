import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Animations } from '../../animations/animations.ts';
import { Events } from '../../events/index.ts';
import { Solid } from '../index.ts';
import { SolidTweenAdapter } from '../adapters/createTween.ts';
import { SolidSpringAdapter } from '../adapters/createSpring.ts';

describe('Solid Animation Adapters', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Solid.setLogging(undefined);
        Animations.setLogging(undefined);
    });

    afterEach(() => {
        // Clean up any running animations
        for (let i = 0; i < Animations.MAX_ANIMATIONS; ++i) {
            Animations.stop(i as unknown as Animations.AnimationID);
        }
        vi.useRealTimers();
    });

    describe('SolidTweenAdapter.createTween', () => {
        it('should initialize with starting target value without immediately animating', () => {
            const targetSig = Solid.createSignal(50);
            const tweenSig = SolidTweenAdapter.createTween(targetSig, { duration: 500 });

            expect(Solid.read(tweenSig)).toBe(50);
            expect(Animations.getRunningCount()).toBe(0);
        });

        it('should animate smoothly to new target values when source signal changes', async () => {
            const targetSig = Solid.createSignal(0);
            let tweenVal = -1;

            Solid.createRoot(() => {
                const tweenSig = SolidTweenAdapter.createTween(targetSig, { duration: 1000 });
                Solid.createEffect(() => {
                    tweenVal = Solid.read(tweenSig);
                });
            });

            expect(tweenVal).toBe(0);

            // Change target
            Solid.write(targetSig, 100);
            await Promise.resolve(); // Flush microtasks

            expect(Animations.getRunningCount()).toBe(1);

            // Halfway
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(tweenVal).toBeCloseTo(50, -1);

            // Complete
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(tweenVal).toBe(100);
            expect(Animations.getRunningCount()).toBe(0);
        });

        it('should interrupt and seamlessly retarget running tweens without position snaps', async () => {
            const targetSig = Solid.createSignal(0);
            let tweenVal = -1;

            Solid.createRoot(() => {
                const tweenSig = SolidTweenAdapter.createTween(targetSig, { duration: 1000 });
                Solid.createEffect(() => {
                    tweenVal = Solid.read(tweenSig);
                });
            });

            Solid.write(targetSig, 100);
            await Promise.resolve();

            // Progress to 40% (approx 40)
            vi.advanceTimersByTime(400);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            const interruptedVal = tweenVal;
            expect(interruptedVal).toBeCloseTo(40, -1);

            // Retarget to 200 mid-flight
            Solid.write(targetSig, 200);
            await Promise.resolve();

            // Next tick should start from interruptedVal (~40) towards 200
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            // Halfway from 40 to 200 is approx 120
            expect(tweenVal).toBeGreaterThan(interruptedVal);
            expect(tweenVal).toBeCloseTo(120, -1);

            // Complete
            vi.advanceTimersByTime(500);
            Events.OngoingGlobal.trigger();
            await Promise.resolve();

            expect(tweenVal).toBe(200);
        });

        it('should cancel active tween when component scope unmounts via onCleanup', async () => {
            const targetSig = Solid.createSignal(0);
            let disposeRoot!: () => void;

            Solid.createRoot((dispose) => {
                disposeRoot = dispose;
                SolidTweenAdapter.createTween(targetSig, { duration: 1000 });
            });

            Solid.write(targetSig, 100);
            await Promise.resolve();

            expect(Animations.getRunningCount()).toBe(1);

            // Unmount component scope
            disposeRoot();

            expect(Animations.getRunningCount()).toBe(0);
        });
    });

    describe('SolidSpringAdapter.createSpring', () => {
        it('should initialize with initial target and track updates via spring physics', async () => {
            const targetSig = Solid.createSignal(10);
            let springVal = -1;

            Solid.createRoot(() => {
                const springSig = SolidSpringAdapter.createSpring(targetSig, {
                    stiffness: 200,
                    damping: 25,
                });
                Solid.createEffect(() => {
                    springVal = Solid.read(springSig);
                });
            });

            expect(springVal).toBe(10);
            expect(Animations.getRunningCount()).toBe(0);

            Solid.write(targetSig, 60);
            await Promise.resolve();

            expect(Animations.getRunningCount()).toBe(1);

            // Step through physics ticks
            for (let i = 0; i < 80; ++i) {
                vi.advanceTimersByTime(16.67);
                Events.OngoingGlobal.trigger();
                await Promise.resolve();
                if (Animations.getRunningCount() === 0) {
                    await Promise.resolve();
                    break;
                }
            }

            expect(springVal).toBe(60);
            expect(Animations.getRunningCount()).toBe(0);
        });

        it('should cancel active spring when component scope unmounts via onCleanup', async () => {
            const targetSig = Solid.createSignal(0);
            let disposeRoot!: () => void;

            Solid.createRoot((dispose) => {
                disposeRoot = dispose;
                SolidSpringAdapter.createSpring(targetSig);
            });

            Solid.write(targetSig, 100);
            await Promise.resolve();

            expect(Animations.getRunningCount()).toBe(1);

            disposeRoot();

            expect(Animations.getRunningCount()).toBe(0);
        });
    });
});
