import { Colors } from '../../../colors/index.ts';
import { UIBaseButton } from '../base-button/index.ts';
export declare class UIButton extends UIBaseButton {
    private static readonly _baseRgba;
    private static readonly _disabledRgba;
    private static readonly _pressedRgba;
    private static readonly _focusedRgba;
    private static _packRgba;
    private static _unpackColor;
    private static _unpackAlpha;
    private static _setRgb;
    private static _setAlpha;
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
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    setEnabled(enabled: boolean): this;
    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color, or undefined if deleted.
     */
    get baseColor(): Colors.Color | undefined;
    /**
     * Retrieves the base color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The base color, or undefined if deleted.
     */
    getBaseColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    set baseColor(color: Colors.Color);
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    setBaseColor(color: Colors.Color): this;
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
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This button for chaining.
     */
    setBaseAlpha(alpha: number): this;
    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color, or undefined if deleted.
     */
    get disabledColor(): Colors.Color | undefined;
    /**
     * Retrieves the disabled color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled color, or undefined if deleted.
     */
    getDisabledColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    set disabledColor(color: Colors.Color);
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    setDisabledColor(color: Colors.Color): this;
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
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This button for chaining.
     */
    setDisabledAlpha(alpha: number): this;
    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color, or undefined if deleted.
     */
    get pressedColor(): Colors.Color | undefined;
    /**
     * Retrieves the pressed color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The pressed color, or undefined if deleted.
     */
    getPressedColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    set pressedColor(color: Colors.Color);
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    setPressedColor(color: Colors.Color): this;
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
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This button for chaining.
     */
    setPressedAlpha(alpha: number): this;
    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color, or undefined if deleted.
     */
    get focusedColor(): Colors.Color | undefined;
    /**
     * Retrieves the focused color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The focused color, or undefined if deleted.
     */
    getFocusedColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    set focusedColor(color: Colors.Color);
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    setFocusedColor(color: Colors.Color): this;
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
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This button for chaining.
     */
    setFocusedAlpha(alpha: number): this;
}
export declare namespace UIButton {
    export import Event = UIBaseButton.Event;
    type Handlers = UIBaseButton.Handlers;
    type Styling = UIBaseButton.Styling;
    type Params = UIBaseButton.Params;
}
