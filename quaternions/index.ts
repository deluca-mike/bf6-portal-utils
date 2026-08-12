import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace Quaternions {
    /**
     * A transparent 4D Hamiltonian Quaternion representing 3D spatial rotation.
     * Components are stored as { w, x, y, z } where w is the scalar real component.
     */
    export type Quaternion = {
        w: number;
        x: number;
        y: number;
        z: number;
    };

    /**
     * The identity quaternion representing zero rotation (immutable).
     */
    export const IDENTITY: Readonly<Quaternion> = Object.freeze({ w: 1, x: 0, y: 0, z: 0 });

    /**
     * The zero quaternion (immutable).
     */
    export const ZERO: Readonly<Quaternion> = Object.freeze({ w: 0, x: 0, y: 0, z: 0 });

    /**
     * Resets a quaternion to identity (w=1, x=0, y=0, z=0).
     * @param target - The quaternion to reset.
     * @returns The modified target quaternion.
     */
    export function identity(target: Quaternion): Quaternion {
        target.w = 1;
        target.x = 0;
        target.y = 0;
        target.z = 0;
        return target;
    }

    /**
     * Clones the provided quaternion into a new instance.
     * @param source - The quaternion to clone.
     * @returns A new Quaternion instance.
     */
    export function clone(source: Quaternion): Quaternion {
        return { w: source.w, x: source.x, y: source.y, z: source.z };
    }

    /**
     * Copies components from source into target quaternion.
     * @param target - Destination quaternion.
     * @param source - Source quaternion.
     * @returns The modified target quaternion.
     */
    export function copy(target: Quaternion, source: Quaternion): Quaternion {
        target.w = source.w;
        target.x = source.x;
        target.y = source.y;
        target.z = source.z;
        return target;
    }

    /**
     * Sets the four components of a target quaternion.
     * @param target - Destination quaternion.
     * @param w - Real scalar component.
     * @param x - X vector component.
     * @param y - Y vector component.
     * @param z - Z vector component.
     * @returns The modified target quaternion.
     */
    export function set(target: Quaternion, w: number, x: number, y: number, z: number): Quaternion {
        target.w = w;
        target.x = x;
        target.y = y;
        target.z = z;
        return target;
    }

    /**
     * Checks if two quaternions are approximately equal within a specified epsilon.
     * Handles sign ambiguity where q and -q represent the exact same rotation.
     * @param a - First quaternion.
     * @param b - Second quaternion.
     * @param epsilon - Comparison tolerance (default: 1e-6).
     * @returns True if equal within tolerance, false otherwise.
     */
    export function equals(a: Quaternion, b: Quaternion, epsilon: number = 1e-6): boolean {
        // q and -q represent identical 3D rotations
        const directMatch =
            Math.abs(a.w - b.w) <= epsilon &&
            Math.abs(a.x - b.x) <= epsilon &&
            Math.abs(a.y - b.y) <= epsilon &&
            Math.abs(a.z - b.z) <= epsilon;

        if (directMatch) return true;

        return (
            Math.abs(a.w + b.w) <= epsilon &&
            Math.abs(a.x + b.x) <= epsilon &&
            Math.abs(a.y + b.y) <= epsilon &&
            Math.abs(a.z + b.z) <= epsilon
        );
    }

    /**
     * Computes the squared norm (magnitude) of a quaternion.
     * @param q - The quaternion.
     * @returns The squared length.
     */
    export function lengthSquared(q: Quaternion): number {
        return q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z;
    }

    /**
     * Computes the norm (magnitude) of a quaternion.
     * @param q - The quaternion.
     * @returns The magnitude.
     */
    export function length(q: Quaternion): number {
        return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
    }

    /**
     * Normalizes a quaternion to unit length.
     * @param q - The quaternion to normalize.
     * @param out - Optional target quaternion to write into.
     * @returns The normalized quaternion.
     */
    export function normalize(q: Quaternion, out?: Quaternion): Quaternion {
        const dest = out ?? q;
        const lenSq = q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z;

        if (lenSq === 0) return identity(dest);

        const invLen = 1 / Math.sqrt(lenSq);
        dest.w = q.w * invLen;
        dest.x = q.x * invLen;
        dest.y = q.y * invLen;
        dest.z = q.z * invLen;

        return dest;
    }

    /**
     * Computes the conjugate (inverse for unit quaternions) of a quaternion.
     * @param q - Source quaternion.
     * @param out - Optional destination quaternion.
     * @returns The conjugated quaternion.
     */
    export function conjugate(q: Quaternion, out?: Quaternion): Quaternion {
        const dest = out ?? q;
        dest.w = q.w;
        dest.x = -q.x;
        dest.y = -q.y;
        dest.z = -q.z;

        return dest;
    }

    /**
     * Multiplies two quaternions (Hamilton product: a * b).
     * Represents the compound rotation of applying rotation 'b' followed by 'a'.
     * @param a - First quaternion.
     * @param b - Second quaternion.
     * @param out - Optional destination quaternion.
     * @returns The multiplied quaternion.
     */
    export function multiply(a: Quaternion, b: Quaternion, out?: Quaternion): Quaternion {
        const dest = out ?? a;
        const aw = a.w;
        const ax = a.x;
        const ay = a.y;
        const az = a.z;
        const bw = b.w;
        const bx = b.x;
        const by = b.y;
        const bz = b.z;

        dest.w = aw * bw - ax * bx - ay * by - az * bz;
        dest.x = aw * bx + ax * bw + ay * bz - az * by;
        dest.y = aw * by - ax * bz + ay * bw + az * bx;
        dest.z = aw * bz + ax * by - ay * bx + az * bw;

        return dest;
    }

    /**
     * Rotates a 3D vector by a quaternion: v' = q * v * q^-1.
     * @param v - Vector to rotate.
     * @param q - Rotation quaternion (must be unit normalized).
     * @param out - Optional target Vector3 to store the result.
     * @returns The rotated Vector3.
     */
    export function rotateVector(v: Vectors.Vector3, q: Quaternion, out?: Vectors.Vector3): Vectors.Vector3 {
        const dest = out ?? { x: 0, y: 0, z: 0 };
        const vx = v.x;
        const vy = v.y;
        const vz = v.z;
        const qx = q.x;
        const qy = q.y;
        const qz = q.z;
        const qw = q.w;

        // t = 2 * cross(q.xyz, v)
        const tx = 2 * (qy * vz - qz * vy);
        const ty = 2 * (qz * vx - qx * vz);
        const tz = 2 * (qx * vy - qy * vx);

        // v' = v + q.w * t + cross(q.xyz, t)
        dest.x = vx + qw * tx + (qy * tz - qz * ty);
        dest.y = vy + qw * ty + (qz * tx - qx * tz);
        dest.z = vz + qw * tz + (qx * ty - qy * tx);

        return dest;
    }

    /**
     * Constructs a rotation quaternion from an arbitrary axis and angle in radians.
     * @param target - Destination quaternion.
     * @param axis - 3D rotation axis.
     * @param angleRad - Angle in radians.
     * @returns The modified target quaternion.
     */
    export function setFromAxisAngle(target: Quaternion, axis: Vectors.Vector3, angleRad: number): Quaternion {
        const halfAngle = angleRad * 0.5;
        const s = Math.sin(halfAngle);
        const lenSq = axis.x * axis.x + axis.y * axis.y + axis.z * axis.z;

        if (lenSq === 0) return identity(target);

        const invLen = 1 / Math.sqrt(lenSq);
        target.w = Math.cos(halfAngle);
        target.x = axis.x * invLen * s;
        target.y = axis.y * invLen * s;
        target.z = axis.z * invLen * s;

        return target;
    }

    /**
     * Constructs a rotation quaternion looking along a forward direction with a specified up direction.
     * Computes the orthonormal basis matrix and converts to a unit quaternion with singularity protection.
     * @param target - Destination quaternion.
     * @param forward - Forward direction vector (does not need to be normalized).
     * @param up - Optional up reference vector (default: 0, 1, 0).
     * @returns The modified target quaternion.
     */
    export function setFromLookRotation(
        target: Quaternion,
        forward: Vectors.Vector3,
        up?: Vectors.Vector3
    ): Quaternion {
        const lenSq = forward.x * forward.x + forward.y * forward.y + forward.z * forward.z;

        if (lenSq === 0) return identity(target);

        const invLen = 1 / Math.sqrt(lenSq);
        const fX = forward.x * invLen;
        const fY = forward.y * invLen;
        const fZ = forward.z * invLen;

        const upX = up?.x ?? 0;
        const upY = up?.y ?? 1;
        const upZ = up?.z ?? 0;

        // Singularity protection for parallel / straight vertical look
        const isVertical = Math.abs(fY) > 0.999;
        const wx = isVertical ? 1 : upX;
        const wy = isVertical ? 0 : upY;
        const wz = isVertical ? 0 : upZ;

        // Right = WorldUp x Forward
        let rX = wy * fZ - wz * fY;
        let rY = wz * fX - wx * fZ;
        let rZ = wx * fY - wy * fX;
        const rLenSq = rX * rX + rY * rY + rZ * rZ;

        if (rLenSq > 0) {
            const invRLen = 1 / Math.sqrt(rLenSq);
            rX *= invRLen;
            rY *= invRLen;
            rZ *= invRLen;
        }

        // Up = Forward x Right
        const uX = fY * rZ - fZ * rY;
        const uY = fZ * rX - fX * rZ;
        const uZ = fX * rY - fY * rX;

        // Matrix trace to quaternion conversion
        const trace = rX + uY + fZ;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            target.w = 0.25 / s;
            target.x = (uZ - fY) * s;
            target.y = (fX - rZ) * s;
            target.z = (rY - uX) * s;
        } else if (rX > uY && rX > fZ) {
            const s = 2.0 * Math.sqrt(1.0 + rX - uY - fZ);
            target.w = (uZ - fY) / s;
            target.x = 0.25 * s;
            target.y = (rY + uX) / s;
            target.z = (fX + rZ) / s;
        } else if (uY > fZ) {
            const s = 2.0 * Math.sqrt(1.0 + uY - rX - fZ);
            target.w = (fX - rZ) / s;
            target.x = (rY + uX) / s;
            target.y = 0.25 * s;
            target.z = (fY + uZ) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + fZ - rX - uY);
            target.w = (rY - uX) / s;
            target.x = (fX + rZ) / s;
            target.y = (fY + uZ) / s;
            target.z = 0.25 * s;
        }

        return normalize(target);
    }

    /**
     * Constructs a rotation quaternion from Euler angles in radians using ZYX order (Godot / BF6 standard).
     * Pitch is around X axis, Yaw is around Y axis, Roll is around Z axis.
     * @param target - Destination quaternion.
     * @param pitchRad - Pitch (rotation around X) in radians.
     * @param yawRad - Yaw (rotation around Y) in radians.
     * @param rollRad - Roll (rotation around Z) in radians.
     * @returns The modified target quaternion.
     */
    export function setFromEuler(target: Quaternion, pitchRad: number, yawRad: number, rollRad: number): Quaternion {
        const halfX = pitchRad * 0.5;
        const halfY = yawRad * 0.5;
        const halfZ = rollRad * 0.5;

        const cX = Math.cos(halfX);
        const sX = Math.sin(halfX);
        const cY = Math.cos(halfY);
        const sY = Math.sin(halfY);
        const cZ = Math.cos(halfZ);
        const sZ = Math.sin(halfZ);

        target.w = cX * cY * cZ + sX * sY * sZ;
        target.x = sX * cY * cZ - cX * sY * sZ;
        target.y = cX * sY * cZ + sX * cY * sZ;
        target.z = cX * cY * sZ - sX * sY * cZ;

        return normalize(target);
    }

    /**
     * Converts a rotation quaternion to Euler angles in radians (ZYX order).
     * @param q - Source quaternion (must be unit normalized).
     * @param out - Optional target Vector3 ({ x: pitch, y: yaw, z: roll }).
     * @returns The Euler angles Vector3 in radians.
     */
    export function toEuler(q: Quaternion, out?: Vectors.Vector3): Vectors.Vector3 {
        const dest = out ?? { x: 0, y: 0, z: 0 };
        const w = q.w;
        const x = q.x;
        const y = q.y;
        const z = q.z;

        // Singularity-guarded ZYX Euler extraction
        const sinY = 2 * (w * y - x * z);
        const clampedSinY = sinY > 1 ? 1 : sinY < -1 ? -1 : sinY;

        dest.x = Math.atan2(2 * (y * z + w * x), w * w - x * x - y * y + z * z);
        dest.y = Math.asin(clampedSinY);
        dest.z = Math.atan2(2 * (x * y + w * z), w * w + x * x - y * y - z * z);

        return dest;
    }

    /**
     * Spherical Linear Interpolation (SLERP) between two quaternions.
     * @param a - Starting quaternion.
     * @param b - Ending quaternion.
     * @param t - Interpolation alpha factor [0, 1].
     * @param out - Destination quaternion.
     * @returns The interpolated quaternion.
     */
    export function slerp(a: Quaternion, b: Quaternion, t: number, out?: Quaternion): Quaternion {
        const dest = out ?? a;
        let bw = b.w;
        let bx = b.x;
        let by = b.y;
        let bz = b.z;

        let cosHalfTheta = a.w * bw + a.x * bx + a.y * by + a.z * bz;

        // If negative dot product, take shorter path by negating b
        if (cosHalfTheta < 0) {
            bw = -bw;
            bx = -bx;
            by = -by;
            bz = -bz;
            cosHalfTheta = -cosHalfTheta;
        }

        if (cosHalfTheta >= 0.9995) {
            // Linear interpolation for very close orientations
            dest.w = a.w + t * (bw - a.w);
            dest.x = a.x + t * (bx - a.x);
            dest.y = a.y + t * (by - a.y);
            dest.z = a.z + t * (bz - a.z);

            return normalize(dest, dest);
        }

        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            dest.w = 0.5 * (a.w + bw);
            dest.x = 0.5 * (a.x + bx);
            dest.y = 0.5 * (a.y + by);
            dest.z = 0.5 * (a.z + bz);

            return dest;
        }

        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        dest.w = a.w * ratioA + bw * ratioB;
        dest.x = a.x * ratioA + bx * ratioB;
        dest.y = a.y * ratioA + by * ratioB;
        dest.z = a.z * ratioA + bz * ratioB;

        return dest;
    }

    /**
     * Validates whether a value is a valid Quaternion object.
     * @param value - The value to inspect.
     * @returns True if value is a valid Quaternion, false otherwise.
     */
    export function isQuaternion(value: unknown): value is Quaternion {
        if (typeof value !== 'object' || value === null) return false;

        const q = value as Record<string, unknown>;

        return typeof q.w === 'number' && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number';
    }

    /**
     * Formats a Quaternion into a readable string for debugging.
     * @param q - The quaternion.
     * @param precision - Number of decimal places (default: 4).
     * @returns Formatted string representation.
     */
    export function getQuaternionString(q: Quaternion, precision: number = 4): string {
        return `{ w: ${q.w.toFixed(precision)}, x: ${q.x.toFixed(precision)}, y: ${q.y.toFixed(precision)}, z: ${q.z.toFixed(precision)} }`;
    }
}
