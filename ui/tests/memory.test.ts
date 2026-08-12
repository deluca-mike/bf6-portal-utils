import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe('UI Module QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)', () => {
    let bundleCode: string;
    let server: QuickJSServerInstance;

    beforeAll(async () => {
        const bundlePath = resolve(__dirname, 'bundleEntry.ts');
        bundleCode = await bundleModule(bundlePath, 'UIBundle');
    });

    beforeEach(async () => {
        server = await createQuickJSServerContext();
        server.evalCode(`
            ${bundleCode}
            globalThis.UI = UIBundle.UI;
            globalThis.UIBaseButton = UIBundle.UIBaseButton;
            globalThis.UIContainer = UIBundle.UIContainer;
            globalThis.UIButton = UIBundle.UIButton;
            globalThis.UIText = UIBundle.UIText;
            globalThis.UIImage = UIBundle.UIImage;
            globalThis.UIGadgetImage = UIBundle.UIGadgetImage;
            globalThis.UIWeaponImage = UIBundle.UIWeaponImage;
            globalThis.UIContentButton = UIBundle.UIContentButton;
            globalThis.UIContainerButton = UIBundle.UIContainerButton;
            globalThis.UITextButton = UIBundle.UITextButton;
            globalThis.UIImageButton = UIBundle.UIImageButton;
            globalThis.UIGadgetImageButton = UIBundle.UIGadgetImageButton;
            globalThis.UIWeaponImageButton = UIBundle.UIWeaponImageButton;
        `);

        // Warm up
        server.evalCode('(() => { const c = new UIContainer({ x: 0, y: 0, width: 10, height: 10 }); c.delete(); })()');
        server.flushJobs();
    });

    afterEach(() => {
        server.dispose();
    });

    afterAll(() => {
        console.log('\n========================================================================================');
        console.log('             UI MODULE QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
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
                        widgets.push(new UIText({ x: i, y: i, width: 120, height: 30, label: 'Label' }));
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

    it('Scenario 4: Composite Component Hierarchies (500 Composite Buttons)', () => {
        const count = 500;

        const result = server.benchmarkScenario({
            scenario: '4. Composite Component Hierarchies (500 Widgets)',
            entities: count,
            numericCount: count,
            unit: 'composite',
            run: `
                (() => {
                    const m5a3 = mod.Weapons?.M5A3 ?? 1;
                    const medkit = mod.Gadgets?.Medkit ?? 1;
                    const icon = mod.UIImageType?.Icon ?? 1;
                    const compositeWidgets = [];

                    for (let i = 0; i < ${count / 5}; ++i) {
                        compositeWidgets.push(
                            new UITextButton({
                                x: i,
                                y: i,
                                width: 150,
                                height: 40,
                                label: 'Click Me',
                            })
                        );
                        compositeWidgets.push(
                            new UIImageButton({
                                x: i,
                                y: i,
                                width: 50,
                                height: 50,
                                imageType: icon,
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
                        new UIText({ parent: childContainer, x: 60, y: 5, width: 80, height: 20, label: 'D' + depth });
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

    it('Scenario 7: Standalone UIText Lifecycle & Mutations (1,000 texts, 20k label updates)', () => {
        const textCount = 1_000;
        const mutations = 20_000;

        const result = server.benchmarkScenario({
            scenario: '7. Standalone UIText Lifecycle & Mutations',
            entities: `${textCount} texts (${mutations} label writes)`,
            numericCount: textCount,
            unit: 'text',
            run: `
                (() => {
                    const texts = [];
                    for (let i = 0; i < ${textCount}; ++i) {
                        texts.push(new UIText({ x: i, y: i, width: 100, height: 30, label: 'Label ' + i }));
                    }

                    for (let m = 0; m < ${mutations}; ++m) {
                        const t = texts[m % ${textCount}];
                        t.label = 'Update ' + m;
                        t.textSize = 14 + (m % 20);
                        t.textColor = { x: 1, y: 0, z: 0 };
                        t.textAlpha = 0.8;
                    }

                    globalThis.__s7 = texts;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s7.length; ++i) {
                        globalThis.__s7[i].delete();
                    }
                    delete globalThis.__s7;
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 8: Standalone Images Lifecycle & Mutations (1,000 images, 20k mutations)', () => {
        const count = 1_000;
        const mutations = 20_000;

        const result = server.benchmarkScenario({
            scenario: '8. Standalone Image Elements (1,000 Images)',
            entities: `${count} images (${mutations} writes)`,
            numericCount: count,
            unit: 'image',
            run: `
                (() => {
                    const images = [];
                    const ak24 = mod.Weapons?.AK24 ?? 2;
                    const medkit = mod.Gadgets?.Medkit ?? 1;
                    const icon = mod.UIImageType?.Icon ?? 1;

                    for (let i = 0; i < ${count / 4}; ++i) {
                        images.push(new UIImage({ x: i, y: i, width: 32, height: 32, imageType: icon }));
                        images.push(new UIImage({ x: i, y: i, width: 64, height: 64, imageType: icon }));
                        images.push(new UIWeaponImage({ x: i, y: i, width: 120, height: 40, weapon: ak24 }));
                        images.push(new UIGadgetImage({ x: i, y: i, width: 48, height: 48, gadget: medkit }));
                    }

                    for (let m = 0; m < ${mutations}; ++m) {
                        const img = images[m % images.length];
                        if (img instanceof UIImage) {
                            img.imageColor = { x: 0, y: 1, z: 0 };
                            img.imageAlpha = 0.5;
                        }
                        img.x = m % 1920;
                        img.y = m % 1080;
                    }

                    globalThis.__s8 = images;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s8.length; ++i) {
                        globalThis.__s8[i].delete();
                    }
                    delete globalThis.__s8;
                })();
            `,
        });

        benchmarkResults.push(result);
    });

    it('Scenario 9: Content Button State & Styling Churn (500 buttons, 20k toggles)', () => {
        const count = 500;
        const toggles = 20_000;

        const result = server.benchmarkScenario({
            scenario: '9. Content Button State & Styling Churn',
            entities: `${count} buttons (${toggles} toggles)`,
            numericCount: count,
            unit: 'btn',
            run: `
                (() => {
                    const buttons = [];
                    const icon = mod.UIImageType?.Icon ?? 1;

                    for (let i = 0; i < ${count / 2}; ++i) {
                        buttons.push(new UITextButton({
                            x: i,
                            y: i,
                            width: 120,
                            height: 35,
                            label: 'Btn ' + i,
                            textColor: { x: 1, y: 1, z: 1 },
                            textDisabledColor: { x: 0.5, y: 0.5, z: 0.5 },
                        }));
                        buttons.push(new UIImageButton({
                            x: i,
                            y: i,
                            width: 40,
                            height: 40,
                            imageType: icon,
                            imageColor: { x: 1, y: 0, z: 0 },
                            imageDisabledColor: { x: 0.3, y: 0.3, z: 0.3 },
                        }));
                    }

                    for (let t = 0; t < ${toggles}; ++t) {
                        const btn = buttons[t % buttons.length];
                        btn.enabled = t % 2 === 0;
                        if (btn instanceof UITextButton) {
                            btn.textColor = { x: 0.8, y: 0.8, z: 0.8 };
                        } else if (btn instanceof UIImageButton) {
                            btn.imageColor = { x: 0, y: 0.8, z: 0 };
                        }
                    }

                    globalThis.__s9 = buttons;
                })();
            `,
            cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s9.length; ++i) {
                        globalThis.__s9[i].delete();
                    }
                    delete globalThis.__s9;
                })();
            `,
        });

        benchmarkResults.push(result);
    });
});
