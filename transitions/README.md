# Transitions Module

<ai>

The `Transitions` namespace provides stateless, deterministic, side-effect-free mathematical functions for animations and physics in Battlefield Portal experiences. It has zero external dependencies and does not rely on game ticks or runtime UI state.

Key features include:

- **Linear Interpolation (`lerp`)** – Precise interpolation with support for negative values and extrapolation.
- **Frozen Easing Library (`Transitions.Easing`)** – Pure easing curves (`linear`, `inQuad`, `outQuad`, `inOutQuad`, `outExpo`, `outBounce`, `ease`, `easeIn`, `easeOut`, `easeInOut`).
- **Configurable Cubic Bezier Generator (`Transitions.cubicBezier`)** – High-precision `cubicBezier(p1x, p1y, p2x, p2y)` curve generator using Newton-Raphson iterations with bisection fallback.
- **Zero-Allocation Spring Physics (`Transitions.calculateSpring`)** – Damped harmonic physics with sub-stepped semi-implicit Euler integration, configurable physical constants, and optional `out` parameter for zero-allocation performance in tight loops.
- **Keyframe Interpolation (`Transitions.interpolateKeyframes`)** – Multi-segment timeline interpolation with boundary clamping and optional per-segment easing curves.

</ai>

---

## Quick Start

1. Import the module:
    ```ts
    import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';
    ```

<ai>

### Examples

```ts
import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';

// 1. Linear interpolation
const mid = Transitions.lerp(0, 100, 0.5); // 50

// 2. Pure easing curves
const quad = Transitions.Easing.outQuad(0.5); // 0.75
const standardEase = Transitions.Easing.ease(0.5);

// 3. Custom cubic bezier curve generator
const customEase = Transitions.cubicBezier(0.25, 0.1, 0.25, 1);
const easedProgress = customEase(0.4);

// 4. Spring physics calculation (with zero-allocation scratch target)
const scratch: Transitions.SpringResult = { value: 0, velocity: 0 };
const result = Transitions.calculateSpring(
    currentValue,
    targetValue,
    currentVelocity,
    dt,
    170, // stiffness
    26, // damping
    scratch // writes to scratch without heap allocation
);

// 5. Multi-segment keyframe interpolation
const keyframes: Transitions.Keyframe[] = [
    { time: 0.0, value: 0, easing: Transitions.Easing.inQuad },
    { time: 0.5, value: 100 },
    { time: 1.0, value: 20 },
];
const currentVal = Transitions.interpolateKeyframes(keyframes, 0.25);
```

</ai>
