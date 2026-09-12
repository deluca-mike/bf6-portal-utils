# Memory & Garbage Collection Optimization Report: `bf6-portal-utils`

## Executive Summary

Between commit `a5d26bc3396a09fa2ff8d493675c1d27a0b6cabd` and commit `9f25210a837f6f5a725a7c3d22bb8776dec5ee80`, `bf6-portal-utils` underwent a comprehensive architectural overhaul. The library transitioned from classical Object-Oriented Programming (OOP) patterns—characterized by dynamic property delegation via `Object.defineProperty`, deep closure state capture, `Map`/`Set` collections, `Promise` microtask loops, and runtime fuzzy geometric searches—to high-performance **Data-Oriented Design (DOD)** and **Structure of Arrays (SoA)** backed by flat `TypedArrays`, intrusive free-lists, and generation-encoded handles.

In resource-constrained embedded runtimes (such as QuickJS in Battlefield Portal), Garbage Collection (GC) sweeps can cause noticeable frame drops and simulation jitter. The primary objective of this refactor was not merely to reduce static memory footprint, but to **starve the Garbage Collector**: ensuring that steady-state operations (clock updates, UI layout passes, button clicks, event dispatching, multi-click tracking, raycasting, reactive signal graph mutations, and timer executions) allocate **0 bytes of heap garbage**.

---

## 1. Clocks Module

### Architecture Evolution

- **Pre-Refactor (v1.1.0, Object-Oriented)**: Dynamically instantiated class instances for each countdown or count-up clock. Each clock retained 11 instance properties, a bound `_tick` arrow function closure, and an isolated `Timers.setTimeout` subscription.
- **Post-Refactor (v2.0.0, Data-Oriented SoA)**: Fully static Structure of Arrays backed by contiguous `TypedArrays`, intrusive free-list slot allocation, generation-encoded `ClockID` handles, and a single shared tick scheduler.

### Memory & Allocation Breakdown

#### Pre-Refactor (`v1.1.0`)

- **Object Header & Hidden Class Descriptor**: ~24 bytes
- **11 Instance Properties**: ~88 bytes
- **Bound `_tick` Arrow Function / Closure**: ~80–100 bytes
- **Dedicated Timer Allocation**: Individual `Timers.setTimeout` closure + internal timer registration: ~120 bytes
- **Marginal Cost per Active Clock**: **~330 bytes**
- **At 256 Running Clocks**: **~84.4 KB** of dynamically expanding heap memory

#### Post-Refactor (`v2.0.0`)

Allocations are fixed and pre-allocated upfront across `MAX_CLOCKS = 256` slots:

- `_flags` (`Uint8Array`): 1 byte/slot (256 B)
- `_generations` (`Uint16Array`): 2 bytes/slot (512 B)
- `_accumulatedMs` (`Uint32Array`): 4 bytes/slot (1,024 B)
- `_lastResumeTime` (`Uint32Array`): 4 bytes/slot (1,024 B)
- `_limits` (`Uint32Array`): 4 bytes/slot (1,024 B)
- `_lastIntegerSecond` (`Int16Array`): 2 bytes/slot (512 B) _(Intrusive free-list when inactive; last reported second when active)_
- `_onSecond`, `_onMinute`, `_onComplete` (`3x Array`): ~24 bytes/slot (6,144 B)
- **Marginal Cost per Clock Slot**: **41 bytes**
- **Total Resident Pool Memory (256 Clocks)**: **~10.5 KB** _(87.5% memory reduction)_

### Steady-State & GC Performance

- **Zero-Allocation Execution**: Creating, running, pausing, or completing 100 clocks generates **0 bytes** of heap garbage. Operations modify flat numerical buffers in place.
- **Shared Tick Scheduler**: A single timer loop calculates the exact delta to the nearest integer second boundary across all active clocks (`closestNextMs = 1000 - (elapsed % 1000)`), eliminating per-clock timer churn.
- **Generation Safety**: `ClockID` encodes the generation (`id = index + generation * 10,000`), preventing stale references or ABA recycling hazards.

