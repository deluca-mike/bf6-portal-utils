import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';
/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @template TContentProps - Array of property names to delegate from the content element
 * @version 6.1.1
 */
export declare abstract class UIContentButton<TContent extends UI.Element, TContentProps extends readonly string[]>
    extends UI.Element
{
    protected _padding: number;
    protected _button: UIButton;
    protected _content: TContent;
    baseColor: mod.Vector;
    baseAlpha: number;
    disabledColor: mod.Vector;
    disabledAlpha: number;
    pressedColor: mod.Vector;
    pressedAlpha: number;
    hoverColor: mod.Vector;
    hoverAlpha: number;
    focusedColor: mod.Vector;
    focusedAlpha: number;
    onClick: ((player: mod.Player) => Promise<void> | void) | undefined;
    setBaseColor: (color: mod.Vector) => this;
    setBaseAlpha: (alpha: number) => this;
    setDisabledColor: (color: mod.Vector) => this;
    setDisabledAlpha: (alpha: number) => this;
    setPressedColor: (color: mod.Vector) => this;
    setPressedAlpha: (alpha: number) => this;
    setHoverColor: (color: mod.Vector) => this;
    setHoverAlpha: (alpha: number) => this;
    setFocusedColor: (color: mod.Vector) => this;
    setFocusedAlpha: (alpha: number) => this;
    setOnClick: (onClick: ((player: mod.Player) => Promise<void> | void) | undefined) => this;
    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     * @param contentProperties - The properties to delegate from the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent,
        contentProperties: TContentProps
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
