# FFA Spawning Module

This TypeScript `FFASpawning.Soldier` class enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system uses an intelligent algorithm to find safe spawn points that are appropriately distanced from other players, reducing the chance of spawning directly into combat while maintaining reasonable spawn times.

> **Note**
> The `FFASpawning` namespace depends on the `UI` namespace (which is also maintained in this repository) and the `mod` namespace (available in the `bf6-portal-mod-types` package).

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining and strings.json merging.
3. **Button handler** – Register `UI.handleButtonClick` in your `OnPlayerUIButtonEvent` event handler.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the modules you need in your code:
    ```ts
    import { FFASpawning } from 'bf6-portal-utils/ffa-spawning';
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Register the button handler in your `OnPlayerUIButtonEvent` event.
4. Call `FFASpawning.Soldier.initialize()` in `OnGameModeStarted()` with your spawn point data (optional `InitializeOptions` to override spawn distance defaults).
5. Enable spawn queue processing when ready (typically in `OnGameModeStarted()`).
6. Create `FFASpawning.Soldier` instances for each player in `OnPlayerJoinGame()`.
7. Call `FFASpawning.Soldier.startDelayForPrompt()` in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` to start the spawn prompt flow.
8. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code and merge all `strings.json` files).

### Example

```ts
import { FFASpawning } from 'bf6-portal-utils/ffa-spawning';
import { UI } from 'bf6-portal-utils/ui';

// Define your spawn points
const SPAWN_POINTS: FFASpawning.SpawnData[] = [
    { location: mod.CreateVector(100, 0, 200), orientation: 0 },
    { location: mod.CreateVector(-100, 0, 200), orientation: 90 },
    { location: mod.CreateVector(0, 0, -200), orientation: 180 },
    // ... more spawn points
];

export async function OnGameModeStarted(): Promise<void> {
    // Initialize the spawning system
    FFASpawning.Soldier.initialize(SPAWN_POINTS, {
        minimumSafeDistance: 20, // Optional override (default 20)
        maximumInterestingDistance: 40, // Optional override (default 40)
        safeOverInterestingFallbackFactor: 1.5, // Optional override (default 1.5)
    });

    // Enable spawn queue processing
    FFASpawning.Soldier.enableSpawnQueueProcessing();

    // Optional: Set up logging
    FFASpawning.Soldier.setLogging((text) => console.log(text), FFASpawning.LogLevel.Info);
}

export async function OnPlayerJoinGame(eventPlayer: mod.Player): Promise<void> {
    // Create a FFASpawning.Soldier instance for each player
    const soldier = new FFASpawning.Soldier(eventPlayer);

    // Start the delay countdown for the player.
    soldier.startDelayForPrompt();
}

export async function OnPlayerUndeploy(eventPlayer: mod.Player): Promise<void> {
    // Start the delay countdown when a player undeploys (is ready to deploy again).
    FFASpawning.Soldier.startDelayForPrompt(eventPlayer);
}

export async function OnPlayerUIButtonEvent(
    player: mod.Player,
    widget: mod.UIWidget,
    event: mod.UIButtonEvent
): Promise<void> {
    // Required: Handle button clicks for the spawn UI
    await UI.handleButtonClick(player, widget, event);
}
```

Then build your mod using the bundler (see [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler)).

---

## Core Concepts

- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously, with a definable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again. This gives them time to adjust loadouts.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue.
- **Smart Spawning** – The system uses a prime walking algorithm to find spawn points that are safely distanced from other players.
- **HQ Disabling** – The system automatically disables both team HQs during initialization to prevent default team-based spawning.

---

## Spawn Point Selection Algorithm

The `_getBestSpawnPoint()` method uses a **Prime Walking Algorithm** to efficiently search for suitable spawn locations:

1. **Random Start** – Selects a random starting index in the spawn points array.
2. **Prime Step Size** – Uses a randomly selected prime number (from `PRIME_STEPS`) as the step size to walk through the array. This ensures good distribution and avoids clustering.
3. **Distance Checking** – For each candidate spawn point, calculates the distance to the closest player.
4. **Ideal Range** – A spawn point is considered ideal if the distance to the closest player is between `minimumSafeDistance` and `maximumInterestingDistance`.
5. **Fallback Selection** – If no ideal spawn point is found within `MAX_SPAWN_CHECKS` iterations, two fallbacks are tracked: the most interesting "safe" spawn (>= safe distance, closest to players) and the safest "interesting" spawn (<= interesting distance, farthest from players). A scaled midpoint (`safeOverInterestingFallbackFactor` × average of the safe/interesting thresholds) decides which fallback to use, biasing toward safer options as the factor grows.

