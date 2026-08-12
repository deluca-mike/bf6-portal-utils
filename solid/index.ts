import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 1.0.0
export namespace Solid {
    /****** Logging ******/

    const logging = new Logging('Solid');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /****** Public Types & Branded Identifiers ******/

    /**
     * Unique generation-encoded identifier for a reactive Signal.
     */
    export type SignalID<T = unknown> = number & { readonly __brand: 'SignalID'; readonly __type?: T };

    /**
     * Unique generation-encoded identifier for a reactive Subscriber / Effect.
     */
    export type EffectID = number & { readonly __brand: 'EffectID' };

    // Defines the contract for any UI Class Constructor (Native or Custom).
    type Constructable<Params, Instance> = new (params: Params) => Instance;

    type FunctionalComponent<Params, Instance> = (props: Reactive<Params>) => Instance;

    // Transform Params so every property can optionally be a SignalID or getter function.
    type Reactive<T> = {
        [K in keyof T]?: T[K] | (() => T[K]) | SignalID<T[K]>;
    };

    /**
     * Options for an effect.
     */
    export type EffectOptions = {
        /**
         * Number of logical ticks to defer execution and coalesce updates (clamped between 0 and 65,535).
         */
        deferTicks?: number;
    };

    /**
     * Options for a memo.
     */
    export type MemoOptions = {
        /**
         * Number of logical ticks to defer execution and coalesce updates (clamped between 0 and 65,535).
         */
        deferTicks?: number;
    };

    /**
     * Options for a component.
     */
    export type ComponentOptions = {
        /**
         * Number of logical ticks to defer execution and coalesce updates (clamped between 0 and 65,535).
         */
        deferTicks?: number;
    };

    /**
     * Options for an index.
     */
    export type IndexOptions = {
        /**
         * Number of logical ticks to defer execution and coalesce updates (clamped between 0 and 65,535).
         */
        deferTicks?: number;
    };

    /****** Capacity Limits & Constants ******/

    /**
     * Maximum number of logical ticks a subscriber can defer execution (Uint16 capacity).
     */
    export const MAX_DEFER_TICKS = 65_535;

    /**
     * Maximum number of concurrent subscribers (effects, memos, and reactive property bindings) supported.
     */
    export const MAX_SUBSCRIBERS = 1_024;

    /**
     * Maximum number of concurrent reactive signals supported across all components and stores.
     */
    export const MAX_SIGNALS = 2_048;

    /**
     * Maximum number of dependencies a single subscriber can track simultaneously.
     */
    export const MAX_DEPS_PER_SUB = 8;

    /**
     * Total dependency edge capacity across all subscribers.
     */
    const TOTAL_DEP_SLOTS = MAX_SUBSCRIBERS * MAX_DEPS_PER_SUB; // 8,192 slots = 16 KB

    /**
     * Maximum number of subscriber executions allowed in a single microtask flush loop.
     * Prevents infinite re-entrant loops from locking up the thread.
     *
     * Performance vs Memory trade-offs:
     * - Increasing this value allows very large UI trees or cascades of dependent signals to resolve
     *   within a single microtask, improving throughput for complex UIs at the cost of higher CPU time
     *   spent inside one microtask frame (potentially delaying engine ticks if effects loop).
     * - Decreasing this value bounds execution time per flush and prevents runaway effect chains,
     *   protecting the game simulation framerate, but may truncate valid deep dependency chains.
     * - Memory impact: Static numeric limit; zero heap memory overhead.
     */
    export const MAX_EXECUTIONS_PER_FLUSH = 1_000;

    /**
     * Maximum number of microtask flushes permitted within a single logical engine tick.
     *
     * Performance vs Memory trade-offs:
     * - Protects against re-entrant deferTicks=0 effect loops that keep rescheduling microtask flushes
     *   indefinitely within the same engine tick.
     * - Increasing this value permits deeper chains of asynchronous signal-effect-signal flushes per tick.
     * - Decreasing this value aborts runaway flush storms earlier to maintain game tick responsiveness.
     * - Memory impact: Static numeric limit; zero heap memory overhead.
     */
    export const MAX_FLUSHES_PER_TICK = 1_000;

    let _activeSignalCount = 0;
    let _activeSubscriberCount = 0;

    /**
     * Retrieves the count of currently active reactive signals.
     * @returns The active signal count.
     */
    export function getActiveSignals(): number {
        return _activeSignalCount;
    }

    /**
     * Retrieves the count of currently active subscribers and effects.
     * @returns The active subscriber count.
     */
    export function getActiveSubscribers(): number {
        return _activeSubscriberCount;
    }

    /****** State & Flag Helpers ******/

    const INVALID_INDEX = -1;
    const SIG_STATE_IN_USE = -2;
    const SIG_STATE_RETIRED = -3;

    const SUB_STATE_IDLE = -2;
    const SUB_STATE_PENDING = -3;
    const SUB_STATE_RETIRED = -4;

    function _setSubIdle(slot: number): void {
        _subFree[slot] = SUB_STATE_IDLE;
    }

    function _setSubPending(slot: number): void {
        _subFree[slot] = SUB_STATE_PENDING;
    }

    function _setSubRetired(slot: number): void {
        _subFree[slot] = SUB_STATE_RETIRED;
    }

    function _isSubIdle(slot: number): boolean {
        return _subFree[slot] === SUB_STATE_IDLE;
    }

    function _isSubPending(slot: number): boolean {
        return _subFree[slot] === SUB_STATE_PENDING;
    }

    function _isSubInUse(slot: number): boolean {
        return _subFree[slot] === SUB_STATE_IDLE || _subFree[slot] === SUB_STATE_PENDING;
    }

    function _setSigInUse(slot: number): void {
        _sigFree[slot] = SIG_STATE_IN_USE;
    }

    function _setSigRetired(slot: number): void {
        _sigFree[slot] = SIG_STATE_RETIRED;
    }

