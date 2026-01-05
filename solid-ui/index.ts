import { UI } from '../ui/index.ts';

export namespace SolidUI {
    // ==================================================================================
    // 1. REACTIVITY CORE
    // ==================================================================================

    type Subscriber = {
        execute: () => void;
        dependencies: Set<Set<Subscriber>>;
    };

    const context: Subscriber[] = [];

    function cleanup(subscriber: Subscriber): void {
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
    // 2. VNODE & REGISTRY
    // ==================================================================================

    // A Blueprint for a UI Element
    export interface VNode<P = any> {
        type: UI.Type;
        props: P;
        children: VNode[];
        // A reference to the real instance, populated after render
        instance?: UI.Element;
    }

    // Helper to detect signals
    function isAccessor(val: any): val is Accessor<any> {
        return typeof val === 'function';
    }

    // Transform a Params interface so every property can optionally be a Signal
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };

    // Augment Button params to allow the convenience "text" prop
    type SmartButtonProps = UI.ButtonParams & {
        text?: string | UI.MessageDescriptor | Accessor<string | UI.MessageDescriptor>;
    };

    // The Master Registry: Maps Enum -> Class Instance & Props
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
            props: SmartButtonProps; // Uses our augmented type
        };
        [UI.Type.Root]: {
            instance: UI.Root;
            props: object;
        };
    }

    // Map for runtime instantiation
    const ComponentMap = {
        [UI.Type.Container]: UI.Container,
        [UI.Type.Text]: UI.Text,
        [UI.Type.Button]: UI.Button,
        [UI.Type.Root]: UI.Root,
    };

    // ==================================================================================
    // 3. THE RENDERER (Mounts Blueprints to Reality)
    // ==================================================================================

    function setProperty(instance: any, key: string, value: any) {
        // 1. Handle "text" convenience prop on Button
        if (instance instanceof UI.Button && key === 'text') {
            const desc = typeof value === 'string' ? ({ arg0: value } as UI.MessageDescriptor) : value;
            instance.setLabelMessage(desc);
            return;
        }

        // 2. Handle "message" convenience prop on Text (allow raw string)
        if (instance instanceof UI.Text && key === 'message') {
            const desc = typeof value === 'string' ? ({ arg0: value } as UI.MessageDescriptor) : value;
            instance.setMessage(desc);
            return;
        }

        // 3. Standard Setter Lookup (e.g. visible -> setVisible)
        const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;

        if (typeof instance[setterName] === 'function') {
            instance[setterName](value);
        } else {
            // Fallback to direct assignment
            try {
                instance[key] = value;
            } catch (e) {
                /* ignore read-only */
            }
        }
    }

    /**
     * Creates the real UI Widget from a VNode, then recursively creates children.
     * Guaranteed Top-Down execution.
     */
    function mount(vnode: VNode, parent: UI.Root | UI.Container): UI.Element {
        const ClassConstructor = ComponentMap[vnode.type];

        if (!ClassConstructor) throw new Error(`Unknown component type: ${vnode.type}`);

        // 1. Separation Phase (Props vs Signals)
        const constructorParams: any = {};
        const dynamicBindings: { key: string; signal: Accessor<any> }[] = [];

        // Inject the PARENT automatically.
        // This solves the dependency issue. The child now definitely has the parent
        // before the underlying mod.AddUI... is called.
        constructorParams.parent = parent;

        for (const [key, value] of Object.entries(vnode.props)) {
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            if (isAccessor(value)) {
                constructorParams[key] = value(); // Initial value
                dynamicBindings.push({ key, signal: value });
            } else {
                constructorParams[key] = value;
            }
        }

        // 2. Instantiation Phase (REAL Creation happens here)
        // We cast to any to bypass strict constructor checks for this generic logic
        const instance = new (ClassConstructor as any)(constructorParams);
        vnode.instance = instance; // Store ref in case we need it

        // 3. Reactive Binding Phase
        dynamicBindings.forEach(({ key, signal }) => {
            createEffect(() => {
                setProperty(instance, key, signal());
            });
        });

        // 4. Children Phase (Recursive Top-Down)
        if ('addChild' in instance) {
            vnode.children.forEach((childVNode) => {
                // RECURSION: We pass the *just created* instance as the parent
                mount(childVNode, instance as UI.Container);
            });
        }

        return instance;
    }

    /**
     * Main entry point to draw the UI.
     * @param rootVNode The blueprint tree returned by h(...)
     * @param rootElement The existing root to attach to (usually UI.ROOT_NODE)
     */
    export function render(rootVNode: VNode, rootElement: UI.Root = UI.ROOT_NODE) {
        // We do not "mount" the root itself (it exists), we mount its children
        // But if rootVNode is a container intended to be a child of ROOT_NODE:
        mount(rootVNode, rootElement);
    }

    // ==================================================================================
    // 4. HYPERSCRIPT (The Builder)
    // ==================================================================================

    /**
     * Strictly typed Hyperscript function.
     * @param type The UI Type Enum (inferred K)
     * @param props The specific Props for that Type (static or signals)
     * @param children Child elements or arrays of elements (from Show)
     */
    export function h<K extends keyof ComponentRegistry>(
        type: K,
        props: Reactive<ComponentRegistry[K]['props']> = {},
        children: (VNode | VNode[])[] = [] // Accepts VNodes now
    ): VNode<Reactive<ComponentRegistry[K]['props']>> {
        const ClassConstructor = ComponentMap[type];
        if (!ClassConstructor) throw new Error(`Unknown component type: ${type}`);

        // 1. Separation Phase
        const constructorParams: any = {};
        const dynamicBindings: { key: string; signal: Accessor<any> }[] = [];

        for (const [key, value] of Object.entries(props)) {
            // Events are never signals in this framework's convention
            if (key === 'onClick') {
                constructorParams[key] = value;
                continue;
            }

            if (isAccessor(value)) {
                constructorParams[key] = value(); // Initial value
                dynamicBindings.push({ key, signal: value });
            } else {
                constructorParams[key] = value;
            }
        }

        // 2. Instantiation Phase
        // We cast to any because TS struggles to verify dynamic constructor signatures against the registry map
        const instance = new (ClassConstructor as any)(constructorParams);

        // 3. Reactive Binding Phase
        dynamicBindings.forEach(({ key, signal }) => {
            createEffect(() => {
                setProperty(instance, key, signal());
            });
        });

        // 4. Children Phase
        // Flatten children array because <Show> returns UI.Element[]
        const flatChildren = children.flat();

        if ('addChild' in instance) {
            flatChildren.forEach((child) => {
                // Ensure valid child before adding
                if (child && child instanceof UI.Node) {
                    (instance as any).addChild(child);
                }
            });
        }

        return {
            type,
            props,
            children: children.flat().filter((c) => !!c), // Flatten and clean
        };
    }
}
