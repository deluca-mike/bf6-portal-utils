import { Animations } from '../../animations/animations.ts';
import { Solid } from '../index.ts';
export declare namespace SolidTweenAdapter {
    /**
     * Options for creating a reactive tween.
     */
    type TweenOptions = Omit<Animations.AnimationConfig, 'from' | 'to' | 'onUpdate'>;
    /**
     * Creates a reactive tween that smoothly interpolates from its current value to new target values.
     * Integrates with Solid reactivity and automatically stops active animations on component unmount via onCleanup.
     * @param target - The reactive source producing target numbers (SignalID or accessor function).
     * @param options - Tween options (duration in ms, easing function, onComplete).
     * @returns A reactive SignalID yielding the interpolated animated number.
     */
    function createTween(
        target: Solid.SignalID<number> | (() => number),
        options?: TweenOptions
    ): Solid.SignalID<number>;
}
