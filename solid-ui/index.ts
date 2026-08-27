import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 2.6.0
export namespace SolidUI {
    /****** Logging ******/

    const logging = new Logging('SolidUI');

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

    /****** Tunable Scheduler Constants ******/

    /**
     * Maximum number of subscriber executions allowed in a single microtask flush loop.
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

    /****** Classes and Types ******/

    /**
     * Polymorphic subscriber representation to eliminate array allocations for 0- and 1-subscriber signals.
     * - `null`: 0 subscribers (0 array allocation).
     * - `Subscriber`: Exactly 1 subscriber (direct reference, 0 array allocation).
     * - `Subscriber[]`: 2+ subscribers (promoted to array only on branch/multiplexing).
     */
    type Subs = Subscriber | Subscriber[] | null;

    function addSubscriber(subs: Subs, sub: Subscriber): Subs {
        if (subs === null) return sub;
        if (!Array.isArray(subs)) {
            if (subs === sub) return subs;
            return [subs, sub];
        }
        if (subs.indexOf(sub) === -1) {
            subs.push(sub);
        }
        return subs;
    }

    function removeSubscriber(subs: Subs, sub: Subscriber): Subs {
        if (subs === null) return null;
        if (!Array.isArray(subs)) {
            return subs === sub ? null : subs;
        }
        const idx = subs.indexOf(sub);
        if (idx !== -1) {
            const last = subs.pop()!;
            if (idx < subs.length) {
                subs[idx] = last;
            }
            if (subs.length === 1) {
                return subs[0];
            }
            if (subs.length === 0) {
                return null;
            }
        }
        return subs;
    }

    /**
     * Internal interface for dependency sources (Signals, Store properties).
     */
    interface DependencySource {
        subs: Subs;
        unsubscribe(sub: Subscriber): void;
    }

    /**
     * Tracks dependency between a signal/source and the currently executing observer.
     * Uses generation cursor checking (depCount) for zero-allocation O(1) steady-state re-runs.
     * @param source - The dependency source to track.
     * @param observer - The currently executing subscriber observer.
     */
    function trackDependency(source: DependencySource, observer: Subscriber): void {
        const idx = observer.depCount++;
        if (idx < observer.deps.length) {
            if (observer.deps[idx] === source) {
                // FAST PATH: Dependency is identical to previous execution.
                // 0 array allocations, 0 unsubscriptions, 0 indexOf scans.
                return;
            }
            // Branch changed: unsubscribe old dependency at this slot
            observer.deps[idx].unsubscribe(observer);
            observer.deps[idx] = source;
        } else {
            observer.deps.push(source);
        }
        source.subs = addSubscriber(source.subs, observer);
    }

    let activeObserver: Subscriber | null = null;
    let currentCleanupList: (() => void)[] | null = null;

    class Subscriber {
        public deps: DependencySource[] = [];
        public depCount = 0;
        public cleanups: (() => void)[] | null = null;

        public isPending = false;
        public deferTicks: number;
        public targetTick = 0;
        public isDisposed = false;

        constructor(
            public fn: () => void,
            deferTicks: number = 0
        ) {
            this.deferTicks = Number.isFinite(deferTicks) ? Math.max(0, Math.floor(deferTicks)) : 0;

            // Effects run immediately on creation (synchronously) to establish initial dependencies.
            this.execute();
        }

        runCleanups(): void {
            if (this.cleanups !== null) {
                for (let i = 0; i < this.cleanups.length; ++i) {
                    try {
                        this.cleanups[i]();
                    } catch (error: unknown) {
                        logging.log('Error in cleanup:', LogLevel.Error, error);
                    }
                }
                this.cleanups.length = 0;
            }
        }

        execute(): void {
            if (this.isDisposed) return;
            this.runCleanups();

            const prevObserver = activeObserver;
            const prevCleanupList = currentCleanupList;

            // eslint-disable-next-line @typescript-eslint/no-this-alias
            activeObserver = this;
            currentCleanupList = null; // Cleanups inside effect attach to this subscriber
            this.depCount = 0;

            try {
                this.fn();
            } finally {
                activeObserver = prevObserver;
                currentCleanupList = prevCleanupList;

                // Prune any excess dependencies if conditional branching reduced dependency count
                if (this.depCount < this.deps.length) {
                    for (let i = this.depCount; i < this.deps.length; ++i) {
                        this.deps[i].unsubscribe(this);
                    }
                    this.deps.length = this.depCount;
                }
            }
        }

