# UIGadgetImageButton Component

<ai>

The `UIGadgetImageButton` component creates a button with an integrated gadget image. It combines `UIButton` and `UIGadgetImage` functionality into a single element, wrapping both in a container and forwarding properties cleanly.

</ai>

> **Note** This component extends `UIContentButton<UIGadgetImage>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIGadgetImageButton } from 'bf6-portal-utils/ui/components/gadget-image-button';
import { UI } from 'bf6-portal-utils/ui';

// Create a gadget image button with a handler (e.g. onClickUp)
const button = new UIGadgetImageButton({
    position: { x: 0, y: 0 },
    size: { width: 64, height: 64 },
    gadget: mod.Gadgets.Misc_Defibrillator,
    onClickUp: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} activated the Defibrillator button!`);
    },
    visible: true,
});

// Update button properties
button.enabled = false;
button.baseColor = UI.COLORS.BLUE;
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

`UIGadgetImageButton` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated from Internal Button

All button properties are forwarded from the internal `UIButton` instance:

- **Button State**: `enabled`
- **Button handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `focusedColor`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)

### Delegated from Internal Gadget Image

- **`gadget: mod.Gadgets`** (getter) – The gadget being displayed (read-only).

### GadgetImageButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The gadget image's size is automatically adjusted to account for padding.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and gadget image width, accounting for padding.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and gadget image height, accounting for padding.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and gadget image size, accounting for padding.

---

## Type Definitions

### `UIGadgetImageButton.Params`

```ts
type Params = UIButton.Params & UIGadgetImage.Params;
```

---

## Usage Notes

- **Gadget Immutability**: Once a `UIGadgetImageButton` is created, the gadget cannot be changed. To change the displayed gadget, create a new `UIGadgetImageButton` instance.
- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and gadget image size, accounting for padding.
- **Padding**: The component supports padding, which creates space between the button border and the gadget image. The gadget image size is automatically adjusted to account for padding.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIGadgetImage Documentation](../gadget-image/README.md) – For information about gadget image properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
