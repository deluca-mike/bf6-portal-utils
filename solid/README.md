# Solid Module

<ai>

This TypeScript `Solid` namespace provides an ultra-low-overhead, pure **Structure-of-Arrays (SoA)** reactive UI and object framework for Battlefield Portal, inspired by [SolidJS](https://github.com/solidjs/solid). Unlike traditional frameworks that re-render entire components, `Solid` uses fine-grained reactivity to update only the specific properties that change, resulting in minimal overhead and maximum performance.

`Solid` is a from-scratch implementation of reactive primitives (signals, effects, memos, stores) adapted for the resource-constrained Battlefield 6 Portal embedded JavaScript environment (QuickJS). It uses a HyperScript factory function (`Solid.h()`) instead of JSX/TSX, and integrates seamlessly with both the 2D [`UI`](../ui/README.md) module and the 3D [`Spatial`](../spatial/README.md) scene graph to create dynamic, reactive user interfaces and scene hierarchies.

Unlike traditional reactive engines that allocate JavaScript closures, wrapper tuples, and class instances (`new Subscriber()`, `new SignalState()`), `Solid` operates on generation-encoded, branded integer identifiers (`SignalID`, `EffectID`) backed entirely by flat TypedArrays, static 2D dependency buffers (`MAX_DEPS_PER_SUB = 8`), and an intrusive doubly-linked edge graph.

Updates are driven by a logical tick counter (advanced on each `Events.OngoingGlobal` callback), a two-tier scheduler queue (flat array for immediate microtasks and flat array for deferred ticks), and the microtask queue for immediate (`deferTicks: 0`) work. Optional **`deferTicks`** on effects, memos, `h()` bindings, and `Index()` coalesces re-runs to a future logical tick. The module uses the `Logging` module for internal logging, including scheduler safety limits (`MAX_EXECUTIONS_PER_FLUSH`, `MAX_FLUSHES_PER_TICK`).

> **Note** The `Solid` namespace is decoupled from the `UI` and `Spatial` modules but has been designed and tested with them. It assumes that UI/Spatial objects have getters and setters for properties that need to be reactive.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Solid } from 'bf6-portal-utils/solid';
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Create reactive signals with `Solid.createSignal()`.
4. Use `Solid.h()` to create UI components or spatial elements with reactive properties.
5. Pass `SignalID` identifiers or getter functions as property values to make them reactive.
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

**File: `src/index.ts`**

```ts
import { Solid } from 'bf6-portal-utils/solid';
import { UI } from 'bf6-portal-utils/ui';

// Optional: Configure logging for reactive system error monitoring
Solid.setLogging((text) => console.log(text), Solid.LogLevel.Error);

function createCounterUI(player: mod.Player): void {
    // Create a reactive signal (returns a branded SignalID integer handle)
    const countSig = Solid.createSignal(0);

    // Create a container with reactive visibility
    const container = Solid.h(UI.Container, {
        receiver: player,
        width: 200,
        height: 300,
        visible: true,
    });

    // Create text that updates when count changes (using a getter function)
    Solid.h(UI.Text, {
        parent: container,
        anchor: mod.UIAnchor.TopCenter,
        width: 200,
        message: () => mod.Message(mod.stringkeys.count, Solid.read(countSig)),
        textSize: 30,
        textColor: UI.COLORS.BLACK,
    });

    // Create text that coalesces count change updates every 30 ticks
    Solid.h(
        UI.Text,
        {
            parent: container,
            anchor: mod.UIAnchor.Center,
            width: 200,
            message: () => mod.Message(mod.stringkeys.count, Solid.read(countSig)),
            textSize: 30,
            textColor: UI.COLORS.BLACK,
        },
        { deferTicks: 30 } // Coalesce updates every 30 ticks
    );

    // Create a button that increments the count
    Solid.h(UI.TextButton, {
        parent: container,
        anchor: mod.UIAnchor.BottomCenter,
        width: 200,
        message: mod.Message(mod.stringkeys.increment),
        textSize: 30,
        textColor: UI.COLORS.BLACK,
        onClick: async () => {
            // Update signal with a function receiving the previous value
            Solid.write(countSig, (c) => c + 1);
            // Solid.write(countSig, Solid.read(countSig) + 1); // Alternative: direct value write
        },
    });
}
```

