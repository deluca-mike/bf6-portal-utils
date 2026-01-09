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
3. **Button handler** – Register `UI.handleButtonClick` in your `OnPlayerUIButtonEvent` event handler.

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
    mod.EnableUIInputMode(true, eventPlayer);

    if (!testMenu) {
        testMenu = new UI.Container(
            {
                position: { x: 0, y: 0 },
                size: { width: 200, height: 300 },
                anchor: mod.UIAnchor.Center,
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
                    } as ChildParams<TextButtonParams>,
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
                    } as ChildParams<TextButtonParams>,
                    {
                        type: UI.TextButton,
                        position: { x: 0, y: 0 },
                        size: { width: 50, height: 50 },
                        anchor: mod.UIAnchor.BottomCenter,
                        bgColor: UI.COLORS.GREY_25,
                        baseColor: UI.COLORS.BLACK,
                        onClick: async (player: mod.Player): Promise<void> => {
                            mod.EnableUIInputMode(false, player);
                            testMenu?.hide();
                        },
                        message: mod.Message(mod.stringkeys.ui.buttons.close),
                        textSize: 36,
                        textColor: UI.COLORS.WHITE,
                    } as ChildParams<TextButtonParams>,
                ],
                visible: true,
            },
            eventPlayer
        );
    }

    while (true) {
        await mod.Wait(0.5);

        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsReloading)) continue;

        testMenu?.show();

        mod.EnableUIInputMode(true, player);
    }
}

