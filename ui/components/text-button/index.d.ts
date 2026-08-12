import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIText } from '../text/index.ts';
export declare class UITextButton extends UIContentButton<UIText> {
    private static readonly _textColors;
    private static readonly _textAlphas;
    private static readonly _textDisabledColors;
    private static readonly _textDisabledAlphas;
    /**
     * Creates a new text button.
     * @param params - The parameters for the text button.
     */
    constructor(params: UITextButton.Params);
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
     * The label message of the text, or undefined if deleted.
     * @returns The label message, or undefined if deleted.
     */
    get label(): mod.Message | undefined;
    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     */
    set label(label: mod.Message);
    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     * @returns This text button for chaining.
     */
    setLabel(label: mod.Message): this;
    /**
     * The size of the text, or undefined if deleted.
     * @returns The text size, or undefined if deleted.
     */
    get textSize(): number | undefined;
    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    set textSize(size: number);
    /**
     * Sets the size of the text.
     * @param size - The new size.
     * @returns This text button for chaining.
     */
    setTextSize(size: number): this;
    /**
     * The anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    get textAnchor(): mod.UIAnchor | undefined;
    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    set textAnchor(anchor: mod.UIAnchor);
    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text button for chaining.
     */
    setTextAnchor(anchor: mod.UIAnchor): this;
    /**
     * The color of the text when the button is enabled, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    get textColor(): mod.Vector | undefined;
    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     * @returns This text button for chaining.
     */
    setTextColor(color: mod.Vector): this;
    /**
     * The alpha of the text when the button is enabled, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    get textAlpha(): number | undefined;
    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    setTextAlpha(alpha: number): this;
    /**
     * The color of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text color vector, or undefined if deleted.
     */
    get textDisabledColor(): mod.Vector | undefined;
    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    set textDisabledColor(color: mod.Vector);
    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new disabled color.
     * @returns This text button for chaining.
     */
    setTextDisabledColor(color: mod.Vector): this;
    /**
     * The alpha of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text alpha opacity, or undefined if deleted.
     */
    get textDisabledAlpha(): number | undefined;
    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    set textDisabledAlpha(alpha: number);
    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    setTextDisabledAlpha(alpha: number): this;
}
export declare namespace UITextButton {
    /**
     * The parameters for creating a new text button.
     */
    type Params = UIBaseButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
