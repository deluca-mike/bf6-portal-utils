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
5. Use the returned objects to show/hide, reposition, mutate text/buttons, define onClick behavior (sync or async), etc.
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
                    onClick: (player: mod.Player) => {
                        // Do something (sync or async; CallbackHandler catches errors)
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
                    onClick: (player: mod.Player) => {
                        // Do something (sync or async; CallbackHandler catches errors)
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
            onClick: (player: mod.Player) => {
                testMenu?.hide();
            },
            message: mod.Message(mod.stringkeys.ui.buttons.close),
            textSize: 36,
            textColor: UI.COLORS.WHITE,
        });
    }

    testMenu?.show();
});
```

### Method Chaining Example

All setter methods return the instance, allowing you to chain multiple operations:

```ts
import { UIButton } from 'bf6-portal-utils/ui/components/button';
import { UIText } from 'bf6-portal-utils/ui/components/text';

const button = new UIButton({
    position: { x: 100, y: 200 },
    size: { width: 200, height: 50 },
    onClick: (player) => {
        // Handle click (sync or async; errors are caught and logged by CallbackHandler)
    },
});

// Chain multiple setters together
button
    .setPosition({ x: 150, y: 250 })
    .setSize({ width: 250, height: 60 })
    .setBaseColor(UI.COLORS.BLUE)
    .setBaseAlpha(0.9)
    .setEnabled(true)
    .show();

// Or update text content with chaining
const text = new UIText({
    message: mod.Message(mod.stringkeys.labels.hello), // 'Hello'
    position: { x: 0, y: 0 },
});

text.setMessage(mod.Message(mod.stringkeys.labels.updated)) // 'Updated'
    .setPosition({ x: 10, y: 20 })
    .setBgColor(UI.COLORS.WHITE)
    .setBgAlpha(0.5)
    .show();

// You can also use individual x, y, width, height properties
text.setX(10).setY(20).setWidth(100).setHeight(50).show();
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
text.setParent(container2);
// Or: text.parent = container2;

console.log(container1.children.length); // 0 (automatically removed)
console.log(container2.children.length); // 1 (automatically added)

// Delete the text element
text.delete();

console.log(container2.children.length); // 0 (automatically removed)
```

</ai>

---

## Core Concepts

- **`UI` namespace** – A namespace that wraps `mod.*` UI functions and keeps track of active buttons/handlers. Provides logging functionality via the `Logging` module for debugging and error tracking within UI components.
- **`UI.Node` base class** – All UI nodes (root, containers, text, buttons) extend this class and have `name`, `uiWidget`, and `receiver` getters. Use `instanceof` to check node types (e.g., `element instanceof UIContainer`).
- **`UI.Parent` interface** – Interface implemented by nodes that can have children (`Root` and `Container`). Provides `children`, `attachChild()`, and `detachChild()` methods for managing parent-child relationships. Children are stored internally as a `Set<Element>` but exposed as an array via the `children` getter.
- **`UI.Root` class** – The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance available as `UI.ROOT_NODE`. All elements default to this parent unless you supply `parent` in params.
- **`UI.Element` base class** – Abstract base class that all created elements extend. Provides getters/setters for common properties (position, size, visibility, colors, etc.) with method chaining support. All property values are stored internally for fast retrieval without relying on `mod` namespace calls. Elements automatically manage parent-child relationships when created, moved, or deleted. Includes direct properties for `x`, `y`, `width`, `height`, and `uiInputModeWhenVisible`. Elements have a protected `_deleted` member and `_isDeletedCheck()` method that blocks and warns on any setter operations when the element is deleted. Elements also have a protected `_logging` member that provides access to the UI namespace's logging instance for use in custom components.
- **Component organization** – All UI component classes (e.g., `UIContainer`, `UIText`, `UIButton`, `UITextButton`) have been moved to their own subdirectories under `ui/components/`. Each component can be individually imported from its respective path, allowing for better code organization and independent versioning.
- **`UI.Button` interface** – Interface that defines button-like behavior. Components that behave like buttons can implement this interface and register themselves using `UI.registerButton()` so their `onClick` functions are called when the button is pressed.
- **Default colors** – `UI.COLORS` wraps common `mod.CreateVector(r, g, b)` presets so you rarely need to build vectors yourself. It includes BF palette colors.
- **Receiver routing** – All elements can specify a `receiver` property (`mod.Player | mod.Team`) in their constructor parameters to display UI to a specific audience. When omitted, elements automatically adopt their parent's receiver (or use global if parent is `UI.ROOT_NODE`). The `receiver` property (type `GlobalReceiver | TeamReceiver | PlayerReceiver`) is available as a read-only property on `Node` (inherited by `Element`). To get the native receiver (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`. Console warnings are displayed if an element's receiver is incompatible with its parent's receiver.
- **Method chaining** – All setter methods (e.g., `setPosition()`, `setSize()`, `setX()`, `setY()`, `show()`, `hide()`) return the instance, allowing you to chain multiple operations: `container.setPosition({ x: 10, y: 20 }).setSize({ width: 100, height: 50 }).show()`.
- **Parent-child management** – When elements are created with a parent, moved between parents, or deleted, the parent's `children` Set is automatically maintained. The `parent` property must be a `UI.Node` that adheres to the `UI.Parent` interface (not native `mod.UIWidget`). Containers track their children internally as a `Set`, and calling `delete()` on an element automatically removes it from its parent's children and deletes all child elements recursively.
- **Position and Size parameters** – Constructor parameters support either `x`/`y` or `position` (mutually exclusive), and either `width`/`height` or `size` (mutually exclusive). All elements expose `x`, `y`, `width`, `height`, `position`, and `size` as properties with getters/setters.
- **Padding** – Despite padding being a common parameter for the underlying `mod` namespace UI widgets, it is not a property of the base `Element` class because it is not available for all UI widgets, and the width of contained contents (i.e. text or elements in a container) do not have their heights and widths automatically adjusted to compensate for their parent's padding. Since users need to manage positions and sizes themselves to compensate for padding, it is a current design decision to omit padding as a base property. It will be reintroduced later when this library supports automatic sizing and relative widths (i.e. percentages of their parent).

