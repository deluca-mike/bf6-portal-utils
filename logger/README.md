# Logger Module

This TypeScript `Logger` class removes the biggest Battlefield Portal debugging pain point: until now you could only display strings that were pre-uploaded to the Experience website via a `strings.json` file, and displaying concatenated string with more than 3 parts was tricky, if not impossible. Further, `console.log` is only available for PC users, with a file written to their filesystem. By pairing a lightweight UI window with the `logger.strings.json` character map, this module lets you log any runtime text (errors, telemetry, formatted data, etc.) directly to the screen, even on console builds.

- **Dynamic mode** behaves like a scrolling console, always appending at the bottom and pushing older rows upward.
- **Static mode** lets you target a specific row index (e.g., keep player position on row 10 while other diagnostics fill lines 0‑9).

> **Note**
> The `Logger` depends on the shared `UI` helper (containers, text widgets, etc.) which is also maintained in this repository. Keep that namespace/class above the logger in your mod file. All Battlefield Portal types referenced below (`mod.Player`, `mod.UIWidget`, vectors, anchors, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining and strings.json merging.
3. **UI dependency** – The `Logger` depends on the `UI` namespace (which is also maintained in this repository).
4. **One-time setup per player** – Instantiate the logger in your deployment hooks (e.g., `OnPlayerDeployed`) and keep a reference for future logs.

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

## Usage Patterns

- **Static dashboards** – Pin persistent diagnostics (positions, squad metadata, timers) to precise rows.
- **Dynamic consoles** – Stream verbose traces (button clicks, state transitions, error stacks) without worrying about pre-provisioned strings.
- **Multiple Instances** – Keep both modes active: e.g., static logger on the left for gauges, dynamic logger on the right for realtime traces.

### Example

```ts
import { Logger } from 'bf6-portal-utils/logger';
import { UI } from 'bf6-portal-utils/ui';

let staticLogger: Logger | undefined;
let dynamicLogger: Logger | undefined;

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    if (!staticLogger) {
        staticLogger = new Logger(eventPlayer, { staticRows: true, visible: true, anchor: mod.UIAnchor.TopLeft, width: 600 });
        dynamicLogger = new Logger(eventPlayer, { staticRows: false, visible: true, anchor: mod.UIAnchor.TopRight });
    }

    dynamicLogger?.log(`Player: ${mod.GetObjId(player)}`);
    dynamicLogger?.log(`Team: ${mod.GetObjId(mod.GetTeam(player))}`);
    dynamicLogger?.log(`Hellow @ world $${(12345.6789).toFixed(2)}!!`);

    while (true) {
        const position = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);

        const x = mod.XComponentOf(position).toFixed(2);
        const y = mod.YComponentOf(position).toFixed(2);
        const z = mod.ZComponentOf(position).toFixed(2);

        staticLogger?.log(`Position: <${x},${y},${z}>`, 13);

        await mod.Wait(0.5);

        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsReloading)) continue;
    }
}
```

---

## API Reference

### `class Logger`

All window measurements are in UI pixels. Defaults are taken from [`logger/logger.ts`](logger.ts).

| Member | Description |
| --- | --- |
| `constructor(player: mod.Player, options?: Logger.Options)` | Creates a logger window for `player`. Defaults: `width=400`, `height=300`, `x=10`, `y=10`, `anchor=TopLeft`, `bgColor=UI.COLORS.BLACK`, `bgAlpha=0.5`, `textColor=UI.COLORS.GREEN`, `visible=false`, `staticRows=false`. Text scale is currently fixed at `1` while part-width corrections are in progress. |
| `name(): string` | Returns the underlying container name, useful when cross-referencing widgets in the UI debugger. |
| `isVisible(): boolean` | True if the container is currently rendered (mirrors `UI.Container.isVisible()`). |
| `show(): void` / `hide(): void` / `toggle(): void` | Convenience wrappers around `SetUIWidgetVisible`. |
| `clear(): void` | Deletes every rendered row/container to reclaim UI budget. |
| `destroy(): void` | Calls `clear()` and removes the window container entirely—use when unloading the logger. |
| `log(text: string, rowIndex?: number): void` | Core logging entry point. In static mode, writes to `rowIndex` (default `0`). In dynamic mode, appends at the bottom and scrolls upward when full. Strings longer than the window width automatically append an ellipsis row (`...`). |

Internals worth noting when debugging:
- Rows are recycled via `prepareNextRow()` so long-running sessions stay performant.
- Text is chunked into three-character-or-less segments and mapped through `Logger.buildMessage`, which is why the character lookup in the strings file matters.

### `Logger.Options`

Optional bag passed to the constructor. See [`mod/index.d.ts`](../mod/index.d.ts) for type declarations.

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `staticRows` | `boolean` | `false` | Set `true` for **"static-mode"** for row targeting, `false` for **"dynamic-mode"** for console-style logging. |
| `truncate` | `boolean` | `false` | Only valid in **"dynamic-mode"**. Set to `true` to truncate multi-line logs and terminate with ellipses. |
| `parent` | `mod.UIWidget` | `UI.ROOT` | Override if you want the logger embedded in another container. |
| `anchor` | `mod.UIAnchor` | `mod.UIAnchor.TopLeft` | Determines how `x`/`y` offsets are interpreted. |
| `x`, `y` | `number` | `10`, `10` | Window origin (in pixels) relative to the anchor. |
| `width`, `height` | `number` | `400`, `300` | Determines row count (`maxRows` is `(height - padding) / 20`). |
| `bgColor` | `mod.Vector` | `UI.COLORS.BLACK` | Background color for the container. |
| `bgAlpha` | `number` | `0.5` | Opacity of the window background. |
| `bgFill` | `mod.UIBgFill` | `mod.UIBgFill.Solid` | Normally left at the default. |
| `textColor` | `mod.Vector` | `UI.COLORS.GREEN` | Applied to every text widget inside the logger. |
| `textScale` | `'small' \| 'medium' \| 'large'` | `'medium'` | Currently ignored (scale factor is hardcoded to 1 until width compensation work lands). |
| `visible` | `boolean` | `false` | Set `true` to show the window immediately when constructed. |

---

## Strings File

This module includes a `strings.json` file that will be automatically merged by `bf6-portal-bundler` when you bundle your mod. The strings are automatically available under the `logger` key:

The logger renders arbitrary strings by mapping each character to a localized token. At runtime, `mod.stringkeys.logger` contains:

- `format` templates for one-, two-, and three-character chunks plus a `badFormat` fallback.
- `chars` dictionary that maps every supported character (letters, digits, punctuation) to the same character.
- unsupported characters display as `*`

If you need additional glyphs, extend the JSON first, then update `Logger.getCharacterWidth` so layout calculations stay accurate.

---

## Character Spacing and Display Caveats

Battlefield Portal’s custom UI font is **not monospaced**, so each glyph renders with a different width. To make dynamic logging possible, the logger relies on a custom `Logger.getCharacterWidth`, which is a hand-tuned table that approximates the relative width of every supported character in 0.5 increments. That approximation keeps text readable, but you may notice slightly wider gaps where character chunks meet. More polish is planned to smooth these seams; for now, expect occasional spacing hiccups.

In particular:
- forwardslashes and backslashes may be drawn above or below the row, uncentered
- left square brackets (`[`) **always** come prepended with a backslash (`\`) for an unknown reason
- chunks starting with `r` or `t` are drawn slightly further to the right than others

---

## Upcomming Features

In no particular order, planned upcomming work and improvements include:
- breaking out the dynamic string "text boxes" into its own module so they can be used in generic UIs within Portal
- window/text scales (i.e. "small", "medium", "large")
- an input mode so you could call arbitrary `mod` functions from the "console", with autocompletion
- scrollable in dynamic mode so you can go back in the history to see logs that have seen been purged from view
- performance and memory improvements

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- [`ui/README.md`](../ui/README.md) – Documentation for the UI helper module required by this system.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (better text scaling, formatting helpers, persistent logs, etc.), so please share your experiences.

---
