# Multi-Click Detector Module

This TypeScript `MultiClickDetector` class enables Battlefield Portal experience developers to detect when a player has
rapidly triggered a soldier state multiple times in quick succession. The detector can monitor any soldier state boolean
from `mod.SoldierStateBool`, allowing you to detect multi-click sequences for various player actions.

The detector tracks soldier state transitions for each player independently, counting rapid state changes within a
configurable time window to determine when a multi-click sequence has been completed. Each detector instance is
configured with runtime options (including which soldier state to monitor) and a callback that is triggered when a
multi-click sequence is detected.

By default, the detector monitors `mod.SoldierStateBool.IsInteracting`, which is the most user-friendly option because
the interact state goes `true` for 1 tick even when there is no object that can be interacted with nearby. This makes it
ideal for detecting multi-click sequences without requiring physical interaction points, and is useful because there is
no keybind Portal experience developers can hook into to open up a custom UI.

Key features include instance-based construction with per-instance configuration, automatic error handling that prevents
callback failures from crashing your mod, and configurable logging for debugging detector behavior. The module uses the
`Logging` module for internal logging, allowing you to monitor callback errors and debug detector behavior.

> **Note** All Battlefield Portal types referenced below (`mod.Player`, `mod.SoldierStateBool`, etc.) come from
> [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **OngoingPlayer event** – The `handleOngoingPlayer(player)` static method should be called in your `OngoingPlayer()`
   event handler to accurately track soldier state transitions.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';
    ```
3. Create detector instances for each player with a callback and optional configuration.
4. Call `MultiClickDetector.handleOngoingPlayer(player)` in your `OngoingPlayer()` event handler for each player.
5. Optionally set up logging for debugging (recommended during development).
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';

// Optional: Configure logging for detector callback error monitoring
MultiClickDetector.setLogging((text) => console.log(text), MultiClickDetector.LogLevel.Error);

export async function OnPlayerJoinGame(player: mod.Player): Promise<void> {
    const playerId = mod.GetObjId(player);

    // Create a detector instance for this player
    // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
    new MultiClickDetector(
        player,
        () => {
            // Player has successfully performed a multi-click sequence
            // Open custom UI, trigger special action, etc.
            console.log(`Player ${playerId} performed multi-click!`);
            openCustomMenu(player);
        },
        {
            soldierState: mod.SoldierStateBool.IsInteracting,
            windowMs: 1_000, // 1 second window
            requiredClicks: 3, // 3 clicks required
        }
    );
}

export function OngoingPlayer(player: mod.Player): void {
    // Handle ongoing player event for all detectors tracking this player
    MultiClickDetector.handleOngoingPlayer(player);
}

export async function OnPlayerLeaveGame(player: mod.Player): Promise<void> {
    MultiClickDetector.pruneInvalidPlayers();
}
```

---

## Core Concepts

- **Instance-Based Detection** – Each detector is a separate instance created for a specific player with its own
  configuration and callback. Multiple detectors can track the same player with different configurations.
- **Configurable Soldier States** – Each detector can monitor any soldier state boolean from `mod.SoldierStateBool`. The
  default is `mod.SoldierStateBool.IsInteracting`, which is the most user-friendly option. See
  [Choosing a Soldier State](#choosing-a-soldier-state) for guidance on selecting the best state for your use case.
- **State Tracking** – Each detector instance maintains its own state to track the last soldier state value, click
  count, and sequence start time.
- **Edge Detection** – The detector only responds to rising edges (transitions from `false` to `true`) of the configured
  soldier state, ignoring falling edges and state stability.
- **Time Window** – State changes must occur within a configurable time window (default 1000ms) to be considered part of
  the same sequence.
- **Click Counting** – The detector counts state changes within the time window and triggers the callback when the
  required number of changes (default 3) is reached.
- **Error Handling** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is
  configured) but do not stop detector execution. This ensures that one failing callback doesn't break other detectors
  or your mod's execution.
- **Configurable Error Logging** – Callback errors are automatically logged using the `Logging` module. Use
  `MultiClickDetector.setLogging()` to configure a logger function, minimum log level, and whether to include error
  details. This provides visibility into detector failures without requiring manual error handling in every callback.

---

## API Reference

### `class MultiClickDetector`

#### `MultiClickDetector.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with
`MultiClickDetector.setLogging()` to configure the minimum log level for detector callback error logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Static Methods

| Method                                                                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the MultiClickDetector module. Callback errors (both synchronous and asynchronous) are automatically caught and logged using the configured logger. This allows you to monitor and debug detector callback failures without breaking your mod. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. The runtime error can be very large and may cause issues with UI loggers. For more information, see the [`Logging` module documentation](../logging/README.md). |
| `handleOngoingPlayer(player: mod.Player): void`                                                                | Handles the ongoing player event for a player. This should be called in the `OngoingPlayer()` event handler to accurately track soldier state transitions for all detector instances tracking the specified player.                                                                                                                                                                                                                                                                                                                                     |
| `pruneInvalidPlayers(): void`                                                                                  | Prunes detectors associated to invalid players. This can be called periodically to clean up, or called in the `OnPlayerLeaveGame` event handler.                                                                                                                                                                                                                                                                                                                                                                                                        |

#### Constructor

| Method                                                                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(player: mod.Player, callback: () => Promise<void> \| void, options?: MultiClickDetector.Options)` | Creates a new multi-click detector with specific options. The detector will track soldier state transitions for the specified player and call the callback when a multi-click sequence is detected. Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). See the `Options` interface below for configuration details. The default soldier state is `mod.SoldierStateBool.IsInteracting`. |

#### Instance Methods

| Method            | Description                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `destroy(): void` | Destroys the interact multi-click detector, removing it from tracking. Call this when the detector is no longer needed. |

#### `MultiClickDetector.Options`

Interface for configuring detector behavior:

| Property         | Type                   | Default                              | Description                                                                                                                                                                          |
| ---------------- | ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `soldierState`   | `mod.SoldierStateBool` | `mod.SoldierStateBool.IsInteracting` | The soldier state boolean to monitor for multi-click sequences. Can be any member of `mod.SoldierStateBool`. See [Choosing a Soldier State](#choosing-a-soldier-state) for guidance. |
| `windowMs`       | `number`               | `1_000`                              | Time window in milliseconds for a valid multi-click sequence. If the time between the first state change and subsequent changes exceeds this value, the sequence is reset.           |
| `requiredClicks` | `number`               | `3`                                  | Number of state changes required to trigger a multi-click sequence. The callback will be called when this many state changes are detected within the time window.                    |

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OngoingPlayer`** – Call `MultiClickDetector.handleOngoingPlayer(player)` to track soldier state transitions for
   all detector instances tracking the specified player.

### Optional Event Handlers

1. **`OnPlayerLeaveGame`** – Call `MultiClickDetector.pruneInvalidPlayers()` to clean up all invalid players.

### Lifecycle Flow

1. Import the `MultiClickDetector` class in your mod file.
2. Optionally configure logging using `MultiClickDetector.setLogging()` (recommended during development).
3. Create detector instances for players (e.g., in `OnPlayerDeployed`) with a callback and optional configuration.
4. Call `MultiClickDetector.handleOngoingPlayer(player)` in `OngoingPlayer(player: mod.Player)`.
5. The detector automatically:
    - Tracks soldier state transitions for each instance
    - Counts state changes within the time window
    - Resets sequences that exceed the time window
    - Calls the callback when the required number of state changes is detected
    - Catches and logs callback errors without crashing
6. Clean up detector instances when they're no longer needed (e.g., call `detector.destroy()` as needed and/or call
   `MultiClickDetector.pruneInvalidPlayers()` in `OnPlayerLeaveGame`).

