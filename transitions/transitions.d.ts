export declare namespace Transitions {
    /**
     * Function signature for easing functions.
     * Takes a normalized progress value t (0.0 to 1.0) and returns an eased progress value.
     */
    type EasingFn = (t: number) => number;
    /**
     * Result of a single spring integration step.
     */
    type SpringResult = {
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
    type Keyframe = {
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
    function lerp(start: number, end: number, t: number): number;
    /**
     * Creates a configurable cubic bezier easing function given control points (p1x, p1y) and (p2x, p2y).
     * Uses Newton-Raphson root finding with bisection fallback for deterministic and exact curve evaluation.
     * @param p1x - X coordinate of first control point (0.0 to 1.0).
     * @param p1y - Y coordinate of first control point.
     * @param p2x - X coordinate of second control point (0.0 to 1.0).
     * @param p2y - Y coordinate of second control point.
     * @returns An easing function mapping normalized time t to progress.
     */
    function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): EasingFn;
    /**
     * Map of standard and pre-configured easing curves (frozen).
     */
    const Easing: Readonly<{
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
    }>;
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
    function calculateSpring(
        current: number,
        target: number,
        velocity: number,
        dt: number,
        stiffness?: number,
        damping?: number,
        out?: SpringResult
    ): SpringResult;
    /**
     * Interpolates across an array of keyframes for a normalized time t (0.0 to 1.0).
     * @param keyframes - Array of keyframes sorted or unsorted by time.
     * @param t - Normalized progress factor (0.0 to 1.0).
     * @returns The interpolated value at time t.
     */
    function interpolateKeyframes(keyframes: Keyframe[], t: number): number;
}
