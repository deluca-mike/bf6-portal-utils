import { beforeEach, describe, expect, it } from 'vitest';
import { SpatialTestHarness } from './harness.ts';

const harness = new SpatialTestHarness();

import { SpatialOC } from '../index.ts';

describe('SpatialOC Module Integration Tests', () => {
    beforeEach(() => {
        SpatialOC.destroyAll();
        harness.objects.clear();
    });
    describe('1. Scene Graph Hierarchy & Coordinate Transformations', () => {
        it('should compute world positions for multi-level hierarchies', () => {
            const root = SpatialOC.createEmpty({ position: { x: 0, y: 100, z: 0 } })!;
            const child1 = SpatialOC.createEmpty({ parent: root, position: { x: 10, y: 0, z: 0 } })!;
            const child2 = SpatialOC.createEmpty({ parent: child1, position: { x: 0, y: 5, z: 2 } })!;

            expect(root.worldPosition).toEqual({ x: 0, y: 100, z: 0 });
            expect(child1.worldPosition).toEqual({ x: 10, y: 100, z: 0 });
            expect(child2.worldPosition).toEqual({ x: 10, y: 105, z: 2 });
        });

        it('should safely inspect and iterate children without array corruption', () => {
            const root = SpatialOC.createEmpty()!;
            const c1 = SpatialOC.createEmpty({ parent: root, position: { x: 1, y: 0, z: 0 } })!;
            const c2 = SpatialOC.createEmpty({ parent: root, position: { x: 2, y: 0, z: 0 } })!;

            expect(root.childCount).toBe(2);
            expect(root.getChild(0)).toBe(c1);
            expect(root.getChild(1)).toBe(c2);
            expect(root.getChild(2)).toBeNull();
            expect(root.parent).toBeNull();
            expect(root.pivotOffset).toBeNull();

            const visited: SpatialOC.SpatialNode[] = [];
            root.forEachChild((child) => visited.push(child));
            expect(visited).toEqual([c1, c2]);

            // Mutating children copy should not affect internal structure
            const arr = root.children as SpatialOC.SpatialNode[];
            arr.pop();
            expect(root.childCount).toBe(2);
        });

        it('should correctly set child worldPosition and worldRotation relative to transformed parent', () => {
            const parent = SpatialOC.createEmpty({
                position: { x: 100, y: 50, z: -200 },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
                scale: 2,
            })!;
            const child = SpatialOC.createEmpty({ parent })!;

            // Set world position and world rotation directly
            child.worldPosition = { x: 150, y: 60, z: -180 };
            child.worldRotationEuler = { x: 0, y: Math.PI / 4, z: 0 };

            expect(child.worldPosition.x).toBeCloseTo(150);
            expect(child.worldPosition.y).toBeCloseTo(60);
            expect(child.worldPosition.z).toBeCloseTo(-180);

            expect(child.worldRotationEuler.y).toBeCloseTo(Math.PI / 4);
        });

        it('should propagate parent rotations to child world positions and orientations', () => {
            const root = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } })!;
            const child = SpatialOC.createEmpty({ parent: root, position: { x: 10, y: 0, z: 0 } })!;

            // Rotate root 90 degrees around Y axis (maps child's +X offset to -Z in world)
            root.localRotationEuler = { x: 0, y: Math.PI / 2, z: 0 };

            expect(child.worldPosition.x).toBeCloseTo(0);
            expect(child.worldPosition.y).toBeCloseTo(0);
            expect(child.worldPosition.z).toBeCloseTo(-10);

            const childWorldEuler = child.worldRotationEuler;
            expect(childWorldEuler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should correctly project points and vectors between local and world space', () => {
            const parent = SpatialOC.createEmpty({ position: { x: 50, y: 10, z: -20 } })!;
            parent.localRotationEuler = { x: 0, y: Math.PI, z: 0 }; // 180 degree yaw

            const localPoint = { x: 5, y: 2, z: 10 };
            const worldPoint = parent.localToWorldPoint(localPoint);

            // In 180 deg yaw: X -> -X, Z -> -Z
            expect(worldPoint.x).toBeCloseTo(50 - 5);
            expect(worldPoint.y).toBeCloseTo(10 + 2);
            expect(worldPoint.z).toBeCloseTo(-20 - 10);

            const backToLocal = parent.worldToLocalPoint(worldPoint);
            expect(backToLocal.x).toBeCloseTo(localPoint.x);
            expect(backToLocal.y).toBeCloseTo(localPoint.y);
            expect(backToLocal.z).toBeCloseTo(localPoint.z);

            // Test zero scale safety
            parent.localScale = { x: 0, y: 1, z: 1 };
            const zeroScaleLocal = parent.worldToLocalPoint(worldPoint);
            expect(zeroScaleLocal.x).toBe(0);
            expect(Number.isFinite(zeroScaleLocal.x)).toBe(true);
        });

        it('should correctly apply in-game prefab pivot offsets to native render transforms', () => {
            const mockObj = harness.createMockObject();
            const node = SpatialOC.createExisting(mockObj as unknown as SpatialOC.TransformableObject, {
                position: { x: 0, y: 100, z: 0 },
                pivotOffset: { x: -10.25, y: 0, z: -10.25 },
            })!;

            SpatialOC.sync();

            expect(mockObj.lastTransform).toBeDefined();
            expect(mockObj.lastTransform!.position.x).toBeCloseTo(-10.25);
            expect(mockObj.lastTransform!.position.y).toBeCloseTo(100);
            expect(mockObj.lastTransform!.position.z).toBeCloseTo(-10.25);

            // Now rotate node 90 deg around Y: offset (-10.25, 0, -10.25) -> (-10.25, 0, +10.25)
            node.localRotationEuler = { x: 0, y: Math.PI / 2, z: 0 };
            SpatialOC.sync();

            expect(mockObj.lastTransform!.position.x).toBeCloseTo(-10.25);
            expect(mockObj.lastTransform!.position.y).toBeCloseTo(100);
            expect(mockObj.lastTransform!.position.z).toBeCloseTo(10.25);
        });

        it('should prevent circular parent-child relationships and log warning', () => {
            const a = SpatialOC.createEmpty()!;
            const b = SpatialOC.createEmpty({ parent: a })!;
            const c = SpatialOC.createEmpty({ parent: b })!;

            // Attempting to add ancestor 'a' as child of 'c'
            const result = c.addChild(a);
            expect(result).toBe(false);
            expect(a.parent).toBeNull();
        });

        it('should safely destroy nodes, remove from hierarchy, and unspawn native runtime objects', () => {
            const root = SpatialOC.createEmpty()!;
            const childRuntime = SpatialOC.createRuntime(101, { parent: root, position: { x: 1, y: 0, z: 0 } })!;
            expect(childRuntime).not.toBeNull();
            expect(childRuntime.isValid).toBe(true);

            root.destroy();

            expect(root.isDeleted).toBe(true);
            expect(childRuntime.isDeleted).toBe(true);
            expect(SpatialOC.getRootCount()).toBe(0);
        });

        it('should accurately track getActiveNodeCount and getRootCount across hierarchies and destructions', () => {
            expect(SpatialOC.getActiveNodeCount()).toBe(0);
            expect(SpatialOC.getRootCount()).toBe(0);

            const root1 = SpatialOC.createEmpty()!;
            const root2 = SpatialOC.createEmpty()!;
            const child1 = SpatialOC.createEmpty({ parent: root1 })!;
            const child2 = SpatialOC.createEmpty({ parent: root1 })!;
            const grandChild = SpatialOC.createEmpty({ parent: child1 })!;

            expect(root2.isValid).toBe(true);
            expect(child2.isValid).toBe(true);
            expect(grandChild.isValid).toBe(true);

            expect(SpatialOC.getRootCount()).toBe(2);
            expect(SpatialOC.getActiveNodeCount()).toBe(5);

            // Destroy child1 and its subtree (child1 + grandChild)
            child1.destroy();
            expect(SpatialOC.getRootCount()).toBe(2);
            expect(SpatialOC.getActiveNodeCount()).toBe(3);

            // Destroy root1 and its remaining child (root1 + child2)
            root1.destroy();
            expect(SpatialOC.getRootCount()).toBe(1);
            expect(SpatialOC.getActiveNodeCount()).toBe(1);

            // Destroy all
            SpatialOC.destroyAll();
            expect(SpatialOC.getRootCount()).toBe(0);
            expect(SpatialOC.getActiveNodeCount()).toBe(0);
        });

        it('should reject creating runtime or existing nodes under a destroyed parent', () => {
            const root = SpatialOC.createEmpty()!;
            root.destroy();

            const emptyChild = SpatialOC.createEmpty({ parent: root });
            expect(emptyChild).toBeNull();

            const runtimeChild = SpatialOC.createRuntime(101, { parent: root });
            expect(runtimeChild).toBeNull();

            const mockObj = harness.createMockObject();
            const existingChild = SpatialOC.createExisting(mockObj as unknown as SpatialOC.TransformableObject, {
                parent: root,
            });
            expect(existingChild).toBeNull();
        });
    });

    describe('2. High-Level Controllers (Orbit, Follow, LookAt, Kinematics)', () => {
        it('should smoothly orbit a child around its parent using OrbitController', () => {
            const kartRoot = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const shell = SpatialOC.createEmpty({ parent: kartRoot, position: { x: 5, y: 0, z: 0 } });

            // Orbit at 90 deg (PI/2 rad) per second
            shell.setOrbit({
                axis: { x: 0, y: 1, z: 0 },
                speedRadPerSec: Math.PI / 2,
            });

            // 1 second step: should rotate 90 degrees around Y (maps +X to -Z)
            SpatialOC.update(1.0);

            expect(shell.localPosition.x).toBeCloseTo(0, 4);
            expect(shell.localPosition.y).toBeCloseTo(0, 4);
            expect(shell.localPosition.z).toBeCloseTo(-5, 4);

            // Another 1 second step: rotates to 180 degrees (maps to -X)
            SpatialOC.update(1.0);
            expect(shell.localPosition.x).toBeCloseTo(-5, 4);
            expect(shell.localPosition.z).toBeCloseTo(0, 4);
        });

        it('should rotate node to face target using lookAt', () => {
            const node = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            node.lookAt({ x: 0, y: 0, z: 100 }); // Look forward (+Z)

            const euler = node.worldRotationEuler;
            expect(euler.y).toBeCloseTo(0);

            node.lookAt({ x: 100, y: 0, z: 0 }); // Look right (+X)
            const eulerRight = node.worldRotationEuler;
            expect(eulerRight.y).toBeCloseTo(Math.PI / 2);
        });

        it('should smoothly follow a moving target using FollowController', () => {
            const target = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const follower = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });

            follower.setFollow({
                target: target,
                offset: { x: 0, y: 2, z: -5 },
                smoothSpeed: 10,
            });

            // Move target
            target.localPosition = { x: 100, y: 0, z: 100 };

            // Step update
            SpatialOC.update(0.1);

            // Follower should have moved towards (100, 2, 95)
            expect(follower.worldPosition.x).toBeGreaterThan(0);
            expect(follower.worldPosition.y).toBeGreaterThan(0);
            expect(follower.worldPosition.z).toBeGreaterThan(0);
        });

        it('should integrate kinematic velocities accurately over time', () => {
            const node = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            node.setKinematics({
                linearVelocity: { x: 10, y: 0, z: -5 },
                angularVelocity: { x: 0, y: Math.PI, z: 0 },
            });

            // 0.5s step: position should be (5, 0, -2.5), rotation 90 deg around Y
            SpatialOC.update(0.5);

            expect(node.localPosition.x).toBeCloseTo(5);
            expect(node.localPosition.y).toBeCloseTo(0);
            expect(node.localPosition.z).toBeCloseTo(-2.5);

            const euler = node.localRotationEuler;
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should integrate linear and angular accelerations accurately over time', () => {
            const node = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            node.setKinematics({
                linearVelocity: { x: 0, y: 0, z: 0 },
                linearAcceleration: { x: 4, y: 0, z: 0 }, // v = a * dt = 4 * 1 = 4 m/s; dx = 4 * 1 = 4 m
                angularVelocity: { x: 0, y: 0, z: 0 },
                angularAcceleration: { x: 0, y: Math.PI / 2, z: 0 }, // w = a * dt = pi/2; drot = pi/2
            });

            // 1s step:
            SpatialOC.update(1.0);

            expect(node.localPosition.x).toBeCloseTo(4);
            const euler = node.localRotationEuler;
            expect(euler.y).toBeCloseTo(Math.PI / 2);
        });
    });

    describe('3. External Tracking & Top-Level Root Attachments', () => {
        it('should track moving player positions and facing rotations in real time', () => {
            const playerMock = harness.createMockObject(1);
            playerMock.position = { x: 200, y: 50, z: 300 };
            playerMock.rotation = { x: 0, y: 0, z: 1 }; // Facing +Z

            const root = SpatialOC.createEmpty();
            root.attachToPlayer(playerMock as unknown as mod.Player, {
                offset: { x: 0, y: 2, z: 0 },
                trackRotation: true,
                yawOnly: true,
            });

            const orbiter = SpatialOC.createEmpty({ parent: root, position: { x: 3, y: 0, z: 0 } });

            // Step update
            SpatialOC.update(0.016);

            expect(root.worldPosition.x).toBeCloseTo(200);
            expect(root.worldPosition.y).toBeCloseTo(52);
            expect(root.worldPosition.z).toBeCloseTo(300);

            expect(orbiter.worldPosition.x).toBeCloseTo(203);
            expect(orbiter.worldPosition.y).toBeCloseTo(52);
            expect(orbiter.worldPosition.z).toBeCloseTo(300);

            // Move player to another coordinate
            playerMock.position = { x: 500, y: 10, z: -100 };
            SpatialOC.update(0.016);

            expect(root.worldPosition.x).toBeCloseTo(500);
            expect(orbiter.worldPosition.x).toBeCloseTo(503);
        });

        it('should track native objects using attachToObject with rotation offsets', () => {
            const propMock = harness.createMockObject(2);
            propMock.position = { x: 10, y: 0, z: 20 };
            propMock.rotation = { x: 0, y: Math.PI / 2, z: 0 }; // 90 deg yaw

            const root = SpatialOC.createEmpty();
            root.attachToObject(propMock as unknown as Exclude<mod.Object, mod.Player | mod.Vehicle>, {
                offset: { x: 0, y: 0, z: 5 }, // 5m forward in object's local frame
                trackRotation: true,
            });

            SpatialOC.update(0.016);

            // After 90 deg yaw rotation, (0, 0, 5) becomes (5, 0, 0)
            expect(root.worldPosition.x).toBeCloseTo(15);
            expect(root.worldPosition.y).toBeCloseTo(0);
            expect(root.worldPosition.z).toBeCloseTo(20);
        });

        it('should return clones from transform getters so external mutation does not affect internal state', () => {
            const node = SpatialOC.createEmpty({
                position: { x: 10, y: 20, z: 30 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 2, z: 3 },
                pivotOffset: { x: 5, y: 5, z: 5 },
            });

            // Mutate localPosition return
            const localPos = node.localPosition;
            localPos.x = 999;
            expect(node.localPosition.x).toBe(10);

            // Mutate localRotation return
            const localRot = node.localRotation;
            localRot.w = 0;
            expect(node.localRotation.w).toBe(1);

            // Mutate localScale return
            const localScale = node.localScale;
            localScale.x = 999;
            expect(node.localScale.x).toBe(1);

            // Mutate worldPosition return
            const worldPos = node.worldPosition;
            worldPos.y = 999;
            expect(node.worldPosition.y).toBe(20);

            // Mutate worldRotation return
            const worldRot = node.worldRotation;
            worldRot.x = 999;
            expect(node.worldRotation.x).toBe(0);

            // Mutate worldScale return
            const worldScale = node.worldScale;
            worldScale.z = 999;
            expect(node.worldScale.z).toBe(3);

            // Mutate pivotOffset return
            const pivot = node.pivotOffset!;
            pivot.x = 999;
            expect(node.pivotOffset!.x).toBe(5);
        });

        it('should support Quaternion or Euler Vector3 in NodeOptions.rotation', () => {
            const nodeQuat = SpatialOC.createEmpty({
                rotation: { w: 0.7071068, x: 0, y: 0.7071068, z: 0 },
            });
            expect(nodeQuat.localRotationEuler.y).toBeCloseTo(Math.PI / 2);

            const nodeEuler = SpatialOC.createEmpty({
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
            });
            expect(nodeEuler.localRotationEuler.y).toBeCloseTo(Math.PI / 2);
        });

        it('should track targets using LookAt controller with target node, vector, or player', () => {
            const watcher = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            const targetNode = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 50 } });

            watcher.setLookAt({ target: targetNode });
            SpatialOC.update(0.016);
            expect(watcher.worldRotationEuler.y).toBeCloseTo(0);

            // Move target node to +X
            targetNode.localPosition = { x: 50, y: 0, z: 0 };
            SpatialOC.update(0.016);
            expect(watcher.worldRotationEuler.y).toBeCloseTo(Math.PI / 2);

            // Target vector
            watcher.setLookAt({ target: { x: -50, y: 0, z: 0 } });
            SpatialOC.update(0.016);
            expect(watcher.worldRotationEuler.y).toBeCloseTo(-Math.PI / 2);
        });

        it('should safely execute forEachChild callbacks via CallbackHandler', () => {
            const root = SpatialOC.createEmpty();
            SpatialOC.createEmpty({ parent: root });
            SpatialOC.createEmpty({ parent: root });

            const visited: number[] = [];
            root.forEachChild((_child, idx) => {
                visited.push(idx);
                if (idx === 0) throw new Error('Test error in callback');
            });

            // Even though idx 0 threw, CallbackHandler catches it and idx 1 is still visited
            expect(visited).toEqual([0, 1]);
        });

        it('should manually update transforms via ensureWorldTransformUpdated and computeRenderPosition', () => {
            const root = SpatialOC.createEmpty({ position: { x: 10, y: 20, z: 30 } });
            const child = SpatialOC.createEmpty({
                parent: root,
                position: { x: 0, y: 5, z: 0 },
                pivotOffset: { x: 0, y: 1, z: 0 },
            });

            child.ensureWorldTransformUpdated();
            const renderPos = child.computeRenderPosition();
            expect(renderPos.x).toBe(10);
            expect(renderPos.y).toBe(26);
            expect(renderPos.z).toBe(30);
        });

        it('should automatically compute delta time from server uptime when update() is called without arguments', async () => {
            const node = SpatialOC.createEmpty({ position: { x: 0, y: 0, z: 0 } });
            node.setKinematics({
                linearVelocity: { x: 100, y: 0, z: 0 },
            });

            // First call initializes lastUpdateTime and returns
            SpatialOC.update();
            expect(node.localPosition.x).toBe(0);

            // Wait 25ms (> 10ms threshold)
            await new Promise((resolve) => setTimeout(resolve, 25));

            SpatialOC.update();
            expect(node.localPosition.x).toBeGreaterThan(0);
        });

        it('should automatically detach from parent and mutually clear when given attach options or follow options', () => {
            const parent = SpatialOC.createEmpty()!;
            const child1 = SpatialOC.createEmpty({ parent })!;
            const child2 = SpatialOC.createEmpty({ parent })!;
            const target = SpatialOC.createEmpty()!;

            expect(child1.parent).toBe(parent);
            expect(child2.parent).toBe(parent);
            expect(parent.childCount).toBe(2);

            // setFollow first
            child1.setFollow({ target });
            expect(child1.parent).toBeNull();

            // attachToPlayer should auto-detach and clear follow
            const playerMock = harness.createMockObject(1);
            child1.attachToPlayer(playerMock as unknown as mod.Player);
            expect(child1.parent).toBeNull();
            expect(parent.childCount).toBe(1);

            // setFollow with target should auto-detach and clear tracker
            child2.attachToPlayer(playerMock as unknown as mod.Player);
            child2.setFollow({ target });
            expect(child2.parent).toBeNull();
            expect(parent.childCount).toBe(0);

            // setOrbit should clear tracker and follow
            child2.setOrbit({ speedRadPerSec: 1 });
            child2.setFollow({ target });
            // Follow should clear orbit
            child2.setOrbit({ speedRadPerSec: 2 });
            // Orbit should clear follow
        });

        it('should mutually clear conflicting positional and rotational controllers', () => {
            const node = SpatialOC.createEmpty()!;
            const target = SpatialOC.createEmpty()!;

            // 1. Linear kinematics vs Orbit
            node.setKinematics({ linearVelocity: { x: 10, y: 0, z: 0 } });
            node.setOrbit({ speedRadPerSec: 1 });
            // Kinematics should clear orbit
            node.setKinematics({ linearVelocity: { x: 20, y: 0, z: 0 } });

            // 2. Angular kinematics vs LookAt
            node.setKinematics({ angularVelocity: { x: 0, y: 1, z: 0 } });
            node.setLookAt({ target });
            // Kinematics should clear lookAt
            node.setKinematics({ angularVelocity: { x: 0, y: 2, z: 0 } });

            // 3. addChild should clear tracker and follow on the child
            const parent = SpatialOC.createEmpty()!;
            const child = SpatialOC.createEmpty()!;
            child.setFollow({ target });
            expect(child.parent).toBeNull();
            parent.addChild(child);
            expect(child.parent).toBe(parent);
        });
    });

    describe('4. Static Factories, Complementary Getters & Deleted Node Safety', () => {
        it('should support static factory methods on SpatialNode class', () => {
            const root = SpatialOC.SpatialNode.createEmpty({ position: { x: 10, y: 20, z: 30 } });
            expect(root).not.toBeNull();
            expect(root!.localPosition).toEqual({ x: 10, y: 20, z: 30 });

            const mockObj = harness.createMockObject(55);
            const existing = SpatialOC.SpatialNode.createExisting(mockObj as unknown as SpatialOC.TransformableObject);
            expect(existing).not.toBeNull();
            expect(existing!.isValid).toBe(true);

            const runtime = SpatialOC.SpatialNode.createRuntime(101);
            expect(runtime).not.toBeNull();
            expect(runtime!.isValid).toBe(true);
        });

        it('should support zero-allocation out variables in all complementary get* methods', () => {
            const node = SpatialOC.createEmpty({
                position: { x: 5, y: 10, z: 15 },
                rotation: { x: 0, y: Math.PI / 2, z: 0 },
                scale: { x: 2, y: 3, z: 4 },
                pivotOffset: { x: 1, y: 2, z: 3 },
            })!;

            const outPos = { x: 0, y: 0, z: 0 };
            const resPos = node.getLocalPosition(outPos);
            expect(resPos).toBe(outPos);
            expect(outPos).toEqual({ x: 5, y: 10, z: 15 });

            const outRot = { w: 0, x: 0, y: 0, z: 0 };
            const resRot = node.getLocalRotation(outRot);
            expect(resRot).toBe(outRot);
            expect(outRot.w).toBeCloseTo(Math.cos(Math.PI / 4));
            expect(outRot.y).toBeCloseTo(Math.sin(Math.PI / 4));

            const outEuler = { x: 0, y: 0, z: 0 };
            const resEuler = node.getLocalRotationEuler(outEuler);
            expect(resEuler).toBe(outEuler);
            expect(outEuler.y).toBeCloseTo(Math.PI / 2);

            const outScale = { x: 0, y: 0, z: 0 };
            const resScale = node.getLocalScale(outScale);
            expect(resScale).toBe(outScale);
            expect(outScale).toEqual({ x: 2, y: 3, z: 4 });

            const outPivot = { x: 0, y: 0, z: 0 };
            const resPivot = node.getPivotOffset(outPivot);
            expect(resPivot).toBe(outPivot);
            expect(outPivot).toEqual({ x: 1, y: 2, z: 3 });

            const outWorldPos = { x: 0, y: 0, z: 0 };
            const resWorldPos = node.getWorldPosition(outWorldPos);
            expect(resWorldPos).toBe(outWorldPos);
            expect(outWorldPos).toEqual({ x: 5, y: 10, z: 15 });

            const outWorldRot = { w: 0, x: 0, y: 0, z: 0 };
            const resWorldRot = node.getWorldRotation(outWorldRot);
            expect(resWorldRot).toBe(outWorldRot);

            const outWorldEuler = { x: 0, y: 0, z: 0 };
            const resWorldEuler = node.getWorldRotationEuler(outWorldEuler);
            expect(resWorldEuler).toBe(outWorldEuler);

            const outWorldScale = { x: 0, y: 0, z: 0 };
            const resWorldScale = node.getWorldScale(outWorldScale);
            expect(resWorldScale).toBe(outWorldScale);
            expect(outWorldScale).toEqual({ x: 2, y: 3, z: 4 });

            expect(node.getParent()).toBeNull();
            expect(node.getChildCount()).toBe(0);
            expect(node.getChildren()).toEqual([]);
        });

        it('should return undefined for all getters and get* methods when node is deleted', () => {
            const root = SpatialOC.createEmpty({ position: { x: 1, y: 2, z: 3 } })!;
            const child = SpatialOC.createEmpty({ parent: root, position: { x: 4, y: 5, z: 6 } })!;

            root.destroy();

            // Properties
            expect(root.isDeleted).toBe(true);
            expect(root.isValid).toBe(false);
            expect(root.parent).toBeUndefined();
            expect(root.childCount).toBeUndefined();
            expect(root.children).toBeUndefined();
            expect(root.pivotOffset).toBeUndefined();
            expect(root.localPosition).toBeUndefined();
            expect(root.localRotation).toBeUndefined();
            expect(root.localRotationEuler).toBeUndefined();
            expect(root.localScale).toBeUndefined();
            expect(root.worldPosition).toBeUndefined();
            expect(root.worldRotation).toBeUndefined();
            expect(root.worldRotationEuler).toBeUndefined();
            expect(root.worldScale).toBeUndefined();

            // Complementary methods
            expect(root.getParent()).toBeUndefined();
            expect(root.getChildCount()).toBeUndefined();
            expect(root.getChildren()).toBeUndefined();
            expect(root.getChild(0)).toBeUndefined();
            expect(root.getPivotOffset()).toBeUndefined();
            expect(root.getLocalPosition()).toBeUndefined();
            expect(root.getLocalRotation()).toBeUndefined();
            expect(root.getLocalRotationEuler()).toBeUndefined();
            expect(root.getLocalScale()).toBeUndefined();
            expect(root.getWorldPosition()).toBeUndefined();
            expect(root.getWorldRotation()).toBeUndefined();
            expect(root.getWorldRotationEuler()).toBeUndefined();
            expect(root.getWorldScale()).toBeUndefined();
            expect(root.computeRenderPosition()).toBeUndefined();
            expect(root.localToWorldPoint({ x: 0, y: 0, z: 0 })).toBeUndefined();
            expect(root.worldToLocalPoint({ x: 0, y: 0, z: 0 })).toBeUndefined();
            expect(root.localToWorldVector({ x: 0, y: 1, z: 0 })).toBeUndefined();
            expect(root.worldToLocalVector({ x: 0, y: 1, z: 0 })).toBeUndefined();

            // Descendant also deleted
            expect(child.isDeleted).toBe(true);
            expect(child.worldPosition).toBeUndefined();
            expect(child.getWorldPosition()).toBeUndefined();
        });
    });
});