<ai>

### Custom UI Elements

Custom elements (like checkboxes, dropdowns, clocks, progress bars, etc.) can be built by extending the `Element` class and accepting a `params` object that extends the `ElementParams` interface as the sole argument to their constructor. They can use the protected `_logging` member to log messages within the UI namespace, and should use `_isDeletedCheck()` to protect setter operations from being called on deleted elements. Custom button-like components should implement the `Button` interface and register themselves using `UI.registerButton()` during construction.

### Element Behavior Conventions

The following behaviors apply to the built-in UI elements in this repository. Custom elements that extend `Element` should ideally implement these conventions for consistency, but doing so is not guaranteed. Custom implementations may differ, and edge cases may exist.

- **Parent-Child Relationships**: When you create child elements via `childrenParams` (on containers), they automatically receive the container as their parent. When you instantiate a child element with a parent, it's automatically added to the parent's `children` array. The parent's `children` array is automatically maintained.

- **Recursive Deletion**: Calling `delete()` on a container recursively deletes all child elements before deleting the container itself.

- **Children Storage**: Children are stored internally as a `Set<Element>` but exposed as an array via the `children` getter.

- **Receiver Inheritance**: Child elements automatically inherit their parent's receiver unless explicitly specified in their constructor parameters.

</ai>

---

## Logging

The `UI` namespace provides logging functionality through the `Logging` module, allowing you to configure error logging and debug messages for UI operations. This is particularly useful for tracking issues with deleted elements, button registration conflicts, and other UI-related warnings.

### `UI.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `UI.setLogging()` to configure the minimum log level for UI logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

### `UI.setLogging(log?: (text: string) => Promise<void> | void, logLevel?: LogLevel, includeError?: boolean): void`

Configures logging for the UI module. When UI operations encounter issues (such as attempting to modify a deleted element or registering a duplicate button), they are automatically logged using the configured logger.

**Parameters:**

- `log` – The logger function to use. Pass `undefined` to disable logging. Can be synchronous or asynchronous.
- `logLevel` – The minimum log level to use. Messages below this level will not be logged. Defaults to `LogLevel.Warning`.
- `includeError` – Whether to include the runtime error details in the log message. Defaults to `false`. The runtime error can be very large and may cause issues with UI loggers.

**Example:**

