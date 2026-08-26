# UIImage Component

<ai>

The `UIImage` component creates a widget that displays an image. Images are useful for displaying icons, graphics, or other visual elements in the UI.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIImage } from 'bf6-portal-utils/ui/components/image';
import { UI } from 'bf6-portal-utils/ui';

// Create an image
const image = new UIImage({
    imageType: mod.UIImageType.QuestionMark,
    position: { x: 0, y: 0 },
    size: { width: 64, height: 64 },
    imageColor: UI.COLORS.WHITE,
    imageAlpha: 1,
    visible: true,
});

// Update image properties
image.imageType = mod.UIImageType.Icon;
image.imageColor = UI.COLORS.BLUE;
image.imageAlpha = 0.8;
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
| `bgColor` | `mod.Vector = UI.COLORS.WHITE` | Background color. |
| `bgAlpha` | `number = 0` | Background opacity. |
| `bgFill` | `mod.UIBgFill = mod.UIBgFill.None` | Fill mode. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section). |
| `imageType` | `mod.UIImageType` | **Required.** The type of image to display. |
| `imageColor` | `mod.Vector = UI.COLORS.WHITE` | Image color tint. |
| `imageAlpha` | `number = 0` | Image opacity. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIImage` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Image-Specific

- **`imageType: mod.UIImageType`** (getter/setter) – The type of image to display.
- **`imageColor: mod.Vector`** (getter/setter) – Image color tint.
- **`imageAlpha: number`** (getter/setter) – Image opacity.

---

## Type Definitions

### `UIImage.Params`

```ts
type Params = UI.ElementParams & {
    imageType: mod.UIImageType; // Required (no default)
    imageColor?: mod.Vector; // Default: UI.COLORS.WHITE
    imageAlpha?: number; // Default: 0
};
```

---

## Usage Notes

- **Image Types**: The `imageType` parameter determines what image is displayed. See `mod` namespace for available image types.
- **Color Tinting**: The `imageColor` property applies a color tint to the image. Use `UI.COLORS.WHITE` for no tinting, or other colors to tint the image.
- **Opacity**: The `imageAlpha` property controls the opacity of the image. A value of `0` makes the image fully transparent, while `1` makes it fully opaque.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
