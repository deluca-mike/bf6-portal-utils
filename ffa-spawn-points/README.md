# FFA Spawn Points Module

<ai>

The TypeScript `FFASpawnPoints` class enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt with developer-curated fixed spawn points. The system asks players if they would like to spawn now or be asked again after a delay, allowing players to adjust their loadout and settings at the deploy screen without being locked out.

The spawning system uses a high-performance **Structure of Arrays (SoA)** memory layout with typed arrays (`Float32Array`, `Float64Array`, `Uint16Array`) and an exhaustive, zero-allocation multi-factor fitness scoring algorithm powered by [`PlayerLocations`](../player-locations/README.md). It evaluates enemy proximity, sector crowding, temporal cooldowns, and forward facing alignment in JavaScript memory with **zero C++ engine foreign function interface (FFI) calls**.

> **Note:** Since this module imports and relies on `Events`, **you must use the `Events` module as your only mechanism to subscribe to game events**—do not implement or export any Battlefield Portal event handler functions in your own code. See the [Events module](../events/README.md#known-limitations--caveats).

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
4. Instantiate `new FFASpawnPoints()` in a handler subscribed to `Events.OnGameModeStarted` with your spawn point data (and optional `Options` to override defaults for fitness scoring weights, delays, and selection pool size).
5. Call `spawner.enableSpawnQueueProcessing()` when ready (typically in the same handler subscribed to `Events.OnGameModeStarted`).
6. Call `spawner.addPlayer(player)` and `spawner.startDelayForPrompt(player)` in a handler subscribed to `Events.OnPlayerJoinGame`.
7. Call `spawner.startDelayForPrompt(player)` in a handler subscribed to `Events.OnPlayerUndeploy`.
8. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code and merge all `strings.json` files).

<ai>

### Example

```ts
import { FFASpawnPoints } from 'bf6-portal-utils/ffa-spawn-points';
import { Events } from 'bf6-portal-utils/events';

// Define your spawn points: [x, y, z, orientationDegrees]
const SPAWN_POINTS: FFASpawnPoints.SpawnData[] = [
    [100, 0, 200, 0], // x = 100, y = 0, z = 200, orientation = 0 (North)
    [-100, 0, 200, 90], // x = -100, y = 0, z = 200, orientation = 90 (East)
    [0, 0, -200, 180], // x = 0, y = 0, z = -200, orientation = 180 (South)
    [-200, 100, 300, 270], // x = -200, y = 100, z = 300, orientation = 270 (West)
    // ... more spawn points
];

let spawner: FFASpawnPoints;

Events.OnGameModeStarted.subscribe(() => {
    // Instantiate the spawning system with custom fitness options
    spawner = new FFASpawnPoints(SPAWN_POINTS, {
        defaultScorerOptions: {
            minSafeDistance: 20, // Disqualify/penalize enemies closer than 20m (default: 20m)
            idealDistance: 35, // Peak fitness distance to closest enemy (default: 35m)
            maxDistance: 80, // Far distance cutoff where proximity score drops to 0 (default: 80m)
            crowdingRadius: 50, // Sector radius to evaluate crossfire risk (default: 50m)
            crowdingWeight: 0.25, // Penalty per extra enemy in crowding sector (default: 0.25)
            spawnCooldownMs: 4000, // Cooldown before a spawn point regains full fitness (default: 4000ms)
            facingWeight: 0.15, // Bonus when spawn orientation faces towards action (default: 0.15)
        },
        selectionPoolSize: 3, // Randomly pick from Top-3 candidates to prevent clustering (default: 3)
        initialPromptDelay: 10, // Delay before first prompt in seconds (default: 10)
        promptDelay: 10, // Delay between prompts in seconds (default: 10)
        queueProcessingDelay: 1, // Queue processing interval in seconds (default: 1)
    });

    // Enable spawn queue processing
    spawner.enableSpawnQueueProcessing();

    // Optional: Configure logging for spawn system debugging
    FFASpawnPoints.setLogging((text) => console.log(text), FFASpawnPoints.LogLevel.Info);
});

Events.OnPlayerJoinGame.subscribe((eventPlayer: mod.Player) => {
    // Add player to spawning system and start delay countdown
    spawner.addPlayer(eventPlayer, false);
    spawner.startDelayForPrompt(eventPlayer);
});

Events.OnPlayerUndeploy.subscribe((eventPlayer: mod.Player) => {
    // Start delay countdown when a player undeploys
    spawner.startDelayForPrompt(eventPlayer);
});
```

</ai>

---

## Core Concepts

