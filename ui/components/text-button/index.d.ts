import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';
declare const TEXT_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UITextButton extends UIContentButton<UIText, typeof TEXT_BUTTON_CONTENT_PROPERTIES> {
    message: mod.Message;
    textAnchor: mod.UIAnchor;
    textSize: number;
    setMessage: (message: mod.Message) => this;
    setTextAnchor: (anchor: mod.UIAnchor) => this;
    setTextSize: (size: number) => this;
    protected _textDisabledColor: mod.Vector;
    protected _textDisabledAlpha: number;
    constructor(params: UITextButton.Params);
    private _setContentEnabled;
    get enabled(): boolean;
    set enabled(enabled: boolean);
    setEnabled(enabled: boolean): this;
    get textColor(): mod.Vector;
    set textColor(color: mod.Vector);
    setTextColor(color: mod.Vector): this;
    get textAlpha(): number;
    set textAlpha(alpha: number);
    setTextAlpha(alpha: number): this;
    get textDisabledColor(): mod.Vector;
    set textDisabledColor(color: mod.Vector);
    setTextDisabledColor(color: mod.Vector): this;
    get textDisabledAlpha(): number;
    set textDisabledAlpha(alpha: number);
    setTextDisabledAlpha(alpha: number): this;
}
export declare namespace UITextButton {
    type Params = UIButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
export {};
