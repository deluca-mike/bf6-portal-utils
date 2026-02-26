# Player Undeploy Fixer Module

<ai>

The `PlayerUndeployFixer` namespace is a small helper that automatically subscribes to `OnPlayerDied`, `OnPlayerUndeploy`, and `OnPlayerLeaveGame` via the `Events` module. It tracks whether a player who died has properly undeployed within a fixed time window (currently 30 seconds). If not—e.g. the player is stuck in a "limbo" state where the engine did not fire `OnPlayerUndeploy`—the fixer manually triggers `Events.OnPlayerUndeploy.trigger(player)` so that any code subscribed to `OnPlayerUndeploy` runs correctly. This fix is mainly useful in handling static AI bots that do not properly undeploy when they die, which, when left unchecked, results in a slowly growing population of stuck AI that never redeploy.

No setup is required beyond importing the module; subscribing and triggering are handled internally.

> **Note** You **must** use the `Events` module as your only mechanism to subscribe to game events. Do not implement or export any Battlefield Portal event handler functions (`OnPlayerDied`, `OnPlayerUndeploy`, `OnPlayerDeployed`, etc.) in your code. The `Events` module owns those hooks and this module relies on it; only one implementation of each event handler can exist per project. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code (importing it activates the fixer; no further setup is required):
    ```ts
    import { PlayerUndeployFixer } from 'bf6-portal-utils/player-undeploy-fixer';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Optionally call `PlayerUndeployFixer.setLogging(...)` to see fixer warnings when a player is forced out of limbo.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { PlayerUndeployFixer } from 'bf6-portal-utils/player-undeploy-fixer';

// Optional: log when the fixer forces an undeploy
PlayerUndeployFixer.setLogging((text) => console.log(text), PlayerUndeployFixer.LogLevel.Warning);
```

</ai>

---

## How It Works

1. **Subscriptions** – At load time, the module subscribes to `Events.OnPlayerDied`, `Events.OnPlayerUndeploy`, and `Events.OnPlayerLeaveGame`.
2. **On death** – When a player dies, the fixer records the death time for that player. After a fixed delay (30 seconds), it checks: (a) whether this is still the same death event (no new death since), (b) whether the player has undeployed since that death (using a separate `OnPlayerUndeploy` timestamp), and (c) whether the player is still not alive (`GetSoldierState(..., IsAlive)`). If (a) and (b) and (c) hold, the player is considered stuck in limbo.
3. **Forced undeploy** – In that case, the fixer logs a warning (if logging is configured) and calls `Events.OnPlayerUndeploy.trigger(player)`. All subscribers to `OnPlayerUndeploy`—including your code—then run as if the engine had fired the event, so your logic can correct the player’s state.
4. **On undeploy** – When `OnPlayerUndeploy` fires (from the engine or from the fixer), the fixer records the undeploy time for that player so it can tell that the player has properly undeployed and does not need a forced trigger.

The 30-second window is an internal constant and is not configurable in the current API.

---

## API Reference

### `namespace PlayerUndeployFixer`

#### `PlayerUndeployFixer.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use with `PlayerUndeployFixer.setLogging()`.

Available log levels:

- `Debug` (0) – Most verbose.
- `Info` (1) – Informational.
- `Warning` (2) – Warnings. Includes when the fixer forces an undeploy (player stuck in limbo). Default minimum log level.
- `Error` (3) – Errors. Includes failures when checking soldier state before forcing undeploy.

See the [Logging module documentation](../logging/README.md) for details.

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the PlayerUndeployFixer module. When the fixer forces an undeploy, it logs a warning; when checking soldier state fails, it logs an error. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. See the [Logging](../logging/README.md) module documentation. |

---

<ai>

## Known Limitations & Caveats

- **Events module required** – Since this module uses the `Events` module, you **must** use the [Events module](../events/README.md) for all game event subscription and **must not** implement or export any Battlefield Portal event handler functions. See [Events — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).
- **Fixed delay** – The time window before forcing an undeploy is currently a fixed 30 seconds and is not configurable via the public API.
- **Trigger semantics** – When the fixer calls `Events.OnPlayerUndeploy.trigger(player)`, all subscribers to `OnPlayerUndeploy` are invoked. Ensure your subscriber can safely run when the player is in the "stuck" state (e.g. not assuming the player is on the deploy screen in the usual way).

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the detector to them.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
