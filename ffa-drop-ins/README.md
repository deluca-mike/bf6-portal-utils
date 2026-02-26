# FFA Drop-Ins Module

<ai>

This TypeScript `FFADropIns` namespace enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt with developer-curated drop-in spawn points. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system accepts an arbitrary region of individual rectangles and an altitude. You call `FFADropIns.initialize()` to set up spawn points, `FFADropIns.enableSpawnQueueProcessing()` / `disableSpawnQueueProcessing()` to control queue processing, and create `FFADropIns.Soldier` instances per player.

> **Note** The `FFADropIns` namespace depends on the `UI` and `Events` namespaces (both in this repository) and the `mod` namespace (available in the `bf6-portal-mod-types` package). Internally it uses `Timers`, `Clocks`, and `Vectors` from this repository. **You must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. `FFADropIns` subscribes to `Events.OnPlayerLeaveGame` to clear per-player state and avoid resource leaks when a player leaves; the `UI` module uses `Events` to register the button handler. Because only one implementation of each Portal event can exist per project (the `Events` module owns those hooks), your mod must subscribe via `Events` only. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules you need in your code:
    ```ts
    import { FFADropIns } from 'bf6-portal-utils/ffa-drop-ins';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Call `FFADropIns.initialize()` in a handler subscribed to `Events.OnGameModeStarted` with your spawn region (rectangles + altitude) and optional `InitializeOptions`.
5. Call `FFADropIns.enableSpawnQueueProcessing()` when ready (typically in the same handler subscribed to `Events.OnGameModeStarted`).
6. Create `FFADropIns.Soldier` instances for each player in a handler subscribed to `Events.OnPlayerJoinGame`.
7. Call `FFADropIns.Soldier.startDelayForPrompt(player)` in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy` to start the spawn prompt flow.
8. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code and merge all `strings.json` files).

<ai>

### Example

```ts
import { FFADropIns } from 'bf6-portal-utils/ffa-drop-ins';
import { Events } from 'bf6-portal-utils/events';

// Define your drop-in region: rectangles (minX, minZ, maxX, maxZ) and altitude (y)
const DROP_IN_REGION: FFADropIns.SpawnData = {
    spawnRectangles: [
        { minX: -200, minZ: -200, maxX: 200, maxZ: 200 }, // First area
        { minX: 300, minZ: 100, maxX: 500, maxZ: 300 }, // Second area
    ],
    y: 300, // Altitude for drop-in (players spawn in the air and skydive until they open their parachute)
};

Events.OnGameModeStarted.subscribe(() => {
    FFADropIns.initialize(DROP_IN_REGION, {
        dropInPoints: 64, // Optional (default 64) – number of spawn points to pre-create
        initialPromptDelay: 10, // Optional (default 10 seconds)
        promptDelay: 10, // Optional (default 10 seconds)
        queueProcessingDelay: 2, // Optional (default 2 seconds)
    });

    FFADropIns.enableSpawnQueueProcessing();

    FFADropIns.setLogging((text) => console.log(text), FFADropIns.LogLevel.Info);
});

Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    const soldier = new FFADropIns.Soldier(eventPlayer, false);
    soldier.startDelayForPrompt();
});

Events.OnPlayerUndeploy.subscribe((eventPlayer: mod.Player) => {
    FFADropIns.Soldier.startDelayForPrompt(eventPlayer);
});
```

</ai>

Then build your mod using the bundler (see [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler)).

---

## Core Concepts

