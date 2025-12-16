# Interact Multi-Click Detector Module

This TypeScript `InteractMultiClickDetector` class enables Battlefield Portal experience developers to detect when a player has multi-clicked the interact key, even when there is no interactable object nearby. This is possible because even if there is nothing the player is interacting with, the player's interact state goes `true` for 1 or 2 ticks before the server resets the player to a non-interacting state. This utility is useful because there is no keybind Portal experience developers can hook into to open up a custom UI, and, until now, they had to rely on detecting in-world physical interaction points or awkward combinations of player movements.

The detector tracks interact state transitions for each player independently, counting clicks within a configurable time window to determine when a multi-click sequence has been completed.

> **Note**
> All Battlefield Portal types referenced below (`mod.Player`, `mod.SoldierStateBool`, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining.
3. **OngoingPlayer event** – The `checkMultiClick()` method should be called in your `OngoingPlayer()` event handler to accurately track interact state transitions.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { InteractMultiClickDetector } from 'bf6-portal-utils/interact-multi-click-detector';
    ```
3. Call `checkMultiClick(player)` in your `OngoingPlayer()` event handler for each player.
4. Handle the multi-click event when the method returns `true`.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

### Example

```ts
import { InteractMultiClickDetector } from 'bf6-portal-utils/interact-multi-click-detector';

export function OngoingPlayer(player: mod.Player): void {
    // Check if the player has performed a multi-click sequence
    if (InteractMultiClickDetector.checkMultiClick(player)) {
        // Player has successfully multi-clicked the interact key
        // Open custom UI, trigger special action, etc.
        console.log(`Player ${mod.GetObjId(player)} performed multi-click!`);

        // Example: Open a custom menu or trigger a special ability
        // openCustomMenu(player);
    }
}
```

---

## Core Concepts

- **State Tracking** – The detector maintains per-player state to track the last interact state, click count, and sequence start time.
- **Edge Detection** – The detector only responds to rising edges (transitions from `false` to `true`) of the interact state, ignoring falling edges and state stability.
- **Time Window** – Clicks must occur within a configurable time window (default 1000ms) to be considered part of the same sequence.
- **Click Counting** – The detector counts clicks within the time window and triggers when the required number of clicks (default 3) is reached.

---

## API Reference

### `class InteractMultiClickDetector`

#### Static Methods

| Method | Description |
| --- | --- |
| `checkMultiClick(player: mod.Player): boolean` | Checks if the player has performed a multi-click sequence with the interact button. Returns `true` when the required number of clicks has been detected within the time window. Should be called in the `OngoingPlayer()` event handler. |

---

## Configuration & Defaults

The following static readonly properties control multi-click detection behavior. While these are marked as `readonly`, they can be modified in the source code as needed for your use case.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `WINDOW_MS` | `number` | `1_000` | Time window in milliseconds for a valid multi-click sequence. If the time between the first click and subsequent clicks exceeds this value, the sequence is reset. |
| `REQUIRED_CLICKS` | `number` | `3` | Number of clicks required to trigger a multi-click sequence. The detector will return `true` when this many clicks are detected within the time window. |

**Note:** The `STATES` property is an internal record that tracks per-player state and should not be modified directly.

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OngoingPlayer()`** – Call `checkMultiClick(player)` to check for multi-click sequences.

### Lifecycle Flow

1. Import the `InteractMultiClickDetector` class in your mod file.
2. Each tick, call `checkMultiClick(player)` in `OngoingPlayer()` for each player.
3. The detector automatically:
   - Initializes player state on first call
   - Tracks interact state transitions
   - Counts clicks within the time window
   - Resets sequences that exceed the time window
   - Returns `true` when the required number of clicks is detected

---

## How It Works

The `InteractMultiClickDetector` uses edge detection and time-windowed counting to detect multi-click sequences:

1. **State Initialization** – On the first call for a player, the detector initializes their state with the current interact status, a click count of 0, and a sequence start time of 0.

2. **Fast Exit Optimization** – If the current interact state matches the last known state, the method immediately returns `false`. This optimization handles the vast majority of ticks where no state change has occurred.

3. **Edge Detection** – The detector only processes rising edges (transitions from `false` to `true`). Falling edges are ignored, and the last known state is updated.

4. **Time Window Check** – If a sequence is in progress (`clickCount > 0`) and the time window has expired, the sequence is reset to start a new one.

5. **Click Counting** – When a rising edge is detected:
   - If this is the first click (`clickCount === 0`), the sequence start time is recorded and the click count is set to 1.
   - Otherwise, the click count is incremented.
   - If the incremented count matches `REQUIRED_CLICKS`, the method returns `true` and resets the sequence for the next detection.

6. **Per-Player Tracking** – Each player's state is tracked independently using their object ID as the key, allowing multiple players to perform multi-click sequences simultaneously without interference.

---

## Known Limitations & Caveats

- **Interact State Dependency** – The detector relies on `mod.SoldierStateBool.IsInteracting` to detect clicks. If this state behaves differently in future Battlefield Portal updates, detection may be affected.

- **Tick Rate Sensitivity** – The detector is called once per tick per player. On servers with lower tick rates or during performance degradation, rapid clicks might be missed if they occur within a single tick.

- **Time Window Precision** – The time window uses `Date.now()` for millisecond precision. Very rapid clicks (faster than the server tick rate) may not be accurately captured.

---

## Future Work

In no particular order, planned upcoming work and improvements include:

- **Multiple Click Count Tracking** – Allow tracking of several different click counts simultaneously to trigger more than one response (e.g., 3 clicks for menu A, 5 clicks for menu B).

- **Per-Player Configuration** – Expose the ability to configure `WINDOW_MS` and `REQUIRED_CLICKS` on a per-player basis, allowing different players or roles to have different multi-click requirements.

- **Alternative State Sources** – Expose the ability to rely on other states besides `mod.SoldierStateBool.IsInteracting`, making the detector more flexible for different input detection scenarios.

- **State Cleanup** – Add a mechanism to clean up state for disconnected players to prevent unbounded memory growth in long-running experiences.

- **Event Callbacks** – Instead of polling with `checkMultiClick()`, provide an event-based API where callbacks are triggered when multi-click sequences are detected.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- Battlefield Builder docs – For information about player states and interaction mechanics.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional detection modes, performance optimizations, alternative input sources, etc.), so please share your experiences.

---
