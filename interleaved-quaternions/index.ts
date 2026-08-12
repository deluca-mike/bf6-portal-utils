import { Quaternions } from '../quaternions/index.ts';

// version: 1.0.0
export namespace InterleavedQuaternions {
    export type Quaternion = Quaternions.Quaternion;

    /**
     * Copies a quaternion component quadruple (w, x, y, z) from a flat TypedArray into a Quaternion object.
     * @param sourceArray - Source flat TypedArray with stride 4.
     * @param sIdx - Slot / element index (multiplied by 4 internally).
     * @param target - Destination Quaternion object.
     * @returns The modified target Quaternion instance.
     */
    export function toQuaternion(sourceArray: Float32Array, sIdx: number, target: Quaternion): Quaternion {
        const i4 = sIdx * 4;
        target.w = sourceArray[i4];
        target.x = sourceArray[i4 + 1];
        target.y = sourceArray[i4 + 2];
        target.z = sourceArray[i4 + 3];

        return target;
    }

    /**
     * Copies a Quaternion object's components (w, x, y, z) into a flat TypedArray at the given slot index.
     * @param source - Source Quaternion containing w, x, y, z components.
     * @param targetArray - Target flat TypedArray with stride 4.
     * @param tIdx - Target slot / element index (multiplied by 4 internally).
     */
    export function toSlice(source: Quaternion, targetArray: Float32Array, tIdx: number): void {
        const t4 = tIdx * 4;
        targetArray[t4] = source.w;
        targetArray[t4 + 1] = source.x;
        targetArray[t4 + 2] = source.y;
        targetArray[t4 + 3] = source.z;
    }

    /**
     * Copies a 4-component quaternion slice from one flat TypedArray into another flat TypedArray at the same slot index.
     * @param sourceArray - Source flat TypedArray with stride 4.
     * @param targetArray - Target flat TypedArray with stride 4.
     * @param idx - Slot / element index.
     */
    export function copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void {
        const i4 = idx * 4;
        targetArray[i4] = sourceArray[i4];
        targetArray[i4 + 1] = sourceArray[i4 + 1];
        targetArray[i4 + 2] = sourceArray[i4 + 2];
        targetArray[i4 + 3] = sourceArray[i4 + 3];
    }

    /**
     * Sets a quaternion slot in a flat TypedArray to the identity quaternion (w = 1, x = 0, y = 0, z = 0).
     * @param array - Target flat TypedArray with stride 4.
     * @param idx - Target slot / element index.
     */
    export function setIdentity(array: Float32Array, idx: number): void {
        const i4 = idx * 4;
        array[i4] = 1;
        array[i4 + 1] = 0;
        array[i4 + 2] = 0;
        array[i4 + 3] = 0;
    }

