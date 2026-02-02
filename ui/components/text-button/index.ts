import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';

const TEXT_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['message', 'textSize', 'textAnchor'] as const;

// version: 6.0.1
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

    /**
     * Creates a new text button.
     * @param params - The parameters for the text button.
     */
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

    /**
     * @inheritdoc
     */
    public override get enabled(): boolean {
        return this._button.enabled;
    }

    /**
     * @inheritdoc
     */
    public override set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        this._button.enabled = enabled;
        this._setContentEnabled(enabled);
    }

    /**
     * @inheritdoc
     */
    public override setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    /**
     * The color of the text when the button is enabled.
     */
    public get textColor(): mod.Vector {
        return this._content.textColor;
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._content.textColor = color;

        if (this._button.enabled) {
            mod.SetUITextColor(this._content.uiWidget, color);
        }
    }

    /**
     * Sets the color of the text when the button is enabled. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    public setTextColor(color: mod.Vector): this {
        this.textColor = color;
        return this;
    }

    /**
     * The alpha of the text when the button is enabled.
     */
    public get textAlpha(): number {
        return this._content.textAlpha;
    }

    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._content.textAlpha = alpha;

        if (this._button.enabled) {
            mod.SetUITextAlpha(this._content.uiWidget, alpha);
        }
    }

    /**
     * Sets the alpha of the text when the button is enabled. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    public setTextAlpha(alpha: number): this {
        this.textAlpha = alpha;
        return this;
    }

    /**
     * The color of the text when the button is disabled.
     */
    public get textDisabledColor(): mod.Vector {
        return this._textDisabledColor;
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    public set textDisabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._textDisabledColor = color;

        if (!this._button.enabled) {
            mod.SetUITextColor(this._content.uiWidget, color);
        }
    }

    /**
     * Sets the color of the text when the button is disabled. Useful for chaining operations.
     * @param color - The new color.
     * @returns This element instance.
     */
    public setTextDisabledColor(color: mod.Vector): this {
        this.textDisabledColor = color;
        return this;
    }

    /**
     * The alpha of the text when the button is disabled.
     */
    public get textDisabledAlpha(): number {
        return this._textDisabledAlpha;
    }

    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    public set textDisabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._textDisabledAlpha = alpha;

        if (!this._button.enabled) {
            mod.SetUITextAlpha(this._content.uiWidget, alpha);
        }
    }

    /**
     * Sets the alpha of the text when the button is disabled. Useful for chaining operations.
     * @param alpha - The new alpha.
     * @returns This element instance.
     */
    public setTextDisabledAlpha(alpha: number): this {
        this.textDisabledAlpha = alpha;
        return this;
    }
}

export namespace UITextButton {
    /**
     * The parameters for creating a new text button.
     */
    export type Params = UIButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
