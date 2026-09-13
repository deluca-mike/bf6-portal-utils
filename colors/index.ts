import { Vectors } from '../vectors/index.ts';

// version: 1.0.0
export namespace Colors {
    /**
     * A transparent 3-channel RGB color where r, g, b are normalized in the range [0, 1].
     */
    export type Color = {
        r: number;
        g: number;
        b: number;
    };

    /****** Standard & Battlefield Presets ******/

    export const BLACK: Readonly<Color> = Object.freeze({ r: 0, g: 0, b: 0 });
    export const GREY_25: Readonly<Color> = Object.freeze({ r: 0.25, g: 0.25, b: 0.25 });
    export const GREY_50: Readonly<Color> = Object.freeze({ r: 0.5, g: 0.5, b: 0.5 });
    export const GREY_75: Readonly<Color> = Object.freeze({ r: 0.75, g: 0.75, b: 0.75 });
    export const WHITE: Readonly<Color> = Object.freeze({ r: 1, g: 1, b: 1 });
    export const RED: Readonly<Color> = Object.freeze({ r: 1, g: 0, b: 0 });
    export const GREEN: Readonly<Color> = Object.freeze({ r: 0, g: 1, b: 0 });
    export const BLUE: Readonly<Color> = Object.freeze({ r: 0, g: 0, b: 1 });
    export const YELLOW: Readonly<Color> = Object.freeze({ r: 1, g: 1, b: 0 });
    export const PURPLE: Readonly<Color> = Object.freeze({ r: 1, g: 0, b: 1 });
    export const CYAN: Readonly<Color> = Object.freeze({ r: 0, g: 1, b: 1 });
    export const MAGENTA: Readonly<Color> = Object.freeze({ r: 1, g: 0, b: 1 });

    // Battlefield Brand Colors
    export const BF_GREY_1: Readonly<Color> = Object.freeze({ r: 0.8353, g: 0.9216, b: 0.9765 }); // #D5EBF9
    export const BF_GREY_2: Readonly<Color> = Object.freeze({ r: 0.3294, g: 0.3686, b: 0.3882 }); // #545E63
    export const BF_GREY_3: Readonly<Color> = Object.freeze({ r: 0.2118, g: 0.2235, b: 0.2353 }); // #36393C
    export const BF_GREY_4: Readonly<Color> = Object.freeze({ r: 0.0314, g: 0.0431, b: 0.0431 }); // #080B0B
    export const BF_BLUE_BRIGHT: Readonly<Color> = Object.freeze({ r: 0.4392, g: 0.9216, b: 1.0 }); // #70EBFF
    export const BF_BLUE_DARK: Readonly<Color> = Object.freeze({ r: 0.0745, g: 0.1843, b: 0.2471 }); // #132F3F
    export const BF_RED_BRIGHT: Readonly<Color> = Object.freeze({ r: 1.0, g: 0.5137, b: 0.3804 }); // #FF8361
    export const BF_RED_DARK: Readonly<Color> = Object.freeze({ r: 0.251, g: 0.0941, b: 0.0667 }); // #401811
    export const BF_GREEN_BRIGHT: Readonly<Color> = Object.freeze({ r: 0.6784, g: 0.9922, b: 0.5255 }); // #ADFD86
    export const BF_GREEN_DARK: Readonly<Color> = Object.freeze({ r: 0.2784, g: 0.4471, b: 0.2118 }); // #477236
    export const BF_YELLOW_BRIGHT: Readonly<Color> = Object.freeze({ r: 1.0, g: 0.9882, b: 0.6118 }); // #FFFC9C
    export const BF_YELLOW_DARK: Readonly<Color> = Object.freeze({ r: 0.4431, g: 0.3765, b: 0.0 }); // #716000

    /**
     * Dictionary of all color presets.
     */
    export const PRESETS = Object.freeze({
        BLACK,
        GREY_25,
        GREY_50,
        GREY_75,
        WHITE,
        RED,
        GREEN,
        BLUE,
        YELLOW,
        PURPLE,
        CYAN,
        MAGENTA,
        BF_GREY_1,
        BF_GREY_2,
        BF_GREY_3,
        BF_GREY_4,
        BF_BLUE_BRIGHT,
        BF_BLUE_DARK,
        BF_RED_BRIGHT,
        BF_RED_DARK,
        BF_GREEN_BRIGHT,
        BF_GREEN_DARK,
        BF_YELLOW_BRIGHT,
        BF_YELLOW_DARK,
    });

