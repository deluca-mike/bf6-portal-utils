// version 3.0.0
export namespace MapDetector {
    export enum Map {
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

    // Returns the current map as a `MapDetector.Map` enum value, if possible.
    export function currentMap(): MapDetector.Map | undefined {
        const { x, y, z } = MapDetector.getHQCoordinates(0);

        if (x == -1044) return MapDetector.Map.Downtown; // Downtown <-1044.5, 122.02, 220.17>
        if (x == -1474) return MapDetector.Map.Marina; // Marina <-1474.05, 103.09, -690.45>
        if (x == -164) return MapDetector.Map.BlackwellFields; // Blackwell Fields <-164.96, 76.32, -322.58>
        if (x == -195) return MapDetector.Map.Eastwood; // Eastwood <-195.29, 231.54, -41.5>
        if (x == -274) return MapDetector.Map.DefenseNexus; // Defense Nexus <-274.12, 138.65, 309.02>
        if (x == -299) return MapDetector.Map.GolfCourse; // Golf Course <-299.32, 191.91, -644.38>
        if (x == -30) return MapDetector.Map.PortalSandbox; // Portal Sandbox <-30.02, 32.4, -0.01>
        if (x == -323) return MapDetector.Map.ManhattanBridge; // Manhattan Bridge <-323.32, 52.3, -440.95>
        if (x == -39) return MapDetector.Map.OperationFirestorm; // Operation Firestorm <-39.67, 124.69, -116.68>
        if (x == -672) return MapDetector.Map.EmpireState; // Empire State <-672.19, 53.79, -115.11>
        if (x == -84) return MapDetector.Map.SiegeOfCairo; // Siege of Cairo <-84.27, 64.38, -58.42>
        if (x == -99 && y == 88) return MapDetector.Map.MirakValley; // Mirak Valley <-99.78, 88.62, -253.42>
        if (x == -99 && y == 92) return MapDetector.Map.NewSobekCity; // New Sobek City <-99.78, 92.4, -124.58>
        if (x == 293) return MapDetector.Map.SaintsQuarter; // Saints Quarter <293.13, 70.35, 134.51>
        if (x == 427) return MapDetector.Map.Area22B; // Area 22B <427.68, 177.51, -743.26>
        if (x == 566) return MapDetector.Map.RedlineStorage; // Redline Storage <566.77, 144.8, 356.16>
        if (x == 849) return MapDetector.Map.IberianOffensive; // Iberian Offensive <849.16, 78.37, 116.74>
        if (x == 94) return MapDetector.Map.LiberationPeak; // Liberation Peak <94.71, 133.43, 77.46>

        return;
    }

    // Returns the current map as a `mod.Maps` enum value, if possible.
    export function currentNativeMap(): mod.Maps | undefined {
        const map = MapDetector.currentMap();

        if (map == MapDetector.Map.BlackwellFields) return mod.Maps.Badlands;
        if (map == MapDetector.Map.DefenseNexus) return mod.Maps.Granite_TechCampus;
        if (map == MapDetector.Map.Downtown) return mod.Maps.Granite_MainStreet;
        if (map == MapDetector.Map.Eastwood) return mod.Maps.Eastwood;
        if (map == MapDetector.Map.EmpireState) return mod.Maps.Aftermath;
        if (map == MapDetector.Map.GolfCourse) return mod.Maps.Granite_ClubHouse;
        if (map == MapDetector.Map.IberianOffensive) return mod.Maps.Battery;
        if (map == MapDetector.Map.LiberationPeak) return mod.Maps.Capstone;
        if (map == MapDetector.Map.ManhattanBridge) return mod.Maps.Dumbo;
        if (map == MapDetector.Map.Marina) return mod.Maps.Granite_Marina;
        if (map == MapDetector.Map.MirakValley) return mod.Maps.Tungsten;
        if (map == MapDetector.Map.NewSobekCity) return mod.Maps.Outskirts;
        if (map == MapDetector.Map.OperationFirestorm) return mod.Maps.Firestorm;
        if (map == MapDetector.Map.PortalSandbox) return mod.Maps.Sand;
        if (map == MapDetector.Map.SaintsQuarter) return mod.Maps.Limestone;
        if (map == MapDetector.Map.SiegeOfCairo) return mod.Maps.Abbasid;

        // An oversight in the `mod.Maps` enum has omitted the following maps:
        if (map == MapDetector.Map.Area22B) return;
        if (map == MapDetector.Map.RedlineStorage) return;

        return;
    }

    // Returns the current map as a string, if possible.
    export function currentMapName(): string | undefined {
        return MapDetector.currentMap()?.toString();
    }

    // Returns true if the current map is the given `MapDetector.Map` enum value.
    export function isCurrentMap(map: MapDetector.Map): boolean {
        return MapDetector.currentMap() === map;
    }

    // Returns true if the current map is the given `mod.Maps` enum value.
    export function isCurrentNativeMap(map: mod.Maps): boolean {
        return MapDetector.currentNativeMap() === map;
    }

    // Returns the HQ coordinates of the current map (used for finding the HQ coordinates of the current map).
    export function getHQCoordinates(decimalPlaces: number = 2): {
        x: number;
        y: number;
        z: number;
    } {
        const hqCoordinates = mod.GetObjectPosition(mod.GetHQ(1));
        const scale = 10 ** decimalPlaces;
        const x = ~~(mod.XComponentOf(hqCoordinates) * scale) / scale;
        const y = ~~(mod.YComponentOf(hqCoordinates) * scale) / scale;
        const z = ~~(mod.ZComponentOf(hqCoordinates) * scale) / scale;
        return { x, y, z };
    }
}