---

## 2. UI Modules

### Architecture Evolution

- **v8.0.0 (Pre-Refactor)**: Heavy OOP with per-instance dynamic property descriptors via `Object.defineProperty`, duplicate property caching across composite layers, multi-closure unregister callbacks, and mock parent wrapper allocations.
- **v9.0.0 (Prototype Refactor)**: Statically delegated prototypes; eliminated redundant in-memory property caches; introduced swap-and-pop children arrays.
- **v10.0.0 (Current: SoA Core with Thin OOP Handles)**: Pre-allocated Structure of Arrays (TypedArrays) backing a singly-linked Left-Child Right-Sibling (LCRS) tree, bit-packed button slot indexing, coordinate caching, zero unregister closures, and lightweight OOP class handles with internal ID nullification on disposal.

### Memory Allocation Breakdown

#### Pre-Refactor (`v8.0.0`)

Creating a single composite button (e.g. `UIWeaponImageButton`) caused an explosion of heap allocations:

- **`UI.delegateProperties`**: Iterated over 16 delegated properties per button. For _each_ property, `Object.defineProperty` allocated:
    - 1 Property Descriptor object (`~48 bytes`)
    - 1 `get()` closure function (`~56 bytes`)
    - 1 `set()` closure function (`~56 bytes`)
    - 1 fluent setter method closure (`~56 bytes`)
    - _Dynamic Delegation Subtotal:_ **16 × ~216 bytes = ~3,456 bytes** of closures and descriptor objects per button.
- **Duplicate In-Memory Property Caching**: Across `Element`, `UIButton`, and `UIWeaponImageButton`, **65+ property slots and vector objects** were retained on the JS heap (~800 bytes).
- **Collection & Temporary Allocations**: `_inputModeRequesters` (`Set<Element>`), `mockParent` wrapper objects, and unregister closures (~600 bytes).
- **Pre-Refactor Total**: **~5,000 bytes (~5.0 KB)** and **~50 distinct heap objects/closures** per button.

#### Current SoA Core + Thin Handles (`v9.0.0`)

- **Element SoA Buffers (`MAX_ELEMENTS = 2,048`)**:
    - `_flags` (`Uint8Array`): 2,048 B (bit-packed `FLAG_IN_USE`, `FLAG_VISIBLE`, `FLAG_HAS_INPUT_MODE`, `FLAG_UI_INPUT_MODE_WHEN_VISIBLE`)
    - `_generations` (`Uint16Array`): 4,096 B
    - `_parents`, `_firstChild`, `_nextSibling` (`3x Int16Array`): 12,288 B (LCRS hierarchy tree; `_nextSibling` acts as intrusive free-list)
    - `_x`, `_y`, `_width`, `_height` (`4x Float32Array`): 32,768 B (cached coordinates eliminate `mod.GetUIWidgetPosition()` temporary vector garbage)
    - `_nativeWidgets`, `_receivers`, `_instances` (`3x Array`): 49,152 B
    - _Element SoA Subtotal:_ **~96.3 KB** fixed resident memory.
- **Button SoA Buffers (`MAX_BUTTONS = 512`)**:
    - `_generations` (`Uint16Array`): 1,024 B
    - `_nextFreeButton` (`Int16Array`): 1,024 B (intrusive free-list)
    - `_elementToButtonSlot` (`Int16Array(2048)`): 4,096 B (O(1) mapping)
    - 4 handler arrays (`_buttonOnClickUp`, `_buttonOnClickDown`, `_buttonOnFocusIn`, `_buttonOnFocusOut`): 16,384 B
    - _Button SoA Subtotal:_ **~22.5 KB** fixed resident memory.
