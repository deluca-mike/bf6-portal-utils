import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';
declare const IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIImageButton extends UIContentButton<UIImage, typeof IMAGE_BUTTON_CONTENT_PROPERTIES> {
    imageType: mod.UIImageType;
    setImageType: (imageType: mod.UIImageType) => this;
    protected _imageDisabledColor: mod.Vector;
    protected _imageDisabledAlpha: number;
    /**
     * Creates a new image button.
     * @param params - The parameters for the image button.
     */
    constructor(params: UIImageButton.Params);
    private _setContentEnabled;
    /**
     * @inheritdoc
     */
    get enabled(): boolean;
    /**
     * @inheritdoc
     */
    set enabled(enabled: boolean);
    /**
     * @inheritdoc
     */
    setEnabled(enabled: boolean): this;
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
     * The disabled color of the image.
     */
    get imageDisabledColor(): mod.Vector;
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    set imageDisabledColor(color: mod.Vector);
    /**
     * Sets the disabled color of the image. Useful for chaining operations.
     * @param color - The new disabled color of the image.
     * @returns This element instance.
     */
    setImageDisabledColor(color: mod.Vector): this;
    /**
     * The disabled alpha of the image.
     */
    get imageDisabledAlpha(): number;
    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha of the image.
     */
    set imageDisabledAlpha(alpha: number);
    /**
     * Sets the disabled alpha of the image. Useful for chaining operations.
     * @param alpha - The new disabled alpha of the image.
     * @returns This element instance.
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
export {};
