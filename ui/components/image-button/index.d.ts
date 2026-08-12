import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';
export declare class UIImageButton extends UIContentButton<UIImage> {
    private static readonly _imageColors;
    private static readonly _imageAlphas;
    private static readonly _imageDisabledColors;
    private static readonly _imageDisabledAlphas;
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
     */
    get enabled(): boolean | undefined;
    /**
     * @inheritdoc
     */
    set enabled(enabled: boolean);
    /**
     * @inheritdoc
     */
    setEnabled(enabled: boolean): this;
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
     * @returns This image button for chaining.
     */
    setImageType(imageType: mod.UIImageType): this;
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
     * @returns This image button for chaining.
     */
    setImageColor(color: mod.Vector): this;
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
     * @returns The disabled image color vector, or undefined if deleted.
     */
    get imageDisabledColor(): mod.Vector | undefined;
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    set imageDisabledColor(color: mod.Vector);
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     * @returns This image button for chaining.
     */
    setImageDisabledColor(color: mod.Vector): this;
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
    type Params = UIContentButton.Params &
        UIImage.Params & {
            imageDisabledColor?: mod.Vector;
            imageDisabledAlpha?: number;
        };
}