### Performance vs. Quality Tradeoff

The `_MAX_SPAWN_CHECKS` constant (default: 12) represents a tradeoff between:

- **Performance** – Lower values reduce computation time but may miss suitable spawn points.
- **Spawn Quality** – Higher values increase the chance of finding an ideal spawn point but require more distance calculations.

In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within the check limit. Consider adjusting `_MAX_SPAWN_CHECKS` based on your map size, player count, and spawn point density, and make sure there are more spawn points than max players.

---

## API Reference

### `namespace FFASpawning`

The `FFASpawning` namespace contains the `Soldier` class and related types.

### `class FFASpawning.Soldier`

#### Static Methods

| Method                                                                                 | Description                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize(spawns: FFASpawning.SpawnData[], options?: FFASpawning.InitializeOptions)` | Should be called in the `OnGameModeStarted()` event. Disables both team HQs and sets up the spawn point system. `orientation` in `SpawnData` is the compass angle integer (0-360). Optional `options` let you override spawn distance defaults. |
| `setLogging(log: (text: string) => void, logLevel?: FFASpawning.LogLevel)`             | Attaches a logger function and defines a minimum log level. Useful for debugging spawn behavior. Default log level is `Info` if not specified.                                                                                                  |
| `startDelayForPrompt(player: mod.Player)`                                              | Starts the countdown before prompting the player to spawn or delay again. Usually called in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events. AI soldiers will skip the countdown and spawn immediately.                                    |
| `forceIntoQueue(player: mod.Player)`                                                   | Forces a player to be added to the spawn queue, skipping the countdown and prompt. Useful for programmatic spawning.                                                                                                                            |
| `enableSpawnQueueProcessing()`                                                         | Enables the processing of the spawn queue. Should be called when you want spawning to begin (typically in `OnGameModeStarted()` or `OnRoundStart()`).                                                                                           |
| `disableSpawnQueueProcessing()`                                                        | Disables the processing of the spawn queue. Useful for pausing spawning during intermissions or round transitions.                                                                                                                              |
| `getVectorString(vector: mod.Vector): string`                                          | Utility method that formats a vector as a string for logging purposes. Returns a string in the format `<x, y, z>` with 2 decimal places.                                                                                                        |

#### Constructor

| Signature                         | Description                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(player: mod.Player)` | Every player that should be handled by this spawning system should be instantiated as a `FFASpawning.Soldier`, usually in the `OnPlayerJoinGame()` event. Creates the UI elements for human players (AI soldiers skip UI creation). |

#### Instance Properties

| Property   | Type         | Description                                                     |
| ---------- | ------------ | --------------------------------------------------------------- |
| `player`   | `mod.Player` | The player associated with this `FFASpawning.Soldier` instance. |
| `playerId` | `number`     | The unique ID of the player associated with this instance.      |

#### Instance Methods

| Method                  | Description                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `startDelayForPrompt()` | Starts the countdown before prompting the player to spawn or delay again. Usually called in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events. AI soldiers will skip the countdown and spawn immediately. |

---

## Configuration & Defaults

The following values control spawning behavior. Most can be overridden via the optional `options` argument on `initialize()`.

| Setting                             | Type     | Default | How to change                                            | Description                                                                                                      |
| ----------------------------------- | -------- | ------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `_PROMPT_DELAY`                     | `number` | `10`    | Edit constant                                            | Time (in seconds) until the player is asked to spawn or delay the prompt again.                                  |
| `minimumSafeDistance`               | `number` | `20`    | `initialize` `options.minimumSafeDistance`               | Minimum distance (m) for a spawn to be considered safe.                                                          |
| `maximumInterestingDistance`        | `number` | `40`    | `initialize` `options.maximumInterestingDistance`        | Maximum distance (m) for a spawn to still be considered interesting (not too far).                               |
| `safeOverInterestingFallbackFactor` | `number` | `1.5`   | `initialize` `options.safeOverInterestingFallbackFactor` | Scales the midpoint between safe/interesting distances when picking a fallback spawn. Higher favors safer picks. |
| `_MAX_SPAWN_CHECKS`                 | `number` | `12`    | Edit constant                                            | Max random spawn points inspected per queue pop. Higher improves quality but costs more checks.                  |
| `_QUEUE_PROCESSING_DELAY`           | `number` | `1`     | Edit constant                                            | Delay (seconds) between processing spawn queue batches.                                                          |