**File: `src/strings.json`**

```json
{
    "count": "Count: {}",
    "increment": "Increment"
}
```

</ai>

---

## Core Concepts

### Fine-Grained Reactivity

`Solid` uses a fine-grained reactive system where individual properties update independently. When you pass a `SignalID` or a getter function as a property value, `Solid` automatically:

1. Reads the initial value to set up the element.
2. Creates an effect that watches the signal dependencies.
3. Updates only that specific property when the signal changes.

This means if you have a `Text` element with a reactive `message` and `textColor`, updating the message won't cause the color to be re-evaluated, and vice versa.

### Generation-Encoded Integer Handles (`SignalID`, `EffectID`)

In `Solid`, signals and effects are not JavaScript closure tuples or class instances. They are compact **32-bit generation-encoded integers**:

$$\text{Handle} = \text{Slot Index} + (\text{Generation} \times 65,536)$$

- **0 Heap Allocation:** Allocating a signal or effect consumes **zero JavaScript heap objects**.
- **Generational Safety:** When an effect or signal is destroyed and its slot is recycled, its generation counter increments. Stale references from detached callbacks or out-of-date scopes automatically no-op and log warnings rather than corrupting reallocated state.

### Render-Once Mental Model

Components and hierarchies created with `Solid.h()` run once to instantiate the element structure. The reactive system handles all updates automatically. This means:

- Component functions execute once (not on every state change).
- Reactive properties update independently.
- No virtual DOM or diffing overhead.
- Direct property manipulation on target classes (e.g. `UI.Text`, `Spatial.Runtime`).

### Automatic Dependency Tracking

The reactive system automatically tracks which signals are read during execution:

- Reading `Solid.read(countSig)` inside an effect or getter automatically subscribes the active subscriber to `countSig`.
- Modifying `Solid.write(countSig, newVal)` schedules all subscribed effects.
- Dynamic branching (e.g. `cond ? read(a) : read(b)`) automatically rewires graph edges with **zero dynamic array allocations**.

### Asynchronous Updates and Logical Ticks

Signal and store writes update stored values immediately, then **schedule** subscribed effects:

- **`deferTicks: 0` (default):** Work is flushed on a **microtask** (`Promise.resolve().then`), so the current synchronous caller returns before UI/Spatial effects run.
- **`deferTicks > 0`:** The effect is queued for the logical tick `currentTick + deferTicks`. Multiple writes before that tick **coalesce** into at most one run per subscriber (`SUB_STATE_PENDING`).
- `deferTicks` is clamped between `0` and `MAX_DEFER_TICKS` (`65,535`).

The **`currentTick`** value is **not** an engine tick API; it is incremented once per `Events.OngoingGlobal` subscription callback. `deferTicks` and per-tick safety limits are defined relative to that logical tick.

### Deferred Updates and `deferTicks`

You can pass **`deferTicks`** through option objects on:

- `Solid.createEffect(fn, { deferTicks })`
- `Solid.createMemo(fn, { deferTicks })`
- `Solid.h(component, props, { deferTicks })` (applies to reactive property bindings only)
- `Solid.Index(each, render, { deferTicks })`

Use this to **throttle** expensive UI/3D work (e.g. large lists, physics calculations, complex HUDs) so rapid signal churn does not run an effect every microtask.

### Configurable Error Logging & Graceful Pool Exhaustion

