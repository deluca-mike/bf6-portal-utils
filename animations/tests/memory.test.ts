import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe('Animations QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)', () => {
    let bundleCode: string;
    let eventsBundleCode: string;
    let server: QuickJSServerInstance;

    beforeAll(async () => {
        const bundlePath = resolve(__dirname, '../animations.ts');
        const eventsPath = resolve(__dirname, '../../events/index.ts');
        bundleCode = await bundleModule(bundlePath, 'AnimationsBundle');
        eventsBundleCode = await bundleModule(eventsPath, 'EventsBundle');
    });

    beforeEach(async () => {
        server = await createQuickJSServerContext();
        server.evalCode(eventsBundleCode + '\nglobalThis.Events = EventsBundle.Events;\n');
        server.evalCode(bundleCode + '\nglobalThis.Animations = AnimationsBundle.Animations;\n');

        // Warm up QuickJS compiler/runtime
        server.evalCode(
            '(() => { const id = Animations.start({ from: 0, to: 10, duration: 100, onUpdate: () => {} }); Animations.stop(id); })()'
        );
        server.flushJobs();
    });

    afterEach(() => {
        server.dispose();
    });

    afterAll(() => {
        console.log('\n========================================================================================');
        console.log('          ANIMATIONS QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
    });

    it('Scenario 1: Full Pool Saturation (1,000 Concurrent Tween Animations)', () => {
        const count = 1_000;
        const result = server.benchmarkScenario({
            scenario: '1. Full Pool Saturation (1k Active Tweens)',
            entities: count,
            numericCount: count,
            unit: 'anim',
            run: `
                (() => {
                    const ids = [];
                    for (let i = 0; i < ${count}; ++i) {
                        const id = Animations.start({
                            from: 0,
                            to: 100,
                            duration: 5000,
                            onUpdate: (v) => {},
                        });
                        ids.push(id);
                    }
                    globalThis.__s1_ids = ids;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s1_ids.length; ++i) {
                        Animations.stop(globalThis.__s1_ids[i]);
                    }
                    delete globalThis.__s1_ids;
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 2: High-Frequency Steady-State Ticking (50,000 Server Ticks)', () => {
        const animCount = 50;
        const ticks = 50_000;
        const result = server.benchmarkScenario({
            scenario: '2. High-Frequency Steady-State Ticking (50k Ticks)',
            entities: `${ticks} ticks`,
            numericCount: ticks,
            unit: 'tick',
            run: `
                (() => {
                    const ids = [];
                    let sink = 0;

                    for (let i = 0; i < ${animCount}; ++i) {
                        const id = Animations.start({
                            from: 0,
                            to: 1000,
                            duration: 1000000,
                            onUpdate: (v) => { sink += v; },
                        });
                        ids.push(id);
                    }

                    for (let t = 0; t < ${ticks}; ++t) {
                        Events.OngoingGlobal.trigger();
                    }

                    for (let i = 0; i < ids.length; ++i) {
                        Animations.stop(ids[i]);
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 3: Continuous Slot Churn & Generational Recycling (5,000 Animations)', () => {
        const churnCount = 5_000;
        const result = server.benchmarkScenario({
            scenario: '3. Rapid Slot Churn & Generational Recycling',
            entities: `${churnCount} anims`,
            numericCount: churnCount,
            unit: 'anim',
            run: `
                (() => {
                    for (let i = 0; i < ${churnCount}; ++i) {
                        const id = Animations.start({
                            from: 0,
                            to: 50,
                            duration: 50,
                            onUpdate: (v) => {},
                        });
                        Events.OngoingGlobal.trigger();
                        Animations.stop(id);
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 4: Spring Physics Batch Simulation (500 Springs Settling)', () => {
        const springCount = 500;
        const result = server.benchmarkScenario({
            scenario: '4. Spring Physics Batch (500 Springs Settling)',
            entities: springCount,
            numericCount: springCount,
            unit: 'spring',
            run: `
                (() => {
                    let completedCount = 0;
                    for (let i = 0; i < ${springCount}; ++i) {
                        Animations.startSpring({
                            from: 0,
                            to: 100,
                            stiffness: 250,
                            damping: 30,
                            precision: 0.01,
                            onUpdate: (v) => {},
                            onComplete: () => {
                                ++completedCount;
                            },
                        });
                    }

                    // Tick until settled
                    for (let t = 0; t < 120; ++t) {
                        Events.OngoingGlobal.trigger();
                        if (Animations.getRunningCount() === 0) break;
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 5: Idle Master Ticker Overhead (50,000 Ticks with Empty Queue)', () => {
        const idleTicks = 50_000;
        const result = server.benchmarkScenario({
            scenario: '5. Idle Master Ticker (50k Empty Ticks)',
            entities: `${idleTicks} ticks`,
            numericCount: idleTicks,
            unit: 'tick',
            run: `
                (() => {
                    for (let t = 0; t < ${idleTicks}; ++t) {
                        Events.OngoingGlobal.trigger();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });
});
