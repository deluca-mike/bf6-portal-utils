# FFA Drop-Ins Module

<ai>

The TypeScript `FFADropIns` class enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt with developer-curated drop-in spawn points. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system accepts an arbitrary region of individual rectangles and an altitude. It uses a high-performance **Structure of Arrays (SoA)** memory layout with typed arrays (`Float32Array`) to precompute area weights and generate pre-created drop-in spawn points upfront with zero per-frame heap churn.

> **Note** The `FFADropIns` class depends on the `UI` and `Events` namespaces (both in this repository) and the `mod` namespace (available in the `bf6-portal-mod-types` package). Internally it uses `Timers`, `Clocks`, and `Vectors` from this repository. **You must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. `FFADropIns` subscribes to `Events.OnPlayerLeaveGame` to clear per-player state and avoid resource leaks when a player leaves; the `UI` module uses `Events` to register button handlers. Because only one implementation of each Portal event can exist per project (the `Events` module owns those hooks), your mod must subscribe via `Events` only. See the [Events module — Known Limitations & Caveats](../events/README.md#known-limitations--caveats).

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
4. Instantiate `new FFADropIns()` in a handler subscribed to `Events.OnGameModeStarted` with your spawn region (rectangles + altitude) and optional `Options`.
5. Call `spawner.enableSpawnQueueProcessing()` when ready (typically in the same handler subscribed to `Events.OnGameModeStarted`).
6. Call `spawner.addPlayer(player)` and `spawner.startDelayForPrompt(player)` in a handler subscribed to `Events.OnPlayerJoinGame`.
7. Call `spawner.startDelayForPrompt(player)` in a handler subscribed to `Events.OnPlayerUndeploy`.
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

let spawner: FFADropIns;

Events.OnGameModeStarted.subscribe(() => {
    // Instantiate the drop-in spawning system
    spawner = new FFADropIns(DROP_IN_REGION, {
        dropInPoints: 64, // Optional (default 64) – number of spawn points to pre-create
        initialPromptDelay: 10, // Optional (default 10 seconds)
        promptDelay: 10, // Optional (default 10 seconds)
        queueProcessingDelay: 2, // Optional (default 2 seconds)
    });

    // Enable spawn queue processing
    spawner.enableSpawnQueueProcessing();

    // Optional: Configure logging
    FFADropIns.setLogging((text) => console.log(text), FFADropIns.LogLevel.Info);
});

Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    // Add player to drop-in spawning system and start delay countdown
    spawner.addPlayer(eventPlayer, false);
    spawner.startDelayForPrompt(eventPlayer);
});

