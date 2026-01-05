import { UI } from '../ui/index.ts';

export namespace SolidUI {
    // ==================================================================================
    // 1. REACTIVITY CORE (Signals & Effects)
    // ==================================================================================

    // A subscriber is essentially an Effect
    type Subscriber = {
        execute: () => void;
        dependencies: Set<Set<Subscriber>>;
    };

    const context: Subscriber[] = [];

    // Clean up dependencies before re-executing an effect
    function cleanup(subscriber: Subscriber) {
        for (const dep of subscriber.dependencies) {
            dep.delete(subscriber);
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
                // Clone to avoid infinite loops if effects modify signals
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
    // 2. HYPERSCRIPT (The Render Logic)
    // ==================================================================================

    type PropValue<T> = T | Accessor<T>;

    // Map generic props to specific UI types if needed, or keep generic
    type Props = Record<string, any>;

    // Helper to detect if a prop is a signal
    function isAccessor(val: any): val is Accessor<any> {
        return typeof val === 'function';
    }

    /**
     * Maps UI.Type enums to the actual Classes
     */
    const ComponentMap = {
        [UI.Type.Container]: UI.Container,
        [UI.Type.Text]: UI.Text,
        [UI.Type.Button]: UI.Button,
        [UI.Type.Root]: UI.Root, // Usually not instantiated manually
    };

    /**
     * Standardizes property setting for the imperative UI library.
     * It handles the mapping of "prop name" -> "setter method".
     */
    function setProperty(instance: any, key: string, value: any) {
        // 1. Handle explicit setters (e.g., setVisible, setSize)
        // We look for the setter by capitalizing the key: visible -> setVisible
        const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;

        // 2. Handle Special Mappings (Aliases)
        // e.g., if user types 'text' for a Button, we might map it to 'setLabelMessage'
        if (instance instanceof UI.Button && key === 'text') {
            // If user passes a raw string, we convert to descriptor
            // If user passes a descriptor, we use it directly
            const desc = typeof value === 'string' ? ({ arg0: value } as UI.MessageDescriptor) : value;
            instance.setLabelMessage(desc);
            return;
        }

        if (instance instanceof UI.Text && key === 'message') {
            const desc = typeof value === 'string' ? ({ arg0: value } as UI.MessageDescriptor) : value;
            instance.setMessage(desc);
            return;
        }

        // 3. Generic Setter Call
        if (typeof instance[setterName] === 'function') {
            instance[setterName](value);
        } else {
            // Fallback: direct property assignment (calls the setter via JS getter/setter)
            // e.g. instance.visible = true;
            try {
                instance[key] = value;
            } catch (e) {
                // Property likely doesn't exist or is read-only
            }
        }
    }

    /**
     * The Hyperscript function.
     * @param type The UI Component Type (UI.Type.Button, etc.)
     * @param props Object of properties. Can be static values OR signals.
     * @param children Array of child elements.
     */
    export function h(
        type: UI.Type,
        props: Props = {},
        children: (UI.Element | Accessor<UI.Element>)[] = []
    ): UI.Element {
        // 1. Separation Phase:
        // We must extract the *initial* values for the constructor,
        // and separate the dynamic signals for post-creation binding.
        const constructorParams: any = {};
        const dynamicBindings: { key: string; signal: Accessor<any> }[] = [];

        // Special handling: 'onClick' is usually an event, not a signal
        // We pass it directly to constructor params.

        for (const [key, value] of Object.entries(props)) {
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            if (isAccessor(value)) {
                // It's a signal! Get current value for initial render...
                constructorParams[key] = value();
                // ...and queue it for binding
                dynamicBindings.push({ key, signal: value });
            } else {
                // Static value
                constructorParams[key] = value;
            }
        }

        // 2. Instantiation Phase
        const ClassConstructor = ComponentMap[type];
        if (!ClassConstructor) throw new Error(`Unknown component type: ${type}`);

        // The UI library expects explicit params (e.g. TextParams).
        // We assume constructorParams matches that shape roughly.
        // Note: We might need default parent handling here or let the UI library handle it.
        const instance = new ClassConstructor(constructorParams);

        // 3. Reactive Binding Phase
        // For every dynamic prop, create an effect that updates the instance
        dynamicBindings.forEach(({ key, signal }) => {
            createEffect(() => {
                const newValue = signal();
                setProperty(instance, key, newValue);
            });
        });

        // 4. Children Phase
        // Append children to the instance (if it's a container)
        // We allow children to be plain elements or signals (conditional rendering)
        if ('addChild' in instance) {
            children.forEach((child) => {
                if (isAccessor(child)) {
                    // Dynamic Child (e.g. conditional show/hide)
                    // NOTE: This is complex in BF Portal because we can't easily reorder.
                    // For MVP, we assume the child signal returns an already created Element
                    // that we just toggle visibility on, or we just append it.
                    // Real dynamic lists require a <For> component implementation.

                    // Simple approach: Run effect, but assume append only for now.
                    createEffect(() => {
                        const c = child();
                        if (c) (instance as any).addChild(c);
                    });
                } else {
                    (instance as any).addChild(child);
                }
            });
        }

        return instance as UI.Element;
    }
}