---

## How It Works

The `MultiClickDetector` uses edge detection and time-windowed counting to detect multi-click sequences:

1. **Instance Creation** – When a detector instance is created via the constructor, it is registered with a static map
   that groups detectors by player ID. This allows multiple detectors to track the same player with different
   configurations.

2. **Event Handling** – When `handleOngoingPlayer(player)` is called, it retrieves all detector instances tracking that
   player and calls each instance's internal `_handleOngoing()` method.

3. **Fast Exit Optimization** – For each detector instance, if the current soldier state matches the last known state,
   the method immediately returns. This optimization handles the vast majority of ticks where no state change has
   occurred.

4. **Edge Detection** – The detector only processes rising edges (transitions from `false` to `true`) of the configured
   soldier state. Falling edges are ignored, and the last known state is updated.

5. **Time Window Check** – If a sequence is in progress (`clickCount > 0`) and the time window has expired, the sequence
   is reset to start a new one.

6. **Click Counting** – When a rising edge is detected:
    - If this is the first click (`clickCount === 0`), the sequence start time is recorded and the click count is set
      to 1.
    - Otherwise, the click count is incremented.
    - If the incremented count matches the instance's `requiredClicks`, the callback is invoked and the sequence is
      reset for the next detection.

7. **Error Isolation** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is
   configured via `MultiClickDetector.setLogging()`) but don't prevent detectors from continuing. This ensures that one
   failing callback doesn't break other detectors or your mod's execution.

