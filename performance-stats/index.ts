import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';
import { Timers } from '../timers/index.ts';

// version: 2.0.0
export namespace PerformanceStats {
    const logging = new Logging('PS');

    /**
     * A re-export of the `Logging.LogLevel` enum.
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

    const TARGET_HZ = 30;
    const TARGET_DELTA_MS = 1_000 / TARGET_HZ; // ~33.33ms if TARGET_HZ is 30.
    const SAMPLE_RATE_MS = 1_000;
    const SMOOTHING_FACTOR = 0.3; // 0.0 to 1.0 (Lower = smoother, Higher = more responsive)

    // Spot State (Updated every tick)
    let lastTickTime = 0;
    let lastTickDeltaMs = TARGET_DELTA_MS;

    // Window State (Updated every second)
    let tickCount = 0;
    let lastWindowTime = 0;
    let lastTimeoutCall = 0;

    // Smoothed Output State (For UI)
    let smoothedTickRate = TARGET_HZ;
    let smoothedTimeoutLagMs = 0;

    function getSmoothedValue(spotValue: number, currentSmoothedValue: number): number {
        return spotValue * SMOOTHING_FACTOR + currentSmoothedValue * (1 - SMOOTHING_FACTOR);
    }

    /**
     * The core timeout lag measurement loop for UI and logging.
     */
    function measureTimeoutLag() {
        const now = Date.now();
        const deltaMs = now - lastWindowTime;

        // Calculate average spot metrics for this specific window.
        const rawTickRate = (tickCount / deltaMs) * 1_000;

        const timeoutLagMs = Math.max(0, now - (lastTimeoutCall + SAMPLE_RATE_MS)); // How late `setTimeout` woke up.

        // Apply exponential moving average (EMA) for UI stability.
        smoothedTickRate = getSmoothedValue(rawTickRate, smoothedTickRate);
        smoothedTimeoutLagMs = getSmoothedValue(timeoutLagMs, smoothedTimeoutLagMs);

        // Instant spike logging.
        if (timeoutLagMs > 100) {
            logging.log(`Timeout lag spike: +${~~timeoutLagMs}ms over.`, LogLevel.Warning);
        }

        if (rawTickRate < 25) {
            logging.log(`Tick rate dropped: ${~~rawTickRate}Hz`, LogLevel.Warning);
        }

        // Reset and schedule next window.
        tickCount = 0;
        lastWindowTime = now;
        lastTimeoutCall = Date.now();

        Timers.setTimeout(measureTimeoutLag, SAMPLE_RATE_MS);
    }

    const unsubscribe = Events.OnGameModeStarted.subscribe(() => {
        unsubscribe();

        /**
         * The per-tick tracker for scaling and counting.
         * It's critical this is the first (or one of the first) things subscribed so it accurately captures the engine's
         * tick cadence.
         */
        Events.OngoingGlobal.subscribe(() => {
            const now = Date.now();

            // Update Spot Math for compute scaling.
            lastTickDeltaMs = now - lastTickTime;
            lastTickTime = now;

            // Accumulate ticks for the window loop.
            ++tickCount;
        });

        // Kick off the macro measurement loop.
        lastTimeoutCall = lastWindowTime = lastTickTime = Date.now();

        Timers.setTimeout(measureTimeoutLag, SAMPLE_RATE_MS);
    });

    if (logging.willLog(LogLevel.Info)) {
        logging.log(`Monitoring started.`, LogLevel.Info);
    }

    /**
     * @returns The smoothed tick rate. Good/stable for UI display.
     */
    export function getSmoothedTickRate() {
        return smoothedTickRate;
    }

    /**
     * @returns The smoothed lag time. Good/stable for UI display.
     */
    export function getSmoothedTimeoutLagMs() {
        return smoothedTimeoutLagMs;
    }

    /**
     * Returns the value that is somewhat analogous to SFT when above 33m.
     * @returns The raw delta time between the last two ticks. Good for compute scaling.
     */
    export function getSpotDeltaMs() {
        return lastTickDeltaMs;
    }

    /**
     * Returns the value that is analogous to STR.
     * @returns The tick rate. Good for compute scaling.
     */
    export function getSpotTickRate() {
        return TARGET_DELTA_MS / lastTickDeltaMs;
    }

    /**
     * @returns A normalized health factor from 0.0 to 1.0. Good for compute scaling.
     * 1.0 = Perfect 30Hz performance.
     * < 1.0 = Engine is bogged down, scale your compute back.
     */
    export function getSpotHealthFactor() {
        // Cap at 1.0 so a randomly fast tick doesn't cause logic to scale > 100%
        return Math.min(1.0, getSpotTickRate());
    }
}