- **Error Logging:** Effect errors, cleanup errors, and scheduler limits are automatically caught and logged using the `Logging` module via `Solid.setLogging()`.
- **Graceful Pool Exhaustion:** If `MAX_SIGNALS` (2,048) or `MAX_SUBSCRIBERS` (1,024) is exceeded, `Solid` logs an error level message (`'Signal pool is full'` / `'Subscriber pool is full'`) and returns `-1` (`INVALID_INDEX`). All operations (`read`, `write`, `destroySignal`, `destroyEffect`) safely no-op on `-1` without throwing or crashing the QuickJS VM.

---

## API Reference

### `namespace Solid`

The `Solid` namespace contains all reactive primitives, SoA buffer controls, and utility functions.

#### `Solid.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes effect errors and flush errors. Least verbose.

#### `Solid.setLogging(log?, logLevel?, includeRawError?): void`

Configures logging for the `Solid` module. Effect errors, flush errors, and scheduler limit messages are automatically caught and logged using the configured logger.

**Parameters:**

- `log` – The logger function to use. Pass `undefined` to disable logging.
- `logLevel` – The minimum log level to use. Defaults to `LogLevel.Warning`.
- `includeRawError` – Whether to include the runtime error details. Defaults to `false`.

```ts
import { Solid } from 'bf6-portal-utils/solid';

Solid.setLogging((text) => console.log(text), Solid.LogLevel.Error, true);
```

---

### `Solid.createSignal<T>(initialValue: T): SignalID<T>`

Creates a simple reactive state backed by an integer SoA slot. Signals hold a value and notify subscribers when changed.

**Parameters:**

- `initialValue` – The starting value for the signal.

**Returns:**

- A branded `SignalID<T>` integer identifier, or `-1` if the signal pool is full.

<ai>

```ts
const countSig = Solid.createSignal(0);

// Read the value (subscribes if called inside an effect or reactive property)
console.log(Solid.read(countSig)); // 0

// Update with a value
Solid.write(countSig, 5);

// Update with a function (receives previous value)
Solid.write(countSig, (prev) => prev + 1);
```

</ai>

---

### `Solid.read<T>(id: SignalID<T>): T`

Reads the current value of a reactive Signal. Calling `read` inside an active Effect or Memo establishes an automatic dependency edge.

**Parameters:**

- `id` – The `SignalID<T>` to read.

**Returns:**

- The current value of the Signal, or `undefined` if the handle is invalid or destroyed.

---

### `Solid.write<T>(id: SignalID<T>, newValue: T | ((prev: T) => T)): void`

Updates the value of a reactive Signal and schedules subscriber notifications.

**Parameters:**

- `id` – The `SignalID<T>` to update.
- `newValue` – The new value or an updater function `(prev: T) => T`.

State updates occur immediately. Subscriber notifications are scheduled asynchronously (non-blocking). If the new value is deeply equal (`isEqual`) to the current value, notification is skipped.

---

### `Solid.destroySignal<T>(id: SignalID<T>): void`

Destroys a reactive Signal, unlinking all subscriber edges, freeing its SoA slot, and advancing its generation counter.

**Parameters:**

- `id` – The `SignalID<T>` to destroy.

---

### `Solid.createEffect(fn: () => void, options?: Solid.EffectOptions): EffectID`

Creates a side effect that runs immediately and re-runs whenever its tracked signals change.

**Behavior:**

1. Runs `fn` immediately (synchronously) to establish initial signal dependencies.
2. Tracks any Signal read via `Solid.read()` during execution.
3. Re-runs `fn` asynchronously whenever any of those Signals change.

**Parameters:**

- `fn` – The function to execute.
- `options` – Optional options object `{ deferTicks?: number }`.

**Returns:**

- A branded `EffectID` integer identifier, or `-1` if capacity is exhausted.

<ai>

