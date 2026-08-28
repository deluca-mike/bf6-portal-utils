import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 2.0.0
export namespace SolidUISOA {
    /****** Logging ******/

    const logging = new Logging('SolidUISOA');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /****** Capacity Limits & Constants ******/

    const INVALID_INDEX = -1;

    /**
     * Maximum number of concurrent subscribers (effects, memos, and reactive property bindings) supported.
     *
     * Performance vs Memory trade-offs:
     * - Flat buffers allocate ~14 bytes of TypedArray memory per subscriber slot.
     * - Increasing this value supports larger UI trees and more simultaneous effects.
     * - Decreasing this value saves static startup heap memory.
     */
    export const MAX_SUBSCRIBERS = 8_192;

    /**
     * Maximum number of concurrent reactive signals supported across all components and stores.
     *
     * Performance vs Memory trade-offs:
     * - Flat buffers allocate ~10 bytes of TypedArray memory per signal slot.
     * - Increasing this value supports more fine-grained state variables.
     * - Decreasing this value reduces upfront resident memory.
     */
    export const MAX_SIGNALS = 8_192;

    /**
     * Maximum number of subscriber executions allowed in a single microtask flush loop.
     * Prevents infinite re-entrant loops from locking up the thread.
     */
    export const MAX_EXECUTIONS_PER_FLUSH = 1_000;

    /**
     * Maximum number of microtask flushes permitted within a single logical engine tick.
     */
    export const MAX_FLUSHES_PER_TICK = 1_000;

    // Bitflags (stored in _subFlags and _sigFlags)
    const FLAG_IN_USE = 1 << 0;
    const FLAG_PENDING = 1 << 1;
    const FLAG_DISPOSED = 1 << 2;

    /****** Structure of Arrays (SoA) Buffers ******/

    // --- Subscriber Storage ---
    const _subFlags = new Uint8Array(MAX_SUBSCRIBERS);
    const _subDeferTicks = new Uint16Array(MAX_SUBSCRIBERS);
    const _subTargetTick = new Uint32Array(MAX_SUBSCRIBERS);
    const _subDepCount = new Uint16Array(MAX_SUBSCRIBERS);
    const _subFree = new Int16Array(MAX_SUBSCRIBERS);

    const _subFn = new Array<(() => void) | null>(MAX_SUBSCRIBERS);
    const _subDeps = new Array<number[] | null>(MAX_SUBSCRIBERS);
    const _subCleanups = new Array<(() => void)[] | null>(MAX_SUBSCRIBERS);

    // Intrusive free-list initialization for subscribers
    for (let i = 0; i < MAX_SUBSCRIBERS - 1; ++i) {
        _subFree[i] = i + 1;
    }
    _subFree[MAX_SUBSCRIBERS - 1] = INVALID_INDEX;
    let _firstFreeSub = 0;

    // --- Signal Storage ---
    const _sigFlags = new Uint8Array(MAX_SIGNALS);
    const _sigFree = new Int16Array(MAX_SIGNALS);
    const _sigValues = new Array<unknown>(MAX_SIGNALS);
    const _sigSubs = new Array<number | number[] | null>(MAX_SIGNALS);

    // Intrusive free-list initialization for signals
    for (let i = 0; i < MAX_SIGNALS - 1; ++i) {
        _sigFree[i] = i + 1;
    }
    _sigFree[MAX_SIGNALS - 1] = INVALID_INDEX;
    let _firstFreeSig = 0;

    interface FinalizationRegistryInterface<T> {
        register(target: object, heldValue: T): void;
    }
    type FinalizationRegistryConstructor = new <T>(
        cleanupCallback: (heldValue: T) => void
    ) => FinalizationRegistryInterface<T>;

    const FinalizationRegistryRef = (globalThis as Record<string, unknown>)['FinalizationRegistry'] as
        | FinalizationRegistryConstructor
        | undefined;

    // Optional FinalizationRegistry to recycle signal slots when user references drop
    const sigCleanupRegistry =
        typeof FinalizationRegistryRef === 'function'
            ? new FinalizationRegistryRef<number>((sigId: number) => {
                  freeSignalSlot(sigId);
              })
            : null;

    // --- Flat Scheduler Queues ---
    const _immediateQueue = new Int16Array(MAX_SUBSCRIBERS);
    const _deferredQueue = new Int16Array(MAX_SUBSCRIBERS);
    let _immediateCount = 0;
    let _deferredCount = 0;