    /****** Manipulation & Math Utilities ******/

    /**
     * Sets the r, g, and b channels of the target color in place.
     * @param target - The color to modify.
     * @param r - The new red channel value [0, 1].
     * @param g - The new green channel value [0, 1].
     * @param b - The new blue channel value [0, 1].
     * @returns The modified target color.
     */
    export function set(target: Color, r: number, g: number, b: number): Color {
        target.r = r;
        target.g = g;
        target.b = b;

        return target;
    }

    /**
     * Copies channel values from source to target in place.
     * @param target - The destination color.
     * @param source - The source color.
     * @returns The modified target color.
     */
    export function copy(target: Color, source: Color): Color {
        target.r = source.r;
        target.g = source.g;
        target.b = source.b;

        return target;
    }

    /**
     * Creates a new cloned copy of the source color.
     * @param source - The color to clone.
     * @returns A new Color instance.
     */
    export function clone(source: Color): Color {
        return { r: source.r, g: source.g, b: source.b };
    }

    /**
     * Checks if two colors are equal within an optional per-channel tolerance.
     * @param a - The first color.
     * @param b - The second color.
     * @param tolerance - Maximum allowed delta per channel (default: 0).
     * @returns True if equal within tolerance, false otherwise.
     */
    export function equals(a: Color, b: Color, tolerance: number = 0): boolean {
        return tolerance === 0
            ? a.r === b.r && a.g === b.g && a.b === b.b
            : Math.abs(a.r - b.r) <= tolerance && Math.abs(a.g - b.g) <= tolerance && Math.abs(a.b - b.b) <= tolerance;
    }

    /**
     * Linearly interpolates between two colors.
     * @param a - Start color.
     * @param b - End color.
     * @param t - Interpolation factor (typically [0, 1]).
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The interpolated color.
     */
    export function lerp(a: Color, b: Color, t: number, out?: Color): Color {
        const rCh = a.r + (b.r - a.r) * t;
        const gCh = a.g + (b.g - a.g) * t;
        const bCh = a.b + (b.b - a.b) * t;

        if (!out) return { r: rCh, g: gCh, b: bCh };

        out.r = rCh;
        out.g = gCh;
        out.b = bCh;

        return out;
    }

    /**
     * Clamps all color channels to the valid [0, 1] range.
     * @param color - The color to clamp.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The clamped color.
     */
    export function clamp(color: Color, out?: Color): Color {
        const r = Math.min(Math.max(color.r, 0), 1);
        const g = Math.min(Math.max(color.g, 0), 1);
        const b = Math.min(Math.max(color.b, 0), 1);

        if (!out) return { r, g, b };

        out.r = r;
        out.g = g;
        out.b = b;

        return out;
    }

    /**
     * Adds two colors channel-wise.
     * @param a - First color.
     * @param b - Second color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The sum of both colors.
     */
    export function add(a: Color, b: Color, out?: Color): Color {
        const rCh = a.r + b.r;
        const gCh = a.g + b.g;
        const bCh = a.b + b.b;

        if (!out) return { r: rCh, g: gCh, b: bCh };

        out.r = rCh;
        out.g = gCh;
        out.b = bCh;

        return out;
    }

    /**
     * Subtracts color b from color a channel-wise (a - b).
     * @param a - First color.
     * @param b - Second color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The difference color.
     */
    export function subtract(a: Color, b: Color, out?: Color): Color {
        const rCh = a.r - b.r;
        const gCh = a.g - b.g;
        const bCh = a.b - b.b;

        if (!out) return { r: rCh, g: gCh, b: bCh };

        out.r = rCh;
        out.g = gCh;
        out.b = bCh;

        return out;
    }

    /**
     * Multiplies all color channels by a scalar brightness multiplier.
     * @param color - The base color.
     * @param scalar - The scalar multiplier.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The scaled color.
     */
    export function multiply(color: Color, scalar: number, out?: Color): Color {
        const r = color.r * scalar;
        const g = color.g * scalar;
        const b = color.b * scalar;

        if (!out) return { r, g, b };

        out.r = r;
        out.g = g;
        out.b = b;

        return out;
    }

    /**
     * Divides all color channels by a scalar divisor.
     * @param color - The base color.
     * @param scalar - The divisor scalar.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The divided color.
     */
    export function divide(color: Color, scalar: number, out?: Color): Color {
        const r = color.r / scalar;
        const g = color.g / scalar;
        const b = color.b / scalar;

        if (!out) return { r, g, b };

        out.r = r;
        out.g = g;
        out.b = b;

        return out;
    }

