import { Logging } from '../logging/index.ts';
export declare namespace Solid {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
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
    ): void;
    /****** Public Types & Branded Identifiers ******/
    /**
     * Unique generation-encoded identifier for a reactive Signal.
     */
    export type SignalID<T = unknown> = number & {
        readonly __brand: 'SignalID';
        readonly __type?: T;
    };
    /**
     * Unique generation-encoded identifier for a reactive Subscriber / Effect.
     */
    export type EffectID = number & {
        readonly __brand: 'EffectID';
    };
    type Constructable<Params, Instance> = new (params: Params) => Instance;
    type FunctionalComponent<Params, Instance> = (props: Reactive<Params>) => Instance;
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
    export const MAX_DEFER_TICKS = 65535;
    /**
     * Maximum number of concurrent subscribers (effects, memos, and reactive property bindings) supported.
     */
    export const MAX_SUBSCRIBERS = 1024;
    /**
     * Maximum number of concurrent reactive signals supported across all components and stores.
     */
    export const MAX_SIGNALS = 2048;
    /**
     * Maximum number of dependencies a single subscriber can track simultaneously.
     */
    export const MAX_DEPS_PER_SUB = 8;
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
    export const MAX_EXECUTIONS_PER_FLUSH = 1000;
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
    export const MAX_FLUSHES_PER_TICK = 1000;
    /**
     * Retrieves the count of currently active reactive signals.
     * @returns The active signal count.
     */
    export function getActiveSignals(): number;
    /**
     * Retrieves the count of currently active subscribers and effects.
     * @returns The active subscriber count.
     */
    export function getActiveSubscribers(): number;
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
    export function untrack<T>(fn: () => T): T;
    /**
     * Creates a simple reactive state (a "Signal") backed by an integer SoA slot.
     * Signals are the atoms of reactivity. They hold a value and notify subscribers when changed.
     * @param initialValue - The starting value.
     * @returns A generation-encoded {@link SignalID}, or `INVALID_INDEX` (-1) if capacity is exhausted.
     */
    export function createSignal<T>(initialValue: T): SignalID<T>;
    /**
     * Reads the current value of a reactive Signal.
     * Key Concept: Calling `read` inside an active Effect or Memo establishes an automatic dependency edge.
     * That Effect will automatically re-run whenever this Signal's value changes.
     * @param id - The {@link SignalID} to read.
     * @returns The current value of the Signal, or `undefined` if the Signal is invalid/destroyed.
     */
    export function read<T>(id: SignalID<T>): T;
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
    export function write<T>(id: SignalID<T>, newValue: T | ((prev: T) => T)): void;
    /**
     * Destroys a reactive Signal, unlinking all subscriber edges, freeing its SoA slot, and advancing its generation counter.
     * @param id - The {@link SignalID} to destroy.
     */
    export function destroySignal<T>(id: SignalID<T>): void;
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
    export function createEffect(fn: () => void, options?: EffectOptions): EffectID;
    /**
     * Destroys a reactive Effect, unlinking all signal dependencies, running pending cleanups, and freeing its SoA slot.
     * @param id - The {@link EffectID} to destroy.
     */
    export function destroyEffect(id: EffectID): void;
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
    export function createMemo<T>(fn: () => T, options?: MemoOptions): SignalID<T>;
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
    export function createRoot<T>(fn: (dispose: () => void) => T): T;
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
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void];
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
    export function createContext<T>(defaultValue: T): Context<T>;
    /**
     * Reads the current value of a Context. It climbs the scope stack to find the nearest `provide` call for this
     * context. If none is found, it returns the default value.
     * @param context - The {@link Context} to read.
     * @returns The current value of the {@link Context}.
     */
    export function useContext<T>(context: Context<T>): T;
    /****** Factory ******/
    /**
     * Registers a cleanup callback for the current reactive scope.
     * If called inside a component/root, it runs when the component/root is disposed.
     * If called inside an Effect, it runs before the Effect re-executes (or when it is destroyed).
     *
     * Use Case: Clearing timers, removing event listeners, or specialized cleanup logic.
     * @param fn - The cleanup function to register.
     */
    export function onCleanup(fn: () => void): void;
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
        props?: Reactive<P>,
        options?: ComponentOptions
    ): T;
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
    ): void;
    export {};
}