```ts
const countSig = Solid.createSignal(0);

// Effect runs immediately and whenever countSig changes
const effectId = Solid.createEffect(() => {
    console.log(`Count is now: ${Solid.read(countSig)}`);
});

// Optional: defer re-runs by 2 logical ticks (coalesces rapid writes)
// const deferredId = Solid.createEffect(() => { ... }, { deferTicks: 2 });

Solid.write(countSig, 5); // Logs: "Count is now: 5"
Solid.write(countSig, 10); // Logs: "Count is now: 10"

// Stop and destroy the effect
Solid.destroyEffect(effectId);
```

</ai>

---

### `Solid.destroyEffect(id: EffectID): void`

Destroys a reactive Effect, unlinking all signal dependencies, running pending cleanups, and freeing its SoA slot.

**Parameters:**

- `id` – The `EffectID` to destroy.

---

### `Solid.createMemo<T>(fn: () => T, options?: Solid.MemoOptions): SignalID<T>`

Creates a "Computed Value" or "Derived Signal". Use this when a value depends on other signals. It is efficient because:

- It caches the result in an underlying Signal slot.
- It only notifies downstream listeners if the result actually changes (`isEqual`).

**Parameters:**

- `fn` – The computation function that reads signals and returns a derived value.
- `options` – Optional options object `{ deferTicks?: number }`.

**Returns:**

- A `SignalID<T>` yielding the memoized value.

<ai>

```ts
const firstName = Solid.createSignal('John');
const lastName = Solid.createSignal('Doe');

// Create a memoized full name
const fullName = Solid.createMemo(() => `${Solid.read(firstName)} ${Solid.read(lastName)}`);

console.log(Solid.read(fullName)); // "John Doe"

Solid.write(firstName, 'Jane');
console.log(Solid.read(fullName)); // "Jane Doe" (automatically recomputed)
```

</ai>

---

### `Solid.createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void]`

Creates a reactive proxy object for handling nested state. Unlike `createSignal` (which tracks the whole value), `createStore` tracks individual properties.

**Benefit:** If you update `store.user.name`, only effects listening to `name` will run. Effects listening to `store.user.age` will not run.

In the SoA architecture, each accessed property lazily allocates a dedicated SoA Signal slot, enabling fine-grained reactivity with zero object-graph overhead.

**Parameters:**

- `initialState` – The initial object state.

**Returns:**

- A tuple `[store, setStore]`:
    - `store`: The reactive proxy object. Access properties normally (e.g., `store.user.name`).
    - `setStore`: A setter function that accepts a producer function to update the store.

<ai>

```ts
const [state, setState] = Solid.createStore({
    user: {
        name: 'John',
        age: 30,
    },
    settings: {
        theme: 'dark',
    },
});

// Read values (automatically tracks which properties you access)
console.log(state.user.name); // "John"

// Update values using the setter
setState((s) => {
    s.user.name = 'Jane'; // Only effects reading user.name will run
});

// Update nested properties
setState((s) => {
    s.settings.theme = 'light'; // Only effects reading settings.theme will run
});
```

</ai>

---

### `Solid.createRoot<T>(fn: (dispose: () => void) => T): T`

Creates a reactive scope that is detached from the parent. Unlike Effects, a Root does not track dependencies and does not auto-dispose when a parent effect re-runs. You must manually call the provided `dispose` function to clean up all signals, effects, and `onCleanup` callbacks created inside it.

**Use Case:** Creating dynamic lists, global managers, or UI/3D sections that live/die independently of their parent.

**Parameters:**

- `fn` – A function that receives a `dispose` callback.

**Returns:**

- The return value of `fn`.

```ts
let rootDispose: (() => void) | undefined;

function createDynamicHUD() {
    return Solid.createRoot((dispose) => {
        rootDispose = dispose;
        const countSig = Solid.createSignal(0);

        Solid.h(UI.Text, {
            message: () => mod.Message(mod.stringkeys.count, Solid.read(countSig)),
        });
    });
}

// Later, clean up all signals and effects in this scope
rootDispose?.();
```

