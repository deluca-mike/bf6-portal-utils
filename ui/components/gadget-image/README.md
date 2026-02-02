# UIGadgetImage Component

<ai>

The `UIGadgetImage` component creates a widget that displays an image of a gadget (equipment item). Gadget images are useful for displaying equipment icons in the UI, such as in inventory screens or equipment selection menus.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIGadgetImage } from 'bf6-portal-utils/ui/components/gadget-image';

// Create a gadget image
const gadgetImage = new UIGadgetImage({
    gadget: mod.Gadgets.Misc_Defibrillator,
    position: { x: 0, y: 0 },
    size: { width: 64, height: 64 },
    visible: true,
});
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
| `visible` | `boolean = true` | Initial visibility. Note: The underlying Portal API lacks the ability to define starting invisibility, so visibility is set manually after construction. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section). |
| `gadget` | `mod.Gadgets` | **Required.** The gadget to display. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIGadgetImage` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### GadgetImage-Specific

- **`gadget: mod.Gadgets`** (getter) – The gadget being displayed (read-only).

- **`gadget: mod.Gadgets`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the gadget image after it has been created. Setting this property will log a warning and have no effect.

- **`setGadget(gadget: mod.Gadgets): UIGadgetImage`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the gadget image after it has been created. Returns `this` for method chaining but has no effect.

---

## Type Definitions

### `UIGadgetImage.Params`

```ts
type Params = UI.ElementParams & {
    gadget: mod.Gadgets; // Required (no default)
};
```

---

## Usage Notes

- **Gadget Immutability**: Once a `UIGadgetImage` is created, the gadget cannot be changed. The `gadget` setter and `setGadget()` method are deprecated and will log a warning if used. To change the displayed gadget, create a new `UIGadgetImage` instance.

- **Initial Visibility Limitation**: The underlying Portal API (`mod.AddUIGadgetImage`) lacks the ability to define starting invisibility. If you set `visible: false` in the constructor parameters, the component will automatically set visibility to `false` after construction, which may result in the image showing very briefly, unless it is a child of a parent that is already not visible.

- **Method Chaining**: The `setGadget()` method returns `this` for method chaining, but note that it has no effect due to API limitations.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
