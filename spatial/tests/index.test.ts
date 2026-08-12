import { beforeEach, describe, expect, it } from 'vitest';
import { Quaternions } from '../../quaternions/index.ts';
import { Solid } from '../../solid/index.ts';
import { Vectors } from '../../vectors/index.ts';
import { Spatial } from '../index.ts';
import { MockObject, SpatialTestHarness } from './harness.ts';

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
            const target: Spatial.QueryableObject = {
                getPosition: (out) => (out ? Object.assign(out, { x: 100, y: 0, z: 0 }) : { x: 100, y: 0, z: 0 }),
            };
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

    describe('QueryableObject Integration & Zero-Allocation Follow/LookAt', () => {
        it('should follow QueryableObject with zero-allocation getPosition writing to out', () => {
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

            Spatial.update(16);
            expect(receivedOut).not.toBeNull();
            expect(follower.worldPosition!.x).toBeCloseTo(10);
            expect(follower.worldPosition!.y).toBeCloseTo(20);
            expect(follower.worldPosition!.z).toBeCloseTo(30);

            // Update target position
            currentPos.x = 50;
            Spatial.update(16);
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

            Spatial.update(16);
            expect(follower.worldPosition!.x).toBeCloseTo(15);

            posX = 75;
            Spatial.update(16);
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

            Spatial.update(16);
            expect(follower.worldPosition!.x).toBeCloseTo(100);
            expect(follower.worldPosition!.y).toBeCloseTo(50);
            expect(follower.worldPosition!.z).toBeCloseTo(25);

            // Manually move follower while target is deactivated (returns null)
            active = false;
            follower.setWorldPosition({ x: 999, y: 888, z: 777 });

            Spatial.update(16);
            // Must remain at 999, 888, 777 untouched
            expect(follower.worldPosition!.x).toBeCloseTo(999);
            expect(follower.worldPosition!.y).toBeCloseTo(888);
            expect(follower.worldPosition!.z).toBeCloseTo(777);

            // Reactivate target
            active = true;
            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
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

            Spatial.update(16);
            expect(follower.worldPosition!.x).toBeCloseTo(20);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(1.2);
        });

        it('should follow player orientation derived from facing direction vector', () => {
            const player = harness.createMockObject(1); // Type Player = 1
            player.position = { x: 10, y: 0, z: 20 };
            player.rotation = { x: 1, y: 0, z: 0 }; // Facing East [1, 0, 0] -> yaw = -PI / 2

            const follower = new Spatial.Empty({ position: { x: 0, y: 0, z: 0 } });
            follower.setFollow({ target: player as unknown as mod.Player, trackRotation: true, smoothing: 0 });

            Spatial.update(16);
            expect(follower.worldPosition!.x).toBeCloseTo(10);
            expect(follower.worldPosition!.z).toBeCloseTo(20);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(-Math.PI / 2);

            // Change facing to North [0, 0, -1] -> yaw = 0
            player.rotation = { x: 0, y: 0, z: -1 };
            Spatial.update(16);
            expect(follower.worldRotationEuler!.y).toBeCloseTo(0);
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

            Spatial.update(16);
            // Looking at +Z -> Euler yaw = 0
            expect(observer.localRotationEuler!.y).toBeCloseTo(0);

            // Target moves to +X -> Euler yaw = Math.PI / 2
            targetPos = { x: 10, y: 0, z: 0 };
            Spatial.update(16);
            expect(observer.localRotationEuler!.y).toBeCloseTo(Math.PI / 2);

            // Target returns null -> observer rotation is untouched
            targetPos = null;
            Spatial.update(16);
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
    });
});
