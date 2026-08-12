import './mockMod.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    setMockHqPosition,
    setMockHqThrow,
    setMockSpatialObjectPosition,
    setMockSpatialObjectThrow,
    setMockPositionThrow,
    mockMaps,
} from './mockMod.ts';

describe('MapDetector Module Tests', () => {
    beforeEach(() => {
        vi.resetModules();
        setMockHqPosition({ x: 427, y: 177, z: -743 });
        setMockSpatialObjectPosition({ x: 427, y: 177, z: -743 });
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
        expect(logSpy).toHaveBeenCalledWith('<MD> Failed to get HQ1', undefined);
    });

    it('should return null and log error when HQ position lookup fails', async () => {
        setMockPositionThrow(true);
        const { MapDetector } = await import('../index.ts');
        const logSpy = vi.fn();
        MapDetector.setLogging(logSpy, MapDetector.LogLevel.Error);

        expect(MapDetector.currentMap()).toBeNull();
        expect(logSpy).toHaveBeenCalledWith('<MD> Failed to get HQ1 position', undefined);
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

    it('should detect map using marker spatial object when setMarkerObjectId is called', async () => {
        const { MapDetector } = await import('../index.ts');
        MapDetector.setMarkerObjectId(42);

        // HQ is set to dummy/different coordinates, marker is set to Downtown coordinates
        setMockHqPosition({ x: 9999, y: 9999, z: 9999 });
        setMockSpatialObjectPosition({ x: -1044, y: 122, z: 220 });

        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Downtown);
        expect(MapDetector.currentMapName()).toBe('Downtown');
        expect(MapDetector.currentNativeMap()).toBe(mockMaps.Granite_MainStreet);
        expect(MapDetector.isCurrentMap(MapDetector.Map.Downtown)).toBe(true);
    });

    it('should return null and log error when marker spatial object lookup fails', async () => {
        const { MapDetector } = await import('../index.ts');
        MapDetector.setMarkerObjectId(99);
        setMockSpatialObjectThrow(true);

        const logSpy = vi.fn();
        MapDetector.setLogging(logSpy, MapDetector.LogLevel.Error);

        expect(MapDetector.currentMap()).toBeNull();
        expect(logSpy).toHaveBeenCalledWith('<MD> Failed to get marker object 99', undefined);
    });

    it('should return null and log error when marker position lookup fails', async () => {
        const { MapDetector } = await import('../index.ts');
        MapDetector.setMarkerObjectId(77);
        setMockPositionThrow(true);

        const logSpy = vi.fn();
        MapDetector.setLogging(logSpy, MapDetector.LogLevel.Error);

        expect(MapDetector.currentMap()).toBeNull();
        expect(logSpy).toHaveBeenCalledWith('<MD> Failed to get marker object 77 position', undefined);
    });

    it('should log info with position for HQ and marker object when log level is Info', async () => {
        const { MapDetector } = await import('../index.ts');
        const logSpy = vi.fn();
        MapDetector.setLogging(logSpy, MapDetector.LogLevel.Info);

        setMockHqPosition({ x: 427, y: 177, z: -743 });
        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Area22B);
        expect(logSpy).toHaveBeenCalledWith('<MD> HQ1 position: <427, 177, -743>', undefined);

        // Re-import to clear cache
        vi.resetModules();
        const { MapDetector: MapDetector2 } = await import('../index.ts');
        const logSpy2 = vi.fn();
        MapDetector2.setLogging(logSpy2, MapDetector.LogLevel.Info);
        MapDetector2.setMarkerObjectId(10);
        setMockSpatialObjectPosition({ x: -164, y: 76, z: -322 });

        expect(MapDetector2.currentMap()).toBe(MapDetector2.Map.BlackwellFields);
        expect(logSpy2).toHaveBeenCalledWith('<MD> Marker object 10 position: <-164, 76, -322>', undefined);
    });

    it('should reset marker object id when null is passed to setMarkerObjectId', async () => {
        const { MapDetector } = await import('../index.ts');
        MapDetector.setMarkerObjectId(42);
        MapDetector.setMarkerObjectId(null);

        // HQ is set to Area22B coordinates, spatial object is set to different coords
        setMockHqPosition({ x: 427, y: 177, z: -743 });
        setMockSpatialObjectPosition({ x: 9999, y: 9999, z: 9999 });

        expect(MapDetector.currentMap()).toBe(MapDetector.Map.Area22B);
    });
});
