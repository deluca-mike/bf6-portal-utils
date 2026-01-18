import { UI } from '../../index.ts';

// version: 6.0.0
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
    protected _onClick: ((player: mod.Player) => Promise<void>) | undefined;
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

    public override delete(): void {
        this._unregisterAsButton();
        super.delete();
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonEnabled(this._uiWidget, (this._enabled = enabled));
    }

    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    public get baseColor(): mod.Vector {
        return this._baseColor;
    }

    public set baseColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorBase(this._uiWidget, (this._baseColor = color));
    }

    public setBaseColor(color: mod.Vector): this {
        this.baseColor = color;
        return this;
    }

    public get baseAlpha(): number {
        return this._baseAlpha;
    }

    public set baseAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaBase(this._uiWidget, (this._baseAlpha = alpha));
    }

    public setBaseAlpha(alpha: number): this {
        this.baseAlpha = alpha;
        return this;
    }

    public get disabledColor(): mod.Vector {
        return this._disabledColor;
    }

    public set disabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorDisabled(this._uiWidget, (this._disabledColor = color));
    }

    public setDisabledColor(color: mod.Vector): this {
        this.disabledColor = color;
        return this;
    }

    public get disabledAlpha(): number {
        return this._disabledAlpha;
    }

    public set disabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaDisabled(this._uiWidget, (this._disabledAlpha = alpha));
    }

    public setDisabledAlpha(alpha: number): this {
        this.disabledAlpha = alpha;
        return this;
    }

    public get pressedColor(): mod.Vector {
        return this._pressedColor;
    }

    public set pressedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorPressed(this._uiWidget, (this._pressedColor = color));
    }

    public setColorPressed(color: mod.Vector): this {
        this.pressedColor = color;
        return this;
    }

    public get pressedAlpha(): number {
        return this._pressedAlpha;
    }

    public set pressedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaPressed(this._uiWidget, (this._pressedAlpha = alpha));
    }

    public setPressedAlpha(alpha: number): this {
        this.pressedAlpha = alpha;
        return this;
    }

    public get hoverColor(): mod.Vector {
        return this._hoverColor;
    }

    public set hoverColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorHover(this._uiWidget, (this._hoverColor = color));
    }

    public setHoverColor(color: mod.Vector): this {
        this.hoverColor = color;
        return this;
    }

    public get hoverAlpha(): number {
        return this._hoverAlpha;
    }

    public set hoverAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaHover(this._uiWidget, (this._hoverAlpha = alpha));
    }

    public setHoverAlpha(alpha: number): this {
        this.hoverAlpha = alpha;
        return this;
    }

    public get focusedColor(): mod.Vector {
        return this._focusedColor;
    }

    public set focusedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorFocused(this._uiWidget, (this._focusedColor = color));
    }

    public setFocusedColor(color: mod.Vector): this {
        this.focusedColor = color;
        return this;
    }

    public get focusedAlpha(): number {
        return this._focusedAlpha;
    }

    public set focusedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaFocused(this._uiWidget, (this._focusedAlpha = alpha));
    }

    public setFocusedAlpha(alpha: number): this {
        this.focusedAlpha = alpha;
        return this;
    }

    public get onClick(): ((player: mod.Player) => Promise<void>) | undefined {
        return this._onClick;
    }

    public set onClick(onClick: ((player: mod.Player) => Promise<void>) | undefined) {
        if (this._isDeletedCheck()) return;

        this._onClick = onClick;
    }

    public setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): this {
        this.onClick = onClick;
        return this;
    }
}

export namespace UIButton {
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
        onClick?: (player: mod.Player) => Promise<void>;
    };
}