8. **Per-Instance Tracking** – Each detector instance maintains its own state (last soldier state value, click count,
   sequence start time) and configuration (soldier state, time window, required clicks), allowing multiple detectors to
   track the same player with different behaviors simultaneously.

---

## Usage Patterns

- **Basic Detection** – Create a detector instance for a player with a callback. The callback is triggered when the
  required number of state changes is detected within the time window.

- **Multiple Detectors per Player** – Create multiple detector instances for the same player with different
  configurations (e.g., 4 clicks of Sprint to open a menu, 3 clicks Interact to use an ability). Each detector operates
  independently.

- **Custom Configuration** – Use the `Options` interface to customize the soldier state, time window, and required
  clicks for each detector instance.

- **Detector Cleanup** – To prevent memory leaks, always call `destroy()` on detector instances when they're no longer
  needed and/or use `pruneInvalidPlayers()` to clean up all invalid players at once (e.g., when a player leaves the
  game).

- **Error Logging** – Configure logging using `setLogging()` to monitor callback errors and debug detector behavior
  during development.

### Example: Multiple Detectors per Player

```ts
import { MultiClickDetector } from 'bf6-portal-utils/interact-multi-click-detector';

export async function OnPlayerDeployed(player: mod.Player): Promise<void> {
    // Create a detector for opening a menu (4 clicks)
    const menuDetector = new MultiClickDetector(player, () => openCustomMenu(player), {
        soldierState: mod.SoldierStateBool.IsSprinting,
        requiredClicks: 4,
        windowMs: 1_500, // Longer window for 4 clicks
    });

    // Create a detector for activating a special ability (3 clicks)
    const abilityDetector = new MultiClickDetector(player, () => activateSpecialAbility(player), {
        soldierState: mod.SoldierStateBool.IsInteracting,
        requiredClicks: 3,
        windowMs: 1_000,
    });
}

export function OngoingPlayer(player: mod.Player): void {
    MultiClickDetector.handleOngoingPlayer(player);
}

export async function OnPlayerLeaveGame(eventNumber: number): Promise<void> {
    MultiClickDetector.pruneInvalidPlayers();
}
```

### Example: Async Callback Handling

```ts
import { MultiClickDetector } from 'bf6-portal-utils/interact-multi-click-detector';

export async function OnPlayerDeployed(player: mod.Player): Promise<void> {
    // Callbacks can now return Promise<void> directly - errors are automatically caught and logged
    const detector = new MultiClickDetector(player, async () => {
        // Async operations here - errors are automatically caught and logged if logging is configured
        await loadPlayerData(player);
        await openCustomUI(player);
    });
}

export function OngoingPlayer(player: mod.Player): void {
    MultiClickDetector.handleOngoingPlayer(player);
}

export async function OnPlayerLeaveGame(eventNumber: number): Promise<void> {
    MultiClickDetector.pruneInvalidPlayers();
}
```

---

## Choosing a Soldier State

The detector can monitor any soldier state boolean from `mod.SoldierStateBool`, but not all states are equally suitable
for multi-click detection. This section explains which states work best and why.

### Recommended: `IsInteracting` (Default)

**Why it's the best choice:**

- **No visual side effects** – When a player rapidly presses the interact key, the interact state goes `true` for 1
  ticks even when there is no object or interaction points that can be interacted with nearby. This means players can
  perform multi-click sequences without any visual feedback or character movement, making it feel like a hidden input
  method.
