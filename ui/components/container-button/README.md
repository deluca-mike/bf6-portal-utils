# UIContainerButton Component

<ai>

The `UIContainerButton` component creates a button that contains a `UIContainer` as its content. This allows you to create interactive buttons that can hold child elements, enabling complex nested UI structures within a clickable button.

</ai>

> **Note** This component extends `UIContentButton<UIContainer>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIContainerButton } from 'bf6-portal-utils/ui/components/container-button';
import { UIText } from 'bf6-portal-utils/ui/components/text';
import { UI } from 'bf6-portal-utils/ui';

// Create a container button with nested children
const button = new UIContainerButton({
    position: { x: 0, y: 0 },
    size: { width: 200, height: 100 },
    onClickUp: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} released the button!`);
    },
    childrenParams: [
        {
            type: UIText,
            message: mod.Message(mod.stringkeys.labels.click), // 'Click'
            anchor: mod.UIAnchor.TopCenter,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
        } as UIContainer.ChildParams<UIText.Params>,
        {
            type: UIText,
            message: mod.Message(mod.stringkeys.labels.me), // 'Me'
            anchor: mod.UIAnchor.BottomCenter,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
        } as UIContainer.ChildParams<UIText.Params>,
    ],
    visible: true,
});

// Access the inner container
const innerContainer = button.innerContainer;
console.log(innerContainer.children.length); // 2
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIButton.Params`, plus: |
| All parameters from `UIContainer.Params`: |
| `childrenParams` | `Array<UIContainer.ChildParams<any>>` | Nested elements automatically receive the inner container as `parent`. |
| `padding` | `number = 0` | Container padding. |

For complete parameter lists, see:

- [UIButton Documentation](../button/README.md) – For button-specific parameters
- [UIContainer Documentation](../container/README.md) – For container-specific parameters

---

## Properties & Methods

### Inherited from `UI.Element`

`UIContainerButton` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated from Internal Button

All button properties are forwarded from the internal `UIButton` instance:

- **Button State**: `enabled`
- **Button handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `focusedColor`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`

### ContainerButton-Specific

- **`innerContainer: UIContainer`** (getter) – The inner container that holds child elements. Use this to access and manage the container's children.
- **`padding: number`** (getter/setter) – Container padding. The inner container's size is automatically adjusted to account for padding.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and inner container width, accounting for padding.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and inner container height, accounting for padding.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and inner container size, accounting for padding.

---

## Type Definitions

### `UIContainerButton.Params`

```ts
type Params = UIButton.Params & UIContainer.Params;
```

---

<ai>

## Usage Notes

- **Inner Container Access**: Use the `innerContainer` property to access the container that holds child elements. You can use this to manage children, check the children array, etc.
- **Child Management**: Children added via `childrenParams` are automatically added to the inner container, not the button itself. Use `innerContainer.children` to access them.
- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates all three layers (outer container, button, and inner container), ensuring they stay in sync.
- **Padding**: The component supports padding, which creates space between the button border and the inner container. The inner container's size is automatically adjusted to account for padding.

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIContainer Documentation](../container/README.md) – For information about container properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
