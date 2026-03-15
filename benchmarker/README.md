## Benchmarker Module

<ai>

The `Benchmarker` namespace provides tiny, focused helpers for **measuring how long pure JavaScript work takes to run** inside Battlefield Portal’s QuickJS runtime. It lets you answer questions like “How many times can I safely run this loop in 10ms?” or “Roughly how expensive is this function per call?” without having to wire up your own timing loops.

**Important:** The module is designed for **local benchmarking and experimentation**, not for production in-game code paths. You should use it in isolated test mods, in small debug harnesses, or during development when tuning algorithms—then bake the insights into your final design.

Because timing inside a live server can be noisy (tick scheduling, other scripts, engine load), treat these tools as **directional**: use them to compare alternatives and to find safe budgets, not to guarantee exact numbers.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Benchmarker } from 'bf6-portal-utils/benchmarker';
    ```
3. Use `run()` / `runAsync()` to measure **total elapsed milliseconds** for a function across `iterations`.
4. Use `findMaxIterations()` / `findMaxIterationsAsync()` to determine **how many times** a function can safely run within a time budget (e.g. 10ms).
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example: Comparing Two Implementations

```ts
import { Benchmarker } from 'bf6-portal-utils/benchmarker';

function implementationA(): void {
    // Some pure-JS logic
}

function implementationB(): void {
    // Alternative pure-JS logic
}

export async function OnGameModeStarted(): Promise<void> {
    const iterations = 10_000;

    const totalMsA = Benchmarker.run(implementationA, iterations);
    const totalMsB = Benchmarker.run(implementationB, iterations);

    const perOpA = totalMsA / iterations;
    const perOpB = totalMsB / iterations;

    mod.Trace(`A: ${perOpA.toFixed(4)} ms/op, B: ${perOpB.toFixed(4)} ms/op`);
}
```

### Example: Finding a Safe Per-Tick Budget

```ts
import { Benchmarker } from 'bf6-portal-utils/benchmarker';

function expensiveWork(): void {
    // Pure-JS work you might want to do per player, per tick
}

export async function OnGameModeStarted(): Promise<void> {
    // Roughly, how many times can we run this in ~5ms?
    const safeIterations = Benchmarker.findMaxIterations(expensiveWork, 5, 100);

    mod.Trace(`Safe iterations in 5ms window: ${safeIterations}`);
}
```

### Example: Async Benchmarking (Pure Promises Only)

```ts
import { Benchmarker } from 'bf6-portal-utils/benchmarker';

async function purePromiseWork(): Promise<void> {
    // NOTE: This must NOT call `mod.Wait()` or `Timers.setTimeout()`
    await Promise.resolve();
}