```ts
import { UI } from 'bf6-portal-utils/ui';
import { UIContainer } from 'bf6-portal-utils/ui/components/container';

// Configure logging with console.log, minimum level of Warning, and include error details
UI.setLogging(
    (text) => console.log(text),
    UI.LogLevel.Warning,
    true // includeError
);

// If an element is modified after deletion, it will be logged automatically
const container = new UIContainer({
    /* ... */
});

container.delete();
container.visible = true; // Logs: <UI> Element [name] already deleted. (Warning)
```

**Note:** Logging is automatic and fail-safe. UI operation warnings and errors are logged without affecting the operation or the UI system. The `_logging` member is available as a protected property on `Element` for use in custom UI components that extend `Element`.

---

## API Reference

### `UI.COLORS`

Prebuilt `mod.Vector` colors for basic colors and BF6 palette colors.

### `UI.ROOT_NODE`

The root node wrapping `mod.GetUIRoot()`. All elements default to this parent unless you supply `parent` in params.

### `abstract class UI.Element extends UI.Node`

Abstract base class for all UI elements (containers, text, buttons). Provides common properties and methods with getter/setter pairs and method chaining support. All property values are stored internally for fast retrieval.

#### Properties & Methods (Inherited by `Container`, `Text`, and `Button`)

**From `UI.Node`:**

- **`name: string`** (getter) – The widget name.
- **`uiWidget: mod.UIWidget`** (getter) – The underlying UI widget.
- **`receiver: GlobalReceiver | TeamReceiver | PlayerReceiver`** (getter) – The target audience receiver for this element (read-only). Elements inherit their parent's receiver unless explicitly specified in constructor parameters. To get the native receiver (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`.

**Element-specific:**

- **`parent: UI.Parent`** (getter/setter) – The parent node (must be `UI.Root` or `UI.Container`). Setting the parent automatically adds this element to the new parent's children and removes it from the old parent's children.
- **`setParent(parent: UI.Parent): Element`** – Sets the parent and returns `this` for method chaining.

**Visibility:**

- **`visible: boolean`** (getter/setter) – Element visibility.
- **`setVisible(visible: boolean): Element`** – Sets visibility and returns `this` for method chaining.
- **`show(): Element`** – Shows the element and returns `this` for method chaining.
- **`hide(): Element`** – Hides the element and returns `this` for method chaining.
- **`toggle(): Element`** – Toggles visibility and returns `this` for method chaining.

**Position & Size:**

- **`x: number`** (getter/setter) – X position.
- **`setX(x: number): Element`** – Sets X position and returns `this` for method chaining.
- **`y: number`** (getter/setter) – Y position.
- **`setY(y: number): Element`** – Sets Y position and returns `this` for method chaining.
- **`position: UI.Position`** (getter/setter) – Element position as `{ x: number; y: number }`.
- **`setPosition(params: UI.Position): Element`** – Sets position and returns `this` for method chaining.
- **`width: number`** (getter/setter) – Element width.
- **`setWidth(width: number): Element`** – Sets width and returns `this` for method chaining.
- **`height: number`** (getter/setter) – Element height.
- **`setHeight(height: number): Element`** – Sets height and returns `this` for method chaining.
- **`size: UI.Size`** (getter/setter) – Element size as `{ width: number; height: number }`.
- **`setSize(params: UI.Size): Element`** – Sets size and returns `this` for method chaining.

**Background:**

- **`bgColor: mod.Vector`** (getter/setter) – Background color.
- **`setBgColor(color: mod.Vector): Element`** – Sets background color and returns `this` for method chaining.
- **`bgAlpha: number`** (getter/setter) – Background opacity (0-1).
- **`setBgAlpha(alpha: number): Element`** – Sets background opacity and returns `this` for method chaining.
- **`bgFill: mod.UIBgFill`** (getter/setter) – Background fill mode.
- **`setBgFill(fill: mod.UIBgFill): Element`** – Sets background fill mode and returns `this` for method chaining.

**Layout:**

- **`anchor: mod.UIAnchor`** (getter/setter) – Anchor point for positioning.
- **`setAnchor(anchor: mod.UIAnchor): Element`** – Sets anchor and returns `this` for method chaining.
- **`depth: mod.UIDepth`** (getter/setter) – Z-order depth.
- **`setDepth(depth: mod.UIDepth): Element`** – Sets depth and returns `this` for method chaining.

