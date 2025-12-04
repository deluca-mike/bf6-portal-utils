# FFA Spawning Module

This TypeScript `FFASpawningSoldier` class enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system uses an intelligent algorithm to find safe spawn points that are appropriately distanced from other players, reducing the chance of spawning directly into combat while maintaining reasonable spawn times.

> **Note**  
> The `FFASpawningSoldier` depends on the shared `UI` helper (containers, text widgets, buttons, etc.) which is also maintained in this repository. Keep that namespace/class above the FFA spawning module in your mod file. All Battlefield Portal types referenced below (`mod.Player`, `mod.Vector`, `mod.SpawnPoint`, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **UI helpers** – Copy the `UI` namespace/class into your mod before the FFA spawning module (see `ui/ui.ts` for the canonical version).
2. **Strings file** – Import `ffa-spawning.strings.json` into your Battlefield Portal experience so the `mod.stringkeys.ffaAutoSpawningSoldier` lookup is available at runtime.
3. **Button handler** – Register `UI.handleButtonClick` in your `OnPlayerUIButtonEvent` event handler.

---

## Quick Start

1. Copy the entire `FFASpawningSoldier` class and namespace from [`ffa-spawning/ffa-spawning.ts`](ffa-spawning.ts) and paste it into your mod after the required `UI` helper.
2. Add the required string keys to your Battlefield Portal experience's `strings.json` file (see Prerequisites above).
3. Register the button handler in your `OnPlayerUIButtonEvent` event.
4. Call `FFASpawningSoldier.initialize()` in `OnGameModeStarted()` with your spawn point data.
5. Enable spawn queue processing when ready (typically in `OnGameModeStarted()`).
6. Create `FFASpawningSoldier` instances for each player in `OnPlayerJoinGame()`.
7. Call `FFASpawningSoldier.startDelayForPrompt()` in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` to start the spawn prompt flow.

### Example

```ts
// Define your spawn points
const SPAWN_POINTS: FFASpawningSoldier.SpawnData[] = [
    { location: mod.CreateVector(100, 0, 200), orientation: 0 },
    { location: mod.CreateVector(-100, 0, 200), orientation: 90 },
    { location: mod.CreateVector(0, 0, -200), orientation: 180 },
    // ... more spawn points
];

export async function OnGameModeStarted(): Promise<void> {
    // Initialize the spawning system
    FFASpawningSoldier.initialize(SPAWN_POINTS);

    // Enable spawn queue processing
    FFASpawningSoldier.enableSpawnQueueProcessing();

    // Optional: Set up logging
    FFASpawningSoldier.setLogging((text) => console.log(text), FFASpawningSoldier.LogLevel.Info);
}

export async function OnPlayerJoinGame(eventPlayer: mod.Player): Promise<void> {
    // Create a FFASpawningSoldier instance for each player
    const soldier = new FFASpawningSoldier(eventPlayer);

    // Start the delay countdown for the player.
    soldier.startDelayForPrompt();
}

export async function OnPlayerUndeploy(eventPlayer: mod.Player): Promise<void> {
    // Start the delay countdown when a player undeploys (is ready to deploy again).
    FFASpawningSoldier.startDelayForPrompt(eventPlayer);
}

export async function OnPlayerUIButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): Promise<void> {
    // Required: Handle button clicks for the spawn UI
    await UI.handleButtonClick(player, widget, event);
}
```

---

## Core Concepts

- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously, with a definable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again. This gives them time to adjust loadouts.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue.
- **Smart Spawning** – The system uses a prime walking algorithm to find spawn points that are safely distanced from other players.
- **HQ Disabling** – The system automatically disables both team HQs during initialization to prevent default team-based spawning.

---

## Spawn Point Selection Algorithm

The `getBestSpawnPoint()` method uses a **Prime Walking Algorithm** to efficiently search for suitable spawn locations:

1. **Random Start** – Selects a random starting index in the spawn points array.
2. **Prime Step Size** – Uses a randomly selected prime number (from `PRIME_STEPS`) as the step size to walk through the array. This ensures good distribution and avoids clustering.
3. **Distance Checking** – For each candidate spawn point, calculates the distance to the closest player.
4. **Ideal Range** – A spawn point is considered ideal if the distance to the closest player is between `SAFE_MINIMUM_DISTANCE` (20m) and `ACCEPTABLE_MAXIMUM_DISTANCE` (40m).
5. **Fallback Selection** – If no ideal spawn point is found within `MAX_SPAWN_CHECKS` iterations, returns the spawn point with the maximum distance to the closest player.

### Performance vs. Quality Tradeoff

The `MAX_SPAWN_CHECKS` constant (default: 10) represents a tradeoff between:
- **Performance** – Lower values reduce computation time but may miss suitable spawn points.
- **Spawn Quality** – Higher values increase the chance of finding an ideal spawn point but require more distance calculations.

In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within the check limit. Consider adjusting `MAX_SPAWN_CHECKS` based on your map size, player count, and spawn point density, and make sure there are more spawn points than max players.

---

## API Reference

### `class FFASpawningSoldier`

#### Static Methods

| Method | Description |
| --- | --- |
| `initialize(spawns: FFASpawningSoldier.SpawnData[])` | Should be called in the `OnGameModeStarted()` event. Disables both team HQs and sets up the spawn point system. `orientation` in `SpawnData` is the compass angle integer (0-360). |
| `setLogging(log: (text: string) => void, logLevel?: FFASpawningSoldier.LogLevel)` | Attaches a logger function and defines a minimum log level. Useful for debugging spawn behavior. Default log level is `Info` if not specified. |
| `startDelayForPrompt(player: mod.Player)` | Starts the countdown before prompting the player to spawn or delay again. Usually called in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events. AI soldiers will skip the countdown and spawn immediately. |
| `forceIntoQueue(player: mod.Player)` | Forces a player to be added to the spawn queue, skipping the countdown and prompt. Useful for programmatic spawning. |
| `enableSpawnQueueProcessing()` | Enables the processing of the spawn queue. Should be called when you want spawning to begin (typically in `OnGameModeStarted()` or `OnRoundStart()`). |
| `disableSpawnQueueProcessing()` | Disables the processing of the spawn queue. Useful for pausing spawning during intermissions or round transitions. |
| `getVectorString(vector: mod.Vector): string` | Utility method that formats a vector as a string for logging purposes. Returns a string in the format `<x, y, z>` with 2 decimal places. |

#### Constructor

| Signature | Description |
| --- | --- |
| `constructor(player: mod.Player)` | Every player that should be handled by this spawning system should be instantiated as a `FFASpawningSoldier`, usually in the `OnPlayerJoinGame()` event. Creates the UI elements for human players (AI soldiers skip UI creation). |

#### Instance Properties

| Property | Type | Description |
| --- | --- | --- |
| `player` | `mod.Player` | The player associated with this `FFASpawningSoldier` instance. |

#### Instance Methods

| Method | Description |
| --- | --- |
| `startDelayForPrompt()` | Starts the countdown before prompting the player to spawn or delay again. Usually called in `OnPlayerJoinGame()` and `OnPlayerUndeploy()` events. AI soldiers will skip the countdown and spawn immediately. |

---

## Configuration Constants

The following static constants can be modified in the source code to adjust spawning behavior:

| Constant | Type | Default | Description |
| --- | --- | --- | --- |
| `DELAY` | `number` | `10` | Time (in seconds) until the player is asked to spawn or delay the prompt again. |
| `SAFE_MINIMUM_DISTANCE` | `number` | `20` | The minimum distance (in meters) a spawn point must be from another player to be considered safe. |
| `ACCEPTABLE_MAXIMUM_DISTANCE` | `number` | `40` | The maximum distance (in meters) a spawn point must be from another player to be considered acceptable. Spawn points closer than this are preferred, but points further away may still be used as fallbacks. |
| `MAX_SPAWN_CHECKS` | `number` | `10` | The maximum number of random spawns to consider when trying to find a spawn point for a player. Higher values improve spawn quality but reduce performance. See the [Spawn Point Selection Algorithm](#spawn-point-selection-algorithm) section for details. |
| `QUEUE_PROCESSING_DELAY` | `number` | `1` | The delay (in seconds) between processing spawn queue batches. |

---

## Types & Interfaces

All types are defined inside the `FFASpawningSoldier` namespace in [`ffa-spawning.ts`](ffa-spawning.ts).

### `FFASpawningSoldier.LogLevel`

Enumeration of log levels for filtering debug output:

```ts
enum LogLevel {
    Debug = 0,  // Most verbose
    Info = 1,   // Default level
    Error = 2   // Only errors
}
```

### `FFASpawningSoldier.SpawnData`

Interface for defining spawn point data when initializing the system:

```ts
interface SpawnData {
    location: mod.Vector;  // World position where the player should spawn
    orientation: number;   // Compass angle (0-360) for spawn direction
}
```

### `FFASpawningSoldier.Spawn`

Internal type representing a processed spawn point:

```ts
type Spawn = {
    index: number;              // Index in the spawns array
    spawnPoint: mod.SpawnPoint;  // Battlefield Portal spawn point object
    location: mod.Vector;        // World position
}
```

---

## Event Wiring & Lifecycle

### Required Event Handlers

1. **`OnGameModeStarted()`** – Call `FFASpawningSoldier.initialize()` with your spawn points and `FFASpawningSoldier.enableSpawnQueueProcessing()` to start the system.
2. **`OnPlayerJoinGame()`** – Create a new `FFASpawningSoldier` instance for each player.
3. **`OnPlayerJoinGame()`** – Call `FFASpawningSoldier.startDelayForPrompt()` to begin the spawn flow for new players.
4. **`OnPlayerUndeploy()`** – Call `FFASpawningSoldier.startDelayForPrompt()` to restart the spawn flow when players die or undeploy.
5. **`OnPlayerUIButtonEvent()`** – Register `UI.handleButtonClick()` to handle button presses from the spawn UI.

### Lifecycle Flow

1. Player joins or undeploys → `startDelayForPrompt()` is called
2. Countdown timer displays for `DELAY` seconds
3. UI prompt appears with "Spawn" and "Delay" buttons
4. Player clicks "Spawn" → Player is added to spawn queue
5. Player clicks "Delay" → Countdown restarts
6. Spawn queue processor finds best spawn point and spawns the player
7. Process repeats when player dies or undeploys

---

## Strings File Requirements

The following string keys must be present in your Battlefield Portal experience's `strings.json` file under the `ffaAutoSpawningSoldier` key:

```json
{
  "ffaAutoSpawningSoldier": {
    "buttons": {
      "spawn": "Spawn Now",
      "delay": "Ask Again in {0} Seconds"
    },
    "countdown": "Spawning in {0}..."
  }
}
```

The `delay` and `countdown` strings should accept one numeric parameter (the delay time in seconds).

---

## Known Limitations & Caveats

- **Rare Spawn Overlaps** – In rare cases, especially with many players and few spawn points, players may spawn on top of each other if no safe spawn point is found within `MAX_SPAWN_CHECKS` iterations. Consider adjusting `MAX_SPAWN_CHECKS` or adding more spawn points to mitigate this.
- **UI Input Mode** – The system manages `mod.EnableUIInputMode()` automatically. Be careful not to conflict with other UI systems that also control input mode.
- **HQ Disabling** – The system automatically disables both team HQs during initialization. If you need team-based spawning elsewhere, you'll need to re-enable HQs manually (but you really should not be mixing this with other systems unless you know what you are doing).
- **Spawn Point Cleanup** – Spawn points created during initialization are not automatically cleaned up. This is typically fine as they persist for the duration of the match.

---

## Further Reference

- [`battlefield-portal-utils/mod/index.d.ts`](../mod/index.d.ts) – Official Battlefield Portal type declarations consumed by this module.
- [`battlefield-portal-utils/ui/README.md`](../ui/README.md) – Documentation for the UI helper module required by this system.
- Battlefield Builder docs – For runtime limitations and spawn point behavior.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (additional spawn algorithms, configurable UI positioning, team-based spawning support, etc.), so please share your experiences.

---

