import { Solid } from '../index.ts';
export declare namespace SolidSpringAdapter {
    /**
     * Options for creating a reactive spring.
     */
    type SpringOptions = {
        /**
         * Spring stiffness coefficient (default: 170).
         */
        stiffness?: number;
        /**
         * Damping coefficient (default: 26).
         */
        damping?: number;
        /**
         * Initial velocity when spring animation starts (default: 0).
         */
        velocity?: number;
        /**
         * Threshold to consider the spring settled (default: 0.001).
         */
        precision?: number;
        /**
         * Optional callback fired when the spring settles at the target.
         */
        onComplete?: () => void;
    };
    /**
     * Creates a reactive spring physics signal that dynamically tracks target numbers.
     * Integrates with Solid reactivity and cleans up active animations on component unmount via onCleanup.
     * @param target - The reactive source producing target numbers (SignalID or accessor function).
     * @param options - Spring physics options (stiffness, damping, precision, onComplete).
     * @returns A reactive SignalID yielding the physical animated number.
     */
    function createSpring(
        target: Solid.SignalID<number> | (() => number),
        options?: SpringOptions
    ): Solid.SignalID<number>;
}
