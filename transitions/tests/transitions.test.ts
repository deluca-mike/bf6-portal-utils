import { describe, expect, it } from 'vitest';
import { Transitions } from '../transitions.ts';

describe('Transitions Math Module', () => {
    describe('lerp', () => {
        it('should interpolate linearly between start and end values', () => {
            expect(Transitions.lerp(0, 100, 0)).toBe(0);
            expect(Transitions.lerp(0, 100, 0.5)).toBe(50);
            expect(Transitions.lerp(0, 100, 1)).toBe(100);
            expect(Transitions.lerp(-50, 50, 0.5)).toBe(0);
            expect(Transitions.lerp(100, 0, 0.25)).toBe(75);
        });

        it('should handle extrapolation outside 0..1', () => {
            expect(Transitions.lerp(0, 100, 1.5)).toBe(150);
            expect(Transitions.lerp(0, 100, -0.5)).toBe(-50);
        });
    });

    describe('Easing Curves (Transitions.Easing)', () => {
        it('Easing object is frozen', () => {
            expect(Object.isFrozen(Transitions.Easing)).toBe(true);
        });

        it('linear should return identity', () => {
            expect(Transitions.Easing.linear(0)).toBe(0);
            expect(Transitions.Easing.linear(0.5)).toBe(0.5);
            expect(Transitions.Easing.linear(1)).toBe(1);
        });

        it('inQuad should accelerate from zero velocity', () => {
            expect(Transitions.Easing.inQuad(0)).toBe(0);
            expect(Transitions.Easing.inQuad(0.5)).toBe(0.25);
            expect(Transitions.Easing.inQuad(1)).toBe(1);
        });

        it('outQuad should decelerate to zero velocity', () => {
            expect(Transitions.Easing.outQuad(0)).toBe(0);
            expect(Transitions.Easing.outQuad(0.5)).toBe(0.75);
            expect(Transitions.Easing.outQuad(1)).toBe(1);
        });

        it('inOutQuad should accelerate then decelerate symmetrically', () => {
            expect(Transitions.Easing.inOutQuad(0)).toBe(0);
            expect(Transitions.Easing.inOutQuad(0.25)).toBe(0.125);
            expect(Transitions.Easing.inOutQuad(0.5)).toBe(0.5);
            expect(Transitions.Easing.inOutQuad(0.75)).toBe(0.875);
            expect(Transitions.Easing.inOutQuad(1)).toBe(1);
        });

        it('outExpo should scale exponentially', () => {
            expect(Transitions.Easing.outExpo(0)).toBe(0);
            expect(Transitions.Easing.outExpo(1)).toBe(1);
            expect(Transitions.Easing.outExpo(0.5)).toBeCloseTo(1 - Math.pow(2, -5), 5);
        });

        it('outBounce should produce bounce dynamics and settle at 1', () => {
            expect(Transitions.Easing.outBounce(0)).toBe(0);
            expect(Transitions.Easing.outBounce(1)).toBe(1);
            expect(Transitions.Easing.outBounce(0.5)).toBeGreaterThan(0.7);
            expect(Transitions.Easing.outBounce(0.95)).toBeGreaterThan(0.95);
        });

        it('pre-configured cubic bezier curves ease, easeIn, easeOut, easeInOut work as expected', () => {
            expect(Transitions.Easing.ease(0)).toBe(0);
            expect(Transitions.Easing.ease(1)).toBe(1);
            expect(Transitions.Easing.easeIn(0)).toBe(0);
            expect(Transitions.Easing.easeIn(1)).toBe(1);
            expect(Transitions.Easing.easeOut(0)).toBe(0);
            expect(Transitions.Easing.easeOut(1)).toBe(1);
            expect(Transitions.Easing.easeInOut(0)).toBe(0);
            expect(Transitions.Easing.easeInOut(1)).toBe(1);
        });
    });

    describe('cubicBezier Generator', () => {
        it('should evaluate linear curve with control points (0, 0, 1, 1)', () => {
            const easeLinear = Transitions.cubicBezier(0, 0, 1, 1);
            expect(easeLinear(0)).toBe(0);
            expect(easeLinear(0.5)).toBeCloseTo(0.5, 4);
            expect(easeLinear(1)).toBe(1);
        });

        it('should clamp bounds outside 0..1', () => {
            const ease = Transitions.cubicBezier(0.25, 0.1, 0.25, 1);
            expect(ease(-0.5)).toBe(0);
            expect(ease(1.5)).toBe(1);
        });

        it('should solve custom cubic bezier curve', () => {
            const ease = Transitions.cubicBezier(0.25, 0.1, 0.25, 1);
            expect(ease(0)).toBe(0);
            expect(ease(1)).toBe(1);
            const mid = ease(0.5);
            expect(mid).toBeGreaterThan(0.5);
        });
    });

    describe('calculateSpring', () => {
        it('should return unchanged state when dt is zero or negative', () => {
            const result = Transitions.calculateSpring(0, 100, 10, 0);
            expect(result.value).toBe(0);
            expect(result.velocity).toBe(10);
        });

        it('should accelerate towards target on positive dt', () => {
            const result = Transitions.calculateSpring(0, 100, 0, 0.016);
            expect(result.value).toBeGreaterThan(0);
            expect(result.velocity).toBeGreaterThan(0);
        });

        it('should write results to optional out target without allocating new objects', () => {
            const scratch: Transitions.SpringResult = { value: -999, velocity: -999 };
            const returned = Transitions.calculateSpring(0, 100, 0, 0.016, 170, 26, scratch);

            expect(returned).toBe(scratch);
            expect(scratch.value).toBeGreaterThan(0);
            expect(scratch.velocity).toBeGreaterThan(0);
        });

        it('should converge towards target over multiple steps', () => {
            let current = 0;
            let velocity = 0;
            const target = 100;
            const dt = 0.016;
            const scratch: Transitions.SpringResult = { value: 0, velocity: 0 };

            for (let i = 0; i < 60; ++i) {
                Transitions.calculateSpring(current, target, velocity, dt, 170, 26, scratch);
                current = scratch.value;
                velocity = scratch.velocity;
            }

            expect(current).toBeCloseTo(target, 0);
            expect(Math.abs(velocity)).toBeLessThan(5);
        });

        it('should handle custom damping without diverging', () => {
            let current = 0;
            let velocity = 0;
            const target = 50;

            for (let i = 0; i < 120; ++i) {
                const step = Transitions.calculateSpring(current, target, velocity, 0.033, 300, 40);
                current = step.value;
                velocity = step.velocity;
            }

            expect(current).toBeCloseTo(target, 0);
        });
    });

    describe('interpolateKeyframes', () => {
        it('should handle empty keyframe array', () => {
            expect(Transitions.interpolateKeyframes([], 0.5)).toBe(0);
        });

        it('should handle single keyframe', () => {
            expect(Transitions.interpolateKeyframes([{ time: 0.5, value: 42 }], 0.1)).toBe(42);
            expect(Transitions.interpolateKeyframes([{ time: 0.5, value: 42 }], 0.9)).toBe(42);
        });

        it('should interpolate linearly between keyframe segments', () => {
            const keyframes: Transitions.Keyframe[] = [
                { time: 0.0, value: 0 },
                { time: 0.5, value: 100 },
                { time: 1.0, value: 20 },
            ];

            expect(Transitions.interpolateKeyframes(keyframes, 0.0)).toBe(0);
            expect(Transitions.interpolateKeyframes(keyframes, 0.25)).toBe(50);
            expect(Transitions.interpolateKeyframes(keyframes, 0.5)).toBe(100);
            expect(Transitions.interpolateKeyframes(keyframes, 0.75)).toBe(60);
            expect(Transitions.interpolateKeyframes(keyframes, 1.0)).toBe(20);
        });

        it('should clamp bounds before first and after last keyframe', () => {
            const keyframes: Transitions.Keyframe[] = [
                { time: 0.2, value: 10 },
                { time: 0.8, value: 50 },
            ];

            expect(Transitions.interpolateKeyframes(keyframes, 0.0)).toBe(10);
            expect(Transitions.interpolateKeyframes(keyframes, 0.1)).toBe(10);
            expect(Transitions.interpolateKeyframes(keyframes, 0.9)).toBe(50);
            expect(Transitions.interpolateKeyframes(keyframes, 1.5)).toBe(50);
        });

        it('should handle unsorted keyframe arrays', () => {
            const unsorted: Transitions.Keyframe[] = [
                { time: 1.0, value: 100 },
                { time: 0.0, value: 0 },
                { time: 0.5, value: 50 },
            ];

            expect(Transitions.interpolateKeyframes(unsorted, 0.25)).toBe(25);
            expect(Transitions.interpolateKeyframes(unsorted, 0.75)).toBe(75);
        });

        it('should apply per-segment custom easing', () => {
            const keyframes: Transitions.Keyframe[] = [
                { time: 0.0, value: 0, easing: Transitions.Easing.inQuad },
                { time: 1.0, value: 100 },
            ];

            expect(Transitions.interpolateKeyframes(keyframes, 0.5)).toBe(25);
        });
    });
});
