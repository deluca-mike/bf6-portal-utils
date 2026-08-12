import { Solid } from '../index.ts';
export declare namespace SolidDecayAdapter {
    /**
     * Options for creating a reactive decay animation.
     */
    type DecayOptions = {
        /**
         * Deceleration friction coefficient between 0.0 and 1.0 (default: 0.997 per millisecond).
         * Values closer to 1.0 glide longer; values closer to 0.0 stop sooner.
         */
        deceleration?: number;
        /**
         * Precision threshold to determine when velocity has settled (default: 0.01).
         */
        precision?: number;
        /**
         * Optional initial numeric value or reactive position source (default: 0).
         */
        from?: number | Solid.SignalID<number> | (() => number);
        /**
         * Optional start delay in milliseconds before decay begins updating.
         */
        delayMs?: number;
        /**
         * Optional minimum elapsed time in milliseconds between onUpdate invocations.
         */
        minUpdateDeltaMs?: number;
        /**
         * Optional callback fired when the decay animation settles.
         */
        onComplete?: () => void;
    };
    /**
     * Creates a reactive decay/inertia signal that glides position from current value based on velocity impulses.
     * Integrates with Solid reactivity and automatically cleans up active animations on component unmount via onCleanup.
     * @param velocity - The reactive source producing velocity values (SignalID or accessor function).
     * @param options - Decay options (deceleration, precision, initial position, onComplete).
     * @returns A reactive SignalID yielding the decelerated animated position.
     */
    function createDecay(
        velocity: Solid.SignalID<number> | (() => number),
        options?: DecayOptions
    ): Solid.SignalID<number>;
}
