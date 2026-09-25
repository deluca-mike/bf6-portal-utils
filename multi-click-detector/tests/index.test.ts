import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiClickDetector } from '../index.ts';
import { Events } from '../../events/index.ts';

interface MockPlayer {
    _id: number;
    isAlive: boolean;
    isManDown: boolean;
    isInteracting: boolean;
}

describe('MultiClickDetector Module Tests', () => {
    let mockPlayers: Map<number, MockPlayer>;

    beforeEach(() => {
        vi.useFakeTimers();
        mockPlayers = new Map();

        const mockMod: Record<string, unknown> = {
            SoldierStateBool: {
                IsAlive: 0,
                IsManDown: 1,
                IsInteracting: 2,
            },
            GetObjId: (player: MockPlayer): number => player._id,
            GetSoldierState: (player: MockPlayer, state: number): boolean => {
                if (state === 0) return player.isAlive;
                if (state === 1) return player.isManDown;
                if (state === 2) return player.isInteracting;
                return false;
            },
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    });

    afterEach(() => {
        // Destroy all detectors
        for (let i = 0; i < 300; ++i) {
            MultiClickDetector.destroy(i as MultiClickDetector.DetectorID);
        }
        vi.useRealTimers();
    });

    function createPlayer(id: number, isAlive = true): MockPlayer {
        const player: MockPlayer = {
            _id: id,
            isAlive,
            isManDown: false,
            isInteracting: false,
        };
        mockPlayers.set(id, player);
        return player;
    }

    describe('Lifecycle & Intrusive Free List Allocation', () => {
        it('should create and destroy detectors, tracking active count', () => {
            expect(MultiClickDetector.getActiveDetectorCount()).toBe(0);

            const p1 = createPlayer(1);
            const p2 = createPlayer(2);

            const d1 = MultiClickDetector.create(p1 as unknown as mod.Player, () => {})!;
            const d2 = MultiClickDetector.create(p2 as unknown as mod.Player, () => {})!;

            expect(MultiClickDetector.getActiveDetectorCount()).toBe(2);
            expect(MultiClickDetector.isActive(d1)).toBe(true);
            expect(MultiClickDetector.isActive(d2)).toBe(true);
            expect(MultiClickDetector.isActive(-1 as MultiClickDetector.DetectorID)).toBe(false);
            expect(MultiClickDetector.isActive(99999 as MultiClickDetector.DetectorID)).toBe(false);

            MultiClickDetector.destroy(d1);
            expect(MultiClickDetector.isActive(d1)).toBe(false);
            expect(MultiClickDetector.getActiveDetectorCount()).toBe(1);

            MultiClickDetector.destroy(d2);
            expect(MultiClickDetector.isActive(d2)).toBe(false);
            expect(MultiClickDetector.getActiveDetectorCount()).toBe(0);
        });

        it('should recycle slot indices with incremented generations', () => {
            const p1 = createPlayer(1);
            const id1 = MultiClickDetector.create(p1 as unknown as mod.Player, () => {})!;
            const slot1 = (id1 as number) % 10_000;

            MultiClickDetector.destroy(id1);

            // Re-allocate from free list - should reuse slot1 with next generation
            const id2 = MultiClickDetector.create(p1 as unknown as mod.Player, () => {})!;
            const slot2 = (id2 as number) % 10_000;

            expect(slot2).toBe(slot1);
            expect(id2 as number).toBe((id1 as number) + 10_000);
            expect(MultiClickDetector.isActive(id1)).toBe(false);
            expect(MultiClickDetector.isActive(id2)).toBe(true);

            MultiClickDetector.destroy(id2);
        });

        it('should return null when pool is full and recover when freed', () => {
            const createdIds: MultiClickDetector.DetectorID[] = [];
            const player = createPlayer(1);

            for (let i = 0; i < 300; ++i) {
                createdIds.push(MultiClickDetector.create(player as unknown as mod.Player, () => {})!);
            }

            expect(MultiClickDetector.getActiveDetectorCount()).toBe(300);
            expect(MultiClickDetector.create(player as unknown as mod.Player, () => {})).toBeNull();

            // Destroy one detector and verify allocation succeeds again
            const freedId = createdIds.pop()!;
            MultiClickDetector.destroy(freedId);

            expect(MultiClickDetector.getActiveDetectorCount()).toBe(299);

            const newId = MultiClickDetector.create(player as unknown as mod.Player, () => {})!;
            expect(MultiClickDetector.isActive(newId)).toBe(true);
            createdIds.push(newId);

            for (const id of createdIds) {
                MultiClickDetector.destroy(id);
            }
            expect(MultiClickDetector.getActiveDetectorCount()).toBe(0);
        });
    });

    describe('Sequence Trigger & Callbacks', () => {
        it('should trigger callback when required clicks occur within time window', () => {
            const player = createPlayer(1);
            const callback = vi.fn();

            const detectorId = MultiClickDetector.create(player as unknown as mod.Player, callback, {
                requiredClicks: 3,
                windowMs: 1000,
            })!;

            // Click 1 (rising edge)
            player.isInteracting = true;
            Events.OngoingGlobal.trigger();
            // Falling edge
            player.isInteracting = false;
            Events.OngoingGlobal.trigger();

            expect(callback).not.toHaveBeenCalled();

            // Click 2 (rising edge)
            vi.advanceTimersByTime(200);
            player.isInteracting = true;
            Events.OngoingGlobal.trigger();
            // Falling edge
            player.isInteracting = false;
            Events.OngoingGlobal.trigger();

            expect(callback).not.toHaveBeenCalled();

            // Click 3 (rising edge) - reaches required 3 clicks
            vi.advanceTimersByTime(200);
            player.isInteracting = true;
            Events.OngoingGlobal.trigger();

            expect(callback).toHaveBeenCalledTimes(1);

            MultiClickDetector.destroy(detectorId);
        });

        it('should reset click sequence if window expires', () => {
            const player = createPlayer(1);
            const callback = vi.fn();

            const detectorId = MultiClickDetector.create(player as unknown as mod.Player, callback, {
                requiredClicks: 2,
                windowMs: 500,
            })!;

            // Click 1
            player.isInteracting = true;
            Events.OngoingGlobal.trigger();
            player.isInteracting = false;
            Events.OngoingGlobal.trigger();

            // Advance past window (600ms > 500ms)
            vi.advanceTimersByTime(600);

            // Click 2 (after window expired - should start a new sequence)
            player.isInteracting = true;
            Events.OngoingGlobal.trigger();

            expect(callback).not.toHaveBeenCalled();

            MultiClickDetector.destroy(detectorId);
        });

        it('should respect enable and disable state', () => {
            const player = createPlayer(1);
            const callback = vi.fn();

            const detectorId = MultiClickDetector.create(player as unknown as mod.Player, callback, {
                requiredClicks: 1,
            })!;

            MultiClickDetector.disable(detectorId);

            player.isInteracting = true;
            Events.OngoingGlobal.trigger();
            expect(callback).not.toHaveBeenCalled();

            player.isInteracting = false;
            Events.OngoingGlobal.trigger();

            MultiClickDetector.enable(detectorId);

            player.isInteracting = true;
            Events.OngoingGlobal.trigger();
            expect(callback).toHaveBeenCalledTimes(1);

            MultiClickDetector.destroy(detectorId);
        });
    });
});
