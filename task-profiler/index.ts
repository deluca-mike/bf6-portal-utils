import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version: 1.0.0
export namespace TaskProfiler {
    const logging = new Logging('TP');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    let nextTaskId = 1;

    let currentTaskId: number | null = null;

    export type Metrics = {
        totalCpuTimeMs: number;
        maxSyncBlockMs: number;
    };

    type State = {
        name: string;
        parentId: number | null;
        pendingAsyncOps: number;
        timeoutIds: Set<number>;
        currentBlockStartTime: number | null;
        currentBlockAccumulator: number;
        metrics: Metrics;
    };

    const tasks = new Map<number, State>();

    // Unique sets of task IDs to speed up `processWatchdogAborts` iteration.
    const activeTasks = new Set<number>();
    const sleepingTasks = new Set<number>();

    // Maps timer IDs to task IDs.
    const activeTimeouts = new Map<number, number>();

    // Store the original `setTimeout` and `clear` functions.
    const originalSetTimeout = Timers.setTimeout;
    const originalClear = Timers.clear;

    // Monkey-patch `Timers.setTimeout`.
    Timers.setTimeout = function (fn: () => Promise<void> | void, ms: number): number {
        if (currentTaskId === null) return originalSetTimeout(fn, ms);

        // Take a snapshot of whatever task is running right now.
        const initialTaskId = currentTaskId;

        // Call the original `setTimeout` with our injected context wrapper.
        const timerId = originalSetTimeout(async () => {
            activeTimeouts.delete(timerId);

            // Save the context before restoring it to the initial task.
            const previousTaskId = currentTaskId;

            currentTaskId = initialTaskId; // Restore the context

            const currentTask = currentTaskId ? tasks.get(currentTaskId) : undefined;

            if (currentTask) {
                startSyncBlock(currentTask);
                currentTask.timeoutIds.delete(timerId);
                --currentTask.pendingAsyncOps;
                activeTasks.add(currentTaskId!);
                sleepingTasks.delete(currentTaskId!);
            }

            try {
                // Execute the user's actual code in the restored context.
                await fn();
            } finally {
                // Ensure the task wasn't completely ended by the user before putting it to sleep.
                if (currentTask && tasks.has(currentTaskId)) {
                    flushSyncBlock(currentTask);
                    sleepingTasks.add(currentTaskId);
                    activeTasks.delete(currentTaskId);
                }

                // Pop the context back to whatever it was before the timer woke up.
                currentTaskId = previousTaskId;
            }
        }, ms);

        const initialTask = initialTaskId ? tasks.get(initialTaskId) : undefined;

        if (initialTask) {
            activeTimeouts.set(timerId, initialTaskId);
            initialTask.timeoutIds.add(timerId);
            ++initialTask.pendingAsyncOps;
        }

        return timerId;
    };

    // Monkey-patch `Timers.clear` to keep the `pendingAsyncOps` math accurate.
    Timers.clear = function (timerId?: number | null): void {
        if (timerId === undefined || timerId === null) return;

        originalClear(timerId);

        const taskId = activeTimeouts.get(timerId);

        if (!taskId) return;

        activeTimeouts.delete(timerId);

        const task = tasks.get(taskId);

        if (!task) return;

        task.timeoutIds.delete(timerId);

        // Mark the task awake if this was the last pending operation.
        if (--task.pendingAsyncOps === 0) {
            activeTasks.add(taskId);
            sleepingTasks.delete(taskId);
        }
    };

    Events.OngoingGlobal.subscribe(() => {
        // Guarantee a clean stack since the engine just started a new tick.
        // Even if the last tick was aborted, the call stack is now obviously empty.
        currentTaskId = null;

        // Any tasks still in the `activeTasks` set must have either been silently aborted by the host server or not
        // been ended/paused by the user before the next tick.
        for (const taskId of activeTasks) {
            const task = tasks.get(taskId);

            // If the task is no longer in the map, remove it from the set of active tasks.
            // NOTE: This should never happen, but it's a safeguard.
            if (!task) {
                activeTasks.delete(taskId);
                continue;
            }

            logging.log(
                `Task-${taskId} "${task.name}" did not end gracefully before the next tick.`,
                Logging.LogLevel.Error
            );

            for (const timeoutId of task.timeoutIds) {
                activeTimeouts.delete(timeoutId);
            }

            tasks.delete(taskId);
            activeTasks.delete(taskId);
        }
    });

