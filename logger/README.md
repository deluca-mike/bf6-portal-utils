# Logger Module

<ai>

This TypeScript `Logger` class removes the biggest Battlefield Portal debugging pain point: until now you could only display strings that were pre-uploaded to the Experience website via a `strings.json` file, and displaying concatenated strings with more than 3 parts was tricky, if not impossible. Further, `console.log` is only available for PC users, with a file written to their filesystem. By pairing a lightweight UI window with the `logger.strings.json` character map, this module lets you log any runtime text (errors, telemetry, formatted data, etc.) directly to the screen, even on console builds.

- **Dynamic mode** behaves like a scrolling console, always appending at the bottom and pushing older rows upward.
- **Static mode** lets you target a specific row index (e.g., keep player position on row 10 while other diagnostics fill lines 0‑9).

> **Note** Since the `Logger` namespace depends on the `UI` module, which depends on the `Events` module **you must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. Because only one implementation of each Portal event can exist per project (the `Events` module owns those hooks), your mod must subscribe via `Events` only. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules you need in your code:
    ```ts
    import { Logger } from 'bf6-portal-utils/logger';
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Instantiate a logger for a player (or team) as needed.
4. Call `log(text)` anywhere in your scripts. Static loggers accept an optional `rowIndex`; dynamic loggers ignore it and auto-scroll.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code and merge all `strings.json` files).

---

<ai>

## Usage Patterns

- **Static dashboards** – Pin persistent diagnostics (positions, squad metadata, timers) to precise rows.
- **Dynamic consoles** – Stream verbose traces (button clicks, state transitions, error stacks) without worrying about pre-provisioned strings.
- **Multiple Instances** – Keep both modes active: e.g., static logger on the left for gauges, dynamic logger on the right for realtime traces.
- **Performance considerations** – For long text messages or tall dynamic loggers, use `logAsync()` instead of `log()`. Long text can result in multiple 4-character Text UI Widgets, and in dynamic mode, moving all existing rows upward requires UI repositioning operations. By using `logAsync()` without `await`, the logging operation becomes non-blocking by being sent to the microtask queue, preventing frame drops or execution delays.

</ai>

<ai>

### Example

```ts
import { Logger } from 'bf6-portal-utils/logger';
import { UI } from 'bf6-portal-utils/ui';

