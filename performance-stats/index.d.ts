export declare class PerformanceStats {
    private stressThreshold;
    private deprioritizedThreshold;
    private sampleRateSeconds;
    private tickBucket;
    private isStarted;
    private cachedTickRate;
    private log?;
    /**
     * Creates a new PerformanceStats instance.
     * @param options - The options for the PerformanceStats instance.
     */
    constructor(options?: PerformanceStats.Options);
    /**
     * @returns The current tick rate.
     */
    get tickRate(): number;
    /**
     * This should be called once every tick, so it is best to be called in the `OngoingGlobal()` event handler.
     */
    trackTick(): void;
    /**
     * This starts the performance tracking heartbeat, which is a loop that tracks the performance of the script. It can be called once, any time.
     * If called multiple times, it will only start one loop.
     */
    startHeartbeat(): void;
    private heartbeat;
    private analyzeHealth;
}
export declare namespace PerformanceStats {
    /**
     * The options for the PerformanceStats instance.
     */
    type Options = {
        /**
         * The logging function to use.
         */
        log?: (text: string) => void;
        /**
         * The stress threshold.
         */
        stressThreshold?: number;
        /**
         * The deprioritized threshold.
         */
        deprioritizedThreshold?: number;
        /**
         * The sample rate in seconds.
         */
        sampleRateSeconds?: number;
    };
}
