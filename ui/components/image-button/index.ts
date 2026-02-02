import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';

const IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['imageType'] as const;

// version: 1.0.1
export class UIImageButton extends UIContentButton<UIImage, typeof IMAGE_BUTTON_CONTENT_PROPERTIES> {
    // UIImage properties (delegated via delegateProperties)
    declare public imageType: mod.UIImageType;

    // UIImage setter methods (delegated via delegateProperties)
    declare public setImageType: (imageType: mod.UIImageType) => this;

    protected _imageDisabledColor: mod.Vector;

    protected _imageDisabledAlpha: number;

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

        super(params, createContent, IMAGE_BUTTON_CONTENT_PROPERTIES);

        this._imageDisabledColor = params.imageDisabledColor ?? UI.COLORS.BF_GREY_2;
        this._imageDisabledAlpha = params.imageDisabledAlpha ?? 1;

        if (!this._button.enabled) {
            this._setContentEnabled(false);
        }
    }

    private _setContentEnabled(enabled: boolean): void {
        if (enabled) {
            mod.SetUIImageColor(this._content.uiWidget, this._content.imageColor);
            mod.SetUIImageAlpha(this._content.uiWidget, this._content.imageAlpha);
        } else {
            mod.SetUIImageColor(this._content.uiWidget, this._imageDisabledColor);
            mod.SetUIImageAlpha(this._content.uiWidget, this._imageDisabledAlpha);
        }
    }

    /**
     * @inheritdoc
     */
    public override get enabled(): boolean {
        return this._button.enabled;
    }

    /**
     * @inheritdoc
     */
    public override set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        this._button.enabled = enabled;
        this._setContentEnabled(enabled);
    }

    /**
     * @inheritdoc
     */
    public override setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    /**
     * The color of the image.
     */
    public get imageColor(): mod.Vector {
        return this._content.imageColor;
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._content.imageColor = color;

        if (this._button.enabled) {
            mod.SetUIImageColor(this._content.uiWidget, color);
        }
    }

    /**
     * Sets the color of the image. Useful for chaining operations.
     * @param color - The new color of the image.
     * @returns This element instance.
     */
    public setImageColor(color: mod.Vector): this {
        this.imageColor = color;
        return this;
    }

    /**
     * The alpha of the image.
     */
    public get imageAlpha(): number {
        return this._content.imageAlpha;
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._content.imageAlpha = alpha;

        if (this._button.enabled) {
            mod.SetUIImageAlpha(this._content.uiWidget, alpha);
        }
    }

    /**
     * Sets the alpha of the image. Useful for chaining operations.
     * @param alpha - The new alpha of the image.
     * @returns This element instance.
     */
    public setImageAlpha(alpha: number): this {
        this.imageAlpha = alpha;
        return this;
    }

    /**
     * The disabled color of the image.
     */
    public get imageDisabledColor(): mod.Vector {
        return this._imageDisabledColor;
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    public set imageDisabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._imageDisabledColor = color;

        if (!this._button.enabled) {
            mod.SetUIImageColor(this._content.uiWidget, color);
        }
    }

    /**
     * Sets the disabled color of the image. Useful for chaining operations.
     * @param color - The new disabled color of the image.
     * @returns This element instance.
     */
    public setImageDisabledColor(color: mod.Vector): this {
        this.imageDisabledColor = color;
        return this;
    }

    /**
     * The disabled alpha of the image.
     */
    public get imageDisabledAlpha(): number {
        return this._imageDisabledAlpha;
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha of the image.
     */
    public set imageDisabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._imageDisabledAlpha = alpha;

        if (!this._button.enabled) {
            mod.SetUIImageAlpha(this._content.uiWidget, alpha);
        }
    }

    /**
     * Sets the disabled alpha of the image. Useful for chaining operations.
     * @param alpha - The new disabled alpha of the image.
     * @returns This element instance.
     */
    public setImageDisabledAlpha(alpha: number): this {
        this.imageDisabledAlpha = alpha;
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
