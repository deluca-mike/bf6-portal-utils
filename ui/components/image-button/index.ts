import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';

const IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['imageType'] as const;

// version: 1.0.0
export class UIImageButton extends UIContentButton<UIImage, typeof IMAGE_BUTTON_CONTENT_PROPERTIES> {
    // UIImage properties (delegated via delegateProperties)
    declare public imageType: mod.UIImageType;

    // UIImage setter methods (delegated via delegateProperties)
    declare public setImageType: (imageType: mod.UIImageType) => this;

    protected _imageDisabledColor: mod.Vector;

    protected _imageDisabledAlpha: number;

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

    public override get enabled(): boolean {
        return this._button.enabled;
    }

    public override set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        this._button.enabled = enabled;
        this._setContentEnabled(enabled);
    }

    public override setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    public get imageColor(): mod.Vector {
        return this._content.imageColor;
    }

    public set imageColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._content.imageColor = color;

        if (this._button.enabled) {
            mod.SetUIImageColor(this._content.uiWidget, color);
        }
    }

    public setImageColor(color: mod.Vector): this {
        this.imageColor = color;
        return this;
    }

    public get imageAlpha(): number {
        return this._content.imageAlpha;
    }

    public set imageAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._content.imageAlpha = alpha;

        if (this._button.enabled) {
            mod.SetUIImageAlpha(this._content.uiWidget, alpha);
        }
    }

    public setImageAlpha(alpha: number): this {
        this.imageAlpha = alpha;
        return this;
    }

    public get imageDisabledColor(): mod.Vector {
        return this._imageDisabledColor;
    }

    public set imageDisabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._imageDisabledColor = color;

        if (!this._button.enabled) {
            mod.SetUIImageColor(this._content.uiWidget, color);
        }
    }

    public setImageDisabledColor(color: mod.Vector): this {
        this.imageDisabledColor = color;
        return this;
    }

    public get imageDisabledAlpha(): number {
        return this._imageDisabledAlpha;
    }

    public set imageDisabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._imageDisabledAlpha = alpha;

        if (!this._button.enabled) {
            mod.SetUIImageAlpha(this._content.uiWidget, alpha);
        }
    }

    public setImageDisabledAlpha(alpha: number): this {
        this.imageDisabledAlpha = alpha;
        return this;
    }
}

export namespace UIImageButton {
    export type Params = UIContentButton.Params &
        UIImage.Params & {
            imageDisabledColor?: mod.Vector;
            imageDisabledAlpha?: number;
        };
}
