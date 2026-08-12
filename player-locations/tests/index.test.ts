import { beforeAll, describe, expect, it } from 'vitest';
import { PortalTestHarness } from './harness.ts';

const harness = new PortalTestHarness();

import { PlayerLocations } from '../index.ts';
import { createDefaultFixture, GroundTruth, type TestFixtureData } from './fixture.ts';

describe('PlayerLocations Integration Tests', () => {
    let fixture: TestFixtureData;

    beforeAll(() => {
        fixture = createDefaultFixture();

        for (const p of fixture.players) {
            harness.setPlayer(p.id, p);
        }

        PlayerLocations.initialize();

        // Trigger tick to initialize and sort all spatial structures
        harness.stepTick();
    });

    describe('1. Lifecycle, Connection & Origin Filtering', () => {
        it('should correctly report initialization status and remain idempotent', () => {
            expect(PlayerLocations.isInitialized()).toBe(true);
            expect(() => PlayerLocations.initialize()).not.toThrow();
            expect(PlayerLocations.isInitialized()).toBe(true);
        });

        it('should correctly register connected vs disconnected player counts', () => {
            expect(PlayerLocations.getConnectedPlayerCount()).toBe(90);
            expect(PlayerLocations.getActivePlayerCount()).toBe(80);
        });

        it('should correctly identify connected status for all 100 slots', () => {
            for (const id of fixture.connectedIds) {
                expect(PlayerLocations.isPlayerConnected(id)).toBe(true);
            }

            for (const id of fixture.disconnectedIds) {
                expect(PlayerLocations.isPlayerConnected(id)).toBe(false);
                expect(PlayerLocations.isPlayerActive(id)).toBeUndefined();
                expect(PlayerLocations.getPosition(id)).toBeUndefined();
                expect(PlayerLocations.isPlayerInSphere(id, 0, 0, 0, 1000)).toBeUndefined();
            }
        });

        it('should filter out inactive near-origin players (< 1mm tolerance)', () => {
            for (const id of fixture.inactiveOriginIds) {
                expect(PlayerLocations.isPlayerConnected(id)).toBe(true);
                expect(PlayerLocations.isPlayerActive(id)).toBe(false);
                expect(PlayerLocations.getPosition(id)).toBeNull();
            }

            for (const id of fixture.activeIds) {
                expect(PlayerLocations.isPlayerConnected(id)).toBe(true);
                expect(PlayerLocations.isPlayerActive(id)).toBe(true);
                expect(PlayerLocations.getPosition(id)).not.toBeNull();
            }
        });

        it('should return correct connected and active player ID lists and counts', () => {
            expect(PlayerLocations.findConnectedPlayers()).toBe(90);
            const connectedIds: number[] = [];
            const connectedPlayers: mod.Player[] = [];
            const connectedCount = PlayerLocations.findConnectedPlayers(undefined, connectedIds, connectedPlayers);
            expect(connectedCount).toBe(90);
            expect(connectedIds.length).toBe(90);
            expect(connectedPlayers.length).toBe(90);

            // Test findConnectedPlayers with filterFn
            const filterEvenConnected = (_player: mod.Player, id: number) => (id & 1) === 0;
            const evenConnectedIds: number[] = [];
            const evenConnectedPlayers: mod.Player[] = [];
            const evenConnectedCount = PlayerLocations.findConnectedPlayers(
                filterEvenConnected,
                evenConnectedIds,
                evenConnectedPlayers
            );
            expect(evenConnectedCount).toBe(evenConnectedIds.length);
            expect(evenConnectedPlayers.length).toBe(evenConnectedCount);
            expect(evenConnectedIds.every((id) => (id & 1) === 0)).toBe(true);

            for (const id of fixture.connectedIds) {
                expect(connectedIds).toContain(id);
                expect(PlayerLocations.getPlayer(id)).toBeDefined();
                expect(PlayerLocations.getPlayerId(id)).toBe(id);
            }

            expect(PlayerLocations.findActivePlayers()).toBe(80);
            const activeIds: number[] = [];
            const activePlayers: mod.Player[] = [];
            const activeCount = PlayerLocations.findActivePlayers(undefined, activeIds, activePlayers);
            expect(activeCount).toBe(80);
            expect(activeIds.length).toBe(80);
            expect(activePlayers.length).toBe(80);

            // Test findActivePlayers with filterFn
            const evenActiveIds: number[] = [];
            const evenActivePlayers: mod.Player[] = [];
            const evenActiveCount = PlayerLocations.findActivePlayers(
                filterEvenConnected,
                evenActiveIds,
                evenActivePlayers
            );
            expect(evenActiveCount).toBe(evenActiveIds.length);
            expect(evenActivePlayers.length).toBe(evenActiveCount);
            expect(evenActiveIds.every((id) => (id & 1) === 0)).toBe(true);
            expect(PlayerLocations.findActivePlayers(filterEvenConnected)).toBe(evenActiveCount);

            for (const id of fixture.activeIds) {
                expect(activeIds).toContain(id);
            }

            // Test getPlayer / getPlayerId / toPlayers / toPlayerIds
            for (const id of fixture.disconnectedIds) {
                expect(PlayerLocations.getPlayer(id)).toBeUndefined();
                expect(PlayerLocations.getPlayerId(id)).toBeUndefined();
            }
            expect(PlayerLocations.getPlayer(-1)).toBeUndefined();
            expect(PlayerLocations.getPlayer(100)).toBeUndefined();
            expect(PlayerLocations.getPlayerId(-1)).toBeUndefined();
            expect(PlayerLocations.getPlayerId(100)).toBeUndefined();

            const batchPlayers: (mod.Player | undefined)[] = [];
            PlayerLocations.toPlayers(activeIds, batchPlayers);
            expect(batchPlayers.length).toBe(80);

            const batchIds: (number | undefined)[] = [];
            PlayerLocations.toPlayerIds(batchPlayers, batchIds);
            expect(batchIds).toEqual(activeIds);

            // Test optional buffer allocation (zero-arg return)
            const autoPlayers = PlayerLocations.toPlayers(activeIds);
            expect(autoPlayers.length).toBe(80);
            const autoIds = PlayerLocations.toPlayerIds(autoPlayers);
            expect(autoIds).toEqual(activeIds);

            // Test 1:1 length and undefined preservation with disconnected/invalid IDs
            const mixedIds = [activeIds[0], -1, 999, fixture.disconnectedIds[0], activeIds[1]];
            const mixedPlayers = PlayerLocations.toPlayers(mixedIds);
            expect(mixedPlayers.length).toBe(mixedIds.length);
            expect(mixedPlayers[0]).toBeDefined();
            expect(mixedPlayers[1]).toBeUndefined();
            expect(mixedPlayers[2]).toBeUndefined();
            expect(mixedPlayers[3]).toBeUndefined();
            expect(mixedPlayers[4]).toBeDefined();

            const roundTripIds = PlayerLocations.toPlayerIds(mixedPlayers);
            expect(roundTripIds.length).toBe(mixedIds.length);
            expect(roundTripIds[0]).toBe(activeIds[0]);
            expect(roundTripIds[1]).toBeUndefined();
            expect(roundTripIds[2]).toBeUndefined();
            expect(roundTripIds[3]).toBeUndefined();
            expect(roundTripIds[4]).toBe(activeIds[1]);
        });

        it('should handle dynamic player joins and leaves', () => {
            const testId = 99; // previously disconnected

            // Connect player 99 with valid coordinates
            harness.connectPlayer(testId, { x: 500, y: 120, z: -300 });
            harness.stepTick();

            expect(PlayerLocations.isPlayerConnected(testId)).toBe(true);
            expect(PlayerLocations.isPlayerActive(testId)).toBe(true);
            expect(PlayerLocations.getActivePlayerCount()).toBe(81);

            const pos = PlayerLocations.getPosition(testId);
            expect(pos).not.toBeNull();
            expect(pos).not.toBeUndefined();
            expect(pos!.x).toBeCloseTo(500, 2);
            expect(pos!.y).toBeCloseTo(120, 2);
            expect(pos!.z).toBeCloseTo(-300, 2);

            // Disconnect player 99
            harness.disconnectPlayer(testId);
            harness.stepTick();

            expect(PlayerLocations.isPlayerConnected(testId)).toBe(false);
            expect(PlayerLocations.isPlayerActive(testId)).toBeUndefined();
            expect(PlayerLocations.getPosition(testId)).toBeUndefined();
            expect(PlayerLocations.getActivePlayerCount()).toBe(80);
        });
    });

    describe('2. Distance & Proximity Calculations', () => {
        it('should calculate 3D Euclidean distances accurately between active players', () => {
            const p1 = fixture.activeIds[0];
            const p2 = fixture.activeIds[1];
            const pos1 = fixture.positions.get(p1)!;
            const pos2 = fixture.positions.get(p2)!;

            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const dz = pos1.z - pos2.z;
            const expectedDistSq = dx * dx + dy * dy + dz * dz;
            const expectedDist = Math.sqrt(expectedDistSq);

            expect(PlayerLocations.getDistanceSq(p1, p2)).toBeCloseTo(expectedDistSq, -1);
            expect(PlayerLocations.getDistance(p1, p2)).toBeCloseTo(expectedDist, 2);
        });

        it('should calculate 2D horizontal (XZ) distances accurately, ignoring elevation', () => {
            const p1 = fixture.activeIds[0];
            const p2 = fixture.activeIds[1];
            const pos1 = fixture.positions.get(p1)!;
            const pos2 = fixture.positions.get(p2)!;

            const dx = pos1.x - pos2.x;
            const dz = pos1.z - pos2.z;
            const expectedDistSqXZ = dx * dx + dz * dz;
            const expectedDistXZ = Math.sqrt(expectedDistSqXZ);

            expect(PlayerLocations.getDistanceSqXZ(p1, p2)).toBeCloseTo(expectedDistSqXZ, -1);
            expect(PlayerLocations.getDistanceXZ(p1, p2)).toBeCloseTo(expectedDistXZ, 2);
        });

        it('should return Infinity for inactive players and undefined for disconnected players', () => {
            const activeId = fixture.activeIds[0];
            const inactiveId = fixture.inactiveOriginIds[0];
            const disconnectedId = fixture.disconnectedIds[0];

            expect(PlayerLocations.getDistanceSq(activeId, inactiveId)).toBe(Infinity);
            expect(PlayerLocations.getDistance(activeId, disconnectedId)).toBeUndefined();
            expect(PlayerLocations.getDistanceSqXZ(inactiveId, disconnectedId)).toBeUndefined();
            expect(PlayerLocations.getDistanceXZ(activeId, 999)).toBeUndefined();
        });
    });

    describe('3. Accelerated Spatial Queries vs Ground Truth', () => {
        it('should match ground truth for 3D Sphere queries (findPlayersInSphere & findPlayersOutsideSphere)', () => {
            const testCenters = [
                { x: 0, y: 0, z: 0, r: 3000 },
                { x: 2500, y: 100, z: -4000, r: 4500 },
                { x: -5000, y: 300, z: 6000, r: 2500 },
            ];

            for (const { x, y, z, r } of testCenters) {
                const actualInIds: number[] = [];
                const actualInPlayers: mod.Player[] = [];
                const countIn = PlayerLocations.findPlayersInSphere(
                    x,
                    y,
                    z,
                    r,
                    undefined,
                    actualInIds,
                    actualInPlayers
                );
                const expectedIn = GroundTruth.sphere(fixture, x, y, z, r);

                expect(countIn).toBe(expectedIn.length);
                expect(actualInIds.length).toBe(expectedIn.length);
                expect(actualInPlayers.length).toBe(expectedIn.length);
                expect(actualInIds.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                // Verify pure count query without buffers
                expect(PlayerLocations.findPlayersInSphere(x, y, z, r)).toBe(expectedIn.length);

                // Verify with filterFn
                const filterEven = (_p: mod.Player, id: number) => (id & 1) === 0;
                const filteredInIds: number[] = [];
                const filteredInPlayers: mod.Player[] = [];
                const filteredCount = PlayerLocations.findPlayersInSphere(
                    x,
                    y,
                    z,
                    r,
                    filterEven,
                    filteredInIds,
                    filteredInPlayers
                );
                const expectedFiltered = expectedIn.filter((id) => (id & 1) === 0);
                expect(filteredCount).toBe(expectedFiltered.length);
                expect(filteredInIds.sort((a, b) => a - b)).toEqual(expectedFiltered.sort((a, b) => a - b));
                expect(filteredInPlayers.length).toBe(expectedFiltered.length);
                expect(PlayerLocations.findPlayersInSphere(x, y, z, r, filterEven)).toBe(expectedFiltered.length);

                const actualOutIds: number[] = [];
                const countOut = PlayerLocations.findPlayersOutsideSphere(x, y, z, r, undefined, actualOutIds);
                expect(countOut).toBe(fixture.activeIds.length - expectedIn.length);
                expect(actualOutIds.length).toBe(countOut);

                for (const id of expectedIn) {
                    expect(actualOutIds).not.toContain(id);
                    expect(PlayerLocations.isPlayerInSphere(id, x, y, z, r)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsideSphere(id, x, y, z, r)).toBe(false);
                }
            }
        });

        it('should match ground truth for 2.5D Cylinder queries (findPlayersInCylinder & findPlayersOutsideCylinder)', () => {
            const testCylinders = [
                { cx: 500, cz: -500, r: 3500, minY: -200, maxY: 600 },
                { cx: -3000, cz: 2000, r: 5000, minY: -Infinity, maxY: Infinity },
                { cx: 1000, cz: 1000, r: 2000, minY: 100, maxY: 1000 },
            ];

            for (const { cx, cz, r, minY, maxY } of testCylinders) {
                const actualInIds: number[] = [];
                const actualInPlayers: mod.Player[] = [];
                const countIn = PlayerLocations.findPlayersInCylinder(
                    cx,
                    cz,
                    r,
                    minY,
                    maxY,
                    undefined,
                    actualInIds,
                    actualInPlayers
                );
                const expectedIn = GroundTruth.cylinder(fixture, cx, cz, r, minY, maxY);

                expect(countIn).toBe(expectedIn.length);
                expect(actualInIds.length).toBe(expectedIn.length);
                expect(actualInPlayers.length).toBe(expectedIn.length);
                expect(actualInIds.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                expect(PlayerLocations.findPlayersInCylinder(cx, cz, r, minY, maxY)).toBe(expectedIn.length);

                // Verify with filterFn
                const filterEven = (_p: mod.Player, id: number) => (id & 1) === 0;
                const filteredInIds: number[] = [];
                const filteredCount = PlayerLocations.findPlayersInCylinder(
                    cx,
                    cz,
                    r,
                    minY,
                    maxY,
                    filterEven,
                    filteredInIds
                );
                const expectedFiltered = expectedIn.filter((id) => (id & 1) === 0);
                expect(filteredCount).toBe(expectedFiltered.length);
                expect(filteredInIds.sort((a, b) => a - b)).toEqual(expectedFiltered.sort((a, b) => a - b));

                const actualOutIds: number[] = [];
                const countOut = PlayerLocations.findPlayersOutsideCylinder(
                    cx,
                    cz,
                    r,
                    minY,
                    maxY,
                    undefined,
                    actualOutIds
                );
                expect(countOut).toBe(fixture.activeIds.length - expectedIn.length);
                expect(actualOutIds.length).toBe(countOut);

                for (const id of expectedIn) {
                    expect(actualOutIds).not.toContain(id);
                    expect(PlayerLocations.isPlayerInCylinder(id, cx, cz, r, minY, maxY)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsideCylinder(id, cx, cz, r, minY, maxY)).toBe(false);
                }
            }
        });

        it('should match ground truth for 3D AABB Bounding Box queries', () => {
            const testBoxes = [
                { minX: -4000, minY: -200, minZ: -4000, maxX: 4000, maxY: 800, maxZ: 4000 },
                { minX: 1000, minY: 0, minZ: 2000, maxX: 6000, maxY: 500, maxZ: 7000 },
                { minX: -8000, minY: -400, minZ: -8000, maxX: -2000, maxY: 200, maxZ: -1000 },
            ];

            for (const { minX, minY, minZ, maxX, maxY, maxZ } of testBoxes) {
                const actualInIds: number[] = [];
                const actualInPlayers: mod.Player[] = [];
                const countIn = PlayerLocations.findPlayersInAABB(
                    minX,
                    minY,
                    minZ,
                    maxX,
                    maxY,
                    maxZ,
                    undefined,
                    actualInIds,
                    actualInPlayers
                );
                const expectedIn = GroundTruth.aabb(fixture, minX, minY, minZ, maxX, maxY, maxZ);

                expect(countIn).toBe(expectedIn.length);
                expect(actualInIds.length).toBe(expectedIn.length);
                expect(actualInPlayers.length).toBe(expectedIn.length);
                expect(actualInIds.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                expect(PlayerLocations.findPlayersInAABB(minX, minY, minZ, maxX, maxY, maxZ)).toBe(expectedIn.length);

                // Verify with filterFn
                const filterEven = (_p: mod.Player, id: number) => (id & 1) === 0;
                const filteredInIds: number[] = [];
                const filteredCount = PlayerLocations.findPlayersInAABB(
                    minX,
                    minY,
                    minZ,
                    maxX,
                    maxY,
                    maxZ,
                    filterEven,
                    filteredInIds
                );
                const expectedFiltered = expectedIn.filter((id) => (id & 1) === 0);
                expect(filteredCount).toBe(expectedFiltered.length);
                expect(filteredInIds.sort((a, b) => a - b)).toEqual(expectedFiltered.sort((a, b) => a - b));

                const actualOutIds: number[] = [];
                const countOut = PlayerLocations.findPlayersOutsideAABB(
                    minX,
                    minY,
                    minZ,
                    maxX,
                    maxY,
                    maxZ,
                    undefined,
                    actualOutIds
                );
                expect(countOut).toBe(fixture.activeIds.length - expectedIn.length);
                expect(actualOutIds.length).toBe(countOut);

                for (const id of expectedIn) {
                    expect(actualOutIds).not.toContain(id);
                    expect(PlayerLocations.isPlayerInAABB(id, minX, minY, minZ, maxX, maxY, maxZ)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsideAABB(id, minX, minY, minZ, maxX, maxY, maxZ)).toBe(false);
                }
            }
        });

        it('should match ground truth for 2.5D Polygonal Prism queries (findPlayersInPrism & findPlayersOutsidePrism)', () => {
            const testPrisms = [
                // Triangle
                {
                    vertices: [
                        { x: -3000, z: -3000 },
                        { x: 3000, z: -3000 },
                        { x: 0, z: 4000 },
                    ],
                    minY: -200,
                    maxY: 600,
                },
                // Convex Quad
                {
                    vertices: [
                        { x: -5000, z: -5000 },
                        { x: 5000, z: -5000 },
                        { x: 5000, z: 5000 },
                        { x: -5000, z: 5000 },
                    ],
                    minY: -Infinity,
                    maxY: Infinity,
                },
                // Concave L-shaped polygon
                {
                    vertices: [
                        { x: 0, z: 0 },
                        { x: 6000, z: 0 },
                        { x: 6000, z: 3000 },
                        { x: 3000, z: 3000 },
                        { x: 3000, z: 6000 },
                        { x: 0, z: 6000 },
                    ],
                    minY: -100,
                    maxY: 800,
                },
                // Concave Star-like / Cross polygon
                {
                    vertices: [
                        { x: -2000, z: -6000 },
                        { x: 2000, z: -6000 },
                        { x: 2000, z: -2000 },
                        { x: 6000, z: -2000 },
                        { x: 6000, z: 2000 },
                        { x: 2000, z: 2000 },
                        { x: 2000, z: 6000 },
                        { x: -2000, z: 6000 },
                        { x: -2000, z: 2000 },
                        { x: -6000, z: 2000 },
                        { x: -6000, z: -2000 },
                        { x: -2000, z: -2000 },
                    ],
                    minY: -500,
                    maxY: 1200,
                },
            ];

            for (const { vertices, minY, maxY } of testPrisms) {
                const actualInIds: number[] = [];
                const actualInPlayers: mod.Player[] = [];
                const countIn = PlayerLocations.findPlayersInPrism(
                    vertices,
                    minY,
                    maxY,
                    undefined,
                    actualInIds,
                    actualInPlayers
                );
                const expectedIn = GroundTruth.prism(fixture, vertices, minY, maxY);

                expect(countIn).toBe(expectedIn!.length);
                expect(actualInIds.length).toBe(expectedIn!.length);
                expect(actualInPlayers.length).toBe(expectedIn!.length);
                expect(actualInIds.sort((a, b) => a - b)).toEqual(expectedIn!.sort((a, b) => a - b));

                expect(PlayerLocations.findPlayersInPrism(vertices, minY, maxY)).toBe(expectedIn!.length);

                // Verify with filterFn
                const filterEven = (_p: mod.Player, id: number) => (id & 1) === 0;
                const filteredInIds: number[] = [];
                const filteredCount = PlayerLocations.findPlayersInPrism(
                    vertices,
                    minY,
                    maxY,
                    filterEven,
                    filteredInIds
                );
                const expectedFiltered = expectedIn!.filter((id) => (id & 1) === 0);
                expect(filteredCount).toBe(expectedFiltered.length);
                expect(filteredInIds.sort((a, b) => a - b)).toEqual(expectedFiltered.sort((a, b) => a - b));

                const actualOutIds: number[] = [];
                const countOut = PlayerLocations.findPlayersOutsidePrism(vertices, minY, maxY, undefined, actualOutIds);
                expect(countOut).toBe(fixture.activeIds.length - expectedIn!.length);
                expect(actualOutIds.length).toBe(countOut);

                for (const id of expectedIn!) {
                    expect(actualOutIds).not.toContain(id);
                    expect(PlayerLocations.isPlayerInPrism(id, vertices, minY, maxY)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsidePrism(id, vertices, minY, maxY)).toBe(false);
                }

                for (const id of actualOutIds) {
                    expect(PlayerLocations.isPlayerInPrism(id, vertices, minY, maxY)).toBe(false);
                    expect(PlayerLocations.isPlayerOutsidePrism(id, vertices, minY, maxY)).toBe(true);
                }
            }

            // Degenerate polygon (< 3 vertices) with logging verification
            const logs: string[] = [];
            PlayerLocations.setLogging((msg) => {
                logs.push(msg);
            }, PlayerLocations.LogLevel.Warning);

            const degenerateVertices = [
                { x: 0, z: 0 },
                { x: 100, z: 100 },
            ];
            expect(PlayerLocations.findPlayersInPrism(degenerateVertices)).toBeUndefined();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.findPlayersOutsidePrism(degenerateVertices)).toBeUndefined();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.isPlayerInPrism(fixture.activeIds[0], degenerateVertices)).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.isPlayerOutsidePrism(fixture.activeIds[0], degenerateVertices)).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            const degHandle = PlayerLocations.onPrism(degenerateVertices, undefined, undefined, () => {});
            expect(degHandle).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            // Polygon exceeding MAX_PRISM_VERTICES = 32
            logs.length = 0;
            expect(PlayerLocations.MAX_PRISM_VERTICES).toBe(32);
            const manyVertices = Array.from({ length: 40 }, (_, i) => {
                const angle = (i / 40) * Math.PI * 2;
                return { x: Math.cos(angle) * 5000, z: Math.sin(angle) * 5000 };
            });
            expect(PlayerLocations.findPlayersInPrism(manyVertices)).toBeUndefined();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.findPlayersOutsidePrism(manyVertices)).toBeUndefined();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.isPlayerInPrism(fixture.activeIds[0], manyVertices)).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            expect(PlayerLocations.isPlayerOutsidePrism(fixture.activeIds[0], manyVertices)).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            logs.length = 0;
            const overHandle = PlayerLocations.onPrism(manyVertices, undefined, undefined, () => {});
            expect(overHandle).toBeNull();
            expect(logs.some((l) => l.includes('Polygonal prism requires between 3 and 32 vertices'))).toBe(true);

            // Disable logging
            PlayerLocations.setLogging(undefined);
        });
    });

    describe('4. Directional Slice Scans & Altitude Extrema', () => {
        it('should correctly query players Above, Below, East, West, North, and South', () => {
            const aboveIds: number[] = [];
            const aboveCount = PlayerLocations.findPlayersAbove(200, undefined, aboveIds);
            const expectedAbove = GroundTruth.above(fixture, 200);
            expect(aboveCount).toBe(expectedAbove.length);
            expect(aboveIds.sort((a, b) => a - b)).toEqual(expectedAbove.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersAbove(200)).toBe(expectedAbove.length);

            // Test directional query with filterFn
            const filterEven = (_p: mod.Player, id: number) => (id & 1) === 0;
            const filteredAboveIds: number[] = [];
            const filteredAboveCount = PlayerLocations.findPlayersAbove(200, filterEven, filteredAboveIds);
            const expectedFilteredAbove = expectedAbove.filter((id) => (id & 1) === 0);
            expect(filteredAboveCount).toBe(expectedFilteredAbove.length);
            expect(filteredAboveIds.sort((a, b) => a - b)).toEqual(expectedFilteredAbove.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersAbove(200, filterEven)).toBe(expectedFilteredAbove.length);

            const belowIds: number[] = [];
            const belowCount = PlayerLocations.findPlayersBelow(200, undefined, belowIds);
            const expectedBelow = GroundTruth.below(fixture, 200);
            expect(belowCount).toBe(expectedBelow.length);
            expect(belowIds.sort((a, b) => a - b)).toEqual(expectedBelow.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersBelow(200)).toBe(expectedBelow.length);

            const eastIds: number[] = [];
            const eastCount = PlayerLocations.findPlayersEastOf(1500, undefined, eastIds);
            const expectedEast = GroundTruth.eastOf(fixture, 1500);
            expect(eastCount).toBe(expectedEast.length);
            expect(eastIds.sort((a, b) => a - b)).toEqual(expectedEast.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersEastOf(1500)).toBe(expectedEast.length);

            const westIds: number[] = [];
            const westCount = PlayerLocations.findPlayersWestOf(1500, undefined, westIds);
            const expectedWest = GroundTruth.westOf(fixture, 1500);
            expect(westCount).toBe(expectedWest.length);
            expect(westIds.sort((a, b) => a - b)).toEqual(expectedWest.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersWestOf(1500)).toBe(expectedWest.length);

            const southIds: number[] = [];
            const southCount = PlayerLocations.findPlayersSouthOf(-500, undefined, southIds);
            const expectedSouth = GroundTruth.southOf(fixture, -500);
            expect(southCount).toBe(expectedSouth.length);
            expect(southIds.sort((a, b) => a - b)).toEqual(expectedSouth.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersSouthOf(-500)).toBe(expectedSouth.length);

            const northIds: number[] = [];
            const northCount = PlayerLocations.findPlayersNorthOf(-500, undefined, northIds);
            const expectedNorth = GroundTruth.northOf(fixture, -500);
            expect(northCount).toBe(expectedNorth.length);
            expect(northIds.sort((a, b) => a - b)).toEqual(expectedNorth.sort((a, b) => a - b));
            expect(PlayerLocations.findPlayersNorthOf(-500)).toBe(expectedNorth.length);
        });

        it('should find highest and lowest altitude active players', () => {
            const expectedHighest = GroundTruth.kHighest(fixture, 1)[0];
            const expectedLowest = GroundTruth.kLowest(fixture, 1)[0];

            expect(PlayerLocations.getHighestPlayerId()).toBe(expectedHighest);
            expect(PlayerLocations.getLowestPlayerId()).toBe(expectedLowest);

            const k = 7;
            const highestIds: number[] = [];
            const highestPlayers: mod.Player[] = [];
            const countH = PlayerLocations.findKHighestPlayers(k, undefined, highestIds, highestPlayers);
            expect(countH).toBe(k);
            expect(highestIds).toEqual(GroundTruth.kHighest(fixture, k));
            expect(highestPlayers.length).toBe(k);

            const lowestIds: number[] = [];
            const lowestPlayers: mod.Player[] = [];
            const countL = PlayerLocations.findKLowestPlayers(k, undefined, lowestIds, lowestPlayers);
            expect(countL).toBe(k);
            expect(lowestIds).toEqual(GroundTruth.kLowest(fixture, k));
            expect(lowestPlayers.length).toBe(k);
        });

        it('should support filter predicate for altitude extrema', () => {
            // Filter: Only players with positive X (receives player: mod.Player, id: number)
            const filterPositiveX = (_player: mod.Player, id: number) => {
                const pos = fixture.positions.get(id);
                return !!(pos && pos.x > 0);
            };

            const expectedHighestFiltered = GroundTruth.kHighest(fixture, 1, (id) =>
                filterPositiveX(null as unknown as mod.Player, id)
            )[0];
            expect(PlayerLocations.getHighestPlayerId(filterPositiveX)).toBe(expectedHighestFiltered);

            const expectedKHighestFiltered = GroundTruth.kHighest(fixture, 5, (id) =>
                filterPositiveX(null as unknown as mod.Player, id)
            );
            const kFilteredIds: number[] = [];
            PlayerLocations.findKHighestPlayers(5, filterPositiveX, kFilteredIds);
            expect(kFilteredIds).toEqual(expectedKHighestFiltered);

            // Filter matching nobody should return undefined
            expect(PlayerLocations.getHighestPlayerId(() => false)).toBeUndefined();
            expect(PlayerLocations.getLowestPlayerId(() => false)).toBeUndefined();
        });
    });

    describe('5. K-Nearest & K-Farthest Bounded Heaps', () => {
        const queryPoint = { x: 1200, y: 150, z: -800 };

        it('should return the single closest and farthest active player', () => {
            const expectedClosest = GroundTruth.kClosest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, 1)[0];
            const expectedFarthest = GroundTruth.kFarthest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, 1)[0];

            expect(PlayerLocations.getClosestPlayerId(queryPoint.x, queryPoint.y, queryPoint.z)).toBe(expectedClosest);
            expect(PlayerLocations.getFarthestPlayerId(queryPoint.x, queryPoint.y, queryPoint.z)).toBe(
                expectedFarthest
            );

            // Filter matching nobody should return undefined
            expect(
                PlayerLocations.getClosestPlayerId(queryPoint.x, queryPoint.y, queryPoint.z, () => false)
            ).toBeUndefined();
            expect(
                PlayerLocations.getFarthestPlayerId(queryPoint.x, queryPoint.y, queryPoint.z, () => false)
            ).toBeUndefined();
        });

        it('should return k-closest players sorted in exact ascending distance order', () => {
            const k = 8;
            const actualClosest: number[] = [];
            const actualClosestPlayers: mod.Player[] = [];
            const count = PlayerLocations.findKClosestPlayers(
                queryPoint.x,
                queryPoint.y,
                queryPoint.z,
                k,
                undefined,
                actualClosest,
                actualClosestPlayers
            );
            const expectedClosest = GroundTruth.kClosest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, k);

            expect(count).toBe(k);
            expect(actualClosest).toEqual(expectedClosest);
            expect(actualClosestPlayers.length).toBe(k);

            // Verify distance monotonically increases
            for (let i = 1; i < actualClosest.length; ++i) {
                const posA = fixture.positions.get(actualClosest[i - 1])!;
                const posB = fixture.positions.get(actualClosest[i])!;
                const distA =
                    (posA.x - queryPoint.x) ** 2 + (posA.y - queryPoint.y) ** 2 + (posA.z - queryPoint.z) ** 2;
                const distB =
                    (posB.x - queryPoint.x) ** 2 + (posB.y - queryPoint.y) ** 2 + (posB.z - queryPoint.z) ** 2;
                expect(distA).toBeLessThanOrEqual(distB);
            }
        });

        it('should return k-farthest players sorted in exact descending distance order', () => {
            const k = 8;
            const actualFarthest: number[] = [];
            const actualFarthestPlayers: mod.Player[] = [];
            const count = PlayerLocations.findKFarthestPlayers(
                queryPoint.x,
                queryPoint.y,
                queryPoint.z,
                k,
                undefined,
                actualFarthest,
                actualFarthestPlayers
            );
            const expectedFarthest = GroundTruth.kFarthest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, k);

            expect(count).toBe(k);
            expect(actualFarthest).toEqual(expectedFarthest);
            expect(actualFarthestPlayers.length).toBe(k);

            // Verify distance monotonically decreases
            for (let i = 1; i < actualFarthest.length; ++i) {
                const posA = fixture.positions.get(actualFarthest[i - 1])!;
                const posB = fixture.positions.get(actualFarthest[i])!;
                const distA =
                    (posA.x - queryPoint.x) ** 2 + (posA.y - queryPoint.y) ** 2 + (posA.z - queryPoint.z) ** 2;
                const distB =
                    (posB.x - queryPoint.x) ** 2 + (posB.y - queryPoint.y) ** 2 + (posB.z - queryPoint.z) ** 2;
                expect(distA).toBeGreaterThanOrEqual(distB);
            }
        });
    });

    describe('6. Zero-Allocation & Custom Buffer Reuse', () => {
        it('should populate user-provided outArray without retaining previous state', () => {
            const customBuffer: number[] = [999, 888, 777];

            const count1 = PlayerLocations.findPlayersInSphere(0, 0, 0, 1000, undefined, customBuffer);
            expect(count1).toBe(customBuffer.length);
            expect(customBuffer).not.toContain(999);
            expect(customBuffer).not.toContain(888);

            const firstLength = customBuffer.length;

            const count2 = PlayerLocations.findKHighestPlayers(3, undefined, customBuffer);
            expect(count2).toBe(3);
            expect(customBuffer.length).toBe(3);
            expect(customBuffer.length).not.toBe(firstLength);
        });
    });

    describe('7. Reactive Spatial Event Subscriptions', () => {
        it('should fire onEnter and onExit via onSphere as players move in and out of a sphere', () => {
            const entered: number[] = [];
            const exited: number[] = [];

            const handle = PlayerLocations.onSphere(
                1000,
                50,
                1000,
                100,
                (_player, id) => {
                    entered.push(id);
                },
                (_player, id) => {
                    exited.push(id);
                }
            );

            const testId = 98;

            // 1. Player starts outside
            harness.connectPlayer(testId, { x: 5000, y: 50, z: 5000 });
            harness.stepTick();
            expect(entered).not.toContain(testId);
            expect(exited).not.toContain(testId);

            // 2. Player moves inside sphere
            harness.setPlayer(testId, { position: { x: 1000, y: 50, z: 1000 } });
            harness.stepTick();
            expect(entered).toContain(testId);
            expect(exited).not.toContain(testId);

            // 3. Player remains inside (no duplicate enter event)
            const enterCount = entered.length;
            harness.stepTick();
            expect(entered.length).toBe(enterCount);

            // 4. Player moves outside sphere
            harness.setPlayer(testId, { position: { x: 5000, y: 50, z: 5000 } });
            harness.stepTick();
            expect(exited).toContain(testId);

            // Clean up
            handle.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire onEnter and onExit via onCylinder including vertical bounds', () => {
            const entered: number[] = [];
            const exited: number[] = [];

            const handle = PlayerLocations.onCylinder(
                200,
                -200,
                50,
                0,
                100,
                (_player, id) => {
                    entered.push(id);
                },
                (_player, id) => {
                    exited.push(id);
                }
            );

            const testId = 97;

            // Move inside cylinder
            harness.connectPlayer(testId, { x: 200, y: 50, z: -200 });
            harness.stepTick();
            expect(entered).toContain(testId);

            // Move out vertically (Y exceeds 100m)
            harness.setPlayer(testId, { position: { x: 200, y: 150, z: -200 } });
            harness.stepTick();
            expect(exited).toContain(testId);

            handle.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire onEnter and onExit via onAABB', () => {
            const entered: number[] = [];
            const exited: number[] = [];

            const handle = PlayerLocations.onAABB(
                0,
                0,
                0,
                100,
                100,
                100,
                (_player, id) => {
                    entered.push(id);
                },
                (_player, id) => {
                    exited.push(id);
                }
            );

            const testId = 96;

            harness.connectPlayer(testId, { x: 50, y: 50, z: 50 });
            harness.stepTick();
            expect(entered).toContain(testId);

            harness.setPlayer(testId, { position: { x: 150, y: 50, z: 50 } });
            harness.stepTick();
            expect(exited).toContain(testId);

            handle.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire onEnter and onExit via onPrism', () => {
            const entered: number[] = [];
            const exited: number[] = [];

            const triangleVertices = [
                { x: 0, z: 0 },
                { x: 100, z: 0 },
                { x: 0, z: 100 },
            ];

            const handle = PlayerLocations.onPrism(
                triangleVertices,
                0,
                50,
                (_player, id) => {
                    entered.push(id);
                },
                (_player, id) => {
                    exited.push(id);
                }
            );
            expect(handle).not.toBeNull();

            const testId = 96;

            // Player connects inside triangle (20, 20) with Y = 25
            harness.connectPlayer(testId, { x: 20, y: 25, z: 20 });
            harness.stepTick();
            expect(entered).toContain(testId);

            // Move player outside the triangle to (80, 25, 80)
            harness.setPlayer(testId, { position: { x: 80, y: 25, z: 80 } });
            harness.stepTick();
            expect(exited).toContain(testId);

            // Move player back in
            entered.length = 0;
            exited.length = 0;
            harness.setPlayer(testId, { position: { x: 10, y: 25, z: 10 } });
            harness.stepTick();
            expect(entered).toContain(testId);

            // Move player above vertical bound (Y = 100)
            harness.setPlayer(testId, { position: { x: 10, y: 100, z: 10 } });
            harness.stepTick();
            expect(exited).toContain(testId);

            handle!.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire directional boundary crossing events (onCrossAltitude, onCrossEastWest, etc.)', () => {
            const aboveEvents: number[] = [];
            const belowEvents: number[] = [];
            const eastEvents: number[] = [];
            const westEvents: number[] = [];

            const handleAltitude = PlayerLocations.onCrossAltitude(
                500,
                (_player, id) => {
                    aboveEvents.push(id);
                },
                (_player, id) => {
                    belowEvents.push(id);
                }
            );
            const handleEastWest = PlayerLocations.onCrossEastWest(
                2000,
                (_player, id) => {
                    eastEvents.push(id);
                },
                (_player, id) => {
                    westEvents.push(id);
                }
            );

            const testId = 95;

            // Start below & west
            harness.connectPlayer(testId, { x: 1000, y: 200, z: 0 });
            harness.stepTick();
            expect(aboveEvents).not.toContain(testId);
            expect(eastEvents).not.toContain(testId);

            // Cross above 500m
            harness.setPlayer(testId, { position: { x: 1000, y: 600, z: 0 } });
            harness.stepTick();
            expect(aboveEvents).toContain(testId);

            // Cross east of 2000m
            harness.setPlayer(testId, { position: { x: 2500, y: 600, z: 0 } });
            harness.stepTick();
            expect(eastEvents).toContain(testId);

            // Cross back below 500m
            harness.setPlayer(testId, { position: { x: 2500, y: 400, z: 0 } });
            harness.stepTick();
            expect(belowEvents).toContain(testId);

            // Cross back west of 2000m
            harness.setPlayer(testId, { position: { x: 1500, y: 400, z: 0 } });
            harness.stepTick();
            expect(westEvents).toContain(testId);

            handleAltitude.unsubscribe();
            handleEastWest.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire onHighestPlayerChanged when a new player takes the lead', () => {
            const transitions: Array<{ newId: number; prevId: number }> = [];

            const handle = PlayerLocations.onHighestPlayerChanged((_newP, _prevP, newId, prevId) => {
                transitions.push({ newId: newId!, prevId: prevId! });
            });

            const testId = 94;
            const initialHighest = PlayerLocations.getHighestPlayerId();

            // Spawn player at extreme high altitude
            harness.connectPlayer(testId, { x: 0, y: 50000, z: 0 });
            harness.stepTick();

            expect(transitions.length).toBeGreaterThanOrEqual(1);
            const lastTransition = transitions[transitions.length - 1];
            expect(lastTransition.newId).toBe(testId);
            expect(lastTransition.prevId).toBe(initialHighest);

            handle.unsubscribe();
            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should stop delivering events after unsubscription', () => {
            let callCount = 0;
            const handle = PlayerLocations.onSphere(0, 0, 0, 500, () => {
                ++callCount;
            });

            const testId = 93;
            harness.connectPlayer(testId, { x: 10, y: 10, z: 10 });
            harness.stepTick();
            expect(callCount).toBe(1);

            // Unsubscribe
            handle.unsubscribe();

            // Move player out and back in
            harness.setPlayer(testId, { position: { x: 2000, y: 0, z: 0 } });
            harness.stepTick();
            harness.setPlayer(testId, { position: { x: 10, y: 10, z: 10 } });
            harness.stepTick();

            // Call count must remain 1
            expect(callCount).toBe(1);

            harness.disconnectPlayer(testId);
            harness.stepTick();
        });

        it('should fire onExit when a player inside a zone disconnects or leaves', () => {
            const exited: number[] = [];
            const handle = PlayerLocations.onSphere(300, 300, 300, 200, undefined, (_player, id) => {
                exited.push(id);
            });

            const testId = 92;
            harness.connectPlayer(testId, { x: 300, y: 300, z: 300 });
            harness.stepTick();

            // Player disconnects while inside the zone
            harness.disconnectPlayer(testId);

            expect(exited).toContain(testId);

            handle.unsubscribe();
            harness.stepTick();
        });

        it('should support dynamic zone updates via handle.update()', () => {
            const entered: number[] = [];
            const exited: number[] = [];

            // 1. Dynamic Sphere (e.g. moving payload / expanding capture area)
            const sphereHandle = PlayerLocations.onSphere(
                0,
                0,
                0,
                10,
                (_player, id) => {
                    entered.push(id);
                },
                (_player, id) => {
                    exited.push(id);
                }
            );

            const testId = 91;
            // Player is stationary at (50, 0, 0)
            harness.connectPlayer(testId, { x: 50, y: 0, z: 0 });
            harness.stepTick();
            expect(entered).not.toContain(testId);

            // Move sphere to center around player (50, 0, 0)
            sphereHandle.update(50, 0, 0, 10);
            harness.stepTick();
            expect(entered).toContain(testId);

            // Move sphere away to (200, 0, 0)
            sphereHandle.update(200, 0, 0, 10);
            harness.stepTick();
            expect(exited).toContain(testId);

            sphereHandle.unsubscribe();

            // 2. Dynamic Plane / Boundary threshold
            const planeCrossed: number[] = [];
            const planeHandle = PlayerLocations.onCrossAltitude(100, (_player, id) => {
                planeCrossed.push(id);
            });

            // Player stationary at altitude 150
            harness.setPlayer(testId, { position: { x: 50, y: 150, z: 0 } });
            harness.stepTick();
            expect(planeCrossed).toContain(testId);

            // Update plane threshold to 200m (player is now below)
            planeCrossed.length = 0;
            planeHandle.update(200);
            harness.stepTick(); // Reset internal mask state for new threshold
            harness.setPlayer(testId, { position: { x: 50, y: 250, z: 0 } });
            harness.stepTick();
            expect(planeCrossed).toContain(testId);

            planeHandle.unsubscribe();

            // 3. Dynamic Target Extrema (closest player to moving target)
            const targetTransitions: Array<{ newId: number; prevId: number }> = [];
            const extremaHandle = PlayerLocations.onClosestPlayerChanged(0, 0, 0, (_newP, _prevP, newId, prevId) => {
                targetTransitions.push({ newId: newId!, prevId: prevId! });
            });

            const playerA = 90;
            const playerB = 89;
            harness.connectPlayer(playerA, { x: 10, y: 0, z: 0 });
            harness.connectPlayer(playerB, { x: 100, y: 0, z: 0 });
            harness.stepTick();

            // Target is at (0, 0, 0), playerA (dist 10) is closest
            // Move target to (95, 0, 0), playerB (dist 5) becomes closest
            extremaHandle.update(95, 0, 0);
            harness.stepTick();

            const lastExtrema = targetTransitions[targetTransitions.length - 1];
            expect(lastExtrema.newId).toBe(playerB);

            extremaHandle.unsubscribe();

            // 4. Dynamic Prism (polygonal vertices / altitude updates)
            const prismEntered: number[] = [];
            const prismExited: number[] = [];
            const prismHandle = PlayerLocations.onPrism(
                [
                    { x: 0, z: 0 },
                    { x: 100, z: 0 },
                    { x: 0, z: 100 },
                ],
                0,
                50,
                (_player, id) => {
                    prismEntered.push(id);
                },
                (_player, id) => {
                    prismExited.push(id);
                }
            );
            expect(prismHandle).not.toBeNull();

            // Player at (200, 25, 200) - outside initial prism
            harness.connectPlayer(testId, { x: 200, y: 25, z: 200 });
            harness.stepTick();
            expect(prismEntered).not.toContain(testId);

            // Update prism vertices to cover (200, 200)
            prismHandle!.update([
                { x: 150, z: 150 },
                { x: 250, z: 150 },
                { x: 250, z: 250 },
                { x: 150, z: 250 },
            ]);
            harness.stepTick();
            expect(prismEntered).toContain(testId);

            // Update height range so player at Y=25 is outside [50, 100]
            prismHandle!.update(
                [
                    { x: 150, z: 150 },
                    { x: 250, z: 150 },
                    { x: 250, z: 250 },
                    { x: 150, z: 250 },
                ],
                50,
                100
            );
            harness.stepTick();
            expect(prismExited).toContain(testId);

            prismHandle!.unsubscribe();

            harness.disconnectPlayer(testId);
            harness.disconnectPlayer(playerA);
            harness.disconnectPlayer(playerB);
            harness.stepTick();
        });

        it('should safely handle redundant unsubscribe and updates after unsubscription', () => {
            let count = 0;
            const handle = PlayerLocations.onSphere(0, 0, 0, 100, () => {
                ++count;
            });

            const testId = 88;
            harness.connectPlayer(testId, { x: 10, y: 10, z: 10 });
            harness.stepTick();
            expect(count).toBe(1);

            // Unsubscribe once
            handle.unsubscribe();

            // Calling unsubscribe again should be a safe no-op
            expect(() => handle.unsubscribe()).not.toThrow();

            // Calling update after unsubscription should be a safe no-op
            expect(() => handle.update(100, 100, 100, 50)).not.toThrow();

            // No further events should ever fire
            harness.setPlayer(testId, { position: { x: 100, y: 100, z: 100 } });
            harness.stepTick();
            expect(count).toBe(1);

            harness.disconnectPlayer(testId);
            harness.stepTick();
        });
    });
});