---

## Types & Interfaces

All types are defined inside the `FFASpawning` namespace in [`index.ts`](index.ts).

### `FFASpawning.LogLevel`

Enumeration of log levels for filtering debug output:

```ts
enum LogLevel {
    Debug = 0, // Most verbose
    Info = 1, // Default level
    Error = 2, // Only errors
}
```

### `FFASpawning.SpawnData`

Type for defining spawn point data when initializing the system:

```ts
type SpawnData = {
    location: mod.Vector; // World position where the player should spawn
    orientation: number; // Compass angle (0-360) for spawn direction
};
```

### `FFASpawning.Spawn`

Internal type representing a processed spawn point:

```ts
type Spawn = {
    index: number; // Index in the spawns array
    spawnPoint: mod.SpawnPoint; // Battlefield Portal spawn point object
    location: mod.Vector; // World position
};
```

### `FFASpawning.InitializeOptions`

Optional overrides for spawn selection thresholds when calling `initialize()`:

```ts
type InitializeOptions = {
    minimumSafeDistance?: number; // Default 20
    maximumInterestingDistance?: number; // Default 40
    safeOverInterestingFallbackFactor?: number; // Default 1.5
};
```

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OnGameModeStarted()`** – Call `FFASpawning.Soldier.initialize()` with your spawn points and `FFASpawning.Soldier.enableSpawnQueueProcessing()` to start the system.
2. **`OnPlayerJoinGame()`** – Create a new `FFASpawning.Soldier` instance for each player.
3. **`OnPlayerJoinGame()`** – Call `FFASpawning.Soldier.startDelayForPrompt()` to begin the spawn flow for new players.
4. **`OnPlayerUndeploy()`** – Call `FFASpawning.Soldier.startDelayForPrompt()` to restart the spawn flow when players die or undeploy.
5. **`OnPlayerUIButtonEvent()`** – Register `UI.handleButtonClick()` to handle button presses from the spawn UI.

### Lifecycle Flow

1. Player joins or undeploys → `startDelayForPrompt()` is called
2. Countdown timer displays for `_PROMPT_DELAY` seconds (default: 10)
3. UI prompt appears with "Spawn" and "Delay" buttons
4. Player clicks "Spawn" → Player is added to spawn queue
5. Player clicks "Delay" → Countdown restarts
6. Spawn queue processor finds best spawn point and spawns the player
7. Process repeats when player dies or undeploys

---

## Strings File

This module includes a `strings.json` file that will be automatically merged by `bf6-portal-bundler` when you bundle your mod. The strings are automatically available under the `ffaSpawning` key:

```json
{
    "ffaSpawning": {
        "buttons": {
            "spawn": "Spawn now",
            "delay": "Ask again in {} seconds"
        },
        "countdown": "Spawning available in {} seconds..."
    }
}
```

---

## Known Limitations & Caveats

- **Rare Spawn Overlaps** – In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within `_MAX_SPAWN_CHECKS` iterations. Consider adjusting `_MAX_SPAWN_CHECKS` or adding more spawn points to mitigate this.
- **UI Input Mode** – The system manages `mod.EnableUIInputMode()` automatically. Be careful not to conflict with other UI systems that also control input mode.
- **HQ Disabling** – The system automatically disables both team HQs during initialization. If you need team-based spawning elsewhere, you'll need to re-enable HQs manually (but you really should not be mixing this with other systems unless you know what you are doing).
- **Spawn Point Cleanup** – Spawn points created during initialization are not automatically cleaned up. This is typically fine as they persist for the duration of the match.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- [`ui/README.md`](../ui/README.md) – Documentation for the UI helper module required by this system.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional spawn algorithms, configurable UI positioning, team-based spawning support, etc.), so please share your experiences.

---
