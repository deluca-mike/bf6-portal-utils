import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIText } from '../text/index.ts';

// version: 9.0.0
export class UITextButton extends UIContentButton<UIText> {
    private static readonly _textColors = new Array<mod.Vector | null>(UIBaseButton.MAX_BUTTONS);

    private static readonly _textAlphas = new Float64Array(UIBaseButton.MAX_BUTTONS);

    private static readonly _textDisabledColors = new Array<mod.Vector | null>(UIBaseButton.MAX_BUTTONS);

    private static readonly _textDisabledAlphas = new Float64Array(UIBaseButton.MAX_BUTTONS);

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
                label: params.label,
                textSize: params.textSize,
                textColor: params.textColor,
                textAlpha: params.textAlpha,
                textAnchor: params.textAnchor,
                depth: params.depth,
            };

            return new UIText(textParams);
        };

        super(params, createContent);

        if (!this._isValid) return;

        const btnSlot = this._buttonSlot;

        UITextButton._textColors[btnSlot] = params.textColor ?? UI.COLORS.BLACK;
        UITextButton._textAlphas[btnSlot] = params.textAlpha ?? 1;
        UITextButton._textDisabledColors[btnSlot] = params.textDisabledColor ?? UI.COLORS.BF_GREY_2;
        UITextButton._textDisabledAlphas[btnSlot] = params.textDisabledAlpha ?? 1;

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const btnSlot = this._buttonSlot;

        if (btnSlot !== UIBaseButton._INVALID_INDEX) {
            UITextButton._textColors[btnSlot] = null;
            UITextButton._textDisabledColors[btnSlot] = null;
            UITextButton._textAlphas[btnSlot] = 0;
            UITextButton._textDisabledAlphas[btnSlot] = 0;
        }

        super.delete();
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!contentWidget) return;

        if (enabled) {
            mod.SetUITextColor(contentWidget, UITextButton._textColors[btnSlot]!);
            mod.SetUITextAlpha(contentWidget, UITextButton._textAlphas[btnSlot]);
        } else {
            mod.SetUITextColor(contentWidget, UITextButton._textDisabledColors[btnSlot]!);
            mod.SetUITextAlpha(contentWidget, UITextButton._textDisabledAlphas[btnSlot]);
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
        if (this._getIsInvalidAndLogWarning()) return this;

        super.setEnabled(enabled);
        this._setContentEnabled(enabled);

        return this;
    }

    /**
     * The label message of the text, or undefined if deleted.
     * @returns The label message, or undefined if deleted.
     */
    public get label(): mod.Message | undefined {
        return this._isValid ? this.content?.label : undefined;
    }

    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     */
    public set label(label: mod.Message) {
        this.setLabel(label);
    }

    /**
     * Sets the label message of the text.
     * @param label - The new label message.
     * @returns This text button for chaining.
     */
    public setLabel(label: mod.Message): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setLabel(label);

        return this;
    }

    /**
     * The size of the text, or undefined if deleted.
     * @returns The text size, or undefined if deleted.
     */
    public get textSize(): number | undefined {
        return this._isValid ? this.content?.textSize : undefined;
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     */
    public set textSize(size: number) {
        this.setTextSize(size);
    }

    /**
     * Sets the size of the text.
     * @param size - The new size.
     * @returns This text button for chaining.
     */
    public setTextSize(size: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setTextSize(size);

        return this;
    }

    /**
     * The anchor of the text, or undefined if deleted.
     * @returns The text anchor alignment, or undefined if deleted.
     */
    public get textAnchor(): mod.UIAnchor | undefined {
        return this._isValid ? this.content?.textAnchor : undefined;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: mod.UIAnchor) {
        this.setTextAnchor(anchor);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text button for chaining.
     */
    public setTextAnchor(anchor: mod.UIAnchor): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setTextAnchor(anchor);

        return this;
    }

    /**
     * The color of the text when the button is enabled, or undefined if deleted.
     * @returns The text color vector, or undefined if deleted.
     */
    public get textColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : (UITextButton._textColors[btnSlot] ?? undefined);
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    public set textColor(color: mod.Vector) {
        this.setTextColor(color);
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     * @returns This text button for chaining.
     */
    public setTextColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UITextButton._textColors[btnSlot] = color;

        if (this.enabled) {
            this.content?.setTextColor(color);
        }

        return this;
    }

    /**
     * The alpha of the text when the button is enabled, or undefined if deleted.
     * @returns The text alpha opacity, or undefined if deleted.
     */
    public get textAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UITextButton._textAlphas[btnSlot];
    }

    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     */
    public set textAlpha(alpha: number) {
        this.setTextAlpha(alpha);
    }

    /**
     * Sets the alpha of the text when the button is enabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    public setTextAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UITextButton._textAlphas[btnSlot] = alpha;

        if (this.enabled) {
            this.content?.setTextAlpha(alpha);
        }

        return this;
    }

    /**
     * The color of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text color vector, or undefined if deleted.
     */
    public get textDisabledColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : (UITextButton._textDisabledColors[btnSlot] ?? undefined);
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    public set textDisabledColor(color: mod.Vector) {
        this.setTextDisabledColor(color);
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new disabled color.
     * @returns This text button for chaining.
     */
    public setTextDisabledColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UITextButton._textDisabledColors[btnSlot] = color;

        if (!this.enabled) {
            this.content?.setTextColor(color);
        }

        return this;
    }

    /**
     * The alpha of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text alpha opacity, or undefined if deleted.
     */
    public get textDisabledAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UITextButton._textDisabledAlphas[btnSlot];
    }

    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     */
    public set textDisabledAlpha(alpha: number) {
        this.setTextDisabledAlpha(alpha);
    }

    /**
     * Sets the alpha of the text when the button is disabled.
     * @param alpha - The new alpha.
     * @returns This text button for chaining.
     */
    public setTextDisabledAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UITextButton._textDisabledAlphas[btnSlot] = alpha;

        if (!this.enabled) {
            this.content?.setTextAlpha(alpha);
        }

        return this;
    }
}

export namespace UITextButton {
    /**
     * The parameters for creating a new text button.
     */
    export type Params = UIBaseButton.Params &
        UIText.Params & {
            textDisabledColor?: mod.Vector;
            textDisabledAlpha?: number;
        };
}
