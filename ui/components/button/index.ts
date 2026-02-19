import { UI } from '../../index.ts';

// version: 6.1.1
export class UIButton extends UI.Element implements UI.Button {
    protected _enabled: boolean;
    protected _baseColor: mod.Vector;
    protected _baseAlpha: number;
    protected _disabledColor: mod.Vector;
    protected _disabledAlpha: number;
    protected _pressedColor: mod.Vector;
    protected _pressedAlpha: number;
    protected _hoverColor: mod.Vector;
    protected _hoverAlpha: number;
    protected _focusedColor: mod.Vector;
    protected _focusedAlpha: number;
    protected _onClick: ((player: mod.Player) => Promise<void> | void) | undefined;
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
        const name = UI.makeName(parent, receiver);
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
        const hoverColor = params.hoverColor ?? UI.COLORS.BF_GREY_1;
        const hoverAlpha = params.hoverAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;
        const onClick = params.onClick;

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
            params.enabled ?? true,
            params.baseColor ?? UI.COLORS.BF_GREY_2,
            params.baseAlpha ?? 1,
            params.disabledColor ?? UI.COLORS.BF_GREY_3,
            params.disabledAlpha ?? 1,
            params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT,
            params.pressedAlpha ?? 1,
            params.hoverColor ?? UI.COLORS.BF_GREY_1,
            params.hoverAlpha ?? 1,
            params.focusedColor ?? UI.COLORS.BF_GREY_1,
            params.focusedAlpha ?? 1,
            elementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIButton(...args);
        } else {
            mod.AddUIButton(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        this._enabled = enabled;
        this._baseColor = baseColor;
        this._baseAlpha = baseAlpha;
        this._disabledColor = disabledColor;
        this._disabledAlpha = disabledAlpha;
        this._pressedColor = pressedColor;
        this._pressedAlpha = pressedAlpha;
        this._hoverColor = hoverColor;
        this._hoverAlpha = hoverAlpha;
        this._focusedColor = focusedColor;
        this._focusedAlpha = focusedAlpha;
        this._onClick = onClick;

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
     */
    public get enabled(): boolean {
        return this._enabled;
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonEnabled(this._uiWidget, (this._enabled = enabled));
    }

    /**
     * Sets whether the button is enabled. Useful for chaining operations.
     * @param enabled - The new enabled state.
     * @returns This element instance.
     */
    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    /**
     * The base color of the button.
     */
    public get baseColor(): mod.Vector {
        return this._baseColor;
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorBase(this._uiWidget, (this._baseColor = color));
    }

    /**
     * Sets the base color of the button. Useful for chaining operations.
     * @param color - The new base color.
     * @returns This element instance.
     */
    public setBaseColor(color: mod.Vector): this {
        this.baseColor = color;
        return this;
    }

    /**
     * The base alpha of the button.
     */
    public get baseAlpha(): number {
        return this._baseAlpha;
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaBase(this._uiWidget, (this._baseAlpha = alpha));
    }

    /**
     * Sets the base alpha of the button. Useful for chaining operations.
     * @param alpha - The new base alpha.
     * @returns This element instance.
     */
    public setBaseAlpha(alpha: number): this {
        this.baseAlpha = alpha;
        return this;
    }

    /**
     * The disabled color of the button.
     */
    public get disabledColor(): mod.Vector {
        return this._disabledColor;
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorDisabled(this._uiWidget, (this._disabledColor = color));
    }

    /**
     * Sets the disabled color of the button. Useful for chaining operations.
     * @param color - The new disabled color.
     * @returns This element instance.
     */
    public setDisabledColor(color: mod.Vector): this {
        this.disabledColor = color;
        return this;
    }

    /**
     * The disabled alpha of the button.
     */
    public get disabledAlpha(): number {
        return this._disabledAlpha;
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaDisabled(this._uiWidget, (this._disabledAlpha = alpha));
    }

    /**
     * Sets the disabled alpha of the button. Useful for chaining operations.
     * @param alpha - The new disabled alpha.
     * @returns This element instance.
     */
    public setDisabledAlpha(alpha: number): this {
        this.disabledAlpha = alpha;
        return this;
    }

    /**
     * The pressed color of the button.
     */
    public get pressedColor(): mod.Vector {
        return this._pressedColor;
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorPressed(this._uiWidget, (this._pressedColor = color));
    }

    /**
     * Sets the pressed color of the button. Useful for chaining operations.
     * @param color - The new pressed color.
     * @returns This element instance.
     */
    public setColorPressed(color: mod.Vector): this {
        this.pressedColor = color;
        return this;
    }

    /**
     * The pressed alpha of the button.
     */
    public get pressedAlpha(): number {
        return this._pressedAlpha;
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaPressed(this._uiWidget, (this._pressedAlpha = alpha));
    }

    /**
     * Sets the pressed alpha of the button. Useful for chaining operations.
     * @param alpha - The new pressed alpha.
     * @returns This element instance.
     */
    public setPressedAlpha(alpha: number): this {
        this.pressedAlpha = alpha;
        return this;
    }

    /**
     * The hover color of the button.
     */
    public get hoverColor(): mod.Vector {
        return this._hoverColor;
    }

    /**
     * Sets the hover color of the button.
     * @param color - The new hover color.
     */
    public set hoverColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorHover(this._uiWidget, (this._hoverColor = color));
    }

    /**
     * Sets the hover color of the button. Useful for chaining operations.
     * @param color - The new hover color.
     * @returns This element instance.
     */
    public setHoverColor(color: mod.Vector): this {
        this.hoverColor = color;
        return this;
    }

    /**
     * The hover alpha of the button.
     */
    public get hoverAlpha(): number {
        return this._hoverAlpha;
    }

    /**
     * Sets the hover alpha of the button.
     * @param alpha - The new hover alpha.
     */
    public set hoverAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaHover(this._uiWidget, (this._hoverAlpha = alpha));
    }

    /**
     * Sets the hover alpha of the button. Useful for chaining operations.
     * @param alpha - The new hover alpha.
     * @returns This element instance.
     */
    public setHoverAlpha(alpha: number): this {
        this.hoverAlpha = alpha;
        return this;
    }

    /**
     * The focused color of the button.
     */
    public get focusedColor(): mod.Vector {
        return this._focusedColor;
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorFocused(this._uiWidget, (this._focusedColor = color));
    }

    /**
     * Sets the focused color of the button. Useful for chaining operations.
     * @param color - The new focused color.
     * @returns This element instance.
     */
    public setFocusedColor(color: mod.Vector): this {
        this.focusedColor = color;
        return this;
    }

    /**
     * The focused alpha of the button.
     */
    public get focusedAlpha(): number {
        return this._focusedAlpha;
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaFocused(this._uiWidget, (this._focusedAlpha = alpha));
    }

    /**
     * Sets the focused alpha of the button. Useful for chaining operations.
     * @param alpha - The new focused alpha.
     * @returns This element instance.
     */
    public setFocusedAlpha(alpha: number): this {
        this.focusedAlpha = alpha;
        return this;
    }

    /**
     * The click handler of the button.
     */
    public get onClick(): ((player: mod.Player) => Promise<void> | void) | undefined {
        return this._onClick;
    }

    /**
     * Sets the click handler of the button.
     * @param onClick - The new click handler.
     */
    public set onClick(onClick: ((player: mod.Player) => Promise<void> | void) | undefined) {
        if (this._isDeletedCheck()) return;

        this._onClick = onClick;
    }

    /**
     * Sets the click handler of the button. Useful for chaining operations.
     * @param onClick - The new click handler.
     * @returns This element instance.
     */
    public setOnClick(onClick: ((player: mod.Player) => Promise<void> | void) | undefined): this {
        this.onClick = onClick;
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
        hoverColor?: mod.Vector;
        hoverAlpha?: number;
        focusedColor?: mod.Vector;
        focusedAlpha?: number;
        onClick?: (player: mod.Player) => Promise<void> | void;
    };
}
