# SolidUISOA Module

<ai>

This TypeScript `SolidUISOA` namespace provides a high-performance, **Structure-of-Arrays (SoA)** reactive UI framework for Battlefield Portal, inspired by [SolidJS](https://github.com/solidjs/solid).

While maintaining an ergonomic, object-oriented API for users (`createSignal`, `createEffect`, `createMemo`, `createStore`, `h`, `Index`), the internal engine is backed entirely by pre-allocated, flat TypedArray buffers, bit-packed flags, and intrusive free-lists.

`SolidUISOA` is a drop-in, 100% backward-compatible alternative to [`SolidUI`](../solid-ui/README.md).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { SolidUISOA as SolidUI } from 'bf6-portal-utils/solid-ui-soa';
    import { UI } from 'bf6-portal-utils/ui';
    ```
3. Create reactive signals with `SolidUI.createSignal()`.
4. Use `SolidUI.h()` to create UI components with reactive properties.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

---

## Core Architecture & Structure of Arrays (SoA)

Unlike traditional reactive engines that allocate a new JavaScript class instance (`new Subscriber()`, `new SignalState()`) for every reactive node, `SolidUISOA` stores all reactive metadata in contiguous flat buffers:

### 1. Subscriber Buffers (`MAX_SUBSCRIBERS = 4,096`)

- `_subFlags` (`Uint8Array`): Bitflags (`FLAG_IN_USE`, `FLAG_PENDING`, `FLAG_DISPOSED`).
- `_subDeferTicks` (`Uint16Array`): Coalescing window in logical ticks.
- `_subTargetTick` (`Uint32Array`): Target logical tick for scheduler execution.
- `_subDepCount` (`Uint16Array`): Dependency cursor for zero-allocation $O(1)$ re-runs.
- `_subFree` (`Int16Array`): Intrusive free-list linked slots.
- `_subFn` (`Array<Function>`): Effect callback pointers.
- `_subDeps` (`Array<number[]>`): Signal slot IDs tracked by this subscriber.
- `_subCleanups` (`Array<Function[]>`): Local cleanup callbacks.

### 2. Signal Buffers (`MAX_SIGNALS = 8,192`)

- `_sigFlags` (`Uint8Array`): Bitflags (`FLAG_IN_USE`).
- `_sigFree` (`Int16Array`): Intrusive free-list linked slots.
- `_sigValues` (`Array<unknown>`): Current reactive state values.
- `_sigSubs` (`Array<number | number[] | null>`): Subscribed Subscriber slot IDs (polymorphic unboxed).

### 3. Flat Schedulers

- `_immediateQueue` (`Int16Array`) and `_deferredQueue` (`Int16Array`): Flat integer queues that eliminate heap array resizing during microtask and deferred tick dispatch.

---

## Quantitative Comparison: `SolidUISOA` vs `SolidUI`

| Metric | `SolidUI` (Object Model) | `SolidUISOA` (Structure of Arrays) |
| :-- | :-- | :-- |
| **Node Representation** | Class instances (`new SignalState()`, `new Subscriber()`) | Integer Slot IDs (`_id: number`) |
| **Flags & Timers** | Property fields on objects | Bitflags in `Uint8Array` + `Uint32Array` |
| **Scheduler Queues** | Array of object references (`Subscriber[]`) | Flat `Int16Array` integer indices |
| **Disposal & Teardown** | Sweeps JS object instances via GC | **0 GC sweeps** (recycled on intrusive free-list) |
| **Steady-State Update Churn** | **0 bytes** (via generation cursor) | **0 bytes** (via generation cursor) |
| **Upfront Static Heap Memory** | **$0\text{ KB}$** (on-demand) | **$\approx 80\text{ KB}$** (pre-allocated flat buffers) |
| **Best Used For** | Static HUDs / small mods ($< 100$ total signals) | Dynamic UIs, scrolling lists, and heavy spawn grids |

---

## Tunable Constants & Capacity Sizing

The following constants can be adjusted at the top of [`solid-ui-soa/index.ts`](index.ts) based on your mod's scale and memory budget:

- **`SolidUISOA.MAX_SUBSCRIBERS` (Default: `4_096`):** Maximum number of concurrent subscribers (effects, memos, and reactive property bindings).
    - _Memory:_ Allocates $\approx 14\text{ bytes}$ of TypedArray memory per slot.
- **`SolidUISOA.MAX_SIGNALS` (Default: `8_192`):** Maximum number of concurrent reactive signals supported across components and stores.
    - _Memory:_ Allocates $\approx 10\text{ bytes}$ of TypedArray memory per slot.
- **`SolidUISOA.MAX_EXECUTIONS_PER_FLUSH` (Default: `1_000`):** Maximum number of subscriber executions allowed in a single microtask flush loop.
- **`SolidUISOA.MAX_FLUSHES_PER_TICK` (Default: `1_000`):** Maximum number of microtask flushes permitted within a single logical engine tick.

---

## Memory & Performance Benchmarking

Run the automated profiling suite to inspect heap deltas, per-item byte footprints, and GC pause metrics:

```bash
npm run test:memory:soa
```

To compare against the dynamic object implementation:

```bash
npm run test:memory
```

---

## Further Reference

- [`SolidUI` Module Documentation](../solid-ui/README.md) – Dynamic object-oriented reactive module.
- [`UI` Module Documentation](../ui/README.md) – Data-oriented UI widget helper.
- [`SAVINGS.md`](../SAVINGS.md) – Memory optimization analysis across Portal modules.
