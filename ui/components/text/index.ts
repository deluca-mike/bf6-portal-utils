import { UI } from '../../index.ts';

// version: 6.0.1
export class UIText extends UI.Element {
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
    public constructor(params: UIText.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName(parent, receiver);
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);
        const padding = params.padding ?? 0;

        const elementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: params.bgColor ?? UI.COLORS.WHITE,
            bgAlpha: params.bgAlpha ?? 0,
            bgFill: params.bgFill ?? mod.UIBgFill.None,
            depth: params.depth ?? mod.UIDepth.AboveGameUI,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const message = params.message;
        const textSize = params.textSize ?? 36;
        const textColor = params.textColor ?? UI.COLORS.BLACK;
        const textAlpha = params.textAlpha ?? 1;
        const textAnchor = params.textAnchor ?? mod.UIAnchor.Center;

        const args: [
            string, // name
            mod.Vector, // position
            mod.Vector, // size
            mod.UIAnchor, // anchor
            mod.UIWidget, // parent
            boolean, // visible
            number, // padding
            mod.Vector, // bgColor
            number, // bgAlpha
            mod.UIBgFill, // bgFill
            mod.Message, // message
            number, // textSize
            mod.Vector, // textColor
            number, // textAlpha
            mod.UIAnchor, // textAnchor
            mod.UIDepth, // depth
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            parent.uiWidget,
            elementParams.visible,
            padding,
            elementParams.bgColor,
            elementParams.bgAlpha,
            elementParams.bgFill,
            message,
            textSize,
            textColor,
            textAlpha,
            textAnchor,
            elementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIText(...args);
        } else {
            mod.AddUIText(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        this._message = message;
        this._textSize = textSize;
        this._textColor = textColor;
        this._textAlpha = textAlpha;
        this._textAnchor = textAnchor;
        this._padding = padding;
    }

    /**
     * The message of the text. This is an opaque type and cannot be unpacked into a string or compared.
     */
    public get message(): mod.Message {
        return this._message;
    }

    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    public set message(message: mod.Message) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextLabel(this._uiWidget, (this._message = message));
    }

    /**
     * Sets the message of the text. Useful for chaining operations.
     * @param message - The new message.
     * @returns This element instance.
     */
    public setMessage(message: mod.Message): this {
        this.message = message;
        return this;
    }

    /**
     * The alpha of the text.
     */
    public get textAlpha(): number {
        return this._textAlpha;
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAlpha(this._uiWidget, (this._textAlpha = alpha));
    }

    /**
     * Sets the alpha of the text. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    public setTextAlpha(alpha: number): this {
        this.textAlpha = alpha;
        return this;
    }

    /**
     * The anchor of the text.
     */
    public get textAnchor(): mod.UIAnchor {
        return this._textAnchor;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAnchor(this._uiWidget, (this._textAnchor = anchor));
    }

    /**
     * Sets the anchor of the text. Useful for chaining operations.
     * @param anchor - The new anchor.
     * @returns This element instance.
     */
    public setTextAnchor(anchor: mod.UIAnchor): this {
        this.textAnchor = anchor;
        return this;
    }

    /**
     * The color of the text.
     */
    public get textColor(): mod.Vector {
        return this._textColor;
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextColor(this._uiWidget, (this._textColor = color));
    }

    /**
     * Sets the color of the text. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    public setTextColor(color: mod.Vector): this {
        this.textColor = color;
        return this;
    }

    /**
     * The size of the text.
     */
    public get textSize(): number {
        return this._textSize;
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextSize(this._uiWidget, (this._textSize = size));
    }

    /**
     * Sets the size of the text. Useful for chaining operations.
     * @param size - The new size.
     * @returns This element instance.
     */
    public setTextSize(size: number): this {
        this.textSize = size;
        return this;
    }

    /**
     * The padding around the text.
     */
    public get padding(): number {
        return this._padding;
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetPadding(this._uiWidget, (this._padding = padding));
    }

    /**
     * Sets the padding around the text. Useful for chaining operations.
     * @param padding - The new padding.
     * @returns This element instance.
     */
    public setPadding(padding: number): this {
        this.padding = padding;
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
