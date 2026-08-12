import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScavengerDrop } from '../index.ts';
import { Events } from '../../events/index.ts';
import { PlayerLocations } from '../../player-locations/index.ts';

interface MockPlayer {
    _id: number;
    position: { x: number; y: number; z: number };
}

describe('ScavengerDrop Module Tests', () => {
    let activePlayers: MockPlayer[] = [];

    beforeEach(() => {
        vi.useFakeTimers();
        activePlayers = [];

        const mockMod: Record<string, unknown> = {
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
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
        PlayerLocations.initialize();
    });

    afterEach(() => {
        ScavengerDrop.stopAll();
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

    describe('Lifecycle & Intrusive Free List Allocation', () => {
        it('should create and stop drops, tracking active count', () => {
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);

            const p1 = createPlayer(1, 10, 0, 0);
            const p2 = createPlayer(2, 20, 0, 0);
            Events.OngoingGlobal.trigger();

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
            Events.OngoingGlobal.trigger();

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
            const player = createPlayer(1, 10, 0, 0);
            Events.OngoingGlobal.trigger();

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

        it('should return null if player position is unavailable or player is untracked', () => {
            const untrackedPlayer = { _id: 99, position: { x: 0, y: 0, z: 0 } };
            const dropId = ScavengerDrop.create(untrackedPlayer as unknown as mod.Player, () => {});
            expect(dropId).toBeNull();
        });
    });

    describe('Expiration & Proximity Detection', () => {
        it('should expire drop after duration', () => {
            const player = createPlayer(1, 10, 0, 0);
            Events.OngoingGlobal.trigger();

            const onScavenge = vi.fn();
            const dropId = ScavengerDrop.create(player as unknown as mod.Player, onScavenge, 5000)!;

            // Player is now dead / unspawned at origin
            player.position = { x: 0, y: 0, z: 0 };

            expect(ScavengerDrop.isActive(dropId)).toBe(true);

            // Advance past expiration time
            vi.advanceTimersByTime(5100);
            Events.OngoingGlobal.trigger();

            expect(ScavengerDrop.isActive(dropId)).toBe(false);
            expect(onScavenge).not.toHaveBeenCalled();
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });

        it('should trigger onScavenge when a player enters the 2 meters sphere', () => {
            const deadPlayer = createPlayer(1, 10, 0, 0);
            const scavengerPlayer = createPlayer(2, 50, 0, 0); // 40 meters away initially
            Events.OngoingGlobal.trigger();

            const onScavenge = vi.fn();
            const dropId = ScavengerDrop.create(deadPlayer as unknown as mod.Player, onScavenge)!;

            // Dead player is now unspawned at origin
            deadPlayer.position = { x: 0, y: 0, z: 0 };

            // Tick while far away - should not trigger
            Events.OngoingGlobal.trigger();
            expect(onScavenge).not.toHaveBeenCalled();
            expect(ScavengerDrop.isActive(dropId)).toBe(true);

            // Move scavenger within 1 meter of drop (< 2m threshold)
            scavengerPlayer.position = { x: 11, y: 0, z: 0 };
            Events.OngoingGlobal.trigger();

            expect(onScavenge).toHaveBeenCalledWith(scavengerPlayer, undefined, undefined, undefined);
            expect(ScavengerDrop.isActive(dropId)).toBe(false);
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });

        it('should only trigger once even if multiple players enter the sphere', () => {
            const deadPlayer = createPlayer(1, 10, 0, 0);
            const scavenger1 = createPlayer(2, 50, 0, 0);
            const scavenger2 = createPlayer(3, 60, 0, 0);
            Events.OngoingGlobal.trigger();

            const onScavenge = vi.fn();
            const dropId = ScavengerDrop.create(deadPlayer as unknown as mod.Player, onScavenge)!;

            // Dead player is now unspawned at origin
            deadPlayer.position = { x: 0, y: 0, z: 0 };

            // Move both scavengers inside the 2m sphere simultaneously
            scavenger1.position = { x: 10.5, y: 0, z: 0 };
            scavenger2.position = { x: 10.8, y: 0, z: 0 };
            Events.OngoingGlobal.trigger();

            expect(onScavenge).toHaveBeenCalledTimes(1);
            expect(ScavengerDrop.isActive(dropId)).toBe(false);
            expect(ScavengerDrop.getActiveDropCount()).toBe(0);
        });

        it('should cleanly unsubscribe when manually stopped', () => {
            const deadPlayer = createPlayer(1, 10, 0, 0);
            const scavengerPlayer = createPlayer(2, 50, 0, 0);
            Events.OngoingGlobal.trigger();

            const onScavenge = vi.fn();
            const dropId = ScavengerDrop.create(deadPlayer as unknown as mod.Player, onScavenge)!;

            // Dead player is now unspawned at origin
            deadPlayer.position = { x: 0, y: 0, z: 0 };

            ScavengerDrop.stop(dropId);
            expect(ScavengerDrop.isActive(dropId)).toBe(false);

            // Move player into drop zone after stop
            scavengerPlayer.position = { x: 10.5, y: 0, z: 0 };
            Events.OngoingGlobal.trigger();

            expect(onScavenge).not.toHaveBeenCalled();
        });
    });
});
