# Timers Module

This TypeScript `Timers` class provides `setTimeout` and `setInterval` functionality for Battlefield Portal experiences
which run in a QuickJS runtime, which does not natively include these standard JavaScript timing functions. The module
uses Battlefield Portal's `mod.Wait()` API internally to implement timer behavior, tracks active timers with unique IDs,
and provides error handling to ensure robust timer execution.

Key features include automatic timer ID management, graceful error handling that prevents timer failures from crashing
your mod, support for immediate interval execution, and optional logging for debugging timer behavior.

> **Note** The `Timers` class is self-contained and requires no additional modules or setup. All Battlefield Portal
> types referenced below (`mod.Wait`, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact
> signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Timers } from 'bf6-portal-utils/timers';
    ```
3. Optionally set up logging for debugging (recommended during development).
4. Use `Timers.setTimeout()` and `Timers.setInterval()` just like you would in standard JavaScript.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { Timers } from 'bf6-portal-utils/timers';

let healthCheckInterval: number | undefined;
let respawnTimeout: number | undefined;

export async function OnGameModeStarted(): Promise<void> {
    // Optional: Set up logging for debugging
    Timers.setLogging((text) => console.log(text));

    // Start a periodic health check every 5 seconds
    healthCheckInterval = Timers.setInterval(() => {
        const players = mod.GetPlayers();
        console.log(`Active players: ${players.length}`);
    }, 5);

    // Schedule a one-time event after 30 seconds
    Timers.setTimeout(() => {
        console.log('Game mode has been running for 30 seconds!');
    }, 30);
}

export async function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): Promise<void> {
    // Schedule a respawn after 10 seconds
    respawnTimeout = Timers.setTimeout(() => {
        mod.SpawnPlayer(victim, mod.GetRandomSpawnPoint(mod.GetTeam(victim)));
    }, 10);
}

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    // Cancel the respawn timeout if the player already spawned
    Timers.clearTimeout(respawnTimeout);
    respawnTimeout = undefined;
}

export async function OnGameModeEnded(): Promise<void> {
    // Clean up intervals when the game mode ends
    Timers.clearInterval(healthCheckInterval);
    healthCheckInterval = undefined;
}
```

### Immediate Interval Execution Example

```ts
import { Timers } from 'bf6-portal-utils/timers';

export async function OnGameModeStarted(): Promise<void> {
    // Start an interval that runs immediately, then every 10 seconds
    // Useful for initialization tasks that need to run right away
    Timers.setInterval(
        () => {
            // Update scoreboard, check objectives, etc.
            updateGameState();
        },
        10,
        true // true = immediate execution
    );
}
```

---

## Core Concepts

- **Timer IDs** – Each timer (timeout or interval) is assigned a unique numeric ID that can be used to cancel it later.
  IDs are auto-incremented starting from 1.
- **Active Timer Tracking** – The system maintains a set of active timer IDs. When a timer is cleared or completes, its
  ID is removed from the active set.
- **Error Handling** – Callback errors are caught and logged (if logging is enabled) but do not stop timer execution.
  System errors (e.g., `mod.Wait()` failures) are also handled gracefully.
- **Asynchronous Execution** – Timers run asynchronously using `async/await` with `mod.Wait()`, so they don't block your
  main event handlers.
- **Fire-and-Forget** – Timer callbacks are executed in fire-and-forget async functions, so you don't need to await
  them.

---

## API Reference

### `class Timers`

All methods are static. The class does not need to be instantiated.

#### Static Methods

| Method                                                                            | Description                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setTimeout(callback: () => void, seconds: number): number`                       | Schedules a one-time execution of `callback` after `seconds` delay. Returns a timer ID that can be used with `clearTimeout()`.                                                                                                     |
| `setInterval(callback: () => void, seconds: number, immediate?: boolean): number` | Schedules repeated execution of `callback` every `seconds`. Returns a timer ID that can be used with `clearInterval()`. If `immediate` is `true`, the callback runs immediately before the first wait period. Defaults to `false`. |
| `clearTimeout(id: number \| undefined \| null): void`                             | Cancels a timeout identified by `id`. Silently ignores `null`, `undefined`, or invalid IDs.                                                                                                                                        |
| `clearInterval(id: number \| undefined \| null): void`                            | Cancels an interval identified by `id`. Silently ignores `null`, `undefined`, or invalid IDs.                                                                                                                                      |
| `setLogging(log: (text: string) => void): void`                                   | Attaches a logger function for debugging timer behavior. Log messages are prefixed with `<Timers>`. Set `log` to `undefined` to disable logging.                                                                                   |

---

## Usage Patterns

- **One-time delays** – Use `setTimeout()` for actions that should happen once after a delay (e.g., respawn timers,
  delayed announcements, cleanup tasks).
- **Periodic tasks** – Use `setInterval()` for recurring operations (e.g., health checks, scoreboard updates, periodic
  spawns).
- **Immediate intervals** – Use `setInterval()` with `immediate: true` when you need initialization logic that runs
  right away, then repeats periodically.
- **Timer cleanup** – Always clear timers when they're no longer needed (e.g., when a player leaves, when the game mode
  ends) to prevent memory leaks and unexpected behavior.

### Example: Periodic Spawn System

```ts
import { Timers } from 'bf6-portal-utils/timers';