        dispose(): void {
            if (this.isDisposed) return;
            this.isDisposed = true;
            this.runCleanups();

            for (let i = 0; i < this.deps.length; ++i) {
                this.deps[i].unsubscribe(this);
            }
            this.deps.length = 0;
            this.depCount = 0;
        }
    }

    class SignalState<T> implements DependencySource {
        public subs: Subs = null;

        constructor(public value: T) {}

        read(): T {
            if (activeObserver !== null) {
                trackDependency(this, activeObserver);
            }
            return this.value;
        }

        write(newValue: T | ((prev: T) => T)): void {
            const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(this.value) : newValue;

            if (isEqual(this.value, nextValue)) return; // Don't trigger if value didn't change.

            this.value = nextValue; // Update state immediately.
            scheduleSubscribers(this.subs); // Triggers updates asynchronously (non-blocking).
        }

        unsubscribe(sub: Subscriber): void {
            this.subs = removeSubscriber(this.subs, sub);
        }
    }

    /**
     * A generic function that retrieves the current value of a reactive signal.
     * Key Concept: Calling an Accessor establishes a "dependency."
     * If you call this function inside an Effect or Memo, that Effect will automatically re-run whenever the Signal's
     * value changes.
     */
    export type Accessor<T> = () => T;

    /**
     * A function used to update the value of a Signal.
     * You can pass either:
     *   - A raw value (e.g., `5`).
     *   - An "updater" function that receives the previous value (e.g., `prev => prev + 1`).
     */
    export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;

    // Defines the contract for any UI Class Constructor (Native or Custom).
    type Constructable<Params, Instance> = new (params: Params) => Instance;

    type FunctionalComponent<Params, Instance> = (props: Reactive<Params>) => Instance;

    // Transform Params so every property can optionally be a Signal.
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    /**
     * The options for an effect.
     */
    export type EffectOptions = {
        /*
         * The maximum number of ticks to defer the effect execution (a window between effect executions).
         */
        deferTicks?: number;
    };

    /**
     * The options for a memo.
     */
    export type MemoOptions = {
        /*
         * The maximum number of ticks to defer the memo execution (a window between memo executions).
         */
        deferTicks?: number;
    };

    /**
     * The options for a component.
     */
    export type ComponentOptions = {
        /*
         * The maximum number of ticks to defer the component property updates (a window between property updates).
         */
        deferTicks?: number;
    };

    /**
     * The options for an index.
     */
    export type IndexOptions = {
        /*
         * The maximum number of ticks to defer the index updates (a window between index updates).
         */
        deferTicks?: number;
    };

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

