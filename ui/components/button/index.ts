import { UI } from '../../index.ts';

// version: 9.0.0
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
                UI.Element._getNativeWidget(parent.id)!,
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
                UI.Element._getNativeWidget(parent.id)!,
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
     * Whether the button is enabled.
     * @returns True if enabled, false otherwise.
     */
    public get enabled(): boolean {
        return this._isDeletedCheck() ? false : mod.GetUIButtonEnabled(this._uiWidget);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonEnabled(this._uiWidget, enabled);
    }

    /**
     * The base color of the button.
     * @returns The base color vector.
     */
    public get baseColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorBase(this._uiWidget);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorBase(this._uiWidget, color);
    }

    /**
     * The base alpha of the button.
     * @returns The base alpha opacity.
     */
    public get baseAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaBase(this._uiWidget);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaBase(this._uiWidget, alpha);
    }

    /**
     * The disabled color of the button.
     * @returns The disabled color vector.
     */
    public get disabledColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorDisabled(this._uiWidget);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorDisabled(this._uiWidget, color);
    }

    /**
     * The disabled alpha of the button.
     * @returns The disabled alpha opacity.
     */
    public get disabledAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaDisabled(this._uiWidget);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaDisabled(this._uiWidget, alpha);
    }

    /**
     * The pressed color of the button.
     * @returns The pressed color vector.
     */
    public get pressedColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorPressed(this._uiWidget);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorPressed(this._uiWidget, color);
    }

    /**
     * The pressed alpha of the button.
     * @returns The pressed alpha opacity.
     */
    public get pressedAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaPressed(this._uiWidget);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaPressed(this._uiWidget, alpha);
    }

    /**
     * The focused color of the button.
     * @returns The focused color vector.
     */
    public get focusedColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorFocused(this._uiWidget);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorFocused(this._uiWidget, color);
    }

    /**
     * The focused alpha of the button.
     * @returns The focused alpha opacity.
     */
    public get focusedAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaFocused(this._uiWidget);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaFocused(this._uiWidget, alpha);
    }

    /**
     * The click down handler of the button.
     * @returns The click down handler, or undefined.
     */
    public get onClickDown(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnClickDown(this._getButtonSlot());
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickDown(btnSlot);

        if (onClickDown && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, true);
        } else if (!onClickDown && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, false);
        }

        this._setButtonOnClickDown(btnSlot, onClickDown);
    }

    /**
     * The click up handler of the button.
     * @returns The click up handler, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnClickUp(this._getButtonSlot());
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickUp(btnSlot);

        if (onClickUp && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, true);
        } else if (!onClickUp && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, false);
        }

        this._setButtonOnClickUp(btnSlot, onClickUp);
    }

    /**
     * The focus in handler of the button.
     * @returns The focus in handler, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnFocusIn(this._getButtonSlot());
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusIn(btnSlot);

        if (onFocusIn && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, true);
        } else if (!onFocusIn && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, false);
        }

        this._setButtonOnFocusIn(btnSlot, onFocusIn);
    }

    /**
     * The focus out handler of the button.
     * @returns The focus out handler, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnFocusOut(this._getButtonSlot());
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusOut(btnSlot);

        if (onFocusOut && !prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, true);
        } else if (!onFocusOut && prev) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, false);
        }

        this._setButtonOnFocusOut(btnSlot, onFocusOut);
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
