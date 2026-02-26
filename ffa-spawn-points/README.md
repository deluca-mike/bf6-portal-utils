# FFA Spawn Points Module

<ai>

This TypeScript `FFASpawnPoints` namespace enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt with developer-curated fixed spawn points. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system uses an intelligent algorithm to find safe spawn points that are appropriately distanced from other players, reducing the chance of spawning directly into combat while maintaining reasonable spawn times. You call `FFASpawnPoints.initialize()` to set up spawn points, `FFASpawnPoints.enableSpawnQueueProcessing()` / `disableSpawnQueueProcessing()` to control queue processing, and create `FFASpawnPoints.Soldier` instances per player.

> **Note** The `FFASpawnPoints` namespace depends on the `UI` and `Events` namespaces (both in this repository) and the `mod` namespace (available in the `bf6-portal-mod-types` package). Internally it uses `Timers`, `Clocks`, and `Vectors` from this repository. **You must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. `FFASpawnPoints` subscribes to `Events.OnPlayerLeaveGame` to clear per-player state and avoid resource leaks when a player leaves; the `UI` module uses `Events` to register the button handler. Because only one implementation of each Portal event can exist per project (the `Events` module owns those hooks), your mod must subscribe via `Events` only. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules you need in your code:
    ```ts
    import { FFASpawnPoints } from 'bf6-portal-utils/ffa-spawn-points';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Use the `Events` module for all event subscription; do not export any Portal event handlers.
4. Call `FFASpawnPoints.initialize()` in a handler subscribed to `Events.OnGameModeStarted` with your spawn point data (optional `InitializeOptions` to override defaults for spawn distances, delays, and candidate limits).
5. Call `FFASpawnPoints.enableSpawnQueueProcessing()` when ready (typically in the same handler subscribed to `Events.OnGameModeStarted`).
6. Create `FFASpawnPoints.Soldier` instances for each player in a handler subscribed to `Events.OnPlayerJoinGame`.
7. Call `FFASpawnPoints.Soldier.startDelayForPrompt(player)` in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy` to start the spawn prompt flow.
8. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code and merge all `strings.json` files).

<ai>

### Example

```ts
import { FFASpawnPoints } from 'bf6-portal-utils/ffa-spawn-points';
import { Events } from 'bf6-portal-utils/events';

// Define your spawn points
const SPAWN_POINTS: FFASpawnPoints.SpawnData[] = [
    [100, 0, 200, 0], // x = 100, y = 0, z = 200, orientation = 0 (North)
    [-100, 0, 200, 90], // x = -100, y = 0, z = 200, orientation = 90 (East)
    [0, 0, -200, 180], // x = 0, y = 0, z = -200, orientation = 180 (South)
    [-200, 100, 300, 270], // x = -200, y = 100, z = 300, orientation = 270 (West)
    // ... more spawn points
];

Events.OnGameModeStarted.subscribe(() => {
    // Initialize the spawning system
    FFASpawnPoints.initialize(SPAWN_POINTS, {
        minimumSafeDistance: 20, // Optional override (default 20)
        maximumInterestingDistance: 40, // Optional override (default 40)
        safeOverInterestingFallbackFactor: 1.5, // Optional override (default 1.5)
        maxSpawnCandidates: 12, // Optional override (default 12)
        initialPromptDelay: 10, // Optional override (default 10 seconds)
        promptDelay: 10, // Optional override (default 10 seconds)
        queueProcessingDelay: 1, // Optional override (default 1 second)
    });

    // Enable spawn queue processing
    FFASpawnPoints.enableSpawnQueueProcessing();

    // Optional: Configure logging for spawn system debugging
    FFASpawnPoints.setLogging((text) => console.log(text), FFASpawnPoints.LogLevel.Info);
});

Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    // Create a FFASpawnPoints.Soldier instance for each player
    // Pass `true` as the second parameter to enable debug position display (useful for finding spawn points).
    const soldier = new FFASpawnPoints.Soldier(eventPlayer, false);

    // Start the delay countdown for the player.
    soldier.startDelayForPrompt();
});

Events.OnPlayerUndeploy.subscribe((eventPlayer: mod.Player) => {
    // Start the delay countdown when a player undeploys (is ready to deploy again).
    FFASpawnPoints.Soldier.startDelayForPrompt(eventPlayer);
});
```

</ai>

Then build your mod using the bundler (see [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler)).

---

## Core Concepts

- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously, with a definable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again. This gives them time to adjust loadouts.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue.
- **Smart Spawning** – The system uses a prime walking algorithm to find spawn points that are safely distanced from other players.
- **HQ Disabling** – The system automatically disables both team HQs during initialization to prevent default team-based spawning.
- **Configurable Logging** – The system uses the `Logging` module for internal logging. Use `FFASpawnPoints.setLogging()` to configure a logger function, minimum log level, and whether to include error details. This provides visibility into spawn system behavior, including spawn point selection, queue processing, and warnings.

---

## Spawn Point Selection Algorithm

The internal `getBestSpawnPoint()` uses a **Prime Walking Algorithm** to efficiently search for suitable spawn locations:

1. **Random Start** – Selects a random starting index in the spawn points array.
2. **Prime Step Size** – Uses a randomly selected prime number (from `PRIME_STEPS`) as the step size to walk through the array. This ensures good distribution and avoids clustering.
3. **Distance Checking** – For each candidate spawn point, calculates the distance to the closest player.
4. **Ideal Range** – A spawn point is considered ideal if the distance to the closest player is between `minimumSafeDistance` and `maximumInterestingDistance`.
5. **Fallback Selection** – If no ideal spawn point is found within `maxSpawnCandidates` iterations, two fallbacks are tracked: the most interesting "safe" spawn (>= safe distance, closest to players) and the safest "interesting" spawn (<= interesting distance, farthest from players). A scaled midpoint (`safeOverInterestingFallbackFactor` × average of the safe/interesting thresholds) decides which fallback to use, biasing toward safer options as the factor grows.

### Performance vs. Quality Tradeoff

The `maxSpawnCandidates` option (default: 12) represents a tradeoff between:

- **Performance** – Lower values reduce computation time but may miss suitable spawn points.
- **Spawn Quality** – Higher values increase the chance of finding an ideal spawn point but require more distance calculations.

In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within the check limit. Consider adjusting `maxSpawnCandidates` via the `initialize()` options based on your map size, player count, and spawn point density, and make sure there are more spawn points than max players.

---

<ai>

## Debugging & Development Tools

### Debug Position Display

The `Soldier` constructor accepts an optional `showDebugPosition` parameter (default: `false`) that enables a real-time position display for developers. When enabled, the player's X, Y, and Z coordinates are displayed at the bottom center of the screen, updating every second.

**Use Case**: This feature is intended for developers who want to move around maps to find and document spawn positions, as Battlefield Portal does not provide a built-in way to display coordinates in-game.

**Coordinate Format**: Coordinates are scaled by 100 and truncated (using integer truncation) to avoid Portal's decimal display issues. For example:

- A position of `-100.24` will be displayed as `-10024`
- A position of `50.67` will be displayed as `5067`

To convert back to the actual world coordinates, divide the displayed value by 100.

**Example Usage**:

```ts
export async function OnPlayerJoinGame(eventPlayer: mod.Player): Promise<void> {
    // Enable debug position display for development/testing for the first joining player (usually the admin).
    const soldier = new FFASpawnPoints.Soldier(eventPlayer, mod.GetObjId(eventPlayer) === 0);

    soldier.startDelayForPrompt();
}
```

</ai>

---

## API Reference

### `namespace FFASpawnPoints`

The `FFASpawnPoints` namespace contains the `Soldier` class, namespace-level functions for initialization and queue processing, and related types.

#### `FFASpawnPoints.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `FFASpawnPoints.setLogging()` to configure the minimum log level for spawn system logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose, includes detailed spawn point selection information.
- `Info` (1) – Informational messages. Includes initialization and queue processing updates.
- `Warning` (2) – Warning messages. Includes non-ideal spawn selections and invalid player warnings. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### `FFASpawnPoints.setLogging(log?: (text: string) => Promise<void> | void, logLevel?: LogLevel, includeError?: boolean): void`

Configures logging for the FFASpawnPoints module. The spawn system logs various events including spawn point selection, queue processing, and warnings. This allows you to monitor and debug spawn behavior.

**Parameters:**

- `log` – The logger function to use. Pass `undefined` to disable logging. Can be synchronous or asynchronous.
- `logLevel` – The minimum log level to use. Messages below this level will not be logged. Defaults to `LogLevel.Warning`.
- `includeError` – Whether to include the runtime error details in the log message. Defaults to `false`. The runtime error can be very large and may cause issues with UI loggers.

**Example:**

```ts
import { FFASpawnPoints } from 'bf6-portal-utils/ffa-spawn-points';

// Configure logging with console.log, minimum level of Info, and include error details
FFASpawnPoints.setLogging(
    (text) => console.log(text),
    FFASpawnPoints.LogLevel.Info,
    true // includeError
);
```

