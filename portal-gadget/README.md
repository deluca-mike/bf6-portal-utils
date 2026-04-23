# Portal Gadget Module

<ai>

This TypeScript `PortalGadget` namespace provides a high-level API for Battlefield 6 Portal's Portal Gadget laser behavior. It captures player state at fire start/stop so your handlers get a stable snapshot (`isZooming` plus a lazy `getTarget()` function), and it abstracts the undocumented laser origin/angle offsets for both zoomed and hip-fired states.

The module also exposes `PortalGadget.getLaserTarget(player)` so you can query the current laser target on demand, independent of fire events. Internally, laser targeting uses the `Raycast` module and handles asynchronous hit/miss routing for you.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { PortalGadget } from 'bf6-portal-utils/portal-gadget';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Subscribe to `PortalGadget.onFireStart()` / `PortalGadget.onFireStop()` to react to laser usage.
4. Call the provided `getTarget()` function (or `PortalGadget.getLaserTarget(player)`) when you need the target point.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { PortalGadget } from 'bf6-portal-utils/portal-gadget';
import { Events } from 'bf6-portal-utils/events';

PortalGadget.setLogging((text) => console.log(text), PortalGadget.LogLevel.Warning);

const unsubscribeFireStart = PortalGadget.onFireStart(async (player, isZooming, getTarget) => {
    const target = await getTarget();

    if (!target) return;

    console.log(
        `Portal Gadget laser started ${isZooming ? 'zoom-firing' : 'hip-firing'} at: ${mod.XComponentOf(target)}, ${mod.YComponentOf(target)}, ${mod.ZComponentOf(target)}`
    );
});

const unsubscribeFireStop = PortalGadget.onFireStop(async (player, isZooming, getTarget) => {
    const target = await getTarget();

    if (!target) return;

    console.log(
        `Portal Gadget laser stopped ${isZooming ? 'zoom-firing' : 'hip-firing'} at: ${mod.XComponentOf(target)}, ${mod.YComponentOf(target)}, ${mod.ZComponentOf(target)}`
    );
});

Events.OnGameModeEnded.subscribe(() => {
    unsubscribeFireStart();
    unsubscribeFireStop();
});
```

</ai>

---

## Core Concepts

- **Snapshot at trigger time** - Fire handlers receive player snapshot data captured when the raw event fires (`isZooming`, eye position, facing direction), avoiding drift from later movement.
- **Lazy target lookup** - Handlers receive `getTarget()` so expensive raycasts only run when your logic actually needs the target.
- **Zoom vs hip transform** - Different offsets and angle deltas are applied for zoomed and hip-fire Portal Gadget behavior.
- **Raycast abstraction** - Uses the `Raycast` module internally, so callers do not need to manage hit/miss attribution.
- **Safe callback invocation** - Fire event handlers are invoked through `CallbackHandler` to isolate callback failures.
- **Timeout guard** - Laser target promises auto-resolve to `undefined` if a raycast callback never arrives, preventing stuck pending operations.

---

## API Reference

### `namespace PortalGadget`

The namespace is not instantiated; all members are static or types.

#### `PortalGadget.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `PortalGadget.setLogging()` to configure the minimum log level for module logs.

Available log levels:

- `Debug` (0) - Debug-level messages. Most verbose.
- `Info` (1) - Informational messages.
- `Warning` (2) - Warning messages. Includes timeout warnings for raycasts.
- `Error` (3) - Error messages. Includes raycast cast failures and callback errors.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Types

##### `PortalGadget.Handler`

```ts
type Handler = (player: mod.Player, isZooming: boolean, getTarget: () => Promise<mod.Vector | undefined>) => void;
```

- `player` - The player who triggered start/stop fire.
- `isZooming` - Whether the player was zooming when the event fired.
- `getTarget` - Async lazy resolver for laser hit point (`undefined` if no hit or if the raycast times out).

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the Portal Gadget module. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. See the [`Logging` module documentation](../logging/README.md). |
| `onFireStart(handler: Handler): () => void` | Subscribes a handler for enriched fire-start events. Returns an unsubscribe function you should call during teardown. |
| `onFireStop(handler: Handler): () => void` | Subscribes a handler for enriched fire-stop events. Returns an unsubscribe function you should call during teardown. |
| `getLaserTarget(player: mod.Player): Promise<mod.Vector \| undefined>` | Computes and raycasts the player's current Portal Gadget laser and returns the target hit point, or `undefined` if no hit is detected. |

---

## Usage Patterns

- **Event-driven laser logic** - Subscribe to `onFireStart()` / `onFireStop()` and call `getTarget()` only when needed.
- **On-demand polling** - Use `getLaserTarget(player)` for one-off checks outside fire handlers.
- **Zoom-specific behavior** - Branch on `isZooming` to apply different game logic.
- **Cleanup discipline** - Keep unsubscribe callbacks and invoke them when your feature ends.

<ai>

### Example: On-Demand Laser Query

```ts
import { PortalGadget } from 'bf6-portal-utils/portal-gadget';
import { Timers } from 'bf6-portal-utils/timers';

const unsubscribe = PortalGadget.onFireStart(async (player, isZooming, getTarget) => {
    unsubscribe(); // Immediately unsubscribe, so the event is a "once".

    const points: mod.Vector[] = [];

    // Capture points at 500ms intervals until we have 10 valid points, then draw them.
    const timer = Timers.setInterval(async () => {
        const target = await PortalGadget.getLaserTarget(player);

        if (!target) return;

        points.push(target);

        if (points.length >= 10) {
            Timers.clearInterval(timer);
            drawPoints(points); // Example function that can draw the points with WorldIcons.
        }
    }, 500);
});
```

</ai>

---

## How It Works

1. **Event wiring** - The module subscribes to `Events.OnPortalGadgetFireStart` and `Events.OnPortalGadgetFireStop` at load time.
2. **State capture** - When a fire event arrives, it captures eye position, facing direction, and zoom state from soldier state APIs.
3. **Laser transform** - It computes the laser origin/direction from local offsets and angle deltas using a local basis (`forward`, `right`, `up`) plus axis-angle rotation.
4. **Raycast request** - It projects a destination point at fixed distance and calls `Raycast.cast()` with hit/miss callbacks.
5. **Target resolution** - Hit resolves with a `mod.Vector`; miss resolves `undefined`. A timeout guard ensures the promise also resolves `undefined` if no callback arrives.

---

## Known Limitations & Caveats

- **Model-based offsets** - Offset/angle constants are tuned values and may need adjustment if Portal Gadget runtime behavior changes in future game updates.
- **Snapshot semantics** - Handler `getTarget()` uses state captured at event time, not the player's current state when `getTarget()` is awaited later.
- **Inaccurate when looking straight up or down** - The laser transform is not accurate when the player is looking straight up or down.
- **Raycast dependency** - Requires the `Raycast` module's event-driven hit/miss routing, which in turn relies on the `Events` module.

---

## Further Reference

- [Events module](../events/README.md) - Provides the fire-start/fire-stop event stream consumed by this module.
- [Raycast module](../raycast/README.md) - Used internally to resolve asynchronous hit/miss outcomes.
- [Vectors module](../vectors/README.md) - Used internally for coordinate math.
- [Callback Handler module](../callback-handler/README.md) - Used internally to safely invoke subscriber callbacks.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) - Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) - The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, and runtime behavior reports (especially around Portal Gadget offset/angle tuning) are welcome through the project channels.