- **Single Lightweight JS Handle Object**:
    - Each widget handle contains only its inherited prototype and `_id: number` (**~24 bytes** on the JS heap).
    - 0 per-instance property descriptors, 0 vector allocations, 0 unregister closures.

### Scaling Comparison

| Metric / Aspect | Pre-Refactor (`v8.0.0`) | Current SoA + Handle (`v9.0.0`) | Total Improvement |
| :-- | :-- | :-- | :-- |
| **Heap Objects & Closures per Button** | **~50 objects** | **1 tiny handle (0 closures)** | **~98% reduction** |
| **Retained Instance Fields** | **65+ fields** | **1 field (`_id`)** | **~98.5% reduction** |
| **Marginal Memory per Widget Instance** | **~5,000 bytes (~5.0 KB)** | **~24 bytes (~0.024 KB)** | **~99.5% Savings (~208x lighter)** |
| **Small Inventory Menu (20 Buttons)** | ~100 KB | ~0.48 KB | **~99.5 KB saved** |
| **Full Loadout / Spawn Grid (64 Buttons)** | ~320 KB | ~1.54 KB | **~318.5 KB saved** |
| **Per-Player HUDs across 16 Players (256 Buttons)** | **~1,280 KB (~1.28 MB)** | **~6.14 KB (~0.006 MB)** | **~1.27 MB saved** |

---

## 3. Logger Module

### Architecture Evolution

- **Pre-Refactor (`0f0e340a`)**: Dynamic 20-row scrolling console that destroyed the top `UIContainer` row (and all child `UIText` widgets) on every new log line, instantiated a new row, and recalculated character widths using string splits, reducer closures, and temporary array literals.
- **Post-Refactor (`v4.0.0`, `8ef59030`)**: In-place container recycling, direct ASCII character measurement table, and in-place `UIText` property mutations.

### Memory & Allocation Breakdown (20-Row Window, 64-Char Average Line)

#### Pre-Refactor: Cost of Logging 1 New Line

1. **Character Measurement Churn**:
    - Every character checked 22 `['...'].includes(char)` array literals (~700 temporary array literals allocated per line).
    - `part.split('').reduce(...)` allocated 22 string arrays and 22 reducer closures.
    - _Measurement Churn:_ **~750 temporary heap objects (~35 KB garbage per line)**.
2. **Widget Destruction & Recreation Churn**:
    - Destroyed top `UIContainer` and 22 child `UIText` instances (**23 C++ engine widgets destroyed**).
    - Instantiated 1 new `UIContainer` and 22 new `UIText` instances (**23 brand-new C++ engine widgets created**).

#### Post-Refactor: Cost of Logging 1 New Line

1. **Zero-Allocation Layout Engine**:
    - Character widths are read directly via `Logger._CHAR_WIDTHS_TENTHS[code]` (`Uint8Array(128)`) in a fast `for` loop (**0 arrays, 0 strings, 0 closures allocated**).
2. **Container Recycling**:
    - The top `UIContainer` row is shifted from the array and moved to the bottom (`row.y = bottomY`). **0 containers created or destroyed**.
3. **In-Place `UIText` Child Reuse**:
    - Existing child `UIText` widgets in the recycled row are updated in place (`message`, `x`, `width`, `visible = true`). **0 `UIText` widgets created or destroyed**.

### Scaling Comparison: 10 Log Lines / Second (Debug Trace)

| Metric | Pre-Refactor (`0f0e340a`) | Post-Refactor (`v4.0.0`) | Improvement |
| :-- | :-- | :-- | :-- |
| **Native Widgets per Full Window** | 460 widgets | 340 widgets | **26.1% fewer widgets** |
| **Resident JS Heap** | ~55.4 KB | ~41.1 KB | **~14.3 KB saved (26%)** |
| **Temporary JS Objects Allocated per Line** | ~780 objects | **0 objects** | **100% eliminated** |
| **GC Garbage Generated per Line** | ~35 – 45 KB | **0 bytes** | **100% eliminated** |
| **Native C++ Widgets Created/Destroyed per Line** | 23 widgets | **0 widgets** | **100% eliminated** |
| **Heap Garbage Generated at 10 lines/sec** | **~400 KB / sec** | **0 KB / sec** | **Complete starvation of GC** |
| **Native Engine Widget Churn at 10 lines/sec** | 230 creates + 230 destroys/sec | **0 creates/destroys** | **Zero UI draw call churn** |

