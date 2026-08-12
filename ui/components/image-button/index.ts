import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIImage } from '../image/index.ts';

// version: 10.0.0
export class UIImageButton extends UIContentButton<UIImage> {
    private static readonly _scratchImageParams: UIImage.Params = {
        imageType: null as unknown as UI.ImageType,
    };

    /**
     * Creates a new image button.
     * @param params - The parameters for the image button.
     */
    public constructor(params: UIImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIImage => {
            const scratch = UIImageButton._scratchImageParams;
            scratch.parent = parent;
            scratch.width = width;
            scratch.height = height;
            scratch.imageType = params.imageType;
            scratch.imageColor = params.imageColor;
            scratch.imageAlpha = params.imageAlpha;
            scratch.depth = params.depth;

            const image = new UIImage(scratch);

            scratch.parent = undefined;
            scratch.imageType = null as unknown as UI.ImageType;
            scratch.imageColor = undefined;

            return image;
        };

        super(params, createContent);

        if (!this._isValid) return;

        const btnSlot = this._buttonSlot;
        const imageColor = params.imageColor ?? UI.COLORS.WHITE;
        const imageAlpha = params.imageAlpha ?? 1;
        const imageDisabledColor = params.imageDisabledColor ?? UI.COLORS.BF_GREY_2;
        const imageDisabledAlpha = params.imageDisabledAlpha ?? 1;

        UIBaseButton._setAlpha(UIContentButton._contentRgba, btnSlot, imageAlpha);
        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, imageColor);
        UIBaseButton._setAlpha(UIContentButton._contentDisabledRgba, btnSlot, imageDisabledAlpha);
        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, imageDisabledColor);

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!content || !contentWidget) return;

        const rgba = enabled ? UIContentButton._contentRgba[btnSlot] : UIContentButton._contentDisabledRgba[btnSlot];
        const color = UIBaseButton._unpackColor(rgba);
        const alpha = UIBaseButton._unpackAlpha(rgba);

        content.setImageColor(color);
        content.setImageAlpha(alpha);
    }

    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public get imageType(): UI.ImageType | undefined {
        return this._isValid ? this.content?.imageType : undefined;
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: UI.ImageType) {
        this.setImageType(imageType);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image button for chaining.
     */
    public setImageType(imageType: UI.ImageType): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setImageType(imageType);

        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color, or undefined if deleted.
     */
    public get imageColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot]);
    }

    /**
     * Retrieves the image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The image color, or undefined if deleted.
     */
    public getImageColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot], out);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: Colors.Color) {
        this.setImageColor(color);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image button for chaining.
     */
    public setImageColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, color);

        if (this.enabled) {
            this.content?.setImageColor(color);
        }

        return this;
    }

    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public get imageAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackAlpha(UIContentButton._contentRgba[btnSlot]);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        this.setImageAlpha(alpha);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     * @returns This image button for chaining.
     */
    public setImageAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setAlpha(UIContentButton._contentRgba, btnSlot, alpha);

        if (this.enabled) {
            this.content?.setImageAlpha(alpha);
        }

        return this;
    }

    /**
     * The disabled color of the image, or undefined if deleted.
     * @returns The disabled image color, or undefined if deleted.
     */
    public get imageDisabledColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot]);
    }

    /**
     * Retrieves the disabled image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled image color, or undefined if deleted.
     */
    public getImageDisabledColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot], out);
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    public set imageDisabledColor(color: Colors.Color) {
        this.setImageDisabledColor(color);
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     * @returns This image button for chaining.
     */
    public setImageDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, color);

        if (!this.enabled) {
            this.content?.setImageColor(color);
        }

        return this;
    }

    /**
     * The disabled alpha of the image, or undefined if deleted.
     * @returns The disabled image alpha opacity, or undefined if deleted.
     */
    public get imageDisabledAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackAlpha(UIContentButton._contentDisabledRgba[btnSlot]);
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     */
    public set imageDisabledAlpha(alpha: number) {
        this.setImageDisabledAlpha(alpha);
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     * @returns This image button for chaining.
     */
    public setImageDisabledAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setAlpha(UIContentButton._contentDisabledRgba, btnSlot, alpha);

        if (!this.enabled) {
            this.content?.setImageAlpha(alpha);
        }

        return this;
    }
}

export namespace UIImageButton {
    /**
     * The parameters for creating a new image button.
     */
    export type Params = UIBaseButton.Params &
        UIImage.Params & {
            imageDisabledColor?: Colors.Color;
            imageDisabledAlpha?: number;
        };
}
