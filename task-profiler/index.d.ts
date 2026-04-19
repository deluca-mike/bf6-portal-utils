import { Logging } from '../logging/index.ts';
export declare namespace TaskProfiler {
    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    type Metrics = {
        totalCpuTimeMs: number;
        maxSyncBlockMs: number;
    };
    /**
     * Starts tracking a block of code.
     * @param name - The name of the task to track.
     * @returns A unique taskId to (optionally) pass to other TaskProfiler functions.
     */
    function startTask(name: string): number;
    /**
     * Ends tracking and returns metrics for the task. Does not cancel any of the task's pending timeouts.
     * @param taskId - (Optional) The taskId to end. Defaults to the currently running task.
     * @returns Metrics (total CPU time and max sync block duration), or zeroed metrics if the task was aborted or already ended.
     */
    function endTask(taskId?: number): Metrics;
    /**
     * Explicitly pauses the stopwatch for a task.
     * Use this at the end of a synchronous block if the task is continuing:
     *  - entirely via detached `setTimeout` callbacks, so the engine's sleep time isn't counted as CPU time, or
     *  - via a pure JS Promise, so the execution time of other queued microtasks is not counted as CPU time.
     * @param taskId - (Optional) The task to pause. Defaults to the currently running task.
     */
    function pauseStopwatch(taskId?: number): void;
    /**
     * Explicitly resumes the stopwatch for a task.
     * Use this to manually resume tracking after a pure JS Promise.
     * @param taskId - (Optional) The task to resume. Defaults to the currently running task.
     */
    function resumeStopwatch(taskId?: number): void;
}
