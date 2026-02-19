// version: 1.0.0
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
     * The zero Vector3.
     */
    export const ZERO_VECTOR3: Vector3 = { x: 0, y: 0, z: 0 };

    /**
     * The one Vector3.
     */
    export const ONE_VECTOR3: Vector3 = { x: 1, y: 1, z: 1 };

    /**
     * The zero mod.Vector.
     */
    export const ZERO_VECTOR: mod.Vector = mod.CreateVector(0, 0, 0);

    /**
     * The one mod.Vector.
     */
    export const ONE_VECTOR: mod.Vector = mod.CreateVector(1, 1, 1);

    /**
     * Converts the provided vector to a mod.Vector.
     * @param vector - The vector to convert.
     * @returns The mod.Vector.
     */
    export function toVector(vector: Vector3): mod.Vector {
        return mod.CreateVector(vector.x, vector.y, vector.z);
    }

    /**
     * Converts the provided mod.Vector to a Vector3.
     * @param vector - The mod.Vector to convert.
     * @returns The Vector3.
     */
    export function toVector3(vector: mod.Vector): Vector3 {
        return {
            x: mod.XComponentOf(vector),
            y: mod.YComponentOf(vector),
            z: mod.ZComponentOf(vector),
        };
    }

    /**
     * Adds the provided vectors.
     * @param vector - The first vector.
     * @param other - The second vector.
     * @returns The sum of the vectors.
     */
    export function add(vector: Vector3, other: Vector3): Vector3 {
        return {
            x: vector.x + other.x,
            y: vector.y + other.y,
            z: vector.z + other.z,
        };
    }

    /**
     * Subtracts the provided vectors.
     * @param vector - The first vector.
     * @param other - The second vector.
     * @returns The difference of the vectors.
     */
    export function subtract(vector: Vector3, other: Vector3): Vector3 {
        return {
            x: vector.x - other.x,
            y: vector.y - other.y,
            z: vector.z - other.z,
        };
    }

    /**
     * Multiplies the provided vector by the provided scalar.
     * @param vector - The vector to multiply.
     * @param scalar - The scalar to multiply the vector by.
     * @returns The multiplied vector.
     */
    export function multiply(vector: Vector3, scalar: number): Vector3 {
        return {
            x: vector.x * scalar,
            y: vector.y * scalar,
            z: vector.z * scalar,
        };
    }

    /**
     * Divides the provided vector by the provided scalar.
     * @param vector - The vector to divide.
     * @param scalar - The scalar to divide the vector by.
     * @returns The divided vector.
     */
    export function divide(vector: Vector3, scalar: number): Vector3 {
        return {
            x: vector.x / scalar,
            y: vector.y / scalar,
            z: vector.z / scalar,
        };
    }

    /**
     * Truncates the provided vector to the provided number of decimal places.
     * @param vector - The vector to truncate.
     * @param decimalPlaces - The number of decimal places to truncate the vector to.
     * @returns The truncated vector.
     */
    export function truncate(vector: Vector3, decimalPlaces: number = 2): Vector3 {
        const scale = 10 ** Math.max(decimalPlaces, 0);
        return {
            x: ~~(vector.x * scale) / scale,
            y: ~~(vector.y * scale) / scale,
            z: ~~(vector.z * scale) / scale,
        };
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
     * Returns the rotation vector of the provided orientation as compass degrees.
     * @param orientation - The orientation in compass degrees.
     * @returns The rotation vector.
     */
    export function getRotationVector(orientation: number): mod.Vector {
        return mod.CreateVector(0, degreesToRadians(180 - orientation), 0);
    }

    /**
     * Returns the rotation vector of the provided orientation as compass degrees.
     * @param orientation - The orientation in compass degrees.
     * @returns The rotation vector.
     */
    export function getRotationVector3(orientation: number): Vector3 {
        return {
            x: 0,
            y: degreesToRadians(180 - orientation),
            z: 0,
        };
    }

    /**
     * Returns the distance between the provided vectors.
     * @param a - The first vector.
     * @param b - The second vector.
     * @returns The distance between the vectors.
     */
    export function distance(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Checks if the provided value is a Vector3.
     * @param v - The value to check.
     * @returns Whether the value is a Vector3.
     */
    export function isVector3(v: unknown): v is Vector3 {
        if (v === null || typeof v !== 'object') return false;

        const vector = v as Record<string, unknown>;

        return typeof vector.x === 'number' && typeof vector.y === 'number' && typeof vector.z === 'number';
    }

    /**
     * Returns the string representation of the provided mod.Vector.
     * @param vector - The mod.Vector to convert.
     * @param precision - The decimal precision of the string representation.
     * @returns The string representation of the mod.Vector.
     */
    export function getVectorString(vector: mod.Vector, precision: number = 2): string {
        return `<${mod.XComponentOf(vector).toFixed(precision)}, ${mod.YComponentOf(vector).toFixed(precision)}, ${mod.ZComponentOf(vector).toFixed(precision)}>`;
    }

    /**
     * Returns the string representation of the provided Vector3.
     * @param vector - The Vector3 to convert.
     * @param precision - The decimal precision of the string representation.
     * @returns The string representation of the Vector3.
     */
    export function getVector3String(vector: Vector3, precision: number = 2): string {
        return `<${vector.x.toFixed(precision)}, ${vector.y.toFixed(precision)}, ${vector.z.toFixed(precision)}>`;
    }
}
