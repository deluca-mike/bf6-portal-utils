import { Logging } from '../logging/index.ts';
export declare namespace MapDetector {
    /**
     * Log levels for controlling logging verbosity.
     */
    const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    enum Map {
        Area22B = 'Area 22B',
        BlackwellFields = 'Blackwell Fields',
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
    /**
     * @returns The current map as a `MapDetector.Map` enum value, or `undefined` if the map cannot be determined.
     */
    function currentMap(): MapDetector.Map | undefined;
    /**
     * @returns The current map as a `mod.Maps` enum value, or `undefined` if the map cannot be determined.
     */
    function currentNativeMap(): mod.Maps | undefined;
    /**
     * @returns The current map as a string, or `undefined` if the map cannot be determined.
     */
    function currentMapName(): string | undefined;
    /**
     * @param map - The map to check.
     * @returns True if the current map is the given `MapDetector.Map` enum value.
     */
    function isCurrentMap(map: MapDetector.Map): boolean;
    /**
     * @param map - The map to check.
     * @returns True if the current map is the given `mod.Maps` enum value.
     */
    function isCurrentNativeMap(map: mod.Maps): boolean;
}
