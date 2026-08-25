# Timers Module

<ai>

This TypeScript `Timers` namespace provides `setTimeout` and `setInterval` functionality for Battlefield Portal experiences which run in a QuickJS runtime, which does not natively include these standard JavaScript timing functions. The module uses a highly optimized, zero-allocation pre-allocated data pool evaluated on every game tick (`Events.OngoingGlobal`) to execute and manage timers reliably, avoiding promise overhead and dynamic memory allocation.

**Why use Timers instead of traditional delay loops?** The `Timers` module offers significant advantages: timers can be cancelled with `clearTimeout()`/`clearInterval()`, multiple timers can run concurrently without blocking, automatic error handling prevents timer failures from crashing your mod, and the familiar JavaScript API makes code more readable and maintainable. Ideal for periodic tasks, delayed actions, debouncing, and any scenario where you need cancellable or recurring delays. See the [Comparing Timers to mod.Wait()](#comparing-timers-to-modwait) section below for a detailed comparison.

</ai>

Key features include automatic timer ID management, graceful error handling that prevents timer failures from crashing your mod, support for immediate interval execution, and configurable logging for debugging timer behavior. The module uses the `Logging` module for internal logging, allowing you to monitor callback errors and debug timer behavior.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Timers } from 'bf6-portal-utils/timers';
    ```
3. Optionally set up logging for debugging (recommended during development).
4. Use `Timers.setTimeout()` and `Timers.setInterval()` just like you would in standard JavaScript.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Timers } from 'bf6-portal-utils/timers';

let healthCheckIntervalId = -1;
let respawnTimeoutId = -1;

export async function OnGameModeStarted(): Promise<void> {
    // Optional: Configure logging for timer callback error monitoring
    Timers.setLogging((text) => console.log(text), Timers.LogLevel.Error);

    // Start a periodic health check every 5 seconds
    // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
    healthCheckIntervalId = Timers.setInterval(() => {
        const players = mod.GetPlayers();
        console.log(`Active players: ${players.length}`);
    }, 5_000);

    // Schedule a one-time event after 30 seconds
    // Callbacks can be synchronous or asynchronous (return void or Promise<void>)
    Timers.setTimeout(async () => {
        console.log('Game mode has been running for 30 seconds!');
        await doSomething();
    }, 30_000);
}

export async function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): Promise<void> {
    // Schedule a respawn after 10 seconds
    respawnTimeoutId = Timers.setTimeout(() => {
        mod.SpawnPlayer(victim, mod.GetRandomSpawnPoint(mod.GetTeam(victim)));
    }, 10_000);
}

export async function OnPlayerDeployed(eventPlayer: mod.Player): Promise<void> {
    // Cancel the respawn timeout if the player already spawned.
    // You can use `clearTimeout`, `clearInterval`, or `clear` - they all work the same.
    Timers.clear(respawnTimeoutId);
    respawnTimeoutId = -1;
}

export async function OnGameModeEnded(): Promise<void> {
    // Clean up intervals when the game mode ends.
    // You can use `clearTimeout`, `clearInterval`, or `clear` - they all work the same.
    Timers.clear(healthCheckIntervalId);
    healthCheckIntervalId = -1;

    // Optional: Check how many timers are still active (useful for debugging)
    const activeCount = Timers.getActiveTimerCount();
    if (activeCount > 0) {
        console.log(`Warning: ${activeCount} timers still active after cleanup`);
    }
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
        10_000,
        true // true = immediate execution
    );
}
```

</ai>

---

## Core Concepts

