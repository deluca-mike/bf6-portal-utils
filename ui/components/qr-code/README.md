# UIQRCode Component

<ai>

The `UIQRCode` component renders optimized QR codes using a hybrid rendering algorithm that combines **Z-index layering (Painter's Algorithm)** with **greedy rectilinear partitioning**. It drastically minimizes native engine draw calls (reducing widget counts by 60%–85% compared to naive pixel-by-pixel rendering) while consuming only **1 slot** in the global `UI.MAX_ELEMENTS` pool.

The component supports both pre-computed 2D matrices (from packages like `qr-image` or custom generators) and direct text payloads using a built-in, zero-dependency QR matrix encoder supporting standard QR Versions 1–40 and error correction levels L, M, Q, and H.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

### Rendering from a Text Payload

```ts
import { UIQRCode } from 'bf6-portal-utils/ui/components/qr-code';
import { UI } from 'bf6-portal-utils/ui';

// Create a QR code from a URL or text string
const qrCode = new UIQRCode({
    text: 'https://discord.gg/example',
    ecc: UIQRCode.ECC.Medium,
    scale: 1, // Default: 10 pixels per module
    position: { x: 0, y: 0 },
    anchor: mod.UIAnchor.Center,
    darkColor: UI.COLORS.BLACK,
    lightColor: UI.COLORS.WHITE,
    margin: 2, // 2 modules quiet zone
});

// Access properties
console.log(`Version: ${qrCode.version}, Draw calls: ${qrCode.drawCallCount}`);

// Mutate payload dynamically
qrCode.setText('https://battlefield.com/new-room-id');

// Delete when done (frees all native widgets and slot)
qrCode.delete();
```

### Rendering from a Pre-Computed 2D Matrix

```ts
import { UIQRCode } from 'bf6-portal-utils/ui/components/qr-code';

// Pre-computed 2D matrix (1/0 or true/false)
const matrix = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 1, 1],
];

const qrCode = new UIQRCode({
    matrix,
    scale: 2, // 20 pixels per module
    position: { x: 100, y: 100 },
});
```

</ai>

---

## Optimization Architecture

1. **Phase 1: Background Canvas (Z = 0)**
    - Floods the entire QR code bounding box with a solid background color.
    - Eliminates the need to render any light modules or quiet-zone whitespace.
2. **Phase 2: Structural Elements (Z-Index Stacking)**
    - **Finder Patterns (Corner Eyes)**: Rendered by stacking 3 nested rectangles: a 7x7 dark base, a 5x5 light cutout, and a 3x3 dark core. Exactly 3 draw calls per eye (9 total).
    - **Alignment Patterns ($V \ge 2$)**: Rendered by stacking 3 nested rectangles: a 5x5 dark base, a 3x3 light cutout, and a 1x1 dark core. Exactly 3 draw calls per alignment pattern.
3. **Phase 3: Data Modules (Greedy Rectilinear Merging)**
    - Scans unvisited dark modules and expands horizontally across contiguous runs, then expands vertically across matching rows to form maximal rectangles drawn in a single call.
4. **Memory & Slot Conservation**:
    - Consumes only **1** slot in `UI.MAX_ELEMENTS = 2048`. Sub-rectangles are native engine widgets parented directly to the root container.
    - Zero heap allocation during matrix traversal via pre-allocated typed arrays.

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `text` | `string \| undefined` | Text string to encode into a QR code. Mutually exclusive with `matrix`. |
| `matrix` | `UIQRCode.Matrix \| undefined` | Pre-generated 2D matrix (array of rows containing `1`/`0` or `true`/`false`). |
| `ecc` | `UIQRCode.ECC = UIQRCode.ECC.Medium` | Error correction level when `text` is supplied (`'L'`, `'M'`, `'Q'`, `'H'`). |
| `scale` | `number = 1` | Scale multiplier. When `1`, the smallest module is 10 units wide/tall. When `2`, it is 20 units. |
| `margin` | `number = 0` | Quiet zone margin around the QR code in module units. |
| `darkColor` | `mod.Vector = UI.COLORS.BLACK` | Color vector for dark modules. |
| `darkAlpha` | `number = 1` | Opacity for dark modules. |
| `lightColor` | `mod.Vector = UI.COLORS.WHITE` | Color vector for light modules and background canvas. |
| `lightAlpha` | `number = 1` | Opacity for light modules and background canvas. |
| `x`, `y` | `number = 0` | Position relative to `anchor`. Mutually exclusive with `position`. |
| `position` | `UI.Position \| undefined` | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`. |
| `width`, `height` | `number \| undefined` | Explicit size in screen units. When omitted, automatically computed from `(matrixSize + 2 * margin) * 10 * scale`. |
| `size` | `UI.Size \| undefined` | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`. |
| `anchor` | `mod.UIAnchor = mod.UIAnchor.Center` | See `mod` namespace for enum values. |
| `parent` | `UI.Parent \| undefined` | Parent node. Defaults to `UI.ROOT_NODE` when omitted. |
| `visible` | `boolean = true` | Initial visibility. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order depth. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience for the UI element. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIQRCode` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`, `setX()`, `setY()`, `setWidth()`, `setHeight()`
- **Visibility**: `visible`, `setVisible()`, `show()`, `hide()`
- **Layout & Depth**: `anchor`, `depth`
- **Parent Management**: `parent`, `setParent()`
- **Lifecycle**: `delete()`, `isDeleted`

### Component-Specific

- **`drawCallCount: number | undefined`** (getter) – Total native draw calls (widgets) used to render the QR code.
- **`matrix: UIQRCode.BooleanMatrix | undefined`** (getter) – The current 2D boolean module matrix.
- **`version: number | undefined`** (getter) – The QR version number (1–40).
- **`text: string | undefined`** (getter) – The text payload string (if initialized with `text`).
- **`ecc: UIQRCode.ECC | undefined`** (getter) – The error correction level.
- **`scale: number | undefined`** (getter/setter) – Scale multiplier.
- **`setScale(scale: number): this`** – Sets scale and re-renders child rectangles.
- **`margin: number | undefined`** (getter/setter) – Quiet zone margin count.
- **`setMargin(margin: number): this`** – Sets margin and re-renders child rectangles.
- **`darkColor: mod.Vector | undefined`** (getter/setter) – Dark module color.
- **`setDarkColor(color: mod.Vector): this`** – Sets dark module color and re-renders.
- **`lightColor: mod.Vector | undefined`** (getter/setter) – Light module / background color.
- **`setLightColor(color: mod.Vector): this`** – Sets light module color and re-renders.
- **`setText(text: string, ecc?: UIQRCode.ECC): this`** – Dynamically updates content and re-encodes.
- **`setMatrix(matrix: UIQRCode.Matrix): this`** – Dynamically updates 2D matrix and re-renders.

---

## Type Definitions

<ai>

### `UIQRCode.Matrix`

```ts
type Matrix = ReadonlyArray<ReadonlyArray<boolean | number>>;
```

### `UIQRCode.BooleanMatrix`

```ts
type BooleanMatrix = ReadonlyArray<ReadonlyArray<boolean>>;
```

### `UIQRCode.ECC`

```ts
enum ECC {
    Low = 'L',
    Medium = 'M',
    Quartile = 'Q',
    High = 'H',
}
```

### `UIQRCode.Encoder.encode(text: string, ecc?: UIQRCode.ECC): boolean[][]`

Standalone function to encode any string into a 2D boolean QR matrix without external dependencies.

```ts
const matrix = UIQRCode.Encoder.encode('Hello Battlefield', UIQRCode.ECC.Medium);
```

</ai>

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and core architecture.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations.
