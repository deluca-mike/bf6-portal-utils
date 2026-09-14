import { Animations } from '../animations/animations.ts';
import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 1.0.0
export namespace Timelines {
    /****** Logging ******/

    const logging = new Logging('Timelines');

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
     * Unique generation-encoded identifier for a timeline.
     */
    export type TimelineID = number & { readonly __brand: 'TimelineID' };

    /**
     * Configuration options for creating a timeline.
     */
    export interface TimelineConfig {
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
    export interface BaseAnimationStepConfig {
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
    export interface TweenStepConfig extends BaseAnimationStepConfig {
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
    export interface SpringStepConfig extends BaseAnimationStepConfig {
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
    export interface DecayStepConfig extends BaseAnimationStepConfig {
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
    export type ParallelChildConfig =
        | ({ type: 'tween' } & TweenStepConfig)
        | ({ type: 'spring' } & SpringStepConfig)
        | ({ type: 'decay' } & DecayStepConfig);

    /**
     * Internal discriminated union for timeline steps.
     */
    export type TimelineStep =
        | { readonly type: 'tween'; readonly config: TweenStepConfig }
        | { readonly type: 'spring'; readonly config: SpringStepConfig }
        | { readonly type: 'decay'; readonly config: DecayStepConfig }
        | { readonly type: 'parallel'; readonly children: readonly ParallelChildConfig[] }
        | { readonly type: 'wait'; readonly durationMs: number }
        | { readonly type: 'call'; readonly callback: () => void | Promise<void> };

    /****** Constants & SoA Storage ******/

    const SERVER_START_TIME = Date.now();

    function getUptime(): number {
        return Date.now() - SERVER_START_TIME;
    }

    /**
     * Maximum number of concurrent timelines supported by the engine pool.
     */
    export const MAX_TIMELINES = 256;

    /**
     * Maximum number of sequential steps allowed per timeline.
     */
    export const MAX_STEPS_PER_TIMELINE = 32;

    const MAX_GENERATIONS = 65_535;
    const GENERATION_MULTIPLIER = 10_000;
    const INVALID_INDEX = -1;

    const FLAG_IN_USE = 1 << 0;
    const FLAG_RUNNING = 1 << 1;
    const FLAG_PAUSED = 1 << 2;
    const FLAG_COMPLETE = 1 << 3;
    const FLAG_WAITING = 1 << 4;
    const FLAG_LOOP_INFINITE = 1 << 5;
    const FLAG_STEP_ANIMATING = 1 << 6;
    const FLAG_YOYO = 1 << 7;
    const FLAG_REVERSED = 1 << 8;

    // Slot state and generation tracking
    const _flags = new Uint16Array(MAX_TIMELINES);
    const _generations = new Uint16Array(MAX_TIMELINES);

    /**
     * Dual-duty array:
     * - When free (`!_isInUse(_flags[i])`): Stores the index of the next free slot on the intrusive free list (`_firstFree`).
     * - When in use (`_isInUse(_flags[i])`): Stores the currently active step index (0, 1, 2, ...).
     */
    const _currentStep = new Int16Array(MAX_TIMELINES);

    for (let i = 0; i < MAX_TIMELINES - 1; ++i) {
        _currentStep[i] = i + 1;
    }
    _currentStep[MAX_TIMELINES - 1] = INVALID_INDEX;

    let _firstFree = 0;
    let _activeCount = 0;

    // Structure of Arrays (Loop tracking)
    const _targetLoops = new Uint16Array(MAX_TIMELINES);
    const _completedLoops = new Uint16Array(MAX_TIMELINES);

    // Structure of Arrays (Timing)
    const _stepStartUptime = new Uint32Array(MAX_TIMELINES);
    const _stepElapsedMs = new Uint32Array(MAX_TIMELINES);
    const _stepWaitMs = new Uint32Array(MAX_TIMELINES);
    const _minUpdateDeltaMs = new Uint16Array(MAX_TIMELINES);

    // Structure of Arrays (Step queues & active child animations)
    const _steps = new Array<TimelineStep[]>(MAX_TIMELINES);
    const _activeAnimIds = new Array<Animations.AnimationID[] | null>(MAX_TIMELINES);

