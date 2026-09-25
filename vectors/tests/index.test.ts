import { describe, expect, it } from 'vitest';
import { Vectors } from '../index.ts';

describe('Vectors Module Tests', () => {
    describe('Hadamard Product & Division', () => {
        it('should compute the Hadamard element-wise product accurately', () => {
            const a: Vectors.Vector3 = { x: 2, y: 3, z: 4 };
            const b: Vectors.Vector3 = { x: 5, y: 6, z: 7 };

            const result = Vectors.hadamardMultiply(a, b);
            expect(result).toEqual({ x: 10, y: 18, z: 28 });

            // Zero-allocation out parameter reuse
            const out: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const reused = Vectors.hadamardMultiply(a, b, out);
            expect(reused).toBe(out);
            expect(out).toEqual({ x: 10, y: 18, z: 28 });
        });

        it('should compute the Hadamard element-wise division accurately', () => {
            const a: Vectors.Vector3 = { x: 20, y: 30, z: 40 };
            const b: Vectors.Vector3 = { x: 4, y: 5, z: 8 };

            const result = Vectors.hadamardDivide(a, b);
            expect(result).toEqual({ x: 5, y: 6, z: 5 });

            // Zero-allocation in-place reuse
            const inPlace: Vectors.Vector3 = { x: 20, y: 30, z: 40 };
            Vectors.hadamardDivide(inPlace, b, inPlace);
            expect(inPlace).toEqual({ x: 5, y: 6, z: 5 });
        });
    });

    describe('addScaled', () => {
        it('should add scaled vector to base vector accurately', () => {
            const a: Vectors.Vector3 = { x: 10, y: 20, z: 30 };
            const b: Vectors.Vector3 = { x: 2, y: 4, z: 6 };

            const result = Vectors.addScaled(a, b, 0.5);
            expect(result).toEqual({ x: 11, y: 22, z: 33 });

            // Zero-allocation out parameter reuse
            const out: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const reused = Vectors.addScaled(a, b, 2, out);
            expect(reused).toBe(out);
            expect(out).toEqual({ x: 14, y: 28, z: 42 });

            // In-place mutation (out === a)
            const inPlace: Vectors.Vector3 = { x: 1, y: 2, z: 3 };
            Vectors.addScaled(inPlace, b, 10, inPlace);
            expect(inPlace).toEqual({ x: 21, y: 42, z: 63 });

            // Subtraction via negative scale
            Vectors.addScaled(inPlace, b, -10, inPlace);
            expect(inPlace).toEqual({ x: 1, y: 2, z: 3 });
        });
    });

    describe('facingToEuler', () => {
        it('should convert cardinal facing directions to Euler angles (North is zero rotation)', () => {
            // North [0, 0, -1] -> yaw = 0, pitch = 0, roll = 0
            const north = Vectors.facingToEuler({ x: 0, y: 0, z: -1 });
            expect(north.x).toBeCloseTo(0);
            expect(north.y).toBeCloseTo(0);
            expect(north.z).toBeCloseTo(0);

            // East [1, 0, 0] -> yaw = -PI / 2 (-90 deg), pitch = 0
            const east = Vectors.facingToEuler({ x: 1, y: 0, z: 0 });
            expect(east.x).toBeCloseTo(0);
            expect(east.y).toBeCloseTo(-Math.PI / 2);
            expect(east.z).toBeCloseTo(0);

            // South [0, 0, 1] -> yaw = PI (180 deg), pitch = 0
            const south = Vectors.facingToEuler({ x: 0, y: 0, z: 1 });
            expect(south.x).toBeCloseTo(0);
            expect(Math.abs(south.y)).toBeCloseTo(Math.PI);
            expect(south.z).toBeCloseTo(0);

            // West [-1, 0, 0] -> yaw = PI / 2 (90 deg), pitch = 0
            const west = Vectors.facingToEuler({ x: -1, y: 0, z: 0 });
            expect(west.x).toBeCloseTo(0);
            expect(west.y).toBeCloseTo(Math.PI / 2);
            expect(west.z).toBeCloseTo(0);
        });

        it('should compute pitch when looking up or down', () => {
            // Looking straight up [0, 1, 0] -> pitch = PI / 2 (+90 deg)
            const up = Vectors.facingToEuler({ x: 0, y: 1, z: 0 });
            expect(up.x).toBeCloseTo(Math.PI / 2);
            expect(up.y).toBeCloseTo(0);
            expect(up.z).toBeCloseTo(0);

            // Looking straight down [0, -1, 0] -> pitch = -PI / 2 (-90 deg)
            const down = Vectors.facingToEuler({ x: 0, y: -1, z: 0 });
            expect(down.x).toBeCloseTo(-Math.PI / 2);
            expect(down.y).toBeCloseTo(0);
            expect(down.z).toBeCloseTo(0);

            // Looking up at angle facing North [0, 0.44, -0.9]
            const angleNorth = Vectors.facingToEuler({ x: 0, y: 0.44, z: -0.9 });
            const len = Math.sqrt(0.44 * 0.44 + 0.9 * 0.9);
            expect(angleNorth.x).toBeCloseTo(Math.asin(0.44 / len));
            expect(angleNorth.y).toBeCloseTo(0);
            expect(angleNorth.z).toBeCloseTo(0);
        });

        it('should handle non-unit vectors and zero vector', () => {
            // North-East [0.7, 0, -0.7] (approx unit length)
            const ne = Vectors.facingToEuler({ x: 0.7, y: 0, z: -0.7 });
            expect(ne.x).toBeCloseTo(0);
            expect(ne.y).toBeCloseTo(-Math.PI / 4);
            expect(ne.z).toBeCloseTo(0);

            // Zero vector -> returns zeros
            const zero = Vectors.facingToEuler({ x: 0, y: 0, z: 0 });
            expect(zero).toEqual({ x: 0, y: 0, z: 0 });

            // Zero-allocation out parameter reuse
            const out: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const reused = Vectors.facingToEuler({ x: 1, y: 0, z: 0 }, out);
            expect(reused).toBe(out);
            expect(out.y).toBeCloseTo(-Math.PI / 2);

            // In-place vector mutation (out === facing)
            const inPlace: Vectors.Vector3 = { x: 1, y: 0.5, z: 0 };
            const inPlaceRes = Vectors.facingToEuler(inPlace, inPlace);
            expect(inPlaceRes).toBe(inPlace);
            expect(inPlace.x).toBeCloseTo(Math.asin(0.5 / Math.sqrt(1.25)));
            expect(inPlace.y).toBeCloseTo(-Math.PI / 2);
            expect(inPlace.z).toBe(0);
        });
    });

    describe('getDirectionFromPlayerRotation', () => {
        it('should correctly convert player engine rotation to horizontal direction vectors', () => {
            // South: rot (0, 0, 0) -> (0, 0, 1)
            const south = Vectors.getDirectionFromPlayerRotation({ x: 0, y: 0, z: 0 });
            expect(south.x).toBeCloseTo(0);
            expect(south.y).toBeCloseTo(0);
            expect(south.z).toBeCloseTo(1);

            // North: rot (PI, 0, PI) -> (0, 0, -1)
            const north = Vectors.getDirectionFromPlayerRotation({ x: Math.PI, y: 0, z: Math.PI });
            expect(north.x).toBeCloseTo(0);
            expect(north.y).toBeCloseTo(0);
            expect(north.z).toBeCloseTo(-1);

            // East: rot (0, PI/2, 0) -> (1, 0, 0)
            const east = Vectors.getDirectionFromPlayerRotation({ x: 0, y: Math.PI / 2, z: 0 });
            expect(east.x).toBeCloseTo(1);
            expect(east.y).toBeCloseTo(0);
            expect(east.z).toBeCloseTo(0);

            // West: rot (0, -PI/2, 0) -> (-1, 0, 0)
            const west = Vectors.getDirectionFromPlayerRotation({ x: 0, y: -Math.PI / 2, z: 0 });
            expect(west.x).toBeCloseTo(-1);
            expect(west.y).toBeCloseTo(0);
            expect(west.z).toBeCloseTo(0);

            // East of North (rot = (3.14159, 0.04, 3.14159)) -> (+sin(Pi - 0.04), 0, +cos(Pi - 0.04))
            const eastOfNorth = Vectors.getDirectionFromPlayerRotation({ x: Math.PI, y: 0.04, z: Math.PI });
            expect(eastOfNorth.x).toBeCloseTo(Math.sin(Math.PI - 0.04), 4);
            expect(eastOfNorth.y).toBeCloseTo(0);
            expect(eastOfNorth.z).toBeCloseTo(Math.cos(Math.PI - 0.04), 4);

            // West of North (rot = (3.14159, -0.04, 3.14159)) -> (+sin(-Pi + 0.04), 0, +cos(-Pi + 0.04))
            const westOfNorth = Vectors.getDirectionFromPlayerRotation({ x: Math.PI, y: -0.04, z: Math.PI });
            expect(westOfNorth.x).toBeCloseTo(Math.sin(-Math.PI + 0.04), 4);
            expect(westOfNorth.y).toBeCloseTo(0);
            expect(westOfNorth.z).toBeCloseTo(Math.cos(-Math.PI + 0.04), 4);

            // Zero-allocation out parameter reuse
            const out: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const reused = Vectors.getDirectionFromPlayerRotation({ x: 0, y: Math.PI / 2, z: 0 }, out);
            expect(reused).toBe(out);
            expect(out.x).toBeCloseTo(1);
            expect(out.z).toBeCloseTo(0);

            // In-place mutation (out === rotation)
            const inPlace: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
            const inPlaceRes = Vectors.getDirectionFromPlayerRotation(inPlace, inPlace);
            expect(inPlaceRes).toBe(inPlace);
            expect(inPlace.x).toBeCloseTo(0);
            expect(inPlace.z).toBeCloseTo(1);
        });
    });

    describe('getHeadingFromPlayerRotation', () => {
        it('should correctly convert player engine rotation to compass heading in degrees [0, 360)', () => {
            // North: rot (PI, 0, PI) -> 0 deg
            const north = Vectors.getHeadingFromPlayerRotation({ x: Math.PI, y: 0, z: Math.PI });
            expect(north).toBeCloseTo(0);

            // East: rot (0, PI/2, 0) -> 90 deg
            const east = Vectors.getHeadingFromPlayerRotation({ x: 0, y: Math.PI / 2, z: 0 });
            expect(east).toBeCloseTo(90);

            // South: rot (0, 0, 0) -> 180 deg
            const south = Vectors.getHeadingFromPlayerRotation({ x: 0, y: 0, z: 0 });
            expect(south).toBeCloseTo(180);

            // West: rot (0, -PI/2, 0) -> 270 deg
            const west = Vectors.getHeadingFromPlayerRotation({ x: 0, y: -Math.PI / 2, z: 0 });
            expect(west).toBeCloseTo(270);

            // East of North (10 deg compass -> yaw = Pi - 0.174533)
            const rad10 = (10 * Math.PI) / 180;
            const eastOfNorth = Vectors.getHeadingFromPlayerRotation({ x: Math.PI, y: rad10, z: Math.PI });
            expect(eastOfNorth).toBeCloseTo(10, 4);

            // West of North (350 deg compass -> yaw = -Pi - (-0.174533))
            const westOfNorth = Vectors.getHeadingFromPlayerRotation({ x: Math.PI, y: -rad10, z: Math.PI });
            expect(westOfNorth).toBeCloseTo(350, 4);

            // North-East (45 deg compass)
            const rad45 = (45 * Math.PI) / 180;
            const northEast = Vectors.getHeadingFromPlayerRotation({ x: Math.PI, y: rad45, z: Math.PI });
            expect(northEast).toBeCloseTo(45, 4);

            // North-West (315 deg compass)
            const northWest = Vectors.getHeadingFromPlayerRotation({ x: Math.PI, y: -rad45, z: Math.PI });
            expect(northWest).toBeCloseTo(315, 4);
        });
    });
});
