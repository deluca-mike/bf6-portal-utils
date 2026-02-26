import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';

// version 3.2.0
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
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    /**
     * The maps supported by the MapDetector module.
     */
    export enum Map {
        Area22B = 'Area 22B',
        BlackwellFields = 'Blackwell Fields',
        Contaminated = 'Contaminated',
        DefenseNexus = 'Defense Nexus',
        Downtown = 'Downtown',
        Eastwood = 'Eastwood',
        EmpireState = 'Empire State',
        GolfCourse = 'Golf Course',
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
    }

    type MapData = {
        coordinates: Vectors.Vector3;
        nativeMap: mod.Maps | undefined;
    };

    const maps: Record<Map, MapData> = {
        [Map.Area22B]: {
            coordinates: { x: 427.68, y: 177.51, z: -743.26 },
            nativeMap: mod.Maps.Granite_MilitaryRnD,
        },
        [Map.BlackwellFields]: {
            coordinates: { x: -164.96, y: 76.32, z: -322.58 },
            nativeMap: mod.Maps.Badlands,
        },
        [Map.Contaminated]: { coordinates: { x: -143.92, y: 323.12, z: 7.12 }, nativeMap: undefined },
        [Map.DefenseNexus]: {
            coordinates: { x: -274.12, y: 138.65, z: 309.02 },
            nativeMap: mod.Maps.Granite_TechCampus,
        },
        [Map.Downtown]: {
            coordinates: { x: -1044.5, y: 122.02, z: 220.17 },
            nativeMap: mod.Maps.Granite_MainStreet,
        },
        [Map.Eastwood]: {
            coordinates: { x: -195.29, y: 231.54, z: -41.5 },
            nativeMap: mod.Maps.Eastwood,
        },
        [Map.EmpireState]: {
            coordinates: { x: -672.19, y: 53.79, z: -115.11 },
            nativeMap: mod.Maps.Aftermath,
        },
        [Map.GolfCourse]: {
            coordinates: { x: -299.32, y: 191.91, z: -664.38 },
            nativeMap: mod.Maps.Granite_ClubHouse,
        },
        [Map.IberianOffensive]: {
            coordinates: { x: 849.16, y: 78.37, z: 116.74 },
            nativeMap: mod.Maps.Battery,
        },
        [Map.LiberationPeak]: {
            coordinates: { x: 94.71, y: 133.43, z: 77.46 },
            nativeMap: mod.Maps.Capstone,
        },
        [Map.ManhattanBridge]: {
            coordinates: { x: -323.32, y: 52.3, z: -440.95 },
            nativeMap: mod.Maps.Dumbo,
        },
        [Map.Marina]: {
            coordinates: { x: -1474.05, y: 103.09, z: -690.45 },
            nativeMap: mod.Maps.Granite_Marina,
        },
        [Map.MirakValley]: {
            coordinates: { x: -99.78, y: 88.62, z: -253.42 },
            nativeMap: mod.Maps.Tungsten,
        },
        [Map.NewSobekCity]: {
            coordinates: { x: -99.78, y: 92.4, z: -124.58 },
            nativeMap: mod.Maps.Outskirts,
        },
        [Map.OperationFirestorm]: {
            coordinates: { x: -39.67, y: 124.69, z: -116.68 },
            nativeMap: mod.Maps.Firestorm,
        },
        [Map.PortalSandbox]: {
            coordinates: { x: -30.02, y: 32.4, z: -0.01 },
            nativeMap: mod.Maps.Sand,
        },
        [Map.RedlineStorage]: {
            coordinates: { x: 566.77, y: 144.8, z: 356.16 },
            nativeMap: mod.Maps.Granite_MilitaryStorage,
        },
        [Map.SaintsQuarter]: {
            coordinates: { x: 293.13, y: 70.35, z: 134.51 },
            nativeMap: mod.Maps.Limestone,
        },
        [Map.SiegeOfCairo]: {
            coordinates: { x: -84.27, y: 64.38, z: -58.42 },
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
            const { coordinates } = maps[map as Map];

            if (coords.x != ~~coordinates.x || coords.y != ~~coordinates.y || coords.z != ~~coordinates.z) continue;

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
