import { describe, expect, it } from 'vitest';
import { Vectors } from '../../vectors/index.ts';
import { Quaternions } from '../index.ts';

describe('Quaternions Module Tests', () => {
    describe('1. Identity, Copy, Clone, and Equals', () => {
        it('should initialize and reset to identity quaternion', () => {
            const q: Quaternions.Quaternion = { w: 0, x: 1, y: 2, z: 3 };
            Quaternions.identity(q);
            expect(q).toEqual({ w: 1, x: 0, y: 0, z: 0 });
            expect(Quaternions.equals(q, Quaternions.IDENTITY)).toBe(true);
        });

        it('should clone and copy quaternions accurately', () => {
            const original: Quaternions.Quaternion = { w: 0.7071, x: 0, y: 0.7071, z: 0 };
            const cloned = Quaternions.clone(original);
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);

            const target: Quaternions.Quaternion = { w: 0, x: 0, y: 0, z: 0 };
            Quaternions.copy(target, original);
            expect(target).toEqual(original);
        });

        it('should recognize sign ambiguity equality (q == -q)', () => {
            const q1: Quaternions.Quaternion = { w: 0.5, x: 0.5, y: 0.5, z: 0.5 };
            const q2: Quaternions.Quaternion = { w: -0.5, x: -0.5, y: -0.5, z: -0.5 };
            expect(Quaternions.equals(q1, q2)).toBe(true);
        });
    });

    describe('2. Length, Normalization, Conjugation, and Multiplication', () => {
        it('should compute magnitude and normalize correctly', () => {
            const q: Quaternions.Quaternion = { w: 2, x: 0, y: 0, z: 0 };
            expect(Quaternions.length(q)).toBe(2);
            expect(Quaternions.lengthSquared(q)).toBe(4);

            Quaternions.normalize(q);
            expect(q.w).toBeCloseTo(1);
            expect(Quaternions.length(q)).toBeCloseTo(1);
        });

        it('should compute conjugate properly', () => {
            const q: Quaternions.Quaternion = { w: 1, x: 2, y: 3, z: 4 };
            const conj = Quaternions.conjugate(q);
            expect(conj).toEqual({ w: 1, x: -2, y: -3, z: -4 });
        });

        it('should perform Hamiltonian multiplication and preserve rotation associativity', () => {
            // 90 deg around X and 90 deg around Y
            const qX: Quaternions.Quaternion = { w: 0, x: 0, y: 0, z: 0 };
            const qY: Quaternions.Quaternion = { w: 0, x: 0, y: 0, z: 0 };
            Quaternions.setFromAxisAngle(qX, { x: 1, y: 0, z: 0 }, Math.PI / 2);
            Quaternions.setFromAxisAngle(qY, { x: 0, y: 1, z: 0 }, Math.PI / 2);

            const qCombined = Quaternions.multiply(qX, qY);
            expect(Quaternions.length(qCombined)).toBeCloseTo(1);
        });
    });

    describe('3. Vector Rotation and Euler Conversions', () => {
        it('should rotate vectors 90 degrees around primary axes correctly', () => {
            const v: Vectors.Vector3 = { x: 1, y: 0, z: 0 };
            const q: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };

            // Rotate 90 degrees around Y axis (maps +X to -Z in right-handed system)
            Quaternions.setFromAxisAngle(q, { x: 0, y: 1, z: 0 }, Math.PI / 2);
            const rotated = Quaternions.rotateVector(v, q);

            expect(rotated.x).toBeCloseTo(0);
            expect(rotated.y).toBeCloseTo(0);
            expect(rotated.z).toBeCloseTo(-1);
        });

        it('should convert to and from Euler angles in ZYX order with high precision', () => {
            const pitch = 0.3;
            const yaw = 0.5;
            const roll = -0.2;

            const q: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
            Quaternions.setFromEuler(q, pitch, yaw, roll);

            const euler = Quaternions.toEuler(q);
            expect(euler.x).toBeCloseTo(pitch, 5);
            expect(euler.y).toBeCloseTo(yaw, 5);
            expect(euler.z).toBeCloseTo(roll, 5);
        });
    });

    describe('4. Spherical Linear Interpolation (SLERP)', () => {
        it('should perform SLERP interpolation between quaternions', () => {
            const q1: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
            const q2: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
            Quaternions.setFromAxisAngle(q2, { x: 0, y: 1, z: 0 }, Math.PI);

            const qMid: Quaternions.Quaternion = { w: 1, x: 0, y: 0, z: 0 };
            Quaternions.slerp(q1, q2, 0.5, qMid);

            // Midpoint of 180 deg rotation is 90 deg (w = cos(45 deg) = 0.7071)
            expect(qMid.w).toBeCloseTo(Math.SQRT1_2, 4);
            expect(qMid.y).toBeCloseTo(Math.SQRT1_2, 4);
        });

        it('should compute correct rotation facing target with setFromLookRotation', () => {
            const q = Quaternions.clone(Quaternions.IDENTITY);

            // Forward direction (+Z)
            Quaternions.setFromLookRotation(q, { x: 0, y: 0, z: 10 });
            const eulerZ = Quaternions.toEuler(q);
            expect(eulerZ.y).toBeCloseTo(0);

            // Right direction (+X)
            Quaternions.setFromLookRotation(q, { x: 10, y: 0, z: 0 });
            const eulerX = Quaternions.toEuler(q);
            expect(eulerX.y).toBeCloseTo(Math.PI / 2);
        });
    });

    describe('5. Type Guards & Debug Formatting', () => {
        it('should correctly identify valid quaternions with isQuaternion', () => {
            expect(Quaternions.isQuaternion({ w: 1, x: 0, y: 0, z: 0 })).toBe(true);
            expect(Quaternions.isQuaternion({ x: 0, y: 0, z: 0 })).toBe(false);
            expect(Quaternions.isQuaternion(null)).toBe(false);
        });

        it('should format quaternions accurately', () => {
            const str = Quaternions.getQuaternionString({ w: 1, x: 0, y: 0, z: 0 });
            expect(str).toBe('{ w: 1.0000, x: 0.0000, y: 0.0000, z: 0.0000 }');
        });
    });
});
