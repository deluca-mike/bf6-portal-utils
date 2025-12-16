// version 1.2.0
export class PerformanceStats {
    private stressThreshold: number = 25;

    private deprioritizedThreshold: number = 65;

    private sampleRateSeconds: number = 0.5; // 0.5 is ideal as it aligns perfectly with both 30Hz and 60Hz

    private tickBucket: number = 0;

    private isStarted: boolean = false;

    private cachedTickRate: number = 30;

    private log?: (text: string) => void;

    constructor(options?: PerformanceStats.Options) {
        this.log = options?.log ?? (() => {});
        this.sampleRateSeconds = options?.sampleRateSeconds ?? 0.5;
        this.stressThreshold = options?.stressThreshold ?? 25;
        this.deprioritizedThreshold = options?.deprioritizedThreshold ?? 65;
    }

    public get tickRate(): number {
        return this.cachedTickRate;
    }

    // This should be called once every tick, so it is best to be called in the `OngoingGlobal()` event handler.
    public trackTick(): void {
        this.tickBucket++;
    }

    // This starts the performance tracking heartbeat, which is a loop that tracks the performance of the script. It can be called once, any time.
    // If called multiple times, it will only start one loop.
    public startHeartbeat(): void {
        if (this.isStarted) return;

        this.isStarted = true;

        mod.Wait(this.sampleRateSeconds).then(() => this.heartbeat());
    }

    private heartbeat(): void {
        // The raw "Ticks Per Requested Second" (the composite metric).
        this.analyzeHealth((this.cachedTickRate = this.tickBucket / this.sampleRateSeconds));

        this.tickBucket = 0;

        mod.Wait(this.sampleRateSeconds).then(() => this.heartbeat());
    }

    private analyzeHealth(tickRate: number): void {
        if (!this.log) return;

        // We have accumulated too many ticks for the requested time, which means the Wait() took longer than requested.
        if (tickRate >= this.deprioritizedThreshold) {
            this.log(`<PS> Script Callbacks Deprioritized (Virtual Rate: ${tickRate.toFixed(1)}Hz).`);
            return;
        }

        // We didn't even get 30 ticks in the time window, which means the server is under stress.
        if (tickRate <= this.stressThreshold) {
            this.log(`<PS> Server Stress (Virtual Rate: ${tickRate.toFixed(1)}Hz).`);
            return;
        }
    }
}

export namespace PerformanceStats {
    export type Options = {
        log?: (text: string) => void;
        stressThreshold?: number;
        deprioritizedThreshold?: number;
        sampleRateSeconds?: number;
    };
}
