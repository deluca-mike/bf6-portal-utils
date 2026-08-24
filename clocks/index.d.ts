import { Logging } from '../logging/index.ts';
export declare namespace Clocks {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * Unique generation-encoded identifier for a Clock.
     */
    type ClockID = number & {
        readonly __brand: 'ClockID';
    };
    /**
     * Sentinel value representing an invalid or uninitialized Clock ID.
     */
    const INVALID_CLOCK_ID: ClockID;
    /**
     * Options for the clock.
     */
    type ClockOptions = {
        /**
         * Callback fired when the second integer changes.
         */
        onSecond?: (currentSeconds: number) => Promise<void> | void;
        /**
         * Callback fired when the minute integer changes.
         */
        onMinute?: (currentMinutes: number) => Promise<void> | void;
        /**
         * Callback fired when the clock completes.
         */
        onComplete?: () => Promise<void> | void;
    };
    /**
     * Options for the count up clock.
     */
    type CountUpOptions = ClockOptions & {
        /**
         * Optional limit in seconds (clamped between 0 and 32,767). If set, clock stops and fires onComplete when reached.
         * Defaults to MAX_CLOCK_SECONDS (32,767 seconds / ~9.1 hours) if omitted.
         */
        timeLimitSeconds?: number;
    };
    /**
     * Options for the countdown clock.
     */
    type CountDownOptions = ClockOptions;
    /**
     * Maximum duration or time limit in seconds supported by clocks (signed 16-bit integer limit).
     */
    const MAX_CLOCK_SECONDS = 32767;
    /**
     * Creates a count up clock.
     * @param options The options for the clock. `timeLimitSeconds` is clamped to [0, MAX_CLOCK_SECONDS].
     * @returns The ID of the clock, or INVALID_CLOCK_ID if the clock pool is full.
     */
    function createCountUp(options?: CountUpOptions): ClockID;
    /**
     * Creates a countdown clock.
     * @param durationSeconds The duration of the clock in seconds (clamped to [0, MAX_CLOCK_SECONDS]).
     * @param options The options for the clock.
     * @returns The ID of the clock, or INVALID_CLOCK_ID if the clock pool is full.
     */
    function createCountDown(durationSeconds: number, options?: CountDownOptions): ClockID;
    /**
     * Destroys a clock.
     * @param id The ID of the clock.
     */
    function destroy(id: ClockID): void;
    /**
     * Returns if a clock is running.
     * @param id The ID of the clock.
     * @returns True if the clock is running, false otherwise.
     */
    function isRunning(id: ClockID): boolean;
    /**
     * Returns if a clock is paused.
     * @param id The ID of the clock.
     * @returns True if the clock is paused, false otherwise.
     */
    function isPaused(id: ClockID): boolean;
    /**
     * Returns if a clock has completed.
     * @param id The ID of the clock.
     * @returns True if the clock is complete, false otherwise.
     */
    function isComplete(id: ClockID): boolean;
    /**
     * Gets the seconds of a clock. For a countdown clock, this is the seconds remaining. For a count up clock, this is the total time elapsed.
     * @param id The ID of the clock.
     * @returns The seconds of the clock.
     */
    function getSeconds(id: ClockID): number;
    /**
     * Gets the total duration of the clock that will result in completion.
     * @param id The ID of the clock.
     * @returns The duration of the clock in seconds.
     */
    function getDuration(id: ClockID): number;
    /**
     * Sets the total duration of the clock that will result in completion. Will not resume completed clocks.
     * @param id The ID of the clock.
     * @param durationSeconds The duration of the clock in seconds (clamped to [0, MAX_CLOCK_SECONDS]).
     */
    function setDuration(id: ClockID, durationSeconds: number): void;
    /**
     * Starts the clock.
     * @param id The ID of the clock to start.
     */
    function start(id: ClockID): void;
    /**
     * Stops the clock.
     * @param id The ID of the clock to stop.
     */
    function stop(id: ClockID): void;
    /**
     * Resumes the clock (which is the same as starting it).
     * @param id The ID of the clock to resume.
     */
    function resume(id: ClockID): void;
    /**
     * Pauses the clock (which is the same as stopping it).
     * @param id The ID of the clock to pause.
     */
    function pause(id: ClockID): void;
    /**
     * Resets the clock to its initial state. A running clock will continue to run after being reset.
     * @param id The ID of the clock to reset.
     */
    function reset(id: ClockID): void;
    /**
     * Adds seconds to the clock. Will delay the completion of a countdown clock and increase the elapsed time of a countup clock.
     * @param id The ID of the clock to modify.
     * @param seconds The number of seconds to add.
     */
    function addSeconds(id: ClockID, seconds: number): void;
    /**
     * Subtracts seconds from the clock. Will advance the completion of a countdown clock and decrease the elapsed time of a countup clock.
     * @param id The ID of the clock to modify.
     * @param seconds The number of seconds to subtract.
     */
    function subtractSeconds(id: ClockID, seconds: number): void;
    /**
     * Returns true if the clock is active (allocated).
     * @param id The ID of the clock.
     * @returns True if the clock is active, false otherwise.
     */
    function isActive(id: ClockID): boolean;
    /**
     * @returns The number of active clocks.
     */
    function getActiveClockCount(): number;
}
