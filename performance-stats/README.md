# Performance Stats Module

<ai>

The `PerformanceStats` namespace tracks server tick rate and script timeout lag and exposes getters suitable for real-time compute scaling or displaying smoothed metrics in a UI. When the game mode starts, it subscribes to `Events.OngoingGlobal` to measure inter-tick timing and starts a 1-second sampling window to compute smoothed tick rate (Hz) and lag (ms). When the server is under stress—e.g. timeout lag spikes over 100ms or tick rate drops below 25Hz—it logs warnings via the configured logger so you can see spikes in the UI or logs without polling raw values yourself.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code (monitoring starts when the game mode starts):
    ```ts
    import { PerformanceStats } from 'bf6-portal-utils/performance-stats';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Optionally call `PerformanceStats.setLogging()` to attach a logger and see spike warnings.
4. Use the getters where needed: `getSmoothedTickRate()` / `getSmoothedTimeoutLagMs()` for UI, or `getSpotDeltaMs()` / `getSpotHealthFactor()` for compute scaling.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { PerformanceStats } from 'bf6-portal-utils/performance-stats';
import { Events } from 'bf6-portal-utils/events';
import { Timers } from 'bf6-portal-utils/timers';

// Optional: show spike warnings in UI or console
PerformanceStats.setLogging((text) => console.log(text), PerformanceStats.LogLevel.Warning);

Events.OnGameModeStarted.subscribe(() => {
    // Periodic UI update with smoothed metrics (stable for display)
    Timers.setInterval(() => {
        const hz = PerformanceStats.getSmoothedTickRate();
        const lagMs = PerformanceStats.getSmoothedTimeoutLagMs();
        updatePerformancePanel(hz, lagMs);
    }, 1_000);
});

// Scale expensive logic when the server is bogged down
Events.OngoingPlayer.subscribe((player: mod.Player) => {
    const health = PerformanceStats.getSpotHealthFactor();
    if (health < 0.8) {
        // Reduce check frequency or skip non-critical work
        return;
    }
    doExpensivePerPlayerWork(player);
});
```

</ai>

---

## Core Concepts

- **Automatic start** – When the game mode starts, the module subscribes to `Events.OngoingGlobal` and starts a 1-second measurement loop. No explicit “start” call is required.
- **Two layers of metrics** – **Spot** values (last-tick delta, updated every tick) are for real-time compute scaling. **Smoothed** values (EMA over 1s windows) are for stable UI display.
- **Target cadence** – The module assumes a 30Hz server tick; smoothed Hz and health factor are interpreted relative to that target.
- **Spike warnings** – When script lag over a 1s window exceeds 100ms, or when tick rate drops below 25Hz, the module logs a warning at the configured log level so you can surface spikes in the UI or logs.
- **Events dependency** – The module uses the Events module for `OngoingGlobal` and the Timers module for the measurement loop. Use the Events module for all game event subscription; do not implement or export Portal event handlers yourself.

---

## API Reference

### `namespace PerformanceStats`

The namespace is not instantiated; all members are static.

#### `PerformanceStats.LogLevel`

A re-export of the `Logging.LogLevel` enum for use with `PerformanceStats.setLogging()`.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages (e.g. “Monitoring started.”).
- `Warning` (2) – Warning messages. Includes lag spikes and tick-rate drops. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

For more details, see the [Logging module documentation](../logging/README.md).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Attaches a logger and sets the minimum log level and whether to include the runtime error in logs. Used for spike warnings and the “Monitoring started.” message. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. See the [Logging module documentation](../logging/README.md). |
| `getSmoothedTickRate(): number` | Returns the smoothed server tick rate (Hz). Updated every second using an exponential moving average. Suitable for displaying in a UI. |
| `getSmoothedTimeoutLagMs(): number` | Returns the smoothed script lag (ms) over the 1s sampling window (how late the window callback ran vs the expected 1s). Updated every second using an exponential moving average. Suitable for displaying in a UI. |
| `getSpotDeltaMs(): number` | Returns the raw delta time (ms) between the last two `OngoingGlobal` ticks (somewhat analogous to SFT when above ~33ms). Use for real-time compute scaling (e.g. scaling work per tick). |
| `getSpotTickRate(): number` | Returns the raw tick rate (analogous to STR), derived from the last inter-tick delta. Good for compute scaling. |
| `getSpotHealthFactor(): number` | Returns a normalized health factor from 0.0 to 1.0. 1.0 means perfect 30Hz; lower values indicate the engine is bogged down. Use to scale back compute (e.g. skip or reduce non-critical work when &lt; 1.0). Capped at 1.0 so a single fast tick does not push logic above 100%. |

---

## Usage Patterns

