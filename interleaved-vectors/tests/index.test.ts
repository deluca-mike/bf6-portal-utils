import { describe, expect, it } from 'vitest';
import { InterleavedVectors } from '../index.ts';

describe('InterleavedVectors Module Tests', () => {
    describe('Vector Helpers (Stride 3)', () => {
        it('should copy vectors to and from flat TypedArrays accurately', () => {
            const array = new Float32Array(9); // 3 slots
            const v0: InterleavedVectors.Vector3 = { x: 1, y: 2, z: 3 };
            const v1: InterleavedVectors.Vector3 = { x: 4, y: 5, z: 6 };

            InterleavedVectors.toSlice(v0, array, 0);
            InterleavedVectors.toSlice(v1, array, 1);

            expect(array[0]).toBe(1);
            expect(array[1]).toBe(2);
            expect(array[2]).toBe(3);
            expect(array[3]).toBe(4);
            expect(array[4]).toBe(5);
            expect(array[5]).toBe(6);

            const out: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };
            const cloned = InterleavedVectors.toVector(array, 1, out);
            expect(cloned).toBe(out);
            expect(out).toEqual({ x: 4, y: 5, z: 6 });
        });

        it('should copy vector slices between TypedArrays', () => {
            const src = new Float32Array([1, 2, 3, 4, 5, 6]);
            const dst = new Float32Array(6);

            InterleavedVectors.copySlice(src, dst, 1);
            expect(dst[3]).toBe(4);
            expect(dst[4]).toBe(5);
            expect(dst[5]).toBe(6);
        });

        it('should set uniform vector components and individual components in array', () => {
            const array = new Float32Array(6);
            InterleavedVectors.setSlice(array, 0, 7);

            expect(array[0]).toBe(7);
            expect(array[1]).toBe(7);
            expect(array[2]).toBe(7);

            InterleavedVectors.setSlice(array, 1, 10, 20, 30);
            expect(array[3]).toBe(10);
            expect(array[4]).toBe(20);
            expect(array[5]).toBe(30);
        });

        it('should add vectors into array slots and vector objects', () => {
            const a = new Float32Array([10, 20, 30]);
            const b: InterleavedVectors.Vector3 = { x: 1, y: 2, z: 3 };
            const outArray = new Float32Array(3);

            InterleavedVectors.addSliceAndVectorToSlice(a, 0, b, outArray, 0);
            expect(outArray[0]).toBe(11);
            expect(outArray[1]).toBe(22);
            expect(outArray[2]).toBe(33);

            const v1: InterleavedVectors.Vector3 = { x: 5, y: 5, z: 5 };
            const v2: InterleavedVectors.Vector3 = { x: 2, y: 3, z: 4 };
            InterleavedVectors.addVectorsToSlice(v1, v2, outArray, 0);
            expect(outArray[0]).toBe(7);
            expect(outArray[1]).toBe(8);
            expect(outArray[2]).toBe(9);

            InterleavedVectors.subtractVectorsToSlice(v1, v2, outArray, 0);
            expect(outArray[0]).toBe(3);
            expect(outArray[1]).toBe(2);
            expect(outArray[2]).toBe(1);

            const outVector: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };
            InterleavedVectors.addSliceAndVectorToVector(a, 0, b, outVector);
            expect(outVector).toEqual({ x: 11, y: 22, z: 33 });
        });

        it('should subtract vector object from array slot into a target vector', () => {
            const array = new Float32Array([
                10,
                20,
                30, // Slot 0
                100,
                200,
                300, // Slot 1
            ]);
            const b: InterleavedVectors.Vector3 = { x: 3, y: 5, z: 7 };
            const out: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };

            const res0 = InterleavedVectors.subtractVectorFromSliceToVector(array, 0, b, out);
            expect(res0).toBe(out);
            expect(out).toEqual({ x: 7, y: 15, z: 23 });

            const res1 = InterleavedVectors.subtractVectorFromSliceToVector(array, 1, b, out);
            expect(res1).toBe(out);
            expect(out).toEqual({ x: 97, y: 195, z: 293 });
        });

        it('should add scaled arrays accurately in-place', () => {
            const target = new Float32Array([10, 20, 30, 100, 200, 300]);

            const source = new Float32Array([4, 6, 8]);
            InterleavedVectors.addScaledSliceOntoSlice(source, 0, 2, target, 1);
            expect(target[3]).toBe(108);
            expect(target[4]).toBe(212);
            expect(target[5]).toBe(316);
        });

        it('should add scaled vector onto slice in-place', () => {
            const target = new Float32Array([10, 20, 30, 100, 200, 300]);
            const vec: InterleavedVectors.Vector3 = { x: 4, y: 6, z: 8 };

            InterleavedVectors.addScaledVectorOntoSlice(vec, 0.5, target, 1);
            expect(target[3]).toBe(102);
            expect(target[4]).toBe(203);
            expect(target[5]).toBe(304);
        });

        it('should add scaled slice onto vector in-place', () => {
            const source = new Float32Array([4, 6, 8, 10, 20, 30]);
            const target: InterleavedVectors.Vector3 = { x: 100, y: 200, z: 300 };

            const res = InterleavedVectors.addScaledSliceOntoVector(source, 1, 0.5, target);
            expect(res).toBe(target);
            expect(target.x).toBe(105);
            expect(target.y).toBe(210);
            expect(target.z).toBe(315);
        });

        it('should subtract slices to a target vector', () => {
            const a = new Float32Array([10, 20, 30]);
            const b = new Float32Array([1, 2, 3]);
            const out: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };

            const res = InterleavedVectors.subtractSlicesToVector(a, 0, b, 0, out);
            expect(res).toBe(out);
            expect(out).toEqual({ x: 9, y: 18, z: 27 });
        });

        it('should scale vector slots in-place', () => {
            const array = new Float32Array([2, -4, 6]);
            InterleavedVectors.scaleSlice(array, 0, 0.5);
            expect(array[0]).toBe(1);
            expect(array[1]).toBe(-2);
            expect(array[2]).toBe(3);
        });

        it('should multiply a vector by scalar and write into an array slot', () => {
            const vec: InterleavedVectors.Vector3 = { x: 2, y: 3, z: 4 };
            const outArray = new Float32Array(6);
            InterleavedVectors.multiplyVectorToSlice(vec, 2.5, outArray, 1);
            expect(outArray[3]).toBe(5);
            expect(outArray[4]).toBe(7.5);
            expect(outArray[5]).toBe(10);
        });

        it('should compute dot products accurately', () => {
            const a = new Float32Array([1, 2, 3]);
            const b = new Float32Array([4, 5, 6]);
            expect(InterleavedVectors.dotSlices(a, 0, b, 0)).toBe(1 * 4 + 2 * 5 + 3 * 6);

            const vec: InterleavedVectors.Vector3 = { x: 2, y: 3, z: 4 };
            expect(InterleavedVectors.dotSliceAndVector(a, 0, vec)).toBe(2 * 1 + 3 * 2 + 4 * 3);
        });

        it('should compute Euclidean length and squared length accurately', () => {
            const array = new Float32Array([3, 4, 0]);
            expect(InterleavedVectors.length(array, 0)).toBe(5);
            expect(InterleavedVectors.lengthSquared(array, 0)).toBe(25);
        });

        it('should compute squared distances between array slots and vectors', () => {
            const a = new Float32Array([1, 2, 3]);
            const b = new Float32Array([4, 6, 3]);
            expect(InterleavedVectors.sliceToSliceDistanceSquared(a, 0, b, 0)).toBe(9 + 16 + 0); // 25

            const vec: InterleavedVectors.Vector3 = { x: 4, y: 6, z: 3 };
            expect(InterleavedVectors.sliceToVectorDistanceSquared(a, 0, vec)).toBe(25);
        });

        it('should compute cross products into vectors and array slots', () => {
            // (1, 0, 0) x (0, 1, 0) = (0, 0, 1)
            const a = new Float32Array([1, 0, 0]);
            const b = new Float32Array([0, 1, 0]);
            const outVec: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };

            InterleavedVectors.crossToVector(a, 0, b, 0, outVec);
            expect(outVec).toEqual({ x: 0, y: 0, z: 1 });

            const outArray = new Float32Array(3);
            InterleavedVectors.crossToSlice(a, 0, b, 0, outArray, 0);
            expect(outArray[0]).toBe(0);
            expect(outArray[1]).toBe(0);
            expect(outArray[2]).toBe(1);
        });

        it('should normalize vector slots into vectors', () => {
            const array = new Float32Array([0, 3, 4]);
            const outVec: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };

            const len1 = InterleavedVectors.normalizeToVector(array, 0, outVec);
            expect(len1).toBe(5);
            expect(outVec.x).toBe(0);
            expect(outVec.y).toBeCloseTo(0.6);
            expect(outVec.z).toBeCloseTo(0.8);

            const zeroArray = new Float32Array([0, 0, 0]);
            const lenZero = InterleavedVectors.normalizeToVector(zeroArray, 0, outVec);
            expect(lenZero).toBe(0);
            expect(outVec).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should compute Hadamard products into arrays and vectors', () => {
            const a = new Float32Array([2, 3, 4]);
            const b = new Float32Array([5, 6, 7]);
            const outArray = new Float32Array(3);

            InterleavedVectors.hadamardMultiplyToSlice(a, 0, b, 0, outArray, 0);
            expect(outArray[0]).toBe(10);
            expect(outArray[1]).toBe(18);
            expect(outArray[2]).toBe(28);

            const outVector: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };
            InterleavedVectors.hadamardMultiplyToVector(a, 0, b, 0, outVector);
            expect(outVector).toEqual({ x: 10, y: 18, z: 28 });
        });

        it('should perform safe Hadamard division of vector by array slot with zero-division fallback', () => {
            const denomArray = new Float32Array([
                2,
                4,
                5, // Slot 0
                2,
                0,
                1e-7, // Slot 1 (y is 0, z is below default epsilon 1e-6)
            ]);

            const numVec: InterleavedVectors.Vector3 = { x: 10, y: 20, z: 30 };
            const out: InterleavedVectors.Vector3 = { x: 0, y: 0, z: 0 };

            // Slot 0: standard non-zero division
            const res0 = InterleavedVectors.safeHadamardDivideVectorBySliceToVector(numVec, denomArray, 0, out);
            expect(res0).toBe(out);
            expect(out).toEqual({ x: 5, y: 5, z: 6 });

            // Slot 1: zero and below-epsilon divisors evaluate to 0
            InterleavedVectors.safeHadamardDivideVectorBySliceToVector(numVec, denomArray, 1, out);
            expect(out.x).toBe(5);
            expect(out.y).toBe(0);
            expect(out.z).toBe(0);

            // Custom epsilon allowing small non-zero divisor
            InterleavedVectors.safeHadamardDivideVectorBySliceToVector(numVec, denomArray, 1, out, 1e-8);
            expect(out.x).toBe(5);
            expect(out.y).toBe(0);
            expect(out.z).toBe(30 / denomArray[5]);
        });

        it('should check vector equality against array slots accurately', () => {
            const array = new Float32Array([1, 2, 3]);
            expect(InterleavedVectors.equalsVector(array, 0, { x: 1, y: 2, z: 3 })).toBe(true);
            expect(InterleavedVectors.equalsVector(array, 0, { x: 1, y: 2, z: 4 })).toBe(false);
        });
    });
});
