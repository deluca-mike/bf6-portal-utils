# Animations Module

<ai>

The `Animations` namespace provides a high-performance UI animation engine tailored for server-side QuickJS environments in Battlefield Portal. The system is designed with zero-allocation steady-state loops, Structure of Arrays (SoA) pooling, and permanent master ticker integration with instant early exit.

Key features include:

- **Structure of Arrays Engine (`Animations`)** – Pooled state management using single-precision and unsigned TypedArrays (`Float32Array`, `Uint32Array`, `Uint8Array`) for zero GC pressure during continuous animation playback.
- **Purely Functional ID-Based Control** – Returns unboxed primitive `AnimationID`s (or `null` when the pool is full) for zero heap allocations when starting or controlling animations.
- **Server Uptime Delta-Time Scaling** – Measures high-precision frame deltas (`dt`) relative to server start time to ensure smooth and identical playback speed across 30Hz and 60Hz tick rates.
- **Zero GC Memory Purging** – Callback references (`onUpdate`, `onComplete`) are nulled out upon completion to eliminate closure memory retention.

</ai>

---

## Quick Start

1. Import the module:
    ```ts
    import { Animations } from 'bf6-portal-utils/animations/animations.ts';
    import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';
    ```

<ai>

### Examples

#### 1. Standard Tween Animation

```ts
import { Animations } from 'bf6-portal-utils/animations/animations.ts';
import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';

// Start a tween animation (returns unboxed AnimationID or null if pool full)
const animId = Animations.start({
    from: 0,
    to: 200,
    duration: 600, // ms
    easing: Transitions.Easing.outExpo,
    onUpdate: (value) => {
        widget.width = value;
    },
    onComplete: () => {
        // Animation completed
    },
});

if (animId !== null) {
    // Functional lifecycle control
    Animations.pause(animId);
    Animations.resume(animId);
    Animations.stop(animId);

    // Status queries
    const active = Animations.isActive(animId); // true if allocated in pool
    const running = Animations.isRunning(animId); // true if ticking, undefined if invalid
    const paused = Animations.isPaused(animId); // true if paused, undefined if invalid
}
```

#### 2. Spring Physics Animation

```ts
import { Animations } from 'bf6-portal-utils/animations/animations.ts';

const springId = Animations.startSpring({
    from: 0,
    to: 100,
    stiffness: 180,
    damping: 24,
    precision: 0.001,
    onUpdate: (value) => {
        widget.x = value;
    },
    onComplete: () => {
        // Spring settled at target
    },
});
```

</ai>
