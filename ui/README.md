# UI Module

<ai>

This TypeScript `UI` namespace wraps Battlefield Portal's `mod` UI APIs with an ergonomic, object-oriented interface backed by a high-performance **Structure-of-Arrays (SoA)** core. It provides strongly typed helpers, convenient defaults, ergonomic getters/setters, pre-allocated coordinate/dimension buffers, and automatic management of UI mechanics for building complex HUDs, panels, and interactive buttons with near-zero garbage collection overhead.

> **Note:** Since this module imports and relies on `Events`, **you must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. See the [Events module](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules needed in your code:
    ```ts
    import { UI } from 'bf6-portal-utils/ui';
    import { UIContainer } from 'bf6-portal-utils/ui/components/container';
    import { UIQRCode } from 'bf6-portal-utils/ui/components/qr-code';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Build UI elements using the UI classes and constants from the `UI` namespace.
5. Use the returned objects to control visibility (`element.visible = true/false`), reposition, mutate text/buttons, define button handlers (`onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`; sync or async), etc.
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Events } from 'bf6-portal-utils/events';
import { UI } from 'bf6-portal-utils/ui';
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';

let testMenu: UIContainer | undefined;

// The UI module subscribes to OnPlayerUIButtonEvent via Events automatically. Use Events for your game logic.
Events.OnPlayerDeployed.subscribe((eventPlayer: mod.Player) => {
    if (!testMenu) {
        // Can include children upon construction of the container.
        testMenu = new UIContainer({
            position: { x: 0, y: 0 },
            size: { width: 200, height: 300 },
            anchor: UI.Anchor.Center,
            receiver: eventPlayer,
            visible: true,
            uiInputModeWhenVisible: true,
            childrenParams: [
                {
                    type: UITextButton,
                    position: { x: 0, y: 0 },
                    size: { width: 200, height: 50 },
                    anchor: UI.Anchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClickUp: (player: mod.Player) => {
                        // Do something on release (sync or async; CallbackHandler catches errors)
                    },
                    label: mod.Message(mod.stringkeys.ui.buttons.option1),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UIContainer.ChildParams<UITextButton.Params>,
                {
                    type: UITextButton,
                    position: { x: 0, y: 50 },
                    size: { width: 200, height: 50 },
                    anchor: UI.Anchor.TopCenter,
                    bgColor: UI.COLORS.GREY_25,
                    baseColor: UI.COLORS.BLACK,
                    onClickUp: (player: mod.Player) => {
                        // Do something on release (sync or async; CallbackHandler catches errors)
                    },
                    label: mod.Message(mod.stringkeys.ui.buttons.option2),
                    textSize: 36,
                    textColor: UI.COLORS.WHITE,
                } as UIContainer.ChildParams<UITextButton.Params>,
            ],
        });

        // And even add a child to the container.
        new UITextButton({
            parent: testMenu,
            position: { x: 0, y: 0 },
            size: { width: 50, height: 50 },
            anchor: UI.Anchor.BottomCenter,
            bgColor: UI.COLORS.GREY_25,
            baseColor: UI.COLORS.BLACK,
            onClickUp: (player: mod.Player) => {
                if (testMenu) {
                    testMenu.visible = false;
                }
            },
            label: mod.Message(mod.stringkeys.ui.buttons.close),
            textSize: 36,
            textColor: UI.COLORS.WHITE,
        });
    }

    if (testMenu) {
        testMenu.visible = true;
    }
});
```

### Property Setter & Chaining Example

Update properties directly via standard TypeScript property assignment or chain method calls:

```ts
import { UIButton } from 'bf6-portal-utils/ui/components/button';
import { UIText } from 'bf6-portal-utils/ui/components/text';

const button = new UIButton({
    position: { x: 100, y: 200 },
    size: { width: 200, height: 50 },
    onClickUp: (player) => {
        // Handle release (sync or async; errors are caught and logged by CallbackHandler)
    },
});

// Update properties directly or via fluent chaining
button
    .setPosition({ x: 150, y: 250 })
    .setSize({ width: 250, height: 60 })
    .setBaseColor(UI.COLORS.BLUE)
    .setBaseAlpha(0.9)
    .setEnabled(true)
    .setVisible(true);

// Or update text content
const text = new UIText({
    label: mod.Message(mod.stringkeys.labels.hello), // 'Hello'
    position: { x: 0, y: 0 },
});

text.setLabel(mod.Message(mod.stringkeys.labels.updated))
    .setPosition({ x: 10, y: 20 })
    .setBgColor(UI.COLORS.WHITE)
    .setBgAlpha(0.5)
    .setVisible(true);
```

### Zero-Allocation Queries with `out` Parameters

To avoid GC overhead when querying positions or sizes, pass pre-allocated destination objects:

```ts
const scratchPos: UI.Position = { x: 0, y: 0 };
const scratchSize: UI.Size = { width: 0, height: 0 };

// Populates and returns scratchPos without any new heap allocation
container.getPosition(scratchPos);

// Populates and returns scratchSize without any new heap allocation
container.getSize(scratchSize);
```

### Parent-Child Management Example

Elements automatically manage parent-child relationships. When you create an element with a parent, move it between parents, or delete it, the hierarchy is automatically maintained in the Left-Child Right-Sibling (LCRS) tree:

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UIText } from 'bf6-portal-utils/ui/components/text';