- **No gameplay impact** – Unlike other states, rapid interact presses don't cause the player's character to perform any
  actions that could interfere with gameplay.
- **Caveat** - Players must have their `Interact` keybind set to `Tap`, not `Hold`.

**Use case:** Opening custom menus, triggering special abilities, or any action where you want a hidden input method
that doesn't affect the player's character visually or mechanically.

### Secondary Options: `IsCrouching` and `IsSprinting`

**Why they work but have drawbacks:**

- **Rapid toggling is possible** – Both `IsCrouching` and `IsSprinting` can be rapidly toggled by players, making them
  technically viable for multi-click detection.
- **Visual jittering** – Rapidly toggling these states causes the player's character to visually jitter as it tries to
  crouch/uncrouch or sprint/walk in quick succession. This can be distracting and may interfere with gameplay.
- **Gameplay impact** – The character actually performs these actions, which may not be desirable if you're just trying
  to detect input for a UI or special ability.
- **Benefit** - Unlike requiring players to ensure their `Interact` keybind set to `Tap`, it is more likely players can
  already quickly toggle `Sprint` or `Crouch` with their existing keybind settings.

**Use case:** Consider these if you need more than one multi-click detection (and you've already used the
`IsInteracting` state), or if you are comfortable forcing players to physically jitter a bit, but not have to change
their `Interact` keybind set to `Tap`.

### Not Recommended: Other Soldier States

The remaining soldier states in `mod.SoldierStateBool` are **not recommended** for multi-click detection because they
are difficult, if not impossible or impractical, to toggle in quick succession:

- **`IsAISoldier`** – Obvious
- **`IsAlive`** / **`IsDead`** – Obvious
- **`IsBeingRevived`** / **`IsReviving`** – Obvious
- **`IsFiring`** – Forcing players to fire weapons has significant in-game implications
- **`IsInAir`** / **`IsOnGround`** – Physics-based, not directly player-controlled
- **`IsInVehicle`** – Requires entering/exiting vehicles, not rapid toggling
- **`IsInWater`** – Environment-based, not player-controlled
- **`IsJumping`** – Has cooldown/mechanics and is physics-based that prevent rapid toggling
- **`IsManDown`** – Obvious
- **`IsParachuting`** – Obvious
- **`IsProne`** – Similar to `IsCrouching` but with more animation overhead and many players may have this bound as a
  `Hold`
- **`IsReloading`** – Cannot always be done and cannot be rapid toggled
- **`IsStanding`** – Opposite of `IsCrouching`/`IsProne`, same jittering issues, but less reliable
- **`IsVaulting`** – Requires specific obstacles and is physics-based that prevent rapid toggling
- **`IsZooming`** – While a decent choice, requires the player to be holding a weapon they can aim down sights

---

## Known Limitations & Caveats

- **Soldier State Dependency** – The detector relies on soldier state booleans to detect state changes. If the behavior
  of soldier states changes in future Battlefield Portal updates, detection may be affected. The default
  `mod.SoldierStateBool.IsInteracting` is the most reliable option, but any state you choose may be subject to game
  engine changes.

- **Tick Rate Sensitivity** – The detector is called once per tick per player via `handleOngoingPlayer()`. On servers
  with lower tick rates or during performance degradation, rapid state changes might be missed if they occur within a
  single tick.

- **Async Callbacks** – Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Async
  callbacks are not awaited by the detector, meaning:
    - The detector doesn't wait for async operations to complete before continuing
    - Errors or rejections from async callbacks are automatically caught and logged (if logging is configured)
    - If you need to await async operations, handle that inside your callback

- **Memory Considerations** – You should not hold onto the detector reference returned form the `new MultiClickDetector`
  call unless you expressly plan on destroying it later with `destroy()` and discarding the reference. It is recommended
  to call `MultiClickDetector.pruneInvalidPlayers()` in the `OnPlayerLeaveGame` event handler. Following this advice
  will avoid memory leaks and will prevent callback references from being retained in memory.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.
- Battlefield Builder docs – For information about player states and interaction mechanics.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are
welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases
help shape the roadmap (additional detection modes, performance optimizations, alternative input sources, etc.), so
please share your experiences.

---
