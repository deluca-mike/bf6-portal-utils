import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vectors } from '../../vectors/index.ts';

interface MockPlayer {
    _id: number;
    eyePosition: Vectors.Vector3;
    facingDirection: Vectors.Vector3;
    isZooming: boolean;
}

describe('PortalGadget Module Tests', () => {
    let mockPlayer: MockPlayer;

    beforeEach(() => {
        vi.resetModules();

        mockPlayer = {
            _id: 1,
            eyePosition: { x: 0, y: 1.8, z: 0 },
            facingDirection: { x: 0, y: 0, z: 1 },
            isZooming: false,
        };

        const mockMod: Record<string, unknown> = {
            SoldierStateVector: {
                EyePosition: 100,
                GetFacingDirection: 101,
            },
            SoldierStateBool: {
                IsZooming: 200,
            },
            GetSoldierState: (player: MockPlayer, state: number) => {
                if (state === 100) return player.eyePosition;
                if (state === 101) return player.facingDirection;
                if (state === 200) return player.isZooming;
                return undefined;
            },
            CreateVector: (x: number, y: number, z: number) => ({ x, y, z }),
            XComponentOf: (v: Vectors.Vector3) => v.x,
            YComponentOf: (v: Vectors.Vector3) => v.y,
            ZComponentOf: (v: Vectors.Vector3) => v.z,
        };

        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    });

    it('should subscribe and unsubscribe to onFireStart and onFireStop', async () => {
        const { Events } = await import('../../events/index.ts');
        const { PortalGadget } = await import('../index.ts');

        const fireStartHandler = vi.fn();
        const fireStopHandler = vi.fn();

        const unsubStart = PortalGadget.onFireStart(fireStartHandler);
        const unsubStop = PortalGadget.onFireStop(fireStopHandler);

        // Trigger fire start
        Events.OnPortalGadgetFireStart.trigger(mockPlayer as unknown as mod.Player);
        expect(fireStartHandler).toHaveBeenCalledWith(mockPlayer, false, expect.any(Function), undefined);

        // Trigger fire stop
        Events.OnPortalGadgetFireStop.trigger(mockPlayer as unknown as mod.Player);
        expect(fireStopHandler).toHaveBeenCalledWith(mockPlayer, false, expect.any(Function), undefined);

        // Unsubscribe
        unsubStart();
        unsubStop();

        Events.OnPortalGadgetFireStart.trigger(mockPlayer as unknown as mod.Player);
        Events.OnPortalGadgetFireStop.trigger(mockPlayer as unknown as mod.Player);

        expect(fireStartHandler).toHaveBeenCalledTimes(1);
        expect(fireStopHandler).toHaveBeenCalledTimes(1);
    });

    it('should calculate laser ray and resolve onHit when calling getLaserTarget', async () => {
        const { Raycast } = await import('../../raycast/index.ts');
        const { PortalGadget } = await import('../index.ts');

        const raycastSpy = vi.spyOn(Raycast, 'cast').mockImplementation((start, end, options) => {
            options?.onHit?.({ x: 10, y: 20, z: 30 });
        });

        const target = await PortalGadget.getLaserTarget(mockPlayer as unknown as mod.Player);

        expect(raycastSpy).toHaveBeenCalled();
        expect(target).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should resolve to undefined when laser ray misses', async () => {
        const { Raycast } = await import('../../raycast/index.ts');
        const { PortalGadget } = await import('../index.ts');

        vi.spyOn(Raycast, 'cast').mockImplementation((start, end, options) => {
            options?.onMiss?.();
        });

        const target = await PortalGadget.getLaserTarget(mockPlayer as unknown as mod.Player);
        expect(target).toBeUndefined();
    });

    it('should share/cache getTarget promise across handlers on same event', async () => {
        const { Events } = await import('../../events/index.ts');
        const { Raycast } = await import('../../raycast/index.ts');
        const { PortalGadget } = await import('../index.ts');

        const raycastSpy = vi.spyOn(Raycast, 'cast').mockImplementation((start, end, options) => {
            options?.onHit?.({ x: 5, y: 5, z: 5 });
        });

        let targetPromise1: Promise<mod.Vector | undefined> | null = null;
        let targetPromise2: Promise<mod.Vector | undefined> | null = null;

        PortalGadget.onFireStart((player, isZooming, getTarget) => {
            targetPromise1 = getTarget();
        });

        PortalGadget.onFireStart((player, isZooming, getTarget) => {
            targetPromise2 = getTarget();
        });

        Events.OnPortalGadgetFireStart.trigger(mockPlayer as unknown as mod.Player);

        expect(targetPromise1).not.toBeNull();
        expect(targetPromise2).not.toBeNull();
        expect(targetPromise1).toBe(targetPromise2); // same cached promise reference

        const result = await targetPromise1;
        expect(result).toEqual({ x: 5, y: 5, z: 5 });
        expect(raycastSpy).toHaveBeenCalledTimes(1);
    });
});
