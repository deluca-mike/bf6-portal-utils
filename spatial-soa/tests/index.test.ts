import { beforeEach, describe, expect, it } from 'vitest';
import { SpatialTestHarness } from './harness.ts';

const harness = new SpatialTestHarness();

import { SpatialSOA } from '../index.ts';

describe('SpatialSOA Pure Functional Module Integration Tests', () => {
    beforeEach(() => {
        SpatialSOA.forEachChild(SpatialSOA.ROOT_NODE_ID, (childId) => SpatialSOA.destroy(childId));
        harness.objects.clear();
    });

    describe('1. Scene Graph Hierarchy & Coordinate Transformations', () => {
        it('should compute world positions for multi-level hierarchies', () => {
            const root = SpatialSOA.createEmpty({ position: { x: 0, y: 100, z: 0 } })!;
            const child1 = SpatialSOA.createEmpty({ parentId: root, position: { x: 10, y: 0, z: 0 } })!;
            const child2 = SpatialSOA.createEmpty({ parentId: child1, position: { x: 0, y: 5, z: 2 } })!;

            expect(SpatialSOA.getWorldPosition(root)).toEqual({ x: 0, y: 100, z: 0 });
            expect(SpatialSOA.getWorldPosition(child1)).toEqual({ x: 10, y: 100, z: 0 });
            expect(SpatialSOA.getWorldPosition(child2)).toEqual({ x: 10, y: 105, z: 2 });
        });

        it('should safely inspect and iterate children without array corruption', () => {
            const root = SpatialSOA.createEmpty()!;
            const c1 = SpatialSOA.createEmpty({ parentId: root, position: { x: 1, y: 0, z: 0 } })!;
            const c2 = SpatialSOA.createEmpty({ parentId: root, position: { x: 2, y: 0, z: 0 } })!;

            expect(SpatialSOA.getChildCount(root)).toBe(2);
            expect(SpatialSOA.getChild(root, 0)).toBe(c1);
            expect(SpatialSOA.getChild(root, 1)).toBe(c2);
            expect(SpatialSOA.getChild(root, 2)).toBeNull();
            expect(SpatialSOA.getChild(999999 as SpatialSOA.SpatialNodeID, 0)).toBeUndefined();
            expect(SpatialSOA.getChildCount(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getChildren(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();

            const visited: number[] = [];
            SpatialSOA.forEachChild(root, (childId) => visited.push(childId));
            expect(visited).toEqual([c1, c2]);

            // Mutating getChildren copy should not affect internal structure
            const arr = SpatialSOA.getChildren(root)!;
            arr.pop();
            expect(SpatialSOA.getChildCount(root)).toBe(2);
        });

        it('should correctly set child worldPosition and worldRotation relative to transformed parent', () => {
            const parent = SpatialSOA.createEmpty({
                position: { x: 100, y: 50, z: -200 },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
                scale: 2,
            })!;
            const child = SpatialSOA.createEmpty({ parentId: parent })!;

            // Set world position and world rotation directly
            SpatialSOA.setWorldPosition(child, { x: 150, y: 60, z: -180 });
            SpatialSOA.setWorldRotationEuler(child, { x: 0, y: Math.PI / 4, z: 0 });

            const childWorldPos = SpatialSOA.getWorldPosition(child)!;
            expect(childWorldPos.x).toBeCloseTo(150);
            expect(childWorldPos.y).toBeCloseTo(60);
            expect(childWorldPos.z).toBeCloseTo(-180);

            const childWorldRotEuler = SpatialSOA.getWorldRotationEuler(child)!;
            expect(childWorldRotEuler.y).toBeCloseTo(Math.PI / 4);
        });

        it('should propagate parent rotations to child world positions and orientations', () => {
            const root = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const child = SpatialSOA.createEmpty({ parentId: root, position: { x: 10, y: 0, z: 0 } })!;

            // Rotate root 90 degrees around Y axis (maps child's +X offset to -Z in world)
            SpatialSOA.setLocalRotationEuler(root, { x: 0, y: Math.PI / 2, z: 0 });

            const childWorldPos = SpatialSOA.getWorldPosition(child)!;
            expect(childWorldPos.x).toBeCloseTo(0);
            expect(childWorldPos.y).toBeCloseTo(0);
            expect(childWorldPos.z).toBeCloseTo(-10);

            const childWorldEuler = SpatialSOA.getWorldRotationEuler(child)!;
            expect(childWorldEuler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should correctly project points and vectors between local and world space', () => {
            const parent = SpatialSOA.createEmpty({ position: { x: 50, y: 10, z: -20 } })!;
            SpatialSOA.setLocalRotationEuler(parent, { x: 0, y: Math.PI, z: 0 }); // 180 degree yaw

            const localPoint = { x: 5, y: 2, z: 10 };
            const worldPoint = SpatialSOA.localToWorldPoint(parent, localPoint)!;

            // In 180 deg yaw: X -> -X, Z -> -Z
            expect(worldPoint.x).toBeCloseTo(50 - 5);
            expect(worldPoint.y).toBeCloseTo(10 + 2);
            expect(worldPoint.z).toBeCloseTo(-20 - 10);

            const backToLocal = SpatialSOA.worldToLocalPoint(parent, worldPoint)!;
            expect(backToLocal.x).toBeCloseTo(localPoint.x);
            expect(backToLocal.y).toBeCloseTo(localPoint.y);
            expect(backToLocal.z).toBeCloseTo(localPoint.z);

            // Test zero scale safety
            SpatialSOA.setLocalScale(parent, { x: 0, y: 1, z: 1 });
            expect(SpatialSOA.worldToLocalPoint(parent, worldPoint)).toBeDefined();

            // Test non-existent node returns undefined
            expect(SpatialSOA.localToWorldPoint(999999 as SpatialSOA.SpatialNodeID, localPoint)).toBeUndefined();
            expect(SpatialSOA.worldToLocalPoint(999999 as SpatialSOA.SpatialNodeID, worldPoint)).toBeUndefined();
            expect(SpatialSOA.localToWorldVector(999999 as SpatialSOA.SpatialNodeID, localPoint)).toBeUndefined();
            expect(SpatialSOA.worldToLocalVector(999999 as SpatialSOA.SpatialNodeID, worldPoint)).toBeUndefined();
            expect(SpatialSOA.getLocalPosition(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getWorldPosition(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getLocalRotation(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getWorldRotation(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getLocalRotationEuler(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getWorldRotationEuler(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getLocalScale(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getWorldScale(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.computeRenderPosition(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getPivotOffset(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
            expect(SpatialSOA.getPivotOffset(parent)).toBeNull();
        });

        it('should detect cycles and reject invalid child attachments', () => {
            const a = SpatialSOA.createEmpty()!;
            const b = SpatialSOA.createEmpty({ parentId: a })!;
            const c = SpatialSOA.createEmpty({ parentId: b })!;

            // Attempting to add ancestor 'a' as child of 'c'
            const result = SpatialSOA.setParent(a, c);
            expect(result).toBe(false);
            expect(SpatialSOA.getParent(a)).toBe(SpatialSOA.ROOT_NODE_ID);
            expect(SpatialSOA.getParent(SpatialSOA.ROOT_NODE_ID)).toBeNull();
            expect(SpatialSOA.getParent(999999 as SpatialSOA.SpatialNodeID)).toBeUndefined();
        });

        it('should safely destroy nodes, remove from hierarchy, and unspawn native runtime objects', () => {
            const root = SpatialSOA.createEmpty()!;
            const childRuntime = SpatialSOA.createRuntime(101, { parentId: root, position: { x: 1, y: 0, z: 0 } })!;
            expect(childRuntime).not.toBeNull();
            expect(SpatialSOA.isValid(childRuntime)).toBe(true);

            SpatialSOA.destroy(root);

            expect(SpatialSOA.isDeleted(root)).toBe(true);
            expect(SpatialSOA.isDeleted(childRuntime)).toBe(true);
            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(0);
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
        });

        it('should protect ROOT_NODE_ID from destruction and re-parenting', () => {
            const logs: string[] = [];
            SpatialSOA.setLogging((text) => void logs.push(text), SpatialSOA.LogLevel.Warning);

            expect(SpatialSOA.isValid(SpatialSOA.ROOT_NODE_ID)).toBe(true);
            expect(SpatialSOA.isDeleted(SpatialSOA.ROOT_NODE_ID)).toBe(false);
            expect(SpatialSOA.getParent(SpatialSOA.ROOT_NODE_ID)).toBeNull();

            // Attempt to destroy root node
            SpatialSOA.destroy(SpatialSOA.ROOT_NODE_ID);
            expect(logs.some((l) => l.includes('Cannot destroy the root node'))).toBe(true);
            expect(SpatialSOA.isValid(SpatialSOA.ROOT_NODE_ID)).toBe(true);

            // Attempt to re-parent root node
            const node = SpatialSOA.createEmpty()!;
            const reparentResult = SpatialSOA.setParent(SpatialSOA.ROOT_NODE_ID, node);
            expect(reparentResult).toBe(false);
            expect(logs.some((l) => l.includes('Cannot re-parent the root node'))).toBe(true);
        });

        it('should accurately track getActiveNodeCount and ROOT_NODE_ID childCount across hierarchies and destructions', () => {
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(0);

            const root1 = SpatialSOA.createEmpty()!;
            const root2 = SpatialSOA.createEmpty()!;
            const child1 = SpatialSOA.createEmpty({ parentId: root1 })!;
            const child2 = SpatialSOA.createEmpty({ parentId: root1 })!;
            const grandChild = SpatialSOA.createEmpty({ parentId: child1 })!;

            expect(SpatialSOA.isValid(root2)).toBe(true);
            expect(SpatialSOA.isValid(child2)).toBe(true);
            expect(SpatialSOA.isValid(grandChild)).toBe(true);

            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(2);
            expect(SpatialSOA.getActiveNodeCount()).toBe(5);

            // Destroy child1 and its subtree (child1 + grandChild)
            SpatialSOA.destroy(child1);
            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(2);
            expect(SpatialSOA.getActiveNodeCount()).toBe(3);

            // Destroy root1 and its remaining child (root1 + child2)
            SpatialSOA.destroy(root1);
            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(1);
            expect(SpatialSOA.getActiveNodeCount()).toBe(1);

            // Destroy all
            SpatialSOA.forEachChild(SpatialSOA.ROOT_NODE_ID, (childId) => SpatialSOA.destroy(childId));
            expect(SpatialSOA.getChildCount(SpatialSOA.ROOT_NODE_ID)).toBe(0);
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
        });

        it('should invalidate stale handle IDs after destruction via generation encoding', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 10, y: 20, z: 30 } })!;
            const oldId = node;

            expect(SpatialSOA.isValid(node)).toBe(true);
            SpatialSOA.destroy(node);
            expect(SpatialSOA.isValid(node)).toBe(false);
            expect(SpatialSOA.isDeleted(node)).toBe(true);

            // Create a new node in the recycled slot
            const newNode = SpatialSOA.createEmpty({ position: { x: 100, y: 200, z: 300 } })!;
            expect(newNode).not.toBe(oldId); // New generation multiplier!
            expect(SpatialSOA.isValid(oldId)).toBe(false); // Old ID remains invalid
            expect(SpatialSOA.isDeleted(oldId)).toBe(true); // Was created and destroyed
            expect(SpatialSOA.isValid(newNode)).toBe(true);
            expect(SpatialSOA.isDeleted(newNode)).toBe(false); // Currently active

            // Uncreated / invalid IDs were never created so are not deleted
            expect(SpatialSOA.isDeleted(999999 as SpatialSOA.SpatialNodeID)).toBe(false);
            expect(SpatialSOA.isDeleted(-1 as SpatialSOA.SpatialNodeID)).toBe(false);
            expect(SpatialSOA.isDeleted(-10 as SpatialSOA.SpatialNodeID)).toBe(false);
        });

        it('should reject creating nodes with invalid parentId', () => {
            const invalidParent = 999999 as SpatialSOA.SpatialNodeID;
            expect(SpatialSOA.createEmpty({ parentId: invalidParent })).toBeNull();
            expect(SpatialSOA.createRuntime(101, { parentId: invalidParent })).toBeNull();
            const mockObj = harness.createMockObject();
            expect(
                SpatialSOA.createExisting(mockObj as unknown as SpatialSOA.TransformableObject, {
                    parentId: invalidParent,
                })
            ).toBeNull();
        });

        it('should return null without throwing when pool is exhausted', () => {
            const logs: string[] = [];
            SpatialSOA.setLogging((text) => void logs.push(text), SpatialSOA.LogLevel.Error);

            const nodes: number[] = [];
            for (let i = 0; i < 1024; ++i) {
                const id = SpatialSOA.createEmpty()!;
                expect(id).not.toBeNull();
                nodes.push(id);
            }

            // 1025th allocation should fail gracefully and log error
            const extraNode = SpatialSOA.createEmpty();
            expect(extraNode).toBeNull();
            expect(logs.some((l) => l.includes('Pool is full'))).toBe(true);

            // Destroy one node, making room for a new one
            SpatialSOA.destroy(nodes[0]! as SpatialSOA.SpatialNodeID);
            const recycledNode = SpatialSOA.createEmpty();
            expect(recycledNode).not.toBeNull();
        });
    });

    describe('2. High-Level Controllers (Orbit, Follow, LookAt, Kinematics)', () => {
        it('should step linear kinematics and update local/world positions correctly', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 10, y: 0, z: 0 },
                linearAcceleration: { x: 2, y: 0, z: 0 },
            });

            // Simulate dt = 1s
            SpatialSOA.update(1.0);

            // v = v0 + a * dt = 10 + 2 = 12
            // pos = pos0 + v * dt = 0 + 12 * 1 = 12
            const pos = SpatialSOA.getLocalPosition(node)!;
            expect(pos.x).toBeCloseTo(12);
        });

        it('should orbit around center position and maintain orbit distance', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 10, y: 0, z: 0 } })!;
            const center = { x: 0, y: 0, z: 0 };
            const axis = { x: 0, y: 1, z: 0 }; // Orbit in X-Z plane around Y
            const speed = Math.PI / 2; // 90 deg/s

            SpatialSOA.setOrbit(node, {
                center,
                axis,
                speedRadPerSec: speed,
            });

            // Simulate 1 second (should rotate 90 deg: (10, 0, 0) -> (0, 0, -10))
            SpatialSOA.update(1.0);

            const pos = SpatialSOA.getLocalPosition(node)!;
            expect(pos.x).toBeCloseTo(0);
            expect(pos.y).toBeCloseTo(0);
            expect(pos.z).toBeCloseTo(-10);
        });

        it('should update LookAt controller to track target node position', () => {
            const tracker = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const target = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 10 } })!;

            SpatialSOA.setLookAt(tracker, { target });
            SpatialSOA.update(0.1);

            // Facing +Z direction
            const rotEuler = SpatialSOA.getWorldRotationEuler(tracker)!;
            expect(rotEuler.y).toBeCloseTo(0);

            // Move target to +X direction (10, 0, 0)
            SpatialSOA.setWorldPosition(target, { x: 10, y: 0, z: 0 });
            SpatialSOA.update(0.1);

            const updatedRotEuler = SpatialSOA.getWorldRotationEuler(tracker)!;
            expect(updatedRotEuler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should smoothly interpolate position towards follow target', () => {
            const follower = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const target = SpatialSOA.createEmpty({ position: { x: 100, y: 0, z: 0 } })!;

            SpatialSOA.setFollow(follower, {
                target,
                smoothSpeed: 10,
            });

            // Step half-way with small dt
            SpatialSOA.update(0.05); // factor = 10 * 0.05 = 0.5 -> moves to 50
            const pos = SpatialSOA.getWorldPosition(follower)!;
            expect(pos.x).toBeCloseTo(50);
        });

        it('should automatically detach from parent and mutually clear when given attach options or follow options', () => {
            const parent = SpatialSOA.createEmpty()!;
            const child1 = SpatialSOA.createEmpty({ parentId: parent })!;
            const child2 = SpatialSOA.createEmpty({ parentId: parent })!;
            const target = SpatialSOA.createEmpty()!;

            expect(SpatialSOA.getParent(child1)).toBe(parent);
            expect(SpatialSOA.getParent(child2)).toBe(parent);
            expect(SpatialSOA.getChildCount(parent)).toBe(2);

            // setFollow first
            SpatialSOA.setFollow(child1, { target });
            expect(SpatialSOA.getParent(child1)).toBe(SpatialSOA.ROOT_NODE_ID);

            // attachToPlayer should auto-detach to ROOT_NODE_ID and clear follow
            const playerMock = harness.createMockObject(1);
            SpatialSOA.attachToPlayer(child1, playerMock as unknown as mod.Player);
            expect(SpatialSOA.getParent(child1)).toBe(SpatialSOA.ROOT_NODE_ID);
            expect(SpatialSOA.getChildCount(parent)).toBe(1);

            // setFollow with target should auto-detach to ROOT_NODE_ID and clear tracker
            SpatialSOA.attachToPlayer(child2, playerMock as unknown as mod.Player);
            SpatialSOA.setFollow(child2, { target });
            expect(SpatialSOA.getParent(child2)).toBe(SpatialSOA.ROOT_NODE_ID);
            expect(SpatialSOA.getChildCount(parent)).toBe(0);

            // setOrbit should clear tracker and follow
            SpatialSOA.setOrbit(child2, { speedRadPerSec: 1 });
            SpatialSOA.setFollow(child2, { target });
            // Follow should clear orbit
            SpatialSOA.setOrbit(child2, { speedRadPerSec: 2 });
            // Orbit should clear follow
        });

        it('should mutually clear conflicting positional and rotational controllers', () => {
            const node = SpatialSOA.createEmpty()!;
            const target = SpatialSOA.createEmpty()!;

            // 1. Linear kinematics vs Orbit
            SpatialSOA.setKinematics(node, { linearVelocity: { x: 10, y: 0, z: 0 } });
            SpatialSOA.setOrbit(node, { speedRadPerSec: 1 });
            // Kinematics should clear orbit
            SpatialSOA.setKinematics(node, { linearVelocity: { x: 20, y: 0, z: 0 } });

            // 2. Angular kinematics vs LookAt
            SpatialSOA.setKinematics(node, { angularVelocity: { x: 0, y: 1, z: 0 } });
            SpatialSOA.setLookAt(node, { target });
            // Kinematics should clear lookAt
            SpatialSOA.setKinematics(node, { angularVelocity: { x: 0, y: 2, z: 0 } });

            // 3. setParent should clear tracker and follow on the child when attaching away from ROOT_NODE_ID
            const parent = SpatialSOA.createEmpty()!;
            const child = SpatialSOA.createEmpty()!;
            SpatialSOA.setFollow(child, { target });
            expect(SpatialSOA.getParent(child)).toBe(SpatialSOA.ROOT_NODE_ID);
            SpatialSOA.setParent(child, parent);
            expect(SpatialSOA.getParent(child)).toBe(parent);
        });

        it('should clear active tracker and follow controllers when reparenting away from ROOT_NODE_ID', () => {
            const parent = SpatialSOA.createEmpty({ position: { x: 100, y: 0, z: 0 } })!;
            const trackerNode = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const playerMock = harness.createMockObject(1);
            playerMock.position = { x: 200, y: 50, z: 300 };

            SpatialSOA.attachToPlayer(trackerNode, playerMock as unknown as mod.Player);
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldPosition(trackerNode)!.x).toBeCloseTo(200);

            // Reparent away from ROOT_NODE_ID
            SpatialSOA.setParent(trackerNode, parent);
            expect(SpatialSOA.getParent(trackerNode)).toBe(parent);
            SpatialSOA.setLocalPosition(trackerNode, { x: 0, y: 0, z: 0 });

            // Move player and update
            playerMock.position = { x: 999, y: 999, z: 999 };
            SpatialSOA.update(0.016);
            // World pos should not track player anymore; local pos is 0, so world is parent (100)
            expect(SpatialSOA.getWorldPosition(trackerNode)!.x).toBeCloseTo(100);

            // Test follow controller reparenting
            const follower = SpatialSOA.createEmpty()!;
            const target = SpatialSOA.createEmpty({ position: { x: 500, y: 0, z: 0 } })!;
            SpatialSOA.setFollow(follower, { target, smoothSpeed: 10 });
            SpatialSOA.update(0.1);
            expect(SpatialSOA.getWorldPosition(follower)!.x).toBeGreaterThan(0);

            // Reparent follower to parent
            SpatialSOA.setParent(follower, parent);
            SpatialSOA.setLocalPosition(follower, { x: 5, y: 0, z: 0 });
            SpatialSOA.setLocalPosition(target, { x: 999, y: 0, z: 0 });
            SpatialSOA.update(0.1);
            // Follower should not track target; local pos remains 5 and world pos is 105
            expect(SpatialSOA.getLocalPosition(follower)!.x).toBe(5);
            expect(SpatialSOA.getWorldPosition(follower)!.x).toBeCloseTo(105);
        });

        it('should smoothly orbit a child around its parent using OrbitController', () => {
            const kartRoot = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const shell = SpatialSOA.createEmpty({ parentId: kartRoot, position: { x: 5, y: 0, z: 0 } })!;

            // Orbit at 90 deg (PI/2 rad) per second
            SpatialSOA.setOrbit(shell, {
                axis: { x: 0, y: 1, z: 0 },
                speedRadPerSec: Math.PI / 2,
            });

            // 1 second step: should rotate 90 degrees around Y (maps +X to -Z)
            SpatialSOA.update(1.0);

            const shellLocalPos1 = SpatialSOA.getLocalPosition(shell)!;
            expect(shellLocalPos1.x).toBeCloseTo(0, 4);
            expect(shellLocalPos1.y).toBeCloseTo(0, 4);
            expect(shellLocalPos1.z).toBeCloseTo(-5, 4);

            // Another 1 second step: rotates to 180 degrees (maps to -X)
            SpatialSOA.update(1.0);
            const shellLocalPos2 = SpatialSOA.getLocalPosition(shell)!;
            expect(shellLocalPos2.x).toBeCloseTo(-5, 4);
            expect(shellLocalPos2.z).toBeCloseTo(0, 4);
        });

        it('should rotate node to face target using lookAt', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            SpatialSOA.lookAt(node, { x: 0, y: 0, z: 100 }); // Look forward (+Z)

            const euler = SpatialSOA.getWorldRotationEuler(node)!;
            expect(euler.y).toBeCloseTo(0);

            SpatialSOA.lookAt(node, { x: 100, y: 0, z: 0 }); // Look right (+X)
            const eulerRight = SpatialSOA.getWorldRotationEuler(node)!;
            expect(eulerRight.y).toBeCloseTo(Math.PI / 2);
        });

        it('should smoothly follow a moving target using FollowController', () => {
            const target = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const follower = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;

            SpatialSOA.setFollow(follower, {
                target: target,
                offset: { x: 0, y: 2, z: -5 },
                smoothSpeed: 10,
            });

            // Move target
            SpatialSOA.setLocalPosition(target, { x: 100, y: 0, z: 100 });

            // Step update
            SpatialSOA.update(0.1);

            // Follower should have moved towards (100, 2, 95)
            const followPos = SpatialSOA.getWorldPosition(follower)!;
            expect(followPos.x).toBeGreaterThan(0);
            expect(followPos.y).toBeGreaterThan(0);
            expect(followPos.z).toBeGreaterThan(0);
        });

        it('should integrate kinematic velocities accurately over time', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 10, y: 0, z: -5 },
                angularVelocity: { x: 0, y: Math.PI, z: 0 },
            });

            // 0.5s step: position should be (5, 0, -2.5), rotation 90 deg around Y
            SpatialSOA.update(0.5);

            const localPos = SpatialSOA.getLocalPosition(node)!;
            expect(localPos.x).toBeCloseTo(5);
            expect(localPos.y).toBeCloseTo(0);
            expect(localPos.z).toBeCloseTo(-2.5);

            const euler = SpatialSOA.getLocalRotationEuler(node)!;
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should integrate linear and angular accelerations accurately over time', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 0, y: 0, z: 0 },
                linearAcceleration: { x: 4, y: 0, z: 0 }, // v = a * dt = 4 * 1 = 4 m/s; dx = 4 * 1 = 4 m
                angularVelocity: { x: 0, y: 0, z: 0 },
                angularAcceleration: { x: 0, y: Math.PI / 2, z: 0 }, // w = a * dt = pi/2; drot = pi/2
            });

            // 1s step:
            SpatialSOA.update(1.0);

            const localPos = SpatialSOA.getLocalPosition(node)!;
            expect(localPos.x).toBeCloseTo(4);
            const euler = SpatialSOA.getLocalRotationEuler(node)!;
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });
    });

    describe('3. External Tracking & Top-Level Root Attachments', () => {
        it('should track moving player positions and facing rotations in real time', () => {
            const playerMock = harness.createMockObject(1);
            playerMock.position = { x: 200, y: 50, z: 300 };
            playerMock.rotation = { x: 0, y: 0, z: 1 }; // Facing +Z

            const root = SpatialSOA.createEmpty()!;
            SpatialSOA.attachToPlayer(root, playerMock as unknown as mod.Player, {
                offset: { x: 0, y: 2, z: 0 },
                trackRotation: true,
                yawOnly: true,
            });

            const orbiter = SpatialSOA.createEmpty({ parentId: root, position: { x: 3, y: 0, z: 0 } })!;

            // Step update
            SpatialSOA.update(0.016);

            const rootWorldPos1 = SpatialSOA.getWorldPosition(root)!;
            expect(rootWorldPos1.x).toBeCloseTo(200);
            expect(rootWorldPos1.y).toBeCloseTo(52);
            expect(rootWorldPos1.z).toBeCloseTo(300);

            const orbiterWorldPos1 = SpatialSOA.getWorldPosition(orbiter)!;
            expect(orbiterWorldPos1.x).toBeCloseTo(203);
            expect(orbiterWorldPos1.y).toBeCloseTo(52);
            expect(orbiterWorldPos1.z).toBeCloseTo(300);

            // Move player to another coordinate
            playerMock.position = { x: 500, y: 10, z: -100 };
            SpatialSOA.update(0.016);

            const rootWorldPos2 = SpatialSOA.getWorldPosition(root)!;
            expect(rootWorldPos2.x).toBeCloseTo(500);
            const orbiterWorldPos2 = SpatialSOA.getWorldPosition(orbiter)!;
            expect(orbiterWorldPos2.x).toBeCloseTo(503);
        });

        it('should track native objects using attachToObject with rotation offsets', () => {
            const propMock = harness.createMockObject(2);
            propMock.position = { x: 10, y: 0, z: 20 };
            propMock.rotation = { x: 0, y: Math.PI / 2, z: 0 }; // 90 deg yaw

            const root = SpatialSOA.createEmpty()!;
            SpatialSOA.attachToObject(root, propMock as unknown as Exclude<mod.Object, mod.Player | mod.Vehicle>, {
                offset: { x: 0, y: 0, z: 5 }, // 5m forward in object's local frame
                trackRotation: true,
            });

            SpatialSOA.update(0.016);

            // After 90 deg yaw rotation, (0, 0, 5) becomes (5, 0, 0)
            const rootWorldPos = SpatialSOA.getWorldPosition(root)!;
            expect(rootWorldPos.x).toBeCloseTo(15);
            expect(rootWorldPos.y).toBeCloseTo(0);
            expect(rootWorldPos.z).toBeCloseTo(20);
        });

        it('should support Quaternion or Euler Vector3 in NodeOptions.rotation', () => {
            const nodeQuat = SpatialSOA.createEmpty({
                rotation: { w: 0.7071068, x: 0, y: 0.7071068, z: 0 },
            })!;
            expect(SpatialSOA.getLocalRotationEuler(nodeQuat)!.y).toBeCloseTo(Math.PI / 2);

            const nodeEuler = SpatialSOA.createEmpty({
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
            })!;
            expect(SpatialSOA.getLocalRotationEuler(nodeEuler)!.y).toBeCloseTo(Math.PI / 2);
        });

        it('should track targets using LookAt controller with target node, vector, or player', () => {
            const watcher = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const targetNode = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 50 } })!;

            SpatialSOA.setLookAt(watcher, { target: targetNode });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher)!.y).toBeCloseTo(0);

            // Move target node to +X
            SpatialSOA.setLocalPosition(targetNode, { x: 50, y: 0, z: 0 });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher)!.y).toBeCloseTo(Math.PI / 2);

            // Target vector
            SpatialSOA.setLookAt(watcher, { target: { x: -50, y: 0, z: 0 } });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher)!.y).toBeCloseTo(-Math.PI / 2);
        });

        it('should safely execute forEachChild callbacks via CallbackHandler', () => {
            const root = SpatialSOA.createEmpty()!;
            SpatialSOA.createEmpty({ parentId: root });
            SpatialSOA.createEmpty({ parentId: root });

            const visited: number[] = [];
            SpatialSOA.forEachChild(root, (_child, idx) => {
                visited.push(idx);
                if (idx === 0) throw new Error('Test error in callback');
            });

            // Even though idx 0 threw, CallbackHandler catches it and idx 1 is still visited
            expect(visited).toEqual([0, 1]);
        });

        it('should manually update transforms via ensureWorldTransformUpdated and computeRenderPosition', () => {
            const root = SpatialSOA.createEmpty({ position: { x: 10, y: 20, z: 30 } })!;
            const child = SpatialSOA.createEmpty({
                parentId: root,
                position: { x: 0, y: 5, z: 0 },
                pivotOffset: { x: 0, y: 1, z: 0 },
            })!;

            SpatialSOA.ensureWorldTransformUpdated(child);
            const renderPos = SpatialSOA.computeRenderPosition(child)!;
            expect(renderPos.x).toBe(10);
            expect(renderPos.y).toBe(26);
            expect(renderPos.z).toBe(30);
        });

        it('should automatically compute delta time from server uptime when update() is called without arguments', async () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 100, y: 0, z: 0 },
            });

            // First call initializes lastUpdateTime and returns
            SpatialSOA.update();
            expect(SpatialSOA.getLocalPosition(node)!.x).toBe(0);

            // Wait 25ms (> 10ms threshold)
            await new Promise((resolve) => setTimeout(resolve, 25));

            SpatialSOA.update();
            expect(SpatialSOA.getLocalPosition(node)!.x).toBeGreaterThan(0);
        });
    });
});
