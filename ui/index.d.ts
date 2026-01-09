export declare namespace UI {
    /****** Types ******/
    type BaseParams = {
        anchor?: mod.UIAnchor;
        parent?: Root | Container;
        visible?: boolean;
        padding?: number;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        depth?: mod.UIDepth;
    };
    export type Size = {
        width: number;
        height: number;
    };
    export type Position = {
        x: number;
        y: number;
    };
    type EitherPosition =
        | ({
              position?: Position;
          } & {
              x?: never;
              y?: never;
          })
        | ({
              x?: number;
              y?: number;
          } & {
              position?: never;
          });
    type EitherSize =
        | ({
              size?: Size;
          } & {
              width?: never;
              height?: never;
          })
        | ({
              width?: number;
              height?: number;
          } & {
              size?: never;
          });
    type ElementParams = BaseParams & EitherPosition & EitherSize;
    export type ChildParams<T> = T & {
        type: new (params: T, receiver?: mod.Player | mod.Team) => Element;
    };
    export type ContainerParams = ElementParams & {
        childrenParams?: ChildParams<any>[];
    };
    export type TextParams = ElementParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
    };
    export type ButtonParams = ElementParams & {
        buttonEnabled?: boolean;
        baseColor?: mod.Vector;
        baseAlpha?: number;
        disabledColor?: mod.Vector;
        disabledAlpha?: number;
        pressedColor?: mod.Vector;
        pressedAlpha?: number;
        hoverColor?: mod.Vector;
        hoverAlpha?: number;
        focusedColor?: mod.Vector;
        focusedAlpha?: number;
        onClick?: (player: mod.Player) => Promise<void>;
    };
    export type TextButtonParams = ButtonParams & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
    };
    /****** Interfaces ******/
    export interface Parent {
        children: Element[];
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    }
    /****** Classes ******/
    export class Node {
        protected _name: string;
        protected _uiWidget: mod.UIWidget;
        constructor(name: string, uiWidget: mod.UIWidget);
        get uiWidget(): mod.UIWidget;
        get name(): string;
    }
    export class Root extends Node implements Parent {
        static readonly instance: Root;
        private _children;
        private constructor();
        get children(): Element[];
        attachChild(child: Element): this;
        detachChild(child: Element): this;
    }
    export class Element extends Node {
        protected _parent: Root | Container;
        protected _receiver?: mod.Player | mod.Team;
        constructor(name: string, parent: Root | Container, receiver?: mod.Player | mod.Team);
        get parent(): Root | Container;
        set parent(parent: Root | Container);
        setParent(parent: Root | Container): this;
        get receiver(): mod.Player | mod.Team | undefined;
        get visible(): boolean;
        set visible(visible: boolean);
        setVisible(visible: boolean): this;
        show(): this;
        hide(): this;
        toggle(): this;
        delete(): void;
        get x(): number;
        set x(x: number);
        setX(x: number): this;
        get y(): number;
        set y(y: number);
        setY(y: number): this;
        get position(): Position;
        set position(params: Position);
        setPosition(params: Position): this;
        get width(): number;
        set width(width: number);
        setWidth(width: number): this;
        get height(): number;
        set height(height: number);
        setHeight(height: number): this;
        get size(): Size;
        set size(params: Size);
        setSize(params: Size): this;
        get bgColor(): mod.Vector;
        set bgColor(color: mod.Vector);
        setBgColor(color: mod.Vector): this;
        get bgAlpha(): number;
        set bgAlpha(alpha: number);
        setBgAlpha(alpha: number): this;
        get bgFill(): mod.UIBgFill;
        set bgFill(fill: mod.UIBgFill);
        setBgFill(fill: mod.UIBgFill): this;
        get depth(): mod.UIDepth;
        set depth(depth: mod.UIDepth);
        setDepth(depth: mod.UIDepth): this;
        get anchor(): mod.UIAnchor;
        set anchor(anchor: mod.UIAnchor);
        setAnchor(anchor: mod.UIAnchor): this;
        get padding(): number;
        set padding(padding: number);
        setPadding(padding: number): this;
    }
    export class Container extends Element implements Parent {
        private _children;
        constructor(params: ContainerParams, receiver?: mod.Player | mod.Team);
        get children(): Element[];
        delete(): void;
        attachChild(child: Element): this;
        detachChild(child: Element): this;
    }
    export class Text extends Element {
        private _message;
        constructor(params: TextParams, receiver?: mod.Player | mod.Team);
        get message(): mod.Message;
        set message(message: mod.Message);
        setMessage(message: mod.Message): this;
        get textAlpha(): number;
        set textAlpha(alpha: number);
        setTextAlpha(alpha: number): this;
        get textAnchor(): mod.UIAnchor;
        set textAnchor(anchor: mod.UIAnchor);
        setTextAnchor(anchor: mod.UIAnchor): this;
        get textColor(): mod.Vector;
        set textColor(color: mod.Vector);
        setTextColor(color: mod.Vector): this;
        get textSize(): number;
        set textSize(size: number);
        setTextSize(size: number): this;
    }
    export class Button extends Element {
        constructor(params: ButtonParams, receiver?: mod.Player | mod.Team);
        delete(): void;
        get alphaBase(): number;
        set alphaBase(alpha: number);
        setAlphaBase(alpha: number): this;
        get alphaDisabled(): number;
        set alphaDisabled(alpha: number);
        setAlphaDisabled(alpha: number): this;
        get alphaFocused(): number;
        set alphaFocused(alpha: number);
        setAlphaFocused(alpha: number): this;
        get alphaHover(): number;
        set alphaHover(alpha: number);
        setAlphaHover(alpha: number): this;
        get alphaPressed(): number;
        set alphaPressed(alpha: number);
        setAlphaPressed(alpha: number): this;
        get colorBase(): mod.Vector;
        set colorBase(color: mod.Vector);
        setColorBase(color: mod.Vector): this;
        get colorDisabled(): mod.Vector;
        set colorDisabled(color: mod.Vector);
        setColorDisabled(color: mod.Vector): this;
        get colorFocused(): mod.Vector;
        set colorFocused(color: mod.Vector);
        setColorFocused(color: mod.Vector): this;
        get colorHover(): mod.Vector;
        set colorHover(color: mod.Vector);
        setColorHover(color: mod.Vector): this;
        get colorPressed(): mod.Vector;
        set colorPressed(color: mod.Vector);
        setColorPressed(color: mod.Vector): this;
        get enabled(): boolean;
        set enabled(enabled: boolean);
        setEnabled(enabled: boolean): this;
        get onClick(): ((player: mod.Player) => Promise<void>) | undefined;
        set onClick(onClick: ((player: mod.Player) => Promise<void>) | undefined);
        setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): this;
    }
    /**
     * Base class for buttons that contain content elements (Text, Image, etc.).
     * Handles the common pattern of wrapping a Button and content element in a Container.
     * @template TContent - The type of the content element (Text, Image, etc.)
     * @template TContentProps - Array of property names to delegate from the content element
     */
    abstract class BaseButtonWithContent<
        TContent extends Element,
        TContentProps extends readonly string[],
    > extends Element {
        protected _button: Button;
        protected _content: TContent;
        alphaBase: number;
        alphaDisabled: number;
        alphaFocused: number;
        alphaHover: number;
        alphaPressed: number;
        colorBase: mod.Vector;
        colorDisabled: mod.Vector;
        colorFocused: mod.Vector;
        colorHover: mod.Vector;
        colorPressed: mod.Vector;
        enabled: boolean;
        onClick: ((player: mod.Player) => Promise<void>) | undefined;
        setAlphaBase: (alpha: number) => this;
        setAlphaDisabled: (alpha: number) => this;
        setAlphaFocused: (alpha: number) => this;
        setAlphaHover: (alpha: number) => this;
        setAlphaPressed: (alpha: number) => this;
        setColorBase: (color: mod.Vector) => this;
        setColorDisabled: (color: mod.Vector) => this;
        setColorFocused: (color: mod.Vector) => this;
        setColorHover: (color: mod.Vector) => this;
        setColorPressed: (color: mod.Vector) => this;
        setEnabled: (enabled: boolean) => this;
        setOnClick: (onClick: ((player: mod.Player) => Promise<void>) | undefined) => this;
        protected constructor(
            params: ButtonParams,
            receiver: mod.Player | mod.Team | undefined,
            createContent: (container: Container, params: ButtonParams) => TContent,
            contentProperties: TContentProps
        );
        delete(): void;
        set size(params: Size);
        setSize(params: Size): this;
    }
    const TEXT_BUTTON_CONTENT_PROPERTIES: readonly ['message', 'textAlpha', 'textAnchor', 'textSize'];
    export class TextButton extends BaseButtonWithContent<Text, typeof TEXT_BUTTON_CONTENT_PROPERTIES> {
        message: mod.Message;
        textAlpha: number;
        textAnchor: mod.UIAnchor;
        textSize: number;
        setMessage: (message: mod.Message) => this;
        setTextAlpha: (alpha: number) => this;
        setTextAnchor: (anchor: mod.UIAnchor) => this;
        setTextSize: (size: number) => this;
        constructor(params: TextButtonParams, receiver?: mod.Player | mod.Team);
    }
    /****** Constants ******/
    export const COLORS: {
        BLACK: mod.Vector;
        GREY_25: mod.Vector;
        GREY_50: mod.Vector;
        GREY_75: mod.Vector;
        WHITE: mod.Vector;
        RED: mod.Vector;
        GREEN: mod.Vector;
        BLUE: mod.Vector;
        YELLOW: mod.Vector;
        PURPLE: mod.Vector;
        CYAN: mod.Vector;
        MAGENTA: mod.Vector;
        BF_GREY_1: mod.Vector;
        BF_GREY_2: mod.Vector;
        BF_GREY_3: mod.Vector;
        BF_GREY_4: mod.Vector;
        BF_BLUE_BRIGHT: mod.Vector;
        BF_BLUE_DARK: mod.Vector;
        BF_RED_BRIGHT: mod.Vector;
        BF_RED_DARK: mod.Vector;
        BF_GREEN_BRIGHT: mod.Vector;
        BF_GREEN_DARK: mod.Vector;
        BF_YELLOW_BRIGHT: mod.Vector;
        BF_YELLOW_DARK: mod.Vector;
    };
    export const ROOT_NODE: Root;
    export function handleButtonClick(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void;
    export {};
}
