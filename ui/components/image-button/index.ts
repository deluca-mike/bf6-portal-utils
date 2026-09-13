import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIImage } from '../image/index.ts';

// version: 10.0.0
export class UIImageButton extends UIContentButton<UIImage> {
    private static readonly _imageRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);
    private static readonly _imageDisabledRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    /**
     * Creates a new image button.
     * @param params - The parameters for the image button.
     */
    public constructor(params: UIImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIImage => {
            const imageParams: UIImage.Params = {
                parent,
                width,
                height,
                imageType: params.imageType,
                imageColor: params.imageColor,
                imageAlpha: params.imageAlpha,
                depth: params.depth,
            };

            return new UIImage(imageParams);
        };

        super(params, createContent);

        if (!this._isValid) return;

        const btnSlot = this._buttonSlot;
        const imageColor = params.imageColor ?? UI.COLORS.WHITE;
        const imageAlpha = params.imageAlpha ?? 1;
        const imageDisabledColor = params.imageDisabledColor ?? UI.COLORS.BF_GREY_2;
        const imageDisabledAlpha = params.imageDisabledAlpha ?? 1;

        UIImageButton._imageRgba[btnSlot] = UIImageButton._packRgba(imageColor, imageAlpha);
        UIImageButton._imageDisabledRgba[btnSlot] = UIImageButton._packRgba(imageDisabledColor, imageDisabledAlpha);

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const btnSlot = this._buttonSlot;

        if (btnSlot !== UIBaseButton._INVALID_INDEX) {
            UIImageButton._imageRgba[btnSlot] = 0;
            UIImageButton._imageDisabledRgba[btnSlot] = 0;
        }

        super.delete();
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!content || !contentWidget) return;

        const rgba = enabled ? UIImageButton._imageRgba[btnSlot] : UIImageButton._imageDisabledRgba[btnSlot];
        const color = UIImageButton._unpackColor(rgba);
        const alpha = UIImageButton._unpackAlpha(rgba);

        content.setImageColor(color);
        content.setImageAlpha(alpha);
    }

    /**
     * @inheritdoc
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public override get enabled(): boolean | undefined {
        return super.enabled;
    }

    /**
     * @inheritdoc
     */
    public override set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * @inheritdoc
     * @returns This image button for chaining.
     */
    public override setEnabled(enabled: boolean): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        super.setEnabled(enabled);
        this._setContentEnabled(enabled);

        return this;
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
            : UIImageButton._unpackColor(UIImageButton._imageRgba[btnSlot]);
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
            : UIImageButton._unpackColor(UIImageButton._imageRgba[btnSlot], out);
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

        UIImageButton._setRgb(UIImageButton._imageRgba, btnSlot, color);

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
            : UIImageButton._unpackAlpha(UIImageButton._imageRgba[btnSlot]);
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

        UIImageButton._setAlpha(UIImageButton._imageRgba, btnSlot, alpha);

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
            : UIImageButton._unpackColor(UIImageButton._imageDisabledRgba[btnSlot]);
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
            : UIImageButton._unpackColor(UIImageButton._imageDisabledRgba[btnSlot], out);
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

        UIImageButton._setRgb(UIImageButton._imageDisabledRgba, btnSlot, color);

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
            : UIImageButton._unpackAlpha(UIImageButton._imageDisabledRgba[btnSlot]);
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

        UIImageButton._setAlpha(UIImageButton._imageDisabledRgba, btnSlot, alpha);

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
