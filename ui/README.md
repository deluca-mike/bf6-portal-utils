# UI Module

This TypeScript `UI` namespace wraps Battlefield Portal's `mod` UI APIs with an object-oriented interface, providing strongly typed helpers, convenient defaults, and ergonomic getters/setters for building complex HUDs, panels, and interactive buttons.

> **Note**
> The `UI` namespace depends on the `mod` namespace (available in the `bf6-portal-mod-types` package). All types referenced below (`mod.UIWidget`, `mod.Vector`, `mod.UIAnchor`, etc.) are documented in that package.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining.
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
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

### Example

```ts
import { UI } from 'bf6-portal-utils/ui';

let testMenu: UI.Container | undefined;

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    mod.EnableUIInputMode(true, eventPlayer);

    if (!testMenu) {
        testMenu = new UI.Container(
            {
                x: 0,
                y: 0,
                width: 200,
                height: 300,
                anchor: mod.UIAnchor.Center,
                childrenParams: [
                    {
                        type: UI.Type.Button,
                        x: 0,
                        y: 0,
                        width: 200,
                        height: 50,
                        anchor: mod.UIAnchor.TopCenter,
                        bgColor: UI.COLORS.GREY_25,
                        baseColor: UI.COLORS.BLACK,
                        onClick: async (player: mod.Player): Promise<void> => {
                            // Do something
                        },
                        label: {
                            message: mod.Message(mod.stringkeys.ui.buttons.option1),
                            textSize: 36,
                            textColor: UI.COLORS.WHITE,
                        },
                    },
                    {
                        type: UI.Type.Button,
                        x: 0,
                        y: 50,
                        width: 200,
                        height: 50,
                        anchor: mod.UIAnchor.TopCenter,
                        bgColor: UI.COLORS.GREY_25,
                        baseColor: UI.COLORS.BLACK,
                        onClick: async (player: mod.Player): Promise<void> => {
                            // Do something
                        },
                        label: {
                            message: mod.Message(mod.stringkeys.ui.buttons.option2),
                            textSize: 36,
                            textColor: UI.COLORS.WHITE,
                        },
                    },
                    {
                        type: UI.Type.Button,
                        x: 0,
                        y: 0,
                        width: 50,
                        height: 50,
                        anchor: mod.UIAnchor.BottomCenter,
                        bgColor: UI.COLORS.GREY_25,
                        baseColor: UI.COLORS.BLACK,
                        onClick: async (player: mod.Player): Promise<void> => {
                            mod.EnableUIInputMode(false, player);
                            testMenu?.hide();
                        },
                        label: {
                            message: mod.Message(mod.stringkeys.ui.buttons.close),
                            textSize: 36,
                            textColor: UI.COLORS.WHITE,
                        },
                    },
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
    await UI.handleButtonClick(player, widget, event);
}
```

### Method Chaining Example

All setter methods return the instance, allowing you to chain multiple operations:

```ts
const button = new UI.Button({
    x: 100,
    y: 200,
    width: 200,
    height: 50,
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
    x: 0,
    y: 0,
});

text.setMessage(mod.Message('Updated'))
    .setPosition({ x: 10, y: 20 })
    .setBgColor(UI.COLORS.WHITE)
    .setBgAlpha(0.5)
    .show();
```

---

## Core Concepts

- **`UI` namespace** – A namespace that wraps `mod.*` UI functions and keeps track of active buttons/handlers.
- **`UI.Node` base class** – All UI nodes (root, containers, text, buttons) extend this class and have a `type`, `name`, and `uiWidget` getter.
- **`UI.Element` base class** – All created elements extend `Node` and provide getters/setters for common properties (position, size, visibility, colors, etc.) with method chaining support.
- **`UI.Container`, `UI.Text`, `UI.Button` classes** – Concrete classes that extend `Element` and provide type-specific functionality. All setters return the instance for method chaining (fluent interface).
- **Default colors** – `UI.COLORS` wraps common `mod.CreateVector(r, g, b)` presets so you rarely need to build vectors yourself. It includes BF palette colors.
- **Receiver routing** – `Container`, `Text`, and `Button` constructors optionally accept `mod.Player | mod.Team` as a second parameter to display UI to a specific audience. When omitted, the widgets are global.
- **Method chaining** – All setter methods (e.g., `setPosition()`, `setSize()`, `show()`, `hide()`) return the instance, allowing you to chain multiple operations: `container.setPosition({ x: 10, y: 20 }).setSize({ width: 100, height: 50 }).show()`.

---

## API Reference

### `UI.COLORS`

