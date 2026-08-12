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
    Atoll: 'Atoll',
    Ocean: 'Ocean',
};

export interface MockPos {
    x: number;
    y: number;
    z: number;
}

let currentHqPosition: MockPos = { x: 427, y: 177, z: -743 }; // default to Area 22B
let currentSpatialObjectPosition: MockPos = { x: 427, y: 177, z: -743 };
let shouldHqFail = false;
let shouldSpatialObjectFail = false;
let shouldPositionFail = false;

/**
 * Sets the mock HQ position.
 * @param pos - The position.
 */
export function setMockHqPosition(pos: MockPos): void {
    currentHqPosition = pos;
    shouldHqFail = false;
    shouldPositionFail = false;
}

/**
 * Sets the mock spatial object position.
 * @param pos - The position.
 */
export function setMockSpatialObjectPosition(pos: MockPos): void {
    currentSpatialObjectPosition = pos;
    shouldSpatialObjectFail = false;
    shouldPositionFail = false;
}

/**
 * Sets whether HQ lookup fails.
 * @param value - Fail flag.
 */
export function setMockHqThrow(value: boolean): void {
    shouldHqFail = value;
}

/**
 * Sets whether spatial object lookup fails.
 * @param value - Fail flag.
 */
export function setMockSpatialObjectThrow(value: boolean): void {
    shouldSpatialObjectFail = value;
}

/**
 * Sets whether position lookup fails.
 * @param value - Fail flag.
 */
export function setMockPositionThrow(value: boolean): void {
    shouldPositionFail = value;
}

(globalThis as unknown as { mod: Record<string, unknown> }).mod = {
    Maps: mockMaps,
    GetHQ: (id: number) => {
        if (shouldHqFail) return undefined;
        return { _id: id, type: 'HQ' };
    },
    GetSpatialObject: (id: number) => {
        if (shouldSpatialObjectFail) return undefined;
        return { _id: id, type: 'SpatialObject' };
    },
    GetObjectPosition: (obj: unknown) => {
        if (shouldPositionFail || !obj) return undefined;
        if (typeof obj === 'object' && obj !== null && (obj as { type?: string }).type === 'SpatialObject') {
            return currentSpatialObjectPosition;
        }
        return currentHqPosition;
    },
    IsUndefined: (val: unknown) => val === undefined || val === null,
    XComponentOf: (pos: { x: number; y: number; z: number }) => pos.x,
    YComponentOf: (pos: { x: number; y: number; z: number }) => pos.y,
    ZComponentOf: (pos: { x: number; y: number; z: number }) => pos.z,
};
