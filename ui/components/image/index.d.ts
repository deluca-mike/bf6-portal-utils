import { UI } from '../../index.ts';
export declare class UIImage extends UI.Element {
    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    constructor(params: UIImage.Params);
    /**
     * The type of the image.
     * @returns The image type.
     */
    get imageType(): mod.UIImageType;
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    set imageType(imageType: mod.UIImageType);
    /**
     * The alpha of the image.
     * @returns The image alpha opacity.
     */
    get imageAlpha(): number;
    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    set imageAlpha(alpha: number);
    /**
     * The color of the image.
     * @returns The image color vector.
     */
    get imageColor(): mod.Vector;
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    set imageColor(color: mod.Vector);
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
