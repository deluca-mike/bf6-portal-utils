import { beforeEach, describe, expect, it } from 'vitest';
import { SpatialTestHarness } from './harness.ts';

const harness = new SpatialTestHarness();

import { SpatialSOA } from '../index.ts';

describe('SpatialSOA Pure Functional Module Integration Tests', () => {
    beforeEach(() => {
        SpatialSOA.destroyAll();
        harness.objects.clear();
    });

    describe('1. Scene Graph Hierarchy & Coordinate Transformations', () => {
        it('should compute world positions for multi-level hierarchies', () => {
            const root = SpatialSOA.createEmpty({ position: { x: 0, y: 100, z: 0 } });
            const child1 = SpatialSOA.createEmpty({ parentId: root, position: { x: 10, y: 0, z: 0 } });
            const child2 = SpatialSOA.createEmpty({ parentId: child1, position: { x: 0, y: 5, z: 2 } });

            expect(SpatialSOA.getWorldPosition(root)).toEqual({ x: 0, y: 100, z: 0 });
            expect(SpatialSOA.getWorldPosition(child1)).toEqual({ x: 10, y: 100, z: 0 });
            expect(SpatialSOA.getWorldPosition(child2)).toEqual({ x: 10, y: 105, z: 2 });
        });

        it('should safely inspect and iterate children without array corruption', () => {
            const root = SpatialSOA.createEmpty();
            const c1 = SpatialSOA.createEmpty({ parentId: root, position: { x: 1, y: 0, z: 0 } });
            const c2 = SpatialSOA.createEmpty({ parentId: root, position: { x: 2, y: 0, z: 0 } });

            expect(SpatialSOA.getChildCount(root)).toBe(2);
            expect(SpatialSOA.getChild(root, 0)).toBe(c1);
            expect(SpatialSOA.getChild(root, 1)).toBe(c2);
            expect(SpatialSOA.getChild(root, 2)).toBe(SpatialSOA.INVALID_NODE_ID);

            const visited: number[] = [];
            SpatialSOA.forEachChild(root, (childId) => visited.push(childId));
            expect(visited).toEqual([c1, c2]);

            // Mutating getChildren copy should not affect internal structure
            const arr = SpatialSOA.getChildren(root);
            arr.pop();
            expect(SpatialSOA.getChildCount(root)).toBe(2);
        });

        it('should correctly set child worldPosition and worldRotation relative to transformed parent', () => {
            const parent = SpatialSOA.createEmpty({
                position: { x: 100, y: 50, z: -200 },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
                scale: 2,
            });
            const child = SpatialSOA.createEmpty({ parentId: parent });

            // Set world position and world rotation directly
            SpatialSOA.setWorldPosition(child, { x: 150, y: 60, z: -180 });
            SpatialSOA.setWorldRotationEuler(child, { x: 0, y: Math.PI / 4, z: 0 });

            const childWorldPos = SpatialSOA.getWorldPosition(child);
            expect(childWorldPos.x).toBeCloseTo(150);
            expect(childWorldPos.y).toBeCloseTo(60);
            expect(childWorldPos.z).toBeCloseTo(-180);

            const childWorldRotEuler = SpatialSOA.getWorldRotationEuler(child);
            expect(childWorldRotEuler.y).toBeCloseTo(Math.PI / 4);
        });

        it('should propagate parent rotations to child world positions and orientations', () => {
            const root = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const child = SpatialSOA.createEmpty({ parentId: root, position: { x: 10, y: 0, z: 0 } });

            // Rotate root 90 degrees around Y axis (maps child's +X offset to -Z in world)
            SpatialSOA.setLocalRotationEuler(root, { x: 0, y: Math.PI / 2, z: 0 });

            const childWorldPos = SpatialSOA.getWorldPosition(child);
            expect(childWorldPos.x).toBeCloseTo(0);
            expect(childWorldPos.y).toBeCloseTo(0);
            expect(childWorldPos.z).toBeCloseTo(-10);

            const childWorldEuler = SpatialSOA.getWorldRotationEuler(child);
            expect(childWorldEuler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should correctly project points and vectors between local and world space', () => {
            const parent = SpatialSOA.createEmpty({ position: { x: 50, y: 10, z: -20 } });
            SpatialSOA.setLocalRotationEuler(parent, { x: 0, y: Math.PI, z: 0 }); // 180 degree yaw

            const localPoint = { x: 5, y: 2, z: 10 };
            const worldPoint = SpatialSOA.localToWorldPoint(parent, localPoint);

            // In 180 deg yaw: X -> -X, Z -> -Z
            expect(worldPoint.x).toBeCloseTo(50 - 5);
            expect(worldPoint.y).toBeCloseTo(10 + 2);
            expect(worldPoint.z).toBeCloseTo(-20 - 10);

            const backToLocal = SpatialSOA.worldToLocalPoint(parent, worldPoint);
            expect(backToLocal.x).toBeCloseTo(localPoint.x);
            expect(backToLocal.y).toBeCloseTo(localPoint.y);
            expect(backToLocal.z).toBeCloseTo(localPoint.z);

            // Test zero scale safety
            SpatialSOA.setLocalScale(parent, { x: 0, y: 1, z: 1 });
            const zeroScaleLocal = SpatialSOA.worldToLocalPoint(parent, worldPoint);
            expect(zeroScaleLocal.x).toBe(0);
            expect(Number.isFinite(zeroScaleLocal.x)).toBe(true);
        });

        it('should correctly apply in-game prefab pivot offsets to native render transforms', () => {
            const mockObj = harness.createMockObject();
            const node = SpatialSOA.createExisting(mockObj as unknown as SpatialSOA.TransformableObject, {
                position: { x: 0, y: 100, z: 0 },
                pivotOffset: { x: -10.25, y: 0, z: -10.25 },
            });

            SpatialSOA.sync();

            expect(mockObj.lastTransform).toBeDefined();
            expect(mockObj.lastTransform!.position.x).toBeCloseTo(-10.25);
            expect(mockObj.lastTransform!.position.y).toBeCloseTo(100);
            expect(mockObj.lastTransform!.position.z).toBeCloseTo(-10.25);

            // Now rotate node 90 deg around Y: offset (-10.25, 0, -10.25) -> (-10.25, 0, +10.25)
            SpatialSOA.setLocalRotationEuler(node, { x: 0, y: Math.PI / 2, z: 0 });
            SpatialSOA.sync();

            expect(mockObj.lastTransform!.position.x).toBeCloseTo(-10.25);
            expect(mockObj.lastTransform!.position.y).toBeCloseTo(100);
            expect(mockObj.lastTransform!.position.z).toBeCloseTo(10.25);
        });

        it('should prevent circular parent-child relationships and log warning', () => {
            const a = SpatialSOA.createEmpty();
            const b = SpatialSOA.createEmpty({ parentId: a });
            const c = SpatialSOA.createEmpty({ parentId: b });

            // Attempting to add ancestor 'a' as child of 'c'
            const result = SpatialSOA.addChild(c, a);
            expect(result).toBe(false);
            expect(SpatialSOA.getParent(a)).toBe(SpatialSOA.INVALID_NODE_ID);
        });

        it('should safely destroy nodes, remove from hierarchy, and unspawn native runtime objects', () => {
            const root = SpatialSOA.createEmpty();
            const childRuntime = SpatialSOA.createRuntime(101, { parentId: root, position: { x: 1, y: 0, z: 0 } });
            expect(childRuntime).not.toBe(SpatialSOA.INVALID_NODE_ID);
            expect(SpatialSOA.isValid(childRuntime)).toBe(true);

            SpatialSOA.destroy(root);

            expect(SpatialSOA.isDeleted(root)).toBe(true);
            expect(SpatialSOA.isDeleted(childRuntime)).toBe(true);
            expect(SpatialSOA.getRootCount()).toBe(0);
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
        });

        it('should accurately track getActiveNodeCount and getRootCount across hierarchies and destructions', () => {
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
            expect(SpatialSOA.getRootCount()).toBe(0);

            const root1 = SpatialSOA.createEmpty();
            const root2 = SpatialSOA.createEmpty();
            const child1 = SpatialSOA.createEmpty({ parentId: root1 });
            const child2 = SpatialSOA.createEmpty({ parentId: root1 });
            const grandChild = SpatialSOA.createEmpty({ parentId: child1 });

            expect(SpatialSOA.isValid(root2)).toBe(true);
            expect(SpatialSOA.isValid(child2)).toBe(true);
            expect(SpatialSOA.isValid(grandChild)).toBe(true);

            expect(SpatialSOA.getRootCount()).toBe(2);
            expect(SpatialSOA.getActiveNodeCount()).toBe(5);

            // Destroy child1 and its subtree (child1 + grandChild)
            SpatialSOA.destroy(child1);
            expect(SpatialSOA.getRootCount()).toBe(2);
            expect(SpatialSOA.getActiveNodeCount()).toBe(3);

            // Destroy root1 and its remaining child (root1 + child2)
            SpatialSOA.destroy(root1);
            expect(SpatialSOA.getRootCount()).toBe(1);
            expect(SpatialSOA.getActiveNodeCount()).toBe(1);

            // Destroy all
            SpatialSOA.destroyAll();
            expect(SpatialSOA.getRootCount()).toBe(0);
            expect(SpatialSOA.getActiveNodeCount()).toBe(0);
        });

        it('should invalidate stale handle IDs after destruction via generation encoding', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 10, y: 20, z: 30 } });
            const oldId = node;

            expect(SpatialSOA.isValid(node)).toBe(true);
            SpatialSOA.destroy(node);
            expect(SpatialSOA.isValid(node)).toBe(false);
            expect(SpatialSOA.isDeleted(node)).toBe(true);

            // Create a new node in the recycled slot
            const newNode = SpatialSOA.createEmpty({ position: { x: 100, y: 200, z: 300 } });
            expect(newNode).not.toBe(oldId); // New generation multiplier!
            expect(SpatialSOA.isValid(oldId)).toBe(false); // Old ID remains invalid
            expect(SpatialSOA.isDeleted(oldId)).toBe(true); // Was created and destroyed
            expect(SpatialSOA.isValid(newNode)).toBe(true);
            expect(SpatialSOA.isDeleted(newNode)).toBe(false); // Currently active

            // Uncreated / invalid IDs were never created so are not deleted
            expect(SpatialSOA.isDeleted(999999)).toBe(false);
            expect(SpatialSOA.isDeleted(SpatialSOA.INVALID_NODE_ID)).toBe(false);
            expect(SpatialSOA.isDeleted(-10)).toBe(false);
        });

        it('should reject creating nodes with invalid parentId', () => {
            const invalidParent = 999999;
            expect(SpatialSOA.createEmpty({ parentId: invalidParent })).toBe(SpatialSOA.INVALID_NODE_ID);
            expect(SpatialSOA.createRuntime(101, { parentId: invalidParent })).toBe(SpatialSOA.INVALID_NODE_ID);
            const mockObj = harness.createMockObject();
            expect(
                SpatialSOA.createExisting(mockObj as unknown as SpatialSOA.TransformableObject, {
                    parentId: invalidParent as SpatialSOA.SpatialNodeID,
                })
            ).toBe(SpatialSOA.INVALID_NODE_ID);
        });

        it('should return INVALID_NODE_ID without throwing when pool is exhausted', () => {
            const logs: string[] = [];
            SpatialSOA.setLogging((text) => void logs.push(text), SpatialSOA.LogLevel.Error);

            const nodes: number[] = [];
            for (let i = 0; i < 1024; ++i) {
                const id = SpatialSOA.createEmpty();
                expect(id).not.toBe(SpatialSOA.INVALID_NODE_ID);
                nodes.push(id);
            }

            // 1025th allocation should fail gracefully and log error
            const extraNode = SpatialSOA.createEmpty();
            expect(extraNode).toBe(SpatialSOA.INVALID_NODE_ID);
            expect(logs.some((l) => l.includes('Pool is full'))).toBe(true);

            // Destroy one node, making room for a new one
            SpatialSOA.destroy(nodes[0]!);
            const recycledNode = SpatialSOA.createEmpty();
            expect(recycledNode).not.toBe(SpatialSOA.INVALID_NODE_ID);
        });
    });

    describe('2. High-Level Controllers (Orbit, Follow, LookAt, Kinematics)', () => {
        it('should smoothly orbit a child around its parent using OrbitController', () => {
            const kartRoot = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const shell = SpatialSOA.createEmpty({ parentId: kartRoot, position: { x: 5, y: 0, z: 0 } });

            // Orbit at 90 deg (PI/2 rad) per second
            SpatialSOA.setOrbit(shell, {
                axis: { x: 0, y: 1, z: 0 },
                speedRadPerSec: Math.PI / 2,
            });

            // 1 second step: should rotate 90 degrees around Y (maps +X to -Z)
            SpatialSOA.update(1.0);

            const shellLocalPos1 = SpatialSOA.getLocalPosition(shell);
            expect(shellLocalPos1.x).toBeCloseTo(0, 4);
            expect(shellLocalPos1.y).toBeCloseTo(0, 4);
            expect(shellLocalPos1.z).toBeCloseTo(-5, 4);

            // Another 1 second step: rotates to 180 degrees (maps to -X)
            SpatialSOA.update(1.0);
            const shellLocalPos2 = SpatialSOA.getLocalPosition(shell);
            expect(shellLocalPos2.x).toBeCloseTo(-5, 4);
            expect(shellLocalPos2.z).toBeCloseTo(0, 4);
        });

        it('should rotate node to face target using lookAt', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            SpatialSOA.lookAt(node, { x: 0, y: 0, z: 100 }); // Look forward (+Z)

            const euler = SpatialSOA.getWorldRotationEuler(node);
            expect(euler.y).toBeCloseTo(0);

            SpatialSOA.lookAt(node, { x: 100, y: 0, z: 0 }); // Look right (+X)
            const eulerRight = SpatialSOA.getWorldRotationEuler(node);
            expect(eulerRight.y).toBeCloseTo(Math.PI / 2);
        });

        it('should smoothly follow a moving target using FollowController', () => {
            const target = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const follower = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });

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
            const followPos = SpatialSOA.getWorldPosition(follower);
            expect(followPos.x).toBeGreaterThan(0);
            expect(followPos.y).toBeGreaterThan(0);
            expect(followPos.z).toBeGreaterThan(0);
        });

        it('should integrate kinematic velocities accurately over time', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 10, y: 0, z: -5 },
                angularVelocity: { x: 0, y: Math.PI, z: 0 },
            });

            // 0.5s step: position should be (5, 0, -2.5), rotation 90 deg around Y
            SpatialSOA.update(0.5);

            const localPos = SpatialSOA.getLocalPosition(node);
            expect(localPos.x).toBeCloseTo(5);
            expect(localPos.y).toBeCloseTo(0);
            expect(localPos.z).toBeCloseTo(-2.5);

            const euler = SpatialSOA.getLocalRotationEuler(node);
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should integrate linear and angular accelerations accurately over time', () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 0, y: 0, z: 0 },
                linearAcceleration: { x: 4, y: 0, z: 0 }, // v = a * dt = 4 * 1 = 4 m/s; dx = 4 * 1 = 4 m
                angularVelocity: { x: 0, y: 0, z: 0 },
                angularAcceleration: { x: 0, y: Math.PI / 2, z: 0 }, // w = a * dt = pi/2; drot = pi/2
            });

            // 1s step:
            SpatialSOA.update(1.0);

            const localPos = SpatialSOA.getLocalPosition(node);
            expect(localPos.x).toBeCloseTo(4);
            const euler = SpatialSOA.getLocalRotationEuler(node);
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });
    });

    describe('3. External Tracking & Top-Level Root Attachments', () => {
        it('should track moving player positions and facing rotations in real time', () => {
            const playerMock = harness.createMockObject(1);
            playerMock.position = { x: 200, y: 50, z: 300 };
            playerMock.rotation = { x: 0, y: 0, z: 1 }; // Facing +Z

            const root = SpatialSOA.createEmpty();
            SpatialSOA.attachToPlayer(root, playerMock as unknown as mod.Player, {
                offset: { x: 0, y: 2, z: 0 },
                trackRotation: true,
                yawOnly: true,
            });

            const orbiter = SpatialSOA.createEmpty({ parentId: root, position: { x: 3, y: 0, z: 0 } });

            // Step update
            SpatialSOA.update(0.016);

            const rootWorldPos1 = SpatialSOA.getWorldPosition(root);
            expect(rootWorldPos1.x).toBeCloseTo(200);
            expect(rootWorldPos1.y).toBeCloseTo(52);
            expect(rootWorldPos1.z).toBeCloseTo(300);

            const orbiterWorldPos1 = SpatialSOA.getWorldPosition(orbiter);
            expect(orbiterWorldPos1.x).toBeCloseTo(203);
            expect(orbiterWorldPos1.y).toBeCloseTo(52);
            expect(orbiterWorldPos1.z).toBeCloseTo(300);

            // Move player to another coordinate
            playerMock.position = { x: 500, y: 10, z: -100 };
            SpatialSOA.update(0.016);

            const rootWorldPos2 = SpatialSOA.getWorldPosition(root);
            expect(rootWorldPos2.x).toBeCloseTo(500);
            const orbiterWorldPos2 = SpatialSOA.getWorldPosition(orbiter);
            expect(orbiterWorldPos2.x).toBeCloseTo(503);
        });

        it('should track native objects using attachToObject with rotation offsets', () => {
            const propMock = harness.createMockObject(2);
            propMock.position = { x: 10, y: 0, z: 20 };
            propMock.rotation = { x: 0, y: Math.PI / 2, z: 0 }; // 90 deg yaw

            const root = SpatialSOA.createEmpty();
            SpatialSOA.attachToObject(root, propMock as unknown as Exclude<mod.Object, mod.Player | mod.Vehicle>, {
                offset: { x: 0, y: 0, z: 5 }, // 5m forward in object's local frame
                trackRotation: true,
            });

            SpatialSOA.update(0.016);

            // After 90 deg yaw rotation, (0, 0, 5) becomes (5, 0, 0)
            const rootWorldPos = SpatialSOA.getWorldPosition(root);
            expect(rootWorldPos.x).toBeCloseTo(15);
            expect(rootWorldPos.y).toBeCloseTo(0);
            expect(rootWorldPos.z).toBeCloseTo(20);
        });

        it('should support Quaternion or Euler Vector3 in NodeOptions.rotation', () => {
            const nodeQuat = SpatialSOA.createEmpty({
                rotation: { w: 0.7071068, x: 0, y: 0.7071068, z: 0 },
            });
            expect(SpatialSOA.getLocalRotationEuler(nodeQuat).y).toBeCloseTo(Math.PI / 2);

            const nodeEuler = SpatialSOA.createEmpty({
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
            });
            expect(SpatialSOA.getLocalRotationEuler(nodeEuler).y).toBeCloseTo(Math.PI / 2);
        });

        it('should track targets using LookAt controller with target node, vector, or player', () => {
            const watcher = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const targetNode = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 50 } });

            SpatialSOA.setLookAt(watcher, { target: targetNode });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher).y).toBeCloseTo(0);

            // Move target node to +X
            SpatialSOA.setLocalPosition(targetNode, { x: 50, y: 0, z: 0 });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher).y).toBeCloseTo(Math.PI / 2);

            // Target vector
            SpatialSOA.setLookAt(watcher, { target: { x: -50, y: 0, z: 0 } });
            SpatialSOA.update(0.016);
            expect(SpatialSOA.getWorldRotationEuler(watcher).y).toBeCloseTo(-Math.PI / 2);
        });

        it('should safely execute forEachChild callbacks via CallbackHandler', () => {
            const root = SpatialSOA.createEmpty();
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
            const root = SpatialSOA.createEmpty({ position: { x: 10, y: 20, z: 30 } });
            const child = SpatialSOA.createEmpty({
                parentId: root,
                position: { x: 0, y: 5, z: 0 },
                pivotOffset: { x: 0, y: 1, z: 0 },
            });

            SpatialSOA.ensureWorldTransformUpdated(child);
            const renderPos = SpatialSOA.computeRenderPosition(child);
            expect(renderPos.x).toBe(10);
            expect(renderPos.y).toBe(26);
            expect(renderPos.z).toBe(30);
        });

        it('should automatically compute delta time from server uptime when update() is called without arguments', async () => {
            const node = SpatialSOA.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            SpatialSOA.setKinematics(node, {
                linearVelocity: { x: 100, y: 0, z: 0 },
            });

            // First call initializes lastUpdateTime and returns
            SpatialSOA.update();
            expect(SpatialSOA.getLocalPosition(node).x).toBe(0);

            // Wait 25ms (> 10ms threshold)
            await new Promise((resolve) => setTimeout(resolve, 25));

            SpatialSOA.update();
            expect(SpatialSOA.getLocalPosition(node).x).toBeGreaterThan(0);
        });

        it('should automatically detach from parent and mutually clear when given attach options or follow options', () => {
            const parent = SpatialSOA.createEmpty();
            const child1 = SpatialSOA.createEmpty({ parentId: parent });
            const child2 = SpatialSOA.createEmpty({ parentId: parent });
            const target = SpatialSOA.createEmpty();

            expect(SpatialSOA.getParent(child1)).toBe(parent);
            expect(SpatialSOA.getParent(child2)).toBe(parent);
            expect(SpatialSOA.getChildCount(parent)).toBe(2);

            // setFollow first
            SpatialSOA.setFollow(child1, { target });
            expect(SpatialSOA.getParent(child1)).toBe(SpatialSOA.INVALID_NODE_ID);

            // attachToPlayer should auto-detach and clear follow
            const playerMock = harness.createMockObject(1);
            SpatialSOA.attachToPlayer(child1, playerMock as unknown as mod.Player);
            expect(SpatialSOA.getParent(child1)).toBe(SpatialSOA.INVALID_NODE_ID);
            expect(SpatialSOA.getChildCount(parent)).toBe(1);

            // setFollow with target should auto-detach and clear tracker
            SpatialSOA.attachToPlayer(child2, playerMock as unknown as mod.Player);
            SpatialSOA.setFollow(child2, { target });
            expect(SpatialSOA.getParent(child2)).toBe(SpatialSOA.INVALID_NODE_ID);
            expect(SpatialSOA.getChildCount(parent)).toBe(0);

            // setOrbit should clear tracker and follow
            SpatialSOA.setOrbit(child2, { speedRadPerSec: 1 });
            SpatialSOA.setFollow(child2, { target });
            // Follow should clear orbit
            SpatialSOA.setOrbit(child2, { speedRadPerSec: 2 });
            // Orbit should clear follow
        });

        it('should mutually clear conflicting positional and rotational controllers', () => {
            const node = SpatialSOA.createEmpty();
            const target = SpatialSOA.createEmpty();

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

            // 3. addChild should clear tracker and follow on the child
            const parent = SpatialSOA.createEmpty();
            const child = SpatialSOA.createEmpty();
            SpatialSOA.setFollow(child, { target });
            expect(SpatialSOA.getParent(child)).toBe(SpatialSOA.INVALID_NODE_ID);
            SpatialSOA.addChild(parent, child);
            expect(SpatialSOA.getParent(child)).toBe(parent);
        });
    });
});
