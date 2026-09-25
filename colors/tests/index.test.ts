import '../../ui/tests/mockMod.ts';
import { describe, expect, it } from 'vitest';
import { Colors } from '../index.ts';

describe('Colors Module', () => {
    describe('Presets', () => {
        it('has correct standard colors', () => {
            expect(Colors.BLACK).toEqual({ r: 0, g: 0, b: 0 });
            expect(Colors.WHITE).toEqual({ r: 1, g: 1, b: 1 });
            expect(Colors.RED).toEqual({ r: 1, g: 0, b: 0 });
            expect(Colors.GREEN).toEqual({ r: 0, g: 1, b: 0 });
            expect(Colors.BLUE).toEqual({ r: 0, g: 0, b: 1 });
        });

        it('has all presets in PRESETS object', () => {
            expect(Colors.PRESETS.RED).toBe(Colors.RED);
            expect(Colors.PRESETS.WHITE).toBe(Colors.WHITE);
            expect(Colors.PRESETS.BF_RED_BRIGHT).toBe(Colors.BF_RED_BRIGHT);
        });
    });

    describe('Basic Manipulation', () => {
        it('sets channels in place', () => {
            const target: Colors.Color = { r: 0, g: 0, b: 0 };
            const res = Colors.set(target, 0.2, 0.4, 0.6);
            expect(res).toBe(target);
            expect(target).toEqual({ r: 0.2, g: 0.4, b: 0.6 });
        });

        it('copies channels from source to target', () => {
            const target: Colors.Color = { r: 0, g: 0, b: 0 };
            const source: Colors.Color = { r: 0.1, g: 0.5, b: 0.9 };
            const res = Colors.copy(target, source);
            expect(res).toBe(target);
            expect(target).toEqual({ r: 0.1, g: 0.5, b: 0.9 });
        });

        it('clones a color into a new object', () => {
            const source: Colors.Color = { r: 0.3, g: 0.6, b: 0.9 };
            const cloned = Colors.clone(source);
            expect(cloned).toEqual(source);
            expect(cloned).not.toBe(source);
        });

        it('checks equality with and without tolerance', () => {
            const a: Colors.Color = { r: 0.5, g: 0.5, b: 0.5 };
            const b: Colors.Color = { r: 0.5, g: 0.5, b: 0.5 };
            const c: Colors.Color = { r: 0.505, g: 0.5, b: 0.5 };

            expect(Colors.equals(a, b)).toBe(true);
            expect(Colors.equals(a, c)).toBe(false);
            expect(Colors.equals(a, c, 0.01)).toBe(true);
        });

        it('clamps color channels to [0, 1]', () => {
            const c: Colors.Color = { r: -0.5, g: 1.5, b: 0.7 };
            expect(Colors.clamp(c)).toEqual({ r: 0, g: 1, b: 0.7 });

            const out: Colors.Color = { r: 0, g: 0, b: 0 };
            Colors.clamp(c, out);
            expect(out).toEqual({ r: 0, g: 1, b: 0.7 });
        });
    });

    describe('Math & Blending', () => {
        it('lerps between two colors', () => {
            const a = Colors.BLACK;
            const b = Colors.WHITE;
            expect(Colors.lerp(a, b, 0.5)).toEqual({ r: 0.5, g: 0.5, b: 0.5 });

            const out: Colors.Color = { r: 0, g: 0, b: 0 };
            const res = Colors.lerp(a, b, 0.25, out);
            expect(res).toBe(out);
            expect(out).toEqual({ r: 0.25, g: 0.25, b: 0.25 });
        });

        it('adds two colors', () => {
            const a: Colors.Color = { r: 0.1, g: 0.2, b: 0.3 };
            const b: Colors.Color = { r: 0.4, g: 0.5, b: 0.6 };
            expect(Colors.add(a, b)).toEqual({ r: 0.5, g: 0.7, b: 0.8999999999999999 });

            const out: Colors.Color = { r: 0, g: 0, b: 0 };
            Colors.add(a, b, out);
            expect(out.r).toBeCloseTo(0.5);
            expect(out.g).toBeCloseTo(0.7);
            expect(out.b).toBeCloseTo(0.9);
        });

        it('subtracts two colors', () => {
            const a: Colors.Color = { r: 0.8, g: 0.6, b: 0.4 };
            const b: Colors.Color = { r: 0.3, g: 0.2, b: 0.1 };
            const res = Colors.subtract(a, b);
            expect(res.r).toBeCloseTo(0.5);
            expect(res.g).toBeCloseTo(0.4);
            expect(res.b).toBeCloseTo(0.3);
        });

        it('multiplies by scalar', () => {
            const a: Colors.Color = { r: 0.2, g: 0.4, b: 0.5 };
            expect(Colors.multiply(a, 2)).toEqual({ r: 0.4, g: 0.8, b: 1 });
        });

        it('divides by scalar', () => {
            const a: Colors.Color = { r: 0.4, g: 0.8, b: 1 };
            expect(Colors.divide(a, 2)).toEqual({ r: 0.2, g: 0.4, b: 0.5 });
        });

        it('tints (Hadamard product)', () => {
            const a: Colors.Color = { r: 1.0, g: 0.5, b: 0.2 };
            const b: Colors.Color = { r: 0.5, g: 0.5, b: 0.5 };
            expect(Colors.tint(a, b)).toEqual({ r: 0.5, g: 0.25, b: 0.1 });
        });

        it('computes luminance', () => {
            expect(Colors.luminance(Colors.BLACK)).toBe(0);
            expect(Colors.luminance(Colors.WHITE)).toBeCloseTo(1.0);
            expect(Colors.luminance(Colors.RED)).toBeCloseTo(0.2126);
            expect(Colors.luminance(Colors.GREEN)).toBeCloseTo(0.7152);
            expect(Colors.luminance(Colors.BLUE)).toBeCloseTo(0.0722);
        });
    });

    describe('Format Conversions', () => {
        it('parses 6-digit hex strings with and without #', () => {
            const c1 = Colors.fromHex('#FF0000');
            expect(c1.r).toBeCloseTo(1);
            expect(c1.g).toBe(0);
            expect(c1.b).toBe(0);

            const c2 = Colors.fromHex('00FF00');
            expect(c2.r).toBe(0);
            expect(c2.g).toBeCloseTo(1);
            expect(c2.b).toBe(0);
        });

        it('parses 3-digit shorthand hex strings', () => {
            const c = Colors.fromHex('#F80');
            expect(c.r).toBeCloseTo(1);
            expect(c.g).toBeCloseTo(0.5333, 3);
            expect(c.b).toBe(0);
        });

        it('converts to uppercase 6-digit hex string', () => {
            expect(Colors.toHex({ r: 1, g: 0, b: 0 })).toBe('#FF0000');
            expect(Colors.toHex({ r: 0, g: 1, b: 0 })).toBe('#00FF00');
            expect(Colors.toHex({ r: 0, g: 0, b: 1 })).toBe('#0000FF');
            expect(Colors.toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
            expect(Colors.toHex({ r: 1, g: 1, b: 1 })).toBe('#FFFFFF');
        });
    });

    describe('Vector3 & Engine Interop', () => {
        it('converts to and from Vector3 ({ x, y, z })', () => {
            const color: Colors.Color = { r: 0.1, g: 0.2, b: 0.3 };
            const vec = Colors.toVector3(color);
            expect(vec).toEqual({ x: 0.1, y: 0.2, z: 0.3 });

            const outColor: Colors.Color = { r: 0, g: 0, b: 0 };
            Colors.fromVector3(vec, outColor);
            expect(outColor).toEqual(color);
        });

        it('converts to and from mod.Vector', () => {
            const color: Colors.Color = { r: 0.4, g: 0.5, b: 0.6 };
            const modVec = Colors.toVector(color);
            expect(mod.XComponentOf(modVec)).toBe(0.4);
            expect(mod.YComponentOf(modVec)).toBe(0.5);
            expect(mod.ZComponentOf(modVec)).toBe(0.6);

            const recovered = Colors.fromVector(modVec);
            expect(recovered).toEqual(color);
        });
    });
});
