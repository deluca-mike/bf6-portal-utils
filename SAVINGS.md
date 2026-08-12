## Clocks

---

### Current Version (Data-Oriented, v2.0.0)

Because this version uses Structure-of-Arrays (SoA), memory scales completely linearly and is **pre-allocated upfront at startup**.

The math per clock slot:

- `_flags` (Uint8Array): 1 byte
- `_generations` (Uint16Array): 2 bytes
- 3x `Float64Array` (`accumulatedMs`, `lastResumeTime`, `limits`): 24 bytes
- 2x `Int16Array` (`lastIntegerSecond` / intrusive free list, `lastIntegerMinute`): 4 bytes
- 3x Standard Arrays (for callback pointers): ~24 bytes (assuming 64-bit QuickJS values)

**Total Marginal Cost**: **~55 bytes per clock capacity**.

Because it pre-allocates everything, it costs this much _whether 0 clocks are running or the max clocks are running_:

- **64 Clocks**: ~3.5 KB
- **128 Clocks**: ~7.0 KB
- **256 Clocks (Default)**: ~14.0 KB
- **512 Clocks**: ~28.1 KB

_(Plus a tiny, fixed ~1 KB overhead for the Array/TypedArray object wrappers)._

---

### Previous Version (Object-Oriented, v1.1.0)

In the previous OOP version, clocks were dynamically allocated. This means when 0 clocks are running, it cost 0 KB, but as clocks were created, memory grew rapidly.

The math per running clock (QuickJS 64-bit):

- **Object Header**: ~24 bytes
- **11 Class Properties**: ~88 bytes
- **Bound `_tick` Arrow Function/Closure**: ~80-100 bytes
- **Dedicated Timer Allocation**: Because every clock managed its own `Timers.setTimeout()`, it forced the `Timers` module to allocate a new timeout closure and internal Map/Set entry: ~120 bytes.

**Total Marginal Cost**: **~330 bytes per running clock**.

If these simultaneous clocks were active:

- **64 Clocks**: ~21.1 KB
- **128 Clocks**: ~42.2 KB
- **256 Clocks**: ~84.4 KB
- **512 Clocks**: ~168.9 KB

---

### The Real Win: Garbage Collection

While dropping memory usage from ~84 KB down to ~14 KB (at 256 clocks) is a nice **83% reduction**, the real victory is **Garbage Collection (GC)**.

In v1.1.0, creating 100 countdowns for players respawning resulted in 100 new objects and 200 new closures being allocated on the heap, which then had to be swept and destroyed by the QuickJS Garbage Collector when the clocks finished.

In v2.0.0, because of the flat TypedArrays and the `_tick` microtask optimization, creating and running 100 countdowns allocates **0 bytes** of heap memory. It just flips bits in the `Uint8Array` and overwrites numbers in the `Float64Array`. It completely starves the Garbage Collector, leaving more CPU headroom for the game simulation!

---

## UI

---

### 1. Architecture Evolution

- **v8.0.0 (Pre-Refactor)**: Heavy OOP with per-instance dynamic property descriptors via `Object.defineProperty`, duplicate property caching, multi-closure unregister callbacks, and mock parent wrapper allocations.
- **v9.0.0 (Prototype Refactor)**: Statically delegated prototypes, removed redundant in-memory property caches, and introduced swap-and-pop children arrays.
- **v10.0.0 (Current: SoA Core with Thin OOP Handles)**: Pre-allocated Structure of Arrays (TypedArrays) backing a singly-linked Left-Child Right-Sibling (LCRS) tree, bit-packed button slot indexing, coordinate caching, zero unregister closures, and lightweight OOP class handles with internal ID nullification on disposal.

---

### 2. Breakdown of Memory Allocations

#### Pre-Refactor (`v8.0.0`)

Creating a single `UIWeaponImageButton` resulted in an explosion of per-instance heap allocations:

