# UIText Component

<ai>

The `UIText` component creates a text widget for displaying text labels in the UI. Text elements support customizable font size, color, opacity, alignment, and padding.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIText } from 'bf6-portal-utils/ui/components/text';
import { UI } from 'bf6-portal-utils/ui';

// Create a text element
const text = new UIText({
    message: mod.Message(mod.stringkeys.labels.helloWorld), // 'Hello World'
    position: { x: 0, y: 0 },
    textSize: 48,
    textColor: UI.COLORS.WHITE,
    visible: true,
});

// Update text properties
text.message = mod.Message(mod.stringkeys.labels.updatedText); // 'Updated Text'
text.textColor = UI.COLORS.BLUE;
text.textSize = 36;
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
| `padding` | `number = 0` | Container padding. |
| `bgColor` | `mod.Vector = UI.COLORS.WHITE` | Background color. |
| `bgAlpha` | `number = 0` | Background opacity. |
| `bgFill` | `mod.UIBgFill = mod.UIBgFill.None` | Fill mode. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section). |
| `message` | `mod.Message` | **Required.** Text label content (see `mod` namespace for `mod.Message` helpers). Note: `mod.Message` is opaque and cannot be unpacked into a string. |
| `textSize` | `number = 36` | Font size. |
| `textColor` | `mod.Vector = UI.COLORS.BLACK` | Text color. |
| `textAlpha` | `number = 1` | Text opacity. |
| `textAnchor` | `mod.UIAnchor = mod.UIAnchor.Center` | Alignment inside the text widget. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIText` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Text-Specific

- **`message: mod.Message`** (getter/setter) – The text content. Use the setter to update the message. Note: `mod.Message` is opaque and cannot be unpacked into a string.
- **`textSize: number`** (getter/setter) – Font size.
- **`textColor: mod.Vector`** (getter/setter) – Text color.
- **`textAlpha: number`** (getter/setter) – Text opacity.
- **`textAnchor: mod.UIAnchor`** (getter/setter) – Alignment inside the text widget.
- **`padding: number`** (getter/setter) – Container padding.

---

## Type Definitions

### `UIText.Params`

```ts
type Params = UI.ElementParams & {
    message: mod.Message; // Required (no default)
    textSize?: number; // Default: 36
    textColor?: mod.Vector; // Default: UI.COLORS.BLACK
    textAlpha?: number; // Default: 1
    textAnchor?: mod.UIAnchor; // Default: mod.UIAnchor.Center
    padding?: number; // Default: 0
};
```

---

<ai>

## Usage Notes

- **Message Opaqueness**: `mod.Message` is opaque and cannot be unpacked into a string. You can only create messages using `mod.Message()` with numbers, `mod.Player` types, or strings in `mod.stringkeys`.
- **Padding**: Unlike the base `Element` class, `UIText` supports padding. This allows you to add space around the text content.

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
