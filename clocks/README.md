# Clocks Module

<ai>

The `Clocks` namespace provides high-performance **CountUp** (stopwatch) and **CountDown** (timer) functionality for Battlefield Portal experiences. The clocks are efficient, drift-resistant, and well-suited to UIs that need to update every second, every minute, or when the clock completes—e.g. match timers, round timers, or bomb fuse countdowns. Time is tracked internally as accumulated milliseconds while the clock is running; the next tick is scheduled to align with whole-second boundaries, minimizing drift. Callbacks (`onSecond`, `onMinute`, `onComplete`) are invoked only when the corresponding integer value changes, and errors in callbacks are caught and logged so they cannot break the clock.

</ai>

The module uses the `Timers` and `CallbackHandler` modules internally and the `Logging` module for optional logging. Configurable logging helps with debugging start/stop, completion, and time adjustments.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module:
    ```ts
    import { Clocks } from 'bf6-portal-utils/clocks';
    import { Logging } from 'bf6-portal-utils/logging';
    ```
3. Initialize the global clock logger in your setup script:
    ```ts
    Clocks.setLogging(mod.Message, Logging.LogLevel.Info);
    ```
4. Create a clock using `Clocks.createCountUp` or `Clocks.createCountDown` and control it using the returned integer ID.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Clocks } from 'bf6-portal-utils/clocks';
import { Events } from 'bf6-portal-utils/events';

Clocks.setLogging((text) => console.log(text), Clocks.LogLevel.Info);

let roundClockId: Clocks.ClockID = Clocks.INVALID_CLOCK_ID;