- **Events module required** – You must subscribe to game events only via the `Events` module and must not export any Battlefield Portal event handler functions. `FFADropIns` uses `Events.OnPlayerLeaveGame` to clear per-player state when a player leaves (avoiding resource leaks); the `UI` module uses `Events` for button handling. See [Prerequisites](#prerequisites) and [Known Limitations & Caveats](#known-limitations--caveats).
- **Drop-in spawning** – Players spawn in the air at a fixed altitude (`y`) at random (x, z) positions within your rectangular zones, so they can skydive and/or parachute down. No safe-distance or player-proximity logic is applied; spawns are uniformly distributed across the region by area.
- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously, with a configurable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again. This gives them time to adjust loadouts.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue. They will open their parachute on their own before hitting the ground.
- **HQ Disabling** – The system automatically disables both team HQs during initialization to prevent default team-based spawning.
- **Configurable Logging** – The system uses the `Logging` module for internal logging. Use `FFADropIns.setLogging()` to configure a logger function, minimum log level, and whether to include error details.

---

## Drop-In Spawn Region Algorithm

The system uses a **region of rectangles** plus a fixed altitude:

1. **SpawnData** – You provide `spawnRectangles` (array of `{ minX, minZ, maxX, maxZ }`) and a single `y` (altitude). All drop-in spawns use this same `y`; only x and z vary.
2. **Area-weighted selection** – When pre-creating spawn points, the system selects which rectangle to use with probability proportional to its area (larger rectangles get more spawn points). Within each rectangle, (x, z) is chosen uniformly at random.
3. **Pre-created points** – At initialization, `dropInPoints` (default 64) spawn points are created at random (x, z) locations in the region, all at altitude `y`. These are stored in an array.
4. **Queue processing** – When a player is spawned from the queue, the system picks one of the pre-created points at random (`ffaSpawns[Math.floor(Math.random() * ffaSpawns.length)]`). No distance-to-players or safety check is performed; drop-ins are purely random within the region.

### Choosing rectangles and altitude

- Use one or more rectangles to cover the playable area (or only parts of it). Overlapping rectangles are allowed; area is computed per rectangle and rectangles are weighted by area. **Overlapping rectangles effectively create hotspots**: the overlapping region is covered by more than one rectangle, so that area contributes more to the total area and receives more spawn points statistically. You can use this to bias drop-ins toward certain zones (e.g. objectives or high-action areas).
- Set `y` high enough that players have time to skydive and pick a safe landing spot before deploying their parachute and landing safely. Map and mode will vary.
- Increase `dropInPoints` (e.g. 128) for more variety and slightly lower chance of two players landing on the same spot; lower it for fewer spawner objects. Default is 64.
- For maps where you want to prevent roof access, set the `y` below the level of the lowest roof you do not want players to access, or ensure that the rectangles and `y` are set such that players cannot reach certain roofs.

---

<ai>

## Debugging & Development Tools

### Debug Position Display

The `Soldier` constructor accepts an optional `showDebugPosition` parameter (default: `false`) that enables a real-time position display for developers. When enabled, the player's X, Y, and Z coordinates are displayed at the bottom center of the screen, updating every second.

**Use Case**: Useful for finding and documenting drop-in regions and altitude (e.g. flying around to set rectangle bounds and `y`).

**Coordinate Format**: Coordinates are scaled by 100 and truncated (using integer truncation) to avoid Portal's decimal display issues. Divide the displayed value by 100 to get actual world coordinates.

**Example Usage**:

```ts
Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    const soldier = new FFADropIns.Soldier(eventPlayer, mod.GetObjId(eventPlayer) === 0);
    soldier.startDelayForPrompt();
});
```

</ai>

---

## API Reference

### `namespace FFADropIns`

The `FFADropIns` namespace contains the `Soldier` class, namespace-level functions for initialization and queue processing, and related types.

#### `FFADropIns.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `FFADropIns.setLogging()` to configure the minimum log level for drop-in spawn logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose, includes queue processing and spawn location details.
- `Info` (1) – Informational messages. Includes initialization and queue processing updates.
- `Warning` (2) – Warning messages. Includes invalid player warnings and empty region/queue. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### `FFADropIns.setLogging(log?: (text: string) => Promise<void> | void, logLevel?: LogLevel, includeError?: boolean): void`

Configures logging for the FFADropIns module. The spawn system logs initialization, queue processing, and warnings.

**Parameters:**

- `log` – The logger function to use. Pass `undefined` to disable logging. Can be synchronous or asynchronous.
- `logLevel` – The minimum log level to use. Messages below this level will not be logged. Defaults to `LogLevel.Warning`.
- `includeError` – Whether to include the runtime error details in the log message. Defaults to `false`. The runtime error can be very large and may cause issues with UI loggers.

**Example:**

```ts
import { FFADropIns } from 'bf6-portal-utils/ffa-drop-ins';

FFADropIns.setLogging((text) => console.log(text), FFADropIns.LogLevel.Info, true);
```

**Note:** Logging is fail-safe and will not affect spawn system functionality if the logger fails. See the [Logging module documentation](../logging/README.md).

#### Namespace Functions

| Function | Description |
| --- | --- |
| `initialize(spawnData: FFADropIns.SpawnData, options?: FFADropIns.InitializeOptions): void` | Should be called in a handler subscribed to `Events.OnGameModeStarted`. Disables both team HQs and sets up the drop-in spawn system. Pre-creates `dropInPoints` spawn points at random (x, z) within the given rectangles at altitude `spawnData.y`. Optional `options` override defaults for drop-in point count and delays. Idempotent: logs a warning and returns if already initialized. |
| `enableSpawnQueueProcessing(): void` | Enables processing of the spawn queue. Call when you want spawning to begin (typically in a handler subscribed to `Events.OnGameModeStarted`). Starts processing immediately if the queue is not already being processed. |
| `disableSpawnQueueProcessing(): void` | Disables processing of the spawn queue. Useful for pausing spawning during intermissions or round transitions. |

### `class FFADropIns.Soldier`

#### Static Methods

| Method | Description |
| --- | --- |
| `startDelayForPrompt(player: mod.Player): void` | Starts the countdown before prompting the player to spawn or delay again. Usually called in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy`. AI soldiers will skip the countdown and spawn immediately. |
| `forceIntoQueue(player: mod.Player): void` | Forces a player to be added to the spawn queue, skipping the countdown and prompt. Useful for programmatic spawning. |

#### Constructor

| Signature | Description |
| --- | --- |
| `constructor(player: mod.Player, showDebugPosition?: boolean)` | Every player that should be handled by this spawning system should be instantiated as a `FFADropIns.Soldier`, usually in a handler subscribed to `Events.OnPlayerJoinGame`. Creates the UI elements for human players (AI soldiers skip UI creation). When `showDebugPosition` is `true`, displays the player's X, Y, and Z coordinates (scaled by 100 and truncated) at the bottom center of the screen, updating every second. |

#### Instance Properties

| Property   | Type         | Description                                                    |
| ---------- | ------------ | -------------------------------------------------------------- |
| `player`   | `mod.Player` | The player associated with this `FFADropIns.Soldier` instance. |
| `playerId` | `number`     | The unique ID of the player associated with this instance.     |

#### Instance Methods

| Method | Description |
| --- | --- |
| `startDelayForPrompt(delay?: number): void` | Starts the countdown before prompting the player to spawn or delay again. Usually called in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy`. AI soldiers skip the countdown and are added to the queue immediately. Optional `delay` defaults to the initial prompt delay. |
| `deleteIfNotValid(): boolean` | Deletes the Soldier instance if the player is no longer valid (e.g. left the game). Returns `true` if the instance was deleted. Cleans up UI, timers, and removes the soldier from the internal registry. |

---

## Configuration & Defaults

The following values control drop-in spawning behavior. Most can be overridden via the optional `options` argument on `FFADropIns.initialize()`.

| Setting | Type | Default | How to change | Description |
| --- | --- | --- | --- | --- |
| `dropInPoints` | `number` | `64` | `initialize` `options.dropInPoints` | Number of spawn points to pre-create at random (x, z) within the rectangles at the given altitude. |
| `initialPromptDelay` | `number` | `10` | `initialize` `options.initialPromptDelay` | Time (in seconds) until the player is first asked to spawn or delay the prompt again. |
| `promptDelay` | `number` | `10` | `initialize` `options.promptDelay` | Time (in seconds) until the player is asked to spawn or delay the prompt again (after clicking delay). |
| `queueProcessingDelay` | `number` | `2` | `initialize` `options.queueProcessingDelay` | Delay (in seconds) between processing spawn queue batches. |

---

## Types & Interfaces

All types are defined inside the `FFADropIns` namespace in [`index.ts`](index.ts).

### `FFADropIns.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. See the [Logging module documentation](../logging/README.md) for details.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

### `FFADropIns.SpawnRectangle`

Type for one rectangle in the drop-in spawn region (X and Z bounds; Y is specified separately in `SpawnData`):

```ts
type SpawnRectangle = {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
};
```

### `FFADropIns.SpawnData`

Type for defining the drop-in region when initializing the system:

```ts
type SpawnData = {
    /** The rectangles that make up the drop-in spawning region. */
    spawnRectangles: SpawnRectangle[];
    /** The Y coordinate (altitude) of the drop-in spawning plane. */
    y: number;
};
```

### `FFADropIns.InitializeOptions`

Optional overrides when calling `initialize()`:

```ts
type InitializeOptions = {
    dropInPoints?: number; // Default 64
    initialPromptDelay?: number; // Default 10 (seconds)
    promptDelay?: number; // Default 10 (seconds)
    queueProcessingDelay?: number; // Default 2 (seconds)
};
```

---

## Event Wiring & Lifecycle

<ai>

### Required event subscription (via Events only)

You must **not** implement or export any Battlefield Portal event handler functions. Subscribe to game events only through the `Events` module:

1. **`Events.OnGameModeStarted`** – In your subscriber, call `FFADropIns.initialize()` with your spawn data (rectangles + altitude) and `FFADropIns.enableSpawnQueueProcessing()` to start the system.
2. **`Events.OnPlayerJoinGame`** – In your subscriber, create a new `FFADropIns.Soldier` instance for each player and call `soldier.startDelayForPrompt()` to begin the spawn flow.
3. **`Events.OnPlayerUndeploy`** – In your subscriber, call `FFADropIns.Soldier.startDelayForPrompt(player)` to restart the spawn flow when players die or undeploy.

</ai>

### Lifecycle Flow

1. Player joins or undeploys → `startDelayForPrompt()` is called
2. Countdown timer displays for `initialPromptDelay` seconds (default: 10) on first prompt, or `promptDelay` seconds (default: 10) on subsequent delays
3. UI prompt appears with "Drop-in spawn now" and "Ask again in {} seconds" (or your localized strings)
4. Player clicks spawn → Player is added to spawn queue
5. Player clicks delay → Countdown restarts with `promptDelay` duration
6. Spawn queue processor picks a random pre-created drop-in point and spawns the player in the air
7. Player skydives and/or parachutes down. Process repeats when player dies or undeploys

---

## Strings File

This module includes a `strings.json` file that will be automatically merged by `bf6-portal-bundler` when you bundle your mod. You can override the default strings (countdown, spawn button, delay button, debug position format) by providing your own entries in your mod's `strings.json`.

---

<ai>

## Known Limitations & Caveats

- **Events module required** – You **must** use the [Events module](../events/README.md) for all game event subscription and **must not** implement or export any Battlefield Portal event handler functions in your code. `FFADropIns` subscribes to `Events.OnPlayerLeaveGame` internally to clear per-player state and avoid resource leaks when a player leaves; the `UI` module also uses `Events` to register the button handler. Only one implementation of each Portal event can exist per project, and the Events module owns those hooks. If you export your own `OnPlayerJoinGame`, `OnGameModeStarted`, etc., they will conflict and cause undefined behavior. See [Events — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).
- **Random spawn selection** – When spawning from the queue, the system picks uniformly at random from the pre-created drop-in points. Two players can land at or near the same spot. There is no safe-distance or player-proximity logic (unlike `FFASpawnPoints`). For more spread, increase `dropInPoints` or use multiple rectangles with larger total area.
- **UI Input Mode** – The system delegates automatic `mod.EnableUIInputMode()` management to the `UI` module. Be careful not to conflict with other UI systems that do not use the `UI` module that also control input mode.
- **HQ Disabling** – The system automatically disables both team HQs during initialization. If you need team-based spawning elsewhere, you'll need to re-enable HQs manually (but you really should not be mixing this with other systems unless you know what you are doing).
- **Spawn Point Cleanup** – Spawn points created during initialization are not automatically cleaned up. This is typically fine as they persist for the duration of the match.
- **AI parachute behavior** – AI tend to open their parachutes very early and then fall slowly, making them easy targets for attackers and likely affecting game balance. Be aware of this when mixing human and AI players in drop-in modes.
- **AI parachute timing and altitude** – No testing has been done to determine how much fall time (effective altitude) AI need to properly automatically open their parachutes. More work is needed to better control how and when AI open their chutes for balance and safety (e.g. minimum altitude, delay before open, or other tuning).

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the system to them.
- [FFASpawnPoints module](../ffa-spawn-points/README.md) – Similar FFA spawning with a curated list of ground spawn points and safe-distance logic; use when you want fixed positions and player-aware spawn selection.
- [UI module](../ui/README.md) – Documentation for the UI helper module required by this system.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels. Real-world use cases help shape the roadmap (e.g. configurable parachute behavior, multiple altitude bands, integration with other modes), so please share your experiences.

---