    // Structure of Arrays (Callbacks & async promise resolvers)
    const _onComplete = new Array<(() => Promise<void> | void) | null>(MAX_TIMELINES);
    const _onLoop = new Array<((completedLoops: number) => Promise<void> | void) | null>(MAX_TIMELINES);
    const _onStep = new Array<((stepIndex: number) => Promise<void> | void) | null>(MAX_TIMELINES);
    const _asyncResolvers = new Array<(() => void) | null>(MAX_TIMELINES);

    for (let i = 0; i < MAX_TIMELINES; ++i) {
        _steps[i] = [];
        _activeAnimIds[i] = null;
        _onComplete[i] = null;
        _onLoop[i] = null;
        _onStep[i] = null;
        _asyncResolvers[i] = null;
    }

    // Dense running array for O(1) swap-and-pop iteration
    const _runningIndices = new Uint16Array(MAX_TIMELINES);
    const _slotToRunningPos = new Int16Array(MAX_TIMELINES);

    for (let i = 0; i < MAX_TIMELINES; ++i) {
        _slotToRunningPos[i] = INVALID_INDEX;
    }

    let _runningIndicesCount = 0;

    /****** Bit Flag Helpers ******/

    function _isInUse(flags: number): boolean {
        return (flags & FLAG_IN_USE) !== 0;
    }

    function _isRunning(flags: number): boolean {
        return (flags & FLAG_RUNNING) !== 0;
    }

    function _isPaused(flags: number): boolean {
        return (flags & FLAG_PAUSED) !== 0;
    }

    function _isComplete(flags: number): boolean {
        return (flags & FLAG_COMPLETE) !== 0;
    }

    function _isWaiting(flags: number): boolean {
        return (flags & FLAG_WAITING) !== 0;
    }

    function _isInfinite(flags: number): boolean {
        return (flags & FLAG_LOOP_INFINITE) !== 0;
    }

    function _isYoyo(flags: number): boolean {
        return (flags & FLAG_YOYO) !== 0;
    }

    function _isReversed(flags: number): boolean {
        return (flags & FLAG_REVERSED) !== 0;
    }

    function _setFlag(slot: number, flag: number): void {
        _flags[slot] |= flag;
    }

    function _clearFlag(slot: number, flag: number): void {
        _flags[slot] &= ~flag;
    }

    /****** Internal Pool & Slot Management ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Timeline pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        _firstFree = _currentStep[slot];
        _currentStep[slot] = 0;
        ++_activeCount;

        return slot;
    }

    function _resolveSlot(id: TimelineID): number {
        if (id < 0) return INVALID_INDEX;

        const slot = id % GENERATION_MULTIPLIER;

        if (slot >= MAX_TIMELINES) return INVALID_INDEX;

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

    function _stopActiveChildAnimations(slot: number): void {
        const animIds = _activeAnimIds[slot];

        if (!animIds) return;

        for (let i = 0; i < animIds.length; ++i) {
            Animations.stop(animIds[i]);
        }

        _activeAnimIds[slot] = null;
    }

    function _freeSlot(slot: number): void {
        _removeFromRunning(slot);
        _stopActiveChildAnimations(slot);

        _flags[slot] = 0;
        _minUpdateDeltaMs[slot] = 0;
        _steps[slot].length = 0;
        _activeAnimIds[slot] = null;
        _onComplete[slot] = null;
        _onLoop[slot] = null;
        _onStep[slot] = null;

        const resolver = _asyncResolvers[slot];

        if (resolver) {
            _asyncResolvers[slot] = null;
            resolver();
        }

        --_activeCount;

        if (_generations[slot] < MAX_GENERATIONS) {
            ++_generations[slot];
            _currentStep[slot] = _firstFree;
            _firstFree = slot;
        } else {
            logging.log(`Timeline slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    /****** Step Execution Engine ******/

    function _onChildAnimComplete(slot: number, animId: Animations.AnimationID): void {
        if (!_isInUse(_flags[slot]) || !_isRunning(_flags[slot])) return;

        const animIds = _activeAnimIds[slot];

        if (!animIds) return;

        const idx = animIds.indexOf(animId);

        if (idx !== -1) {
            animIds.splice(idx, 1);
        }

        // If all parallel child animations in this step completed, advance
        if (animIds.length === 0) {
            _activeAnimIds[slot] = null;
            _clearFlag(slot, FLAG_STEP_ANIMATING);
            _advanceStep(slot, getUptime());
        }
    }

    function _resolveStepThrottle(slot: number, stepDelta?: number): number | undefined {
        return stepDelta ?? (_minUpdateDeltaMs[slot] > 0 ? _minUpdateDeltaMs[slot] : undefined);
    }