    function startSyncBlock(task: State) {
        // Only start the stopwatch if it isn't already running.
        if (task.currentBlockStartTime !== null) return;

        task.currentBlockStartTime = Date.now();
    }

    function stopSyncBlock(task: State) {
        // Only stop the stopwatch and calculate math if it is running.
        if (task.currentBlockStartTime === null) return;

        const timeSinceStart = Date.now() - task.currentBlockStartTime;
        task.currentBlockAccumulator += timeSinceStart; // Add to the running total
        task.currentBlockStartTime = null; // Stop the clock
    }

    // To be called when the JS thread ACTUALLY yields to the C++ server.
    function flushSyncBlock(task: State) {
        stopSyncBlock(task); // Ensure the clock is stopped

        const totalBlockTime = task.currentBlockAccumulator;

        if (totalBlockTime === 0) return;

        task.metrics.totalCpuTimeMs += totalBlockTime;

        if (totalBlockTime > task.metrics.maxSyncBlockMs) {
            task.metrics.maxSyncBlockMs = totalBlockTime;
        }

        task.currentBlockAccumulator = 0; // Reset for the next real Watchdog block
    }

    /**
     * Starts tracking a block of code.
     * @param name - The name of the task to track.
     * @returns A unique taskId to (optionally) pass to other TaskProfiler functions.
     */
    export function startTask(name: string): number {
        const now = Date.now();

        const taskId = nextTaskId++;

        tasks.set(taskId, {
            name: name,
            parentId: currentTaskId, // Nest under whatever is currently running
            pendingAsyncOps: 0,
            timeoutIds: new Set(),
            currentBlockStartTime: now,
            currentBlockAccumulator: 0,
            metrics: {
                totalCpuTimeMs: 0,
                maxSyncBlockMs: 0,
            },
        });

        currentTaskId = taskId;
        activeTasks.add(taskId);

        return taskId;
    }

    /**
     * Ends tracking and returns metrics for the task. Does not cancel any of the task's pending timeouts.
     * @param taskId - (Optional) The taskId to end. Defaults to the currently running task.
     * @returns Metrics (total CPU time and max sync block duration), or zeroed metrics if the task was aborted or already ended.
     */
    export function endTask(taskId?: number): Metrics {
        // Fallback to the global context if no ID is provided
        const id = taskId ?? currentTaskId;

        if (id === null) return { totalCpuTimeMs: 0, maxSyncBlockMs: 0 };

        const task = tasks.get(id);

        if (!task) return { totalCpuTimeMs: 0, maxSyncBlockMs: 0 }; // Task was aborted or already ended

        for (const timeoutId of task.timeoutIds) {
            activeTimeouts.delete(timeoutId);
        }

        tasks.delete(id);
        sleepingTasks.delete(id);
        activeTasks.delete(id);

        flushSyncBlock(task);

        // Stack Safety: Only pop the global stack if we are actually ending the active task.
        // If they explicitly passed a parent's ID while a child is running, we leave the child as the active context.
        if (currentTaskId === id) {
            currentTaskId = task.parentId;
        }

        return task.metrics;
    }

    /**
     * Explicitly pauses the stopwatch for a task.
     * Use this at the end of a synchronous block if the task is continuing:
     *  - entirely via detached `setTimeout` callbacks, so the engine's sleep time isn't counted as CPU time, or
     *  - via a pure JS Promise, so the execution time of other queued microtasks is not counted as CPU time.
     * @param taskId - (Optional) The task to pause. Defaults to the currently running task.
     */
    export function pauseStopwatch(taskId?: number): void {
        const id = taskId ?? currentTaskId;

        if (id === null) return;

        const task = tasks.get(id);

        if (!task) return;

        stopSyncBlock(task); // Just pauses the clock, but doesn't flush.
        sleepingTasks.add(id);
        activeTasks.delete(id);
    }

    /**
     * Explicitly resumes the stopwatch for a task.
     * Use this to manually resume tracking after a pure JS Promise.
     * @param taskId - (Optional) The task to resume. Defaults to the currently running task.
     */
    export function resumeStopwatch(taskId?: number): void {
        const id = taskId ?? currentTaskId;

        if (id === null) return;

        const task = tasks.get(id);

        if (!task || task.currentBlockStartTime !== null) return;

        // Restarts the clock. The accumulator holds the previous time.
        task.currentBlockStartTime = Date.now();
        activeTasks.add(id);
        sleepingTasks.delete(id);
    }
}
