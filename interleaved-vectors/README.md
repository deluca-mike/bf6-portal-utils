# InterleavedVectors Module

<ai>

The `InterleavedVectors` namespace provides low-level, high-performance utilities for working with contiguous Structure of Arrays (SoA) in flat `Float32Array` buffers for 3D vector coordinates (stride 3: `x, y, z`) in Battlefield 6 Portal experiences.

In the memory-constrained Battlefield Portal QuickJS environment, managing hundreds of discrete JavaScript vector objects causes heap fragmentation and garbage collection pressure. By storing 3D coordinates contiguously inside flat TypedArrays, memory overhead is minimized and spatial cache locality is maximized.

Key features include:

- **Zero-Allocation Operations** – All read, write, and math functions operate directly on pre-allocated `Float32Array` buffers with zero runtime object allocations.
- **3D Vector Stride 3 Helpers** – Fast copying (`toVector`, `toSlice`, `copySlice`), uniform/component setting (`setSlice`), addition (`addSliceAndVectorToSlice`, `addVectorsToSlice`, `addSliceAndVectorToVector`, `addScaledSliceOntoSlice`), subtraction (`subtractVectorFromSliceToVector`), scalar multiplication (`multiplyVectorToSlice`), in-place scaling (`scaleSlice`), dot products (`dotSlices`, `dotSliceAndVector`), Euclidean lengths (`length`, `lengthSquared`), distance queries (`sliceToSliceDistanceSquared`, `sliceToVectorDistanceSquared`), cross products (`crossToSlice`, `crossToVector`), normalization (`normalizeToVector`), Hadamard multiplication (`hadamardMultiplyToSlice`, `hadamardMultiplyToVector`), safe Hadamard division (`safeHadamardDivideVectorBySliceToVector`), and equality testing (`equalsVector`).
- **Uniform API Standard** – Shared across `Spatial`, `Physics`, and other performance-critical modules in `bf6-portal-utils`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { InterleavedVectors } from 'bf6-portal-utils/interleaved-vectors';
    ```
3. Use flat TypedArrays and `InterleavedVectors` helpers to manage contiguous components:

    ```ts
    const MAX_ITEMS = 64;
    const positions = new Float32Array(MAX_ITEMS * 3);
    const velocities = new Float32Array(MAX_ITEMS * 3);

    // Set position and velocity of item 0
    InterleavedVectors.toSlice({ x: 10, y: 5, z: 20 }, positions, 0);
    InterleavedVectors.setSlice(velocities, 0, 0, 10, 0);

    // Step position by velocity over dt = 0.033s (pos += vel * dt)
    InterleavedVectors.addScaledSliceOntoSlice(velocities, 0, 0.033, positions, 0);

    // Read back with zero-allocation object reuse
    const scratchPos = { x: 0, y: 0, z: 0 };
    InterleavedVectors.toVector(positions, 0, scratchPos);
    ```

---

## API Reference

### 3D Vector Helpers (Stride 3)

- `InterleavedVectors.toVector(sourceArray: Float32Array, sIdx: number, target: Vector3): Vector3`
- `InterleavedVectors.toSlice(source: Vector3, targetArray: Float32Array, tIdx: number): void`
- `InterleavedVectors.copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void`
- `InterleavedVectors.setSlice(targetArray: Float32Array, tIdx: number, x: number, y?: number, z?: number): void`
- `InterleavedVectors.addSliceAndVectorToSlice(aArray: Float32Array, aIdx: number, b: Vector3, outArray: Float32Array, outIdx: number): void`
- `InterleavedVectors.addVectorsToSlice(a: Vector3, b: Vector3, outArray: Float32Array, outIdx: number): void`
- `InterleavedVectors.addSliceAndVectorToVector(aArray: Float32Array, aIdx: number, b: Vector3, outVector: Vector3): Vector3`
- `InterleavedVectors.subtractVectorFromSliceToVector(aArray: Float32Array, aIdx: number, b: Vector3, out: Vector3): Vector3`
- `InterleavedVectors.multiplyVectorToSlice(a: Vector3, b: number, outArray: Float32Array, outIdx: number): void`
- `InterleavedVectors.addScaledSliceOntoSlice(sourceArray: Float32Array, sIdx: number, scale: number, targetArray: Float32Array, tIdx: number): void`
- `InterleavedVectors.scaleSlice(array: Float32Array, idx: number, scalar: number): void`
- `InterleavedVectors.dotSlices(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number): number`
- `InterleavedVectors.dotSliceAndVector(array: Float32Array, idx: number, vec: Vector3): number`
- `InterleavedVectors.length(array: Float32Array, idx: number): number`
- `InterleavedVectors.lengthSquared(array: Float32Array, idx: number): number`
- `InterleavedVectors.sliceToSliceDistanceSquared(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number): number`
- `InterleavedVectors.sliceToVectorDistanceSquared(array: Float32Array, idx: number, vec: Vector3): number`
- `InterleavedVectors.crossToVector(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number, out: Vector3): Vector3`
- `InterleavedVectors.crossToSlice(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number, outArray: Float32Array, outIdx: number): void`
- `InterleavedVectors.normalizeToVector(array: Float32Array, idx: number, out: Vector3, epsilon?: number): number`
- `InterleavedVectors.hadamardMultiplyToSlice(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number, targetArray: Float32Array, tIdx: number): void`
- `InterleavedVectors.hadamardMultiplyToVector(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number, targetVector: Vector3): Vector3`
- `InterleavedVectors.safeHadamardDivideVectorBySliceToVector(numVec: Vector3, denomArray: Float32Array, denomIdx: number, out: Vector3, epsilon?: number): Vector3`
- `InterleavedVectors.equalsVector(array: Float32Array, idx: number, vector: Vector3): boolean`
