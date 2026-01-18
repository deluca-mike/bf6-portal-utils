import { UI } from '../../index.ts';
export declare class UIButton extends UI.Element implements UI.Button {
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
    constructor(params: UIButton.Params);
    delete(): void;
    get enabled(): boolean;
    set enabled(enabled: boolean);
    setEnabled(enabled: boolean): this;
    get baseColor(): mod.Vector;
    set baseColor(color: mod.Vector);
    setBaseColor(color: mod.Vector): this;
    get baseAlpha(): number;
    set baseAlpha(alpha: number);
    setBaseAlpha(alpha: number): this;
    get disabledColor(): mod.Vector;
    set disabledColor(color: mod.Vector);
    setDisabledColor(color: mod.Vector): this;
    get disabledAlpha(): number;
    set disabledAlpha(alpha: number);
    setDisabledAlpha(alpha: number): this;
    get pressedColor(): mod.Vector;
    set pressedColor(color: mod.Vector);
    setColorPressed(color: mod.Vector): this;
    get pressedAlpha(): number;
    set pressedAlpha(alpha: number);
    setPressedAlpha(alpha: number): this;
    get hoverColor(): mod.Vector;
    set hoverColor(color: mod.Vector);
    setHoverColor(color: mod.Vector): this;
    get hoverAlpha(): number;
    set hoverAlpha(alpha: number);
    setHoverAlpha(alpha: number): this;
    get focusedColor(): mod.Vector;
    set focusedColor(color: mod.Vector);
    setFocusedColor(color: mod.Vector): this;
    get focusedAlpha(): number;
    set focusedAlpha(alpha: number);
    setFocusedAlpha(alpha: number): this;
    get onClick(): ((player: mod.Player) => Promise<void>) | undefined;
    set onClick(onClick: ((player: mod.Player) => Promise<void>) | undefined);
    setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): this;
}
export declare namespace UIButton {
    type Params = UI.ElementParams & {
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
