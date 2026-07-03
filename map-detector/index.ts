import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 3.4.0
export namespace MapDetector {
    const logging = new Logging('MD');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
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

    type MapData = {
        coordinates: Vectors.Vector3;
        nativeMap: mod.Maps | undefined;
    };

    const maps: Record<Map, MapData> = {
        [Map.Area22B]: {
            coordinates: { x: 427, y: 177, z: -743 },
            nativeMap: mod.Maps.Granite_MilitaryRnD,
        },
        [Map.Bellum1988sOperationMetro]: {
            coordinates: { x: -202, y: 217, z: 20 },
            nativeMap: undefined,
        },
        [Map.BlackwellFields]: {
            coordinates: { x: -164, y: 76, z: -322 },
            nativeMap: mod.Maps.Badlands,
        },
        [Map.CairoBazaar]: {
            coordinates: { x: -27, y: 64, z: 4 },
            nativeMap: mod.Maps.Plaza,
        },
        [Map.Complex3]: {
            coordinates: { x: 715, y: 201, z: -343 },
            nativeMap: mod.Maps.Granite_Underground,
        },
        [Map.Contaminated]: {
            coordinates: { x: -143, y: 323, z: 7 },
            nativeMap: mod.Maps.Contaminated,
        },
        [Map.DefenseNexus]: {
            coordinates: { x: -274, y: 138, z: 309 },
            nativeMap: mod.Maps.Granite_TechCampus,
        },
        [Map.Downtown]: {
            coordinates: { x: -1044, y: 122, z: 220 },
            nativeMap: mod.Maps.Granite_MainStreet,
        },
        [Map.Eastwood]: {
            coordinates: { x: -195, y: 231, z: -41 },
            nativeMap: mod.Maps.Eastwood,
        },
        [Map.EmpireState]: {
            coordinates: { x: -672, y: 53, z: -115 },
            nativeMap: mod.Maps.Aftermath,
        },
        [Map.GolfCourse]: {
            coordinates: { x: -299, y: 191, z: -664 },
            nativeMap: mod.Maps.Granite_ClubHouse,
        },
        [Map.HagentalBase]: {
            coordinates: { x: -103, y: 66, z: 13 },
            nativeMap: mod.Maps.Subsurface,
        },
        [Map.IberianOffensive]: {
            coordinates: { x: 849, y: 78, z: 116 },
            nativeMap: mod.Maps.Battery,
        },
        [Map.LiberationPeak]: {
            coordinates: { x: 94, y: 133, z: 77 },
            nativeMap: mod.Maps.Capstone,
        },
        [Map.ManhattanBridge]: {
            coordinates: { x: -323, y: 52, z: -440 },
            nativeMap: mod.Maps.Dumbo,
        },
        [Map.Marina]: {
            coordinates: { x: -1474, y: 103, z: -690 },
            nativeMap: mod.Maps.Granite_Marina,
        },
        [Map.MirakValley]: {
            coordinates: { x: -99, y: 88, z: -253 },
            nativeMap: mod.Maps.Tungsten,
        },
        [Map.NewSobekCity]: {
            coordinates: { x: -99, y: 92, z: -124 },
            nativeMap: mod.Maps.Outskirts,
        },
        [Map.OperationFirestorm]: {
            coordinates: { x: -39, y: 124, z: -116 },
            nativeMap: mod.Maps.Firestorm,
        },
        [Map.PortalSandbox]: {
            coordinates: { x: -30, y: 32, z: 0 },
            nativeMap: mod.Maps.Sand,
        },
        [Map.RailwaytoGolmud]: {
            coordinates: { x: -120, y: 728, z: 726 },
            nativeMap: mod.Maps.GolmudRailway,
        },
        [Map.RedlineStorage]: {
            coordinates: { x: 566, y: 144, z: 356 },
            nativeMap: mod.Maps.Granite_MilitaryStorage,
        },
        [Map.SaintsQuarter]: {
            coordinates: { x: 293, y: 70, z: 134 },
            nativeMap: mod.Maps.Limestone,
        },
        [Map.SiegeOfCairo]: {
            coordinates: { x: -84, y: 64, z: -58 },
            nativeMap: mod.Maps.Abbasid,
        },
    };

    /**
     * Sets the coordinates of interest for a map.
     * @param map - The map to set the coordinates of interest for.
     * @param coordinates - The coordinates of interest to set for the map.
     */
    export function setCoordinates(map: Map, coordinates: Vectors.Vector3): void {
        maps[map].coordinates = coordinates;
    }

    /**
     * @returns The current map as a `Map` enum value, or `undefined` if the map cannot be determined.
     */
    export function currentMap(): Map | undefined {
        const coords = getCoordinates();

        if (!coords) return;

        for (const map in maps) {
            const { coordinates, nativeMap } = maps[map as Map];

            if (coords.x != ~~coordinates.x || coords.y != ~~coordinates.y || coords.z != ~~coordinates.z) continue;

            if (!nativeMap) {
                logging.log(`Map ${map} is not available in the native mod.Maps enum.`, LogLevel.Warning);
                continue;
            }

            return map as Map;
        }

        logging.log('Failed to determine current map.', LogLevel.Warning);

        return;
    }

    /**
     * @returns The current map as a `mod.Maps` enum value, or `undefined` if the map cannot be determined.
     */
    export function currentNativeMap(): mod.Maps | undefined {
        const map = currentMap();

        if (!map) return;

        if (!maps[map].nativeMap) {
            logging.log(`Map ${map} is not available in the native mod.Maps enum.`, LogLevel.Warning);
            return;
        }

        return maps[map].nativeMap;
    }

    /**
     * @returns The current map as a string, or `undefined` if the map cannot be determined.
     */
    export function currentMapName(): string | undefined {
        return currentMap()?.toString();
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

    /**
     * @returns The HQ coordinates of the current map (used for finding the HQ coordinates of the current map).
     */
    function getCoordinates(): Vectors.Vector3 | undefined {
        try {
            const position = mod.GetObjectPosition(mod.GetHQ(1));
            const x = ~~mod.XComponentOf(position);
            const y = ~~mod.YComponentOf(position);
            const z = ~~mod.ZComponentOf(position);
            return { x, y, z };
        } catch (error: unknown) {
            logging.log('Failed to get HQ or HQ position.', LogLevel.Error, error);
            return;
        }
    }
}
