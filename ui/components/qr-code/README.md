# UIQRCode Component

<ai>

The `UIQRCode` component renders optimized QR codes using pure dark module rendering with **greedy rectilinear rectangle merging** and **bounded overlap**. The Base Container exclusively owns the background canvas, while the QR Container renders exclusively dark module rectangles with zero light cutout widgets. This drastically minimizes native engine draw calls (reducing widget counts by 60%–85% compared to naive pixel-by-pixel rendering) while consuming only **1 slot** in the global `UI.MAX_ELEMENTS` pool.

The component encodes text payloads into QR codes using a built-in, zero-dependency QR matrix encoder supporting standard QR Versions 1–40 and error correction levels L, M, Q, and H.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

### Rendering a QR Code

```ts
import { UIQRCode } from 'bf6-portal-utils/ui/components/qr-code';
import { UI } from 'bf6-portal-utils/ui';

// Create a QR code from a URL, text string, or raw bytes
const qrCode = new UIQRCode({
    data: 'https://discord.gg/example',
    ecc: UIQRCode.ECC.Medium,
    position: { x: 0, y: 0 },
    size: { width: 200, height: 200 },
    anchor: UI.Anchor.Center,
    color: UI.COLORS.BLACK,
    bgColor: UI.COLORS.WHITE,
    margin: 4, // 4 modules quiet zone
});

// Access diagnostic properties
console.log(`Draw calls: ${qrCode.drawCallCount}`);

// Dynamic dark module color mutation (throttled across server ticks)
qrCode.setColor(UI.COLORS.BLUE);

// Delete when done (frees all native widgets and slot)
qrCode.delete();
```

</ai>

---

## Optimization Architecture & 3-Tier Container Hierarchy

The component employs a 3-tier hierarchy mirroring `UIPixelArt`:

1. **Base Container (Tier 1)**
    - Owns `bgColor`, `bgAlpha`, and `bgFill`.
    - Handles external positioning (`x`, `y`, `anchor`, `depth`) and overall bounding size (`width`, `height`).
    - Floods the background canvas with a solid light color, eliminating the need to render individual light background modules.
2. **QR Container (Tier 2)**
    - Centered inside the Base Container (`anchor: UI.Anchor.Center`, `position: (0, 0)`).
    - Transparent (`bgFill: None`, `bgAlpha: 0`) and sized square to fit inside the Base Container while preserving a 1:1 aspect ratio.
    - Sized to include the perimeter quiet zone (enforced minimum of 4 modules per ISO/IEC 18004).
3. **Module Rectangle Widgets (Tier 3)**
    - Parented to the **QR Container** (`anchor: UI.Anchor.TopLeft`).
    - Positioned offset from the top-left of the QR Container by `margin * cellWidth` and `margin * cellHeight` to guarantee the 4+ module quiet zone on all four perimeters.
    - Rendered using **pure dark module rendering** with **greedy rectilinear merging** and bounded overlap across the entire matrix (including finders, alignments, timing patterns, and data). Zero light cutout widgets are created.
4. **Flushing & Animation**:
    - Resizing or moving the QR code only updates the Base Container during `UI.flush()`, keeping internal widgets static and preventing engine performance drops.
    - Dark module color mutations (`setColor`) mark dirty flags and batch update native child widgets during `UI.flush()`. Background styling is updated via standard `UI.Element` methods (`setBgColor`, `setBgAlpha`, `setBgFill`).
5. **QuickJS 1024 KB Memory Ceiling & Extreme Low-Footprint Architecture**:
    - Engineered specifically for Battlefield 6 Portal's strict 1024 KB QuickJS memory ceiling.
    - All specialized UI components share a single consolidated 4 KB lookup array (`UI.Element._elementToCustomSlot`), freeing ~16 KB across the UI subsystem.
    - Total static QR memory footprint is reduced to ~48 KB: per-slot dimension arrays and progress arrays are eliminated by deriving cell and margin scales dynamically from `UI.Element` and calculating progress on the fly.
    - Slot free-list (`_nextFreeQrCode`) does dual duty: storing the free-list pointer when inactive, and multiplexing 2-bit ECC mode, 2-bit state (`Idle`, `Drawing`, `Updating`, `Deleting`), and mid-draw dirty flags when active.
    - Static scratch buffers (`_scratchBuffer` and `_rectBuffer`) are preallocated based on `MAX_QR_VERSION` (default `18`), bounding static memory consumption while comfortably supporting dense payloads of 500+ alphanumeric characters. Payloads requiring higher versions safely fail initialization without allocating or drawing.
    - GF($2^8$) Reed-Solomon generator polynomials (degrees 1..30) are precomputed once at module load time (~495 bytes), eliminating dynamic polynomial multiplication.
    - Payloads are stored in a preallocated static array during queueing and immediately released (`null`) upon matrix packing, preventing heap fragmentation and keeping class instance objects at minimal size (zero custom instance fields).
    - Zero runtime objects or arrays allocated during UTF-8 encoding, Reed-Solomon generation, masking, or rectilinear rectangle extraction.