---

### `Solid.createContext<T>(defaultValue: T): Context<T>`

Creates a Context object to pass data deeply without "prop drilling". Contexts are useful for dependency injection, theming, or sharing data across many components.

**Parameters:**

- `defaultValue` – The value returned by `useContext` if no provider is found in the scope stack.

**Returns:**

- A `Context<T>` object with `id`, `defaultValue`, `_stack`, and `provide(value, fn)`.

<ai>

```ts
// Create a theme context
const ThemeContext = Solid.createContext<'light' | 'dark'>('light');

// Provide a theme value
ThemeContext.provide('dark', () => {
    // All useContext(ThemeContext) calls inside this scope return 'dark'
    const container = Solid.h(UI.Container, {
        bgColor: () => {
            const theme = Solid.useContext(ThemeContext);
            return theme === 'dark' ? UI.COLORS.BLACK : UI.COLORS.WHITE;
        },
    });
});

// Use the context outside
const theme = Solid.useContext(ThemeContext); // Returns 'light' (default)
```

</ai>

---

### `Solid.useContext<T>(context: Context<T>): T`

Reads the current value of a Context. Climbs the scope stack to find the nearest `provide` call for this context; returns the default value if none is found.

---

### `Solid.untrack<T>(fn: () => T): T`

Executes a function without creating dependencies. Any signals read inside `fn` will return their current value, but the surrounding Effect will not subscribe to them.

<ai>

```ts
const countSig = Solid.createSignal(0);
const timerSig = Solid.createSignal(0);

Solid.createEffect(() => {
    console.log(Solid.read(countSig)); // Tracks 'countSig'
    Solid.untrack(() => {
        console.log(Solid.read(timerSig)); // Logs 'timerSig' but doesn't track it
    });
});
```

</ai>

---

### `Solid.onCleanup(fn: () => void): void`

Registers a cleanup callback for the current reactive scope.

- If called inside a component/root, it runs when the component/root is disposed.
- If called inside an Effect, it runs before the Effect re-executes (or when it is destroyed).

**Use Case:** Clearing intervals, stopping active animations, or tearing down native objects.

---

### `Solid.getActiveSignals(): number` & `Solid.getActiveSubscribers(): number`

Returns the count of currently allocated and active Signal and Subscriber slots in the SoA pools. Useful for telemetry and memory leak detection.

---

### `Solid.h<P extends object, T>(component, props?, options?: Solid.ComponentOptions): T`

The "HyperScript" factory function. Creates a UI Component or Spatial scene element and sets up reactivity.

**Parameters:**

- `component` – Either a Class Constructor (e.g., `UI.Button`, `Spatial.Runtime`) or a Functional Component.
- `props` – An object of properties. Values can be static OR reactive (`SignalID` or getter `() => T`).
- `options` – Optional `{ deferTicks?: number }` to coalesce reactive property bindings.

**Automatic Self-Pruning on `isDeleted`:** If a widget or spatial element is destroyed out-of-band (`instance.isDeleted === true`), its property binding effects automatically detect deletion on the next execution, unlink all signal dependencies, and reclaim their subscriber slots without memory leaks.

<ai>

```ts
const countSig = Solid.createSignal(0);
const visibleSig = Solid.createSignal(true);

// 1. Direct SignalID prop binding
const container = Solid.h(UI.Container, {
    visible: visibleSig, // Passes SignalID directly
    width: 200,
    height: 100,
});

// 2. Getter function binding
Solid.h(UI.Text, {
    parent: container,
    message: () => mod.Message(mod.stringkeys.count, Solid.read(countSig)),
    textSize: 30,
});
```

</ai>

---

### `Solid.Index<T>(each: SignalID<T[]> | (() => T[]), render: (item: SignalID<T>, index: number) => unknown, options?: Solid.IndexOptions): void`

A generic List Renderer optimized for Game UI and Spatial objects. Renders components based on their array position, not their value.

