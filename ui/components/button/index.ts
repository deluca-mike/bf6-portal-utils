import { UI } from '../../index.ts';

// version: 8.0.0
export class UIButton extends UI.Element implements UI.Button {
    protected _onClickDown?: UI.ButtonHandler;

    protected _onClickUp?: UI.ButtonHandler;

    protected _onFocusIn?: UI.ButtonHandler;

    protected _onFocusOut?: UI.ButtonHandler;

    protected _unregisterAsButton: () => void;

    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    public constructor(params: UIButton.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName();
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);

        const elementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: params.bgColor ?? UI.COLORS.WHITE,
            bgAlpha: params.bgAlpha ?? 1,
            bgFill: params.bgFill ?? mod.UIBgFill.Solid,
            depth: params.depth ?? mod.UIDepth.AboveGameUI,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const enabled = params.enabled ?? true;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        const args: [
            string, // name
            mod.Vector, // position
            mod.Vector, // size
            mod.UIAnchor, // anchor
            mod.UIWidget, // parent
            boolean, // visible
            number, // padding
            mod.Vector, // bgColor
            number, // bgAlpha
            mod.UIBgFill, // bgFill
            boolean, // enabled
            mod.Vector, // baseColor
            number, // baseAlpha
            mod.Vector, // disabledColor
            number, // disabledAlpha
            mod.Vector, // pressedColor
            number, // pressedAlpha
            mod.Vector, // hoverColor
            number, // hoverAlpha
            mod.Vector, // focusedColor
            number, // focusedAlpha
            mod.UIDepth, // depth
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            parent.uiWidget,
            elementParams.visible,
            0,
            elementParams.bgColor,
            elementParams.bgAlpha,
            elementParams.bgFill,
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
            elementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIButton(...args);
        } else {
            mod.AddUIButton(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        if (params.onClickDown) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, true);
            this._onClickDown = params.onClickDown;
        }

        if (params.onClickUp) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, true);
            this._onClickUp = params.onClickUp;
        }

        if (params.onFocusIn) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, true);
            this._onFocusIn = params.onFocusIn;
        }

        if (params.onFocusOut) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, true);
            this._onFocusOut = params.onFocusOut;
        }

        this._unregisterAsButton = UI.registerButton(this._name, this);
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        this._unregisterAsButton();
        super.delete();
    }

    /**
     * Whether the button is enabled.
     * @returns True if enabled, false otherwise.
     */
    public get enabled(): boolean {
        return mod.GetUIButtonEnabled(this._uiWidget);
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
        return mod.GetUIButtonColorBase(this._uiWidget);
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
        return mod.GetUIButtonAlphaBase(this._uiWidget);
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
        return mod.GetUIButtonColorDisabled(this._uiWidget);
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
        return mod.GetUIButtonAlphaDisabled(this._uiWidget);
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
        return mod.GetUIButtonColorPressed(this._uiWidget);
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
        return mod.GetUIButtonAlphaPressed(this._uiWidget);
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
        return mod.GetUIButtonColorFocused(this._uiWidget);
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
        return mod.GetUIButtonAlphaFocused(this._uiWidget);
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
        return this._onClickDown;
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        if (onClickDown && !this._onClickDown) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, true);
        } else if (!onClickDown && this._onClickDown) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonDown, false);
        }

        this._onClickDown = onClickDown;
    }

    /**
     * The click up handler of the button.
     * @returns The click up handler, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | undefined {
        return this._onClickUp;
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        if (onClickUp && !this._onClickUp) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, true);
        } else if (!onClickUp && this._onClickUp) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.ButtonUp, false);
        }

        this._onClickUp = onClickUp;
    }

    /**
     * The focus in handler of the button.
     * @returns The focus in handler, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | undefined {
        return this._onFocusIn;
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        if (onFocusIn && !this._onFocusIn) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, true);
        } else if (!onFocusIn && this._onFocusIn) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusIn, false);
        }

        this._onFocusIn = onFocusIn;
    }

    /**
     * The focus out handler of the button.
     * @returns The focus out handler, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | undefined {
        return this._onFocusOut;
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        if (onFocusOut && !this._onFocusOut) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, true);
        } else if (!onFocusOut && this._onFocusOut) {
            mod.EnableUIButtonEvent(this._uiWidget, mod.UIButtonEvent.FocusOut, false);
        }

        this._onFocusOut = onFocusOut;
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
