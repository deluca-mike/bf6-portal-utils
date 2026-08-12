import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Transitions } from '../transitions/index.ts';

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
     * Common base configuration shared across all animation drivers.
     */
    export interface AnimationConfig {
        /**
         * Starting numeric value.
         */
        from: number;
        /**
         * Optional start delay in milliseconds before the animation begins updating.
         * When omitted or 0, the animation starts immediately on the next tick.
         */
        delayMs?: number;
        /**
         * Optional minimum elapsed time in milliseconds between onUpdate invocations (throttling / update rate limit).
         * When omitted or 0, updates fire on every server tick.
         */
        minUpdateDeltaMs?: number;
        /**
         * Callback fired on every tick with the current/interpolated value.
         */
        onUpdate: (value: number) => Promise<void> | void;
        /**
         * Optional callback fired when the animation successfully reaches completion or settles.
         */
        onComplete?: () => Promise<void> | void;
    }

    /**
     * Configuration options for starting a standard tween animation.
     */
    export interface TweenAnimationConfig extends AnimationConfig {
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
         * Optional precision threshold. When specified (> 0), quantizes the interpolated value to multiples of
         * precision and deadbands/suppresses onUpdate invocations if the quantized value has not changed.
         */
        precision?: number;
    }

    /**
     * Configuration options for starting a physics-driven spring animation.
     */
    export interface SpringAnimationConfig extends AnimationConfig {
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
    }

    /**
     * Configuration options for starting a friction-based decay/inertia animation.
     */
    export interface DecayAnimationConfig extends AnimationConfig {
        /**
         * Initial velocity (e.g. units per second).
         */
        velocity: number;
        /**
         * Deceleration friction coefficient between 0.0 and 1.0 (default: 0.997 per millisecond).
         * Values closer to 1.0 glide longer; values closer to 0.0 stop sooner.
         */
        deceleration?: number;
        /**
         * Precision threshold to determine when velocity has settled (default: 0.01).
         */
        precision?: number;
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
    const END_OF_FREE_LIST = MAX_ANIMATIONS;

    const FLAG_IN_USE = 1 << 0;
    const FLAG_RUNNING = 1 << 1;
    const FLAG_PAUSED = 1 << 2;
    const FLAG_COMPLETE = 1 << 3;

    const DRIVER_MASK = 0x30;
    const DRIVER_TWEEN = 0 << 4;
    const DRIVER_SPRING = 1 << 4;
    const DRIVER_DECAY = 2 << 4;

    // Dual-duty slot state and intrusive free-list:
    // - Free slots (>= 0): Index of next free slot (0..1023) or END_OF_FREE_LIST (1024).
    // - In-use slots (< 0): Encoded bitflags & driver type (-flags).
    const _stateOrNextFree = new Int16Array(MAX_ANIMATIONS);
    const _generations = new Uint16Array(MAX_ANIMATIONS);

    for (let i = 0; i < MAX_ANIMATIONS - 1; ++i) {
        _stateOrNextFree[i] = i + 1;
    }
    _stateOrNextFree[MAX_ANIMATIONS - 1] = END_OF_FREE_LIST;

    let _firstFree = 0;
    let _activeCount = 0;

    // Bit flag & state helper functions
    function _isInUse(slot: number): boolean {
        return _stateOrNextFree[slot] < 0;
    }

    function _isRunning(slot: number): boolean {
        const state = _stateOrNextFree[slot];
        return state < 0 && (-state & FLAG_RUNNING) !== 0;
    }

    function _isPaused(slot: number): boolean {
        const state = _stateOrNextFree[slot];
        return state < 0 && (-state & FLAG_PAUSED) !== 0;
    }

    function _getDriver(slot: number): number {
        return -_stateOrNextFree[slot] & DRIVER_MASK;
    }

    function _setFlag(slot: number, flag: number): void {
        const flags = -_stateOrNextFree[slot];
        _stateOrNextFree[slot] = -(flags | flag);
    }

    function _clearFlag(slot: number, flag: number): void {
        const flags = -_stateOrNextFree[slot];
        _stateOrNextFree[slot] = -(flags & ~flag);
    }

    // Structure of Arrays (Numeric values in Float32Array for memory efficiency and cache locality)
    const _from = new Float32Array(MAX_ANIMATIONS);
    const _to = new Float32Array(MAX_ANIMATIONS);
    const _currentValue = new Float32Array(MAX_ANIMATIONS);
    const _velocityOrDurationMs = new Float32Array(MAX_ANIMATIONS);

    const _stiffnessOrDeceleration = new Float32Array(MAX_ANIMATIONS);
    const _damping = new Float32Array(MAX_ANIMATIONS);
    const _precision = new Float32Array(MAX_ANIMATIONS);

    // Structure of Arrays (Time values in Uint32Array / Uint16Array based on server uptime milliseconds)
    const _delayMs = new Uint32Array(MAX_ANIMATIONS);
    const _accumulatedMs = new Uint32Array(MAX_ANIMATIONS);
    const _lastResumeTime = new Uint32Array(MAX_ANIMATIONS);
    const _minUpdateDeltaMs = new Uint16Array(MAX_ANIMATIONS);
    const _lastUpdateTime = new Uint32Array(MAX_ANIMATIONS);

    // Structure of Arrays (Function references, cleared to null on slot release)
    const _onUpdate = new Array<((val: number) => Promise<void> | void) | null>(MAX_ANIMATIONS);
    const _onComplete = new Array<(() => Promise<void> | void) | null>(MAX_ANIMATIONS);
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
    const _decayScratch: Transitions.DecayResult = { value: 0, velocity: 0 };

    /****** Internal Helper Functions ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        const next = _stateOrNextFree[slot];
        _firstFree = next === END_OF_FREE_LIST ? INVALID_INDEX : next;

        ++_activeCount;

        return slot;
    }

    function _resolveSlot(id: AnimationID): number {
        if (id < 0) return INVALID_INDEX;

        const slot = id % GENERATION_MULTIPLIER;

        if (slot >= MAX_ANIMATIONS) return INVALID_INDEX;

        const expectedGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[slot] !== expectedGen || !_isInUse(slot)) return INVALID_INDEX;

        return slot;
    }

    function _addToRunning(slot: number): void {
        if (_slotToRunningPos[slot] !== INVALID_INDEX) return;

        if (_runningIndicesCount === 0) {
            _lastTickTimestamp = getUptime();
        }

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

        _delayMs[slot] = 0;
        _minUpdateDeltaMs[slot] = 0;
        _lastUpdateTime[slot] = 0;
        _onUpdate[slot] = null;
        _onComplete[slot] = null;
        _easing[slot] = null;

        --_activeCount;

        if (_generations[slot] < MAX_GENERATIONS) {
            ++_generations[slot];
            _stateOrNextFree[slot] = _firstFree === INVALID_INDEX ? END_OF_FREE_LIST : _firstFree;
            _firstFree = slot;
        } else {
            _stateOrNextFree[slot] = END_OF_FREE_LIST;
            logging.log(`Animation slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    function _tickTween(slot: number, dtSec: number, now: number): void {
        const totalElapsed = _accumulatedMs[slot] + (now - _lastResumeTime[slot]);
        const delay = _delayMs[slot];

        if (totalElapsed < delay) return;

        const elapsed = totalElapsed - delay;
        const duration = _velocityOrDurationMs[slot];
        const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;

        const easingFn = _easing[slot];
        const easedProgress = easingFn ? easingFn(progress) : progress;
        let value = Transitions.lerp(_from[slot], _to[slot], easedProgress);

        const precision = _precision[slot];

        if (precision > 0) {
            value = Math.round(value / precision) * precision;
        }

        const isComplete = progress >= 1;

        if (isComplete) {
            value = _to[slot];
        }

        const minDelta = _minUpdateDeltaMs[slot];
        const lastUpdate = _lastUpdateTime[slot];
        const hasValueChanged = precision === 0 || value !== _currentValue[slot];
        const timeElapsed = minDelta === 0 || lastUpdate === 0 || now - lastUpdate >= minDelta;

        if ((timeElapsed && hasValueChanged) || isComplete) {
            _lastUpdateTime[slot] = now;
            _currentValue[slot] = value;
            const updateCb = _onUpdate[slot];
            CallbackHandler.invoke(updateCb, value, undefined, undefined, undefined, logging, 'onUpdate');
        }

        if (!isComplete) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_COMPLETE);
        const completeCb = _onComplete[slot];
        _freeSlot(slot);

        CallbackHandler.invokeNoArgs(completeCb, logging, 'onComplete');
    }

    function _tickSpring(slot: number, dtSec: number, now: number): void {
        const totalElapsed = _accumulatedMs[slot] + (now - _lastResumeTime[slot]);
        const delay = _delayMs[slot];

        if (totalElapsed < delay) return;

        const target = _to[slot];
        const precision = _precision[slot];

        Transitions.calculateSpring(
            _currentValue[slot],
            target,
            _velocityOrDurationMs[slot],
            dtSec,
            _stiffnessOrDeceleration[slot],
            _damping[slot],
            _springScratch
        );

        _currentValue[slot] = _springScratch.value;
        _velocityOrDurationMs[slot] = _springScratch.velocity;

        const isSettled =
            Math.abs(_springScratch.value - target) <= precision && Math.abs(_springScratch.velocity) <= precision;

        if (isSettled) {
            _currentValue[slot] = target;
            _velocityOrDurationMs[slot] = 0;
        }

        const minDelta = _minUpdateDeltaMs[slot];
        const lastUpdate = _lastUpdateTime[slot];

        if (minDelta === 0 || lastUpdate === 0 || now - lastUpdate >= minDelta || isSettled) {
            _lastUpdateTime[slot] = now;
            const updateCb = _onUpdate[slot];
            CallbackHandler.invoke(updateCb, _currentValue[slot], undefined, undefined, undefined, logging, 'onUpdate');
        }

        if (!isSettled) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_COMPLETE);
        const completeCb = _onComplete[slot];
        _freeSlot(slot);

        CallbackHandler.invokeNoArgs(completeCb, logging, 'onComplete');
    }

    function _tickDecay(slot: number, dtSec: number, now: number): void {
        const totalElapsed = _accumulatedMs[slot] + (now - _lastResumeTime[slot]);
        const delay = _delayMs[slot];

        if (totalElapsed < delay) return;

        Transitions.calculateDecay(
            _currentValue[slot],
            _velocityOrDurationMs[slot],
            dtSec,
            _stiffnessOrDeceleration[slot],
            _decayScratch
        );

        _currentValue[slot] = _decayScratch.value;
        _velocityOrDurationMs[slot] = _decayScratch.velocity;

        const isSettled = Math.abs(_decayScratch.velocity) <= _precision[slot];

        if (isSettled) {
            _velocityOrDurationMs[slot] = 0;
        }

        const minDelta = _minUpdateDeltaMs[slot];
        const lastUpdate = _lastUpdateTime[slot];

        if (minDelta === 0 || lastUpdate === 0 || now - lastUpdate >= minDelta || isSettled) {
            _lastUpdateTime[slot] = now;
            const updateCb = _onUpdate[slot];
            CallbackHandler.invoke(updateCb, _currentValue[slot], undefined, undefined, undefined, logging, 'onUpdate');
        }

        if (!isSettled) return;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_COMPLETE);
        const completeCb = _onComplete[slot];
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

            if (!_isInUse(slot) || !_isRunning(slot)) continue;

            const driver = _getDriver(slot);

            if (driver === DRIVER_TWEEN) {
                _tickTween(slot, dtSec, now);
            } else if (driver === DRIVER_SPRING) {
                _tickSpring(slot, dtSec, now);
            } else if (driver === DRIVER_DECAY) {
                _tickDecay(slot, dtSec, now);
            }
        }
    }

    // Subscribed to OnTickEnd at priority -90 to evaluate tweens, springs, and momentum decay after Solid (-95)
    // and before Spatial (-80) and UI.flush (100), ensuring animated values are applied and rendered in the same tick.
    Events.OnTickEnd.subscribe(_tick, -90);

    /****** Public Engine API ******/

    /**
     * Starts a new tween animation from config.
     * @param config - Animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    export function startTween(config: TweenAnimationConfig): AnimationID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _stateOrNextFree[slot] = -(FLAG_IN_USE | FLAG_RUNNING | DRIVER_TWEEN);
        _from[slot] = config.from;
        _to[slot] = config.to;
        _currentValue[slot] = config.from;
        _velocityOrDurationMs[slot] = Math.max(0, config.duration);
        _stiffnessOrDeceleration[slot] = 0;
        _damping[slot] = 0;
        _precision[slot] = Math.max(0, config.precision ?? 0);
        _delayMs[slot] = Math.max(0, config.delayMs ?? 0);
        _accumulatedMs[slot] = 0;
        _lastResumeTime[slot] = getUptime();
        _minUpdateDeltaMs[slot] = Math.max(0, config.minUpdateDeltaMs ?? 0);
        _lastUpdateTime[slot] = 0;

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

        _stateOrNextFree[slot] = -(FLAG_IN_USE | FLAG_RUNNING | DRIVER_SPRING);
        _from[slot] = config.from;
        _to[slot] = config.to;
        _currentValue[slot] = config.from;
        _velocityOrDurationMs[slot] = config.velocity ?? 0;
        _stiffnessOrDeceleration[slot] = config.stiffness ?? 170;
        _damping[slot] = config.damping ?? 26;
        _precision[slot] = config.precision ?? 0.001;
        _delayMs[slot] = Math.max(0, config.delayMs ?? 0);
        _accumulatedMs[slot] = 0;
        _lastResumeTime[slot] = getUptime();
        _minUpdateDeltaMs[slot] = Math.max(0, config.minUpdateDeltaMs ?? 0);
        _lastUpdateTime[slot] = 0;

        _easing[slot] = null;
        _onUpdate[slot] = config.onUpdate;
        _onComplete[slot] = config.onComplete ?? null;

        const id = (slot + GENERATION_MULTIPLIER * _generations[slot]) as AnimationID;
        _addToRunning(slot);

        return id;
    }

    /**
     * Starts a new friction-based decay/inertia animation from config.
     * @param config - Decay animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    export function startDecay(config: DecayAnimationConfig): AnimationID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        _stateOrNextFree[slot] = -(FLAG_IN_USE | FLAG_RUNNING | DRIVER_DECAY);
        _from[slot] = config.from;
        _to[slot] = 0;
        _currentValue[slot] = config.from;
        _velocityOrDurationMs[slot] = config.velocity;
        _stiffnessOrDeceleration[slot] = config.deceleration ?? 0.997;
        _damping[slot] = 0;
        _precision[slot] = config.precision ?? 0.01;
        _delayMs[slot] = Math.max(0, config.delayMs ?? 0);
        _accumulatedMs[slot] = 0;
        _lastResumeTime[slot] = getUptime();
        _minUpdateDeltaMs[slot] = Math.max(0, config.minUpdateDeltaMs ?? 0);
        _lastUpdateTime[slot] = 0;

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

        if (!_isRunning(slot)) return;

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

        if (!_isPaused(slot)) return;

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

        return _isPaused(slot);
    }

    /**
     * Checks if an animation is currently active and running.
     * @param id - The ID of the animation.
     * @returns True if running, false if paused, or undefined if the animation does not exist.
     */
    export function isRunning(id: AnimationID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isRunning(slot);
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
