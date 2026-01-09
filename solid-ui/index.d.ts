export declare namespace SolidUI {
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
    type Constructable<Params, Instance> = new (params: Params, receiver?: mod.Player | mod.Team) => Instance;
    type FunctionalComponent<Params, Instance> = (props: Reactive<Params>, receiver?: mod.Player | mod.Team) => Instance;
    type Reactive<T> = {
        [K in keyof T]?: T[K] | Accessor<T[K]>;
    };
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
    export function untrack<T>(fn: () => T): T;
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
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>];
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
    export function createEffect(fn: () => void): () => void;
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
    export function createMemo<T>(fn: () => T): Accessor<T>;
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
    export function createRoot<T>(fn: (dispose: () => void) => T): T;
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
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void];
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
    export function createContext<T>(defaultValue: T): Context<T>;
    /**
     * Reads the current value of a Context. It climbs the scope stack to find the nearest `provide` call for this
     * context. If none is found, it returns the default value.
     *
     * @param context - The {@link Context} to read.
     *
     * @returns The current value of the {@link Context}.
     */
    export function useContext<T>(context: Context<T>): T;
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
    export function onCleanup(fn: () => void): void;
    /**
     * The "HyperScript" factory function. Creates a UI Component and sets up reactivity.
     *
     * @param component - Either a `UI` Class Constructor (e.g., `UI.Button`) or a Functional Component.
     * @param props - An object of properties. Values can be static OR reactive (Signals/Accessors).
     * @param receiver - (Optional) The specific player or team this UI is for.
     *
     * @returns The created UI Instance.
     */
    export function h<P extends object, T>(component: Constructable<P, T> | FunctionalComponent<P, T>, props?: Reactive<P>, receiver?: mod.Player | mod.Team): T;
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
    export function Index<T>(each: Accessor<T[]>, render: (item: Accessor<T>, index: number) => unknown): void;
    export {};
}
