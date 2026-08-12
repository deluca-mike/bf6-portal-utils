import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vectors } from '../../vectors/index.ts';

interface MockPlayer {
    id: number;
    connected: boolean;
}

class RaycastTestHarness {
    public players: Map<number, MockPlayer> = new Map();
    public raycastsCalled: Array<{
        player?: MockPlayer | null;
        start: Vectors.Vector3;
        end: Vectors.Vector3;
    }> = [];
    public shouldThrowOnPlayerRaycast: boolean = false;

    constructor() {
        this.setupGlobalMod();
    }

    public addPlayer(id: number): MockPlayer {
        const player: MockPlayer = { id, connected: true };
        this.players.set(id, player);
        return player;
    }

    public removePlayer(id: number): void {
        const player = this.players.get(id);
        if (player) {
            player.connected = false;
        }
    }

    public setupGlobalMod(): void {
        const mockMod: Record<string, unknown> = {
            CreateVector: (x: number, y: number, z: number): Vectors.Vector3 => {
                return { x, y, z };
            },
            XComponentOf: (v: Vectors.Vector3): number => {
                return v ? v.x : 0;
            },
            YComponentOf: (v: Vectors.Vector3): number => {
                return v ? v.y : 0;
            },
            ZComponentOf: (v: Vectors.Vector3): number => {
                return v ? v.z : 0;
            },
            AllPlayers: (): MockPlayer[] => {
                const list: MockPlayer[] = [];
                for (const p of this.players.values()) {
                    if (p.connected) {
                        list.push(p);
                    }
                }
                return list;
            },
            CountOf: (arr: unknown[]): number => {
                return arr ? arr.length : 0;
            },
            ValueInArray: (arr: unknown[], idx: number): unknown => {
                return arr ? arr[idx] : undefined;
            },
            GetObjId: (player: MockPlayer | number): number => {
                if (typeof player === 'number') return player;
                return player ? player.id : -1;
            },
            GetPlayer: (id: number): MockPlayer | undefined => {
                const p = this.players.get(id);
                return p && p.connected ? p : undefined;
            },
            RayCast: (arg1: MockPlayer | Vectors.Vector3, arg2: Vectors.Vector3, arg3?: Vectors.Vector3): void => {
                if (arg3 !== undefined) {
                    // Player raycast: mod.RayCast(player, start, end)
                    const player = arg1 as MockPlayer;
                    if (this.shouldThrowOnPlayerRaycast) {
                        throw new Error('Native player raycast failed: invalid player handle');
                    }
                    this.raycastsCalled.push({
                        player,
                        start: arg2,
                        end: arg3,
                    });
                } else {
                    // Global raycast: mod.RayCast(start, end)
                    this.raycastsCalled.push({
                        player: null,
                        start: arg1 as Vectors.Vector3,
                        end: arg2,
                    });
                }
            },
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    }
}

describe('Raycast Module Tests', () => {
    let harness: RaycastTestHarness;
    let Raycast: typeof import('../index.ts').Raycast;
    let Events: typeof import('../../events/index.ts').Events;

    beforeEach(async () => {
        harness = new RaycastTestHarness();
        // Dynamically import Events & Raycast to get fresh module state
        vi.resetModules();
        const eventsMod = await import('../../events/index.ts');
        Events = eventsMod.Events;
        const mod = await import('../index.ts');
        Raycast = mod.Raycast;
    });

    describe('Validation and Queue Capacity', () => {
        it('should no-op if neither onHit nor onMiss is provided', () => {
            expect(() => {
                // @ts-expect-error Testing invalid callbacks
                Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, {});
            }).not.toThrow();

            expect(Raycast.getPendingRayCount()).toBe(0);
        });

        it('should no-op when queue capacity is exceeded', () => {
            const start = { x: 0, y: 0, z: 0 };
            const end = { x: 10, y: 0, z: 0 };
            const noop = () => {};

            for (let i = 0; i < 512; ++i) {
                Raycast.cast(start, end, { onHit: noop });
            }

            expect(Raycast.getPendingRayCount()).toBe(512);

            expect(() => {
                Raycast.cast(start, end, { onHit: noop });
            }).not.toThrow();

            expect(Raycast.getPendingRayCount()).toBe(512);
        });
    });

    describe('Ray Dispatching and Error Handling', () => {
        it('should dispatch global raycast and resolve onHit', async () => {
            const hitCallback = vi.fn();
            Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { onHit: hitCallback });

            expect(Raycast.getPendingRayCount()).toBe(1);

            // Trigger OngoingGlobal event to drain queue
            Events.OngoingGlobal.trigger();

            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.player).toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(0);
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Simulate hit from global raycast (player objId = -1 or invalid)
            Events.OnRayCastHit.trigger(
                { id: -1 } as unknown as mod.Player,
                { x: 2, y: 3, z: 4 } as unknown as mod.Vector,
                { x: 0, y: 1, z: 0 } as unknown as mod.Vector
            );

            expect(hitCallback).toHaveBeenCalledWith({ x: 2, y: 3, z: 4 }, { x: 0, y: 1, z: 0 }, undefined, undefined);
            expect(Raycast.getInFlightRayCount()).toBe(0);
        });

        it('should retain ray at head of queue and retry when player dispatch throws', () => {
            const p1 = harness.addPlayer(0);
            const p2 = harness.addPlayer(1);

            // Register players with Raycast module via join events
            Events.OnPlayerJoinGame.trigger(p1 as unknown as mod.Player);
            Events.OnPlayerJoinGame.trigger(p2 as unknown as mod.Player);

            const hitCallback = vi.fn();
            Raycast.cast({ x: 10, y: 20, z: 30 }, { x: 40, y: 50, z: 60 }, { onHit: hitCallback });

            // Setup harness so player 0 throws on raycast
            harness.shouldThrowOnPlayerRaycast = true;

            // Trigger OngoingGlobal - global slot is idle so it gets raycast #1
            Events.OngoingGlobal.trigger();

            // Ray was dispatched via global slot (since global slot was idle first)
            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.player).toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(0);

            // Now test when global slot is occupied and player dispatch throws:
            Raycast.cast({ x: 100, y: 200, z: 300 }, { x: 400, y: 500, z: 600 }, { onHit: hitCallback });

            // Global slot is already in-flight. Next tick attempts player 0, which throws.
            // Dispatch should catch the error, disconnect player 0, NOT pop the ray from queue,
            // and then continue to player 1 which successfully dispatches the ray!
            harness.shouldThrowOnPlayerRaycast = false; // Player 1 succeeds
            Events.OngoingGlobal.trigger();

            expect(Raycast.getPendingRayCount()).toBe(0);
            expect(Raycast.getInFlightRayCount()).toBe(2);
        });

        it('should dispatch raycast and resolve onMiss', async () => {
            const missCallback = vi.fn();
            Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { onMiss: missCallback });

            Events.OngoingGlobal.trigger();
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Simulate miss event
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);

            expect(missCallback).toHaveBeenCalled();
            expect(Raycast.getInFlightRayCount()).toBe(0);
        });

        it('should handle player leave by clearing connected status', () => {
            const p1 = harness.addPlayer(5);
            Events.OnPlayerJoinGame.trigger(p1 as unknown as mod.Player);

            // Player leaves
            Events.OnPlayerLeaveGame.trigger(5);

            Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { onMiss: () => {} });

            // Global slot is dispatched, player 5 is not
            Events.OngoingGlobal.trigger();

            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.player).toBeNull();
        });
    });
});
