export const mockMaps = {
    Granite_MilitaryRnD: 'Granite_MilitaryRnD',
    Badlands: 'Badlands',
    Plaza: 'Plaza',
    Granite_Underground: 'Granite_Underground',
    Contaminated: 'Contaminated',
    Granite_TechCampus: 'Granite_TechCampus',
    Granite_MainStreet: 'Granite_MainStreet',
    Eastwood: 'Eastwood',
    Aftermath: 'Aftermath',
    Granite_ClubHouse: 'Granite_ClubHouse',
    Subsurface: 'Subsurface',
    Battery: 'Battery',
    Capstone: 'Capstone',
    Dumbo: 'Dumbo',
    Granite_Marina: 'Granite_Marina',
    Tungsten: 'Tungsten',
    Outskirts: 'Outskirts',
    Firestorm: 'Firestorm',
    Sand: 'Sand',
    GolmudRailway: 'GolmudRailway',
    Granite_MilitaryStorage: 'Granite_MilitaryStorage',
    Limestone: 'Limestone',
    Abbasid: 'Abbasid',
};

interface MockPos {
    x: number;
    y: number;
    z: number;
}

let currentHqPosition: MockPos = { x: 427, y: 177, z: -743 }; // default to Area 22B
let shouldThrow = false;

/**
 * Sets the mock HQ position.
 * @param pos - The position.
 */
export function setMockHqPosition(pos: MockPos): void {
    currentHqPosition = pos;
    shouldThrow = false;
}

/**
 * Sets whether HQ lookup throws.
 * @param value - Throw flag.
 */
export function setMockHqThrow(value: boolean): void {
    shouldThrow = value;
}

(globalThis as unknown as { mod: Record<string, unknown> }).mod = {
    Maps: mockMaps,
    GetHQ: (id: number) => {
        if (shouldThrow) throw new Error('HQ not found');
        return { _id: id };
    },
    GetObjectPosition: (obj: unknown) => {
        if (shouldThrow) throw new Error('Cannot get position');
        return currentHqPosition;
    },
    XComponentOf: (pos: { x: number; y: number; z: number }) => pos.x,
    YComponentOf: (pos: { x: number; y: number; z: number }) => pos.y,
    ZComponentOf: (pos: { x: number; y: number; z: number }) => pos.z,
};