**UI Input Mode Management:**

- **`uiInputModeWhenVisible: boolean`** (getter/setter) – When enabled, automatically requests UI input mode from the element's receiver when the element becomes visible, and releases the request when hidden or deleted. Multiple elements can request input mode from the same receiver; input mode is only disabled when all requesters are hidden or deleted.
- **`setUiInputModeWhenVisible(newValue: boolean): Element`** – Sets the UI input mode when visible behavior and returns `this` for method chaining.

**Lifecycle:**

- **`deleted: boolean`** (getter) – Read-only property indicating whether the element has been deleted. Once an element is deleted, all setter operations are blocked and a warning is logged if they are used.
- **`delete(): void`** – Deletes the widget from Battlefield Portal and automatically removes it from its parent's children list. Sets the `deleted` flag to `true` and blocks all future setter operations. Does not return `this` (element is destroyed and no other calls on it should be performed).

<ai>

**Method Chaining Example:**

All properties support both normal setter syntax and method chaining:

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';

const container = new UIContainer({
    /* ... */
});

// Normal setter syntax (does not return the instance)
container.bgAlpha = 0.8;
container.visible = true;
container.position = { x: 100, y: 200 };

// Method chaining (returns the instance for chaining)
container
    .setPosition({ x: 100, y: 200 })
    .setSize({ width: 300, height: 400 })
    .setBgColor(UI.COLORS.BLUE)
    .setBgAlpha(0.8)
    .setAnchor(mod.UIAnchor.TopLeft)
    .show();
```

</ai>

### `UI.registerButton(name: string, button: Button): () => void`

Registers a button with the UI system so that its `onClick` function is called when the button is pressed. Components that behave like buttons should call this function during construction to register themselves. Button events are received automatically—the UI module subscribes to `OnPlayerUIButtonEvent` via the `Events` module at load time, looks up the registered button by widget name, and invokes its `onClick` (sync or async) using `CallbackHandler`, which catches and logs exceptions. Do not implement or export `OnPlayerUIButtonEvent` in your code.

**Parameters:**

- `name` – The name of the button (typically the element's widget name).
- `button` – The button instance that implements the `Button` interface.

**Returns:**

- A function that can be called to unregister the button. This is a convenience method for cleanup.

**Note:** If a button with the same name is already registered, a warning is logged and an empty unregister function is returned. Button registration is typically handled automatically by button components during construction.

---

## Types & Interfaces

All types and classes are defined inside the `UI` namespace in [`ui/index.ts`](./index.ts).

### `UI.Position`

Type alias for position coordinates:

```ts
type Position = {
    x: number;
    y: number;
};
```

### `UI.Size`

Type alias for size dimensions:

```ts
type Size = {
    width: number;
    height: number;
};
```

### `UI.Node`

Base class for all UI nodes. Provides:

- `name: string` (getter) – The widget name
- `uiWidget: mod.UIWidget` (getter) – The underlying UI widget
- `receiver: GlobalReceiver | TeamReceiver | PlayerReceiver` (getter) – The target audience receiver (read-only). To get the native receiver (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`.

Use `instanceof` to check node types at runtime. For example, with imported components:

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UIText } from 'bf6-portal-utils/ui/components/text';

