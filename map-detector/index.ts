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
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
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
        HagentalBase = 'Hagental Base',
        IberianOffensive = 'Iberian Offensive',
        LiberationPeak = 'Liberation Peak',
        ManhattanBridge = 'Manhattan Bridge',
        Marina = 'Marina',
        MirakValley = 'Mirak Valley',
        NewSobekCity = 'New Sobek City',
        OperationFirestorm = 'Operation Firestorm',
        PortalOcean = 'Portal Ocean',
        PortalSandbox = 'Portal Sandbox',
        RailwaytoGolmud = 'Railway to Golmud',
        RedlineStorage = 'Redline Storage',
        SaintsQuarter = 'Saints Quarter',
        SiegeOfCairo = 'Siege of Cairo',
        WakeIsland = 'Wake Island',
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
        Map.WakeIsland,
        Map.PortalOcean,
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
        mod.Maps.Atoll,
        mod.Maps.Ocean,
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
        -120, 566, 293, -84, 492, 65,
    ]);

    const _mapY = new Int16Array([
        177, 217, 76, 64, 201, 323, 138, 122, 231, 53, 191, 66, 78, 133, 52, 103, 88, 92, 124, 32, 728, 144, 70, 64,
        106, 71,
    ]);

    const _mapZ = new Int16Array([
        -743, 20, -322, 4, -343, 7, 309, 220, -41, -115, -664, 13, 116, 77, -440, -690, -253, -124, -116, 0, 726, 356,
        134, -58, 357, -20,
    ]);

    let _markerObjectId: number | null;

    let _cachedMapIndex = -1;

    /**
     * Sets the marker spatial object ID to use for map detection instead of Team 1's HQ, or `null` to reset.
     * @param id - The ID of the spatial marker object, or `null` to reset to using Team 1's HQ.
     */
    export function setMarkerObjectId(id: number | null): void {
        _markerObjectId = id;
    }

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

        let target: mod.SpatialObject | mod.HQ | undefined;

        if (_markerObjectId != null) {
            const marker = mod.GetSpatialObject(_markerObjectId);

            if (!marker || mod.IsUndefined(marker)) {
                logging.log(`Failed to get marker object ${_markerObjectId}`, LogLevel.Error);
                return null;
            }

            target = marker;
        } else {
            const hq = mod.GetHQ(1);

            if (!hq || mod.IsUndefined(hq)) {
                logging.log('Failed to get HQ1', LogLevel.Error);
                return null;
            }

            target = hq;
        }

        const position = mod.GetObjectPosition(target);

        if (!position || mod.IsUndefined(position)) {
            logging.log(
                _markerObjectId != null
                    ? `Failed to get marker object ${_markerObjectId} position`
                    : 'Failed to get HQ1 position',
                LogLevel.Error
            );
            return null;
        }

        const targetX = ~~mod.XComponentOf(position);
        const targetY = ~~mod.YComponentOf(position);
        const targetZ = ~~mod.ZComponentOf(position);

        if (logging.willLog(LogLevel.Info)) {
            logging.log(
                _markerObjectId != null
                    ? `Marker object ${_markerObjectId} position: <${targetX}, ${targetY}, ${targetZ}>`
                    : `HQ1 position: <${targetX}, ${targetY}, ${targetZ}>`
            );
        }

        for (let i = 0; i < _mapKeys.length; ++i) {
            if (targetX !== _mapX[i] || targetY !== _mapY[i] || targetZ !== _mapZ[i]) continue;

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