6. **Two-Tier Sequential Throttling Dispatcher (Draw, Update, Delete)**:
    - To prevent server-frame hitches from native FFI overhead (`mod.AddUIContainer`, `mod.SetUIWidgetBgColor`, `mod.DeleteUIWidget`), draw creation, color mutation, and element deletion are throttled across server ticks (`Events.OnTickStart`).
    - **Tier 1 (Pending QR Queue)**: Incoming QR codes wait in a circular FIFO queue (`_pendingQrIds: Int32Array(128)`) _before_ encoding or rectangle packing runs.
    - **Tier 2 (Active Operation Stream)**: Operations consume from a global tick budget (`tickBudget`, default `10`) according to configured operation costs (`drawCost = 1.0`, `updateCost = 0.25`, `deleteCost = 0.5`).
    - **Strict Deletion Order**: Child rectangle widgets are deleted in throttled batches first; the QR Container and Base Container are deleted only after all child widgets have been safely destroyed.
    - **Mid-Draw Safe Mutations**: Changing color or deleting an active QR code mid-draw seamlessly schedules the required recolor or cleanup pass without creating orphaned native widgets or leaving inconsistent module colors.
    - Real-time rendering state is exposed via the `state` (`Idle`, `Drawing`, `Updating`, `Deleting`), `progress` (0%..100%), and `isReady` getters.

```
+----------------------------------------------------------------------------------------+
|                               OPERATION DISPATCHER PIPELINE                            |
|                                                                                        |
|  1. Invocations:                                                                       |
|     - new UIQRCode(...)    --> Requests DRAW                                           |
|     - qr.setColor(...)     --> Requests UPDATE                                         |
|     - qr.delete()          --> Requests DELETE                                         |
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
|  Tick Budget: UIQRCode.tickBudget (default: 10 per tick)                               |
|  Operation Costs:                                                                      |
|    - drawCost:   1.0  (cost = drawn * drawCost; up to 10 widgets/tick)                 |
|    - updateCost: 0.25 (cost = updated * updateCost; up to 40 widgets/tick)             |
|    - deleteCost: 0.5  (cost = deleted * deleteCost; up to 20 widgets/tick)             |
|                                                                                        |
|  Budget loop handles any mix of operations within a single tick!                       |
+----------------------------------------------------------------------------------------+
```

7. **Crash-Proof Safe Error Handling**:
    - To protect dedicated servers against unhandled exceptions, `UIQRCode` never throws errors during normal runtime. If invalid parameters, null payloads, or payloads exceeding `MAX_QR_VERSION` (or QR Version 40 capacity) are passed, it logs an error via `LogLevel.Error`, deletes the instance cleanly, and returns an invalid element (`isDeleted === true`, `isReady === undefined`).
8. **Memory & Slot Conservation**:
    - Consumes only **1** slot in `UI.MAX_ELEMENTS = 2048`. Sub-pool limit is 128 concurrent QR codes (`MAX_QR_CODES = 128`).

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `data` | `UIQRCode.Payload` | **Required.** Payload to encode: `string`, `Uint8Array`, or `readonly number[]`. |
| `ecc` | `UIQRCode.ECC = UIQRCode.ECC.Medium` | Error correction level (`'L'`, `'M'`, `'Q'`, `'H'`). |
| `scale` | `number = 1` | Optional scale multiplier used to compute default width and height when explicit `size` (or `width`/`height`) is omitted. When `1`, the base module size is 10 units. Note that `scale` is only a constructor parameter and not stored as an instance property. |
| `margin` | `number = 4` | Quiet zone margin around the QR code in module units (enforced minimum 4 per ISO/IEC 18004). |
| `color` | `Colors.Color = UI.COLORS.BLACK` | Color for dark module rectangles. |
| `bgColor` | `Colors.Color = UI.COLORS.WHITE` | Color for background canvas. |
| `bgAlpha` | `number = 1` | Opacity for background canvas (`0..1`). |
| `bgFill` | `UI.BgFill = UI.BgFill.Solid` | Fill style for background canvas. |
| `x`, `y` | `number = 0` | Position relative to `anchor`. Mutually exclusive with `position`. |
| `position` | `UI.Position \| undefined` | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`. |
| `width`, `height` | `number \| undefined` | Explicit size in screen units. When omitted, automatically computed from `(matrixSize + 2 * margin) * 10 * scale`. Mutually exclusive with `size`. |
| `size` | `UI.Size \| undefined` | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`. |
| `anchor` | `UI.Anchor = UI.Anchor.Center` | Anchor alignment point. |
| `parent` | `UI.Parent \| undefined` | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed. |
| `visible` | `boolean = true` | Initial visibility. |
| `depth` | `UI.Depth = UI.Depth.AboveGameUI` | Z-order depth. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience for the UI element. When omitted, inherits parent's receiver. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIQRCode` inherits all core properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`, `getPosition(out?)`, `getSize(out?)`, `setX()`, `setY()`, `setWidth()`, `setHeight()`, `setPosition()`, `setSize()`
- **Visibility**: `visible`, `setVisible()`, `show()`, `hide()`
- **Background**: `bgColor`, `getBgColor(out?)`, `bgAlpha`, `bgFill`, `setBgColor()`, `setBgAlpha()`, `setBgFill()`
- **Layout & Depth**: `anchor`, `setAnchor()`, `depth`, `setDepth()`
- **Parent Management**: `parent`, `setParent()`
- **UI Input Mode**: `uiInputModeWhenVisible`, `setUiInputModeWhenVisible()`
- **Lifecycle**: `delete()`, `isDeleted`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Component-Specific