    function _executeWaitStep(slot: number, durationMs: number, now: number): void {
        _setFlag(slot, FLAG_WAITING);
        _stepWaitMs[slot] = Math.max(0, durationMs);

        if (durationMs <= 0) {
            _clearFlag(slot, FLAG_WAITING);
            _advanceStep(slot, now);
        }
    }

    function _executeCallStep(slot: number, callback: () => void | Promise<void>, now: number): void {
        CallbackHandler.invokeNoArgs(callback, logging, 'callStep');
        _advanceStep(slot, now);
    }

    function _executeTweenStep(slot: number, config: TweenStepConfig, now: number): void {
        _setFlag(slot, FLAG_STEP_ANIMATING);

        const isReversed = _isReversed(_flags[slot]);
        const from = isReversed ? (config.to ?? 1) : (config.from ?? 0);
        const to = isReversed ? (config.from ?? 0) : (config.to ?? 1);

        const animId = Animations.startTween({
            from,
            to,
            duration: config.duration,
            delayMs: config.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, config.minUpdateDeltaMs),
            easing: config.easing,
            precision: config.precision,
            onUpdate: config.onUpdate,
            onComplete: () => {
                config.onComplete?.();
                _onChildAnimComplete(slot, animId!);
            },
        });

        if (animId !== null) {
            _activeAnimIds[slot] = [animId];
        } else {
            _clearFlag(slot, FLAG_STEP_ANIMATING);
            _advanceStep(slot, now);
        }
    }

    function _executeSpringStep(slot: number, config: SpringStepConfig, now: number): void {
        _setFlag(slot, FLAG_STEP_ANIMATING);

        const isReversed = _isReversed(_flags[slot]);
        const from = isReversed ? (config.to ?? 1) : (config.from ?? 0);
        const to = isReversed ? (config.from ?? 0) : (config.to ?? 1);
        const velocity = isReversed ? -(config.velocity ?? 0) : config.velocity;

        const animId = Animations.startSpring({
            from,
            to,
            velocity,
            stiffness: config.stiffness,
            damping: config.damping,
            precision: config.precision,
            delayMs: config.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, config.minUpdateDeltaMs),
            onUpdate: config.onUpdate,
            onComplete: () => {
                config.onComplete?.();
                _onChildAnimComplete(slot, animId!);
            },
        });

        if (animId !== null) {
            _activeAnimIds[slot] = [animId];
        } else {
            _clearFlag(slot, FLAG_STEP_ANIMATING);
            _advanceStep(slot, now);
        }
    }

    function _executeDecayStep(slot: number, config: DecayStepConfig, now: number): void {
        _setFlag(slot, FLAG_STEP_ANIMATING);

        const isReversed = _isReversed(_flags[slot]);
        const from = config.from ?? 0;
        const velocity = isReversed ? -config.velocity : config.velocity;

        const animId = Animations.startDecay({
            from,
            velocity,
            deceleration: config.deceleration,
            precision: config.precision,
            delayMs: config.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, config.minUpdateDeltaMs),
            onUpdate: config.onUpdate,
            onComplete: () => {
                config.onComplete?.();
                _onChildAnimComplete(slot, animId!);
            },
        });

        if (animId !== null) {
            _activeAnimIds[slot] = [animId];
        } else {
            _clearFlag(slot, FLAG_STEP_ANIMATING);
            _advanceStep(slot, now);
        }
    }

    function _startParallelTweenChild(
        slot: number,
        child: { type: 'tween' } & TweenStepConfig
    ): Animations.AnimationID | null {
        const isReversed = _isReversed(_flags[slot]);
        const from = isReversed ? (child.to ?? 1) : (child.from ?? 0);
        const to = isReversed ? (child.from ?? 0) : (child.to ?? 1);

        const childAnimId = Animations.startTween({
            from,
            to,
            duration: child.duration,
            delayMs: child.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, child.minUpdateDeltaMs),
            easing: child.easing,
            precision: child.precision,
            onUpdate: child.onUpdate,
            onComplete: () => {
                child.onComplete?.();
                _onChildAnimComplete(slot, childAnimId!);
            },
        });

        return childAnimId;
    }

