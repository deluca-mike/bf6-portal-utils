import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version: 1.0.0
export namespace Clocks {
    const logging = new Logging('Clocks');

    /**
     * Log levels for controlling logging verbosity.
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
        // State
        private _isRunning: boolean = false;
        private _isComplete: boolean = false;
        private _timerId: number | undefined;
        private _tickQueued: boolean = false;

        // Time tracking
        // _accumulatedMs: Time gathered during previous running segments (before pauses).
        // _lastResumeTime: The Date.now() timestamp when we last switched from Paused to Running.
        private _accumulatedMs: number = 0;
        private _lastResumeTime: number = 0;

        // Tracking for callbacks to prevent duplicate firing.
        private _lastIntegerSecond: number | undefined;
        private _lastIntegerMinute: number | undefined;

        // Callbacks
        private _onSecond?: (s: number) => Promise<void> | void;
        private _onMinute?: (m: number) => Promise<void> | void;
        private _onComplete?: () => Promise<void> | void;

        // Rounding function
        private _round: (value: number) => number;

        constructor(round: (value: number) => number, options?: ClockOptions) {
            this._round = round;
            this._onSecond = options?.onSecond;
            this._onMinute = options?.onMinute;
            this._onComplete = options?.onComplete;
        }

        /**
         * Safely defers the execution of the _tick loop to the microtask queue.
         * This prevents synchronous state collisions when consumers manipulate the clock.
         */
        private _queueTick = (): void => {
            if (this._tickQueued) return;

            this._tickQueued = true;

            Promise.resolve().then(() => {
                this._tickQueued = false;
                this._tick();
            });
        };

        /**
         * Returns the logical "Elapsed Time" of the clock in Milliseconds.
         * For CountUp, this is the value.
         * For CountDown, this is (Duration - Value).
         */
        protected _getElapsedMilliseconds(): number {
            return this._isRunning ? this._accumulatedMs + (Date.now() - this._lastResumeTime) : this._accumulatedMs;
        }

        /**
         * Returns the logical "Elapsed Time" of the clock in Seconds.
         * For CountUp, this is the value.
         * For CountDown, this is (Duration - Value).
         */
        protected _getElapsedSeconds(): number {
            return this._getElapsedMilliseconds() / 1000;
        }