---

## 4. Events Module

### Architecture Evolution

- **Pre-Refactor (v1.0.0)**: Dynamic wrapper objects generated at runtime for each event key (`EventsImplementation[key] = { subscribe: () => ..., unsubscribe: () => ..., trigger: () => ..., handlerCount: () => ... }`), `Map<TypeValue, State>` lookups, `Set<AllHandlers>` collections, and rest parameter array allocations on every trigger.
- **Post-Refactor (v1.7.0)**: `EventChannel<K>` class with prototype methods, copy-on-write flat handler arrays (`Handler[] | null`), direct property linking (`(type as TriggerWithChannel)._channel`), and non-allocating positional 4-argument dispatch (`trigger(a, b, c, d)`).

### Memory & Allocation Breakdown

#### Pre-Refactor (`v1.0.0`)

- **Upfront Wrapper Closures**: 60+ event types $\times$ 4 dynamic methods = **240+ closures** allocated and retained on the heap.
- **State Collections**: `Map<TypeValue, State>` with dynamic bucket allocations + `Set<Handler>` per event.
- **Per-Trigger Rest Parameter Array**: `trigger(...args)` allocated a new Array instance on **every single event trigger**.
- **Per-Trigger Set Iterator**: `for (const handler of state.handlers)` instantiated a `SetIterator` object on every trigger invocation.
- _High-Frequency Impact:_ In a 64-player server, `OngoingPlayer` (fired 30–60 Hz $\times$ 64 = ~3,840 Hz) and `OngoingGlobal` (30–60 Hz) produced **~4,000 array and iterator allocations per second**, generating megabytes of GC churn per minute.

#### Post-Refactor (`v1.7.0`)

- **Zero Per-Event Closures**: `EventChannel` methods (`subscribe`, `unsubscribe`, `trigger`, `handlerCount`) reside on the class prototype.
- **Copy-on-Write Flat Arrays**: Handlers are stored in `handlers: Handler[] | null`, initialized to `null` (**0 bytes allocated when unused**). Subscriptions/unsubscriptions perform a shallow slice only when modified.
- **Direct Property Linking**: `(typeValue as TriggerWithChannel)._channel = channel` allows $O(1)$ channel resolution, bypassing `Map.get()` hash lookups.
- **Positional Zero-Allocation Dispatch**: Overloaded `trigger(a?, b?, c?, d?)` passes arguments directly to `CallbackHandler.invoke(handler, a, b, c, d)`, completely eliminating rest parameter array allocations.
- **Fast Indexed Loop**: Iterates using standard `for (let i = 0; i < len; ++i)` over the flat array, completely eliminating `SetIterator` allocations.

### Performance Impact Matrix

| Operation / Metric | Pre-Refactor (`v1.0.0`) | Post-Refactor (`v1.7.0`) | Improvement |
| :-- | :-- | :-- | :-- |
| **Upfront Channel Closures** | 240+ closures | **0 closures** (class prototype methods) | **100% eliminated** |
| **Channel State Storage** | `Map` + `Set` instances | Direct property + `Handler[] \| null` | **~75% less resident memory** |
| **Trigger Overhead (`...args`)** | 1 Array allocated per trigger | **0 Arrays allocated** (`a, b, c, d` positional) | **100% eliminated** |
| **Handler Iteration Overhead** | 1 `SetIterator` per trigger | **0 Iterator objects** (indexed array loop) | **100% eliminated** |
| **GC Churn at 3,840 triggers/sec (`OngoingPlayer`)** | **~250–350 KB / sec** | **0 bytes / sec** | **Complete starvation of GC** |

