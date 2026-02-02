import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';
declare const TEXT_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UITextButton extends UIContentButton<UIText, typeof TEXT_BUTTON_CONTENT_PROPERTIES> {
    message: mod.Message;
    textAnchor: mod.UIAnchor;
    textSize: number;
    setMessage: (message: mod.Message) => this;
    setTextAnchor: (anchor: mod.UIAnchor) => this;
    setTextSize: (size: number) => this;
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
     * @inheritdoc
     */
    setEnabled(enabled: boolean): this;
    /**
     * The color of the text when the button is enabled.
     */
    get textColor(): mod.Vector;
    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
    /**
     * Sets the color of the text when the button is enabled. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    setTextColor(color: mod.Vector): this;
    /**
     * The alpha of the text when the button is enabled.
     */
    get textAlpha(): number;
    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
    /**
     * Sets the alpha of the text when the button is enabled. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    setTextAlpha(alpha: number): this;
    /**
     * The color of the text when the button is disabled.
     */
    get textDisabledColor(): mod.Vector;
    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    set textDisabledColor(color: mod.Vector);
    /**
     * Sets the color of the text when the button is disabled. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    setTextDisabledColor(color: mod.Vector): this;
    /**
     * The alpha of the text when the button is disabled.
     */
    get textDisabledAlpha(): number;
    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    set textDisabledAlpha(alpha: number);
    /**
     * Sets the alpha of the text when the button is disabled. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    setTextDisabledAlpha(alpha: number): this;
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
export {};
