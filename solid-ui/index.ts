import { UI } from '../ui/index.ts';

export namespace SolidUI {
    /****** SCHEDULER ******/

    // Queue to hold effects that need to run.
    const pendingEffects = new Set<Subscriber>();
    let isFlushPending = false;

    // The function that processes the queue.
    function flush() {
        isFlushPending = false;

        // Snapshot the current queue to handle new effects being added during flush.
        const toRun = [...pendingEffects];
        pendingEffects.clear();

        // Run all queued effects.
        toRun.forEach((sub) => sub.execute());
    }

    // Adds effects to the queue and schedules a flush if one isn't already pending
    function schedule(subscribers: Set<Subscriber>) {
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

    type Subscriber = {
        execute: () => void;
        dependencies: Set<Set<Subscriber>>;
    };

    const context: Subscriber[] = [];

    function cleanup(subscriber: Subscriber) {
        for (const dependency of subscriber.dependencies) {
            dependency.delete(subscriber);
        }

        subscriber.dependencies.clear();
    }

    export type Accessor<T> = () => T;

    export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;

    /**
     * Creates a signal (source of truth) and returns an accessor and setter.
     * @param initialValue - The initial value of the signal.
     * @returns A tuple containing the accessor and setter functions.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
        const subscriptions = new Set<Subscriber>();
        let value = initialValue;

        const read = () => {
            const observer = context[context.length - 1];

            if (observer) {
                subscriptions.add(observer);
                observer.dependencies.add(subscriptions);
            }

            return value;
        };

        const write = (newValue: T | ((prev: T) => T)) => {
            const nextValue = newValue instanceof Function ? (newValue as (prev: T) => T)(value) : newValue;

            if (value !== nextValue) {
                value = nextValue; // Update state immediately
                schedule(subscriptions); // Triggers updates asynchronously (non-blocking)
            }
        };

        return [read, write];
    }

    /**
     * Creates an effect and runs it immediately.
     * Runs a function immediately, tracks which signals are read during that run, and re-runs the function whenever those signals change.
     * @param fn - The function to execute.
     */
    export function createEffect(fn: () => void): void {
        const execute = () => {
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

    /****** TYPE REGISTRY ******/

    function isAccessor<T>(value: T): value is T & Accessor<T> {
        return typeof value === 'function';
    }

    // Transform Params so every property can optionally be a Signal
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    // Maps Enum -> Class Instance & Props
    interface ComponentRegistry {
        [UI.Type.Container]: {
            instance: UI.Container;
            props: UI.ContainerParams;
        };
        [UI.Type.Text]: {
            instance: UI.Text;
            props: UI.TextParams;
        };
        [UI.Type.Button]: {
            instance: UI.Button;
            props: UI.ButtonParams;
        };
    }

    const ComponentMap = {
        [UI.Type.Container]: UI.Container,
        [UI.Type.Text]: UI.Text,
        [UI.Type.Button]: UI.Button,
    };

    /****** THE FACTORY ******/

    function setProperty<T extends UI.Container | UI.Text | UI.Button>(instance: T, key: keyof T, value: T[keyof T]) {
        try {
            instance[key] = value;
        } catch (e) {
            /* ignore read-only */
        }
    }

    /**
     * Creates a UI Widget immediately and sets up reactive bindings.
     * Must be called in order (parents before their children).
     * @param type The UI Type Enum.
     * @param props The properties (static or reactive).
     * @param receiver The player or team to receive the UI, if any.
     * @returns The created UI Instance.
     */
    export function h<K extends keyof ComponentRegistry>(
        type: K,
        props: Reactive<ComponentRegistry[K]['props']> = {},
        receiver?: mod.Player | mod.Team
    ): ComponentRegistry[K]['instance'] {
        const ClassConstructor = ComponentMap[type];

        if (!ClassConstructor) throw new Error(`Unknown component type: ${type}`);

        // 1. Separation Phase
        const constructorParams: ComponentRegistry[K]['props'] = {};
        const dynamicBindings: { key: keyof ComponentRegistry[K]['props']; signal: Accessor<any> }[] = []; // `ComponentRegistry[K]['props'][keyof ComponentRegistry[K]['props']]` instead of `any`?

        for (const [key, value] of Object.entries(props)) {
            // Events are never signals
            if (key === 'onClick') {
                constructorParams[key as keyof ComponentRegistry[K]['props']] = value;
                continue;
            }

            // 'parent' should usually be static to ensure proper creation,
            // but if passed as a signal, we unwrap it for the constructor.
            // (Dynamic re-parenting is handled by setProperty later if supported)
            if (isAccessor(value)) {
                constructorParams[key as keyof ComponentRegistry[K]['props']] = value(); // Initial value
                dynamicBindings.push({ key: key as keyof ComponentRegistry[K]['props'], signal: value });
            } else {
                constructorParams[key as keyof ComponentRegistry[K]['props']] = value;
            }
        }

        // 2. Immediate Instantiation
        // We cast to any to bypass strict constructor checks for this generic logic
        const instance = new (ClassConstructor as any)(constructorParams, receiver);

        // 3. Reactive Binding Phase
        dynamicBindings.forEach(({ key, signal }) => {
            createEffect(() => {
                setProperty(instance, key, signal());
            });
        });

        return instance;
    }
}
