# UI Module

<ai>

This TypeScript `UI` namespace wraps Battlefield Portal's `mod` UI APIs with an object-oriented interface, providing strongly typed helpers, convenient defaults, ergonomic getters/setters, and automatic management of various UI mechanics for building complex HUDs, panels, and interactive buttons. The module subscribes to `OnPlayerUIButtonEvent` via the `Events` module at load time, so button events are dispatched automatically and you must use the `Events` module for all other game event subscription.

> **Note** You **must** use the `Events` module as your only mechanism to subscribe to game events. Do not implement or export any Battlefield Portal event handler functions (`OnPlayerUIButtonEvent`, `OnPlayerDeployed`, etc.) in your code. The `Events` module owns those hooks and this module relies on it; only one implementation of each event handler can exist per project. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules needed in your code:
    ```ts
    import { UI } from 'bf6-portal-utils/ui';
    import { UIContainer } from 'bf6-portal-utils/ui/components/container';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Build UI elements using the UI classes and constants from the `UI` namespace.
5. Use the returned objects to control visibility (`element.visible = true/false`), reposition, mutate text/buttons, define button handlers (`onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`; sync or async), etc.
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Events } from 'bf6-portal-utils/events';
import { UI } from 'bf6-portal-utils/ui';
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';

let testMenu: UIContainer | undefined;

// The UI module subscribes to OnPlayerUIButtonEvent via Events automatically. Use Events for your game logic.
Events.OnPlayerDeployed.subscribe((eventPlayer: mod.Player) => {
    if (!testMenu) {
        // Can include children upon construction of the container.
        testMenu = new UIContainer({
            position: { x: 0, y: 0 },
            size: { width: 200, height: 300 },
            anchor: mod.UIAnchor.Center,
            receiver: eventPlayer,
            visible: true,
            uiInputModeWhenVisible: true,
            childrenParams: [
                {
                    type: UITextButton,
                    position: { x: 0, y: 0 },
                    size: { width: 200, height: 50 },
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClickUp: (player: mod.Player) => {
                        // Do something on release (sync or async; CallbackHandler catches errors)
                    },
                    message: mod.Message(mod.stringkeys.ui.buttons.option1),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UIContainer.ChildParams<UITextButton.Params>,
                {
                    type: UITextButton,
                    position: { x: 0, y: 50 },
                    size: { width: 200, height: 50 },
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClickUp: (player: mod.Player) => {
                        // Do something on release (sync or async; CallbackHandler catches errors)
                    },
                    message: mod.Message(mod.stringkeys.ui.buttons.option2),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UIContainer.ChildParams<UITextButton.Params>,
            ],
        });

        // And even add a child to the container.
        new UITextButton({
            parent: testMenu,
            position: { x: 0, y: 0 },
            size: { width: 50, height: 50 },
            anchor: mod.UIAnchor.BottomCenter,
            bgColor: UI.COLORS.GREY_25,
            baseColor: UI.COLORS.BLACK,
            onClickUp: (player: mod.Player) => {
                if (testMenu) {
                    testMenu.visible = false;
                }
            },
            message: mod.Message(mod.stringkeys.ui.buttons.close),
            textSize: 36,
            textColor: UI.COLORS.WHITE,
        });
    }

    if (testMenu) {
        testMenu.visible = true;
    }
});
```

### Property Setter Example

Update properties directly via standard TypeScript property assignment:

```ts
import { UIButton } from 'bf6-portal-utils/ui/components/button';
import { UIText } from 'bf6-portal-utils/ui/components/text';

const button = new UIButton({
    position: { x: 100, y: 200 },
    size: { width: 200, height: 50 },
    onClickUp: (player) => {
        // Handle release (sync or async; errors are caught and logged by CallbackHandler)
    },
});

// Update properties directly
button.position = { x: 150, y: 250 };
button.size = { width: 250, height: 60 };
button.baseColor = UI.COLORS.BLUE;
button.baseAlpha = 0.9;
button.enabled = true;
button.visible = true;

// Or update text content
const text = new UIText({
    message: mod.Message(mod.stringkeys.labels.hello), // 'Hello'
    position: { x: 0, y: 0 },
});

text.message = mod.Message(mod.stringkeys.labels.updated); // 'Updated'
text.position = { x: 10, y: 20 };
text.bgColor = UI.COLORS.WHITE;
text.bgAlpha = 0.5;
text.visible = true;
```

