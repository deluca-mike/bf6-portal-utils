export declare namespace UI {
    /****** Types ******/
    type BaseParams = {
        anchor?: mod.UIAnchor;
        parent?: Parent;
        visible?: boolean;
        padding?: number;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        depth?: mod.UIDepth;
        receiver?: mod.Player | mod.Team;
        uiInputModeWhenVisible?: boolean;
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
    type FinalElementParams = {
        name: string;
        anchor: mod.UIAnchor;
        parent: Parent;
        visible: boolean;
        padding: number;
        bgColor: mod.Vector;
        bgAlpha: number;
        bgFill: mod.UIBgFill;
        depth: mod.UIDepth;
        x: number;
        y: number;
        width: number;
        height: number;
        receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        uiInputModeWhenVisible: boolean;
    };
    export type ChildParams<T extends ElementParams> = T & {
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
        name: string;
        uiWidget: mod.UIWidget;
        receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        children: Element[];
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    }
    /****** Classes ******/
    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _id: string;
        protected _nativeReceiver: T;
        protected _inputModeRequesters: Set<Element>;
        protected constructor(id: string, receiver: T);
        get id(): string;
        get nativeReceiver(): T;
        get isInputModeRequested(): boolean;
        addInputModeRequester(element: Element): void;
        removeInputModeRequester(element: Element): void;
    }
    class GlobalReceiver extends Receiver<undefined> {
        static readonly instance: GlobalReceiver;
        private constructor();
    }
    class TeamReceiver extends Receiver<mod.Team> {
        private static _instances;
        private constructor();
        static getInstance(receiver: mod.Team): TeamReceiver;
    }
    class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances;
        private constructor();
        static getInstance(receiver: mod.Player): PlayerReceiver;
    }
    export abstract class Node {
        protected _name: string;
        protected _uiWidget: mod.UIWidget;
        protected _receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        constructor(name: string, uiWidget: mod.UIWidget, receiver: GlobalReceiver | TeamReceiver | PlayerReceiver);
        get name(): string;
        get uiWidget(): mod.UIWidget;
        get receiver(): GlobalReceiver | TeamReceiver | PlayerReceiver;
    }
    export class Root extends Node implements Parent {
        static readonly instance: Root;
        private _children;
        private constructor();
        get children(): Element[];
        attachChild(child: Element): this;
        detachChild(child: Element): this;
    }
    export abstract class Element extends Node {
        protected _parent: Parent;
        protected _visible: boolean;
        protected _x: number;
        protected _y: number;
        protected _width: number;
        protected _height: number;
        protected _bgColor: mod.Vector;
        protected _bgAlpha: number;
        protected _bgFill: mod.UIBgFill;
        protected _depth: mod.UIDepth;
        protected _anchor: mod.UIAnchor;
        protected _padding: number;
        protected _uiInputModeWhenVisible: boolean;
        constructor(params: FinalElementParams);
        get parent(): Parent;
        set parent(parent: Parent);
        setParent(parent: Parent): this;
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
        get uiInputModeWhenVisible(): boolean;
        set uiInputModeWhenVisible(newValue: boolean);
        setUiInputModeWhenVisible(newValue: boolean): this;
    }
    export class Container extends Element implements Parent {
        private _children;
        constructor(params: ContainerParams);
        get children(): Element[];
        delete(): void;
        attachChild(child: Element): this;
        detachChild(child: Element): this;
    }
    export class Text extends Element {
        private _message;
        private _textSize;
        private _textColor;
        private _textAlpha;
        private _textAnchor;
        constructor(params: TextParams);
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
        private _buttonEnabled;
        private _baseColor;
        private _baseAlpha;
        private _disabledColor;
        private _disabledAlpha;
        private _pressedColor;
        private _pressedAlpha;
        private _hoverColor;
        private _hoverAlpha;
        private _focusedColor;
        private _focusedAlpha;
        private _onClick;
        constructor(params: ButtonParams);
        delete(): void;
        get enabled(): boolean;
        set enabled(enabled: boolean);
        setEnabled(enabled: boolean): this;
        get baseColor(): mod.Vector;
        set baseColor(color: mod.Vector);
        setBaseColor(color: mod.Vector): this;
        get baseAlpha(): number;
        set baseAlpha(alpha: number);
        setBaseAlpha(alpha: number): this;
        get disabledColor(): mod.Vector;
        set disabledColor(color: mod.Vector);
        setDisabledColor(color: mod.Vector): this;
        get disabledAlpha(): number;
        set disabledAlpha(alpha: number);
        setDisabledAlpha(alpha: number): this;
        get pressedColor(): mod.Vector;
        set pressedColor(color: mod.Vector);
        setColorPressed(color: mod.Vector): this;
        get pressedAlpha(): number;
        set pressedAlpha(alpha: number);
        setPressedAlpha(alpha: number): this;
        get hoverColor(): mod.Vector;
        set hoverColor(color: mod.Vector);
        setHoverColor(color: mod.Vector): this;
        get hoverAlpha(): number;
        set hoverAlpha(alpha: number);
        setHoverAlpha(alpha: number): this;
        get focusedColor(): mod.Vector;
        set focusedColor(color: mod.Vector);
        setFocusedColor(color: mod.Vector): this;
        get focusedAlpha(): number;
        set focusedAlpha(alpha: number);
        setFocusedAlpha(alpha: number): this;
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
        enabled: boolean;
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
        setEnabled: (enabled: boolean) => this;
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
            params: ButtonParams,
            createContent: (container: Container, params: ButtonParams) => TContent,
            contentProperties: TContentProps
        );
        delete(): void;
        set width(width: number);
        set height(height: number);
        set size(params: Size);
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
        constructor(params: TextButtonParams);
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
    export function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void;
    export {};
}
