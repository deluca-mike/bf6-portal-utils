import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';
declare const IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIImageButton extends UIContentButton<UIImage, typeof IMAGE_BUTTON_CONTENT_PROPERTIES> {
    imageType: mod.UIImageType;
    setImageType: (imageType: mod.UIImageType) => this;
    protected _imageDisabledColor: mod.Vector;
    protected _imageDisabledAlpha: number;
    constructor(params: UIImageButton.Params);
    private _setContentEnabled;
    get enabled(): boolean;
    set enabled(enabled: boolean);
    setEnabled(enabled: boolean): this;
    get imageColor(): mod.Vector;
    set imageColor(color: mod.Vector);
    setImageColor(color: mod.Vector): this;
    get imageAlpha(): number;
    set imageAlpha(alpha: number);
    setImageAlpha(alpha: number): this;
    get imageDisabledColor(): mod.Vector;
    set imageDisabledColor(color: mod.Vector);
    setImageDisabledColor(color: mod.Vector): this;
    get imageDisabledAlpha(): number;
    set imageDisabledAlpha(alpha: number);
    setImageDisabledAlpha(alpha: number): this;
}
export declare namespace UIImageButton {
    type Params = UIContentButton.Params &
        UIImage.Params & {
            imageDisabledColor?: mod.Vector;
            imageDisabledAlpha?: number;
        };
}
export {};