### Parent-Child Management Example

Elements automatically manage parent-child relationships. When you create an element with a parent, move it between parents, or delete it, the parent's `children` array is automatically updated:

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UIText } from 'bf6-portal-utils/ui/components/text';

// Create containers
const container1 = new UIContainer({ position: { x: 0, y: 0 }, size: { width: 200, height: 200 } });
const container2 = new UIContainer({ position: { x: 200, y: 0 }, size: { width: 200, height: 200 } });

// Create a text element as a child of container1
const text = new UIText({
    message: mod.Message(mod.stringkeys.labels.hello), // 'Hello'
    parent: container1,
});

console.log(container1.children.length); // 1
console.log(container2.children.length); // 0

// Move the text element to container2
text.parent = container2;

console.log(container1.children.length); // 0 (automatically removed)
console.log(container2.children.length); // 1 (automatically added)

// Delete the text element
text.delete();

console.log(container2.children.length); // 0 (automatically removed)
```

</ai>

---

## Core Concepts

- **`UI` namespace** – Wraps `mod.*` UI functions and maintains active button/handler registrations. Provides logging via the `Logging` module for debugging and runtime error reporting.
- **`UI.Node` base class** – Root of the UI hierarchy with `uiWidget` and `receiver` getters. Use `instanceof` to check node types (e.g., `element instanceof UIContainer`).
- **`UI.Parent` interface** – Implemented by nodes that hold children (`Root` and `Container`). Exposes `children: readonly Element[]`, `getChild()`, `forEachChild()`, `attachChild()`, and `detachChild()`. Children are stored internally in a zero-overhead lazy flat array and exposed as a shallow copy.
- **`UI.Root` class** – Singleton wrapping `mod.GetUIRoot()` available as `UI.ROOT_NODE`. All elements default to this parent unless a custom `parent` is supplied.
- **`UI.Element` base class** – Abstract base class for all UI components. Property getters and setters delegate directly to native `mod` engine APIs without duplicate in-memory caching, eliminating runtime heap overhead. Includes built-in safety (`_deleted` flag and `_isDeletedCheck()`) to block operations on destroyed elements.
- **Parent-Child & Hierarchy Rules**:
    - Elements created with a parent are automatically attached via `attachChild()`.
    - Mutating `element.parent = newParent` automatically detaches from the previous parent and attaches to the new one.
    - Calling `delete()` on an element detaches it from its parent. For containers, `delete()` recursively deletes all child elements before deleting the container widget itself.
- **Receiver Routing & Inheritance**:
    - Every element has a target audience (`mod.Player | mod.Team`). When omitted, elements automatically inherit their parent's receiver (or global if parent is `UI.ROOT_NODE`).
    - The `receiver` property (`GlobalReceiver | TeamReceiver | PlayerReceiver`) is exposed on `Node`. Access `receiver.nativeReceiver` for the raw engine handle. Warnings are logged if a child's receiver is incompatible with its parent's receiver.
- **`UI.Button` interface** – Button-like elements register themselves with `UI.registerButton()` to route native engine button events (`ButtonDown`, `ButtonUp`, `FocusIn`, `FocusOut`) to their respective handlers (`onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`).
- **Widget Naming Scheme (`ui_${++counter}`)**:
    - The root node is named `'ui_0'`.
    - All elements created by the `UI` module are sequentially assigned names in the format `'ui_1'`, `'ui_2'`, `'ui_3'`, etc. via `UI.makeName()`.
    - **Avoid Naming Collisions**: If you create UI widgets manually via native `mod.AddUI*` APIs or other modules/libraries, avoid using the `'ui_<number>'` naming pattern to prevent ID collisions in the Battlefield Portal UI engine.
- **Default colors** – `UI.COLORS` provides prebuilt `mod.Vector` constants for standard colors and BF6 palette colors.
- **Position & Size parameters** – Constructor params support either `x`/`y` or `position` (mutually exclusive), and either `width`/`height` or `size` (mutually exclusive).

<ai>

### Custom UI Elements

Custom elements can be built by extending `Element` and accepting a parameter object extending `ElementParams`. They can access protected `_logging` for UI-scoped logs and `_isDeletedCheck()` to protect operations. Custom interactive components should implement the `Button` interface and call `UI.registerButton(this._name, this)` during construction.

</ai>

---

## Logging

The `UI` namespace provides logging functionality through the `Logging` module for tracking issues with deleted elements, button registration conflicts, and runtime warnings.

### `UI.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity (`Debug` = 0, `Info` = 1, `Warning` = 2, `Error` = 3). Default minimum log level is `LogLevel.Warning`.