    /**
     * Multiplies two quaternions stored in flat TypedArrays and writes the Hamilton product into an output array slot.
     * @param aArray - First source flat TypedArray with stride 4.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 4.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    export function multiplyToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const a4 = aIdx * 4;
        const aw = aArray[a4];
        const ax = aArray[a4 + 1];
        const ay = aArray[a4 + 2];
        const az = aArray[a4 + 3];

        const b4 = bIdx * 4;
        const bw = bArray[b4];
        const bx = bArray[b4 + 1];
        const by = bArray[b4 + 2];
        const bz = bArray[b4 + 3];

        const out4 = outIdx * 4;
        outArray[out4] = aw * bw - ax * bx - ay * by - az * bz;
        outArray[out4 + 1] = aw * bx + ax * bw + ay * bz - az * by;
        outArray[out4 + 2] = aw * by - ax * bz + ay * bw + az * bx;
        outArray[out4 + 3] = aw * bz + ax * by - ay * bx + az * bw;
    }

    /**
     * Multiplies a quaternion slice by a Quaternion object and writes the Hamilton product into an output array slot.
     * @param aArray - First source flat TypedArray with stride 4.
     * @param aIdx - First source slot index.
     * @param b - Second source Quaternion object.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    export function multiplySliceAndQuaternionToSlice(
        aArray: Float32Array,
        aIdx: number,
        b: Quaternion,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const a4 = aIdx * 4;
        const aw = aArray[a4];
        const ax = aArray[a4 + 1];
        const ay = aArray[a4 + 2];
        const az = aArray[a4 + 3];

        const bw = b.w;
        const bx = b.x;
        const by = b.y;
        const bz = b.z;

        const out4 = outIdx * 4;
        outArray[out4] = aw * bw - ax * bx - ay * by - az * bz;
        outArray[out4 + 1] = aw * bx + ax * bw + ay * bz - az * by;
        outArray[out4 + 2] = aw * by - ax * bz + ay * bw + az * bx;
        outArray[out4 + 3] = aw * bz + ax * by - ay * bx + az * bw;
    }

    /**
     * Multiplies a Quaternion object by a quaternion slice and writes the Hamilton product into an output array slot.
     * @param a - First source Quaternion object.
     * @param bArray - Second source flat TypedArray with stride 4.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    export function multiplyQuaternionAndSliceToSlice(
        a: Quaternion,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const aw = a.w;
        const ax = a.x;
        const ay = a.y;
        const az = a.z;

        const b4 = bIdx * 4;
        const bw = bArray[b4];
        const bx = bArray[b4 + 1];
        const by = bArray[b4 + 2];
        const bz = bArray[b4 + 3];

        const out4 = outIdx * 4;
        outArray[out4] = aw * bw - ax * bx - ay * by - az * bz;
        outArray[out4 + 1] = aw * bx + ax * bw + ay * bz - az * by;
        outArray[out4 + 2] = aw * by - ax * bz + ay * bw + az * bx;
        outArray[out4 + 3] = aw * bz + ax * by - ay * bx + az * bw;
    }

    /**
     * Computes the 4D dot product between a quaternion slot in a flat TypedArray and a Quaternion object.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @param q - Quaternion object.
     * @returns The scalar dot product.
     */
    export function dotSliceAndQuaternion(array: Float32Array, idx: number, q: Quaternion): number {
        const i4 = idx * 4;
        return q.w * array[i4] + q.x * array[i4 + 1] + q.y * array[i4 + 2] + q.z * array[i4 + 3];
    }

    /**
     * Computes the squared Euclidean length of a quaternion slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @returns The squared length.
     */
    export function lengthSquared(array: Float32Array, idx: number): number {
        const i4 = idx * 4;
        const w = array[i4];
        const x = array[i4 + 1];
        const y = array[i4 + 2];
        const z = array[i4 + 3];

        return w * w + x * x + y * y + z * z;
    }

    /**
     * Checks if the quaternion slot in a flat TypedArray is approximately equal to a Quaternion object.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @param q - Quaternion object.
     * @param epsilon - Comparison tolerance (default: 1e-6).
     * @returns True if the quaternion slot is approximately equal to the Quaternion object, false otherwise.
     */
    export function equalsQuaternion(array: Float32Array, idx: number, q: Quaternion, epsilon: number = 1e-6): boolean {
        const i4 = idx * 4;
        const w = array[i4];
        const x = array[i4 + 1];
        const y = array[i4 + 2];
        const z = array[i4 + 3];

        // q and -q represent identical 3D rotations
        const directMatch =
            Math.abs(w - q.w) <= epsilon &&
            Math.abs(x - q.x) <= epsilon &&
            Math.abs(y - q.y) <= epsilon &&
            Math.abs(z - q.z) <= epsilon;

        if (directMatch) return true;

        return (
            Math.abs(w + q.w) <= epsilon &&
            Math.abs(x + q.x) <= epsilon &&
            Math.abs(y + q.y) <= epsilon &&
            Math.abs(z + q.z) <= epsilon
        );
    }
}
