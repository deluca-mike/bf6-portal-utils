import type { Vectors } from '../../vectors/index.ts';

export interface MockObject {
    id: number;
    type: number;
    valid: boolean;
    position: Vectors.Vector3;
    rotation: Vectors.Vector3;
    scale?: Vectors.Vector3;
    lastTransform?: { position: Vectors.Vector3; rotation: Vectors.Vector3 };
}

/**
 * Test harness mocking Battlefield 6 Portal mod engine APIs for Spatial module tests.
 */
export class SpatialTestHarness {
    public objects: Map<number, MockObject> = new Map();
    private nextId: number = 1000;

    constructor() {
        this.setupGlobalMod();
    }

    public createMockObject(type: number = 30): MockObject {
        const obj: MockObject = {
            id: ++this.nextId,
            type,
            valid: true,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
        };
        this.objects.set(obj.id, obj);
        return obj;
    }

    public setupGlobalMod(): void {
        const objectsMap = this.objects;

        const mockMod: Record<string, unknown> = {
            Types: {
                SpatialObject: 30,
                SFX: 20,
                VFX: 21,
                WorldIcon: 22,
                FixedCamera: 23,
                InteractPoint: 24,
                LootSpawner: 25,
                MCOM: 26,
                Bomb: 27,
                Spawner: 28,
                VehicleSpawner: 29,
                VL7Cloud: 31,
                VO: 32,
                EmplacementSpawner: 33,
                Player: 1,
                Vehicle: 2,
            },
            SoldierStateVector: {
                GetPosition: 0,
                EyePosition: 1,
                GetFacingDirection: 2,
                GetLinearVelocity: 3,
            },
            VehicleStateVector: {
                VehiclePosition: 0,
                FacingDirection: 1,
                LinearVelocity: 2,
            },
            CreateVector(x: number, y: number, z: number): Vectors.Vector3 {
                return { x, y, z };
            },
            XComponentOf(v: Vectors.Vector3): number {
                return v ? v.x : 0;
            },
            YComponentOf(v: Vectors.Vector3): number {
                return v ? v.y : 0;
            },
            ZComponentOf(v: Vectors.Vector3): number {
                return v ? v.z : 0;
            },
            CreateTransform(position: Vectors.Vector3, rotation: Vectors.Vector3) {
                return { position, rotation };
            },
            SetObjectTransform(
                object: MockObject,
                transform: { position: Vectors.Vector3; rotation: Vectors.Vector3 }
            ) {
                if (!object) return;
                object.lastTransform = {
                    position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
                    rotation: { x: transform.rotation.x, y: transform.rotation.y, z: transform.rotation.z },
                };
                object.position = object.lastTransform.position;
                object.rotation = object.lastTransform.rotation;
            },
            SpawnObject: (
                prefab: number,
                position: Vectors.Vector3,
                rotation: Vectors.Vector3,
                scale: Vectors.Vector3
            ): MockObject => {
                const spawned = this.createMockObject(30);
                spawned.position = { x: position.x, y: position.y, z: position.z };
                spawned.rotation = { x: rotation.x, y: rotation.y, z: rotation.z };
                spawned.scale = { x: scale.x, y: scale.y, z: scale.z };
                return spawned;
            },
            UnspawnObject: (object: MockObject) => {
                if (object) {
                    object.valid = false;
                    objectsMap.delete(object.id);
                }
            },
            IsValid: (object: MockObject | null | undefined): boolean => {
                return object !== null && object !== undefined && object.valid === true;
            },
            IsType: (object: MockObject, type: number): boolean => {
                return object !== null && object !== undefined && object.type === type;
            },
            GetObjectPosition: (object: MockObject): Vectors.Vector3 => {
                return object ? object.position : { x: 0, y: 0, z: 0 };
            },
            GetObjectRotation: (object: MockObject): Vectors.Vector3 => {
                return object ? object.rotation : { x: 0, y: 0, z: 0 };
            },
            GetSoldierState: (player: MockObject, vectorType: number): Vectors.Vector3 => {
                if (!player) return { x: 0, y: 0, z: 0 };
                if (vectorType === 1) return { x: player.position.x, y: player.position.y + 1.6, z: player.position.z };
                if (vectorType === 2) return player.rotation;
                return player.position;
            },
            GetVehicleState: (vehicle: MockObject, vectorType: number): Vectors.Vector3 => {
                if (!vehicle) return { x: 0, y: 0, z: 0 };
                if (vectorType === 1) return vehicle.rotation;
                return vehicle.position;
            },
        };

        // Attach global mod object
        (globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
    }
}