- **Generational Timer IDs** – Each timer is assigned a unique numeric ID generated using a **generational index** pattern (combining the slot index and a generation counter, e.g., `index + 10000 * generation`). This prevents stale timer IDs (from completed or cleared timers) from being mistakenly used to clear a newly scheduled timer occupying the same pool slot.
- **Data-Oriented Storage (Zero Allocation Pool)** – State is stored in flat arrays (`Uint32Array` for expiration times, intervals, and slot generations, plus a pre-allocated array of size 512 for callback references). This layout guarantees a highly predictable, contiguous footprint of 20 bytes per timer slot (12 bytes of numeric state + 8 bytes/pointer reference for the callback reference in the array), plus a negligible, fixed overhead for the array object headers.
- **Flat Memory Footprint** – All state tracking memory is reserved upfront at initialization. Whether there are 0 active timers or the pool is entirely maxed out, the total memory overhead of the state tracking remains perfectly flat.
- **Tick-Based Evaluation** – A subscription to the engine's global ongoing ticks evaluates all active timers synchronously, bypassing promise-based async loops entirely during timer checks. This subscription is registered lazily on the first scheduled timer to resolve load-time circular dependency crashes between modules.
- **Error Isolation** – Callback errors (both synchronous and asynchronous) are caught and logged (if logging is configured) but do not stop timer execution.
- **Configurable Error Logging** – Callback errors are automatically logged using the `Logging` module. Use `Timers.setLogging()` to configure a logger function, minimum log level, and whether to include error details. This provides visibility into timer failures without requiring manual error handling in every callback.

---

## Comparing Timers to mod.Wait()

While `mod.Wait()` is the traditional way to introduce delays in Battlefield Portal, the `Timers` namespace provides significant advantages that make it a better choice for most timing scenarios:

### Key Advantages

- **Cancellable Timers** – Unlike `mod.Wait()`, which cannot be cancelled once started, timers can be cancelled at any time using `clearTimeout()` or `clearInterval()`. This is essential for scenarios like respawn timers that should be cancelled if a player spawns early, or debouncing where you need to reset a delay.

- **Concurrent Execution & Zero Allocations** – Multiple timers can run simultaneously without blocking or spawning concurrent async chains. Evaluated in a single tick-based loop, they bypass the allocation overhead of multiple concurrent `mod.Wait()` promises.

- **Automatic Error Handling** – Timer callbacks are wrapped in error handling that prevents failures from crashing your mod. If a callback throws an error, it's caught and logged (if logging is enabled), but other timers continue running normally.

- **Familiar JavaScript API** – `setTimeout()` and `setInterval()` are standard JavaScript functions that most developers already know. This makes code more readable and maintainable compared to manually managing `mod.Wait()` calls in async functions.

- **Periodic Tasks Made Easy** – `setInterval()` provides a clean way to run recurring operations without manually implementing loops with `mod.Wait()`. The timer automatically handles the repetition and can be cancelled when no longer needed.

### Ideal Use Cases

The `Timers` module is particularly well-suited for:

- **Periodic tasks** – Scoreboard updates, health checks, periodic spawns, or any recurring operation
- **Delayed actions** – Respawn timers, delayed announcements, cleanup tasks that should happen after a delay
- **Debouncing** – Input handlers that should only trigger after a period of inactivity
- **Cancellable delays** – Any scenario where you might need to cancel a pending action (e.g., cancelling a respawn if the player manually spawns)

While `mod.Wait()` is still useful for simple, linear delays in async functions, the `Timers` module is the recommended approach for most timing needs in Battlefield Portal experiences.

---

## API Reference

### `namespace Timers`

The namespace is not instantiated; all members are static.

#### `Timers.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `Timers.setLogging()` to configure the minimum log level for timer callback error logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Default minimum log level.
- `Error` (3) – Error messages. Includes callback errors (sync and async). Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Constants

