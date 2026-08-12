import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';

// version: 2.0.0
export class UIImageButton extends UIContentButton<UIImage> {
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

        super(params, createContent);

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
     * The type of the image.
     * @returns The image type.
     */
    public get imageType(): mod.UIImageType {
        return this._content.imageType;
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        if (this._isDeletedCheck()) return;

        this._content.imageType = imageType;
    }

    /**
     * The color of the image.
     * @returns The image color vector.
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
     * The alpha of the image.
     * @returns The image alpha opacity.
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
     * The disabled color of the image.
     * @returns The disabled image color vector.
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
     * The disabled alpha of the image.
     * @returns The disabled image alpha opacity.
     */
    public get imageDisabledAlpha(): number {
        return this._imageDisabledAlpha;
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     */
    public set imageDisabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._imageDisabledAlpha = alpha;

        if (!this._button.enabled) {
            mod.SetUIImageAlpha(this._content.uiWidget, alpha);
        }
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
