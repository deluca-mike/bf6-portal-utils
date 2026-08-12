# Vectors Module

<ai>

The `Vectors` namespace provides lightweight, high-performance utilities for working with 3D vectors in Battlefield Portal experiences. Because `mod.Vector` is an opaque engine type requiring functional Portal API calls (`mod.XComponentOf`, `mod.YComponentOf`, `mod.ZComponentOf`, `mod.CreateVector`), performing vector math can be cumbersome. This module defines a transparent, mutable `Vector3` type (`{ x, y, z }`) and a comprehensive suite of math operations.

Key features include:

- **Transparent Vector3 Type** – Plain `{ x: number, y: number, z: number }` structures for clear, intuitive math.
- **Zero-Allocation `out` Parameters** – Every transformative and arithmetic function accepts an optional `out?: Vector3` target destination to eliminate intermediate heap allocations in high-frequency game loops.
- **Engine Boundary Conversions** – Seamless bridging to and from opaque `mod.Vector` via `toVector()` and `toVector3()`.
- **Comprehensive Vector Math** – Addition, subtraction, multiplication, division, dot product, cross product, normalization, linear interpolation (`lerp`), axis rotation (Rodrigues' formula), and distance calculations.
- **Fast Squared Comparisons** – `distanceSquared()` and `lengthSquared()` avoid costly `Math.sqrt()` invocations in proximity and threshold checks.
- **String Formatting & Type Guards** – Safe runtime validation with `isVector3()` and debugging string formatting via `getVectorString()`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Vectors } from 'bf6-portal-utils/vectors';
    ```
3. Use `Vectors.Vector3` for math and `Vectors.toVector()` / `Vectors.toVector3()` at engine boundaries.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

<ai>

### Example

```ts
import { Vectors } from 'bf6-portal-utils/vectors';

// Work with transparent Vector3 objects
const playerPos: Vectors.Vector3 = { x: 100, y: 0, z: 200 };
const offset: Vectors.Vector3 = { x: 10, y: 0, z: 0 };

// Standard immutable math
const targetPos = Vectors.add(playerPos, offset);

// Zero-allocation in-place math (reuses targetPos)
Vectors.multiply(offset, 2, targetPos);

// Convert to mod.Vector when calling Portal APIs
mod.SpawnObject(asset, Vectors.toVector(targetPos), Vectors.toVector(Vectors.ZERO));

// Fast distance check without square roots
const distSq = Vectors.distanceSquared(playerPos, targetPos);
if (distSq <= 4) {
    // Within 2 meters (2^2 = 4)
}

// Rotation from compass degrees (e.g. spawner orientation)
mod.SetVehicleSpawnerRotation(spawner, Vectors.toVector(Vectors.getRotationVector(90)));

// Convert from mod.Vector with zero-allocation target reuse
const scratch: Vectors.Vector3 = { x: 0, y: 0, z: 0 };
const soldierPos = mod.GetObjectPosition(player);
Vectors.toVector3(soldierPos, scratch);

