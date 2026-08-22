import { UI } from '../../index.ts';

// version: 8.0.0
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
                UI.Element._getNativeWidget(parent.id)!,
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
                UI.Element._getNativeWidget(parent.id)!,
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
     * The message of the text. This is an opaque type and cannot be unpacked into a string or compared.
     * @returns The message.
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
     * The alpha of the text.
     * @returns The text alpha opacity.
     */
    public get textAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUITextAlpha(this._uiWidget);
    }

    /**
     * Sets the alpha of the text.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAlpha(this._uiWidget, alpha);
    }

    /**
     * The anchor of the text.
     * @returns The text anchor alignment.
     */
    public get textAnchor(): mod.UIAnchor {
        return this._isDeletedCheck() ? mod.UIAnchor.Center : mod.GetUITextAnchor(this._uiWidget);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAnchor(this._uiWidget, anchor);
    }

    /**
     * The color of the text.
     * @returns The text color vector.
     */
    public get textColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.BLACK : mod.GetUITextColor(this._uiWidget);
    }

    /**
     * Sets the color of the text.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextColor(this._uiWidget, color);
    }

    /**
     * The size of the text.
     * @returns The text size.
     */
    public get textSize(): number {
        return this._isDeletedCheck() ? 36 : mod.GetUITextSize(this._uiWidget);
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextSize(this._uiWidget, size);
    }

    /**
     * The padding around the text.
     * @returns The padding.
     */
    public get padding(): number {
        return this._isDeletedCheck() ? 0 : mod.GetUIWidgetPadding(this._uiWidget);
    }

    /**
     * Sets the padding around the text.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetPadding(this._uiWidget, padding);
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
