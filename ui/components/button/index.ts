import { UI } from '../../index.ts';

// version: 10.0.0
export class UIButton extends UI.Element implements UI.Button {
    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    public constructor(params: UIButton.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
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

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor,
            bgAlpha,
            bgFill,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        const btnSlot = this._allocateButtonSlot();

        if (params.onClickDown) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, true);
            this._setButtonOnClickDown(btnSlot, params.onClickDown);
        }

        if (params.onClickUp) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, true);
            this._setButtonOnClickUp(btnSlot, params.onClickUp);
        }

        if (params.onFocusIn) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, true);
            this._setButtonOnFocusIn(btnSlot, params.onFocusIn);
        }

        if (params.onFocusOut) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, true);
            this._setButtonOnFocusOut(btnSlot, params.onFocusOut);
        }
    }

    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public get enabled(): boolean | undefined {
        return this.getEnabled();
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * Retrieves whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public getEnabled(): boolean | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonEnabled(this._uiWidget);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    public setEnabled(enabled: boolean): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonEnabled(this._uiWidget, enabled);
        return this;
    }

    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    public get baseColor(): mod.Vector | undefined {
        return this.getBaseColor();
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        this.setBaseColor(color);
    }

    /**
     * Retrieves the base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    public getBaseColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorBase(this._uiWidget);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    public setBaseColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorBase(this._uiWidget, color);
        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        return this.getBaseAlpha();
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        this.setBaseAlpha(alpha);
    }

    /**
     * Retrieves the base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public getBaseAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaBase(this._uiWidget);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This button for chaining.
     */
    public setBaseAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaBase(this._uiWidget, alpha);
        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public get disabledColor(): mod.Vector | undefined {
        return this.getDisabledColor();
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        this.setDisabledColor(color);
    }

    /**
     * Retrieves the disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public getDisabledColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorDisabled(this._uiWidget);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    public setDisabledColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorDisabled(this._uiWidget, color);
        return this;
    }

    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public get disabledAlpha(): number | undefined {
        return this.getDisabledAlpha();
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        this.setDisabledAlpha(alpha);
    }

    /**
     * Retrieves the disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public getDisabledAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaDisabled(this._uiWidget);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This button for chaining.
     */
    public setDisabledAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaDisabled(this._uiWidget, alpha);
        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public get pressedColor(): mod.Vector | undefined {
        return this.getPressedColor();
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        this.setPressedColor(color);
    }

    /**
     * Retrieves the pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public getPressedColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorPressed(this._uiWidget);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    public setPressedColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorPressed(this._uiWidget, color);
        return this;
    }

    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public get pressedAlpha(): number | undefined {
        return this.getPressedAlpha();
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        this.setPressedAlpha(alpha);
    }

    /**
     * Retrieves the pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public getPressedAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaPressed(this._uiWidget);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This button for chaining.
     */
    public setPressedAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaPressed(this._uiWidget, alpha);
        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public get focusedColor(): mod.Vector | undefined {
        return this.getFocusedColor();
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        this.setFocusedColor(color);
    }

    /**
     * Retrieves the focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public getFocusedColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorFocused(this._uiWidget);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    public setFocusedColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorFocused(this._uiWidget, color);
        return this;
    }

    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public get focusedAlpha(): number | undefined {
        return this.getFocusedAlpha();
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        this.setFocusedAlpha(alpha);
    }

    /**
     * Retrieves the focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public getFocusedAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaFocused(this._uiWidget);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This button for chaining.
     */
    public setFocusedAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaFocused(this._uiWidget, alpha);
        return this;
    }

    /**
     * The click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    public get onClickDown(): UI.ButtonHandler | null | undefined {
        return this.getOnClickDown();
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | null | undefined) {
        this.setOnClickDown(onClickDown);
    }

    /**
     * Retrieves the click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    public getOnClickDown(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnClickDown(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     * @returns This button for chaining.
     */
    public setOnClickDown(onClickDown?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickDown(btnSlot);

        if (onClickDown && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, true);
        } else if (!onClickDown && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, false);
        }

        this._setButtonOnClickDown(btnSlot, onClickDown);
        return this;
    }

    /**
     * The click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | null | undefined {
        return this.getOnClickUp();
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | null | undefined) {
        this.setOnClickUp(onClickUp);
    }

    /**
     * Retrieves the click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    public getOnClickUp(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnClickUp(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     * @returns This button for chaining.
     */
    public setOnClickUp(onClickUp?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickUp(btnSlot);

        if (onClickUp && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, true);
        } else if (!onClickUp && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, false);
        }

        this._setButtonOnClickUp(btnSlot, onClickUp);
        return this;
    }

    /**
     * The focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | null | undefined {
        return this.getOnFocusIn();
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | null | undefined) {
        this.setOnFocusIn(onFocusIn);
    }

    /**
     * Retrieves the focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    public getOnFocusIn(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnFocusIn(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     * @returns This button for chaining.
     */
    public setOnFocusIn(onFocusIn?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusIn(btnSlot);

        if (onFocusIn && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, true);
        } else if (!onFocusIn && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, false);
        }

        this._setButtonOnFocusIn(btnSlot, onFocusIn);
        return this;
    }

    /**
     * The focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | null | undefined {
        return this.getOnFocusOut();
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | null | undefined) {
        this.setOnFocusOut(onFocusOut);
    }

    /**
     * Retrieves the focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    public getOnFocusOut(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnFocusOut(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     * @returns This button for chaining.
     */
    public setOnFocusOut(onFocusOut?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusOut(btnSlot);

        if (onFocusOut && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, true);
        } else if (!onFocusOut && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, false);
        }

        this._setButtonOnFocusOut(btnSlot, onFocusOut);
        return this;
    }
}

export namespace UIButton {
    /**
     * The parameters for creating a new button.
     */
    export type Params = UI.ElementParams & {
        enabled?: boolean;
        baseColor?: mod.Vector;
        baseAlpha?: number;
        disabledColor?: mod.Vector;
        disabledAlpha?: number;
        pressedColor?: mod.Vector;
        pressedAlpha?: number;
        focusedColor?: mod.Vector;
        focusedAlpha?: number;
        onClickDown?: UI.ButtonHandler;
        onClickUp?: UI.ButtonHandler;
        onFocusIn?: UI.ButtonHandler;
        onFocusOut?: UI.ButtonHandler;
    };
}
