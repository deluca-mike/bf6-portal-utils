// version: 2.0.0
export namespace Vectors {
    /**
     * A simple transparent and mutable 3D vector.
     */
    export type Vector3 = {
        x: number;
        y: number;
        z: number;
    };

    /**
     * The zero Vector3 (immutable).
     */
    export const ZERO: Readonly<Vector3> = Object.freeze({ x: 0, y: 0, z: 0 });

    /**
     * The one Vector3 (immutable).
     */
    export const ONE: Readonly<Vector3> = Object.freeze({ x: 1, y: 1, z: 1 });

    /**
     * Sets the x, y, and z components of the target vector.
     * @param target - The vector to modify.
     * @param x - The new x component.
     * @param y - The new y component.
     * @param z - The new z component.
     * @returns The modified target vector.
     */
    export function set(target: Vector3, x: number, y: number, z: number): Vector3 {
        target.x = x;
        target.y = y;
        target.z = z;

        return target;
    }

    /**
     * Copies the components from the source vector into the target vector.
     * @param target - The destination vector.
     * @param source - The source vector to copy from.
     * @returns The modified target vector.
     */
    export function copy(target: Vector3, source: Vector3): Vector3 {
        target.x = source.x;
        target.y = source.y;
        target.z = source.z;

        return target;
    }

    /**
     * Clones the provided vector into a new Vector3 instance.
     * @param source - The vector to clone.
     * @returns A new Vector3 with the same components.
     */
    export function clone(source: Vector3): Vector3 {
        return { x: source.x, y: source.y, z: source.z };
    }

