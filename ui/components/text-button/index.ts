import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';

const TEXT_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['message', 'textSize', 'textAnchor'] as const;

// version: 6.0.0
export class UITextButton extends UIContentButton<UIText, typeof TEXT_BUTTON_CONTENT_PROPERTIES> {
    // UIText properties (delegated via delegateProperties)
    declare public message: mod.Message;
    declare public textAnchor: mod.UIAnchor;
    declare public textSize: number;

    // UIText setter methods (delegated via delegateProperties)
    declare public setMessage: (message: mod.Message) => this;
    declare public setTextAnchor: (anchor: mod.UIAnchor) => this;
    declare public setTextSize: (size: number) => this;

    protected _textDisabledColor: mod.Vector;

    protected _textDisabledAlpha: number;

    public constructor(params: UITextButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIText => {
            const textParams: UIText.Params = {
                parent,
                width,
                height,
                message: params.message,
                textSize: params.textSize,
                textColor: params.textColor,
                textAlpha: params.textAlpha,
                textAnchor: params.textAnchor,
                depth: params.depth,
            };

            return new UIText(textParams);
        };

        super(params, createContent, TEXT_BUTTON_CONTENT_PROPERTIES);

        this._textDisabledColor = params.textDisabledColor ?? UI.COLORS.BF_GREY_2;
        this._textDisabledAlpha = params.textDisabledAlpha ?? 1;

        if (!this._button.enabled) {
            this._setContentEnabled(false);
        }
    }

    private _setContentEnabled(enabled: boolean): void {
        if (enabled) {
            mod.SetUITextColor(this._content.uiWidget, this._content.textColor);
            mod.SetUITextAlpha(this._content.uiWidget, this._content.textAlpha);
        } else {
            mod.SetUITextColor(this._content.uiWidget, this._textDisabledColor);
            mod.SetUITextAlpha(this._content.uiWidget, this._textDisabledAlpha);
        }
    }

    public override get enabled(): boolean {
        return this._button.enabled;
    }

    public override set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        this._button.enabled = enabled;
        this._setContentEnabled(enabled);
    }

    public override setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    public get textColor(): mod.Vector {
        return this._content.textColor;
    }

    public set textColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._content.textColor = color;

        if (this._button.enabled) {
            mod.SetUITextColor(this._content.uiWidget, color);
        }
    }

    public setTextColor(color: mod.Vector): this {
        this.textColor = color;
        return this;
    }

    public get textAlpha(): number {
        return this._content.textAlpha;
    }

    public set textAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._content.textAlpha = alpha;

        if (this._button.enabled) {
            mod.SetUITextAlpha(this._content.uiWidget, alpha);
        }
    }

    public setTextAlpha(alpha: number): this {
        this.textAlpha = alpha;
        return this;
    }

    public get textDisabledColor(): mod.Vector {
        return this._textDisabledColor;
    }

    public set textDisabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._textDisabledColor = color;

        if (!this._button.enabled) {
            mod.SetUITextColor(this._content.uiWidget, color);
        }
    }

    public setTextDisabledColor(color: mod.Vector): this {
        this.textDisabledColor = color;
        return this;
    }

    public get textDisabledAlpha(): number {
        return this._textDisabledAlpha;
    }

    public set textDisabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._textDisabledAlpha = alpha;

        if (!this._button.enabled) {
            mod.SetUITextAlpha(this._content.uiWidget, alpha);
        }
    }

    public setTextDisabledAlpha(alpha: number): this {
        this.textDisabledAlpha = alpha;
        return this;
    }
}

export namespace UITextButton {
    export type Params = UIButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