---

## 5. MultiClickDetector Module

### Architecture Evolution

- **Pre-Refactor (v3.0.2, Object-Oriented)**: Instantiated `MultiClickDetector` class instances with 10 fields, nested `Map<number, { enabled: boolean; detectors: Set<MultiClickDetector> }>`, dynamic `OngoingPlayer` subscription per frame, and `Date.now()` calls on every rising edge click.
- **Post-Refactor (v4.0.0, Data-Oriented SoA)**: Structure of Arrays backing `MAX_DETECTORS = 300`, bit-packed flags, intrusive free-list in `_sequenceStartTimes`, generation-encoded `DetectorID` handles, and a single cache-friendly `OngoingGlobal` tick loop.

### Memory & Allocation Breakdown

#### Pre-Refactor (`v3.0.2`)

- **Instance Fields**: 10 properties per detector instance (~120 bytes).
- **Per-Player Collections**: `Map<number, { enabled, detectors: Set<MultiClickDetector> }>`.
- **Per-Tick Churn**: Subscribed to `OngoingPlayer` (fired 3,840+ times/sec across 64 players), executing `Map.get()` + `SetIterator` sweeps on every player tick.
- **At 64 Players with 2 Detectors Each (128 Detectors)**: **~35 KB** heap memory + continuous Set iteration churn.

#### Post-Refactor (`v4.0.0`)

Allocations are fixed and pre-allocated upfront across `MAX_DETECTORS = 300` slots:

- `_generations` (`Uint16Array`): 2 bytes/slot (600 B)
- `_flags` (`Uint8Array`): 1 byte/slot (300 B) _(Bit-packed `FLAG_IN_USE`, `FLAG_ENABLED`, `FLAG_PLAYER_DEPLOYED`, `FLAG_LAST_STATE`)_
- `_playerIds` (`Uint8Array`): 1 byte/slot (300 B)
- `_clickCounts` (`Uint8Array`): 1 byte/slot (300 B)
- `_windows` (`Uint16Array`): 2 bytes/slot (600 B)
- `_requiredClicks` (`Uint8Array`): 1 byte/slot (300 B)
- `_sequenceStartTimes` (`Int32Array`): 4 bytes/slot (1,200 B) _(Intrusive free-list when inactive; uptime timestamp when active)_
- `_players`, `_callbacks`, `_soldierStates` (`3x Array`): 24 bytes/slot (7,200 B)
- **Marginal Cost per Detector Slot**: **~37 bytes**
- **Total Resident Pool Memory (300 Detectors)**: **~11.2 KB**

### Steady-State & GC Performance

- **Single Global Loop**: Subscribes to `OngoingGlobal` once per tick (30–60 Hz), scanning flat `_flags` and `_players` sequentially.
- **Zero Heap Allocations**: 0 Maps, 0 Sets, 0 iterators, and 0 closure creations during tracking or multi-click sequence evaluation.

---

## 6. Raycast Module

### Architecture Evolution

- **Pre-Refactor (v2.x)**: Dynamically allocated `PendingRay` objects on every `cast()` call, stored in nested `Map<number, { pendingMisses: number; rays: Map<number, PendingRay> }>`, followed by an $O(N)$ fuzzy geometric distance search (`Math.abs(d1 + d2 - totalDistance)` with 3D Pythagorean square roots) on every `OnRayCastHit` to guess which ray hit the target.
- **Post-Refactor (v3.0.0, Asynchronous Raycast Engine)**: Pre-allocated circular ring buffer for queued requests, dedicated worker slots (0..99 for players, 100 for global playerless raycasts), parallel dispatch on `OngoingGlobal`, and deterministic $O(1)$ event routing.

### Memory & Allocation Breakdown

#### Pre-Refactor (`v2.x`)

