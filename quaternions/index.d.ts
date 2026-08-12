import { Vectors } from '../vectors/index.ts';
export declare namespace Quaternions {
    /**
     * A transparent 4D Hamiltonian Quaternion representing 3D spatial rotation.
     * Components are stored as { w, x, y, z } where w is the scalar real component.
     */
    type Quaternion = {
        w: number;
        x: number;
        y: number;
        z: number;
    };
    /**
     * The identity quaternion representing zero rotation (immutable).
     */
    const IDENTITY: Readonly<Quaternion>;
    /**
     * The zero quaternion (immutable).
     */
    const ZERO: Readonly<Quaternion>;
    /**
     * Resets a quaternion to identity (w=1, x=0, y=0, z=0).
     * @param target - The quaternion to reset.
     * @returns The modified target quaternion.
     */
    function identity(target: Quaternion): Quaternion;
    /**
     * Clones the provided quaternion into a new instance.
     * @param source - The quaternion to clone.
     * @returns A new Quaternion instance.
     */
    function clone(source: Quaternion): Quaternion;
    /**
     * Copies components from source into target quaternion.
     * @param target - Destination quaternion.
     * @param source - Source quaternion.
     * @returns The modified target quaternion.
     */
    function copy(target: Quaternion, source: Quaternion): Quaternion;
    /**
     * Sets the four components of a target quaternion.
     * @param target - Destination quaternion.
     * @param w - Real scalar component.
     * @param x - X vector component.
     * @param y - Y vector component.
     * @param z - Z vector component.
     * @returns The modified target quaternion.
     */
    function set(target: Quaternion, w: number, x: number, y: number, z: number): Quaternion;
    /**
     * Checks if two quaternions are approximately equal within a specified epsilon.
     * Handles sign ambiguity where q and -q represent the exact same rotation.
     * @param a - First quaternion.
     * @param b - Second quaternion.
     * @param epsilon - Comparison tolerance (default: 1e-6).
     * @returns True if equal within tolerance, false otherwise.
     */
    function equals(a: Quaternion, b: Quaternion, epsilon?: number): boolean;
    /**
     * Computes the squared norm (magnitude) of a quaternion.
     * @param q - The quaternion.
     * @returns The squared length.
     */
    function lengthSquared(q: Quaternion): number;
    /**
     * Computes the norm (magnitude) of a quaternion.
     * @param q - The quaternion.
     * @returns The magnitude.
     */
    function length(q: Quaternion): number;
    /**
     * Normalizes a quaternion to unit length.
     * @param q - The quaternion to normalize.
     * @param out - Optional target quaternion to write into.
     * @returns The normalized quaternion.
     */
    function normalize(q: Quaternion, out?: Quaternion): Quaternion;
    /**
     * Computes the conjugate (inverse for unit quaternions) of a quaternion.
     * @param q - Source quaternion.
     * @param out - Optional destination quaternion.
     * @returns The conjugated quaternion.
     */
    function conjugate(q: Quaternion, out?: Quaternion): Quaternion;
    /**
     * Multiplies two quaternions (Hamilton product: a * b).
     * Represents the compound rotation of applying rotation 'b' followed by 'a'.
     * @param a - First quaternion.
     * @param b - Second quaternion.
     * @param out - Optional destination quaternion.
     * @returns The multiplied quaternion.
     */
    function multiply(a: Quaternion, b: Quaternion, out?: Quaternion): Quaternion;
    /**
     * Rotates a 3D vector by a quaternion: v' = q * v * q^-1.
     * @param v - Vector to rotate.
     * @param q - Rotation quaternion (must be unit normalized).
     * @param out - Optional target Vector3 to store the result.
     * @returns The rotated Vector3.
     */
    function rotateVector(v: Vectors.Vector3, q: Quaternion, out?: Vectors.Vector3): Vectors.Vector3;
    /**
     * Constructs a rotation quaternion from an arbitrary axis and angle in radians.
     * @param target - Destination quaternion.
     * @param axis - 3D rotation axis.
     * @param angleRad - Angle in radians.
     * @returns The modified target quaternion.
     */
    function setFromAxisAngle(target: Quaternion, axis: Vectors.Vector3, angleRad: number): Quaternion;
    /**
     * Constructs a rotation quaternion looking along a forward direction with a specified up direction.
     * Computes the orthonormal basis matrix and converts to a unit quaternion with singularity protection.
     * @param target - Destination quaternion.
     * @param forward - Forward direction vector (does not need to be normalized).
     * @param up - Optional up reference vector (default: 0, 1, 0).
     * @returns The modified target quaternion.
     */
    function setFromLookRotation(target: Quaternion, forward: Vectors.Vector3, up?: Vectors.Vector3): Quaternion;
    /**
     * Constructs a rotation quaternion from Euler angles in radians using ZYX order (Godot / BF6 standard).
     * Pitch is around X axis, Yaw is around Y axis, Roll is around Z axis.
     * @param target - Destination quaternion.
     * @param pitchRad - Pitch (rotation around X) in radians.
     * @param yawRad - Yaw (rotation around Y) in radians.
     * @param rollRad - Roll (rotation around Z) in radians.
     * @returns The modified target quaternion.
     */
    function setFromEuler(target: Quaternion, pitchRad: number, yawRad: number, rollRad: number): Quaternion;
    /**
     * Converts a rotation quaternion to Euler angles in radians (ZYX order).
     * @param q - Source quaternion (must be unit normalized).
     * @param out - Optional target Vector3 ({ x: pitch, y: yaw, z: roll }).
     * @returns The Euler angles Vector3 in radians.
     */
    function toEuler(q: Quaternion, out?: Vectors.Vector3): Vectors.Vector3;
    /**
     * Spherical Linear Interpolation (SLERP) between two quaternions.
     * @param a - Starting quaternion.
     * @param b - Ending quaternion.
     * @param t - Interpolation alpha factor [0, 1].
     * @param out - Destination quaternion.
     * @returns The interpolated quaternion.
     */
    function slerp(a: Quaternion, b: Quaternion, t: number, out?: Quaternion): Quaternion;
    /**
     * Validates whether a value is a valid Quaternion object.
     * @param value - The value to inspect.
     * @returns True if value is a valid Quaternion, false otherwise.
     */
    function isQuaternion(value: unknown): value is Quaternion;
    /**
     * Formats a Quaternion into a readable string for debugging.
     * @param q - The quaternion.
     * @param precision - Number of decimal places (default: 4).
     * @returns Formatted string representation.
     */
    function getQuaternionString(q: Quaternion, precision?: number): string;
}
