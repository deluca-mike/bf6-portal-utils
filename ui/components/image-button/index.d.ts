import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIImage } from '../image/index.ts';
export declare class UIImageButton extends UIContentButton<UIImage> {
    private static readonly _imageRgba;
    private static readonly _imageDisabledRgba;
    /**
     * Creates a new image button.
     * @param params - The parameters for the image button.
     */
    constructor(params: UIImageButton.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    protected _setContentEnabled(enabled: boolean): void;
    /**
     * @inheritdoc
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    get enabled(): boolean | undefined;
    /**
     * @inheritdoc
     */
    set enabled(enabled: boolean);
    /**
     * @inheritdoc
     * @returns This image button for chaining.
     */
    setEnabled(enabled: boolean): this;
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
     * @returns This image button for chaining.
     */
    setImageType(imageType: UI.ImageType): this;
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
     * @returns This image button for chaining.
     */
    setImageColor(color: Colors.Color): this;
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
     * @returns This image button for chaining.
     */
    setImageAlpha(alpha: number): this;
    /**
     * The disabled color of the image, or undefined if deleted.
     * @returns The disabled image color, or undefined if deleted.
     */
    get imageDisabledColor(): Colors.Color | undefined;
    /**
     * Retrieves the disabled image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled image color, or undefined if deleted.
     */
    getImageDisabledColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    set imageDisabledColor(color: Colors.Color);
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     * @returns This image button for chaining.
     */
    setImageDisabledColor(color: Colors.Color): this;
    /**
     * The disabled alpha of the image, or undefined if deleted.
     * @returns The disabled image alpha opacity, or undefined if deleted.
     */
    get imageDisabledAlpha(): number | undefined;
    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     */
    set imageDisabledAlpha(alpha: number);
    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     * @returns This image button for chaining.
     */
    setImageDisabledAlpha(alpha: number): this;
}
export declare namespace UIImageButton {
    /**
     * The parameters for creating a new image button.
     */
    type Params = UIBaseButton.Params &
        UIImage.Params & {
            imageDisabledColor?: Colors.Color;
            imageDisabledAlpha?: number;
        };
}
