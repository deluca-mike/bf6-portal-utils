# UIPixelArtButton Component

<ai>

The `UIPixelArtButton` component creates an interactive UI button with embedded high-performance pixel art graphics. It combines `UIBaseButton` interactivity and `UIPixelArt` two-tier throttled rendering into a single unified element, wrapping both in a root container with optional padding.

For monochrome pixel art, the button automatically synchronizes foreground tint colors when the button transitions between enabled and disabled states.

</ai>

> **Note** This component extends `UIContentButton<UIPixelArt>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIPixelArtButton } from 'bf6-portal-utils/ui/components/pixel-art-button';
import { UI } from 'bf6-portal-utils/ui';

// Create a pixel art button with an interaction handler
const button = new UIPixelArtButton({
    x: 100,
    y: 100,
    width: 64,
    height: 64,
    data: '<BASE64_OR_BASE122_DATA>',
    pixelArtColor: UI.COLORS.WHITE,
    pixelArtDisabledColor: UI.COLORS.BF_GREY_2,
    onClickUp: async (player: mod.Player) => {
        console.log(`Player clicked pixel art button!`);
    },
    visible: true,
});

// Update button and pixel art properties dynamically
button.pixelArtColor = UI.COLORS.GOLD;
button.enabled = false;
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIBaseButton.Params`, plus: |
| `data` | `string` | **Required.** The Base64 or Base122 encoded pixel art payload. |
| `pixelArtColor` / `color` | `Colors.Color = UI.COLORS.WHITE` | Foreground tint color when button is enabled (monochrome only). |
| `pixelArtDisabledColor` | `Colors.Color = UI.COLORS.BF_GREY_2` | Foreground tint color when button is disabled (monochrome only). |
| `padding` | `number = 0` | Container padding between the button boundary and the pixel art content. |

For a complete list of `UIBaseButton.Params`, see the [UIBaseButton documentation](../base-button/README.md).

---

## Properties & Methods

### Inherited from `UI.Element`

`UIPixelArtButton` inherits all properties from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`, `getPosition(out?)`, `getSize(out?)`
- **Visibility**: `visible`
- **Background**: `bgColor`, `getBgColor(out?)`, `bgAlpha`, `bgFill` (delegated to native button)
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`
- **Parent Management**: `parent`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated Button Properties

All button properties are forwarded to the underlying button widget:

- **Button State**: `enabled`
- **Button Handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `getBaseColor(out?)`, `disabledColor`, `getDisabledColor(out?)`, `pressedColor`, `getPressedColor(out?)`, `focusedColor`, `getFocusedColor(out?)`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`
- **Background**: `bgColor`, `getBgColor(out?)`, `bgAlpha`, `bgFill` (delegated from button)

### Delegated from Internal Pixel Art

- **`pixelArt: UIPixelArt`** (getter) – The inner `UIPixelArt` instance.
- **`isMonochrome: boolean`** (getter) – Whether the pixel art is monochrome.
- **`state: UIPixelArt.State`** (getter) – The operational lifecycle state (`Idle`, `Drawing`, `Updating`, `Deleting`).
- **`progress: number`** (getter) – Rendering completion percentage from `0` to `100`.
- **`isReady: boolean`** (getter) – Whether all child rectangles have finished drawing.
- **`drawCallCount: number`** (getter) – Total native widgets spawned for this pixel art.

### PixelArtButton-Specific

- **`pixelArtColor: Colors.Color`** (getter/setter) – Foreground tint color when button is enabled (monochrome only). Supports zero-allocation `getPixelArtColor(out?)`.
- **`pixelArtDisabledColor: Colors.Color`** (getter/setter) – Foreground tint color when button is disabled (monochrome only). Supports zero-allocation `getPixelArtDisabledColor(out?)`.
- **`padding: number`** (getter/setter) – Container padding.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and pixel art width, accounting for padding.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and pixel art height, accounting for padding.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and pixel art size, accounting for padding.
- **`enabled: boolean`** (getter/setter) – Overrides to also update pixel art appearance when enabled/disabled.

---

## Type Definitions

### `UIPixelArtButton.Params`

```ts
type Params = UIBaseButton.Params &
    UIPixelArt.Params & {
        pixelArtColor?: Colors.Color; // Default: UI.COLORS.WHITE
        pixelArtDisabledColor?: Colors.Color; // Default: UI.COLORS.BF_GREY_2
    };
```

---

## Usage Notes

- **Automatic Monochrome Color State Management**: When the button's `enabled` state changes, monochrome pixel art automatically transitions between `pixelArtColor` (enabled) and `pixelArtDisabledColor` (disabled). Multi-color pixel art remains unaffected.
- **Asynchronous Throttling**: The internal `UIPixelArt` is scheduled through the sequential throttling dispatcher across server ticks (`Events.OnTickStart`). Check `button.isReady` or `button.progress` if coordinating initial loading sequences.
- **Padding & Layout**: Setting `padding` creates inset margins inside the root container, sizing the inner pixel art canvas to `(width - 2 * padding, height - 2 * padding)`.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base content button class
- [UIPixelArt Documentation](../pixel-art/README.md) – For pixel art encoding and throttling engine details
- [UIButton Documentation](../button/README.md) – For information about button properties and event handlers
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