let staticLogger: Logger | undefined;
let dynamicLogger: Logger | undefined;

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    if (!staticLogger) {
        staticLogger = new Logger(eventPlayer, {
            staticRows: true,
            visible: true,
            anchor: mod.UIAnchor.TopLeft,
            width: 600,
        });
        dynamicLogger = new Logger(eventPlayer, { staticRows: false, visible: true, anchor: mod.UIAnchor.TopRight });
    }

    // While logAsync is preferred, you can still use log() for short messages if order guarantees matter.
    dynamicLogger?.log(`Player: ${mod.GetObjId(player)}`);
    dynamicLogger?.log(`Team: ${mod.GetObjId(mod.GetTeam(player))}`);
    dynamicLogger?.log(`Hello @ world $${(12345.6789).toFixed(2)}!!`);

    // For long messages or performance-critical paths, always use logAsync (non-blocking).
    dynamicLogger?.logAsync(`Very long diagnostic message that will create many UI widgets...`);

    while (true) {
        const position = mod.GetObjectPosition(player);

        const x = mod.XComponentOf(position).toFixed(2);
        const y = mod.YComponentOf(position).toFixed(2);
        const z = mod.ZComponentOf(position).toFixed(2);

        staticLogger?.log(`Position: <${x},${y},${z}>`, 13);

        await mod.Wait(0.5);

        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsReloading)) continue;
    }
}
```

</ai>

---

## API Reference

### `class Logger`

All window measurements are in UI pixels. Defaults are taken from [`logger/index.ts`](index.ts).

| Member | Description |
| --- | --- |
| `constructor(player: mod.Player, options?: Logger.Options)` | Creates a logger window for `player`. Defaults: `width=400`, `height=304`, `x=10`, `y=10`, `anchor=TopLeft`, `bgColor=UI.COLORS.BF_GREY_4`, `bgAlpha=0.5`, `bgFill=Blur`, `textColor=UI.COLORS.BF_GREEN_BRIGHT`, `visible=false`, `staticRows=false`, `parent=UI.ROOT_NODE`. |
| `visible: boolean` | Getter/setter for the container visibility. Set to `true` to show the logger window, `false` to hide it. |
| `show(): Logger` / `hide(): Logger` / `toggle(): Logger` | Convenience methods that set the `visible` property and return the instance for chaining. |
| `clear(): Logger` | Deletes every rendered row/container to reclaim UI budget. |
| `delete(): void` | Calls `clear()` and removes the window container entirely—use when unloading the logger. |
| `log(text: string, rowIndex?: number): Logger` | Core logging entry point. In static mode, writes to `rowIndex` (default `0`). In dynamic mode, appends at the bottom and scrolls upward when full. Strings longer than the window width automatically wrap or append an ellipsis (`...`). |
| `logAsync(text: string, rowIndex?: number): Promise<void>` | Asynchronous, non-blocking version of `log()`. Uses a shared static microtask promise to avoid promise allocations. |

Internals worth noting when debugging:

- **Row & Widget Recycling**: In dynamic mode, rows that scroll off the top are recycled and repositioned to the bottom, and their existing child `UIText` widgets are updated in place, completely eliminating widget creation and destruction churn during active logging.
- **4-Character Chunking**: Text is chunked into segments of up to four characters and mapped through `Logger._buildMessage` using prefix format templates in `strings.json`, minimizing the number of `UIText` widgets required per row.
- **Zero-Allocation Layout Engine**: Character widths are cached in a static `Uint8Array(128)` table for ASCII ($O(1)$ array lookup) and a static `Map<number, number>` for non-ASCII characters, calculating text width with high performance and zero garbage collection overhead.

### `Logger.Options`

Optional configuration object passed to the constructor.

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `staticRows` | `boolean` | `false` | Set `true` for **"static-mode"** for row targeting, `false` for **"dynamic-mode"** for console-style logging. |
| `truncate` | `boolean` | `false` | Only valid in **"dynamic-mode"**. Set to `true` to truncate multi-line logs and terminate with ellipses. |
| `parent` | `UI.Root \| UI.Container` | `UI.ROOT_NODE` | Override if you want the logger embedded in another container. Must be a `UI.Root` or `UIContainer` instance (not a native `mod.UIWidget`). If not specified, the logger attaches to the root UI node. |
| `anchor` | `mod.UIAnchor` | `mod.UIAnchor.TopLeft` | Determines how `x`/`y` offsets are interpreted. |
| `x`, `y` | `number` | `10`, `10` | Window origin (in pixels) relative to the anchor. |
| `width`, `height` | `number` | `400`, `304` | Determines row count (`maxRows` is `(height - 16) / 24`). |
| `bgColor` | `UI.Color` | `UI.COLORS.BF_GREY_4` | Background color for the container. |
| `bgAlpha` | `number` | `0.5` | Opacity of the window background. |
| `bgFill` | `mod.UIBgFill` | `mod.UIBgFill.Blur` | Background fill style for the container. |
| `textColor` | `UI.Color` | `UI.COLORS.BF_GREEN_BRIGHT` | Applied to every text widget inside the logger. |
| `visible` | `boolean` | `false` | Set `true` to show the window immediately when constructed. |

---

## Strings File & Character Architecture

This module includes a `strings.json` file that will be automatically merged by `bf6-portal-bundler` when you bundle your mod. The strings are automatically available under the `logger` key.

### ASCII vs Non-ASCII Character Handling

To keep the `strings.json` file compact while maintaining high rendering efficiency, ASCII and non-ASCII characters are handled differently:

- **ASCII Characters**: Every printable ASCII character (except censored characters) has both a single-character key in `chars` and multi-character format templates in `format` (e.g., `"a2": "a{}"`, `"a3": "a{}{}"`, `"a4": "a{}{}{}"`). When a chunk starts with an ASCII character, up to 4 characters are combined into a single `UIText` widget using these format templates.
- **Non-ASCII Characters (Exotics)**: Non-ASCII characters only appear as **standalone stringkeys** in `chars`. They deliberately do **not** have format templates (e.g., there is no `"©2"` or `"©3"` in `format`), which avoids explosive combinatorial permutations in `strings.json`. The tokenizer (`_getParts`) ensures that exotic characters are either:
    1. The **only** character in a chunk (length 1), if they appear at the start of a chunk (e.g., `["©", "2026"]`).
    2. The **second, third, or fourth** character in a chunk that begins with a standard ASCII character (e.g., `["25°C"]`).

### Limited Non-ASCII Character Support (`EXOTIC_CHARS`)

Battlefield Portal's custom UI font does not support arbitrary UTF-8 characters. `Logger` exports a curated list of verified displayable glyphs in `Logger.EXOTIC_CHARS`, including:

- **Currency**: `€`, `£`, `¥`, `¢`
- **Mathematics**: `±`, `×`, `÷`, `≠`, `≈`, `≤`, `≥`, `π`, `Ω`, `Δ`, `√`, `∞`, `∑`, `∏`, `∫`, `∂`, `¬`
- **Typography & Punctuation**: `•`, `…`, `—`, `–`, `«`, `»`, `‹`, `›`, `“`, `”`, `‘`, `’`, `‚`, `„`, `§`, `¶`, `©`, `®`, `™`, `†`, `‡`, `‰`, `·`, `¿`, `¡`
- **Superscripts & Modifiers**: `¹`, `²`, `³`, `⁴`, `⁵`, `⁶`, `⁷`, `⁸`, `⁹`, `°`, `º`, `ª`, `ˆ`, `ˇ`, `˚`, `¯`, `⁄`, `●`, `◊`

Any character not in printable ASCII or `EXOTIC_CHARS` will display as `*`.

### Censored Character Handling (`CENSORED_CHARS`)

Battlefield Portal's in-game profanity filter censors standalone `"f"` and `"F"` characters when used as individual localized string tokens or dynamic message arguments to `mod.Message`.

To bypass this filter while keeping strings intact:

1. Standalone `"f"` and `"F"` are omitted from `chars`, and format templates starting with them (`"f2"`, `"f3"`, etc.) are omitted from `format`.
2. `Logger` defines `SAFE_CENSORED_PAIRS`: characters that Portal allows when paired with a censored character (`')'`, `'/'`, `':'`, `'='`, `'{'`, `'|'`, `'}'`). In addition, doubled characters (`"ff"`, `"FF"`) are not censored by the game engine.
3. The tokenizer uses a **hybrid approach**:
    - If `f` or `F` is naturally followed by itself or a safe punctuation mark, it emits the safe 2-character pair (e.g., `"f="`, `"f:"`, `"ff"`) and consumes both characters.
    - Otherwise, it doubles the character (`"ff"`, `"FF"`) and consumes only that single character (e.g., `"fast"` $\rightarrow$ `["ff", "ast"]`, `"leaf"` $\rightarrow$ `["lea", "ff"]`, `"F"` $\rightarrow$ `["FF"]`), preserving subsequent text without character loss.
4. These 2-character pairs are stored directly in `chars` and rendered without format templates or dynamic arguments, bypassing censorship completely.

### Generating the Strings File (`build:strings`)

The companion build script [`scripts/build-logger-strings.ts`](../scripts/build-logger-strings.ts) automatically inspects `Logger.CENSORED_CHARS`, `Logger.SAFE_CENSORED_PAIRS`, and `Logger.EXOTIC_CHARS` from `logger/index.ts` and regenerates `logger/strings.json`.

If any of these constants are modified, rebuild the strings file with:

```bash
npm run build:strings
```

> **Note**: For normal consumption of `bf6-portal-utils`, you do **not** need to run this command. Every published release of this package always ships with the Logger's `strings.json` pre-generated, formatted, and ready for bundling.

---

## Character Spacing and Display Caveats

Battlefield Portal’s custom UI font is **not monospaced**, so each glyph renders with a different width. To make dynamic logging possible, the logger relies on a precomputed character width table that stores the relative width of every supported character in 0.5-pixel increments (ASCII in `Uint8Array(128)` and non-ASCII in a Map). That approximation keeps text readable, but you may notice slightly wider gaps where character chunks meet.

In particular:

- Left square brackets (`[`) **always** come prepended with a backslash (`\`) in Portal's font engine.

---

## Further Reference

- [UI module](../ui/README.md) – Documentation for the UI helper module required by this system.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (better text scaling, formatting helpers, persistent logs, etc.), so please share your experiences.
