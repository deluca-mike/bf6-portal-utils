import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Transitions } from '../transitions/transitions.ts';

// version: 1.0.0
export namespace Animations {
    /****** Logging ******/

    const logging = new Logging('Animations');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`.
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

    /****** Types & Interfaces ******/

    /**
     * Unique generation-encoded identifier for an animation.
     */
    export type AnimationID = number & { readonly __brand: 'AnimationID' };

    /**
     * Configuration options for starting a standard tween animation.
     */
    export interface AnimationConfig {
        /**
         * Starting numeric value.
         */
        from: number;
        /**
         * Target ending numeric value.
         */
        to: number;
        /**
         * Total duration of the animation in milliseconds.
         */
        duration: number;
        /**
         * Optional easing function mapping normalized progress t (0.0 to 1.0) to eased progress.
         */
        easing?: (t: number) => number;
        /**
         * Callback fired on every tick with the interpolated value.
         */
        onUpdate: (value: number) => void;
        /**
         * Optional callback fired when the animation successfully reaches completion.
         */
        onComplete?: () => void;
    }

    /**
     * Configuration options for starting a physics-driven spring animation.
     */
    export interface SpringAnimationConfig {
        /**
         * Starting numeric value.
         */
        from: number;
        /**
         * Target ending numeric value.
         */
        to: number;
        /**
         * Initial velocity (default: 0).
         */
        velocity?: number;
        /**
         * Spring stiffness coefficient (higher = faster oscillation / stiffer spring, default: 170).
         */
        stiffness?: number;
        /**
         * Damping coefficient (higher = more resistance / less oscillation, default: 26).
         */
        damping?: number;
        /**
         * Precision threshold to determine when the spring has settled at the target (default: 0.001).
         */
        precision?: number;
        /**
         * Callback fired on every tick with the current spring position value.
         */
        onUpdate: (value: number) => void;
        /**
         * Optional callback fired when the spring settles at the target value.
         */
        onComplete?: () => void;
    }

    /****** Constants & SoA Memory Storage ******/

    const SERVER_START_TIME = Date.now();

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    /**
     * Maximum number of concurrent animations supported by the engine pool.
     */
    export const MAX_ANIMATIONS = 1024;

    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 10_000;
    const INVALID_INDEX = -1;

    const FLAG_IN_USE = 1 << 0;
    const FLAG_RUNNING = 1 << 1;
    const FLAG_PAUSED = 1 << 2;
    const FLAG_COMPLETE = 1 << 3;
    const FLAG_SPRING = 1 << 4;

    // Slot state and intrusive free-list
    const _flags = new Uint8Array(MAX_ANIMATIONS);
    const _generations = new Uint16Array(MAX_ANIMATIONS);
    const _nextFree = new Int16Array(MAX_ANIMATIONS);

    for (let i = 0; i < MAX_ANIMATIONS - 1; ++i) {
        _nextFree[i] = i + 1;
    }
    _nextFree[MAX_ANIMATIONS - 1] = INVALID_INDEX;

    let _firstFree = 0;
    let _activeCount = 0;

    // Bit flag helper functions
    function _isInUse(flags: number): boolean {
        return (flags & FLAG_IN_USE) !== 0;
    }

    function _isRunning(flags: number): boolean {
        return (flags & FLAG_RUNNING) !== 0;
    }

    function _isPaused(flags: number): boolean {
        return (flags & FLAG_PAUSED) !== 0;
    }

    function _isSpring(flags: number): boolean {
        return (flags & FLAG_SPRING) !== 0;
    }

    function _setFlag(slot: number, flag: number): void {
        _flags[slot] |= flag;
    }

    function _clearFlag(slot: number, flag: number): void {
        _flags[slot] &= ~flag;
    }

    // Structure of Arrays (Numeric values in Float32Array for memory efficiency and cache locality)
    const _from = new Float32Array(MAX_ANIMATIONS);
    const _to = new Float32Array(MAX_ANIMATIONS);
    const _currentValue = new Float32Array(MAX_ANIMATIONS);
    const _velocity = new Float32Array(MAX_ANIMATIONS);

    const _stiffness = new Float32Array(MAX_ANIMATIONS);
    const _damping = new Float32Array(MAX_ANIMATIONS);
    const _precision = new Float32Array(MAX_ANIMATIONS);

    // Structure of Arrays (Time values in Uint32Array based on server uptime milliseconds)
    const _durationMs = new Uint32Array(MAX_ANIMATIONS);
    const _accumulatedMs = new Uint32Array(MAX_ANIMATIONS);
    const _lastResumeTime = new Uint32Array(MAX_ANIMATIONS);

    // Structure of Arrays (Function references, cleared to null on slot release)
    const _onUpdate = new Array<((val: number) => void) | null>(MAX_ANIMATIONS);
    const _onComplete = new Array<(() => void) | null>(MAX_ANIMATIONS);
    const _easing = new Array<((t: number) => number) | null>(MAX_ANIMATIONS);

    for (let i = 0; i < MAX_ANIMATIONS; ++i) {
        _onUpdate[i] = null;
        _onComplete[i] = null;
        _easing[i] = null;
    }

    // Dense array of running slot indices for O(1) removals and zero-skipping fast iteration
    const _runningIndices = new Uint16Array(MAX_ANIMATIONS);
    const _slotToRunningPos = new Int16Array(MAX_ANIMATIONS);

    for (let i = 0; i < MAX_ANIMATIONS; ++i) {
        _slotToRunningPos[i] = INVALID_INDEX;
    }

    let _runningIndicesCount = 0;
    let _lastTickTimestamp = getUptime();
    const _springScratch: Transitions.SpringResult = { value: 0, velocity: 0 };

    /****** Internal Helper Functions ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Animation pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        _firstFree = _nextFree[slot];
        _nextFree[slot] = INVALID_INDEX;

        ++_activeCount;

        return slot;
    }

    function _resolveSlot(id: AnimationID): number {
        if (id < 0) return INVALID_INDEX;

        const slot = id % GENERATION_MULTIPLIER;

        if (slot >= MAX_ANIMATIONS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[slot] !== expectedGen || !_isInUse(_flags[slot])) return INVALID_INDEX;

        return slot;
    }

    function _addToRunning(slot: number): void {
        if (_slotToRunningPos[slot] !== INVALID_INDEX) return;

        const pos = _runningIndicesCount;
        _runningIndices[pos] = slot;
        _slotToRunningPos[slot] = pos;
        ++_runningIndicesCount;
    }

    function _removeFromRunning(slot: number): void {
        const pos = _slotToRunningPos[slot];

        if (pos === INVALID_INDEX) return;

        const lastPos = _runningIndicesCount - 1;

        if (pos < lastPos) {
            const lastSlot = _runningIndices[lastPos];
            _runningIndices[pos] = lastSlot;
            _slotToRunningPos[lastSlot] = pos;
        }

        _slotToRunningPos[slot] = INVALID_INDEX;
        --_runningIndicesCount;
    }

    function _freeSlot(slot: number): void {
        _removeFromRunning(slot);

        _flags[slot] = 0;
        _onUpdate[slot] = null;
        _onComplete[slot] = null;
        _easing[slot] = null;

        --_activeCount;

        if (_generations[slot] < MAX_GENERATIONS) {
            ++_generations[slot];
            _nextFree[slot] = _firstFree;
            _firstFree = slot;
        } else {
            logging.log(`Animation slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    function _tickSpring(slot: number, dtSec: number): void {
        const target = _to[slot];
        const precision = _precision[slot];

        Transitions.calculateSpring(
            _currentValue[slot],
            target,
            _velocity[slot],
            dtSec,
            _stiffness[slot],
            _damping[slot],
            _springScratch
        );

        _currentValue[slot] = _springScratch.value;
        _velocity[slot] = _springScratch.velocity;

        const isSettled =
            Math.abs(_springScratch.value - target) <= precision && Math.abs(_springScratch.velocity) <= precision;

        if (isSettled) {
            _currentValue[slot] = target;
            _velocity[slot] = 0;
        }

        const updateCb = _onUpdate[slot];
        const completeCb = _onComplete[slot];

        CallbackHandler.invoke(updateCb, _currentValue[slot], undefined, undefined, undefined, logging, 'onUpdate');

        if (!isSettled) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_COMPLETE);
        _freeSlot(slot);