export async function OnGameModeStarted(): Promise<void> {
    const iterations = 1_000;
    const totalMs = await Benchmarker.runAsync(purePromiseWork, iterations);
    const perOp = totalMs / iterations;

    mod.Trace(`Async work: ${perOp.toFixed(4)} ms/op (pure Promise version)`);
}
```

</ai>

---

## Core Concepts

- **Total time, not per-op only** – Each helper returns the **total** elapsed milliseconds for all iterations in the benchmark. You compute per-operation cost by dividing by `iterations`.
- **Tight loops** – `run()` and `runAsync()` execute your function in a simple `for` loop; `findMaxIterations()` and `findMaxIterationsAsync()` repeatedly run your function until a target time budget is reached.
- **Pure JavaScript work only** – Async helpers must not call `mod.Wait()` or `Timers.setTimeout()` (or anything that ultimately yields to the engine). Those APIs are frame-aligned and introduce large, quantized delays that completely invalidate timing measurements.
- **Relative measurements** – Use these tools to **compare** algorithms (A vs B) and to find “roughly safe” budgets (e.g. 5ms of work per tick), not to guarantee exact millisecond timings on every server.
- **Batching to reduce overhead** – The `findMaxIterations*` helpers use a `batchSize` parameter to run multiple executions between clock checks, reducing the overhead of `Date.now()` in very tight loops.

---

## API Reference

### `namespace Benchmarker`

The namespace is not instantiated; all members are static.

#### Static Functions

| Function | Description |
| --- | --- |
| `run(fn: () => void, iterations?: number): number` | Profiles a **synchronous** function by running it `iterations` times in a tight loop and returning the **total elapsed milliseconds**. Defaults to `iterations = 1`. Divide the returned value by `iterations` to compute per-operation cost. |
| `runAsync(fn: () => Promise<void> \| void, iterations?: number): Promise<number>` | Profiles an **asynchronous** function that uses **pure JavaScript Promises only** (no `mod.Wait`, no `Timers.setTimeout`). Runs the function `iterations` times and returns a promise that resolves to the **total elapsed milliseconds**. Because this uses `await` inside the loop, it naturally drains microtasks between iterations. |
| `findMaxIterations(fn: () => void, targetMs?: number, batchSize?: number): number` | Determines how many times a **synchronous** function can be executed within a given time budget. Runs `fn` in batches of `batchSize` iterations and checks the clock between batches until the elapsed time reaches `targetMs`. Returns the **total number of iterations** completed. Defaults: `targetMs = 10`, `batchSize = 100`. |
| `findMaxIterationsAsync(fn: () => Promise<void> \| void, targetMs?: number, batchSize?: number): Promise<number>` | Async variant of `findMaxIterations` for **pure-Promise** functions (no `mod.Wait`, no `Timers.setTimeout`). Runs `fn` in batches of `batchSize` and checks elapsed time between batches until reaching `targetMs`. Returns the **total number of iterations** completed. Defaults: `targetMs = 10`, `batchSize = 100`. |

---

## Usage Patterns

- **Compare algorithm choices** – Use `run()` or `runAsync()` to compare two or more implementations under the same `iterations` count. Prefer high `iterations` (e.g. thousands) so that noise averages out.
- **Estimate safe per-tick work** – Use `findMaxIterations()` with a budget that matches your target per-tick budget (e.g. 3–10ms) to see how many times you can safely run a function. This helps size loops in `OngoingPlayer` or `OngoingGlobal` handlers.
- **Guardrails for hot paths** – Once you know a safe iteration count, you can enforce a cap in your production logic (e.g. limit the number of entities processed per tick).
- **Local tuning tools** – Build small, dedicated benchmark scenes or mods that import `Benchmarker`, measure candidate algorithms, and log results to your logger or `mod.Trace`. Then hard-code the chosen approach in your real game mode.

---

## Known Limitations & Caveats

- **Do not benchmark `mod.Wait` or `Timers.setTimeout`** – Any function that yields to the engine (directly or indirectly) will stall until the next server tick (~33ms), turning a microbenchmark into a “count how many frames passed” test. This is why the async helpers explicitly warn against using `mod.Wait` or `Timers.setTimeout` in the callback.
- **Server variability** – Results can vary between runs and between servers depending on load, other scripts, and engine scheduling. Use the numbers as **guides**, not strict guarantees.
- **Blocking work only** – Benchmarks only measure the time spent in the function body plus any pure-JS work it calls. They do not capture time waiting on engine I/O or network.
- **No built-in logging** – This module intentionally does not depend on the Logging or Logger modules. You are responsible for logging or displaying results.

---

## Further Reference

- [Timers module](../timers/README.md) – For production-grade, cancellable `setTimeout`/`setInterval` behavior built on top of `mod.Wait`.
- [Performance Stats module](../performance-stats/README.md) – For monitoring server tick rate and script lag in live games, and for compute scaling based on real-time health factors.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler used to package mods for Portal.

---

## Feedback & Support

This module is intentionally small and focused; if you need additional helpers (e.g. percentile estimators, warmup phases, or simple result aggregators), please open an issue or reach out through the project channels. Real-world benchmark use cases—especially for large-scale AI, physics-like systems, or complex UI—are very helpful in shaping future additions.

---
