import { Animations } from '../../animations/animations.ts';
import { Solid } from '../index.ts';

// version: 1.0.0
export namespace SolidSpringAdapter {
    /**
     * Options for creating a reactive spring.
     */
    export type SpringOptions = {
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
    export function createSpring(
        target: Solid.SignalID<number> | (() => number),
        options?: SpringOptions
    ): Solid.SignalID<number> {
        const readTarget = (): number => (typeof target === 'function' ? target() : Solid.read(target));
        const initialValue = Solid.untrack(readTarget);
        const currentSig = Solid.createSignal<number>(initialValue);

        let activeId: Animations.AnimationID | null = null;
        let isFirstRun = true;

        Solid.createEffect(() => {
            const nextTarget = readTarget();

            // Skip animation on initial creation
            if (isFirstRun) {
                isFirstRun = false;
                return;
            }

            // Stop any existing animation on this spring
            if (activeId !== null) {
                Animations.stop(activeId);
                activeId = null;
            }

            const current = Solid.untrack(() => Solid.read(currentSig));

            if (current === nextTarget) return;

            activeId = Animations.startSpring({
                from: current,
                to: nextTarget,
                stiffness: options?.stiffness,
                damping: options?.damping,
                precision: options?.precision,
                velocity: options?.velocity,
                onUpdate: (val: number) => {
                    Solid.write(currentSig, val);
                },
                onComplete: () => {
                    activeId = null;
                    options?.onComplete?.();
                },
            });
        });

        Solid.onCleanup(() => {
            if (activeId !== null) {
                Animations.stop(activeId);
                activeId = null;
            }
        });

        return currentSig;
    }
}