        CallbackHandler.invokeNoArgs(completeCb, logging, 'onComplete');
    }

    function _tickTween(slot: number, now: number): void {
        const duration = _durationMs[slot];
        const elapsed = _accumulatedMs[slot] + (now - _lastResumeTime[slot]);
        const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;

        const easingFn = _easing[slot];
        const easedProgress = easingFn ? easingFn(progress) : progress;
        const value = Transitions.lerp(_from[slot], _to[slot], easedProgress);

        _currentValue[slot] = value;

        const updateCb = _onUpdate[slot];
        const completeCb = _onComplete[slot];

        CallbackHandler.invoke(updateCb, value, undefined, undefined, undefined, logging, 'onUpdate');

        if (progress < 1) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_COMPLETE);
        _freeSlot(slot);

        CallbackHandler.invokeNoArgs(completeCb, logging, 'onComplete');
    }

    function _tick(): void {
        const now = getUptime();
        const dtMs = _lastTickTimestamp > 0 ? now - _lastTickTimestamp : 16.67;
        _lastTickTimestamp = now;

        if (_runningIndicesCount === 0) return;

        const dtSec = Math.max(0.0001, dtMs / 1000);

        // Iterate backwards through dense running indices for zero-allocation swap-and-pop safety
        for (let i = _runningIndicesCount - 1; i >= 0; --i) {
            const slot = _runningIndices[i];
            const flags = _flags[slot];

            if (!_isInUse(flags) || !_isRunning(flags)) continue;

            if (_isSpring(flags)) {
                _tickSpring(slot, dtSec);
            } else {
                _tickTween(slot, now);
            }
        }
    }

    Events.OngoingGlobal.subscribe(_tick);

    /****** Public Engine API ******/

    /**
     * Starts a new tween animation from config.
     * @param config - Animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    export function start(config: AnimationConfig): AnimationID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _flags[slot] = FLAG_IN_USE | FLAG_RUNNING;
        _from[slot] = config.from;
        _to[slot] = config.to;
        _currentValue[slot] = config.from;
        _velocity[slot] = 0;
        _durationMs[slot] = Math.max(0, config.duration);
        _accumulatedMs[slot] = 0;
        _lastResumeTime[slot] = getUptime();

        _easing[slot] = config.easing ?? null;
        _onUpdate[slot] = config.onUpdate;
        _onComplete[slot] = config.onComplete ?? null;

        const id = (slot + GENERATION_MULTIPLIER * _generations[slot]) as AnimationID;
        _addToRunning(slot);

        return id;
    }

    /**
     * Starts a new spring physics animation from config.
     * @param config - Spring animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    export function startSpring(config: SpringAnimationConfig): AnimationID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _flags[slot] = FLAG_IN_USE | FLAG_RUNNING | FLAG_SPRING;
        _from[slot] = config.from;
        _to[slot] = config.to;
        _currentValue[slot] = config.from;
        _velocity[slot] = config.velocity ?? 0;
        _stiffness[slot] = config.stiffness ?? 170;
        _damping[slot] = config.damping ?? 26;
        _precision[slot] = config.precision ?? 0.001;
        _accumulatedMs[slot] = 0;
        _lastResumeTime[slot] = getUptime();

        _easing[slot] = null;
        _onUpdate[slot] = config.onUpdate;
        _onComplete[slot] = config.onComplete ?? null;

        const id = (slot + GENERATION_MULTIPLIER * _generations[slot]) as AnimationID;
        _addToRunning(slot);

        return id;
    }

    /**
     * Stops an animation immediately and frees resources.
     * @param id - The ID of the animation to stop.
     */
    export function stop(id: AnimationID): void {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return;

        _freeSlot(slot);
    }

    /**
     * Pauses a running animation, freezing its current progress.
     * @param id - The ID of the animation to pause.
     */
    export function pause(id: AnimationID): void {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return;

        const flags = _flags[slot];

        if (!_isRunning(flags)) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_PAUSED);

        _accumulatedMs[slot] += getUptime() - _lastResumeTime[slot];
        _removeFromRunning(slot);
    }

    /**
     * Resumes a paused animation.
     * @param id - The ID of the animation to resume.
     */
    export function resume(id: AnimationID): void {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return;

        const flags = _flags[slot];

        if (!_isPaused(flags)) return;

        _clearFlag(slot, FLAG_PAUSED);
        _setFlag(slot, FLAG_RUNNING);

        _lastResumeTime[slot] = getUptime();
        _addToRunning(slot);
    }

    /**
     * Checks if an animation is currently active (allocated in the pool).
     * @param id - The ID of the animation.
     * @returns True if active, false otherwise.
     */
    export function isActive(id: AnimationID): boolean {
        return _resolveSlot(id) !== INVALID_INDEX;
    }

    /**
     * Checks if an animation is currently paused.
     * @param id - The ID of the animation.
     * @returns True if paused, false if running, or undefined if the animation does not exist.
     */
    export function isPaused(id: AnimationID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isPaused(_flags[slot]);
    }

    /**
     * Checks if an animation is currently active and running.
     * @param id - The ID of the animation.
     * @returns True if running, false if paused, or undefined if the animation does not exist.
     */
    export function isRunning(id: AnimationID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isRunning(_flags[slot]);
    }

    /**
     * Returns the number of currently allocated animations in the pool.
     * @returns Active animation count.
     */
    export function getActiveCount(): number {
        return _activeCount;
    }

    /**
     * Returns the number of currently running animations actively ticking.
     * @returns Running animation count.
     */
    export function getRunningCount(): number {
        return _runningIndicesCount;
    }
}
