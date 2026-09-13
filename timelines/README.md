# Timelines Module

<ai>

The `Timelines` namespace provides a high-performance, target-agnostic animation choreography engine tailored for server-side QuickJS environments in Battlefield Portal. The system enables multi-step sequencing—including sequential and parallel tweens, spring physics, delays, loops, and action/event callbacks—with zero steady-state heap allocations, Structure-of-Arrays (SoA) pooling, dual-duty intrusive free-lists, and centralized master ticker integration.

Key features include:

- **Structure of Arrays Engine (`Timelines`)** – Pooled state management using TypedArrays (`Uint8Array`, `Uint16Array`, `Uint32Array`, `Int16Array`) with a dual-duty free-list array (`_currentStep`) to eliminate GC pressure during playback.
- **Dual API Access** – Exposes both a pure, unboxed primitive `TimelineID` functional API (`Timelines.play(id)`, `Timelines.stop(id)`) for zero-allocation game loops, and an optional, thin object-oriented wrapper (`new Timelines.Timeline()`).
- **Flexible Step Choreography** – Supports single tweens (`addTween`), spring physics (`addSpring`), parallel multi-track batches (`addParallel`), delays (`addWait`), and action/event triggers (`addCall`).
- **Update Rate Throttling (`minUpdateDeltaMs`)** – Configurable default throttle rate per timeline with step-level overrides to minimize server tick processing overhead.
- **Looping & Lifecycle Events** – Supports finite or infinite looping (`loop: true | number`) with `onStep`, `onLoop`, and `onComplete` event callbacks.
- **Target Agnostic & Strict Encapsulation** – Does not directly mutate engine objects. Operates on progress values ($0 \to 1$) and numbers, allowing seamless choreography across `UI`, `Spatial`, audio, and custom gameplay state.

</ai>

---

## Quick Start

1. Import the module:
    ```ts
    import { Timelines } from 'bf6-portal-utils/timelines';
    import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';
    import { Vectors } from 'bf6-portal-utils/vectors';
    ```

<ai>

### Examples

#### 1. Functional ID-Based Timeline (Zero Heap Allocations)

```ts
import { Timelines } from 'bf6-portal-utils/timelines';
import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';
import { Vectors } from 'bf6-portal-utils/vectors';

const scratch = { x: 0, y: 0, z: 0 };
const startPos = { x: -500, y: 0, z: 0 };
const endPos = { x: 0, y: 0, z: 0 };

// Allocate timeline
const id = Timelines.create({
    onComplete: () => {
        // Timeline completed
    },
});

if (id !== null) {
    // 1. Slide in with cubic easing
    Timelines.addTween(id, {
        from: 0,
        to: 1,
        duration: 300,
        easing: Transitions.Easing.outCubic,
        onUpdate: (t) => {
            panel.bgAlpha = t * 0.9;
            panel.position = Vectors.lerp(startPos, endPos, t, scratch);
        },
    });

    // 2. Pause for 1.5 seconds
    Timelines.addWait(id, 1500);

    // 3. Fire custom event
    Timelines.addCall(id, () => {
        Events.OnNotificationDismissed.trigger(player);
    });

    // 4. Slide out
    Timelines.addTween(id, {
        from: 0,
        to: 1,
        duration: 200,
        easing: Transitions.Easing.inCubic,
        onUpdate: (t) => {
            panel.bgAlpha = (1 - t) * 0.9;
        },
    });

    // Playback control
    Timelines.play(id);
    Timelines.pause(id);
    Timelines.resume(id);
    Timelines.stop(id);
}
```

#### 2. Fluent Class Wrapper

```ts
import { Timelines } from 'bf6-portal-utils/timelines';
import { Transitions } from 'bf6-portal-utils/transitions/transitions.ts';

const tl = new Timelines.Timeline({ loop: 2 })
    .addTween({
        from: 0,
        to: 100,
        duration: 400,
        easing: Transitions.Easing.outBack,
        onUpdate: (val) => {
            widget.width = val;
        },
    })
    .addWait(200)
    .addParallel([
        {
            duration: 250,
            easing: Transitions.Easing.inQuad,
            onUpdate: (t) => {
                label.textAlpha = 1 - t;
            },
        },
        {
            type: 'spring',
            from: 100,
            to: 0,
            stiffness: 220,
            damping: 28,
            onUpdate: (val) => {
                widget.width = val;
            },
        },
    ])
    .play();

// Async playback resolution
await tl.playAsync();
```

</ai>