| Constant | Type | Value | Description |
| --- | --- | --- | --- |
| `MAX_TIMER_DELAY_MS` | `number` | `2_147_483_647` | Maximum timer delay in milliseconds (signed 32-bit positive limit). |

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Configures logging for the Timers module. Callback errors (both synchronous and asynchronous) are automatically caught and logged using the configured logger. This allows you to monitor and debug timer callback failures without breaking your mod. Pass `undefined` (or `null`) for `log` to disable logging. Default log level is `Warning`, default `includeRawError` is `false`. The runtime error can be very large and may cause issues with UI loggers. For more information, see the [`Logging` module documentation](../logging/README.md). |
| `setTimeout(callback: () => Promise<void> \| void, ms: number): TimerID \| null` | Schedules a one-time execution of `callback` after `ms` milliseconds delay (clamped to `[0, MAX_TIMER_DELAY_MS]`). Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Returns a `TimerID`, or `null` if the pre-allocated timer pool is full. The returned ID can be used with `clearTimeout()`, `clearInterval()`, or `clear()`. |
| `setInterval(callback: () => Promise<void> \| void, ms: number, immediate?: boolean): TimerID \| null` | Schedules repeated execution of `callback` every `ms` milliseconds (clamped to `[0, MAX_TIMER_DELAY_MS]`). Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Returns a `TimerID`, or `null` if the pre-allocated timer pool is full. If `immediate` is `true`, the callback runs immediately. Defaults to `false`. The returned ID can be used with `clearTimeout()`, `clearInterval()`, or `clear()`. |
| `clearTimeout(id: TimerID): void` | Cancels a timeout or interval identified by `id`. Silently ignores invalid IDs. This is equivalent to `clear()` and can be used interchangeably with `clearInterval()`. |
| `clearInterval(id: TimerID): void` | Cancels an interval or timeout identified by `id`. Silently ignores invalid IDs. This is equivalent to `clear()` and can be used interchangeably with `clearTimeout()`. |
| `clear(id: TimerID): void` | Generic function to cancel a timeout or interval identified by `id`. Silently ignores invalid IDs. Since timer and interval IDs are indistinguishable under the hood, this function can be used for simplicity instead of `clearTimeout()` or `clearInterval()`. |
| `isActive(id: TimerID): boolean` | Returns `true` if the timer identified by `id` is active, `false` otherwise. |
| `getActiveTimerCount(): number` | Returns the number of currently active timers (both timeouts and intervals). Useful for performance monitoring and debugging timer leaks. |

---

## Usage Patterns

- **One-time delays** – Use `setTimeout()` for actions that should happen once after a delay (e.g., respawn timers, delayed announcements, cleanup tasks).
- **Periodic tasks** – Use `setInterval()` for recurring operations (e.g., health checks, scoreboard updates, periodic spawns).
- **Immediate intervals** – Use `setInterval()` with `immediate: true` when you need initialization logic that runs right away, then repeats periodically.
- **Timer cleanup** – Always clear timers when they're no longer needed (e.g., when a player leaves, when the game mode ends) to prevent memory leaks and unexpected behavior. Use `clear()`, `clearTimeout()`, or `clearInterval()`—they all work the same since timer IDs are indistinguishable.
- **Performance monitoring** – Use `getActiveTimerCount()` to monitor the number of active timers and debug potential timer leaks or performance issues.

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
    if (existingTimer !== undefined) {
        Timers.clearTimeout(existingTimer);
    }

    // Set a new debounce timer
    const timerId = Timers.setTimeout(() => {
        // This only runs if the player doesn't click again within 0.5 seconds
        handleButtonClick(player, widget); // Some button click handler
        debounceTimers.delete(playerId);
    }, 500);

    debounceTimers.set(playerId, timerId);
}
```

### Example: Async Callback Handling

```ts
import { Timers } from 'bf6-portal-utils/timers';

export async function OnGameModeStarted(): Promise<void> {
    // Callbacks can now return Promise<void> directly - errors are automatically caught and logged
    Timers.setInterval(async () => {
        // Async operations here - errors are automatically caught and logged if logging is configured
        await someAsyncOperation();
        await anotherAsyncOperation();
    }, 5_000);

    // Synchronous callbacks also work
    Timers.setTimeout(() => {
        console.log('This is a synchronous callback');
    }, 1_000);
}
```

### Example: Using the Generic `clear()` Function

```ts
import { Timers } from 'bf6-portal-utils/timers';

let timerId = -1;

export async function OnGameModeStarted(): Promise<void> {
    timerId = Timers.setTimeout(() => {
        console.log('Timer fired');
    }, 5_000);
}

export async function OnGameModeEnded(): Promise<void> {
    // Use the generic clear() function for simplicity
    // Works for both timeouts and intervals
    Timers.clear(timerId);
    timerId = -1;
}
```

### Example: Performance Monitoring

```ts
import { Timers } from 'bf6-portal-utils/timers';

