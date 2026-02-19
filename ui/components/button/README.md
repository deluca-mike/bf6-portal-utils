# UIButton Component

<ai>

The `UIButton` component creates an interactive button widget. Buttons support multiple visual states (base, disabled, pressed, hover, focused) with customizable colors and opacities for each state. Buttons automatically register themselves with the UI system so their `onClick` handlers are called when pressed. The `onClick` handler may be synchronous or asynchronous; while asynchronous handlers are generally preferred elsewhere (e.g. to avoid blocking event stacks), for `UIButton` the only handler running for the source event is this button's `onClick` (due to unique global button referencing), so synchronous callbacks—even long-running ones—are safe.

</ai>

> **Note** This component extends `UI.Element` and implements `UI.Button`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

<ai>

## Quick Start

```ts
import { UIButton } from 'bf6-portal-utils/ui/components/button';
import { UI } from 'bf6-portal-utils/ui';

// Create a button with a click handler (sync or async)
const button = new UIButton({
    position: { x: 0, y: 0 },
    size: { width: 200, height: 50 },
    onClick: (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} clicked the button!`);
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
| `hoverColor` | `mod.Vector = UI.COLORS.BF_GREY_1` | Hover state color. |
| `hoverAlpha` | `number = 1` | Hover state opacity. |
| `focusedColor` | `mod.Vector = UI.COLORS.BF_GREY_1` | Focused state color. |
| `focusedAlpha` | `number = 1` | Focused state opacity. |
| `onClick` | `(player: mod.Player) => void \| Promise<void> \| undefined` | Click handler (sync or async) stored in the button instance. |

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

- **`onClick: ((player: mod.Player) => void | Promise<void>) | undefined`** (getter/setter) – Click handler. May be synchronous or asynchronous.

- **`setOnClick(onClick: ((player: mod.Player) => void | Promise<void>) | undefined): UIButton`** – Sets click handler and returns `this` for method chaining.

**Color & Alpha Getters/Setters** (all support method chaining):

- **`baseColor`, `disabledColor`, `focusedColor`, `hoverColor`, `pressedColor: mod.Vector`** (getter/setter)
- **`setBaseColor(color)`, `setDisabledColor(color)`, `setFocusedColor(color)`, `setHoverColor(color)`, `setPressedColor(color): UIButton`**
- **`baseAlpha`, `disabledAlpha`, `focusedAlpha`, `hoverAlpha`, `pressedAlpha: number`** (getter/setter)
- **`setBaseAlpha(alpha)`, `setDisabledAlpha(alpha)`, `setFocusedAlpha(alpha)`, `setHoverAlpha(alpha)`, `setPressedAlpha(alpha): UIButton`**

- **`delete(): void`** – Overrides `Element.delete()` to clean up button registration before deleting the button.

---

## Type Definitions

### `UIButton.Params`

```ts
type Params = UI.ElementParams & {
    enabled?: boolean; // Default: true
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
    onClick?: (player: mod.Player) => void | Promise<void>;
};
```

---

## Usage Notes

- **Sync vs async onClick**: The `onClick` handler may be synchronous or asynchronous. In other parts of the UI/event system, async handlers are often preferred so that long-running work does not block the event stack. For `UIButton`, the engine delivers the button event to a single handler identified by the button's unique global reference, so only this button's `onClick` runs for that event. Synchronous callbacks—including long-running ones—are therefore safe and will not block other button or event handlers.

- **Button Registration**: Buttons automatically register themselves with the UI system during construction using `UI.registerButton()`. When a button is deleted, it automatically unregisters itself.

- **Color Multiplication**: All button colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default (white) to get the expected color results.

- **Alpha Multiplication**: Alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
