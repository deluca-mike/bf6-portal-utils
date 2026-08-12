# Quaternions Module

<ai>

The `Quaternions` namespace provides a high-performance, zero-allocation 4D Hamiltonian quaternion mathematics library for Battlefield 6 Portal. Quaternions represent 3D orientations and rotations without the gimbal lock, interpolation anomalies, or computational overhead associated with Euler angles and 3x3 rotation matrices.

Key features include:

- **Transparent Quaternion Type** – Plain `{ w: number, x: number, y: number, z: number }` structures where `w` is the real scalar component.
- **Zero-Allocation `out` Parameters** – Every transformative operation accepts an optional `out?: Quaternion` destination to eliminate heap allocations and GC spikes in active 60 Hz game loops.
- **Euler (ZYX Order) Conversions** – Pristine conversions to and from Euler pitch, yaw, and roll in radians matching Frostbite/Godot coordinate conventions.
- **Arbitrary-Axis Rotations** – Fast construction from any 3D unit axis and angle via `setFromAxisAngle()`.
- **Vector Rotation** – Rotate any `Vectors.Vector3` in 3D space with zero intermediate heap allocations.
- **Spherical Linear Interpolation (SLERP)** – Constant-speed smooth rotational interpolation between orientations.
- **Compound Multiplication & Inversion** – Hamiltonian product (`multiply`) and quaternion conjugation (`conjugate`).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Quaternions } from 'bf6-portal-utils/quaternions';
    import { Vectors } from 'bf6-portal-utils/vectors';
    ```
3. Use `Quaternions.Quaternion` for orientations, SLERP smoothing, and vector transformations.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod.

---

## Complete Examples

<ai>

### 1. Rotating a 3D Offset Around an Arbitrary Axis

```ts
import { Quaternions } from 'bf6-portal-utils/quaternions';
import { Vectors } from 'bf6-portal-utils/vectors';

// Pre-allocate scratch instances for zero-allocation reuse
const rot: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
const offset: Vectors.Vector3 = { x: 5, y: 0, z: 0 };
const rotatedOffset: Vectors.Vector3 = { x: 0, y: 0, z: 0 };

// Rotate 90 degrees around the Y (up) axis
Quaternions.setFromAxisAngle(rot, { x: 0, y: 1, z: 0 }, Math.PI / 2);
Quaternions.rotateVector(offset, rot, rotatedOffset);

// rotatedOffset is now (0, 0, -5)
```

---

### 2. Smooth Orientation Interpolation (SLERP)

```ts
import { Quaternions } from 'bf6-portal-utils/quaternions';

const currentRot: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
const targetRot: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
const smoothedRot: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };

// Set target rotation to 180-degree yaw
Quaternions.setFromEuler(targetRot, 0, Math.PI, 0);

export function OnTick(deltaTime: number) {
    const slerpSpeed = 5.0;
    const t = Math.min(1.0, slerpSpeed * deltaTime);

    // Smoothly step orientation towards targetRot
    Quaternions.slerp(currentRot, targetRot, t, smoothedRot);
    Quaternions.copy(currentRot, smoothedRot);
}
```

</ai>

---

## API Reference

### `namespace Quaternions`

#### Constants

- `Quaternions.IDENTITY`: `Readonly<Quaternion>` - The identity quaternion `{ w: 1, x: 0, y: 0, z: 0 }`.
- `Quaternions.ZERO`: `Readonly<Quaternion>` - The zero quaternion `{ w: 0, x: 0, y: 0, z: 0 }`.

#### Types

##### `Quaternions.Quaternion`

```ts
type Quaternion = {
    w: number;
    x: number;
    y: number;
    z: number;
};
```

#### Functions

##### `Quaternions.identity(target: Quaternion): Quaternion`

Resets a quaternion to identity.

##### `Quaternions.clone(source: Quaternion): Quaternion`

Clones a quaternion into a new object.

##### `Quaternions.copy(target: Quaternion, source: Quaternion): Quaternion`

Copies components from `source` into `target`.

##### `Quaternions.set(target: Quaternion, w: number, x: number, y: number, z: number): Quaternion`

Sets all four components of `target`.

##### `Quaternions.equals(a: Quaternion, b: Quaternion, epsilon = 1e-6): boolean`

Compares two quaternions within an epsilon tolerance, accounting for sign symmetry ($q = -q$).

##### `Quaternions.lengthSquared(q: Quaternion): number`

Computes the squared norm of a quaternion.

##### `Quaternions.length(q: Quaternion): number`

Computes the norm (magnitude) of a quaternion.

##### `Quaternions.normalize(q: Quaternion, out?: Quaternion): Quaternion`

Normalizes a quaternion to unit length.

##### `Quaternions.conjugate(q: Quaternion, out?: Quaternion): Quaternion`

Computes the conjugate (inverse for unit quaternions).

##### `Quaternions.multiply(a: Quaternion, b: Quaternion, out?: Quaternion): Quaternion`

Calculates the Hamiltonian product $a \times b$ (compound rotation of applying $b$ followed by $a$).

##### `Quaternions.rotateVector(v: Vector3, q: Quaternion, out?: Vector3): Vector3`

Rotates a 3D vector by unit quaternion $q$.

##### `Quaternions.setFromAxisAngle(target: Quaternion, axis: Vector3, angleRad: number): Quaternion`

Sets `target` from an arbitrary 3D axis and angle in radians.

##### `Quaternions.setFromLookRotation(target: Quaternion, forward: Vector3, up?: Vector3): Quaternion`

Constructs an orientation quaternion looking along `forward` direction with a specified `up` reference vector (defaults to `{ x: 0, y: 1, z: 0 }`). Computes the orthonormal basis matrix and converts to a unit quaternion with singularity protection.

##### `Quaternions.setFromEuler(target: Quaternion, pitchRad: number, yawRad: number, rollRad: number): Quaternion`

Sets `target` from Euler angles in radians using ZYX order.

##### `Quaternions.toEuler(q: Quaternion, out?: Vector3): Vector3`

Converts unit quaternion $q$ into Euler angles `{ x: pitch, y: yaw, z: roll }` in radians (ZYX order).

##### `Quaternions.slerp(a: Quaternion, b: Quaternion, t: number, out?: Quaternion): Quaternion`

Performs spherical linear interpolation between $a$ and $b$ at parameter $t \in [0, 1]$.

##### `Quaternions.isQuaternion(value: unknown): value is Quaternion`

Type guard verifying whether a value conforms to `Quaternion`.

##### `Quaternions.getQuaternionString(q: Quaternion, precision = 4): string`

Formats a quaternion as a readable string for debugging.
