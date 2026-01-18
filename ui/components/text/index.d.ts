import { UI } from '../../index.ts';
export declare class UIText extends UI.Element {
    protected _message: mod.Message;
    protected _textSize: number;
    protected _textColor: mod.Vector;
    protected _textAlpha: number;
    protected _textAnchor: mod.UIAnchor;
    protected _padding: number;
    constructor(params: UIText.Params);
    get message(): mod.Message;
    set message(message: mod.Message);
    setMessage(message: mod.Message): this;
    get textAlpha(): number;
    set textAlpha(alpha: number);
    setTextAlpha(alpha: number): this;
    get textAnchor(): mod.UIAnchor;
    set textAnchor(anchor: mod.UIAnchor);
    setTextAnchor(anchor: mod.UIAnchor): this;
    get textColor(): mod.Vector;
    set textColor(color: mod.Vector);
    setTextColor(color: mod.Vector): this;
    get textSize(): number;
    set textSize(size: number);
    setTextSize(size: number): this;
    get padding(): number;
    set padding(padding: number);
    setPadding(padding: number): this;
}
export declare namespace UIText {
    type Params = UI.ElementParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
        padding?: number;
    };
}
