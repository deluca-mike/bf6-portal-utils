import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
export declare class UIImage extends UI.Element {
    private static readonly _imageType;
    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    constructor(params: UIImage.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    get imageType(): UI.ImageType | undefined;
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    set imageType(imageType: UI.ImageType);
    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image for chaining.
     */
    setImageType(imageType: UI.ImageType): this;
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
     * @returns The image color, or undefined if deleted.
     */
    get imageColor(): Colors.Color | undefined;
    /**
     * Retrieves the image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The image color, or undefined if deleted.
     */
    getImageColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    set imageColor(color: Colors.Color);
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image for chaining.
     */
    setImageColor(color: Colors.Color): this;
}
export declare namespace UIImage {
    /**
     * The parameters for creating a new image.
     */
    type Params = UI.ElementParams & {
        imageType: UI.ImageType;
        imageColor?: Colors.Color;
        imageAlpha?: number;
    };
}