let vehicleSpawnInterval: number | undefined;

export async function OnGameModeStarted(): Promise<void> {
    // Spawn a vehicle every 60 seconds
    vehicleSpawnInterval = Timers.setInterval(() => {
        const spawnPoint = mod.GetRandomSpawnPoint(mod.GetTeam(1));
        mod.SpawnVehicle(mod.RuntimeSpawn_Common.Vehicle_Tank_T90, spawnPoint);
    }, 60);
}

export async function OnGameModeEnded(): Promise<void> {
    // Clean up the interval
    Timers.clearInterval(vehicleSpawnInterval);
}
```

### Example: Debounced Input Handler

```ts
import { Timers } from 'bf6-portal-utils/timers';

const debounceTimers = new Map<number, number>();

export async function OnPlayerUIButtonEvent(
    player: mod.Player,
    widget: mod.UIWidget,
    event: mod.UIButtonEvent
): Promise<void> {
    const playerId = mod.GetObjId(player);

    // Clear any existing debounce timer for this player
    const existingTimer = debounceTimers.get(playerId);
    Timers.clearTimeout(existingTimer);

    // Set a new debounce timer
    const timerId = Timers.setTimeout(() => {
        // This only runs if the player doesn't click again within 0.5 seconds
        handleButtonClick(player, widget);
        debounceTimers.delete(playerId);
    }, 0.5);

    debounceTimers.set(playerId, timerId);
}
```

### Example: Async Callback Handling

```ts
import { Timers } from 'bf6-portal-utils/timers';

export async function OnGameModeStarted(): Promise<void> {
    // If your callback needs to perform async operations, wrap them in an async IIFE
    // to ensure errors are caught properly
    Timers.setInterval(() => {
        (async () => {
            try {
                // Async operations here
                await someAsyncOperation();
                await anotherAsyncOperation();
            } catch (error) {
                // Handle errors here - they won't be caught by the timer's error handling
                console.log(`Error in async callback: ${error}`);
            }
        })();
    }, 5);

    // Alternatively, define an async function and call it
    async function performAsyncTask() {
        try {
            await someAsyncOperation();
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    Timers.setInterval(() => {
        performAsyncTask(); // Note: not awaited, but errors are handled inside
    }, 10);
}
```

---

## How It Works

The `Timers` class implements timer functionality using Battlefield Portal's `mod.Wait()` API:

1. **Timer ID Generation** – Each timer receives a unique, auto-incremented ID starting from 1. This ID is added to the
   `_ACTIVE_IDS` set when the timer is created.

2. **setTimeout Implementation** – Creates an async function that:
    - Waits for the specified delay using `await mod.Wait(seconds)`
    - Checks if the timer is still active (hasn't been cleared)
    - Removes the timer ID from the active set
    - Executes the callback
    - Catches and logs any errors without crashing

3. **setInterval Implementation** – Creates an async function that:
    - Optionally executes the callback immediately if `immediate` is `true`
    - Enters a `while` loop that continues while the timer ID is in the active set
    - Waits for the interval duration using `await mod.Wait(seconds)`
    - Checks if the timer is still active before each callback execution
    - Executes the callback in a try-catch to prevent errors from stopping the loop
    - Catches system errors (e.g., `mod.Wait()` failures) and cleans up the timer

4. **Timer Cancellation** – `clearTimeout()` and `clearInterval()` both remove the timer ID from the active set. The
   next time the timer checks `_ACTIVE_IDS.has(id)`, it will exit early, effectively canceling the timer.

5. **Error Isolation** – Callback errors are caught and logged but don't prevent timers from continuing. This ensures
   that one failing callback doesn't break other timers or your mod's execution.

---

## Known Limitations & Caveats

- **Async Callbacks Not Awaited** – You can use async callbacks (functions that return `Promise`), but they are not
  awaited by the timer. This means:
    - The timer doesn't wait for async operations to complete before continuing
    - Errors or rejections from async callbacks won't be caught by the timer's error handling (they'll be unhandled
      promise rejections)
    - If you need to await async operations, handle that inside your callback

- **No Pause/Resume** – The current implementation does not support pausing and resuming timers. You must clear and
  recreate timers if you need this functionality.

- **Precision** – Timer precision depends on `mod.Wait()`'s precision, which may vary slightly based on game performance
  and frame timing.

- **Memory Considerations** – While timer IDs are cleaned up automatically, you should still clear timers when they're
  no longer needed to prevent callback references from being retained in memory.

- **Concurrent Execution** – Multiple timers can execute their callbacks concurrently. If you need sequential execution
  or mutual exclusion, you'll need to implement that logic yourself.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are
welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases
help shape the roadmap (pause/resume functionality, timer pooling, additional timing utilities, etc.), so please share
your experiences.

---
