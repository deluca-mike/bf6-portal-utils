import { Animations } from '../../animations/animations.ts';
import { Solid } from '../index.ts';

// version: 1.0.0
export namespace SolidTweenAdapter {
    /**
     * Options for creating a reactive tween.
     */
    export type TweenOptions = Omit<Animations.AnimationConfig, 'from' | 'to' | 'onUpdate'>;

    /**
     * Creates a reactive tween that smoothly interpolates from its current value to new target values.
     * Integrates with Solid reactivity and automatically stops active animations on component unmount via onCleanup.
     * @param target - The reactive source producing target numbers (SignalID or accessor function).
     * @param options - Tween options (duration in ms, easing function, onComplete).
     * @returns A reactive SignalID yielding the interpolated animated number.
     */
    export function createTween(
        target: Solid.SignalID<number> | (() => number),
        options?: TweenOptions
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

            // Stop any existing tween on this accessor to avoid competing interpolations
            if (activeId !== null) {
                Animations.stop(activeId);
                activeId = null;
            }

            const current = Solid.untrack(() => Solid.read(currentSig));

            if (current === nextTarget) return;

            activeId = Animations.start({
                from: current,
                to: nextTarget,
                duration: options?.duration ?? 300,
                easing: options?.easing,
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
