# SolidUI Module

This TypeScript `SolidUI` namespace provides a reactive UI framework for Battlefield Portal, inspired by
[SolidJS](https://github.com/solidjs/solid). Unlike traditional frameworks that re-render entire components, `SolidUI`
uses fine-grained reactivity to update only the specific UI properties that change, resulting in minimal overhead and
maximum performance.

`SolidUI` is a from-scratch implementation of reactive primitives (signals, effects, memos, stores) adapted for the
Battlefield Portal environment. It uses a HyperScript-like factory function (`h`) instead of JSX/TSX, and integrates
seamlessly with the [`UI`](../ui/README.md) module to create dynamic, reactive user interfaces.

> **Note** The `SolidUI` namespace is decoupled from the `UI` module but has been designed and tested with it. It
> assumes that UI objects have getters and setters for properties that need to be reactive. All Battlefield Portal types
> referenced below (`mod.Player`, `mod.Vector`, etc.) come from
> [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types).

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **UI Module** – While `SolidUI` is decoupled from the `UI` module, all examples and use cases assume you're using
   [`UI`](../ui/README.md) classes.
4. **Button handler** – If using `UI.Button` or `UI.TextButton`, register `UI.handleButtonClick` once in your
   `OnPlayerUIButtonEvent` event handler.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { SolidUI } from 'bf6-portal-utils/solid-ui';
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Create reactive signals with `SolidUI.createSignal()`
4. Use `SolidUI.h()` to create UI components with reactive properties
5. Pass accessor functions (signals) as property values to make them reactive
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod

### Example

**File: `src/index.ts`**

```ts
import { SolidUI } from 'bf6-portal-utils/solid-ui';
import { UI } from 'bf6-portal-utils/ui';

function createCounterUI(player: mod.Player): void {
    // Create a reactive signal
    const [count, setCount] = SolidUI.createSignal(0);

    // Create a container with reactive visibility
    const container = SolidUI.h(
        UI.Container,
        {
            width: 200,
            height: 100,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.8,
            visible: true,
        },
        player
    );

    // Create text that updates when count changes
    SolidUI.h(UI.Text, {
        parent: container,
        message: () => mod.Message(mod.stringkeys.count, count()), // Accessor function
        textSize: 30,
        textColor: UI.COLORS.WHITE,
    });

    // Create a button that increments the count
    SolidUI.h(UI.TextButton, {
        parent: container,
        y: 50,
        width: 150,
        height: 40,
        message: mod.Message(mod.stringkeys.increment),
        onClick: async () => {
            setCount((c) => c + 1); // Update signal
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

---

## Core Concepts

### Fine-Grained Reactivity

`SolidUI` uses a fine-grained reactive system where individual properties update independently. When you pass an
accessor function (signal) as a property value, `SolidUI` automatically:

1. Reads the initial value to set up the UI element
2. Creates an effect that watches the signal
3. Updates only that specific property when the signal changes

This means if you have a `Text` element with a reactive `message` and `textColor`, updating the message won't cause the
color to be re-evaluated, and vice versa.

### Signals: The Atoms of Reactivity

Signals are the fundamental reactive primitives in `SolidUI`. They hold a value and notify subscribers when changed.
Unlike traditional state management, signals track dependencies automatically:

- **Reading a signal** (calling the accessor function) inside an effect or reactive property automatically subscribes to
  it
- **Updating a signal** automatically triggers all subscribed effects
- **No manual dependency arrays** – dependencies are tracked automatically

### Render-Once Mental Model

Components created with `SolidUI.h()` run once to set up the UI structure. The reactive system handles all updates
automatically. This means:

- Component functions execute once (not on every state change)
- Reactive properties update independently
- No virtual DOM or diffing overhead
- Direct DOM manipulation through the properties of the UI classes or generators passed into the `h` function

### Automatic Dependency Tracking

The reactive system automatically tracks which signals are used where:

- If you read `count()` inside a `message` accessor, that text element subscribes to `count`
- If `count` changes, only that text element's message updates
- Other properties and elements remain untouched

### Asynchronous Updates

All reactive updates are batched and executed asynchronously via the microtask queue. This ensures:

- Setting multiple signals doesn't cause multiple synchronous updates
- Game logic execution isn't blocked by UI updates
- Updates happen right after the current execution context finishes

---

## API Reference

### `SolidUI.createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>]`

Creates a simple reactive state (a "Signal"). Signals are the atoms of reactivity. They hold a value and notify
subscribers when changed.

**Parameters:**

- `initialValue` – The starting value for the signal

**Returns:**

A tuple `[read, write]`:

- `read`: An `Accessor<T>` function to get the value and subscribe to changes
- `write`: A `Setter<T>` function to update the value

**Example:**

```ts
const [count, setCount] = SolidUI.createSignal(0);

