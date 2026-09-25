import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe('Timelines QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)', () => {
    let bundleCode: string;
    let animationsBundleCode: string;
    let eventsBundleCode: string;
    let server: QuickJSServerInstance;

    beforeAll(async () => {
        const bundlePath = resolve(__dirname, '../index.ts');
        const animationsPath = resolve(__dirname, '../../animations/index.ts');
        const eventsPath = resolve(__dirname, '../../events/index.ts');
        eventsBundleCode = await bundleModule(eventsPath, 'EventsBundle');
        animationsBundleCode = await bundleModule(animationsPath, 'AnimationsBundle');
        bundleCode = await bundleModule(bundlePath, 'TimelinesBundle');
    });

    beforeEach(async () => {
        server = await createQuickJSServerContext();
        server.evalCode(eventsBundleCode + '\nglobalThis.Events = EventsBundle.Events;\n');
        server.evalCode(animationsBundleCode + '\nglobalThis.Animations = AnimationsBundle.Animations;\n');
        server.evalCode(bundleCode + '\nglobalThis.Timelines = TimelinesBundle.Timelines;\n');

        // Warm up QuickJS compiler/runtime
        server.evalCode(
            '(() => { const id = Timelines.create(); Timelines.addWait(id, 10); Timelines.play(id); Timelines.stop(id); })()'
        );
        server.flushJobs();
    });

    afterEach(() => {
        server.dispose();
    });

    afterAll(() => {
        console.log('\n========================================================================================');
        console.log('          TIMELINES QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
    });

    it('Scenario 1: Full Pool Saturation (256 Concurrent Multi-Step Timelines)', () => {
        const count = 256;
        const result = server.benchmarkScenario({
            scenario: '1. Full Pool Saturation (256 Active Timelines)',
            entities: count,
            numericCount: count,
            unit: 'timeline',
            run: `
                (() => {
                    const ids = [];
                    for (let i = 0; i < ${count}; ++i) {
                        const id = Timelines.create();
                        Timelines.addTween(id, { from: 0, to: 100, duration: 2000, onUpdate: (v) => {} });
                        Timelines.addWait(id, 500);
                        Timelines.addCall(id, () => {});
                        Timelines.play(id);
                        ids.push(id);
                    }
                    globalThis.__s1_ids = ids;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s1_ids.length; ++i) {
                        Timelines.stop(globalThis.__s1_ids[i]);
                    }
                    delete globalThis.__s1_ids;
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 2: Rapid Step Churn & Generational Recycling (2,000 Timelines)', () => {
        const churnCount = 2_000;
        const result = server.benchmarkScenario({
            scenario: '2. Rapid Step Churn & Generational Recycling',
            entities: `${churnCount} timelines`,
            numericCount: churnCount,
            unit: 'timeline',
            run: `
                (() => {
                    for (let i = 0; i < ${churnCount}; ++i) {
                        const id = Timelines.create();
                        Timelines.addTween(id, { from: 0, to: 10, duration: 10, onUpdate: (v) => {} });
                        Timelines.play(id);
                        Events.OnTickEnd.trigger();
                        Timelines.stop(id);
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });
});