Events.OnPlayerUndeploy.subscribe((eventPlayer: mod.Player) => {
    // Start delay countdown when a player undeploys
    spawner.startDelayForPrompt(eventPlayer);
});
```

</ai>

Then build your mod using the bundler (see [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler)).

---

## Core Concepts

- **Structure of Arrays (SoA) Storage** – Drop-in rectangles and precomputed spawn points are stored in flat typed arrays (`Float32Array`), minimizing memory footprint and eliminating garbage collection pressure.
- **Events module required** – You must subscribe to game events only via the `Events` module and must not export any Battlefield Portal event handler functions. `FFADropIns` subscribes to `Events.OnPlayerLeaveGame` to clear per-player state when a player leaves (avoiding resource leaks); the `UI` module uses `Events` for button handling.
- **Drop-in spawning** – Players spawn in the air at a fixed altitude (`y`) at random (x, z) positions within your rectangular zones, so they can skydive and/or parachute down. No safe-distance or player-proximity logic is applied; spawns are uniformly distributed across the region by area.
- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously, with a configurable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again. This gives them time to adjust loadouts at the deploy screen.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue. They will open their parachute on their own before hitting the ground.
- **HQ Disabling** – The system automatically disables both team HQs upon instantiation to prevent default team-based spawning.
- **Configurable Logging** – The system uses the `Logging` module for internal logging. Use `FFADropIns.setLogging()` to configure a logger function and log verbosity.

---

## Drop-In Spawn Region Algorithm

The system uses a **region of rectangles** plus a fixed altitude:

1. **SpawnData** – You provide `spawnRectangles` (array of `{ minX, minZ, maxX, maxZ }`) and a single `y` (altitude). All drop-in spawns use this same `y`; only x and z vary.
2. **Area-weighted selection** – When pre-creating spawn points during construction, the system selects which rectangle to use with probability proportional to its area via binary search over cumulative areas. Within each rectangle, (x, z) is chosen uniformly at random.
3. **Pre-created points** – At initialization, `dropInPoints` (default 64) spawn points are created and stored in flat `Float32Array` buffers.
4. **Queue processing** – When a player is spawned from the queue, the system picks one of the pre-created points at random. No distance-to-players or safety check is performed; drop-ins are purely random within the region.

### Choosing rectangles and altitude

- Use one or more rectangles to cover the playable area (or only parts of it). Overlapping rectangles are allowed; area is computed per rectangle and rectangles are weighted by area. **Overlapping rectangles effectively create hotspots**: the overlapping region is covered by more than one rectangle, so that area contributes more to the total area and receives more spawn points statistically. You can use this to bias drop-ins toward certain zones (e.g. objectives or high-action areas).
- Set `y` high enough that players have time to skydive and pick a safe landing spot before deploying their parachute and landing safely. Map and mode will vary.
- Increase `dropInPoints` (e.g. 128) for more variety and slightly lower chance of two players landing on the same spot; lower it for fewer spawner objects. Default is 64.
- For maps where you want to prevent roof access, set the `y` below the level of the lowest roof you do not want players to access, or ensure that the rectangles and `y` are set such that players cannot reach certain roofs.

---

<ai>

## Debugging & Development Tools

### Debug Position Display

The `spawner.addPlayer()` method accepts an optional `showDebugPosition` parameter (default: `false`) that enables a real-time position display for developers. When enabled, the player's X, Y, and Z coordinates are displayed at the bottom center of the screen, updating every second.

**Use Case**: Useful for finding and documenting drop-in regions and altitude (e.g. flying around to set rectangle bounds and `y`).

**Coordinate Format**: Coordinates are scaled by 100 and truncated (using integer truncation) to avoid Portal's decimal display issues. Divide the displayed value by 100 to get actual world coordinates.

**Example Usage**:

```ts
Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    spawner.addPlayer(eventPlayer, mod.GetObjId(eventPlayer) === 0);
    spawner.startDelayForPrompt(eventPlayer);
});
```

</ai>

---

## Configuration & Defaults

The following values control drop-in spawning behavior via constructor `options`:

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `dropInPoints` | `number` | `64` | Number of spawn points to pre-create at random (x, z) within the rectangles at the given altitude. |
| `initialPromptDelay` | `number` | `10` | Time (in seconds) until the player is first asked to spawn or delay the prompt again. |
| `promptDelay` | `number` | `10` | Time (in seconds) until the player is asked to spawn or delay the prompt again (after clicking delay). |
| `queueProcessingDelay` | `number` | `2` | Delay (in seconds) between processing spawn queue batches. |

---

## API Reference

### `class FFADropIns`

#### Constructor

```ts
new FFADropIns(spawnData: FFADropIns.SpawnData, options?: FFADropIns.Options)
```

#### Instance Properties & Methods

| Property / Method | Description |
| --- | --- |
| `spawnCount: number` | Total number of drop-in spawn points configured in this instance. |
| `addPlayer(player: mod.Player, showDebugPosition?: boolean): void` | Registers a player into the drop-in spawning system and creates their prompt/countdown UI. |
| `removePlayer(playerOrId: mod.Player \| number): boolean` | Unregisters a player and cleans up their UI elements, clocks, and intervals. |
| `startDelayForPrompt(playerOrId: mod.Player \| number, delay?: number): void` | Starts the spawn prompt countdown. |
| `forceIntoQueue(playerOrId: mod.Player \| number): void` | Forces a player into the spawn queue immediately. |
| `getRandomSpawnIndex(): number \| null` | Selects a random drop-in spawn index, or null if no spawns exist. |
| `getBestSpawnIndex(): number \| null` | Alias for `getRandomSpawnIndex()` for polymorphic interface compatibility with `FFASpawnPoints`. |
| `enableSpawnQueueProcessing(): void` | Starts automatic processing of the spawn queue. |
| `disableSpawnQueueProcessing(): void` | Pauses automatic processing of the spawn queue. |
| `clearSpawnQueue(): void` | Clears all players currently waiting in the spawn queue. |
| `destroy(): void` | Cleans up all player UI, timers, clocks, and unbinds leave event handlers. |

#### Static Methods

| Method | Description |
| --- | --- |
| `FFADropIns.setLogging(log?, logLevel?, includeRawError?): void` | Configures logging verbosity for the FFADropIns module. |

---

## Types & Interfaces

All types are defined inside the `FFADropIns` namespace in [`index.ts`](index.ts).

### `FFADropIns.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. See the [Logging module documentation](../logging/README.md) for details.

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

Type for the drop-in region configuration passed to the constructor:

```ts
type SpawnData = {
    spawnRectangles: SpawnRectangle[];
    y: number;
};
```

### `FFADropIns.Options`

Optional configuration overrides for spawn point count and delays:

```ts
type Options = {
    dropInPoints?: number;
    initialPromptDelay?: number;
    promptDelay?: number;
    queueProcessingDelay?: number;
};
```

---

## Further Reference

- [FFA Spawn Points module](../ffa-spawn-points/README.md) – Distance/fitness-based FFA spawning for ground-based spawns.
- [Events module](../events/README.md) – Used to subscribe to game events.
- [UI module](../ui/README.md) – Documentation for the UI prompt components.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