- **`PendingRay` Object**: `{ start, end, totalDistance, timestamp, nativeVectorReturn, onHit, onMiss }` (~160 bytes per raycast).
- **Nested Maps**: `Map<playerId, Map<rayId, PendingRay>>` with constant insertion, deletion, and iteration churn.
- **Fuzzy Geometric Search**: On every hit, iterated all active rays for that player, performing `Vectors.distance()` 3D Euclidean distance calculations (`Math.sqrt`) to match the hit point to a line segment.
- **GC Churn**: Firing 50 raycasts/sec generated continuous object allocation and map mutation garbage (~25–35 KB/sec).

#### Post-Refactor (`v3.0.0`)

- **Queued Request Ring Buffer (`QUEUE_CAPACITY = 512`)**:
    - 6x `Float32Array(512)` (`_queueStartX`, `_queueStartY`, `_queueStartZ`, `_queueEndX`, `_queueEndY`, `_queueEndZ`): 12,288 B (24 bytes/slot for packed 3D coordinates)
    - `_queueFlags` (`Uint8Array`): 512 B
    - 2x callback Arrays (`_queueOnHit`, `_queueOnMiss`): 8,192 B
    - _Ring Buffer Subtotal:_ **~21.0 KB** fixed resident memory.
- **In-Flight Worker Slots (`TOTAL_WORKER_SLOTS = 101`)**:
    - Slots 0..99: Connected player worker slots; Slot 100: Global playerless raycast slot.
    - `_inFlightFlags` (`Uint8Array(101)`): 101 B
    - `_inFlightTimestamp` (`Uint32Array(101)`): 404 B
    - 2x callback Arrays (`_inFlightOnHit`, `_inFlightOnMiss`): 1,616 B
    - _Worker Slots Subtotal:_ **~2.1 KB** fixed resident memory.
- **Total Engine Resident Memory**: **~23.1 KB** upfront.

### Algorithmic & GC Breakthroughs

- **Zero Ray Guessing / Zero Geometric Drift**: Because the Battlefield Portal engine routes raycasts per player handle (or globally) and returns the player handle in `OnRayCastHit`/`OnRayCastMissed`, each player slot has at most 1 in-flight raycast at a time. The event handler resolves the slot in $O(1)$ and executes the callback immediately. **0 Pythagorean square roots, 0 distance calculations, 0 fuzzy threshold errors**.
- **Parallel Dispatch**: On `OngoingGlobal`, queued rays are dispatched in parallel across all available player worker slots and the global worker slot.
- **Zero GC Churn**: Queuing, dispatching, and resolving raycasts generates **0 bytes of heap garbage**.

---

## 7. Solid Module (formerly `SolidUI`)

### Architecture Evolution

- **Pre-Refactor (`solid-ui/`, Closure-Based)**: Classic functional reactivity where each `createSignal` returned a closure pair `[getter, setter]`, and each `createEffect` allocated a JS object with `Set<() => void>` collections for tracking dependencies and subscribers.
- **Post-Refactor (`solid/` v1.0.0, Data-Oriented Reactive Graph)**: 100% Data-Oriented Reactive Graph backed by pre-allocated Structure-of-Arrays (SoA), doubly-linked graph edges in flat `Int16Array` buffers, generation-encoded `SignalID<T>` and `EffectID` handles, intrusive free-lists, and static Promise microtask coalescing.

### Memory & Allocation Breakdown

#### Pre-Refactor (`solid-ui/`)

- **Signal Closure Pair**: 2 function closures + scope context (~160 bytes per signal).
- **Effect & Dependency Graph**: Object wrapper + `Set<Signal>` + `Set<Effect>` (~240 bytes per effect).
- **Dynamic Dependency Tracking**: Subscribing/unsubscribing created dynamic closures and `Set` mutations on every execution.
- **At 500 Signals & 200 Effects**: **~128 KB** heap memory + continuous GC churn during signal writes.

