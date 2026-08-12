import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';
/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 8.0.0
 */
export declare abstract class UIContentButton<TContent extends UI.Element> extends UI.Element {
    private static readonly _scratchParent;
    protected _padding: number;
    protected _button: UIButton;
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
     * @inheritdoc
     */
    get width(): number;
    /**
     * @inheritdoc
     */
    set width(width: number);
    /**
     * @inheritdoc
     */
    get height(): number;
    /**
     * @inheritdoc
     */
    set height(height: number);
    /**
     * @inheritdoc
     */
    get size(): UI.Size;
    /**
     * @inheritdoc
     */
    set size(params: UI.Size);
    /**
     * Whether the button is enabled.
     * @returns True if enabled, false otherwise.
     */
    get enabled(): boolean;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    set enabled(enabled: boolean);
    /**
     * The padding of the content button.
     * @returns The padding in pixels.
     */
    get padding(): number;
    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    set padding(padding: number);
    /**
     * The base color of the button.
     * @returns The base color vector.
     */
    get baseColor(): mod.Vector;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    set baseColor(color: mod.Vector);
    /**
     * The base alpha of the button.
     * @returns The base alpha opacity.
     */
    get baseAlpha(): number;
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    set baseAlpha(alpha: number);
    /**
     * The disabled color of the button.
     * @returns The disabled color vector.
     */
    get disabledColor(): mod.Vector;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    set disabledColor(color: mod.Vector);
    /**
     * The disabled alpha of the button.
     * @returns The disabled alpha opacity.
     */
    get disabledAlpha(): number;
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    set disabledAlpha(alpha: number);
    /**
     * The pressed color of the button.
     * @returns The pressed color vector.
     */
    get pressedColor(): mod.Vector;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    set pressedColor(color: mod.Vector);
    /**
     * The pressed alpha of the button.
     * @returns The pressed alpha opacity.
     */
    get pressedAlpha(): number;
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    set pressedAlpha(alpha: number);
    /**
     * The focused color of the button.
     * @returns The focused color vector.
     */
    get focusedColor(): mod.Vector;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    set focusedColor(color: mod.Vector);
    /**
     * The focused alpha of the button.
     * @returns The focused alpha opacity.
     */
    get focusedAlpha(): number;
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    set focusedAlpha(alpha: number);
    /**
     * The click down handler of the button.
     * @returns The click down handler, or undefined.
     */
    get onClickDown(): UI.ButtonHandler | undefined;
    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    set onClickDown(onClickDown: UI.ButtonHandler | undefined);
    /**
     * The click up handler of the button.
     * @returns The click up handler, or undefined.
     */
    get onClickUp(): UI.ButtonHandler | undefined;
    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    set onClickUp(onClickUp: UI.ButtonHandler | undefined);
    /**
     * The focus in handler of the button.
     * @returns The focus in handler, or undefined.
     */
    get onFocusIn(): UI.ButtonHandler | undefined;
    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    set onFocusIn(onFocusIn: UI.ButtonHandler | undefined);
    /**
     * The focus out handler of the button.
     * @returns The focus out handler, or undefined.
     */
    get onFocusOut(): UI.ButtonHandler | undefined;
    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    set onFocusOut(onFocusOut: UI.ButtonHandler | undefined);
}
export declare namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    type Params = UIButton.Params & {
        padding?: number;
    };
}
