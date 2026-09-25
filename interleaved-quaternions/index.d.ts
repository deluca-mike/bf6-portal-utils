import { Quaternions } from '../quaternions/index.ts';
export declare namespace InterleavedQuaternions {
    type Quaternion = Quaternions.Quaternion;
    /**
     * Copies a quaternion component quadruple (w, x, y, z) from a flat TypedArray into a Quaternion object.
     * @param sourceArray - Source flat TypedArray with stride 4.
     * @param sIdx - Slot / element index (multiplied by 4 internally).
     * @param target - Destination Quaternion object.
     * @returns The modified target Quaternion instance.
     */
    function toQuaternion(sourceArray: Float32Array, sIdx: number, target: Quaternion): Quaternion;
    /**
     * Copies a Quaternion object's components (w, x, y, z) into a flat TypedArray at the given slot index.
     * @param source - Source Quaternion containing w, x, y, z components.
     * @param targetArray - Target flat TypedArray with stride 4.
     * @param tIdx - Target slot / element index (multiplied by 4 internally).
     */
    function toSlice(source: Quaternion, targetArray: Float32Array, tIdx: number): void;
    /**
     * Copies a 4-component quaternion slice from one flat TypedArray into another flat TypedArray at the same slot index.
     * @param sourceArray - Source flat TypedArray with stride 4.
     * @param targetArray - Target flat TypedArray with stride 4.
     * @param idx - Slot / element index.
     */
    function copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void;
    /**
     * Sets a quaternion slot in a flat TypedArray to the identity quaternion (w = 1, x = 0, y = 0, z = 0).
     * @param array - Target flat TypedArray with stride 4.
     * @param idx - Target slot / element index.
     */
    function setIdentity(array: Float32Array, idx: number): void;
    /**
     * Multiplies two quaternions stored in flat TypedArrays and writes the Hamilton product into an output array slot.
     * @param aArray - First source flat TypedArray with stride 4.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 4.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    function multiplyToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void;
    /**
     * Multiplies a quaternion slice by a Quaternion object and writes the Hamilton product into an output array slot.
     * @param aArray - First source flat TypedArray with stride 4.
     * @param aIdx - First source slot index.
     * @param b - Second source Quaternion object.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    function multiplySliceAndQuaternionToSlice(
        aArray: Float32Array,
        aIdx: number,
        b: Quaternion,
        outArray: Float32Array,
        outIdx: number
    ): void;
    /**
     * Multiplies a Quaternion object by a quaternion slice and writes the Hamilton product into an output array slot.
     * @param a - First source Quaternion object.
     * @param bArray - Second source flat TypedArray with stride 4.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 4.
     * @param outIdx - Target slot index.
     */
    function multiplyQuaternionAndSliceToSlice(
        a: Quaternion,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void;
    /**
     * Computes the 4D dot product between a quaternion slot in a flat TypedArray and a Quaternion object.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @param q - Quaternion object.
     * @returns The scalar dot product.
     */
    function dotSliceAndQuaternion(array: Float32Array, idx: number, q: Quaternion): number;
    /**
     * Computes the squared Euclidean length of a quaternion slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @returns The squared length.
     */
    function lengthSquared(array: Float32Array, idx: number): number;
    /**
     * Checks if the quaternion slot in a flat TypedArray is approximately equal to a Quaternion object.
     * @param array - Source flat TypedArray with stride 4.
     * @param idx - Slot index.
     * @param q - Quaternion object.
     * @param epsilon - Comparison tolerance (default: 1e-6).
     * @returns True if the quaternion slot is approximately equal to the Quaternion object, false otherwise.
     */
    function equalsQuaternion(array: Float32Array, idx: number, q: Quaternion, epsilon?: number): boolean;
}