#### Post-Refactor (`solid/` v1.0.0)

Allocations are fixed and pre-allocated upfront:

- **Signals Pool (`MAX_SIGNALS = 2,048`)**:
    - `_sigGenerations` (`Uint16Array`): 4,096 B
    - `_sigFree` (`Int16Array`): 4,096 B _(Intrusive free-list)_
    - `_sigFirstDep` (`Int16Array`): 4,096 B _(Head of doubly-linked subscriber edge list)_
    - `_sigValues` (`Array`): 16,384 B
    - _Signals Subtotal:_ **~28.7 KB**.
- **Subscribers Pool (`MAX_SUBSCRIBERS = 1,024`)**:
    - `_subGenerations` (`Uint16Array`): 2,048 B
    - `_subDeferTicks` (`Uint16Array`): 2,048 B _(Coalescing delay)_
    - `_subTargetTick` (`Uint32Array`): 4,096 B
    - `_subDepCount`, `_subPrevDepCount` (`2x Uint8Array`): 2,048 B
    - `_subFree` (`Int16Array`): 2,048 B _(Intrusive free-list & pending status)_
    - `_subFn`, `_subCleanups` (`2x Array`): 16,384 B
    - _Subscribers Subtotal:_ **~28.7 KB**.
- **Flat Dependency Graph Edges (`TOTAL_DEP_SLOTS = 8,192`, `MAX_DEPS_PER_SUB = 8`)**:
    - `_subDepsBuffer` (`Int16Array(8192)`): 16,384 B _(Signal slot index)_
    - `_depNext` (`Int16Array(8192)`): 16,384 B _(Doubly-linked next pointer)_
    - `_depPrev` (`Int16Array(8192)`): 16,384 B _(Doubly-linked previous pointer)_
    - _Graph Edges Subtotal:_ **~49.2 KB**.
- **Flat Scheduler Queues**:
    - `_immediateQueue`, `_deferredQueue` (`2x Int16Array(1024)`): 4,096 B.
- **Total Reactive Engine Resident Memory**: **~110.7 KB** fixed resident pool.

### Steady-State & GC Performance

- **Zero-Allocation Signal Mutations**: Writing to a signal (`Solid.write`) traverses the doubly-linked `_sigFirstDep` integer links in `Int16Array` buffers and enqueues dirty subscriber slots into `_immediateQueue`. **0 objects, 0 Sets, 0 closures allocated**.
- **Zero-Allocation Microtask Coalescing**: Uses a reusable static `Promise.resolve()` (`STATIC_PROMISE.then(_processMicrotasks)`), eliminating Promise allocation churn.
- **Comprehensive Reactive Primitives**: Supports `createSignal`, `createEffect`, `createMemo`, `createRoot`, `onCleanup`, `createStore` (with deep cached proxies), `batch`, `untrack`, `Index` list reconciliation, `h` hyperscript binding, and animation adapters (`createTween`, `createSpring`).

---

## 8. Timers Module

### Architecture Evolution

- **Pre-Refactor (v1.x)**: Managed active timer IDs in a dynamic `Set<number>`. Executed timeouts and intervals by launching asynchronous `async function executeTimeout(...) { await new Promise(...) }` microtask chains, creating Promise and closure garbage on every tick.
- **Post-Refactor (v2.0.0, Data-Oriented SoA)**: Structure of Arrays backing `MAX_TIMERS = 512`, intrusive free-list slot allocation in `_intervalMs`, generation-encoded `TimerID` handles, and lazy single subscription to `Events.OngoingGlobal`.

### Memory & Allocation Breakdown

#### Pre-Refactor (`v1.x`)

- **Timer Set**: `Set<number>` dynamically expanding with each timeout/interval.
- **Per-Timer Microtask Chains**: Spawned `async` function contexts, closures, and `Promise` instances for each timeout and interval iteration (~140–200 bytes per active timer).
- **GC Churn**: High-frequency intervals generated constant Promise microtask sweep garbage.

