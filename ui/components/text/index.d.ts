import { UI } from '../../index.ts';
export declare class UIText extends UI.Element {
    protected _message: mod.Message;
    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    constructor(params: UIText.Params);
    /**
     * The message of the text. This is an opaque type and cannot be unpacked into a string or compared.
     * @returns The message.
     */
    get message(): mod.Message;
    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    set message(message: mod.Message);
    /**
     * The alpha of the text.
     * @returns The text alpha opacity.
     */
    get textAlpha(): number;
    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
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
     * The color of the text.
     * @returns The text color vector.
     */
    get textColor(): mod.Vector;
    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
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
     * The padding around the text.
     * @returns The padding.
     */
    get padding(): number;
    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    set padding(padding: number);
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
