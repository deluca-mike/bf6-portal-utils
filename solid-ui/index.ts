export namespace SolidUI {
    /****** TYPES ******/

    type Subscriber = {
        execute: () => void;
        dependencies: Set<Set<Subscriber>>;
    };

    export type Accessor<T> = () => T;

    export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;

    // Defines the contract for any UI Class Constructor (Native or Custom).
    type Constructable<Params, Instance> = new (params: Params, receiver?: mod.Player | mod.Team) => Instance;

    // Transform Params so every property can optionally be a Signal.
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    /****** UTILS ******/

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

        // Plain object deep compare (MessageDescriptor, Size, Position, etc).
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

    /****** SCHEDULER ******/

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

    // Adds effects to the queue and schedules a flush if one isn't already pending
    function schedule(subscribers: Set<Subscriber>): void {
        subscribers.forEach((sub) => pendingEffects.add(sub));

        if (isFlushPending) return;

        isFlushPending = true;

        // "Promise.resolve().then" pushes the flush to the microtask queue.
        // This ensures setting a signal returns execution to the game logic instantly,
        // and the UI updates happen right after the game logic finishes.
        Promise.resolve()
            .then(flush)
            .catch((e) => {
                // Swallow errors to prevent one effect from affecting others.
            });
    }

    /****** REACTIVITY CORE ******/

    const context: Subscriber[] = [];

    // The current "Owner" (e.g., the Component instance being created).
    let currentCleanupList: Set<() => void> | null = null;

    function cleanup(subscriber: Subscriber): void {
        for (const dependency of subscriber.dependencies) {
            dependency.delete(subscriber);
        }

        subscriber.dependencies.clear();
    }

    /**
     * Creates a signal (source of truth) and returns an accessor and setter.
     * @param initialValue - The initial value of the signal.
     * @returns A tuple containing the accessor and setter functions.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
        const subscriptions = new Set<Subscriber>();
        let value = initialValue;

        const read = (): T => {
            const observer = context[context.length - 1];

            if (observer) {
                observer.dependencies.add(subscriptions.add(observer));
            }

            return value;
        };

        const write = (newValue: T | ((prev: T) => T)): void => {
            const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

            if (isEqual(value, nextValue)) return; // Don't trigger if value didn't change.

            value = nextValue; // Update state immediately.
            schedule(subscriptions); // Triggers updates asynchronously (non-blocking).
        };

        return [read, write];
    }

    /**
     * Creates an effect and runs it immediately.
     * Runs a function immediately, tracks which signals are read during that run, and re-runs the function whenever those signals change.
     * @param fn - The function to execute.
     * @returns A function to dispose the effect.
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
     * Creates a memo (derived signal) and returns an accessor.
     * It relies on other signals but presents itself as a read-only signal to others.
     * @param fn - The function to execute.
     * @returns The memo value.
     */
    export function createMemo<T>(fn: () => T): Accessor<T> {
        const [s, set] = createSignal<T>(fn());
        // Memos must update immediately to be consistent, but their downstream effects will still be batched by the signal's scheduler.
        createEffect(() => set(fn()));
        return s;
    }

    /**
     * Creates a reactive root that is not automatically disposed by its parent.
     * Returns a disposer function to manually kill all effects created within it.
     * Essential for dynamic lists where rows are created/destroyed independently.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T {
        // Create a list to track all cleanups (effects, onCleanup calls) for this component.
        // Handles nested calls (e.g., a Container creating a Button inside its constructor) by creating a call stack for cleanup contexts.
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

    /****** STORE ******/

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
     * Creates a reactive proxy object (Store).
     * @param initialState The initial object state.
     * @returns [store, setStore]
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

                // If the value is an object, we must wrap it in a Proxy too (Lazy Proxying) so we can track its internal properties.
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

    /****** FACTORY ******/

    /**
     * Registers a callback to run when the current reactive scope (or component) is destroyed.
     */
    export function onCleanup(fn: () => void): void {
        currentCleanupList?.add(fn);
    }

    function setProperty<T>(instance: T, key: keyof T, value: unknown): void {
        try {
            // We cast instance to a generic record to allow assignment. "Trust me, bro."
            (instance as unknown as Record<keyof T, unknown>)[key] = value;
        } catch (e) {
            /* ignore read-only */
        }
    }

    /**
     * Creates a UI Widget immediately and sets up reactive bindings.
     * Must be called in order (parents before their children).
     * @param componentClass The Class Constructor (e.g. UI.Button, UI.Container, or a custom class).
     * @param props The properties (static or reactive).
     * @param receiver The player or team to receive the UI, if any.
     * @returns The created UI Instance.
     */
    export function h<P extends object, T>(
        componentClass: Constructable<P, T>,
        props: Reactive<P> = {},
        receiver?: mod.Player | mod.Team
    ): T {
        // Create a list to track all cleanups (effects, onCleanup calls) for this component.
        // Handles nested calls (e.g., a Container creating a Button inside its constructor) by creating a call stack for cleanup contexts.
        const previousCleanupList = currentCleanupList;
        const cleanupList = new Set<() => void>();
        currentCleanupList = cleanupList;

        // Use a generic Record instead of 'any' to build up params
        const constructorParams: Record<string, unknown> = {};
        const dynamicBindings: { key: keyof P; signal: Accessor<unknown> }[] = [];

        for (const [key, value] of Object.entries(props)) {
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            // 'parent' handling (unwrap signal if present)
            if (isAccessor(value)) {
                constructorParams[key] = value(); // Initial value
                dynamicBindings.push({ key: key as keyof P, signal: value });
            } else {
                constructorParams[key] = value;
            }
        }

        const instance = new componentClass(constructorParams as P, receiver);

        // Setup reactive bindings.
        dynamicBindings.forEach(({ key, signal }) => {
            const dispose = createEffect(() => {
                setProperty(instance, key as unknown as keyof T, signal());
            });

            onCleanup(dispose); // Register this effect's disposer to the cleanup list.
        });

        // If the instance has a 'delete' method, we monkey patch it to run all cleanups registered via onCleanup() or implicit effects.
        // Using a structural type check (safer than 'any') because we don't know if T has 'delete', and we don't want to enforce an interface.
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
     * Non-keyed list rendering.
     * Renders a widget for each index in the array.
     * Efficiently creates new widgets when array grows and disposes them when it shrinks.
     * @param each The array signal.
     * @param render The builder function (receives item signal and static index).
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
