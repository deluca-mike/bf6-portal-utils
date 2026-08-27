import { PerformanceObserver } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SolidUISOA as SolidUI } from '../index.ts';

function forceGC(): void {
    if (typeof global.gc === 'function') {
        global.gc();
    }
}

function getHeapUsed(): number {
    forceGC();
    return process.memoryUsage().heapUsed;
}

function formatBytes(bytes: number): string {
    if (Math.abs(bytes) < 1024) return `${bytes} B`;
    if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface BenchmarkMetric {
    Scenario: string;
    Entities: number | string;
    'Heap Delta': string;
    'Per-Item': string;
    'GC Runs': number;
    'GC Pause (ms)': string;
    'Drift After Cleanup': string;
}

const benchmarkResults: BenchmarkMetric[] = [];

describe('SolidUISOA Memory & Garbage Collection Profiling', () => {
    let gcCount = 0;
    let gcTimeMs = 0;
    let obs: PerformanceObserver | null = null;

    beforeAll(() => {
        try {
            obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    gcCount++;
                    gcTimeMs += entry.duration;
                }
            });
            obs.observe({ entryTypes: ['gc'] });
        } catch {
            // perf_hooks GC observer not supported in this runtime
        }
    });

    afterAll(() => {
        if (obs) obs.disconnect();

        console.log('\n========================================================================================');
        console.log(
            `                   SOLIDUI-SOA MEMORY & GC PROFILING REPORT ${typeof global.gc === 'function' ? '(--expose-gc enabled)' : '(automatic V8 GC)'}`
        );
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
    });

    it('Scenario 1: Massive Static Graph (1,000 Signals + 1,000 Effects)', () => {
        const count = 1_000;
        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const signals: [SolidUI.Accessor<number>, SolidUI.Setter<number>][] = [];
        const disposers: (() => void)[] = [];

        for (let i = 0; i < count; ++i) {
            const sig = SolidUI.createSignal(i);
            signals.push(sig);
            disposers.push(SolidUI.createEffect(() => sig[0]()));
        }

        const allocatedHeap = getHeapUsed();
        const allocatedDelta = allocatedHeap - initialHeap;

        // Dispose all effects
        for (let i = 0; i < disposers.length; ++i) {
            disposers[i]();
        }
        signals.length = 0;
        disposers.length = 0;

        const postCleanupHeap = getHeapUsed();
        const drift = postCleanupHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '1. Massive Static Graph (1k Signals+Effects)',
            Entities: count,
            'Heap Delta': formatBytes(allocatedDelta),
            'Per-Item': `${(allocatedDelta / count).toFixed(1)} B`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        expect(allocatedDelta / count).toBeLessThan(2000);
    });

    it('Scenario 2: High-Frequency Steady-State Updates (25,000 mutations across 100 signals)', async () => {
        const signalCount = 100;
        const mutations = 25_000;

        const signals: [SolidUI.Accessor<number>, SolidUI.Setter<number>][] = [];
        const disposers: (() => void)[] = [];
        let totalEffectRuns = 0;

        for (let i = 0; i < signalCount; ++i) {
            const sig = SolidUI.createSignal(0);
            signals.push(sig);
            disposers.push(
                SolidUI.createEffect(() => {
                    sig[0]();
                    ++totalEffectRuns;
                })
            );
        }

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        for (let m = 0; m < mutations; ++m) {
            const idx = m % signalCount;
            signals[idx][1](m);
            if (m % 50 === 0) {
                await Promise.resolve();
            }
        }
        await Promise.resolve();

        const endHeap = getHeapUsed();
        const drift = endHeap - initialHeap;

        for (let i = 0; i < disposers.length; ++i) {
            disposers[i]();
        }

        benchmarkResults.push({
            Scenario: '2. High-Frequency Steady-State Mutations',
            Entities: `${mutations} updates`,
            'Heap Delta': formatBytes(drift),
            'Per-Item': `${(drift / mutations).toFixed(2)} B/op`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });

        expect(totalEffectRuns).toBeGreaterThan(0);
    });

    it('Scenario 3: Dynamic Branching & Dependency Rewiring (2,000 branch toggles)', async () => {
        const branchCount = 200;
        const flips = 2_000;

        const conds: [SolidUI.Accessor<boolean>, SolidUI.Setter<boolean>][] = [];
        const aSignals: [SolidUI.Accessor<number>, SolidUI.Setter<number>][] = [];
        const bSignals: [SolidUI.Accessor<number>, SolidUI.Setter<number>][] = [];
        const disposers: (() => void)[] = [];

        for (let i = 0; i < branchCount; ++i) {
            const cond = SolidUI.createSignal(true);
            const a = SolidUI.createSignal(100 + i);
            const b = SolidUI.createSignal(200 + i);

            conds.push(cond);
            aSignals.push(a);
            bSignals.push(b);

            disposers.push(
                SolidUI.createEffect(() => {
                    return cond[0]() ? a[0]() : b[0]();
                })
            );
        }

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        for (let f = 0; f < flips; ++f) {
            const idx = f % branchCount;
            conds[idx][1]((prev) => !prev);
            if (f % 50 === 0) {
                await Promise.resolve();
            }
        }
        await Promise.resolve();

        const endHeap = getHeapUsed();
        const delta = endHeap - initialHeap;

        for (let i = 0; i < disposers.length; ++i) {
            disposers[i]();
        }

        benchmarkResults.push({
            Scenario: '3. Dynamic Branching & Dependency Rewiring',
            Entities: `${flips} flips`,
            'Heap Delta': formatBytes(delta),
            'Per-Item': `${(delta / flips).toFixed(2)} B/flip`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });
    });

    it('Scenario 4: Component Lifecycle Mount/Unmount Churn (500 widgets created and deleted)', async () => {
        class MockWidget {
            public title = '';
            public width = 100;
            public isDeleted = false;

            constructor(params: { title?: string; width?: number }) {
                if (params.title !== undefined) this.title = params.title;
                if (params.width !== undefined) this.width = params.width;
            }

            delete(): void {
                this.isDeleted = true;
            }
        }

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const widgetCount = 500;
        const widgets: MockWidget[] = [];

        for (let i = 0; i < widgetCount; ++i) {
            const [text] = SolidUI.createSignal(`Item ${i}`);
            const [width] = SolidUI.createSignal(100 + i);

            const widget = SolidUI.h(MockWidget, {
                title: () => text(),
                width: () => width(),
            });
            widgets.push(widget);
        }

        const peakHeap = getHeapUsed();
        const peakDelta = peakHeap - initialHeap;

        for (let i = 0; i < widgets.length; ++i) {
            widgets[i].delete();
        }
        widgets.length = 0;

        const postTeardownHeap = getHeapUsed();
        const drift = postTeardownHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '4. Component Lifecycle (500 Mount/Unmounts)',
            Entities: widgetCount,
            'Heap Delta': formatBytes(peakDelta),
            'Per-Item': `${(peakDelta / widgetCount).toFixed(1)} B/widget`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(250 * 1024);
        }
    });

    it('Scenario 5: Deep Store Property Tracking & Array Mutations', async () => {
        interface GameState {
            players: { id: number; health: number; name: string }[];
            score: number;
            round: number;
        }

        const [store, setStore] = SolidUI.createStore<GameState>({
            players: [
                { id: 1, health: 100, name: 'Player 1' },
                { id: 2, health: 100, name: 'Player 2' },
            ],
            score: 0,
            round: 1,
        });

        let healthUpdates = 0;
        let scoreUpdates = 0;

        const dispose1 = SolidUI.createEffect(() => {
            if (store.players[0]) {
                void store.players[0].health;
                ++healthUpdates;
            }
        });

        const dispose2 = SolidUI.createEffect(() => {
            void store.score;
            ++scoreUpdates;
        });

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const ops = 5_000;
        for (let i = 0; i < ops; ++i) {
            if (i % 2 === 0) {
                setStore((s) => {
                    s.players[0].health = 100 - (i % 50);
                });
            } else {
                setStore((s) => {
                    s.score = i;
                });
            }

            if (i % 50 === 0) {
                await Promise.resolve();
            }
        }
        await Promise.resolve();

        const endHeap = getHeapUsed();
        const delta = endHeap - initialHeap;

        dispose1();
        dispose2();

        benchmarkResults.push({
            Scenario: '5. Deep Store Property Mutations',
            Entities: `${ops} mutations`,
            'Heap Delta': formatBytes(delta),
            'Per-Item': `${(delta / ops).toFixed(2)} B/mutation`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });

        expect(healthUpdates).toBeGreaterThan(0);
        expect(scoreUpdates).toBeGreaterThan(0);
    });

    it('Scenario 6: Index List Component Virtualization (Grow, Mutate, Shrink)', async () => {
        class MockRow {
            public value = '';
            public isDeleted = false;
            constructor(params: { value?: string }) {
                if (params.value !== undefined) this.value = params.value;
            }
            delete(): void {
                this.isDeleted = true;
            }
        }

        const [items, setItems] = SolidUI.createSignal<string[]>([]);

        let disposeRoot!: () => void;
        SolidUI.createRoot((dispose) => {
            disposeRoot = dispose;
            SolidUI.Index(items, (item) => {
                return SolidUI.h(MockRow, {
                    value: () => item(),
                });
            });
        });

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const cycles = 50;
        for (let c = 0; c < cycles; ++c) {
            const bigList = Array.from({ length: 100 }, (_, idx) => `Item_${c}_${idx}`);
            setItems(bigList);
            await Promise.resolve();

            const smallList = Array.from({ length: 10 }, (_, idx) => `Item_${c}_${idx}`);
            setItems(smallList);
            await Promise.resolve();
        }

        const endHeap = getHeapUsed();
        const delta = endHeap - initialHeap;

        disposeRoot();

        benchmarkResults.push({
            Scenario: '6. Index List Grow & Shrink Cycles',
            Entities: `${cycles} cycles (10<->100 items)`,
            'Heap Delta': formatBytes(delta),
            'Per-Item': `${(delta / cycles).toFixed(1)} B/cycle`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });
    });
});
