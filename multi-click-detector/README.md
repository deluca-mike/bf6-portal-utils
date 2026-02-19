# Multi-Click Detector Module

<ai>

This TypeScript `MultiClickDetector` class enables Battlefield Portal experience developers to detect when a player has rapidly triggered a soldier state multiple times in quick succession. The detector can monitor any soldier state boolean from `mod.SoldierStateBool`, allowing you to detect multi-click sequences for various player actions.

The detector tracks soldier state transitions for each player independently, counting rapid state changes within a configurable time window to determine when a multi-click sequence has been completed. Each detector instance is configured with runtime options (including which soldier state to monitor) and a callback that is triggered when a multi-click sequence is detected.

By default, the detector monitors `mod.SoldierStateBool.IsInteracting`, which is the most user-friendly option because the interact state goes `true` for 1 tick even when there is no object that can be interacted with nearby. This makes it ideal for detecting multi-click sequences without requiring physical interaction points, and is useful because there is no keybind Portal experience developers can hook into to open up a custom UI.

Key features include instance-based construction with per-instance configuration, **automatic event wiring** via the `Events` module (the detector subscribes to `OngoingPlayer`, `OnPlayerDeployed`, `OnPlayerUndeploy`, and `OnPlayerLeaveGame` internally), and configurable logging. Soldier state is only read when the player is deployed, so the admin error log is not flooded. Each detector can be enabled or disabled independently. Callbacks can be sync or async; **asynchronous callbacks are preferred** because synchronous callbacks block the entire `OngoingPlayer` event stack. Keep sync callbacks short if you use them.

> **Note** You **must** use the `Events` module as your only mechanism to subscribe to game events. Do not implement or export any Battlefield Portal event handler functions (`OngoingPlayer`, `OnPlayerDeployed`, `OnPlayerDied`, etc.) in your code. The `Events` module subscribes to those events internally and only one implementation of each can exist per project, so it owns those hooks. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Create detector instances for each player (e.g. in a handler subscribed to `Events.OnPlayerJoinGame` or `Events.OnPlayerDeployed`) with a callback and optional configuration. Event wiring is automatic and detectors are cleaned up when the player leaves.
5. Optionally set up logging for debugging (recommended during development).
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';
import { Events } from 'bf6-portal-utils/events';

MultiClickDetector.setLogging((text) => console.log(text), MultiClickDetector.LogLevel.Error);

