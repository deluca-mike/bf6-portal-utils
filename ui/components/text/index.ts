import { UI } from '../../index.ts';

// version: 9.0.0
export class UIText extends UI.Element {
    private static readonly _labels = new Array<mod.Message | null>(UI.MAX_ELEMENTS);

    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    public constructor(params: UIText.Params) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const padding = params.padding ?? 0;
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 0;
        const bgFill = params.bgFill ?? mod.UIBgFill.None;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const textSize = params.textSize ?? 36;
        const textColor = params.textColor ?? UI.COLORS.BLACK;
        const textAlpha = params.textAlpha ?? 1;
        const textAnchor = params.textAnchor ?? mod.UIAnchor.Center;

        if (!receiver.nativeReceiver) {
            mod.AddUIText(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                bgColor,
                bgAlpha,
                bgFill,
                params.label,
                textSize,
                textColor,
                textAlpha,
                textAnchor,
                depth
            );
        } else {
            mod.AddUIText(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                bgColor,
                bgAlpha,
                bgFill,
                params.label,
                textSize,
                textColor,
                textAlpha,
                textAnchor,
                depth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        UIText._labels[this._slot] = params.label;
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIText._labels[slot] = null;
        super.delete();
    }

    /**
     * The label message of the text, or undefined if deleted.
     * @returns The label message, or undefined if deleted.
     */
    public get label(): mod.Message | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIText._labels[slot] ?? undefined);
    }

    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     */
    public set label(label: mod.Message) {
        this.setLabel(label);
    }

    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     * @returns This text for chaining.
     */
    public setLabel(label: mod.Message): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIText._labels[slot] = label;

        mod.SetUITextLabel(this._uiWidget, label);

        return this;
    }

    /**
     * The alpha of the text, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public get textAlpha(): number | undefined {
        return this._isValid ? mod.GetUITextAlpha(this._uiWidget) : undefined;
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        this.setTextAlpha(alpha);
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     * @returns This text for chaining.
     */
    public setTextAlpha(alpha: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUITextAlpha(this._uiWidget, alpha);

        return this;
    }

    /**
     * The anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    public get textAnchor(): mod.UIAnchor | undefined {
        return this._isValid ? mod.GetUITextAnchor(this._uiWidget) : undefined;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        this.setTextAnchor(anchor);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text for chaining.
     */
    public setTextAnchor(anchor: mod.UIAnchor): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUITextAnchor(this._uiWidget, anchor);

        return this;
    }

    /**
     * The color of the text, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public get textColor(): mod.Vector | undefined {
        return this._isValid ? mod.GetUITextColor(this._uiWidget) : undefined;
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        this.setTextColor(color);
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     * @returns This text for chaining.
     */
    public setTextColor(color: mod.Vector): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUITextColor(this._uiWidget, color);

        return this;
    }

    /**
     * The size of the text, or undefined if deleted.
     * @returns The text size, or undefined if deleted.
     */
    public get textSize(): number | undefined {
        return this._isValid ? mod.GetUITextSize(this._uiWidget) : undefined;
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        this.setTextSize(size);
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     * @returns This text for chaining.
     */
    public setTextSize(size: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUITextSize(this._uiWidget, size);

        return this;
    }

    /**
     * The padding around the text, or undefined if deleted.
     * @returns The padding, or undefined if deleted.
     */
    public get padding(): number | undefined {
        return this._isValid ? mod.GetUIWidgetPadding(this._uiWidget) : undefined;
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        this.setPadding(padding);
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     * @returns This text for chaining.
     */
    public setPadding(padding: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIWidgetPadding(this._uiWidget, padding);

        return this;
    }
}

export namespace UIText {
    /**
     * The parameters for creating a new text.
     */
    export type Params = UI.ElementParams & {
        label: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