export async function OnGameModeStarted(): Promise<void> {
    // Monitor active timer count for debugging
    Timers.setInterval(() => {
        const activeCount = Timers.getActiveTimerCount();
        if (activeCount > 10) {
            console.log(`Warning: ${activeCount} active timers detected`);
        }
    }, 30_000);
}
```

---

## How It Works

1. **Pre-allocated Fixed Pool** – State is stored using flat, contiguous data structures of size 512 (`MAX_TIMERS`):
    - `_expirationTimes`: `Uint32Array` (4 bytes per slot)
    - `_intervalMs`: `Int32Array` (4 bytes per slot, storing the interval or intrusive free-list link)
    - `_generations`: `Uint16Array` (2 bytes per slot). When a slot reaches the maximum generation of `65_535`, it is permanently retired to prevent generational wrap-around collisions.
    - `_callbacks`: A pre-allocated array initialized with `null` references (8 bytes per slot/pointer) This design results in a highly predictable, contiguous footprint of **18 bytes per timer slot**, plus a negligible, fixed overhead for the array object headers themselves. Memory is reserved upfront at initialization. So whether there are 0 active timers or the pool is entirely maxed out, the total memory overhead of the state tracking remains perfectly flat.

2. **Ongoing Tick Evaluation** – The namespace registers a single callback to the engine's global tick loop (`Events.OngoingGlobal`). To resolve load-time circular import loops between the `Timers` and `Events` modules, this subscription is established lazily when the first timer is created. On each game tick:
    - If no timers are active, the tick handler exits immediately.
    - If timers are active, the system checks the current server uptime (`Date.now() - SERVER_START_TIME`) and iterates through the pool.
    - If an active callback's scheduled expiration time is met or exceeded, the callback is executed.
    - For one-time timeouts, the slot is cleared/deleted (reset to `null` and generation incremented) and the active count is decremented. For intervals, the expiration time is rescheduled.

3. **Timer ID Allocation & Intrusive Free List** – When a timer is scheduled, the system pops the next available index from an intrusive free list (`_firstFree` linked through `_intervalMs`) in $O(1)$ time. The returned `TimerID` is computed using a **generational index** formula: `index + 10,000 * _generations[index]`. When a timer is completed or cancelled, its slot generation count is incremented and the slot index is recycled back onto the free list. This ensures that old, stale IDs cannot interact with a new timer that reuses the same slot index. If the pool is full, it logs an error via `Logging` and returns `null` without throwing an exception.

4. **Timer Cancellation** – Clearing a timer via `clearTimeout()`, `clearInterval()`, or `clear()` decodes the ID by taking `id % 10,000` to find the slot index and checking if the encoded generation (`Math.floor(id / 10,000)`) matches the current slot's generation. If they match and the slot has a callback, the system sets the callback reference to `null`, increments the generation count for that slot (invalidating any copy of the ID), decrements the active timer count, and returns the slot index to the free list.

5. **Error Isolation & Logging** – Callback errors (both synchronous and asynchronous) are caught and logged using the `Logging` module, ensuring that one failing callback doesn't affect other active timers or halt the tick handler.

---

## Known Limitations & Caveats

- **Pool Capacity** – The timer pool is pre-allocated to 512 concurrent slots (`MAX_TIMERS`). Attempting to schedule additional timers when the pool is full will log an error via `Logging` and return `null` without throwing an exception.

- **Tick Rate Precision** – Timer checks are performed on every game tick (typically 30hz or ~33ms intervals). Precision is bounded by the server tick rate and frame timing.

- **Async Callbacks** – Callbacks can be synchronous or asynchronous (returning `void` or `Promise<void>`). Async callbacks are not awaited by the tick runner, meaning:
    - The loop does not wait for async operations to complete before continuing to check other timers.
    - Errors or rejections from async callbacks are automatically caught and logged (if logging is configured).
    - If you need to await nested async operations, handle that internally within your callback logic.

- **No Pause/Resume** – The current implementation does not support pausing and resuming timers. You must clear and recreate timers if you need this functionality.

- **Memory Cleanup** – Always clear timers when they are no longer needed (e.g. on game mode end or player logout) to free up slot indices in the pool and prevent stale references from being retained in the callbacks array.

- **Timer ID Interchangeability** – Timer and interval IDs are indistinguishable index numbers. You can use `clearTimeout()`, `clearInterval()`, or the generic `clear()` function interchangeably.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (pause/resume functionality, timer pooling, additional timing utilities, etc.), so please share your experiences.

---
