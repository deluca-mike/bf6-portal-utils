# Performance Stats Module

This TypeScript `PerformanceStats` class enables Battlefield Portal experience developers to monitor and track the estimated runtime tick rate of the server their experience is running on. The utility provides real-time performance metrics that can help identify when the server is under stress or when script callbacks are being deprioritized by the game engine.

The system uses a sampling approach to calculate tick rate by counting ticks over a configurable time window, providing a "virtual rate" metric that reflects the actual performance of your script's execution environment.

> **Note**
> All Battlefield Portal types referenced below (`mod.Player`, `mod.Wait`, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining.
3. **OngoingGlobal event** – The `trackTick()` method should be called in your `OngoingGlobal()` event handler to accurately track tick rate.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { PerformanceStats } from 'bf6-portal-utils/performance-stats';
    ```
3. Create an instance of `PerformanceStats` (optionally with configuration options).
4. Call `trackTick()` in your `OngoingGlobal()` event handler.
5. Call `startHeartbeat()` to begin monitoring (typically in `OnGameModeStarted()`).
6. Access the current tick rate via the `tickRate` getter.
7. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

### Example

```ts
import { PerformanceStats } from 'bf6-portal-utils/performance-stats';

// Create a PerformanceStats instance with custom logging
const perfStats = new PerformanceStats({
    log: (text) => console.log(text),
    stressThreshold: 25,              // Optional override (default 25)
    deprioritizedThreshold: 65,       // Optional override (default 65)
    sampleRateSeconds: 0.5            // Optional override (default 0.5)
});

export async function OnGameModeStarted(): Promise<void> {
    // Start the performance monitoring heartbeat
    perfStats.startHeartbeat();
}

export async function OngoingGlobal(): Promise<void> {
    // Track each tick to calculate tick rate
    perfStats.trackTick();

    // Access current tick rate if needed
    const currentTickRate = perfStats.tickRate;
    // ... rest of your game logic
}
```

---

## Core Concepts

- **Tick Rate Calculation** – The system counts ticks over a sample window (default 0.5 seconds) and calculates ticks per second to determine the virtual tick rate.
- **Stress Detection** – When tick rate falls below the `stressThreshold`, it indicates the server is under stress and not processing ticks at the expected rate.
- **Deprioritization Detection** – When tick rate exceeds the `deprioritizedThreshold`, it indicates that `mod.Wait()` calls are taking longer than requested, suggesting script callbacks are being deprioritized by the engine.
- **Sampling Window** – The default sample rate of 0.5 seconds is ideal because it aligns perfectly with both 30Hz and 60Hz tick rates, providing accurate measurements for common server configurations.

---

## Understanding Thresholds

### `stressThreshold` (Default: 25)

The `stressThreshold` represents the minimum acceptable tick rate. When the calculated tick rate falls at or below this value, it indicates that the server is under stress and not processing ticks at the expected rate.

**Important:** This threshold should be set based on your expected server tick rate. Currently, Battlefield Portal servers (both local and remote) run at 30Hz, meaning they process approximately 30 ticks per second under normal conditions. A threshold of 25 provides a reasonable buffer below the expected 30Hz rate to account for minor fluctuations while still detecting significant performance degradation.

If server tick rates change in future Battlefield updates, you should adjust this threshold accordingly. For example:
- **30Hz servers**: Use a threshold around 25 (default)
- **60Hz servers**: Use a threshold around 50-55
- **Custom rates**: Set the threshold to approximately 80-85% of your expected tick rate

### `deprioritizedThreshold` (Default: 65)

The `deprioritizedThreshold` represents the maximum tick rate before deprioritization is detected. When the calculated tick rate reaches or exceeds this value, it indicates that `mod.Wait()` calls are taking longer than requested, which suggests that script callbacks are being deprioritized by the game engine.

This happens when the engine accumulates more ticks than expected in the sample window. For example, if you request a 0.5-second wait but the engine takes longer to process it, more ticks will accumulate in the bucket during that extended period, resulting in a higher calculated tick rate.

**Important:** Like `stressThreshold`, this value should be calibrated based on your expected server tick rate. The default of 65 is appropriate for 30Hz servers, providing a reasonable upper bound (approximately 2x the expected rate) to detect deprioritization. For 60Hz servers, you might use a threshold around 120-130.

---

## API Reference

### `class PerformanceStats`

#### Constructor

| Signature | Description |
| --- | --- |
| `constructor(options?: PerformanceStats.Options)` | Creates a new `PerformanceStats` instance. Optional configuration allows you to override default thresholds, sample rate, and attach a logging function. |

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `tickRate` | `number` | Returns the current cached tick rate (in Hz). This value is updated every sample period by the heartbeat loop. Initializes to 30. |

#### Methods

| Method | Description |
| --- | --- |
| `trackTick()` | Should be called once every tick, ideally in the `OngoingGlobal()` event handler. Increments the internal tick counter used for rate calculation. |
| `startHeartbeat()` | Starts the performance tracking heartbeat loop. This method can be called multiple times safely—it will only start one loop. The heartbeat calculates tick rate periodically and analyzes health status. |

---

## Configuration & Defaults

The following values control performance monitoring behavior. All can be overridden via the `options` argument in the constructor.

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `stressThreshold` | `number` | `25` | Minimum acceptable tick rate. When tick rate falls at or below this value, stress is detected. Should be set based on expected server tick rate (see Understanding Thresholds above). |
| `deprioritizedThreshold` | `number` | `65` | Maximum tick rate before deprioritization is detected. When tick rate reaches or exceeds this value, deprioritization is detected. Should be set based on expected server tick rate (see Understanding Thresholds above). |
| `sampleRateSeconds` | `number` | `0.5` | Time window (in seconds) over which ticks are counted to calculate tick rate. The default of 0.5 seconds aligns perfectly with both 30Hz and 60Hz tick rates. |
| `log` | `(text: string) => void` | `() => {}` | Optional logging function. When provided, the system will log health status messages when thresholds are exceeded. |

---

## Types & Interfaces

All types are defined inside the `PerformanceStats` namespace in [`performance-stats.ts`](performance-stats.ts).

### `PerformanceStats.Options`

Interface for configuring a `PerformanceStats` instance:

```ts
type Options = {
    log?: (text: string) => void;           // Optional logging function
    stressThreshold?: number;               // Optional override (default 25)
    deprioritizedThreshold?: number;        // Optional override (default 65)
    sampleRateSeconds?: number;             // Optional override (default 0.5)
}
```

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OnGameModeStarted()`** – Call `startHeartbeat()` to begin performance monitoring.
2. **`OngoingGlobal()`** – Call `trackTick()` to track each tick for rate calculation.

### Lifecycle Flow

1. Create `PerformanceStats` instance (optionally with configuration).
2. Call `startHeartbeat()` to begin the monitoring loop.
3. Each tick, call `trackTick()` in `OngoingGlobal()`.
4. The heartbeat loop periodically:
   - Calculates tick rate from accumulated ticks
   - Updates the cached `tickRate` value
   - Analyzes health and logs warnings if thresholds are exceeded
   - Resets the tick counter and schedules the next sample

---

## How It Works

The `PerformanceStats` system uses a sampling-based approach to estimate tick rate:

1. **Tick Counting** – Each call to `trackTick()` increments an internal counter (the "tick bucket").
2. **Sampling Window** – Every `sampleRateSeconds` (default 0.5 seconds), the heartbeat calculates the tick rate by dividing the accumulated ticks by the sample period.
3. **Rate Calculation** – The formula `tickBucket / sampleRateSeconds` gives the "Ticks Per Requested Second" (virtual rate in Hz).
4. **Health Analysis** – The calculated rate is compared against configured thresholds to detect stress or deprioritization.
5. **Caching** – The calculated rate is cached and accessible via the `tickRate` getter.

The default sample rate of 0.5 seconds is ideal because:
- For 30Hz servers: 0.5 seconds = 15 ticks (exact multiple)
- For 60Hz servers: 0.5 seconds = 30 ticks (exact multiple)

This alignment ensures accurate measurements without fractional tick counts.

---

## Known Limitations & Caveats

- **Threshold Calibration** – The default thresholds (25 and 65) are calibrated for 30Hz servers. If Battlefield Portal server tick rates change in future updates, you will need to adjust these thresholds accordingly. See Understanding Thresholds above for guidance.
- **Single Instance** – The heartbeat loop can only be started once per instance. Multiple calls to `startHeartbeat()` are safe but will only start one loop.
- **Logging Overhead** – If a logging function is provided, it will be called every heartbeat when thresholds are exceeded. Consider the performance impact of your logging implementation.
- **Sample Rate Tradeoffs** – While 0.5 seconds is ideal for 30Hz and 60Hz, other sample rates may be less accurate. Very short sample rates may be noisy, while very long sample rates may miss transient performance issues.

---

## Future Work

- The `analyzeHealth` method may be reworked to get the health status and log it when requested, rather than automatically logging on every heartbeat. This would provide more control over when and how health status is reported, allowing developers to query status on-demand or integrate it into custom logging systems.
- Add `stopHeartbeat` and `resumeHeartbeat` functionality to allow developers to pause and resume performance monitoring as needed, providing more control over when monitoring is active.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- Battlefield Builder docs – For information about server tick rates and performance characteristics.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional metrics, configurable health analysis, performance history tracking, etc.), so please share your experiences.

---
