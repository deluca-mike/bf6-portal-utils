import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';

// version: 10.0.0
export class UIButton extends UIBaseButton {
    private static readonly _baseRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);
    private static readonly _disabledRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);
    private static readonly _pressedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);
    private static readonly _focusedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    private static _packRgba(color: Colors.Color, alpha: number): number {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        return (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _unpackColor(rgba: number, out?: Colors.Color): Colors.Color {
        const r = (rgba >>> 24) / 255;
        const g = ((rgba >>> 16) & 0xff) / 255;
        const b = ((rgba >>> 8) & 0xff) / 255;
        if (out) {
            out.r = r;
            out.g = g;
            out.b = b;
            return out;
        }
        return { r, g, b };
    }

    private static _unpackAlpha(rgba: number): number {
        return (rgba & 0xff) / 255;
    }

    private static _setRgb(arr: Uint32Array, slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = arr[slot] & 0xff;
        arr[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _setAlpha(arr: Uint32Array, slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        arr[slot] = (arr[slot] & ~0xff) | aInt;
    }

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
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? UI.BgFill.Solid;
        const depth = params.depth ?? UI.Depth.AboveGameUI;
        const enabled = params.enabled ?? true;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeBgFill = UI.Element._getNativeBgFill(bgFill);
        const nativeDepth = UI.Element._getNativeDepth(depth);

        if (!receiver.nativeReceiver) {
            mod.AddUIButton(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                enabled,
                Colors.toVector(baseColor),
                baseAlpha,
                Colors.toVector(disabledColor),
                disabledAlpha,
                Colors.toVector(pressedColor),
                pressedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                nativeDepth
            );
        } else {
            mod.AddUIButton(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                enabled,
                Colors.toVector(baseColor),
                baseAlpha,
                Colors.toVector(disabledColor),
                disabledAlpha,
                Colors.toVector(pressedColor),
                pressedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        const btnSlot = this._buttonSlot;
        if (btnSlot !== UIBaseButton._INVALID_INDEX) {
            UIButton._baseRgba[btnSlot] = UIButton._packRgba(baseColor, baseAlpha);
            UIButton._disabledRgba[btnSlot] = UIButton._packRgba(disabledColor, disabledAlpha);
            UIButton._pressedRgba[btnSlot] = UIButton._packRgba(pressedColor, pressedAlpha);
            UIButton._focusedRgba[btnSlot] = UIButton._packRgba(focusedColor, focusedAlpha);
        }

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
     * @inheritdoc
     */
    public override delete(): void {
        const btnSlot = this._buttonSlot;
        if (btnSlot !== UIBaseButton._INVALID_INDEX) {
            UIButton._baseRgba[btnSlot] = 0;
            UIButton._disabledRgba[btnSlot] = 0;
            UIButton._pressedRgba[btnSlot] = 0;
            UIButton._focusedRgba[btnSlot] = 0;
        }

        super.delete();
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
     * @returns The base color, or undefined if deleted.
     */
    public get baseColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UIButton._unpackColor(UIButton._baseRgba[btnSlot]);
    }

    /**
     * Retrieves the base color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The base color, or undefined if deleted.
     */
    public getBaseColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._baseRgba[btnSlot], out);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: Colors.Color) {
        this.setBaseColor(color);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    public setBaseColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setRgb(UIButton._baseRgba, btnSlot, color);
        mod.SetUIButtonColorBase(this._uiWidget, Colors.toVector(color));

        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UIButton._unpackAlpha(UIButton._baseRgba[btnSlot]);
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
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setAlpha(UIButton._baseRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaBase(this._uiWidget, alpha);

        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color, or undefined if deleted.
     */
    public get disabledColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._disabledRgba[btnSlot]);
    }

    /**
     * Retrieves the disabled color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled color, or undefined if deleted.
     */
    public getDisabledColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._disabledRgba[btnSlot], out);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: Colors.Color) {
        this.setDisabledColor(color);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    public setDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setRgb(UIButton._disabledRgba, btnSlot, color);
        mod.SetUIButtonColorDisabled(this._uiWidget, Colors.toVector(color));

        return this;
    }

    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public get disabledAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackAlpha(UIButton._disabledRgba[btnSlot]);
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
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setAlpha(UIButton._disabledRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaDisabled(this._uiWidget, alpha);

        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color, or undefined if deleted.
     */
    public get pressedColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._pressedRgba[btnSlot]);
    }

    /**
     * Retrieves the pressed color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The pressed color, or undefined if deleted.
     */
    public getPressedColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._pressedRgba[btnSlot], out);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: Colors.Color) {
        this.setPressedColor(color);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    public setPressedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setRgb(UIButton._pressedRgba, btnSlot, color);
        mod.SetUIButtonColorPressed(this._uiWidget, Colors.toVector(color));

        return this;
    }

    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public get pressedAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackAlpha(UIButton._pressedRgba[btnSlot]);
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
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setAlpha(UIButton._pressedRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaPressed(this._uiWidget, alpha);

        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color, or undefined if deleted.
     */
    public get focusedColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._focusedRgba[btnSlot]);
    }

    /**
     * Retrieves the focused color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The focused color, or undefined if deleted.
     */
    public getFocusedColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackColor(UIButton._focusedRgba[btnSlot], out);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: Colors.Color) {
        this.setFocusedColor(color);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    public setFocusedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setRgb(UIButton._focusedRgba, btnSlot, color);
        mod.SetUIButtonColorFocused(this._uiWidget, Colors.toVector(color));

        return this;
    }

    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public get focusedAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIButton._unpackAlpha(UIButton._focusedRgba[btnSlot]);
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
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIButton._setAlpha(UIButton._focusedRgba, btnSlot, alpha);
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
