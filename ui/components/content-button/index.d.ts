import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';
/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 7.0.0
 */
export declare abstract class UIContentButton<TContent extends UI.Element> extends UI.Element {
    protected _padding: number;
    protected _button: UIButton;
    protected _content: TContent;
    baseColor: mod.Vector;
    baseAlpha: number;
    disabledColor: mod.Vector;
    disabledAlpha: number;
    pressedColor: mod.Vector;
    pressedAlpha: number;
    focusedColor: mod.Vector;
    focusedAlpha: number;
    onClickDown?: UI.ButtonHandler;
    onClickUp?: UI.ButtonHandler;
    onFocusIn?: UI.ButtonHandler;
    onFocusOut?: UI.ButtonHandler;
    setBaseColor: (color: mod.Vector) => this;
    setBaseAlpha: (alpha: number) => this;
    setDisabledColor: (color: mod.Vector) => this;
    setDisabledAlpha: (alpha: number) => this;
    setPressedColor: (color: mod.Vector) => this;
    setPressedAlpha: (alpha: number) => this;
    setFocusedColor: (color: mod.Vector) => this;
    setFocusedAlpha: (alpha: number) => this;
    setOnClickDown: (onClickDown?: UI.ButtonHandler) => this;
    setOnClickUp: (onClickUp?: UI.ButtonHandler) => this;
    setOnFocusIn: (onFocusIn?: UI.ButtonHandler) => this;
    setOnFocusOut: (onFocusOut?: UI.ButtonHandler) => this;
    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     * @param contentProperties - The properties to delegate from the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent,
        contentProperties: readonly string[]
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
    setWidth(width: number): this;
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
    setHeight(height: number): this;
    /**
     * @inheritdoc
     */
    get size(): UI.Size;
    /**
     * @inheritdoc
     */
    set size(params: UI.Size);
    /**
     * @inheritdoc
     */
    setSize(params: UI.Size): this;
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
     * The padding of the content button.
     */
    get padding(): number;
    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    set padding(padding: number);
    /**
     * Sets the padding of the content button. Useful for chaining operations.
     * @param padding - The new padding.
     * @returns This element instance.
     */
    setPadding(padding: number): this;
}
export declare namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    type Params = UIButton.Params & {
        padding?: number;
    };
}