    /****** Memory Allocators & Free-Lists ******/

    function allocateSignalSlot<T>(initialValue: T): number {
        if (_firstFreeSig === INVALID_INDEX) {
            throw new Error(`[SolidUISOA] Maximum reactive signals exceeded (MAX_SIGNALS=${MAX_SIGNALS})`);
        }

        const id = _firstFreeSig;
        _firstFreeSig = _sigFree[id];

        _sigFlags[id] = FLAG_IN_USE;
        _sigValues[id] = initialValue;
        _sigSubs[id] = null;

        return id;
    }

    function freeSignalSlot(id: number): void {
        if ((_sigFlags[id] & FLAG_IN_USE) === 0) return;

        _sigFlags[id] = 0;
        _sigValues[id] = null;
        _sigSubs[id] = null;

        _sigFree[id] = _firstFreeSig;
        _firstFreeSig = id;
    }

    function allocateSubscriberSlot(fn: () => void, deferTicks: number): number {
        if (_firstFreeSub === INVALID_INDEX) {
            throw new Error(`[SolidUISOA] Maximum reactive subscribers exceeded (MAX_SUBSCRIBERS=${MAX_SUBSCRIBERS})`);
        }

        const id = _firstFreeSub;
        _firstFreeSub = _subFree[id];

        _subFlags[id] = FLAG_IN_USE;
        _subDeferTicks[id] = Number.isFinite(deferTicks) ? Math.max(0, Math.floor(deferTicks)) : 0;
        _subTargetTick[id] = 0;
        _subDepCount[id] = 0;
        _subFn[id] = fn;
        _subCleanups[id] = null;
        _subDeps[id] = null;

        return id;
    }

    function freeSubscriberSlot(id: number): void {
        if ((_subFlags[id] & FLAG_IN_USE) === 0) return;

        _subFlags[id] = FLAG_DISPOSED;
        runSubCleanups(id);

        const deps = _subDeps[id];
        if (deps !== null) {
            for (let i = 0; i < deps.length; ++i) {
                removeSubscriberFromSignal(deps[i], id);
            }
            _subDeps[id] = null;
        }

        _subFn[id] = null;
        _subCleanups[id] = null;
        _subDepCount[id] = 0;

        _subFree[id] = _firstFreeSub;
        _firstFreeSub = id;
    }

    function runSubCleanups(subId: number): void {
        const cleanups = _subCleanups[subId];
        if (cleanups !== null) {
            for (let i = 0; i < cleanups.length; ++i) {
                try {
                    cleanups[i]();
                } catch (error: unknown) {
                    logging.log('Error in cleanup:', LogLevel.Error, error);
                }
            }
            _subCleanups[subId] = null;
        }
    }

    /****** Dependency Graph Management ******/

    function addSubscriberToSignal(sigId: number, subId: number): void {
        const subs = _sigSubs[sigId];
        if (subs === null) {
            _sigSubs[sigId] = subId;
            return;
        }
        if (typeof subs === 'number') {
            if (subs === subId) return;
            _sigSubs[sigId] = [subs, subId];
            return;
        }
        if (subs.indexOf(subId) === -1) {
            subs.push(subId);
        }
    }

    function removeSubscriberFromSignal(sigId: number, subId: number): void {
        const subs = _sigSubs[sigId];
        if (subs === null) return;

        if (typeof subs === 'number') {
            if (subs === subId) {
                _sigSubs[sigId] = null;
            }
            return;
        }

        const idx = subs.indexOf(subId);
        if (idx !== -1) {
            const last = subs.pop()!;
            if (idx < subs.length) {
                subs[idx] = last;
            }
            if (subs.length === 1) {
                _sigSubs[sigId] = subs[0];
            } else if (subs.length === 0) {
                _sigSubs[sigId] = null;
            }
        }
    }

    /**
     * Tracks dependency between a signal slot and the currently active subscriber slot.
     * @param sigId - The integer signal slot ID.
     * @param subId - The integer subscriber slot ID.
     */
    function trackDependency(sigId: number, subId: number): void {
        const idx = _subDepCount[subId]++;
        let deps = _subDeps[subId];

        if (deps === null) {
            deps = [];
            _subDeps[subId] = deps;
        }

        if (idx < deps.length) {
            if (deps[idx] === sigId) {
                // FAST PATH: Dependency is identical to previous execution.
                return;
            }
            // Dependency changed at this slot
            removeSubscriberFromSignal(deps[idx], subId);
            deps[idx] = sigId;
        } else {
            deps.push(sigId);
        }

        addSubscriberToSignal(sigId, subId);
    }

