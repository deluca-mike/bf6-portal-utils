import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';

// version: 9.0.0
export class UIButton extends UIBaseButton {
    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    public constructor(params: UIButton.Params) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? mod.UIBgFill.Solid;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const enabled = params.enabled ?? true;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        if (!receiver.nativeReceiver) {
            mod.AddUIButton(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                enabled,
                baseColor,
                baseAlpha,
                disabledColor,
                disabledAlpha,
                pressedColor,
                pressedAlpha,
                focusedColor,
                focusedAlpha,
                focusedColor,
                focusedAlpha,
                depth
            );
        } else {
            mod.AddUIButton(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                enabled,
                baseColor,
                baseAlpha,
                disabledColor,
                disabledAlpha,
                pressedColor,
                pressedAlpha,
                focusedColor,
                focusedAlpha,
                focusedColor,
                focusedAlpha,
                depth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        if (params.onClickDown) {
            this._setButtonHandler(UIBaseButton.Event.ClickDown, params.onClickDown);
        }

        if (params.onClickUp) {
            this._setButtonHandler(UIBaseButton.Event.ClickUp, params.onClickUp);
        }

        if (params.onFocusIn) {
            this._setButtonHandler(UIBaseButton.Event.FocusIn, params.onFocusIn);
        }

        if (params.onFocusOut) {
            this._setButtonHandler(UIBaseButton.Event.FocusOut, params.onFocusOut);
        }
    }

    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public get enabled(): boolean | undefined {
        return this._isValid ? mod.GetUIButtonEnabled(this._uiWidget) : undefined;
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    public setEnabled(enabled: boolean): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonEnabled(this._uiWidget, enabled);

        return this;
    }

    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    public get baseColor(): mod.Vector | undefined {
        return this._isValid ? mod.GetUIButtonColorBase(this._uiWidget) : undefined;
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        this.setBaseColor(color);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    public setBaseColor(color: mod.Vector): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonColorBase(this._uiWidget, color);

        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        return this._isValid ? mod.GetUIButtonAlphaBase(this._uiWidget) : undefined;
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        this.setBaseAlpha(alpha);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This button for chaining.
     */
    public setBaseAlpha(alpha: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonAlphaBase(this._uiWidget, alpha);

        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public get disabledColor(): mod.Vector | undefined {
        return this._isValid ? mod.GetUIButtonColorDisabled(this._uiWidget) : undefined;
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        this.setDisabledColor(color);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    public setDisabledColor(color: mod.Vector): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonColorDisabled(this._uiWidget, color);

        return this;
    }

    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public get disabledAlpha(): number | undefined {
        return this._isValid ? mod.GetUIButtonAlphaDisabled(this._uiWidget) : undefined;
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        this.setDisabledAlpha(alpha);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This button for chaining.
     */
    public setDisabledAlpha(alpha: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonAlphaDisabled(this._uiWidget, alpha);

        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public get pressedColor(): mod.Vector | undefined {
        return this._isValid ? mod.GetUIButtonColorPressed(this._uiWidget) : undefined;
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        this.setPressedColor(color);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    public setPressedColor(color: mod.Vector): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonColorPressed(this._uiWidget, color);

        return this;
    }

    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public get pressedAlpha(): number | undefined {
        return this._isValid ? mod.GetUIButtonAlphaPressed(this._uiWidget) : undefined;
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        this.setPressedAlpha(alpha);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This button for chaining.
     */
    public setPressedAlpha(alpha: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonAlphaPressed(this._uiWidget, alpha);

        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public get focusedColor(): mod.Vector | undefined {
        return this._isValid ? mod.GetUIButtonColorFocused(this._uiWidget) : undefined;
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        this.setFocusedColor(color);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    public setFocusedColor(color: mod.Vector): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonColorFocused(this._uiWidget, color);

        return this;
    }

    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public get focusedAlpha(): number | undefined {
        return this._isValid ? mod.GetUIButtonAlphaFocused(this._uiWidget) : undefined;
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        this.setFocusedAlpha(alpha);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This button for chaining.
     */
    public setFocusedAlpha(alpha: number): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        mod.SetUIButtonAlphaFocused(this._uiWidget, alpha);

        return this;
    }
}

export namespace UIButton {
    export import Event = UIBaseButton.Event;
    export type Handlers = UIBaseButton.Handlers;
    export type Styling = UIBaseButton.Styling;
    export type Params = UIBaseButton.Params;
}
