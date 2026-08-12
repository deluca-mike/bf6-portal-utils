import { Logging } from '../logging/index.ts';
export declare namespace Animations {
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
     * Unique generation-encoded identifier for an animation.
     */
    type AnimationID = number & {
        readonly __brand: 'AnimationID';
    };
    /**
     * Configuration options for starting a standard tween animation.
     */
    interface AnimationConfig {
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
    interface SpringAnimationConfig {
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
    /**
     * Maximum number of concurrent animations supported by the engine pool.
     */
    const MAX_ANIMATIONS = 1024;
    /****** Public Engine API ******/
    /**
     * Starts a new tween animation from config.
     * @param config - Animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    function start(config: AnimationConfig): AnimationID | null;
    /**
     * Starts a new spring physics animation from config.
     * @param config - Spring animation parameters and callbacks.
     * @returns The unboxed {@link AnimationID} for lifecycle control, or null if the pool is full.
     */
    function startSpring(config: SpringAnimationConfig): AnimationID | null;
    /**
     * Stops an animation immediately and frees resources.
     * @param id - The ID of the animation to stop.
     */
    function stop(id: AnimationID): void;
    /**
     * Pauses a running animation, freezing its current progress.
     * @param id - The ID of the animation to pause.
     */
    function pause(id: AnimationID): void;
    /**
     * Resumes a paused animation.
     * @param id - The ID of the animation to resume.
     */
    function resume(id: AnimationID): void;
    /**
     * Checks if an animation is currently active (allocated in the pool).
     * @param id - The ID of the animation.
     * @returns True if active, false otherwise.
     */
    function isActive(id: AnimationID): boolean;
    /**
     * Checks if an animation is currently paused.
     * @param id - The ID of the animation.
     * @returns True if paused, false if running, or undefined if the animation does not exist.
     */
    function isPaused(id: AnimationID): boolean | undefined;
    /**
     * Checks if an animation is currently active and running.
     * @param id - The ID of the animation.
     * @returns True if running, false if paused, or undefined if the animation does not exist.
     */
    function isRunning(id: AnimationID): boolean | undefined;
    /**
     * Returns the number of currently allocated animations in the pool.
     * @returns Active animation count.
     */
    function getActiveCount(): number;
    /**
     * Returns the number of currently running animations actively ticking.
     * @returns Running animation count.
     */
    function getRunningCount(): number;
}
