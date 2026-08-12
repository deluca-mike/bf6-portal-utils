# UIBaseButton Component

<ai>

`UIBaseButton` is the abstract base class for all interactive button widgets in the UI subsystem (including [`UIButton`](../button/README.md) and [`UIContentButton`](../content-button/README.md)). It encapsulates the Structure-of-Arrays (SoA) button table, generational slot allocation, event handler management, and centralized `Events.OnPlayerUIButtonEvent` routing.

</ai>

> **Note** This component is an abstract class and extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Architecture & Responsibilities

- **Centralized Button Slot Management**: Pre-allocates fixed-size arrays (`MAX_BUTTONS = 512`) for button event handlers (`onClickUp`, `onClickDown`, `onFocusIn`, `onFocusOut`) and generational recycling up to 65,535 generations.
- **Constructor Slot Allocation**: In its constructor, `UIBaseButton` calls `super(params)` to allocate the `UI.Element` slot and then immediately allocates its button slot in the SoA table. If slot allocation fails, it automatically deletes the element and aborts.
- **Single Event Subscription**: Automatically subscribes to `Events.OnPlayerUIButtonEvent` once at module load and routes incoming button events in $\mathcal{O}(1)$ time without intermediate heap allocations.
- **Abstract Button UIWidget Resolution**: Exposes `protected get _buttonUIWidget(): mod.UIWidget | null` so concrete subclasses can route engine events (`mod.EnableUIButtonEvent`) directly to their interactive button widget.

---

## Static Constants & Methods

- **`UIBaseButton.MAX_BUTTONS: number`** – Maximum number of concurrent button elements supported in memory (512).
- **`UIBaseButton.getActiveButtonCount(): number`** – Retrieves the current number of active button elements.

---

## Properties & Methods

### Inherited from `UI.Element`

`UIBaseButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`, `getPosition(out?)`, `getSize(out?)`
- **Visibility**: `visible`, `show()`, `hide()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout & Hierarchy**: `anchor`, `depth`, `parent`
- **Lifecycle**: `delete()`, `isValid`, `isDeleted`

### Button Event Handlers

| Property / Getter | Method Chaining Setter | Type / Return Type | Description |
| :-- | :-- | :-- | :-- |
| `onClickUp` | `setOnClickUp(handler)` | `UI.ButtonHandler \| null \| undefined` | Callback invoked on release (`ButtonUp`). Usual place for activate-on-click logic. |
| `onClickDown` | `setOnClickDown(handler)` | `UI.ButtonHandler \| null \| undefined` | Callback invoked on press (`ButtonDown`). |
| `onFocusIn` | `setOnFocusIn(handler)` | `UI.ButtonHandler \| null \| undefined` | Callback invoked when the button gains focus (`FocusIn`). |
| `onFocusOut` | `setOnFocusOut(handler)` | `UI.ButtonHandler \| null \| undefined` | Callback invoked when the button loses focus (`FocusOut`). |

Setting or clearing a handler dynamically invokes `mod.EnableUIButtonEvent` on `_buttonUIWidget` to enable or disable engine event delivery.

---

## Type Definitions

### `UIBaseButton.Event`

```ts
enum Event {
    ClickUp = 0,
    ClickDown = 1,
    FocusIn = 2,
    FocusOut = 3,
}
```

### `UIBaseButton.Handlers`

```ts
type Handlers = {
    onClickUp?: UI.ButtonHandler;
    onClickDown?: UI.ButtonHandler;
    onFocusIn?: UI.ButtonHandler;
    onFocusOut?: UI.ButtonHandler;
};
```

### `UIBaseButton.Styling`

```ts
type Styling = {
    enabled?: boolean;
    baseColor?: mod.Vector;
    baseAlpha?: number;
    disabledColor?: mod.Vector;
    disabledAlpha?: number;
    pressedColor?: mod.Vector;
    pressedAlpha?: number;
    focusedColor?: mod.Vector;
    focusedAlpha?: number;
};
```

### `UIBaseButton.Params`

```ts
type Params = UI.ElementParams & Styling & Handlers;
```

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIButton Documentation](../button/README.md) – Standard button implementation
- [UIContentButton Documentation](../content-button/README.md) – Base class for composite buttons containing content
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