### `UI.setLogging(log?: (text: string) => Promise<void> | void, logLevel?: LogLevel, includeRawError?: boolean): void`

Configures logging for the UI module. Pass `undefined` or `null` to disable.

```ts
import { UI } from 'bf6-portal-utils/ui';

UI.setLogging(
    (text) => console.log(text),
    UI.LogLevel.Warning,
    true // includeRawError
);
```

---

<ai>

## UI Input Mode Management

The `uiInputModeWhenVisible` property provides automatic management of UI input mode (enabling the player's cursor to click buttons), eliminating the need to manually call `mod.EnableUIInputMode`.

### How It Works

- **Reference Counting**: Each receiver tracks active requesters. UI input mode is enabled when the first requesting element becomes visible, and disabled when all requesting elements are hidden or deleted.
- **Receiver-Aware Scope**: Automatically targets the appropriate scope (`Global`, `Team`, or `Player`) based on the element's receiver.
- **Lifecycle Integration**: Input mode requests are automatically registered or released when:
    - An element is created with `visible: true` and `uiInputModeWhenVisible: true`.
    - `element.visible` is toggled.
    - `element.uiInputModeWhenVisible` is toggled on a visible element.
    - `element.delete()` is called.

### Usage Example

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';

// Create a menu with interactive buttons
const menu = new UIContainer({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 400 },
    receiver: player,
    uiInputModeWhenVisible: true, // Auto-manages cursor input mode for player
    childrenParams: [
        {
            type: UITextButton,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
            message: mod.Message(mod.stringkeys.labels.button1),
            onClickUp: async (p) => {
                // Handle click
            },
        } as UIContainer.ChildParams<UITextButton.Params>,
    ],
});

// Showing the menu enables UI input mode for the player
menu.visible = true;

