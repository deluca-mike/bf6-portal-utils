# UIContentButton Component

<ai>

The `UIContentButton` is an abstract base class for buttons that contain content elements (such as text or images). It handles the common pattern of wrapping a `UIButton` and a content element in a `UIContainer`, managing their layout, and delegating properties appropriately. It is need because natively (via the `mod` namespace UI widget system) only containers can be parents and have children.

This class is not meant to be instantiated directly. Instead, use concrete implementations like `UITextButton` which extends this class, or build you own buttons with content by extending this class.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

<ai>

## Architecture

`UIContentButton` creates a three-layer structure:

1. **Container** (outermost) – The `UIContentButton` instance itself, which extends `UI.Element` and wraps everything
2. **Button** (middle) – An internal `UIButton` instance that handles button interactions
3. **Content** (innermost) – A content element (e.g., `UIText`, `UIImage`) that displays the button's content

The class automatically:

- Creates and manages the internal button and content elements
- Delegates button properties (colors, alphas, `onClick`, etc.) to the instance
- Delegates content properties (specified via the `contentProperties` parameter) to the instance
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
    createContent: (parent: UI.Parent, width: number, height: number) => TContent,
    contentProperties: TContentProps
)
```

**Parameters:**

- `params` – The parameters for the content button, including all `UIButton.Params` plus optional `padding`
- `createContent` – A factory function that creates the content element given a parent and a prescribed inner width and height
- `contentProperties` – An array of property names to delegate from the content element to the instance

</ai>

---

## Properties & Methods

### Inherited from `UI.Element`

`UIContentButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated from Internal Button

All button properties are automatically delegated from the internal `UIButton` instance:

- **Button State**: `enabled`, `setEnabled()`
- **Click Handler**: `onClick`, `setOnClick()`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `hoverColor`, `focusedColor` (with setter methods)
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `hoverAlpha`, `focusedAlpha` (with setter methods)
- **Background**: `bgColor`, `bgAlpha`, `bgFill`

### Delegated from Content Element

Properties specified in `contentProperties` are automatically delegated from the internal content element. For example, `UITextButton` delegates `message`, `textSize`, and `textAnchor` from the internal `UIText` instance.

### ContentButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The content element's size is automatically adjusted to account for padding.

- **`setPadding(padding: number): UIContentButton`** – Sets padding and returns `this` for method chaining.

- **`enabled: boolean`** (getter/setter) – Button enabled state (delegated from button).

- **`setEnabled(enabled: boolean): UIContentButton`** – Sets enabled state and returns `this` for method chaining.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and content element width, accounting for padding.

- **`height: number`** (getter/setter) – Setting height also updates the button widget and content element height, accounting for padding.

- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and content element size, accounting for padding.

- **`setSize(params: UI.Size): UIContentButton`** – Sets size for container, button, and content, returns `this`.

- **`delete(): void`** – Overrides to delete the internal button and content elements before deleting the container.

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

1. The content element type as the first generic parameter
2. The content properties to delegate as the second generic parameter (as a `readonly string[]`)
3. A factory function to create the content element
4. Any additional properties or behavior specific to your content type

See [TextButton](../text-button/README.md), [ImageButton](../image-button/README.md), [WeaponImageButton](../weapon-image-button/README.md), and [GadgetImageButton](../gadget-image-button/README.md) for examples.

---

<ai>

## Usage Notes

- **Padding Handling**: When padding is set, the content element's size is automatically reduced by `padding * 2` (once for each side) to account for the padding space.

- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates all three layers (container, button, and content), ensuring they stay in sync.

- **Property Delegation**: Properties are delegated using `UI.delegateProperties()`, which creates getters, setters, and setter methods (e.g., `setPropertyName`) for each property.

- **Internal Elements**: The internal button and content elements are not exposed as public properties. Access them through the delegated properties instead.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UITextButton Documentation](../text-button/README.md) – For an example implementation
- [UIButton Documentation](../button/README.md) – For information about button properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
