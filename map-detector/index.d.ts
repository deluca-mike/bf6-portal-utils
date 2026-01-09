export declare namespace MapDetector {
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
    function currentMap(): MapDetector.Map | undefined;
    function currentNativeMap(): mod.Maps | undefined;
    function currentMapName(): string | undefined;
    function isCurrentMap(map: MapDetector.Map): boolean;
    function isCurrentNativeMap(map: mod.Maps): boolean;
    function getHQCoordinates(decimalPlaces?: number): {
        x: number;
        y: number;
        z: number;
    };
}
