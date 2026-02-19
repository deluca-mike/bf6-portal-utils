# UIImageButton Component

<ai>

The `UIImageButton` component creates a button with an integrated image. It combines `UIButton` and `UIImage` functionality into a single element, wrapping both in a container and delegating properties appropriately. The image automatically updates its appearance when the button is enabled or disabled.

</ai>

> **Note** This component extends `UIContentButton<UIImage>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIImageButton } from 'bf6-portal-utils/ui/components/image-button';
import { UI } from 'bf6-portal-utils/ui';

// Create an image button with a click handler
const button = new UIImageButton({
    position: { x: 0, y: 0 },
    size: { width: 64, height: 64 },
    imageType: mod.UIImageType.CrownOutline,
    imageColor: UI.COLORS.WHITE,
    onClick: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} clicked!`);
    },
    visible: true,
});

// Update button and image properties
button.setImageType(mod.UIImageType.CrownSolid).setImageColor(UI.COLORS.BLUE).setEnabled(false);
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIButton.Params`, plus: |
| `imageType` | `mod.UIImageType` | **Required.** The type of image to display. |
| `imageColor` | `mod.Vector = UI.COLORS.WHITE` | Image color tint (used when button is enabled). |
| `imageAlpha` | `number = 0` | Image opacity (used when button is enabled). |
| `imageDisabledColor` | `mod.Vector = UI.COLORS.BF_GREY_2` | Image color when button is disabled. |
| `imageDisabledAlpha` | `number = 1` | Image opacity when button is disabled. |
| `padding` | `number = 0` | Container padding. |

For a complete list of `UIButton.Params`, see the [UIButton documentation](../button/README.md).

---

## Properties & Methods

### Inherited from `UI.Element`

`UIImageButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)
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

### Delegated from Internal Image

Image properties are delegated from the internal `UIImage` instance:

- **`imageType: mod.UIImageType`** (getter/setter) – The type of image to display.
- **`setImageType(imageType: mod.UIImageType): UIImageButton`** – Sets the image type and returns `this` for method chaining.

### ImageButton-Specific

- **`imageColor: mod.Vector`** (getter/setter) – Image color tint (used when button is enabled).
- **`setImageColor(color: mod.Vector): UIImageButton`** – Sets image color and returns `this` for method chaining.
- **`imageAlpha: number`** (getter/setter) – Image opacity (used when button is enabled).
- **`setImageAlpha(alpha: number): UIImageButton`** – Sets image opacity and returns `this` for method chaining.
- **`imageDisabledColor: mod.Vector`** (getter/setter) – Image color when button is disabled.
- **`setImageDisabledColor(color: mod.Vector): UIImageButton`** – Sets disabled image color and returns `this` for method chaining.
- **`imageDisabledAlpha: number`** (getter/setter) – Image opacity when button is disabled.
- **`setImageDisabledAlpha(alpha: number): UIImageButton`** – Sets disabled image opacity and returns `this` for method chaining.
- **`padding: number`** (getter/setter) – Container padding.
- **`setPadding(padding: number): UIImageButton`** – Sets padding and returns `this` for method chaining.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and image width, accounting for padding.

- **`height: number`** (getter/setter) – Setting height also updates the button widget and image height, accounting for padding.

- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and image size, accounting for padding.

- **`setSize(params: UI.Size): UIImageButton`** – Sets size for container, button, and image, returns `this`.

- **`enabled: boolean`** (getter/setter) – Overrides to also update image appearance when enabled/disabled.

---

## Type Definitions

### `UIImageButton.Params`

```ts
type Params = UIContentButton.Params &
    UIImage.Params & {
        imageDisabledColor?: mod.Vector; // Default: UI.COLORS.BF_GREY_2
        imageDisabledAlpha?: number; // Default: 1
    };
```

---

## Usage Notes

- **Automatic Image State Management**: When the button's `enabled` state changes, the image automatically switches between `imageColor`/`imageAlpha` (enabled) and `imageDisabledColor`/`imageDisabledAlpha` (disabled).

- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and image size, accounting for padding.

- **Padding**: The component supports padding, which creates space between the button border and the image content. The image size is automatically adjusted to account for padding.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIImage Documentation](../image/README.md) – For information about image properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