    function _startParallelSpringChild(
        slot: number,
        child: { type: 'spring' } & SpringStepConfig
    ): Animations.AnimationID | null {
        const isReversed = _isReversed(_flags[slot]);
        const from = isReversed ? (child.to ?? 1) : (child.from ?? 0);
        const to = isReversed ? (child.from ?? 0) : (child.to ?? 1);
        const velocity = isReversed ? -(child.velocity ?? 0) : child.velocity;

        const childAnimId = Animations.startSpring({
            from,
            to,
            velocity,
            stiffness: child.stiffness,
            damping: child.damping,
            precision: child.precision,
            delayMs: child.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, child.minUpdateDeltaMs),
            onUpdate: child.onUpdate,
            onComplete: () => {
                child.onComplete?.();
                _onChildAnimComplete(slot, childAnimId!);
            },
        });

        return childAnimId;
    }

    function _startParallelDecayChild(
        slot: number,
        child: { type: 'decay' } & DecayStepConfig
    ): Animations.AnimationID | null {
        const isReversed = _isReversed(_flags[slot]);
        const from = child.from ?? 0;
        const velocity = isReversed ? -child.velocity : child.velocity;

        const childAnimId = Animations.startDecay({
            from,
            velocity,
            deceleration: child.deceleration,
            precision: child.precision,
            delayMs: child.delayMs,
            minUpdateDeltaMs: _resolveStepThrottle(slot, child.minUpdateDeltaMs),
            onUpdate: child.onUpdate,
            onComplete: () => {
                child.onComplete?.();
                _onChildAnimComplete(slot, childAnimId!);
            },
        });

        return childAnimId;
    }

    function _executeParallelStep(slot: number, children: readonly ParallelChildConfig[], now: number): void {
        _setFlag(slot, FLAG_STEP_ANIMATING);

        if (children.length === 0) {
            _clearFlag(slot, FLAG_STEP_ANIMATING);
            _advanceStep(slot, now);
            return;
        }

        const animIds: Animations.AnimationID[] = [];
        _activeAnimIds[slot] = animIds;

        for (let i = 0; i < children.length; ++i) {
            const child = children[i];

            const childAnimId =
                child.type === 'tween'
                    ? _startParallelTweenChild(slot, child)
                    : child.type === 'spring'
                      ? _startParallelSpringChild(slot, child)
                      : _startParallelDecayChild(slot, child);

            if (childAnimId !== null) {
                animIds.push(childAnimId);
            }
        }

        if (animIds.length !== 0) return;

        _activeAnimIds[slot] = null;
        _clearFlag(slot, FLAG_STEP_ANIMATING);
        _advanceStep(slot, now);
    }

    function _handleTimelineIterationComplete(slot: number, now: number): void {
        const completed = _completedLoops[slot] + 1;
        _completedLoops[slot] = completed;

        const onLoopCb = _onLoop[slot];

        if (onLoopCb) {
            CallbackHandler.invoke(onLoopCb, completed, undefined, undefined, undefined, logging, 'onLoop');
        }

        if (_isInfinite(_flags[slot]) || completed < _targetLoops[slot]) {
            if (_isYoyo(_flags[slot])) {
                if (_isReversed(_flags[slot])) {
                    _clearFlag(slot, FLAG_REVERSED);
                    _currentStep[slot] = 0;
                } else {
                    _setFlag(slot, FLAG_REVERSED);
                    _currentStep[slot] = _steps[slot].length - 1;
                }
            } else {
                _currentStep[slot] = 0;
            }
            _startCurrentStep(slot, now);
            return;
        }

        // Full completion
        _clearFlag(slot, FLAG_RUNNING);
        _clearFlag(slot, FLAG_REVERSED);
        _setFlag(slot, FLAG_COMPLETE);

        const onCompleteCb = _onComplete[slot];
        _freeSlot(slot);

        if (onCompleteCb) {
            CallbackHandler.invokeNoArgs(onCompleteCb, logging, 'onComplete');
        }
    }

    function _startCurrentStep(slot: number, now: number): void {
        const stepList = _steps[slot];
        const stepIdx = _currentStep[slot];
        const isReversed = _isReversed(_flags[slot]);

        if (isReversed ? stepIdx < 0 : stepIdx >= stepList.length) {
            _handleTimelineIterationComplete(slot, now);
            return;
        }

        const step = stepList[stepIdx];
        const onStepCb = _onStep[slot];

        if (onStepCb) {
            CallbackHandler.invoke(onStepCb, stepIdx, undefined, undefined, undefined, logging, 'onStep');
        }

        _stepStartUptime[slot] = now;
        _stepElapsedMs[slot] = 0;

        switch (step.type) {
            case 'wait':
                _executeWaitStep(slot, step.durationMs, now);
                break;
            case 'call':
                _executeCallStep(slot, step.callback, now);
                break;
            case 'tween':
                _executeTweenStep(slot, step.config, now);
                break;
            case 'spring':
                _executeSpringStep(slot, step.config, now);
                break;
            case 'decay':
                _executeDecayStep(slot, step.config, now);
                break;
            case 'parallel':
                _executeParallelStep(slot, step.children, now);
                break;
        }
    }

