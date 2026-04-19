# UIButton Component

<ai>

The `UIButton` component creates an interactive button widget. Buttons support multiple visual states (base, disabled, pressed, focused) with customizable colors and opacities for each state. Buttons automatically register themselves with the UI system. Instead of a single `onClick` callback, you attach optional handlers for **click down** (`onClickDown`), **click up** (`onClickUp`), **focus in** (`onFocusIn`), and **focus out** (`onFocusOut`), which map to `mod.UIButtonEvent` `ButtonDown`, `ButtonUp`, `FocusIn`, and `FocusOut`. Handlers may be synchronous or asynchronous; while asynchronous handlers are generally preferred elsewhere (e.g. to avoid blocking event stacks), for `UIButton` the only handler running for a given engine event is this button’s handler for that event (due to unique global button referencing), so synchronous callbacks—even long-running ones—are safe.

</ai>

> **Note** This component extends `UI.Element` and implements `UI.Button`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIButton } from 'bf6-portal-utils/ui/components/button';
import { UI } from 'bf6-portal-utils/ui';

// Typical “activate on release” behavior uses onClickUp
const button = new UIButton({
    position: { x: 0, y: 0 },
    size: { width: 200, height: 50 },
    onClickUp: (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} released the button!`);
    },
    visible: true,
});

// Update button state
button.setEnabled(false).setBaseColor(UI.COLORS.BLUE).setPressedColor(UI.COLORS.GREEN);
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `x`, `y` | `number = 0` | Position relative to `anchor`. Mutually exclusive with `position`. |
| `position` | `UI.Position \| undefined` | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`. |
| `width`, `height` | `number = 0` | Size in screen units. Mutually exclusive with `size`. |
| `size` | `UI.Size \| undefined` | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`. |
| `anchor` | `mod.UIAnchor = mod.UIAnchor.Center` | See `mod` namespace for enum values. |
| `parent` | `UI.Parent \| undefined` | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed. |
| `visible` | `boolean = true` | Initial visibility. |
| `bgColor` | `mod.Vector = UI.COLORS.WHITE` | Button background color. Note: All button colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default (white). |
| `bgAlpha` | `number = 1` | Button background opacity. Note: Alphas are multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect. |
| `bgFill` | `mod.UIBgFill = mod.UIBgFill.Solid` | Button fill mode. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section). |
| `enabled` | `boolean = true` | Initial enabled state. |
| `baseColor` | `mod.Vector = UI.COLORS.BF_GREY_2` | Base button color. |
| `baseAlpha` | `number = 1` | Base button opacity. |
| `disabledColor` | `mod.Vector = UI.COLORS.BF_GREY_3` | Disabled state color. |
| `disabledAlpha` | `number = 1` | Disabled state opacity. |
| `pressedColor` | `mod.Vector = UI.COLORS.BF_GREEN_BRIGHT` | Pressed state color. |
| `pressedAlpha` | `number = 1` | Pressed state opacity. |
| `focusedColor` | `mod.Vector = UI.COLORS.BF_GREY_1` | Focused state color. |
| `focusedAlpha` | `number = 1` | Focused state opacity. |
| `onClickDown` | `UI.ButtonHandler \| undefined` | Invoked on press (`ButtonDown`). When provided, enables that event on the widget. |
| `onClickUp` | `UI.ButtonHandler \| undefined` | Invoked on release (`ButtonUp`). When provided, enables that event on the widget. Usual place for “activate on click” behavior. |
| `onFocusIn` | `UI.ButtonHandler \| undefined` | Invoked when the button gains focus (`FocusIn`). When provided, enables that event on the widget. |
| `onFocusOut` | `UI.ButtonHandler \| undefined` | Invoked when the button loses focus (`FocusOut`). When provided, enables that event on the widget. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Button-Specific

- **`enabled: boolean`** (getter/setter) – Button enabled state.

- **`setEnabled(enabled: boolean): UIButton`** – Sets enabled state and returns `this` for method chaining.

- **`onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut: UI.ButtonHandler | undefined`** (getter/setter) – Per-event handlers. May be synchronous or asynchronous.

- **`setOnClickDown`, `setOnClickUp`, `setOnFocusIn`, `setOnFocusOut(handler?: UI.ButtonHandler): UIButton`** – Set the corresponding handler and return `this` for method chaining.

**Color & Alpha Getters/Setters** (all support method chaining):

- **`baseColor`, `disabledColor`, `focusedColor`, `pressedColor: mod.Vector`** (getter/setter)
- **`setBaseColor(color)`, `setDisabledColor(color)`, `setFocusedColor(color)`, `setPressedColor(color): UIButton`**
- **`baseAlpha`, `disabledAlpha`, `focusedAlpha`, `pressedAlpha: number`** (getter/setter)
- **`setBaseAlpha(alpha)`, `setDisabledAlpha(alpha)`, `setFocusedAlpha(alpha)`, `setPressedAlpha(alpha): UIButton`**

- **`delete(): void`** – Overrides `Element.delete()` to clean up button registration before deleting the button.

---

## Type Definitions

### `UIButton.Params`

```ts
type Params = UI.ElementParams & {
    enabled?: boolean;
    baseColor?: mod.Vector;
    baseAlpha?: number;
    disabledColor?: mod.Vector;
    disabledAlpha?: number;
    pressedColor?: mod.Vector;
    pressedAlpha?: number;
    focusedColor?: mod.Vector;
    focusedAlpha?: number;
    onClickDown?: UI.ButtonHandler;
    onClickUp?: UI.ButtonHandler;
    onFocusIn?: UI.ButtonHandler;
    onFocusOut?: UI.ButtonHandler;
};
```

---

## Hover in/out (`HoverIn` / `HoverOut`)

Battlefield Portal supports **hover in** and **hover out** button events (`mod.UIButtonEvent.HoverIn` / `HoverOut`), but **`UIButton` does not expose `onHoverIn` / `onHoverOut` callbacks**. Hover is tied to pointer movement over the widget; players on **controller** cannot trigger hover the same way **mouse** users do, so hover-specific handlers would be unreliable for large parts of your audience. Use **`onFocusIn` / `onFocusOut`** when you need “entered / left” semantics that work with UI navigation, or **`onClickDown` / `onClickUp`** for activation.

---

## Usage Notes

- **Sync vs async handlers**: Each handler may be synchronous or asynchronous. In other parts of the UI/event system, async handlers are often preferred so that long-running work does not block the event stack. For `UIButton`, the engine delivers each UI button event to a single handler identified by the button's unique global reference, so only this button's matching handler runs for that event. Synchronous callbacks—including long-running ones—are therefore safe and will not block other button or event handlers.

- **Button Registration**: Buttons automatically register themselves with the UI system during construction using `UI.registerButton()`. When a button is deleted, it automatically unregisters itself.

- **Color Multiplication**: All button colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default (white) to get the expected color results.

- **Alpha Multiplication**: Alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
