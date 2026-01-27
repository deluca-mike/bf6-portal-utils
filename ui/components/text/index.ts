import { UI } from '../../index.ts';

// version: 6.0.0
export class UIText extends UI.Element {
    protected _message: mod.Message;
    protected _textSize: number;
    protected _textColor: mod.Vector;
    protected _textAlpha: number;
    protected _textAnchor: mod.UIAnchor;
    protected _padding: number;

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

    public get message(): mod.Message {
        return this._message;
    }

    public set message(message: mod.Message) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextLabel(this._uiWidget, (this._message = message));
    }

    public setMessage(message: mod.Message): this {
        this.message = message;
        return this;
    }

    public get textAlpha(): number {
        return this._textAlpha;
    }

    public set textAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAlpha(this._uiWidget, (this._textAlpha = alpha));
    }

    public setTextAlpha(alpha: number): this {
        this.textAlpha = alpha;
        return this;
    }

    public get textAnchor(): mod.UIAnchor {
        return this._textAnchor;
    }

    public set textAnchor(anchor: mod.UIAnchor) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextAnchor(this._uiWidget, (this._textAnchor = anchor));
    }

    public setTextAnchor(anchor: mod.UIAnchor): this {
        this.textAnchor = anchor;
        return this;
    }

    public get textColor(): mod.Vector {
        return this._textColor;
    }

    public set textColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextColor(this._uiWidget, (this._textColor = color));
    }

    public setTextColor(color: mod.Vector): this {
        this.textColor = color;
        return this;
    }

    public get textSize(): number {
        return this._textSize;
    }

    public set textSize(size: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUITextSize(this._uiWidget, (this._textSize = size));
    }

    public setTextSize(size: number): this {
        this.textSize = size;
        return this;
    }

    public get padding(): number {
        return this._padding;
    }

    public set padding(padding: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetPadding(this._uiWidget, (this._padding = padding));
    }

    public setPadding(padding: number): this {
        this.padding = padding;
        return this;
    }
}

export namespace UIText {
    export type Params = UI.ElementParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
