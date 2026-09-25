import { Logging } from '../logging/index.ts';
import { Vectors } from '../vectors/index.ts';
export declare namespace MapDetector {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
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
    function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
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
    /**
     * Minimum coordinate value supported by map detector (signed 16-bit integer limit: -32,768).
     */
    const MIN_MAP_COORDINATE = -32768;
    /**
     * Maximum coordinate value supported by map detector (signed 16-bit integer limit: 32,767).
     */
    const MAX_MAP_COORDINATE = 32767;
    /**
     * Sets the marker spatial object ID to use for map detection instead of Team 1's HQ, or `null` to reset.
     * @param id - The ID of the spatial marker object, or `null` to reset to using Team 1's HQ.
     */
    function setMarkerObjectId(id: number | null): void;
    /**
     * Sets the coordinates of interest for a map. Coordinates are rounded to nearest integers and clamped to [-32,768, 32,767].
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
