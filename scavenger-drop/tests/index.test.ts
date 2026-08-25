import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScavengerDrop } from '../index.ts';
import { Events } from '../../events/index.ts';

interface MockPlayer {
    _id: number;
    position: { x: number; y: number; z: number };
}

describe('ScavengerDrop Module Tests', () => {
    let closestPlayerCandidate: MockPlayer | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        closestPlayerCandidate = undefined;

        const mockMod: Record<string, unknown> = {
            GetObjId: (player: MockPlayer): number => player._id,
            GetObjectPosition: (player: MockPlayer) => player.position,
            ClosestPlayerTo: () => closestPlayerCandidate,
            DistanceBetween: (
                p1: { x: number; y: number; z: number },
                p2: { x: number; y: number; z: number }
            ): number => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dz = p1.z - p2.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            },
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    });

    afterEach(() => {
        ScavengerDrop.stopAll();
        vi.useRealTimers();
    });

    function createPlayer(id: number, x = 0, y = 0, z = 0): MockPlayer {
        return {
            _id: id,
            position: { x, y, z },
        };
    }

    describe('Lifecycle & Intrusive Free List Allocation', () => {
        it('should create and stop drops, tracking active count', () => {
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);

            const p1 = createPlayer(1, 10, 0, 0);
            const p2 = createPlayer(2, 20, 0, 0);

            const d1 = ScavengerDrop.create(p1 as unknown as mod.Player, () => {})!;
            const d2 = ScavengerDrop.create(p2 as unknown as mod.Player, () => {})!;

            expect(ScavengerDrop.getActiveDropCount()).toBe(2);
            expect(ScavengerDrop.isActive(d1)).toBe(true);
            expect(ScavengerDrop.isActive(d2)).toBe(true);
            expect(ScavengerDrop.isActive(-1 as ScavengerDrop.DropID)).toBe(false);
            expect(ScavengerDrop.isActive(99999 as ScavengerDrop.DropID)).toBe(false);

            ScavengerDrop.stop(d1);
            expect(ScavengerDrop.isActive(d1)).toBe(false);
            expect(ScavengerDrop.getActiveDropCount()).toBe(1);

            ScavengerDrop.stop(d2);
            expect(ScavengerDrop.isActive(d2)).toBe(false);
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });

        it('should recycle slot indices with incremented generations', () => {
            const p1 = createPlayer(1, 10, 0, 0);
            const id1 = ScavengerDrop.create(p1 as unknown as mod.Player, () => {})!;
            const slot1 = (id1 as number) % 10_000;

            ScavengerDrop.stop(id1);

            // Re-allocate from free list - should reuse slot1 with next generation
            const id2 = ScavengerDrop.create(p1 as unknown as mod.Player, () => {})!;
            const slot2 = (id2 as number) % 10_000;

            expect(slot2).toBe(slot1);
            expect(id2 as number).toBe((id1 as number) + 10_000);
            expect(ScavengerDrop.isActive(id1)).toBe(false);
            expect(ScavengerDrop.isActive(id2)).toBe(true);

            ScavengerDrop.stop(id2);
        });

        it('should return null when pool is full and recover when freed', () => {
            const createdIds: ScavengerDrop.DropID[] = [];
            const player = createPlayer(1, 0, 0, 0);

            for (let i = 0; i < 128; ++i) {
                createdIds.push(ScavengerDrop.create(player as unknown as mod.Player, () => {})!);
            }

            expect(ScavengerDrop.getActiveDropCount()).toBe(128);
            expect(ScavengerDrop.create(player as unknown as mod.Player, () => {})).toBeNull();

            // Stop one drop and verify allocation succeeds again
            const freedId = createdIds.pop()!;
            ScavengerDrop.stop(freedId);

            expect(ScavengerDrop.getActiveDropCount()).toBe(127);

            const newId = ScavengerDrop.create(player as unknown as mod.Player, () => {})!;
            expect(ScavengerDrop.isActive(newId)).toBe(true);
            createdIds.push(newId);

            ScavengerDrop.stopAll();
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });
    });

    describe('Expiration & Proximity Detection', () => {
        it('should expire drop after duration', () => {
            const player = createPlayer(1, 0, 0, 0);
            const onScavenge = vi.fn();

            const dropId = ScavengerDrop.create(player as unknown as mod.Player, onScavenge, {
                duration: 5000,
                checkInterval: 200,
            })!;

            expect(ScavengerDrop.isActive(dropId)).toBe(true);

            // Advance past expiration time
            vi.advanceTimersByTime(5100);
            Events.OngoingGlobal.trigger();

            expect(ScavengerDrop.isActive(dropId)).toBe(false);
            expect(onScavenge).not.toHaveBeenCalled();
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });

        it('should trigger onScavenge when closest player is within 2 meters', () => {
            const deadPlayer = createPlayer(1, 0, 0, 0);
            const scavengerPlayer = createPlayer(2, 1, 0, 0); // 1 meter away (< 2m threshold)
            closestPlayerCandidate = scavengerPlayer;

            const onScavenge = vi.fn();
            const dropId = ScavengerDrop.create(deadPlayer as unknown as mod.Player, onScavenge, {
                checkInterval: 200,
            })!;

            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();

            expect(onScavenge).toHaveBeenCalledWith(scavengerPlayer, undefined, undefined, undefined);
            expect(ScavengerDrop.isActive(dropId)).toBe(false);
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });
    });
});