    function _advanceStep(slot: number, now: number): void {
        if (!_isInUse(_flags[slot]) || !_isRunning(_flags[slot])) return;

        if (_isReversed(_flags[slot])) {
            --_currentStep[slot];
        } else {
            ++_currentStep[slot];
        }
        _startCurrentStep(slot, now);
    }

    function _tick(): void {
        if (_runningIndicesCount === 0) return;

        const now = getUptime();

        for (let i = _runningIndicesCount - 1; i >= 0; --i) {
            const slot = _runningIndices[i];
            const flags = _flags[slot];

            if (!_isInUse(flags) || !_isRunning(flags)) continue;

            if (!_isWaiting(flags)) continue;

            const elapsed = _stepElapsedMs[slot] + (now - _stepStartUptime[slot]);

            if (elapsed >= _stepWaitMs[slot]) {
                _clearFlag(slot, FLAG_WAITING);
                _advanceStep(slot, now);
            }
        }
    }

    Events.OngoingGlobal.subscribe(_tick);

    /****** Public Functional API ******/

    /**
     * Allocates a new timeline in the pool.
     * @param config - Optional loop and lifecycle event settings.
     * @returns The unboxed {@link TimelineID}, or null if the pool is full.
     */
    export function create(config?: TimelineConfig): TimelineID | null {
        const slot = _allocateSlot();

        if (slot === INVALID_INDEX) return null;

        let flags = FLAG_IN_USE;
        let targetLoops = 1;

        if (config?.loop === true) {
            flags |= FLAG_LOOP_INFINITE;
        } else if (typeof config?.loop === 'number' && config.loop > 0) {
            targetLoops = Math.floor(config.loop);
        }

        if (config?.yoyo === true) {
            flags |= FLAG_YOYO;
        }

        _flags[slot] = flags;
        _currentStep[slot] = 0;
        _targetLoops[slot] = targetLoops;
        _completedLoops[slot] = 0;
        _stepStartUptime[slot] = 0;
        _stepElapsedMs[slot] = 0;
        _stepWaitMs[slot] = 0;
        _minUpdateDeltaMs[slot] = Math.max(0, config?.minUpdateDeltaMs ?? 0);

        _onComplete[slot] = config?.onComplete ?? null;
        _onLoop[slot] = config?.onLoop ?? null;
        _onStep[slot] = config?.onStep ?? null;

        return (slot + GENERATION_MULTIPLIER * _generations[slot]) as TimelineID;
    }

    function _canAddStep(slot: number): boolean {
        if (_steps[slot].length >= MAX_STEPS_PER_TIMELINE) {
            logging.log(`Timeline step limit of ${MAX_STEPS_PER_TIMELINE} reached`, LogLevel.Warning);
            return false;
        }

        return true;
    }