if (element instanceof UIContainer) {
    // element is a container
}
```

### `UI.Button` (interface)

Interface that defines button-like behavior. Components that behave like buttons should implement this interface and register themselves using `UI.registerButton()`.

- `onClick: ((player: mod.Player) => void | Promise<void>) | undefined` – The click handler function that is called when the button is pressed. May be synchronous or asynchronous. The UI module invokes it via `CallbackHandler`, which catches sync throws and async promise rejections and logs them (if logging is configured) so a failing handler does not break the UI. Can be `undefined` if the button doesn't have a click handler.

### `UI.Parent` (interface)

Interface implemented by nodes that can have children. Implemented by `Root` and `Container`. Custom UI elements can implement this interface to accept children.

- `name: string` (getter) – The widget name
- `uiWidget: mod.UIWidget` (getter) – The underlying UI widget
- `receiver: GlobalReceiver | TeamReceiver | PlayerReceiver` (getter) – The receiver for this parent
- `children: Element[]` (getter) – Array of child elements (children are stored internally as a `Set<Element>` but exposed as an array)
- `attachChild(child: Element): void` – Adds a child to this parent (called automatically when elements are created or moved).
- `detachChild(child: Element): void` – Removes a child from this parent (called automatically when elements are moved or deleted).

### `UI.Root extends UI.Node implements UI.Parent`

The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance available as `UI.ROOT_NODE`. All elements default to this parent unless you supply `parent` in params. Implements `Parent` interface to manage top-level children.

### `abstract class UI.Element extends UI.Node`

Abstract base class for all created widgets. Extends `Node` and provides all the properties and methods documented in the `UI.Element` API section above. All property values are stored internally for fast retrieval. Automatically manages parent-child relationships: when created, it's added to its parent's children; when the parent is changed, it's moved between parents' children lists; when deleted, it's removed from its parent's children.

### `UI.BaseParams`

Base interface for common properties reused by other parameter interfaces.

```ts
type BaseParams = {
    anchor?: mod.UIAnchor;
    parent?: Parent;
    visible?: boolean;
    bgColor?: mod.Vector;
    bgAlpha?: number;
    bgFill?: mod.UIBgFill;
    depth?: mod.UIDepth;
    receiver?: mod.Player | mod.Team;
    uiInputModeWhenVisible?: boolean;
};
```

### `UI.ElementParams extends BaseParams`

Base interface for positional/layout properties. Uses mutually exclusive types for position and size.

```ts
type ElementParams = BaseParams & EitherPosition & EitherSize;

// EitherPosition: either { position: Position } OR { x?: number; y?: number } (mutually exclusive)
// EitherSize: either { size: Size } OR { width?: number; height?: number } (mutually exclusive)
```

---

<ai>

## UI Input Mode Management

The `uiInputModeWhenVisible` property provides automatic management of UI input mode (which is what allows a player to click on UI buttons), eliminating the need to manually call `mod.EnableUIInputMode` in most cases. When enabled on an element, the UI module automatically handles enabling and disabling UI input mode based on the element's visibility state.

</ai>

### How It Works

- **Request-based system**: When `uiInputModeWhenVisible` is `true` and an element becomes visible, it registers as a "requester" with its receiver (global, team, or player). The receiver tracks all active requesters.
- **Automatic enable/disable**: UI input mode is enabled when the first requester becomes visible and disabled only when the last requester becomes hidden or deleted. This ensures that multiple interactive elements can share the same receiver without conflicts.
- **Receiver-aware**: The system is aware of each element's receiver and only toggles `mod.EnableUIInputMode` for the relevant scope. Elements with global receivers enable UI input mode globally, elements with team receivers enable it for that team, and elements with player receivers enable it for that player.
- **Lifecycle management**: Requests are automatically released when elements are hidden, deleted, or when `uiInputModeWhenVisible` is changed from `true` to `false` (if the element is currently visible). When a visible element's `uiInputModeWhenVisible` property is set from `true` to `false`, it releases the UI input mode request from its receiver.

### Benefits

1. **Cleaner code**: No need to manually track which elements are visible and manage `mod.EnableUIInputMode` calls.
2. **Error prevention**: Prevents common bugs like disabling UI input mode too early (before all interactive elements are hidden) or forgetting to enable/disable it.
3. **Multiple elements support**: Multiple interactive elements can safely share the same receiver—UI input mode stays enabled as long as any element is visible.
4. **Automatic cleanup**: When elements are deleted, their requests are automatically released.

<ai>

### Usage Example

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';

// Create a menu with interactive buttons
const menu = new UIContainer({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 400 },
    receiver: player,
    uiInputModeWhenVisible: true, // Enable automatic UI input mode management
    childrenParams: [
        {
            type: UITextButton,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
            message: mod.Message(mod.stringkeys.labels.button1), // 'Button 1'
            onClick: async (p) => {
                // Handle click
            },
        } as UIContainer.ChildParams<UITextButton.Params>,
        {
            type: UITextButton,
            position: { x: 0, y: 60 },
            size: { width: 200, height: 50 },
            message: mod.Message(mod.stringkeys.labels.button2), // 'Button 2'
            onClick: async (p) => {
                // Handle click
            },
        } as UIContainer.ChildParams<UITextButton.Params>,
    ],
});

// Simply show/hide the menu—UI input mode is managed automatically
menu.show(); // UI input mode is enabled for the player

// ... user interacts with buttons ...
menu.hide(); // UI input mode is disabled for the player (when no other requesters exist)

// You can also enable/disable the feature dynamically
menu.uiInputModeWhenVisible = false; // Disable automatic management

// ... later ...
menu.uiInputModeWhenVisible = true; // Re-enable automatic management
```

