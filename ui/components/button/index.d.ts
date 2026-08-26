import { UI } from '../../index.ts';
export declare class UIButton extends UI.Element implements UI.Button {
    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    constructor(params: UIButton.Params);
    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    get enabled(): boolean | undefined;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    set enabled(enabled: boolean);
    /**
     * Retrieves whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    getEnabled(): boolean | undefined;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    setEnabled(enabled: boolean): this;
    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    get baseColor(): mod.Vector | undefined;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    set baseColor(color: mod.Vector);
    /**
     * Retrieves the base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    getBaseColor(): mod.Vector | undefined;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    setBaseColor(color: mod.Vector): this;
    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    get baseAlpha(): number | undefined;
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    set baseAlpha(alpha: number);
    /**
     * Retrieves the base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    getBaseAlpha(): number | undefined;
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This button for chaining.
     */
    setBaseAlpha(alpha: number): this;
    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    get disabledColor(): mod.Vector | undefined;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    set disabledColor(color: mod.Vector);
    /**
     * Retrieves the disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    getDisabledColor(): mod.Vector | undefined;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    setDisabledColor(color: mod.Vector): this;
    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    get disabledAlpha(): number | undefined;
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    set disabledAlpha(alpha: number);
    /**
     * Retrieves the disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    getDisabledAlpha(): number | undefined;
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This button for chaining.
     */
    setDisabledAlpha(alpha: number): this;
    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    get pressedColor(): mod.Vector | undefined;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    set pressedColor(color: mod.Vector);
    /**
     * Retrieves the pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    getPressedColor(): mod.Vector | undefined;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    setPressedColor(color: mod.Vector): this;
    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    get pressedAlpha(): number | undefined;
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    set pressedAlpha(alpha: number);
    /**
     * Retrieves the pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    getPressedAlpha(): number | undefined;
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This button for chaining.
     */
    setPressedAlpha(alpha: number): this;
    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    get focusedColor(): mod.Vector | undefined;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    set focusedColor(color: mod.Vector);
    /**
     * Retrieves the focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    getFocusedColor(): mod.Vector | undefined;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    setFocusedColor(color: mod.Vector): this;
    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    get focusedAlpha(): number | undefined;
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    set focusedAlpha(alpha: number);
    /**
     * Retrieves the focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    getFocusedAlpha(): number | undefined;
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This button for chaining.
     */
    setFocusedAlpha(alpha: number): this;
    /**
     * The click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    get onClickDown(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    set onClickDown(onClickDown: UI.ButtonHandler | null | undefined);
    /**
     * Retrieves the click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    getOnClickDown(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     * @returns This button for chaining.
     */
    setOnClickDown(onClickDown?: UI.ButtonHandler | null): this;
    /**
     * The click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    get onClickUp(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    set onClickUp(onClickUp: UI.ButtonHandler | null | undefined);
    /**
     * Retrieves the click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    getOnClickUp(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     * @returns This button for chaining.
     */
    setOnClickUp(onClickUp?: UI.ButtonHandler | null): this;
    /**
     * The focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    get onFocusIn(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    set onFocusIn(onFocusIn: UI.ButtonHandler | null | undefined);
    /**
     * Retrieves the focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    getOnFocusIn(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     * @returns This button for chaining.
     */
    setOnFocusIn(onFocusIn?: UI.ButtonHandler | null): this;
    /**
     * The focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    get onFocusOut(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    set onFocusOut(onFocusOut: UI.ButtonHandler | null | undefined);
    /**
     * Retrieves the focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    getOnFocusOut(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     * @returns This button for chaining.
     */
    setOnFocusOut(onFocusOut?: UI.ButtonHandler | null): this;
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
