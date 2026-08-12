# InterleavedQuaternions Module

<ai>

The `InterleavedQuaternions` namespace provides low-level, high-performance utilities for working with contiguous Structure of Arrays (SoA) in flat `Float32Array` buffers for 4D Hamiltonian quaternions (stride 4: `w, x, y, z`) in Battlefield 6 Portal experiences.

In the memory-constrained Battlefield Portal QuickJS environment, managing hundreds of discrete JavaScript quaternion objects causes heap fragmentation and garbage collection pressure. By storing 4D quaternions contiguously inside flat TypedArrays, memory overhead is minimized and spatial cache locality is maximized.

Key features include:

- **Zero-Allocation Operations** – All read, write, and math functions operate directly on pre-allocated `Float32Array` buffers with zero runtime object allocations.
- **4D Quaternion Stride 4 Helpers** – Fast cloning and extraction (`toQuaternion`), writing (`toSlice`, `copySlice`), identity initialization (`setIdentity`), direct array-to-array Hamilton quaternion multiplication (`multiplyToSlice`), dot products (`dotSliceAndQuaternion`), length queries (`lengthSquared`), and equality testing (`equalsQuaternion`).
- **Uniform API Standard** – Shared across `Spatial` and other performance-critical modules in `bf6-portal-utils`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { InterleavedQuaternions } from 'bf6-portal-utils/interleaved-quaternions';
    ```
3. Use flat TypedArrays and `InterleavedQuaternions` helpers to manage contiguous components:

    ```ts
    const MAX_ITEMS = 64;
    const rotations = new Float32Array(MAX_ITEMS * 4);

    // Set rotation of item 0 to identity
    InterleavedQuaternions.setIdentity(rotations, 0);

    // Copy a rotation object into item 1
    InterleavedQuaternions.toSlice({ w: 0.7071, x: 0, y: 0.7071, z: 0 }, rotations, 1);

    // Multiply item 0 and item 1, storing result into item 2
    InterleavedQuaternions.multiplyToSlice(rotations, 0, rotations, 1, rotations, 2);

    // Read back with zero-allocation object reuse
    const scratchRot = { w: 1, x: 0, y: 0, z: 0 };
    InterleavedQuaternions.toQuaternion(rotations, 2, scratchRot);
    ```

---

## API Reference

### 4D Quaternion Helpers (Stride 4)

- `InterleavedQuaternions.toQuaternion(sourceArray: Float32Array, sIdx: number, target: Quaternion): Quaternion`
- `InterleavedQuaternions.toSlice(source: Quaternion, targetArray: Float32Array, tIdx: number): void`
- `InterleavedQuaternions.copySlice(sourceArray: Float32Array, targetArray: Float32Array, idx: number): void`
- `InterleavedQuaternions.setIdentity(array: Float32Array, idx: number): void`
- `InterleavedQuaternions.multiplyToSlice(aArray: Float32Array, aIdx: number, bArray: Float32Array, bIdx: number, outArray: Float32Array, outIdx: number): void`
- `InterleavedQuaternions.dotSliceAndQuaternion(array: Float32Array, idx: number, q: Quaternion): number`
- `InterleavedQuaternions.lengthSquared(array: Float32Array, idx: number): number`
- `InterleavedQuaternions.equalsQuaternion(array: Float32Array, idx: number, q: Quaternion, epsilon?: number): boolean`