Prebuilt `mod.Vector` colors for basic colors and BF6 palette colors.

### `UI.ROOT_NODE`

The root node wrapping `mod.GetUIRoot()`. All elements default to this parent unless you supply `parent` in params.

### `class UI.Element extends UI.Node`

Base class for all UI elements (containers, text, buttons). Provides common properties and methods with getter/setter pairs and method chaining support.

#### Properties & Methods (Inherited by `Container`, `Text`, and `Button`)

**From `UI.Node`:**

- **`type: UI.Type`** (getter) – The node type (`Container`, `Text`, `Button`, etc.).
- **`name: string`** (getter) – The widget name.
- **`uiWidget: mod.UIWidget`** (getter) – The underlying UI widget.

**Element-specific:**

- **`parent: UI.Node`** (getter) – The parent node.

**Visibility:**

- **`visible: boolean`** (getter/setter) – Element visibility.
- **`setVisible(visible: boolean): Node`** – Sets visibility and returns `this` for method chaining.
- **`show(): Node`** – Shows the element and returns `this` for method chaining.
- **`hide(): Node`** – Hides the element and returns `this` for method chaining.
- **`toggle(): Node`** – Toggles visibility and returns `this` for method chaining.

**Position & Size:**

- **`position: { x: number; y: number }`** (getter/setter) – Element position.
- **`setPosition(params: { x: number; y: number }): Node`** – Sets position and returns `this` for method chaining.
- **`size: { width: number; height: number }`** (getter/setter) – Element size.
- **`setSize(params: { width: number; height: number }): Node`** – Sets size and returns `this` for method chaining.

**Background:**

- **`bgColor: mod.Vector`** (getter/setter) – Background color.
- **`setBgColor(color: mod.Vector): Node`** – Sets background color and returns `this` for method chaining.
- **`bgAlpha: number`** (getter/setter) – Background opacity (0-1).
- **`setBgAlpha(alpha: number): Node`** – Sets background opacity and returns `this` for method chaining.
- **`bgFill: mod.UIBgFill`** (getter/setter) – Background fill mode.
- **`setBgFill(fill: mod.UIBgFill): Node`** – Sets background fill mode and returns `this` for method chaining.

**Layout:**

- **`anchor: mod.UIAnchor`** (getter/setter) – Anchor point for positioning.
- **`setAnchor(anchor: mod.UIAnchor): Node`** – Sets anchor and returns `this` for method chaining.
- **`padding: number`** (getter/setter) – Padding value.
- **`setPadding(padding: number): Node`** – Sets padding and returns `this` for method chaining.
- **`depth: mod.UIDepth`** (getter/setter) – Z-order depth.
- **`setDepth(depth: mod.UIDepth): Node`** – Sets depth and returns `this` for method chaining.

**Lifecycle:**

- **`delete(): void`** – Deletes the widget from Battlefield Portal. Does not return `this` (element is destroyed).

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

| Param             | Type / Default                                              | Notes                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `string \| undefined`                                       | Auto-generated names follow `<PARENT_NAME>_<RECEIVER_ID_IF_PROVIDED>_<INCREMENTING_NUMBER>` when omitted.                                                                           |
| `x`, `y`          | `number = 0`                                                | Position relative to `anchor`.                                                                                                                                                      |
| `width`, `height` | `number = 0`                                                | Size in screen units.                                                                                                                                                               |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`                        | See `mod/index.d.ts` for enum values.                                                                                                                                               |
| `parent`          | `mod.UIWidget \| UI.Node \| undefined`                      | Parent widget or node. Defaults to `UI.ROOT_NODE` when omitted.                                                                                                                     |
| `visible`         | `boolean = true`                                            | Initial visibility.                                                                                                                                                                 |
| `padding`         | `number = 0`                                                | Container padding.                                                                                                                                                                  |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`                              | Background color.                                                                                                                                                                   |
| `bgAlpha`         | `number = 0`                                                | Background opacity.                                                                                                                                                                 |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.None`                          | Fill mode.                                                                                                                                                                          |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI`                     | Z-order.                                                                                                                                                                            |
| `childrenParams`  | `Array<ContainerParams \| TextParams \| ButtonParams> = []` | Nested elements automatically receive this container as `parent`. Note that a `type` of `UI.Type.Container`, `UI.Type.Text`, or `UI.Type.Button` is required for each child params. |
| `receiver`        | `mod.Player \| mod.Team \| undefined`                       | Optional second parameter. Target audience; defaults to global.                                                                                                                     |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see below), plus:

