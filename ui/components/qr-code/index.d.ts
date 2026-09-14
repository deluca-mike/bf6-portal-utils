import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
export declare class UIQRCode extends UI.Element {
    /**
     * The maximum number of QR code widgets that can exist concurrently in memory.
     */
    static readonly MAX_QR_CODES = 128;
    private static readonly BASE_MODULE_SIZE;
    private static readonly _MAX_GENERATIONS;
    private static _activeQrCodeCount;
    private static _firstFreeQrCode;
    private static readonly _generations;
    private static readonly _nextFreeQrCode;
    private static readonly _elementToQrCodeSlot;
    private static readonly _drawCallCounts;
    private static readonly _scales;
    private static readonly _margins;
    private static readonly _matrixSizes;
    private static readonly _childWidgets;
    private static readonly _visitedBuffer;
    /**
     * Returns the number of active QR code elements.
     * @returns The active QR code count.
     */
    static getActiveQRCodeCount(): number;
    /**
     * Resolves the 0-based QR code slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveQrCodeSlot(elementId: number): number;
    protected get _qrCodeSlot(): number;
    protected get _isValid(): boolean;
    /**
     * Resolves the 0-based QR code slot for this QR instance and logs a warning if invalid.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveQrCodeSlotAndLogWarning(): number;
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Allocates a QR code slot for this QR instance.
     * @returns The allocated QR slot index (0 to MAX_QR_CODES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateQrCodeSlot;
    /**
     * Frees the QR code slot associated with this QR instance.
     */
    private _freeQrCodeSlot;
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
     * @param qrSlot - The allocated QR code sub-pool slot.
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
     * @inheritdoc
     */
    delete(): void;
    /**
     * The total number of native draw calls (widgets) used to render this QR code.
     * @returns The total draw call count, or undefined if deleted.
     */
    get drawCallCount(): number | undefined;
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
     * @inheritdoc
     * @returns This element for chaining.
     */
    setBgColor(color: Colors.Color): this;
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
     * @inheritdoc
     * @returns This element for chaining.
     */
    setBgAlpha(alpha: number): this;
    /**
     * Updates the position and size of all child modules in place upon scale or margin change.
     * @param qrSlot - The QR code sub-pool slot index.
     */
    private _updateModuleLayout;
}
export declare namespace UIQRCode {
    /**
     * Represents a single child module container widget with its relative grid bounds.
     */
    interface ChildModule {
        widget: mod.UIWidget;
        col: number;
        row: number;
        spanW: number;
        spanH: number;
        isLight: boolean;
    }
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
