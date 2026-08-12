import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIImage } from '../image/index.ts';

// version: 9.0.0
export class UIImageButton extends UIContentButton<UIImage> {
    private static readonly _imageColors = new Array<mod.Vector | null>(UIBaseButton.MAX_BUTTONS);

    private static readonly _imageAlphas = new Float64Array(UIBaseButton.MAX_BUTTONS);

    private static readonly _imageDisabledColors = new Array<mod.Vector | null>(UIBaseButton.MAX_BUTTONS);

    private static readonly _imageDisabledAlphas = new Float64Array(UIBaseButton.MAX_BUTTONS);

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

        UIImageButton._imageColors[btnSlot] = params.imageColor ?? UI.COLORS.WHITE;
        UIImageButton._imageAlphas[btnSlot] = params.imageAlpha ?? 1;
        UIImageButton._imageDisabledColors[btnSlot] = params.imageDisabledColor ?? UI.COLORS.BF_GREY_2;
        UIImageButton._imageDisabledAlphas[btnSlot] = params.imageDisabledAlpha ?? 1;

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
            UIImageButton._imageColors[btnSlot] = null;
            UIImageButton._imageDisabledColors[btnSlot] = null;
            UIImageButton._imageAlphas[btnSlot] = 0;
            UIImageButton._imageDisabledAlphas[btnSlot] = 0;
        }

        super.delete();
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!contentWidget) return;

        if (enabled) {
            mod.SetUIImageColor(contentWidget, UIImageButton._imageColors[btnSlot]!);
            mod.SetUIImageAlpha(contentWidget, UIImageButton._imageAlphas[btnSlot]);
        } else {
            mod.SetUIImageColor(contentWidget, UIImageButton._imageDisabledColors[btnSlot]!);
            mod.SetUIImageAlpha(contentWidget, UIImageButton._imageDisabledAlphas[btnSlot]);
        }
    }

    /**
     * @inheritdoc
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
    public get imageType(): mod.UIImageType | undefined {
        return this._isValid ? this.content?.imageType : undefined;
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        this.setImageType(imageType);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image button for chaining.
     */
    public setImageType(imageType: mod.UIImageType): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setImageType(imageType);

        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    public get imageColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === -1 ? undefined : (UIImageButton._imageColors[btnSlot] ?? undefined);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        this.setImageColor(color);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image button for chaining.
     */
    public setImageColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIImageButton._imageColors[btnSlot] = color;

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

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UIImageButton._imageAlphas[btnSlot];
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

        UIImageButton._imageAlphas[btnSlot] = alpha;

        if (this.enabled) {
            this.content?.setImageAlpha(alpha);
        }

        return this;
    }

    /**
     * The disabled color of the image, or undefined if deleted.
     * @returns The disabled image color vector, or undefined if deleted.
     */
    public get imageDisabledColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : (UIImageButton._imageDisabledColors[btnSlot] ?? undefined);
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    public set imageDisabledColor(color: mod.Vector) {
        this.setImageDisabledColor(color);
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     * @returns This image button for chaining.
     */
    public setImageDisabledColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIImageButton._imageDisabledColors[btnSlot] = color;

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

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UIImageButton._imageDisabledAlphas[btnSlot];
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

        UIImageButton._imageDisabledAlphas[btnSlot] = alpha;

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
    export type Params = UIContentButton.Params &
        UIImage.Params & {
            imageDisabledColor?: mod.Vector;
            imageDisabledAlpha?: number;
        };
}