// Read the value (subscribes if called inside an effect or reactive property)
console.log(count()); // 0

// Update with a value
setCount(5);

// Update with a function (receives previous value)
setCount((prev) => prev + 1);
```

**Usage in UI:**

```ts
const [isVisible, setVisible] = SolidUI.createSignal(false);

const container = SolidUI.h(UI.Container, {
    visible: isVisible, // Pass the accessor directly
    width: 200,
    height: 100,
});

// Later, update the signal
setVisible(true); // Container becomes visible automatically
```

### `SolidUI.createEffect(fn: () => void): () => void`

Creates a side effect that runs immediately and re-runs whenever its dependencies change. This is the bridge between
reactive state and the outside world (e.g., updating UI props, logs, timers).

**Behavior:**

1. Runs `fn` immediately (synchronously)
2. Tracks any Signal read during execution
3. Re-runs `fn` if any of those Signals change

**Parameters:**

- `fn` – The function to execute. Any signals read inside this function will be tracked as dependencies.

**Returns:**

A "disposer" function that manually stops the effect and frees memory.

**Example:**

```ts
const [count, setCount] = SolidUI.createSignal(0);

// Effect runs immediately and whenever count changes
const dispose = SolidUI.createEffect(() => {
    console.log(`Count is now: ${count()}`);
});

setCount(5); // Logs: "Count is now: 5"
setCount(10); // Logs: "Count is now: 10"

// Stop the effect
dispose();
```

**Note:** Effects created inside `SolidUI.h()` are automatically cleaned up when the UI element is deleted. You
typically don't need to manually dispose of them unless creating standalone effects.

### `SolidUI.createMemo<T>(fn: () => T): Accessor<T>`

Creates a "Computed Value" or "Derived Signal". Use this when a value depends on other signals. It is efficient because:

- It caches the result
- It only notifies downstream listeners if the result actually changes

**Parameters:**

- `fn` – The function to memoize. Should read one or more signals and return a computed value.

**Returns:**

An `Accessor<T>` for the memoized value.

**Example:**

```ts
const [firstName, setFirstName] = SolidUI.createSignal('John');
const [lastName, setLastName] = SolidUI.createSignal('Doe');

