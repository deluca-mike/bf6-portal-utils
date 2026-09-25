import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace InterleavedVectors {
    export type Vector3 = Vectors.Vector3;

    /**
     * Copies a 3D vector component triple from a flat TypedArray into a target Vector3 object.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Slot / element index (multiplied by 3 internally).
     * @param target - Destination Vector3 object.
     * @returns The modified target Vector3 instance.
     */
    export function toVector(sourceArray: Float32Array, sIdx: number, target: Vector3): Vector3 {
        const s3 = sIdx * 3;
        target.x = sourceArray[s3];
        target.y = sourceArray[s3 + 1];
        target.z = sourceArray[s3 + 2];

        return target;
    }

    /**
     * Copies a Vector3 object's components into a flat TypedArray at the given slot index.
     * @param source - Source Vector3 containing x, y, z components.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot / element index (multiplied by 3 internally).
     */
    export function toSlice(source: Vector3, targetArray: Float32Array, tIdx: number): void {
        const t3 = tIdx * 3;
        targetArray[t3] = source.x;
        targetArray[t3 + 1] = source.y;
        targetArray[t3 + 2] = source.z;
    }

    /**
     * Copies a 3-component vector slice from one flat TypedArray into another flat TypedArray at the same slot index.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param idx - Slot / element index (multiplied by 3 internally).
     */
    export function copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void {
        const i3 = idx * 3;
        targetArray[i3] = sourceArray[i3];
        targetArray[i3 + 1] = sourceArray[i3 + 1];
        targetArray[i3 + 2] = sourceArray[i3 + 2];
    }

    /**
     * Sets 3 components of a vector slot in a flat TypedArray.
     * If y and z are omitted, sets all components to the uniform scalar x.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot / element index.
     * @param x - X component or uniform scalar.
     * @param y - Optional Y component.
     * @param z - Optional Z component.
     */
    export function setSlice(targetArray: Float32Array, tIdx: number, x: number, y?: number, z?: number): void {
        const t3 = tIdx * 3;

        if (y === undefined && z === undefined) {
            targetArray[t3] = x;
            targetArray[t3 + 1] = x;
            targetArray[t3 + 2] = x;
        } else {
            targetArray[t3] = x;
            targetArray[t3 + 1] = y ?? x;
            targetArray[t3 + 2] = z ?? x;
        }
    }

    /**
     * Adds an array vector slot and a Vector3 object, writing the result directly into a target array slot.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 addend.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    export function addSliceAndVectorToSlice(
        aArray: Float32Array,
        aIdx: number,
        b: Vector3,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const a3 = aIdx * 3;
        const out3 = outIdx * 3;
        outArray[out3] = aArray[a3] + b.x;
        outArray[out3 + 1] = aArray[a3 + 1] + b.y;
        outArray[out3 + 2] = aArray[a3 + 2] + b.z;
    }

    /**
     * Adds two Vector3 objects together, writing the result into a flat TypedArray slot.
     * @param a - First Vector3 addend.
     * @param b - Second Vector3 addend.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    export function addVectorsToSlice(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void {
        const out3 = outIdx * 3;
        outArray[out3] = a.x + b.x;
        outArray[out3 + 1] = a.y + b.y;
        outArray[out3 + 2] = a.z + b.z;
    }

    /**
     * Subtracts vector b from vector a, writing the result into a flat TypedArray slot.
     * @param a - Vector to subtract from (minuend).
     * @param b - Vector to subtract (subtrahend).
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    export function subtractVectorsToSlice(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void {
        const out3 = outIdx * 3;
        outArray[out3] = a.x - b.x;
        outArray[out3 + 1] = a.y - b.y;
        outArray[out3 + 2] = a.z - b.z;
    }

    /**
     * Adds an array vector slot and a Vector3 object, writing into an output Vector3.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 addend.
     * @param outVector - Destination Vector3 object.
     * @returns The modified outVector instance.
     */
    export function addSliceAndVectorToVector(
        aArray: Float32Array,
        aIdx: number,
        b: Vector3,
        outVector: Vector3
    ): Vector3 {
        const a3 = aIdx * 3;
        outVector.x = aArray[a3] + b.x;
        outVector.y = aArray[a3 + 1] + b.y;
        outVector.z = aArray[a3 + 2] + b.z;

        return outVector;
    }

    /**
     * Adds a scaled source array slot in-place to a target array slot.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Source slot index.
     * @param scale - Scale multiplier applied to source slot.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot index.
     */
    export function addScaledSliceOntoSlice(
        sourceArray: Float32Array,
        sIdx: number,
        scale: number,
        targetArray: Float32Array,
        tIdx: number
    ): void {
        const t3 = tIdx * 3;
        const s3 = sIdx * 3;
        targetArray[t3] += sourceArray[s3] * scale;
        targetArray[t3 + 1] += sourceArray[s3 + 1] * scale;
        targetArray[t3 + 2] += sourceArray[s3 + 2] * scale;
    }

    /**
     * Adds a scaled Vector3 object in-place to a target array slot.
     * @param vec - Source Vector3 object.
     * @param scale - Scale multiplier applied to the vector.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot index.
     */
    export function addScaledVectorOntoSlice(
        vec: Vector3,
        scale: number,
        targetArray: Float32Array,
        tIdx: number
    ): void {
        const t3 = tIdx * 3;
        targetArray[t3] += vec.x * scale;
        targetArray[t3 + 1] += vec.y * scale;
        targetArray[t3 + 2] += vec.z * scale;
    }

    /**
     * Adds a scaled array vector slot in-place to a target Vector3 object.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Source slot index.
     * @param scale - Scale multiplier applied to the source slot.
     * @param target - Destination Vector3 object.
     * @returns The modified target Vector3 instance.
     */
    export function addScaledSliceOntoVector(
        sourceArray: Float32Array,
        sIdx: number,
        scale: number,
        target: Vector3
    ): Vector3 {
        const s3 = sIdx * 3;
        target.x += sourceArray[s3] * scale;
        target.y += sourceArray[s3 + 1] * scale;
        target.z += sourceArray[s3 + 2] * scale;

        return target;
    }

    /**
     * Subtracts vector slot b from vector slot a and writes the result into an output Vector3 object.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param out - Destination Vector3 object.
     * @returns The modified out Vector3 instance.
     */
    export function subtractSlicesToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        out: Vector3
    ): Vector3 {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        out.x = aArray[a3] - bArray[b3];
        out.y = aArray[a3 + 1] - bArray[b3 + 1];
        out.z = aArray[a3 + 2] - bArray[b3 + 2];

        return out;
    }

    /**
     * Subtracts a Vector3 object from a vector slot, writing the result into a target Vector3.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 subtracted.
     * @param out - Destination Vector3 object.
     * @returns The modified out instance.
     */
    export function subtractVectorFromSliceToVector(
        aArray: Float32Array,
        aIdx: number,
        b: Vector3,
        out: Vector3
    ): Vector3 {
        const a3 = aIdx * 3;
        out.x = aArray[a3] - b.x;
        out.y = aArray[a3 + 1] - b.y;
        out.z = aArray[a3 + 2] - b.z;

        return out;
    }

    /**
     * Multiplies a vector by a scalar, writing the result into a flat TypedArray slot.
     * @param a - The Vector3 to multiply.
     * @param b - The scalar to multiply by.
     * @param outArray - The target flat TypedArray with stride 3.
     * @param outIdx - The target slot index.
     */
    export function multiplyVectorToSlice(a: Vector3, b: number, outArray: Float32Array, outIdx: number): void {
        const out3 = outIdx * 3;
        outArray[out3] = a.x * b;
        outArray[out3 + 1] = a.y * b;
        outArray[out3 + 2] = a.z * b;
    }

    /**
     * Scales all components of a vector slot in a flat TypedArray in-place by a scalar.
     * @param array - Target flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param scalar - Scale multiplier.
     */
    export function scaleSlice(array: Float32Array, idx: number, scalar: number): void {
        const i3 = idx * 3;
        array[i3] *= scalar;
        array[i3 + 1] *= scalar;
        array[i3 + 2] *= scalar;
    }

    /**
     * Computes the dot product between two vector slots in flat TypedArrays.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @returns The scalar dot product.
     */
    export function dotSlices(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number): number {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        return aArray[a3] * bArray[b3] + aArray[a3 + 1] * bArray[b3 + 1] + aArray[a3 + 2] * bArray[b3 + 2];
    }

    /**
     * Computes the dot product between a Vector3 object and a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param vec - Vector3 object.
     * @returns The scalar dot product.
     */
    export function dotSliceAndVector(array: Float32Array, idx: number, vec: Vector3): number {
        const i3 = idx * 3;
        return vec.x * array[i3] + vec.y * array[i3 + 1] + vec.z * array[i3 + 2];
    }

    /**
     * Computes the Euclidean length (magnitude) of a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @returns The Euclidean length.
     */
    export function length(array: Float32Array, idx: number): number {
        return Math.sqrt(lengthSquared(array, idx));
    }

    /**
     * Computes the squared Euclidean length of a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @returns The squared length.
     */
    export function lengthSquared(array: Float32Array, idx: number): number {
        const i3 = idx * 3;
        const x = array[i3];
        const y = array[i3 + 1];
        const z = array[i3 + 2];

        return x * x + y * y + z * z;
    }

    /**
     * Computes the squared Euclidean distance between two vector slots in flat TypedArrays.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @returns The squared distance.
     */
    export function sliceToSliceDistanceSquared(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number
    ): number {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        const dx = aArray[a3] - bArray[b3];
        const dy = aArray[a3 + 1] - bArray[b3 + 1];
        const dz = aArray[a3 + 2] - bArray[b3 + 2];

        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Computes the squared Euclidean distance between a vector slot in a flat TypedArray and a Vector3 object.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param vec - Vector3 object.
     * @returns The squared distance.
     */
    export function sliceToVectorDistanceSquared(array: Float32Array, idx: number, vec: Vector3): number {
        const i3 = idx * 3;
        const dx = vec.x - array[i3];
        const dy = vec.y - array[i3 + 1];
        const dz = vec.z - array[i3 + 2];

        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Computes the cross product (a x b) between two vector slots in flat TypedArrays and writes the result into an output Vector3.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param out - Destination Vector3 object.
     * @returns The modified out Vector3 instance.
     */
    export function crossToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        out: Vector3
    ): Vector3 {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        const ax = aArray[a3];
        const ay = aArray[a3 + 1];
        const az = aArray[a3 + 2];

        const bx = bArray[b3];
        const by = bArray[b3 + 1];
        const bz = bArray[b3 + 2];

        out.x = ay * bz - az * by;
        out.y = az * bx - ax * bz;
        out.z = ax * by - ay * bx;

        return out;
    }

    /**
     * Computes the cross product (a x b) between two vector slots in flat TypedArrays and writes the result into an output array slot.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    export function crossToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        const ax = aArray[a3];
        const ay = aArray[a3 + 1];
        const az = aArray[a3 + 2];

        const bx = bArray[b3];
        const by = bArray[b3 + 1];
        const bz = bArray[b3 + 2];

        const out3 = outIdx * 3;
        outArray[out3] = ay * bz - az * by;
        outArray[out3 + 1] = az * bx - ax * bz;
        outArray[out3 + 2] = ax * by - ay * bx;
    }

    /**
     * Normalizes a vector slot into an output Vector3 object.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param out - Destination Vector3 object.
     * @param epsilon - Threshold below which the vector is treated as zero (default: 1e-6).
     * @returns The original Euclidean length of the vector.
     */
    export function normalizeToVector(array: Float32Array, idx: number, out: Vector3, epsilon: number = 1e-6): number {
        const i3 = idx * 3;
        const x = array[i3];
        const y = array[i3 + 1];
        const z = array[i3 + 2];
        const lenSq = x * x + y * y + z * z;

        if (lenSq <= epsilon * epsilon) {
            out.x = 0;
            out.y = 0;
            out.z = 0;

            return 0;
        }

        const len = Math.sqrt(lenSq);
        const invLen = 1 / len;
        out.x = x * invLen;
        out.y = y * invLen;
        out.z = z * invLen;

        return len;
    }

    /**
     * Computes the element-wise (Hadamard) product of two array vector slots and writes into an output array slot.
     * @param aArray - First source flat TypedArray.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray.
     * @param bIdx - Second source slot index.
     * @param targetArray - Destination flat TypedArray.
     * @param tIdx - Destination slot index.
     */
    export function hadamardMultiplyToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetArray: Float32Array,
        tIdx: number
    ): void {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        const t3 = tIdx * 3;
        targetArray[t3] = aArray[a3] * bArray[b3];
        targetArray[t3 + 1] = aArray[a3 + 1] * bArray[b3 + 1];
        targetArray[t3 + 2] = aArray[a3 + 2] * bArray[b3 + 2];
    }

    /**
     * Computes the element-wise (Hadamard) product of two array vector slots and writes into an output Vector3 object.
     * @param aArray - First source flat TypedArray.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray.
     * @param bIdx - Second source slot index.
     * @param targetVector - Destination Vector3 object.
     * @returns The modified targetVector instance.
     */
    export function hadamardMultiplyToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetVector: Vector3
    ): Vector3 {
        const a3 = aIdx * 3;
        const b3 = bIdx * 3;
        targetVector.x = aArray[a3] * bArray[b3];
        targetVector.y = aArray[a3 + 1] * bArray[b3 + 1];
        targetVector.z = aArray[a3 + 2] * bArray[b3 + 2];

        return targetVector;
    }

    /**
     * Compares a vector slot in a flat TypedArray against a Vector3 object for exact equality.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index to compare against.
     * @param vector - Vector3 to compare.
     * @returns True if x, y, and z are exactly equal.
     */
    export function equalsVector(array: Float32Array, idx: number, vector: Vector3): boolean {
        const i3 = idx * 3;
        return vector.x === array[i3] && vector.y === array[i3 + 1] && vector.z === array[i3 + 2];
    }

    /**
     * Computes the element-wise (Hadamard) division of a Vector3 object by a vector slot in a flat TypedArray and writes the result into an output Vector3 object.
     * @param numVec - Numerator Vector3 object.
     * @param denomArray - Denominator flat TypedArray with stride 3.
     * @param denomIdx - Denominator slot index.
     * @param out - Destination Vector3 object.
     * @param epsilon - Threshold below which the denominator component is treated as zero (default: 1e-6).
     * @returns The modified out Vector3 instance.
     */
    export function safeHadamardDivideVectorBySliceToVector(
        numVec: Vector3,
        denomArray: Float32Array,
        denomIdx: number,
        out: Vector3,
        epsilon: number = 1e-6
    ): Vector3 {
        const d3 = denomIdx * 3;
        out.x = Math.abs(denomArray[d3]) > epsilon ? numVec.x / denomArray[d3] : 0;
        out.y = Math.abs(denomArray[d3 + 1]) > epsilon ? numVec.y / denomArray[d3 + 1] : 0;
        out.z = Math.abs(denomArray[d3 + 2]) > epsilon ? numVec.z / denomArray[d3 + 2] : 0;

        return out;
    }
}