Events.OnGameModeStarted.subscribe(() => {
    // 5-minute round timer; update UI every second, voice over every minute, and end round when time runs out
    roundClockId = Clocks.createCountDown(5 * 60, {
        onSecond: (seconds) => updateTimerDisplay(seconds),
        onMinute: (minutes) => announceMinute(minutes),
        onComplete: () => endRound(),
    });

    Clocks.start(roundClockId);
});

Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    // Stopwatch for a single player (e.g. lap time), with 1-hour limit
    const stopwatchId = Clocks.createCountUp({
        timeLimitSeconds: 3600,
        onSecond: (seconds) => setHudSeconds(seconds),
        onComplete: () => showTimeLimitReached(),
    });

    Clocks.start(stopwatchId);

    Events.OnPlayerDied.subscribe(
        (victim: mod.Player, killer: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) => {
            Clocks.stop(stopwatchId);
        }
    );
});
```

</ai>

---

<ai>

## When Callbacks Fire (Lifecycle)

Callbacks are driven by an internal **tick** that runs when the clock starts or resumes, once after `stop()` or `pause()` (to commit elapsed time), on a timer at whole-second boundaries while running, when `addSeconds()` or `subtractSeconds()` is called, and when `reset()` is called while the clock is **running** (to report the snapped-to-start position). Each tick checks whether an integer second or minute boundary has been reached or crossed since the last reported value, and whether the clock has reached its completion condition.

### `onSecond(currentSeconds: number)`

Fires every time the clock reaches or crosses an integer second boundary (see [Rounding](#rounding-count-up-vs-count-down)) for which it has not yet invoked `onSecond`. That can happen when:

- Time elapses normally while the clock is running (one firing per whole second).
- `start()` or `resume()` runs on a fresh clock (first tick reports the current integer second).
- `stop()` or `pause()` commits elapsed time and the resulting value crosses a second boundary not yet reported.
- `addSeconds()` or `subtractSeconds()` adjusts time so that the integer second changes.
- `reset()` while the clock is **running** clears elapsed time but keeps it running; the deferred tick reports the starting integer second (and minute if applicable), same idea as the first tick after `start()`.
- `reset()` while the clock is **stopped** or **paused** does not run a tick or fire `onSecond` / `onMinute`; call `start()` to begin again from the initial value.

### `onMinute(currentMinutes: number)`

Follows the same rules as `onSecond`, but for integer **minute** boundaries (derived from the rounded second value: `floor(seconds/60)` for count-up, `ceil(seconds/60)` for count-down).

### `onComplete()`

Fires at most once per clock when the completion condition is met during a tick:

- **CountDown:** when remaining time reaches 0.
- **CountUp:** when elapsed time reaches the optional `timeLimitSeconds` (default 86400 if not set).

That can happen when time elapses normally while running, or when `stop()` or `pause()` commits elapsed time and the clock is then in a completed state. `reset()` never fires `onComplete` as the clock's internal state is immediately reset before a tick can run to check for completion. In the tick where a CountDown clock reaches 0, `onComplete()` is invoked first, then `onSecond(0)` (and possibly `onMinute(0)`) in the same tick.

### Synchronous vs asynchronous callbacks

Synchronous callbacks run inside the tick and **block** the clock logic: the next tick is only scheduled via `setTimeout` after `onComplete`, `onSecond`, and `onMinute` have been invoked. The time until the next whole-second boundary is computed at that moment (when `setTimeout` is called), so the delay is based on the current time after your callbacks return. As a result, short synchronous callbacks should not cause drift—as long as they are not long-running (i.e. no longer than a second in total per tick). Asynchronous callbacks are preferred when you need to do more work, but short synchronous callbacks (e.g. updating a simple UI or game value, or playing a voice over) are safe.

</ai>

---

## Rounding: Count Up vs Count Down

The clock uses an internal “elapsed time” in milliseconds. The value you see (and the one passed to `onSecond`/`onMinute`) is a **rounded integer** so that the display and callbacks only change on clear boundaries.

### CountUp (stopwatch) — `Math.floor`

- **Rule:** The integer second is `floor(elapsedSeconds)`.
- **Rationale:** You should show “1” only after a **full** second has passed. So at 0.9s we still show 0; at 1.0s we show 1. Floor gives that behavior and avoids the display ever “jumping” ahead before the boundary.
- **Effect:** The displayed second increases only when the clock crosses the next whole second (1.0, 2.0, 3.0, …).

### CountDown (timer) — `Math.ceil`

- **Rule:** The integer second is `ceil(remainingSeconds)` where remaining = duration − elapsed.
- **Rationale:** You should show “N” until the clock has **actually** crossed below N. So with 60s duration, we show 60 until 1 second has elapsed, then 59, and so on. For example, at 45.2s, we show 45, and at 0.7s remaining we still show 1. When remaining reaches 0, the clock completes; in that same tick `onComplete` runs first, then `onSecond(0)` and `onMinute(0)` (see [When Callbacks Fire](#when-callbacks-fire-lifecycle)). Ceil gives that behavior and ensures the displayed value never “drops” to the next number before the boundary.
- **Effect:** The displayed second decreases only when the clock crosses the previous whole second (e.g. 60 → 59 at 1s elapsed, 1 → complete at duration elapsed).

Using floor for count-up and ceil for count-down keeps both clocks consistent with user expectation: one full second must pass before the displayed second changes in either direction.

---

## API Reference

Clocks are represented by lightweight integers (`ClockID`) and the API is functional instead of object-oriented for performance and memory savings.

### Core Creation Methods

| Method | Description |
| --- | --- |
| `createCountUp(options?: CountUpOptions): ClockID \| null` | Allocates a new count-up clock. Returns the allocated ID, or `null` if the clock pool is full. Optional `timeLimitSeconds` stops the clock when reached. |
| `createCountDown(durationSeconds: number, options?: CountDownOptions): ClockID \| null` | Allocates a new count-down clock starting from `durationSeconds`. Returns the allocated ID, or `null` if the clock pool is full. |

### Clock Management Methods

All management methods accept the target clock ID as their first argument.

| Method | Description |
| --- | --- |
| `start(id: ClockID): void` | Starts the clock. If already running or complete, does nothing. |
| `stop(id: ClockID): void` | Stops the clock. It retains its elapsed time and can be resumed later. |
| `resume(id: ClockID): void` | Alias for `start(id)`. |
| `pause(id: ClockID): void` | Alias for `stop(id)`. |
| `reset(id: ClockID): void` | Resets the elapsed time back to 0 (or duration). If the clock was running, it stays running. If complete, clears completion state. |
| `destroy(id: ClockID): void` | Stops the clock and deallocates its ID back to the internal pool. Callbacks are wiped. |
| `addSeconds(id: ClockID, seconds: number): void` | Advances the clock time by the specified number of seconds. |
| `subtractSeconds(id: ClockID, seconds: number): void` | Reverses the clock time by the specified number of seconds. |
| `setDuration(id: ClockID, durationSeconds: number): void` | Changes the duration limit of the clock. |

### State Inspectors

| Method | Description |
| --- | --- |
| `getSeconds(id: ClockID): number \| undefined` | Returns the current time of the clock in fractional seconds, or `undefined` if the clock does not exist. |
| `getDuration(id: ClockID): number \| undefined` | Returns the duration (or time limit) of the clock, or `undefined` if the clock does not exist. |
| `isRunning(id: ClockID): boolean \| undefined` | Returns `true` if the clock is actively ticking, `false` if not, or `undefined` if the clock does not exist. |
| `isPaused(id: ClockID): boolean \| undefined` | Returns `true` if the clock has been stopped and is not complete, `false` if not, or `undefined` if the clock does not exist. |
| `isComplete(id: ClockID): boolean \| undefined` | Returns `true` if the clock reached its end boundary (0 for CountDown, limit for CountUp), `false` if not, or `undefined` if the clock does not exist. |
| `isActive(id: ClockID): boolean` | Returns `true` if the clock is active (allocated). |
| `getActiveClockCount(): number` | Returns the number of active (allocated) clocks. |

### Constants

| Constant | Type | Value | Description |
| --- | --- | --- | --- |
| `MAX_CLOCK_SECONDS` | `number` | `32_767` | Maximum time limit and duration in seconds (signed 16-bit integer limit). |

### Configuration

#### Static method

| Method | Description |
| --- | --- |
| `setLogging(log?, logLevel?, includeRawError?): void` | Configures logging for the Clocks module (start, stop, completion, time adjustments). Pass `null` for `log` to disable. See [Logging](../logging/README.md). |

#### Types

| Type | Description |
| --- | --- |
| `ClockID` | `number` (Unique generation-encoded identifier for a Clock: `index + 10_000 * generation`). |
| `ClockOptions` | `{ onSecond?: (currentSeconds: number) => void \| Promise<void>; onMinute?: (currentMinutes: number) => void \| Promise<void>; onComplete?: () => void \| Promise<void>; }` |
| `CountUpOptions` | `ClockOptions & { timeLimitSeconds?: number }` (clamped to `[0, MAX_CLOCK_SECONDS]`, default `MAX_CLOCK_SECONDS`). |
| `CountDownOptions` | Same as `ClockOptions` (`durationSeconds` is clamped to `[0, MAX_CLOCK_SECONDS]`). |

## How It Works

1. **Structure of Arrays** – The module pre-allocates flat `TypedArrays` (`Float64Array` for `accumulatedMs`, `lastResumeTime`, and `limits`; `Int16Array` for `_lastIntegerSecond`; `Uint16Array` for `_generations`; `Uint8Array` for `_flags`) for clock state up to a maximum limit of 256 (`MAX_CLOCKS`). Slots are allocated in $O(1)$ time via an intrusive free list (`_lastIntegerSecond`). If the pool is full, `createCountUp` and `createCountDown` log an error via `Logging` and return `null` without throwing an exception.
2. **Generational Safety & Exhaustion** – Clock IDs encode generation (`index + 10_000 * generation`) using a `Uint16Array`. When a slot reaches the maximum generation of `65_535`, it is permanently retired to prevent generational wrap-around collisions.
3. **Elapsed time** – While a clock is running, elapsed time is `accumulatedMs[id] + (Date.now() - lastResumeTime[id])`. When stopped, the current run is added to `accumulatedMs` and the timer is cleared. Total elapsed time is seamlessly preserved.
4. **Tick loop** – There is exactly **one** global `_tick` loop managed by `Timers.setTimeout`. It iterates over all active clocks and checks completion conditions. For running clocks, it schedules the next tick exactly at `1000 - (elapsedMs % 1000)` ms to align exactly on the next closest whole-second boundary across _all_ active clocks.
5. **Deferred tick processing** – Start, stop, and adjustments schedule the global tick queue via a reusable static `Promise.resolve()` microtask handler (`STATIC_PROMISE.then(_processTickQueue)`). This strictly avoids Promise and closure allocations on every state change, while preventing re-entrancy issues.
6. **Callback handling** – Callbacks are invoked via `CallbackHandler.invoke` which bypasses rest-parameter array creations for zero-allocation tick events.

---

## Known Limitations & Caveats

- **Pool Capacity** – The clock pool is pre-allocated to 256 concurrent slots (`MAX_CLOCKS`). If the pool is full when calling `createCountUp()` or `createCountDown()`, it logs an error via `Logging` and return `null` without throwing an exception.
- **Duration Limits** – Clocks support a maximum duration / time limit of 32,767 seconds (~9.1 hours, `MAX_CLOCK_SECONDS`). Values exceeding this are clamped automatically.
- **Tick Frequency** – Callbacks are dispatched on whole-second / whole-minute boundaries based on server uptime. Precision is bounded by the tick alignment timer.
- **Async Callbacks** – Async callbacks are invoked without blocking the tick loop; rejections and errors are automatically caught and logged via `CallbackHandler`.

---

## Further Reference

- [Timers module](../timers/README.md) – Used for scheduling the next tick.
- [CallbackHandler module](../callback-handler/README.md) – Used to invoke callbacks safely.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
