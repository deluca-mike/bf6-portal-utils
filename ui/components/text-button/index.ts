import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
import { UIText } from '../text/index.ts';

// version: 10.0.0
export class UITextButton extends UIContentButton<UIText> {
    private static readonly _scratchTextParams: UIText.Params = {
        label: null as unknown as mod.Message,
    };

    /**
     * Creates a new text button.
     * @param params - The parameters for the text button.
     */
    public constructor(params: UITextButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIText => {
            const scratch = UITextButton._scratchTextParams;
            scratch.parent = parent;
            scratch.width = width;
            scratch.height = height;
            scratch.label = params.label;
            scratch.textSize = params.textSize;
            scratch.textColor = params.textColor;
            scratch.textAlpha = params.textAlpha;
            scratch.textAnchor = params.textAnchor;
            scratch.depth = params.depth;

            const text = new UIText(scratch);

            scratch.parent = undefined;
            scratch.label = null as unknown as mod.Message;
            scratch.textColor = undefined;

            return text;
        };

        super(params, createContent);

        if (!this._isValid) return;

        const btnSlot = this._buttonSlot;
        const textColor = params.textColor ?? UI.COLORS.BLACK;
        const textAlpha = params.textAlpha ?? 1;
        const textDisabledColor = params.textDisabledColor ?? UI.COLORS.BF_GREY_2;
        const textDisabledAlpha = params.textDisabledAlpha ?? 1;

        UIBaseButton._setAlpha(UIContentButton._contentRgba, btnSlot, textAlpha);
        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, textColor);
        UIBaseButton._setAlpha(UIContentButton._contentDisabledRgba, btnSlot, textDisabledAlpha);
        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, textDisabledColor);

        if (!this.enabled) {
            this._setContentEnabled(false);
        }
    }

    protected override _setContentEnabled(enabled: boolean): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const content = this.content;
        const contentWidget = content ? UI.Element._getNativeWidget(content) : null;

        if (!content || !contentWidget) return;

        const rgba = enabled ? UIContentButton._contentRgba[btnSlot] : UIContentButton._contentDisabledRgba[btnSlot];
        const color = UIBaseButton._unpackColor(rgba);
        const alpha = UIBaseButton._unpackAlpha(rgba);

        content.setTextColor(color);
        content.setTextAlpha(alpha);
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
    public get textAnchor(): UI.Anchor | undefined {
        return this._isValid ? this.content?.textAnchor : undefined;
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     */
    public set textAnchor(anchor: UI.Anchor) {
        this.setTextAnchor(anchor);
    }

    /**
     * Sets the anchor of the text.
     * @param anchor - The new anchor.
     * @returns This text button for chaining.
     */
    public setTextAnchor(anchor: UI.Anchor): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this.content?.setTextAnchor(anchor);

        return this;
    }

    /**
     * The color of the text when the button is enabled, or undefined if deleted.
     * @returns The text color, or undefined if deleted.
     */
    public get textColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot]);
    }

    /**
     * Retrieves the text color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The text color, or undefined if deleted.
     */
    public getTextColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentRgba[btnSlot], out);
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     */
    public set textColor(color: Colors.Color) {
        this.setTextColor(color);
    }

    /**
     * Sets the color of the text when the button is enabled.
     * @param color - The new color.
     * @returns This text button for chaining.
     */
    public setTextColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentRgba, btnSlot, color);

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

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackAlpha(UIContentButton._contentRgba[btnSlot]);
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

        UIBaseButton._setAlpha(UIContentButton._contentRgba, btnSlot, alpha);

        if (this.enabled) {
            this.content?.setTextAlpha(alpha);
        }

        return this;
    }

    /**
     * The color of the text when the button is disabled, or undefined if deleted.
     * @returns The disabled text color, or undefined if deleted.
     */
    public get textDisabledColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot]);
    }

    /**
     * Retrieves the disabled text color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled text color, or undefined if deleted.
     */
    public getTextDisabledColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackColor(UIContentButton._contentDisabledRgba[btnSlot], out);
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new color.
     */
    public set textDisabledColor(color: Colors.Color) {
        this.setTextDisabledColor(color);
    }

    /**
     * Sets the color of the text when the button is disabled.
     * @param color - The new disabled color.
     * @returns This text button for chaining.
     */
    public setTextDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIContentButton._contentDisabledRgba, btnSlot, color);

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

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIBaseButton._unpackAlpha(UIContentButton._contentDisabledRgba[btnSlot]);
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

        UIBaseButton._setAlpha(UIContentButton._contentDisabledRgba, btnSlot, alpha);

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
            textDisabledColor?: Colors.Color;
            textDisabledAlpha?: number;
        };
}
