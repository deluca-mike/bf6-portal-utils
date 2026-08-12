import { describe, expect, it } from 'vitest';
import { InterleavedQuaternions } from '../index.ts';

describe('InterleavedQuaternions Module Tests', () => {
    describe('Quaternion Helpers (Stride 4)', () => {
        it('should clone and copy quaternions accurately', () => {
            const array = new Float32Array(8); // 2 slots
            const q0: InterleavedQuaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
            const q1: InterleavedQuaternions.Quaternion = { w: 0.7071, x: 0, y: 0.7071, z: 0 };

            InterleavedQuaternions.toSlice(q0, array, 0);
            InterleavedQuaternions.toSlice(q1, array, 1);

            expect(array[0]).toBe(1);
            expect(array[1]).toBe(0);
            expect(array[4]).toBeCloseTo(0.7071);
            expect(array[6]).toBeCloseTo(0.7071);

            const out: InterleavedQuaternions.Quaternion = { w: 0, x: 0, y: 0, z: 0 };
            InterleavedQuaternions.toQuaternion(array, 1, out);
            expect(out.w).toBeCloseTo(0.7071);
            expect(out.y).toBeCloseTo(0.7071);
        });

        it('should copy quaternion slices and set identity in arrays', () => {
            const src = new Float32Array([0.5, 0.5, 0.5, 0.5]);
            const dst = new Float32Array(8);

            InterleavedQuaternions.copySlice(src, dst, 0);
            expect(dst[0]).toBe(0.5);
            expect(dst[1]).toBe(0.5);

            InterleavedQuaternions.setIdentity(dst, 1);
            expect(dst[4]).toBe(1);
            expect(dst[5]).toBe(0);
            expect(dst[6]).toBe(0);
            expect(dst[7]).toBe(0);
        });

        it('should multiply quaternions directly from flat arrays', () => {
            const a = new Float32Array([1, 0, 0, 0]); // Identity
            const b = new Float32Array([0, 1, 0, 0]); // 180 deg around X
            const out = new Float32Array(4);

            InterleavedQuaternions.multiplyToSlice(a, 0, b, 0, out, 0);
            expect(out[0]).toBe(0);
            expect(out[1]).toBe(1);
            expect(out[2]).toBe(0);
            expect(out[3]).toBe(0);
        });

        it('should multiply quaternion slice and Quaternion object into array slot', () => {
            const a = new Float32Array([1, 0, 0, 0]); // Identity
            const b: InterleavedQuaternions.Quaternion = { w: 0, x: 1, y: 0, z: 0 }; // 180 deg around X
            const out = new Float32Array(4);

            InterleavedQuaternions.multiplySliceAndQuaternionToSlice(a, 0, b, out, 0);
            expect(out[0]).toBe(0);
            expect(out[1]).toBe(1);
            expect(out[2]).toBe(0);
            expect(out[3]).toBe(0);
        });

        it('should multiply Quaternion object and quaternion slice into array slot', () => {
            const a: InterleavedQuaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 }; // Identity
            const b = new Float32Array([0, 0, 1, 0]); // 180 deg around Y
            const out = new Float32Array(4);

            InterleavedQuaternions.multiplyQuaternionAndSliceToSlice(a, b, 0, out, 0);
            expect(out[0]).toBe(0);
            expect(out[1]).toBe(0);
            expect(out[2]).toBe(1);
            expect(out[3]).toBe(0);
        });

        it('should compute dot product between array slot and quaternion object', () => {
            const array = new Float32Array([
                0,
                0,
                0,
                0, // Slot 0
                1,
                2,
                3,
                4, // Slot 1
            ]);
            const q: InterleavedQuaternions.Quaternion = { w: 5, x: 6, y: 7, z: 8 };

            const result = InterleavedQuaternions.dotSliceAndQuaternion(array, 1, q);
            expect(result).toBe(70);

            const identityArray = new Float32Array([1, 0, 0, 0]);
            const qOrthogonal: InterleavedQuaternions.Quaternion = { w: 0, x: 1, y: 0, z: 0 };
            expect(InterleavedQuaternions.dotSliceAndQuaternion(identityArray, 0, qOrthogonal)).toBe(0);
        });

        it('should compute squared length of a quaternion slot', () => {
            const array = new Float32Array([
                2,
                0,
                0,
                0, // Slot 0: 2^2 = 4
                1,
                2,
                3,
                4, // Slot 1: 1 + 4 + 9 + 16 = 30
            ]);

            expect(InterleavedQuaternions.lengthSquared(array, 0)).toBe(4);
            expect(InterleavedQuaternions.lengthSquared(array, 1)).toBe(30);
        });

        it('should check quaternion equality against array slots accurately', () => {
            const array = new Float32Array([
                1,
                0,
                0,
                0, // Slot 0: Identity
                0.5,
                0.5,
                0.5,
                0.5, // Slot 1
            ]);

            // Direct equality
            expect(InterleavedQuaternions.equalsQuaternion(array, 0, { w: 1, x: 0, y: 0, z: 0 })).toBe(true);

            // Sign symmetry (q == -q)
            expect(InterleavedQuaternions.equalsQuaternion(array, 1, { w: -0.5, x: -0.5, y: -0.5, z: -0.5 })).toBe(
                true
            );

            // Inequality
            expect(InterleavedQuaternions.equalsQuaternion(array, 0, { w: 0, x: 1, y: 0, z: 0 })).toBe(false);

            // Epsilon tolerance
            expect(InterleavedQuaternions.equalsQuaternion(array, 0, { w: 1.0000005, x: 0, y: 0, z: 0 }, 1e-5)).toBe(
                true
            );
            expect(InterleavedQuaternions.equalsQuaternion(array, 0, { w: 1.01, x: 0, y: 0, z: 0 }, 1e-5)).toBe(false);
        });
    });
});
