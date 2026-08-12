import { Animations } from '../../animations/index.ts';
import { Solid } from '../index.ts';

// version: 1.0.0
export namespace SolidDecayAdapter {
    /**
     * Options for creating a reactive decay animation.
     */
    export type DecayOptions = {
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
    export function createDecay(
        velocity: Solid.SignalID<number> | (() => number),
        options?: DecayOptions
    ): Solid.SignalID<number> {
        const readFrom = (): number => {
            if (typeof options?.from === 'function') return options.from();

            if (typeof options?.from === 'number') return options.from;

            if (options?.from !== undefined) return Solid.read(options.from);

            return 0;
        };

        const initialValue = Solid.untrack(readFrom);
        const currentSig = Solid.createSignal<number>(initialValue);

        const readVelocity = (): number => (typeof velocity === 'function' ? velocity() : Solid.read(velocity));

        let activeId: Animations.AnimationID | null = null;
        let isFirstRun = true;

        Solid.createEffect(() => {
            const nextVelocity = readVelocity();

            // Skip animation on initial creation
            if (isFirstRun) {
                isFirstRun = false;
                return;
            }

            // Stop any existing decay animation on this signal
            if (activeId !== null) {
                Animations.stop(activeId);
                activeId = null;
            }

            if (nextVelocity === 0) return;

            const current = Solid.untrack(() => Solid.read(currentSig));

            activeId = Animations.startDecay({
                from: current,
                velocity: nextVelocity,
                deceleration: options?.deceleration,
                precision: options?.precision,
                delayMs: options?.delayMs,
                minUpdateDeltaMs: options?.minUpdateDeltaMs,
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
