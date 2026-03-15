export declare namespace Benchmarker {
    /**
     * Profiles a synchronous function.
     * @param fn - The function to execute.
     * @param iterations - How many times to run it.
     * @returns The total milliseconds elapsed. Divide by iterations for per-op cost.
     */
    function run(fn: () => void, iterations?: number): number;
    /**
     * Profiles an asynchronous function, accounting for microtask drainage.
     * WARNING: Only use async benchmarking for pure-JS Promises. Do not pass any functions containing `mod.Wait` (or
     * `setTimeout`). Because those functions yield to the game engine, the benchmark will stall until the next server
     * tick (~33ms), completely invalidating your target budget and time measurements.
     * @param fn - The asynchronous function to execute.
     * @param iterations - How many times to run it.
     * @returns A promise that resolves to the total milliseconds elapsed.
     */
    function runAsync(fn: () => Promise<void> | void, iterations?: number): Promise<number>;
    /**
     * Determines how many times a function can safely execute within a given time budget.
     * @param fn - The function to test.
     * @param targetMs - The maximum time budget in milliseconds.
     * @param batchSize - How many executions to bundle between time checks (reduces `Date.now()` overhead).
     * @returns The total number of safe iterations executed.
     */
    function findMaxIterations(fn: () => void, targetMs?: number, batchSize?: number): number;
    /**
     * Determines how many times an asynchronous function can safely execute within a given time budget.
     * WARNING: Only use async benchmarking for pure-JS Promises. Do not pass any functions containing `mod.Wait` (or
     * `setTimeout`). Because those functions yield to the game engine, the benchmark will stall until the next server
     * tick (~33ms), completely invalidating your target budget and time measurements.
     * @param fn - The asynchronous function to test.
     * @param targetMs - The maximum time budget in milliseconds.
     * @param batchSize - How many executions to bundle between time checks (reduces `Date.now()` overhead).
     * @returns The total number of safe iterations executed.
     */
    function findMaxIterationsAsync(
        fn: () => Promise<void> | void,
        targetMs?: number,
        batchSize?: number
    ): Promise<number>;
}
