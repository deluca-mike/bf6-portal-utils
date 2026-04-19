# TaskProfiler Module

<ai>

The `TaskProfiler` namespace lets you **profile synchronous execution** of logical blocks and **detect tasks that did not end or pause before the next server tick** with **zero instrumentation of your timing calls**. It **monkey-patches** `Timers.setTimeout` and `Timers.clear` so they automatically track sleeping versus awake state, and when you call `endTask` it returns **Metrics**: **total CPU time** (time spent in sync work, excluding sleep) and **max sync block** (longest single continuous sync stretch), useful for spotting heavy work and regressions.

Historically, the embedded JavaScript engine enforced a tight per-synchronous-block budget (often described as on the order of ~50ms) and could **silently abort** mid-block without throwing. **After recent BF6 Portal updates, that per-block limit no longer appears to be enforced** in the same way. The profiler **keeps** the `Events.OngoingGlobal` check anyway: it still helps if that behavior returns, and it reliably surfaces **mistakes**—tasks you forgot to **`endTask`**, or **`pauseStopwatch`** when yielding only through detached timers—because those tasks remain “active” when the next tick starts.

Separately, the server still enforces a **hard cap on how long a single tick may spend in the JS VM** (see [BF6 Portal JavaScript scheduling and limits](#bf6-portal-javascript-scheduling-and-limits) below).

You keep calling `Timers.setTimeout` / `Timers.clear` as usual; you place `TaskProfiler.startTask`, `TaskProfiler.endTask`, and when needed `pauseStopwatch` / `resumeStopwatch` in the right spots. **Tracked tasks must not call `mod.Wait` anywhere in their call tree** for accurate metrics and tick-boundary detection—express delays via `Timers` so `TaskProfiler` can see yields and preserve task context.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { TaskProfiler } from 'bf6-portal-utils/task-tracker';
    import { Events } from 'bf6-portal-utils/events';
    ```
3. Optionally call `TaskProfiler.setLogging()` to attach a logger and see “did not end gracefully” messages.
4. Wrap heavy logic in a task: call `TaskProfiler.startTask(name)`, run your synchronous work (and use `Timers.setTimeout` / `Timers.clear` as you normally would), call `TaskProfiler.pauseStopwatch(taskId)` when the rest of the work runs only in detached timeouts or after microtasks you want excluded from the current block, use `resumeStopwatch` after deferred microtask work if needed, then call `TaskProfiler.endTask(taskId)` and use the returned **Metrics**.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example: Async task with microtasks

```ts
import { Events } from 'bf6-portal-utils/events';
import { TaskProfiler } from 'bf6-portal-utils/task-tracker';

// Optional: see tick-boundary and other TaskProfiler messages.
TaskProfiler.setLogging((text) => console.log(text), TaskProfiler.LogLevel.Error);

Events.OnSpawnerSpawned.subscribe(async (player: mod.Player, spawner: mod.Spawner) => {
    const taskId = TaskProfiler.startTask('AI Pathfinding Routine');

    doHeavyWork(player); // Synchronous compute

    TaskProfiler.pauseStopwatch(taskId);

    await Promise.resolve(); // Push rest of the work to the microtask queue.

    TaskProfiler.resumeStopwatch(taskId);

    doMoreHeavyWork(player); // Synchronous compute

    const metrics = TaskProfiler.endTask(taskId);

    if (metrics.maxSyncBlockMs > 40) {
        console.log(`AI Pathfinding long sync block: ${metrics.maxSyncBlockMs}ms (max sync block)`);
    }

    console.log(`AI Pathfinding total CPU: ${metrics.totalCpuTimeMs}ms`);
});
```

### Example: Fire-and-forget setup then callbacks

When the task’s synchronous phase is only “schedule some `setTimeout` callbacks” and you then return to the host (no `await`), the profiler cannot see that you have yielded—so without an explicit pause, the stopwatch would keep running until the first callback fires and would count that idle time as one long sync block. Call **`pauseStopwatch(taskId)`** after scheduling so only the setup and each callback’s work are timed.

```ts
import { Events } from 'bf6-portal-utils/events';
import { TaskProfiler } from 'bf6-portal-utils/task-tracker';
import { Timers } from 'bf6-portal-utils/timers';

function stressTest(): void {
    const taskId = TaskProfiler.startTask('StressTest');

    console.log(`Stress testing...`);

    // `Timers.setTimeout` is monkey-patched to track the task's sleeping state.
    Timers.setTimeout(() => {
        Benchmarker.run(() => {
            let x = Math.sqrt(100 * 100 + 50 * 50);
        }, 100_000);
    }, 0);

    Timers.setTimeout(() => {
        Benchmarker.run(() => {
            let x = Math.sqrt(100 * 100 + 50 * 50);
        }, 250_000);
    }, 1_000);

    Timers.setTimeout(() => {
        Benchmarker.run(() => {
            let x = Math.sqrt(100 * 100 + 50 * 50);
        }, 500_000);

        const metrics = TaskProfiler.endTask(taskId);

        adminDebugTool?.dynamicLog(`Stress test finished: ${metrics.totalCpuTimeMs}ms, ${metrics.maxSyncBlockMs}ms.`);
    }, 2_000);

    // Pause the stopwatch so time until the callbacks run is not counted as CPU time.
    TaskProfiler.pauseStopwatch(taskId);
}
```

</ai>

---

## BF6 Portal JavaScript scheduling and limits

At the **start of each server tick**, the BF6 Portal server runs a **queue of JavaScript macrotasks**. That queue includes:

- Work dispatched for **implemented event handlers** (e.g. your subscribed Portal events), and
- Code that was **deferred by `mod.Wait`** (continuations scheduled after the wait completes).

After **each** macrotask runs, the engine **drains the microtask queue** (work scheduled via mechanisms such as `Promise` callbacks—most of it typically produced during the macrotask that just finished). It then moves on to the **next** macrotask unless the macrotask queue is empty.

This whole pipeline **blocks the server**. The longer JS work takes per tick, the more **server “framerate”** suffers.

If **one tick** spends **more than about 5000ms** processing JS VM work in total, the server **abruptly aborts** JS for that tick: it emits **a single error** in the **admin log**. That message **incorrectly refers to a 1000ms “frame” limit** even though the observed threshold is **~5000ms**. After that abort, the server **stops running any further JavaScript for the rest of the match**.

This is independent of `TaskProfiler`’s per-tick “active task” check, which only inspects whether a profiled task was still considered active when `OngoingGlobal` fires at the beginning of a tick.

---

## Core Concepts

- **Did not end before next tick** – At the start of each tick, `Events.OngoingGlobal` runs with a clean stack (`currentTaskId` cleared). Any task still marked **active** (synchronous work in progress, with no pending tracked timer putting it to sleep) is assumed to have been **cut off by the host** and/or **not ended or paused by you**. `TaskProfiler` logs that case, then removes the task and its associated timeout bookkeeping.
- **Active vs sleeping** – A task is **active** while it is running synchronous code (stopwatch running). When it schedules work via **`Timers.setTimeout`** while a task is current, `TaskProfiler` marks the task as **sleeping** until callbacks fire or timers are cleared, so the next tick’s check does not treat it as stuck. When pending timeouts complete or are cleared, the task returns to active as appropriate.
- **Zero-instrumentation timers** – You keep calling `Timers.setTimeout` / `Timers.clear` like normal. `TaskProfiler` monkey-patches those functions so that, when a task is active, timeouts are associated with the current task and sleeping/awake state stays consistent.
- **No `mod.Wait` in tracked tasks** – Inside any task you plan to profile (including deep helpers), do **not** call `mod.Wait`. Express delays via `Timers` instead. `mod.Wait` is invisible to `TaskProfiler` (it is not monkey-patched), which breaks both timing and tick-boundary detection. (Deferred `mod.Wait` continuations still run as macrotasks at the engine level; the profiler simply does not attribute them to your task.)
- **Metrics** – `endTask(taskId?)` returns **`totalCpuTimeMs`** and **`maxSyncBlockMs`**. The latter is the longest single continuous synchronous stretch while the stopwatch was running—valuable for finding hotspots whether or not a strict ~50ms per-block abort is in effect on your build.
- **Explicit pause / resume** – For “setup then callbacks,” call **`pauseStopwatch`**. After **`await Promise.resolve()`** (or similar), call **`resumeStopwatch`** so time spent in other microtasks is not folded into your block. For pure microtask deferral without pausing, the stopwatch can absorb unrelated microtask time; see the async guide below.
- **Nested tasks** – `startTask` records the current task as the new task’s `parentId` and makes the new task current. `endTask` pops back to the parent when ending the current task.
- **Passive observer** – `TaskProfiler` does not cancel timers when you call `endTask()`; callbacks still run. Cancel via `Timers.clear` / `Timers.clearTimeout` as usual.
- **Events dependency** – The module subscribes to `Events.OngoingGlobal`. Use the [Events module](../events/README.md) for all game event subscription; do not implement or export Portal event handlers yourself.

---

## The Async Execution & Telemetry Guide

Portal’s embedded JS runs under **per-tick scheduling** (macrotask queue with microtask queue draining between each macrotask) and a **~5000ms per-tick catastrophe limit** as described above. A **per-synchronous-block** watchdog around ~50ms **may no longer apply** on current servers; **`maxSyncBlockMs`** remains the right signal for “how long did we hog the thread without yielding through a tracked path.”

How you schedule async work still affects **telemetry accuracy** and **whether the profiler can attribute work to a task**. The `Timers` patch gives “zero-instrumentation” tracing for timeout-based yields; other patterns need explicit `pauseStopwatch` / `resumeStopwatch` or child tasks.

---

#### 1. `Timers.setTimeout` & `Timers.setInterval`

- **Recommendation:** ✅ **Preferred for delays inside profiled code**
- **Why (Engine context):** Schedules a **macrotask**; yields clearly from the profiler’s perspective when combined with the monkey-patch.
- **Telemetry:** **Accurate** for sleep vs sync when the task is current at schedule time.
- **How to track:** Works out of the box; ensure the task is active when the timer is created.

---

#### 2. Awaited `mod.Wait()`

- **Recommendation:** ❌ **Avoid inside profiled tasks**
- **Why (Engine context):** Engine-level delay; continuation runs as a **macrotask** later, but `TaskProfiler` does not see the yield.
- **Profiler impact:** **False positives** on tick boundaries (looks like the task never slept). **Over-counted** CPU metrics if the stopwatch stays on across the wait.
- **How to track:** Refactor profiled paths to `Timers.setTimeout`.

---

#### 3. Fire-and-forget `mod.Wait(x).then(...)`

- **Recommendation:** ❌ **Avoid for profiled flows**
- **Why (Engine context):** Schedules macrotasks without timer handles `TaskProfiler` can own.
- **Profiler impact:** **False negatives** if the parent task already ended; **under-counted** CPU for work inside `.then()`.
- **How to track:** Prefer `Timers.setTimeout`, or call `startTask` / `endTask` inside the `.then()` for that segment.

---

#### 4. Awaited pure JS Promises (`await Promise.resolve()`, `await new Promise`)

- **Recommendation:** ⚠️ **Use with `pauseStopwatch` / `resumeStopwatch` when profiling**
- **Why (Engine context):** Microtasks drain before the next macrotask; still the same tick from the server’s point of view until macrotask work finishes.
- **Profiler impact:** Without pausing, the stopwatch can **over-count** time spent in **other** microtasks queued ahead of yours.
- **How to track:** Pause before `await`, resume after, as in the example above.

---

#### 5. Fire-and-forget pure JS Promises (`Promise.resolve().then(...)`, etc.)

- **Recommendation:** ✅ **Situational**
- **Why (Engine context):** Defers work to the end of the current macrotask’s microtask draining.
- **Profiler impact:** If the parent task already called `endTask`, deferred work is **not** attributed unless you start a **child** task inside `.then()`.
- **How to track:** `const childId = TaskProfiler.startTask('Deferred Logic')` … `endTask(childId)` inside the callback.

---

## API Reference

### `namespace TaskProfiler`

The namespace is not instantiated; all members are static.

#### `TaskProfiler.LogLevel`

A re-export of the `Logging.LogLevel` enum for use with `TaskProfiler.setLogging()`.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages.
- `Error` (3) – Error messages. Includes “did not end gracefully before the next tick.” Least verbose.

For more details, see the [Logging module documentation](../logging/README.md).

#### `TaskProfiler.Metrics`

Returned by `endTask()`. Describes how much time the task spent in synchronous work.

| Property | Type | Description |
| --- | --- | --- |
| `totalCpuTimeMs` | `number` | Total milliseconds the task spent in synchronous code while the stopwatch was running (sleeping on tracked timers is excluded). |
| `maxSyncBlockMs` | `number` | Longest single continuous synchronous stretch (ms) recorded for the task—useful for spotting heavy blocks and regressions. |

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Attaches a logger and sets the minimum log level and whether to include the runtime error in logs. Pass `undefined` for `log` to disable logging. See the [Logging module documentation](../logging/README.md). |
| `startTask(name: string): number` | Starts tracking a logical block. Returns a unique `taskId`. Any `Timers.setTimeout` / `Timers.clear` calls made while this task is current are associated with it. |
| `endTask(taskId?: number): Metrics` | Stops tracking. If `taskId` is omitted, ends the **current** task. Returns **Metrics**, or zeroed metrics if the task was missing or already ended. Does **not** cancel pending timeouts. Restores `currentTaskId` to the ended task’s parent when ending the active task. |
| `pauseStopwatch(taskId?: number): void` | Pauses the sync stopwatch without flushing metrics to `totalCpuTimeMs` / `maxSyncBlockMs`. Use when yielding via detached `setTimeout` or before `await` on a pure Promise so idle or foreign microtask time is not counted. Defaults to the current task. |
| `resumeStopwatch(taskId?: number): void` | Resumes the stopwatch after a pause (e.g. after `await Promise.resolve()`). No-op if the task is missing or the stopwatch is already running. Defaults to the current task. |

---

## Usage Patterns

- **Logical task boundaries** – A task should represent one contiguous logical block. For recurring work, start/end inside each callback rather than wrapping a whole `setInterval` in one task.
- **Zero-instrumentation timers** – Keep using `Timers.setTimeout` / `Timers.clear`. When a task is active, those calls are tracked; when no task is active, behavior matches the Timers module.
- **Nested tasks** – Start a child task inside a parent to profile sub-phases; `endTask` pops the stack correctly when ending the current task.
- **Tick-boundary logging** – Use `setLogging()` so you see when a task was still active at tick start (forgotten `endTask` / missing `pauseStopwatch`, or host abort if that behavior returns).
- **Long sync blocks** – Use `metrics.maxSyncBlockMs` to spot expensive synchronous stretches; tune thresholds to your needs (e.g. warn when &gt; 40ms) even though a hard ~50ms kill may not be present on all server versions.
- **Pause after “setup then callbacks”** – After scheduling timeouts and returning, call `pauseStopwatch(taskId)` so idle time before callbacks is not one giant “block.”
- **Avoid `mod.Wait` in profiled paths** – Keeps metrics and tick-boundary state accurate.

---

## How It Works

1. **Task state and stack** – Each task has a name, `parentId`, `pendingAsyncOps`, `timeoutIds`, a sync stopwatch, accumulators, and **metrics**. **activeTasks** vs **sleepingTasks** partition running vs waiting-on-timeout state. **`currentTaskId`** is the top of the logical stack.

2. **Sync-block stopwatch** – `flushSyncBlock` (on `endTask`, end of patched timeout callback, etc.) adds accumulated sync time to `totalCpuTimeMs` and updates `maxSyncBlockMs`. **`pauseStopwatch`** stops the clock without flushing; **`resumeStopwatch`** restarts it.

3. **OngoingGlobal** – At the start of each tick the handler clears **`currentTaskId`**, then removes any task still in **activeTasks**, logging **did not end gracefully before the next tick**, and cleans timeout maps. That catches host cutoffs (if they return) and user mistakes (missing `endTask` / `pauseStopwatch`).

4. **`Timers.setTimeout` patch** – When a task is current, the timeout is tied to that task (`pendingAsyncOps`, `timeoutIds`). The wrapper callback restores `currentTaskId`, runs user code, then moves the task back to sleeping if it still exists.

5. **`Timers.clear` patch** – Keeps `pendingAsyncOps` and active/sleeping sets consistent when a timer is cleared.

6. **`startTask` / `endTask`** – Create/pop tasks and maintain `currentTaskId` and parent chain.

---

## Known Limitations & Caveats

- **Events module required** – You must use the [Events module](../events/README.md). Subscription order can affect ordering relative to other `OngoingGlobal` handlers.

- **`endTask` does not cancel timeouts** – Pending timeouts still fire; cancel with `Timers.clear` / `Timers.clearTimeout`.

- **One `taskId` per logical flow** – Sharing one id across unrelated async flows can corrupt state.

- **No `mod.Wait` in profiled tasks** – Breaks metrics and tick-boundary detection; use `Timers` on those paths.

- **Yield without timeouts** – If you schedule timeouts and return, call **`pauseStopwatch`** or the idle gap is counted as sync time.

- **Logging is optional** – Tick-boundary messages require `setLogging()` with a valid logger.

---

## Further Reference

- [Events module](../events/README.md) – `OngoingGlobal` subscription.
- [Timers module](../timers/README.md) – Underlying timeout implementation patched by `TaskProfiler`.
- [Logging module](../logging/README.md) – Diagnostic messages.
- [Benchmarker module](../benchmarker/README.md) – Local benchmarking; `TaskProfiler` for production-style profiling and tick-boundary detection.
- [bf6-portal-bundler](https://www.npmjs.com/package/bf6-portal-bundler) – Bundler for Portal mods.

---

## Feedback & Support

This module is under **active development**. If you need different semantics, additional async wrappers, or integration with other profiling tools, open an issue or reach out through the project channels.

---
