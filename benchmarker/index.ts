// version: 1.0.0
export namespace Benchmarker {
    /**
     * Profiles a synchronous function.
     * @param fn - The function to execute.
     * @param iterations - How many times to run it.
     * @returns The total milliseconds elapsed. Divide by iterations for per-op cost.
     */
    export function run(fn: () => void, iterations: number = 1): number {
        const start = Date.now();

        for (let i = 0; i < iterations; ++i) {
            fn();
        }

        return Date.now() - start;
    }

    /**
     * Profiles an asynchronous function, accounting for microtask drainage.
     * WARNING: Only use async benchmarking for pure-JS Promises. Do not pass any functions containing `mod.Wait` (or
     * `setTimeout`). Because those functions yield to the game engine, the benchmark will stall until the next server
     * tick (~33ms), completely invalidating your target budget and time measurements.
     * @param fn - The asynchronous function to execute.
     * @param iterations - How many times to run it.
     * @returns A promise that resolves to the total milliseconds elapsed.
     */
    export async function runAsync(fn: () => Promise<void> | void, iterations: number = 1): Promise<number> {
        const start = Date.now();

        for (let i = 0; i < iterations; ++i) {
            await fn();
        }

        return Date.now() - start;
    }

    /**
     * Determines how many times a function can safely execute within a given time budget.
     * @param fn - The function to test.
     * @param targetMs - The maximum time budget in milliseconds.
     * @param batchSize - How many executions to bundle between time checks (reduces `Date.now()` overhead).
     * @returns The total number of safe iterations executed.
     */
    export function findMaxIterations(fn: () => void, targetMs: number = 10, batchSize: number = 100): number {
        let totalIterations = 0;
        const start = Date.now();

        while (Date.now() - start < targetMs) {
            // Run a tight loop of `batchSize` before checking the clock again
            for (let i = 0; i < batchSize; ++i) {
                fn();
            }

            totalIterations += batchSize;
        }

        return totalIterations;
    }

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
    export async function findMaxIterationsAsync(
        fn: () => Promise<void> | void,
        targetMs: number = 10,
        batchSize: number = 100
    ): Promise<number> {
        let totalIterations = 0;
        const start = Date.now();

        while (Date.now() - start < targetMs) {
            // Run a tight loop of `batchSize` before checking the clock again.
            for (let i = 0; i < batchSize; ++i) {
                await fn();
            }

            totalIterations += batchSize;
        }

        return totalIterations;
    }
}
