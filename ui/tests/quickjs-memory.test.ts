import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe('UI Module QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)', () => {
    let server: QuickJSServerInstance;

    beforeAll(async () => {
        const bundlePath = resolve(__dirname, 'bundleEntry.ts');
        const bundleCode = await bundleModule(bundlePath, 'UIBundle');

        server = await createQuickJSServerContext();
        server.evalCode(`
            ${bundleCode}
            globalThis.UI = UIBundle.UI;
            globalThis.UIContainer = UIBundle.UIContainer;
            globalThis.UIButton = UIBundle.UIButton;
            globalThis.UIText = UIBundle.UIText;
            globalThis.UIImage = UIBundle.UIImage;
            globalThis.UIWeaponImageButton = UIBundle.UIWeaponImageButton;
            globalThis.UITextButton = UIBundle.UITextButton;
            globalThis.UIGadgetImageButton = UIBundle.UIGadgetImageButton;
            globalThis.UIContainerButton = UIBundle.UIContainerButton;
        `);

        // Warm up
        server.evalCode('(() => { const c = new UIContainer({ x: 0, y: 0, width: 10, height: 10 }); c.delete(); })()');
        server.flushJobs();
    });

    afterAll(() => {
        console.log('\n========================================================================================');
        console.log('             UI MODULE QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');

        server.dispose();
    });

    it('Scenario 1: Massive Static Widget Grid (1,000 Core Widgets)', () => {
        const count = 1_000;
        const result = server.benchmarkScenario({
            scenario: '1. Massive Static Grid (1,000 Widgets)',
            entities: count,
            numericCount: count,
            unit: 'widget',
            run: `
                (() => {
                    const widgets = [];
                    for (let i = 0; i < ${count / 4}; ++i) {
                        widgets.push(new UIContainer({ x: i, y: i, width: 100, height: 100 }));
                        widgets.push(new UIButton({ x: i, y: i, width: 80, height: 40 }));
                        widgets.push(new UIText({ x: i, y: i, width: 120, height: 30, message: 'Label' }));
                        widgets.push(new UIImage({ x: i, y: i, width: 64, height: 64 }));
                    }
                    globalThis.__s1 = widgets;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s1.length; ++i) {
                        globalThis.__s1[i].delete();
                    }
                    delete globalThis.__s1;
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Live Objs Delta']).toBeGreaterThan(500);
    });

    it('Scenario 2: High-Frequency Coordinate & Dimension Mutations (50,000 in-place writes)', () => {
        const widgetCount = 100;
        const mutations = 50_000;

        const result = server.benchmarkScenario({
            scenario: '2. Coordinate & Dimension Mutations (50k writes)',
            entities: `${mutations} writes`,
            numericCount: mutations,
            unit: 'write',
            run: `
                (() => {
                    const widgets = [];
                    for (let i = 0; i < ${widgetCount}; ++i) {
                        widgets.push(new UIContainer({ x: 0, y: 0, width: 100, height: 100 }));
                    }

                    for (let m = 0; m < ${mutations}; ++m) {
                        const w = widgets[m % ${widgetCount}];
                        w.x = m % 1920;
                        w.y = (m * 2) % 1080;
                        w.width = 100 + (m % 50);
                        w.height = 50 + (m % 30);
                        w.visible = m % 2 === 0;
                        w.depth = m % 10;
                    }

                    for (let i = 0; i < widgets.length; ++i) {
                        widgets[i].delete();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
        expect(result['Per-Item']).toBeDefined();
    });

    it('Scenario 3: Interactive Button Slot Allocation & Handler Churn (2,000 Button cycles)', () => {
        const cycles = 2_000;

        const result = server.benchmarkScenario({
            scenario: '3. Button Slot Allocation & Free-List Churn',
            entities: `${cycles} cycles`,
            numericCount: cycles,
            unit: 'cycle',
            run: `
                (() => {
                    const clickHandler = () => {};
                    for (let c = 0; c < ${cycles}; ++c) {
                        const btn = new UIButton({
                            x: 10,
                            y: 10,
                            width: 100,
                            height: 50,
                            onClickUp: clickHandler,
                            onClickDown: clickHandler,
                            onFocusIn: clickHandler,
                            onFocusOut: clickHandler,
                        });
                        btn.delete();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 4: Composite Component Hierarchies (400 Composite Buttons)', () => {
        const count = 400;

        const result = server.benchmarkScenario({
            scenario: '4. Composite Component Hierarchies (400 Widgets)',
            entities: count,
            numericCount: count,
            unit: 'composite',
            run: `
                (() => {
                    const m5a3 = mod.Weapons?.M5A3 ?? 1;
                    const medkit = mod.Gadgets?.Medkit ?? 1;
                    const compositeWidgets = [];

                    for (let i = 0; i < ${count / 4}; ++i) {
                        compositeWidgets.push(
                            new UITextButton({
                                x: i,
                                y: i,
                                width: 150,
                                height: 40,
                                message: 'Click Me',
                            })
                        );
                        compositeWidgets.push(
                            new UIWeaponImageButton({
                                x: i,
                                y: i,
                                width: 150,
                                height: 50,
                                weapon: m5a3,
                            })
                        );
                        compositeWidgets.push(
                            new UIGadgetImageButton({
                                x: i,
                                y: i,
                                width: 100,
                                height: 50,
                                gadget: medkit,
                            })
                        );
                        compositeWidgets.push(
                            new UIContainerButton({
                                x: i,
                                y: i,
                                width: 200,
                                height: 80,
                            })
                        );
                    }
                    globalThis.__s4 = compositeWidgets;
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

    it('Scenario 5: Tree Traversal & Hierarchy Inspection (20,000 forEachChild passes)', () => {
        const traversals = 20_000;

        const result = server.benchmarkScenario({
            scenario: '5. Zero-Alloc Tree Traversal (20k passes)',
            entities: `${traversals} passes`,
            numericCount: traversals,
            unit: 'pass',
            run: `
                (() => {
                    const rootContainer = new UIContainer({ x: 0, y: 0, width: 800, height: 600 });
                    let currentParent = rootContainer;

                    for (let depth = 0; depth < 5; ++depth) {
                        const childContainer = new UIContainer({ parent: currentParent, x: 10, y: 10, width: 200, height: 100 });
                        new UIButton({ parent: childContainer, x: 5, y: 5, width: 50, height: 20 });
                        new UIText({ parent: childContainer, x: 60, y: 5, width: 80, height: 20, message: 'D' + depth });
                        currentParent = childContainer;
                    }

                    let visitedCount = 0;
                    for (let t = 0; t < ${traversals}; ++t) {
                        rootContainer.forEachChild((child) => {
                            visitedCount++;
                            child.forEachChild(() => {
                                visitedCount++;
                            });
                        });
                    }

                    rootContainer.delete();
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 6: Rapid Menu Lifecycle (100 Open/Close cycles of 20 widgets)', () => {
        const cycles = 100;
        const widgetsPerMenu = 20;

        const result = server.benchmarkScenario({
            scenario: '6. Rapid Menu Lifecycle (100 Open/Close Cycles)',
            entities: `${cycles} cycles (${cycles * widgetsPerMenu} widgets)`,
            numericCount: cycles,
            unit: 'cycle',
            run: `
                (() => {
                    for (let c = 0; c < ${cycles}; ++c) {
                        const menuContainer = new UIContainer({ x: 100, y: 100, width: 400, height: 300 });

                        for (let i = 0; i < ${widgetsPerMenu - 1}; ++i) {
                            new UIButton({
                                parent: menuContainer,
                                x: 10,
                                y: i * 15,
                                width: 100,
                                height: 12,
                                onClickUp: () => {},
                            });
                        }

                        menuContainer.delete();
                    }
                })();
            `,
        });

        benchmarkResults.push(result);
    });
});