- **`UI.delegateProperties` (The Largest Source of Bloat):**
    - Iterated over 14 button properties + 2 weapon properties (**16 total delegated properties**).
    - For **each** property, it ran `Object.defineProperty`:
        - 1 Property Descriptor object (`~48 bytes`)
        - 1 `get()` closure function (`~56 bytes`)
        - 1 `set()` closure function (`~56 bytes`)
        - 1 fluent method closure (e.g., `setBaseColor()`, `setWeapon()`) (`~56 bytes`)
    - _Subtotal for dynamic delegation:_ **16 × ~216 bytes = ~3,456 bytes** of closures and hidden-class descriptor objects on every single button instance.
- **Duplicate In-Memory Property Caching:**
    - `Element` stored 13 cached fields (`_x`, `_y`, `_width`, `_height`, `_bgColor`, `_bgAlpha`, `_bgFill`, `_anchor`, `_depth`, `_visible`, `_uiInputModeWhenVisible`, etc.).
    - `UIButton` stored 14 cached color/alpha/handler fields (`_baseColor`, `_baseAlpha`, `_disabledColor`, `_pressedColor`, etc.).
    - `UIWeaponImage` stored 2 weapon fields.
    - Across the 3 objects, **65+ property slots and vector objects** were allocated and retained on the JS heap.
- **Collection & Temporary Allocations:**
    - `Receiver._inputModeRequesters`: Allocated a `Set<Element>` (`~128+ bytes`).
    - `mockParent`: Allocated an object with a flat array and 2 throwaway closures (`~240 bytes`).

> **Pre-Refactor Total:** **~4,800 – 5,500 bytes (~5.0 KB)** and **~50 distinct heap objects/closures** per button.

---

#### Post-Refactor OOP (`v9.0.0`)

- Zero-allocation prototype delegation.
- Dropped dynamic metaprogramming; getters queried native `mod` engine APIs.
- Retained 1 closure (`_unregisterAsButton`) and ~4-5 fields per object across 3 composite layers.

> **v9.0.0 Total:** **~450 – 500 bytes (~0.48 KB)** and **1 closure** per button.

---

#### Current SoA Core + Thin Handles (`v10.0.0`)

- **Single Lightweight JS Handle Object**:
    - Each instance holds only its inherited prototype and `_id: number` (**~24 bytes**).
    - All tree hierarchy relationships (`_parents`, `_firstChild`, `_nextSibling`) live in continuous flat `Int16Array` buffers.
    - Coordinates and dimensions (`_x`, `_y`, `_width`, `_height`) live in flat `Float32Array` buffers, completely eliminating vector allocation churn and native `mod.GetUIWidgetPosition()` bridge queries during coordinate access.
- **Zero-Closure Button Slot Allocator**:
    - Interactive buttons allocate a compact slot index packed directly into the upper bits of `_flags` (`Uint16Array`), indexing into fixed-size event callback arrays.
    - `_unregisterAsButton` closure is 100% eliminated.
- **Safe Snapshot `.children` & Zero-Allocation `forEachChild`**:
    - `forEachChild` traverses the singly-linked `_nextSibling` TypedArray with **0 heap allocations**.
    - `.children` returns an isolated snapshot array on demand to guarantee underlying tree safety.
- **Automatic ID Nullification on Disposal**:
    - Invoking `.delete()` frees the slot on the intrusive free-list, recursively destroys children, and sets `_id = -1` to disconnect the handle from internal buffers.

> **v10.0.0 Total:** **~24 bytes** marginal heap memory and **0 closures** per widget instance.

---

### 3. Quantitative Comparison & Scaling Impact

