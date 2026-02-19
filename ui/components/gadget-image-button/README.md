# UIGadgetImageButton Component

<ai>

The `UIGadgetImageButton` component creates a button with an integrated gadget image. It combines `UIButton` and `UIGadgetImage` functionality into a single element, wrapping both in a container and delegating properties appropriately.

</ai>

> **Note** This component extends `UIContentButton<UIGadgetImage>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIGadgetImageButton } from 'bf6-portal-utils/ui/components/gadget-image-button';
import { UI } from 'bf6-portal-utils/ui';

// Create a gadget image button with a click handler
const button = new UIGadgetImageButton({
    position: { x: 0, y: 0 },
    size: { width: 64, height: 64 },
    gadget: mod.Gadgets.Misc_Defibrillator,
    onClick: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} clicked the Defibrillator button!`);
    },
    visible: true,
});

// Update button properties
button.setEnabled(false).setBaseColor(UI.COLORS.BLUE);
```

</ai>

---

## Constructor Parameters

| Param                                        | Type / Default | Notes                                |
| -------------------------------------------- | -------------- | ------------------------------------ |
| All parameters from `UIButton.Params`, plus: |
| `gadget`                                     | `mod.Gadgets`  | **Required.** The gadget to display. |
| `padding`                                    | `number = 0`   | Container padding.                   |

For a complete list of `UIButton.Params`, see the [UIButton documentation](../button/README.md).

---

## Properties & Methods

### Inherited from `UI.Element`

`UIGadgetImageButton` inherits all properties and methods from `UI.Element`, including:

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

### Delegated from Internal Gadget Image

Gadget image properties are delegated from the internal `UIGadgetImage` instance:

- **`gadget: mod.Gadgets`** (getter) – The gadget being displayed (read-only).

- **`gadget: mod.Gadgets`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the gadget image after it has been created. Setting this property will log a warning and have no effect.

- **`setGadget(gadget: mod.Gadgets): UIGadgetImageButton`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the gadget image after it has been created. Returns `this` for method chaining but has no effect.

### GadgetImageButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The gadget image's size is automatically adjusted to account for padding.

- **`setPadding(padding: number): UIGadgetImageButton`** – Sets padding and returns `this` for method chaining.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and gadget image width, accounting for padding.

- **`height: number`** (getter/setter) – Setting height also updates the button widget and gadget image height, accounting for padding.

- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and gadget image size, accounting for padding.

- **`setSize(params: UI.Size): UIGadgetImageButton`** – Sets size for container, button, and gadget image, returns `this`.

---

## Type Definitions

### `UIGadgetImageButton.Params`

```ts
type Params = UIButton.Params & UIGadgetImage.Params;
```

---

## Usage Notes

- **Gadget Immutability**: Once a `UIGadgetImageButton` is created, the gadget cannot be changed. The `gadget` setter and `setGadget()` method are deprecated and will log a warning if used. To change the displayed gadget, create a new `UIGadgetImageButton` instance.

- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and gadget image size, accounting for padding.

- **Padding**: The component supports padding, which creates space between the button border and the gadget image. The gadget image size is automatically adjusted to account for padding.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIGadgetImage Documentation](../gadget-image/README.md) – For information about gadget image properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