// Create a memoized full name
const fullName = SolidUI.createMemo(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"

setFirstName('Jane');
console.log(fullName()); // "Jane Doe" (automatically recomputed)
```

**Usage in UI:**

```ts
const [health, setHealth] = SolidUI.createSignal(100);
const [maxHealth, setMaxHealth] = SolidUI.createSignal(100);

const healthPercent = SolidUI.createMemo(() => (health() / maxHealth()) * 100);

SolidUI.h(UI.Text, {
    message: () => mod.Message(mod.stringkeys.healthPercent, healthPercent().toFixed(1)),
    // Only recomputes when health or maxHealth changes
});
```

```json
{
    "healthPercent": "{}%"
}
```

### `SolidUI.createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void]`

Creates a reactive proxy object for handling nested state. Unlike `createSignal` (which tracks the whole value),
`createStore` tracks individual properties.

**Benefit:** If you update `store.user.name`, only effects listening to `name` will run. Effects listening to
`store.user.age` will not run.

**Parameters:**

- `initialState` – The initial object state

**Returns:**

A tuple `[store, setStore]`:

- `store`: The reactive proxy object. Access properties normally (e.g., `store.user.name`)
- `setStore`: A setter function that accepts a producer function to update the store

**Example:**

```ts
const [state, setState] = SolidUI.createStore({
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

**Usage in UI:**

```ts
const [uiState, setUIState] = SolidUI.createStore({
    isVisible: false,
    counter: {
        value: 0,
        increment: 1,
    },
});

const container = SolidUI.h(UI.Container, {
    visible: () => uiState.isVisible, // Tracks isVisible property
    width: 200,
    height: 100,
});

SolidUI.h(UI.Text, {
    parent: container,
    message: () => mod.Message(mod.stringkeys.value, uiState.counter.value), // Tracks counter.value
});

// Update the store
setUIState((s) => {
    s.isVisible = true; // Only container visibility updates
    s.counter.value = 5; // Only text message updates
});
```

```json
{
    "value": "Value: {}"
}
```

### `SolidUI.createRoot<T>(fn: (dispose: () => void) => T): T`

Creates a reactive scope that is detached from the parent. Unlike Effects, a Root does not track dependencies and does
not auto-dispose. You must manually call the provided `dispose` function to clean up everything created inside it.

**Use Case:** Creating dynamic lists, global managers, or UI sections that live/die independently of their parent.

**Parameters:**

- `fn` – A function that receives a `dispose` callback. All effects and cleanup functions created inside this scope will
  be disposed when `dispose` is called.

**Returns:**

The return value of `fn`.

**Example:**

```ts
let rootDispose: (() => void) | undefined;

function createDynamicUI() {
    rootDispose = SolidUI.createRoot((dispose) => {
        const [count, setCount] = SolidUI.createSignal(0);

        SolidUI.h(UI.Text, {
            message: () => mod.Message(mod.stringkeys.count, count()),
        });

        return dispose; // Return the dispose function
    });
}

// Later, clean up everything
rootDispose?.();
```

```json
{
    "count": "Count: {}"
}
```

**Note:** `SolidUI.h()` internally uses `createRoot` to manage component lifecycles. You typically don't need to call
`createRoot` directly unless creating standalone reactive scopes.

### `SolidUI.createContext<T>(defaultValue: T): Context<T>`

Creates a Context object to pass data deeply without "prop drilling". Contexts are useful for dependency injection,
theming, or sharing data across many components.

**Parameters:**

- `defaultValue` – The value returned by `useContext` if no provider is found in the scope stack

**Returns:**

A `Context<T>` object with:

- `id`: A unique symbol for this context
- `defaultValue`: The default value
- `provide(value: T, fn: () => void)`: Runs `fn` within a scope where this context is set to `value`

**Example:**

```ts
// Create a theme context
const ThemeContext = SolidUI.createContext<'light' | 'dark'>('light');

// Provide a theme value
ThemeContext.provide('dark', () => {
    // All useContext(ThemeContext) calls inside this scope return 'dark'
    const container = SolidUI.h(UI.Container, {
        bgColor: () => {
            const theme = SolidUI.useContext(ThemeContext);
            return theme === 'dark' ? UI.COLORS.BLACK : UI.COLORS.WHITE;
        },
    });
});

// Use the context
const theme = SolidUI.useContext(ThemeContext); // Returns 'dark' if inside provide, 'light' otherwise
```

### `SolidUI.useContext<T>(context: Context<T>): T`

Reads the current value of a Context. It climbs the scope stack to find the nearest `provide` call for this context. If
none is found, it returns the default value.

**Parameters:**

- `context` – The `Context` object to read

**Returns:**

The current value of the `Context` (from the nearest provider, or the default value)

**Example:**

See `createContext` example above.

### `SolidUI.untrack<T>(fn: () => T): T`

Executes a function without creating dependencies. Any signals read inside `fn` will return their current value, but the
surrounding Effect will not subscribe to them.

**Use Case:** Reading a signal for logging or conditional logic without creating a reactive dependency.

**Note:** If you need to read signals outside of UI code (like in your game logic), you can simply call the signal
normally as it will not incur any overhead. `untrack` is specifically to read a signal in UI code without causing that
component to subscribe to that signal.

**Parameters:**

- `fn` – The function to execute without tracking. Usually a signal or memo.

**Returns:**

The return value of `fn`

**Example:**

```ts
const [count, setCount] = SolidUI.createSignal(0);
const [timer, setTimer] = SolidUI.createSignal(0);

SolidUI.createEffect(() => {
    console.log(count()); // Tracks 'count'
    SolidUI.untrack(() => {
        console.log(timer()); // Logs 'timer' but doesn't track it
        // This effect won't re-run when timer changes
    });
});
```

### `SolidUI.onCleanup(fn: () => void): void`

Registers a cleanup callback for the current reactive scope. If called inside a component created with `SolidUI.h()`, it
runs when the component is deleted. If called inside an Effect, it runs before the Effect re-executes (or when it dies).

**Use Case:** Clearing intervals, removing event listeners, or specialized cleanup logic.

**Parameters:**

- `fn` – The cleanup function to register

**Example:**

```ts
SolidUI.h(
    UI.Container,
    {
        // ... props
    },
    player
);

// Inside the component setup (if using functional components):
SolidUI.onCleanup(() => {
    // This runs when the container is deleted
    console.log('Container cleaned up');
});
```

**Note:** Cleanup functions registered via `onCleanup` inside `SolidUI.h()` are automatically called when the UI
element's `delete()` method is invoked.

### `SolidUI.h<P extends object, T>(component, props, receiver?): T`

The "HyperScript" factory function. Creates a UI Component and sets up reactivity. This is the primary function for
creating reactive UI elements.

**Parameters:**

- `component` – Either a `UI` Class Constructor (e.g., `UI.Button`) or a Functional Component function
- `props` – An object of properties. Values can be static OR reactive (Signals/Accessors). If a value is a function,
  it's treated as an accessor and made reactive.
- `receiver` – (Optional) The specific player or team this UI is for

**Returns:**

The created UI Instance

**How Reactivity Works:**

1. When you pass a function as a property value, `SolidUI.h()` treats it as an accessor
2. It reads the initial value to set up the UI element
3. It creates an effect that watches the accessor
4. When the accessor's value changes, it updates only that specific property

**Example with Signals:**

```ts
const [count, setCount] = SolidUI.createSignal(0);
const [isVisible, setVisible] = SolidUI.createSignal(true);

const container = SolidUI.h(UI.Container, {
    visible: isVisible, // Reactive: updates when isVisible changes
    width: 200,
    height: 100,
    bgColor: UI.COLORS.BLACK,
});

SolidUI.h(UI.Text, {
    parent: container,
    message: () => mod.Message(mod.stringkeys.count, count()), // Reactive: updates when count changes
    textSize: 30,
});
```

```json
{
    "count": "Count: {}"
}
```

**Example with Stores:**

```ts
const [state, setState] = SolidUI.createStore({
    health: 100,
    color: UI.COLORS.WHITE,
});

SolidUI.h(UI.Text, {
    message: () => mod.Message(mod.stringkeys.health, state.message), // Tracks state.health
    textColor: () => state.color, // Tracks state.color
    textSize: 30,
});
```

```json
{
    "health": "Health: {}"
}
```

**Example with Functional Components:**

```ts
function MyButton(props: { team: number; onClick: () => void }) {
    return SolidUI.h(UI.TextButton, {
        message: mod.Message(mod.stringkeys.switchTeams, team),
        onClick: props.onClick,
        width: 200,
        height: 40,
    });
}

// Use the functional component
SolidUI.h(MyButton, {
    team: 1,
    onClick: async () => {
        console.log('Clicked!');
        mod.SetTeam(thisPlayer, mod.GetTeam(1));
    },
});
```

```json
{
    "switchTeams": "Switch to team {}"
}
```

**Important Notes:**

- Properties that are functions are automatically made reactive
- The `onClick` property is never made reactive (it's always passed through as-is)
- All reactive effects are automatically cleaned up when the UI element is deleted
- You can mix static and reactive properties in the same props object

### `SolidUI.Index<T>(each: Accessor<T[]>, render: (item: Accessor<T>, index: number) => unknown): void`

A generic List Renderer optimized for Game UI. Different from `array.map()` in that `Index` renders components based on
their array position, not their value.

**Key Behavior:** If data moves (e.g., `["A", "B"]` → `["B", "A"]`), the widgets at index 0 and 1 stay in place and
simply update their content to match the elements at their respective indexes. This avoids destroying/recreating
widgets, which is crucial for performance and Z-order stability.

**Parameters:**

- `each` – An accessor function that returns the array to iterate over
- `render` – A builder function that receives:
    - `item`: An accessor function for the item at this index (reactive)
    - `index`: The static index number (not reactive)

**Returns:**

`void` (this function doesn't return a value)

**Example:**

```ts
const [items, setItems] = SolidUI.createSignal([
    { id: 1, name: mod.Message(mod.stringkeys.team1) },
    { id: 2, name: mod.Message(mod.stringkeys.team2) },
    { id: 3, name: mod.Message(mod.stringkeys.team3) },
]);

const container = SolidUI.h(UI.Container, {
    width: 300,
    height: 400,
});

// Render a list of items
SolidUI.Index(
    items, // Accessor to the array
    (item, index) => {
        // item() returns the current value at this index
        // index is a static number (0, 1, 2, ...)
        return SolidUI.h(UI.Text, {
            parent: container,
            y: index * 50, // Position based on index
            message: () => item().name, // Reactive: updates when this item changes
            textSize: 24,
        });
    }
);

// Update the array
setItems([
    { id: 2, name: mod.Message(mod.stringkeys.team2Up) }, // Widget at index 0 updates
    { id: 1, name: mod.Message(mod.stringkeys.team1) }, // Widget at index 1 updates
    // Widget at index 2 is disposed (array shrunk)
]);

// Add new items
setItems((prev) => [
    ...prev,
    { id: 4, name: mod.Message(mod.stringkeys.team4) }, // New widget created at index 3
]);
```

```json
{
    "item1": "Item 1",
    "item2": "Item 2",
    "item3": "Item 3",
    "item4": "Item 4",
    "item2Up": "Item 2 Updated"
}
```

**Performance Benefits:**

- Widgets are reused when possible (based on index position)
- Only the content of widgets updates, not their structure
- Z-order remains stable (widgets don't move in the rendering order)
- Efficient for frequently updating lists (e.g., scoreboards, player lists)

---

## Usage Patterns

### Basic Reactive UI

The simplest pattern: create signals and pass them as property values.

```ts
function createBasicUI(player: mod.Player): void {
    const [count, setCount] = SolidUI.createSignal(0);

    const container = SolidUI.h(
        UI.Container,
        {
            width: 200,
            height: 150,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.8,
        },
        player
    );

    SolidUI.h(UI.Text, {
        parent: container,
        message: () => mod.Message(mod.stringkeys.count, count()),
        textSize: 30,
        textColor: UI.COLORS.WHITE,
    });

    SolidUI.h(UI.TextButton, {
        parent: container,
        y: 50,
        width: 150,
        height: 40,
        message: mod.Message(mod.stringkeys.increment),
        onClick: async () => setCount((c) => c + 1),
    });
}
```

```json
{
    "count": "Count: {}",
    "increment": "Increment"
}
```

### Conditional Visibility

Use signals to control visibility and other conditional properties.

```ts
function createModalUI(player: mod.Player): void {
    const [isOpen, setIsOpen] = SolidUI.createSignal(false);

    const modal = SolidUI.h(
        UI.Container,
        {
            visible: isOpen, // Reactive visibility
            width: 400,
            height: 300,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.9,
            bgFill: mod.UIBgFill.Blur,
        },
        player
    );

    SolidUI.h(UI.TextButton, {
        parent: modal,
        y: 120,
        width: 200,
        height: 50,
        message: mod.Message(mod.stringkeys.close),
        onClick: async () => {
            setIsOpen(false);
            mod.EnableUIInputMode(false, player);
        },
    });

    // Function to show the modal
    return () => {
        setIsOpen(true);
        mod.EnableUIInputMode(true, player);
    };
}
```

```json
{
    "close": "Close"
}
```

### Derived State with Memos

Use memos to compute values that depend on multiple signals.

```ts
function createHealthBar(player: mod.Player): void {
    const [health, setHealth] = SolidUI.createSignal(100);
    const [maxHealth, setMaxHealth] = SolidUI.createSignal(100);

    // Compute health percentage
    const healthPercent = SolidUI.createMemo(() => (health() / maxHealth()) * 100);

    // Compute health color (red when low, green when high)
    const healthColor = SolidUI.createMemo(() => {
        const percent = healthPercent();
        if (percent < 25) return UI.COLORS.RED;
        if (percent < 50) return UI.COLORS.YELLOW;
        return UI.COLORS.GREEN;
    });

    const container = SolidUI.h(
        UI.Container,
        {
            width: 200,
            height: 20,
            bgColor: UI.COLORS.BF_GREY_3,
            bgAlpha: 0.8,
        },
        player
    );

    // Health bar (width based on percentage)
    SolidUI.h(UI.Container, {
        parent: container,
        width: () => healthPercent(), // Reactive width
        height: 20,
        bgColor: healthColor, // Reactive color
        bgAlpha: 1,
    });

    // Health text
    SolidUI.h(UI.Text, {
        parent: container,
        message: () => mod.Message(mod.stringkeys.health, health(), maxHealth()),
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

### Complex State with Stores

Use stores for nested state that needs fine-grained reactivity.

```ts
type GameState = {
    player: {
        name: string;
        score: number;
    };
    ui: {
        isMenuOpen: boolean;
        selectedTab: string;
    };
};

function createGameUI(player: mod.Player): void {
    const [state, setState] = SolidUI.createStore<GameState>({
        player: {
            name: 'Player',
            score: 0,
        },
        ui: {
            isMenuOpen: false,
            selectedTab: 'stats',
        },
    });

    // Menu container (only tracks ui.isMenuOpen)
    const menu = SolidUI.h(
        UI.Container,
        {
            visible: () => state.ui.isMenuOpen,
            width: 400,
            height: 500,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.9,
        },
        player
    );

    // Score display (only tracks player.score)
    SolidUI.h(UI.Text, {
        parent: menu,
        message: () => mod.Message(mod.stringkeys.score, state.player.score),
        textSize: 30,
        textColor: UI.COLORS.WHITE,
    });

    // Update only specific properties
    setState((s) => {
        s.player.score += 10; // Only score text updates
    });

    setState((s) => {
        s.ui.isMenuOpen = true; // Only menu visibility updates
    });
}
```

```json
{
    "score": "Score: {}"
}
```

### Dynamic Lists

Use `Index` to render lists that update efficiently.

```ts
type PlayerScore = {
    id: number;
    player: mod.Player;
    score: number;
};

function createScoreboard(player: mod.Player): void {
    const [scores, setScores] = SolidUI.createSignal<PlayerScore[]>([]);

    const container = SolidUI.h(
        UI.Container,
        {
            width: 300,
            height: 400,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0.8,
        },
        player
    );

    // Render the list
    SolidUI.Index(scores, (playerScore, index) => {
        return SolidUI.h(UI.Text, {
            parent: container,
            y: index * 30, // Position based on index
            message: () => {
                const playerScore = playerScore();
                return mod.Message(mod.stringkeys.score, playerScore.player, playerScore.score);
            },
            textSize: 20,
            textColor: UI.COLORS.WHITE,
        });
    });

    // Update the list (Assume player1, player2, and player3 are some valid `mod.Player` objects)
    setScores([
        { id: 1, player: player1, score: 100 },
        { id: 2, player: player2, score: 85 },
        { id: 3, player: player3, score: 120 },
    ]);

    // Sort and update (widgets stay in place, content updates)
    setScores((prev) => [...prev].sort((a, b) => b.score - a.score));
}
```

```json
{
    "score": "{}: {}"
}
```

### Real-World Example: Spawn UI

This example is based on the [`FFASpawning`](../ffa-spawning/index.ts) module, demonstrating a complete reactive UI
system.

```ts
function createSpawnUI(player: mod.Player): void {
    const [delayCountdown, setDelayCountdown] = SolidUI.createSignal(-1);

    // Prompt container (visible when countdown reaches 0)
    const promptUI = SolidUI.h(
        UI.Container,
        {
            x: 0,
            y: 0,
            width: 440,
            height: 140,
            anchor: mod.UIAnchor.Center,
            visible: () => {
                const visible = delayCountdown() === 0;
                if (visible) {
                    mod.EnableUIInputMode(true, player);
                }
                return visible;
            },
            bgColor: UI.COLORS.BF_GREY_4,
            bgAlpha: 0.5,
            bgFill: mod.UIBgFill.Blur,
        },
        player
    );

    // Spawn button
    SolidUI.h(UI.TextButton, {
        parent: promptUI,
        y: 20,
        width: 400,
        height: 40,
        anchor: mod.UIAnchor.TopCenter,
        message: mod.Message('Spawn now'),
        textSize: 30,
        textColor: UI.COLORS.BF_GREEN_BRIGHT,
        onClick: async () => {
            // Spawn logic here
            setDelayCountdown(-1);
        },
    });

    // Countdown text (visible when countdown > 0)
    SolidUI.h(
        UI.Text,
        {
            x: 0,
            y: 60,
            width: 400,
            height: 50,
            anchor: mod.UIAnchor.TopCenter,
            message: () => mod.Message(`Spawning available in ${delayCountdown()} seconds...`),
            textSize: 30,
            textColor: UI.COLORS.BF_GREEN_BRIGHT,
            visible: () => delayCountdown() > 0,
        },
        player
    );

    // Start the countdown (a timer calls `setDelayCountdown` every second, which automatically updates the UI).
    setDelayCountdown(10);
}
```

---

## Types & Interfaces

All types are defined inside the `SolidUI` namespace in [`solid-ui/index.ts`](index.ts).

### `SolidUI.Accessor<T>`

A generic function that retrieves the current value of a reactive signal. Calling an Accessor establishes a
"dependency." If you call this function inside an Effect or reactive property, that Effect will automatically re-run
whenever the Signal's value changes.

```ts
type Accessor<T> = () => T;
```

### `SolidUI.Setter<T>`

A function used to update the value of a Signal. You can pass either:

- A raw value (e.g., `5`)
- An "updater" function that receives the previous value (e.g., `prev => prev + 1`)

```ts
type Setter<T> = (newValue: T | ((prev: T) => T)) => void;
```

### `SolidUI.Context<T>`

A definition object for a Context, used for dependency injection.

```ts
interface Context<T> {
    id: symbol;
    defaultValue: T;
    provide: (value: T, fn: () => void) => void;
}
```

---

## How It Works

### Reactive System Architecture

`SolidUI` implements a fine-grained reactive system inspired by SolidJS:

1. **Signals** hold values and maintain a set of subscribers (effects)
2. **Effects** track which signals they read during execution
3. **When a signal changes**, it schedules all subscribed effects to run
4. **Effects run asynchronously** via the microtask queue (non-blocking)
5. **Property updates** are batched to minimize UI updates

### Dependency Tracking

The system uses a context stack to track dependencies:

- When an effect runs, it's pushed onto the context stack
- When a signal is read, it checks the context stack for the current effect
- The signal adds the effect to its subscriber list
- The effect records the signal as a dependency

### Update Scheduling

All updates are scheduled asynchronously:

1. Setting a signal immediately updates its value
2. Subscribed effects are added to a pending queue
3. A microtask is scheduled to flush the queue
4. The flush runs all queued effects
5. Effects update UI properties through the `UI` module's setters

### Component Lifecycle

When you call `SolidUI.h()`:

1. A cleanup list is created for this component
2. The UI element is instantiated with initial property values
3. For each reactive property (accessor function):
    - An effect is created that watches the accessor
    - The effect updates the UI property when the accessor changes
    - The effect's disposer is registered for cleanup
4. The component's `delete()` method is monkey-patched to run all cleanups
5. When the component is deleted, all effects are disposed

---

## Known Limitations & Caveats

### UI Module Dependency

While `SolidUI` is decoupled from the `UI` module, it assumes that UI objects have getters and setters for properties.
It has only been tested with the `UI` module. Using it with other UI systems may require adaptation.

### Property Assignment

`SolidUI.h()` uses property setters to update UI elements. If a property is read-only or doesn't have a setter, updates
will fail silently (errors are caught). Ensure your UI objects have proper setters for reactive properties.

### Accessor Function Detection

`SolidUI.h()` treats any function value as an accessor. If you need to pass a function as a static value (not reactive),
you'll need to work around this. The `onClick` property is special-cased and never made reactive.

### Store Updates

Store updates must use the `setStore` function with a producer. Direct assignment to store properties (e.g.,
`store.value = 5`) works but may not trigger reactivity correctly in all cases. Always use the setter:

```ts
// ✅ Correct
setStore((s) => {
    s.value = 5;
});

// ⚠️ May work but not recommended
store.value = 5;
```

### Effect Execution Order

Effects execute in the order they were scheduled, but there's no guarantee of execution order across different signals.
If you need specific ordering, chain effects manually or use a single effect.

### Memory Management

Effects and subscriptions are automatically cleaned up when UI elements are deleted. However, if you create standalone
effects or roots, you must manually dispose of them to prevent memory leaks.

### Async Updates

All reactive updates are asynchronous. If you need synchronous updates (not recommended), you'll need to use the
underlying `UI` module directly.

---

## Further Reference

- [`UI` Module Documentation](../ui/README.md) – The UI helper module that `SolidUI` is designed to work with
- [`FFASpawning` Module](../ffa-spawning/index.ts) – Real-world example of `SolidUI` usage
- [SolidJS Documentation](https://www.solidjs.com/docs/latest) – Inspiration and design philosophy (note: `SolidUI` uses
  HyperScript, not JSX)
- [SolidJS GitHub](https://github.com/solidjs/solid) – Original SolidJS implementation
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are
welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases
help shape the roadmap (additional reactive primitives, performance optimizations, developer experience improvements,
etc.), so please share your experiences.

---