**Note:** Logging is fail-safe and will not affect spawn system functionality if the logger fails. For more information on the logging functionality, see the [`Logging` module documentation](../logging/README.md).

#### Namespace Functions

| Function | Description |
| --- | --- |
| `initialize(spawns: FFASpawnPoints.SpawnData[], options?: FFASpawnPoints.InitializeOptions): void` | Should be called in a handler subscribed to `Events.OnGameModeStarted`. Disables both team HQs and sets up the spawn point system. Optional `options` let you override defaults for spawn distances, delays, and candidate limits. Idempotent: logs a warning and returns if already initialized. |
| `enableSpawnQueueProcessing(): void` | Enables processing of the spawn queue. Call when you want spawning to begin (typically in a handler subscribed to `Events.OnGameModeStarted`). Starts processing immediately if the queue is not already being processed. |
| `disableSpawnQueueProcessing(): void` | Disables processing of the spawn queue. Useful for pausing spawning during intermissions or round transitions. |

### `class FFASpawnPoints.Soldier`

#### Static Methods

| Method | Description |
| --- | --- |
| `startDelayForPrompt(player: mod.Player): void` | Starts the countdown before prompting the player to spawn or delay again. Usually called in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy`. AI soldiers will skip the countdown and spawn immediately. |
| `forceIntoQueue(player: mod.Player): void` | Forces a player to be added to the spawn queue, skipping the countdown and prompt. Useful for programmatic spawning. |

#### Constructor

| Signature | Description |
| --- | --- |
| `constructor(player: mod.Player, showDebugPosition?: boolean)` | Every player that should be handled by this spawning system should be instantiated as a `FFASpawnPoints.Soldier`, usually in a handler subscribed to `Events.OnPlayerJoinGame`. Creates the UI elements for human players (AI soldiers skip UI creation). When `showDebugPosition` is `true`, displays the player's X, Y, and Z coordinates (scaled by 100 and truncated) at the bottom center of the screen, updating every second. |

#### Instance Properties

| Property   | Type         | Description                                                        |
| ---------- | ------------ | ------------------------------------------------------------------ |
| `player`   | `mod.Player` | The player associated with this `FFASpawnPoints.Soldier` instance. |
| `playerId` | `number`     | The unique ID of the player associated with this instance.         |

#### Instance Methods

| Method | Description |
| --- | --- |
| `startDelayForPrompt(delay?: number): void` | Starts the countdown before prompting the player to spawn or delay again. Usually called in handlers subscribed to `Events.OnPlayerJoinGame` and `Events.OnPlayerUndeploy`. AI soldiers skip the countdown and are added to the queue immediately. Optional `delay` defaults to the initial prompt delay. |
| `deleteIfNotValid(): boolean` | Deletes the Soldier instance if the player is no longer valid (e.g. left the game). Returns `true` if the instance was deleted. Cleans up UI, timers, and removes the soldier from the internal registry. |

---

## Configuration & Defaults

The following values control spawning behavior. Most can be overridden via the optional `options` argument on `FFASpawnPoints.initialize()`.

| Setting | Type | Default | How to change | Description |
| --- | --- | --- | --- | --- |
| `minimumSafeDistance` | `number` | `20` | `initialize` `options.minimumSafeDistance` | Minimum distance (m) for a spawn to be considered safe. |
| `maximumInterestingDistance` | `number` | `40` | `initialize` `options.maximumInterestingDistance` | Maximum distance (m) for a spawn to still be considered interesting (not too far). |
| `safeOverInterestingFallbackFactor` | `number` | `1.5` | `initialize` `options.safeOverInterestingFallbackFactor` | Scales the midpoint between safe/interesting distances when picking a fallback spawn. Higher favors safer picks. |
| `maxSpawnCandidates` | `number` | `12` | `initialize` `options.maxSpawnCandidates` | Max random spawn points inspected per queue pop. Higher improves quality but costs more checks. |
| `initialPromptDelay` | `number` | `10` | `initialize` `options.initialPromptDelay` | Time (in seconds) until the player is first asked to spawn or delay the prompt again. |
| `promptDelay` | `number` | `10` | `initialize` `options.promptDelay` | Time (in seconds) until the player is asked to spawn or delay the prompt again (after clicking delay). |
| `queueProcessingDelay` | `number` | `1` | `initialize` `options.queueProcessingDelay` | Delay (in seconds) between processing spawn queue batches. |

---

## Types & Interfaces

All types are defined inside the `FFASpawnPoints` namespace in [`index.ts`](index.ts).

### `FFASpawnPoints.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. See the [`Logging` module documentation](../logging/README.md) for details.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Least verbose.