**Key Behavior:** If data moves (e.g., `["A", "B"]` $\rightarrow$ `["B", "A"]`), the widgets at index 0 and 1 stay in place and simply update their content to match the elements at their respective indexes via per-row signals. This avoids destroying/recreating widgets, which is crucial for performance and Z-order stability.

**Parameters:**

- `each` – An array `SignalID` or getter function returning the array.
- `render` – A builder function receiving `(item: SignalID<T>, index: number)`.
- `options` – Optional `{ deferTicks?: number }`.

<ai>

```ts
const itemsSig = Solid.createSignal([
    { id: 1, name: mod.Message(mod.stringkeys.team1) },
    { id: 2, name: mod.Message(mod.stringkeys.team2) },
]);

const container = Solid.h(UI.Container, { width: 300, height: 400 });

Solid.Index(itemsSig, (itemSig, index) => {
    return Solid.h(UI.Text, {
        parent: container,
        y: index * 50,
        message: () => Solid.read(itemSig).name, // Per-row reactive signal
        textSize: 24,
    });
});
```

</ai>

---

## Usage Patterns

### Basic Reactive UI

```ts
function createBasicUI(player: mod.Player): void {
    const countSig = Solid.createSignal(0);

    const container = Solid.h(UI.Container, {
        receiver: player,
        width: 200,
        height: 150,
        bgColor: UI.COLORS.BLACK,
        bgAlpha: 0.8,
    });

    Solid.h(UI.Text, {
        parent: container,
        message: () => mod.Message(mod.stringkeys.count, Solid.read(countSig)),
        textSize: 30,
        textColor: UI.COLORS.WHITE,
    });

    Solid.h(UI.TextButton, {
        parent: container,
        y: 50,
        width: 150,
        height: 40,
        message: mod.Message(mod.stringkeys.increment),
        onClick: async () => Solid.write(countSig, (c) => c + 1),
    });
}
```

```json
{
    "count": "Count: {}",
    "increment": "Increment"
}
```

---

### Conditional Visibility & Modals

```ts
function createModalUI(player: mod.Player): () => void {
    const isOpenSig = Solid.createSignal(false);

    const modal = Solid.h(UI.Container, {
        receiver: player,
        visible: isOpenSig, // Reactive visibility via SignalID
        uiInputModeWhenVisible: true,
        width: 400,
        height: 300,
        bgColor: UI.COLORS.BLACK,
        bgAlpha: 0.9,
        bgFill: mod.UIBgFill.Blur,
    });

    Solid.h(UI.TextButton, {
        parent: modal,
        y: 120,
        width: 200,
        height: 50,
        message: mod.Message(mod.stringkeys.close),
        onClick: async () => Solid.write(isOpenSig, false),
    });

    return () => Solid.write(isOpenSig, (open) => !open);
}
```

```json
{
    "close": "Close"
}
```

---

### Derived State with Memos

```ts
function createHealthBar(player: mod.Player): void {
    const healthSig = Solid.createSignal(100);
    const maxHealthSig = Solid.createSignal(100);

    // Derived percentage memo
    const healthPercent = Solid.createMemo(() => (Solid.read(healthSig) / Solid.read(maxHealthSig)) * 100);

    // Derived color memo
    const healthColor = Solid.createMemo(() => {
        const percent = Solid.read(healthPercent);
        if (percent < 25) return UI.COLORS.RED;
        if (percent < 50) return UI.COLORS.YELLOW;
        return UI.COLORS.GREEN;
    });

    const container = Solid.h(UI.Container, {
        receiver: player,
        width: 200,
        height: 20,
        bgColor: UI.COLORS.BF_GREY_3,
        bgAlpha: 0.8,
    });

    Solid.h(UI.Container, {
        parent: container,
        width: healthPercent, // Bound directly to memo SignalID
        height: 20,
        bgColor: healthColor, // Bound directly to memo SignalID
        bgAlpha: 1,
    });

    Solid.h(UI.Text, {
        parent: container,
        message: () => mod.Message(mod.stringkeys.health, Solid.read(healthSig), Solid.read(maxHealthSig)),
        textSize: 16,
        textColor: UI.COLORS.WHITE,
    });
}
```

