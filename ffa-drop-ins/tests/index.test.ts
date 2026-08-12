import { resetMockState } from '../../ui/tests/mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FFADropIns } from '../index.ts';
import { Events } from '../../events/index.ts';

interface MockPlayer {
    _id: number;
    position: { x: number; y: number; z: number };
}

describe('FFADropIns Class Tests', () => {
    let activePlayers: MockPlayer[] = [];
    let spawnedObjects: unknown[] = [];
    let activeSpawners: FFADropIns[] = [];

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
                ffaDropIns: {
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
        it('should initialize drop-in spawns across rectangles with specified altitude', () => {
            const spawnData: FFADropIns.SpawnData = {
                spawnRectangles: [
                    { minX: -100, minZ: -100, maxX: 100, maxZ: 100 },
                    { minX: 200, minZ: 200, maxX: 400, maxZ: 400 },
                ],
                y: 350,
            };

            const spawner = new FFADropIns(spawnData, { dropInPoints: 16 });
            activeSpawners.push(spawner);

            expect(spawner.spawnCount).toBe(16);
            expect(spawnedObjects.length).toBe(16);
            expect(mod.EnableHQ).toHaveBeenCalledTimes(2);

            // Each spawned object should have altitude y = 350
            for (const obj of spawnedObjects as Array<{ location: { x: number; y: number; z: number } }>) {
                expect(obj.location.y).toBe(350);
                // Must be within one of the two zones
                const inZone1 =
                    obj.location.x >= -100 && obj.location.x <= 100 && obj.location.z >= -100 && obj.location.z <= 100;
                const inZone2 =
                    obj.location.x >= 200 && obj.location.x <= 400 && obj.location.z >= 200 && obj.location.z <= 400;
                expect(inZone1 || inZone2).toBe(true);
            }
        });

        it('should handle empty spawn rectangles gracefully without throwing', () => {
            const spawner = new FFADropIns({ spawnRectangles: [], y: 100 });
            activeSpawners.push(spawner);

            expect(spawner.spawnCount).toBe(0);
            expect(spawner.getRandomSpawnIndex()).toBeNull();
            expect(spawner.getBestSpawnIndex()).toBeNull();
            expect(() => spawner.enableSpawnQueueProcessing()).not.toThrow();
        });

        it('should filter out zero-area rectangles', () => {
            const spawner = new FFADropIns(
                {
                    spawnRectangles: [
                        { minX: 10, maxX: 10, minZ: 0, maxZ: 50 }, // 0 width
                        { minX: 0, maxX: 50, minZ: 20, maxZ: 20 }, // 0 depth
                    ],
                    y: 200,
                },
                { dropInPoints: 10 }
            );
            activeSpawners.push(spawner);

            expect(spawner.spawnCount).toBe(0);
        });
    });

    describe('Player & Queue Management', () => {
        const spawnData: FFADropIns.SpawnData = {
            spawnRectangles: [{ minX: -50, minZ: -50, maxX: 50, maxZ: 50 }],
            y: 200,
        };

        it('should register a player and initialize countdown clock', () => {
            const spawner = new FFADropIns(spawnData, { initialPromptDelay: 5 });
            activeSpawners.push(spawner);

            const player = createPlayer(1);
            spawner.addPlayer(player as unknown as mod.Player);

            expect(() => spawner.startDelayForPrompt(1, 5)).not.toThrow();
        });

        it('should remove a player and clean up UI/timers when player leaves', () => {
            const spawner = new FFADropIns(spawnData);
            activeSpawners.push(spawner);

            const player = createPlayer(1);
            spawner.addPlayer(player as unknown as mod.Player);

            expect(spawner.removePlayer(1)).toBe(true);
            // Second removal should return false
            expect(spawner.removePlayer(1)).toBe(false);
        });

        it('should automatically remove player when OnPlayerLeaveGame is triggered', () => {
            const spawner = new FFADropIns(spawnData);
            activeSpawners.push(spawner);

            const player = createPlayer(42);
            spawner.addPlayer(player as unknown as mod.Player);

            Events.OnPlayerLeaveGame.trigger(42);
            expect(spawner.removePlayer(42)).toBe(false);
        });

        it('should process the spawn queue and spawn players', () => {
            const spawner = new FFADropIns(spawnData, { dropInPoints: 4, queueProcessingDelay: 1 });
            activeSpawners.push(spawner);

            const player = createPlayer(1);
            spawner.addPlayer(player as unknown as mod.Player);
            spawner.enableSpawnQueueProcessing();

            spawner.forceIntoQueue(1);

            // Queue processing drains the queue
            expect(mod.SpawnPlayerFromSpawnPoint).toHaveBeenCalled();
        });

        it('should handle AI soldiers by skipping delay directly into queue', () => {
            const spawner = new FFADropIns(spawnData, { dropInPoints: 4 });
            activeSpawners.push(spawner);

            const aiPlayer = createPlayer(99);
            mod.GetSoldierState = (_p: unknown, state: number) => state === mod.SoldierStateBool.IsAISoldier;

            spawner.addPlayer(aiPlayer as unknown as mod.Player);
            spawner.enableSpawnQueueProcessing();

            spawner.startDelayForPrompt(99, 10);

            // AI player should have bypassed prompt and been spawned immediately
            expect(mod.SpawnPlayerFromSpawnPoint).toHaveBeenCalled();
        });

        it('should clear spawn queue when clearSpawnQueue is called', () => {
            const spawner = new FFADropIns(spawnData);
            activeSpawners.push(spawner);

            const player = createPlayer(1);
            spawner.addPlayer(player as unknown as mod.Player);
            spawner.forceIntoQueue(1);

            spawner.clearSpawnQueue();
            spawner.enableSpawnQueueProcessing();

            expect(mod.SpawnPlayerFromSpawnPoint).not.toHaveBeenCalled();
        });

        it('should properly clean up all resources on destroy()', () => {
            const spawner = new FFADropIns(spawnData, { dropInPoints: 5 });
            activeSpawners.push(spawner);

            const p1 = createPlayer(1);
            const p2 = createPlayer(2);
            spawner.addPlayer(p1 as unknown as mod.Player);
            spawner.addPlayer(p2 as unknown as mod.Player);
            spawner.enableSpawnQueueProcessing();

            spawner.destroy();

            // After destroy, removing players should return false as they were already cleaned up
            expect(spawner.removePlayer(1)).toBe(false);
            expect(spawner.removePlayer(2)).toBe(false);
        });
    });

    describe('Logging Configuration', () => {
        it('should allow setting custom logger and log level', () => {
            const logFn = vi.fn();
            FFADropIns.setLogging(logFn, FFADropIns.LogLevel.Debug);

            expect(() => {
                new FFADropIns({ spawnRectangles: [{ minX: 0, minZ: 0, maxX: 10, maxZ: 10 }], y: 100 });
            }).not.toThrow();

            expect(logFn).toHaveBeenCalled();
        });
    });
});
