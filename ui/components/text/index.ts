import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';

// version: 10.0.0
export class UIText extends UI.Element {
    private static readonly _labels = new Array<mod.Message | null>(UI.MAX_ELEMENTS);
    private static readonly _textRgba = new Uint32Array(UI.MAX_ELEMENTS);
    private static readonly _textAnchor = new Uint8Array(UI.MAX_ELEMENTS);

    private static _setTextRgba(slot: number, color: Colors.Color, alpha: number): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        UIText._textRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _setTextColor(slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = UIText._textRgba[slot] & 0xff;
        UIText._textRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _setTextAlpha(slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        UIText._textRgba[slot] = (UIText._textRgba[slot] & ~0xff) | aInt;
    }

    private static _getTextColor(slot: number, out?: Colors.Color): Colors.Color {
        const rgba = UIText._textRgba[slot];
        const r = (rgba >>> 24) / 255;
        const g = ((rgba >>> 16) & 0xff) / 255;
        const b = ((rgba >>> 8) & 0xff) / 255;
        if (out) {
            out.r = r;
            out.g = g;
            out.b = b;
            return out;
        }
        return { r, g, b };
    }

    private static _getTextAlpha(slot: number): number {
        return (UIText._textRgba[slot] & 0xff) / 255;
    }

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
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 0;
        const bgFill = params.bgFill ?? UI.BgFill.None;
        const depth = params.depth ?? UI.Depth.AboveGameUI;
        const textSize = params.textSize ?? 36;
        const textColor = params.textColor ?? UI.COLORS.BLACK;
        const textAlpha = params.textAlpha ?? 1;
        const textAnchor = params.textAnchor ?? UI.Anchor.Center;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeBgFill = UI.Element._getNativeBgFill(bgFill);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeTextAnchor = UI.Element._getNativeAnchor(textAnchor);

        if (!receiver.nativeReceiver) {
            mod.AddUIText(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                params.label,
                textSize,
                Colors.toVector(textColor),
                textAlpha,
                nativeTextAnchor,
                nativeDepth
            );
        } else {
            mod.AddUIText(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                params.label,
                textSize,
                Colors.toVector(textColor),
                textAlpha,
                nativeTextAnchor,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        const slot = this._slot;
        UIText._labels[slot] = params.label;
        UIText._textAnchor[slot] = textAnchor;
        UIText._setTextRgba(slot, textColor, textAlpha);
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIText._labels[slot] = null;
        UIText._textAnchor[slot] = 0;
        UIText._textRgba[slot] = 0;
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
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIText._getTextAlpha(slot);
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
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIText._setTextAlpha(slot, alpha);
        mod.SetUITextAlpha(this._uiWidget, alpha);

        return this;
    }

    /**
     * The anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    public get textAnchor(): UI.Anchor | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIText._textAnchor[slot] as UI.Anchor);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: UI.Anchor) {
        this.setTextAnchor(anchor);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text for chaining.
     */
    public setTextAnchor(anchor: UI.Anchor): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIText._textAnchor[slot] = anchor;
        mod.SetUITextAnchor(this._uiWidget, UI.Element._getNativeAnchor(anchor));

        return this;
    }

    /**
     * The color of the text, or undefined if deleted.
     * @returns The text color, or undefined if deleted.
     */
    public get textColor(): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIText._getTextColor(slot);
    }

    /**
     * Retrieves the text color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The text color, or undefined if deleted.
     */
    public getTextColor(out?: Colors.Color): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIText._getTextColor(slot, out);
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    public set textColor(color: Colors.Color) {
        this.setTextColor(color);
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     * @returns This text for chaining.
     */
    public setTextColor(color: Colors.Color): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIText._setTextColor(slot, color);
        mod.SetUITextColor(this._uiWidget, Colors.toVector(color));

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
        textColor?: Colors.Color;
        textAlpha?: number;
        textAnchor?: UI.Anchor;
        padding?: number;
    };
}
