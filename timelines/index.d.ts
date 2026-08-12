import { Logging } from '../logging/index.ts';
export declare namespace Timelines {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /****** Types & Interfaces ******/
    /**
     * Unique generation-encoded identifier for a timeline.
     */
    type TimelineID = number & {
        readonly __brand: 'TimelineID';
    };
    /**
     * Configuration options for creating a timeline.
     */
    interface TimelineConfig {
        /**
         * Optional loop configuration: `true` for infinite loops, or a positive integer count.
         */
        loop?: boolean | number;
        /**
         * Optional yoyo flag: when `true` and `loop` is configured, alternates playback direction on each loop iteration.
         */
        yoyo?: boolean;
        /**
         * Optional default minimum elapsed time in milliseconds between onUpdate invocations for child steps.
         */
        minUpdateDeltaMs?: number;
        /**
         * Optional callback fired when the timeline reaches full completion.
         */
        onComplete?: () => Promise<void> | void;
        /**
         * Optional callback fired at the end of each completed loop iteration.
         */
        onLoop?: (completedLoops: number) => Promise<void> | void;
        /**
         * Optional callback fired whenever the timeline transitions to a new step.
         */
        onStep?: (stepIndex: number) => Promise<void> | void;
    }
    /**
     * Common base configuration shared across timeline animation steps.
     */
    interface BaseAnimationStepConfig {
        /** Starting numeric value (default: 0). */
        from?: number;
        /** Optional start delay in milliseconds before this step begins updating. */
        delayMs?: number;
        /** Optional minimum elapsed time in milliseconds between onUpdate invocations. */
        minUpdateDeltaMs?: number;
        /** Callback fired on every tick with the interpolated/current value. */
        onUpdate: (value: number) => Promise<void> | void;
        /** Optional callback fired when this step finishes or settles. */
        onComplete?: () => Promise<void> | void;
    }
    /**
     * Configuration for a single tween animation step.
     */
    interface TweenStepConfig extends BaseAnimationStepConfig {
        /** Target ending numeric value (default: 1). */
        to?: number;
        /** Total duration in milliseconds. */
        duration: number;
        /** Optional easing function mapping normalized progress (0..1) to eased progress. */
        easing?: (t: number) => number;
        /** Optional precision threshold for quantization and deadbanding. */
        precision?: number;
    }
    /**
     * Configuration for a single spring physics animation step.
     */
    interface SpringStepConfig extends BaseAnimationStepConfig {
        /** Target ending numeric value (default: 1). */
        to?: number;
        /** Initial velocity (default: 0). */
        velocity?: number;
        /** Spring stiffness coefficient (default: 170). */
        stiffness?: number;
        /** Damping coefficient (default: 26). */
        damping?: number;
        /** Precision threshold to determine settling (default: 0.001). */
        precision?: number;
    }
    /**
     * Configuration for a single friction-based decay/inertia animation step.
     */
    interface DecayStepConfig extends BaseAnimationStepConfig {
        /** Initial velocity (e.g. units per second). */
        velocity: number;
        /** Deceleration friction coefficient (default: 0.997). */
        deceleration?: number;
        /** Precision threshold (default: 0.01). */
        precision?: number;
    }
    /**
     * Child step config for parallel multi-track steps.
     */
    type ParallelChildConfig =
        | ({
              type: 'tween';
          } & TweenStepConfig)
        | ({
              type: 'spring';
          } & SpringStepConfig)
        | ({
              type: 'decay';
          } & DecayStepConfig);
    /**
     * Internal discriminated union for timeline steps.
     */
    type TimelineStep =
        | {
              readonly type: 'tween';
              readonly config: TweenStepConfig;
          }
        | {
              readonly type: 'spring';
              readonly config: SpringStepConfig;
          }
        | {
              readonly type: 'decay';
              readonly config: DecayStepConfig;
          }
        | {
              readonly type: 'parallel';
              readonly children: readonly ParallelChildConfig[];
          }
        | {
              readonly type: 'wait';
              readonly durationMs: number;
          }
        | {
              readonly type: 'call';
              readonly callback: () => void | Promise<void>;
          };
    /**
     * Maximum number of concurrent timelines supported by the engine pool.
     */
    const MAX_TIMELINES = 256;
    /**
     * Maximum number of sequential steps allowed per timeline.
     */
    const MAX_STEPS_PER_TIMELINE = 32;
    /****** Public Functional API ******/
    /**
     * Allocates a new timeline in the pool.
     * @param config - Optional loop and lifecycle event settings.
     * @returns The unboxed {@link TimelineID}, or null if the pool is full.
     */
    function create(config?: TimelineConfig): TimelineID | null;
    /**
     * Appends a tween step to a timeline.
     * @param id - The timeline ID.
     * @param config - Tween configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addTween(id: TimelineID, config: TweenStepConfig): boolean;
    /**
     * Appends a spring physics step to a timeline.
     * @param id - The timeline ID.
     * @param config - Spring configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addSpring(id: TimelineID, config: SpringStepConfig): boolean;
    /**
     * Appends a friction-based decay/inertia step to a timeline.
     * @param id - The timeline ID.
     * @param config - Decay configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addDecay(id: TimelineID, config: DecayStepConfig): boolean;
    /**
     * Appends a parallel multi-track step to a timeline.
     * @param id - The timeline ID.
     * @param children - Array of parallel child tween or spring configs.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addParallel(id: TimelineID, children: readonly ParallelChildConfig[]): boolean;
    /**
     * Appends a pause/wait delay step to a timeline.
     * @param id - The timeline ID.
     * @param durationMs - Delay in milliseconds.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addWait(id: TimelineID, durationMs: number): boolean;
    /**
     * Appends an action callback step to a timeline.
     * @param id - The timeline ID.
     * @param callback - Function executed when the timeline reaches this step.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    function addCall(id: TimelineID, callback: () => void | Promise<void>): boolean;
    /**
     * Starts or resumes playback of a timeline.
     * @param id - The timeline ID.
     * @returns True if started, false if invalid.
     */
    function play(id: TimelineID): boolean;
    /**
     * Plays a timeline and returns a Promise that resolves when the timeline reaches completion.
     * @param id - The timeline ID.
     * @returns A Promise resolving upon completion.
     */
    function playAsync(id: TimelineID): Promise<void>;
    /**
     * Pauses playback of an active timeline.
     * @param id - The timeline ID.
     * @returns True if paused, false if invalid or not running.
     */
    function pause(id: TimelineID): boolean;
    /**
     * Resumes a paused timeline.
     * @param id - The timeline ID.
     * @returns True if resumed, false if invalid or not paused.
     */
    function resume(id: TimelineID): boolean;
    /**
     * Stops a timeline immediately and frees its slot and resources.
     * @param id - The timeline ID.
     */
    function stop(id: TimelineID): void;
    /**
     * Stops all active timelines and clears the pool.
     */
    function stopAll(): void;
    /**
     * Restarts an active timeline from step 0.
     * @param id - The timeline ID.
     * @returns True if restarted, false if invalid.
     */
    function restart(id: TimelineID): boolean;
    /**
     * Checks if a timeline is currently allocated in the pool.
     * @param id - The timeline ID.
     * @returns True if active, false otherwise.
     */
    function isActive(id: TimelineID): boolean;
    /**
     * Checks if a timeline is currently running.
     * @param id - The timeline ID.
     * @returns True if running, false if paused/stopped, or undefined if invalid.
     */
    function isRunning(id: TimelineID): boolean | undefined;
    /**
     * Checks if a timeline is currently paused.
     * @param id - The timeline ID.
     * @returns True if paused, false if running, or undefined if invalid.
     */
    function isPaused(id: TimelineID): boolean | undefined;
    /**
     * Checks if a timeline has reached completion.
     * @param id - The timeline ID.
     * @returns True if complete, false otherwise, or undefined if invalid.
     */
    function isComplete(id: TimelineID): boolean | undefined;
    /**
     * Returns the current active step index of a timeline.
     * @param id - The timeline ID.
     * @returns The active step index (0-based), or undefined if invalid.
     */
    function getCurrentStep(id: TimelineID): number | undefined;
    /**
     * Returns the number of currently allocated timelines.
     * @returns Active timeline count.
     */
    function getActiveCount(): number;
    /**
     * Returns the number of currently ticking running timelines.
     * @returns Running timeline count.
     */
    function getRunningCount(): number;
    /****** Optional Thin Class Wrapper ******/
    /**
     * Optional thin object-oriented wrapper over the functional TimelineID API.
     * Designed with minimal overhead, strictly delegating all operations to Timelines functions.
     */
    class Timeline {
        readonly _id: TimelineID;
        constructor(config?: TimelineConfig);
        /**
         * Wraps an existing TimelineID in a Timeline instance.
         * @param id - The TimelineID.
         * @returns A new Timeline wrapper instance, or null if the ID is invalid.
         */
        static fromId(id: TimelineID): Timeline | null;
        /**
         * The underlying branded TimelineID.
         * @returns The TimelineID.
         */
        get id(): TimelineID;
        /**
         * Checks if the timeline is active and allocated.
         * @returns True if active, false otherwise.
         */
        get isValid(): boolean;
        /**
         * Checks if the timeline is actively running.
         * @returns True if running, false if paused/stopped, or undefined if invalid.
         */
        get isRunning(): boolean | undefined;
        /**
         * Checks if the timeline is currently paused.
         * @returns True if paused, false if running, or undefined if invalid.
         */
        get isPaused(): boolean | undefined;
        /**
         * Checks if the timeline is complete.
         * @returns True if complete, false otherwise, or undefined if invalid.
         */
        get isComplete(): boolean | undefined;
        /**
         * The current active step index.
         * @returns The active step index, or undefined if invalid.
         */
        get currentStep(): number | undefined;
        addTween(config: TweenStepConfig): this;
        addSpring(config: SpringStepConfig): this;
        addDecay(config: DecayStepConfig): this;
        addParallel(children: readonly ParallelChildConfig[]): this;
        addWait(durationMs: number): this;
        addCall(callback: () => void | Promise<void>): this;
        play(): this;
        playAsync(): Promise<void>;
        pause(): this;
        resume(): this;
        stop(): void;
        restart(): this;
    }
}