- **`state: UIQRCode.State | undefined`** (getter) – Current operational lifecycle state of the QR code (`UIQRCode.State.Idle = 0`, `Drawing = 1`, `Updating = 2`, `Deleting = 3`). Returns `undefined` if deleted.
- **`progress: number | undefined`** (getter) – Current rendering or updating progress from `0` to `100` percent. Returns `0` while queued, `0..100` while actively drawing or updating across ticks, `100` when idle/complete, or `undefined` if deleted.
- **`isReady: boolean | undefined`** (getter) – Indicates whether all child module rectangle widgets have completed drawing and any pending updates (`state === UIQRCode.State.Idle`). Returns `true` when idle/ready, `false` while queued or in-flight across server ticks, and `undefined` if deleted.
- **`drawCallCount: number | undefined`** (getter) – Total native draw calls (widgets) currently instantiated to render the QR code: Base Container (1) + QR Container (1) + active module rectangles ($N$). Returns `undefined` if deleted.
- **`color: Colors.Color | undefined`** (getter/setter) – Dark module color. Supports zero-allocation `getColor(out?)` and throttled `setColor(color)`.
- **`getColor(out?: Colors.Color): Colors.Color | undefined`** – Retrieves the dark module color into an optional target `Color` object without memory allocation.
- **`setColor(color: Colors.Color): this`** – Sets dark module color and throttles `mod.SetUIWidgetBgColor` across ticks according to `UIQRCode.updateCost` and `UIQRCode.tickBudget`.
- **`delete(): void`** – Throttles deletion of child module rectangles according to `UIQRCode.deleteCost` and `UIQRCode.tickBudget`. The QR Container and Base Container are deleted only after all child module widgets have been removed.

### Static Methods & Configuration

- **`UIQRCode.MAX_QR_CODES: number`** (readonly, default: `128`) – The maximum number of QR code widgets that can exist concurrently in memory sub-pool.
- **`UIQRCode.MAX_QR_VERSION: number`** (readonly, default: `18`) – Maximum supported QR Code version (1 through 40). Determines the compile-time sizing of preallocated static scratch buffers (`_scratchBuffer` and `_rectBuffer`), bounding memory consumption while accommodating large payloads up to Version 18 (~500+ alphanumeric characters). Payloads exceeding `MAX_QR_VERSION` safely fail initialization.
- **`UIQRCode.DEFAULT_MARGIN: number`** (readonly, default: `4`) – Default quiet zone margin in module units per ISO/IEC 18004.
- **`UIQRCode.MIN_QUIET_ZONE: number`** (readonly, default: `4`) – Minimum required quiet zone margin in module units per ISO/IEC 18004.
- **`UIQRCode.tickBudget: number`** – Total native engine `mod` FFI execution cost budget permitted per server tick (`Events.OnTickStart`). Defaults to `10`.
- **`UIQRCode.drawCost: number`** – Cost incurred per native widget container addition (`mod.AddUIContainer`). Defaults to `1.0` (permitting up to 10 container additions per tick with default `tickBudget` of 10).
- **`UIQRCode.updateCost: number`** – Cost incurred per native widget background color update (`mod.SetUIWidgetBgColor`). Defaults to `0.25` (permitting up to 40 widget color updates per tick with default `tickBudget` of 10).
- **`UIQRCode.deleteCost: number`** – Cost incurred per native widget deletion (`mod.DeleteUIWidget`). Defaults to `0.5` (permitting up to 20 widget deletions per tick with default `tickBudget` of 10).
- **`UIQRCode.getActiveQRCodeCount(): number`** – Returns the number of currently active QR code instances.

---

## CLI Encoder Tool

The CLI tool encodes URLs, plain text strings, or raw binary files into optimized QR code layouts with greedy rectilinear rectangle merging, reporting draw call reduction metrics and generating ready-to-paste TypeScript code snippets with terminal ASCII previews.