        /**
         * Modifies the internal elapsed time. Used by add/subtract seconds.
         */
        protected _adjustElapsedTime(seconds: number): void {
            this._accumulatedMs += seconds * 1000;

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Adjusted elapsed time by ${seconds}s.`, LogLevel.Info);
            }

            this._queueTick(); // Trigger an immediate check to handle completion (or update UI).
        }

        // Abstract internal methods to be implemented by specific clock types.
        protected abstract _checkCompletion(): boolean;

        /**
         * Main Loop: Calculates drift-corrected time and fires callbacks if integers changed.
         */
        private _tick = (): void => {
            if (this._isComplete) return;

            // Check for completion criteria first
            if (this._checkCompletion()) {
                this._isRunning = false;
                this._isComplete = true;
                CallbackHandler.invokeNoArgs(this._onComplete, 'onComplete', logging, LogLevel.Error);

                if (logging.willLog(LogLevel.Info)) {
                    logging.log(`Clock completed.`, LogLevel.Info);
                }
            }

            const currentSecondsInt = this._round(this.seconds);
            const currentMinutesInt = this._round(currentSecondsInt / 60);

            // Fire `_onSecond` if the integer second has changed (or if `this._lastIntegerSecond` is undefined).
            if (currentSecondsInt !== this._lastIntegerSecond) {
                this._lastIntegerSecond = currentSecondsInt;
                CallbackHandler.invoke(this._onSecond, [currentSecondsInt], 'onSecond', logging, LogLevel.Error);
            }

            // Fire `_onMinute` if the integer minute has changed (or if `this._lastIntegerMinute` is undefined).
            if (currentMinutesInt !== this._lastIntegerMinute) {
                this._lastIntegerMinute = currentMinutesInt;
                CallbackHandler.invoke(this._onMinute, [currentMinutesInt], 'onMinute', logging, LogLevel.Error);
            }

            // Clean up any existing timeout before calculating the next one.
            Timers.clear(this._timerId);
            this._timerId = undefined;

            if (this._isRunning) {
                // Call `_tick` on the next whole second boundary.
                this._timerId = Timers.setTimeout(this._tick, 1000 - (this._getElapsedMilliseconds() % 1000));
            }
        };

        // --- Public API ---

        // Abstract public methods to be implemented by specific clock types.
        public abstract get seconds(): number;
        public abstract addSeconds(seconds: number): this;
        public abstract subtractSeconds(seconds: number): this;

        public get isRunning(): boolean {
            return this._isRunning;
        }

        public get isPaused(): boolean {
            return !this.isRunning && !this._isComplete;
        }

        public get isComplete(): boolean {
            return this._isComplete;
        }

        /**
         * Starts the clock.
         * @returns The clock instance.
         */
        public start(): this {
            if (this._isRunning || this._isComplete) return this;

            this._isRunning = true;
            this._lastResumeTime = Date.now();
            this._queueTick();

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Clock started.`, LogLevel.Info);
            }

            return this;
        }

        /**
         * Stops the clock.
         * @returns The clock instance.
         */
        public stop(): this {
            if (!this._isRunning) return this;

            this._isRunning = false;

            Timers.clear(this._timerId);
            this._timerId = undefined;

            // Calculate the time passed since last resume and bake it into `_accumulatedMs`.
            this._accumulatedMs += Date.now() - this._lastResumeTime;
            this._queueTick();

            if (logging.willLog(LogLevel.Info)) {
                logging.log(`Clock stopped.`, LogLevel.Info);
            }

            return this;
        }

        /**
         * Resumes the clock (same as start).
         * @returns The clock instance.
         */
        public resume(): this {
            return this.start();
        }

        /**
         * Pauses the clock (same as stop).
         * @returns The clock instance.
         */
        public pause(): this {
            return this.stop();
        }

        /**
         * Resets the clock.
         * @returns The clock instance.
         */
        public reset(): this {
            this.stop();

            this._isComplete = false;
            this._accumulatedMs = 0;
            this._lastIntegerSecond = undefined;
            this._lastIntegerMinute = undefined;

            return this;
        }
    }

    /**
     * CountUpClock: Starts at 0, goes up. Optional limit.
     */
    export class CountUpClock extends BaseClock {
        private _timeLimit: number;

        /**
         * Creates a new CountUpClock.
         * @param options - The options for the count up clock.
         */
        constructor(options?: CountUpOptions) {
            // When counting up, the integer should only change when the values crosses an integer boundary going up,
            // and should start at 0.
            super(Math.floor, options);
            this._timeLimit = options?.timeLimitSeconds ?? 86400;
        }

        protected _checkCompletion(): boolean {
            return this.seconds >= this._timeLimit;
        }

        /**
         * @returns The time limit of the count up clock in seconds.
         */
        public get timeLimit(): number {
            return this._timeLimit;
        }

        /**
         * @returns The current value of the count up clock in seconds.
         */
        public get seconds(): number {
            // We use Math.min(this._timeLimit, ...) to prevent displaying numbers greater than the time limit.
            return this.isComplete ? this._timeLimit : Math.min(this._timeLimit, this._getElapsedSeconds());
        }

        /**
         * Adds seconds to the count up clock.
         * @param seconds - The number of seconds to add.
         * @returns The clock instance.
         */
        public addSeconds(seconds: number): this {
            // Adding seconds to a count up clock increases the elapsed time.
            this._adjustElapsedTime(seconds);
            return this;
        }

        /**
         * Subtracts seconds from the count up clock.
         * @param seconds - The number of seconds to subtract.
         * @returns The clock instance.
         */
        public subtractSeconds(seconds: number): this {
            // Subtracting seconds reduces elapsed time.
            this._adjustElapsedTime(-seconds);
            return this;
        }
    }

    /**
     * CountDownClock: Starts at Duration, goes down to 0.
     */
    export class CountDownClock extends BaseClock {
        private _duration: number;

        /**
         * Creates a new CountDownClock.
         * @param durationSeconds - The duration of the countdown in seconds.
         * @param options - The options for the countdown clock.
         */
        constructor(durationSeconds: number, options?: CountDownOptions) {
            // When counting down, the integer should only change when the values crosses an integer boundary going
            // down, and should start at the duration and only be 0 when the clock is complete.
            super(Math.ceil, options);
            this._duration = durationSeconds;
        }

        protected _checkCompletion(): boolean {
            // In a countdown, we are complete if current value is 0 (or less due to drift)
            return this.seconds <= 0;
        }

        /**
         * @returns The starting duration of the countdown in seconds.
         */
        public get duration(): number {
            return this._duration;
        }

        /**
         * @returns The current value of the countdown in seconds.
         */
        public get seconds(): number {
            // Current Value = Total Duration - Elapsed Time
            // We use Math.max(0, ...) to prevent displaying negative numbers.
            return this.isComplete ? 0 : Math.max(0, this._duration - this._getElapsedSeconds());
        }

        /**
         * Adds seconds to the countdown clock, so it wil take longer to complete.
         * @param seconds - The number of seconds to add.
         * @returns The clock instance.
         */
        public addSeconds(seconds: number): this {
            // Adding seconds to a countdown means extending the remaining time, thus reducing the "Elapsed" time.
            this._adjustElapsedTime(-seconds);
            return this;
        }

        /**
         * Subtracts seconds from the countdown clock, so it will complete faster.
         * @param seconds - The number of seconds to subtract.
         * @returns The clock instance.
         */
        public subtractSeconds(seconds: number): this {
            // Subtracting seconds from a countdown means reducing remaining time, thus increasing the "Elapsed" time.
            this._adjustElapsedTime(seconds);
            return this;
        }

        /**
         * Sets the duration of the countdown clock.
         * @param durationSeconds - The duration of the countdown in seconds.
         * @returns The clock instance.
         */
        public setDuration(durationSeconds: number): this {
            this._duration = durationSeconds;
            return this;
        }
    }
}