    function _isSigInUse(slot: number): boolean {
        return _sigFree[slot] === SIG_STATE_IN_USE;
    }

    /****** Structure of Arrays (SoA) Buffers ******/

    const GENERATION_MULTIPLIER = 10_000;
    const MAX_GENERATIONS = 65_535;

    // --- Subscriber Storage ---
    const _subGenerations = new Uint16Array(MAX_SUBSCRIBERS);

    /**
     * Coalescing delay in logical ticks per subscriber (clamped between 0 and `MAX_DEFER_TICKS` = 65,535).
     */
    const _subDeferTicks = new Uint16Array(MAX_SUBSCRIBERS);
    const _subTargetTick = new Uint32Array(MAX_SUBSCRIBERS);
    const _subDepCount = new Uint8Array(MAX_SUBSCRIBERS);
    const _subPrevDepCount = new Uint8Array(MAX_SUBSCRIBERS);

    /**
     * Tracks subscriber slot allocation state and intrusive free-list links (dual duty):
     * - Free slot: Stores the index of the next available slot on the intrusive free list (`_firstFreeSub`).
     *              The tail slot in the free list contains `INVALID_INDEX` (-1).
     * - In-use idle slot: Set to `SUB_STATE_IDLE` (-2) when active but not queued.
     * - In-use pending slot: Set to `SUB_STATE_PENDING` (-3) when queued in `_immediateQueue` or `_deferredQueue`.
     * - Retired slot: Set to `SUB_STATE_RETIRED` (-4) when a slot has exhausted `MAX_GENERATIONS`.
     */
    const _subFree = new Int16Array(MAX_SUBSCRIBERS);
    const _subFn = new Array<(() => void) | null>(MAX_SUBSCRIBERS);
    const _subCleanups = new Array<(() => void)[] | null>(MAX_SUBSCRIBERS);

    // Intrusive free-list initialization for subscribers
    for (let i = 0; i < MAX_SUBSCRIBERS - 1; ++i) {
        _subFree[i] = i + 1;
    }
    _subFree[MAX_SUBSCRIBERS - 1] = INVALID_INDEX;
    let _firstFreeSub = 0;

    // --- Signal Storage ---
    const _sigGenerations = new Uint16Array(MAX_SIGNALS);

    /**
     * Tracks signal slot allocation state and intrusive free-list links (dual duty):
     * - Free slot: Stores the index of the next available slot on the intrusive free list (`_firstFreeSig`).
     *              The tail slot in the free list contains `INVALID_INDEX` (-1).
     * - In-use slot: Set to `SIG_STATE_IN_USE` (-2) to indicate the slot is actively allocated.
     * - Retired slot: Set to `SIG_STATE_RETIRED` (-3) when a slot has exhausted `MAX_GENERATIONS`.
     */
    const _sigFree = new Int16Array(MAX_SIGNALS);
    const _sigValues = new Array<unknown>(MAX_SIGNALS);

    // Intrusive free-list initialization for signals
    for (let i = 0; i < MAX_SIGNALS - 1; ++i) {
        _sigFree[i] = i + 1;
    }
    _sigFree[MAX_SIGNALS - 1] = INVALID_INDEX;
    let _firstFreeSig = 0;

    // --- Flat Graph Edges (Doubly Linked Edge List for Signal Subscribers) ---
    const _sigFirstDep = new Int16Array(MAX_SIGNALS).fill(INVALID_INDEX);
    const _subDepsBuffer = new Int16Array(TOTAL_DEP_SLOTS).fill(INVALID_INDEX);
    const _depNext = new Int16Array(TOTAL_DEP_SLOTS).fill(INVALID_INDEX);
    const _depPrev = new Int16Array(TOTAL_DEP_SLOTS).fill(INVALID_INDEX);

    // --- Flat Scheduler Queues ---
    const _immediateQueue = new Int16Array(MAX_SUBSCRIBERS);
    const _deferredQueue = new Int16Array(MAX_SUBSCRIBERS);
    let _immediateCount = 0;
    let _deferredCount = 0;

    /****** ID Encoding & Slot Resolution ******/

    function _resolveSignalSlot<T>(id: SignalID<T>): number {
        if (id < 0) return INVALID_INDEX;

        const slot = id % GENERATION_MULTIPLIER;

        if (slot >= MAX_SIGNALS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_sigGenerations[slot] !== expectedGen || !_isSigInUse(slot)) return INVALID_INDEX;

        return slot;
    }

    function _resolveSubscriberSlot(id: EffectID): number {
        if (id < 0) return INVALID_INDEX;

        const slot = id % GENERATION_MULTIPLIER;

        if (slot >= MAX_SUBSCRIBERS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_subGenerations[slot] !== expectedGen || !_isSubInUse(slot)) return INVALID_INDEX;

        return slot;
    }

    /****** Memory Allocators & Free-Lists ******/

