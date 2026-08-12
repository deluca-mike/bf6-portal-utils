import { CallbackHandler } from '../callback-handler/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version: 2.0.0
export namespace Clocks {
    const logging = new Logging('Clocks');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

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
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /**
     * Unique generation-encoded identifier for a Clock.
     */
    export type ClockID = number & { readonly __brand: 'ClockID' };

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
         * Optional limit in seconds (clamped between 0 and 32,767). If set, clock stops and fires onComplete when reached.
         * Defaults to MAX_CLOCK_SECONDS (32,767 seconds / ~9.1 hours) if omitted.
         */
        timeLimitSeconds?: number;
    };

    /**
     * Options for the countdown clock.
     */
    export type CountDownOptions = ClockOptions;

    /**
     * Maximum duration or time limit in seconds supported by clocks (signed 16-bit integer limit).
     */
    export const MAX_CLOCK_SECONDS = 32_767;

    const MAX_CLOCKS = 256;
    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 10_000;
    const INVALID_INDEX = -1;
    const FLAG_IN_USE = 1 << 0;
    const FLAG_RUNNING = 1 << 1;
    const FLAG_COMPLETE = 1 << 2;
    const FLAG_COUNTDOWN = 1 << 3;

    const _flags = new Uint8Array(MAX_CLOCKS);
    const _generations = new Uint16Array(MAX_CLOCKS);

    function _isInUse(flags: number): boolean {
        return (flags & FLAG_IN_USE) !== 0;
    }

    function _isRunning(flags: number): boolean {
        return (flags & FLAG_RUNNING) !== 0;
    }

    function _isComplete(flags: number): boolean {
        return (flags & FLAG_COMPLETE) !== 0;
    }

    function _isCountDown(flags: number): boolean {
        return (flags & FLAG_COUNTDOWN) !== 0;
    }

    function _setFlag(index: number, flag: number): void {
        _flags[index] |= flag;
    }

    function _clearFlag(index: number, flag: number): void {
        _flags[index] &= ~flag;
    }

    const SERVER_START_TIME = Date.now();

    const _accumulatedMs = new Uint32Array(MAX_CLOCKS);
    const _lastResumeTime = new Uint32Array(MAX_CLOCKS);
    const _limits = new Uint32Array(MAX_CLOCKS);

    /**
     * Intrusive link / integer second array:
     * - Free slot (!FLAG_IN_USE): Points to the next free slot on the intrusive free list (`_firstFree`).
     * - In-use slot (FLAG_IN_USE): Stores the last reported integer second (initialized to INVALID_INDEX).
     */
    const _lastIntegerSecond = new Int16Array(MAX_CLOCKS);

    for (let i = 0; i < MAX_CLOCKS - 1; ++i) {
        _lastIntegerSecond[i] = i + 1;
    }

    _lastIntegerSecond[MAX_CLOCKS - 1] = INVALID_INDEX;

    let _firstFree = 0;

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    const _onSecond = new Array<((s: number) => Promise<void> | void) | null>(MAX_CLOCKS);
    const _onMinute = new Array<((m: number) => Promise<void> | void) | null>(MAX_CLOCKS);
    const _onComplete = new Array<(() => Promise<void> | void) | null>(MAX_CLOCKS);

    let _activeClockCount = 0;
    let _tickTimerId: Timers.TimerID | null = null;
    let _queueTickPending = false;

    // Reusable static promise for zero-allocation microtask dispatch.
    const STATIC_PROMISE = Promise.resolve();

    /**
     * Pops the next available slot from the intrusive free-list in O(1) time.
     * @returns The index of the allocated slot, or INVALID_INDEX if the pool is full.
     */
    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const index = _firstFree;
        _firstFree = _lastIntegerSecond[index];
        _lastIntegerSecond[index] = INVALID_INDEX;

        return index;
    }

    function _resolveIndex(id: ClockID): number {
        if (id < 0) return INVALID_INDEX;

        const index = id % GENERATION_MULTIPLIER;

        if (index >= MAX_CLOCKS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[index] !== expectedGen || !_isInUse(_flags[index])) return INVALID_INDEX;

        return index;
    }

    function _getElapsedMilliseconds(index: number): number {
        return _isRunning(_flags[index])
            ? _accumulatedMs[index] + (getUptime() - _lastResumeTime[index])
            : _accumulatedMs[index];
    }

    function _getElapsedSeconds(index: number): number {
        return _getElapsedMilliseconds(index) / 1000;
    }

    function _adjustElapsedTime(index: number, seconds: number): void {
        _accumulatedMs[index] += seconds * 1000;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Adjusted elapsed time for Clock ${index} by ${seconds}s`, LogLevel.Info);
        }

        _queueTick();
    }

    function _processTickQueue(): void {
        _queueTickPending = false;
        _tick();
    }

    function _queueTick(): void {
        if (_queueTickPending) return;

        _queueTickPending = true;
        STATIC_PROMISE.then(_processTickQueue);
    }

    function _scheduleTick(): void {
        if (_tickTimerId !== null) {
            Timers.clear(_tickTimerId);
            _tickTimerId = null;
        }

        // Fast exit if no timers are active.
        if (_activeClockCount === 0) return;

        let closestNextMs = -1;

        for (let id = 0; id < MAX_CLOCKS; ++id) {
            if (!_isRunning(_flags[id])) continue;

            const nextWholeMs = 1000 - (_getElapsedMilliseconds(id) % 1000);

            if (closestNextMs === -1 || nextWholeMs < closestNextMs) {
                closestNextMs = nextWholeMs;
            }
        }

        // This should never happen, but check anyway.
        if (closestNextMs === -1) return;

        _tickTimerId = Timers.setTimeout(_tick, Math.max(1, closestNextMs));
    }

    function _tick(): void {
        for (let id = 0; id < MAX_CLOCKS; ++id) {
            const flags = _flags[id];

            if (!_isInUse(flags) || _isComplete(flags)) continue;

            const isCountDown = _isCountDown(flags);
            const elapsedSecs = _getElapsedSeconds(id);
            const limit = _limits[id];

            let isCompleteNow = false;
            let currentSeconds = 0;
            let currentSecondsInt = 0;

            if (isCountDown) {
                currentSeconds = Math.max(0, limit - elapsedSecs);
                currentSecondsInt = Math.ceil(currentSeconds);

                if (currentSeconds <= 0) {
                    isCompleteNow = true;
                }
            } else {
                currentSeconds = Math.min(limit, elapsedSecs);
                currentSecondsInt = Math.floor(currentSeconds);

                if (currentSeconds >= limit) {
                    isCompleteNow = true;
                }
            }

            if (isCompleteNow) {
                _clearFlag(id, FLAG_RUNNING);
                _setFlag(id, FLAG_COMPLETE);

                CallbackHandler.invokeNoArgs(_onComplete[id], logging, 'onComplete');

                if (logging.willLog(LogLevel.Info)) {
                    logging.log(`Clock ${id} completed`, LogLevel.Info);
                }

                currentSecondsInt = isCountDown ? 0 : limit;
            }

            const prevSecond = _lastIntegerSecond[id];

            if (currentSecondsInt === prevSecond) continue;

            _lastIntegerSecond[id] = currentSecondsInt;

            CallbackHandler.invoke(
                _onSecond[id],
                currentSecondsInt,
                undefined,
                undefined,
                undefined,
                logging,
                'onSecond'
            );

            const prevMinute =
                prevSecond === INVALID_INDEX
                    ? -1
                    : isCountDown
                      ? Math.ceil(prevSecond / 60)
                      : Math.floor(prevSecond / 60);

            const currentMinutesInt = isCountDown
                ? Math.ceil(currentSecondsInt / 60)
                : Math.floor(currentSecondsInt / 60);

            if (currentMinutesInt === prevMinute) continue;

            CallbackHandler.invoke(
                _onMinute[id],
                currentMinutesInt,
                undefined,
                undefined,
                undefined,
                logging,
                'onMinute'
            );
        }

        _scheduleTick();
    }

    /**
     * Creates a count up clock.
     * @param options The options for the clock. `timeLimitSeconds` is clamped to [0, MAX_CLOCK_SECONDS].
     * @returns The ID of the clock, or null if the clock pool is full.
     */
    export function createCountUp(options?: CountUpOptions): ClockID | null {
        const index = _allocateSlot();

        if (index === INVALID_INDEX) return null;

        ++_activeClockCount;
        _setFlag(index, FLAG_IN_USE);
        _accumulatedMs[index] = 0;
        _lastResumeTime[index] = 0;
        _limits[index] = Math.min(MAX_CLOCK_SECONDS, Math.max(0, options?.timeLimitSeconds ?? MAX_CLOCK_SECONDS));

        _onSecond[index] = options?.onSecond ?? null;
        _onMinute[index] = options?.onMinute ?? null;
        _onComplete[index] = options?.onComplete ?? null;

        return (index + GENERATION_MULTIPLIER * _generations[index]) as ClockID;
    }

    /**
     * Creates a countdown clock.
     * @param durationSeconds The duration of the clock in seconds (clamped to [0, MAX_CLOCK_SECONDS]).
     * @param options The options for the clock.
     * @returns The ID of the clock, or null if the clock pool is full.
     */
    export function createCountDown(durationSeconds: number, options?: CountDownOptions): ClockID | null {
        const index = _allocateSlot();

        if (index === INVALID_INDEX) return null;

        ++_activeClockCount;
        _setFlag(index, FLAG_IN_USE);
        _setFlag(index, FLAG_COUNTDOWN);
        _accumulatedMs[index] = 0;
        _lastResumeTime[index] = 0;
        _limits[index] = Math.min(MAX_CLOCK_SECONDS, Math.max(0, durationSeconds));

        _onSecond[index] = options?.onSecond ?? null;
        _onMinute[index] = options?.onMinute ?? null;
        _onComplete[index] = options?.onComplete ?? null;

        return (index + GENERATION_MULTIPLIER * _generations[index]) as ClockID;
    }

    /**
     * Destroys a clock.
     * @param id The ID of the clock.
     */
    export function destroy(id: ClockID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        stop(id);

        _flags[index] = 0;
        _onSecond[index] = null;
        _onMinute[index] = null;
        _onComplete[index] = null;
        --_activeClockCount;

        if (_generations[index] < MAX_GENERATIONS) {
            ++_generations[index];
            _lastIntegerSecond[index] = _firstFree;
            _firstFree = index;
        } else if (logging.willLog(LogLevel.Warning)) {
            logging.log(`Slot ${index} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    /**
     * Returns if a clock is running.
     * @param id The ID of the clock.
     * @returns True if running, false if not running, or undefined if the clock does not exist.
     */
    export function isRunning(id: ClockID): boolean | undefined {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return undefined;

        return _isRunning(_flags[index]);
    }

    /**
     * Returns if a clock is paused.
     * @param id The ID of the clock.
     * @returns True if paused, false if not paused, or undefined if the clock does not exist.
     */
    export function isPaused(id: ClockID): boolean | undefined {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return undefined;

        const flags = _flags[index];

        return !_isRunning(flags) && !_isComplete(flags);
    }

    /**
     * Returns if a clock has completed.
     * @param id The ID of the clock.
     * @returns True if complete, false if not complete, or undefined if the clock does not exist.
     */
    export function isComplete(id: ClockID): boolean | undefined {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return undefined;

        return _isComplete(_flags[index]);
    }

    /**
     * Gets the seconds of a clock. For a countdown clock, this is the seconds remaining. For a count up clock, this is the total time elapsed.
     * @param id The ID of the clock.
     * @returns The seconds of the clock, or undefined if the clock does not exist.
     */
    export function getSeconds(id: ClockID): number | undefined {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return undefined;

        const flags = _flags[index];
        const isCountDown = _isCountDown(flags);
        const limit = _limits[index];

        if (_isComplete(flags)) return isCountDown ? 0 : limit;

        const elapsedSecs = _getElapsedSeconds(index);

        return isCountDown ? Math.max(0, limit - elapsedSecs) : Math.min(limit, elapsedSecs);
    }

    /**
     * Gets the total duration of the clock that will result in completion.
     * @param id The ID of the clock.
     * @returns The duration of the clock in seconds, or undefined if the clock does not exist.
     */
    export function getDuration(id: ClockID): number | undefined {
        const index = _resolveIndex(id);

        return index !== INVALID_INDEX ? _limits[index] : undefined;
    }

    /**
     * Sets the total duration of the clock that will result in completion. Will not resume completed clocks.
     * @param id The ID of the clock.
     * @param durationSeconds The duration of the clock in seconds (clamped to [0, MAX_CLOCK_SECONDS]).
     */
    export function setDuration(id: ClockID, durationSeconds: number): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _limits[index] = Math.min(MAX_CLOCK_SECONDS, Math.max(0, durationSeconds));
        _queueTick();
    }

    /**
     * Starts the clock.
     * @param id The ID of the clock to start.
     */
    export function start(id: ClockID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        const flags = _flags[index];

        if (_isRunning(flags) || _isComplete(flags)) return;

        _setFlag(index, FLAG_RUNNING);
        _lastResumeTime[index] = getUptime();
        _queueTick();

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Clock ${id} started`, LogLevel.Info);
        }
    }

    /**
     * Stops the clock.
     * @param id The ID of the clock to stop.
     */
    export function stop(id: ClockID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        if (!_isRunning(_flags[index])) return;

        _clearFlag(index, FLAG_RUNNING);
        _accumulatedMs[index] += getUptime() - _lastResumeTime[index];
        _queueTick();

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Clock ${id} stopped`, LogLevel.Info);
        }
    }

    /**
     * Resumes the clock (which is the same as starting it).
     * @param id The ID of the clock to resume.
     */
    export function resume(id: ClockID): void {
        start(id);
    }

    /**
     * Pauses the clock (which is the same as stopping it).
     * @param id The ID of the clock to pause.
     */
    export function pause(id: ClockID): void {
        stop(id);
    }

    /**
     * Resets the clock to its initial state. A running clock will continue to run after being reset.
     * @param id The ID of the clock to reset.
     */
    export function reset(id: ClockID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        const flags = _flags[index];

        _clearFlag(index, FLAG_COMPLETE);
        _accumulatedMs[index] = 0;
        _lastIntegerSecond[index] = INVALID_INDEX;

        if (_isRunning(flags)) {
            _lastResumeTime[index] = getUptime();
            _queueTick();
        }
    }

    /**
     * Adds seconds to the clock. Will delay the completion of a countdown clock and increase the elapsed time of a countup clock.
     * @param id The ID of the clock to modify.
     * @param seconds The number of seconds to add.
     */
    export function addSeconds(id: ClockID, seconds: number): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _adjustElapsedTime(index, _isCountDown(_flags[index]) ? -seconds : seconds);
    }

    /**
     * Subtracts seconds from the clock. Will advance the completion of a countdown clock and decrease the elapsed time of a countup clock.
     * @param id The ID of the clock to modify.
     * @param seconds The number of seconds to subtract.
     */
    export function subtractSeconds(id: ClockID, seconds: number): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _adjustElapsedTime(index, _isCountDown(_flags[index]) ? seconds : -seconds);
    }

    /**
     * Returns true if the clock is active (allocated).
     * @param id The ID of the clock.
     * @returns True if the clock is active, false otherwise.
     */
    export function isActive(id: ClockID): boolean {
        return _resolveIndex(id) !== INVALID_INDEX;
    }

    /**
     * @returns The number of active clocks.
     */
    export function getActiveClockCount(): number {
        return _activeClockCount;
    }
}