- **UI metrics** – Poll `getSmoothedTickRate()` and `getSmoothedTimeoutLagMs()` periodically (e.g. every 1s) to show server tick rate and lag in a HUD or debug panel. Smoothed values avoid jitter.
- **Compute scaling** – In hot paths (e.g. `OngoingPlayer`), use `getSpotHealthFactor()`, `getSpotTickRate()`, or `getSpotDeltaMs()` to skip or reduce work when the server is under load.
- **Spike visibility** – Call `setLogging()` with a logger (e.g. one that writes to the Logger module or console) so lag spikes and tick-rate drops are logged as warnings without custom polling.

---

## How It Works

1. **Tick tracking** – The module subscribes to `Events.OnGameModeStarted` at load time; when the game mode starts, it subscribes to `Events.OngoingGlobal`. In that handler it records the current time and computes `currentTickDeltaMs` (time since the previous tick) and increments a tick counter. Subscribing early ensures the handler runs near the engine’s tick cadence.

2. **Window loop** – A recurring 1-second timeout (`Timers.setTimeout(measureTimeoutLag, SAMPLE_RATE_MS)`) runs `measureTimeoutLag`. In each run it:
    - Computes raw server tick rate and raw timeout lag.
    - Updates smoothed values with an exponential moving average (smoothing factor 0.3).
    - Logs a warning if raw timeout lag &gt; 100ms or raw server tick rate &lt; 25.
    - Resets the tick count and reschedules itself for 1s later.

3. **Getters** – `getSmoothedTickRate()` and `getSmoothedTimeoutLagMs()` return the latest smoothed values for UI. `getSpotDeltaMs()` returns the last inter-tick delta for scaling. `getSpotTickRate()` returns the raw tick rate (TARGET_DELTA_MS / lastTickDeltaMs). `getSpotHealthFactor()` returns `min(1.0, getSpotTickRate())` so 30Hz yields 1.0 and slower ticks yield lower values.

---

## Interpreting Script Lag (`getSmoothedTimeoutLagMs`)

When monitoring a relatively idle server, you might notice a curious pattern: the script lag starts around `33ms`, stays there for a minute or two, and then smoothly drifts down to `0ms`.

**This is not a bug!** It is a normal phenomenon caused by the game engine's internal **Task Scheduler** and how it aligns with the server's tick rate.

Here is what is happening under the hood:

- **Tick Quantization (The 33ms Jump):** A 30Hz server processes exactly one tick every `~33.33ms`. The engine only evaluates `setTimeout` (technically `mod.Wait`) wake-up calls _on these tick boundaries_. If the `setTimeout` in the performance monitoring function expires just 1 millisecond _after_ a tick finishes, the engine forces the callback to wait in the macrotask queue until the next tick. That forced wait equals exactly one frame (`~33ms`).
- **Execution Drift (The Smooth Drop):** Because it takes a fraction of a millisecond for the server to execute the math inside the performance monitoring loop before scheduling the _next_ `setTimeout`, the timer's expiration slowly slides backward across the server's rigid tick timeline.

### Quick Reference Guide

Because this metric uses a smoothed average, you will see the numbers glide continuously between these thresholds. Here is how to interpret the ranges:

- **`0ms - 32ms`:** **Optimal / Aligned.** Your `mod.Wait()` calls are resolving perfectly or within a single frame's window.
- **`33ms - 65ms`:** **1-Frame Delay.** The engine is occasionally or consistently making your scripts wait one extra tick. **This is completely healthy and normal.**
- **`66ms - 99ms`:** **Moderate Load (2-Frame Delay).** The engine is forcing your script to wait multiple frames to prioritize core game physics.
- **`> 100ms`:** **Severe Load.** The server is heavily burdened, or your custom JavaScript is doing too much synchronous work, causing significant scheduling delays.

---

## Known Limitations & Caveats

- **Events module required** – You must use the [Events module](../events/README.md) for all game event subscription and must not implement or export Battlefield Portal event handlers. This module subscribes to `OngoingGlobal` via Events. Subscription order matters: the module should run early in the tick so its delta reflects the engine cadence.

- **Target and thresholds are fixed** – The target tick rate is 30Hz and the warning thresholds (100ms lag, 25Hz) are built-in. They are not configurable in the current API.

- **Smoothed values lag** – Smoothed metrics react with a delay (EMA); use spot values when you need immediate reaction for scaling.

- **Logging is optional** – Spike warnings are only emitted if you call `setLogging()` with a valid logger.

---

## Further Reference

- [Events module](../events/README.md) – Used to subscribe to `OngoingGlobal` for tick measurement.
- [Timers module](../timers/README.md) – Used for the 1-second measurement window.
- [Logging module](../logging/README.md) – Used for spike and startup messages.
- [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler) – Bundler used to package mods for Portal.

---

## Feedback & Support

This module is under **active development**. If you need configurable targets or thresholds, different smoothing, or additional metrics, open an issue or reach out through the project channels.

---
