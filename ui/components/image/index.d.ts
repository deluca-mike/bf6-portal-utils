import { UI } from '../../index.ts';
export declare class UIImage extends UI.Element {
    protected _imageType: mod.UIImageType;
    protected _imageColor: mod.Vector;
    protected _imageAlpha: number;
    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    constructor(params: UIImage.Params);
    /**
     * The type of the image.
     */
    get imageType(): mod.UIImageType;
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    set imageType(imageType: mod.UIImageType);
    /**
     * Sets the type of the image. Useful for chaining operations.
     * @param imageType - The new type of the image.
     * @returns This element instance.
     */
    setImageType(imageType: mod.UIImageType): this;
    /**
     * The alpha of the image.
     */
    get imageAlpha(): number;
    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    set imageAlpha(alpha: number);
    /**
     * Sets the alpha of the image. Useful for chaining operations.
     * @param alpha - The new alpha of the image.
     * @returns This element instance.
     */
    setImageAlpha(alpha: number): this;
    /**
     * The color of the image.
     */
    get imageColor(): mod.Vector;
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    set imageColor(color: mod.Vector);
    /**
     * Sets the color of the image. Useful for chaining operations.
     * @param color - The new color of the image.
     * @returns This element instance.
     */
    setImageColor(color: mod.Vector): this;
}
export declare namespace UIImage {
    /**
     * The parameters for creating a new image.
     */
    type Params = UI.ElementParams & {
        imageType: mod.UIImageType;
        imageColor?: mod.Vector;
        imageAlpha?: number;
    };
}
