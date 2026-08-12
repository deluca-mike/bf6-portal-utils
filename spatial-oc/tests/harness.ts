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
 * Test harness mocking Battlefield 6 Portal mod engine APIs for SpatialOC module tests.
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
                const obj: MockObject = {
                    id: ++this.nextId,
                    type: 30,
                    valid: true,
                    position: { x: position.x, y: position.y, z: position.z },
                    rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
                    scale: { x: scale.x, y: scale.y, z: scale.z },
                };
                objectsMap.set(obj.id, obj);
                return obj;
            },
            UnspawnObject(object: MockObject) {
                if (!object) return;
                object.valid = false;
                objectsMap.delete(object.id);
            },
            GetObjId(object: MockObject | number): number {
                if (typeof object === 'number') return object;
                return object ? object.id : -1;
            },
            IsValid(object: MockObject | null | undefined): boolean {
                return !!(object && object.valid);
            },
            IsType(object: MockObject | null | undefined, type: number): boolean {
                return !!(object && object.type === type);
            },
            GetSoldierState(player: MockObject, state: number): Vectors.Vector3 {
                if (state === 2) {
                    // Facing direction
                    return player.rotation ?? { x: 0, y: 0, z: 1 };
                }
                return player.position ?? { x: 0, y: 0, z: 0 };
            },
            GetVehicleState(vehicle: MockObject, state: number): Vectors.Vector3 {
                if (state === 1) {
                    return vehicle.rotation ?? { x: 0, y: 0, z: 1 };
                }
                return vehicle.position ?? { x: 0, y: 0, z: 0 };
            },
            GetObjectPosition(object: MockObject): Vectors.Vector3 {
                return object.position;
            },
            GetObjectRotation(object: MockObject): Vectors.Vector3 {
                return object.rotation;
            },
        };

        // @ts-expect-error Mock global mod
        globalThis.mod = mockMod;
    }
}
