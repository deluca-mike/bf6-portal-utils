import './mockMod.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setMockHqPosition, setMockHqThrow, mockMaps } from './mockMod.ts';

describe('MapDetector Module Tests', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should detect Area 22B from HQ position and return correct native map and name', async () => {
        setMockHqPosition({ x: 427, y: 177, z: -743 });
        const { MapDetector } = await import('../index.ts');

        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Area22B);
        expect(MapDetector.currentMapName()).toBe('Area 22B');
        expect(MapDetector.currentNativeMap()).toBe(mockMaps.Granite_MilitaryRnD);
        expect(MapDetector.isCurrentMap(MapDetector.Map.Area22B)).toBe(true);
        expect(MapDetector.isCurrentMap(MapDetector.Map.Downtown)).toBe(false);
        expect(MapDetector.isCurrentNativeMap(mockMaps.Granite_MilitaryRnD as unknown as mod.Maps)).toBe(true);
    });

    it('should detect custom map Bellum1988sOperationMetro and return null for native map', async () => {
        setMockHqPosition({ x: -202, y: 217, z: 20 });
        const { MapDetector } = await import('../index.ts');

        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Bellum1988sOperationMetro);
        expect(MapDetector.currentMapName()).toBe("Bellum1988's Operation Metro");
        expect(MapDetector.currentNativeMap()).toBeNull();
        expect(MapDetector.isCurrentMap(MapDetector.Map.Bellum1988sOperationMetro)).toBe(true);
    });

    it('should return null when HQ coordinates match no known map', async () => {
        setMockHqPosition({ x: 9999, y: 9999, z: 9999 });
        const { MapDetector } = await import('../index.ts');

        expect(MapDetector.currentMap()).toBeNull();
        expect(MapDetector.currentMapName()).toBeNull();
        expect(MapDetector.currentNativeMap()).toBeNull();
        expect(MapDetector.isCurrentMap(MapDetector.Map.Downtown)).toBe(false);
    });

    it('should return null and log error when HQ lookup fails', async () => {
        setMockHqThrow(true);
        const { MapDetector } = await import('../index.ts');
        const logSpy = vi.fn();
        MapDetector.setLogging(logSpy, MapDetector.LogLevel.Error);

        expect(MapDetector.currentMap()).toBeNull();
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to get HQ or HQ position'),
            expect.any(Error)
        );
    });

    it('should allow setting custom map coordinates with rounding', async () => {
        const { MapDetector } = await import('../index.ts');

        // Update Downtown coordinates to custom coords
        MapDetector.setCoordinates(MapDetector.Map.Downtown, { x: 123.4, y: 456.7, z: -789.2 });
        setMockHqPosition({ x: 123, y: 457, z: -789 });
        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Downtown);
    });

    it('should clamp coordinates to MIN_MAP_COORDINATE and MAX_MAP_COORDINATE', async () => {
        const { MapDetector } = await import('../index.ts');

        MapDetector.setCoordinates(MapDetector.Map.Eastwood, { x: 99999, y: -99999, z: 0 });
        setMockHqPosition({ x: MapDetector.MAX_MAP_COORDINATE, y: MapDetector.MIN_MAP_COORDINATE, z: 0 });
        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Eastwood);
    });

    it('should ignore setCoordinates if map is not recognized', async () => {
        const { MapDetector } = await import('../index.ts');
        expect(() => {
            MapDetector.setCoordinates('InvalidMap' as unknown as typeof MapDetector.Map.Area22B, {
                x: 0,
                y: 0,
                z: 0,
            });
        }).not.toThrow();
    });
});
