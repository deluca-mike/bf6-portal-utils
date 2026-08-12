import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';
export declare class UITextButton extends UIContentButton<UIText> {
    protected _textDisabledColor: mod.Vector;
    protected _textDisabledAlpha: number;
    /**
     * Creates a new text button.
     * @param params - The parameters for the text button.
     */
    constructor(params: UITextButton.Params);
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
     * The message of the text.
     * @returns The message.
     */
    get message(): mod.Message;
    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    set message(message: mod.Message);
    /**
     * The size of the text.
     * @returns The text size.
     */
    get textSize(): number;
    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    set textSize(size: number);
    /**
     * The anchor of the text.
     * @returns The text anchor alignment.
     */
    get textAnchor(): mod.UIAnchor;
    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    set textAnchor(anchor: mod.UIAnchor);
    /**
     * The color of the text when the button is enabled.
     * @returns The text color vector.
     */
    get textColor(): mod.Vector;
    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
    /**
     * The alpha of the text when the button is enabled.
     * @returns The text alpha opacity.
     */
    get textAlpha(): number;
    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
    /**
     * The color of the text when the button is disabled.
     * @returns The disabled text color vector.
     */
    get textDisabledColor(): mod.Vector;
    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    set textDisabledColor(color: mod.Vector);
    /**
     * The alpha of the text when the button is disabled.
     * @returns The disabled text alpha opacity.
     */
    get textDisabledAlpha(): number;
    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    set textDisabledAlpha(alpha: number);
}
export declare namespace UITextButton {
    /**
     * The parameters for creating a new text button.
     */
    type Params = UIButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