    function isAccessor<T>(value: T): value is T & Accessor<T> {
        return typeof value === 'function';
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

    // Two-tier flat queues: immediate microtasks and deferred ticks (storing flat Subscriber pointers with targetTick field).
    const _immediateQueue: Subscriber[] = [];
    const _deferredQueue: Subscriber[] = [];

    function handleTick(): void {
        ++currentTick;
        tickFlushCount = 0;

        // Drain any deferred effects that reached their target tick into the immediate queue.
        if (_deferredQueue.length > 0) {
            let writeIndex = 0;

            for (let i = 0; i < _deferredQueue.length; ++i) {
                const sub = _deferredQueue[i];

                if (sub.targetTick > currentTick) {
                    _deferredQueue[writeIndex++] = sub;
                    continue;
                }

                if (sub.isDisposed) {
                    sub.isPending = false;
                } else {
                    _immediateQueue.push(sub);
                }
            }

            _deferredQueue.length = writeIndex;
        }

        if (_immediateQueue.length > 0) {
            queueFlush();
        }
    }

    Events.OngoingGlobal.subscribe(handleTick);

    // Processes the microtask queue.
    function flush(): void {
        isFlushPending = false;

        if (_immediateQueue.length === 0) return;

        if (++tickFlushCount > MAX_FLUSHES_PER_TICK) {
            for (let i = 0; i < _immediateQueue.length; ++i) {
                _immediateQueue[i].isPending = false;
            }

            _immediateQueue.length = 0;
            logging.log('Max flushes per tick exceeded', LogLevel.Error);
            return;
        }

        let executionCount = 0;
        let i = 0;

        while (i < _immediateQueue.length) {
            if (++executionCount > MAX_EXECUTIONS_PER_FLUSH) {
                for (let j = i; j < _immediateQueue.length; ++j) {
                    _immediateQueue[j].isPending = false;
                }

                _immediateQueue.length = 0;
                logging.log('Max executions per flush exceeded', LogLevel.Error);
                return;
            }

            const sub = _immediateQueue[i++];
            sub.isPending = false;

            if (sub.isDisposed) continue;

            try {
                sub.execute();
            } catch (error: unknown) {
                logging.log('Error in effect:', LogLevel.Error, error);
            }
        }

        _immediateQueue.length = 0;
    }

    function scheduleOne(sub: Subscriber): void {
        if (sub.isPending || sub.isDisposed) return;

        sub.isPending = true;

        if (sub.deferTicks === 0) {
            _immediateQueue.push(sub);
            queueFlush();
        } else {
            sub.targetTick = currentTick + sub.deferTicks;
            _deferredQueue.push(sub);
        }
    }

    function scheduleSubscribers(subs: Subs): void {
        if (subs === null) return;
        if (!Array.isArray(subs)) {
            scheduleOne(subs);
            return;
        }
        for (let i = 0; i < subs.length; ++i) {
            scheduleOne(subs[i]);
        }
    }

    // Queues a flush on the microtask queue using a reusable Promise (zero allocation).
    function queueFlush(): void {
        if (isFlushPending) return;

        isFlushPending = true;
        STATIC_PROMISE.then(flush);
    }

    /****** Reactivity Core ******/

    /**
     * Executes a function without creating dependencies.
     * Any signals read inside `fn` will return their current value, but the surrounding Effect will not subscribe to
     * them.
     * @example
     * createEffect(() => {
     *     console.log(count()); // Tracks 'count'
     *     untrack(() => console.log(timer())); // Logs 'timer' but doesn't track it
     * });
     * @param fn - The function to execute.
     * @returns The return value of `fn`.
     */
    export function untrack<T>(fn: () => T): T {
        const prevObserver = activeObserver;
        activeObserver = null;

        try {
            return fn();
        } finally {
            activeObserver = prevObserver;
        }
    }

    /**
     * Creates a simple reactive state (a "Signal").
     * Signals are the atoms of reactivity. They hold a value and notify subscribers when changed.
     * @param initialValue - The starting value.
     * @returns A tuple `[read, write]`:
     *   - `read`: An {@link Accessor} to get the value and subscribe.
     *   - `write`: A {@link Setter} to update the value.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
        const state = new SignalState<T>(initialValue);

        const read: Accessor<T> = (): T => state.read();
        const write: Setter<T> = (newValue: T | ((prev: T) => T)): void => state.write(newValue);

        return [read, write];
    }

    /**
     * Creates a side effect that runs immediately and re-runs whenever its dependencies change.
     * This is the bridge between reactive state and the outside world (e.g., updating UI props, logs, timers).
     *
     * Behavior:
     *   1. Runs `fn` immediately (synchronously).
     *   2. Tracks any Signal read during execution.
     *   3. Re-runs `fn` if any of those Signals change.
     * @param fn - The function to execute.
     * @param options - The options for the effect.
     * @returns A "disposer" function that manually stops the effect and frees memory.
     */
    export function createEffect(fn: () => void, options?: EffectOptions): () => void {
        const effect = new Subscriber(fn, options?.deferTicks ?? 0);
        const disposer = () => effect.dispose();

        if (currentCleanupList !== null) {
            currentCleanupList.push(disposer);
        }

        return disposer;
    }

    /**
     * Creates a "Computed Value" or "Derived Signal".
     * Use this when a value depends on other signals. It is efficient because:
     *   - It caches the result.
     *   - It only notifies downstream listeners if the result actually changes.
     * @example
     * const fullName = createMemo(() => `${firstName()} ${lastName()}`);
     * @param fn - The function to memoize.
     * @param options - The options for the memo.
     * @returns The {@link Accessor} for the memoized value.
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
     * Creates a reactive scope that is detached from the parent.
     * Unlike Effects, a Root does not track dependencies and does not auto-dispose.
     * You must manually call the provided `dispose` function to clean up everything created inside it.
     *
     * Use Case: Creating dynamic lists, global managers, or UI sections that live/die independently of their parent.
     * @param fn - A function that receives a `dispose` callback.
     * @returns The return value of `fn`.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T {
        const previousObserver = activeObserver;
        const previousCleanupList = currentCleanupList;

        activeObserver = null; // createRoot is detached from any surrounding effect
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
            activeObserver = previousObserver;
            currentCleanupList = previousCleanupList;
        }
    }

    /****** Store ******/

    const STORE_SUBS_KEY = Symbol('solid_store_subs');
    const STORE_PROXY_KEY = Symbol('solid_store_proxy');

    class StorePropertyState implements DependencySource {
        public subs: Subs = null;

        constructor(
            public target: object,
            public key: string | symbol
        ) {}

        unsubscribe(sub: Subscriber): void {
            this.subs = removeSubscriber(this.subs, sub);
        }
    }

    function getStorePropertyState(target: object, key: string | symbol): StorePropertyState {
        let map = (target as Record<symbol, Record<string | symbol, StorePropertyState>>)[STORE_SUBS_KEY];
        if (!map) {
            map = Object.create(null);
            (target as Record<symbol, Record<string | symbol, StorePropertyState>>)[STORE_SUBS_KEY] = map;
        }

        let propState = map[key];
        if (!propState) {
            propState = new StorePropertyState(target, key);
            map[key] = propState;
        }

        return propState;
    }

    /**
     * Creates a reactive proxy object for handling nested state.
     * Unlike `createSignal` (which tracks the whole value), `createStore` tracks individual properties.
     *
     * Benefit: If you update `store.user.name`, only effects listening to `name` will run.
     * Effects listening to `store.user.age` will not run.
     * @param initialState - The initial object.
     * @returns A tuple `[store, setStore]`:
     *   - `store`: The reactive proxy object.
     *   - `setStore`: A setter function to update the store's properties.
     */
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void] {
        const handler: ProxyHandler<object> = {
            get(target, key, receiver) {
                if (key === STORE_SUBS_KEY || key === STORE_PROXY_KEY) {
                    return Reflect.get(target, key, receiver);
                }

                const value = Reflect.get(target, key, receiver);

                if (activeObserver !== null) {
                    const propState = getStorePropertyState(target, key);
                    trackDependency(propState, activeObserver);
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

                const map = (target as Record<symbol, Record<string | symbol, StorePropertyState>>)[STORE_SUBS_KEY];
                if (map) {
                    const propState: StorePropertyState | undefined = map[key];
                    if (propState && propState.subs !== null) {
                        scheduleSubscribers(propState.subs);
                    }
                    if (isArr && key !== 'length' && target.length !== prevLength) {
                        const lenState: StorePropertyState | undefined = map['length'];
                        if (lenState && lenState.subs !== null) {
                            scheduleSubscribers(lenState.subs);
                        }
                    }
                }

                return result;
            },
            deleteProperty(target, key) {
                const hasKey = Reflect.has(target, key);
                const result = Reflect.deleteProperty(target, key);

                if (hasKey && result) {
                    const map = (target as Record<symbol, Record<string | symbol, StorePropertyState>>)[STORE_SUBS_KEY];
                    if (map) {
                        const propState: StorePropertyState | undefined = map[key];
                        if (propState && propState.subs !== null) {
                            scheduleSubscribers(propState.subs);
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
            id: Symbol('context'),
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
     * If called inside a component, it runs when the component is deleted.
     * If called inside an Effect, it runs before the Effect re-executes (or when it dies).
     *
     * Use Case: Clearing intervals, removing event listeners, or specialized cleanup logic.
     * @param fn - The cleanup function to register.
     */
    export function onCleanup(fn: () => void): void {
        if (activeObserver !== null) {
            if (activeObserver.cleanups === null) {
                activeObserver.cleanups = [fn];
            } else {
                activeObserver.cleanups.push(fn);
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
     * The "HyperScript" factory function. Creates a UI Component and sets up reactivity.
     * @param component - Either a `UI` Class Constructor (e.g., `UI.Button`) or a Functional Component.
     * @param props - An object of properties. Values can be static OR reactive (Signals/Accessors).
     * @param options - The options for the component reactivity.
     * @returns The created UI Instance.
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
        currentCleanupList = null; // Lazy context during constructor execution

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
            constructorParams[key] = (value as Accessor<unknown>)(); // Initial value.
        }

        const instance = new ClassConstructor(constructorParams as P);

        // Setup reactive bindings only if reactive props exist
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
     * A generic List Renderer optimized for Game UI.
     * Different from `array.map()` in that `Index` renders components based on their array position, not their value.
     * If data moves (e.g., `["A", "B"]` -> `["B", "A"]`), the widgets at index 0 and 1 stay in place and simply update
     * their content to match the elements at their respective indexes.
     * This avoids destroying/recreating widgets, which is crucial for performance and Z-order stability.
     * @param each - The array signal to iterate over.
     * @param render - A builder function receiving the item (as a Signal) and the index (static number).
     * @param options - The options for the index.
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

                // If new rows are needed, update existing rows and create new ones.
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