#### Post-Refactor (`v2.0.0`)

Allocations are fixed and pre-allocated upfront across `MAX_TIMERS = 512` slots:

- `_expirationTimes` (`Uint32Array`): 4 bytes/slot (2,048 B)
- `_generations` (`Uint16Array`): 2 bytes/slot (1,024 B)
- `_intervalMs` (`Int32Array`): 4 bytes/slot (2,048 B) _(Intrusive free-list when free; interval ms when active)_
- `_callbacks` (`Array`): 8 bytes/slot (4,096 B)
- **Marginal Cost per Timer Slot**: **18 bytes**
- **Total Resident Pool Memory (512 Timers)**: **~9.2 KB**

### Steady-State & GC Performance

- **Zero Promise Allocations**: Timeouts and intervals evaluate against `currentUptime` in a single indexed loop on `OngoingGlobal`.
- **Lazy Subscription**: Automatically subscribes to `Events.OngoingGlobal` when `_activeTimerCount > 0` and unregisters when count reaches 0, consuming zero CPU when idle.
- **Zero Heap Allocations**: Scheduling, ticking, and clearing timers generates **0 bytes of heap garbage**.

---

## 9. Comprehensive Comparison Matrix

| Module | Primary Optimization Strategy | Pre-Refactor Marginal Cost | Post-Refactor Pool Cost | Steady-State GC Churn | Algorithmic Improvements |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **`Clocks`** | Structure of Arrays (`MAX_CLOCKS = 256`) | ~330 B / clock | **41 B / slot** (~10.5 KB pool) | **0 B / tick** (100% eliminated) | Shared delta scheduler; intrusive free-list; generation safety. |
| **`UI`** | SoA Tree + Thin OOP Handles (`_id`) | ~5,000 B / button (~50 objects) | **~24 B handle** (~118.8 KB buffers) | **0 B / interaction** (100% eliminated) | LCRS tree in `Int16Array`; cached coordinates; 0 dynamic descriptors. |
| **`Logger`** | Row Recycling + Fast ASCII Width Table | ~55.4 KB heap (~780 objects/line) | **~41.1 KB heap** (0 objects/line) | **0 B / line** (was ~400 KB/sec) | In-place container recycling; in-place text update; 0 C++ widget churn. |
| **`Events`** | Class Prototype + Copy-on-Write Arrays | 240+ closures + `Map`/`Set` | Class prototype + flat `Handler[]` | **0 B / trigger** (was ~300 KB/sec) | Direct `_channel` link; positional 4-arg `trigger(a,b,c,d)`; 0 iterators. |
| **`MultiClick`** | Structure of Arrays (`MAX_DETECTORS = 300`) | ~120 B / instance + `Map`/`Set` | **~37 B / slot** (~11.2 KB pool) | **0 B / tick** (100% eliminated) | Single `OngoingGlobal` scan; bit-packed flags; intrusive free-list. |
| **`Raycast`** | Ring Buffer Queue + Dedicated Worker Slots | ~160 B / ray + $O(N)$ fuzzy map search | **~23.1 KB pool** (512 queue, 101 workers) | **0 B / raycast** (100% eliminated) | Deterministic $O(1)$ event routing; 0 geometric fuzzy math; parallel drain. |
| **`Solid`** | Data-Oriented Reactive Graph (SoA) | Closure pairs + `Set` graph (~128 KB) | **~110.7 KB pool** (2048 sigs, 1024 subs) | **0 B / mutation** (100% eliminated) | Flat doubly-linked edge list; static Promise microtasks; intrusive free-lists. |
| **`Timers`** | Structure of Arrays (`MAX_TIMERS = 512`) | `Set<number>` + `Promise` loops | **18 B / slot** (~9.2 KB pool) | **0 B / tick** (100% eliminated) | Flat uptime expiration loop; lazy global event hook; intrusive free-list. |
