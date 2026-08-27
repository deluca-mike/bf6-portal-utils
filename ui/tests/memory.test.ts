import './mockMod.ts';
import { PerformanceObserver } from 'node:perf_hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UI } from '../index.ts';
import { UIContainer } from '../components/container/index.ts';
import { UIButton } from '../components/button/index.ts';
import { UIText } from '../components/text/index.ts';
import { UIImage } from '../components/image/index.ts';
import { UIWeaponImageButton } from '../components/weapon-image-button/index.ts';
import { UITextButton } from '../components/text-button/index.ts';
import { UIGadgetImageButton } from '../components/gadget-image-button/index.ts';
import { UIContainerButton } from '../components/container-button/index.ts';
import { resetMockState } from './mockMod.ts';

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

describe('UI Module & Components Memory & Garbage Collection Profiling', () => {
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

    beforeEach(() => {
        resetMockState();
    });

    afterEach(() => {
        for (const child of [...(UI.ROOT_NODE.children ?? [])]) {
            child.delete();
        }
    });

    afterAll(() => {
        if (obs) obs.disconnect();

        console.log('\n========================================================================================');
        console.log(
            `                     UI MODULE MEMORY & GC PROFILING REPORT ${typeof global.gc === 'function' ? '(--expose-gc enabled)' : '(automatic V8 GC)'}`
        );
        console.log('========================================================================================');
        console.table(benchmarkResults);
        console.log('========================================================================================\n');
    });

    it('Scenario 1: Massive Static Widget Grid (1,000 Core Widgets)', () => {
        const count = 1_000;
        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const widgets: UI.Element[] = [];

        // Allocate 250 Containers, 250 Buttons, 250 Texts, 250 Images
        for (let i = 0; i < count / 4; ++i) {
            widgets.push(new UIContainer({ x: i, y: i, width: 100, height: 100 }));
            widgets.push(new UIButton({ x: i, y: i, width: 80, height: 40 }));
            widgets.push(new UIText({ x: i, y: i, width: 120, height: 30, message: 'Label' }));
            widgets.push(new UIImage({ x: i, y: i, width: 64, height: 64 }));
        }

        const allocatedHeap = getHeapUsed();
        const allocatedDelta = allocatedHeap - initialHeap;

        // Delete all widgets
        for (let i = 0; i < widgets.length; ++i) {
            widgets[i].delete();
        }
        widgets.length = 0;

        const postCleanupHeap = getHeapUsed();
        const drift = postCleanupHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '1. Massive Static Grid (1,000 Widgets)',
            Entities: count,
            'Heap Delta': formatBytes(allocatedDelta),
            'Per-Item': `${(allocatedDelta / count).toFixed(1)} B/widget`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(150 * 1024);
        }
    });

    it('Scenario 2: High-Frequency Coordinate & Dimension Mutations (50,000 in-place writes)', () => {
        const widgetCount = 100;
        const mutations = 50_000;

        const widgets: UI.Element[] = [];
        for (let i = 0; i < widgetCount; ++i) {
            widgets.push(new UIContainer({ x: 0, y: 0, width: 100, height: 100 }));
        }

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        // 50,000 in-place Float32Array coordinate mutations (zero vector allocation)
        for (let m = 0; m < mutations; ++m) {
            const w = widgets[m % widgetCount];
            w.x = m % 1920;
            w.y = (m * 2) % 1080;
            w.width = 100 + (m % 50);
            w.height = 50 + (m % 30);
            w.visible = m % 2 === 0;
            w.depth = m % 10;
        }

        const endHeap = getHeapUsed();
        const drift = endHeap - initialHeap;

        for (let i = 0; i < widgets.length; ++i) {
            widgets[i].delete();
        }

        benchmarkResults.push({
            Scenario: '2. Coordinate & Dimension Mutations (50k writes)',
            Entities: `${mutations} writes`,
            'Heap Delta': formatBytes(drift),
            'Per-Item': `${(drift / mutations).toFixed(2)} B/write`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(150 * 1024);
        }
    });

    it('Scenario 3: Interactive Button Slot Allocation & Handler Churn (2,000 Button cycles)', () => {
        const cycles = 2_000;
        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const clickHandler = () => {};

        // Repeatedly allocate, attach callbacks, and delete buttons to test button slot bit-packing
        for (let c = 0; c < cycles; ++c) {
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

        const endHeap = getHeapUsed();
        const drift = endHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '3. Button Slot Allocation & Free-List Churn',
            Entities: `${cycles} cycles`,
            'Heap Delta': formatBytes(drift),
            'Per-Item': `${(drift / cycles).toFixed(2)} B/cycle`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(100 * 1024);
        }
    });

    it('Scenario 4: Composite Component Hierarchies (400 Composite Buttons)', () => {
        const count = 400;
        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const m5a3 = (mod.Weapons as unknown as { M5A3: mod.Weapons })?.M5A3 ?? (1 as unknown as mod.Weapons);
        const medkit = (mod.Gadgets as unknown as { Medkit: mod.Gadgets })?.Medkit ?? (1 as unknown as mod.Gadgets);

        const compositeWidgets: UI.Element[] = [];

        for (let i = 0; i < count / 4; ++i) {
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

        const allocatedHeap = getHeapUsed();
        const peakDelta = allocatedHeap - initialHeap;

        // Delete all composite widgets (cascading through SoA free-lists)
        for (let i = 0; i < compositeWidgets.length; ++i) {
            compositeWidgets[i].delete();
        }
        compositeWidgets.length = 0;

        const postCleanupHeap = getHeapUsed();
        const drift = postCleanupHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '4. Composite Component Hierarchies (400 Widgets)',
            Entities: count,
            'Heap Delta': formatBytes(peakDelta),
            'Per-Item': `${(peakDelta / count).toFixed(1)} B/composite`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(150 * 1024);
        }
    });

    it('Scenario 5: Tree Traversal & Hierarchy Inspection (20,000 forEachChild passes)', () => {
        // Build a 5-level deep nested tree
        const rootContainer = new UIContainer({ x: 0, y: 0, width: 800, height: 600 });
        let currentParent: UI.Element = rootContainer;

        for (let depth = 0; depth < 5; ++depth) {
            const childContainer = new UIContainer({ parent: currentParent, x: 10, y: 10, width: 200, height: 100 });
            new UIButton({ parent: childContainer, x: 5, y: 5, width: 50, height: 20 });
            new UIText({ parent: childContainer, x: 60, y: 5, width: 80, height: 20, message: `D${depth}` });
            currentParent = childContainer;
        }

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        const traversals = 20_000;
        let visitedCount = 0;

        // Traverse via forEachChild (zero heap allocations, traverses singly-linked _nextSibling buffer)
        for (let t = 0; t < traversals; ++t) {
            rootContainer.forEachChild((child) => {
                visitedCount++;
                child.forEachChild(() => {
                    visitedCount++;
                });
            });
        }

        const endHeap = getHeapUsed();
        const drift = endHeap - initialHeap;

        rootContainer.delete();

        benchmarkResults.push({
            Scenario: '5. Zero-Alloc Tree Traversal (20k passes)',
            Entities: `${traversals} passes`,
            'Heap Delta': formatBytes(drift),
            'Per-Item': `${(drift / traversals).toFixed(2)} B/pass`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(getHeapUsed() - initialHeap),
        });

        expect(visitedCount).toBeGreaterThan(0);
        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(50 * 1024);
        }
    });

    it('Scenario 6: Rapid Menu Lifecycle (100 Open/Close cycles of 20 widgets)', () => {
        const cycles = 100;
        const widgetsPerMenu = 20;

        const initialHeap = getHeapUsed();
        const startGCCount = gcCount;
        const startGCTime = gcTimeMs;

        for (let c = 0; c < cycles; ++c) {
            const menuContainer = new UIContainer({ x: 100, y: 100, width: 400, height: 300 });

            for (let i = 0; i < widgetsPerMenu - 1; ++i) {
                new UIButton({
                    parent: menuContainer,
                    x: 10,
                    y: i * 15,
                    width: 100,
                    height: 12,
                    onClickUp: () => {},
                });
            }

            // Close/destroy menu
            menuContainer.delete();
        }

        const endHeap = getHeapUsed();
        const drift = endHeap - initialHeap;

        benchmarkResults.push({
            Scenario: '6. Rapid Menu Lifecycle (100 Open/Close Cycles)',
            Entities: `${cycles} cycles (${cycles * widgetsPerMenu} widgets)`,
            'Heap Delta': formatBytes(drift),
            'Per-Item': `${(drift / cycles).toFixed(1)} B/cycle`,
            'GC Runs': gcCount - startGCCount,
            'GC Pause (ms)': (gcTimeMs - startGCTime).toFixed(2),
            'Drift After Cleanup': formatBytes(drift),
        });

        if (typeof global.gc === 'function') {
            expect(drift).toBeLessThan(100 * 1024);
        }
    });
});