// Hiding the menu disables UI input mode (when no other requesters exist)
menu.visible = false;
```

### When to Use

- **Enable `uiInputModeWhenVisible: true`** on the root container of an interactive menu whose visibility you toggle. Do not enable it on individual child buttons inside that container.
- Avoid mixing manual `mod.EnableUIInputMode` calls with `uiInputModeWhenVisible`, as the engine provides no way to query input mode state.

</ai>

---

## API Reference

### `UI.COLORS`

Prebuilt `mod.Vector` colors for basic and Battlefield UI palettes.

### `UI.ROOT_NODE`

The singleton root node wrapping `mod.GetUIRoot()`.

### `UI.Node`

Base class for all UI nodes.

- `uiWidget: mod.UIWidget` (getter) – The underlying native Portal widget handle. Take caution when operating on the widget outside of this module/component, as direct mutations via native `mod.*` APIs can desynchronize internal state and cause runtime errors.
- `receiver: GlobalReceiver | TeamReceiver | PlayerReceiver` (getter) – Target audience receiver. Use `receiver.nativeReceiver` for the raw `mod.Player | mod.Team | undefined`.

### `UI.Button` (interface)

Interface defining button-like behavior. Handlers may be sync or async and are invoked via `CallbackHandler`.

- `onClickDown?: UI.ButtonHandler` – Press event (`mod.UIButtonEvent.ButtonDown`).
- `onClickUp?: UI.ButtonHandler` – Release event (`mod.UIButtonEvent.ButtonUp`). Primary click handler.
- `onFocusIn?: UI.ButtonHandler` – Focus gain (`mod.UIButtonEvent.FocusIn`).
- `onFocusOut?: UI.ButtonHandler` – Focus loss (`mod.UIButtonEvent.FocusOut`).

#### Hover in/out (`HoverIn` / `HoverOut`) Note

Battlefield Portal supports `HoverIn` and `HoverOut` button events, but **this module intentionally does not expose them** on `UI.Button`. Hover only triggers on mouse pointer movement, meaning controller users do not generate hover events during UI navigation. For cross-input compatibility (mouse and gamepad), use **`onFocusIn` / `onFocusOut`** or **`onClickDown` / `onClickUp`**.

### `UI.Parent` (interface)

Interface for parent nodes (`Root` and `Container`).

- `children: readonly Element[]` (getter) – Shallow copy array of attached child elements.
- `getChild(index: number): Element | undefined` – Retrieves a child element at the specified index without allocating a new array.
- `forEachChild(callback: (child: Element, index: number) => void): void` – Iterates over direct child elements without allocating an intermediate array.
- `attachChild(child: Element): void` – Adds a child element.
- `detachChild(child: Element): void` – Removes a child element.

### `abstract class UI.Element extends UI.Node`

Base class for all created widgets.

| Property / Method        | Type                     | Description                                              |
| :----------------------- | :----------------------- | :------------------------------------------------------- |
| `parent`                 | `UI.Parent` (get/set)    | Parent node. Setting moves element between parents.      |
| `visible`                | `boolean` (get/set)      | Visibility state.                                        |
| `x`, `y`                 | `number` (get/set)       | Individual position coordinates.                         |
| `position`               | `UI.Position` (get/set)  | Position as `{ x, y }`.                                  |
| `width`, `height`        | `number` (get/set)       | Individual dimensions.                                   |
| `size`                   | `UI.Size` (get/set)      | Dimensions as `{ width, height }`.                       |
| `bgColor`                | `mod.Vector` (get/set)   | Background color.                                        |
| `bgAlpha`                | `number` (get/set)       | Background opacity (`0-1`).                              |
| `bgFill`                 | `mod.UIBgFill` (get/set) | Background fill style.                                   |
| `anchor`                 | `mod.UIAnchor` (get/set) | Anchor alignment point.                                  |
| `depth`                  | `mod.UIDepth` (get/set)  | Z-order depth.                                           |
| `uiInputModeWhenVisible` | `boolean` (get/set)      | Auto-manage input mode on visibility.                    |
| `deleted`                | `boolean` (get)          | `true` if element has been destroyed.                    |
| `delete()`               | `void`                   | Recursively deletes widget from Portal & unlinks parent. |

### `UI.registerButton(name: string, button: Button): () => void`

Registers a button instance with the central UI event router. The UI module subscribes to `OnPlayerUIButtonEvent` via `Events` at load time and dispatches events to registered buttons. Returns an unregister cleanup function.

---

## Types & Interfaces

- **`UI.Position`**: `{ x: number; y: number }`
- **`UI.Size`**: `{ width: number; height: number }`
- **`UI.ButtonHandler`**: `(player: mod.Player) => Promise<void> | void`
- **`UI.BaseParams`**: Common widget parameters (`parent`, `anchor`, `visible`, `bgColor`, `bgAlpha`, `bgFill`, `depth`, `receiver`, `uiInputModeWhenVisible`).
- **`UI.ElementParams`**: Extends `BaseParams` with mutually exclusive `x`/`y` or `position`, and `width`/`height` or `size`.

---

<ai>

## Event Wiring & Lifecycle Summary

- **Event Subscription**: `UI` subscribes to `OnPlayerUIButtonEvent` automatically via `Events`. Do not export Portal event handlers directly.
- **Hierarchy Lifecycle**: Elements attach on creation, switch on `parent` reassignment, and detach on `delete()`. Containers delete children recursively.
- **Safe Teardown**: Calling `delete()` destroys the native widget and permanently locks setters to prevent stale mutations.
- **Zero-Cache Queries**: Getters query native `mod` API state directly, avoiding memory bloat and stale cache synchronization issues.

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the system to them.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