// Debug formatting
console.log(Vectors.getVectorString(scratch, 2)); // "<100.00, 0.00, 200.00>"
```

</ai>

---

## API Reference

### `namespace Vectors`

All members are types, constants, or static functions.

#### Types

| Type      | Description                                                     |
| --------- | --------------------------------------------------------------- |
| `Vector3` | A transparent 3D vector: `{ x: number; y: number; z: number }`. |

#### Constants

| Constant | Type                | Description                                   |
| -------- | ------------------- | --------------------------------------------- |
| `ZERO`   | `Readonly<Vector3>` | Immutable zero vector `{ x: 0, y: 0, z: 0 }`. |
| `ONE`    | `Readonly<Vector3>` | Immutable one vector `{ x: 1, y: 1, z: 1 }`.  |

#### Conversions

| Method | Description |
| --- | --- |
| `toVector(vector: Vector3): mod.Vector` | Converts a `Vector3` to an engine `mod.Vector` via `mod.CreateVector(x, y, z)`. |
| `toVector3(vector: mod.Vector, out?: Vector3): Vector3` | Converts an engine `mod.Vector` to `Vector3`. Writes into `out` if provided. |

#### Mutators & Helpers

| Method | Description |
| :-- | :-- |
| `set(target: Vector3, x: number, y: number, z: number): Vector3` | Sets components on `target` and returns it. |
| `copy(target: Vector3, source: Vector3): Vector3` | Copies components from `source` into `target` and returns `target`. |
| `clone(source: Vector3): Vector3` | Returns a new `Vector3` cloned from `source`. |
| `equals(a: Vector3, b: Vector3, tolerance?: number): boolean` | Checks if two vectors are equal within an optional per-component tolerance (default: `0`). |
| `isZero(vector: Vector3, tolerance?: number): boolean` | Checks if all vector components are zero within an optional tolerance (default: `0`). |

#### Arithmetic & Transformations

All transformation functions accept an optional `out?: Vector3` destination parameter. When provided, calculations are written directly to `out` and returned without allocating a new object. When omitted, a new `{ x, y, z }` object is returned.

| Method | Description |
| :-- | :-- |
| `add(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Returns the sum of `a + b`. |
| `subtract(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Returns the difference of `a - b`. |
| `multiply(vector: Vector3, scalar: number, out?: Vector3): Vector3` | Multiplies `vector` by `scalar`. |
| `divide(vector: Vector3, scalar: number, out?: Vector3): Vector3` | Divides `vector` by `scalar`. |
| `hadamardMultiply(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Computes the element-wise Hadamard product $a \odot b$. |
| `hadamardDivide(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Computes the element-wise Hadamard division $a \oslash b$ ($a_i / b_i$). |
| `dot(a: Vector3, b: Vector3): number` | Computes the scalar dot product `a · b`. |
| `cross(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Computes the cross product `a × b`. |
| `normalize(vector: Vector3, out?: Vector3): Vector3` | Returns a unit-length direction vector (or `{ x: 0, y: 0, z: 0 }` if zero-length). |
| `direction(from: Vector3, to: Vector3, out?: Vector3): Vector3` | Calculates the normalized unit direction vector pointing from `from` to `to` (or `{ x: 0, y: 0, z: 0 }` if identical). |
| `lerp(a: Vector3, b: Vector3, t: number, out?: Vector3): Vector3` | Linearly interpolates between `a` and `b` by factor `t`. |
| `midpoint(a: Vector3, b: Vector3, out?: Vector3): Vector3` | Calculates the midpoint between `a` and `b`. |
| `clampLength(vector: Vector3, maxLength: number, out?: Vector3): Vector3` | Clamps the magnitude/length of `vector` so it does not exceed `maxLength`. |
| `truncate(vector: Vector3, decimalPlaces?: number, out?: Vector3): Vector3` | Truncates components to the given decimal places (default: `2`). |
| `rotateAroundAxis(vector: Vector3, axis: Vector3, angleRad: number, out?: Vector3): Vector3` | Rotates `vector` around `axis` by `angleRad` radians using Rodrigues' rotation formula. |
| `rotateYawPitch(forward: Vector3, yawDeg: number, pitchDeg: number, out?: Vector3): Vector3` | Rotates `forward` by relative yaw (left positive) and pitch (up positive) angle deltas in degrees. |
| `transformLocalOffset(origin: Vector3, forward: Vector3, localOffset: Vector3, out?: Vector3): Vector3` | Transforms a local offset (X=Right, Y=Up, Z=Forward) into world space relative to `origin` and `forward`. |
| `getRotationVector(orientation: number, out?: Vector3): Vector3` | Returns a rotation vector for compass degrees (with y-axis in radians). |

#### Measurements & Utilities

| Method | Description |
| :-- | :-- |
| `length(vector: Vector3): number` | Returns the Euclidean magnitude $\sqrt{x^2 + y^2 + z^2}$. |
| `lengthSquared(vector: Vector3): number` | Returns the squared magnitude $x^2 + y^2 + z^2$ (avoids `Math.sqrt`). |
| `distance(a: Vector3, b: Vector3): number` | Returns the Euclidean distance between `a` and `b`. |
| `distanceSquared(a: Vector3, b: Vector3): number` | Returns the squared Euclidean distance (avoids `Math.sqrt`). |
| `degreesToRadians(degrees: number): number` | Converts degrees to radians `(degrees * Math.PI) / 180`. |
| `isVector3(v: unknown): v is Vector3` | Type guard checking if `v` is a non-null object with numeric `x`, `y`, `z` properties. |
| `getVectorString(vector: Vector3, precision?: number): string` | Formats the vector as `"<x, y, z>"` with specified decimal precision (default: `2`). |

---

## How It Works

- **Transparent vs Opaque** – `Vector3` is a mutable JavaScript object with direct property access (`v.x = 10`), avoiding engine wrapper overhead for internal math. Conversion to and from `mod.Vector` occurs only at Portal API boundaries.
- **Zero-Allocation Optimization** – In high-frequency loops (such as raycasting, collision checks, or per-tick movement), passing a pre-allocated `out` vector to arithmetic operations completely eliminates garbage collection pauses in QuickJS.
- **Squared Distance Checks** – Proximity checks (e.g., checking if a player is within $R$ meters) should prefer `Vectors.distanceSquared(a, b) <= R * R` to eliminate square root computation.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
