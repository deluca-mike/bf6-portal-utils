# UITextButton Component

<ai>

The `UITextButton` component creates a button with integrated text content. It combines `UIButton` and `UIText` functionality into a single element, wrapping both in a container and delegating properties appropriately. The text automatically updates its appearance when the button is enabled or disabled.

</ai>

> **Note** This component extends `UIContentButton<UIText>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';
import { UI } from 'bf6-portal-utils/ui';

// Create a text button with a click handler
const button = new UITextButton({
    position: { x: 0, y: 0 },
    size: { width: 200, height: 50 },
    message: mod.Message(mod.stringkeys.labels.clickMe), // 'Click Me'
    onClick: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} clicked!`);
    },
    visible: true,
});

// Update button and text properties
button
    .setMessage(mod.Message(mod.stringkeys.labels.updated)) // 'Updated'
    .setTextColor(UI.COLORS.WHITE)
    .setEnabled(false);
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIButton.Params`, plus: |
| `message` | `mod.Message` | **Required.** Text label content. Note: `mod.Message` is opaque and cannot be unpacked into a string. |
| `textSize` | `number = 36` | Font size. |
| `textColor` | `mod.Vector = UI.COLORS.BLACK` | Text color (used when button is enabled). |
| `textAlpha` | `number = 1` | Text opacity (used when button is enabled). |
| `textAnchor` | `mod.UIAnchor = mod.UIAnchor.Center` | Alignment inside the text widget. |
| `textDisabledColor` | `mod.Vector = UI.COLORS.BF_GREY_2` | Text color when button is disabled. |
| `textDisabledAlpha` | `number = 1` | Text opacity when button is disabled. |
| `padding` | `number = 0` | Container padding. |

For a complete list of `UIButton.Params`, see the [UIButton documentation](../button/README.md).

---

## Properties & Methods

### Inherited from `UI.Element`

`UITextButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated from Internal Button

All button properties are delegated from the internal `UIButton` instance:

- **Button State**: `enabled`, `setEnabled()`
- **Click Handler**: `onClick`, `setOnClick()`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `hoverColor`, `focusedColor` (with setter methods)
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `hoverAlpha`, `focusedAlpha` (with setter methods)
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)

### Delegated from Internal Text

Text properties are delegated from the internal `UIText` instance:

- **`message: mod.Message`** (getter/setter) – The text content.
- **`setMessage(message: mod.Message): UITextButton`** – Sets the message and returns `this` for method chaining.
- **`textSize: number`** (getter/setter) – Font size.
- **`setTextSize(size: number): UITextButton`** – Sets font size and returns `this` for method chaining.
- **`textAnchor: mod.UIAnchor`** (getter/setter) – Alignment inside the text widget.
- **`setTextAnchor(anchor: mod.UIAnchor): UITextButton`** – Sets text anchor and returns `this` for method chaining.

### TextButton-Specific

- **`textColor: mod.Vector`** (getter/setter) – Text color (used when button is enabled).
- **`setTextColor(color: mod.Vector): UITextButton`** – Sets text color and returns `this` for method chaining.
- **`textAlpha: number`** (getter/setter) – Text opacity (used when button is enabled).
- **`setTextAlpha(alpha: number): UITextButton`** – Sets text opacity and returns `this` for method chaining.
- **`textDisabledColor: mod.Vector`** (getter/setter) – Text color when button is disabled.
- **`setTextDisabledColor(color: mod.Vector): UITextButton`** – Sets disabled text color and returns `this` for method chaining.
- **`textDisabledAlpha: number`** (getter/setter) – Text opacity when button is disabled.
- **`setTextDisabledAlpha(alpha: number): UITextButton`** – Sets disabled text opacity and returns `this` for method chaining.
- **`padding: number`** (getter/setter) – Container padding.
- **`setPadding(padding: number): UITextButton`** – Sets padding and returns `this` for method chaining.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and text width.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and text height.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and text size.
- **`setSize(params: UI.Size): UITextButton`** – Sets size for container, button, and text, returns `this`.
- **`enabled: boolean`** (getter/setter) – Overrides to also update text appearance when enabled/disabled.

---

## Type Definitions

### `UITextButton.Params`

```ts
type Params = UIButton.Params &
    UIText.Params & {
        textDisabledColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_2
        textDisabledAlpha?: number; // Default: 1
    };
```

---

<ai>

## Usage Notes

- **Automatic Text State Management**: When the button's `enabled` state changes, the text automatically switches between `textColor`/`textAlpha` (enabled) and `textDisabledColor`/`textDisabledAlpha` (disabled).

- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and text size, accounting for padding.

- **Padding**: The component supports padding, which creates space between the button border and the text content. The text size is automatically adjusted to account for padding.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIText Documentation](../text/README.md) – For information about text properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