- **Structure of Arrays (SoA) Storage** – All spawn points are stored in flat typed arrays (`Float32Array` for positions, orientations, directions, and scores; `Float64Array` for last-used timestamps; `Uint16Array` for candidate indices). This produces zero heap allocations and optimal cache locality during scoring evaluations.
- **Spawn Queue** – Players are added to a queue when they choose to spawn. The queue is processed asynchronously with a configurable delay.
- **Delay System** – Players see a non-blocking countdown timer before being prompted to spawn or delay again, giving them time to adjust loadouts at the deploy screen.
- **AI Handling** – AI soldiers automatically skip the countdown and prompt, spawning immediately when added to the queue.
- **Multi-Factor Fitness Scoring** – Powered by `PlayerLocations`, the system evaluates every spawn point against all active players in local JavaScript memory, scoring proximity, crowding, cooldown, and facing alignment.
- **Top-K Anti-Clustering Selection** – Randomly selects from the top $K$ scoring candidates to prevent consecutive respawning players from clumping onto the exact same spot.
- **HQ Disabling** – The system automatically disables both team HQs upon instantiation to prevent default team-based spawning.
- **Configurable Logging** – The system uses the `Logging` module for internal logging. Use `FFASpawnPoints.setLogging()` to configure a logger function and log verbosity.

---

## Spawn Point Selection Algorithm

The `getBestSpawnIndex()` method performs an exhaustive, zero-allocation pass over all configured spawn points:

1. **Empty Map Fast Path ($O(1)$)** – If `PlayerLocations.getActivePlayerCount() === 0`, it instantly selects a random spawn point without running distance evaluations.
2. **Exhaustive Evaluation Pass** – For each candidate spawn point $i$, it invokes the active `Scorer` function: $$\text{Score}_i = \text{scorer}(x_i, y_i, z_i, \text{orientation}_i, \Delta t_i)$$ where $\Delta t_i$ is the milliseconds elapsed since spawn point $i$ was last selected.
3. **Top-$K$ Stream Selection** – Candidates are inserted in-line into pre-allocated `_topIndices` (`Uint16Array`) and `_topScores` (`Float32Array`) buffers, maintaining the top $K$ scoring candidates in descending order without heap allocations or full-array sorting.
4. **Anti-Clustering Selection** – One candidate is chosen uniformly at random from the Top-$K$ pool (`selectionPoolSize`, default: 3) to prevent consecutive respawning players from clustering on the exact same location.

---

## Default Fitness Scorer

When no `options.customScorer` is supplied, `FFASpawnPoints` uses its built-in multi-factor scoring function powered by [`PlayerLocations`](../player-locations/README.md):

### 1. Closest Enemy Proximity ($S_{\text{dist}}$)

Locates the closest active enemy using `PlayerLocations.getClosestPlayerId(x, y, z)` and calculates Euclidean distance $d_{\min}$:

$$
S_{\text{dist}} = \begin{cases}
-1000 \cdot \left(1 - \frac{d_{\min}}{\text{minSafeDistance}}\right), & d_{\min} < \text{minSafeDistance} \\
\frac{d_{\min} - \text{minSafeDistance}}{\text{idealDistance} - \text{minSafeDistance}}, & \text{minSafeDistance} \le d_{\min} \le \text{idealDistance} \\
1 - \frac{d_{\min} - \text{idealDistance}}{\text{maxDistance} - \text{idealDistance}}, & \text{idealDistance} < d_{\min} \le \text{maxDistance} \\
0, & d_{\min} > \text{maxDistance}
\end{cases}
$$

### 2. Sector Crowding Penalty ($P_{\text{crowd}}$)

Queries `PlayerLocations.findPlayersInSphere(x, y, z, crowdingRadius)` using the spatial uniform grid to determine the number of enemies $N_{\text{nearby}}$ in the spawn sector:

$$P_{\text{crowd}} = \max(0, N_{\text{nearby}} - 1) \cdot \text{crowdingWeight}$$

### 3. Temporal Cooldown Penalty ($P_{\text{cooldown}}$)

Penalizes recently used spawn points to prevent immediate respawn recycling:

$$
P_{\text{cooldown}} = \begin{cases}
\left(1 - \frac{\Delta t}{\text{spawnCooldownMs}}\right) \cdot 2.0, & \Delta t < \text{spawnCooldownMs} \\
0, & \Delta t \ge \text{spawnCooldownMs}
\end{cases}
$$

### 4. Directional Facing Bonus ($B_{\text{facing}}$)

