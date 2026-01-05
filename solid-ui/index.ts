export namespace SolidUI {
    /****** Types ******/

    type Subscriber = {
        execute: () => void;
        dependencies: Set<Set<Subscriber>>;
    };

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
    type Constructable<Params, Instance> = new (params: Params, receiver?: mod.Player | mod.Team) => Instance;

    type FunctionalComponent<Params, Instance> = (
        props: Reactive<Params>,
        receiver?: mod.Player | mod.Team
    ) => Instance;

    // Transform Params so every property can optionally be a Signal.
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
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

        // Plain object deep compare (MessageDescriptor, Size, Position, Vector, etc).
        if (isPlainObject(a) && isPlainObject(b)) {
            const objA = a as Record<string, unknown>;
            const objB = b as Record<string, unknown>;
            const keysA = Object.keys(objA);
            const keysB = Object.keys(objB);

            if (keysA.length !== keysB.length) return false;

            for (const key of keysA) {
                // If b doesn't have the key, or values mismatch.
                if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
                if (!isEqual(objA[key], objB[key])) return false;
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

    /****** Scheduling ******/

    // Queue to hold effects that need to run.
    const pendingEffects = new Set<Subscriber>();
    let isFlushPending = false;

    // The function that processes the queue.
    function flush(): void {
        isFlushPending = false;

        // Snapshot the current queue to handle new effects being added during flush.
        const toRun = [...pendingEffects];
        pendingEffects.clear();

        toRun.forEach((sub) => sub.execute()); // Run all queued effects.
    }

    // Adds effects to the queue and schedules a flush if one isn't already pending.
    function schedule(subscribers: Set<Subscriber>): void {
        subscribers.forEach((sub) => pendingEffects.add(sub));

        if (isFlushPending) return;

        isFlushPending = true;

        // "Promise.resolve().then" pushes the flush to the microtask queue.
        // This ensures setting a signal returns execution to the game logic instantly, and the UI updates happen right
        // after the game logic finishes.
        Promise.resolve()
            .then(flush)
            .catch((e) => {
                // Swallow errors to prevent one effect from affecting others.
            });
    }

    /****** Reactivity Core ******/

    const context: (Subscriber | null)[] = [];

    // The current "Owner" (e.g., the Component instance being created).
    let currentCleanupList: Set<() => void> | null = null;

    function cleanup(subscriber: Subscriber): void {
        for (const dependency of subscriber.dependencies) {
            dependency.delete(subscriber);
        }

        subscriber.dependencies.clear();
    }

    /**
     * Executes a function without creating dependencies.
     * Any signals read inside `fn` will return their current value, but the surrounding Effect will not subscribe to
     * them.
     *
     * @example
     * createEffect(() => {
     *     console.log(count()); // Tracks 'count'
     *     untrack(() => console.log(timer())); // Logs 'timer' but doesn't track it
     * });
     *
     * @param fn - The function to execute.
     *
     * @returns The return value of `fn`.
     */
    export function untrack<T>(fn: () => T): T {
        context.push(null);

        try {
            return fn();
        } finally {
            context.pop();
        }
    }

    /**
     * Creates a simple reactive state (a "Signal").
     * Signals are the atoms of reactivity. They hold a value and notify subscribers when changed.
     *
     * @param initialValue - The starting value.
     *
     * @returns A tuple `[read, write]`:
     *   - `read`: An {@link Accessor} to get the value and subscribe.
     *   - `write`: A {@link Setter} to update the value.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
        const subscriptions = new Set<Subscriber>();
        let value = initialValue;

        const read: Accessor<T> = (): T => {
            const observer = context[context.length - 1];

            if (observer) {
                observer.dependencies.add(subscriptions.add(observer));
            }

            return value;
        };

        const write: Setter<T> = (newValue: T | ((prev: T) => T)): void => {
            const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

            if (isEqual(value, nextValue)) return; // Don't trigger if value didn't change.

            value = nextValue; // Update state immediately.
            schedule(subscriptions); // Triggers updates asynchronously (non-blocking).
        };

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
     *
     * @param fn - The function to execute.
     *
     * @returns A "disposer" function that manually stops the effect and frees memory.
     */
    export function createEffect(fn: () => void): () => void {
        const execute = (): void => {
            cleanup(subscriber);
            context.push(subscriber);

            try {
                fn();
            } finally {
                context.pop();
            }
        };

        const subscriber: Subscriber = {
            execute,
            dependencies: new Set(),
        };

        // Effects run immediately on creation (synchronously) to establish initial dependencies.
        execute();

        return () => cleanup(subscriber);
    }

    /**
     * Creates a "Computed Value" or "Derived Signal".
     * Use this when a value depends on other signals. It is efficient because:
     *   - It caches the result.
     *   - It only notifies downstream listeners if the result actually changes.
     *
     * @example
     * const fullName = createMemo(() => `${firstName()} ${lastName()}`);
     *
     * @param fn - The function to memoize.
     *
     * @returns The {@link Accessor} for the memoized value.
     */
    export function createMemo<T>(fn: () => T): Accessor<T> {
        const [s, set] = createSignal<T>(fn());

        // Memos must update immediately to be consistent,
        // but their downstream effects will still be batched by the signal's scheduler.
        createEffect(() => set(fn()));

        return s;
    }

    /**
     * Creates a reactive scope that is detached from the parent.
     * Unlike Effects, a Root does not track dependencies and does not auto-dispose.
     * You must manually call the provided `dispose` function to clean up everything created inside it.
     *
     * Use Case: Creating dynamic lists, global managers, or UI sections that live/die independently of their parent.
     *
     * @param fn - A function that receives a `dispose` callback.
     *
     * @returns The return value of `fn`.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T {
        // Create a list to track all cleanups (effects, onCleanup calls) for this component.
        // Handles nested calls (e.g., a Container creating a Button inside its constructor) by creating a call stack
        // for cleanup contexts.
        const previousCleanupList = currentCleanupList;
        const cleanupList = new Set<() => void>();
        currentCleanupList = cleanupList;

        // Define Disposer
        const dispose = () => {
            // Run all cleanups registered via `onCleanup()` or implicit effects.
            cleanupList.forEach((c) => c());
            cleanupList.clear();
        };

        const result = fn(dispose); // Run the user's code.

        // Restore Parent Context (Root is DETACHED, so we don't add to parent).
        currentCleanupList = previousCleanupList;

        return result;
    }

    /****** Store ******/

    // Global map to track subscribers for every key of every proxy object.
    // WeakMap ensures that if the object is deleted, the subscribers are garbage collected.
    const storeSubscribers = new WeakMap<object, Map<string | symbol, Set<Subscriber>>>();

    // Helper to get or create the subscriber set for a specific object key.
    function getStoreSubscribers(target: object, key: string | symbol): Set<Subscriber> {
        let objMap = storeSubscribers.get(target);

        if (!objMap) {
            objMap = new Map();
            storeSubscribers.set(target, objMap);
        }

        let keySet = objMap.get(key);

        if (!keySet) {
            keySet = new Set();
            objMap.set(key, keySet);
        }

        return keySet;
    }

    /**
     * Creates a reactive proxy object for handling nested state.
     * Unlike `createSignal` (which tracks the whole value), `createStore` tracks individual properties.
     *
     * Benefit: If you update `store.user.name`, only effects listening to `name` will run.
     * Effects listening to `store.user.age` will not run.
     *
     * @param initialState - The initial object.
     *
     * @returns A tuple `[store, setStore]`:
     *   - `store`: The reactive proxy object.
     *   - `setStore`: A setter function to update the store's properties.
     */
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void] {
        // Recursive handler to create proxies for nested objects
        const handler: ProxyHandler<object> = {
            get(target, key, receiver) {
                const value = Reflect.get(target, key, receiver);

                // If an effect is running, subscribe it to this specific key.
                const observer = context[context.length - 1];

                if (observer) {
                    observer.dependencies.add(getStoreSubscribers(target, key).add(observer));
                }

                // If the value is an object, we must wrap it in a Proxy too (Lazy Proxying) so we can track its
                // internal properties.
                return typeof value === 'object' && value !== null ? new Proxy(value, handler) : value;
            },
            set(target, key, value, receiver) {
                const oldValue = Reflect.get(target, key, receiver);

                if (isEqual(oldValue, value)) return true; // Don't trigger if value didn't change.

                const result = Reflect.set(target, key, value, receiver);

                schedule(getStoreSubscribers(target, key)); // Notify subscribers of this specific key.

                return result;
            },
        };

        const store = new Proxy(initialState, handler) as T;

        // A simplified setter that accepts a producer function (e.g. state => state.count++).
        // We just run the producer on the proxy. The Proxy 'set' trap handles the rest automatically.
        const setStore = (producer: (state: T) => void): void => producer(store);

        return [store, setStore];
    }

    /****** Context (Theming & Dependency Injection) ******/

    // A unique symbol map to hold the stacks for each context.
    const contextValues = new Map<symbol, unknown[]>();

    /**
     * A definition object for a Context, used for dependency injection.
     * See {@link createContext}.
     */
    export interface Context<T> {
        id: symbol;
        defaultValue: T;
        /**
         * Runs the provided function within a scope where this Context is set to `value`.
         *
         * @param value - The value to provide.
         * @param fn - The function to run within the scope.
         */
        provide: (value: T, fn: () => void) => void;
    }

    /**
     * Creates a Context object to pass data deeply without "prop drilling".
     *
     * @param defaultValue - The value returned by `useContext` if no provider is found in the stack.
     *
     * @returns A {@link Context} object.
     */
    export function createContext<T>(defaultValue: T): Context<T> {
        const id = Symbol('context');
        contextValues.set(id, []);

        return {
            id,
            defaultValue,
            provide(value: T, fn: () => void) {
                const stack = contextValues.get(id)!;
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
     *
     * @param context - The {@link Context} to read.
     *
     * @returns The current value of the {@link Context}.
     */
    export function useContext<T>(context: Context<T>): T {
        const stack = contextValues.get(context.id);

        return stack && stack.length > 0 ? (stack[stack.length - 1] as T) : context.defaultValue;
    }

    /****** Factory ******/

    /**
     * Registers a cleanup callback for the current reactive scope.
     * If called inside a component, it runs when the component is deleted.
     * If called inside an Effect, it runs before the Effect re-executes (or when it dies).
     *
     * Use Case: Clearing intervals, removing event listeners, or specialized cleanup logic.
     *
     * @param fn - The cleanup function to register.
     */
    export function onCleanup(fn: () => void): void {
        currentCleanupList?.add(fn);
    }

    function setProperty<T>(instance: T, key: keyof T, value: unknown): void {
        try {
            // We cast instance to a generic record to allow assignment. "Trust me, bro."
            (instance as unknown as Record<keyof T, unknown>)[key] = value;
        } catch {
            /* ignore read-only */
        }
    }

    /**
     * The "HyperScript" factory function. Creates a UI Component and sets up reactivity.
     *
     * @param component - Either a `UI` Class Constructor (e.g., `UI.Button`) or a Functional Component.
     * @param props - An object of properties. Values can be static OR reactive (Signals/Accessors).
     * @param receiver - (Optional) The specific player or team this UI is for.
     *
     * @returns The created UI Instance.
     */
    export function h<P extends object, T>(
        component: Constructable<P, T> | FunctionalComponent<P, T>,
        props: Reactive<P> = {},
        receiver?: mod.Player | mod.Team
    ): T {
        // If the component is a function, just call it passing the raw 'props' (Reactive<P>) so the function can access
        // the signals directly.
        // The function is expected to call 'h' internally for a real UI Class, which will handle the bindings.
        if (!isClassConstructor(component)) return (component as FunctionalComponent<P, T>)(props, receiver);

        const ClassConstructor = component as Constructable<P, T>;

        // Create a list to track all cleanups (effects, onCleanup calls) for this component.
        // Handles nested calls (e.g., a Container creating a Button inside its constructor) by creating a call stack
        // for cleanup contexts.
        const previousCleanupList = currentCleanupList;
        const cleanupList = new Set<() => void>();
        currentCleanupList = cleanupList;

        // Use a generic Record to build up the constructor parameters.
        const constructorParams: Record<string, unknown> = {};
        const dynamicBindings: { key: keyof P; signal: Accessor<unknown> }[] = [];

        for (const [key, value] of Object.entries(props)) {
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            if (isAccessor(value)) {
                constructorParams[key] = value(); // Initial value.
                dynamicBindings.push({ key: key as keyof P, signal: value });
            } else {
                constructorParams[key] = value;
            }
        }

        const instance = new ClassConstructor(constructorParams as P, receiver);

        // Setup reactive bindings.
        dynamicBindings.forEach(({ key, signal }) => {
            const dispose = createEffect(() => {
                setProperty(instance, key as unknown as keyof T, signal());
            });

            onCleanup(dispose); // Register this effect's disposer to the cleanup list.
        });

        // If the instance has a 'delete' method, we monkey patch it to run all cleanups registered via onCleanup() or
        // implicit effects.
        // Using a structural type check (safer than 'any') because we don't know if T has 'delete', and we don't want
        // to enforce an interface.
        const instanceWithDelete = instance as { delete?: (...args: unknown[]) => unknown };
        const originalDelete = instanceWithDelete.delete;

        if (typeof originalDelete === 'function') {
            instanceWithDelete.delete = function (...args: unknown[]) {
                // Run all cleanups registered via onCleanup() or implicit effects.
                cleanupList.forEach((fn) => fn());
                cleanupList.clear();

                // Call the original delete logic defined in the UI library.
                return originalDelete.apply(this, args);
            };
        }

        currentCleanupList = previousCleanupList;

        return instance;
    }

    /**
     * A generic List Renderer optimized for Game UI.
     * Different from `array.map()` in that `Index` renders components based on their array position, not their value.
     * If data moves (e.g., `["A", "B"]` -> `["B", "A"]`), the widgets at index 0 and 1 stay in place and simply update
     * their content to match the elements at their respective indexes.
     * This avoids destroying/recreating widgets, which is crucial for performance and Z-order stability.
     *
     * @param each - The array signal to iterate over.
     * @param render - A builder function receiving the item (as a Signal) and the index (static number).
     *
     * @returns The return value of `render`.
     */
    export function Index<T>(each: Accessor<T[]>, render: (item: Accessor<T>, index: number) => unknown): void {
        // Track the disposers and data setters for every active row.
        // We use this to update data without re-rendering, or kill rows on shrink.
        const rows: { setItem: Setter<T>; dispose: () => void }[] = [];

        createEffect(() => {
            const list = each();
            const newLength = list.length;
            const oldLength = rows.length;

            // If new rows are needed, updated the existing rows and create new ones.
            if (newLength > oldLength) {
                rows.forEach((row, index) => row.setItem(list[index]));

                for (let i = oldLength; i < newLength; ++i) {
                    createRoot((dispose) => {
                        // Create a specific signal for this row's data.
                        // This allows the row to update its own properties without re-running the list effect.
                        const [item, setItem] = createSignal(list[i]);

                        // Save control method to our tracker
                        rows.push({ setItem, dispose });

                        render(item, i);
                    });
                }

                return;
            }

            // If less rows are needed, dispose of the unnecessary ones.
            if (newLength < oldLength) {
                for (let i = oldLength - 1; i >= newLength; --i) {
                    rows.pop()?.dispose(); // Kills effects and deletes the widget (via onCleanup in `h`).
                }
            }

            // Update the remaining rows if the length is the same or after the shrink operation.
            rows.forEach((row, index) => row.setItem(list[index]));
        });
    }
}
