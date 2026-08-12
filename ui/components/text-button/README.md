# UITextButton Component

<ai>

The `UITextButton` component creates a button with integrated text content. It combines `UIButton` and `UIText` functionality into a single element, wrapping both in a container and forwarding properties cleanly. The text automatically updates its appearance when the button is enabled or disabled.

</ai>

> **Note** This component extends `UIContentButton<UIText>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';
import { UI } from 'bf6-portal-utils/ui';

// Create a text button with a handler (e.g. onClickUp for activate-on-release)
const button = new UITextButton({
    position: { x: 0, y: 0 },
    size: { width: 200, height: 50 },
    label: mod.Message(mod.stringkeys.labels.clickMe), // 'Click Me'
    onClickUp: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} released the button!`);
    },
    visible: true,
});

// Update button and text properties
button.label = mod.Message(mod.stringkeys.labels.updated);
button.textColor = UI.COLORS.WHITE;
button.enabled = false;
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `label` | `mod.Message` | **Required.** Text label content. Note: `mod.Message` is opaque and cannot be unpacked into a string. |
| `textSize` | `number = 36` | Font size. |
| `textColor` | `mod.Vector = UI.COLORS.BLACK` | Text color (used when button is enabled). |
| `textAlpha` | `number = 1` | Text opacity (used when button is enabled). |
| `textAnchor` | `mod.UIAnchor = mod.UIAnchor.Center` | Alignment inside the text widget. |
| `textDisabledColor` | `mod.Vector = UI.COLORS.BF_GREY_2` | Text color when button is disabled. |
| `textDisabledAlpha` | `number = 1` | Text opacity when button is disabled. |
| `padding` | `number = 0` | Container padding. |

For a complete list of `UIBaseButton.Params`, see the [UIBaseButton documentation](../base-button/README.md).

---

## Properties & Methods

### Inherited from `UIBaseButton` / `UI.Element`

`UITextButton` inherits all properties from `UIBaseButton` and `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`, `isValid`
- **Parent Management**: `parent`
- **Button State**: `enabled`
- **Button handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `focusedColor`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`

For complete documentation of base properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode) and [UIBaseButton documentation](../base-button/README.md).

### Delegated from Internal Text

- **`label: mod.Message`** (getter/setter) – The text label content.
- **`textSize: number`** (getter/setter) – Font size.
- **`textAnchor: mod.UIAnchor`** (getter/setter) – Alignment inside the text widget.

### TextButton-Specific

- **`textColor: mod.Vector`** (getter/setter) – Text color (used when button is enabled).
- **`textAlpha: number`** (getter/setter) – Text opacity (used when button is enabled).
- **`textDisabledColor: mod.Vector`** (getter/setter) – Text color when button is disabled.
- **`textDisabledAlpha: number`** (getter/setter) – Text opacity when button is disabled.
- **`padding: number`** (getter/setter) – Container padding.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and text width.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and text height.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and text size.
- **`enabled: boolean`** (getter/setter) – Overrides to also update text appearance when enabled/disabled.

---

## Type Definitions

### `UITextButton.Params`

```ts
type Params = UIBaseButton.Params &
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

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIText Documentation](../text/README.md) – For information about text properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
