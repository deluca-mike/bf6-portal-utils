import { UI } from '../../index.ts';
export declare class UIText extends UI.Element {
    private static readonly _labels;
    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    constructor(params: UIText.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
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
     * @returns This text for chaining.
     */
    setLabel(label: mod.Message): this;
    /**
     * The alpha of the text, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    get textAlpha(): number | undefined;
    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    set textAlpha(alpha: number);
    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     * @returns This text for chaining.
     */
    setTextAlpha(alpha: number): this;
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
     * @returns This text for chaining.
     */
    setTextAnchor(anchor: mod.UIAnchor): this;
    /**
     * The color of the text, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    get textColor(): mod.Vector | undefined;
    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    set textColor(color: mod.Vector);
    /**
     * Sets the color of the text.
     * @param color - The new color.
     * @returns This text for chaining.
     */
    setTextColor(color: mod.Vector): this;
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
     * @returns This text for chaining.
     */
    setTextSize(size: number): this;
    /**
     * The padding around the text, or undefined if deleted.
     * @returns The padding, or undefined if deleted.
     */
    get padding(): number | undefined;
    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    set padding(padding: number);
    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     * @returns This text for chaining.
     */
    setPadding(padding: number): this;
}
export declare namespace UIText {
    /**
     * The parameters for creating a new text.
     */
    type Params = UI.ElementParams & {
        label: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
