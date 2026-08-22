import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';

// version: 8.0.0
export class UITextButton extends UIContentButton<UIText> {
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

        super(params, createContent);

        this._textDisabledColor = params.textDisabledColor ?? UI.COLORS.BF_GREY_2;
        this._textDisabledAlpha = params.textDisabledAlpha ?? 1;

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    private _setContentEnabled(enabled: boolean): void {
        const contentWidget = UI.Element._getNativeWidget(this._content.id);

        if (!contentWidget) return;

        if (enabled) {
            mod.SetUITextColor(contentWidget, this._content.textColor);
            mod.SetUITextAlpha(contentWidget, this._content.textAlpha);
        } else {
            mod.SetUITextColor(contentWidget, this._textDisabledColor);
            mod.SetUITextAlpha(contentWidget, this._textDisabledAlpha);
        }
    }

    /**
     * @inheritdoc
     */
    public override get enabled(): boolean {
        return super.enabled;
    }

    /**
     * @inheritdoc
     */
    public override set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        super.enabled = enabled;
        this._setContentEnabled(enabled);
    }

    /**
     * The message of the text.
     * @returns The message.
     */
    public get message(): mod.Message {
        return this._content.message;
    }

    /**
     * Sets the message of the text.
     * @param message - The new message.
     */
    public set message(message: mod.Message) {
        if (this._isDeletedCheck()) return;

        this._content.message = message;
    }

    /**
     * The size of the text.
     * @returns The text size.
     */
    public get textSize(): number {
        return this._content.textSize;
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        if (this._isDeletedCheck()) return;

        this._content.textSize = size;
    }

    /**
     * The anchor of the text.
     * @returns The text anchor alignment.
     */
    public get textAnchor(): mod.UIAnchor {
        return this._content.textAnchor;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        if (this._isDeletedCheck()) return;

        this._content.textAnchor = anchor;
    }

    /**
     * The color of the text when the button is enabled.
     * @returns The text color vector.
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

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content.id);

            if (contentWidget) {
                mod.SetUITextColor(contentWidget, color);
            }
        }
    }

    /**
     * The alpha of the text when the button is enabled.
     * @returns The text alpha opacity.
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

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content.id);

            if (contentWidget) {
                mod.SetUITextAlpha(contentWidget, alpha);
            }
        }
    }

    /**
     * The color of the text when the button is disabled.
     * @returns The disabled text color vector.
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

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content.id);

            if (contentWidget) {
                mod.SetUITextColor(contentWidget, color);
            }
        }
    }

    /**
     * The alpha of the text when the button is disabled.
     * @returns The disabled text alpha opacity.
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

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content.id);

            if (contentWidget) {
                mod.SetUITextAlpha(contentWidget, alpha);
            }
        }
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
