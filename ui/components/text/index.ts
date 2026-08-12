import { UI } from '../../index.ts';

// version: 7.0.0
export class UIText extends UI.Element {
    protected _message: mod.Message;

    /**
     * Creates a new text.
     * @param params - The parameters for the text.
     */
    public constructor(params: UIText.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName();
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
            params.message,
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
        return mod.GetUITextAlpha(this._uiWidget);
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
        return mod.GetUITextAnchor(this._uiWidget);
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
        return mod.GetUITextColor(this._uiWidget);
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
        return mod.GetUITextSize(this._uiWidget);
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
        return mod.GetUIWidgetPadding(this._uiWidget);
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
