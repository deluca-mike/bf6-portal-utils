// version: 1.0.0
export namespace Transitions {
    /**
     * Function signature for easing functions.
     * Takes a normalized progress value t (0.0 to 1.0) and returns an eased progress value.
     */
    export type EasingFn = (t: number) => number;

    /**
     * Result of a single spring integration step.
     */
    export type SpringResult = {
        /**
         * New position/value after the time step.
         */
        value: number;
        /**
         * New velocity after the time step.
         */
        velocity: number;
    };

    /**
     * Keyframe representation for keyframe interpolation.
     */
    export type Keyframe = {
        /**
         * Normalized time of the keyframe (0.0 to 1.0).
         */
        time: number;
        /**
         * Target value at this keyframe.
         */
        value: number;
        /**
         * Optional easing function applied from this keyframe to the next.
         */
        easing?: EasingFn;
    };

    /**
     * Linearly interpolates between start and end values based on factor t.
     * @param start - Starting value (when t = 0).
     * @param end - Ending value (when t = 1).
     * @param t - Progress factor (typically 0.0 to 1.0).
     * @returns The linearly interpolated value.
     */
    export function lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    /**
     * Creates a configurable cubic bezier easing function given control points (p1x, p1y) and (p2x, p2y).
     * Uses Newton-Raphson root finding with bisection fallback for deterministic and exact curve evaluation.
     * @param p1x - X coordinate of first control point (0.0 to 1.0).
     * @param p1y - Y coordinate of first control point.
     * @param p2x - X coordinate of second control point (0.0 to 1.0).
     * @param p2y - Y coordinate of second control point.
     * @returns An easing function mapping normalized time t to progress.
     */
    export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): EasingFn {
        const cx = 3 * p1x;
        const bx = 3 * (p2x - p1x) - cx;
        const ax = 1 - cx - bx;

        const cy = 3 * p1y;
        const by = 3 * (p2y - p1y) - cy;
        const ay = 1 - cy - by;

        function sampleCurveX(t: number): number {
            return ((ax * t + bx) * t + cx) * t;
        }

        function sampleCurveY(t: number): number {
            return ((ay * t + by) * t + cy) * t;
        }

        function sampleCurveDerivativeX(t: number): number {
            return (3 * ax * t + 2 * bx) * t + cx;
        }

        function solveCurveX(x: number): number {
            let t = x;

            // Newton-Raphson iterations
            for (let i = 0; i < 8; ++i) {
                const xCurrent = sampleCurveX(t) - x;

                if (Math.abs(xCurrent) < 1e-7) return t;

                const dX = sampleCurveDerivativeX(t);

                if (Math.abs(dX) < 1e-6) break; // Slope too flat, switch to bisection

                t -= xCurrent / dX;
            }

            // Bisection fallback
            let tMin = 0.0;
            let tMax = 1.0;
            t = x;

            for (let i = 0; i < 12; ++i) {
                const xCurrent = sampleCurveX(t);

                if (Math.abs(xCurrent - x) < 1e-7) return t;

                if (xCurrent < x) {
                    tMin = t;
                } else {
                    tMax = t;
                }

                t = (tMin + tMax) * 0.5;
            }

            return t;
        }

        return (t: number): number => {
            if (t <= 0) return 0;

            if (t >= 1) return 1;

            if (p1x === p1y && p2x === p2y) return t;

            return sampleCurveY(solveCurveX(t));
        };
    }

    function _easeOutBounce(t: number): number {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) return n1 * t * t;

        if (t < 2 / d1) {
            const t2 = t - 1.5 / d1;
            return n1 * t2 * t2 + 0.75;
        }

        if (t < 2.5 / d1) {
            const t3 = t - 2.25 / d1;
            return n1 * t3 * t3 + 0.9375;
        }

        const t4 = t - 2.625 / d1;
        return n1 * t4 * t4 + 0.984375;
    }

    /**
     * Map of standard and pre-configured easing curves (frozen).
     */
    export const Easing: Readonly<{
        linear: EasingFn;
        inQuad: EasingFn;
        outQuad: EasingFn;
        inOutQuad: EasingFn;
        outExpo: EasingFn;
        outBounce: EasingFn;
        ease: EasingFn;
        easeIn: EasingFn;
        easeOut: EasingFn;
        easeInOut: EasingFn;
    }> = Object.freeze({
        linear: (t: number): number => t,
        inQuad: (t: number): number => t * t,
        outQuad: (t: number): number => t * (2 - t),
        inOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        outExpo: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        outBounce: _easeOutBounce,
        ease: cubicBezier(0.25, 0.1, 0.25, 1.0),
        easeIn: cubicBezier(0.42, 0.0, 1.0, 1.0),
        easeOut: cubicBezier(0.0, 0.0, 0.58, 1.0),
        easeInOut: cubicBezier(0.42, 0.0, 0.58, 1.0),
    });

    /**
     * Calculates the new position and velocity of a damped harmonic spring system for a given delta time step.
     * Uses sub-stepped semi-implicit Euler integration for deterministic and unconditionally stable physics.
     * Accepts an optional `out` parameter to enable zero-allocation calls in high-frequency game loops.
     * @param current - Current position value.
     * @param target - Target rest position.
     * @param velocity - Current velocity.
     * @param dt - Delta time step in seconds.
     * @param stiffness - Spring stiffness coefficient (default: 170).
     * @param damping - Damping coefficient (default: 26).
     * @param out - Optional target {@link SpringResult} to write results into for zero-allocation reuse.
     * @returns The updated value and velocity in the `out` target or a new {@link SpringResult}.
     */
    export function calculateSpring(
        current: number,
        target: number,
        velocity: number,
        dt: number,
        stiffness: number = 170,
        damping: number = 26,
        out?: SpringResult
    ): SpringResult {
        if (dt <= 0) {
            if (!out) return { value: current, velocity };

            out.value = current;
            out.velocity = velocity;

            return out;
        }

        // Sub-step when dt > 0.016s to prevent numerical divergence on stiff springs
        const maxSubStep = 0.016;
        let remainingDt = dt;
        let val = current;
        let vel = velocity;

        while (remainingDt > 0) {
            const step = remainingDt > maxSubStep ? maxSubStep : remainingDt;
            remainingDt -= step;

            const displacement = val - target;
            const acceleration = -stiffness * displacement - damping * vel;

            vel += acceleration * step;
            val += vel * step;
        }

        if (!out) return { value: val, velocity: vel };

        out.value = val;
        out.velocity = vel;

        return out;
    }

    /**
     * Interpolates across an array of keyframes for a normalized time t (0.0 to 1.0).
     * @param keyframes - Array of keyframes sorted or unsorted by time.
     * @param t - Normalized progress factor (0.0 to 1.0).
     * @returns The interpolated value at time t.
     */
    export function interpolateKeyframes(keyframes: Keyframe[], t: number): number {
        const len = keyframes.length;

        if (len === 0) return 0;

        if (len === 1) return keyframes[0].value;

        // Check if keyframes need sorting
        let isSorted = true;

        for (let i = 0; i < len - 1; ++i) {
            if (keyframes[i].time <= keyframes[i + 1].time) continue;

            isSorted = false;
            break;
        }

        const frames = isSorted ? keyframes : keyframes.slice().sort((a, b) => a.time - b.time);

        if (t <= frames[0].time) return frames[0].value;

        if (t >= frames[len - 1].time) return frames[len - 1].value;

        // Locate bounding segment
        for (let i = 0; i < len - 1; ++i) {
            const k0 = frames[i];
            const k1 = frames[i + 1];

            if (t < k0.time || t > k1.time) continue;

            const segmentDuration = k1.time - k0.time;

            if (segmentDuration <= 0) return k1.value;

            const localProgress = (t - k0.time) / segmentDuration;
            const easedProgress = k0.easing ? k0.easing(localProgress) : localProgress;

            return lerp(k0.value, k1.value, easedProgress);
        }

        return frames[len - 1].value;
    }
}
