import { UI } from '../../index.ts';

// version: 9.0.0
export class UIText extends UI.Element {
    protected _message: mod.Message;

    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    public constructor(params: UIText.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
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
                params.message,
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
                params.message,
                textSize,
                textColor,
                textAlpha,
                textAnchor,
                depth,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor,
            bgAlpha,
            bgFill,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        this._message = params.message;
    }

    /**
     * The message of the text, or undefined if deleted.
     * @returns The message, or undefined if deleted.
     */
    public get message(): mod.Message | undefined {
        return this.getMessage();
    }

    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    public set message(message: mod.Message) {
        this.setMessage(message);
    }

    /**
     * Retrieves the message of the text, or undefined if deleted.
     * @returns The message, or undefined if deleted.
     */
    public getMessage(): mod.Message | undefined {
        return this._isDeletedCheck() ? undefined : this._message;
    }

    /**
     * Sets the message of the text.
     * @param message - The new message.
     * @returns This text for chaining.
     */
    public setMessage(message: mod.Message): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUITextLabel(this._uiWidget, (this._message = message));
        return this;
    }

    /**
     * The alpha of the text, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public get textAlpha(): number | undefined {
        return this.getTextAlpha();
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        this.setTextAlpha(alpha);
    }

    /**
     * Retrieves the alpha of the text, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public getTextAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUITextAlpha(this._uiWidget);
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     * @returns This text for chaining.
     */
    public setTextAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUITextAlpha(this._uiWidget, alpha);
        return this;
    }

    /**
     * The anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    public get textAnchor(): mod.UIAnchor | undefined {
        return this.getTextAnchor();
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        this.setTextAnchor(anchor);
    }

    /**
     * Retrieves the anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    public getTextAnchor(): mod.UIAnchor | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUITextAnchor(this._uiWidget);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text for chaining.
     */
    public setTextAnchor(anchor: mod.UIAnchor): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUITextAnchor(this._uiWidget, anchor);
        return this;
    }

    /**
     * The color of the text, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public get textColor(): mod.Vector | undefined {
        return this.getTextColor();
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        this.setTextColor(color);
    }

    /**
     * Retrieves the color of the text, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public getTextColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUITextColor(this._uiWidget);
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     * @returns This text for chaining.
     */
    public setTextColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUITextColor(this._uiWidget, color);
        return this;
    }

    /**
     * The size of the text, or undefined if deleted.
     * @returns The text size, or undefined if deleted.
     */
    public get textSize(): number | undefined {
        return this.getTextSize();
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        this.setTextSize(size);
    }

    /**
     * Retrieves the size of the text, or undefined if deleted.
     * @returns The text size, or undefined if deleted.
     */
    public getTextSize(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUITextSize(this._uiWidget);
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     * @returns This text for chaining.
     */
    public setTextSize(size: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUITextSize(this._uiWidget, size);
        return this;
    }

    /**
     * The padding around the text, or undefined if deleted.
     * @returns The padding, or undefined if deleted.
     */
    public get padding(): number | undefined {
        return this.getPadding();
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        this.setPadding(padding);
    }

    /**
     * Retrieves the padding around the text, or undefined if deleted.
     * @returns The padding, or undefined if deleted.
     */
    public getPadding(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIWidgetPadding(this._uiWidget);
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     * @returns This text for chaining.
     */
    public setPadding(padding: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIWidgetPadding(this._uiWidget, padding);
        return this;
    }
}

export namespace UIText {
    /**
     * The parameters for creating a new text.
     */
    export type Params = UI.ElementParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
