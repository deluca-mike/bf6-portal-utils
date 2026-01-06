import { UI } from '../ui/index.ts';

export namespace SolidUI {
    // ==================================================================================
    // 1. REACTIVITY CORE (Signals & Effects)
    // ==================================================================================

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
                value = nextValue;

                // Clone to avoid infinite loops
                [...subscriptions].forEach((sub) => sub.execute());
            }
        };

        return [read, write];
    }

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

        execute();
    }

    export function createMemo<T>(fn: () => T): Accessor<T> {
        const [s, set] = createSignal<T>(fn());
        createEffect(() => set(fn()));
        return s;
    }

    // ==================================================================================
    // 2. TYPE REGISTRY (Intellisense & Validation)
    // ==================================================================================

    function isAccessor<T>(value: T): value is T & Accessor<T> {
        return typeof value === 'function';
    }

    // Transform Params so every property can optionally be a Signal
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    // Augment Button params for the convenience "text" prop
    type SmartButtonProps = UI.ButtonParams & {
        text?: string | UI.MessageDescriptor | Accessor<string | UI.MessageDescriptor>;
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
            props: SmartButtonProps;
        };
    }

    const ComponentMap = {
        [UI.Type.Container]: UI.Container,
        [UI.Type.Text]: UI.Text,
        [UI.Type.Button]: UI.Button,
    };

    // ==================================================================================
    // 3. THE FACTORY (h)
    // ==================================================================================

    function setProperty<T extends UI.Container | UI.Text | UI.Button>(instance: T, key: keyof T, value: T[keyof T]) {
        if ((instance instanceof UI.Button || instance instanceof UI.Text) && key === 'text') {
            const descriptor = typeof value === 'string' ? { arg0: value } : (value as UI.MessageDescriptor);
            instance.setText(descriptor);
            return;
        }

        try {
            instance[key] = value;
        } catch (e) {
            /* ignore read-only */
        }
    }

    /**
     * Creates a UI Widget immediately and sets up reactive bindings.
     * Must be called in order (Parents first).
     * @param type The UI Type Enum
     * @param props The properties (static or reactive)
     * @param receiver The player or team to receive the UI
     * @returns The created UI Instance
     */
    export function h<K extends keyof ComponentRegistry>(
        type: K,
        props: Reactive<ComponentRegistry[K]['props']> = {},
        receiver?: mod.Player | mod.Team
    ): ComponentRegistry[K]['instance'] {
        const ClassConstructor = ComponentMap[type];

        if (!ClassConstructor) throw new Error(`Unknown component type: ${type}`);

        // 1. Separation Phase
        const constructorParams: any = {};
        const dynamicBindings: { key: keyof K; signal: Accessor<any> }[] = [];

        for (const [key, value] of Object.entries(props)) {
            // Events are never signals
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            // 'parent' should usually be static to ensure proper creation,
            // but if passed as a signal, we unwrap it for the constructor.
            // (Dynamic re-parenting is handled by setProperty later if supported)
            if (isAccessor(value)) {
                constructorParams[key] = value(); // Initial value
                dynamicBindings.push({ key, signal: value });
            } else {
                constructorParams[key] = value;
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