    function allocateSignalSlot<T>(initialValue: T): number {
        if (_firstFreeSig === INVALID_INDEX) {
            logging.log('Signal pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFreeSig;
        _firstFreeSig = _sigFree[slot];
        _setSigInUse(slot);
        _sigValues[slot] = initialValue;
        _sigFirstDep[slot] = INVALID_INDEX;
        ++_activeSignalCount;

        return slot;
    }

    function freeSignalSlot(slot: number): void {
        if (!_isSigInUse(slot)) return;

        // Detach all subscribers observing this signal
        let depSlot = _sigFirstDep[slot];

        while (depSlot !== INVALID_INDEX) {
            const next = _depNext[depSlot];
            _depPrev[depSlot] = INVALID_INDEX;
            _depNext[depSlot] = INVALID_INDEX;
            _subDepsBuffer[depSlot] = INVALID_INDEX;
            depSlot = next;
        }

        _sigFirstDep[slot] = INVALID_INDEX;

        _sigValues[slot] = null;
        --_activeSignalCount;

        if (_sigGenerations[slot] < MAX_GENERATIONS) {
            ++_sigGenerations[slot];
            _sigFree[slot] = _firstFreeSig;
            _firstFreeSig = slot;
        } else {
            _setSigRetired(slot);

            if (logging.willLog(LogLevel.Warning)) {
                logging.log(`Signal slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
            }
        }
    }

    function allocateSubscriberSlot(fn: () => void, deferTicks: number): number {
        if (_firstFreeSub === INVALID_INDEX) {
            logging.log('Subscriber pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFreeSub;
        _firstFreeSub = _subFree[slot];
        _setSubIdle(slot);

        _subDeferTicks[slot] = Number.isFinite(deferTicks)
            ? Math.max(0, Math.min(MAX_DEFER_TICKS, Math.floor(deferTicks)))
            : 0;

        _subTargetTick[slot] = 0;
        _subDepCount[slot] = 0;
        _subPrevDepCount[slot] = 0;
        _subFn[slot] = fn;
        _subCleanups[slot] = null;

        const base = slot * MAX_DEPS_PER_SUB;

        for (let i = 0; i < MAX_DEPS_PER_SUB; ++i) {
            _subDepsBuffer[base + i] = INVALID_INDEX;
        }

        ++_activeSubscriberCount;

        return slot;
    }

    function freeSubscriberSlot(slot: number): void {
        if (!_isSubInUse(slot)) return;

        runSubCleanups(slot);

        const base = slot * MAX_DEPS_PER_SUB;
        const count = _subPrevDepCount[slot];

        for (let i = 0; i < count; ++i) {
            const depSlot = base + i;
            const sigSlot = _subDepsBuffer[depSlot];

            if (sigSlot === INVALID_INDEX) continue;

            removeSubscriberEdge(sigSlot, depSlot);
            _subDepsBuffer[depSlot] = INVALID_INDEX;
        }

        _subFn[slot] = null;
        _subCleanups[slot] = null;
        _subDepCount[slot] = 0;
        _subPrevDepCount[slot] = 0;

        --_activeSubscriberCount;

        if (_subGenerations[slot] < MAX_GENERATIONS) {
            ++_subGenerations[slot];
            _subFree[slot] = _firstFreeSub;
            _firstFreeSub = slot;
        } else {
            _setSubRetired(slot);

            if (logging.willLog(LogLevel.Warning)) {
                logging.log(`Subscriber slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
            }
        }
    }

    function runSubCleanups(subSlot: number): void {
        const cleanups = _subCleanups[subSlot];

        if (cleanups === null) return;

        for (let i = 0; i < cleanups.length; ++i) {
            try {
                cleanups[i]();
            } catch (error: unknown) {
                logging.log('Error in cleanup:', LogLevel.Error, error);
            }
        }

        _subCleanups[subSlot] = null;
    }

    /****** Dependency Graph Edge Management ******/

    /**
     * Inserts a subscriber edge at the head of the signal's doubly-linked subscriber list.
     * @param sigSlot - The signal being subscribed to.
     * @param depSlot - The subscriber's dependency slot.
     */
    function addSubscriberEdge(sigSlot: number, depSlot: number): void {
        const head = _sigFirstDep[sigSlot];
        _depNext[depSlot] = head;
        _depPrev[depSlot] = INVALID_INDEX;

        if (head !== INVALID_INDEX) {
            _depPrev[head] = depSlot;
        }

        _sigFirstDep[sigSlot] = depSlot;
    }

    /**
     * Unlinks a subscriber edge from a signal's doubly-linked list in O(1) constant time.
     * @param sigSlot - The signal being unsubscribed from.
     * @param depSlot - The subscriber's dependency slot.
     */
    function removeSubscriberEdge(sigSlot: number, depSlot: number): void {
        const prev = _depPrev[depSlot];
        const next = _depNext[depSlot];

        if (prev !== INVALID_INDEX) {
            _depNext[prev] = next;
        } else if (_sigFirstDep[sigSlot] === depSlot) {
            _sigFirstDep[sigSlot] = next;
        }

        if (next !== INVALID_INDEX) {
            _depPrev[next] = prev;
        }

        _depNext[depSlot] = INVALID_INDEX;
        _depPrev[depSlot] = INVALID_INDEX;
    }

    /**
     * Tracks a dependency between a signal slot and the currently executing subscriber.
     * Uses cursor checking (_subDepCount) for zero-allocation O(1) steady-state re-runs.
     * @param sigSlot - The signal slot to track.
     * @param subSlot - The subscriber slot observing the signal.
     */
    function trackDependency(sigSlot: number, subSlot: number): void {
        const idx = _subDepCount[subSlot]++;

        if (idx >= MAX_DEPS_PER_SUB) {
            logging.log(`Subscriber exceeded max dependencies (${MAX_DEPS_PER_SUB})`, LogLevel.Error);
            return;
        }

        const depSlot = subSlot * MAX_DEPS_PER_SUB + idx;
        const oldSigSlot = _subDepsBuffer[depSlot];

        // FAST PATH: Dependency is identical to previous execution at this index
        // 0 array allocations, 0 unsubscriptions, 0 search scans.
        if (oldSigSlot === sigSlot) return;

        // Branch changed: unsubscribe old dependency at this slot
        if (oldSigSlot !== INVALID_INDEX) {
            removeSubscriberEdge(oldSigSlot, depSlot);
        }

        _subDepsBuffer[depSlot] = sigSlot;
        addSubscriberEdge(sigSlot, depSlot);
    }

    let activeSubscriberSlot = INVALID_INDEX;

    interface ScopeContext {
        subSlots: number[];
        sigSlots: number[];
        cleanups: (() => void)[];
    }

    let activeScope: ScopeContext | null = null;

    /**
     * Prunes excess dependency edges if conditional branching inside the subscriber reduced its active dependency count.
     * Unlinks stale edges from signal lists and resets slots in `_subDepsBuffer` to `INVALID_INDEX`.
     * @param subSlot - The subscriber slot whose dependencies are being trimmed.
     */
    function trimUnusedDependencies(subSlot: number): void {
        if (!_isSubInUse(subSlot)) return;

        const base = subSlot * MAX_DEPS_PER_SUB;
        const activeCount = _subDepCount[subSlot];
        const prevCount = _subPrevDepCount[subSlot];

        if (activeCount < prevCount) {
            for (let i = activeCount; i < prevCount; ++i) {
                const depSlot = base + i;
                const oldSigSlot = _subDepsBuffer[depSlot];

                if (oldSigSlot === INVALID_INDEX) continue;

                removeSubscriberEdge(oldSigSlot, depSlot);
                _subDepsBuffer[depSlot] = INVALID_INDEX;
            }
        }

        _subPrevDepCount[subSlot] = activeCount;
    }

    function executeSubscriber(subSlot: number): void {
        if (!_isSubInUse(subSlot)) return;

        runSubCleanups(subSlot);

        const prevObserver = activeSubscriberSlot;
        const prevScope = activeScope;

        activeSubscriberSlot = subSlot;
        activeScope = null; // Cleanups inside effect attach to this subscriber
        _subDepCount[subSlot] = 0;

        const fn = _subFn[subSlot];

        try {
            if (fn !== null) fn();
        } finally {
            activeSubscriberSlot = prevObserver;
            activeScope = prevScope;

            trimUnusedDependencies(subSlot);
        }
    }

    /****** Tick Tracking & Scheduling ******/

    /**
     * Invariant: `currentTick` is a logical scheduler tick advanced by `Events.OngoingGlobal`, not an engine tick
     * boundary API value (none is available).
     */
    let currentTick = 0;
    let isFlushPending = false;
    let tickFlushCount = 0;

    // Reusable static promise for zero-allocation microtask dispatch.
    const STATIC_PROMISE = Promise.resolve();

    function handleTick(): void {
        ++currentTick;
        tickFlushCount = 0;

        // Drain any deferred effects that reached their target tick into the immediate queue.
        if (_deferredCount > 0) {
            let writeIndex = 0;

            for (let i = 0; i < _deferredCount; ++i) {
                const subSlot = _deferredQueue[i];

                if (_subTargetTick[subSlot] > currentTick) {
                    _deferredQueue[writeIndex++] = subSlot;
                    continue;
                }

                if (!_isSubPending(subSlot)) continue;

                if (_immediateCount >= MAX_SUBSCRIBERS) continue;

                _immediateQueue[_immediateCount++] = subSlot;
            }

            _deferredCount = writeIndex;
        }

        if (_immediateCount > 0) {
            queueFlush();
        }
    }

    Events.OngoingGlobal.subscribe(handleTick);

    // Processes the microtask queue.
    function flush(): void {
        isFlushPending = false;

        if (_immediateCount === 0) return;

        // If the number of flushes this tick is greater than the maximum allowed, clear the pending effects and log an
        // error. This is a safeguard to prevent a tick from executing very long chains of effect executions that may
        // create new effect executions, etc, holding up the next tick.
        if (++tickFlushCount > MAX_FLUSHES_PER_TICK) {
            for (let i = 0; i < _immediateCount; ++i) {
                const slot = _immediateQueue[i];

                if (_isSubPending(slot)) {
                    _setSubIdle(slot);
                }
            }

            _immediateCount = 0;
            logging.log('Max flushes per tick exceeded', LogLevel.Error);

            return;
        }

        let executionCount = 0;
        let i = 0;

        while (i < _immediateCount) {
            if (++executionCount > MAX_EXECUTIONS_PER_FLUSH) {
                for (let j = i; j < _immediateCount; ++j) {
                    const slot = _immediateQueue[j];

                    if (_isSubPending(slot)) {
                        _setSubIdle(slot);
                    }
                }

                _immediateCount = 0;
                logging.log('Max executions per flush exceeded', LogLevel.Error);

                return;
            }

            const subSlot = _immediateQueue[i++];

            if (!_isSubPending(subSlot)) continue;

            _setSubIdle(subSlot);

            try {
                executeSubscriber(subSlot);
            } catch (error: unknown) {
                // Catch and log errors so one bad effect doesn't kill the whole UI.
                logging.log('Error in effect:', LogLevel.Error, error);
            }
        }

        _immediateCount = 0;
    }

    // Adds a subscriber to the immediate queue (scheduling a microtask flush if needed) or to the deferred queue.
    function scheduleSubscriber(subSlot: number): void {
        if (!_isSubIdle(subSlot)) return;

        _setSubPending(subSlot);

        if (_subDeferTicks[subSlot] === 0) {
            if (_immediateCount < MAX_SUBSCRIBERS) {
                _immediateQueue[_immediateCount++] = subSlot;
            }

            queueFlush();
        } else {
            _subTargetTick[subSlot] = currentTick + _subDeferTicks[subSlot];

            if (_deferredCount < MAX_SUBSCRIBERS) {
                _deferredQueue[_deferredCount++] = subSlot;
            }
        }
    }

    function scheduleSignalSubscribers(sigSlot: number): void {
        let depSlot = _sigFirstDep[sigSlot];

        while (depSlot !== INVALID_INDEX) {
            const subSlot = depSlot >> 3; // depSlot / MAX_DEPS_PER_SUB (8)
            scheduleSubscriber(subSlot);
            depSlot = _depNext[depSlot];
        }
    }

    // Queues a flush on the microtask queue using a reusable Promise (zero allocation).
    function queueFlush(): void {
        if (isFlushPending) return;

        isFlushPending = true;
        STATIC_PROMISE.then(flush);
    }

    /****** Local Utils ******/

    function isPlainObject(obj: unknown): boolean {
        // Only recurse into simple {} objects.
        // Avoids issues with host objects (Vectors, Players) which should be checked by reference.
        return obj !== null && typeof obj === 'object' && obj.constructor === Object;
    }

    function isEqual(a: unknown, b: unknown): boolean {
        if (a === b) return true; // Primitive or reference check.

        if (a == null || b == null) return false; // null/undefined mismatch.

        // Array Deep Compare
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;

            for (let i = 0; i < a.length; ++i) {
                if (!isEqual(a[i], b[i])) return false;
            }

            return true;
        }

        // Plain object deep compare (Size, Position, Vector, etc) without Object.keys array allocation.
        if (isPlainObject(a) && isPlainObject(b)) {
            const objA = a as Record<string, unknown>;
            const objB = b as Record<string, unknown>;

            let countA = 0;

            for (const key in objA) {
                if (!Object.prototype.hasOwnProperty.call(objA, key)) continue;

                ++countA;

                if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;

                if (!isEqual(objA[key], objB[key])) return false;
            }

            let countB = 0;

            for (const key in objB) {
                if (!Object.prototype.hasOwnProperty.call(objB, key)) continue;

                ++countB;
            }

            if (countA !== countB) return false;

            if (countA === 0) {
                // `mod` types are unique in that they are empty objects in the JS runtime, but can be compared with
                // `mod.Equals`. Unfortunately, `mod.Equals` will throw an error if the objects are not `mod` types.
                try {
                    return mod.Equals(a, b);
                } catch {
                    return true;
                }
            }

            return true;
        }

        return false; // Default to false if references didn't match and not deep-comparable.
    }

    function isClassConstructor(fn: unknown): boolean {
        if (typeof fn !== 'function') return false;

        if (fn.toString().substring(0, 5) === 'class') return true; // Check for ES6 'class' keyword.

        // Check for prototype methods (legacy classes).
        // Arrow functions do not have a prototype.
        // Standard functions have a prototype, but usually only constructor/toString.
        // UI Classes will likely have methods on the prototype.
        if (fn.prototype && Object.getOwnPropertyNames(fn.prototype).length > 1) return true;

        return false;
    }

    function isEventHandlerProp(key: string): boolean {
        return (
            key.length > 2 &&
            key.charCodeAt(0) === 111 /* 'o' */ &&
            key.charCodeAt(1) === 110 /* 'n' */ &&
            key.charCodeAt(2) >= 65 &&
            key.charCodeAt(2) <= 90 /* 'A'-'Z' */
        );
    }

    /****** Reactivity Core ******/

    /**
     * Executes a function without creating dependencies.
     * Any signals read inside `fn` will return their current value, but the surrounding Effect will not subscribe to
     * them.
     * @example
     * createEffect(() => {
     *     console.log(read(countSig)); // Tracks 'countSig'
     *     untrack(() => console.log(read(timerSig))); // Reads 'timerSig' but doesn't track it
     * });
     * @param fn - The function to execute.
     * @returns The return value of `fn`.
     */
    export function untrack<T>(fn: () => T): T {
        const prevObserver = activeSubscriberSlot;
        activeSubscriberSlot = INVALID_INDEX;

        try {
            return fn();
        } finally {
            activeSubscriberSlot = prevObserver;
        }
    }

    /**
     * Creates a simple reactive state (a "Signal") backed by an integer SoA slot.
     * Signals are the atoms of reactivity. They hold a value and notify subscribers when changed.
     * @param initialValue - The starting value.
     * @returns A generation-encoded {@link SignalID}, or `INVALID_INDEX` (-1) if capacity is exhausted.
     */
    export function createSignal<T>(initialValue: T): SignalID<T> {
        const slot = allocateSignalSlot(initialValue);

        if (slot === INVALID_INDEX) return INVALID_INDEX as SignalID<T>;

        if (activeScope !== null) {
            activeScope.sigSlots.push(slot);
        }

        return (slot + GENERATION_MULTIPLIER * _sigGenerations[slot]) as SignalID<T>;
    }

    /**
     * Reads the current value of a reactive Signal.
     * Key Concept: Calling `read` inside an active Effect or Memo establishes an automatic dependency edge.
     * That Effect will automatically re-run whenever this Signal's value changes.
     * @param id - The {@link SignalID} to read.
     * @returns The current value of the Signal, or `undefined` if the Signal is invalid/destroyed.
     */
    export function read<T>(id: SignalID<T>): T {
        const slot = _resolveSignalSlot(id);

        if (slot === INVALID_INDEX) {
            logging.log('Attempted to read from an invalid or destroyed Signal', LogLevel.Warning);
            return undefined as unknown as T;
        }

        if (activeSubscriberSlot !== INVALID_INDEX) {
            trackDependency(slot, activeSubscriberSlot);
        }

        return _sigValues[slot] as T;
    }

    /**
     * Updates the value of a reactive Signal and notifies active subscribers.
     * You can pass either:
     *   - A raw value (e.g., `5`).
     *   - An "updater" function that receives the previous value (e.g., `prev => prev + 1`).
     *
     * State updates occur immediately. Subscriber notifications are scheduled asynchronously (non-blocking).
     * @param id - The {@link SignalID} to write.
     * @param newValue - The new value or updater function.
     */
    export function write<T>(id: SignalID<T>, newValue: T | ((prev: T) => T)): void {
        const slot = _resolveSignalSlot(id);

        if (slot === INVALID_INDEX) {
            logging.log('Attempted to write to an invalid or destroyed Signal', LogLevel.Warning);
            return;
        }

        const currentVal = _sigValues[slot] as T;
        const nextVal = typeof newValue === 'function' ? (newValue as (prev: T) => T)(currentVal) : newValue;

        if (isEqual(currentVal, nextVal)) return; // Don't trigger if value didn't change.

        _sigValues[slot] = nextVal; // Update state immediately.
        scheduleSignalSubscribers(slot); // Triggers updates asynchronously (non-blocking).
    }

    /**
     * Destroys a reactive Signal, unlinking all subscriber edges, freeing its SoA slot, and advancing its generation counter.
     * @param id - The {@link SignalID} to destroy.
     */
    export function destroySignal<T>(id: SignalID<T>): void {
        const slot = _resolveSignalSlot(id);

        if (slot !== INVALID_INDEX) {
            freeSignalSlot(slot);
        }
    }

    /**
     * Creates a side effect that runs immediately and re-runs whenever its tracked signals change.
     * This is the bridge between reactive state and the outside world (e.g., updating UI props, logs, timers).
     *
     * Behavior:
     *   1. Runs `fn` immediately (synchronously) to establish initial signal dependencies.
     *   2. Tracks any Signal read via `read()` during execution.
     *   3. Re-runs `fn` asynchronously whenever any of those Signals change.
     * @param fn - The function to execute.
     * @param options - The options for the effect.
     * @returns A generation-encoded {@link EffectID}, or `INVALID_INDEX` (-1) if capacity is exhausted.
     */
    export function createEffect(fn: () => void, options?: EffectOptions): EffectID {
        const slot = allocateSubscriberSlot(fn, options?.deferTicks ?? 0);

        if (slot === INVALID_INDEX) return INVALID_INDEX as EffectID;

        if (activeScope !== null) {
            activeScope.subSlots.push(slot);
        }

        // Effects run immediately on creation (synchronously) to establish initial dependencies.
        executeSubscriber(slot);

        return (slot + GENERATION_MULTIPLIER * _subGenerations[slot]) as EffectID;
    }

    /**
     * Destroys a reactive Effect, unlinking all signal dependencies, running pending cleanups, and freeing its SoA slot.
     * @param id - The {@link EffectID} to destroy.
     */
    export function destroyEffect(id: EffectID): void {
        const slot = _resolveSubscriberSlot(id);

        if (slot !== INVALID_INDEX) {
            freeSubscriberSlot(slot);
        }
    }

    /**
     * Creates a "Computed Value" or "Derived Signal".
     * Use this when a value depends on other signals. It is efficient because:
     *   - It caches the result in an underlying Signal slot.
     *   - It only notifies downstream listeners if the result actually changes (`isEqual`).
     * @example
     * const fullName = createMemo(() => `${read(firstName)} ${read(lastName)}`);
     * @param fn - The function to memoize.
     * @param options - The options for the memo.
     * @returns A {@link SignalID} yielding the memoized value.
     */
    export function createMemo<T>(fn: () => T, options?: MemoOptions): SignalID<T> {
        let sigId: SignalID<T> = INVALID_INDEX as SignalID<T>;
        const effectOptions: EffectOptions = { deferTicks: options?.deferTicks ?? 0 };

        createEffect(() => {
            if (sigId === INVALID_INDEX) {
                sigId = createSignal<T>(fn());
            } else {
                write(sigId, fn());
            }
        }, effectOptions);

        return sigId;
    }

    /**
     * Creates a reactive scope that is detached from the parent.
     * Unlike Effects, a Root does not track dependencies and does not auto-dispose when a parent effect re-runs.
     * You must manually call the provided `dispose` function to clean up all signals, effects, and `onCleanup` callbacks
     * created inside it.
     *
     * Use Case: Creating dynamic lists, global managers, or UI sections that live/die independently of their parent.
     * @param fn - A function that receives a `dispose` callback.
     * @returns The return value of `fn`.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T {
        // Saves and restores previous observer and scope contexts to support nested scopes.
        const prevObserver = activeSubscriberSlot;
        const prevScope = activeScope;

        activeSubscriberSlot = INVALID_INDEX; // createRoot is detached from any surrounding effect

        const scope: ScopeContext = {
            subSlots: [],
            sigSlots: [],
            cleanups: [],
        };

        activeScope = scope;

        const dispose = () => {
            // Run all cleanups registered via `onCleanup()`
            for (let i = 0; i < scope.cleanups.length; ++i) {
                try {
                    scope.cleanups[i]();
                } catch (err: unknown) {
                    logging.log('Error in root cleanup', LogLevel.Error, err);
                }
            }

            scope.cleanups.length = 0;

            // Free all subscribers/effects allocated within this scope
            for (let i = 0; i < scope.subSlots.length; ++i) {
                freeSubscriberSlot(scope.subSlots[i]);
            }

            scope.subSlots.length = 0;

            // Free all signals allocated within this scope
            for (let i = 0; i < scope.sigSlots.length; ++i) {
                freeSignalSlot(scope.sigSlots[i]);
            }

            scope.sigSlots.length = 0;
        };

        try {
            return fn(dispose);
        } finally {
            // Restore parent context
            activeSubscriberSlot = prevObserver;
            activeScope = prevScope;
        }
    }

    /****** Store ******/

    const STORE_SUBS_KEY = Symbol('solid_store_subs');
    const STORE_PROXY_KEY = Symbol('solid_store_proxy');

    function getStorePropertySignalId(target: object, key: string | symbol): SignalID {
        let map = (target as Record<symbol, Record<string | symbol, SignalID>>)[STORE_SUBS_KEY];

        if (!map) {
            map = Object.create(null);
            (target as Record<symbol, Record<string | symbol, SignalID>>)[STORE_SUBS_KEY] = map;
        }

        let sigId = map[key];

        if (sigId === undefined || _resolveSignalSlot(sigId) === INVALID_INDEX) {
            sigId = createSignal(Reflect.get(target, key));
            map[key] = sigId;
        }

        return sigId;
    }

    /**
     * Creates a reactive proxy object for handling nested state.
     * Unlike `createSignal` (which tracks the whole value), `createStore` tracks individual properties.
     *
     * Benefit: If you update `store.user.name`, only effects listening to `name` will run.
     * Effects listening to `store.user.age` will not run.
     *
     * In the SoA architecture, each accessed property lazily allocates a dedicated SoA Signal slot, enabling
     * fine-grained reactivity with zero object-graph overhead.
     * @param initialState - The initial object.
     * @returns A tuple `[store, setStore]`:
     *   - `store`: The reactive proxy object.
     *   - `setStore`: A setter function to update the store's properties.
     */
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void] {
        // Recursive handler to create proxies for nested objects
        const handler: ProxyHandler<object> = {
            get(target, key, receiver) {
                if (key === STORE_SUBS_KEY || key === STORE_PROXY_KEY) return Reflect.get(target, key, receiver);

                const value = Reflect.get(target, key, receiver);

                if (activeSubscriberSlot !== INVALID_INDEX) {
                    const sigId = getStorePropertySignalId(target, key);
                    const slot = _resolveSignalSlot(sigId);

                    if (slot !== INVALID_INDEX) {
                        trackDependency(slot, activeSubscriberSlot);
                    }
                }

                // If the value is a plain object or array, wrap it in a Proxy too (Lazy Proxying) so we can
                // track its internal properties. Leave classes and host objects alone.
                if (isPlainObject(value) || Array.isArray(value)) {
                    let cached = (value as Record<symbol, object>)[STORE_PROXY_KEY];

                    if (!cached) {
                        cached = new Proxy(value as object, handler);
                        (value as Record<symbol, object>)[STORE_PROXY_KEY] = cached;
                    }

                    return cached;
                }

                return value;
            },
            set(target, key, value, receiver) {
                const oldValue = Reflect.get(target, key, receiver);

                if (isEqual(oldValue, value)) return true; // Don't trigger if value didn't change.

                const isArr = Array.isArray(target);
                const prevLength = isArr ? target.length : 0;

                const result = Reflect.set(target, key, value, receiver);

                const map = (target as Record<symbol, Record<string | symbol, SignalID>>)[STORE_SUBS_KEY];

                if (map) {
                    const sigId = map[key];

                    if (sigId !== undefined) {
                        write(sigId, value);
                    }

                    if (isArr && key !== 'length' && target.length !== prevLength) {
                        const lenSigId = map['length'];

                        if (lenSigId !== undefined) {
                            write(lenSigId, target.length);
                        }
                    }
                }

                return result;
            },
            deleteProperty(target, key) {
                const hasKey = Reflect.has(target, key);
                const result = Reflect.deleteProperty(target, key);

                // Only trigger an update if the key actually existed and was deleted
                if (hasKey && result) {
                    const map = (target as Record<symbol, Record<string | symbol, SignalID>>)[STORE_SUBS_KEY];

                    if (map) {
                        const sigId = map[key];

                        if (sigId !== undefined) {
                            write(sigId, undefined);
                        }
                    }
                }

                return result;
            },
        };

        let rootProxy = (initialState as Record<symbol, T>)[STORE_PROXY_KEY];

        if (!rootProxy) {
            rootProxy = new Proxy(initialState, handler) as T;
            (initialState as Record<symbol, T>)[STORE_PROXY_KEY] = rootProxy;
        }

        const setStore = (producer: (state: T) => void) => producer(rootProxy!);

        return [rootProxy, setStore];
    }

    /****** Context (Theming & Dependency Injection) ******/

    /**
     * A definition object for a Context, used for dependency injection.
     * See {@link createContext}.
     */
    export interface Context<T> {
        id: symbol;
        defaultValue: T;
        _stack: T[];
        /**
         * Runs the provided function within a scope where this Context is set to `value`.
         * @param value - The value to provide.
         * @param fn - The function to run within the scope.
         */
        provide: (value: T, fn: () => void) => void;
    }

    /**
     * Creates a Context object to pass data deeply without "prop drilling".
     * @param defaultValue - The value returned by `useContext` if no provider is found in the stack.
     * @returns A {@link Context} object.
     */
    export function createContext<T>(defaultValue: T): Context<T> {
        const stack: T[] = [];

        return {
            id: Symbol('context_soa'),
            defaultValue,
            _stack: stack,
            provide(value: T, fn: () => void) {
                stack.push(value);

                try {
                    fn();
                } finally {
                    stack.pop();
                }
            },
        };
    }

    /**
     * Reads the current value of a Context. It climbs the scope stack to find the nearest `provide` call for this
     * context. If none is found, it returns the default value.
     * @param context - The {@link Context} to read.
     * @returns The current value of the {@link Context}.
     */
    export function useContext<T>(context: Context<T>): T {
        const stack = context._stack;
        return stack.length > 0 ? stack[stack.length - 1] : context.defaultValue;
    }

    /****** Factory ******/

    /**
     * Registers a cleanup callback for the current reactive scope.
     * If called inside a component/root, it runs when the component/root is disposed.
     * If called inside an Effect, it runs before the Effect re-executes (or when it is destroyed).
     *
     * Use Case: Clearing timers, removing event listeners, or specialized cleanup logic.
     * @param fn - The cleanup function to register.
     */
    export function onCleanup(fn: () => void): void {
        if (activeSubscriberSlot !== INVALID_INDEX) {
            let cleanups = _subCleanups[activeSubscriberSlot];

            if (cleanups === null) {
                cleanups = [fn];
                _subCleanups[activeSubscriberSlot] = cleanups;
            } else {
                cleanups.push(fn);
            }
        } else if (activeScope !== null) {
            activeScope.cleanups.push(fn);
        }
    }

    function setProperty<T>(instance: T, key: keyof T, value: unknown): void {
        try {
            (instance as unknown as Record<keyof T, unknown>)[key] = value;
        } catch {
            /* ignore read-only */
        }
    }

    /**
     * The "HyperScript" factory function. Creates a UI Component and sets up reactivity.
     * Supports both functional components and constructable UI classes.
     *
     * Automatically binds reactive signals and getter functions to component properties via fine-grained effects.
     * Includes automatic self-pruning: if a widget instance is destroyed out-of-band (`instance.isDeleted === true`),
     * the property effect unlinks its dependencies and reclaims its subscriber slot automatically.
     * @param component - Either a `UI` Class Constructor (e.g., `UI.Button`) or a Functional Component.
     * @param props - An object of properties. Values can be static OR reactive (SignalIDs / getter functions).
     * @param options - The options for the component reactivity.
     * @returns The created UI Instance.
     */
    export function h<P extends object, T>(
        component: Constructable<P, T> | FunctionalComponent<P, T>,
        props: Reactive<P> = {},
        options?: ComponentOptions
    ): T {
        // If the component is a function, call it passing raw 'props' (Reactive<P>) so the function can access
        // the signals directly.
        // The function is expected to call 'h' internally for a real UI Class, which will handle the bindings.
        if (!isClassConstructor(component)) return (component as FunctionalComponent<P, T>)(props);

        const ClassConstructor = component as Constructable<P, T>;
        const constructorParams: Record<string, unknown> = {};
        let hasReactiveProps = false;

        for (const key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

            const value = props[key];

            if (isEventHandlerProp(key)) {
                constructorParams[key] = value;
                continue;
            }

            if (typeof value === 'function') {
                hasReactiveProps = true;
                constructorParams[key] = (value as () => unknown)();
            } else if (typeof value === 'number' && _resolveSignalSlot(value as SignalID) !== INVALID_INDEX) {
                hasReactiveProps = true;
                constructorParams[key] = read(value as SignalID);
            } else {
                constructorParams[key] = value;
            }
        }

        const instance = new ClassConstructor(constructorParams as P);

        // Setup reactive bindings only if reactive props exist
        if (hasReactiveProps) {
            const effectOptions: EffectOptions = { deferTicks: options?.deferTicks ?? 0 };

            for (const key in props) {
                if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

                const value = props[key];

                if (isEventHandlerProp(key)) continue;

                const propKey = key as unknown as keyof T;

                if (typeof value === 'function') {
                    const accessor = value as () => unknown;

                    createEffect(() => {
                        // Self-prune if widget was destroyed out-of-band
                        if ((instance as { isDeleted?: boolean }).isDeleted) {
                            if (activeSubscriberSlot !== INVALID_INDEX) {
                                freeSubscriberSlot(activeSubscriberSlot);
                            }

                            return;
                        }

                        setProperty(instance, propKey, accessor());
                    }, effectOptions);
                } else if (typeof value === 'number' && _resolveSignalSlot(value as SignalID) !== INVALID_INDEX) {
                    const sigId = value as SignalID;

                    createEffect(() => {
                        // Self-prune if widget was destroyed out-of-band
                        if ((instance as { isDeleted?: boolean }).isDeleted) {
                            if (activeSubscriberSlot !== INVALID_INDEX) {
                                freeSubscriberSlot(activeSubscriberSlot);
                            }

                            return;
                        }

                        setProperty(instance, propKey, read(sigId));
                    }, effectOptions);
                }
            }
        }

        // Register instance deletion on parent scope cleanup if instance supports delete()
        const instanceWithDelete = instance as { delete?: () => void };

        if (typeof instanceWithDelete.delete === 'function') {
            onCleanup(() => {
                instanceWithDelete.delete!();
            });
        }

        return instance;
    }

    /**
     * A generic List Renderer optimized for Game UI.
     * Different from `array.map()` in that `Index` renders components based on their array position, not their value.
     * If data moves (e.g., `["A", "B"]` -> `["B", "A"]`), the widgets at index 0 and 1 stay in place and simply update
     * their content to match the elements at their respective indexes via per-row signals.
     * This avoids destroying/recreating widgets, which is crucial for performance and Z-order stability.
     * @param each - The array signal or accessor function to iterate over.
     * @param render - A builder function receiving the item (as a SignalID) and the index (static number).
     * @param options - The options for the index.
     */
    export function Index<T>(
        each: SignalID<T[]> | (() => T[]),
        render: (item: SignalID<T>, index: number) => unknown,
        options?: IndexOptions
    ): void {
        // Track the row controllers (data setters and disposers) for every active row.
        // We use this to update data without re-rendering, or kill rows on shrink.
        const rows: { setItem: (val: T) => void; dispose: () => void }[] = [];

        createEffect(
            () => {
                const list = typeof each === 'function' ? each() : read<T[]>(each);
                const newLength = list ? list.length : 0;
                const oldLength = rows.length;

                // If new rows are needed, update existing rows and create new ones.
                if (newLength > oldLength) {
                    for (let i = 0; i < oldLength; ++i) {
                        rows[i].setItem(list[i]);
                    }

                    for (let i = oldLength; i < newLength; ++i) {
                        createRoot((dispose) => {
                            // Create a specific signal for this row's data.
                            // This allows the row to update its own properties without re-running the list effect.
                            const itemSig = createSignal(list[i]);

                            // Capture the UI element returned by the render function.
                            const uiElement = render(itemSig, i);

                            // Enhance the dispose function to ALSO delete the UI element.
                            const rowDispose = () => {
                                dispose(); // Kills reactive effects.

                                // Safely call `delete()` if the returned element supports it.
                                if (uiElement && typeof (uiElement as { delete?: () => void }).delete === 'function') {
                                    (uiElement as { delete: () => void }).delete();
                                }
                            };

                            // Save row controller to our tracker
                            rows.push({
                                setItem: (val: T) => write(itemSig, val),
                                dispose: rowDispose,
                            });
                        });
                    }

                    return;
                }

                // If fewer rows are needed, dispose of unnecessary ones.
                if (newLength < oldLength) {
                    for (let i = oldLength - 1; i >= newLength; --i) {
                        rows.pop()?.dispose();
                    }
                }

                // Update remaining rows
                for (let i = 0; i < newLength; ++i) {
                    rows[i].setItem(list[i]);
                }
            },
            { deferTicks: options?.deferTicks ?? 0 }
        );
    }
}
