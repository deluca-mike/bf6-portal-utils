import { UI } from '../../index.ts';
export declare class UIButton extends UI.Element implements UI.Button {
    protected _enabled: boolean;
    protected _baseColor: mod.Vector;
    protected _baseAlpha: number;
    protected _disabledColor: mod.Vector;
    protected _disabledAlpha: number;
    protected _pressedColor: mod.Vector;
    protected _pressedAlpha: number;
    protected _focusedColor: mod.Vector;
    protected _focusedAlpha: number;
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
    constructor(params: UIButton.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * Whether the button is enabled.
     */
    get enabled(): boolean;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    set enabled(enabled: boolean);
    /**
     * Sets whether the button is enabled. Useful for chaining operations.
     * @param enabled - The new enabled state.
     * @returns This element instance.
     */
    setEnabled(enabled: boolean): this;
    /**
     * The base color of the button.
     */
    get baseColor(): mod.Vector;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    set baseColor(color: mod.Vector);
    /**
     * Sets the base color of the button. Useful for chaining operations.
     * @param color - The new base color.
     * @returns This element instance.
     */
    setBaseColor(color: mod.Vector): this;
    /**
     * The base alpha of the button.
     */
    get baseAlpha(): number;
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    set baseAlpha(alpha: number);
    /**
     * Sets the base alpha of the button. Useful for chaining operations.
     * @param alpha - The new base alpha.
     * @returns This element instance.
     */
    setBaseAlpha(alpha: number): this;
    /**
     * The disabled color of the button.
     */
    get disabledColor(): mod.Vector;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    set disabledColor(color: mod.Vector);
    /**
     * Sets the disabled color of the button. Useful for chaining operations.
     * @param color - The new disabled color.
     * @returns This element instance.
     */
    setDisabledColor(color: mod.Vector): this;
    /**
     * The disabled alpha of the button.
     */
    get disabledAlpha(): number;
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    set disabledAlpha(alpha: number);
    /**
     * Sets the disabled alpha of the button. Useful for chaining operations.
     * @param alpha - The new disabled alpha.
     * @returns This element instance.
     */
    setDisabledAlpha(alpha: number): this;
    /**
     * The pressed color of the button.
     */
    get pressedColor(): mod.Vector;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    set pressedColor(color: mod.Vector);
    /**
     * Sets the pressed color of the button. Useful for chaining operations.
     * @param color - The new pressed color.
     * @returns This element instance.
     */
    setColorPressed(color: mod.Vector): this;
    /**
     * The pressed alpha of the button.
     */
    get pressedAlpha(): number;
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    set pressedAlpha(alpha: number);
    /**
     * Sets the pressed alpha of the button. Useful for chaining operations.
     * @param alpha - The new pressed alpha.
     * @returns This element instance.
     */
    setPressedAlpha(alpha: number): this;
    /**
     * The focused color of the button.
     */
    get focusedColor(): mod.Vector;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    set focusedColor(color: mod.Vector);
    /**
     * Sets the focused color of the button. Useful for chaining operations.
     * @param color - The new focused color.
     * @returns This element instance.
     */
    setFocusedColor(color: mod.Vector): this;
    /**
     * The focused alpha of the button.
     */
    get focusedAlpha(): number;
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    set focusedAlpha(alpha: number);
    /**
     * Sets the focused alpha of the button. Useful for chaining operations.
     * @param alpha - The new focused alpha.
     * @returns This element instance.
     */
    setFocusedAlpha(alpha: number): this;
    /**
     * The click down handler of the button.
     */
    get onClickDown(): UI.ButtonHandler | undefined;
    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    set onClickDown(onClickDown: UI.ButtonHandler | undefined);
    /**
     * Sets the click handler of the button. Useful for chaining operations.
     * @param onClick - The new click handler.
     * @returns This element instance.
     */
    setOnClickDown(onClickDown?: UI.ButtonHandler): this;
    /**
     * The click up handler of the button.
     */
    get onClickUp(): UI.ButtonHandler | undefined;
    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    set onClickUp(onClickUp: UI.ButtonHandler | undefined);
    /**
     * Sets the click handler of the button. Useful for chaining operations.
     * @param onClickUp - The new click up handler.
     * @returns This element instance.
     */
    setOnClickUp(onClickUp?: UI.ButtonHandler): this;
    /**
     * The focus in handler of the button.
     */
    get onFocusIn(): UI.ButtonHandler | undefined;
    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    set onFocusIn(onFocusIn: UI.ButtonHandler | undefined);
    /**
     * Sets the focus in handler of the button. Useful for chaining operations.
     * @param onFocusIn - The new focus in handler.
     * @returns This element instance.
     */
    setOnFocusIn(onFocusIn?: UI.ButtonHandler): this;
    /**
     * The focus out handler of the button.
     */
    get onFocusOut(): UI.ButtonHandler | undefined;
    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    set onFocusOut(onFocusOut: UI.ButtonHandler | undefined);
    /**
     * Sets the focus out handler of the button. Useful for chaining operations.
     * @param onFocusOut - The new focus out handler.
     * @returns This element instance.
     */
    setOnFocusOut(onFocusOut?: UI.ButtonHandler): this;
}
export declare namespace UIButton {
    /**
     * The parameters for creating a new button.
     */
    type Params = UI.ElementParams & {
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
