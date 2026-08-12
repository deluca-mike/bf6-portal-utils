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
});
