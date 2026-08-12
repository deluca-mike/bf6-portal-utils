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
        it('should return valid RaycastID on success and null when queue capacity is exceeded', () => {
            const start = { x: 0, y: 0, z: 0 };
            const end = { x: 10, y: 0, z: 0 };
            const noop = () => {};

            const ids: (Raycast.RaycastID | null)[] = [];
            for (let i = 0; i < 512; ++i) {
                ids.push(Raycast.cast(start, end, noop));
            }

            expect(Raycast.getPendingRayCount()).toBe(512);
            expect(ids.every((id) => typeof id === 'number' && id > 0)).toBe(true);

            // 513th cast in the same priority level returns null
            const overflow = Raycast.cast(start, end, noop);
            expect(overflow).toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(512);
        });
    });

    describe('Ray Cancellation', () => {
        it('should drop canceled queued rays without calling mod.RayCast or callbacks', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            const id1 = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, callback1);
            const id2 = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 20, z: 0 }, callback2);

            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(2);

            // Cancel the first ray while still in queue
            const canceled = Raycast.cancel(id1!);
            expect(canceled).toBe(true);

            // Trigger OngoingGlobal - the canceled ray should be skipped and id2 dispatched!
            Events.OngoingGlobal.trigger();

            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.end.y).toBe(20); // Only ray 2 was sent to engine
            expect(callback1).not.toHaveBeenCalled();
            expect(Raycast.getPendingRayCount()).toBe(0);
            expect(Raycast.getInFlightRayCount()).toBe(1);
        });

        it('should suppress callbacks for in-flight rays canceled after engine dispatch', () => {
            const callback = vi.fn();

            const id = Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, callback);
            expect(id).not.toBeNull();

            // Dispatch to engine
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(1);
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Cancel the in-flight ray
            const canceled = Raycast.cancel(id!);
            expect(canceled).toBe(true);

            // Simulate hit from engine
            Events.OnRayCastHit.trigger(
                { id: -1 } as unknown as mod.Player,
                { x: 2, y: 3, z: 4 } as unknown as mod.Vector,
                { x: 0, y: 1, z: 0 } as unknown as mod.Vector
            );

            // Worker slot freed, but callback suppressed
            expect(callback).not.toHaveBeenCalled();
            expect(Raycast.getInFlightRayCount()).toBe(0);
        });

        it('should return false when canceling an invalid or already completed RaycastID', () => {
            expect(Raycast.cancel(Raycast.INVALID_RAYCAST_ID)).toBe(false);
            expect(Raycast.cancel(0 as Raycast.RaycastID)).toBe(false);
            expect(Raycast.cancel(-5 as Raycast.RaycastID)).toBe(false);

            const id = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, () => {});
            expect(id).not.toBeNull();

            Events.OngoingGlobal.trigger();
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);

            // Already completed ray cannot be canceled again
            expect(Raycast.cancel(id!)).toBe(false);
        });
    });

    describe('In-Place Ray Updates (Raycast.update)', () => {
        it('should update start/end coordinates of pending ray in queue', () => {
            const id = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, () => {});
            expect(id).not.toBeNull();

            const updated = Raycast.update(id!, { x: 5, y: 5, z: 5 }, { x: 5, y: 25, z: 5 });
            expect(updated).toBe(true);

            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.start).toEqual({ x: 5, y: 5, z: 5 });
            expect(harness.raycastsCalled[0]?.end).toEqual({ x: 5, y: 25, z: 5 });
        });

        it('should return false when updating an in-flight or invalid ray', () => {
            const id = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, () => {});
            expect(id).not.toBeNull();

            // Dispatch to engine
            Events.OngoingGlobal.trigger();
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Updating in-flight ray fails
            const updated = Raycast.update(id!, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 });
            expect(updated).toBe(false);
        });
    });

    describe('Deadlines and Expiry Pruning', () => {
        it('should drop rays that exceed maxAgeTicks without calling mod.RayCast or callbacks', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            // Fill slot so ray 1 sits in queue
            const id1 = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, callback1, { maxAgeTicks: 1 });
            const id2 = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }, callback2);

            expect(Raycast.isActive(id1!)).toBe(true);
            expect(Raycast.isActive(id2!)).toBe(true);

            // Tick 1: Ray 1 is dispatched
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(1);

            // Add ray 3 with maxAgeTicks: 1 while slot is still occupied
            const callback3 = vi.fn();
            const id3 = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, callback3, { maxAgeTicks: 1 });
            expect(Raycast.isActive(id3!)).toBe(true);

            // Tick 2: Global slot still occupied, ray 3 age increases
            Events.OngoingGlobal.trigger();

            // Tick 3: Resolve Ray 1, global slot frees up, ray 2 is dispatched (head of queue)
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            Events.OngoingGlobal.trigger();

            // Ray 2 was dispatched
            expect(harness.raycastsCalled.length).toBe(2);
            expect(harness.raycastsCalled[1]?.end.y).toBe(2); // Ray 2

            // Tick 4: Resolve Ray 2, global slot frees up, ray 3 is now at head of queue and expired (> maxAgeTicks: 1)
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            Events.OngoingGlobal.trigger();

            // Ray 3 was dropped silently without calling mod.RayCast or its callback
            expect(callback3).not.toHaveBeenCalled();
            expect(Raycast.isActive(id3!)).toBe(false);
            expect(Raycast.getPendingRayCount()).toBe(0);
        });

        it('should correctly report isActive across lifecycle transitions', () => {
            const callback = vi.fn();
            const id = Raycast.cast({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, callback);

            expect(Raycast.isActive(id!)).toBe(true);

            // Dispatch to engine
            Events.OngoingGlobal.trigger();
            expect(Raycast.isActive(id!)).toBe(true); // Still active (in-flight)

            // Resolve hit
            Events.OnRayCastHit.trigger(
                { id: -1 } as unknown as mod.Player,
                { x: 0, y: 5, z: 0 } as unknown as mod.Vector,
                { x: 0, y: 1, z: 0 } as unknown as mod.Vector
            );

            expect(Raycast.isActive(id!)).toBe(false); // Completed -> inactive
            expect(Raycast.isActive(Raycast.INVALID_RAYCAST_ID)).toBe(false);
            expect(Raycast.isActive(99999 as Raycast.RaycastID)).toBe(false);
        });
    });

    describe('Ray Dispatching and Error Handling', () => {
        it('should dispatch global raycast and resolve hit callback', async () => {
            const callback = vi.fn();
            Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, callback);

            expect(Raycast.getPendingRayCount()).toBe(1);

            // Trigger OngoingGlobal event to drain queue
            Events.OngoingGlobal.trigger();

            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.player).toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(0);
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Simulate hit from global raycast
            Events.OnRayCastHit.trigger(
                { id: -1 } as unknown as mod.Player,
                { x: 2, y: 3, z: 4 } as unknown as mod.Vector,
                { x: 0, y: 1, z: 0 } as unknown as mod.Vector
            );

            expect(callback).toHaveBeenCalledWith(true, { x: 2, y: 3, z: 4 }, { x: 0, y: 1, z: 0 }, undefined);
            expect(Raycast.getInFlightRayCount()).toBe(0);
        });

        it('should dispatch raycast and resolve miss callback', async () => {
            const callback = vi.fn();
            Raycast.cast({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, callback);

            Events.OngoingGlobal.trigger();
            expect(Raycast.getInFlightRayCount()).toBe(1);

            // Simulate miss event
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);

            expect(callback).toHaveBeenCalledWith(false, undefined, undefined, undefined);
            expect(Raycast.getInFlightRayCount()).toBe(0);
        });

        it('should retain ray at head of queue and retry when player dispatch throws', () => {
            const p1 = harness.addPlayer(0);
            const p2 = harness.addPlayer(1);

            // Register players with Raycast module via join events
            Events.OnPlayerJoinGame.trigger(p1 as unknown as mod.Player);
            Events.OnPlayerJoinGame.trigger(p2 as unknown as mod.Player);

            const callback = vi.fn();
            Raycast.cast({ x: 10, y: 20, z: 30 }, { x: 40, y: 50, z: 60 }, callback);

            // Setup harness so player 0 throws on raycast
            harness.shouldThrowOnPlayerRaycast = true;

            // Trigger OngoingGlobal - global slot is idle so it gets raycast #1
            Events.OngoingGlobal.trigger();

            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.player).toBeNull();
            expect(Raycast.getPendingRayCount()).toBe(0);

            // Occupy slot and test error retry
            Raycast.cast({ x: 100, y: 200, z: 300 }, { x: 400, y: 500, z: 600 }, callback);

            harness.shouldThrowOnPlayerRaycast = false; // Player 1 succeeds
            Events.OngoingGlobal.trigger();

            expect(Raycast.getPendingRayCount()).toBe(0);
            expect(Raycast.getInFlightRayCount()).toBe(2);
        });

        it('should dispatch raycasts strictly in priority order (Critical > Physics > Standard > Ambient)', () => {
            const results: string[] = [];

            // Enqueue rays in reverse priority order
            Raycast.cast(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 },
                () => {
                    results.push('ambient');
                },
                { priority: Raycast.Priority.Ambient }
            );
            Raycast.cast(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 2, z: 0 },
                () => {
                    results.push('standard');
                },
                { priority: Raycast.Priority.Standard }
            );
            Raycast.cast(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 3, z: 0 },
                () => {
                    results.push('physics');
                },
                { priority: Raycast.Priority.Physics }
            );
            Raycast.cast(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 4, z: 0 },
                () => {
                    results.push('critical');
                },
                { priority: Raycast.Priority.Critical }
            );

            expect(Raycast.getPendingRayCount()).toBe(4);
            expect(Raycast.getPendingRayCount(Raycast.Priority.Critical)).toBe(1);
            expect(Raycast.getPendingRayCount(Raycast.Priority.Physics)).toBe(1);
            expect(Raycast.getPendingRayCount(Raycast.Priority.Standard)).toBe(1);
            expect(Raycast.getPendingRayCount(Raycast.Priority.Ambient)).toBe(1);

            // Tick 1: Only 1 global slot available -> Critical must be dispatched first
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(1);
            expect(harness.raycastsCalled[0]?.end.y).toBe(4); // Critical ray
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            expect(results).toEqual(['critical']);

            // Tick 2: Physics must be dispatched next
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(2);
            expect(harness.raycastsCalled[1]?.end.y).toBe(3); // Physics ray
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            expect(results).toEqual(['critical', 'physics']);

            // Tick 3: Standard must be dispatched next
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(3);
            expect(harness.raycastsCalled[2]?.end.y).toBe(2); // Standard ray
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            expect(results).toEqual(['critical', 'physics', 'standard']);

            // Tick 4: Ambient must be dispatched last
            Events.OngoingGlobal.trigger();
            expect(harness.raycastsCalled.length).toBe(4);
            expect(harness.raycastsCalled[3]?.end.y).toBe(1); // Ambient ray
            Events.OnRayCastMissed.trigger({ id: -1 } as unknown as mod.Player);
            expect(results).toEqual(['critical', 'physics', 'standard', 'ambient']);
        });
    });
});
