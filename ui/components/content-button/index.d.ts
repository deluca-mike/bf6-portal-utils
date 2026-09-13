import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';
/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 10.0.0
 */
export declare abstract class UIContentButton<TContent extends UI.Element> extends UIBaseButton {
    private static readonly _ScratchParent;
    private static readonly _scratchParent;
    protected static readonly _padding: Float32Array<ArrayBuffer>;
    protected static readonly _buttonWidgets: (mod.UIWidget | null)[];
    protected static readonly _contents: (UI.Element | null)[];
    private static readonly _baseRgba;
    private static readonly _disabledRgba;
    private static readonly _pressedRgba;
    private static readonly _focusedRgba;
    protected static _packRgba(color: Colors.Color, alpha: number): number;
    protected static _unpackColor(rgba: number, out?: Colors.Color): Colors.Color;
    protected static _unpackAlpha(rgba: number): number;
    protected static _setRgb(arr: Uint32Array, slot: number, color: Colors.Color): void;
    protected static _setAlpha(arr: Uint32Array, slot: number, alpha: number): void;
    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent
    );
    protected get _buttonUIWidget(): mod.UIWidget | null;
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The wrapped content element, or undefined if deleted.
     * @returns The content element, or undefined if deleted.
     */
    get content(): TContent | undefined;
    /**
     * @inheritdoc
     * @returns The width in screen units, or undefined if deleted.
     */
    get width(): number | undefined;
    /**
     * @inheritdoc
     */
    set width(width: number);
    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    setWidth(width: number): this;
    /**
     * @inheritdoc
     * @returns The height in screen units, or undefined if deleted.
     */
    get height(): number | undefined;
    /**
     * @inheritdoc
     */
    set height(height: number);
    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    setHeight(height: number): this;
    /**
     * @inheritdoc
     * @returns The size object, or undefined if deleted.
     */
    get size(): UI.Size | undefined;
    /**
     * @inheritdoc
     */
    set size(params: UI.Size);
    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    setSize(params: UI.Size): this;
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
     * Hook invoked when the enabled state of the content button changes.
     * @param _enabled - Whether the button is enabled.
     */
    protected _setContentEnabled(_enabled: boolean): void;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This content button for chaining.
     */
    setEnabled(enabled: boolean): this;
    /**
     * The padding of the content button, or undefined if deleted.
     * @returns The padding in pixels, or undefined if deleted.
     */
    get padding(): number | undefined;
    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    set padding(padding: number);
    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     * @returns This content button for chaining.
     */
    setPadding(padding: number): this;
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
     */
    setFocusedAlpha(alpha: number): this;
}
export declare namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    type Params = UIBaseButton.Params & {
        padding?: number;
    };
}
