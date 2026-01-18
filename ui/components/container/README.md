# UIContainer Component

The `UIContainer` component creates a container widget that can hold child elements. Containers are useful for grouping
UI elements together and managing their layout as a single unit.

> **Note** This component extends `UI.Element` and implements `UI.Parent`. For information about the base `UI` namespace
> functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UIText } from 'bf6-portal-utils/ui/components/text';
import { UI } from 'bf6-portal-utils/ui';

// Create a container with nested children
const container = new UIContainer({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 400 },
    anchor: mod.UIAnchor.Center,
    bgColor: UI.COLORS.BF_GREY_3,
    bgAlpha: 0.9,
    childrenParams: [
        {
            type: UIText,
            message: mod.Message(mod.stringKeys.text.helloWorld), // 'Hello World'
            position: { x: 0, y: 0 },
            textSize: 48,
        } as UIContainer.ChildParams<UIText.Params>,
    ],
    visible: true,
});

// Access children
console.log(container.children.length); // 1

// Delete container (recursively deletes all children)
container.delete();
```

---

## Constructor Parameters

| Param                    | Type / Default                             | Notes                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`                 | `number = 0`                               | Position relative to `anchor`. Mutually exclusive with `position`.                                                                                                                                 |
| `position`               | `UI.Position \| undefined`                 | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`.                                                                                                                           |
| `width`, `height`        | `number = 0`                               | Size in screen units. Mutually exclusive with `size`.                                                                                                                                              |
| `size`                   | `UI.Size \| undefined`                     | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`.                                                                                                             |
| `anchor`                 | `mod.UIAnchor = mod.UIAnchor.Center`       | See `mod/index.d.ts` for enum values.                                                                                                                                                              |
| `parent`                 | `UI.Parent \| undefined`                   | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed.                                                                                        |
| `visible`                | `boolean = true`                           | Initial visibility.                                                                                                                                                                                |
| `bgColor`                | `mod.Vector = UI.COLORS.WHITE`             | Background color.                                                                                                                                                                                  |
| `bgAlpha`                | `number = 0`                               | Background opacity.                                                                                                                                                                                |
| `bgFill`                 | `mod.UIBgFill = mod.UIBgFill.None`         | Fill mode.                                                                                                                                                                                         |
| `depth`                  | `mod.UIDepth = mod.UIDepth.AboveGameUI`    | Z-order.                                                                                                                                                                                           |
| `receiver`               | `mod.Player \| mod.Team \| undefined`      | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers.                                          |
| `uiInputModeWhenVisible` | `boolean = false`                          | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section).                                                         |
| `childrenParams`         | `Array<UIContainer.ChildParams<any>> = []` | Nested elements automatically receive this container as `parent`. Each child must have a `type` property set to the class constructor (e.g., `UIContainer`, `UIText`, `UIButton`, `UITextButton`). |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIContainer` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the
[main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Container-Specific

- **`children: UI.Element[]`** (getter) – Array of child elements. Automatically maintained when children are created,
  moved, or deleted. Elements are automatically added when created with this container as their parent, and
  automatically removed when deleted or moved to another parent.

- **`delete(): void`** – Overrides `Element.delete()` to recursively delete all children before deleting the container
  itself.

---

## Type Definitions

### `UIContainer.ChildParams<T extends UI.ElementParams>`

Generic type for child element parameters in `childrenParams`. The type parameter must extend `ElementParams`. The
`type` property must be set to the class constructor.

```ts
type ChildParams<T extends UI.ElementParams> = T & {
    type: new (params: T) => UI.Element;
};
```

**Example:**

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UIText } from 'bf6-portal-utils/ui/components/text';

const container = new UIContainer({
    childrenParams: [
        {
            type: UIText,
            message: mod.Message(mod.stringKeys.text.hello), // 'Hello'
            position: { x: 0, y: 0 },
        } as UIContainer.ChildParams<UIText.Params>,
    ],
});
```

### `UIContainer.Params`

```ts
type Params = UI.ElementParams & {
    childrenParams?: ChildParams<any>[];
};
```

---

## Usage Notes

- **Parent-Child Relationships**: When you create child elements via `childrenParams`, they automatically receive the
  container as their parent. The container's `children` array is automatically maintained.

- **Recursive Deletion**: Calling `delete()` on a container recursively deletes all child elements before deleting the
  container itself.

- **Children Storage**: Children are stored internally as a `Set<Element>` but exposed as an array via the `children`
  getter.

- **Receiver Inheritance**: Child elements automatically inherit the container's receiver unless explicitly specified in
  their constructor parameters.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations
