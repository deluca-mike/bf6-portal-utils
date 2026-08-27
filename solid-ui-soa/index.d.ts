import { Logging } from '../logging/index.ts';
export declare namespace SolidUISOA {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
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
    ): void;
    /**
     * Maximum number of concurrent subscribers (effects, memos, and reactive property bindings) supported.
     *
     * Performance vs Memory trade-offs:
     * - Flat buffers allocate ~14 bytes of TypedArray memory per subscriber slot.
     * - Increasing this value supports larger UI trees and more simultaneous effects.
     * - Decreasing this value saves static startup heap memory.
     */
    export const MAX_SUBSCRIBERS = 4096;
    /**
     * Maximum number of concurrent reactive signals supported across all components and stores.
     *
     * Performance vs Memory trade-offs:
     * - Flat buffers allocate ~10 bytes of TypedArray memory per signal slot.
     * - Increasing this value supports more fine-grained state variables.
     * - Decreasing this value reduces upfront resident memory.
     */
    export const MAX_SIGNALS = 8192;
    /**
     * Maximum number of subscriber executions allowed in a single microtask flush loop.
     * Prevents infinite re-entrant loops from locking up the thread.
     */
    export const MAX_EXECUTIONS_PER_FLUSH = 1000;
    /**
     * Maximum number of microtask flushes permitted within a single logical engine tick.
     */
    export const MAX_FLUSHES_PER_TICK = 1000;
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
    /****** Reactivity Core ******/
    /**
     * Executes a function without creating dependencies.
     * @param fn - The function to execute.
     * @returns The return value of `fn`.
     */
    export function untrack<T>(fn: () => T): T;
    /**
     * Creates a simple reactive state (a "Signal") backed by an integer SoA slot.
     * @param initialValue - The starting value.
     * @returns A tuple `[read, write]`.
     */
    export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>];
    /**
     * Creates a side effect that runs immediately and re-runs whenever its dependencies change.
     * @param fn - The function to execute.
     * @param options - The options for the effect.
     * @returns A disposer function.
     */
    export function createEffect(fn: () => void, options?: EffectOptions): () => void;
    /**
     * Creates a computed value / derived signal.
     * @param fn - The memoization computation.
     * @param options - The options for the memo.
     * @returns The accessor function.
     */
    export function createMemo<T>(fn: () => T, options?: MemoOptions): Accessor<T>;
    /**
     * Creates a reactive scope detached from any parent effect.
     * @param fn - Function receiving a dispose callback.
     * @returns Return value of `fn`.
     */
    export function createRoot<T>(fn: (dispose: () => void) => T): T;
    /**
     * Creates a reactive proxy object for handling nested state.
     * @param initialState - The initial object.
     * @returns A tuple `[store, setStore]`.
     */
    export function createStore<T extends object>(initialState: T): [T, (fn: (state: T) => void) => void];
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
    export function createContext<T>(defaultValue: T): Context<T>;
    /**
     * Reads the current value of a context.
     * @param context - The context to read.
     * @returns Current context value.
     */
    export function useContext<T>(context: Context<T>): T;
    /****** Factory ******/
    /**
     * Registers a cleanup callback for the active scope.
     * @param fn - The cleanup function.
     */
    export function onCleanup(fn: () => void): void;
    /**
     * The HyperScript factory function for UI Components.
     * @param component - Class constructor or functional component.
     * @param props - Static or reactive props.
     * @param options - Component options.
     * @returns Created UI instance.
     */
    export function h<P extends object, T>(
        component: Constructable<P, T> | FunctionalComponent<P, T>,
        props?: Reactive<P>,
        options?: ComponentOptions
    ): T;
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
    ): void;
    export {};
}
export declare const SolidUI: typeof SolidUISOA;