    let activeSubscriberId = INVALID_INDEX;
    let currentCleanupList: (() => void)[] | null = null;

    function executeSubscriber(subId: number): void {
        if ((_subFlags[subId] & FLAG_IN_USE) === 0 || (_subFlags[subId] & FLAG_DISPOSED) !== 0) return;

        runSubCleanups(subId);

        const prevObserver = activeSubscriberId;
        const prevCleanupList = currentCleanupList;

        activeSubscriberId = subId;
        currentCleanupList = null;
        _subDepCount[subId] = 0;

        const fn = _subFn[subId];

        try {
            if (fn !== null) fn();
        } finally {
            activeSubscriberId = prevObserver;
            currentCleanupList = prevCleanupList;

            const deps = _subDeps[subId];
            const activeCount = _subDepCount[subId];

            if (deps !== null && activeCount < deps.length) {
                for (let i = activeCount; i < deps.length; ++i) {
                    removeSubscriberFromSignal(deps[i], subId);
                }
                deps.length = activeCount;
            }
        }
    }

    /****** Tick Tracking & Scheduling ******/

    let currentTick = 0;
    let isFlushPending = false;
    let tickFlushCount = 0;
    const STATIC_PROMISE = Promise.resolve();

    function handleTick(): void {
        ++currentTick;
        tickFlushCount = 0;

        if (_deferredCount > 0) {
            let writeIndex = 0;

            for (let i = 0; i < _deferredCount; ++i) {
                const subId = _deferredQueue[i];

                if (_subTargetTick[subId] > currentTick) {
                    _deferredQueue[writeIndex++] = subId;
                    continue;
                }

                if ((_subFlags[subId] & FLAG_DISPOSED) !== 0) {
                    _subFlags[subId] &= ~FLAG_PENDING;
                } else {
                    if (_immediateCount < MAX_SUBSCRIBERS) {
                        _immediateQueue[_immediateCount++] = subId;
                    }
                }
            }

            _deferredCount = writeIndex;
        }

        if (_immediateCount > 0) {
            queueFlush();
        }
    }

    Events.OngoingGlobal.subscribe(handleTick);

    function flush(): void {
        isFlushPending = false;
        if (_immediateCount === 0) return;

        if (++tickFlushCount > MAX_FLUSHES_PER_TICK) {
            for (let i = 0; i < _immediateCount; ++i) {
                _subFlags[_immediateQueue[i]] &= ~FLAG_PENDING;
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
                    _subFlags[_immediateQueue[j]] &= ~FLAG_PENDING;
                }
                _immediateCount = 0;
                logging.log('Max executions per flush exceeded', LogLevel.Error);
                return;
            }

            const subId = _immediateQueue[i++];
            _subFlags[subId] &= ~FLAG_PENDING;

            if ((_subFlags[subId] & FLAG_DISPOSED) !== 0) continue;

            try {
                executeSubscriber(subId);
            } catch (error: unknown) {
                logging.log('Error in effect:', LogLevel.Error, error);
            }
        }

