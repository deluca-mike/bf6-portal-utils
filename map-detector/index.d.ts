import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace MapDetector {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * The maps supported by the MapDetector module.
     */
    enum Map {
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
    /**
     * Sets the coordinates of interest for a map.
     * @param map - The map to set the coordinates of interest for.
     * @param coordinates - The coordinates of interest to set for the map.
     */
    function setCoordinates(map: Map, coordinates: Vectors.Vector3): void;
    /**
     * @returns The current map as a `Map` enum value, or `null` if the map cannot be determined.
     */
    function currentMap(): Map | null;
    /**
     * @returns The current map as a `mod.Maps` enum value, or `null` if the map cannot be determined.
     */
    function currentNativeMap(): mod.Maps | null;
    /**
     * @returns The current map as a string, or `null` if the map cannot be determined.
     */
    function currentMapName(): string | null;
    /**
     * @param map - The map to check.
     * @returns True if the current map is the given `Map` enum value.
     */
    function isCurrentMap(map: Map): boolean;
    /**
     * @param map - The native map to check.
     * @returns True if the current map is the given `mod.Maps` enum value.
     */
    function isCurrentNativeMap(map: mod.Maps): boolean;
}