</ai>

<ai>

### When to Use

- **Enable `uiInputModeWhenVisible`** only on elements that you actually intend to toggle between visible and not visible. For example, if you have a container with 4 buttons and only the container's visibility will change, set `uiInputModeWhenVisible: true` only on the container, not on the individual buttons.
- **Disable `uiInputModeWhenVisible`** (default) for elements that won't have their visibility toggled, or when you prefer to manage UI input mode manually (not recommended).
- For complex UIs with multiple interactive sections, you can enable it on parent containers to manage input mode for entire UI hierarchies.

### Notes

- The default value is `false`. Enable it explicitly when needed.
- The property can be changed at runtime via the getter/setter or `setUiInputModeWhenVisible()` method.
- The system may not work correctly if you try to manually enable or disable UI input mode with `mod.EnableUIInputMode` in any scope, since there is no way to query the runtime to determine the current UI input mode state. It's best to let the UI system handle it entirely. Alternatively, you can choose to handle UI input mode entirely yourself, as long as you do not have any elements with `uiInputModeWhenVisible` enabled.
- Elements inherit their receiver from their parent, so UI input mode management respects the receiver hierarchy.

</ai>

---

<ai>

## Event Wiring & Lifecycle

- The UI module subscribes to `OnPlayerUIButtonEvent` via the `Events` module at load time, so button presses are dispatched automatically.
- Use the returned `Element` helpers to hide/show instead of calling `mod.SetUIWidgetVisible` manually.
- All properties support both normal setter syntax (e.g., `element.bgAlpha = 0.8;`) and method chaining (e.g., `element.setBgAlpha(0.8).show()`). Method chaining is useful when you want to apply multiple changes in sequence.
- Always call `delete()` when removing widgets to prevent stale references inside Battlefield Portal. The element will automatically be removed from its parent's `children` array. For containers, `delete()` recursively deletes all children before deleting the container itself.
- The `parent` property in parameter interfaces must be a `UI.Parent` (i.e., `UI.Root` or `UI.Container`). Parent-child relationships are automatically managed.
- **Parent-child relationships** are automatically maintained:
    - When an element is created with a parent, it's automatically added to the parent's `children` Set via `attachChild()`. Children are stored internally as a `Set<Element>` but exposed as an array via the `children` getter.
    - When an element's `parent` is changed (via setter or `setParent()`), it's removed from the old parent's children via `detachChild()` and added to the new parent's children via `attachChild()`.
    - When an element is deleted, it's automatically removed from its parent's `children` Set via `detachChild()`.
- **Receiver inheritance**: Elements automatically adopt their parent's receiver if a receiver is not explicitly specified in constructor parameters. The `getReceiver()` utility function handles this logic, checking the parent's receiver and using it if no receiver is provided. Console warnings are displayed if an element's receiver is incompatible with its parent's receiver.
- **Deleted element protection**: Once an element is deleted (via `delete()`), the `_deleted` flag is set to `true` and all setter operations are blocked using `_isDeletedCheck()`. Attempts to modify deleted elements will log a warning and return early without performing the operation.

</ai>

---

## Future Work

The following features are planned for upcoming releases:

### Relative Sizing and Padding

Since padding is currently not supported since the user is still forced to compensate text and child sizing to take into account parent padding, an upcoming feature will support relative sizing (i.e. "50%" of parent) and automatic padding compensation.

### Auto-Rename UI Widgets

Support for auto-renaming a UIWidget when it moves from one parent to another, in order to keep name consistency. Names are mostly irrelevant to the developer/player, so this is very low priority.

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the system to them.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This helper library is under active development. Feature requests, bug reports, usage questions, or general ideas are always welcome—open an issue or reach out and they’ll be triaged quickly so you can keep shipping Portal experiences without waiting on tooling updates.
