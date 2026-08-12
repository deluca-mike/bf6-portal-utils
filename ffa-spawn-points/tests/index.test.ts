import { resetMockState } from '../../ui/tests/mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FFASpawnPoints } from '../index.ts';
import { Events } from '../../events/index.ts';
import { PlayerLocations } from '../../player-locations/index.ts';

interface MockPlayer {
    _id: number;
    position: { x: number; y: number; z: number };
}

describe('FFASpawnPoints Class Tests', () => {
    let activePlayers: MockPlayer[] = [];
    let spawnedObjects: unknown[] = [];
    let activeSpawners: FFASpawnPoints[] = [];

    beforeEach(() => {
        vi.useFakeTimers();
        activePlayers = [];
        spawnedObjects = [];
        activeSpawners = [];
        resetMockState();

        Object.assign(mod, {
            GetObjId: (player: MockPlayer): number => player._id,
            GetObjectPosition: (player: MockPlayer) => player.position,
            AllPlayers: () => activePlayers,
            CountOf: (arr: unknown[]) => (arr ? arr.length : 0),
            ValueInArray: (arr: unknown[], idx: number) => (arr ? arr[idx] : undefined),
            IsPlayerValid: (player: MockPlayer) => !!player,
            CreateVector: (x: number, y: number, z: number) => ({ x, y, z }),
            XComponentOf: (v: { x: number; y: number; z: number }) => v?.x ?? 0,
            YComponentOf: (v: { x: number; y: number; z: number }) => v?.y ?? 0,
            ZComponentOf: (v: { x: number; y: number; z: number }) => v?.z ?? 0,
            EnableHQ: vi.fn(),
            GetHQ: vi.fn(),
            SpawnObject: (_type: unknown, loc: unknown, _rot: unknown) => {
                const spawner = { _type, location: loc };
                spawnedObjects.push(spawner);
                return spawner;
            },
            SpawnPlayerFromSpawnPoint: vi.fn(),
            GetSoldierState: (_player: MockPlayer, state: number) => {
                return false;
            },
            RuntimeSpawn_Common: {
                PlayerSpawner: 1,
            },
            SoldierStateBool: {
                IsAlive: 1,
                IsAISoldier: 2,
            },
            Message: (key: string, ...args: unknown[]) => `${key}:${args.join(',')}`,
            stringkeys: {
                ffaSpawnPoints: {
                    buttons: {
                        spawn: 'spawn',
                        delay: 'delay',
                    },
                    countdown: 'countdown',
                    debug: {
                        position: 'pos',
                    },
                },
            },
        });

        PlayerLocations.initialize();
    });

    afterEach(() => {
        for (const spawner of activeSpawners) {
            spawner.destroy();
        }
        activeSpawners = [];
        vi.useRealTimers();
    });

    function createPlayer(id: number, x = 10, y = 0, z = 0): MockPlayer {
        const p: MockPlayer = {
            _id: id,
            position: { x, y, z },
        };
        activePlayers.push(p);
        Events.OnPlayerJoinGame.trigger(p as unknown as mod.Player);
        return p;
    }

    describe('Instantiation & Structure of Arrays Setup', () => {
        it('should initialize spawn points with precomputed spatial data in TypedArrays', () => {
            const spawns: FFASpawnPoints.SpawnData[] = [
                [0, 0, 0, 0], // Facing North (0, -1)
                [100, 0, 0, 90], // Facing East (1, 0)
                [200, 0, 0, 180], // Facing South (0, 1)
            ];

            const spawner = new FFASpawnPoints(spawns);
            activeSpawners.push(spawner);

            expect(spawner.spawnCount).toBe(3);
        });

        it('should handle empty spawn points gracefully without throwing', () => {
            const spawner = new FFASpawnPoints([]);
            activeSpawners.push(spawner);

            expect(spawner.spawnCount).toBe(0);
            expect(spawner.getBestSpawnIndex()).toBeNull();

            expect(() => spawner.enableSpawnQueueProcessing()).not.toThrow();
        });
    });

    describe('Spawn Fitness & Selection Algorithm', () => {
        const spawns: FFASpawnPoints.SpawnData[] = [
            [0, 0, 0, 0], // Spawn 0: at (0, 0, 0)
            [35, 0, 0, 90], // Spawn 1: at (35, 0, 0) - ideal 35m from player at (0,0,0), facing East away
            [35, 0, 0, 270], // Spawn 2: at (35, 0, 0) - ideal 35m, facing West directly towards (0,0,0)
            [10, 0, 0, 0], // Spawn 3: at (10, 0, 0) - dangerous (<20m)
            [200, 0, 0, 0], // Spawn 4: at (200, 0, 0) - far away (>80m)
        ];

        it('should select a random spawn when no active players are on map', () => {
            const spawner = new FFASpawnPoints(spawns, { selectionPoolSize: 1 });
            activeSpawners.push(spawner);
            Events.OngoingGlobal.trigger();

            const spawningPlayer = createPlayer(1) as unknown as mod.Player;
            spawner.addPlayer(spawningPlayer);
            spawner.enableSpawnQueueProcessing();
            spawner.forceIntoQueue(spawningPlayer);

            expect(mod.SpawnPlayerFromSpawnPoint).toHaveBeenCalled();
        });

        it('should prioritize ideal distance and facing direction towards enemies', () => {
            // Enemy is active at (0.1, 0, 0)
            createPlayer(1, 0.1, 0, 0);
            Events.OngoingGlobal.trigger();

            // Spawn 2 (at 35m, facing West directly towards enemy) should score higher than Spawn 1 (facing away)
            // and much higher than Spawn 3 (10m - dangerous) or Spawn 4 (200m - far)
            const spawner = new FFASpawnPoints(spawns, {
                selectionPoolSize: 1, // Deterministically pick #1 ranked
                defaultScorerOptions: {
                    minSafeDistance: 20,
                    idealDistance: 35,
                    maxDistance: 80,
                    facingWeight: 0.2,
                },
            });
            activeSpawners.push(spawner);

            const chosenIdx = spawner.getBestSpawnIndex();
            expect(chosenIdx).toBe(2); // Spawn 2 is index 2

            const spawningPlayer = createPlayer(2, 500, 0, 0);
            spawner.addPlayer(spawningPlayer as unknown as mod.Player);
            spawner.enableSpawnQueueProcessing();
            spawner.forceIntoQueue(spawningPlayer as unknown as mod.Player);

            expect(mod.SpawnPlayerFromSpawnPoint).toHaveBeenCalled();
        });

        it('should support customScorer override', () => {
            const customScorer = vi.fn((x: number, _y: number, _z: number, _orientation: number, _elapsed: number) => {
                // Heavily favor spawn with x === 200 (index 4)
                return x === 200 ? 100 : 1;
            });

            createPlayer(1, 50, 0, 0);
            Events.OngoingGlobal.trigger();

            const spawner = new FFASpawnPoints(spawns, {
                selectionPoolSize: 1,
                customScorer,
            });
            activeSpawners.push(spawner);

            const chosenIdx = spawner.getBestSpawnIndex();
            expect(customScorer).toHaveBeenCalled();
            expect(chosenIdx).toBe(4); // Spawn 4 is at x === 200

            const spawningPlayer = createPlayer(2, 500, 0, 0);
            spawner.addPlayer(spawningPlayer as unknown as mod.Player);
            spawner.enableSpawnQueueProcessing();
            spawner.forceIntoQueue(spawningPlayer as unknown as mod.Player);

            expect(mod.SpawnPlayerFromSpawnPoint).toHaveBeenCalled();
        });

        it('should handle player removal and cleanup on leave game', () => {
            const spawner = new FFASpawnPoints(spawns);
            activeSpawners.push(spawner);

            const p1 = createPlayer(1, 10, 0, 0) as unknown as mod.Player;
            spawner.addPlayer(p1);

            expect(spawner.removePlayer(1)).toBe(true);
            expect(spawner.removePlayer(1)).toBe(false);
        });
    });

    describe('FFASpawnPoints.defaultScorer Static Function', () => {
        it('should return a severe danger penalty when an enemy is closer than minSafeDistance', () => {
            // Enemy at (10, 0, 0)
            createPlayer(1, 10, 0, 0);
            Events.OngoingGlobal.trigger();

            // Candidate spawn at (0, 0, 0) is 10m away (< 20m default safe distance)
            const score = FFASpawnPoints.defaultScorer(0, 0, 0, 0, Infinity);
            expect(score).toBeLessThan(-100);
        });

        it('should return peak proximity score at ideal distance', () => {
            // Enemy at (35, 0, 0)
            createPlayer(1, 35, 0, 0);
            Events.OngoingGlobal.trigger();

            // Candidate spawn at (0, 0, 0) is 35m away (ideal distance peak)
            const scoreFacing = FFASpawnPoints.defaultScorer(0, 0, 0, 90, Infinity); // Facing East (towards enemy)
            const scoreAway = FFASpawnPoints.defaultScorer(0, 0, 0, 270, Infinity); // Facing West (away from enemy)

            expect(scoreFacing).toBeGreaterThan(1.0); // distScore (1.0) + facingBonus
            expect(scoreFacing).toBeGreaterThan(scoreAway);
        });

        it('should apply cooldown penalty for recently used spawn points', () => {
            createPlayer(1, 35, 0, 0);
            Events.OngoingGlobal.trigger();

            const scoreFresh = FFASpawnPoints.defaultScorer(0, 0, 0, 90, Infinity);
            const scoreRecent = FFASpawnPoints.defaultScorer(0, 0, 0, 90, 1000); // 1s elapsed out of 4s cooldown

            expect(scoreRecent).toBeLessThan(scoreFresh);
        });

        it('should apply crowding penalty when multiple enemies are within crowdingRadius', () => {
            // 3 enemies near (0, 0, 0) within 50m crowding radius
            createPlayer(1, 30, 0, 0);
            const p2 = createPlayer(2, 0, 0, 30);
            const p3 = createPlayer(3, -30, 0, 0);
            Events.OngoingGlobal.trigger();

            const scoreCrowded = FFASpawnPoints.defaultScorer(0, 0, 0, 0, Infinity);

            // Move enemies 2 and 3 outside the 50m crowding radius
            p2.position = { x: 500, y: 0, z: 0 };
            p3.position = { x: -500, y: 0, z: 0 };
            Events.OngoingGlobal.trigger();

            const scoreSparse = FFASpawnPoints.defaultScorer(0, 0, 0, 0, Infinity);

            expect(scoreCrowded).toBeLessThan(scoreSparse);
        });

        it('should accept custom DefaultScorerOptions overrides', () => {
            createPlayer(1, 15, 0, 0);
            Events.OngoingGlobal.trigger();

            // Default minSafeDistance = 20 -> 15m is dangerous (negative score)
            const defaultScore = FFASpawnPoints.defaultScorer(0, 0, 0, 0, Infinity);
            expect(defaultScore).toBeLessThan(0);

            // With minSafeDistance = 10 -> 15m is considered safe
            const customScore = FFASpawnPoints.defaultScorer(0, 0, 0, 0, Infinity, {
                minSafeDistance: 10,
                idealDistance: 15,
            });
            expect(customScore).toBeGreaterThan(0);
        });
    });
});