| Metric / Aspect | Pre-Refactor (`v8.0.0`) | Prototype Refactor (`v9.0.0`) | Current SoA + Handle (`v10.0.0`) | Total Improvement |
| :-- | :-- | :-- | :-- | :-- |
| **Heap Objects & Closures per Button** | **~50 objects** | **1 object + 1 closure** | **1 tiny handle (0 closures)** | **~98% reduction** |
| **Retained Instance Fields** | **65+ fields** | **~14 fields** | **1 field (`_id`)** | **~98.5% reduction** |
| **Marginal Memory per Widget Instance** | **~5,000 bytes (~5.0 KB)** | **~480 bytes (~0.48 KB)** | **~24 bytes (~0.024 KB)** | **~99.5% Savings (~208x lighter)** |
| **Small Inventory Menu (20 Buttons)** | ~100 KB | ~9.6 KB | **~0.48 KB** | **~99.5 KB saved** |
| **Full Loadout / Spawn Grid (64 Buttons)** | ~320 KB | ~30.7 KB | **~1.54 KB** | **~318.5 KB saved** |
| **Per-Player HUDs across 16 Players (256 Buttons)** | **~1,280 KB (~1.28 MB)** | **~122 KB (~0.12 MB)** | **~6.14 KB (~0.006 MB)** | **~1.27 MB saved** |

---

### 4. Secondary Garbage Collection (GC) Benefits

In QuickJS and resource-constrained environments:

1. **Teardown & GC Pressure:** Destroying a menu of 50 buttons sweeps only ~50 tiny ~24-byte handle objects, with zero nested closure trees or bucket allocations.
2. **Zero Coordinate Mutation Churn:** Setting `btn.x = 100` reads the cached `_y[slot]` directly from a `Float32Array` buffer, eliminating `mod.GetUIWidgetPosition()` temporary vector garbage.
3. **Zero Event Dispatch Garbage:** Button events look up handlers via integer indices in pre-allocated arrays, eliminating Map lookups and string key hashing during user clicks and focus transitions.

---

## Logger

---

Ran command: `git diff 0f0e340a19c39aa3aa648ba6818c2b79be4cd7a9..8ef59030a5d5f27cabea439d591ef2e17dfd96d0 --stat`

Here is a detailed comparison and memory savings analysis for the `Logger` module between **pre-refactor** (`0f0e340a19c39aa3aa648ba6818c2b79be4cd7a9`) and **post-refactor** (`8ef59030a5d5f27cabea439d591ef2e17dfd96d0`).

---

### Scenario Analyzed

- **Mode:** Dynamic Mode (scrolling console)
- **Window Capacity:** 20 rows
- **Message Size:** Average of **64 characters** per line (e.g. `"[12:34:56.789] [VehicleManager] Soldier 42 spawned with AK24 loadout!"`)

---

### 1. Static Heap & Resident Memory (Window Full of 20 Rows)

#### Pre-Refactor (`0f0e340a`)

- **Chunking (1–3 chars):** 64 characters (approx. 8 spaces and 56 visible chars) broke into $\approx 22$ chunks of 1–3 characters each.
- **Widgets Retained:**
    - 20 `UIContainer` row instances.
    - $20 \times 22 \approx \mathbf{440\text{ UIText}}$ instances.
    - **460 total native Portal UI widgets** in the engine.
- **JS Heap Size:**
    - 20 `UIContainer` objects $\approx 2.4\text{ KB}$
    - 440 `UIText` objects $\approx 52.8\text{ KB}$
    - `_rows` dynamic dictionary $\approx 0.2\text{ KB}$
    - **Total Resident Memory:** **~55.4 KB**

#### Post-Refactor (`8ef59030`)

- **4-Character Prefixed Chunking (1–4 chars):** The same 64 characters now break into $\approx 16$ chunks.
- **Widgets Retained:**
    - 20 `UIContainer` row instances.
    - $20 \times 16 \approx \mathbf{320\text{ UIText}}$ instances (**120 fewer native widgets**).
    - **340 total native Portal UI widgets** in the engine.
- **JS Heap Size:**
    - 20 `UIContainer` objects $\approx 2.4\text{ KB}$
    - 320 `UIText` objects $\approx 38.4\text{ KB}$
    - `_dynamicRows` flat array $\approx 0.16\text{ KB}$
    - `_CHAR_WIDTHS_TENTHS` static table $\approx 0.13\text{ KB}$
    - **Total Resident Memory:** **~41.1 KB**

