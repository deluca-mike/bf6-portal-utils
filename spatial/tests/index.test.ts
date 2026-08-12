import { beforeEach, describe, expect, it } from 'vitest';
import { Solid } from '../../solid/index.ts';
import { Spatial } from '../index.ts';
import { SpatialTestHarness } from './harness.ts';

describe('Unified Spatial Module Integration Tests', () => {
    let harness: SpatialTestHarness;

    beforeEach(() => {
        harness = new SpatialTestHarness();
        // Clean up any lingering active nodes
        while (Spatial.ROOT_NODE.childCount! > 0) {
            Spatial.ROOT_NODE.getChild(0)!.delete();
        }
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
            Spatial.update(1000);

            const pos = orbiter.localPosition!;
            expect(pos.x).toBeCloseTo(0);
            expect(pos.z).toBeCloseTo(-10);
        });

        it('should update linear and angular velocity in kinematics', () => {
            const node = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            node.setKinematics({
                linearVelocity: { x: 10, y: 0, z: 0 }, // 10 m/s
            });

            Spatial.update(500); // 0.5 sec -> 5 meters
            expect(node.localPosition!.x).toBeCloseTo(5);
        });

        it('should look at target world coordinates', () => {
            const node = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            node.lookAt({ x: 0, y: 0, z: 10 });

            // Looking forward (+Z) should result in Euler yaw = 0
            expect(node.localRotationEuler!.y).toBeCloseTo(0);
        });

        it('should follow target position smoothly', () => {
            const target = { position: { x: 100, y: 0, z: 0 } };
            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });

            follower.setFollow({
                target,
                smoothing: 0, // instant snap
            });

            Spatial.update(16);
            expect(follower.worldPosition!.x).toBeCloseTo(100);
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
});
