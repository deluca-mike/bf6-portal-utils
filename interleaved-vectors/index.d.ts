import { Vectors } from '../vectors/index.ts';
export declare namespace InterleavedVectors {
    type Vector3 = Vectors.Vector3;
    /**
     * Copies a 3D vector component triple from a flat TypedArray into a target Vector3 object.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Slot / element index (multiplied by 3 internally).
     * @param target - Destination Vector3 object.
     * @returns The modified target Vector3 instance.
     */
    function toVector(sourceArray: Float32Array, sIdx: number, target: Vector3): Vector3;
    /**
     * Copies a Vector3 object's components into a flat TypedArray at the given slot index.
     * @param source - Source Vector3 containing x, y, z components.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot / element index (multiplied by 3 internally).
     */
    function toSlice(source: Vector3, targetArray: Float32Array, tIdx: number): void;
    /**
     * Copies a 3-component vector slice from one flat TypedArray into another flat TypedArray at the same slot index.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param idx - Slot / element index (multiplied by 3 internally).
     */
    function copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void;
    /**
     * Sets 3 components of a vector slot in a flat TypedArray.
     * If y and z are omitted, sets all components to the uniform scalar x.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot / element index.
     * @param x - X component or uniform scalar.
     * @param y - Optional Y component.
     * @param z - Optional Z component.
     */
    function setSlice(targetArray: Float32Array, tIdx: number, x: number, y?: number, z?: number): void;
    /**
     * Adds an array vector slot and a Vector3 object, writing the result directly into a target array slot.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 addend.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    function addSliceAndVectorToSlice(
        aArray: Float32Array,
        aIdx: number,
        b: Vector3,
        outArray: Float32Array,
        outIdx: number
    ): void;
    /**
     * Adds two Vector3 objects together, writing the result into a flat TypedArray slot.
     * @param a - First Vector3 addend.
     * @param b - Second Vector3 addend.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    function addVectorsToSlice(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void;
    /**
     * Subtracts vector b from vector a, writing the result into a flat TypedArray slot.
     * @param a - Vector to subtract from (minuend).
     * @param b - Vector to subtract (subtrahend).
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    function subtractVectorsToSlice(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void;
    /**
     * Adds an array vector slot and a Vector3 object, writing into an output Vector3.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 addend.
     * @param outVector - Destination Vector3 object.
     * @returns The modified outVector instance.
     */
    function addSliceAndVectorToVector(aArray: Float32Array, aIdx: number, b: Vector3, outVector: Vector3): Vector3;
    /**
     * Adds a scaled source array slot in-place to a target array slot.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Source slot index.
     * @param scale - Scale multiplier applied to source slot.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot index.
     */
    function addScaledSliceOntoSlice(
        sourceArray: Float32Array,
        sIdx: number,
        scale: number,
        targetArray: Float32Array,
        tIdx: number
    ): void;
    /**
     * Adds a scaled Vector3 object in-place to a target array slot.
     * @param vec - Source Vector3 object.
     * @param scale - Scale multiplier applied to the vector.
     * @param targetArray - Target flat TypedArray with stride 3.
     * @param tIdx - Target slot index.
     */
    function addScaledVectorOntoSlice(vec: Vector3, scale: number, targetArray: Float32Array, tIdx: number): void;
    /**
     * Adds a scaled array vector slot in-place to a target Vector3 object.
     * @param sourceArray - Source flat TypedArray with stride 3.
     * @param sIdx - Source slot index.
     * @param scale - Scale multiplier applied to the source slot.
     * @param target - Destination Vector3 object.
     * @returns The modified target Vector3 instance.
     */
    function addScaledSliceOntoVector(sourceArray: Float32Array, sIdx: number, scale: number, target: Vector3): Vector3;
    /**
     * Subtracts vector slot b from vector slot a and writes the result into an output Vector3 object.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param out - Destination Vector3 object.
     * @returns The modified out Vector3 instance.
     */
    function subtractSlicesToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        out: Vector3
    ): Vector3;
    /**
     * Subtracts a Vector3 object from a vector slot, writing the result into a target Vector3.
     * @param aArray - Source flat TypedArray with stride 3.
     * @param aIdx - Source slot index.
     * @param b - Vector3 subtracted.
     * @param out - Destination Vector3 object.
     * @returns The modified out instance.
     */
    function subtractVectorFromSliceToVector(aArray: Float32Array, aIdx: number, b: Vector3, out: Vector3): Vector3;
    /**
     * Multiplies a vector by a scalar, writing the result into a flat TypedArray slot.
     * @param a - The Vector3 to multiply.
     * @param b - The scalar to multiply by.
     * @param outArray - The target flat TypedArray with stride 3.
     * @param outIdx - The target slot index.
     */
    function multiplyVectorToSlice(a: Vector3, b: number, outArray: Float32Array, outIdx: number): void;
    /**
     * Scales all components of a vector slot in a flat TypedArray in-place by a scalar.
     * @param array - Target flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param scalar - Scale multiplier.
     */
    function scaleSlice(array: Float32Array, idx: number, scalar: number): void;
    /**
     * Computes the dot product between two vector slots in flat TypedArrays.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @returns The scalar dot product.
     */
    function dotSlices(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number): number;
    /**
     * Computes the dot product between a Vector3 object and a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param vec - Vector3 object.
     * @returns The scalar dot product.
     */
    function dotSliceAndVector(array: Float32Array, idx: number, vec: Vector3): number;
    /**
     * Computes the Euclidean length (magnitude) of a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @returns The Euclidean length.
     */
    function length(array: Float32Array, idx: number): number;
    /**
     * Computes the squared Euclidean length of a vector slot in a flat TypedArray.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @returns The squared length.
     */
    function lengthSquared(array: Float32Array, idx: number): number;
    /**
     * Computes the squared Euclidean distance between two vector slots in flat TypedArrays.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @returns The squared distance.
     */
    function sliceToSliceDistanceSquared(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number
    ): number;
    /**
     * Computes the squared Euclidean distance between a vector slot in a flat TypedArray and a Vector3 object.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param vec - Vector3 object.
     * @returns The squared distance.
     */
    function sliceToVectorDistanceSquared(array: Float32Array, idx: number, vec: Vector3): number;
    /**
     * Computes the cross product (a x b) between two vector slots in flat TypedArrays and writes the result into an output Vector3.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param out - Destination Vector3 object.
     * @returns The modified out Vector3 instance.
     */
    function crossToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        out: Vector3
    ): Vector3;
    /**
     * Computes the cross product (a x b) between two vector slots in flat TypedArrays and writes the result into an output array slot.
     * @param aArray - First source flat TypedArray with stride 3.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray with stride 3.
     * @param bIdx - Second source slot index.
     * @param outArray - Target flat TypedArray with stride 3.
     * @param outIdx - Target slot index.
     */
    function crossToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        outArray: Float32Array,
        outIdx: number
    ): void;
    /**
     * Normalizes a vector slot into an output Vector3 object.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index.
     * @param out - Destination Vector3 object.
     * @param epsilon - Threshold below which the vector is treated as zero (default: 1e-6).
     * @returns The original Euclidean length of the vector.
     */
    function normalizeToVector(array: Float32Array, idx: number, out: Vector3, epsilon?: number): number;
    /**
     * Computes the element-wise (Hadamard) product of two array vector slots and writes into an output array slot.
     * @param aArray - First source flat TypedArray.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray.
     * @param bIdx - Second source slot index.
     * @param targetArray - Destination flat TypedArray.
     * @param tIdx - Destination slot index.
     */
    function hadamardMultiplyToSlice(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetArray: Float32Array,
        tIdx: number
    ): void;
    /**
     * Computes the element-wise (Hadamard) product of two array vector slots and writes into an output Vector3 object.
     * @param aArray - First source flat TypedArray.
     * @param aIdx - First source slot index.
     * @param bArray - Second source flat TypedArray.
     * @param bIdx - Second source slot index.
     * @param targetVector - Destination Vector3 object.
     * @returns The modified targetVector instance.
     */
    function hadamardMultiplyToVector(
        aArray: Float32Array,
        aIdx: number,
        bArray: Float32Array,
        bIdx: number,
        targetVector: Vector3
    ): Vector3;
    /**
     * Compares a vector slot in a flat TypedArray against a Vector3 object for exact equality.
     * @param array - Source flat TypedArray with stride 3.
     * @param idx - Slot index to compare against.
     * @param vector - Vector3 to compare.
     * @returns True if x, y, and z are exactly equal.
     */
    function equalsVector(array: Float32Array, idx: number, vector: Vector3): boolean;
    /**
     * Computes the element-wise (Hadamard) division of a Vector3 object by a vector slot in a flat TypedArray and writes the result into an output Vector3 object.
     * @param numVec - Numerator Vector3 object.
     * @param denomArray - Denominator flat TypedArray with stride 3.
     * @param denomIdx - Denominator slot index.
     * @param out - Destination Vector3 object.
     * @param epsilon - Threshold below which the denominator component is treated as zero (default: 1e-6).
     * @returns The modified out Vector3 instance.
     */
    function safeHadamardDivideVectorBySliceToVector(
        numVec: Vector3,
        denomArray: Float32Array,
        denomIdx: number,
        out: Vector3,
        epsilon?: number
    ): Vector3;
}
