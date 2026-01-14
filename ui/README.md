# UI Module

This TypeScript `UI` namespace wraps Battlefield Portal's `mod` UI APIs with an object-oriented interface, providing
strongly typed helpers, convenient defaults, and ergonomic getters/setters for building complex HUDs, panels, and
interactive buttons.

> **Note** The `UI` namespace depends on the `mod` namespace (available in the `bf6-portal-mod-types` package). All
> types referenced below (`mod.UIWidget`, `mod.Vector`, `mod.UIAnchor`, etc.) are documented in that package.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **Button handler** – Register `UI.handleButtonEvent` in your `OnPlayerUIButtonEvent` event handler.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Register the shared button handler once in your `OnPlayerUIButtonEvent` event.
4. Build UI elements using the `UI` namespace.
5. Use the returned objects to show/hide, reposition, mutate text/buttons, define onClick behavior, etc.
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { UI } from 'bf6-portal-utils/ui';

let testMenu: UI.Container | undefined;

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    if (!testMenu) {
        testMenu = new UI.Container({
            position: { x: 0, y: 0 },
            size: { width: 200, height: 300 },
            anchor: mod.UIAnchor.Center,
            receiver: eventPlayer,
            uiInputModeWhenVisible: true,
            childrenParams: [
                {
                    type: UI.TextButton,
                    position: { x: 0, y: 0 },
                    size: { width: 200, height: 50 },
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClick: async (player: mod.Player): Promise<void> => {
                        // Do something
                    },
                    message: mod.Message(mod.stringkeys.ui.buttons.option1),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UI.ChildParams<UI.TextButtonParams>,
                {
                    type: UI.TextButton,
                    position: { x: 0, y: 50 },
                    size: { width: 200, height: 50 },
                    anchor: mod.UIAnchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClick: async (player: mod.Player): Promise<void> => {
                        // Do something
                    },
                    message: mod.Message(mod.stringkeys.ui.buttons.option2),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UI.ChildParams<UI.TextButtonParams>,
                {
                    type: UI.TextButton,
                    position: { x: 0, y: 0 },
                    size: { width: 50, height: 50 },
                    anchor: mod.UIAnchor.BottomCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClick: async (player: mod.Player): Promise<void> => {
                        testMenu?.hide();
                    },
                    message: mod.Message(mod.stringkeys.ui.buttons.close),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UI.ChildParams<UI.TextButtonParams>,
            ],
            visible: true,
        });
    }

    while (true) {
        await mod.Wait(0.5);

        if (!mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsReloading)) continue;

        testMenu?.show();
    }
}

export async function OnPlayerUIButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent) {
    UI.handleButtonEvent(player, widget, event);
}
```

### Method Chaining Example

All setter methods return the instance, allowing you to chain multiple operations:

```ts
const button = new UI.Button({
    position: { x: 100, y: 200 },
    size: { width: 200, height: 50 },
    onClick: async (player) => {
        // Handle click
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
const text = new UI.Text({
    message: mod.Message('Hello'),
    position: { x: 0, y: 0 },
});

text.setMessage(mod.Message('Updated'))
    .setPosition({ x: 10, y: 20 })
    .setBgColor(UI.COLORS.WHITE)
    .setBgAlpha(0.5)
    .show();

// You can also use individual x, y, width, height properties
text.setX(10).setY(20).setWidth(100).setHeight(50).show();
```

### Parent-Child Management Example

Elements automatically manage parent-child relationships. When you create an element with a parent, move it between
parents, or delete it, the parent's `children` array is automatically updated:

```ts
// Create containers
const container1 = new UI.Container({ position: { x: 0, y: 0 }, size: { width: 200, height: 200 } });
const container2 = new UI.Container({ position: { x: 200, y: 0 }, size: { width: 200, height: 200 } });

// Create a text element as a child of container1
const text = new UI.Text({
    message: mod.Message('Hello'),
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

---

## Core Concepts

- **`UI` namespace** – A namespace that wraps `mod.*` UI functions and keeps track of active buttons/handlers.
- **`UI.Node` base class** – All UI nodes (root, containers, text, buttons) extend this class and have `name`,
  `uiWidget`, and `receiver` getters. Use `instanceof` to check node types (e.g., `element instanceof UI.Container`).
- **`UI.Parent` interface** – Interface implemented by nodes that can have children (`Root` and `Container`). Provides
  `children`, `attachChild()`, and `detachChild()` methods for managing parent-child relationships.
- **`UI.Root` class** – The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance
  available as `UI.ROOT_NODE`. All elements default to this parent unless you supply `parent` in params.
- **`UI.Element` base class** – Abstract base class that all created elements extend. Provides getters/setters for
  common properties (position, size, visibility, colors, etc.) with method chaining support. All property values are
  stored internally for fast retrieval without relying on `mod` namespace calls. Elements automatically manage
  parent-child relationships when created, moved, or deleted. Includes direct properties for `x`, `y`, `width`,
  `height`, and `uiInputModeWhenVisible`.
- **`UI.Container`, `UI.Text`, `UI.Button`, `UI.TextButton` classes** – Concrete classes that extend `Element` and
  provide type-specific functionality. All setters return the instance for method chaining (fluent interface).
- **Default colors** – `UI.COLORS` wraps common `mod.CreateVector(r, g, b)` presets so you rarely need to build vectors
  yourself. It includes BF palette colors.
- **Receiver routing** – All elements can specify a `receiver` property (`mod.Player | mod.Team`) in their constructor
  parameters to display UI to a specific audience. When omitted, elements inherit their parent's receiver (or use global
  if parent is `UI.ROOT_NODE`). The `receiver` property (type `GlobalReceiver | TeamReceiver | PlayerReceiver`) is
  available as a read-only property on `Node` (inherited by `Element`). To get the native receiver
  (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`. Console warnings are displayed if an
  element's receiver is incompatible with its parent's receiver.
- **Method chaining** – All setter methods (e.g., `setPosition()`, `setSize()`, `setX()`, `setY()`, `show()`, `hide()`)
  return the instance, allowing you to chain multiple operations:
  `container.setPosition({ x: 10, y: 20 }).setSize({ width: 100, height: 50 }).show()`.
- **Parent-child management** – When elements are created with a parent, moved between parents, or deleted, the parent's
  `children` array is automatically maintained. The `parent` property must be either `UI.Root` or `UI.Container` (not
  native `mod.UIWidget`). Containers track their children, and calling `delete()` on an element automatically removes it
  from its parent's children list and deletes all child elements recursively.
- **Position and Size parameters** – Constructor parameters support either `x`/`y` or `position` (mutually exclusive),
  and either `width`/`height` or `size` (mutually exclusive). All elements expose `x`, `y`, `width`, `height`,
  `position`, and `size` as properties with getters/setters.
- **ChildParams type** – The `ChildParams<T extends ElementParams>` type allows you to specify child elements in
  `childrenParams` by passing the class constructor as the `type` property. This enables type-safe child definitions and
  paves the way for custom UI elements. The type parameter must extend `ElementParams`.

---

## API Reference

### `UI.COLORS`

Prebuilt `mod.Vector` colors for basic colors and BF6 palette colors.

### `UI.ROOT_NODE`

The root node wrapping `mod.GetUIRoot()`. All elements default to this parent unless you supply `parent` in params.

### `abstract class UI.Element extends UI.Node`

Abstract base class for all UI elements (containers, text, buttons). Provides common properties and methods with
getter/setter pairs and method chaining support. All property values are stored internally for fast retrieval.

#### Properties & Methods (Inherited by `Container`, `Text`, and `Button`)

**From `UI.Node`:**

- **`name: string`** (getter) – The widget name.
- **`uiWidget: mod.UIWidget`** (getter) – The underlying UI widget.
- **`receiver: GlobalReceiver | TeamReceiver | PlayerReceiver`** (getter) – The target audience receiver for this
  element (read-only). Elements inherit their parent's receiver unless explicitly specified in constructor parameters.
  To get the native receiver (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`.

**Element-specific:**

- **`parent: UI.Parent`** (getter/setter) – The parent node (must be `UI.Root` or `UI.Container`). Setting the parent
  automatically adds this element to the new parent's children and removes it from the old parent's children.
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
- **`padding: number`** (getter/setter) – Padding value.
- **`setPadding(padding: number): Element`** – Sets padding and returns `this` for method chaining.
- **`depth: mod.UIDepth`** (getter/setter) – Z-order depth.
- **`setDepth(depth: mod.UIDepth): Element`** – Sets depth and returns `this` for method chaining.

**UI Input Mode Management:**

- **`uiInputModeWhenVisible: boolean`** (getter/setter) – When enabled, automatically requests UI input mode from the
  element's receiver when the element becomes visible, and releases the request when hidden or deleted. Multiple
  elements can request input mode from the same receiver; input mode is only disabled when all requesters are hidden or
  deleted.
- **`setUiInputModeWhenVisible(newValue: boolean): Element`** – Sets the UI input mode when visible behavior and returns
  `this` for method chaining.

**Lifecycle:**

- **`delete(): void`** – Deletes the widget from Battlefield Portal and automatically removes it from its parent's
  children list. Does not return `this` (element is destroyed).

**Method Chaining Example:**

All properties support both normal setter syntax and method chaining:

```ts
const container = new UI.Container({
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

### `class UI.Container extends UI.Element`

Creates a container (`mod.AddUIContainer`) and any nested children defined via `childrenParams`.

#### Constructor Parameters

| Param                    | Type / Default                          | Notes                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `x`, `y`                 | `number = 0`                            | Position relative to `anchor`. Mutually exclusive with `position`.                                                                                                                                     |
| `position`               | `UI.Position \| undefined`              | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                                                                               |
| `width`, `height`        | `number = 0`                            | Size in screen units. Mutually exclusive with `size`.                                                                                                                                                  |
| `size`                   | `UI.Size \| undefined`                  | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                                                                                 |
| `anchor`                 | `mod.UIAnchor = mod.UIAnchor.Center`    | See `mod/index.d.ts` for enum values.                                                                                                                                                                  |
| `parent`                 | `UI.Parent \| undefined`                | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                                                                            |
| `visible`                | `boolean = true`                        | Initial visibility.                                                                                                                                                                                    |
| `padding`                | `number = 0`                            | Container padding.                                                                                                                                                                                     |
| `bgColor`                | `mod.Vector = UI.COLORS.WHITE`          | Background color.                                                                                                                                                                                      |
| `bgAlpha`                | `number = 0`                            | Background opacity.                                                                                                                                                                                    |
| `bgFill`                 | `mod.UIBgFill = mod.UIBgFill.None`      | Fill mode.                                                                                                                                                                                             |
| `depth`                  | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order.                                                                                                                                                                                               |
| `receiver`               | `mod.Player \| mod.Team \| undefined`   | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers.                                              |
| `uiInputModeWhenVisible` | `boolean = false`                       | Automatically manage UI input mode based on visibility (see UI Input Mode Management section).                                                                                                         |
| `childrenParams`         | `Array<UI.ChildParams<any>> = []`       | Nested elements automatically receive this container as `parent`. Each child must have a `type` property set to the class constructor (e.g., `UI.Container`, `UI.Text`, `UI.Button`, `UI.TextButton`). |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see below), plus:

- **`children: Element[]`** – Array of child elements. Automatically maintained when children are created, moved, or
  deleted. Elements are automatically added when created with this container as their parent, and automatically removed
  when deleted or moved to another parent.

### `class UI.Text extends UI.Element`

Creates a text widget via `mod.AddUIText`.

#### Constructor Parameters

| Param                    | Type / Default                          | Notes                                                                                                                                                     |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`                 | `number = 0`                            | Position relative to `anchor`. Mutually exclusive with `position`.                                                                                        |
| `position`               | `UI.Position \| undefined`              | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                                  |
| `width`, `height`        | `number = 0`                            | Size in screen units. Mutually exclusive with `size`.                                                                                                     |
| `size`                   | `UI.Size \| undefined`                  | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                                    |
| `anchor`                 | `mod.UIAnchor = mod.UIAnchor.Center`    | See `mod/index.d.ts` for enum values.                                                                                                                     |
| `parent`                 | `UI.Parent \| undefined`                | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                               |
| `visible`                | `boolean = true`                        | Initial visibility.                                                                                                                                       |
| `padding`                | `number = 0`                            | Container padding.                                                                                                                                        |
| `bgColor`                | `mod.Vector = UI.COLORS.WHITE`          | Background color.                                                                                                                                         |
| `bgAlpha`                | `number = 0`                            | Background opacity.                                                                                                                                       |
| `bgFill`                 | `mod.UIBgFill = mod.UIBgFill.None`      | Fill mode.                                                                                                                                                |
| `depth`                  | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order.                                                                                                                                                  |
| `receiver`               | `mod.Player \| mod.Team \| undefined`   | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false`                       | Automatically manage UI input mode based on visibility (see UI Input Mode Management section).                                                            |
| `message`                | `mod.Message`                           | **Required.** Text label content (see `mod/index.d.ts` for message helpers). Note: `mod.Message` is opaque and cannot be unpacked into a string.          |
| `textSize`               | `number = 36`                           | Font size.                                                                                                                                                |
| `textColor`              | `mod.Vector = UI.COLORS.BLACK`          | Text color.                                                                                                                                               |
| `textAlpha`              | `number = 1`                            | Text opacity.                                                                                                                                             |
| `textAnchor`             | `mod.UIAnchor = mod.UIAnchor.Center`    | Alignment inside the text widget.                                                                                                                         |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see above), plus:

- **`message: mod.Message`** (getter/setter) – The text content. Use the setter to update the message. Note:
  `mod.Message` is opaque and cannot be unpacked into a string.
- **`setMessage(message: mod.Message): Text`** – Sets the message and returns `this` for method chaining.
- **`textSize: number`** (getter/setter) – Font size.
- **`setTextSize(size: number): Text`** – Sets font size and returns `this` for method chaining.
- **`textColor: mod.Vector`** (getter/setter) – Text color.
- **`setTextColor(color: mod.Vector): Text`** – Sets text color and returns `this` for method chaining.
- **`textAlpha: number`** (getter/setter) – Text opacity.
- **`setTextAlpha(alpha: number): Text`** – Sets text opacity and returns `this` for method chaining.
- **`textAnchor: mod.UIAnchor`** (getter/setter) – Alignment inside the text widget.
- **`setTextAnchor(anchor: mod.UIAnchor): Text`** – Sets text anchor and returns `this` for method chaining.

### `class UI.Button extends UI.Element`

Creates a button widget via `mod.AddUIButton`.

#### Constructor Parameters

| Param                    | Type / Default                                       | Notes                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`                 | `number = 0`                                         | Position relative to `anchor`. Mutually exclusive with `position`.                                                                                        |
| `position`               | `UI.Position \| undefined`                           | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                                  |
| `width`, `height`        | `number = 0`                                         | Size in screen units. Mutually exclusive with `size`.                                                                                                     |
| `size`                   | `UI.Size \| undefined`                               | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                                    |
| `anchor`                 | `mod.UIAnchor = mod.UIAnchor.Center`                 | See `mod/index.d.ts` for enum values.                                                                                                                     |
| `parent`                 | `UI.Parent \| undefined`                             | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                               |
| `visible`                | `boolean = true`                                     | Initial visibility.                                                                                                                                       |
| `padding`                | `number = 0`                                         | Container padding.                                                                                                                                        |
| `bgColor`                | `mod.Vector = UI.COLORS.WHITE`                       | Button background color.                                                                                                                                  |
| `bgAlpha`                | `number = 1`                                         | Button background opacity.                                                                                                                                |
| `bgFill`                 | `mod.UIBgFill = mod.UIBgFill.Solid`                  | Button fill mode.                                                                                                                                         |
| `depth`                  | `mod.UIDepth = mod.UIDepth.AboveGameUI`              | Z-order.                                                                                                                                                  |
| `receiver`               | `mod.Player \| mod.Team \| undefined`                | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false`                                    | Automatically manage UI input mode based on visibility (see UI Input Mode Management section).                                                            |
| `buttonEnabled`          | `boolean = true`                                     | Initial enabled state.                                                                                                                                    |
| `baseColor`              | `mod.Vector = UI.COLORS.BF_GREY_2`                   | Base button color.                                                                                                                                        |
| `baseAlpha`              | `number = 1`                                         | Base button opacity.                                                                                                                                      |
| `disabledColor`          | `mod.Vector = UI.COLORS.BF_GREY_3`                   | Disabled state color.                                                                                                                                     |
| `disabledAlpha`          | `number = 1`                                         | Disabled state opacity.                                                                                                                                   |
| `pressedColor`           | `mod.Vector = UI.COLORS.BF_GREEN_BRIGHT`             | Pressed state color.                                                                                                                                      |
| `pressedAlpha`           | `number = 1`                                         | Pressed state opacity.                                                                                                                                    |
| `hoverColor`             | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Hover state color.                                                                                                                                        |
| `hoverAlpha`             | `number = 1`                                         | Hover state opacity.                                                                                                                                      |
| `focusedColor`           | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Focused state color.                                                                                                                                      |
| `focusedAlpha`           | `number = 1`                                         | Focused state opacity.                                                                                                                                    |
| `onClick`                | `(player: mod.Player) => Promise<void> \| undefined` | Click handler stored in the button instance.                                                                                                              |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see above), plus:

- **`enabled: boolean`** (getter/setter) – Button enabled state.
- **`setEnabled(enabled: boolean): Button`** – Sets enabled state and returns `this` for method chaining.
- **`onClick: ((player: mod.Player) => Promise<void>) | undefined`** (getter/setter) – Click handler.
- **`setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): Button`** – Sets click handler and
  returns `this` for method chaining.

**Color & Alpha Getters/Setters** (all support method chaining):

- **`baseColor`, `disabledColor`, `focusedColor`, `hoverColor`, `pressedColor: mod.Vector`** (getter/setter)
- **`setBaseColor(color)`, `setDisabledColor(color)`, `setFocusedColor(color)`, `setHoverColor(color)`,
  `setPressedColor(color): Button`**
- **`baseAlpha`, `disabledAlpha`, `focusedAlpha`, `hoverAlpha`, `pressedAlpha: number`** (getter/setter)
- **`setBaseAlpha(alpha)`, `setDisabledAlpha(alpha)`, `setFocusedAlpha(alpha)`, `setHoverAlpha(alpha)`,
  `setPressedAlpha(alpha): Button`**

### `class UI.TextButton extends UI.Element`

A button with integrated text content. Extends `BaseButtonWithContent` and combines `Button` and `Text` functionality
into a single element. The button and text are wrapped in a container, and properties are delegated appropriately.

#### Constructor Parameters

| Param                                        | Type / Default                       | Notes                                                                                                 |
| -------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| All parameters from `UI.ButtonParams`, plus: |
| `message`                                    | `mod.Message`                        | **Required.** Text label content. Note: `mod.Message` is opaque and cannot be unpacked into a string. |
| `textSize`                                   | `number = 36`                        | Font size.                                                                                            |
| `textColor`                                  | `mod.Vector = UI.COLORS.BLACK`       | Text color.                                                                                           |
| `textAlpha`                                  | `number = 1`                         | Text opacity.                                                                                         |
| `textAnchor`                                 | `mod.UIAnchor = mod.UIAnchor.Center` | Alignment inside the text widget.                                                                     |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` and delegates button and text properties:

**Button properties** (delegated from internal `Button`):

- All button color, alpha, enabled, onClick, bgColor, bgAlpha, and bgFill properties (see `UI.Button` above)

**Text properties** (delegated from internal `Text`):

- **`message: mod.Message`** (getter/setter) – The text content.
- **`setMessage(message: mod.Message): TextButton`** – Sets the message and returns `this` for method chaining.
- **`textSize: number`** (getter/setter) – Font size.
- **`setTextSize(size: number): TextButton`** – Sets font size and returns `this` for method chaining.
- **`textColor: mod.Vector`** (getter/setter) – Text color.
- **`setTextColor(color: mod.Vector): TextButton`** – Sets text color and returns `this` for method chaining.
- **`textAlpha: number`** (getter/setter) – Text opacity.
- **`setTextAlpha(alpha: number): TextButton`** – Sets text opacity and returns `this` for method chaining.
- **`textAnchor: mod.UIAnchor`** (getter/setter) – Alignment inside the text widget.
- **`setTextAnchor(anchor: mod.UIAnchor): TextButton`** – Sets text anchor and returns `this` for method chaining.

**Overrides:**

- **`width: number`** (getter/setter) – Setting width also updates the button widget and text width.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and text height.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and text size.
- **`setSize(params: UI.Size): TextButton`** – Sets size for container, button, and text, returns `this`.

### `UI.handleButtonEvent(player, widget, event)`

Utility callback meant to be used in the `OnPlayerUIButtonEvent` handler for global subscriptions. Ignores `event` (the
Battlefield Portal `mod.UIButtonEvent` is currently unreliable) and resolves the registered `onClick` handler from the
button instance. Note: This function does not return a Promise; it handles errors internally.

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

### `UI.ChildParams<T extends ElementParams>`

Generic type for child element parameters in `childrenParams`. The type parameter must extend `ElementParams`. The
`type` property must be set to the class constructor.

```ts
type ChildParams<T extends ElementParams> = T & {
    type: new (params: T, receiver?: mod.Player | mod.Team) => Element;
};
```

Example usage:

```ts
{
    type: UI.Text,
    message: mod.Message('Hello'),
    position: { x: 0, y: 0 },
}
```

### `UI.Node`

Base class for all UI nodes. Provides:

- `name: string` (getter) – The widget name
- `uiWidget: mod.UIWidget` (getter) – The underlying UI widget
- `receiver: GlobalReceiver | TeamReceiver | PlayerReceiver` (getter) – The target audience receiver (read-only). To get
  the native receiver (`mod.Player | mod.Team | undefined`), access `receiver.nativeReceiver`.

Use `instanceof` to check node types at runtime (e.g., `node instanceof UI.Container`).

### `UI.Parent` (interface)

Interface implemented by nodes that can have children. Implemented by `Root` and `Container`. Custom UI elements can
implement this interface to accept children.

- `name: string` (getter) – The widget name
- `uiWidget: mod.UIWidget` (getter) – The underlying UI widget
- `receiver: GlobalReceiver | TeamReceiver | PlayerReceiver` (getter) – The receiver for this parent
- `children: Element[]` (getter) – Array of child elements
- `attachChild(child: Element): void` – Adds a child to this parent (called automatically when elements are created or
  moved).
- `detachChild(child: Element): void` – Removes a child from this parent (called automatically when elements are moved
  or deleted).

### `UI.Root extends UI.Node implements UI.Parent`

The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance available as `UI.ROOT_NODE`.
All elements default to this parent unless you supply `parent` in params. Implements `Parent` interface to manage
top-level children.

### `abstract class UI.Element extends UI.Node`

Abstract base class for all created widgets. Extends `Node` and provides all the properties and methods documented in
the `UI.Element` API section above. All property values are stored internally for fast retrieval. Automatically manages
parent-child relationships: when created, it's added to its parent's children; when the parent is changed, it's moved
between parents' children lists; when deleted, it's removed from its parent's children.

### `UI.Container extends UI.Element implements UI.Parent`

Class for container widgets. Extends `Element` and implements `Parent`. Adds:

- `children: Element[]` (getter) – Array of child elements, automatically maintained
- `delete(): void` – Overrides `Element.delete()` to recursively delete all children before deleting the container

### `UI.Text extends UI.Element`

Class for text widgets. Extends `Element` and adds:

- `message: mod.Message` (getter/setter) – Note: `mod.Message` is opaque and cannot be unpacked into a string
- `setMessage(message: mod.Message): Text` (method chaining)
- `textSize: number` (getter/setter)
- `setTextSize(size: number): Text` (method chaining)
- `textColor: mod.Vector` (getter/setter)
- `setTextColor(color: mod.Vector): Text` (method chaining)
- `textAlpha: number` (getter/setter)
- `setTextAlpha(alpha: number): Text` (method chaining)
- `textAnchor: mod.UIAnchor` (getter/setter)
- `setTextAnchor(anchor: mod.UIAnchor): Text` (method chaining)

### `UI.Button extends UI.Element`

Class for button widgets. Extends `Element` and adds:

- `enabled: boolean` (getter/setter)
- `setEnabled(enabled: boolean): Button` (method chaining)
- `onClick: ((player: mod.Player) => Promise<void>) | undefined` (getter/setter)
- `setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): Button` (method chaining)
- Color getters/setters: `baseColor`, `disabledColor`, `focusedColor`, `hoverColor`, `pressedColor`
- Color setter methods: `setBaseColor()`, `setDisabledColor()`, `setFocusedColor()`, `setHoverColor()`,
  `setPressedColor()` (all return `Button`)
- Alpha getters/setters: `baseAlpha`, `disabledAlpha`, `focusedAlpha`, `hoverAlpha`, `pressedAlpha`
- Alpha setter methods: `setBaseAlpha()`, `setDisabledAlpha()`, `setFocusedAlpha()`, `setHoverAlpha()`,
  `setPressedAlpha()` (all return `Button`)
- `delete(): void` – Overrides `Element.delete()` to clean up button references before deleting the button

### `UI.TextButton extends UI.Element`

Class for buttons with integrated text content. Extends `BaseButtonWithContent` and combines `Button` and `Text`
functionality. Delegates properties from both the internal button and text elements. See the `UI.TextButton` API section
above for details.

### `UI.BaseParams`

Base interface for common properties reused by other parameter interfaces.

```ts
type BaseParams = {
    anchor?: mod.UIAnchor;
    parent?: Parent;
    visible?: boolean;
    padding?: number;
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

### `UI.ContainerParams extends ElementParams`

```ts
type ContainerParams = ElementParams & {
    childrenParams?: ChildParams<any>[];
};
```

### `UI.TextParams extends ElementParams`

```ts
type TextParams = ElementParams & {
    message: mod.Message; // Required (no default)
    textSize?: number; // Default: 36
    textColor?: mod.Vector; // Default: UI.COLORS.BLACK
    textAlpha?: number; // Default: 1
    textAnchor?: mod.UIAnchor; // Default: mod.UIAnchor.Center
};
```

### `UI.ButtonParams extends ElementParams`

```ts
type ButtonParams = ElementParams & {
    buttonEnabled?: boolean; // Default: true
    baseColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_2
    baseAlpha?: number; // Default: 1
    disabledColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_3
    disabledAlpha?: number; // Default: 1
    pressedColor?: mod.Vector; // Default: UI.COLORS.BF_GREEN_BRIGHT
    pressedAlpha?: number; // Default: 1
    hoverColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_1
    hoverAlpha?: number; // Default: 1
    focusedColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_1
    focusedAlpha?: number; // Default: 1
    onClick?: (player: mod.Player) => Promise<void>;
};
```

### `UI.TextButtonParams extends ButtonParams`

```ts
type TextButtonParams = ButtonParams & {
    message: mod.Message; // Required (no default)
    textSize?: number; // Default: 36
    textColor?: mod.Vector; // Default: UI.COLORS.BLACK
    textAlpha?: number; // Default: 1
    textAnchor?: mod.UIAnchor; // Default: mod.UIAnchor.Center
};
```

---

## UI Input Mode Management

The `uiInputModeWhenVisible` property provides automatic management of UI input mode, eliminating the need to manually
call `mod.EnableUIInputMode` in most cases. When enabled on an element, the UI module automatically handles enabling and
disabling UI input mode based on the element's visibility state.

### How It Works

- **Request-based system**: When `uiInputModeWhenVisible` is `true` and an element becomes visible, it registers as a
  "requester" with its receiver (global, team, or player). The receiver tracks all active requesters.
- **Automatic enable/disable**: UI input mode is enabled when the first requester becomes visible and disabled only when
  the last requester becomes hidden or deleted. This ensures that multiple interactive elements can share the same
  receiver without conflicts.
- **Receiver-aware**: The system is aware of each element's receiver and only toggles `mod.EnableUIInputMode` for the
  relevant scope. Elements with global receivers enable UI input mode globally, elements with team receivers enable it
  for that team, and elements with player receivers enable it for that player.
- **Lifecycle management**: Requests are automatically released when elements are hidden, deleted, or when
  `uiInputModeWhenVisible` is changed from `true` to `false` (if the element is currently visible). When a visible
  element's `uiInputModeWhenVisible` property is set from `true` to `false`, it releases the UI input mode request from
  its receiver.

### Benefits

1. **Cleaner code**: No need to manually track which elements are visible and manage `mod.EnableUIInputMode` calls.
2. **Error prevention**: Prevents common bugs like disabling UI input mode too early (before all interactive elements
   are hidden) or forgetting to enable/disable it.
3. **Multiple elements support**: Multiple interactive elements can safely share the same receiver—UI input mode stays
   enabled as long as any element is visible.
4. **Automatic cleanup**: When elements are deleted, their requests are automatically released.

### Usage Example

```ts
// Create a menu with interactive buttons
const menu = new UI.Container({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 400 },
    receiver: player,
    uiInputModeWhenVisible: true, // Enable automatic UI input mode management
    childrenParams: [
        {
            type: UI.TextButton,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
            message: mod.Message('Button 1'),
            onClick: async (p) => {
                // Handle click
            },
        } as UI.ChildParams<UI.TextButtonParams>,
        {
            type: UI.TextButton,
            position: { x: 0, y: 60 },
            size: { width: 200, height: 50 },
            message: mod.Message('Button 2'),
            onClick: async (p) => {
                // Handle click
            },
        } as UI.ChildParams<UI.TextButtonParams>,
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

### When to Use

- **Enable `uiInputModeWhenVisible`** only on elements that you actually intend to toggle between visible and not
  visible. For example, if you have a container with 4 buttons and only the container's visibility will change, set
  `uiInputModeWhenVisible: true` only on the container, not on the individual buttons.
- **Disable `uiInputModeWhenVisible`** (default) for elements that won't have their visibility toggled, or when you
  prefer to manage UI input mode manually (not recommended).
- For complex UIs with multiple interactive sections, you can enable it on parent containers to manage input mode for
  entire UI hierarchies.

### Notes

- The default value is `false`. Enable it explicitly when needed.
- The property can be changed at runtime via the getter/setter or `setUiInputModeWhenVisible()` method.
- The system may not work correctly if you try to manually enable or disable UI input mode with `mod.EnableUIInputMode`
  in any scope, since there is no way to query the runtime to determine the current UI input mode state. It's best to
  let the UI system handle it entirely. Alternatively, you can choose to handle UI input mode entirely yourself, as long
  as you do not have any elements with `uiInputModeWhenVisible` enabled.
- Elements inherit their receiver from their parent, so UI input mode management respects the receiver hierarchy.

---

## Event Wiring & Lifecycle

- Register `UI.handleButtonEvent` once per mod to dispatch button presses.
- Use the returned `Element` helpers to hide/show instead of calling `mod.SetUIWidgetVisible` manually.
- All properties support both normal setter syntax (e.g., `element.bgAlpha = 0.8;`) and method chaining (e.g.,
  `element.setBgAlpha(0.8).show()`). Method chaining is useful when you want to apply multiple changes in sequence.
- Always call `delete()` when removing widgets to prevent stale references inside Battlefield Portal. The element will
  automatically be removed from its parent's `children` array. For containers, `delete()` recursively deletes all
  children before deleting the container itself.
- The `parent` property in parameter interfaces must be a `UI.Parent` (i.e., `UI.Root` or `UI.Container`). Parent-child
  relationships are automatically managed.
- **Parent-child relationships** are automatically maintained:
    - When an element is created with a parent, it's automatically added to the parent's `children` array via
      `attachChild()`.
    - When an element's `parent` is changed (via setter or `setParent()`), it's removed from the old parent's children
      via `detachChild()` and added to the new parent's children via `attachChild()`.
    - When an element is deleted, it's automatically removed from its parent's `children` array via `detachChild()`.
- **Receiver inheritance**: Elements inherit their parent's receiver unless explicitly specified in constructor
  parameters. Console warnings are displayed if an element's receiver is incompatible with its parent's receiver.

---

## Future Work

The following features are planned for upcoming releases:

### Image Widget Support

Support for `UIImage` and `UIWeaponImage` widget types will be added, providing classes similar to `Container`, `Text`,
and `Button` for displaying images and weapon icons in the UI. These will follow the same patterns as existing elements
and can be used in `childrenParams` with the `ChildParams` type.

### Custom UI Elements

The `ChildParams<T>` type and `Parent` interface architecture enables developers to create custom UI elements (like
checkboxes, dropdowns, clocks, progress bars, etc.) that integrate seamlessly with the existing UI system. Custom
elements must extend `Element` and can be used in `childrenParams` by passing the class constructor as the `type`
property.

### Scoped Receiver Inheritance

Support for parent containers with a different receiver scope than their children. For example, a container created for
a team (via `receiver: mod.Team`) can have child elements that are scoped to individual players. This may allow for more
flexible UI hierarchies where shared containers can contain player-specific elements.

### Auto-Rename UI Widgets

Support for auto-renaming a UIWidget when it moves from one parent to another, in order to keep name consistency. Names
are mostly irrelevant to the developer/player, so this is very low priority.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.
- Battlefield Builder docs – For runtime UI limitations (widget limits, anchor behavior, etc.).

---

## Feedback & Support

This helper library is under active development. Feature requests, bug reports, usage questions, or general ideas are
always welcome—open an issue or reach out and they’ll be triaged quickly so you can keep shipping Portal experiences
without waiting on tooling updates.
