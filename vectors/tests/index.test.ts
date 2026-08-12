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
});