```json
{
    "health": "{} / {}"
}
```

---

### Declarative 3D with `Spatial`

Because `Spatial.Empty`, `Spatial.Runtime`, and `Spatial.Existing` expose standard constructors and properties, they integrate natively with `Solid.h()`:

```ts
import { Solid } from 'bf6-portal-utils/solid';
import { Spatial } from 'bf6-portal-utils/spatial';

export function createPlayerTurret(player: mod.Player) {
    const aimEulerSig = Solid.createSignal({ x: 0, y: 0, z: 0 });
    const isFiringSig = Solid.createSignal(false);

    // 1. Base anchor attached to player position
    const turretBase = Solid.h(Spatial.Empty, {
        position: () => mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition),
    });

    // 2. Gun barrel attached to base with reactive rotation
    const barrel = Solid.h(Spatial.Runtime, {
        parent: turretBase,
        prefab: mod.RuntimeSpawn_Common.FiringRange_Floor_01,
        position: { x: 0, y: 1.5, z: 0.5 },
        localRotationEuler: () => Solid.read(aimEulerSig),
    });

    // 3. Muzzle flash effect active only while firing
    const muzzleFlash = Solid.h(Spatial.Runtime, {
        parent: barrel,
        prefab: mod.RuntimeSpawn_Common.FX_Explosion_Small_01,
        position: { x: 0, y: 0, z: 2.0 },
    });

    Solid.createEffect(() => {
        if (Solid.read(isFiringSig)) {
            // Trigger firing visuals
        }
    });

    return { aimEulerSig, isFiringSig, turretBase };
}
```

---

### Real-World Example: Spawn UI

```ts
function createSpawnUI(player: mod.Player): void {
    const delayCountdownSig = Solid.createSignal(-1);

    // Prompt container (visible when countdown reaches 0)
    const promptUI = Solid.h(UI.Container, {
        receiver: player,
        x: 0,
        y: 0,
        width: 440,
        height: 140,
        anchor: mod.UIAnchor.Center,
        visible: () => Solid.read(delayCountdownSig) === 0,
        uiInputModeWhenVisible: true,
        bgColor: UI.COLORS.BF_GREY_4,
        bgAlpha: 0.5,
        bgFill: mod.UIBgFill.Blur,
    });

    // Spawn button
    Solid.h(UI.TextButton, {
        parent: promptUI,
        y: 20,
        width: 400,
        height: 40,
        anchor: mod.UIAnchor.TopCenter,
        message: mod.Message(mod.stringkeys.spawnNow),
        textSize: 30,
        textColor: UI.COLORS.BF_GREEN_BRIGHT,
        onClick: async () => {
            Solid.write(delayCountdownSig, -1);
        },
    });

    // Countdown text (visible when countdown > 0)
    Solid.h(UI.Text, {
        receiver: player,
        x: 0,
        y: 60,
        width: 400,
        height: 50,
        anchor: mod.UIAnchor.TopCenter,
        message: () => mod.Message(mod.stringkeys.spawningIn, Solid.read(delayCountdownSig)),
        textSize: 30,
        textColor: UI.COLORS.BF_GREEN_BRIGHT,
        visible: () => Solid.read(delayCountdownSig) > 0,
    });

    // Start countdown
    Solid.write(delayCountdownSig, 10);
}
```

```json
{
    "spawnNow": "Spawn now",
    "spawningIn": "Spawning available in {} seconds..."
}
```

---

## Core Architecture & Structure of Arrays (SoA)