### Running the CLI

```bash
npx ts-node scripts/encode-qr-code.ts <text-or-url> [options]
```

### CLI Options

| Option | Type / Default | Description |
| --- | --- | --- |
| `<text-or-url>` | `string` | Payload string or URL to encode. |
| `--data <string>` | `string` | Explicit payload text string (alternative to positional argument). |
| `--file <path>` | `string` | Path to a text or binary file to read payload data from. |
| `--ecc <level>` | `'L' \| 'M' \| 'Q' \| 'H'` | Error correction level (`L`: Low, `M`: Medium, `Q`: Quartile, `H`: High). Default: `M`. |
| `--margin <n>` | `number = 4` | Quiet zone margin around the QR code in module units (enforced minimum 4 per ISO/IEC 18004). |
| `--scale <n>` | `number = 1.0` | Scale multiplier for computing sizing in the generated TypeScript snippet. |
| `--no-preview` | Flag | Suppresses the ASCII QR code terminal visualizer. |
| `--invert` | Flag | Inverts dark/light module rendering in the ASCII preview for light terminal backgrounds. |
| `--json` | Flag | Outputs complete JSON report containing matrix data, merged rectangle coordinates, and optimization metrics. |
| `-h, --help` | Flag | Displays CLI usage instructions and option reference. |

### CLI Usage Examples

```bash
# 1. Basic URL encoding with default Medium error correction
npx tsx scripts/encode-qr-code.ts "https://discord.gg/example"

# 2. High error correction with custom quiet zone margin
npx tsx scripts/encode-qr-code.ts "https://portal.battlefield.com" --ecc H --margin 6

# 3. Read payload from a text or data file
npx tsx scripts/encode-qr-code.ts --file payload.txt --ecc Q

# 4. Output JSON metrics and rectangle decomposition for build pipelines
npx tsx scripts/encode-qr-code.ts "https://battlefield.com" --json > qr-data.json
```

---

## Web Studio & Viewer

The repository includes an interactive, browser-based **UIQRCode Studio & Inspector** ([`pages/qr-code-studio/index.html`](../../../pages/qr-code-studio/index.html)) for visually inspecting QR code generation, error correction levels, and rectilinear rectangle merging optimizations.

### Building & Serving the Web Studio

The web viewer uses the exact same canonical encoding logic from `scripts/encode-qr-code.ts` (subclassing `UIQRCode`) via a bundled distribution module.

```bash
# 1. Build the browser encoder bundles (pages/qr-code-studio/qr-code-encoder.js & pixel-art-encoder.js)
npm run build:viewer

# 2. Start the local development server (served at http://localhost:3000/qr-code-studio/)
npm run serve:viewer
```

---

## Type Definitions

### `UIQRCode.Params`

```ts
export namespace UIQRCode {
    export type Params = UI.ElementParams & {
        /**
         * Payload to encode into a QR code (string, Uint8Array, or number array).
         */
        data: UIQRCode.Payload;
        /**
         * Error correction level (defaults to `ECC.Medium`).
         */
        ecc?: UIQRCode.ECC;
        /**
         * Scale multiplier used to compute default width and height when explicit size is omitted. Defaults to `1`.
         */
        scale?: number;
        /**
         * Quiet zone margin in module units around the QR code (defaults to 4, minimum 4).
         */
        margin?: number;
        /**
         * Color for dark modules (defaults to `UI.COLORS.BLACK`).
         */
        color?: Colors.Color;
    };
}
```

### `UIQRCode.Payload`

```ts
type Payload = string | Uint8Array | readonly number[];
```

### `UIQRCode.State`

```ts
enum State {
    Idle = 0,
    Drawing = 1,
    Updating = 2,
    Deleting = 3,
}
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

### `QREncoder`

The standalone [`QREncoder`](./encoder.ts) class provides zero-dependency matrix generation and rectilinear rectangle merging usable in any environment (Node.js CLI, browser visualizers, unit tests, or in-engine).

```ts
import { QREncoder } from 'bf6-portal-utils/ui/components/qr-code/encoder';

// 1. Generate 2D boolean matrix
const matrix = QREncoder.encode('Hello Battlefield', QREncoder.ECC.Medium);

// 2. Generate ASCII terminal preview string
const ascii = QREncoder.encodeToAscii('https://portal.battlefield.com', { ecc: QREncoder.ECC.High });

// 3. Encode directly to a preallocated buffer (zero heap allocations)
const size = QREncoder.encodeToBuffer('Hello', QREncoder.ECC.Medium, scratchBuffer);
```

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and core architecture.
- [UI Button Documentation](../button/README.md) – For interactive button components.
- [UI Container Documentation](../container/README.md) – For layout containers.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations.