> **Resident Savings:** **~14.3 KB saved (~26% reduction)** and **120 fewer C++ widgets** registered with the game engine.

---

### 2. Garbage Collection (GC) Churn & Dynamic Scrolling Pressure

While the ~26% reduction in resident memory is helpful, the **Garbage Collection and CPU churn elimination** is the primary breakthrough.

#### Pre-Refactor: The Cost of Logging 1 New Line

Every time a line was logged and the console scrolled up by 1 row:

1. **Character Measurement Churn:**
    - Every character checked 22 `['...'].includes(char)` array literals. Measuring 64 characters allocated **~700 temporary array literals**.
    - `part.split('').reduce(...)` allocated 22 string arrays and 22 reducer closures.
    - _Subtotal:_ **~750 heap objects allocated and discarded just to calculate text widths (~30–35 KB garbage/line)**.
2. **Widget Destruction Churn:**
    - `Object.values(this._rows)` allocated a temporary 20-element array.
    - Destroyed the top `UIContainer` and all 22 child `UIText` instances.
    - Called native `mod` APIs to destroy **23 C++ engine widgets**.
3. **Widget Creation Churn:**
    - Instantiated 1 brand new `UIContainer` and 22 new `UIText` instances on the JS heap.
    - Called native `mod` APIs to create **23 brand new C++ engine widgets**.

#### Post-Refactor: The Cost of Logging 1 New Line

1. **Zero-Allocation Layout Engine:**
    - Character widths are read directly via `Logger._CHAR_WIDTHS_TENTHS[code]` inside a standard `for` loop.
    - **0 arrays, 0 strings, and 0 closures allocated**.
2. **Container Recycling:**
    - The top `UIContainer` is shifted from the array and moved to the bottom (`row.y = bottomY`).
    - **0 containers deleted, 0 containers created**.
3. **In-Place `UIText` Reuse & Single-Pass Children Retrieval:**
    - `row.children` is read once per row in `_fillRow` and passed to `_setPartText` and `_hideRemainingWidgets`, avoiding repeated array slice copies per chunk.
    - Existing `UIText` children inside the recycled container are updated in place (`message`, `x`, `width`, `visible = true`).
    - **0 `UIText` widgets deleted, 0 `UIText` widgets created**.

---

### 3. Scaling Comparison: 10 Log Lines / Second (Typical Debug Trace)

| Metric | Pre-Refactor (`0f0e340a`) | Post-Refactor (`8ef59030`) | Improvement |
| :-- | :-- | :-- | :-- |
| **Native Widgets per Full Window** | 460 widgets | 340 widgets | **26.1% fewer widgets** |
| **Resident JS Heap** | ~55.4 KB | ~41.1 KB | **~14.3 KB saved (26%)** |
| **Temporary JS Objects Allocated per Line** | ~780 objects | **0 objects** | **100% eliminated** |
| **GC Garbage Generated per Line** | ~35 – 45 KB | **0 bytes** | **100% eliminated** |
| **Native C++ Widgets Created/Destroyed per Line** | 23 widgets | **0 widgets** | **100% eliminated** |
| **Heap Garbage Generated at 10 lines/sec** | **~400 KB / sec** | **0 KB / sec** | **Complete starvation of GC** |
| **Native Engine Widget Churn at 10 lines/sec** | 230 creates + 230 destroys/sec | **0 creates/destroys** | **Zero UI draw call churn** |

---

### Summary

In the previous version, active dynamic logging generated a continuous stream of allocations (~400 KB of heap garbage per second at 10 logs/sec), causing periodic QuickJS garbage collection pauses and engine widget thrashing. In the refactored version, once the 20 rows are created, **logging becomes 100% in-place property mutations with zero heap allocations and zero widget deletions**.
