// version 1.0.0

class MapDetector {

    public static getCurrentMap(): mod.Maps | undefined {
        const { x, y, z } = MapDetector.getHQCoordinates(0);

        if (x == -1044) return mod.Maps.Granite_MainStreet; // Downtown -1044.5, 122.02, 220.17
        if (x == -1474) return mod.Maps.Granite_Marina; // Marina -1474.05, 103.09, -690.45
        if (x == -164) return mod.Maps.Badlands; // Blackwell Fields -164.96, 76.32, -322.58
        if (x == -195) return mod.Maps.Eastwood; // Eastwood -195.29, 231.54, -41.5
        if (x == -274) return mod.Maps.Granite_TechCampus; // Defense Nexus -274.12, 138.65, 309.02
        if (x == -299) return mod.Maps.Granite_ClubHouse; // Golf Course -299.32, 191.91, -644.38
        if (x == -30) return mod.Maps.Sand; // Portal Sandbox Marina -30.02, 32.4, -0.01
        if (x == -323) return mod.Maps.Dumbo; // Manhattan Bridge -323.32, 52.3, -440.95
        if (x == -39) return mod.Maps.Firestorm; // Operation Firestorm -39.67, 124.69, -116.68
        if (x == -672) return mod.Maps.Aftermath; // Empire State -672.19, 53.79, -115.11
        if (x == -84) return mod.Maps.Abbasid; // Siege of Cairo -84.27, 64.38, -58.42
        if (x == -99 && y == 88) return mod.Maps.Tungsten; // Mirak Valley -99.78, 88.62, -253.42
        if (x == -99 && y == 92) return mod.Maps.Outskirts; // New Sobek City -99.78, 92.4, -124.58
        if (x == 293) return mod.Maps.Limestone; // Saints Quarter 293.13, 70.35, 134.51
        if (x == 849) return mod.Maps.Battery; // Iberian Offensive 849.16, 78.37, 116.74
        if (x == 94) return mod.Maps.Capstone; // Liberation Peak 94.71, 133.43, 77.46

        return;
    }
    
    public static getCurrentMapName(): string | undefined {
        const map = MapDetector.getCurrentMap();
        
        if (map == mod.Maps.Abbasid) return 'Siege of Cairo';
        if (map == mod.Maps.Aftermath) return 'Empire State';
        if (map == mod.Maps.Badlands) return 'Blackwell Fields';
        if (map == mod.Maps.Battery) return 'Iberian Offensive';
        if (map == mod.Maps.Capstone) return 'Liberation Peak';
        if (map == mod.Maps.Dumbo) return 'Manhattan Bridge';
        if (map == mod.Maps.Eastwood) return 'Eastwood';
        if (map == mod.Maps.Firestorm) return 'Operation Firestorm';
        if (map == mod.Maps.Granite_ClubHouse) return 'Golf Course';
        if (map == mod.Maps.Granite_MainStreet) return 'Downtown';
        if (map == mod.Maps.Granite_Marina) return 'Marina';
        if (map == mod.Maps.Granite_TechCampus) return 'Defense Nexus';
        if (map == mod.Maps.Limestone) return 'Saints Quarter';
        if (map == mod.Maps.Outskirts) return 'New Sobek City';
        if (map == mod.Maps.Sand) return 'Portal Sandbox Marina';
        if (map == mod.Maps.Tungsten) return 'Mirak Valley';

        return undefined;
    }

    public static isMap(map: mod.Maps): boolean {
        return MapDetector.getCurrentMap() === map;
    }

    public static getHQCoordinates(decimalPlaces: number = 2): { x: number, y: number, z: number } {
        const scale = 10 ** decimalPlaces;
        const hqPosition = mod.GetObjectPosition(mod.GetHQ(1));
        const x = (~~(mod.XComponentOf(hqPosition) * scale)) / scale;
        const y = (~~(mod.YComponentOf(hqPosition) * scale)) / scale;
        const z = (~~(mod.ZComponentOf(hqPosition) * scale)) / scale;
        return { x, y, z };
    }

}
