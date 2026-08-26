import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIText } from '../text/index.ts';

// version: 9.0.0
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
        const contentWidget = UI.Element._getNativeWidget(this._content);

        if (!contentWidget) return;

        if (enabled) {
            mod.SetUITextColor(contentWidget, this._content.textColor ?? UI.COLORS.BLACK);
            mod.SetUITextAlpha(contentWidget, this._content.textAlpha ?? 1);
        } else {
            mod.SetUITextColor(contentWidget, this._textDisabledColor);
            mod.SetUITextAlpha(contentWidget, this._textDisabledAlpha);
        }
    }

    /**
     * @inheritdoc
     */
    public override get enabled(): boolean | undefined {
        return super.enabled;
    }

    /**
     * @inheritdoc
     */
    public override set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * @inheritdoc
     */
    public override setEnabled(enabled: boolean): this {
        if (this._isDeletedCheck()) return this;

        super.setEnabled(enabled);
        this._setContentEnabled(enabled);
        return this;
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
        return this._isDeletedCheck() ? undefined : this._content.message;
    }

    /**
     * Sets the message of the text.
     * @param message - The new message.
     * @returns This text button for chaining.
     */
    public setMessage(message: mod.Message): this {
        if (this._isDeletedCheck()) return this;

        this._content.message = message;
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
        return this._isDeletedCheck() ? undefined : this._content.textSize;
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     * @returns This text button for chaining.
     */
    public setTextSize(size: number): this {
        if (this._isDeletedCheck()) return this;

        this._content.textSize = size;
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
        return this._isDeletedCheck() ? undefined : this._content.textAnchor;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text button for chaining.
     */
    public setTextAnchor(anchor: mod.UIAnchor): this {
        if (this._isDeletedCheck()) return this;

        this._content.textAnchor = anchor;
        return this;
    }

    /**
     * The color of the text when the button is enabled, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public get textColor(): mod.Vector | undefined {
        return this.getTextColor();
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        this.setTextColor(color);
    }

    /**
     * Retrieves the color of the text when the button is enabled, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public getTextColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : this._content.textColor;
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     * @returns This text button for chaining.
     */
    public setTextColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        this._content.textColor = color;

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUITextColor(contentWidget, color);
            }
        }
        return this;
    }

    /**
     * The alpha of the text when the button is enabled, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public get textAlpha(): number | undefined {
        return this.getTextAlpha();
    }

    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        this.setTextAlpha(alpha);
    }

    /**
     * Retrieves the alpha of the text when the button is enabled, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public getTextAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : this._content.textAlpha;
    }

    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    public setTextAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        this._content.textAlpha = alpha;

        if (this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUITextAlpha(contentWidget, alpha);
            }
        }
        return this;
    }

    /**
     * The color of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text color vector, or undefined if deleted.
     */
    public get textDisabledColor(): mod.Vector | undefined {
        return this.getTextDisabledColor();
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    public set textDisabledColor(color: mod.Vector) {
        this.setTextDisabledColor(color);
    }

    /**
     * Retrieves the color of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text color vector, or undefined if deleted.
     */
    public getTextDisabledColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : this._textDisabledColor;
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     * @returns This text button for chaining.
     */
    public setTextDisabledColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        this._textDisabledColor = color;

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUITextColor(contentWidget, color);
            }
        }
        return this;
    }

    /**
     * The alpha of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text alpha opacity, or undefined if deleted.
     */
    public get textDisabledAlpha(): number | undefined {
        return this.getTextDisabledAlpha();
    }

    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    public set textDisabledAlpha(alpha: number) {
        this.setTextDisabledAlpha(alpha);
    }

    /**
     * Retrieves the alpha of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text alpha opacity, or undefined if deleted.
     */
    public getTextDisabledAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : this._textDisabledAlpha;
    }

    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    public setTextDisabledAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        this._textDisabledAlpha = alpha;

        if (!this.enabled) {
            const contentWidget = UI.Element._getNativeWidget(this._content);

            if (contentWidget) {
                mod.SetUITextAlpha(contentWidget, alpha);
            }
        }
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
