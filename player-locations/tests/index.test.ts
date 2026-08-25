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

        // Trigger tick to initialize and sort all spatial structures
        harness.stepTick();
    });

    describe('1. Lifecycle, Connection & Origin Filtering', () => {
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

        it('should return correct connected and active player ID lists', () => {
            const connected = PlayerLocations.getConnectedPlayers();
            expect(connected.length).toBe(90);

            for (const id of fixture.connectedIds) {
                expect(connected).toContain(id);
            }

            const active = PlayerLocations.getActivePlayers();
            expect(active.length).toBe(80);

            for (const id of fixture.activeIds) {
                expect(active).toContain(id);
            }
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
        it('should match ground truth for 3D Sphere queries (getPlayersInSphere & getPlayersOutsideSphere)', () => {
            const testCenters = [
                { x: 0, y: 0, z: 0, r: 3000 },
                { x: 2500, y: 100, z: -4000, r: 4500 },
                { x: -5000, y: 300, z: 6000, r: 2500 },
            ];

            for (const { x, y, z, r } of testCenters) {
                const actualIn = PlayerLocations.getPlayersInSphere(x, y, z, r);
                const expectedIn = GroundTruth.sphere(fixture, x, y, z, r);

                expect(actualIn.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                const actualOut = PlayerLocations.getPlayersOutsideSphere(x, y, z, r);
                expect(actualOut.length).toBe(fixture.activeIds.length - expectedIn.length);

                for (const id of expectedIn) {
                    expect(actualOut).not.toContain(id);
                    expect(PlayerLocations.isPlayerInSphere(id, x, y, z, r)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsideSphere(id, x, y, z, r)).toBe(false);
                }
            }
        });

        it('should match ground truth for 2.5D Cylinder queries (getPlayersInCylinder & getPlayersOutsideCylinder)', () => {
            const testCylinders = [
                { cx: 500, cz: -500, r: 3500, minY: -200, maxY: 600 },
                { cx: -3000, cz: 2000, r: 5000, minY: -Infinity, maxY: Infinity },
                { cx: 1000, cz: 1000, r: 2000, minY: 100, maxY: 1000 },
            ];

            for (const { cx, cz, r, minY, maxY } of testCylinders) {
                const actualIn = PlayerLocations.getPlayersInCylinder(cx, cz, r, minY, maxY);
                const expectedIn = GroundTruth.cylinder(fixture, cx, cz, r, minY, maxY);

                expect(actualIn.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                const actualOut = PlayerLocations.getPlayersOutsideCylinder(cx, cz, r, minY, maxY);
                expect(actualOut.length).toBe(fixture.activeIds.length - expectedIn.length);

                for (const id of expectedIn) {
                    expect(actualOut).not.toContain(id);
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
                const actualIn = PlayerLocations.getPlayersInAABB(minX, minY, minZ, maxX, maxY, maxZ);
                const expectedIn = GroundTruth.aabb(fixture, minX, minY, minZ, maxX, maxY, maxZ);

                expect(actualIn.sort((a, b) => a - b)).toEqual(expectedIn.sort((a, b) => a - b));

                const actualOut = PlayerLocations.getPlayersOutsideAABB(minX, minY, minZ, maxX, maxY, maxZ);
                expect(actualOut.length).toBe(fixture.activeIds.length - expectedIn.length);

                for (const id of expectedIn) {
                    expect(actualOut).not.toContain(id);
                    expect(PlayerLocations.isPlayerInAABB(id, minX, minY, minZ, maxX, maxY, maxZ)).toBe(true);
                    expect(PlayerLocations.isPlayerOutsideAABB(id, minX, minY, minZ, maxX, maxY, maxZ)).toBe(false);
                }
            }
        });
    });

    describe('4. Directional Slice Scans & Altitude Extrema', () => {
        it('should correctly query players Above, Below, East, West, North, and South', () => {
            expect(PlayerLocations.getPlayersAbove(200).sort((a, b) => a - b)).toEqual(
                GroundTruth.above(fixture, 200).sort((a, b) => a - b)
            );

            expect(PlayerLocations.getPlayersBelow(200).sort((a, b) => a - b)).toEqual(
                GroundTruth.below(fixture, 200).sort((a, b) => a - b)
            );

            expect(PlayerLocations.getPlayersEastOf(1500).sort((a, b) => a - b)).toEqual(
                GroundTruth.eastOf(fixture, 1500).sort((a, b) => a - b)
            );

            expect(PlayerLocations.getPlayersWestOf(1500).sort((a, b) => a - b)).toEqual(
                GroundTruth.westOf(fixture, 1500).sort((a, b) => a - b)
            );

            expect(PlayerLocations.getPlayersSouthOf(-500).sort((a, b) => a - b)).toEqual(
                GroundTruth.southOf(fixture, -500).sort((a, b) => a - b)
            );

            expect(PlayerLocations.getPlayersNorthOf(-500).sort((a, b) => a - b)).toEqual(
                GroundTruth.northOf(fixture, -500).sort((a, b) => a - b)
            );
        });

        it('should find highest and lowest altitude active players', () => {
            const expectedHighest = GroundTruth.kHighest(fixture, 1)[0];
            const expectedLowest = GroundTruth.kLowest(fixture, 1)[0];

            expect(PlayerLocations.getHighestPlayer()).toBe(expectedHighest);
            expect(PlayerLocations.getLowestPlayer()).toBe(expectedLowest);

            const k = 7;
            expect(PlayerLocations.getKHighestPlayers(k)).toEqual(GroundTruth.kHighest(fixture, k));
            expect(PlayerLocations.getKLowestPlayers(k)).toEqual(GroundTruth.kLowest(fixture, k));
        });

        it('should support filter predicate for altitude extrema', () => {
            // Filter: Only players with positive X
            const filterPositiveX = (id: number) => {
                const pos = fixture.positions.get(id);
                return !!(pos && pos.x > 0);
            };

            const expectedHighestFiltered = GroundTruth.kHighest(fixture, 1, filterPositiveX)[0];
            expect(PlayerLocations.getHighestPlayer(filterPositiveX)).toBe(expectedHighestFiltered);

            const expectedKHighestFiltered = GroundTruth.kHighest(fixture, 5, filterPositiveX);
            expect(PlayerLocations.getKHighestPlayers(5, filterPositiveX)).toEqual(expectedKHighestFiltered);

            // Filter matching nobody should return null
            expect(PlayerLocations.getHighestPlayer(() => false)).toBeNull();
            expect(PlayerLocations.getLowestPlayer(() => false)).toBeNull();
        });
    });

    describe('5. K-Nearest & K-Farthest Bounded Heaps', () => {
        const queryPoint = { x: 1200, y: 150, z: -800 };

        it('should return the single closest and farthest active player', () => {
            const expectedClosest = GroundTruth.kClosest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, 1)[0];
            const expectedFarthest = GroundTruth.kFarthest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, 1)[0];

            expect(PlayerLocations.getClosestPlayer(queryPoint.x, queryPoint.y, queryPoint.z)).toBe(expectedClosest);
            expect(PlayerLocations.getFarthestPlayer(queryPoint.x, queryPoint.y, queryPoint.z)).toBe(expectedFarthest);

            // Filter matching nobody should return null
            expect(PlayerLocations.getClosestPlayer(queryPoint.x, queryPoint.y, queryPoint.z, () => false)).toBeNull();
            expect(PlayerLocations.getFarthestPlayer(queryPoint.x, queryPoint.y, queryPoint.z, () => false)).toBeNull();
        });

        it('should return k-closest players sorted in exact ascending distance order', () => {
            const k = 8;
            const actualClosest = PlayerLocations.getKClosestPlayers(queryPoint.x, queryPoint.y, queryPoint.z, k);
            const expectedClosest = GroundTruth.kClosest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, k);

            expect(actualClosest).toEqual(expectedClosest);

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
            const actualFarthest = PlayerLocations.getKFarthestPlayers(queryPoint.x, queryPoint.y, queryPoint.z, k);
            const expectedFarthest = GroundTruth.kFarthest(fixture, queryPoint.x, queryPoint.y, queryPoint.z, k);

            expect(actualFarthest).toEqual(expectedFarthest);

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

            const result1 = PlayerLocations.getPlayersInSphere(0, 0, 0, 1000, customBuffer);
            expect(result1).toBe(customBuffer);
            expect(customBuffer).not.toContain(999);
            expect(customBuffer).not.toContain(888);

            const firstLength = customBuffer.length;

            const result2 = PlayerLocations.getKHighestPlayers(3, undefined, customBuffer);
            expect(result2).toBe(customBuffer);
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
                (id) => {
                    entered.push(id);
                },
                (id) => {
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
                (id) => {
                    entered.push(id);
                },
                (id) => {
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
                (id) => {
                    entered.push(id);
                },
                (id) => {
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

        it('should fire directional boundary crossing events (onCrossAltitude, onCrossEastWest, etc.)', () => {
            const aboveEvents: number[] = [];
            const belowEvents: number[] = [];
            const eastEvents: number[] = [];
            const westEvents: number[] = [];

            const handleAltitude = PlayerLocations.onCrossAltitude(
                500,
                (id) => {
                    aboveEvents.push(id);
                },
                (id) => {
                    belowEvents.push(id);
                }
            );
            const handleEastWest = PlayerLocations.onCrossEastWest(
                2000,
                (id) => {
                    eastEvents.push(id);
                },
                (id) => {
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

            const handle = PlayerLocations.onHighestPlayerChanged((newId, prevId) => {
                transitions.push({ newId, prevId });
            });

            const testId = 94;
            const initialHighest = PlayerLocations.getHighestPlayer();

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
            const handle = PlayerLocations.onSphere(300, 300, 300, 200, undefined, (id) => {
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
                (id) => {
                    entered.push(id);
                },
                (id) => {
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
            const planeHandle = PlayerLocations.onCrossAltitude(100, (id) => {
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
            const extremaHandle = PlayerLocations.onClosestPlayerChanged(0, 0, 0, (newId, prevId) => {
                targetTransitions.push({ newId, prevId });
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
