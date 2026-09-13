import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
export declare class UIQRCode extends UI.Element {
    private static readonly BASE_MODULE_SIZE;
    private static readonly _matrices;
    private static readonly _drawCallCounts;
    private static readonly _scales;
    private static readonly _margins;
    private static readonly _darkRgba;
    private static readonly _lightRgba;
    private static readonly _eccs;
    private static readonly _texts;
    private static readonly _childWidgets;
    private static readonly _visitedBuffer;
    private static _packRgba;
    private static _unpackColor;
    private static _unpackAlpha;
    private static _setRgb;
    private static _setAlpha;
    /**
     * Creates a new optimized QR code element.
     * @param params - The parameters for the QR code.
     */
    constructor(params: UIQRCode.Params);
    /**
     * Resolves the boolean matrix from parameters (either provided directly or encoded from text).
     * @param params - The initialization parameters.
     * @returns The resolved 2D boolean matrix, or null if neither was provided.
     */
    private static _resolveMatrix;
    /**
     * Normalizes a user-supplied matrix (with numbers or booleans) into a boolean matrix.
     * @param matrix - The input 2D matrix.
     * @returns A 2D boolean array.
     */
    private static _normalizeMatrix;
    /**
     * Renders the QR code sub-rectangles using the hybrid Painter's Algorithm + rectilinear merging.
     * @param matrix - The QR code boolean matrix.
     * @param totalWidth - Total pixel width.
     * @param totalHeight - Total pixel height.
     * @param scale - Scale multiplier.
     * @param margin - Margin in module units.
     * @param darkColor - Dark module color.
     * @param darkAlpha - Dark module opacity.
     * @param lightColor - Light module color.
     * @param lightAlpha - Light module opacity.
     */
    private _renderQR;
    /**
     * Clears and deletes all native child sub-rectangles.
     */
    private _clearChildWidgets;
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The total number of native draw calls (widgets) used to render this QR code.
     * @returns The total draw call count, or undefined if deleted.
     */
    get drawCallCount(): number | undefined;
    /**
     * The boolean QR matrix currently rendered, or undefined if deleted.
     * @returns The 2D boolean matrix, or undefined if deleted.
     */
    get matrix(): UIQRCode.BooleanMatrix | undefined;
    /**
     * The QR code version (1–40), or undefined if deleted or non-standard.
     * @returns The QR version number, or undefined.
     */
    get version(): number | undefined;
    /**
     * The text payload encoded by this QR code, or undefined if initialized via raw matrix.
     * @returns The text string, or undefined.
     */
    get text(): string | undefined;
    /**
     * The error correction level, or undefined if deleted or not specified.
     * @returns The ECC level, or undefined.
     */
    get ecc(): UIQRCode.ECC | undefined;
    /**
     * The scale multiplier applied to module sizing.
     * @returns The scale multiplier, or undefined if deleted.
     */
    get scale(): number | undefined;
    /**
     * Sets the scale of the QR code and re-renders child rectangles.
     * @param scale - The new scale multiplier.
     */
    set scale(scale: number);
    /**
     * Sets the scale of the QR code and re-renders child rectangles.
     * @param scale - The new scale multiplier.
     * @returns This element for chaining.
     */
    setScale(scale: number): this;
    /**
     * The margin (quiet zone) in module units.
     * @returns The margin count, or undefined if deleted.
     */
    get margin(): number | undefined;
    /**
     * Sets the margin (quiet zone) in module units and re-renders.
     * @param margin - The margin in module units.
     */
    set margin(margin: number);
    /**
     * Sets the margin (quiet zone) in module units and re-renders.
     * @param margin - The margin in module units.
     * @returns This element for chaining.
     */
    setMargin(margin: number): this;
    /**
     * The dark module color, or undefined if deleted.
     * @returns The dark module color, or undefined if deleted.
     */
    get darkColor(): Colors.Color | undefined;
    /**
     * Retrieves the dark module color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The dark module color, or undefined if deleted.
     */
    getDarkColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the dark module color.
     * @param color - The new dark module color.
     */
    set darkColor(color: Colors.Color);
    /**
     * Sets the dark module color.
     * @param color - The new dark module color.
     * @returns This element for chaining.
     */
    setDarkColor(color: Colors.Color): this;
    /**
     * The dark module alpha opacity, or undefined if deleted.
     * @returns The dark module alpha opacity, or undefined if deleted.
     */
    get darkAlpha(): number | undefined;
    /**
     * Sets the dark module alpha opacity.
     * @param alpha - The new dark module alpha opacity.
     */
    set darkAlpha(alpha: number);
    /**
     * Sets the dark module alpha opacity.
     * @param alpha - The new dark module alpha opacity.
     * @returns This element for chaining.
     */
    setDarkAlpha(alpha: number): this;
    /**
     * The light module (background) color, or undefined if deleted.
     * @returns The light color, or undefined if deleted.
     */
    get lightColor(): Colors.Color | undefined;
    /**
     * Retrieves the light module color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The light module color, or undefined if deleted.
     */
    getLightColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the light module (background) color.
     * @param color - The new light color.
     */
    set lightColor(color: Colors.Color);
    /**
     * Sets the light module (background) color.
     * @param color - The new light color.
     * @returns This element for chaining.
     */
    setLightColor(color: Colors.Color): this;
    /**
     * The light module alpha opacity, or undefined if deleted.
     * @returns The light module alpha opacity, or undefined if deleted.
     */
    get lightAlpha(): number | undefined;
    /**
     * Sets the light module alpha opacity.
     * @param alpha - The new light module alpha opacity.
     */
    set lightAlpha(alpha: number);
    /**
     * Sets the light module alpha opacity.
     * @param alpha - The new light module alpha opacity.
     * @returns This element for chaining.
     */
    setLightAlpha(alpha: number): this;
    /**
     * Dynamically updates the QR code with a new text payload and optional ECC level.
     * @param text - The text string to encode.
     * @param ecc - Optional error correction level (defaults to current or Medium).
     * @returns This element for chaining.
     */
    setText(text: string, ecc?: UIQRCode.ECC): this;
    /**
     * Dynamically updates the QR code with a new 2D boolean/number matrix.
     * @param matrix - The 2D matrix of numbers (1/0) or booleans.
     * @returns This element for chaining.
     */
    setMatrix(matrix: UIQRCode.Matrix): this;
    /**
     * Rebuilds all child widgets based on current matrix, size, colors, and margins.
     */
    private _rebuildQR;
}
export declare namespace UIQRCode {
    /**
     * Standard ISO/IEC 18004 alignment pattern center locations for versions 1 through 40.
     */
    const ALIGNMENT_POSITIONS: ReadonlyArray<ReadonlyArray<number>>;
    /**
     * 2D Matrix of numbers (1/0) or booleans representing QR module cells.
     */
    type Matrix = ReadonlyArray<ReadonlyArray<boolean | number>>;
    /**
     * 2D Matrix of booleans representing QR module cells.
     */
    type BooleanMatrix = ReadonlyArray<ReadonlyArray<boolean>>;
    /**
     * QR Code Error Correction Levels.
     */
    enum ECC {
        Low = 'L',
        Medium = 'M',
        Quartile = 'Q',
        High = 'H',
    }
    /**
     * The parameters for creating a new UIQRCode element.
     */
    type Params = UI.ElementParams & {
        /**
         * Text string to encode into a QR code. Mutually exclusive with `matrix`.
         */
        text?: string;
        /**
         * Optional pre-generated 2D matrix (array of rows containing 1/0 or true/false).
         */
        matrix?: UIQRCode.Matrix;
        /**
         * Error correction level when `text` is provided (defaults to `ECC.Medium`).
         */
        ecc?: UIQRCode.ECC;
        /**
         * Scale multiplier. When `1`, the smallest module is 10 units wide/tall. When `2`, it is 20 units. Defaults to `1`.
         */
        scale?: number;
        /**
         * Quiet zone margin in module units around the QR code (defaults to `0`).
         */
        margin?: number;
        /**
         * Color for dark modules (defaults to `UI.COLORS.BLACK`).
         */
        darkColor?: Colors.Color;
        /**
         * Opacity for dark modules (defaults to `1`).
         */
        darkAlpha?: number;
        /**
         * Color for light modules and background canvas (defaults to `UI.COLORS.WHITE`).
         */
        lightColor?: Colors.Color;
        /**
         * Opacity for light modules and background canvas (defaults to `1`).
         */
        lightAlpha?: number;
    };
    /**
     * Self-contained, zero-dependency QR code matrix generator.
     */
    namespace Encoder {
        /**
         * Encodes a text payload into a 2D boolean QR code matrix.
         * @param text - The text to encode.
         * @param ecc - Error correction level.
         * @returns 2D square boolean matrix.
         */
        function encode(text: string, ecc?: UIQRCode.ECC): boolean[][];
    }
}