Calculates the 2D dot product between the spawn's forward facing orientation vector $\mathbf{v}_{\text{forward}} = (\sin \theta, -\cos \theta)$ and the 2D direction vector toward the closest enemy $\mathbf{v}_{\text{enemy}} = \frac{\mathbf{p}_{\text{enemy}} - \mathbf{p}_{\text{spawn}}}{\|\mathbf{p}_{\text{enemy}} - \mathbf{p}_{\text{spawn}}\|}$:

$$B_{\text{facing}} = \left(\frac{\mathbf{v}_{\text{forward}} \cdot \mathbf{v}_{\text{enemy}} + 1}{2}\right) \cdot \text{facingWeight}$$

### Total Fitness Formula

$$\text{Fitness} = S_{\text{dist}} - P_{\text{crowd}} - P_{\text{cooldown}} + B_{\text{facing}}$$

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

The following values control spawning behavior via constructor `options`:

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultScorerOptions` | `DefaultScorerOptions` | `{}` | Optional configuration overrides for the built-in default scoring algorithm (see below). |
| `defaultScorerOptions.minSafeDistance` | `number` | `20` | Minimum distance (in meters) to any enemy player for a spawn to be considered safe. |
| `defaultScorerOptions.idealDistance` | `number` | `35` | Target ideal distance (in meters) to closest enemy receiving peak proximity score. |
| `defaultScorerOptions.maxDistance` | `number` | `80` | Maximum distance (in meters) beyond which proximity score drops to 0. |
| `defaultScorerOptions.crowdingRadius` | `number` | `50` | Sector radius (in meters) to evaluate enemy crossfire risk. |
| `defaultScorerOptions.crowdingWeight` | `number` | `0.25` | Penalty subtracted per extra enemy in the crowding sector beyond the first. |
| `defaultScorerOptions.spawnCooldownMs` | `number` | `4000` | Cooldown time (in ms) before a used spawn point regains full fitness. |
| `defaultScorerOptions.facingWeight` | `number` | `0.15` | Bonus weight added when spawn orientation faces toward the closest enemy. |
| `selectionPoolSize` | `number` | `3` | Number of top-scoring candidates to randomly pick from (Top-K selection). |
| `customScorer` | `function` | `undefined` | Optional custom scoring function `(x, y, z, orientation, elapsedSinceLastUsedMs) => number`. |
| `initialPromptDelay` | `number` | `10` | Time (in seconds) until the player is first prompted to spawn. |
| `promptDelay` | `number` | `10` | Time (in seconds) until the player is prompted again after clicking "Delay". |
| `queueProcessingDelay` | `number` | `1` | Interval (in seconds) between processing spawn queue batches. |

---

## API Reference

### `class FFASpawnPoints`

#### Constructor

```ts
new FFASpawnPoints(spawns: FFASpawnPoints.SpawnData[], options?: FFASpawnPoints.Options)
```

#### Instance Properties & Methods

| Property / Method | Description |
| --- | --- |
| `spawnCount: number` | Total number of spawn points configured in this instance. |
| `addPlayer(player: mod.Player, showDebugPosition?: boolean): void` | Registers a player into the spawning system and creates their prompt/countdown UI. |
| `removePlayer(playerOrId: mod.Player \| number): boolean` | Unregisters a player and cleans up their UI elements, clocks, and intervals. |
| `startDelayForPrompt(playerOrId: mod.Player \| number, delay?: number): void` | Starts the spawn prompt countdown. |
| `forceIntoQueue(playerOrId: mod.Player \| number): void` | Forces a player into the spawn queue immediately. |
| `getBestSpawnIndex(): number \| null` | Evaluates all spawn points and returns the chosen zero-based spawn index, or null if no spawns exist. |
| `enableSpawnQueueProcessing(): void` | Starts automatic processing of the spawn queue. |
| `disableSpawnQueueProcessing(): void` | Pauses automatic processing of the spawn queue. |
| `destroy(): void` | Cleans up all player UI, timers, clocks, and unbinds leave event handlers. |

#### Static Methods

| Method | Description |
| --- | --- |
| `FFASpawnPoints.defaultScorer(x, y, z, orientation, elapsed, options?): number` | Computes the multi-factor fitness score for a candidate spawn point using the default algorithm. |
| `FFASpawnPoints.setLogging(log?, logLevel?, includeRawError?): void` | Configures logging verbosity for the FFASpawnPoints module. |

---

## Further Reference

- [PlayerLocations module](../player-locations/README.md) – Zero-GC spatial query engine powering proximity and density evaluations.
- [Events module](../events/README.md) – Used to subscribe to game events.
- [UI module](../ui/README.md) – Documentation for the UI prompt components.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
