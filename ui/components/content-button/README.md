# UIContentButton Component

<ai>

The `UIContentButton` is an abstract base class for buttons that contain content elements (such as text or images). It handles the common pattern of wrapping a button and a content element in a container, managing their layout, and exposing properties cleanly on its prototype. It is needed because natively (via the `mod` namespace UI widget system) only containers can be parents and have children.

This class is not meant to be instantiated directly. Instead, use concrete implementations like `UITextButton` which extends this class, or build your own buttons with content by extending this class.

</ai>

> **Note** This component extends `UI.Element` and implements `UI.Button`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

<ai>

## Architecture

`UIContentButton` manages a unified three-layer visual structure as a single lightweight class handle:

1. **Container Widget** (outermost) – The wrapping native container widget
2. **Button Widget** (middle) – The interactive native button widget (`_buttonWidget`) handling click and focus events via an SoA button slot
3. **Content Element** (innermost) – The content element handle (`_content`, e.g., `UIText`, `UIImage`) displaying the button's content

The class automatically:

- Creates and manages the native container, button, and inner content elements
- Forwards button properties (colors, alphas, `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`, etc.) to the button widget
- Manages padding and size synchronization between all three layers
- Handles cleanup when deleted

</ai>

---

<ai>

## Constructor

The constructor is `protected` and should not be called directly. Concrete implementations should call `super()` with appropriate parameters.

```ts
protected constructor(
    params: UIContentButton.Params,
    createContent: (parent: UI.Parent, width: number, height: number) => TContent
)
```

**Parameters:**

- `params` – The parameters for the content button, including all `UIButton.Params` plus optional `padding`
- `createContent` – A factory function that creates the content element given a parent and a prescribed inner width and height

</ai>

---

## Properties & Methods

### Inherited from `UI.Element`

`UIContentButton` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated Button Properties

All button properties are forwarded directly to the button widget:

- **Button State**: `enabled`
- **Button Handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `focusedColor`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`

### ContentButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The content element's size is automatically adjusted to account for padding.
- **`enabled: boolean`** (getter/setter) – Button enabled state.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and content element width, accounting for padding.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and content element height, accounting for padding.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and content element size, accounting for padding.
- **`delete(): void`** – Overrides to delete the button widget and content element before deleting the container.

---

## Type Definitions

### `UIContentButton.Params`

```ts
type Params = UIButton.Params & {
    padding?: number; // Default: 0
};
```

---

## Creating Custom Content Buttons

To create a custom content button, extend `UIContentButton` and specify:

1. The content element type as the generic parameter
2. A factory function to create the content element in `super(params, createContent)`
3. Any additional properties or behavior specific to your content type

See [TextButton](../text-button/README.md), [ImageButton](../image-button/README.md), [WeaponImageButton](../weapon-image-button/README.md), [GadgetImageButton](../gadget-image-button/README.md), and [ContainerButton](../container-button/README.md) for examples.

---

<ai>

## Usage Notes

- **Padding Handling**: When padding is set, the content element's size is automatically reduced by `padding * 2` (once for each side) to account for the padding space.
- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates all three layers (container, button, and content), ensuring they stay in sync.
- **Internal Elements**: The internal button widget and content element are protected fields (`_buttonWidget`, `_content`).

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UITextButton Documentation](../text-button/README.md) – For an example implementation
- [UIButton Documentation](../button/README.md) – For information about button properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
