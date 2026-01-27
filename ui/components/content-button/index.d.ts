import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';
/**
 * version: 6.0.0
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @template TContentProps - Array of property names to delegate from the content element
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
    onClick: ((player: mod.Player) => Promise<void>) | undefined;
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
    setOnClick: (onClick: ((player: mod.Player) => Promise<void>) | undefined) => this;
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent,
        contentProperties: TContentProps
    );
    delete(): void;
    get width(): number;
    set width(width: number);
    setWidth(width: number): this;
    get height(): number;
    set height(height: number);
    setHeight(height: number): this;
    get size(): UI.Size;
    set size(params: UI.Size);
    setSize(params: UI.Size): this;
    get enabled(): boolean;
    set enabled(enabled: boolean);
    setEnabled(enabled: boolean): this;
    get padding(): number;
    set padding(padding: number);
    setPadding(padding: number): this;
}
export declare namespace UIContentButton {
    type Params = UIButton.Params & {
        padding?: number;
    };
}