export async function OnPlayerUIButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent) {
    UI.handleButtonClick(player, widget, event);
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
    .setColorBase(UI.COLORS.BLUE)
    .setAlphaBase(0.9)
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
- **`UI.Node` base class** – All UI nodes (root, containers, text, buttons) extend this class and have `name` and
  `uiWidget` getters. Use `instanceof` to check node types (e.g., `element instanceof UI.Container`).
- **`UI.Parent` interface** – Interface implemented by nodes that can have children (`Root` and `Container`). Provides
  `children`, `attachChild()`, and `detachChild()` methods for managing parent-child relationships.
- **`UI.Root` class** – The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance
  available as `UI.ROOT_NODE`. All elements default to this parent unless you supply `parent` in params.
- **`UI.Element` base class** – All created elements extend `Node` and provide getters/setters for common properties
  (position, size, visibility, colors, etc.) with method chaining support. Elements automatically manage parent-child
  relationships when created, moved, or deleted. Includes direct properties for `x`, `y`, `width`, `height`, and
  `receiver` (read-only).
- **`UI.Container`, `UI.Text`, `UI.Button`, `UI.TextButton` classes** – Concrete classes that extend `Element` and
  provide type-specific functionality. All setters return the instance for method chaining (fluent interface).
- **Default colors** – `UI.COLORS` wraps common `mod.CreateVector(r, g, b)` presets so you rarely need to build vectors
  yourself. It includes BF palette colors.
- **Receiver routing** – `Container`, `Text`, `Button`, and `TextButton` constructors optionally accept
  `mod.Player | mod.Team` as a second parameter to display UI to a specific audience. When omitted, the widgets are
  global. The `receiver` is available as a read-only property on `Element`.
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
- **ChildParams type** – The `ChildParams<T>` type allows you to specify child elements in `childrenParams` by passing
  the class constructor as the `type` property. This enables type-safe child definitions and paves the way for custom UI
  elements.

---

## API Reference

### `UI.COLORS`

Prebuilt `mod.Vector` colors for basic colors and BF6 palette colors.

### `UI.ROOT_NODE`

The root node wrapping `mod.GetUIRoot()`. All elements default to this parent unless you supply `parent` in params.

### `class UI.Element extends UI.Node`

Base class for all UI elements (containers, text, buttons). Provides common properties and methods with getter/setter
pairs and method chaining support.

#### Properties & Methods (Inherited by `Container`, `Text`, and `Button`)

**From `UI.Node`:**

- **`name: string`** (getter) – The widget name.
- **`uiWidget: mod.UIWidget`** (getter) – The underlying UI widget.

**Element-specific:**

- **`parent: UI.Root | UI.Container`** (getter/setter) – The parent node (must be `UI.Root` or `UI.Container`). Setting
  the parent automatically adds this element to the new parent's children and removes it from the old parent's children.
- **`setParent(parent: UI.Root | UI.Container): Element`** – Sets the parent and returns `this` for method chaining.
- **`receiver: mod.Player | mod.Team | undefined`** (getter) – The target audience for this element (read-only).

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

| Param             | Type / Default                          | Notes                                                                                                                                                                                                  |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | `string \| undefined`                   | Auto-generated names follow `<PARENT_NAME>_<RECEIVER_ID_IF_PROVIDED>_<INCREMENTING_NUMBER>` when omitted.                                                                                              |
| `x`, `y`          | `number = 0`                            | Position relative to `anchor`. Mutually exclusive with `position`.                                                                                                                                     |
| `position`        | `UI.Position \| undefined`              | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                                                                               |
| `width`, `height` | `number = 0`                            | Size in screen units. Mutually exclusive with `size`.                                                                                                                                                  |
| `size`            | `UI.Size \| undefined`                  | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                                                                                 |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`    | See `mod/index.d.ts` for enum values.                                                                                                                                                                  |
| `parent`          | `UI.Root \| UI.Container \| undefined`  | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                                                                            |
| `visible`         | `boolean = true`                        | Initial visibility.                                                                                                                                                                                    |
| `padding`         | `number = 0`                            | Container padding.                                                                                                                                                                                     |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`          | Background color.                                                                                                                                                                                      |
| `bgAlpha`         | `number = 0`                            | Background opacity.                                                                                                                                                                                    |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.None`      | Fill mode.                                                                                                                                                                                             |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order.                                                                                                                                                                                               |
| `childrenParams`  | `Array<UI.ChildParams<any>> = []`       | Nested elements automatically receive this container as `parent`. Each child must have a `type` property set to the class constructor (e.g., `UI.Container`, `UI.Text`, `UI.Button`, `UI.TextButton`). |
| `receiver`        | `mod.Player \| mod.Team \| undefined`   | Optional second parameter. Target audience; defaults to global.                                                                                                                                        |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see below), plus:

- **`children: Element[]`** – Array of child elements. Automatically maintained when children are created, moved, or
  deleted. Elements are automatically added when created with this container as their parent, and automatically removed
  when deleted or moved to another parent.

### `class UI.Text extends UI.Element`

Creates a text widget via `mod.AddUIText`.

#### Constructor Parameters

| Param             | Type / Default                          | Notes                                                                                                                                            |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`            | `string \| undefined`                   | Auto-generated when omitted (see `Container` for naming pattern).                                                                                |
| `x`, `y`          | `number = 0`                            | Position relative to `anchor`. Mutually exclusive with `position`.                                                                               |
| `position`        | `UI.Position \| undefined`              | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                         |
| `width`, `height` | `number = 0`                            | Size in screen units. Mutually exclusive with `size`.                                                                                            |
| `size`            | `UI.Size \| undefined`                  | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                           |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`    | See `mod/index.d.ts` for enum values.                                                                                                            |
| `parent`          | `UI.Root \| UI.Container \| undefined`  | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                      |
| `visible`         | `boolean = true`                        | Initial visibility.                                                                                                                              |
| `padding`         | `number = 0`                            | Container padding.                                                                                                                               |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`          | Background color.                                                                                                                                |
| `bgAlpha`         | `number = 0`                            | Background opacity.                                                                                                                              |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.None`      | Fill mode.                                                                                                                                       |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order.                                                                                                                                         |
| `message`         | `mod.Message`                           | **Required.** Text label content (see `mod/index.d.ts` for message helpers). Note: `mod.Message` is opaque and cannot be unpacked into a string. |
| `textSize`        | `number = 36`                           | Font size.                                                                                                                                       |
| `textColor`       | `mod.Vector = UI.COLORS.BLACK`          | Text color.                                                                                                                                      |
| `textAlpha`       | `number = 1`                            | Text opacity.                                                                                                                                    |
| `textAnchor`      | `mod.UIAnchor = mod.UIAnchor.Center`    | Alignment inside the text widget.                                                                                                                |
| `receiver`        | `mod.Player \| mod.Team \| undefined`   | Optional second parameter. Target audience; defaults to global.                                                                                  |

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

| Param             | Type / Default                                       | Notes                                                                                                       |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `name`            | `string \| undefined`                                | Auto-generated when omitted (see `Container` for naming pattern).                                           |
| `x`, `y`          | `number = 0`                                         | Position relative to `anchor`. Mutually exclusive with `position`.                                          |
| `position`        | `UI.Position \| undefined`                           | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                    |
| `width`, `height` | `number = 0`                                         | Size in screen units. Mutually exclusive with `size`.                                                       |
| `size`            | `UI.Size \| undefined`                               | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                      |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`                 | See `mod/index.d.ts` for enum values.                                                                       |
| `parent`          | `UI.Root \| UI.Container \| undefined`               | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed. |
| `visible`         | `boolean = true`                                     | Initial visibility.                                                                                         |
| `padding`         | `number = 0`                                         | Container padding.                                                                                          |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`                       | Button background color.                                                                                    |
| `bgAlpha`         | `number = 1`                                         | Button background opacity.                                                                                  |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.Solid`                  | Button fill mode.                                                                                           |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI`              | Z-order.                                                                                                    |
| `buttonEnabled`   | `boolean = true`                                     | Initial enabled state.                                                                                      |
| `baseColor`       | `mod.Vector = UI.COLORS.BF_GREY_2`                   | Base button color.                                                                                          |
| `baseAlpha`       | `number = 1`                                         | Base button opacity.                                                                                        |
| `disabledColor`   | `mod.Vector = UI.COLORS.BF_GREY_3`                   | Disabled state color.                                                                                       |
| `disabledAlpha`   | `number = 1`                                         | Disabled state opacity.                                                                                     |
| `pressedColor`    | `mod.Vector = UI.COLORS.BF_GREEN_BRIGHT`             | Pressed state color.                                                                                        |
| `pressedAlpha`    | `number = 1`                                         | Pressed state opacity.                                                                                      |
| `hoverColor`      | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Hover state color.                                                                                          |
| `hoverAlpha`      | `number = 1`                                         | Hover state opacity.                                                                                        |
| `focusedColor`    | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Focused state color.                                                                                        |
| `focusedAlpha`    | `number = 1`                                         | Focused state opacity.                                                                                      |
| `onClick`         | `(player: mod.Player) => Promise<void> \| undefined` | Click handler stored in `UI.CLICK_HANDLERS`.                                                                |
| `receiver`        | `mod.Player \| mod.Team \| undefined`                | Optional second parameter. Target audience; defaults to global.                                             |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see above), plus:

- **`enabled: boolean`** (getter/setter) – Button enabled state.
- **`setEnabled(enabled: boolean): Button`** – Sets enabled state and returns `this` for method chaining.
- **`onClick: ((player: mod.Player) => Promise<void>) | undefined`** (getter/setter) – Click handler.
- **`setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): Button`** – Sets click handler and
  returns `this` for method chaining.

**Color & Alpha Getters/Setters** (all support method chaining):

- **`colorBase`, `colorDisabled`, `colorFocused`, `colorHover`, `colorPressed: mod.Vector`** (getter/setter)
- **`setColorBase(color)`, `setColorDisabled(color)`, `setColorFocused(color)`, `setColorHover(color)`,
  `setColorPressed(color): Button`**
- **`alphaBase`, `alphaDisabled`, `alphaFocused`, `alphaHover`, `alphaPressed: number`** (getter/setter)
- **`setAlphaBase(alpha)`, `setAlphaDisabled(alpha)`, `setAlphaFocused(alpha)`, `setAlphaHover(alpha)`,
  `setAlphaPressed(alpha): Button`**

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

- All button color, alpha, enabled, and onClick properties (see `UI.Button` above)

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

- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and text size.
- **`setSize(params: UI.Size): TextButton`** – Sets size for container, button, and text, returns `this`.

### `UI.handleButtonClick(player, widget, event)`

Utility callback meant to be used in the `OnPlayerUIButtonEvent` handler for global subscriptions. Ignores `event` (the
Battlefield Portal `mod.UIButtonEvent` is currently unreliable) and resolves the registered `onClick` for the pressed
widget. Note: This function does not return a Promise; it handles errors internally.

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

### `UI.ChildParams<T>`

Generic type for child element parameters in `childrenParams`. The `type` property must be set to the class constructor.

```ts
type ChildParams<T> = T & {
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

Use `instanceof` to check node types at runtime (e.g., `node instanceof UI.Container`).

### `UI.Parent` (interface)

Interface implemented by nodes that can have children. Implemented by `Root` and `Container`.

- `children: Element[]` (getter) – Array of child elements
- `attachChild(child: Element): this` – Adds a child to this parent (called automatically when elements are created or
  moved).
- `detachChild(child: Element): this` – Removes a child from this parent (called automatically when elements are moved
  or deleted).

### `UI.Root extends UI.Node implements UI.Parent`

The root node wrapping `mod.GetUIRoot()`. Has a private constructor with a single instance available as `UI.ROOT_NODE`.
All elements default to this parent unless you supply `parent` in params. Implements `Parent` interface to manage
top-level children.

### `UI.Element extends UI.Node`

Base class for all created widgets. Extends `Node` and provides all the properties and methods documented in the
`UI.Element` API section above. Automatically manages parent-child relationships: when created, it's added to its
parent's children; when the parent is changed, it's moved between parents' children lists; when deleted, it's removed
from its parent's children.

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
- Color getters/setters: `colorBase`, `colorDisabled`, `colorFocused`, `colorHover`, `colorPressed`
- Color setter methods: `setColorBase()`, `setColorDisabled()`, `setColorFocused()`, `setColorHover()`,
  `setColorPressed()` (all return `Button`)
- Alpha getters/setters: `alphaBase`, `alphaDisabled`, `alphaFocused`, `alphaHover`, `alphaPressed`
- Alpha setter methods: `setAlphaBase()`, `setAlphaDisabled()`, `setAlphaFocused()`, `setAlphaHover()`,
  `setAlphaPressed()` (all return `Button`)
- `delete(): void` – Overrides `Element.delete()` to clean up click handlers before deleting the button

### `UI.TextButton extends UI.Element`

Class for buttons with integrated text content. Extends `BaseButtonWithContent` and combines `Button` and `Text`
functionality. Delegates properties from both the internal button and text elements. See the `UI.TextButton` API section
above for details.

### `UI.BaseParams`

Base interface for common properties reused by other parameter interfaces.

```ts
type BaseParams = {
    anchor?: mod.UIAnchor;
    parent?: Root | Container;
    visible?: boolean;
    padding?: number;
    bgColor?: mod.Vector;
    bgAlpha?: number;
    bgFill?: mod.UIBgFill;
    depth?: mod.UIDepth;
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

## Event Wiring & Lifecycle

- Register `UI.handleButtonClick` once per mod to dispatch button presses.
- Use the returned `Element` helpers to hide/show instead of calling `mod.SetUIWidgetVisible` manually.
- All properties support both normal setter syntax (e.g., `element.bgAlpha = 0.8;`) and method chaining (e.g.,
  `element.setBgAlpha(0.8).show()`). Method chaining is useful when you want to apply multiple changes in sequence.
- Always call `delete()` when removing widgets to prevent stale references inside Battlefield Portal. The element will
  automatically be removed from its parent's `children` array. For containers, `delete()` recursively deletes all
  children before deleting the container itself.
- The `parent` property in parameter interfaces must be either `UI.Root` or `UI.Container` (not native `mod.UIWidget`).
  Parent-child relationships are automatically managed.
- **Parent-child relationships** are automatically maintained:
    - When an element is created with a parent, it's automatically added to the parent's `children` array via
      `attachChild()`.
    - When an element's `parent` is changed (via setter or `setParent()`), it's removed from the old parent's children
      via `detachChild()` and added to the new parent's children via `attachChild()`.
    - When an element is deleted, it's automatically removed from its parent's `children` array via `detachChild()`.
- **Compatibility note:** This library is no longer compatible with native `mod.UIWidget` objects as parent parameters.
  If you must (not recommended), you can make `UI` elements children of native `mod.UIContainer` widgets (by using
  `mod.SetUIWidgetParent` on the `UI` element's `uiWidget`), but you should not make native `mod.UIWidget` widgets
  children of `UI` elements.

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

### UI Input Mode Management

Support for a centralized UI Input Mode getter and setter for whole server, team, and player to make it easier to
determine which entity is in UI Input Mode, and perhaps automatically enable UI input mode if any UI that can be
interacted with is visible.

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
