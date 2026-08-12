import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 2.0.0
export namespace Timers {
    const logging = new Logging('Timers');

    /**
     * A re-export of the `Logging.LogLevel` enum.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /**
     * Unique generation-encoded identifier for a Timer.
     */
    export type TimerID = number & { readonly __brand: 'TimerID' };

    /**
     * Sentinel value representing an invalid or uninitialized Timer ID.
     */
    export const INVALID_TIMER_ID: TimerID = -1 as TimerID;

    // --- Configuration ---
    const MAX_TIMERS = 512;
    const SERVER_START_TIME = Date.now();
    const GENERATION_MULTIPLIER = 10_000; // Must be strictly larger than MAX_TIMERS.
    const INVALID_INDEX = -1;

    // --- Data-Oriented Storage (Zero Allocation Pool) ---
    const _expirationTimes = new Uint32Array(MAX_TIMERS);
    const _generations = new Uint32Array(MAX_TIMERS);

    /**
     * Intrusive link / interval milliseconds array:
     * - Free slot (_callbacks[i] === null): Points to the next free slot on the intrusive free list (`_firstFree`).
     * - In-use slot (_callbacks[i] !== null): Stores the repeat interval in milliseconds (0 for timeouts).
     */
    const _intervalMs = new Int32Array(MAX_TIMERS);

    for (let i = 0; i < MAX_TIMERS - 1; ++i) {
        _intervalMs[i] = i + 1;
    }

    _intervalMs[MAX_TIMERS - 1] = INVALID_INDEX;

    let _firstFree = 0;

    // Pre-allocated array initialized with nulls to prevent dynamic resizing.
    const _callbacks = new Array<(() => Promise<void> | void) | null>(MAX_TIMERS).fill(null);

    let _activeTimerCount = 0;
    let _isSubscribed = false;

    /**
     * @returns The current server uptime in milliseconds.
     */
    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

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
        _firstFree = _intervalMs[index];
        _intervalMs[index] = 0;

        return index;
    }

    /**
     * Resolves a public TimerID to its internal slot index.
     * @param id - The public TimerID.
     * @returns The internal slot index, or INVALID_INDEX if invalid or inactive.
     */
    function _resolveIndex(id: TimerID): number {
        if (id < 0) return INVALID_INDEX;

        const index = id % GENERATION_MULTIPLIER;

        if (index >= MAX_TIMERS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[index] !== expectedGen || _callbacks[index] === null) return INVALID_INDEX;

        return index;
    }

    /**
     * Deletes a timer by its index and returns the slot to the free list.
     * @param index - The index of the timer to delete.
     */
    function _deleteTimer(index: number): void {
        _callbacks[index] = null;
        ++_generations[index];
        --_activeTimerCount;

        _intervalMs[index] = _firstFree;
        _firstFree = index;
    }

    /**
     * Evaluates all active timers on every game tick with zero promise allocations.
     */
    function _handleTick(): void {
        // Fast exit if no timers are active.
        if (_activeTimerCount === 0) return;

        const currentUptime = getUptime();

        for (let index = 0; index < MAX_TIMERS; ++index) {
            const cb = _callbacks[index];

            if (cb === null) continue;

            if (currentUptime < _expirationTimes[index]) continue;

            // Mutate state before executing the callback in case the callback clears the timer.
            if (_intervalMs[index] > 0) {
                _expirationTimes[index] = currentUptime + _intervalMs[index];
            } else {
                _deleteTimer(index);
            }

            CallbackHandler.invokeNoArgs(cb, logging);
        }
    }

    /**
     * Ensures that the global tick subscription is active.
     */
    function _ensureSubscribed(): void {
        if (_isSubscribed) return;

        _isSubscribed = true;

        Events.OngoingGlobal.subscribe(_handleTick);
    }

    /**
     * Creates a timer.
     * @param callback - The callback to execute.
     * @param expirationDelay - The delay before the first execution.
     * @param interval - The interval between executions.
     * @returns The timer ID, or INVALID_TIMER_ID if the pool is full.
     */
    function _createTimer(callback: () => Promise<void> | void, expirationDelay: number, interval: number): TimerID {
        _ensureSubscribed();

        const index = _allocateSlot();

        if (index === INVALID_INDEX) return INVALID_TIMER_ID;

        ++_activeTimerCount;
        _callbacks[index] = callback;
        _expirationTimes[index] = getUptime() + expirationDelay;
        _intervalMs[index] = interval;

        return (index + GENERATION_MULTIPLIER * _generations[index]) as TimerID;
    }

    /**
     * Schedules a one-time execution after the specified delay.
     * @param callback - The callback to execute.
     * @param ms - The delay in milliseconds.
     * @returns The timer ID, or INVALID_TIMER_ID if the pool is full.
     */
    export function setTimeout(callback: () => Promise<void> | void, ms: number): TimerID {
        const safeMs = ms < 0 ? 0 : ms;
        return _createTimer(callback, safeMs, 0);
    }

    /**
     * Schedules a repeated execution after the specified interval.
     * @param callback - The callback to execute.
     * @param ms - The interval in milliseconds.
     * @param immediate - If true, runs the callback immediately.
     * @returns The timer ID, or INVALID_TIMER_ID if the pool is full.
     */
    export function setInterval(callback: () => Promise<void> | void, ms: number, immediate: boolean = false): TimerID {
        const safeMs = ms < 0 ? 0 : ms;
        const expirationDelay = immediate ? 0 : safeMs;

        return _createTimer(callback, expirationDelay, safeMs);
    }

    /**
     * Cancels a timeout (or interval). Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clearTimeout(id: TimerID): void {
        clear(id);
    }

    /**
     * Cancels an interval (or timeout). Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clearInterval(id: TimerID): void {
        clear(id);
    }

    /**
     * Cancels a timeout or interval. Silently ignores invalid IDs.
     * @param id - The timer ID to cancel.
     */
    export function clear(id: TimerID): void {
        const index = _resolveIndex(id);

        if (index === INVALID_INDEX) return;

        _deleteTimer(index);
    }

    /**
     * @param id The timer ID to check.
     * @returns True if the timer is active, false otherwise.
     */
    export function isActive(id: TimerID): boolean {
        return _resolveIndex(id) !== INVALID_INDEX;
    }

    /**
     * @returns The number of active timers.
     */
    export function getActiveTimerCount(): number {
        return _activeTimerCount;
    }
}
