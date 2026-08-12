import { Vectors } from '../vectors/index.ts';
export declare namespace Colors {
    /**
     * A transparent 3-channel RGB color where r, g, b are normalized in the range [0, 1].
     */
    type Color = {
        r: number;
        g: number;
        b: number;
    };
    /****** Standard & Battlefield Presets ******/
    const BLACK: Readonly<Color>;
    const GREY_25: Readonly<Color>;
    const GREY_50: Readonly<Color>;
    const GREY_75: Readonly<Color>;
    const WHITE: Readonly<Color>;
    const RED: Readonly<Color>;
    const GREEN: Readonly<Color>;
    const BLUE: Readonly<Color>;
    const YELLOW: Readonly<Color>;
    const PURPLE: Readonly<Color>;
    const CYAN: Readonly<Color>;
    const MAGENTA: Readonly<Color>;
    const BF_GREY_1: Readonly<Color>;
    const BF_GREY_2: Readonly<Color>;
    const BF_GREY_3: Readonly<Color>;
    const BF_GREY_4: Readonly<Color>;
    const BF_BLUE_BRIGHT: Readonly<Color>;
    const BF_BLUE_DARK: Readonly<Color>;
    const BF_RED_BRIGHT: Readonly<Color>;
    const BF_RED_DARK: Readonly<Color>;
    const BF_GREEN_BRIGHT: Readonly<Color>;
    const BF_GREEN_DARK: Readonly<Color>;
    const BF_YELLOW_BRIGHT: Readonly<Color>;
    const BF_YELLOW_DARK: Readonly<Color>;
    /**
     * Dictionary of all color presets.
     */
    const PRESETS: Readonly<{
        BLACK: Readonly<Color>;
        GREY_25: Readonly<Color>;
        GREY_50: Readonly<Color>;
        GREY_75: Readonly<Color>;
        WHITE: Readonly<Color>;
        RED: Readonly<Color>;
        GREEN: Readonly<Color>;
        BLUE: Readonly<Color>;
        YELLOW: Readonly<Color>;
        PURPLE: Readonly<Color>;
        CYAN: Readonly<Color>;
        MAGENTA: Readonly<Color>;
        BF_GREY_1: Readonly<Color>;
        BF_GREY_2: Readonly<Color>;
        BF_GREY_3: Readonly<Color>;
        BF_GREY_4: Readonly<Color>;
        BF_BLUE_BRIGHT: Readonly<Color>;
        BF_BLUE_DARK: Readonly<Color>;
        BF_RED_BRIGHT: Readonly<Color>;
        BF_RED_DARK: Readonly<Color>;
        BF_GREEN_BRIGHT: Readonly<Color>;
        BF_GREEN_DARK: Readonly<Color>;
        BF_YELLOW_BRIGHT: Readonly<Color>;
        BF_YELLOW_DARK: Readonly<Color>;
    }>;
    /****** Manipulation & Math Utilities ******/
    /**
     * Sets the r, g, and b channels of the target color in place.
     * @param target - The color to modify.
     * @param r - The new red channel value [0, 1].
     * @param g - The new green channel value [0, 1].
     * @param b - The new blue channel value [0, 1].
     * @returns The modified target color.
     */
    function set(target: Color, r: number, g: number, b: number): Color;
    /**
     * Copies channel values from source to target in place.
     * @param target - The destination color.
     * @param source - The source color.
     * @returns The modified target color.
     */
    function copy(target: Color, source: Color): Color;
    /**
     * Creates a new cloned copy of the source color.
     * @param source - The color to clone.
     * @returns A new Color instance.
     */
    function clone(source: Color): Color;
    /**
     * Checks if two colors are equal within an optional per-channel tolerance.
     * @param a - The first color.
     * @param b - The second color.
     * @param tolerance - Maximum allowed delta per channel (default: 0).
     * @returns True if equal within tolerance, false otherwise.
     */
    function equals(a: Color, b: Color, tolerance?: number): boolean;
    /**
     * Linearly interpolates between two colors.
     * @param a - Start color.
     * @param b - End color.
     * @param t - Interpolation factor (typically [0, 1]).
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The interpolated color.
     */
    function lerp(a: Color, b: Color, t: number, out?: Color): Color;
    /**
     * Clamps all color channels to the valid [0, 1] range.
     * @param color - The color to clamp.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The clamped color.
     */
    function clamp(color: Color, out?: Color): Color;
    /**
     * Adds two colors channel-wise.
     * @param a - First color.
     * @param b - Second color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The sum of both colors.
     */
    function add(a: Color, b: Color, out?: Color): Color;
    /**
     * Subtracts color b from color a channel-wise (a - b).
     * @param a - First color.
     * @param b - Second color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The difference color.
     */
    function subtract(a: Color, b: Color, out?: Color): Color;
    /**
     * Multiplies all color channels by a scalar brightness multiplier.
     * @param color - The base color.
     * @param scalar - The scalar multiplier.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The scaled color.
     */
    function multiply(color: Color, scalar: number, out?: Color): Color;
    /**
     * Divides all color channels by a scalar divisor.
     * @param color - The base color.
     * @param scalar - The divisor scalar.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The divided color.
     */
    function divide(color: Color, scalar: number, out?: Color): Color;
    /**
     * Performs element-wise modulation / tinting between two colors (Hadamard product: a * b).
     * @param a - Base color.
     * @param b - Tint color.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The tinted color.
     */
    function tint(a: Color, b: Color, out?: Color): Color;
    /**
     * Computes the standard perceived relative luminance of the color (ITU-R BT.709).
     * @param color - The color to evaluate.
     * @returns Perceived luminance in range [0, 1].
     */
    function luminance(color: Color): number;
    /****** Format Conversions (Hex) ******/
    /**
     * Parses a hexadecimal color string into a normalized Color [0, 1].
     * Supports formats: "#RGB", "RGB", "#RRGGBB", "RRGGBB".
     * @param hex - The hex color string.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The parsed Color, or WHITE if parsing fails.
     */
    function fromHex(hex: string, out?: Color): Color;
    /**
     * Converts a normalized Color [0, 1] to a 6-digit uppercase hex string ("#RRGGBB").
     * @param color - The color to convert.
     * @returns The uppercase hex color string.
     */
    function toHex(color: Color): string;
    /****** Bridging to Engine (mod.Vector) & Vectors Module (Vector3) ******/
    /**
     * Converts a Color to an engine native `mod.Vector`.
     * @param color - The Color to convert.
     * @returns The engine native `mod.Vector`.
     */
    function toVector(color: Color): mod.Vector;
    /**
     * Converts an engine native `mod.Vector` to a transparent Color.
     * @param vector - The engine `mod.Vector` to convert.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The converted Color.
     */
    function fromVector(vector: mod.Vector, out?: Color): Color;
    /**
     * Converts a Color ({ r, g, b }) to a Vector3 ({ x, y, z }).
     * @param color - The Color to convert.
     * @param out - Optional target Vector3 to write into for zero-allocation reuse.
     * @returns The converted Vector3.
     */
    function toVector3(color: Color, out?: Vectors.Vector3): Vectors.Vector3;
    /**
     * Converts a Vector3 ({ x, y, z }) to a Color ({ r, g, b }).
     * @param vector - The Vector3 to convert.
     * @param out - Optional target Color to write into for zero-allocation reuse.
     * @returns The converted Color.
     */
    function fromVector3(vector: Vectors.Vector3, out?: Color): Color;
}
