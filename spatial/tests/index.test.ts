import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from '../../events/index.ts';
import { Quaternions } from '../../quaternions/index.ts';
import { Solid } from '../../solid/index.ts';
import { Vectors } from '../../vectors/index.ts';
import { Spatial } from '../index.ts';
import { MockObject, SpatialTestHarness } from './harness.ts';

describe('Unified Spatial Module Integration Tests', () => {
    let harness: SpatialTestHarness;

    function stepSpatial(ms: number): void {
        Events.OngoingGlobal.trigger();
        Events.OnTickEnd.trigger();
        const stepSize = 20;
        const steps = Math.max(1, Math.round(ms / stepSize));
        const stepDt = ms / steps;
        for (let i = 0; i < steps; ++i) {
            vi.advanceTimersByTime(stepDt);
            Events.OngoingGlobal.trigger();
            Events.OnTickEnd.trigger();
        }
    }

    beforeEach(() => {
        vi.useFakeTimers();
        Events.OngoingGlobal.trigger();
        Events.OnTickEnd.trigger();
        harness = new SpatialTestHarness();
        // Clean up any lingering active nodes
        while (Spatial.ROOT_NODE.childCount! > 0) {
            Spatial.ROOT_NODE.getChild(0)!.delete();
        }
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Class Constructors & Hierarchy', () => {
        it('should create Empty nodes and attach to ROOT_NODE by default', () => {
            const root = new Spatial.Empty({ position: { x: 0, y: 100, z: 0 } });
            const child1 = new Spatial.Empty({ parent: root, position: { x: 10, y: 0, z: 0 } });
            const child2 = new Spatial.Empty({ parent: child1, position: { x: 0, y: 5, z: 2 } });

            expect(root.parent).toBe(Spatial.ROOT_NODE);
            expect(child1.parent).toBe(root);
            expect(child2.parent).toBe(child1);
            expect(root.childCount).toBe(1);
            expect(child1.childCount).toBe(1);
            expect(child2.childCount).toBe(0);
        });

        it('should correctly enumerate children and support forEachChild', () => {
            const root = new Spatial.Empty();
            const c1 = new Spatial.Empty({ parent: root, position: { x: 1, y: 0, z: 0 } });
            const c2 = new Spatial.Empty({ parent: root, position: { x: 2, y: 0, z: 0 } });
            const c3 = new Spatial.Empty({ parent: root, position: { x: 3, y: 0, z: 0 } });

            expect(root.childCount).toBe(3);
            const children = root.children!;
            expect(children.length).toBe(3);
            expect(children[0]).toBe(c3); // LCRS prepends
            expect(children[1]).toBe(c2);
            expect(children[2]).toBe(c1);

            const visited: Spatial.SpatialElement[] = [];
            root.forEachChild((child) => visited.push(child));
            expect(visited.length).toBe(3);

            const visitedIds: Spatial.SpatialNodeID[] = [];
            Spatial.forEachChild(root.id, (childId) => visitedIds.push(childId));
            expect(visitedIds.length).toBe(3);
            expect(visitedIds[0]).toBe(c3.id);
            expect(visitedIds[1]).toBe(c2.id);
            expect(visitedIds[2]).toBe(c1.id);
        });

        it('should prevent circular parent-child hierarchies', () => {
            const parent = new Spatial.Empty();
            const child = new Spatial.Empty({ parent });
            const grandChild = new Spatial.Empty({ parent: child });

            // Attempt circular hierarchy
            parent.setParent(grandChild);
            expect(parent.parent).toBe(Spatial.ROOT_NODE);
        });

        it('should re-parent nodes correctly', () => {
            const root1 = new Spatial.Empty();
            const root2 = new Spatial.Empty();
            const child = new Spatial.Empty({ parent: root1 });

            expect(root1.childCount).toBe(1);
            expect(root2.childCount).toBe(0);

            child.parent = root2;
            expect(root1.childCount).toBe(0);
            expect(root2.childCount).toBe(1);
            expect(child.parent).toBe(root2);
        });

        it('should preserve world position, rotation, and scale by default when re-parenting (keepWorldTransform = true)', () => {
            const parent1 = new Spatial.Empty({
                position: { x: 10, y: 20, z: 30 },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
                scale: 2,
            });
            const child = new Spatial.Empty({
                parent: parent1,
                position: { x: 5, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: 1,
            });

            const initialWorldPos = { ...child.worldPosition! };
            const initialWorldRot = { ...child.worldRotation! };
            const initialWorldScale = { ...child.worldScale! };

            // World pos: (10, 20, 30) + rotY(90) * ((5, 0, 0) * 2) = (10, 20, 30) + (0, 0, -10) = (10, 20, 20)
            expect(initialWorldPos.x).toBeCloseTo(10);
            expect(initialWorldPos.y).toBeCloseTo(20);
            expect(initialWorldPos.z).toBeCloseTo(20);
            expect(initialWorldScale).toEqual({ x: 2, y: 2, z: 2 });

            const parent2 = new Spatial.Empty({
                position: { x: 100, y: 0, z: 50 },
                rotation: { x: 0, y: -Math.PI / 2, z: 0 },
                scale: 0.5,
            });

            // Reparent with keepWorldTransform = true (default)
            child.setParent(parent2);

            expect(child.parent).toBe(parent2);
            expect(child.worldPosition!.x).toBeCloseTo(initialWorldPos.x);
            expect(child.worldPosition!.y).toBeCloseTo(initialWorldPos.y);
            expect(child.worldPosition!.z).toBeCloseTo(initialWorldPos.z);
            expect(child.worldRotation!.w).toBeCloseTo(initialWorldRot.w);
            expect(child.worldRotation!.y).toBeCloseTo(initialWorldRot.y);
            expect(child.worldScale!.x).toBeCloseTo(initialWorldScale.x);
            expect(child.worldScale!.y).toBeCloseTo(initialWorldScale.y);
            expect(child.worldScale!.z).toBeCloseTo(initialWorldScale.z);

            // Reparent to ROOT_NODE
            child.setParent(Spatial.ROOT_NODE);
            expect(child.parent).toBe(Spatial.ROOT_NODE);
            expect(child.worldPosition!.x).toBeCloseTo(initialWorldPos.x);
            expect(child.worldPosition!.y).toBeCloseTo(initialWorldPos.y);
            expect(child.worldPosition!.z).toBeCloseTo(initialWorldPos.z);
            expect(child.localPosition!.x).toBeCloseTo(initialWorldPos.x);
            expect(child.localPosition!.y).toBeCloseTo(initialWorldPos.y);
            expect(child.localPosition!.z).toBeCloseTo(initialWorldPos.z);
        });

        it('should preserve local coordinates when keepWorldTransform is false', () => {
            const parent1 = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            const child = new Spatial.Empty({ parent: parent1, position: { x: 10, y: 0, z: 0 } });
            const parent2 = new Spatial.Empty({ position: { x: 50, y: 0, z: 0 } });

            expect(child.worldPosition!.x).toBeCloseTo(10);

            child.setParent(parent2, false);

            expect(child.localPosition!.x).toBeCloseTo(10);
            expect(child.worldPosition!.x).toBeCloseTo(60);
        });

        it('should support Spatial.setParent raw ID with keepWorldTransform parameter', () => {
            const p1Id = Spatial.createEmptyId({ position: { x: 20, y: 0, z: 0 } })!;
            const cId = Spatial.createEmptyId({ parent: p1Id, position: { x: 5, y: 0, z: 0 } })!;
            const p2Id = Spatial.createEmptyId({ position: { x: 100, y: 0, z: 0 } })!;

            expect(Spatial.getWorldPosition(cId)!.x).toBeCloseTo(25);

            // Default keepWorldTransform = true
            Spatial.setParent(cId, p2Id);
            expect(Spatial.getWorldPosition(cId)!.x).toBeCloseTo(25);
            expect(Spatial.getLocalPosition(cId)!.x).toBeCloseTo(-75);

            // Explicit keepWorldTransform = false
            Spatial.setParent(cId, p1Id, false);
            expect(Spatial.getLocalPosition(cId)!.x).toBeCloseTo(-75);
            expect(Spatial.getWorldPosition(cId)!.x).toBeCloseTo(-55);
        });

        it('should wrap existing native objects with Spatial.Existing', () => {
            const mockObj = harness.createMockObject(30) as unknown as Spatial.TransformableObject;
            const existing = new Spatial.Existing({
                object: mockObj,
                position: { x: 1, y: 2, z: 3 },
            });

            expect(existing.isValid).toBe(true);
            expect(existing.localPosition).toEqual({ x: 1, y: 2, z: 3 });

            Spatial.sync();
            expect(harness.objects.get(1001)!.position).toEqual({ x: 1, y: 2, z: 3 });
        });
    });

    describe('Transformations & Coordinate Math', () => {
        it('should compute world positions correctly in nested hierarchies', () => {
            const root = new Spatial.Empty({ position: { x: 10, y: 20, z: 30 } });
            const child1 = new Spatial.Empty({ parent: root, position: { x: 5, y: 0, z: 0 } });
            const child2 = new Spatial.Empty({ parent: child1, position: { x: 0, y: 10, z: 0 } });

            expect(root.worldPosition).toEqual({ x: 10, y: 20, z: 30 });
            expect(child1.worldPosition).toEqual({ x: 15, y: 20, z: 30 });
            expect(child2.worldPosition).toEqual({ x: 15, y: 30, z: 30 });
        });

        it('should set world position and solve for local coordinates automatically', () => {
            const parent = new Spatial.Empty({ position: { x: 50, y: 10, z: -20 } });
            const child = new Spatial.Empty({ parent });

            child.worldPosition = { x: 100, y: 20, z: 10 };
            expect(child.worldPosition).toEqual({ x: 100, y: 20, z: 10 });
            expect(child.localPosition).toEqual({ x: 50, y: 10, z: 30 });
        });

        it('should set world rotation and solve for local rotation automatically', () => {
            const parent = new Spatial.Empty({ rotation: { x: 0, y: Math.PI / 4, z: 0 } });
            const child = new Spatial.Empty({ parent });

            child.worldRotationEuler = { x: 0, y: Math.PI / 2, z: 0 };
            expect(child.worldRotationEuler!.y).toBeCloseTo(Math.PI / 2);
            expect(child.localRotationEuler!.y).toBeCloseTo(Math.PI / 4);
        });

        it('should transform local points to world points and back', () => {
            const root = new Spatial.Empty({ position: { x: 10, y: 0, z: 0 } });
            const child = new Spatial.Empty({ parent: root, position: { x: 0, y: 5, z: 0 } });

            const worldPt = child.localToWorldPoint({ x: 2, y: 3, z: 4 })!;
            expect(worldPt.x).toBeCloseTo(12);
            expect(worldPt.y).toBeCloseTo(8);
            expect(worldPt.z).toBeCloseTo(4);

            const localPt = child.worldToLocalPoint(worldPt)!;
            expect(localPt.x).toBeCloseTo(2);
            expect(localPt.y).toBeCloseTo(3);
            expect(localPt.z).toBeCloseTo(4);
        });

        it('should transform local directions to world directions and back', () => {
            const root = new Spatial.Empty({ rotation: { x: 0, y: Math.PI / 2, z: 0 } });
            const worldVec = root.localToWorldVector({ x: 0, y: 0, z: 1 })!;

            expect(worldVec.x).toBeCloseTo(1);
            expect(worldVec.z).toBeCloseTo(0);

            const localVec = root.worldToLocalVector(worldVec)!;
            expect(localVec.x).toBeCloseTo(0);
            expect(localVec.z).toBeCloseTo(1);
        });

        it('should translate and rotate locally and around axes', () => {
            const node = new Spatial.Empty({ position: { x: 10, y: 0, z: 0 } });
            node.translate({ x: 5, y: 0, z: 0 });
            expect(node.localPosition).toEqual({ x: 15, y: 0, z: 0 });

            node.rotateAroundAxis({ x: 0, y: 1, z: 0 }, Math.PI / 2, { x: 0, y: 0, z: 0 });
            expect(node.localPosition!.x).toBeCloseTo(0);
            expect(node.localPosition!.z).toBeCloseTo(-15);
        });

        it('should handle scale and rotation in hierarchies', () => {
            const root = new Spatial.Empty({
                position: { x: 0, y: 0, z: 0 },
                scale: 2,
            });
            const child = new Spatial.Empty({
                parent: root,
                position: { x: 5, y: 0, z: 0 },
            });

            expect(child.worldPosition!.x).toBeCloseTo(10);
            expect(child.worldScale).toEqual({ x: 2, y: 2, z: 2 });

            child.worldScale = 4;
            expect(child.localScale).toEqual({ x: 2, y: 2, z: 2 });
            expect(child.worldScale).toEqual({ x: 4, y: 4, z: 4 });

            Spatial.setWorldScale(child.id, { x: 6, y: 8, z: 10 });
            expect(child.localScale).toEqual({ x: 3, y: 4, z: 5 });
            expect(child.worldScale).toEqual({ x: 6, y: 8, z: 10 });
        });
    });

    describe('Runtime Spawning & Engine Synchronization', () => {
        it('should spawn runtime prefabs and sync transforms to mock engine', () => {
            const elem = new Spatial.Runtime({
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 10, y: 20, z: 30 },
            });

            expect(elem.isValid).toBe(true);
            Spatial.sync();

            const mockObj = harness.objects.get(1001);
            expect(mockObj).toBeDefined();
            expect(mockObj!.position).toEqual({ x: 10, y: 20, z: 30 });

            elem.localPosition = { x: 40, y: 50, z: 60 };
            Spatial.sync();
            expect(mockObj!.position).toEqual({ x: 40, y: 50, z: 60 });
        });

        it('should account for pivotOffset during engine render sync', () => {
            const elem = new Spatial.Runtime({
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 0, y: 0, z: 0 },
                pivotOffset: { x: -10, y: 0, z: -10 },
            });

            Spatial.sync();
            const mockObj = harness.objects.get(1001)!;
            expect(mockObj.position).toEqual({ x: -10, y: 0, z: -10 });

            // Mathematical world position remains (0, 0, 0)
            expect(elem.worldPosition).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should unspawn native objects on delete and free slot', () => {
            const elem = new Spatial.Runtime({
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 0, y: 0, z: 0 },
            });

            expect(Spatial.getActiveNodeCount()).toBe(1);
            const mockObj = harness.objects.get(1001)!;
            expect(mockObj.valid).toBe(true);

            elem.delete();
            expect(elem.isDeleted).toBe(true);
            expect(Spatial.getActiveNodeCount()).toBe(0);
            expect(mockObj.valid).toBe(false);
        });

        it('should decouple engine spawnScale from parent hierarchy scale', () => {
            const parent = new Spatial.Empty({ scale: 2 });
            const child = new Spatial.Runtime({
                parent,
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 5, y: 0, z: 0 },
            });

            const mockObj = harness.objects.get(1001)!;
            // Native engine spawn scale is 1 by default, NOT multiplied by parent scale 2
            expect(mockObj.scale).toEqual({ x: 1, y: 1, z: 1 });

            // But scene graph hierarchy scale is properly evaluated
            expect(child.worldScale).toEqual({ x: 2, y: 2, z: 2 });

            Spatial.sync();
            // Spatial position is scaled by parent scale: 5 * 2 = 10
            expect(mockObj.position).toEqual({ x: 10, y: 0, z: 0 });
        });

        it('should support explicit spawnScale in RuntimeParams and raw createRuntimeId', () => {
            const parent = new Spatial.Empty({ scale: 5 });

            // Explicit uniform spawnScale
            const child1 = new Spatial.Runtime({
                parent,
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                spawnScale: 3,
            });
            expect(child1.isValid).toBe(true);
            const mockObj1 = harness.objects.get(1001)!;
            expect(mockObj1.scale).toEqual({ x: 3, y: 3, z: 3 });

            // Explicit per-axis spawnScale in createRuntimeId
            const child2Id = Spatial.createRuntimeId({
                parent,
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                spawnScale: { x: 2, y: 4, z: 6 },
            });
            expect(child2Id).not.toBeNull();
            const mockObj2 = harness.objects.get(1002)!;
            expect(mockObj2.scale).toEqual({ x: 2, y: 4, z: 6 });
        });
    });

    describe('Motion Controllers (Orbit, LookAt, Follow, Kinematics)', () => {
        it('should update orbit kinematics over time', () => {
            const centerNode = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            const orbiter = new Spatial.Empty({
                parent: centerNode,
                position: { x: 10, y: 0, z: 0 },
            });

            orbiter.setOrbit({
                speedRadPerSec: Math.PI / 2, // 90 deg/sec
                axis: { x: 0, y: 1, z: 0 },
            });

            // Advance by 1 second (90 degrees CCW: (10, 0, 0) -> (0, 0, -10))
            stepSpatial(1000);

            const pos = orbiter.localPosition!;
            expect(pos.x).toBeCloseTo(0);
            expect(pos.z).toBeCloseTo(-10);
        });

        it('should update linear and angular velocity in kinematics', () => {
            const node = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            node.setKinematics({
                linearVelocity: { x: 10, y: 0, z: 0 }, // 10 m/s
            });

            stepSpatial(500); // 0.5 sec -> 5 meters
            expect(node.localPosition!.x).toBeCloseTo(5);
        });

        it('should look at target world coordinates', () => {
            const node = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            node.lookAt({ x: 0, y: 0, z: 10 });

            // Looking forward (+Z) should result in Euler yaw = 0
            expect(node.localRotationEuler!.y).toBeCloseTo(0);
        });

        it('should follow target position smoothly', () => {
            const target: Spatial.QueryableObject = {
                getPosition: (out) => (out ? Object.assign(out, { x: 100, y: 0, z: 0 }) : { x: 100, y: 0, z: 0 }),
            };
            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });

            follower.setFollow({
                target,
                smoothing: 0, // instant snap
            });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(100);
        });

        it('should resolve rotational cross-controller conflicts symmetrically', () => {
            const node = new Spatial.Empty();

            // 1. setLookAt clears angular kinematics, orbit tangent, and follow trackRotation
            node.setKinematics({ angularVelocity: { x: 0, y: 1, z: 0 } });
            node.setOrbit({ speedRadPerSec: 1, faceTangent: true });
            node.setFollow({ trackRotation: true });
            node.setLookAt({ target: { x: 0, y: 0, z: 10 } });

            // LookAt is active
            stepSpatial(16);
            expect(node.localRotationEuler!.y).toBeCloseTo(0);

            // 2. setOrbit with faceTangent clears LookAt and angular kinematics
            node.setLookAt({ target: { x: 10, y: 0, z: 0 } });
            node.setKinematics({ angularVelocity: { x: 0, y: 1, z: 0 } });
            node.setOrbit({ speedRadPerSec: 1, faceTangent: true });
            // LookAt should be cleared by orbit's faceTangent

            // 3. setFollow with trackRotation clears LookAt and angular kinematics
            node.setLookAt({ target: { x: 10, y: 0, z: 0 } });
            node.setKinematics({ angularVelocity: { x: 0, y: 1, z: 0 } });
            node.setFollow({ trackRotation: true });
            // LookAt and angular kinematics should be cleared

            // 4. setKinematics with angularVelocity clears LookAt, orbit tangent, and follow trackRotation
            node.setLookAt({ target: { x: 10, y: 0, z: 0 } });
            node.setOrbit({ speedRadPerSec: 1, faceTangent: true });
            node.setFollow({ trackRotation: true });
            node.setKinematics({ angularVelocity: { x: 0, y: 5, z: 0 } });
            // Angular kinematics active, lookAt / orbit tangent / follow trackRotation cleared
        });

        it('should seamlessly pair orbit position with angular kinematics for self-spin', () => {
            const node = new Spatial.Empty({ position: { x: 10, y: 0, z: 0 } });

            // Orbit without faceTangent (position only) + angular kinematics (rotation only)
            node.setOrbit({ speedRadPerSec: Math.PI / 2 }); // 90 deg/sec orbit
            node.setKinematics({ angularVelocity: { x: 0, y: Math.PI, z: 0 } }); // 180 deg/sec spin

            // Step 1 second
            stepSpatial(1000);

            // Position: 90 deg CCW orbit from (10, 0, 0) -> (0, 0, -10)
            expect(node.localPosition!.x).toBeCloseTo(0);
            expect(node.localPosition!.z).toBeCloseTo(-10);

            // Rotation: 180 deg yaw spin
            expect(Math.abs(node.localRotationEuler!.y)).toBeCloseTo(Math.PI);
        });
    });

    describe('Solid Integration', () => {
        it('should support declarative component instantiation via Solid.h()', () => {
            const posSig = Solid.createSignal({ x: 5, y: 10, z: 15 });

            const element = Solid.h(Spatial.Runtime, {
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                localPosition: () => Solid.read(posSig),
            });

            expect(element).toBeInstanceOf(Spatial.Runtime);
            expect(element.localPosition).toEqual({ x: 5, y: 10, z: 15 });

            // Update signal
            Solid.write(posSig, { x: 20, y: 30, z: 40 });

            // Allow microtask flush
            return Promise.resolve().then(() => {
                expect(element.localPosition).toEqual({ x: 20, y: 30, z: 40 });
                element.delete();
            });
        });

        it('should automatically delete child element when parent Solid scope is cleaned up', () => {
            let elementRef: Spatial.Runtime | undefined;

            const dispose = Solid.createRoot((rootDispose) => {
                elementRef = Solid.h(Spatial.Runtime, {
                    prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                    position: { x: 0, y: 0, z: 0 },
                });
                return rootDispose;
            });

            expect(elementRef).toBeDefined();
            expect(elementRef!.isValid).toBe(true);
            expect(Spatial.getActiveNodeCount()).toBe(1);

            // Dispose root
            dispose();

            expect(elementRef!.isDeleted).toBe(true);
            expect(Spatial.getActiveNodeCount()).toBe(0);
        });

        it('should support list rendering using Solid.Index with spatial elements', () => {
            const itemsSig = Solid.createSignal([
                { id: 1, pos: { x: 1, y: 0, z: 0 } },
                { id: 2, pos: { x: 2, y: 0, z: 0 } },
            ]);

            Solid.Index(itemsSig, (itemSig) => {
                return Solid.h(Spatial.Runtime, {
                    prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                    localPosition: () => Solid.read(itemSig).pos,
                });
            });

            expect(Spatial.getActiveNodeCount()).toBe(2);

            // Shrink list to 1 item
            Solid.write(itemsSig, [{ id: 1, pos: { x: 10, y: 0, z: 0 } }]);

            return Promise.resolve()
                .then(() => {
                    expect(Spatial.getActiveNodeCount()).toBe(1);
                    // Clear list completely
                    Solid.write(itemsSig, []);
                    return Promise.resolve();
                })
                .then(() => {
                    expect(Spatial.getActiveNodeCount()).toBe(0);
                });
        });
    });

    describe('Raw ID Bypass API (Zero Heap Allocations)', () => {
        it('should create, modify, and delete nodes purely by ID without class wrappers', () => {
            const id = Spatial.createEmptyId({ position: { x: 10, y: 20, z: 30 } });
            expect(id).not.toBeNull();
            expect(Spatial.isValid(id!)).toBe(true);

            expect(Spatial.getLocalPosition(id!)).toEqual({ x: 10, y: 20, z: 30 });

            Spatial.setLocalPosition(id!, { x: 50, y: 60, z: 70 });
            expect(Spatial.getLocalPosition(id!)).toEqual({ x: 50, y: 60, z: 70 });

            // Raw ID transformations & projections
            Spatial.translate(id!, { x: 5, y: 0, z: 0 });
            expect(Spatial.getLocalPosition(id!)!.x).toBeCloseTo(55);

            Spatial.translateLocal(id!, { x: 5, y: 0, z: 0 });
            expect(Spatial.getLocalPosition(id!)!.x).toBeCloseTo(60);

            Spatial.lookAt(id!, { x: 60, y: 0, z: 100 });
            expect(Spatial.getWorldRotationEuler(id!)!.y).toBeCloseTo(0);

            // Space projections by ID
            const worldPt = Spatial.localToWorldPoint(id!, { x: 0, y: 0, z: 10 });
            expect(worldPt!.x).toBeCloseTo(60);
            expect(worldPt!.y).toBeCloseTo(51.055, 2);
            expect(worldPt!.z).toBeCloseTo(74.472, 2);

            const localPt = Spatial.worldToLocalPoint(id!, worldPt!);
            expect(localPt!.x).toBeCloseTo(0);
            expect(localPt!.y).toBeCloseTo(0);
            expect(localPt!.z).toBeCloseTo(10);

            const worldVec = Spatial.localToWorldVector(id!, { x: 1, y: 0, z: 0 });
            expect(worldVec!.x).toBeCloseTo(1);

            const localVec = Spatial.worldToLocalVector(id!, worldVec!);
            expect(localVec!.x).toBeCloseTo(1);

            const renderPos = Spatial.computeRenderPosition(id!);
            expect(renderPos).toEqual(Spatial.getWorldPosition(id!));

            // Controller configurations by ID
            Spatial.setOrbit(id!, { speedDegPerSec: 45 });
            Spatial.setFollow(id!, { target: { position: { x: 0, y: 0, z: 0 } } });
            Spatial.setKinematics(id!, { linearVelocity: { x: 1, y: 0, z: 0 } });
            Spatial.setLookAt(id!, { target: { position: { x: 100, y: 0, z: 100 } } });

            // Lazily resolve wrapper
            const wrapper = Spatial.fromId(id!);
            expect(wrapper).toBeInstanceOf(Spatial.SpatialElement);
            expect(wrapper!.localPosition!.x).toBeCloseTo(60);

            Spatial.deleteNode(id!);
            expect(Spatial.isDeleted(id!)).toBe(true);
            expect(wrapper!.isDeleted).toBe(true);
        });

        it('should support raw ID runtime prefab spawning', () => {
            const id = Spatial.createRuntimeId({
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 1, y: 2, z: 3 },
            });

            expect(id).not.toBeNull();
            expect(Spatial.isValid(id!)).toBe(true);

            Spatial.sync();
            const mockObj = harness.objects.get(1001)!;
            expect(mockObj.position).toEqual({ x: 1, y: 2, z: 3 });

            Spatial.deleteNode(id!);
            expect(mockObj.valid).toBe(false);
        });

        it('should increment generations on delete and prevent stale ID reuse', () => {
            // Allocate initial node at slot 0 (generation 0)
            const idGen0 = Spatial.createEmptyId({ position: { x: 1, y: 2, z: 3 } })!;
            expect(Spatial.isValid(idGen0)).toBe(true);
            expect(Spatial.isDeleted(idGen0)).toBe(false);

            // Delete node
            Spatial.deleteNode(idGen0);
            expect(Spatial.isValid(idGen0)).toBe(false);
            expect(Spatial.isDeleted(idGen0)).toBe(true);

            // Allocate next node (re-uses slot 0 with generation 1)
            const idGen1 = Spatial.createEmptyId({ position: { x: 10, y: 20, z: 30 } })!;
            expect(idGen1).not.toBe(idGen0);
            expect(Spatial.isValid(idGen1)).toBe(true);
            expect(Spatial.isDeleted(idGen1)).toBe(false);

            // Old ID is still considered deleted and cannot mutate new node
            expect(Spatial.isValid(idGen0)).toBe(false);
            expect(Spatial.isDeleted(idGen0)).toBe(true);

            Spatial.setLocalPosition(idGen0, { x: 99, y: 99, z: 99 });
            expect(Spatial.getLocalPosition(idGen1)).toEqual({ x: 10, y: 20, z: 30 });
            expect(Spatial.getLocalPosition(idGen0)).toBeUndefined();

            // Uncreated, future, and invalid IDs return undefined; ROOT_NODE_ID returns false
            expect(Spatial.isDeleted(Spatial.ROOT_NODE_ID)).toBe(false);
            expect(Spatial.isDeleted(999999 as Spatial.SpatialNodeID)).toBeUndefined();
            expect(Spatial.isDeleted(-1 as Spatial.SpatialNodeID)).toBeUndefined();
            expect(Spatial.isDeleted(-10 as Spatial.SpatialNodeID)).toBeUndefined();

            Spatial.deleteNode(idGen1);
        });
    });

    describe('Raw ID to Element Bridging & Capacity Exhaustion', () => {
        it('should bridge raw IDs to elements via Spatial.fromId(Spatial.create*Id(...))', () => {
            const emptyId = Spatial.createEmptyId({ position: { x: 5, y: 5, z: 5 } });
            expect(emptyId).not.toBeNull();
            const empty = Spatial.fromId(emptyId!);
            expect(empty).not.toBeNull();
            expect(empty!.isValid).toBe(true);
            expect(empty!.localPosition).toEqual({ x: 5, y: 5, z: 5 });

            const runtimeId = Spatial.createRuntimeId({
                prefab: 30 as unknown as Spatial.RuntimeSpawnPrefab,
                position: { x: 10, y: 0, z: 0 },
            });
            expect(runtimeId).not.toBeNull();
            const runtime = Spatial.fromId(runtimeId!);
            expect(runtime).not.toBeNull();
            expect(runtime!.isValid).toBe(true);

            const mockObj = harness.createMockObject(30) as unknown as Spatial.TransformableObject;
            const existingId = Spatial.createExistingId({ object: mockObj });
            expect(existingId).not.toBeNull();
            const existing = Spatial.fromId(existingId!);
            expect(existing).not.toBeNull();
            expect(existing!.isValid).toBe(true);

            // Static fromId on SpatialNode and SpatialElement
            expect(Spatial.SpatialNode.fromId(Spatial.ROOT_NODE_ID)).toBe(Spatial.ROOT_NODE);
            expect(Spatial.SpatialElement.fromId(Spatial.ROOT_NODE_ID)).toBeNull();
            expect(Spatial.SpatialNode.fromId(emptyId!)).toBe(empty);
            expect(Spatial.SpatialElement.fromId(emptyId!)).toBe(empty);

            empty!.delete();
            runtime!.delete();
            existing!.delete();
        });

        it('should handle pool exhaustion cleanly in constructors and raw ID functions', () => {
            const allocated: Spatial.SpatialElement[] = [];

            // Fill pool up to MAX_NODES
            for (let i = 0; i < Spatial.MAX_NODES; ++i) {
                const node = new Spatial.Empty();
                if (node.isValid) allocated.push(node);
            }
            expect(Spatial.getActiveNodeCount()).toBe(Spatial.MAX_NODES);

            // Raw ID creator returns null when full
            const overflowId = Spatial.createEmptyId();
            expect(overflowId).toBeNull();

            // Constructor returns an invalid instance that does NOT point to ROOT_NODE
            const overflowConstructor = new Spatial.Empty();
            expect(overflowConstructor.isValid).toBe(false);
            expect(overflowConstructor.isDeleted).toBeUndefined();
            expect(overflowConstructor._id).toBe(Spatial.INVALID_NODE_ID);
            expect(overflowConstructor.parent).toBeUndefined();
            expect(overflowConstructor.localPosition).toBeUndefined();

            // Clean up
            for (const node of allocated) {
                node.delete();
            }
            expect(Spatial.getActiveNodeCount()).toBe(0);
        });
    });

    describe('QueryableObject Integration & Zero-Allocation Follow/LookAt', () => {
        it('should support QueryableObject with zero-allocation getPosition writing to out', () => {
            const currentPos = { x: 10, y: 20, z: 30 };
            let receivedOut: unknown = null;

            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    receivedOut = out;
                    if (out) {
                        out.x = currentPos.x;
                        out.y = currentPos.y;
                        out.z = currentPos.z;
                        return out;
                    }
                    return { ...currentPos };
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target, smoothing: 0 });

            stepSpatial(16);
            expect(receivedOut).not.toBeNull();
            expect(follower.worldPosition!.x).toBeCloseTo(10);
            expect(follower.worldPosition!.y).toBeCloseTo(20);
            expect(follower.worldPosition!.z).toBeCloseTo(30);

            // Update target position
            currentPos.x = 50;
            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(50);
        });

        it('should follow QueryableObject returning newly created Vector3 without using out', () => {
            let posX = 15;
            const target: Spatial.QueryableObject = {
                getPosition() {
                    return { x: posX, y: 0, z: 0 };
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target, smoothing: 0 });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(15);

            posX = 75;
            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(75);
        });

        it('should skip follow update and leave follower untouched when getPosition returns null or undefined', () => {
            let active = true;
            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (!active) return null;
                    if (out) {
                        out.x = 100;
                        out.y = 50;
                        out.z = 25;
                        return out;
                    }
                    return { x: 100, y: 50, z: 25 };
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target, smoothing: 0 });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(100);
            expect(follower.worldPosition!.y).toBeCloseTo(50);
            expect(follower.worldPosition!.z).toBeCloseTo(25);

            // Manually move follower while target is deactivated (returns null)
            active = false;
            follower.setWorldPosition({ x: 999, y: 888, z: 777 });

            stepSpatial(16);
            // Must remain at 999, 888, 777 untouched
            expect(follower.worldPosition!.x).toBeCloseTo(999);
            expect(follower.worldPosition!.y).toBeCloseTo(888);
            expect(follower.worldPosition!.z).toBeCloseTo(777);

            // Reactivate target
            active = true;
            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(100);
        });

        it('should follow QueryableObject orientation with getRotation returning Quaternion', () => {
            const rotQuat = Quaternions.fromEuler(0, Math.PI / 2, 0); // 90 deg yaw
            let receivedOutRot: unknown = null;

            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 10;
                        out.y = 0;
                        out.z = 0;
                        return out;
                    }
                    return { x: 10, y: 0, z: 0 };
                },
                getRotation(out) {
                    receivedOutRot = out;
                    if (out && 'w' in out) {
                        return Quaternions.copy(out, rotQuat);
                    }
                    return { ...rotQuat };
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target, trackRotation: true, smoothing: 0 });

            stepSpatial(16);
            expect(receivedOutRot).not.toBeNull();
            expect(follower.worldPosition!.x).toBeCloseTo(10);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(Math.PI / 2);
        });

        it('should follow QueryableObject orientation with getRotation returning Euler Vector3', () => {
            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 5;
                        out.y = 5;
                        out.z = 5;
                        return out;
                    }
                    return { x: 5, y: 5, z: 5 };
                },
                getRotation() {
                    return { x: 0, y: Math.PI / 4, z: 0 }; // 45 deg yaw
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target, trackRotation: true, smoothing: 0 });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(5);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(Math.PI / 4);
        });

        it('should correctly handle QueryableObject getRotation writing Euler via Vectors.facingToEuler to out', () => {
            const facingEast = { x: 1, y: 0, z: 0 }; // Facing East -> Yaw = -90 deg (-Math.PI / 2)
            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 10;
                        out.y = 0;
                        out.z = 10;
                        return out;
                    }
                    return { x: 10, y: 0, z: 10 };
                },
                getRotation(out) {
                    return Vectors.facingToEuler(facingEast, out as Vectors.Vector3);
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({
                target,
                offset: { x: 0, y: 0, z: 4 },
                trackRotation: true,
                yawOnly: true,
                smoothing: 0,
            });

            stepSpatial(16);
            // Behind player facing East is West (-X): target (10, 0, 10) + offset rotated by -90 deg (-4, 0, 0) = (6, 0, 10)
            expect(follower.worldPosition!.x).toBeCloseTo(6);
            expect(follower.worldPosition!.y).toBeCloseTo(0);
            expect(follower.worldPosition!.z).toBeCloseTo(10);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(-Math.PI / 2);
        });

        it('should correctly handle QueryableObject getRotation writing Quaternion via Quaternions.fromFacing to out', () => {
            const facingEast = { x: 1, y: 0, z: 0 };
            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 10;
                        out.y = 0;
                        out.z = 10;
                        return out;
                    }
                    return { x: 10, y: 0, z: 10 };
                },
                getRotation(out) {
                    return Quaternions.fromFacing(facingEast, out as Quaternions.Quaternion);
                },
            };

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({
                target,
                offset: { x: 0, y: 0, z: 4 },
                trackRotation: true,
                yawOnly: true,
                smoothing: 0,
            });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(6);
            expect(follower.worldPosition!.y).toBeCloseTo(0);
            expect(follower.worldPosition!.z).toBeCloseTo(10);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(-Math.PI / 2);
        });

        it('should correctly keep follower behind target when facing South (180 deg) and South-East (135 deg) with yawOnly', () => {
            // Facing South: [0, 0, 1] -> behind player (facing South) is North (-Z)
            const facingSouth = { x: 0, y: 0, z: 1 };
            const targetSouth: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 0;
                        out.y = 0;
                        out.z = 0;
                        return out;
                    }
                    return { x: 0, y: 0, z: 0 };
                },
                getRotation(out) {
                    return Vectors.facingToEuler(facingSouth, out as Vectors.Vector3);
                },
            };

            const followerSouth = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            followerSouth.setFollow({
                target: targetSouth,
                offset: { x: 0, y: 0, z: 4 },
                trackRotation: true,
                yawOnly: true,
                smoothing: 0,
            });

            stepSpatial(16);
            // Offset (0, 0, 4) rotated by -180 deg is (0, 0, -4)
            expect(followerSouth.worldPosition!.x).toBeCloseTo(0);
            expect(followerSouth.worldPosition!.y).toBeCloseTo(0);
            expect(followerSouth.worldPosition!.z).toBeCloseTo(-4);
            expect(Math.abs(followerSouth.worldRotationEuler!.y)).toBeCloseTo(Math.PI);

            // Facing South-East (135 deg East): [0.7071, 0, 0.7071]
            // Behind player facing SE is North-West: (-4 * sin(45 deg), 0, -4 * cos(45 deg)) = (-2.828, 0, -2.828)
            const facingSE = { x: 0.7071, y: 0, z: 0.7071 };
            const targetSE: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 0;
                        out.y = 0;
                        out.z = 0;
                        return out;
                    }
                    return { x: 0, y: 0, z: 0 };
                },
                getRotation(out) {
                    return Vectors.facingToEuler(facingSE, out as Vectors.Vector3);
                },
            };

            const followerSE = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            followerSE.setFollow({
                target: targetSE,
                offset: { x: 0, y: 0, z: 4 },
                trackRotation: true,
                yawOnly: true,
                smoothing: 0,
            });

            stepSpatial(16);
            expect(followerSE.worldPosition!.x).toBeCloseTo(-4 * Math.sin(Math.PI / 4));
            expect(followerSE.worldPosition!.y).toBeCloseTo(0);
            expect(followerSE.worldPosition!.z).toBeCloseTo(-4 * Math.cos(Math.PI / 4));
            expect(followerSE.worldRotationEuler!.y).toBeCloseTo((-3 * Math.PI) / 4);
        });

        it('should track position but leave rotation untouched when getRotation returns null or is omitted', () => {
            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (out) {
                        out.x = 20;
                        out.y = 0;
                        out.z = 0;
                        return out;
                    }
                    return { x: 20, y: 0, z: 0 };
                },
                getRotation() {
                    return null;
                },
            };

            const initialRot = Quaternions.fromEuler(0, 1.2, 0);
            const follower = new Spatial.Empty({
                position: { x: 0, y: 0, z: 0 },
                rotation: initialRot,
            });

            follower.setFollow({ target, trackRotation: true, smoothing: 0 });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(20);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(1.2);
        });

        it('should follow player orientation derived from engine player rotation', () => {
            const player = harness.createMockObject(1); // Type Player = 1
            player.position = { x: 10, y: 0, z: 20 };
            player.rotation = { x: 0, y: Math.PI / 2, z: 0 }; // Facing East (yaw = PI / 2)

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target: player as unknown as mod.Player, trackRotation: true, smoothing: 0 });

            stepSpatial(16);
            expect(follower.worldPosition!.x).toBeCloseTo(10);
            expect(follower.worldPosition!.z).toBeCloseTo(20);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(Math.PI / 2);

            // Change facing to North [x=PI, y=0, z=PI] -> yaw = PI
            player.rotation = { x: Math.PI, y: 0, z: Math.PI };
            stepSpatial(16);
            expect(Math.abs(follower.worldRotationEuler!.y)).toBeCloseTo(Math.PI);
        });

        it('should support continuous LookAt on a QueryableObject target', () => {
            let targetPos: { x: number; y: number; z: number } | null = { x: 0, y: 0, z: 10 };

            const target: Spatial.QueryableObject = {
                getPosition(out) {
                    if (!targetPos) return null;
                    if (out) {
                        out.x = targetPos.x;
                        out.y = targetPos.y;
                        out.z = targetPos.z;
                        return out;
                    }
                    return { ...targetPos };
                },
            };

            const observer = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            observer.setLookAt({ target });

            stepSpatial(16);
            // Looking at +Z -> Euler yaw = 0
            expect(observer.localRotationEuler!.y).toBeCloseTo(0);

            // Target moves to +X -> Euler yaw = Math.PI / 2
            targetPos = { x: 10, y: 0, z: 0 };
            stepSpatial(16);
            expect(observer.localRotationEuler!.y).toBeCloseTo(Math.PI / 2);

            // Target returns null -> observer rotation is untouched
            targetPos = null;
            stepSpatial(16);
            expect(observer.localRotationEuler!.y).toBeCloseTo(Math.PI / 2);
        });
    });

    describe('Render Precision & Deadband Synchronization', () => {
        it('should initialize nodes with default precision constants', () => {
            const node = new Spatial.Empty();
            expect(node.positionRenderPrecision).toBe(Spatial.DEFAULT_POSITION_RENDER_PRECISION);
            expect(node.rotationRenderPrecision).toBe(Spatial.DEFAULT_ROTATION_RENDER_PRECISION);
            expect(Spatial.getPositionRenderPrecision(node.id)).toBe(Spatial.DEFAULT_POSITION_RENDER_PRECISION);
            expect(Spatial.getRotationRenderPrecision(node.id)).toBe(Spatial.DEFAULT_ROTATION_RENDER_PRECISION);
        });

        it('should only call SetObjectTransform once on initial sync and not on redundant syncs', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({
                object: mockObj as unknown as Spatial.TransformableObject,
                position: { x: 10, y: 0, z: 0 },
            });

            expect(mockObj.setTransformCallCount).toBe(0);

            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Re-sync without changes -> should not call engine
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Setting localPosition to identical value -> deduplicated, does not call engine
            existing.localPosition = { x: 10, y: 0, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);
        });

        it('should respect position deadband and accumulate sub-threshold movement', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({
                object: mockObj as unknown as Spatial.TransformableObject,
                position: { x: 0, y: 0, z: 0 },
            });

            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Move by 0.005m (below default 0.01m threshold)
            existing.localPosition = { x: 0.005, y: 0, z: 0 };
            Spatial.sync();
            // Gated by deadband -> no engine call
            expect(mockObj.setTransformCallCount).toBe(1);

            // Move by another 0.006m (cumulative 0.011m > 0.01m threshold)
            existing.localPosition = { x: 0.011, y: 0, z: 0 };
            Spatial.sync();
            // Cumulative movement exceeded threshold -> engine call fired
            expect(mockObj.setTransformCallCount).toBe(2);
            expect(mockObj.position.x).toBeCloseTo(0.011);
        });

        it('should respect rotation deadband threshold', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({
                object: mockObj as unknown as Spatial.TransformableObject,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
            });

            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Rotate by 0.05 rad (below default 0.175 rad threshold)
            existing.localRotationEuler = { x: 0, y: 0.05, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Rotate to 0.20 rad (delta = 0.20 > 0.175 rad threshold)
            existing.localRotationEuler = { x: 0, y: 0.2, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(2);
            expect(mockObj.rotation.y).toBeCloseTo(0.2);
        });

        it('should support custom precision overrides in NodeParams', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({
                object: mockObj as unknown as Spatial.TransformableObject,
                positionRenderPrecision: 0.05, // 5cm
                rotationRenderPrecision: 0.5, // ~28.6°
            });

            expect(existing.positionRenderPrecision).toBe(0.05);
            expect(existing.rotationRenderPrecision).toBe(0.5);

            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Move 0.03m (below 0.05m) -> no sync
            existing.localPosition = { x: 0.03, y: 0, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Move 0.06m (exceeds 0.05m) -> sync
            existing.localPosition = { x: 0.06, y: 0, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(2);

            // Rotate 0.3 rad (below 0.5 rad) -> no sync
            existing.localRotationEuler = { x: 0, y: 0.3, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(2);

            // Rotate 0.6 rad (exceeds 0.5 rad) -> sync
            existing.localRotationEuler = { x: 0, y: 0.6, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(3);
        });

        it('should support dynamic precision modification and chaining', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({ object: mockObj as unknown as Spatial.TransformableObject });

            existing.setPositionRenderPrecision(0.001).setRotationRenderPrecision(0.01);
            expect(existing.positionRenderPrecision).toBe(0.001);
            expect(existing.rotationRenderPrecision).toBe(0.01);

            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);

            // Move by 0.002m (> 0.001m fine threshold) -> syncs immediately
            existing.localPosition = { x: 0.002, y: 0, z: 0 };
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(2);
        });

        it('should support raw ID precision functions and exact mode (0 precision)', () => {
            const id = Spatial.createEmptyId({
                positionRenderPrecision: 0,
                rotationRenderPrecision: 0,
            });
            expect(id).not.toBeNull();
            expect(Spatial.getPositionRenderPrecision(id!)).toBe(0);
            expect(Spatial.getRotationRenderPrecision(id!)).toBe(0);

            Spatial.setPositionRenderPrecision(id!, 0.02);
            expect(Spatial.getPositionRenderPrecision(id!)).toBe(0.02);

            Spatial.setRotationRenderPrecision(id!, 0.03);
            expect(Spatial.getRotationRenderPrecision(id!)).toBe(0.03);
        });

        it('should auto-update Spatial in memory and not invoke SetObjectTransform until sync is called', () => {
            const mockObj: MockObject = harness.createMockObject(30);
            const existing = new Spatial.Existing({
                object: mockObj as unknown as Spatial.TransformableObject,
                position: { x: 0, y: 0, z: 0 },
            });

            existing.setKinematics({
                linearVelocity: { x: 10, y: 0, z: 0 },
            });

            // Updating spatial in memory advances local/world position but does NOT call engine SetObjectTransform
            stepSpatial(100);
            expect(existing.worldPosition!.x).toBeCloseTo(1);
            expect(mockObj.setTransformCallCount).toBe(0);

            stepSpatial(100);
            expect(existing.worldPosition!.x).toBeCloseTo(2);
            expect(mockObj.setTransformCallCount).toBe(0);

            // Explicitly calling Spatial.sync() commits dirty transforms to engine
            Spatial.sync();
            expect(mockObj.setTransformCallCount).toBe(1);
            expect(mockObj.position.x).toBeCloseTo(existing.worldPosition!.x);
        });
    });

    describe('Compound Velocity Evaluation (getLinearVelocity & getAngularVelocity)', () => {
        it('should return undefined for invalid, unallocated, or deleted nodes', () => {
            expect(Spatial.getLinearVelocity(Spatial.INVALID_NODE_ID)).toBeUndefined();
            expect(Spatial.getAngularVelocity(Spatial.INVALID_NODE_ID)).toBeUndefined();
            expect(Spatial.getLinearVelocity(99999 as Spatial.SpatialNodeID)).toBeUndefined();
            expect(Spatial.getAngularVelocity(99999 as Spatial.SpatialNodeID)).toBeUndefined();

            const node = new Spatial.Empty();
            expect(Spatial.getLinearVelocity(node)).toBeDefined();
            expect(node.linearVelocity).toBeDefined();

            node.delete();
            expect(Spatial.getLinearVelocity(node)).toBeUndefined();
            expect(Spatial.getAngularVelocity(node)).toBeUndefined();
            expect(node.linearVelocity).toBeUndefined();
            expect(node.angularVelocity).toBeUndefined();
        });

        it('should compute linear velocity for a single node with linear kinematics and support out vector', () => {
            const node = new Spatial.Empty();
            node.setKinematics({
                linearVelocity: { x: 10, y: -5, z: 2 },
            });

            const vel = Spatial.getLinearVelocity(node);
            expect(vel).toEqual({ x: 10, y: -5, z: 2 });
            expect(node.linearVelocity).toEqual({ x: 10, y: -5, z: 2 });

            const ang = Spatial.getAngularVelocity(node);
            expect(ang).toEqual({ x: 0, y: 0, z: 0 });
            expect(node.angularVelocity).toEqual({ x: 0, y: 0, z: 0 });

            // Zero-allocation out parameter
            const out: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const returned = Spatial.getLinearVelocity(node, out);
            expect(returned).toBe(out);
            expect(out).toEqual({ x: 10, y: -5, z: 2 });

            const outAng: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const returnedAng = node.getAngularVelocity(outAng);
            expect(returnedAng).toBe(outAng);
            expect(outAng).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should compute angular velocity in world space accounting for node orientation', () => {
            const node = new Spatial.Empty();
            // Rotate node 90 degrees around Z axis: (x, y, z) -> (-y, x, z)
            node.setLocalRotation({
                w: Math.cos(Math.PI / 4),
                x: 0,
                y: 0,
                z: Math.sin(Math.PI / 4),
            });
            node.setKinematics({
                angularVelocity: { x: 0, y: 5, z: 0 },
            });

            const ang = Spatial.getAngularVelocity(node);
            expect(ang).toBeDefined();
            expect(ang!.x).toBeCloseTo(-5, 4);
            expect(ang!.y).toBeCloseTo(0, 4);
            expect(ang!.z).toBeCloseTo(0, 4);
        });

        it('should compute tangential and angular velocity for an orbiting node', () => {
            const node = new Spatial.Empty({
                position: { x: 10, y: 0, z: 0 },
            });
            node.setOrbit({
                speedRadPerSec: 2,
                axis: { x: 0, y: 1, z: 0 },
                faceTangent: false,
            });

            // Tangential velocity: (0, 2, 0) x (10, 0, 0) = (0, 0, -20)
            const linVel = Spatial.getLinearVelocity(node);
            expect(linVel).toBeDefined();
            expect(linVel!.x).toBeCloseTo(0, 4);
            expect(linVel!.y).toBeCloseTo(0, 4);
            expect(linVel!.z).toBeCloseTo(-20, 4);

            // Without faceTangent, body angular velocity is 0
            const angVel = Spatial.getAngularVelocity(node);
            expect(angVel).toBeDefined();
            expect(angVel!.x).toBeCloseTo(0, 4);
            expect(angVel!.y).toBeCloseTo(0, 4);
            expect(angVel!.z).toBeCloseTo(0, 4);

            // With faceTangent, body angular velocity includes orbit rotation rate
            node.setOrbit({
                speedRadPerSec: 2,
                axis: { x: 0, y: 1, z: 0 },
                faceTangent: true,
            });

            const angVelWithTangent = Spatial.getAngularVelocity(node);
            expect(angVelWithTangent).toBeDefined();
            expect(angVelWithTangent!.x).toBeCloseTo(0, 4);
            expect(angVelWithTangent!.y).toBeCloseTo(2, 4);
            expect(angVelWithTangent!.z).toBeCloseTo(0, 4);
        });

        it('should compute parent angular velocity inducing tangential velocity on offset child', () => {
            const parent = new Spatial.Empty({
                position: { x: 0, y: 0, z: 0 },
            });
            parent.setKinematics({
                angularVelocity: { x: 0, y: 3, z: 0 },
            });

            const child = new Spatial.Empty({
                parent,
                position: { x: 0, y: 0, z: 5 },
            });

            // Tangential velocity on child: (0, 3, 0) x (0, 0, 5) = (15, 0, 0)
            const linVel = Spatial.getLinearVelocity(child);
            expect(linVel).toBeDefined();
            expect(linVel!.x).toBeCloseTo(15, 4);
            expect(linVel!.y).toBeCloseTo(0, 4);
            expect(linVel!.z).toBeCloseTo(0, 4);

            // Angular velocity on child should inherit parent's spin
            const angVel = Spatial.getAngularVelocity(child);
            expect(angVel).toBeDefined();
            expect(angVel!.x).toBeCloseTo(0, 4);
            expect(angVel!.y).toBeCloseTo(3, 4);
            expect(angVel!.z).toBeCloseTo(0, 4);
        });

        it('should aggregate multi-tier hierarchy with translation and rotation across ancestors', () => {
            const grandParent = new Spatial.Empty({
                position: { x: 100, y: 0, z: 0 },
            });
            grandParent.setKinematics({
                linearVelocity: { x: 10, y: 0, z: 0 },
            });

            const parent = new Spatial.Empty({
                parent: grandParent,
                position: { x: 0, y: 0, z: 0 },
            });
            parent.setKinematics({
                angularVelocity: { x: 0, y: 2, z: 0 },
            });

            const child = new Spatial.Empty({
                parent,
                position: { x: 0, y: 0, z: 4 },
            });
            child.setKinematics({
                linearVelocity: { x: 0, y: 5, z: 0 },
                angularVelocity: { x: 1, y: 0, z: 0 },
            });

            // Linear velocity:
            // Grandparent linVel: (10, 0, 0)
            // Parent angVel tangential: (0, 2, 0) x (0, 0, 4) = (8, 0, 0)
            // Child linVel: (0, 5, 0)
            // Total = (18, 5, 0)
            const linVel = Spatial.getLinearVelocity(child);
            expect(linVel).toBeDefined();
            expect(linVel!.x).toBeCloseTo(18, 4);
            expect(linVel!.y).toBeCloseTo(5, 4);
            expect(linVel!.z).toBeCloseTo(0, 4);

            // Angular velocity:
            // Parent angVel: (0, 2, 0)
            // Child angVel: (1, 0, 0)
            // Total = (1, 2, 0)
            const angVel = Spatial.getAngularVelocity(child);
            expect(angVel).toBeDefined();
            expect(angVel!.x).toBeCloseTo(1, 4);
            expect(angVel!.y).toBeCloseTo(2, 4);
            expect(angVel!.z).toBeCloseTo(0, 4);
        });

        it('should compute parent orbit inducing tangential and angular velocity on child', () => {
            const parent = new Spatial.Empty({
                position: { x: 10, y: 0, z: 0 },
            });
            parent.setOrbit({
                speedRadPerSec: 1,
                axis: { x: 0, y: 1, z: 0 },
            });

            const child = new Spatial.Empty({
                parent,
                position: { x: 0, y: 0, z: 2 },
            });

            // Parent orbit center: (0, 0, 0)
            // Child world pos: (10, 0, 2)
            // Parent omega: (0, 1, 0)
            // Tangential vel: (0, 1, 0) x (10, 0, 2) = (2, 0, -10)
            const linVel = Spatial.getLinearVelocity(child.id);
            expect(linVel).toBeDefined();
            expect(linVel!.x).toBeCloseTo(2, 4);
            expect(linVel!.y).toBeCloseTo(0, 4);
            expect(linVel!.z).toBeCloseTo(-10, 4);

            const angVel = Spatial.getAngularVelocity(child.id);
            expect(angVel).toBeDefined();
            expect(angVel!.x).toBeCloseTo(0, 4);
            expect(angVel!.y).toBeCloseTo(1, 4);
            expect(angVel!.z).toBeCloseTo(0, 4);
        });

        it('should evaluate exact cancellation in nested kinematic and orbital multi-tier hierarchy', () => {
            // 4-tier hierarchy setup:
            // 1. Root (Kinematic): LinVel = (10, 0, 0), AngVel = (0, 1, 0)
            // 2. Child 1 (Orbiting Root): offset = (0, 0, 10), Orbit speed = -1 rad/s around Y
            //    -> Orbit tangential cancels Root spin tangential on any point at +Z
            // 3. Child 2 (Kinematic Child of Child 1): local offset = (0, 0, 0)
            //    -> LinVel = (-10, 0, 0) directly opposes Root LinVel (+10, 0, 0)
            //    -> AngVel = (0, 2, 0)
            // 4. Leaf Target (Orbiting Child 2): local offset = (0, 0, 5), Orbit speed = -2 rad/s around Y, faceTangent = true
            //    -> Orbit tangential cancels Child 2 spin tangential
            //    -> Orbit body rotation cancels Child 2 spin angular velocity

            const root = new Spatial.Empty({
                position: { x: 0, y: 0, z: 0 },
            });
            root.setKinematics({
                linearVelocity: { x: 10, y: 0, z: 0 },
                angularVelocity: { x: 0, y: 1, z: 0 },
            });

            const child1 = new Spatial.Empty({
                parent: root,
                position: { x: 0, y: 0, z: 10 },
            });
            child1.setOrbit({
                speedRadPerSec: -1,
                axis: { x: 0, y: 1, z: 0 },
                center: { x: 0, y: 0, z: 0 },
            });

            const child2 = new Spatial.Empty({
                parent: child1,
                position: { x: 0, y: 0, z: 0 },
            });
            child2.setKinematics({
                linearVelocity: { x: -10, y: 0, z: 0 },
                angularVelocity: { x: 0, y: 2, z: 0 },
            });

            const leaf = new Spatial.Empty({
                parent: child2,
                position: { x: 0, y: 0, z: 5 },
            });
            leaf.setOrbit({
                speedRadPerSec: -2,
                axis: { x: 0, y: 1, z: 0 },
                center: { x: 0, y: 0, z: 0 },
                faceTangent: true,
            });

            // 1. Verify Leaf (Tier 4):
            // Linear velocity:
            //   +10 (root linVel)
            //   +15 (root spin tangential at Z=15)
            //   -15 (child1 orbit tangential at Z=15)
            //   -10 (child2 linVel)
            //   +10 (child2 spin tangential at Z=5)
            //   -10 (leaf orbit tangential at Z=5)
            //   = (0, 0, 0)
            const leafLinVel = Spatial.getLinearVelocity(leaf);
            expect(leafLinVel).toBeDefined();
            expect(leafLinVel!.x).toBeCloseTo(0, 4);
            expect(leafLinVel!.y).toBeCloseTo(0, 4);
            expect(leafLinVel!.z).toBeCloseTo(0, 4);

            // Angular velocity:
            //   +1 (root spin)
            //   -1 (child1 orbit subtree revolution)
            //   +2 (child2 spin)
            //   -2 (leaf orbit body rotation via faceTangent)
            //   = (0, 0, 0)
            const leafAngVel = Spatial.getAngularVelocity(leaf);
            expect(leafAngVel).toBeDefined();
            expect(leafAngVel!.x).toBeCloseTo(0, 4);
            expect(leafAngVel!.y).toBeCloseTo(0, 4);
            expect(leafAngVel!.z).toBeCloseTo(0, 4);

            // 2. Verify intermediate node Child 2 (Tier 3):
            // Linear velocity:
            //   +10 (root linVel)
            //   +10 (root spin tangential at Z=10)
            //   -10 (child1 orbit tangential at Z=10)
            //   -10 (child2 linVel)
            //   = (0, 0, 0)
            const child2LinVel = Spatial.getLinearVelocity(child2);
            expect(child2LinVel).toBeDefined();
            expect(child2LinVel!.x).toBeCloseTo(0, 4);
            expect(child2LinVel!.y).toBeCloseTo(0, 4);
            expect(child2LinVel!.z).toBeCloseTo(0, 4);

            // Angular velocity:
            //   +1 (root spin)
            //   -1 (child1 orbit)
            //   +2 (child2 spin)
            //   = (0, 2, 0)
            const child2AngVel = Spatial.getAngularVelocity(child2);
            expect(child2AngVel).toBeDefined();
            expect(child2AngVel!.x).toBeCloseTo(0, 4);
            expect(child2AngVel!.y).toBeCloseTo(2, 4);
            expect(child2AngVel!.z).toBeCloseTo(0, 4);

            // 3. Verify intermediate node Child 1 (Tier 2):
            // Linear velocity:
            //   +10 (root linVel)
            //   +10 (root spin tangential at Z=10)
            //   -10 (child1 orbit tangential at Z=10)
            //   = (10, 0, 0)
            const child1LinVel = Spatial.getLinearVelocity(child1);
            expect(child1LinVel).toBeDefined();
            expect(child1LinVel!.x).toBeCloseTo(10, 4);
            expect(child1LinVel!.y).toBeCloseTo(0, 4);
            expect(child1LinVel!.z).toBeCloseTo(0, 4);

            // Angular velocity (child1 has faceTangent=false):
            //   +1 (root spin)
            //   = (0, 1, 0)
            const child1AngVel = Spatial.getAngularVelocity(child1);
            expect(child1AngVel).toBeDefined();
            expect(child1AngVel!.x).toBeCloseTo(0, 4);
            expect(child1AngVel!.y).toBeCloseTo(1, 4);
            expect(child1AngVel!.z).toBeCloseTo(0, 4);
        });
    });
});
