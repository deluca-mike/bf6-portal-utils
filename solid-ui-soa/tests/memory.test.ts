import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe('SolidUISOA QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)', () => {
    let bundleCode: string;
    let server: QuickJSServerInstance;

    beforeAll(async () => {
        const bundlePath = resolve(__dirname, '../index.ts');
        bundleCode = await bundleModule(bundlePath, 'SolidUISOABundle');
    });

    beforeEach(async () => {
        server = await createQuickJSServerContext();
        server.evalCode(bundleCode + '\nglobalThis.SolidUI = SolidUISOABundle.SolidUISOA;\n');

        // Warm up QuickJS compiler/runtime
        server.evalCode('(() => { const [s, setS] = SolidUI.createSignal(0); setS(1); })()');
        server.flushJobs();
    });

    afterEach(() => {
        server.dispose();
    });

    afterAll(() => {
        console.log('\n========================================================================================');
        console.log('          SOLIDUI-SOA QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
    });

    it('Scenario 1: Massive Static Graph (1,000 Signals + 1,000 Effects)', () => {
        const count = 1_000;
        const result = server.benchmarkScenario({
            scenario: '1. Massive Static Graph (1k Signals+Effects)',
            entities: count,
            numericCount: count,
            unit: 'pair',
            run: `
                (() => {
                    const signals = [];
                    const disposers = [];
                    for (let i = 0; i < ${count}; ++i) {
                        const sig = SolidUI.createSignal(i);
                        signals.push(sig);
                        disposers.push(SolidUI.createEffect(() => sig[0]()));
                    }
                    globalThis.__s1 = { signals, disposers };
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s1.disposers.length; ++i) {
                        globalThis.__s1.disposers[i]();
                    }
                    delete globalThis.__s1;
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Live Objs Delta']).toBeGreaterThan(100);
    });

    it('Scenario 2: High-Frequency Steady-State Updates (25,000 mutations across 100 signals)', () => {
        const signalCount = 100;
        const mutations = 25_000;
        const result = server.benchmarkScenario({
            scenario: '2. High-Frequency Steady-State Mutations',
            entities: `${mutations} updates`,
            numericCount: mutations,
            unit: 'op',
            run: `
                (() => {
                    const signals = [];
                    const disposers = [];
                    for (let i = 0; i < ${signalCount}; ++i) {
                        const sig = SolidUI.createSignal(0);
                        signals.push(sig);
                        disposers.push(SolidUI.createEffect(() => sig[0]()));
                    }

                    for (let m = 0; m < ${mutations}; ++m) {
                        const idx = m % ${signalCount};
                        signals[idx][1](m);
                    }

                    for (let i = 0; i < disposers.length; ++i) {
                        disposers[i]();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 3: Dynamic Branching & Dependency Rewiring (2,000 branch toggles)', () => {
        const branchCount = 200;
        const flips = 2_000;
        const result = server.benchmarkScenario({
            scenario: '3. Dynamic Branching & Dependency Rewiring',
            entities: `${flips} flips`,
            numericCount: flips,
            unit: 'flip',
            run: `
                (() => {
                    const conds = [];
                    const aSignals = [];
                    const bSignals = [];
                    const disposers = [];

                    for (let i = 0; i < ${branchCount}; ++i) {
                        const cond = SolidUI.createSignal(true);
                        const a = SolidUI.createSignal(100 + i);
                        const b = SolidUI.createSignal(200 + i);

                        conds.push(cond);
                        aSignals.push(a);
                        bSignals.push(b);

                        disposers.push(
                            SolidUI.createEffect(() => (cond[0]() ? a[0]() : b[0]()))
                        );
                    }

                    for (let f = 0; f < ${flips}; ++f) {
                        const idx = f % ${branchCount};
                        conds[idx][1]((prev) => !prev);
                    }

                    for (let i = 0; i < disposers.length; ++i) {
                        disposers[i]();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 4: Component Lifecycle Mount/Unmount Churn (500 widgets created and deleted)', () => {
        const widgetCount = 500;
        const result = server.benchmarkScenario({
            scenario: '4. Component Lifecycle (500 Mount/Unmounts)',
            entities: widgetCount,
            numericCount: widgetCount,
            unit: 'widget',
            run: `
                (() => {
                    class MockWidget {
                        constructor(params) {
                            this.title = params.title || '';
                            this.width = params.width || 100;
                            this.isDeleted = false;
                        }
                        delete() {
                            this.isDeleted = true;
                        }
                    }

                    const widgets = [];
                    for (let i = 0; i < ${widgetCount}; ++i) {
                        const [text] = SolidUI.createSignal('Item ' + i);
                        const [width] = SolidUI.createSignal(100 + i);

                        const widget = SolidUI.h(MockWidget, {
                            title: () => text(),
                            width: () => width(),
                        });
                        widgets.push(widget);
                    }
                    globalThis.__s4 = widgets;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s4.length; ++i) {
                        globalThis.__s4[i].delete();
                    }
                    delete globalThis.__s4;
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 5: Deep Store Property Tracking & Mutations (5,000 ops)', () => {
        const ops = 5_000;
        const result = server.benchmarkScenario({
            scenario: '5. Deep Store Property Mutations',
            entities: `${ops} mutations`,
            numericCount: ops,
            unit: 'mutation',
            run: `
                (() => {
                    const [store, setStore] = SolidUI.createStore({
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

                    for (let i = 0; i < ${ops}; ++i) {
                        if (i % 2 === 0) {
                            setStore((s) => {
                                s.players[0].health = 100 - (i % 50);
                            });
                        } else {
                            setStore((s) => {
                                s.score = i;
                            });
                        }
                    }

                    dispose1();
                    dispose2();
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 6: Index List Component Virtualization (50 grow/shrink cycles)', () => {
        const cycles = 50;
        const result = server.benchmarkScenario({
            scenario: '6. Index List Grow & Shrink Cycles',
            entities: `${cycles} cycles (10<->100 items)`,
            numericCount: cycles,
            unit: 'cycle',
            run: `
                (() => {
                    class MockRow {
                        constructor(params) {
                            this.value = params.value || '';
                            this.isDeleted = false;
                        }
                        delete() {
                            this.isDeleted = true;
                        }
                    }

                    const [items, setItems] = SolidUI.createSignal([]);

                    let disposeRoot;
                    SolidUI.createRoot((dispose) => {
                        disposeRoot = dispose;
                        SolidUI.Index(items, (item) => {
                            return SolidUI.h(MockRow, {
                                value: () => item(),
                            });
                        });
                    });

                    for (let c = 0; c < ${cycles}; ++c) {
                        const bigList = [];
                        for (let i = 0; i < 100; ++i) bigList.push('Item_' + c + '_' + i);
                        setItems(bigList);

                        const smallList = [];
                        for (let i = 0; i < 10; ++i) smallList.push('Item_' + c + '_' + i);
                        setItems(smallList);
                    }

                    disposeRoot();
                })();
            `,
        });

        benchmarkResults.push(result);
    });
});