- **`children: (Container \| Text \| Button)[]`** – Read-only array of child elements created from `childrenParams`.

### `class UI.Text extends UI.Element`

Creates a text widget via `mod.AddUIText`.

#### Constructor Parameters

| Param             | Type / Default                          | Notes                                                                        |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `name`            | `string \| undefined`                   | Auto-generated when omitted (see `Container` for naming pattern).            |
| `x`, `y`          | `number = 0`                            | Position relative to `anchor`.                                               |
| `width`, `height` | `number = 0`                            | Size in screen units.                                                        |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`    | See `mod/index.d.ts` for enum values.                                        |
| `parent`          | `mod.UIWidget \| UI.Node \| undefined`  | Parent widget or node. Defaults to `UI.ROOT_NODE` when omitted.              |
| `visible`         | `boolean = true`                        | Initial visibility.                                                          |
| `padding`         | `number = 0`                            | Container padding.                                                           |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`          | Background color.                                                            |
| `bgAlpha`         | `number = 0`                            | Background opacity.                                                          |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.None`      | Fill mode.                                                                   |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order.                                                                     |
| `message`         | `mod.Message`                           | **Required.** Text label content (see `mod/index.d.ts` for message helpers). |
| `textSize`        | `number = 36`                           | Font size.                                                                   |
| `textColor`       | `mod.Vector = UI.COLORS.BLACK`          | Text color.                                                                  |
| `textAlpha`       | `number = 1`                            | Text opacity.                                                                |
| `textAnchor`      | `mod.UIAnchor = mod.UIAnchor.Center`    | Alignment inside the text widget.                                            |
| `receiver`        | `mod.Player \| mod.Team \| undefined`   | Optional second parameter. Target audience; defaults to global.              |

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see below), plus:

- **`message: mod.Message`** (getter/setter) – The text content. Use the setter to update the message.
- **`setMessage(message: mod.Message): Text`** – Sets the message and returns `this` for method chaining.

### `class UI.Button extends UI.Element`

Builds a button by first creating a container, then calling `mod.AddUIButton`. Optionally adds a text label.

#### Constructor Parameters

| Param             | Type / Default                                       | Notes                                                                                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `string \| undefined`                                | If provided, used as the button widget name (`buttonName`). If omitted, the container gets an auto-generated name and the button widget uses `${container.name}_button`. The returned `Button` object's `name` property always refers to the button container's name. |
| `x`, `y`          | `number = 0`                                         | Position relative to `anchor`.                                                                                                                                                                                                                                        |
| `width`, `height` | `number = 0`                                         | Size in screen units.                                                                                                                                                                                                                                                 |
| `anchor`          | `mod.UIAnchor = mod.UIAnchor.Center`                 | See `mod/index.d.ts` for enum values.                                                                                                                                                                                                                                 |
| `parent`          | `mod.UIWidget \| UI.Node \| undefined`               | Parent widget or node. Defaults to `UI.ROOT_NODE` when omitted.                                                                                                                                                                                                       |
| `visible`         | `boolean = true`                                     | Initial visibility.                                                                                                                                                                                                                                                   |
| `padding`         | `number = 0`                                         | Container padding.                                                                                                                                                                                                                                                    |
| `bgColor`         | `mod.Vector = UI.COLORS.WHITE`                       | Button background color (applied to the button widget, not the container).                                                                                                                                                                                            |
| `bgAlpha`         | `number = 1`                                         | Button background opacity.                                                                                                                                                                                                                                            |
| `bgFill`          | `mod.UIBgFill = mod.UIBgFill.Solid`                  | Button fill mode.                                                                                                                                                                                                                                                     |
| `depth`           | `mod.UIDepth = mod.UIDepth.AboveGameUI`              | Z-order.                                                                                                                                                                                                                                                              |
| `buttonEnabled`   | `boolean = true`                                     | Initial enabled state.                                                                                                                                                                                                                                                |
| `baseColor`       | `mod.Vector = UI.COLORS.BF_GREY_2`                   | Base button color.                                                                                                                                                                                                                                                    |
| `baseAlpha`       | `number = 1`                                         | Base button opacity.                                                                                                                                                                                                                                                  |
| `disabledColor`   | `mod.Vector = UI.COLORS.BF_GREY_3`                   | Disabled state color.                                                                                                                                                                                                                                                 |
| `disabledAlpha`   | `number = 1`                                         | Disabled state opacity.                                                                                                                                                                                                                                               |
| `pressedColor`    | `mod.Vector = UI.COLORS.BF_GREEN_BRIGHT`             | Pressed state color.                                                                                                                                                                                                                                                  |
| `pressedAlpha`    | `number = 1`                                         | Pressed state opacity.                                                                                                                                                                                                                                                |
| `hoverColor`      | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Hover state color.                                                                                                                                                                                                                                                    |
| `hoverAlpha`      | `number = 1`                                         | Hover state opacity.                                                                                                                                                                                                                                                  |
| `focusedColor`    | `mod.Vector = UI.COLORS.BF_GREY_1`                   | Focused state color.                                                                                                                                                                                                                                                  |
| `focusedAlpha`    | `number = 1`                                         | Focused state opacity.                                                                                                                                                                                                                                                |
| `onClick`         | `(player: mod.Player) => Promise<void> \| undefined` | Click handler stored in `UI.CLICK_HANDLERS`.                                                                                                                                                                                                                          |
| `label`           | `UI.LabelParams \| undefined`                        | Adds centered text label. Label inherits `width/height/depth` from button and forces `visible = true`.                                                                                                                                                                |
| `receiver`        | `mod.Player \| mod.Team \| undefined`                | Optional second parameter. Target audience; defaults to global.                                                                                                                                                                                                       |

**Note:** The button's container (which `name` refers to) uses `bgColor = UI.COLORS.BF_GREY_4`, `bgAlpha = 0`, and `bgFill = mod.UIBgFill.None` by default.

#### Properties & Methods

Inherits all properties and methods from `UI.Element` (see below), plus:

- **`buttonName: string`** (getter) – The name of the button widget (not the container).
- **`buttonUiWidget: mod.UIWidget`** (getter) – The underlying button widget.
- **`enabled: boolean`** (getter/setter) – Button enabled state.
- **`setEnabled(enabled: boolean): Button`** – Sets enabled state and returns `this` for method chaining.
- **`labelMessage: mod.Message`** (setter) – Sets the label message if a label exists.
- **`setLabelMessage(message: mod.Message): Button`** – Sets the label message and returns `this` for method chaining.

**Color & Alpha Getters/Setters** (all support method chaining):

- **`colorBase`, `colorDisabled`, `colorFocused`, `colorHover`, `colorPressed: mod.Vector`** (getter/setter)
- **`setColorBase(color)`, `setColorDisabled(color)`, `setColorFocused(color)`, `setColorHover(color)`, `setColorPressed(color): Button`**
- **`alphaBase`, `alphaDisabled`, `alphaFocused`, `alphaHover`, `alphaPressed: number`** (getter/setter)
- **`setAlphaBase(alpha)`, `setAlphaDisabled(alpha)`, `setAlphaFocused(alpha)`, `setAlphaHover(alpha)`, `setAlphaPressed(alpha): Button`**

**Overrides:**

- **`size: Size`** (getter/setter) – Setting size also updates the button widget and label size.
- **`setSize(params: Size): Button`** – Sets size for container, button, and label, returns `this`.

### `UI.handleButtonClick(player, widget, event)`

Utility callback meant to be used in `mod.OnPlayerUIButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent)` for global subscriptions. Ignores `event` (the Battlefield Portal `mod.UIButtonEvent` is currently unreliable) and resolves the registered `onClick` for the pressed widget.

---

## Types & Interfaces

All types and classes are defined inside the `UI` namespace in [`ui/index.ts`](./index.ts).

### `UI.Type`

Enumeration of node types: `Root`, `Container`, `Text`, `Button`, `Unknown`.

### `UI.Node`

Base class for all UI nodes. Provides:

- `type: UI.Type` (getter)
- `name: string` (getter)
- `uiWidget: mod.UIWidget` (getter)

### `UI.Element extends UI.Node`

Base class for all created widgets. Extends `Node` and provides all the properties and methods documented in the `UI.Element` API section above.

### `UI.Container extends UI.Element`

Class for container widgets. Extends `Element` and adds:

- `children: (Container | Text | Button)[]` (getter)

### `UI.Text extends UI.Element`

Class for text widgets. Extends `Element` and adds:

- `message: mod.Message` (getter/setter)
- `setMessage(message: mod.Message): Text` (method chaining)

### `UI.Button extends UI.Element`

Class for button widgets. Extends `Element` and adds:

- `buttonName: string` (getter)
- `buttonUiWidget: mod.UIWidget` (getter)
- `enabled: boolean` (getter/setter)
- `setEnabled(enabled: boolean): Button` (method chaining)
- `labelMessage: mod.Message` (setter)
- `setLabelMessage(message: mod.Message): Button` (method chaining)
- Color getters/setters: `colorBase`, `colorDisabled`, `colorFocused`, `colorHover`, `colorPressed`
- Color setter methods: `setColorBase()`, `setColorDisabled()`, `setColorFocused()`, `setColorHover()`, `setColorPressed()` (all return `Button`)
- Alpha getters/setters: `alphaBase`, `alphaDisabled`, `alphaFocused`, `alphaHover`, `alphaPressed`
- Alpha setter methods: `setAlphaBase()`, `setAlphaDisabled()`, `setAlphaFocused()`, `setAlphaHover()`, `setAlphaPressed()` (all return `Button`)
- Overrides `size` setter and `setSize()` to also update button widget and label

### `UI.Params`

Base interface for positional/layout properties reused by other parameter interfaces.

```ts
interface Params {
    type?: Type;
    name?: string;
    x?: number; // Default: 0
    y?: number; // Default: 0
    width?: number; // Default: 0
    height?: number; // Default: 0
    anchor?: mod.UIAnchor; // Default: mod.UIAnchor.Center
    parent?: mod.UIWidget | Node; // Default: UI.ROOT_NODE
    visible?: boolean; // Default: true
    padding?: number; // Default: 0
    bgColor?: mod.Vector; // Default varies by class (see below)
    bgAlpha?: number; // Default varies by class (see below)
    bgFill?: mod.UIBgFill; // Default varies by class (see below)
    depth?: mod.UIDepth; // Default: mod.UIDepth.AboveGameUI
}
```

### `UI.ContainerParams extends Params`

```ts
interface ContainerParams extends Params {
    childrenParams?: (ContainerParams | TextParams | ButtonParams)[];
}
```

### `UI.TextParams extends Params`

```ts
interface TextParams extends Params {
    message: mod.Message; // Required (no default)
    textSize?: number; // Default: 36
    textColor?: mod.Vector; // Default: UI.COLORS.BLACK
    textAlpha?: number; // Default: 1
    textAnchor?: mod.UIAnchor; // Default: mod.UIAnchor.Center
}
```

### `UI.LabelParams`

Subset of text options used when attaching a label to a button.

```ts
interface LabelParams {
    message: mod.Message; // Required (no default)
    textSize?: number; // Default: 36
    textColor?: mod.Vector; // Default: UI.COLORS.BLACK
    textAlpha?: number; // Default: 1
}
```

### `UI.ButtonParams extends Params`

```ts
interface ButtonParams extends Params {
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
    label?: LabelParams;
}
```

---

## Event Wiring & Lifecycle

- Register `UI.handleButtonClick` once per mod to dispatch button presses.
- Use the returned `Element` helpers to hide/show instead of calling `mod.SetUIWidgetVisible` manually.
- All properties support both normal setter syntax (e.g., `element.bgAlpha = 0.8;`) and method chaining (e.g., `element.setBgAlpha(0.8).show()`). Method chaining is useful when you want to apply multiple changes in sequence.
- Always call `delete()` when removing widgets to prevent stale references inside Battlefield Portal.
- The `parent` property in `Params` interfaces accepts either `mod.UIWidget` or `UI.Node`, allowing you to pass a previously created native `UIWidget` as a parent.

---

## Future Work

The following features are planned for upcoming releases:

### Auto-Creating Button Labels

When setting a button's text via `setLabelMessage()` or the `labelMessage` setter, if no label currently exists, a text label will be automatically created with sensible defaults. This eliminates the need to always provide a `label` parameter in the button constructor when you want to set text dynamically later.

### Image Widget Support

Support for `UIImage` and `UIWeaponImage` widget types will be added, providing classes similar to `Container`, `Text`, and `Button` for displaying images and weapon icons in the UI.

### Scoped Receiver Inheritance

Support for parent containers with a different receiver scope than their children. For example, a container created for a team (via `receiver: mod.Team`) can have child elements that are scoped to individual players. This allows for more flexible UI hierarchies where shared containers can contain player-specific elements.

### Container Child Management

An API for adding children to a container (regardless if they were created by this `UI` module), removing children from a container, and moving children between containers.

### Parent Reference Cleanup

When an element is deleted via `delete()`, the element should be removed from its parent's children list (if the parent is a `Container`). This ensures that parent containers maintain accurate `children` arrays and prevents stale references after deletion.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- Battlefield Builder docs – For runtime UI limitations (widget limits, anchor behavior, etc.).

---

## Feedback & Support

This helper library is under active development. Feature requests, bug reports, usage questions, or general ideas are always welcome—open an issue or reach out and they’ll be triaged quickly so you can keep shipping Portal experiences without waiting on tooling updates.