    /**
     * Performs element-wise modulation / tinting between two colors (Hadamard product: a * b).
     * @param a - Base color.
     * @param b - Tint color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The tinted color.
     */
    export function tint(a: Color, b: Color, out?: Color): Color {
        const rCh = a.r * b.r;
        const gCh = a.g * b.g;
        const bCh = a.b * b.b;

        if (!out) return { r: rCh, g: gCh, b: bCh };

        out.r = rCh;
        out.g = gCh;
        out.b = bCh;

        return out;
    }

    /**
     * Computes the standard perceived relative luminance of the color (ITU-R BT.709).
     * @param color - The color to evaluate.
     * @returns Perceived luminance in range [0, 1].
     */
    export function luminance(color: Color): number {
        return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    }

    /****** Format Conversions (Hex) ******/

    /**
     * Parses a hexadecimal color string into a normalized Color [0, 1].
     * Supports formats: "#RGB", "RGB", "#RRGGBB", "RRGGBB".
     * @param hex - The hex color string.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The parsed Color, or WHITE if parsing fails.
     */
    export function fromHex(hex: string, out?: Color): Color {
        const cleanHex = hex.charCodeAt(0) === 35 /* '#' */ ? hex.slice(1) : hex;

        let r = 1;
        let g = 1;
        let b = 1;

        if (cleanHex.length === 3) {
            const rChar = cleanHex.charAt(0);
            const gChar = cleanHex.charAt(1);
            const bChar = cleanHex.charAt(2);

            r = parseInt(rChar + rChar, 16) / 255;
            g = parseInt(gChar + gChar, 16) / 255;
            b = parseInt(bChar + bChar, 16) / 255;
        } else if (cleanHex.length === 6) {
            r = parseInt(cleanHex.slice(0, 2), 16) / 255;
            g = parseInt(cleanHex.slice(2, 4), 16) / 255;
            b = parseInt(cleanHex.slice(4, 6), 16) / 255;
        }

        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            r = 1;
            g = 1;
            b = 1;
        }

        if (!out) return { r, g, b };

        out.r = r;
        out.g = g;
        out.b = b;

        return out;
    }

    /**
     * Converts a normalized Color [0, 1] to a 6-digit uppercase hex string ("#RRGGBB").
     * @param color - The color to convert.
     * @returns The uppercase hex color string.
     */
    export function toHex(color: Color): string {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);

        const rHex = rInt < 16 ? '0' + rInt.toString(16) : rInt.toString(16);
        const gHex = gInt < 16 ? '0' + gInt.toString(16) : gInt.toString(16);
        const bHex = bInt < 16 ? '0' + bInt.toString(16) : bInt.toString(16);

        return ('#' + rHex + gHex + bHex).toUpperCase();
    }

    /****** Bridging to Engine (mod.Vector) & Vectors Module (Vector3) ******/

    /**
     * Converts a Color to an engine native `mod.Vector`.
     * @param color - The Color to convert.
     * @returns The engine native `mod.Vector`.
     */
    export function toVector(color: Color): mod.Vector {
        return mod.CreateVector(color.r, color.g, color.b);
    }

    /**
     * Converts an engine native `mod.Vector` to a transparent Color.
     * @param vector - The engine `mod.Vector` to convert.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The converted Color.
     */
    export function fromVector(vector: mod.Vector, out?: Color): Color {
        const r = mod.XComponentOf(vector);
        const g = mod.YComponentOf(vector);
        const b = mod.ZComponentOf(vector);

        if (!out) return { r, g, b };

        out.r = r;
        out.g = g;
        out.b = b;

        return out;
    }

    /**
     * Converts a Color ({ r, g, b }) to a Vector3 ({ x, y, z }).
     * @param color - The Color to convert.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The converted Vector3.
     */
    export function toVector3(color: Color, out?: Vectors.Vector3): Vectors.Vector3 {
        if (!out) return { x: color.r, y: color.g, z: color.b };

        out.x = color.r;
        out.y = color.g;
        out.z = color.b;

        return out;
    }

    /**
     * Converts a Vector3 ({ x, y, z }) to a Color ({ r, g, b }).
     * @param vector - The Vector3 to convert.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The converted Color.
     */
    export function fromVector3(vector: Vectors.Vector3, out?: Color): Color {
        if (!out) return { r: vector.x, g: vector.y, b: vector.z };

        out.r = vector.x;
        out.g = vector.y;
        out.b = vector.z;

        return out;
    }
}
