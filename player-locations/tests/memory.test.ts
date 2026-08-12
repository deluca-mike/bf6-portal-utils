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
    'PlayerLocations QuickJS Runtime Memory & ARC Profiling (BF6 Portal C++ Simulation)',
    { timeout: 60_000 },
    () => {
        let bundleCode: string;
        let server: QuickJSServerInstance;

        beforeAll(async () => {
            const bundlePath = resolve(__dirname, 'bundleEntry.ts');
            bundleCode = await bundleModule(bundlePath, 'PlayerLocationsBundle');
        });

        beforeEach(async () => {
            server = await createQuickJSServerContext();
            server.evalCode(`
                ${bundleCode}
                globalThis.Events = PlayerLocationsBundle.Events;
                globalThis.PlayerLocations = PlayerLocationsBundle.PlayerLocations;
                mod.__initPlayers(100);
            `);

            // Warm up QuickJS compiler/runtime
            server.evalCode('(() => { Events.OngoingGlobal.trigger(); })()');
            server.flushJobs();
        });

        afterEach(() => {
            server.dispose();
        });

        afterAll(() => {
            console.log('\n========================================================================================');
            console.log('         PLAYER LOCATIONS QUICKJS / BF6 PORTAL ARC MEMORY PROFILING REPORT');
            console.log('========================================================================================');
            console.table(benchmarkResults);
            console.log('========================================================================================\n');
        });

        it('Scenario 1: 1-Hour Match Server Ticking (100 Active Players @ 60Hz, 216,000 Ticks)', () => {
            const ticks = 216_000;
            const result = server.benchmarkScenario({
                scenario: '1. 1-Hour Match Steady-State (216k Ticks @ 60Hz)',
                entities: `${ticks} ticks (100 players)`,
                numericCount: ticks,
                unit: 'tick',
                run: `
                    (() => {
                        for (let t = 0; t < ${ticks}; ++t) {
                            Events.OngoingGlobal.trigger();
                        }
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 2: High-Frequency Spatial Range Query Saturation (100,000 Queries on 100 Players)', () => {
            const queries = 100_000;
            const result = server.benchmarkScenario({
                scenario: '2. Spatial Range Query Saturation (100k Queries)',
                entities: `${queries} queries`,
                numericCount: queries,
                unit: 'query',
                run: `
                    (() => {
                        let totalFound = 0;
                        for (let q = 0; q < ${queries}; ++q) {
                            const cx = (q * 13) % 400 - 200;
                            const cy = 10 + (q % 30);
                            const cz = (q * 29) % 400 - 200;
                            const radius = 50 + (q % 50);

                            // 1. Sphere query
                            const inSphere = PlayerLocations.getPlayersInSphere(cx, cy, cz, radius);
                            totalFound += inSphere.length;

                            // 2. Cylinder query
                            const inCyl = PlayerLocations.getPlayersInCylinder(cx, cz, radius, 0, 50);
                            totalFound += inCyl.length;

                            // 3. AABB query
                            const inAabb = PlayerLocations.getPlayersInAABB(cx - 50, 0, cz - 50, cx + 50, 50, cz + 50);
                            totalFound += inAabb.length;

                            // 4. Directional planes
                            const above = PlayerLocations.getPlayersAbove(20);
                            totalFound += above.length;
                        }
                        globalThis.__s2_found = totalFound;
                    })();
                `,
                cleanup: `
                    (() => {
                        delete globalThis.__s2_found;
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 3: K-Nearest Neighbor & Extrema Query Saturation (50,000 Queries on 100 Players)', () => {
            const queries = 50_000;
            const result = server.benchmarkScenario({
                scenario: '3. K-NN & Extrema Query Saturation (50k Queries)',
                entities: `${queries} queries`,
                numericCount: queries,
                unit: 'query',
                run: `
                    (() => {
                        let checkSum = 0;
                        const filterEven = (id) => (id & 1) === 0;

                        for (let q = 0; q < ${queries}; ++q) {
                            const cx = (q * 7) % 300 - 150;
                            const cy = (q * 11) % 50;
                            const cz = (q * 19) % 300 - 150;

                            const closest5 = PlayerLocations.getKClosestPlayers(cx, cy, cz, 5);
                            const farthest5 = PlayerLocations.getKFarthestPlayers(cx, cy, cz, 5);
                            const highest3 = PlayerLocations.getKHighestPlayers(3);
                            const lowest3 = PlayerLocations.getKLowestPlayers(3, filterEven);
                            const closest1 = PlayerLocations.getClosestPlayer(cx, cy, cz);
                            const highest1 = PlayerLocations.getHighestPlayer();

                            checkSum +=
                                closest5.length +
                                farthest5.length +
                                highest3.length +
                                lowest3.length +
                                (closest1 !== null ? closest1 : 0) +
                                (highest1 !== null ? highest1 : 0);
                        }
                        globalThis.__s3_sum = checkSum;
                    })();
                `,
                cleanup: `
                    (() => {
                        delete globalThis.__s3_sum;
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 4: Massive Reactive Spatial Zone Subscriptions (500 Active Zones, 100 Players, 500 Ticks)', () => {
            const zoneCount = 500;
            const ticks = 500;
            const result = server.benchmarkScenario({
                scenario: '4. Massive Reactive Zones (500 Zones, 500 Ticks)',
                entities: `${zoneCount} zones`,
                numericCount: zoneCount,
                unit: 'zone',
                run: `
                    (() => {
                        const handles = [];
                        let enterCount = 0;
                        let exitCount = 0;
                        const onEnter = (id) => {
                            ++enterCount;
                        };
                        const onExit = (id) => {
                            ++exitCount;
                        };

                        // 100 Sphere Zones
                        for (let i = 0; i < 100; ++i) {
                            handles.push(PlayerLocations.onSphere(i * 10 - 500, 10, i * 10 - 500, 50, onEnter, onExit));
                        }

                        // 100 Cylinder Zones
                        for (let i = 0; i < 100; ++i) {
                            handles.push(
                                PlayerLocations.onCylinder(i * 10 - 500, i * 10 - 500, 60, -50, 100, onEnter, onExit)
                            );
                        }

                        // 100 AABB Zones
                        for (let i = 0; i < 100; ++i) {
                            handles.push(
                                PlayerLocations.onAABB(
                                    i * 8 - 400,
                                    0,
                                    i * 8 - 400,
                                    i * 8 - 350,
                                    50,
                                    i * 8 - 350,
                                    onEnter,
                                    onExit
                                )
                            );
                        }

                        // 100 Prism Zones (5 vertices each)
                        for (let i = 0; i < 100; ++i) {
                            const cx = i * 10 - 500;
                            const cz = i * 10 - 500;
                            const poly = [
                                { x: cx - 20, z: cz - 20 },
                                { x: cx + 20, z: cz - 20 },
                                { x: cx + 30, z: cz },
                                { x: cx + 20, z: cz + 20 },
                                { x: cx - 20, z: cz + 20 },
                            ];
                            const h = PlayerLocations.onPrism(poly, -20, 80, onEnter, onExit);
                            if (h) handles.push(h);
                        }

                        // 100 Directional Plane Zones (Altitude & East/West)
                        for (let i = 0; i < 50; ++i) {
                            handles.push(PlayerLocations.onCrossAltitude(i * 2, onEnter, onExit));
                            handles.push(PlayerLocations.onCrossEastWest(i * 10 - 250, onEnter, onExit));
                        }

                        // Simulate 500 ticks with 100 players moving
                        for (let t = 0; t < ${ticks}; ++t) {
                            for (let p = 0; p < 100; ++p) {
                                mod.__setPlayer(
                                    p,
                                    Math.sin(t * 0.05 + p) * 300,
                                    10 + Math.cos(t * 0.05 + p) * 20,
                                    Math.cos(t * 0.05 + p) * 300,
                                    true
                                );
                            }
                            Events.OngoingGlobal.trigger();
                        }

                        globalThis.__s4 = { handles, enterCount, exitCount };
                    })();
                `,
                cleanup: `
                    (() => {
                        for (let i = 0; i < globalThis.__s4.handles.length; ++i) {
                            globalThis.__s4.handles[i].unsubscribe();
                        }
                        delete globalThis.__s4;
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(200);
        });

        it('Scenario 5: Reactive Zone Subscription Churn & Handle Lifecycle (2,000 Dynamic Zones)', () => {
            const cycles = 2_000;
            const result = server.benchmarkScenario({
                scenario: '5. Dynamic Zone Churn & Handle Lifecycle (2k Cycles)',
                entities: `${cycles} cycles`,
                numericCount: cycles,
                unit: 'cycle',
                run: `
                    (() => {
                        const noop = () => {};
                        for (let c = 0; c < ${cycles}; ++c) {
                            // Create Sphere
                            const sphere = PlayerLocations.onSphere(c % 100, 10, c % 100, 50, noop, noop);
                            sphere.update((c + 10) % 100, 15, (c + 10) % 100, 60);

                            // Create Cylinder
                            const cyl = PlayerLocations.onCylinder(c % 100, c % 100, 40, 0, 50, noop, noop);
                            cyl.update((c + 5) % 100, (c + 5) % 100, 50, -10, 60);

                            // Create AABB
                            const aabb = PlayerLocations.onAABB(0, 0, 0, 50, 50, 50, noop, noop);
                            aabb.update(10, 10, 10, 60, 60, 60);

                            // Create Prism
                            const prism = PlayerLocations.onPrism(
                                [
                                    { x: 0, z: 0 },
                                    { x: 50, z: 0 },
                                    { x: 25, z: 50 },
                                ],
                                0,
                                50,
                                noop,
                                noop
                            );
                            if (prism) {
                                prism.update(
                                    [
                                        { x: 10, z: 10 },
                                        { x: 60, z: 10 },
                                        { x: 35, z: 60 },
                                    ],
                                    -10,
                                    60
                                );
                            }

                            // Create Plane
                            const plane = PlayerLocations.onCrossAltitude(25, noop, noop);
                            plane.update(30);

                            // Evaluate 1 tick
                            Events.OngoingGlobal.trigger();

                            // Dispose immediately
                            sphere.unsubscribe();
                            cyl.unsubscribe();
                            aabb.unsubscribe();
                            if (prism) prism.unsubscribe();
                            plane.unsubscribe();
                        }
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 6: Reactive Extrema Trackers & Rapid Identity Flips (100 Trackers, 1,000 Ticks)', () => {
            const trackerCount = 100;
            const ticks = 1_000;
            const result = server.benchmarkScenario({
                scenario: '6. Extrema Trackers & Leader Flips (100 Trackers, 1k Ticks)',
                entities: `${trackerCount} trackers`,
                numericCount: trackerCount,
                unit: 'tracker',
                run: `
                    (() => {
                        const handles = [];
                        let flipCount = 0;
                        const onExtrema = (newId, prevId) => {
                            ++flipCount;
                        };

                        // 25 Highest & 25 Lowest listeners
                        for (let i = 0; i < 25; ++i) {
                            handles.push(PlayerLocations.onHighestPlayerChanged(onExtrema));
                            handles.push(PlayerLocations.onLowestPlayerChanged(onExtrema));
                        }

                        // 25 Closest & 25 Farthest listeners to distinct targets
                        for (let i = 0; i < 25; ++i) {
                            const tx = i * 20 - 250;
                            const ty = 15;
                            const tz = i * 20 - 250;
                            handles.push(PlayerLocations.onClosestPlayerChanged(tx, ty, tz, onExtrema));
                            handles.push(PlayerLocations.onFarthestPlayerChanged(tx, ty, tz, onExtrema));
                        }

                        // Simulate 1,000 ticks with aggressive position swaps causing continuous leader flips
                        for (let t = 0; t < ${ticks}; ++t) {
                            const highPlayer = t % 100;
                            const lowPlayer = (t + 50) % 100;
                            mod.__setPlayer(highPlayer, 0, 1000 + (t % 100), 0, true);
                            mod.__setPlayer(lowPlayer, 0, -500 - (t % 100), 0, true);

                            Events.OngoingGlobal.trigger();
                        }

                        globalThis.__s6 = { handles, flipCount };
                    })();
                `,
                cleanup: `
                    (() => {
                        for (let i = 0; i < globalThis.__s6.handles.length; ++i) {
                            globalThis.__s6.handles[i].unsubscribe();
                        }
                        delete globalThis.__s6;
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(50);
        });

        it('Scenario 7: Player Lifecycle Turnover & Origin Inactive Cycling (5,000 Player Cycles)', () => {
            const cycles = 5_000;
            const result = server.benchmarkScenario({
                scenario: '7. Player Churn & Origin Inactive Cycles (5k Cycles)',
                entities: `${cycles} cycles`,
                numericCount: cycles,
                unit: 'cycle',
                run: `
                    (() => {
                        // Register 10 test zones to verify bitmask clearing upon player leaves/deaths
                        const dummyZones = [];
                        for (let z = 0; z < 10; ++z) {
                            dummyZones.push(PlayerLocations.onSphere(0, 0, 0, 500, () => {}, () => {}));
                        }

                        for (let c = 0; c < ${cycles}; ++c) {
                            const slot = c % 100;

                            // 1. Player joins
                            Events.OnPlayerJoinGame.trigger({ _id: slot });

                            // 2. Player spawns at active coordinates
                            mod.__setPlayer(slot, 100 + (c % 50), 20, 100 + (c % 50), true);
                            Events.OngoingGlobal.trigger();

                            // 3. Player dies / undeploys (moves to origin < 1mm)
                            mod.__setPlayer(slot, 0.0001, 0.0001, 0.0001, true);
                            Events.OngoingGlobal.trigger();

                            // 4. Player leaves game
                            Events.OnPlayerLeaveGame.trigger(slot);
                            mod.__setPlayer(slot, 0, 0, 0, false);
                            Events.OngoingGlobal.trigger();
                        }

                        for (let z = 0; z < dummyZones.length; ++z) {
                            dummyZones[z].unsubscribe();
                        }
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Per-Item']).toBeDefined();
        });

        it('Scenario 8: Complex 32-Vertex Polygonal Prism Saturation & In-Place Updates (200 Prisms, 10,000 Mutations)', () => {
            const prismCount = 200;
            const mutations = 10_000;
            const result = server.benchmarkScenario({
                scenario: '8. 32-Vertex Prism Saturation (200 Prisms, 10k Writes)',
                entities: `${prismCount} prisms (${mutations} writes)`,
                numericCount: prismCount,
                unit: 'prism',
                run: `
                    (() => {
                        // Generate 32-vertex circle polygon
                        function make32Polygon(cx, cz, radius) {
                            const poly = [];
                            for (let v = 0; v < 32; ++v) {
                                const angle = (v / 32) * Math.PI * 2;
                                poly.push({
                                    x: cx + Math.cos(angle) * radius,
                                    z: cz + Math.sin(angle) * radius,
                                });
                            }
                            return poly;
                        }

                        const prisms = [];
                        for (let i = 0; i < ${prismCount}; ++i) {
                            const poly = make32Polygon(((i * 10) % 500) - 250, ((i * 15) % 500) - 250, 40);
                            const handle = PlayerLocations.onPrism(poly, -100, 100, () => {}, () => {});
                            if (handle) prisms.push(handle);
                        }

                        // 10,000 in-place vertex mutations
                        for (let m = 0; m < ${mutations}; ++m) {
                            const p = prisms[m % prisms.length];
                            const newRadius = 30 + (m % 30);
                            const newPoly = make32Polygon(((m * 3) % 400) - 200, ((m * 7) % 400) - 200, newRadius);
                            p.update(newPoly, -50 + (m % 20), 150 + (m % 20));
                        }

                        // 10 ticks of spatial evaluation
                        for (let t = 0; t < 10; ++t) {
                            Events.OngoingGlobal.trigger();
                        }

                        globalThis.__s8 = prisms;
                    })();
                `,
                cleanup: `
                    (() => {
                        for (let i = 0; i < globalThis.__s8.length; ++i) {
                            globalThis.__s8[i].unsubscribe();
                        }
                        delete globalThis.__s8;
                    })();
                `,
            });

            benchmarkResults.push(result);
            expect(result['Live Objs Delta']).toBeGreaterThan(100);
        });
    }
);