Events.OnPlayerJoinGame.subscribe((player: mod.Player) => {
    const playerId = mod.GetObjId(player);

    // Create a detector for this player. Event wiring is automatic.
    // Prefer async callbacks—sync callbacks block the entire OngoingPlayer event stack.
    new MultiClickDetector(
        player,
        async () => {
            console.log(`Player ${playerId} performed multi-click!`);
            await openCustomMenu(player);
        },
        {
            soldierState: mod.SoldierStateBool.IsInteracting,
            windowMs: 1_000,
            requiredClicks: 3,
        }
    );
}
```

</ai>

---

## Core Concepts

- **Instance-Based Detection** – Each detector is a separate instance created for a specific player with its own configuration and callback. Multiple detectors can track the same player with different configurations.
- **Configurable Soldier States** – Each detector can monitor any soldier state boolean from `mod.SoldierStateBool`. The default is `mod.SoldierStateBool.IsInteracting`, which is the most user-friendly option. See [Choosing a Soldier State](#choosing-a-soldier-state) for guidance on selecting the best state for your use case.
- **State Tracking** – Each detector instance maintains its own state to track the last soldier state value, click count, and sequence start time.
- **Edge Detection** – The detector only responds to rising edges (transitions from `false` to `true`) of the configured soldier state, ignoring falling edges and state stability.
- **Time Window** – State changes must occur within a configurable time window (default 1000ms) to be considered part of the same sequence.
- **Click Counting** – The detector counts state changes within the time window and triggers the callback when the required number of changes (default 3) is reached.
- **Automatic event wiring** – The detector subscribes to `Events.OngoingPlayer`, `OnPlayerDeployed`, `OnPlayerUndeploy`, and `OnPlayerLeaveGame` at load time. You must not export any Portal event handlers; use the Events module for your own subscriptions.
- **Enable / disable** – Deployment is tracked at the **player** level: when the player deploys, the module allows detector logic to run for that player (soldier state is only read when deployed); when they undeploy, it does not. This avoids filling the admin error log and means the user **cannot** cause soldier state to be read for an undeployed player by calling `enable()`. Each detector also has its own **enable/disable** state (`enable()` / `disable()`). That per-detector state is **not** overwritten by deploy or undeploy—you can enable or disable individual detectors and they keep that state across deployment. A detector runs only when the player is deployed **and** that detector is enabled.
- **Callback handling** – Callbacks are invoked via `CallbackHandler`, so sync and async errors are caught and logged and do not stop detector execution. **Synchronous callbacks block the entire `OngoingPlayer` event stack**; keep them short or prefer **asynchronous callbacks** for non-trivial work.
- **Configurable Error Logging** – Use `MultiClickDetector.setLogging()` to configure a logger function, minimum log level, and whether to include error details for callback failures.

---

## API Reference

### `class MultiClickDetector`

#### `MultiClickDetector.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `MultiClickDetector.setLogging()` to configure the minimum log level for detector callback error logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the MultiClickDetector module. Callback errors (sync and async) are caught and logged via `CallbackHandler`. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. See the [Logging](../logging/README.md) module documentation. |

#### Constructor

| Method | Description |
| --- | --- |
| `constructor(player: mod.Player, callback: () => Promise<void> \| void, options?: MultiClickDetector.Options)` | Creates a new multi-click detector for the specified player. The detector is registered for event handling automatically (no manual event wiring). It starts **enabled** (call `disable()` to turn it off). The module only runs detector logic when the player is deployed (deploy/undeploy do not overwrite each detector's enabled state). The callback is invoked via `CallbackHandler` when a multi-click sequence is detected. Callbacks can be sync or async; **async is preferred** because sync callbacks block the entire `OngoingPlayer` event stack. See the `Options` interface below. Default soldier state is `mod.SoldierStateBool.IsInteracting`. |

#### Instance Methods

| Method | Description |
| --- | --- |
| `enable(): void` | Enables this detector so it will process soldier state transitions and invoke the callback when a multi-click sequence is detected (when the player is deployed). The detector's enabled state is **not** overwritten when the player deploys or undeploys—only deployment gates whether the module runs any logic for that player; within that, each detector's enabled state is independent. |
| `disable(): void` | Disables this detector so it will not process state transitions or invoke the callback. The detector's disabled state is **not** overwritten when the player deploys or undeploys. |
| `destroy(): void` | Removes the detector from tracking. Call when the detector is no longer needed. Detectors for a player are also cleaned up automatically when that player leaves the game (via the internal `OnPlayerLeaveGame` subscription). |

#### `MultiClickDetector.Options`

Interface for configuring detector behavior:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `soldierState` | `mod.SoldierStateBool` | `mod.SoldierStateBool.IsInteracting` | The soldier state boolean to monitor for multi-click sequences. Can be any member of `mod.SoldierStateBool`. See [Choosing a Soldier State](#choosing-a-soldier-state) for guidance. |
| `windowMs` | `number` | `1_000` | Time window in milliseconds for a valid multi-click sequence. If the time between the first state change and subsequent changes exceeds this value, the sequence is reset. |
| `requiredClicks` | `number` | `3` | Number of state changes required to trigger a multi-click sequence. The callback will be called when this many state changes are detected within the time window. |

---

<ai>

## Event Wiring & Lifecycle

### Event subscription (Events module only)

You must **not** implement or export any Battlefield Portal event handler functions. The detector subscribes internally to `Events.OngoingPlayer`, `Events.OnPlayerDeployed`, `Events.OnPlayerUndeploy`, and `Events.OnPlayerLeaveGame`. Use the Events module for your own logic (e.g. `Events.OnPlayerJoinGame.subscribe(...)` to create detectors). There are no required event handlers for you to wire—event handling is automatic.

### Lifecycle Flow

1. Import `MultiClickDetector` and `Events`; subscribe to game events only via `Events`.
2. Optionally configure logging with `MultiClickDetector.setLogging()` (recommended during development).
3. Create detector instances for players in your event subscribers (e.g. `Events.OnPlayerJoinGame.subscribe((player) => { new MultiClickDetector(player, callback, options); })`). No need to call `handleOngoingPlayer` or `pruneInvalidPlayers`—the detector subscribes to the required events internally.
4. The module automatically:
    - Gates detector logic by deployment: soldier state is only read when the player is deployed (`OnPlayerDeployed` sets a player-level flag; `OnPlayerUndeploy` clears it). Each detector's own `enable()`/`disable()` state is **not** overwritten by deploy or undeploy.
    - Tracks soldier state transitions via `OngoingPlayer` (only for deployed players)
    - Removes all detectors for that player when they leave (`OnPlayerLeaveGame`)
    - For each enabled detector (when the player is deployed), counts state changes within the time window, resets sequences that exceed it, and invokes the callback (via `CallbackHandler`) when the required number of state changes is detected
5. You may call call `detector.destroy()` when you no longer need a specific detector; otherwise cleanup is automatic on player leave.

</ai>

---

## How It Works

The `MultiClickDetector` uses edge detection and time-windowed counting to detect multi-click sequences:

1. **Instance Creation** – When a detector is created via the constructor, it is registered in a static map grouped by player ID. Multiple detectors can track the same player with different configurations.

2. **Automatic Event Subscriptions** – At load time, the class subscribes to `Events.OngoingPlayer`, `Events.OnPlayerDeployed`, `Events.OnPlayerUndeploy`, and `Events.OnPlayerLeaveGame`. When the player **deploys**, a player-level flag is set so that detector logic (and soldier state reads) runs for that player; when they **undeploy**, that flag is cleared so soldier state is never read for an undeployed player. Deploy/undeploy do **not** overwrite each detector's `enable()`/`disable()` state. When the player leaves, all detectors for that player are removed.

3. **Event Handling** – When `OngoingPlayer` fires, the module looks up the player's state; if the player is not deployed, it returns without reading soldier state. Otherwise it calls each detector's internal handler; each handler only runs if that detector is enabled.

4. **Fast Exit Optimization** – For each detector, if the current soldier state matches the last known state, the handler returns immediately. This handles the vast majority of ticks where no state change occurred.

5. **Edge Detection** – The detector only processes rising edges (transitions from `false` to `true`) of the configured soldier state. Falling edges are ignored.

6. **Time Window Check** – If a sequence is in progress and the time window has expired, the sequence is reset.

7. **Click Counting** – On a rising edge: if first click, record start time and set count to 1; otherwise increment. When the count matches `requiredClicks`, the callback is invoked via `CallbackHandler.invokeNoArgs()` and the sequence is reset. **Synchronous callbacks run inline and block the entire `OngoingPlayer` stack for that player; asynchronous callbacks are preferred.**

8. **Error Isolation** – Callback errors (sync and async) are caught and logged by `CallbackHandler` and do not stop other detectors or your mod.

9. **Per-Instance Tracking** – Each detector has its own state (last state, click count, sequence start time) and configuration (soldier state, time window, required clicks).

---

<ai>

### Example: Multiple Detectors per Player

```ts
import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';
import { Events } from 'bf6-portal-utils/events';

Events.OnPlayerJoinGame.subscribe((player: mod.Player) => {
    new MultiClickDetector(player, () => openCustomMenu(player), {
        soldierState: mod.SoldierStateBool.IsSprinting,
        requiredClicks: 4,
        windowMs: 1_500,
    });

    new MultiClickDetector(player, () => activateSpecialAbility(player), {
        soldierState: mod.SoldierStateBool.IsInteracting,
        requiredClicks: 3,
        windowMs: 1_000,
    });
});
```

### Example: Async callbacks (preferred)

```ts
import { MultiClickDetector } from 'bf6-portal-utils/multi-click-detector';
import { Events } from 'bf6-portal-utils/events';

Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    new MultiClickDetector(player, async () => {
        await loadPlayerData(player);
        await openCustomUI(player);
    });
});
```

</ai>

---

<ai>

## Choosing a Soldier State

The detector can monitor any soldier state boolean from `mod.SoldierStateBool`, but not all states are equally suitable for multi-click detection. This section explains which states work best and why.

### Recommended: `IsInteracting` (Default)

**Why it's the best choice:**

- **No visual side effects** – When a player rapidly presses the interact key, the interact state goes `true` for 1 ticks even when there is no object or interaction points that can be interacted with nearby. This means players can perform multi-click sequences without any visual feedback or character movement, making it feel like a hidden input method.
- **No gameplay impact** – Unlike other states, rapid interact presses don't cause the player's character to perform any actions that could interfere with gameplay.
- **Caveat** - Players must have their `Interact` keybind set to `Tap`, not `Hold`.

**Use case:** Opening custom menus, triggering special abilities, or any action where you want a hidden input method that doesn't affect the player's character visually or mechanically.

### Secondary Options: `IsCrouching` and `IsSprinting`

**Why they work but have drawbacks:**

- **Rapid toggling is possible** – Both `IsCrouching` and `IsSprinting` can be rapidly toggled by players, making them technically viable for multi-click detection.
- **Visual jittering** – Rapidly toggling these states causes the player's character to visually jitter as it tries to crouch/stand or sprint/walk in quick succession. This can be distracting and may interfere with gameplay.
- **Gameplay impact** – The character actually performs these actions, which may not be desirable if you're just trying to detect input for a UI or special ability.
- **Benefit** - Unlike requiring players to ensure their `Interact` keybind set to `Tap`, it is more likely players can already quickly toggle `Sprint` or `Crouch` with their existing keybind settings.

**Use case:** Consider these if you need more than one multi-click detection (and you've already used the `IsInteracting` state), or if you are comfortable forcing players to physically jitter a bit, but not have to change their `Interact` keybind set to `Tap`.

</ai>

### Not Recommended: Other Soldier States

The remaining soldier states in `mod.SoldierStateBool` are **not recommended** for multi-click detection because they are difficult, if not impossible or impractical, to toggle in quick succession:

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
- **`IsProne`** – Similar to `IsCrouching` but with more animation overhead and many players may have this bound as a `Hold`
- **`IsReloading`** – Cannot always be done and cannot be rapid toggled
- **`IsStanding`** – Opposite of `IsCrouching`/`IsProne`, same jittering issues, but less reliable
- **`IsVaulting`** – Requires specific obstacles and is physics-based that prevent rapid toggling
- **`IsZooming`** – While a decent choice, requires the player to be holding a weapon they can aim down sights

---

## Known Limitations & Caveats

- **Soldier State Dependency** – The detector relies on soldier state booleans to detect state changes. If the behavior of soldier states changes in future Battlefield Portal updates, detection may be affected. The default `mod.SoldierStateBool.IsInteracting` is the most reliable option, but any state you choose may be subject to game engine changes.

- **Events module required** – You **must** use the [Events module](../events/README.md) for all game event subscription and **must not** implement or export any Battlefield Portal event handler functions. This module subscribes to `OngoingPlayer`, `OnPlayerDeployed`, `OnPlayerUndeploy`, and `OnPlayerLeaveGame` internally. See [Events — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

- **Synchronous vs asynchronous callbacks** – Callbacks are invoked via `CallbackHandler`. **Synchronous callbacks block the entire `OngoingPlayer` event stack** for that player (and any other logic in that stack). Keep sync callbacks short; **asynchronous callbacks are preferred** for non-trivial work. Async callbacks are not awaited; errors and rejections are caught and logged.

- **Tick Rate Sensitivity** – The detector runs once per tick per player via the internal `OngoingPlayer` subscription. On lower tick rates or under load, rapid state changes might be missed if they occur within a single tick.

- **Deployment gating** – The module subscribes to `OnPlayerDeployed` and `OnPlayerUndeploy` so that detector logic (and soldier state reads) runs only when the player is deployed. This is gated at the **player** level: the module never reads soldier state for an undeployed player, so **calling `enable()` for an undeployed player does not cause error log spam**—soldier state is only read after the player deploys. Each detector's `enable()`/`disable()` state is **not** overwritten by deploy or undeploy, so you can enable or disable individual detectors and they keep that state across deployment; a detector runs only when (player is deployed and detector is enabled).

<ai>

- **Memory** – Detectors for a player are removed automatically when the player leaves. Hold a detector reference only if you need to call `enable()`, `disable()`, or `destroy()` yourself; otherwise you can create detectors without storing the return value.

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the detector to them.
- [CallbackHandler module](../callback-handler/README.md) – Used to invoke callbacks safely so errors do not crash the mod.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional detection modes, performance optimizations, alternative input sources, etc.), so please share your experiences.

---
