import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    bundleModule,
    createQuickJSServerContext,
    type QuickJSBenchmarkResult,
    type QuickJSServerInstance,
} from '../../tests/quickjs-harness.ts';

const benchmarkResults: QuickJSBenchmarkResult[] = [];

describe(
    'Spatial Module QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)',
    { timeout: 30_000 },
    () => {
        let bundleCode: string;
        let server: QuickJSServerInstance;

        beforeAll(async () => {
            const bundlePath = resolve(__dirname, 'bundleEntry.ts');
            bundleCode = await bundleModule(bundlePath, 'SpatialBundle');
        });

        beforeEach(async () => {
            server = await createQuickJSServerContext();
            server.evalCode(`
            ${bundleCode}
            globalThis.Spatial = SpatialBundle.Spatial;
            globalThis.SpatialNode = SpatialBundle.Spatial.SpatialNode;
            globalThis.SpatialElement = SpatialBundle.Spatial.SpatialElement;
            globalThis.Empty = SpatialBundle.Spatial.Empty;
            globalThis.Runtime = SpatialBundle.Spatial.Runtime;
            globalThis.Existing = SpatialBundle.Spatial.Existing;
        `);

            // Warm up QuickJS compiler/runtime
            server.evalCode('(() => { const e = new Empty({ position: { x: 0, y: 0, z: 0 } }); e.delete(); })()');
            server.flushJobs();
        });

        afterEach(() => {
            server.dispose();
        });

        afterAll(() => {
            console.log('\n========================================================================================');
            console.log('            SPATIAL MODULE QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
            console.log('========================================================================================');
            console.table(benchmarkResults);
            console.log('========================================================================================\n');
        });

        it('Scenario 1: Massive Static Hierarchy (1,000 OOP Facade Elements)', () => {
            const count = 1_000;
            const result = server.benchmarkScenario({
                scenario: '1. Massive Static Hierarchy (1k OOP Elements)',
                entities: count,
                numericCount: count,
                unit: 'element',
                run: `
                (() => {
                    const roots = [];
                    for (let r = 0; r < 100; ++r) {
                        const root = new Empty({ position: { x: r * 10, y: 0, z: 0 } });
                        for (let c = 0; c < 9; ++c) {
                            new Empty({ parent: root, position: { x: c, y: c, z: c } });
                        }
                        roots.push(root);
                    }
                    globalThis.__s1 = roots;
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

        it('Scenario 2: Raw ID Bypass Saturation (1,000 Zero-Heap Nodes)', () => {
            const count = 1_000;
            const result = server.benchmarkScenario({
                scenario: '2. Raw ID Bypass Saturation (1k Zero-Heap Nodes)',
                entities: count,
                numericCount: count,
                unit: 'node',
                run: `
                (() => {
                    const ids = [];
                    for (let i = 0; i < ${count}; ++i) {
                        const id = Spatial.createEmptyId({ position: { x: i, y: 0, z: 0 } });
                        if (id !== null) ids.push(id);
                    }
                    globalThis.__s2 = ids;
                })();
            `,
                cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s2.length; ++i) {
                        Spatial.deleteNode(globalThis.__s2[i]);
                    }
                    delete globalThis.__s2;
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 3: High-Frequency Transform Mutations (50,000 in-place writes)', () => {
            const nodeCount = 50;
            const mutations = 50_000;

            const result = server.benchmarkScenario({
                scenario: '3. Transform Mutations (50k in-place writes)',
                entities: `${mutations} writes`,
                numericCount: mutations,
                unit: 'write',
                run: `
                (() => {
                    const elements = [];
                    for (let i = 0; i < ${nodeCount}; ++i) {
                        elements.push(new Empty({ position: { x: i, y: 0, z: 0 } }));
                    }

                    for (let m = 0; m < ${mutations}; ++m) {
                        const elem = elements[m % ${nodeCount}];
                        elem.localPosition = { x: m % 100, y: (m * 2) % 100, z: (m * 3) % 100 };
                        elem.localRotationEuler = { x: 0, y: (m * 0.01) % 6.28, z: 0 };
                        elem.localScale = 1 + (m % 5);
                        elem.worldPosition = { x: 50, y: 50, z: 50 };
                        elem.worldScale = 2;
                    }

                    for (let i = 0; i < elements.length; ++i) {
                        elements[i].delete();
                    }
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 4: Motion Controllers Stress (Orbit Controller - 500 active orbiters, 250 ticks)', () => {
            const count = 500;
            const ticks = 250;

            const result = server.benchmarkScenario({
                scenario: '4. Orbit Controllers (500 orbiters, 250 ticks)',
                entities: `${count} orbiters`,
                numericCount: count,
                unit: 'orbit',
                run: `
                (() => {
                    const center = new Empty({ position: { x: 0, y: 0, z: 0 } });
                    const orbiters = [];

                    for (let i = 0; i < ${count}; ++i) {
                        const orb = new Empty({
                            parent: center,
                            position: { x: 5 + (i % 20), y: 0, z: 0 },
                        });
                        orb.setOrbit({
                            axis: { x: 0, y: 1, z: 0 },
                            speedRadPerSec: 1.5,
                            faceTangent: true,
                            selfSpinSpeedRadPerSec: 3.0,
                        });
                        orbiters.push(orb);
                    }

                    // Simulate 250 tick updates (steady state execution)
                    for (let t = 0; t < ${ticks}; ++t) {
                        Spatial.update(16.6);
                    }

                    globalThis.__s4 = { center, orbiters };
                })();
            `,
                cleanup: `
                (() => {
                    globalThis.__s4.center.delete();
                    delete globalThis.__s4;
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(200);
        });

        it('Scenario 5: Motion Controllers Stress (LookAt & Follow - 500 active trackers, 250 ticks)', () => {
            const count = 500;
            const ticks = 250;

            const result = server.benchmarkScenario({
                scenario: '5. LookAt & Follow Trackers (500 nodes, 250 ticks)',
                entities: `${count} trackers`,
                numericCount: count,
                unit: 'tracker',
                run: `
                (() => {
                    const targetNode = new Empty({ position: { x: 100, y: 50, z: 100 } });
                    const trackers = [];

                    // 250 LookAt trackers
                    for (let i = 0; i < ${count / 2}; ++i) {
                        const elem = new Empty({ position: { x: i * 2, y: 0, z: 0 } });
                        elem.setLookAt({
                            target: targetNode,
                        });
                        trackers.push(elem);
                    }

                    // 250 Follow trackers with rotation and yawOnly filtering
                    for (let i = 0; i < ${count / 2}; ++i) {
                        const elem = new Empty({ position: { x: 0, y: 0, z: i * 2 } });
                        elem.setFollow({
                            target: targetNode,
                            offset: { x: 0, y: 2, z: -5 },
                            trackRotation: true,
                            yawOnly: true,
                            smoothing: 8,
                        });
                        trackers.push(elem);
                    }

                    // Simulate 250 tick updates
                    for (let t = 0; t < ${ticks}; ++t) {
                        targetNode.localPosition = { x: 100 + Math.sin(t * 0.1) * 20, y: 50, z: 100 + Math.cos(t * 0.1) * 20 };
                        Spatial.update(16.6);
                    }

                    globalThis.__s5 = { targetNode, trackers };
                })();
            `,
                cleanup: `
                (() => {
                    globalThis.__s5.targetNode.delete();
                    for (let i = 0; i < globalThis.__s5.trackers.length; ++i) {
                        globalThis.__s5.trackers[i].delete();
                    }
                    delete globalThis.__s5;
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(200);
        });

        it('Scenario 6: Motion Controllers Stress (Kinematics - 500 ballistic nodes, 250 ticks)', () => {
            const count = 500;
            const ticks = 250;

            const result = server.benchmarkScenario({
                scenario: '6. Kinematics Simulation (500 ballistic nodes, 250 ticks)',
                entities: `${count} bodies`,
                numericCount: count,
                unit: 'body',
                run: `
                (() => {
                    const bodies = [];

                    for (let i = 0; i < ${count}; ++i) {
                        const elem = new Empty({ position: { x: i, y: 100, z: 0 } });
                        elem.setKinematics({
                            linearVelocity: { x: (i % 10) - 5, y: 25, z: 10 },
                            linearAcceleration: { x: 0, y: -9.81, z: 0 },
                            angularVelocity: { x: 0, y: 1.5, z: 0 },
                            angularAcceleration: { x: 0, y: 0.1, z: 0 },
                        });
                        bodies.push(elem);
                    }

                    // Simulate 250 physics integration ticks
                    for (let t = 0; t < ${ticks}; ++t) {
                        Spatial.update(16.6);
                    }

                    globalThis.__s6 = bodies;
                })();
            `,
                cleanup: `
                (() => {
                    for (let i = 0; i < globalThis.__s6.length; ++i) {
                        globalThis.__s6[i].delete();
                    }
                    delete globalThis.__s6;
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(200);
        });

        it('Scenario 7: Free-List Churn & Generational Recycling (5,000 Allocation Cycles)', () => {
            const cycles = 5_000;

            const result = server.benchmarkScenario({
                scenario: '7. Free-List Churn & Generational Recycling',
                entities: `${cycles} cycles`,
                numericCount: cycles,
                unit: 'cycle',
                run: `
                (() => {
                    for (let c = 0; c < ${cycles}; ++c) {
                        const elem = new Empty({
                            position: { x: c % 100, y: 0, z: 0 },
                            scale: 2,
                        });
                        elem.translateLocal({ x: 1, y: 2, z: 3 });
                        elem.delete();
                    }
                })();
            `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });
    }
);
