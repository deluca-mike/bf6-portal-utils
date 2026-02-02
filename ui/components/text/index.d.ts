import { UI } from '../../index.ts';
export declare class UIText extends UI.Element {
    protected _message: mod.Message;
    protected _textSize: number;
    protected _textColor: mod.Vector;
    protected _textAlpha: number;
    protected _textAnchor: mod.UIAnchor;
    protected _padding: number;
    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    constructor(params: UIText.Params);
    /**
     * The message of the text. This is an opaque type and cannot be unpacked into a string or compared.
     */
    get message(): mod.Message;
    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    set message(message: mod.Message);
    /**
     * Sets the message of the text. Useful for chaining operations.
     * @param message - The new message.
     * @returns This element instance.
     */
    setMessage(message: mod.Message): this;
    /**
     * The alpha of the text.
     */
    get textAlpha(): number;
    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
    /**
     * Sets the alpha of the text. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    setTextAlpha(alpha: number): this;
    /**
     * The anchor of the text.
     */
    get textAnchor(): mod.UIAnchor;
    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    set textAnchor(anchor: mod.UIAnchor);
    /**
     * Sets the anchor of the text. Useful for chaining operations.
     * @param anchor - The new anchor.
     * @returns This element instance.
     */
    setTextAnchor(anchor: mod.UIAnchor): this;
    /**
     * The color of the text.
     */
    get textColor(): mod.Vector;
    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
    /**
     * Sets the color of the text. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    setTextColor(color: mod.Vector): this;
    /**
     * The size of the text.
     */
    get textSize(): number;
    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    set textSize(size: number);
    /**
     * Sets the size of the text. Useful for chaining operations.
     * @param size - The new size.
     * @returns This element instance.
     */
    setTextSize(size: number): this;
    /**
     * The padding around the text.
     */
    get padding(): number;
    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    set padding(padding: number);
    /**
     * Sets the padding around the text. Useful for chaining operations.
     * @param padding - The new padding.
     * @returns This element instance.
     */
    setPadding(padding: number): this;
}
export declare namespace UIText {
    /**
     * The parameters for creating a new text.
     */
    type Params = UI.ElementParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
