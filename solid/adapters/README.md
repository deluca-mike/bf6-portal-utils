# Solid Animation Adapters

<ai>

The `SolidTweenAdapter` and `SolidSpringAdapter` namespaces provide reactive animation adapters bridging `Animations` and `Transitions` with Structure of Arrays Solid reactivity (`createSignal`, `createEffect`, `onCleanup`).

Key features include:

- **`SolidTweenAdapter.createTween(target, options)`** – Creates a reactive accessor that smoothly interpolates to new target values as the input signal changes.
- **`SolidSpringAdapter.createSpring(target, options)`** – Creates a reactive spring physics accessor that tracks dynamic target values with momentum and velocity continuity.
- **Automatic Lifecycle Cleanup** – Registers `onCleanup()` on the active component scope to immediately cancel running animations when components unmount or target values retarget mid-flight.

</ai>

---

## Quick Start

1. Import the adapters:
    ```ts
    import { SolidTweenAdapter } from 'bf6-portal-utils/solid/adapters/createTween.ts';
    import { SolidSpringAdapter } from 'bf6-portal-utils/solid/adapters/createSpring.ts';
    ```

<ai>

### Examples

```ts
import { Solid } from 'bf6-portal-utils/solid/index.ts';
import { SolidTweenAdapter } from 'bf6-portal-utils/solid/adapters/createTween.ts';
import { SolidSpringAdapter } from 'bf6-portal-utils/solid/adapters/createSpring.ts';

// SoA reactive tween
const [width, setWidth] = Solid.createSignal(100);
const animatedWidth = SolidTweenAdapter.createTween(width, { duration: 400 });

// SoA spring physics
const [positionX, setPositionX] = Solid.createSignal(0);
const animatedX = SolidSpringAdapter.createSpring(positionX, { stiffness: 180, damping: 24 });
```

</ai>
