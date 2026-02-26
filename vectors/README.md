# Vectors Module

<ai>

The `Vectors` namespace provides a small set of helpers for working with 3D vectors in Battlefield Portal experiences. Because `mod.Vector` is opaque—you must use the functional `mod` API (`mod.XComponentOf`, `mod.YComponentOf`, `mod.ZComponentOf`, `mod.CreateVector`, `mod.VectorAdd`, etc.) to read or build vectors—it can be clunky to write and reason about vector math. This module defines a transparent `Vector3` type (`{ x, y, z }`) and complementary functions so you can work with plain objects when convenient, and convert to or from `mod.Vector` only when calling Portal APIs.

Key features include conversion between `Vector3` and `mod.Vector`, arithmetic (add, subtract, multiply, divide), distance, truncation, degree/radian and rotation helpers, string formatting for debugging, and a type guard `isVector3()`. The namespace is self-contained and has no dependencies on other `bf6-portal-utils` modules.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Vectors } from 'bf6-portal-utils/vectors';
    ```
3. Use `Vectors.Vector3` for transparent vector values and `Vectors.toVector()` / `Vectors.toVector3()` at the boundary with `mod` APIs.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { Vectors } from 'bf6-portal-utils/vectors';

// Work with transparent Vector3 for math
const playerPos: Vectors.Vector3 = {
    x: 100,
    y: 0,
    z: 200,
};

const offset: Vectors.Vector3 = { x: 10, y: 0, z: 0 };
const newPos = Vectors.add(playerPos, offset);

// Convert to mod.Vector when calling Portal APIs
mod.SpawnObject(asset, Vectors.toVector(newPos), Vectors.ZERO_VECTOR);

// Or convert from mod.Vector when reading from the engine
const position = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
const pos3 = Vectors.toVector3(position);
const distance = Vectors.distance(pos3, targetPos3);

// Rotation from compass degrees (e.g. spawner orientation)
const rotation = Vectors.getRotationVector(90);
mod.SetVehicleSpawnerRotation(spawner, rotation);

// Debug string
console.log(Vectors.getVector3String(pos3, 2)); // e.g. "<100.00, 0.00, 200.00>"
```

</ai>

---

## API Reference

### `namespace Vectors`

The namespace is not instantiated; all members are types, constants, or functions.

#### Types

| Type | Description |
| --- | --- |
| `Vector3` | A simple transparent 3D vector: `{ x: number; y: number; z: number }`. Mutable; use for local math and convert to/from `mod.Vector` at API boundaries. |

#### Constants

| Constant | Type | Description |
| --- | --- | --- |
| `ZERO_VECTOR3` | `Vector3` | `{ x: 0, y: 0, z: 0 }`. |
| `ONE_VECTOR3` | `Vector3` | `{ x: 1, y: 1, z: 1 }`. |
| `ZERO_VECTOR` | `mod.Vector` | Zero vector from `mod.CreateVector(0, 0, 0)`. Useful when a Portal API requires a vector (e.g. spawn position/orientation). |
| `ONE_VECTOR` | `mod.Vector` | One vector from `mod.CreateVector(1, 1, 1)`. |

#### Conversion

| Method | Description |
| --- | --- |
| `toVector(vector: Vector3): mod.Vector` | Converts a `Vector3` to a `mod.Vector` via `mod.CreateVector(vector.x, vector.y, vector.z)`. |
| `toVector3(vector: mod.Vector): Vector3` | Converts a `mod.Vector` to a `Vector3` using `mod.XComponentOf`, `mod.YComponentOf`, `mod.ZComponentOf`. |

#### Arithmetic (Vector3)

All arithmetic functions take `Vector3` arguments and return a new `Vector3`; they do not mutate inputs.

| Method                                               | Description                               |
| ---------------------------------------------------- | ----------------------------------------- |
| `add(vector: Vector3, other: Vector3): Vector3`      | Returns the sum of the two vectors.       |
| `subtract(vector: Vector3, other: Vector3): Vector3` | Returns `vector - other`.                 |
| `multiply(vector: Vector3, scalar: number): Vector3` | Returns the vector scaled by the scalar.  |
| `divide(vector: Vector3, scalar: number): Vector3`   | Returns the vector divided by the scalar. |

#### Utilities

| Method | Description |
| --- | --- |
| `truncate(vector: Vector3, decimalPlaces?: number): Vector3` | Truncates each component to the given number of decimal places (default `2`). Returns a new `Vector3`. |
| `degreesToRadians(degrees: number): number` | Converts degrees to radians: `(degrees * Math.PI) / 180`. |
| `getRotationVector(orientation: number): mod.Vector` | Returns a rotation vector for the given compass orientation (degrees). Uses `mod.CreateVector(0, radians(180 - orientation), 0)`. |
| `getRotationVector3(orientation: number): Vector3` | Same as `getRotationVector` but returns a `Vector3` with `x: 0`, `y: degreesToRadians(180 - orientation)`, `z: 0`. |
| `distance(a: Vector3, b: Vector3): number` | Returns the Euclidean distance between the two vectors. |
| `isVector3(v: unknown): v is Vector3` | Type guard: returns `true` if `v` is a non-null object with numeric `x`, `y`, and `z` properties. |
| `getVectorString(vector: mod.Vector, precision?: number): string` | Returns a string like `"<x, y, z>"` with the given decimal precision (default `2`). |
| `getVector3String(vector: Vector3, precision?: number): string` | Same as `getVectorString` for a `Vector3`. |

---

## How It Works

- **Transparent vs opaque** – `Vector3` is a plain object; you can read and write `x`, `y`, `z` directly. Portal’s `mod.Vector` is opaque: you must use `mod.XComponentOf`, `mod.YComponentOf`, `mod.ZComponentOf` to read and `mod.CreateVector` (or `mod.VectorAdd`, etc.) to build. The module bridges the two with `toVector()` and `toVector3()`.
- **Immutability** – All arithmetic and `truncate()` return new values; they do not mutate the input vectors.
- **Rotation** – `getRotationVector` and `getRotationVector3` interpret `orientation` as compass degrees and produce a rotation vector suitable for APIs that expect a rotation (e.g. vehicle spawner orientation). The conversion uses `180 - orientation` so that compass degrees match the expected convention.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
