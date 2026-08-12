export declare namespace Vectors {
    /**
     * A simple transparent and mutable 3D vector.
     */
    type Vector3 = {
        x: number;
        y: number;
        z: number;
    };
    /**
     * The zero Vector3 (immutable).
     */
    const ZERO: Readonly<Vector3>;
    /**
     * The one Vector3 (immutable).
     */
    const ONE: Readonly<Vector3>;
    /**
     * Sets the x, y, and z components of the target vector.
     * @param target - The vector to modify.
     * @param x - The new x component.
     * @param y - The new y component.
     * @param z - The new z component.
     * @returns The modified target vector.
     */
    function set(target: Vector3, x: number, y: number, z: number): Vector3;
    /**
     * Copies the components from the source vector into the target vector.
     * @param target - The destination vector.
     * @param source - The source vector to copy from.
     * @returns The modified target vector.
     */
    function copy(target: Vector3, source: Vector3): Vector3;
    /**
     * Clones the provided vector into a new Vector3 instance.
     * @param source - The vector to clone.
     * @returns A new Vector3 with the same components.
     */
    function clone(source: Vector3): Vector3;
    /**
     * Checks if two vectors are equal within an optional tolerance.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param tolerance - The maximum allowed difference per component (default: 0).
     * @returns True if the vectors are equal within tolerance, false otherwise.
     */
    function equals(a: Vector3, b: Vector3, tolerance?: number): boolean;
    /**
     * Checks if a vector is approximately zero within an optional tolerance.
     * @param vector - The vector to check.
     * @param tolerance - The maximum allowed deviation from zero per component (default: 0).
     * @returns True if all components are within tolerance of zero, false otherwise.
     */
    function isZero(vector: Vector3, tolerance?: number): boolean;
    /**
     * Converts the provided Vector3 to an engine mod.Vector.
     * @param vector - The Vector3 to convert.
     * @returns The engine mod.Vector.
     */
    function toVector(vector: Vector3): mod.Vector;
    /**
     * Converts the provided engine mod.Vector to a Vector3.
     * @param vector - The mod.Vector to convert.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The converted Vector3.
     */
    function toVector3(vector: mod.Vector, out?: Vector3): Vector3;
    /**
     * Adds the provided vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The sum of the vectors.
     */
    function add(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Subtracts vector b from vector a.
     * @param a - The first vector.
     * @param b - The second vector to subtract.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The difference of the vectors (a - b).
     */
    function subtract(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Multiplies the provided vector by a scalar.
     * @param vector - The vector to multiply.
     * @param scalar - The scalar to multiply by.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The multiplied vector.
     */
    function multiply(vector: Vector3, scalar: number, out?: Vector3): Vector3;
    /**
     * Divides the provided vector by a scalar.
     * @param vector - The vector to divide.
     * @param scalar - The scalar divisor.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The divided vector.
     */
    function divide(vector: Vector3, scalar: number, out?: Vector3): Vector3;
    /**
     * Computes the Hadamard product (element-wise multiplication) of two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The element-wise product vector.
     */
    function hadamardMultiply(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Computes the Hadamard division (element-wise division: a / b) of two vectors.
     * @param a - The numerator vector.
     * @param b - The denominator vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The element-wise divided vector.
     */
    function hadamardDivide(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Computes the dot product of two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The scalar dot product.
     */
    function dot(a: Vector3, b: Vector3): number;
    /**
     * Computes the cross product of two vectors (a x b).
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The cross product vector.
     */
    function cross(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Returns the squared magnitude/length of the vector (avoids square root).
     * @param vector - The vector.
     * @returns The squared length.
     */
    function lengthSquared(vector: Vector3): number;
    /**
     * Returns the magnitude/length of the vector.
     * @param vector - The vector.
     * @returns The length.
     */
    function length(vector: Vector3): number;
    /**
     * Returns the normalized (unit length) version of the provided vector.
     * If the vector is zero length, returns a zero vector.
     * @param vector - The vector to normalize.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The normalized vector.
     */
    function normalize(vector: Vector3, out?: Vector3): Vector3;
    /**
     * Calculates the normalized unit direction vector pointing from `from` to `to`.
     * If the points are identical, returns a zero vector.
     * @param from - The starting vector.
     * @param to - The target vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The normalized direction vector.
     */
    function direction(from: Vector3, to: Vector3, out?: Vector3): Vector3;
    /**
     * Linearly interpolates between vector a and vector b.
     * @param a - The starting vector (t = 0).
     * @param b - The destination vector (t = 1).
     * @param t - The interpolation factor (typically 0 to 1).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The interpolated vector.
     */
    function lerp(a: Vector3, b: Vector3, t: number, out?: Vector3): Vector3;
    /**
     * Calculates the midpoint between two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The midpoint vector.
     */
    function midpoint(a: Vector3, b: Vector3, out?: Vector3): Vector3;
    /**
     * Truncates each component of the vector to the provided number of decimal places.
     * @param vector - The vector to truncate.
     * @param decimalPlaces - The number of decimal places to preserve (default: 2).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The truncated vector.
     */
    function truncate(vector: Vector3, decimalPlaces?: number, out?: Vector3): Vector3;
    /**
     * Clamps the magnitude/length of the vector so it does not exceed `maxLength`.
     * @param vector - The vector to clamp.
     * @param maxLength - The maximum allowed length.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The length-clamped vector.
     */
    function clampLength(vector: Vector3, maxLength: number, out?: Vector3): Vector3;
    /**
     * Rotates a vector around a given unit axis by an angle in radians, using Rodrigues' rotation formula.
     * @param vector - The vector to rotate.
     * @param axis - The unit axis to rotate around.
     * @param angleRad - The angle in radians to rotate by.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotated vector.
     */
    function rotateAroundAxis(vector: Vector3, axis: Vector3, angleRad: number, out?: Vector3): Vector3;
    /**
     * Transforms a local coordinate offset (X=Right, Y=Up, Z=Forward) into world space relative to an origin and forward vector.
     * @param origin - The world-space origin position.
     * @param forward - The forward facing direction vector.
     * @param localOffset - The local offset (X=Right, Y=Up, Z=Forward).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The transformed world-space position.
     */
    function transformLocalOffset(origin: Vector3, forward: Vector3, localOffset: Vector3, out?: Vector3): Vector3;
    /**
     * Rotates a direction vector by relative yaw (horizontal) and pitch (vertical) angle deltas in degrees.
     * @param forward - The base forward direction vector.
     * @param yawDeg - Horizontal angle offset in degrees (left positive).
     * @param pitchDeg - Vertical angle offset in degrees (up positive).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotated, unit-length direction vector.
     */
    function rotateYawPitch(forward: Vector3, yawDeg: number, pitchDeg: number, out?: Vector3): Vector3;
    /**
     * Converts the provided degrees to radians.
     * @param degrees - The degrees to convert.
     * @returns The radians.
     */
    function degreesToRadians(degrees: number): number;
    /**
     * Returns a rotation Vector3 for the provided orientation in compass degrees.
     * @param orientation - The orientation in compass degrees (0-360).
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The rotation Vector3 (with y in radians).
     */
    function getRotationVector(orientation: number, out?: Vector3): Vector3;
    /**
     * Returns the squared Euclidean distance between two vectors (avoids square root).
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The squared distance.
     */
    function distanceSquared(a: Vector3, b: Vector3): number;
    /**
     * Returns the Euclidean distance between two vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The distance.
     */
    function distance(a: Vector3, b: Vector3): number;
    /**
     * Checks if the provided value is a valid Vector3 object.
     * @param v - The value to check.
     * @returns True if the value is a Vector3, false otherwise.
     */
    function isVector3(v: unknown): v is Vector3;
    /**
     * Returns a string representation of the provided Vector3.
     * @param vector - The Vector3 to format.
     * @param precision - The decimal precision (default: 2).
     * @returns The formatted string representation (e.g. "<1.00, 2.00, 3.00>").
     */
    function getVectorString(vector: Vector3, precision?: number): string;
}
