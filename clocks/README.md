# Clocks Module

<ai>

The `Clocks` namespace provides **CountUpClock** (stopwatch) and **CountDownClock** (timer) classes for Battlefield Portal experiences. Both are efficient, drift-resistant, and well-suited to UIs that need to update every second, every minute, or when the clock completes—e.g. match timers, round timers, or bomb fuse countdowns. Time is tracked internally as accumulated milliseconds while the clock is running; the next tick is scheduled to align with whole-second boundaries, minimizing drift. Callbacks (`onSecond`, `onMinute`, `onComplete`) are invoked only when the corresponding integer value changes, and errors in callbacks are caught and logged so they cannot break the clock.

</ai>

The module uses the `Timers` and `CallbackHandler` modules internally and the `Logging` module for optional logging. Configurable logging helps with debugging start/stop, completion, and time adjustments.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module:
    ```ts
    import { Clocks } from 'bf6-portal-utils/clocks';
    ```
3. Create a clock with optional callbacks, then `start()` it. Use the `seconds` getter or callbacks to drive your UI.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Clocks } from 'bf6-portal-utils/clocks';
import { Events } from 'bf6-portal-utils/events';

Clocks.setLogging((text) => console.log(text), Clocks.LogLevel.Info);

let roundClock: Clocks.CountDownClock;

Events.OnGameModeStarted.subscribe(() => {
    // 5-minute round timer; update UI every second, voice over every minute, and end round when time runs out
    roundClock = new Clocks.CountDownClock(5 * 60, {
        onSecond: (seconds) => updateTimerDisplay(seconds),
        onMinute: (minutes) => announceMinute(minutes),
        onComplete: () => endRound(),
    });
    roundClock.start();
});

Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    // Stopwatch for a single player (e.g. lap time), with 1-hour limit
    const stopwatch = new Clocks.CountUpClock({
        timeLimitSeconds: 3600,
        onSecond: (seconds) => setHudSeconds(seconds),
        onComplete: () => showTimeLimitReached(),
    });
    stopwatch.start();
});

