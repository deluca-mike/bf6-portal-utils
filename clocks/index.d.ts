import { Logging } from '../logging/index.ts';
export declare namespace Clocks {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
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
    ): void;
    /**
     * Options for the clock.
     */
    export type ClockOptions = {
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
    export type CountUpOptions = ClockOptions & {
        /**
         * Optional limit. If set, clock stops and fires onComplete when reached.
         */
        timeLimitSeconds?: number;
    };
    /**
     * Options for the countdown clock.
     */
    export type CountDownOptions = ClockOptions;
    /**
     * Abstract BaseClock
     * Handles the "Elapsed Time Engine": keeping track of how many milliseconds
     * have theoretically passed while the clock was in a "Running" state.
     */
    abstract class BaseClock {
        private _isRunning;
        private _isComplete;
        private _timerId;
        private _tickQueued;
        private _accumulatedMs;
        private _lastResumeTime;
        private _lastIntegerSecond;
        private _lastIntegerMinute;
        private _onSecond?;
        private _onMinute?;
        private _onComplete?;
        private _round;
        constructor(round: (value: number) => number, options?: ClockOptions);
        /**
         * Safely defers the execution of the _tick loop to the microtask queue.
         * This prevents synchronous state collisions when consumers manipulate the clock.
         */
        private _queueTick;
        /**
         * Returns the logical "Elapsed Time" of the clock in Milliseconds.
         * For CountUp, this is the value.
         * For CountDown, this is (Duration - Value).
         */
        protected _getElapsedMilliseconds(): number;
        /**
         * Returns the logical "Elapsed Time" of the clock in Seconds.
         * For CountUp, this is the value.
         * For CountDown, this is (Duration - Value).
         */
        protected _getElapsedSeconds(): number;
        /**
         * Modifies the internal elapsed time. Used by add/subtract seconds.
         */
        protected _adjustElapsedTime(seconds: number): void;
        protected abstract _checkCompletion(): boolean;
        /**
         * Main Loop: Calculates drift-corrected time and fires callbacks if integers changed.
         */
        private _tick;
        abstract get seconds(): number;
        abstract addSeconds(seconds: number): this;
        abstract subtractSeconds(seconds: number): this;
        get isRunning(): boolean;
        get isPaused(): boolean;
        get isComplete(): boolean;
        /**
         * Starts the clock.
         * @returns The clock instance.
         */
        start(): this;
        /**
         * Stops the clock.
         * @returns The clock instance.
         */
        stop(): this;
        /**
         * Resumes the clock (same as start).
         * @returns The clock instance.
         */
        resume(): this;
        /**
         * Pauses the clock (same as stop).
         * @returns The clock instance.
         */
        pause(): this;
        /**
         * Resets the clock.
         * @returns The clock instance.
         */
        reset(): this;
    }
    /**
     * CountUpClock: Starts at 0, goes up. Optional limit.
     */
    export class CountUpClock extends BaseClock {
        private _timeLimit;
        /**
         * Creates a new CountUpClock.
         * @param options - The options for the count up clock.
         */
        constructor(options?: CountUpOptions);
        protected _checkCompletion(): boolean;
        /**
         * @returns The time limit of the count up clock in seconds.
         */
        get timeLimit(): number;
        /**
         * @returns The current value of the count up clock in seconds.
         */
        get seconds(): number;
        /**
         * Adds seconds to the count up clock.
         * @param seconds - The number of seconds to add.
         * @returns The clock instance.
         */
        addSeconds(seconds: number): this;
        /**
         * Subtracts seconds from the count up clock.
         * @param seconds - The number of seconds to subtract.
         * @returns The clock instance.
         */
        subtractSeconds(seconds: number): this;
    }
    /**
     * CountDownClock: Starts at Duration, goes down to 0.
     */
    export class CountDownClock extends BaseClock {
        private _duration;
        /**
         * Creates a new CountDownClock.
         * @param durationSeconds - The duration of the countdown in seconds.
         * @param options - The options for the countdown clock.
         */
        constructor(durationSeconds: number, options?: CountDownOptions);
        protected _checkCompletion(): boolean;
        /**
         * @returns The starting duration of the countdown in seconds.
         */
        get duration(): number;
        /**
         * @returns The current value of the countdown in seconds.
         */
        get seconds(): number;
        /**
         * Adds seconds to the countdown clock, so it wil take longer to complete.
         * @param seconds - The number of seconds to add.
         * @returns The clock instance.
         */
        addSeconds(seconds: number): this;
        /**
         * Subtracts seconds from the countdown clock, so it will complete faster.
         * @param seconds - The number of seconds to subtract.
         * @returns The clock instance.
         */
        subtractSeconds(seconds: number): this;
        /**
         * Sets the duration of the countdown clock.
         * @param durationSeconds - The duration of the countdown in seconds.
         * @returns The clock instance.
         */
        setDuration(durationSeconds: number): this;
    }
    export {};
}