### `FFASpawnPoints.SpawnData`

Type for defining spawn point data when initializing the system:

```ts
// <x, y, z> world position where the player should spawn.
// Orientation is the compass angle (0-360) for spawn direction.
type SpawnData = [x: number, y: number, z: number, orientation: number];
```

### `FFASpawnPoints.Spawn`

Internal type representing a processed spawn point:

```ts
type Spawn = {
    index: number; // Index in the spawns array
    spawnPoint: mod.SpawnPoint; // Battlefield Portal spawn point object
    location: mod.Vector; // World position
};
```

### `FFASpawnPoints.InitializeOptions`

Optional overrides for spawn selection thresholds, delays, and candidate limits when calling `initialize()`:

```ts
type InitializeOptions = {
    maxSpawnCandidates?: number; // Default 12
    minimumSafeDistance?: number; // Default 20
    maximumInterestingDistance?: number; // Default 40
    safeOverInterestingFallbackFactor?: number; // Default 1.5
    initialPromptDelay?: number; // Default 10 (seconds)
    promptDelay?: number; // Default 10 (seconds)
    queueProcessingDelay?: number; // Default 1 (seconds)
};
```

---

## Event Wiring & Lifecycle

<ai>

### Required event subscription (via Events only)

You must **not** implement or export any Battlefield Portal event handler functions. Subscribe to game events only through the `Events` module:

1. **`Events.OnGameModeStarted`** – In your subscriber, call `FFASpawnPoints.initialize()` with your spawn points and `FFASpawnPoints.enableSpawnQueueProcessing()` to start the system.
2. **`Events.OnPlayerJoinGame`** – In your subscriber, create a new `FFASpawnPoints.Soldier` instance for each player and call `soldier.startDelayForPrompt()` to begin the spawn flow.
3. **`Events.OnPlayerUndeploy`** – In your subscriber, call `FFASpawnPoints.Soldier.startDelayForPrompt(player)` to restart the spawn flow when players die or undeploy.

</ai>

### Lifecycle Flow

1. Player joins or undeploys → `startDelayForPrompt()` is called
2. Countdown timer displays for `initialPromptDelay` seconds (default: 10) on first prompt, or `promptDelay` seconds (default: 10) on subsequent delays
3. UI prompt appears with "Spawn" and "Delay" buttons
4. Player clicks "Spawn" → Player is added to spawn queue
5. Player clicks "Delay" → Countdown restarts with `promptDelay` duration
6. Spawn queue processor finds best spawn point and spawns the player
7. Process repeats when player dies or undeploys

---

## Strings File

This module includes a `strings.json` file that will be automatically merged by `bf6-portal-bundler` when you bundle your mod.

---

<ai>

## Known Limitations & Caveats

- **Events module required** – Since `FFASpawnPoints` relies on `Events` and `UI`, you **must** use the [Events module](../events/README.md) for all game event subscription and **must not** implement or export any Battlefield Portal event handler functions in your code. If you export your own `OnPlayerJoinGame`, `OnGameModeStarted`, etc., they will conflict and cause undefined behavior. See [Events — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).
- **Rare Spawn Overlaps** – In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within `maxSpawnCandidates` iterations. Consider adjusting `maxSpawnCandidates` via the `FFASpawnPoints.initialize()` options or adding more spawn points to mitigate this.
- **UI Input Mode** – The system delegates automatic `mod.EnableUIInputMode()` management to the `UI` module. Be careful not to conflict with other UI systems that do not use the `UI` module that also control input mode.
- **HQ Disabling** – The system automatically disables both team HQs during initialization. If you need team-based spawning elsewhere, you'll need to re-enable HQs manually (but you really should not be mixing this with other systems unless you know what you are doing).
- **Spawn Point Cleanup** – Spawn points created during initialization are not automatically cleaned up. This is typically fine as they persist for the duration of the match.

</ai>

---

## Further Reference

- [Events module](../events/README.md) – Used to automatically subscribe to game events and wire the system to them.
- [FFADropIns module](../ffa-drop-ins/README.md) – Similar FFA spawning with a curated area of drop-in spawn points for skydive/parachute spawns.
- [UI module](../ui/README.md) – Documentation for the UI helper module required by this system.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional spawn algorithms, configurable UI positioning, team-based spawning support, etc.), so please share your experiences.

---
