import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';

// version: 4.0.0
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

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    private _setContentEnabled(enabled: boolean): void {
        const contentWidget = UI.Element._getNativeWidget(this._content);

        if (!contentWidget) return;

        if (enabled) {
            mod.SetUIImageColor(contentWidget, this._content.imageColor ?? UI.COLORS.WHITE);
            mod.SetUIImageAlpha(contentWidget, this._content.imageAlpha ?? 1);
        } else {
            mod.SetUIImageColor(contentWidget, this._imageDisabledColor);
            mod.SetUIImageAlpha(contentWidget, this._imageDisabledAlpha);
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
        if (this._isDeletedCheck()) return this;

        super.setEnabled(enabled);
        this._setContentEnabled(enabled);
        return this;
    }

    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public get imageType(): mod.UIImageType | undefined {
        return this.getImageType();
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        this.setImageType(imageType);
    }

    /**
     * Retrieves the type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public getImageType(): mod.UIImageType | undefined {
        return this._isDeletedCheck() ? undefined : this._content.imageType;
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image button for chaining.
     */
    public setImageType(imageType: mod.UIImageType): this {
        if (this._isDeletedCheck()) return this;

        this._content.imageType = imageType;
        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    public get imageColor(): mod.Vector | undefined {
        return this.getImageColor();
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        this.setImageColor(color);
    }

    /**
     * Retrieves the color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    public getImageColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : this._content.imageColor;
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image button for chaining.
     */
    public setImageColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        this._content.imageColor = color;

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUIImageColor(contentWidget, color);
            }
        }
        return this;
    }

    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public get imageAlpha(): number | undefined {
        return this.getImageAlpha();
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        this.setImageAlpha(alpha);
    }

    /**
     * Retrieves the alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public getImageAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : this._content.imageAlpha;
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     * @returns This image button for chaining.
     */
    public setImageAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        this._content.imageAlpha = alpha;

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUIImageAlpha(contentWidget, alpha);
            }
        }
        return this;
    }

    /**
     * The disabled color of the image, or undefined if deleted.
     * @returns The disabled image color vector, or undefined if deleted.
     */
    public get imageDisabledColor(): mod.Vector | undefined {
        return this.getImageDisabledColor();
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    public set imageDisabledColor(color: mod.Vector) {
        this.setImageDisabledColor(color);
    }

    /**
     * Retrieves the disabled color of the image, or undefined if deleted.
     * @returns The disabled image color vector, or undefined if deleted.
     */
    public getImageDisabledColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : this._imageDisabledColor;
    }

    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     * @returns This image button for chaining.
     */
    public setImageDisabledColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        this._imageDisabledColor = color;

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUIImageColor(contentWidget, color);
            }
        }
        return this;
    }

    /**
     * The disabled alpha of the image, or undefined if deleted.
     * @returns The disabled image alpha opacity, or undefined if deleted.
     */
    public get imageDisabledAlpha(): number | undefined {
        return this.getImageDisabledAlpha();
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     */
    public set imageDisabledAlpha(alpha: number) {
        this.setImageDisabledAlpha(alpha);
    }

    /**
     * Retrieves the disabled alpha of the image, or undefined if deleted.
     * @returns The disabled image alpha opacity, or undefined if deleted.
     */
    public getImageDisabledAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : this._imageDisabledAlpha;
    }

    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     * @returns This image button for chaining.
     */
    public setImageDisabledAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        this._imageDisabledAlpha = alpha;

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUIImageAlpha(contentWidget, alpha);
            }
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