    /**
     * Checks if two vectors are equal within an optional tolerance.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param tolerance - The maximum allowed difference per component (default: 0).
     * @returns True if the vectors are equal within tolerance, false otherwise.
     */
    export function equals(a: Vector3, b: Vector3, tolerance: number = 0): boolean {
        return tolerance === 0
            ? a.x === b.x && a.y === b.y && a.z === b.z
            : Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.z - b.z) <= tolerance;
    }

    /**
     * Checks if a vector is approximately zero within an optional tolerance.
     * @param vector - The vector to check.
     * @param tolerance - The maximum allowed deviation from zero per component (default: 0).
     * @returns True if all components are within tolerance of zero, false otherwise.
     */
    export function isZero(vector: Vector3, tolerance: number = 0): boolean {
        return tolerance === 0
            ? vector.x === 0 && vector.y === 0 && vector.z === 0
            : Math.abs(vector.x) <= tolerance && Math.abs(vector.y) <= tolerance && Math.abs(vector.z) <= tolerance;
    }

    /**
     * Converts the provided Vector3 to an engine mod.Vector.
     * @param vector - The Vector3 to convert.
     * @returns The engine mod.Vector.
     */
    export function toVector(vector: Vector3): mod.Vector {
        return mod.CreateVector(vector.x, vector.y, vector.z);
    }

    /**
     * Converts the provided engine mod.Vector to a Vector3.
     * @param vector - The mod.Vector to convert.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The converted Vector3.
     */
    export function toVector3(vector: mod.Vector, out?: Vector3): Vector3 {
        const x = mod.XComponentOf(vector);
        const y = mod.YComponentOf(vector);
        const z = mod.ZComponentOf(vector);

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Adds the provided vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The sum of the vectors.
     */
    export function add(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        const x = a.x + b.x;
        const y = a.y + b.y;
        const z = a.z + b.z;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Subtracts vector b from vector a.
     * @param a - The first vector.
     * @param b - The second vector to subtract.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The difference of the vectors (a - b).
     */
    export function subtract(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        const x = a.x - b.x;
        const y = a.y - b.y;
        const z = a.z - b.z;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Multiplies the provided vector by a scalar.
     * @param vector - The vector to multiply.
     * @param scalar - The scalar to multiply by.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The multiplied vector.
     */
    export function multiply(vector: Vector3, scalar: number, out?: Vector3): Vector3 {
        const x = vector.x * scalar;
        const y = vector.y * scalar;
        const z = vector.z * scalar;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Divides the provided vector by a scalar.
     * @param vector - The vector to divide.
     * @param scalar - The scalar divisor.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The divided vector.
     */
    export function divide(vector: Vector3, scalar: number, out?: Vector3): Vector3 {
        const x = vector.x / scalar;
        const y = vector.y / scalar;
        const z = vector.z / scalar;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Computes the Hadamard product (element-wise multiplication) of two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The element-wise product vector.
     */
    export function hadamardMultiply(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        const x = a.x * b.x;
        const y = a.y * b.y;
        const z = a.z * b.z;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Computes the Hadamard division (element-wise division: a / b) of two vectors.
     * @param a - The numerator vector.
     * @param b - The denominator vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The element-wise divided vector.
     */
    export function hadamardDivide(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        const x = a.x / b.x;
        const y = a.y / b.y;
        const z = a.z / b.z;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Computes the dot product of two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The scalar dot product.
     */
    export function dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /**
     * Computes the cross product of two vectors (a x b).
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The cross product vector.
     */
    export function cross(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        const ax = a.x;
        const ay = a.y;
        const az = a.z;
        const bx = b.x;
        const by = b.y;
        const bz = b.z;

        const x = ay * bz - az * by;
        const y = az * bx - ax * bz;
        const z = ax * by - ay * bx;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Returns the squared magnitude/length of the vector (avoids square root).
     * @param vector - The vector.
     * @returns The squared length.
     */
    export function lengthSquared(vector: Vector3): number {
        return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
    }

    /**
     * Returns the magnitude/length of the vector.
     * @param vector - The vector.
     * @returns The length.
     */
    export function length(vector: Vector3): number {
        return Math.sqrt(lengthSquared(vector));
    }

    /**
     * Returns the normalized (unit length) version of the provided vector.
     * If the vector is zero length, returns a zero vector.
     * @param vector - The vector to normalize.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The normalized vector.
     */
    export function normalize(vector: Vector3, out?: Vector3): Vector3 {
        const len = length(vector);

        if (len === 0) {
            if (!out) return { x: 0, y: 0, z: 0 };

            out.x = 0;
            out.y = 0;
            out.z = 0;

            return out;
        }

        const x = vector.x / len;
        const y = vector.y / len;
        const z = vector.z / len;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Calculates the normalized unit direction vector pointing from `from` to `to`.
     * If the points are identical, returns a zero vector.
     * @param from - The starting vector.
     * @param to - The target vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The normalized direction vector.
     */
    export function direction(from: Vector3, to: Vector3, out?: Vector3): Vector3 {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const lenSq = dx * dx + dy * dy + dz * dz;

        if (lenSq === 0) {
            if (!out) return { x: 0, y: 0, z: 0 };

            out.x = 0;
            out.y = 0;
            out.z = 0;

            return out;
        }

        const invLen = 1 / Math.sqrt(lenSq);
        const x = dx * invLen;
        const y = dy * invLen;
        const z = dz * invLen;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Linearly interpolates between vector a and vector b.
     * @param a - The starting vector (t = 0).
     * @param b - The destination vector (t = 1).
     * @param t - The interpolation factor (typically 0 to 1).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The interpolated vector.
     */
    export function lerp(a: Vector3, b: Vector3, t: number, out?: Vector3): Vector3 {
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const z = a.z + (b.z - a.z) * t;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Calculates the midpoint between two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The midpoint vector.
     */
    export function midpoint(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
        return lerp(a, b, 0.5, out);
    }

    /**
     * Truncates each component of the vector to the provided number of decimal places.
     * @param vector - The vector to truncate.
     * @param decimalPlaces - The number of decimal places to preserve (default: 2).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The truncated vector.
     */
    export function truncate(vector: Vector3, decimalPlaces: number = 2, out?: Vector3): Vector3 {
        const scale = 10 ** Math.max(decimalPlaces, 0);
        const x = ~~(vector.x * scale) / scale;
        const y = ~~(vector.y * scale) / scale;
        const z = ~~(vector.z * scale) / scale;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Clamps the magnitude/length of the vector so it does not exceed `maxLength`.
     * @param vector - The vector to clamp.
     * @param maxLength - The maximum allowed length.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The length-clamped vector.
     */
    export function clampLength(vector: Vector3, maxLength: number, out?: Vector3): Vector3 {
        const lenSq = lengthSquared(vector);

        if (lenSq <= maxLength * maxLength) {
            if (!out) return { x: vector.x, y: vector.y, z: vector.z };

            out.x = vector.x;
            out.y = vector.y;
            out.z = vector.z;

            return out;
        }

        const scale = maxLength / Math.sqrt(lenSq);
        const x = vector.x * scale;
        const y = vector.y * scale;
        const z = vector.z * scale;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Rotates a vector around a given unit axis by an angle in radians, using Rodrigues' rotation formula.
     * @param vector - The vector to rotate.
     * @param axis - The unit axis to rotate around.
     * @param angleRad - The angle in radians to rotate by.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotated vector.
     */
    export function rotateAroundAxis(vector: Vector3, axis: Vector3, angleRad: number, out?: Vector3): Vector3 {
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // Dot product of axis and vector.
        const dotProduct = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;

        // Cross product of axis and vector.
        const crossX = axis.y * vector.z - axis.z * vector.y;
        const crossY = axis.z * vector.x - axis.x * vector.z;
        const crossZ = axis.x * vector.y - axis.y * vector.x;

        const oneMinusCos = 1 - cos;

        const x = vector.x * cos + crossX * sin + axis.x * dotProduct * oneMinusCos;
        const y = vector.y * cos + crossY * sin + axis.y * dotProduct * oneMinusCos;
        const z = vector.z * cos + crossZ * sin + axis.z * dotProduct * oneMinusCos;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Transforms a local coordinate offset (X=Right, Y=Up, Z=Forward) into world space relative to an origin and forward vector.
     * @param origin - The world-space origin position.
     * @param forward - The forward facing direction vector.
     * @param localOffset - The local offset (X=Right, Y=Up, Z=Forward).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The transformed world-space position.
     */
    export function transformLocalOffset(
        origin: Vector3,
        forward: Vector3,
        localOffset: Vector3,
        out?: Vector3
    ): Vector3 {
        const fLen = length(forward);
        const fX = fLen > 0 ? forward.x / fLen : 0;
        const fY = fLen > 0 ? forward.y / fLen : 0;
        const fZ = fLen > 0 ? forward.z / fLen : 1;

        // Gimbal singularity protection (use world X if looking straight up/down)
        const wx = Math.abs(fY) > 0.999 ? 1 : 0;
        const wy = Math.abs(fY) > 0.999 ? 0 : 1;
        const wz = 0;

        // Right = Forward x WorldUp
        let rX = fY * wz - fZ * wy;
        let rY = fZ * wx - fX * wz;
        let rZ = fX * wy - fY * wx;
        const rLen = Math.sqrt(rX * rX + rY * rY + rZ * rZ);

        if (rLen > 0) {
            rX /= rLen;
            rY /= rLen;
            rZ /= rLen;
        }

        // Up = Right x Forward
        const uX = rY * fZ - rZ * fY;
        const uY = rZ * fX - rX * fZ;
        const uZ = rX * fY - rY * fX;

        const x = origin.x + rX * localOffset.x + uX * localOffset.y + fX * localOffset.z;
        const y = origin.y + rY * localOffset.x + uY * localOffset.y + fY * localOffset.z;
        const z = origin.z + rZ * localOffset.x + uZ * localOffset.y + fZ * localOffset.z;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Rotates a direction vector by relative yaw (horizontal) and pitch (vertical) angle deltas in degrees.
     * @param forward - The base forward direction vector.
     * @param yawDeg - Horizontal angle offset in degrees (left positive).
     * @param pitchDeg - Vertical angle offset in degrees (up positive).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotated, unit-length direction vector.
     */
    export function rotateYawPitch(forward: Vector3, yawDeg: number, pitchDeg: number, out?: Vector3): Vector3 {
        if (yawDeg === 0 && pitchDeg === 0) return normalize(forward, out);

        const fLen = length(forward);
        const fX = fLen > 0 ? forward.x / fLen : 0;
        const fY = fLen > 0 ? forward.y / fLen : 0;
        const fZ = fLen > 0 ? forward.z / fLen : 1;

        const wx = Math.abs(fY) > 0.999 ? 1 : 0;
        const wy = Math.abs(fY) > 0.999 ? 0 : 1;
        const wz = 0;

        let rX = fY * wz - fZ * wy;
        let rY = fZ * wx - fX * wz;
        let rZ = fX * wy - fY * wx;
        const rLen = Math.sqrt(rX * rX + rY * rY + rZ * rZ);

        if (rLen > 0) {
            rX /= rLen;
            rY /= rLen;
            rZ /= rLen;
        }

        const uX = rY * fZ - rZ * fY;
        const uY = rZ * fX - rX * fZ;
        const uZ = rX * fY - rY * fX;

        const hRad = (yawDeg * Math.PI) / 180;
        const vRad = (pitchDeg * Math.PI) / 180;

        const cFwd = Math.cos(hRad) * Math.cos(vRad);
        const cUp = Math.cos(hRad) * Math.sin(vRad);
        const cRight = Math.sin(hRad);

        const x = fX * cFwd + uX * cUp + rX * cRight;
        const y = fY * cFwd + uY * cUp + rY * cRight;
        const z = fZ * cFwd + uZ * cUp + rZ * cRight;

        if (!out) return { x, y, z };

        out.x = x;
        out.y = y;
        out.z = z;

        return out;
    }

    /**
     * Converts the provided degrees to radians.
     * @param degrees - The degrees to convert.
     * @returns The radians.
     */
    export function degreesToRadians(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    /**
     * Returns a rotation Vector3 for the provided orientation in compass degrees.
     * @param orientation - The orientation in compass degrees (0-360).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotation Vector3 (with y in radians).
     */
    export function getRotationVector(orientation: number, out?: Vector3): Vector3 {
        const y = degreesToRadians(180 - orientation);

        if (!out) return { x: 0, y, z: 0 };

        out.x = 0;
        out.y = y;
        out.z = 0;

        return out;
    }

    /**
     * Returns the squared Euclidean distance between two vectors (avoids square root).
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The squared distance.
     */
    export function distanceSquared(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Returns the Euclidean distance between two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The distance.
     */
    export function distance(a: Vector3, b: Vector3): number {
        return Math.sqrt(distanceSquared(a, b));
    }

    /**
     * Checks if the provided value is a valid Vector3 object.
     * @param v - The value to check.
     * @returns True if the value is a Vector3, false otherwise.
     */
    export function isVector3(v: unknown): v is Vector3 {
        if (v === null || typeof v !== 'object') return false;

        const vector = v as Record<string, unknown>;

        return typeof vector.x === 'number' && typeof vector.y === 'number' && typeof vector.z === 'number';
    }

    /**
     * Returns a string representation of the provided Vector3.
     * @param vector - The Vector3 to format.
     * @param precision - The decimal precision (default: 2).
     * @returns The formatted string representation (e.g. "<1.00, 2.00, 3.00>").
     */
    export function getVectorString(vector: Vector3, precision: number = 2): string {
        return `<${vector.x.toFixed(precision)}, ${vector.y.toFixed(precision)}, ${vector.z.toFixed(precision)}>`;
    }
}