All reactive metadata and graph relationships live in contiguous flat TypedArray buffers:

### 1. Subscriber Buffers (`MAX_SUBSCRIBERS = 1,024`)

- `_subGenerations` (`Uint16Array`): Slot generation counters for stale ID detection.
- `_subDeferTicks` (`Uint16Array`): Coalescing window in logical ticks (clamped to 65,535).
- `_subTargetTick` (`Uint32Array`): Target logical tick for scheduler execution.
- `_subDepCount` / `_subPrevDepCount` (`Uint8Array`): Dependency cursor for zero-allocation $O(1)$ re-runs.
- `_subFree` (`Int16Array`): Intrusive free-list linked slots & state machine:
    - `>= 0` or `-1`: Intrusive free-list links
    - `SUB_STATE_IDLE (-2)`: Active subscriber, idle (waiting for signal change)
    - `SUB_STATE_PENDING (-3)`: Active subscriber, currently queued in `_immediateQueue` or `_deferredQueue`
    - `SUB_STATE_RETIRED (-4)`: Slot exhausted `MAX_GENERATIONS` (65,535)
- `_subFn` (`Array<Function>`): Effect callback pointers.

### 2. Signal Buffers (`MAX_SIGNALS = 2,048`)

- `_sigGenerations` (`Uint16Array`): Slot generation counters for stale ID detection.
- `_sigFree` (`Int16Array`): Intrusive free-list linked slots & state machine:
    - `>= 0` or `-1`: Intrusive free-list links
    - `SIG_STATE_IN_USE (-2)`: Active signal slot
    - `SIG_STATE_RETIRED (-3)`: Slot exhausted `MAX_GENERATIONS` (65,535)
- `_sigValues` (`Array<unknown>`): Current reactive state values.

### 3. Flat Dependency Edge Graph (`TOTAL_DEP_SLOTS = 8,192`)

- `_subDepsBuffer` (`Int16Array`, $1,024 \times 8$): Flat dependency buffer supporting up to 8 signals per subscriber with **0 heap allocations**.
- `_sigFirstDep` (`Int16Array`, $2,048$): Head pointer of the subscriber doubly-linked list observing each signal.
- `_depNext` & `_depPrev` (`Int16Array`, $8,192$): Doubly-linked edge list linking subscriber dependency slots to signals with $O(1)$ add/remove and **0 dynamic array allocations**.

---

## Tunable Constants & Capacity Sizing

- **`Solid.MAX_SUBSCRIBERS` (Default: `1_024`):** Maximum number of concurrent subscribers (effects, memos, and reactive property bindings).
- **`Solid.MAX_SIGNALS` (Default: `2_048`):** Maximum number of concurrent reactive signals supported across components and stores.
- **`Solid.MAX_DEPS_PER_SUB` (Default: `8`):** Maximum number of signals a single subscriber can track simultaneously.
- **`Solid.MAX_DEFER_TICKS` (Default: `65_535`):** Maximum number of logical ticks a subscriber can defer execution.
- **`Solid.MAX_EXECUTIONS_PER_FLUSH` (Default: `1_000`):** Maximum number of subscriber executions allowed in a single microtask flush loop.
- **`Solid.MAX_FLUSHES_PER_TICK` (Default: `1_000`):** Maximum number of microtask flushes permitted within a single logical engine tick.

---

## Memory & Performance Benchmarking

To run the automated memory benchmark suite:

```bash
npm run test:memory
```

---

## Further Reference

- [`UI` Module Documentation](../ui/README.md) – UI helper classes designed for `Solid.h()`.
- [`Spatial` Module Documentation](../spatial/README.md) – 3D Scene Graph designed for `Solid.h()`.
- [`Animations` Module Documentation](../animations/README.md) – Procedural animations and tweening.
- [`Logging` Module Documentation](../logging/README.md) – Centralized logger used by `Solid`.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – Bundler tool used to package mods for Portal.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response.
