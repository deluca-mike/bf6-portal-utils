export declare class PerformanceStats {
    private stressThreshold;
    private deprioritizedThreshold;
    private sampleRateSeconds;
    private tickBucket;
    private isStarted;
    private cachedTickRate;
    private log?;
    constructor(options?: PerformanceStats.Options);
    get tickRate(): number;
    trackTick(): void;
    startHeartbeat(): void;
    private heartbeat;
    private analyzeHealth;
}
export declare namespace PerformanceStats {
    type Options = {
        log?: (text: string) => void;
        stressThreshold?: number;
        deprioritizedThreshold?: number;
        sampleRateSeconds?: number;
    };
}
