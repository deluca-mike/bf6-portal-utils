import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 4.0.0
export namespace MapDetector {
    const logging = new Logging('MD');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /**
     * The maps supported by the MapDetector module.
     */
    export enum Map {
        Area22B = 'Area 22B',
        Bellum1988sOperationMetro = "Bellum1988's Operation Metro",
        BlackwellFields = 'Blackwell Fields',
        CairoBazaar = 'Cairo Bazaar',
        Complex3 = 'Complex 3',
        Contaminated = 'Contaminated',
        DefenseNexus = 'Defense Nexus',
        Downtown = 'Downtown',
        Eastwood = 'Eastwood',
        EmpireState = 'Empire State',
        GolfCourse = 'Golf Course',
        RailwaytoGolmud = 'Railway to Golmud',
        IberianOffensive = 'Iberian Offensive',
        LiberationPeak = 'Liberation Peak',
        ManhattanBridge = 'Manhattan Bridge',
        Marina = 'Marina',
        MirakValley = 'Mirak Valley',
        NewSobekCity = 'New Sobek City',
        OperationFirestorm = 'Operation Firestorm',
        PortalSandbox = 'Portal Sandbox',
        RedlineStorage = 'Redline Storage',
        SaintsQuarter = 'Saints Quarter',
        SiegeOfCairo = 'Siege of Cairo',
        HagentalBase = 'Hagental Base',
    }

    const _mapKeys: Map[] = [
        Map.Area22B,
        Map.Bellum1988sOperationMetro,
        Map.BlackwellFields,
        Map.CairoBazaar,
        Map.Complex3,
        Map.Contaminated,
        Map.DefenseNexus,
        Map.Downtown,
        Map.Eastwood,
        Map.EmpireState,
        Map.GolfCourse,
        Map.HagentalBase,
        Map.IberianOffensive,
        Map.LiberationPeak,
        Map.ManhattanBridge,
        Map.Marina,
        Map.MirakValley,
        Map.NewSobekCity,
        Map.OperationFirestorm,
        Map.PortalSandbox,
        Map.RailwaytoGolmud,
        Map.RedlineStorage,
        Map.SaintsQuarter,
        Map.SiegeOfCairo,
    ];

    const _mapNative: (mod.Maps | null)[] = [
        mod.Maps.Granite_MilitaryRnD,
        null,
        mod.Maps.Badlands,
        mod.Maps.Plaza,
        mod.Maps.Granite_Underground,
        mod.Maps.Contaminated,
        mod.Maps.Granite_TechCampus,
        mod.Maps.Granite_MainStreet,
        mod.Maps.Eastwood,
        mod.Maps.Aftermath,
        mod.Maps.Granite_ClubHouse,
        mod.Maps.Subsurface,
        mod.Maps.Battery,
        mod.Maps.Capstone,
        mod.Maps.Dumbo,
        mod.Maps.Granite_Marina,
        mod.Maps.Tungsten,
        mod.Maps.Outskirts,
        mod.Maps.Firestorm,
        mod.Maps.Sand,
        mod.Maps.GolmudRailway,
        mod.Maps.Granite_MilitaryStorage,
        mod.Maps.Limestone,
        mod.Maps.Abbasid,
    ];

    /**
     * Minimum coordinate value supported by map detector (signed 16-bit integer limit: -32,768).
     */
    export const MIN_MAP_COORDINATE = -32_768;

    /**
     * Maximum coordinate value supported by map detector (signed 16-bit integer limit: 32,767).
     */
    export const MAX_MAP_COORDINATE = 32_767;

    const _mapX = new Int16Array([
        427, -202, -164, -27, 715, -143, -274, -1044, -195, -672, -299, -103, 849, 94, -323, -1474, -99, -99, -39, -30,
        -120, 566, 293, -84,
    ]);

    const _mapY = new Int16Array([
        177, 217, 76, 64, 201, 323, 138, 122, 231, 53, 191, 66, 78, 133, 52, 103, 88, 92, 124, 32, 728, 144, 70, 64,
    ]);

    const _mapZ = new Int16Array([
        -743, 20, -322, 4, -343, 7, 309, 220, -41, -115, -664, 13, 116, 77, -440, -690, -253, -124, -116, 0, 726, 356,
        134, -58,
    ]);

    let _cachedMapIndex = -1;

    /**
     * Sets the coordinates of interest for a map. Coordinates are rounded to nearest integers and clamped to [-32,768, 32,767].
     * @param map - The map to set the coordinates of interest for.
     * @param coordinates - The coordinates of interest to set for the map.
     */
    export function setCoordinates(map: Map, coordinates: Vectors.Vector3): void {
        const index = _mapKeys.indexOf(map);

        if (index === -1) return;

        _mapX[index] = Math.min(MAX_MAP_COORDINATE, Math.max(MIN_MAP_COORDINATE, Math.round(coordinates.x)));
        _mapY[index] = Math.min(MAX_MAP_COORDINATE, Math.max(MIN_MAP_COORDINATE, Math.round(coordinates.y)));
        _mapZ[index] = Math.min(MAX_MAP_COORDINATE, Math.max(MIN_MAP_COORDINATE, Math.round(coordinates.z)));
    }

    /**
     * @returns The current map as a `Map` enum value, or `null` if the map cannot be determined.
     */
    export function currentMap(): Map | null {
        if (_cachedMapIndex !== -1) return _mapKeys[_cachedMapIndex];

        let hqPosition: mod.Vector;

        try {
            hqPosition = mod.GetObjectPosition(mod.GetHQ(1));
        } catch (error: unknown) {
            logging.log('Failed to get HQ or HQ position', LogLevel.Error, error);
            return null;
        }

        const hqX = ~~mod.XComponentOf(hqPosition);
        const hqY = ~~mod.YComponentOf(hqPosition);
        const hqZ = ~~mod.ZComponentOf(hqPosition);

        for (let i = 0; i < _mapKeys.length; ++i) {
            if (hqX !== _mapX[i] || hqY !== _mapY[i] || hqZ !== _mapZ[i]) continue;

            if (_mapNative[i] === null) {
                logging.log(`Map ${_mapKeys[i]} is not available in the native mod.Maps enum`, LogLevel.Warning);
            }

            _cachedMapIndex = i;
            return _mapKeys[i];
        }

        logging.log('Failed to determine current map', LogLevel.Warning);
        return null;
    }

    /**
     * @returns The current map as a `mod.Maps` enum value, or `null` if the map cannot be determined.
     */
    export function currentNativeMap(): mod.Maps | null {
        currentMap(); // Ensure it is cached

        if (_cachedMapIndex === -1) return null;

        const nativeMap = _mapNative[_cachedMapIndex];

        if (nativeMap === null) {
            logging.log(
                `Map ${_mapKeys[_cachedMapIndex]} is not available in the native mod.Maps enum`,
                LogLevel.Warning
            );
            return null;
        }

        return nativeMap;
    }

    /**
     * @returns The current map as a string, or `null` if the map cannot be determined.
     */
    export function currentMapName(): string | null {
        return currentMap()?.toString() ?? null;
    }

    /**
     * @param map - The map to check.
     * @returns True if the current map is the given `Map` enum value.
     */
    export function isCurrentMap(map: Map): boolean {
        return currentMap() === map;
    }

    /**
     * @param map - The native map to check.
     * @returns True if the current map is the given `mod.Maps` enum value.
     */
    export function isCurrentNativeMap(map: mod.Maps): boolean {
        return currentNativeMap() === map;
    }
}
