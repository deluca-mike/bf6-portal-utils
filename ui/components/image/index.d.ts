import { UI } from '../../index.ts';
export declare class UIImage extends UI.Element {
    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    constructor(params: UIImage.Params);
    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    get imageType(): mod.UIImageType | undefined;
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    set imageType(imageType: mod.UIImageType);
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image for chaining.
     */
    setImageType(imageType: mod.UIImageType): this;
    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    get imageAlpha(): number | undefined;
    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    set imageAlpha(alpha: number);
    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     * @returns This image for chaining.
     */
    setImageAlpha(alpha: number): this;
    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    get imageColor(): mod.Vector | undefined;
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    set imageColor(color: mod.Vector);
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image for chaining.
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
