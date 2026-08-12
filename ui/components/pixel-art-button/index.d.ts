import { Colors } from '../../../colors/index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIPixelArt } from '../pixel-art/index.ts';
export declare class UIPixelArtButton extends UIContentButton<UIPixelArt> {
    private static readonly _scratchPixelArtParams;
    /**
     * Creates a new pixel art button.
     * @param params - The parameters for the pixel art button.
     */
    constructor(params: UIPixelArtButton.Params);
    protected _setContentEnabled(enabled: boolean): void;
    /**
     * The inner UIPixelArt instance, or undefined if deleted.
     * @returns The inner pixel art element, or undefined if deleted.
     */
    get pixelArt(): UIPixelArt | undefined;
    /**
     * Whether the underlying pixel art image is monochrome, or undefined if deleted.
     * @returns True if monochrome, false if multi-color, or undefined if deleted.
     */
    get isMonochrome(): boolean | undefined;
    /**
     * The current lifecycle state of the pixel art (Idle, Drawing, Updating, Deleting),
     * or undefined if deleted.
     * @returns The lifecycle state, or undefined if deleted.
     */
    get state(): UIPixelArt.State | undefined;
    /**
     * The rendering progress percentage of the pixel art (0 to 100),
     * or undefined if deleted.
     * @returns The rendering progress, or undefined if deleted.
     */
    get progress(): number | undefined;
    /**
     * Whether the pixel art has completed rendering, or undefined if deleted.
     * @returns True if ready, false if actively drawing/updating, or undefined if deleted.
     */
    get isReady(): boolean | undefined;
    /**
     * The total native draw calls (widgets) created for the pixel art, or undefined if deleted.
     * @returns The total draw call count, or undefined if deleted.
     */
    get drawCallCount(): number | undefined;
    /**
     * The foreground tint color of the pixel art when enabled (monochrome only), or undefined if deleted.
     * @returns The enabled pixel art color, or undefined if deleted.
     */
    get pixelArtColor(): Colors.Color | undefined;
    /**
     * Retrieves the enabled pixel art color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The enabled pixel art color, or undefined if deleted.
     */
    getPixelArtColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the enabled foreground tint color of the pixel art (monochrome only).
     * @param color - The new enabled color.
     */
    set pixelArtColor(color: Colors.Color);
    /**
     * Sets the enabled foreground tint color of the pixel art (monochrome only).
     * @param color - The new enabled color.
     * @returns This pixel art button for chaining.
     */
    setPixelArtColor(color: Colors.Color): this;
    /**
     * The disabled color of the pixel art (monochrome only), or undefined if deleted.
     * @returns The disabled pixel art color, or undefined if deleted.
     */
    get pixelArtDisabledColor(): Colors.Color | undefined;
    /**
     * Retrieves the disabled pixel art color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled pixel art color, or undefined if deleted.
     */
    getPixelArtDisabledColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the disabled color of the pixel art (monochrome only).
     * @param color - The new disabled color.
     */
    set pixelArtDisabledColor(color: Colors.Color);
    /**
     * Sets the disabled color of the pixel art (monochrome only).
     * @param color - The new disabled color.
     * @returns This pixel art button for chaining.
     */
    setPixelArtDisabledColor(color: Colors.Color): this;
}
export declare namespace UIPixelArtButton {
    /**
     * The parameters for creating a new pixel art button.
     */
    type Params = UIBaseButton.Params &
        UIPixelArt.Params & {
            /** Foreground tint color of the pixel art when enabled (monochrome only). */
            pixelArtColor?: Colors.Color;
            /** Foreground tint color of the pixel art when disabled (monochrome only). Defaults to UI.COLORS.BF_GREY_2. */
            pixelArtDisabledColor?: Colors.Color;
        };
}
