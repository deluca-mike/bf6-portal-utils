# UIPixelArt Component

<ai>

The `UIPixelArt` component renders high-fidelity pixel art, icons, sprites, and logos inside Battlefield Portal using a custom, high-efficiency binary image format. It transforms raster images into optimized native UI container widgets through **2D Rectilinear Painter's Decomposition**, drastically reducing engine draw calls (typically by 60%–90%).

The component supports both Base64 and ultra-compact Base122 string payloads, full alpha transparency or 1-bit cutouts, 8-bit/16-bit coordinate systems, and runtime monochrome color tinting.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

### Rendering Pixel Art

```ts
import { UIPixelArt } from 'bf6-portal-utils/ui/components/pixel-art';
import { UI } from 'bf6-portal-utils/ui';

// Create a pixel art element from an encoded Base64 or Base122 string
const pixelArt = new UIPixelArt({
    data: '<BASE64_OR_BASE122_DATA>',
    position: { x: 0, y: -100 },
    size: { width: 128, height: 128 },
    anchor: UI.Anchor.Center,
    visible: true,
});

// Access diagnostic properties
console.log(`Draw calls: ${pixelArt.drawCallCount}`);

// Dynamic color tinting (monochrome pixel art)
pixelArt.setColor(UI.COLORS.GOLD);

// Delete when done (frees all native child widgets and internal pool slot)
pixelArt.delete();
```

</ai>

---

## Custom Image Format & Design Rationale

### The Challenge in Battlefield Portal

Battlefield Portal's UI scripting API lacks built-in raster image rendering or bitmap texture drawing primitives. Developers are restricted strictly to solid-colored container widgets (`mod.AddUIContainer`), with an unknown but real limit in global `UIWidget`s, memory, and FFI-call overhead.

A naive rasterization approach (rendering each pixel as a 1x1 container) would require 4,096 widgets for a single 64×64 icon, instantly crashing the server or overflowing the UI budget.

### Why Not BMP or 1D Run-Length Encoding (RLE)?

Traditional image formats like BMP with RLE compress image data exclusively in 1D along horizontal scanlines. When applied to 2D UI widgets:

- 1D scanline compression cannot merge vertically adjacent lines with identical colors.
- It produces an excessive number of horizontal sliver rectangles.
- Complex geometric shapes, curves, and solid backgrounds result in hundreds of unnecessary draw calls.

### The Custom Pixel Art Format Solution

Our custom image format was designed from first principles for Battlefield Portal UI:

1. **PNG-Style Indexed Color Palette (1..256 Colors) & Compact Alpha Palettes**:
    - **Multi-Color Mode**: Supports 24-bit RGB ($3$ bytes/color) or 32-bit RGBA ($4$ bytes/color) palettes.
    - **Monochrome with Opacity Mode** (`isMonochrome` + `hasOpacity`): Uses a compact alpha palette storing only $1$ byte per alpha level ($0..255$). This enables anti-aliased icon edges, soft shadows, and varied translucency while minimizing payload footprint.
    - **Solid 1-Bit Monochrome Mode** (`isMonochrome` without opacity): The palette table is completely omitted ($0$ bytes) and individual rectangles omit the `paletteIndex` byte ($4$ or $8$ bytes per rectangle).

2. **2D Rectilinear Painter's Decomposition**:
    - **Background Canvas Flooding ($Z = 0$)**: Automatically identifies the most dominant background color (or transparent canvas) and renders it as a single solid base rectangle, instantly eliminating up to **40%–70%** of individual pixel draw calls.
    - **Maximal 2D Rectangle Expansion ($Z \ge 1$)**: Greedily merges contiguous runs of identical pixels across both columns and rows into maximal bounding boxes.

3. **Compact 8-Bit / 16-Bit Coordinate Encoding**:
    - Automatically utilizes 8-bit coordinates (`0..255`) for standard pixel art and switches to 16-bit little-endian coordinates for large canvases up to `65,535×65,535`.