        _immediateCount = 0;
    }

    function scheduleSubscriber(subId: number): void {
        const flags = _subFlags[subId];
        if ((flags & FLAG_PENDING) !== 0 || (flags & FLAG_DISPOSED) !== 0 || (flags & FLAG_IN_USE) === 0) {
            return;
        }

        _subFlags[subId] |= FLAG_PENDING;

        if (_subDeferTicks[subId] === 0) {
            if (_immediateCount < MAX_SUBSCRIBERS) {
                _immediateQueue[_immediateCount++] = subId;
            }
            queueFlush();
        } else {
            _subTargetTick[subId] = currentTick + _subDeferTicks[subId];
            if (_deferredCount < MAX_SUBSCRIBERS) {
                _deferredQueue[_deferredCount++] = subId;
            }
        }
    }

    function scheduleSignalSubscribers(sigId: number): void {
        const subs = _sigSubs[sigId];
        if (subs === null) return;

        if (typeof subs === 'number') {
            scheduleSubscriber(subs);
            return;
        }

        for (let i = 0; i < subs.length; ++i) {
            scheduleSubscriber(subs[i]);
        }
    }

    function queueFlush(): void {
        if (isFlushPending) return;
        isFlushPending = true;
        STATIC_PROMISE.then(flush);
    }

    /****** Public Types ******/

    /**
     * A generic function that retrieves the current value of a reactive signal.
     */
    export type Accessor<T> = () => T;

    /**
     * A function used to update the value of a Signal.
     */
    export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;

    type Constructable<Params, Instance> = new (params: Params) => Instance;
    type FunctionalComponent<Params, Instance> = (props: Reactive<Params>) => Instance;

    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    /**
     * Options for an effect.
     */
    export type EffectOptions = {
        deferTicks?: number;
    };

    /**
     * Options for a memo.
     */
    export type MemoOptions = {
        deferTicks?: number;
    };

    /**
     * Options for a component.
     */
    export type ComponentOptions = {
        deferTicks?: number;
    };

    /**
     * Options for an index.
     */
    export type IndexOptions = {
        deferTicks?: number;
    };

    /****** Local Utils ******/

    function isPlainObject(obj: unknown): boolean {
        return obj !== null && typeof obj === 'object' && obj.constructor === Object;
    }

    function isEqual(a: unknown, b: unknown): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; ++i) {
                if (!isEqual(a[i], b[i])) return false;
            }
            return true;
        }

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
                try {
                    return mod.Equals(a, b);
                } catch {
                    return true;
                }
            }

            return true;
        }

        return false;
    }

    function isAccessor<T>(value: T): value is T & Accessor<T> {
        return typeof value === 'function';
    }

    function isClassConstructor(fn: unknown): boolean {
        if (typeof fn !== 'function') return false;
        if (fn.toString().substring(0, 5) === 'class') return true;
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
     * @param fn - The function to execute.
     * @returns The return value of `fn`.
     */
    export function untrack<T>(fn: () => T): T {
        const prevObserver = activeSubscriberId;
        activeSubscriberId = INVALID_INDEX;

        try {
            return fn();
        } finally {
            activeSubscriberId = prevObserver;
        }
    }

    /**
     * Creates a simple reactive state (a "Signal") backed by an integer SoA slot.
     * @param initialValue - The starting value.
     * @returns A tuple `[read, write]`.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
        const sigId = allocateSignalSlot(initialValue);

        const read: Accessor<T> = (): T => {
            if (activeSubscriberId !== INVALID_INDEX) {
                trackDependency(sigId, activeSubscriberId);
            }
            return _sigValues[sigId] as T;
        };

        const write: Setter<T> = (newValue: T | ((prev: T) => T)): void => {
            const currentVal = _sigValues[sigId] as T;
            const nextVal = typeof newValue === 'function' ? (newValue as (prev: T) => T)(currentVal) : newValue;

            if (isEqual(currentVal, nextVal)) return;

            _sigValues[sigId] = nextVal;
            scheduleSignalSubscribers(sigId);
        };

        const tuple: [Accessor<T>, Setter<T>] = [read, write];
        sigCleanupRegistry?.register(tuple, sigId);

        if (currentCleanupList !== null) {
            currentCleanupList.push(() => freeSignalSlot(sigId));
        }

        return tuple;
    }

    /**
     * Creates a side effect that runs immediately and re-runs whenever its dependencies change.
     * @param fn - The function to execute.
     * @param options - The options for the effect.
     * @returns A disposer function.
     */
    export function createEffect(fn: () => void, options?: EffectOptions): () => void {
        const subId = allocateSubscriberSlot(fn, options?.deferTicks ?? 0);
        executeSubscriber(subId);

        const disposer = () => freeSubscriberSlot(subId);

        if (currentCleanupList !== null) {
            currentCleanupList.push(disposer);
        }

        return disposer;
    }

    /**
     * Creates a computed value / derived signal.
     * @param fn - The memoization computation.
     * @param options - The options for the memo.
     * @returns The accessor function.
     */
    export function createMemo<T>(fn: () => T, options?: MemoOptions): Accessor<T> {
        let signal: [Accessor<T>, Setter<T>] | null = null;
        const effectOptions: EffectOptions = { deferTicks: options?.deferTicks ?? 0 };

        createEffect(() => {
            if (signal === null) {
                signal = createSignal<T>(fn());
            } else {
                signal[1](fn());
            }
        }, effectOptions);

        return signal![0];
    }

    /**
     * Creates a reactive scope detached from any parent effect.
     * @param fn - Function receiving a dispose callback.
     * @returns Return value of `fn`.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T {
        const previousObserver = activeSubscriberId;
        const previousCleanupList = currentCleanupList;

        activeSubscriberId = INVALID_INDEX;
        const cleanupList: (() => void)[] = [];
        currentCleanupList = cleanupList;

        const dispose = () => {
            for (let i = 0; i < cleanupList.length; ++i) {
                cleanupList[i]();
            }
            cleanupList.length = 0;
        };

        try {
            return fn(dispose);
        } finally {
            activeSubscriberId = previousObserver;
            currentCleanupList = previousCleanupList;
        }
    }

    /****** Store ******/

    const STORE_SUBS_KEY = Symbol('solid_soa_store_subs');
    const STORE_PROXY_KEY = Symbol('solid_soa_store_proxy');

    function getStorePropertySignalId(target: object, key: string | symbol): number {
        let map = (target as Record<symbol, Record<string | symbol, number>>)[STORE_SUBS_KEY];
        if (!map) {
            map = Object.create(null);
            (target as Record<symbol, Record<string | symbol, number>>)[STORE_SUBS_KEY] = map;
        }

        let sigId = map[key];
        if (sigId === undefined) {
            sigId = allocateSignalSlot(Reflect.get(target, key));
            map[key] = sigId;
        }

        return sigId;
    }

    /**
     * Creates a reactive proxy object for handling nested state.
     * @param initialState - The initial object.
     * @returns A tuple `[store, setStore]`.
     */
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void] {
        const handler: ProxyHandler<object> = {
            get(target, key, receiver) {
                if (key === STORE_SUBS_KEY || key === STORE_PROXY_KEY) {
                    return Reflect.get(target, key, receiver);
                }

                const value = Reflect.get(target, key, receiver);

                if (activeSubscriberId !== INVALID_INDEX) {
                    const sigId = getStorePropertySignalId(target, key);
                    trackDependency(sigId, activeSubscriberId);
                }

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
                if (isEqual(oldValue, value)) return true;

                const isArr = Array.isArray(target);
                const prevLength = isArr ? target.length : 0;

                const result = Reflect.set(target, key, value, receiver);

                const map = (target as Record<symbol, Record<string | symbol, number>>)[STORE_SUBS_KEY];
                if (map) {
                    const sigId = map[key];
                    if (sigId !== undefined) {
                        _sigValues[sigId] = value;
                        scheduleSignalSubscribers(sigId);
                    }
                    if (isArr && key !== 'length' && target.length !== prevLength) {
                        const lenSigId = map['length'];
                        if (lenSigId !== undefined) {
                            _sigValues[lenSigId] = target.length;
                            scheduleSignalSubscribers(lenSigId);
                        }
                    }
                }

                return result;
            },
            deleteProperty(target, key) {
                const hasKey = Reflect.has(target, key);
                const result = Reflect.deleteProperty(target, key);

                if (hasKey && result) {
                    const map = (target as Record<symbol, Record<string | symbol, number>>)[STORE_SUBS_KEY];
                    if (map) {
                        const sigId = map[key];
                        if (sigId !== undefined) {
                            _sigValues[sigId] = undefined;
                            scheduleSignalSubscribers(sigId);
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

    /****** Context ******/

    /**
     * Context definition object.
     */
    export interface Context<T> {
        id: symbol;
        defaultValue: T;
        _stack: T[];
        provide: (value: T, fn: () => void) => void;
    }

    /**
     * Creates a Context object.
     * @param defaultValue - Default fallback value.
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
     * Reads the current value of a context.
     * @param context - The context to read.
     * @returns Current context value.
     */
    export function useContext<T>(context: Context<T>): T {
        const stack = context._stack;
        return stack.length > 0 ? stack[stack.length - 1] : context.defaultValue;
    }

    /****** Factory ******/

    /**
     * Registers a cleanup callback for the active scope.
     * @param fn - The cleanup function.
     */
    export function onCleanup(fn: () => void): void {
        if (activeSubscriberId !== INVALID_INDEX) {
            let cleanups = _subCleanups[activeSubscriberId];
            if (cleanups === null) {
                cleanups = [fn];
                _subCleanups[activeSubscriberId] = cleanups;
            } else {
                cleanups.push(fn);
            }
        } else if (currentCleanupList !== null) {
            currentCleanupList.push(fn);
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
     * The HyperScript factory function for UI Components.
     * @param component - Class constructor or functional component.
     * @param props - Static or reactive props.
     * @param options - Component options.
     * @returns Created UI instance.
     */
    export function h<P extends object, T>(
        component: Constructable<P, T> | FunctionalComponent<P, T>,
        props: Reactive<P> = {},
        options?: ComponentOptions
    ): T {
        if (!isClassConstructor(component)) return (component as FunctionalComponent<P, T>)(props);

        const ClassConstructor = component as Constructable<P, T>;

        const previousCleanupList = currentCleanupList;
        let localCleanupList: (() => void)[] | null = null;
        currentCleanupList = null;

        const constructorParams: Record<string, unknown> = {};
        let hasReactiveProps = false;

        for (const key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

            const value = props[key];

            if (isEventHandlerProp(key) || !isAccessor(value)) {
                constructorParams[key] = value;
                continue;
            }

            hasReactiveProps = true;
            constructorParams[key] = (value as Accessor<unknown>)();
        }

        const instance = new ClassConstructor(constructorParams as P);

        if (hasReactiveProps) {
            if (localCleanupList === null) localCleanupList = [];
            const effectOptions: EffectOptions = { deferTicks: options?.deferTicks ?? 0 };

            for (const key in props) {
                if (!Object.prototype.hasOwnProperty.call(props, key)) continue;

                const value = props[key];
                if (isEventHandlerProp(key) || !isAccessor(value)) continue;

                const accessor = value as Accessor<unknown>;
                const propKey = key as unknown as keyof T;

                const dispose = createEffect(() => {
                    setProperty(instance, propKey, accessor());
                }, effectOptions);

                localCleanupList.push(dispose);
            }
        }

        if (localCleanupList !== null && localCleanupList.length > 0) {
            const instanceWithDelete = instance as { delete?: (...args: unknown[]) => unknown };
            const originalDelete = instanceWithDelete.delete;

            if (typeof originalDelete === 'function') {
                const cleanups = localCleanupList;
                instanceWithDelete.delete = function (...args: unknown[]) {
                    for (let i = 0; i < cleanups.length; ++i) {
                        cleanups[i]();
                    }
                    cleanups.length = 0;
                    return originalDelete.apply(this, args);
                };
            }
        }

        currentCleanupList = previousCleanupList;

        const instanceWithDelete = instance as { delete?: () => void };
        if (typeof instanceWithDelete.delete === 'function') {
            onCleanup(() => instanceWithDelete.delete!());
        }

        return instance;
    }

    /**
     * Generic List Renderer for Game UI.
     * @param each - Array accessor.
     * @param render - Row builder function.
     * @param options - Index options.
     */
    export function Index<T>(
        each: Accessor<T[]>,
        render: (item: Accessor<T>, index: number) => unknown,
        options?: IndexOptions
    ): void {
        const rows: { setItem: Setter<T>; dispose: () => void }[] = [];

        createEffect(
            () => {
                const list = each();
                const newLength = list.length;
                const oldLength = rows.length;

                if (newLength > oldLength) {
                    for (let i = 0; i < oldLength; ++i) {
                        rows[i].setItem(list[i]);
                    }

                    for (let i = oldLength; i < newLength; ++i) {
                        createRoot((dispose) => {
                            const [item, setItem] = createSignal(list[i]);
                            const uiElement = render(item, i);

                            const rowDispose = () => {
                                dispose();
                                if (uiElement && typeof (uiElement as { delete?: () => void }).delete === 'function') {
                                    (uiElement as { delete: () => void }).delete();
                                }
                            };

                            rows.push({ setItem, dispose: rowDispose });
                        });
                    }

                    return;
                }

                if (newLength < oldLength) {
                    for (let i = oldLength - 1; i >= newLength; --i) {
                        rows.pop()?.dispose();
                    }
                }

                for (let i = 0; i < newLength; ++i) {
                    rows[i].setItem(list[i]);
                }
            },
            { deferTicks: options?.deferTicks ?? 0 }
        );
    }
}

// Default export alias for seamless module parity
export const SolidUI = SolidUISOA;
