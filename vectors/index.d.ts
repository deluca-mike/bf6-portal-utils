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
     * The zero Vector3.
     */
    const ZERO_VECTOR3: Vector3;
    /**
     * The one Vector3.
     */
    const ONE_VECTOR3: Vector3;
    /**
     * The zero mod.Vector.
     */
    const ZERO_VECTOR: mod.Vector;
    /**
     * The one mod.Vector.
     */
    const ONE_VECTOR: mod.Vector;
    /**
     * Converts the provided vector to a mod.Vector.
     * @param vector - The vector to convert.
     * @returns The mod.Vector.
     */
    function toVector(vector: Vector3): mod.Vector;
    /**
     * Converts the provided mod.Vector to a Vector3.
     * @param vector - The mod.Vector to convert.
     * @returns The Vector3.
     */
    function toVector3(vector: mod.Vector): Vector3;
    /**
     * Adds the provided vectors.
     * @param vector - The first vector.
     * @param other - The second vector.
     * @returns The sum of the vectors.
     */
    function add(vector: Vector3, other: Vector3): Vector3;
    /**
     * Subtracts the provided vectors.
     * @param vector - The first vector.
     * @param other - The second vector.
     * @returns The difference of the vectors.
     */
    function subtract(vector: Vector3, other: Vector3): Vector3;
    /**
     * Multiplies the provided vector by the provided scalar.
     * @param vector - The vector to multiply.
     * @param scalar - The scalar to multiply the vector by.
     * @returns The multiplied vector.
     */
    function multiply(vector: Vector3, scalar: number): Vector3;
    /**
     * Divides the provided vector by the provided scalar.
     * @param vector - The vector to divide.
     * @param scalar - The scalar to divide the vector by.
     * @returns The divided vector.
     */
    function divide(vector: Vector3, scalar: number): Vector3;
    /**
     * Truncates the provided vector to the provided number of decimal places.
     * @param vector - The vector to truncate.
     * @param decimalPlaces - The number of decimal places to truncate the vector to.
     * @returns The truncated vector.
     */
    function truncate(vector: Vector3, decimalPlaces?: number): Vector3;
    /**
     * Converts the provided degrees to radians.
     * @param degrees - The degrees to convert.
     * @returns The radians.
     */
    function degreesToRadians(degrees: number): number;
    /**
     * Returns the rotation vector of the provided orientation as compass degrees.
     * @param orientation - The orientation in compass degrees.
     * @returns The rotation vector.
     */
    function getRotationVector(orientation: number): mod.Vector;
    /**
     * Returns the rotation vector of the provided orientation as compass degrees.
     * @param orientation - The orientation in compass degrees.
     * @returns The rotation vector.
     */
    function getRotationVector3(orientation: number): Vector3;
    /**
     * Returns the distance between the provided vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The distance between the vectors.
     */
    function distance(a: Vector3, b: Vector3): number;
    /**
     * Checks if the provided value is a Vector3.
     * @param v - The value to check.
     * @returns Whether the value is a Vector3.
     */
    function isVector3(v: unknown): v is Vector3;
    /**
     * Returns the string representation of the provided mod.Vector.
     * @param vector - The mod.Vector to convert.
     * @param precision - The decimal precision of the string representation.
     * @returns The string representation of the mod.Vector.
     */
    function getVectorString(vector: mod.Vector, precision?: number): string;
    /**
     * Returns the string representation of the provided Vector3.
     * @param vector - The Vector3 to convert.
     * @param precision - The decimal precision of the string representation.
     * @returns The string representation of the Vector3.
     */
    function getVector3String(vector: Vector3, precision?: number): string;
}