4. **Perceptual Oklab & 3D Space-Filling Curve (Hilbert Curve) Palette Sorting**:
    - Colors are mapped into the perceptual **Oklab** color space ($L, a, b$) and sorted using a **3D Hilbert Space-Filling Curve** refined with nearest-neighbor $\Delta E_{\text{ok}}$ path minimization.
    - Neighboring palette swatches are perceptually smooth and coherent to human vision.

5. **Base122 vs. Base64 String Payloads**:
    - **Base64**: Standard 6-bit encoding (33% size overhead).
    - **Base122**: High-density 7-bit encoding (~14% size overhead) specifically crafted to avoid JSON/JavaScript illegal characters (`\0`, `\n`, `\r`, `"`, `&`, `\`), allowing compact raw string embedding directly in TypeScript code.

6. **Two-Tier Sequential Throttling Dispatcher (Draw, Update, Delete)**:
    - To prevent server-frame hitches from native FFI overhead (`mod.AddUIContainer`, `mod.SetUIWidgetBgColor`, `mod.DeleteUIWidget`), draw creation, color mutation, and element deletion are throttled across server ticks (`Events.OnTickStart`).
    - **Tier 1 (Pending Pixel Art Queue)**: Incoming pixel arts wait in a circular FIFO queue (`_pendingPixelArtIds: Int32Array(128)`) before decoding or rectangle rendering runs.
    - **Tier 2 (Active Operation Stream)**: Operations consume from a global tick budget (`tickBudget`, default `10`) according to configured operation costs (`drawCost = 1.0`, `updateCost = 0.25`, `deleteCost = 0.5`).
    - **Streaming Zero-Allocation Draw**: Rectangles are decoded and created directly on-the-fly from the Base64/Base122 stream cursor without allocating intermediate rectangle arrays on the heap.
    - **Strict Deletion Order**: Child rectangle widgets are deleted in throttled batches first; the Art Container and Base Container are deleted only after all child widgets have been safely destroyed.
    - **Mid-Draw Safe Mutations**: Changing color on a monochrome image or deleting an active pixel art mid-draw seamlessly schedules the required recolor or cleanup pass without creating orphaned native widgets.
    - Real-time rendering state is exposed via the `state` (`Idle`, `Drawing`, `Updating`, `Deleting`), `progress` (0%..100%), and `isReady` getters.

```
+----------------------------------------------------------------------------------------+
|                               OPERATION DISPATCHER PIPELINE                            |
|                                                                                        |
|  1. Invocations:                                                                       |
|     - new UIPixelArt(...)  --> Requests DRAW                                           |
|     - pa.setColor(...)     --> Requests UPDATE (monochrome only)                       |
|     - pa.delete()          --> Requests DELETE                                         |
|                                                                                        |
|  2. Queueing Policy:                                                                   |
|     - All operation requests (draw, color update, deletion) enter the FIFO pipeline.   |
|     - Child rectangle FFI calls execute exclusively in Events.OnTickStart.             |
|     - Mid-draw and mid-update requests transition state seamlessly without waste.      |
|     - Advance across ticks via Events.OnTickStart up to tickBudget.                    |
+----------------------------------------------------------------------------------------+
                                            |
                                            v
+----------------------------------------------------------------------------------------+
|                           TICK DISPATCHER (Events.OnTickStart)                         |
|                                                                                        |
|  Tick Budget: UIPixelArt.tickBudget (default: 10 per tick)                             |
|  Operation Costs:                                                                      |
|    - drawCost:   1.0  (cost = drawn * drawCost; up to 10 widgets/tick)                 |
|    - updateCost: 0.25 (cost = updated * updateCost; up to 40 widgets/tick)             |
|    - deleteCost: 0.5  (cost = deleted * deleteCost; up to 20 widgets/tick)             |
|                                                                                        |
|  Budget loop handles any mix of operations within a single tick!                       |
+----------------------------------------------------------------------------------------+
```

### Binary Layout Specification

```
┌───────────┬──────────────┬──────────────┬──────────────────┬──────────────┬─────────────────────────┐
│ Header    │ Dimensions   │ Palette Size │ Palette Data     │ Rect Count   │ Rectangles Data         │
│ (1 Byte)  │ (2 or 4 B)   │ (0 or 1 B)   │ (N × 1, 3, or 4B)│ (2 Bytes LE) │ (M × 4, 5, 8, or 9 B)   │
└───────────┴──────────────┴──────────────┴──────────────────┴──────────────┴─────────────────────────┘
```

| Field | Size | Description |
| --- | --- | --- |
| **Flags** | 1 Byte | Bit 0 (`0x01`): `hasOpacity`<br>Bit 1 (`0x02`): `is16BitCoords`<br>Bit 2 (`0x04`): `isMonochrome` |
| **Width** | 1 or 2 Bytes | Grid width in pixel units (8-bit or 16-bit unsigned LE). |
| **Height** | 1 or 2 Bytes | Grid height in pixel units (8-bit or 16-bit unsigned LE). |
| **Palette Count** | 0 or 1 Byte | Number of palette entries minus 1 (`0..255` representing 1..256 levels). Omitted in solid monochrome mode (`isMonochrome` without opacity). |
| **Palette Entries** | $N \times 1, 3,$ or $4$ Bytes | • **Multi-Color**: RGB ($3$ bytes) or RGBA ($4$ bytes if `hasOpacity` is set) per entry.<br>• **Monochrome with Opacity**: Alpha value ($1$ byte) per entry.<br>• **Solid Monochrome**: Omitted ($0$ bytes). |
| **Rectangles Count** | 2 Bytes | Total number of decomposed rectangles (16-bit unsigned LE). |
| **Rectangles** | $M \times 4, 5, 8,$ or $9$ Bytes | Packed rectangle entries:<br>• `x`, `y`, `w`, `h`: 8-bit or 16-bit unsigned LE.<br>• `paletteIndex`: 1 Byte (omitted only in solid monochrome mode without opacity). |

---

## CLI Encoder Tool

The CLI tool converts PNG images into optimized Base64 and Base122 payloads. By default, it outputs only the encoded string (`base64` or `base122`), or a complete JSON report when `--json` is specified.

### Running the CLI

```bash
npx ts-node --esm scripts/encode-pixel-art.ts <image-path.png> [options]
```

### CLI Options

| Option | Type / Default | Description |
| --- | --- | --- |
| `<image-path.png>` | `string` | **Required.** Path to the source PNG image file. |
| `--out-type <type>` | `'base64' \| 'base122' = 'base64'` | Output payload encoding format (`base64` or `base122`). Can also be passed as `--outType`. |
| `--max-colors <n>` | `number = 32` | Maximum palette colors (or alpha levels in monochrome mode, `1..256`). |
| `--palette-algorithm <alg>` | `'median-cut' \| 'most-frequent' \| 'user-defined'` | Palette quantization strategy (default: `median-cut`). |
| `--palette <colors>` | `string` | Comma-separated hex or rgb colors for user-defined palettes (e.g. `"#ff0000,#00ff00,#0000ff"`). |
| `--monochrome` | Flag | Encode as a monochrome graphic with compact alpha palette (or solid cutout if `--no-opacity`). |
| `--scale <n>` | `number = 1.0` | Target downsampling/upsampling scale factor (e.g. `0.5` for 50% resolution). |
| `--no-opacity` | Flag | Disables alpha transparency retention, converting all colors to opaque RGB. |
| `--alpha-threshold <n>` | `number` | Alpha cutoff threshold (`1..255` or `0.0..1.0`) below which pixels are treated as transparent. Default: `1` with opacity, `128` without. |
| `--json` | Flag | Outputs complete JSON payload and metadata for automated build pipelines. |
| `-h, --help` | Flag | Displays CLI usage instructions and option reference. |

### CLI Usage Examples

```bash
# 1. Basic conversion with default Base64 string output
npx ts-node --esm scripts/encode-pixel-art.ts assets/clan-emblem.png

# 2. Output compact Base122 string payload
npx ts-node --esm scripts/encode-pixel-art.ts assets/clan-emblem.png --out-type base122

# 3. Downscale large image by 50% and quantize to 16 colors
npx ts-node --esm scripts/encode-pixel-art.ts assets/badge.png --scale 0.5 --max-colors 16

# 4. Exact Most Frequent quantization (ideal for flat pixel art sprites or crisp alpha steps)
npx ts-node --esm scripts/encode-pixel-art.ts assets/player-sprite.png --palette-algorithm most-frequent --max-colors 8

# 5. Monochrome icon with Most Frequent alpha levels
npx ts-node --esm scripts/encode-pixel-art.ts assets/radar-icon.png --monochrome --palette-algorithm most-frequent --max-colors 8

# 6. Monochrome icon with User-defined custom alpha palette
npx ts-node --esm scripts/encode-pixel-art.ts assets/radar-icon.png --monochrome --palette "64,128,192,255"

# 7. User-defined custom color palette
npx ts-node --esm scripts/encode-pixel-art.ts assets/crosshair.png --palette "#ffffff,#ff0000,#000000"

# 8. Output JSON report for automated bundling scripts
npx ts-node --esm scripts/encode-pixel-art.ts assets/rank-icon.png --json > assets/rank-icon.json
```

---

## Web Studio & Viewer

The repository includes an interactive, browser-based **Pixel Art Studio & Inspector** ([`pages/pixel-art-studio/index.html`](../../../pages/pixel-art-studio/index.html)) for visually inspecting, tweaking, and fine-tuning pixel art before encoding.

### Building & Serving the Web Studio

The web viewer uses the exact same canonical encoding logic from `scripts/encode-pixel-art.ts` via a bundled distribution module.

```bash
# 1. Build the browser encoder bundle (pages/pixel-art-studio/pixel-art-encoder.js)
npm run build:viewer

# 2. Start the local development server (served at http://localhost:3000/pixel-art-studio/)
npm run serve:viewer
```

### Features & Workflow

- **Drag-and-Drop Image Loading**: Load PNG, JPG, or WebP images instantly into the studio.
- **Live Parameter Controls**:
    - **Resolution Scaling**: Downscale large graphics to crisp pixel art resolutions.
    - **Monochrome Mode**: Toggle between full multi-color palettes and compact, tintable monochrome alpha palettes.
    - **Palette / Alpha Size**: Limit max colors (or max alpha levels) between 1 and 256 with instant preview.
    - **Quantization Algorithms (Supported in both Color & Monochrome modes)**:
        - **Median Cut**: Recursive 3D bounding box color partitioning, or 1D cumulative alpha histogram binning in monochrome mode.
        - **Most Frequent**: Exact color / alpha frequency ranking (preserves flat pixel art colors or predominant alpha steps without blurring).
        - **User Defined**: Fully customizable palette or alpha levels with manual swatch manipulation and live eyedropper.
    - **Alpha Cutout Threshold**: Interactively adjust cutout transparency levels.
- **Interactive Palette Studio**:
    - **Add Swatches (`➕ Add`)**: Appends a new color slot (or alpha level in monochrome mode).
    - **Edit Swatches**: Click any swatch to adjust its color (or double click/click selected in monochrome mode to input an exact alpha).
    - **Delete Swatches (`✕`)**: Remove unwanted colors/alphas with a single click.
    - **Sorting (`🎨 Sort`)**: In color mode, reorders swatches along the 3D Hilbert curve using Oklab ΔE; in monochrome mode, sorts alpha levels ascending.
    - **Canvas Eyedropper**: Click any pixel on the source canvas to sample its color or alpha into the active palette.
    - **Seamless Mode Transitions**: Switching from _Median Cut_ or _Most Frequent_ to _User Defined_ preserves the existing palette for manual refinement.
- **Real-Time Multi-View Visualizer**:
    - **Original Source**: High-res input preview with pixel-picking support.
    - **Quantized Pixel Art**: Resulting color-quantized sprite.
    - **Painter's Decomposition**: Outlines the decomposed rectangles, visually demonstrating draw call optimization.
- **Live Diagnostics & Telemetry**: Real-time display of raw pixel count, widget draw calls, draw call reduction %, binary payload size, and Base64/Base122 character lengths.
- **One-Click Code Exporter**: Copy ready-to-paste TypeScript `UIPixelArt` instantiation code, raw Base64/Base122 strings, or complete JSON metadata.

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `data` | `string` | **Required.** The Base64 or Base122 encoded pixel art payload string. |
| `color` | `Colors.Color \| undefined` | Foreground color tint. For monochrome artwork, sets the fill color. For multi-color artwork, multiplies RGB channels. |
| `alpha` | `number = 1` | Foreground opacity multiplier (`0..1`). Multiplies with palette alpha channels. |
| `x`, `y` | `number = 0` | Position relative to `anchor`. Mutually exclusive with `position`. |
| `position` | `UI.Position \| undefined` | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`. |
| `width`, `height` | `number \| undefined` | Size in screen units. Defaults to original pixel art grid dimensions when omitted. Mutually exclusive with `size`. |
| `size` | `UI.Size \| undefined` | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`. |
| `anchor` | `UI.Anchor = UI.Anchor.Center` | Anchor alignment point. |
| `parent` | `UI.Parent \| undefined` | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed. |
| `visible` | `boolean = true` | Initial visibility. |
| `bgColor` | `UI.Color = UI.COLORS.BLACK` | Background color for the root container. |
| `bgAlpha` | `number = 0` | Background opacity for the root container. |
| `bgFill` | `UI.BgFill = UI.BgFill.Solid` | Fill mode for the root container. |
| `depth` | `UI.Depth = UI.Depth.AboveGameUI` | Z-order depth. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience for the UI element. When omitted, inherits parent's receiver. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIPixelArt` inherits all core properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`, `getPosition(out?)`, `getSize(out?)`, `setX()`, `setY()`, `setWidth()`, `setHeight()`
- **Visibility**: `visible`, `setVisible()`, `show()`, `hide()`
- **Background**: `bgColor`, `getBgColor(out?)`, `bgAlpha`, `bgFill`
- **Layout & Depth**: `anchor`, `depth`
- **Parent Management**: `parent`, `setParent()`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Component-Specific

- **`state: UIPixelArt.State | undefined`** (getter) – Current throttled lifecycle state (`Idle`, `Drawing`, `Updating`, `Deleting`). Returns `undefined` if deleted.
- **`progress: number | undefined`** (getter) – Operation progress from `0` to `100` percent. Returns `100` when Idle, `0` when queued, `(cursor / count) * 100` during active operation, or `undefined` if deleted.
- **`isReady: boolean | undefined`** (getter) – `true` if all child rectangles have finished rendering and the element is Idle, `false` while busy, or `undefined` if deleted.
- **`isMonochrome: boolean | undefined`** (getter) – `true` if monochrome mode, `false` if multi-color, or `undefined` if deleted.
- **`drawCallCount: number | undefined`** (getter) – Total native UI container widgets created to render the pixel art (including root base container and art container). Returns `undefined` if deleted.
- **`color: Colors.Color | null | undefined`** (getter/setter) – Foreground/tint color. Supports zero-allocation `getColor(out?)`. Only applies to monochrome pixel art (returns `null` for multi-color).
- **`setColor(color: Colors.Color): this`** – Updates the foreground/tint color across ticks using `updateCost` and returns `this` for chaining. Only applies to monochrome pixel art.
- **`delete(): void`** – Throttles deletion of all native child container widgets before destroying containers and releasing the internal slot in `UIPixelArt.MAX_PIXEL_ARTS`.

---

## Type Definitions

### `UIPixelArt.State`

```ts
export namespace UIPixelArt {
    export enum State {
        Idle = 0,
        Drawing = 1,
        Updating = 2,
        Deleting = 3,
    }
}
```

### `UIPixelArt.Params`

```ts
export namespace UIPixelArt {
    export type Params = UI.ElementParams & {
        /** The Base64 or Base122 encoded pixel art payload string. */
        data: string;
        /** Optional foreground color (monochrome) or tint color (multi-color). */
        color?: Colors.Color;
    };
}
```

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and core architecture.
- [UI Button Documentation](../button/README.md) – For interactive button components.
- [UI Container Documentation](../container/README.md) – For layout containers.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations.