// Create containers
const container1 = new UIContainer({ position: { x: 0, y: 0 }, size: { width: 200, height: 200 } });
const container2 = new UIContainer({ position: { x: 200, y: 0 }, size: { width: 200, height: 200 } });

// Create a text element as a child of container1
const text = new UIText({
    label: mod.Message(mod.stringkeys.labels.hello), // 'Hello'
    parent: container1,
});

console.log(container1.children?.length); // 1
console.log(container2.children?.length); // 0

// Move the text element to container2 via parent setter or setParent
text.parent = container2;

console.log(container1.children?.length); // 0 (automatically removed)
console.log(container2.children?.length); // 1 (automatically added)

// Delete the text element
text.delete();

console.log(container2.children?.length); // 0 (automatically removed)
```

</ai>

---

## Core Concepts & Architecture

- **Structure-of-Arrays (SoA) Core & Bit-Packing** – Pre-allocated flat buffers (`Uint16Array`, `Uint32Array`, `Float32Array`) manage tree relationships, bitflags, generational slot tracking, coordinates, and bit-packed styling (RGBA in `Uint32Array`, anchor/depth/bgFill/flags in `Uint16Array`) up to 2,048 elements with zero host getter queries and minimal memory footprint in QuickJS. Elements use positive generational IDs (`slot + 1 + 10000 * generation`).
- **Generational Slot Recycling** – Each slot tracks a 16-bit generation counter incremented on every free. This guarantees that widget names (`ui_${id}`) and raw IDs are globally unique for the duration of a match, preventing stale handle collisions.
- **Thin OOP Handles (~24B)** – All classes (`UIButton`, `UIContainer`, `UIText`, etc.) are lightweight facade handles referencing a single integer `_id` in the SoA buffers.
- **`UI` namespace** – Central container for UI limits (`MAX_ELEMENTS`), types, receivers, active element queries (`getActiveElementCount()`), and singleton logging.
- **`UI.Color` & `UI.COLORS`** – Transparent `{ r, g, b }` color type and frozen color presets re-exported from the `Colors` module. All color getters/setters across the UI module use transparent `UI.Color` objects without opaque `mod.Vector` wrappers.
- **Zero-Allocation Property Accessors** – All color and vector getters support optional `out` targets (e.g. `getBgColor(out?)`, `getPosition(out?)`, `getSize(out?)`) to avoid creating garbage-collected objects during per-frame animation and state reads.
- **`UI.Node` base class** – Root of the UI hierarchy exposing `id`, `isValid`, `isDeleted`, and `receiver`. The native widget handle (`_uiWidget`) is protected internally to prevent unsafe external mutations.
- **`UI.Parent` interface** – Implemented by parent nodes (`Root` and `UIContainer`). Exposes `children: readonly Element[] | undefined` (safe snapshot array), `getChild(index)`, `childCount: number | undefined` (getter), and `forEachChild()` (zero-allocation iteration with `CallbackHandler` protection).
- **`UI.ROOT_NODE` singleton** – Singleton `Root` instance (ID `0`) wrapping `mod.GetUIRoot()` that does not occupy a slot in the SoA arrays. All top-level elements default to this parent.
- **`UI.Element` base class** – Abstract base class for all UI components. Coordinates (`x`, `y`, `width`, `height`) are cached in `Float32Array` buffers to eliminate temporary vector allocations during coordinate mutations. Includes built-in safety to block operations on deleted elements.
- **Getter/Setter & Return Value Semantics**:
    - **Deleted elements**: All property getters on deleted elements return `undefined`.
    - **Unset properties on alive elements**: Returns `null` (e.g., `receiver` for global elements, button event handlers when unassigned, `getChild(index)` when index is out of bounds, `ROOT_NODE.parent`).
- **Singly-Linked LCRS Tree**:
    - Mutating `element.parent = newParent` or calling `element.setParent(newParent)` automatically detaches from the previous parent and attaches to the new one.
    - Calling `delete()` recursively deletes all child elements, frees the button slot, removes active input mode requesters, and returns the slot to the intrusive free-list with incremented generation.
- **Receiver Routing & Inheritance**:
    - Every element has an optional target audience receiver (`mod.Player | mod.Team`). When omitted, elements automatically inherit their parent's receiver (or global `null` if parent is `UI.ROOT_NODE`).
    - The `receiver` property (`mod.Player | mod.Team | null | undefined`) is exposed on `Node`.
    - UI input mode reference counting is automatically managed internally per-receiver scope without exposing internal receiver objects.
- **Button Mechanics** – Button elements (`UIButton`, `UIContentButton`) route native engine events (`ButtonDown`, `ButtonUp`, `FocusIn`, `FocusOut`) via dedicated SoA button slots in `UIBaseButton` (`MAX_BUTTONS = 512`) with $\mathcal{O}(1)$ direct array indexing.
- **Generational Widget Naming Scheme (`ui_${id}`)**:
    - All elements created by the `UI` module are assigned names in the format `'ui_1'`, `'ui_10001'`, etc., based on their unique generational element ID.
- **Position & Size parameters** – Constructor params support either `x`/`y` or `position` (mutually exclusive), and either `width`/`height` or `size` (mutually exclusive).

---

## Logging

The `UI` namespace provides logging functionality through the `Logging` module for tracking issues with deleted elements, button registration conflicts, and runtime warnings.

### `UI.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity (`Debug` = 0, `Info` = 1, `Warning` = 2, `Error` = 3). Default minimum log level is `LogLevel.Warning`.

