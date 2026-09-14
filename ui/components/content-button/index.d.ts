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
    protected static readonly _contentRgba: Uint32Array<ArrayBuffer>;
    protected static readonly _contentDisabledRgba: Uint32Array<ArrayBuffer>;
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
}
export declare namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    type Params = UIBaseButton.Params & {
        padding?: number;
    };
}
