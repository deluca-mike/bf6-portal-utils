export interface MockSFX {
    _id: number;
    amplitude: number;
    position: { x: number; y: number; z: number };
    isPlaying: boolean;
    isSpawned: boolean;
}

export const mockSFXMap = new Map<number, MockSFX>();
let nextSFXId = 1;

/**
 * Resets the sounds mock state.
 */
export function resetSoundsMock(): void {
    mockSFXMap.clear();
    nextSFXId = 1;
}

export const mockTypes = {
    Player: 1,
    Squad: 2,
    Team: 3,
};

(globalThis as unknown as { mod: Record<string, unknown> }).mod = {
    Types: mockTypes,
    CreateVector: (x: number, y: number, z: number) => ({ x, y, z }),
    SpawnObject: (asset: unknown, pos: { x: number; y: number; z: number }) => {
        const id = nextSFXId++;
        const sfx: MockSFX = {
            _id: id,
            amplitude: 1.0,
            position: pos || { x: 0, y: 0, z: 0 },
            isPlaying: false,
            isSpawned: true,
        };
        mockSFXMap.set(id, sfx);
        return sfx;
    },
    UnspawnObject: (sfx: MockSFX) => {
        if (sfx) {
            sfx.isSpawned = false;
        }
    },
    PlaySound: (sfx: MockSFX, amplitude: number) => {
        if (sfx) {
            sfx.isPlaying = true;
            sfx.amplitude = amplitude;
        }
    },
    StopSound: (sfx: MockSFX) => {
        if (sfx) {
            sfx.isPlaying = false;
        }
    },
    SetSoundAmplitude: (sfx: MockSFX, amplitude: number) => {
        if (sfx) {
            sfx.amplitude = amplitude;
        }
    },
    GetObjId: (sfx: MockSFX) => (sfx ? sfx._id : -1),
    GetObjectPosition: (sfx: MockSFX) => (sfx ? sfx.position : { x: 0, y: 0, z: 0 }),
    GetSFX: (id: number) => mockSFXMap.get(id),
    IsValid: (sfx: MockSFX) => (sfx ? sfx.isSpawned : false),
    IsType: (target: { _type?: number }, type: number) => target?._type === type,
};