    /**
     * Appends a tween step to a timeline.
     * @param id - The timeline ID.
     * @param config - Tween configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addTween(id: TimelineID, config: TweenStepConfig): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'tween', config });

        return true;
    }

    /**
     * Appends a spring physics step to a timeline.
     * @param id - The timeline ID.
     * @param config - Spring configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addSpring(id: TimelineID, config: SpringStepConfig): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'spring', config });

        return true;
    }

    /**
     * Appends a friction-based decay/inertia step to a timeline.
     * @param id - The timeline ID.
     * @param config - Decay configuration.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addDecay(id: TimelineID, config: DecayStepConfig): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'decay', config });

        return true;
    }

    /**
     * Appends a parallel multi-track step to a timeline.
     * @param id - The timeline ID.
     * @param children - Array of parallel child tween or spring configs.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addParallel(id: TimelineID, children: readonly ParallelChildConfig[]): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'parallel', children });

        return true;
    }

    /**
     * Appends a pause/wait delay step to a timeline.
     * @param id - The timeline ID.
     * @param durationMs - Delay in milliseconds.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addWait(id: TimelineID, durationMs: number): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'wait', durationMs: Math.max(0, durationMs) });

        return true;
    }

    /**
     * Appends an action callback step to a timeline.
     * @param id - The timeline ID.
     * @param callback - Function executed when the timeline reaches this step.
     * @returns True if added successfully, false if the timeline is invalid or step limit reached.
     */
    export function addCall(id: TimelineID, callback: () => void | Promise<void>): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX || !_canAddStep(slot)) return false;

        _steps[slot].push({ type: 'call', callback });

        return true;
    }

    /**
     * Starts or resumes playback of a timeline.
     * @param id - The timeline ID.
     * @returns True if started, false if invalid.
     */
    export function play(id: TimelineID): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return false;

        const flags = _flags[slot];

        if (_isRunning(flags)) return true;

        _clearFlag(slot, FLAG_PAUSED | FLAG_COMPLETE);
        _setFlag(slot, FLAG_RUNNING);

        const now = getUptime();
        _addToRunning(slot);

        if (!_isPaused(flags)) {
            // Start from current step
            _startCurrentStep(slot, now);
            return true;
        }

        // Resume paused child animations or wait
        if (_isWaiting(flags)) {
            _stepStartUptime[slot] = now;
        }

        const animIds = _activeAnimIds[slot];

        if (!animIds) return true;

        for (let i = 0; i < animIds.length; ++i) {
            Animations.resume(animIds[i]);
        }

        return true;
    }

    /**
     * Plays a timeline and returns a Promise that resolves when the timeline reaches completion.
     * @param id - The timeline ID.
     * @returns A Promise resolving upon completion.
     */
    export function playAsync(id: TimelineID): Promise<void> {
        return new Promise<void>((resolve) => {
            const slot = _resolveSlot(id);

            if (slot === INVALID_INDEX) {
                resolve();
                return;
            }

            _asyncResolvers[slot] = resolve;
            play(id);
        });
    }

    /**
     * Pauses playback of an active timeline.
     * @param id - The timeline ID.
     * @returns True if paused, false if invalid or not running.
     */
    export function pause(id: TimelineID): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return false;

        const flags = _flags[slot];

        if (!_isRunning(flags)) return false;

        _clearFlag(slot, FLAG_RUNNING);
        _setFlag(slot, FLAG_PAUSED);

        const now = getUptime();

        if (_isWaiting(flags)) {
            _stepElapsedMs[slot] += now - _stepStartUptime[slot];
        }

        const animIds = _activeAnimIds[slot];

        if (animIds) {
            for (let i = 0; i < animIds.length; ++i) {
                Animations.pause(animIds[i]);
            }
        }

        _removeFromRunning(slot);
        return true;
    }

    /**
     * Resumes a paused timeline.
     * @param id - The timeline ID.
     * @returns True if resumed, false if invalid or not paused.
     */
    export function resume(id: TimelineID): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return false;

        if (!_isPaused(_flags[slot])) return false;

        return play(id);
    }

    /**
     * Stops a timeline immediately and frees its slot and resources.
     * @param id - The timeline ID.
     */
    export function stop(id: TimelineID): void {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return;

        _freeSlot(slot);
    }

    /**
     * Stops all active timelines and clears the pool.
     */
    export function stopAll(): void {
        for (let slot = 0; slot < MAX_TIMELINES; ++slot) {
            if (_isInUse(_flags[slot])) {
                _freeSlot(slot);
            }
        }
    }

    /**
     * Restarts an active timeline from step 0.
     * @param id - The timeline ID.
     * @returns True if restarted, false if invalid.
     */
    export function restart(id: TimelineID): boolean {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return false;

        _stopActiveChildAnimations(slot);
        _clearFlag(slot, FLAG_PAUSED | FLAG_WAITING | FLAG_STEP_ANIMATING | FLAG_COMPLETE | FLAG_REVERSED);
        _currentStep[slot] = 0;
        _completedLoops[slot] = 0;
        _stepElapsedMs[slot] = 0;

        return play(id);
    }

    /**
     * Checks if a timeline is currently allocated in the pool.
     * @param id - The timeline ID.
     * @returns True if active, false otherwise.
     */
    export function isActive(id: TimelineID): boolean {
        return _resolveSlot(id) !== INVALID_INDEX;
    }

    /**
     * Checks if a timeline is currently running.
     * @param id - The timeline ID.
     * @returns True if running, false if paused/stopped, or undefined if invalid.
     */
    export function isRunning(id: TimelineID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isRunning(_flags[slot]);
    }

    /**
     * Checks if a timeline is currently paused.
     * @param id - The timeline ID.
     * @returns True if paused, false if running, or undefined if invalid.
     */
    export function isPaused(id: TimelineID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isPaused(_flags[slot]);
    }

    /**
     * Checks if a timeline has reached completion.
     * @param id - The timeline ID.
     * @returns True if complete, false otherwise, or undefined if invalid.
     */
    export function isComplete(id: TimelineID): boolean | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _isComplete(_flags[slot]);
    }

    /**
     * Returns the current active step index of a timeline.
     * @param id - The timeline ID.
     * @returns The active step index (0-based), or undefined if invalid.
     */
    export function getCurrentStep(id: TimelineID): number | undefined {
        const slot = _resolveSlot(id);

        if (slot === INVALID_INDEX) return undefined;

        return _currentStep[slot];
    }

    /**
     * Returns the number of currently allocated timelines.
     * @returns Active timeline count.
     */
    export function getActiveCount(): number {
        return _activeCount;
    }

    /**
     * Returns the number of currently ticking running timelines.
     * @returns Running timeline count.
     */
    export function getRunningCount(): number {
        return _runningIndicesCount;
    }

    /****** Optional Thin Class Wrapper ******/

    /**
     * Optional thin object-oriented wrapper over the functional TimelineID API.
     * Designed with minimal overhead, strictly delegating all operations to Timelines functions.
     */
    export class Timeline {
        public readonly _id: TimelineID;

        public constructor(config?: TimelineConfig) {
            const id = create(config);

            if (id === null) throw new Error('Pool is full');

            this._id = id;
        }

        /**
         * Wraps an existing TimelineID in a Timeline instance.
         * @param id - The TimelineID.
         * @returns A new Timeline wrapper instance, or null if the ID is invalid.
         */
        public static fromId(id: TimelineID): Timeline | null {
            if (!isActive(id)) return null;

            const instance = Object.create(Timeline.prototype) as Timeline;

            // @ts-expect-error - Assign readonly _id
            instance._id = id;

            return instance;
        }

        /**
         * The underlying branded TimelineID.
         * @returns The TimelineID.
         */
        public get id(): TimelineID {
            return this._id;
        }

        /**
         * Checks if the timeline is active and allocated.
         * @returns True if active, false otherwise.
         */
        public get isValid(): boolean {
            return isActive(this._id);
        }

        /**
         * Checks if the timeline is actively running.
         * @returns True if running, false if paused/stopped, or undefined if invalid.
         */
        public get isRunning(): boolean | undefined {
            return isRunning(this._id);
        }

        /**
         * Checks if the timeline is currently paused.
         * @returns True if paused, false if running, or undefined if invalid.
         */
        public get isPaused(): boolean | undefined {
            return isPaused(this._id);
        }

        /**
         * Checks if the timeline is complete.
         * @returns True if complete, false otherwise, or undefined if invalid.
         */
        public get isComplete(): boolean | undefined {
            return isComplete(this._id);
        }

        /**
         * The current active step index.
         * @returns The active step index, or undefined if invalid.
         */
        public get currentStep(): number | undefined {
            return getCurrentStep(this._id);
        }

        public addTween(config: TweenStepConfig): this {
            addTween(this._id, config);
            return this;
        }

        public addSpring(config: SpringStepConfig): this {
            addSpring(this._id, config);
            return this;
        }

        public addDecay(config: DecayStepConfig): this {
            addDecay(this._id, config);
            return this;
        }

        public addParallel(children: readonly ParallelChildConfig[]): this {
            addParallel(this._id, children);
            return this;
        }

        public addWait(durationMs: number): this {
            addWait(this._id, durationMs);
            return this;
        }

        public addCall(callback: () => void | Promise<void>): this {
            addCall(this._id, callback);
            return this;
        }

        public play(): this {
            play(this._id);
            return this;
        }

        public playAsync(): Promise<void> {
            return playAsync(this._id);
        }

        public pause(): this {
            pause(this._id);
            return this;
        }

        public resume(): this {
            resume(this._id);
            return this;
        }

        public stop(): void {
            stop(this._id);
        }

        public restart(): this {
            restart(this._id);
            return this;
        }
    }
}
