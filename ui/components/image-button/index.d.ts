import { UIContentButton } from '../content-button/index.ts';
import { UIImage } from '../image/index.ts';
export declare class UIImageButton extends UIContentButton<UIImage> {
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
     * The color of the image.
     * @returns The image color vector.
     */
    get imageColor(): mod.Vector;
    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    set imageColor(color: mod.Vector);
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
     * The disabled color of the image.
     * @returns The disabled image color vector.
     */
    get imageDisabledColor(): mod.Vector;
    /**
     * Sets the disabled color of the image.
     * @param color - The new disabled color of the image.
     */
    set imageDisabledColor(color: mod.Vector);
    /**
     * The disabled alpha of the image.
     * @returns The disabled image alpha opacity.
     */
    get imageDisabledAlpha(): number;
    /**
     * Sets the disabled alpha of the image.
     * @param alpha - The new disabled alpha.
     */
    set imageDisabledAlpha(alpha: number);
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
