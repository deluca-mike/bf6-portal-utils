import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIPixelArt } from '../pixel-art/index.ts';

// version: 1.0.0
export class UIPixelArtButton extends UIContentButton<UIPixelArt> {
    private static readonly _scratchPixelArtParams: UIPixelArt.Params = {
        data: '',
    };

    /**
     * Creates a new pixel art button.
     * @param params - The parameters for the pixel art button.
     */
    public constructor(params: UIPixelArtButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIPixelArt => {
            const scratch = UIPixelArtButton._scratchPixelArtParams;
            scratch.parent = parent;
            scratch.width = width;
            scratch.height = height;
            scratch.data = params.data;
            scratch.color = params.pixelArtColor ?? params.color;
            scratch.depth = params.depth;

            const pixelArt = new UIPixelArt(scratch);

            scratch.parent = undefined;
            scratch.data = '';
            scratch.color = undefined;

            return pixelArt;
        };

        super(params, createContent);

        if (!this._isValid) return;

        const btnSlot = this._buttonSlot;
        const pixelArtColor = params.pixelArtColor ?? params.color ?? UI.COLORS.WHITE;
        const pixelArtDisabledColor = params.pixelArtDisabledColor ?? UI.COLORS.BF_GREY_2;

        UIBaseButton._setAlpha(UIContentButton._contentRgba, btnSlot, 1);
        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, pixelArtColor);
        UIBaseButton._setAlpha(UIContentButton._contentDisabledRgba, btnSlot, 1);
        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, pixelArtDisabledColor);

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!content || !contentWidget || !content.isMonochrome) return;

        const rgba = enabled ? UIContentButton._contentRgba[btnSlot] : UIContentButton._contentDisabledRgba[btnSlot];
        const color = UIBaseButton._unpackColor(rgba);

        content.setColor(color);
    }

    /**
     * The inner UIPixelArt instance, or undefined if deleted.
     * @returns The inner pixel art element, or undefined if deleted.
     */
    public get pixelArt(): UIPixelArt | undefined {
        return this.content;
    }

    /**
     * Whether the underlying pixel art image is monochrome, or undefined if deleted.
     * @returns True if monochrome, false if multi-color, or undefined if deleted.
     */
    public get isMonochrome(): boolean | undefined {
        return this._isValid ? this.content?.isMonochrome : undefined;
    }

    /**
     * The current lifecycle state of the pixel art (Idle, Drawing, Updating, Deleting),
     * or undefined if deleted.
     * @returns The lifecycle state, or undefined if deleted.
     */
    public get state(): UIPixelArt.State | undefined {
        return this._isValid ? this.content?.state : undefined;
    }

    /**
     * The rendering progress percentage of the pixel art (0 to 100),
     * or undefined if deleted.
     * @returns The rendering progress, or undefined if deleted.
     */
    public get progress(): number | undefined {
        return this._isValid ? this.content?.progress : undefined;
    }

    /**
     * Whether the pixel art has completed rendering, or undefined if deleted.
     * @returns True if ready, false if actively drawing/updating, or undefined if deleted.
     */
    public get isReady(): boolean | undefined {
        return this._isValid ? this.content?.isReady : undefined;
    }

    /**
     * The total native draw calls (widgets) created for the pixel art, or undefined if deleted.
     * @returns The total draw call count, or undefined if deleted.
     */
    public get drawCallCount(): number | undefined {
        return this._isValid ? this.content?.drawCallCount : undefined;
    }

    /**
     * The foreground tint color of the pixel art when enabled (monochrome only), or undefined if deleted.
     * @returns The enabled pixel art color, or undefined if deleted.
     */
    public get pixelArtColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot]);
    }

    /**
     * Retrieves the enabled pixel art color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The enabled pixel art color, or undefined if deleted.
     */
    public getPixelArtColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot], out);
    }

    /**
     * Sets the enabled foreground tint color of the pixel art (monochrome only).
     * @param color - The new enabled color.
     */
    public set pixelArtColor(color: Colors.Color) {
        this.setPixelArtColor(color);
    }

    /**
     * Sets the enabled foreground tint color of the pixel art (monochrome only).
     * @param color - The new enabled color.
     * @returns This pixel art button for chaining.
     */
    public setPixelArtColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, color);

        if (this.enabled && this.content?.isMonochrome) {
            this.content.setColor(color);
        }

        return this;
    }

    /**
     * The disabled color of the pixel art (monochrome only), or undefined if deleted.
     * @returns The disabled pixel art color, or undefined if deleted.
     */
    public get pixelArtDisabledColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot]);
    }

    /**
     * Retrieves the disabled pixel art color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled pixel art color, or undefined if deleted.
     */
    public getPixelArtDisabledColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot], out);
    }

    /**
     * Sets the disabled color of the pixel art (monochrome only).
     * @param color - The new disabled color.
     */
    public set pixelArtDisabledColor(color: Colors.Color) {
        this.setPixelArtDisabledColor(color);
    }

    /**
     * Sets the disabled color of the pixel art (monochrome only).
     * @param color - The new disabled color.
     * @returns This pixel art button for chaining.
     */
    public setPixelArtDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, color);

        if (!this.enabled && this.content?.isMonochrome) {
            this.content.setColor(color);
        }

        return this;
    }
}

export namespace UIPixelArtButton {
    /**
     * The parameters for creating a new pixel art button.
     */
    export type Params = UIBaseButton.Params &
        UIPixelArt.Params & {
            /** Foreground tint color of the pixel art when enabled (monochrome only). */
            pixelArtColor?: Colors.Color;
            /** Foreground tint color of the pixel art when disabled (monochrome only). Defaults to UI.COLORS.BF_GREY_2. */
            pixelArtDisabledColor?: Colors.Color;
        };
}