### `UI.setLogging(log?: (text: string, error?: unknown) => Promise<void> | void, logLevel?: LogLevel, includeRawError?: boolean): void`

Configures logging for the UI module. Pass `undefined` or `null` to disable.

```ts
import { UI } from 'bf6-portal-utils/ui';

UI.setLogging(
    (text) => console.log(text),
    UI.LogLevel.Warning,
    true // includeRawError
);
```

---

<ai>

## UI Input Mode Management

The `uiInputModeWhenVisible` property provides automatic management of UI input mode (enabling the player's cursor to click buttons), eliminating the need to manually call `mod.EnableUIInputMode`.

### How It Works

- **Reference Counting**: Each receiver tracks active requesters. UI input mode is enabled when the first requesting element becomes visible, and disabled when all requesting elements are hidden or deleted.
- **Receiver-Aware Scope**: Automatically targets the appropriate scope (`Global`, `Team`, or `Player`) based on the element's receiver.
- **Lifecycle Integration**: Input mode requests are automatically registered or released when:
    - An element is created with `visible: true` and `uiInputModeWhenVisible: true`.
    - `element.visible` is toggled.
    - `element.uiInputModeWhenVisible` is toggled on a visible element.
    - `element.delete()` is called.

### Usage Example

```ts
import { UIContainer } from 'bf6-portal-utils/ui/components/container';
import { UITextButton } from 'bf6-portal-utils/ui/components/text-button';

// Create a menu with interactive buttons
const menu = new UIContainer({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 400 },
    receiver: player,
    uiInputModeWhenVisible: true, // Auto-manages cursor input mode for player
    childrenParams: [
        {
            type: UITextButton,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 50 },
            label: mod.Message(mod.stringkeys.labels.button1),
            onClickUp: async (p) => {
                // Handle click
            },
        } as UIContainer.ChildParams<UITextButton.Params>,
    ],
});

// Showing the menu enables UI input mode for the player
menu.visible = true;

// Hiding the menu disables UI input mode (when no other requesters exist)
menu.visible = false;
```

### When to Use

- **Enable `uiInputModeWhenVisible: true`** on the root container of an interactive menu whose visibility you toggle. Do not enable it on individual child buttons inside that container.
- Avoid mixing manual `mod.EnableUIInputMode` calls with `uiInputModeWhenVisible`, as the engine provides no way to query input mode state.

</ai>

---

## Built-in UI Components

| Component | Description | Documentation |
| --- | --- | --- |
| `UIContainer` | Lightweight container element for nesting and grouping child widgets. | [`ui/components/container`](components/container/README.md) |
| `UIButton` | Interactive clickable button with state styling and event handlers. | [`ui/components/button`](components/button/README.md) |
| `UIText` | Localized text label element with customizable typography. | [`ui/components/text`](components/text/README.md) |
| `UIImage` | Engine image widget for UI icons and graphics. | [`ui/components/image`](components/image/README.md) |
| `UIGadgetImage` | Image widget specifically for displaying BF6 gadget icons. | [`ui/components/gadget-image`](components/gadget-image/README.md) |
| `UIWeaponImage` | Image widget specifically for displaying BF6 weapon icons. | [`ui/components/weapon-image`](components/weapon-image/README.md) |
| `UIContentButton` | Generic button wrapping custom inner content elements. | [`ui/components/content-button`](components/content-button/README.md) |
| `UIContainerButton` | Button wrapping an inner `UIContainer`. | [`ui/components/container-button`](components/container-button/README.md) |
| `UITextButton` | Compound button with centered text label. | [`ui/components/text-button`](components/text-button/README.md) |
| `UIImageButton` | Compound button with centered image icon. | [`ui/components/image-button`](components/image-button/README.md) |
| `UIGadgetImageButton` | Compound button with centered gadget icon. | [`ui/components/gadget-image-button`](components/gadget-image-button/README.md) |
| `UIWeaponImageButton` | Compound button with centered weapon icon. | [`ui/components/weapon-image-button`](components/weapon-image-button/README.md) |
| `UIQRCode` | High-performance QR code with Z-index layering and rectilinear merging. | [`ui/components/qr-code`](components/qr-code/README.md) |
| `UIPixelArt` | Zero-allocation pixel art renderer with Painter's Algorithm decomposition and throttled batching. | [`ui/components/pixel-art`](components/pixel-art/README.md) |
| `UIPixelArtButton` | Interactive button wrapping throttled pixel art graphics. | [`ui/components/pixel-art-button`](components/pixel-art-button/README.md) |

---

## API Reference

### `UI.MAX_ELEMENTS`

Maximum number of simultaneously supported UI elements (2048).

### `UI.getActiveElementCount(): number`

Retrieves the current number of active UI elements in the system.

### `UI.COLORS`

Prebuilt `UI.Color` constants for basic and Battlefield UI palettes (frozen with `Object.freeze`).

### `UI.ROOT_NODE`

The singleton root node (ID `0`) wrapping `mod.GetUIRoot()`.

### `UI.Node`

Base class for all UI nodes.

- `id: number` (getter) – Encoded generational ID of the node.
- `isValid: boolean` (getter) – Whether the node ID is valid and active in the current generation.
- `isDeleted: boolean | undefined` (getter) – Whether the node is deleted or outdated.
- `receiver: mod.Player | mod.Team | null | undefined` (getter) – Target audience receiver handle (or `null` if global, `undefined` if deleted).

### `UI.Parent` (interface)

Interface for parent nodes (`Root` and `UIContainer`).

- `children: readonly Element[] | undefined` (getter) – Snapshot copy array of attached child elements (or `undefined` if deleted).
- `getChild(index: number): Element | null | undefined` – Retrieves a child element at the specified index (`null` if out of bounds, `undefined` if deleted).
- `childCount: number | undefined` (getter) – Direct child count (or `undefined` if deleted).
- `forEachChild(callback: (child: Element, index: number) => void): void` – Iterates over direct child elements without allocating an intermediate array (protected by `CallbackHandler`).

### `abstract class UI.Element extends UI.Node`

Base class for all created widgets.

| Property / Getter | Method Chaining Setter | Type / Return Type | Description |
| :-- | :-- | :-- | :-- |
| `parent` | `setParent(parent)` | `UI.Parent \| undefined` | Parent node. Setting moves element between parents. |
| `visible` | `setVisible(visible)` | `boolean \| undefined` | Visibility state. |
| `x` | `setX(x)` | `number \| undefined` | Individual X coordinate. |
| `y` | `setY(y)` | `number \| undefined` | Individual Y coordinate. |
| `position` / `getPosition(out?)` | `setPosition(pos)` | `UI.Position \| undefined` | Position as `{ x, y }`. Supports zero-allocation `out`. |
| `width` | `setWidth(width)` | `number \| undefined` | Individual width. |
| `height` | `setHeight(height)` | `number \| undefined` | Individual height. |
| `size` / `getSize(out?)` | `setSize(size)` | `UI.Size \| undefined` | Dimensions as `{ width, height }`. Supports zero-allocation `out`. |
| `bgColor` / `getBgColor(out?)` | `setBgColor(color)` | `UI.Color \| undefined` | Background color. Supports zero-allocation `out`. |
| `bgAlpha` | `setBgAlpha(alpha)` | `number \| undefined` | Background opacity (`0-1`). |
| `bgFill` | `setBgFill(fill)` | `UI.BgFill \| undefined` | Background fill style. |
| `anchor` | `setAnchor(anchor)` | `UI.Anchor \| undefined` | Anchor alignment point. |
| `depth` | `setDepth(depth)` | `UI.Depth \| undefined` | Z-order depth. |
| `uiInputModeWhenVisible` | `setUiInputModeWhenVisible(val)` | `boolean \| undefined` | Auto-manage input mode on visibility. |
| `isDeleted` | — | `boolean \| undefined` | `true` if element has been deleted, `false` if active, `undefined` if invalid. |
| `isValid` | — | `boolean` | `true` if active in the current generation, `false` otherwise. |
| `delete()` | — | `void` | Recursively deletes widget from Portal & unlinks parent. |

---

## Types & Interfaces

- **`UI.Position`**: `{ x: number; y: number }`
- **`UI.Size`**: `{ width: number; height: number }`
- **`UI.ButtonHandler`**: `(player: mod.Player) => Promise<void> | void`
- **`UI.BaseParams`**: Common widget parameters (`parent`, `anchor`, `visible`, `bgColor`, `bgAlpha`, `bgFill`, `depth`, `receiver`, `uiInputModeWhenVisible`).
- **`UI.ElementParams`**: Extends `BaseParams` with mutually exclusive `x`/`y` or `position`, and `width`/`height` or `size`.

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the system to them.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
