// version 1.0.0

// TODO: analyzeHealth shjould be a method to get the health status and log it.
class PerformanceStats {
    
    private sampleRateSeconds: number = 0.5; // 0.5 is ideal as it aligns perfectly with both 30Hz and 60Hz
    
    private tickBucket: number = 0;

    private isStarted: boolean = false;

    private cachedTickRate: number = 60; 
    
    private log: (text: string) => void;

    constructor(log: (text: string) => void, sampleRateSeconds?: number) {
        this.log = log;
        this.sampleRateSeconds = sampleRateSeconds ?? 0.5;
    }

    public get tickRate(): number {
        return this.cachedTickRate;
    }
    
    public trackPerformanceTick(): void {
        this.tickBucket++;
    }

    public startPerformanceHeartbeat(): void {
        if (this.isStarted) return;

        this.isStarted = true;

        mod.Wait(this.sampleRateSeconds).then(() => this.performanceHeartbeat());
    }

    private performanceHeartbeat(): void {
        // The raw "Ticks Per Requested Second" (the composite metric).
        this.analyzeHealth(this.cachedTickRate = this.tickBucket / this.sampleRateSeconds);

        this.tickBucket = 0;

        mod.Wait(this.sampleRateSeconds).then(() => this.performanceHeartbeat());
    }

    private analyzeHealth(tickRate: number): void {
        // We have accumulated too many ticks for the requested time, which means the Wait() took longer than requested.
        if (tickRate >= 65) {
            this.log(`<PS> Script Callbacks Deprioritized (Virtual Rate: ${tickRate.toFixed(1)}Hz).`);
            return;
        }
        
        // We didn't even get 30 ticks in the time window, which means the server is under stress.
        if (tickRate <= 25) {
            this.log(`<PS> Server Stress (Virtual Rate: ${tickRate.toFixed(1)}Hz).`);
            return;
        }
    }
}
