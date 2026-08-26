import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';
/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 10.0.0
 */
export declare abstract class UIContentButton<TContent extends UI.Element> extends UI.Element implements UI.Button {
    private static readonly _scratchParent;
    protected _padding: number;
    protected _buttonWidget: mod.UIWidget;
    protected _content: TContent;
    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent
    );
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
     * Retrieves the wrapped content element, or undefined if deleted.
     * @returns The content element, or undefined if deleted.
     */
    getContent(): TContent | undefined;
    /**
     * @inheritdoc
     */
    get width(): number | undefined;
    /**
     * @inheritdoc
     */
    set width(width: number);
    /**
     * @inheritdoc
     */
    setWidth(width: number): this;
    /**
     * @inheritdoc
     */
    get height(): number | undefined;
    /**
     * @inheritdoc
     */
    set height(height: number);
    /**
     * @inheritdoc
     */
    setHeight(height: number): this;
    /**
     * @inheritdoc
     */
    get size(): UI.Size | undefined;
    /**
     * @inheritdoc
     */
    set size(params: UI.Size);
    /**
     * @inheritdoc
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
     * Retrieves whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    getEnabled(): boolean | undefined;
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
     * Retrieves the padding of the content button, or undefined if deleted.
     * @returns The padding in pixels, or undefined if deleted.
     */
    getPadding(): number | undefined;
    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     * @returns This content button for chaining.
     */
    setPadding(padding: number): this;
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
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
     * @returns This content button for chaining.
     */
    setOnFocusOut(onFocusOut?: UI.ButtonHandler | null): this;
}
export declare namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    type Params = UIButton.Params & {
        padding?: number;
    };
}