Events.OnPlayerDied.subscribe(
    (victim: mod.Player, killer: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) => {
        stopwatch.stop();
    }
);
```

</ai>

---

<ai>

## When Callbacks Fire (Lifecycle)

Callbacks are driven by an internal **tick** that runs when the clock starts or resumes, once after `stop()` or `pause()` (to commit elapsed time), on a timer at whole-second boundaries while running, and when `addSeconds()` or `subtractSeconds()` is called. Each tick checks whether an integer second or minute boundary has been reached or crossed since the last reported value, and whether the clock has reached its completion condition.

### `onSecond(currentSeconds: number)`

Fires every time the clock reaches or crosses an integer second boundary (see [Rounding](#rounding-count-up-vs-count-down)) for which it has not yet invoked `onSecond`. That can happen when:

- Time elapses normally while the clock is running (one firing per whole second).
- `start()` or `resume()` runs on a fresh or reset clock (first tick reports the current integer second).
- `stop()` or `pause()` commits elapsed time and the resulting value crosses a second boundary not yet reported.
- `addSeconds()` or `subtractSeconds()` adjusts time so that the integer second changes.

`reset()` does not run a tick and does not fire callbacks; the next `start()` will run a tick and report the new initial value.

### `onMinute(currentMinutes: number)`

Follows the same rules as `onSecond`, but for integer **minute** boundaries (derived from the rounded second value: `floor(seconds/60)` for count-up, `ceil(seconds/60)` for count-down).

### `onComplete()`

Fires at most once per clock when the completion condition is met during a tick:

- **CountDownClock:** when remaining time reaches 0.
- **CountUpClock:** when elapsed time reaches the optional `timeLimitSeconds` (default 86400 if not set).

That can happen when time elapses normally while running, or when `stop()` or `pause()` commits elapsed time and the clock is then in a completed state. `reset()` never fires `onComplete` as the clocks internal state is immediately reset before a tick can run to check for completion. In the tick where a CountDownClock reaches 0, `onComplete()` is invoked first, then `onSecond(0)` (and possibly `onMinute(0)`) in the same tick.

### Synchronous vs asynchronous callbacks

Synchronous callbacks run inside the tick and **block** the clock logic: the next tick is only scheduled via `setTimeout` after `onComplete`, `onSecond`, and `onMinute` have been invoked. The time until the next whole-second boundary is computed at that moment (when `setTimeout` is called), so the delay is based on the current time after your callbacks return. As a result, short synchronous callbacks should not cause drift—as long as they are not long-running (i.e. no longer than a second in total per tick). Asynchronous callbacks are preferred when you need to do more work, but short synchronous callbacks (e.g. updating a simple UI or game value, or playing a voice over) are safe.

</ai>

---

## Rounding: Count Up vs Count Down

The clock uses an internal “elapsed time” in milliseconds. The value you see (and the one passed to `onSecond`/`onMinute`) is a **rounded integer** so that the display and callbacks only change on clear boundaries.

### CountUpClock (stopwatch) — `Math.floor`

- **Rule:** The integer second is `floor(elapsedSeconds)`.
- **Rationale:** You should show “1” only after a **full** second has passed. So at 0.9s we still show 0; at 1.0s we show 1. Floor gives that behavior and avoids the display ever “jumping” ahead before the boundary.
- **Effect:** The displayed second increases only when the clock crosses the next whole second (1.0, 2.0, 3.0, …).

### CountDownClock (timer) — `Math.ceil`

- **Rule:** The integer second is `ceil(remainingSeconds)` where remaining = duration − elapsed.
- **Rationale:** You should show “N” until the clock has **actually** crossed below N. So with 60s duration, we show 60 until 1 second has elapsed, then 59, and so on. For example, at 45.2s, we show 45, and at at 0.7s remaining we still show 1. When remaining reaches 0, the clock completes; in that same tick `onComplete` runs first, then `onSecond(0)` and `onMinute(0)` (see [When Callbacks Fire](#when-callbacks-fire-lifecycle)). Ceil gives that behavior and ensures the displayed value never “drops” to the next number before the boundary.
- **Effect:** The displayed second decreases only when the clock crosses the previous whole second (e.g. 60 → 59 at 1s elapsed, 1 → complete at duration elapsed).

Using floor for count-up and ceil for count-down keeps both clocks consistent with user expectation: one full second must pass before the displayed second changes in either direction.

---

## API Reference

### `namespace Clocks`

#### `Clocks.LogLevel`

Enum re-exported from the `Logging` module. Use with `Clocks.setLogging()` to set the minimum log level.

- `Debug` (0), `Info` (1), `Warning` (2), `Error` (3). See [Logging](../logging/README.md).

#### Static method

| Method | Description |
| --- | --- |
| `setLogging(log?, logLevel?, includeError?): void` | Configures logging for the Clocks module (start, stop, completion, time adjustments). Pass `undefined` for `log` to disable. See [Logging](../logging/README.md). |

#### Types

| Type | Description |
| --- | --- |
| `ClockOptions` | `{ onSecond?: (currentSeconds: number) => void \| Promise<void>; onMinute?: (currentMinutes: number) => void \| Promise<void>; onComplete?: () => void \| Promise<void>; }` |
| `CountUpOptions` | `ClockOptions & { timeLimitSeconds?: number }` |
| `CountDownOptions` | Same as `ClockOptions`. |

---

### `class Clocks.CountUpClock`

Stopwatch: starts at 0, counts up. Optional `timeLimitSeconds`; when reached, the clock completes and `onComplete` fires.

#### Constructor

| Signature                                    | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| `new CountUpClock(options?: CountUpOptions)` | `timeLimitSeconds` defaults to 86400 (24 hours) if omitted. |

#### Properties (read-only)

| Property | Description |
| --- | --- |
| `seconds: number` | Current value in seconds (0 and up; capped at `timeLimit` and, when complete, returns `timeLimit`). |
| `timeLimit: number \| null` | The limit in seconds, or null. |
| `isRunning: boolean` | True when the clock is running. |
| `isPaused: boolean` | True when not running and not complete. |
| `isComplete: boolean` | True when the clock has reached its time limit. |

#### Methods

| Method | Description |
| --- | --- |
| `start(): this` | Starts (or resumes) the clock. No-op if already running or complete. |
| `stop(): this` | Stops the clock and commits elapsed time. One more tick may run (see [When Callbacks Fire](#when-callbacks-fire-lifecycle)). |
| `resume(): this` | Same as `start()`. |
| `pause(): this` | Same as `stop()`. |
| `reset(): this` | Stops, clears completion, and sets elapsed time to 0. Does not fire callbacks. |
| `addSeconds(seconds: number): this` | Adds time (increases displayed value). May trigger tick and callbacks. |
| `subtractSeconds(seconds: number): this` | Subtracts time (decreases displayed value). May trigger tick and callbacks. |

---

### `class Clocks.CountDownClock`

Timer: starts at the given duration and counts down to 0. When remaining time reaches 0, the clock completes and `onComplete` fires.

#### Constructor

| Signature | Description |
| --- | --- |
| `new CountDownClock(durationSeconds: number, options?: CountDownOptions)` | `durationSeconds` is the initial (and, until changed, current) duration. |

#### Properties (read-only)

| Property              | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `seconds: number`     | Current remaining time in seconds (duration down to 0; returns 0 when complete). |
| `duration: number`    | The countdown duration in seconds.                                               |
| `isRunning: boolean`  | True when the clock is running.                                                  |
| `isPaused: boolean`   | True when not running and not complete.                                          |
| `isComplete: boolean` | True when the clock has reached 0.                                               |

#### Methods

| Method | Description |
| --- | --- |
| `start(): this` | Starts (or resumes) the clock. No-op if already running or complete. |
| `stop(): this` | Stops the clock and commits elapsed time. One more tick may run. |
| `resume(): this` | Same as `start()`. |
| `pause(): this` | Same as `stop()`. |
| `reset(): this` | Stops, clears completion, and sets elapsed time to 0. Does not fire callbacks. |
| `addSeconds(seconds: number): this` | Adds time to the countdown (longer until complete). |
| `subtractSeconds(seconds: number): this` | Subtracts time (sooner completion). |
| `setDuration(durationSeconds: number): this` | Sets a new duration (in seconds). Does not start or tick the clock. |

---

## How It Works

1. **Elapsed time** – While the clock is running, elapsed time is `accumulatedMs + (Date.now() - lastResumeTime)`. When stopped, the current run is added to `accumulatedMs` and the timer is cleared. So total elapsed time is preserved across start/stop/resume.
2. **Count-up value** – `seconds` = elapsed seconds (capped by `timeLimit` for CountUpClock). **Count-down value** – `seconds` = `max(0, duration - elapsed)` (0 when complete).
3. **Tick loop** – A single `_tick` run: (1) if complete, return; (2) if completion condition is met, mark complete, call `onComplete`, and do not schedule the next tick; (3) compute integer second/minute with the clock’s rounding; (4) if they changed, update last values and call `onSecond`/`onMinute`; (5) if still running, schedule the next `_tick` with `Timers.setTimeout` for `1000 - (elapsedMs % 1000)` ms so the next tick lands on a whole-second boundary. That alignment reduces drift over long runs.
4. **Deferred tick** – Start, stop, and time adjustments schedule `_tick` via `Promise.resolve().then(...)` so the tick runs in a microtask. That avoids re-entrancy and ordering issues when you start/stop/adjust in the same synchronous block.
5. **Callback errors** – Callbacks are invoked through `CallbackHandler`; sync and async errors are caught and logged and do not stop the clock.

---

## Further Reference

- [Timers module](../timers/README.md) – Used for scheduling the next tick.
- [CallbackHandler module](../callback-handler/README.md) – Used to invoke callbacks safely.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
