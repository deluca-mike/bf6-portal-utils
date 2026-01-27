import { UI } from '../../index.ts';
export declare class UIImage extends UI.Element {
    protected _imageType: mod.UIImageType;
    protected _imageColor: mod.Vector;
    protected _imageAlpha: number;
    constructor(params: UIImage.Params);
    get imageType(): mod.UIImageType;
    set imageType(imageType: mod.UIImageType);
    setImageType(imageType: mod.UIImageType): this;
    get imageAlpha(): number;
    set imageAlpha(alpha: number);
    setImageAlpha(alpha: number): this;
    get imageColor(): mod.Vector;
    set imageColor(color: mod.Vector);
    setImageColor(color: mod.Vector): this;
}
export declare namespace UIImage {
    type Params = UI.ElementParams & {
        imageType: mod.UIImageType;
        imageColor?: mod.Vector;
        imageAlpha?: number;
    };
}
