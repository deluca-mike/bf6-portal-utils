import { Logging } from '../logging/index.ts';
export declare namespace UI {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void;
    /****** Types ******/
    type BaseParams = {
        anchor?: mod.UIAnchor;
        parent?: Parent;
        visible?: boolean;
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
    export type ElementParams = BaseParams & EitherPosition & EitherSize;
    export type FinalElementParams = {
        name: string;
        parent: Parent;
        anchor: mod.UIAnchor;
        visible: boolean;
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
    /****** Interfaces ******/
    export interface Parent {
        name: string;
        uiWidget: mod.UIWidget;
        receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        children: Element[];
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    }
    export interface Button {
        onClick: ((player: mod.Player) => Promise<void>) | undefined;
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
    export class GlobalReceiver extends Receiver<undefined> {
        static readonly instance: GlobalReceiver;
        private constructor();
    }
    export class TeamReceiver extends Receiver<mod.Team> {
        private static _instances;
        private constructor();
        static getInstance(receiver: mod.Team): TeamReceiver;
    }
    export class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances;
        private constructor();
        static getInstance(receiver: mod.Player): PlayerReceiver;
    }
    export abstract class Node {
        protected readonly _logging: Logging;
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
        attachChild(child: Element): void;
        detachChild(child: Element): void;
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
        protected _uiInputModeWhenVisible: boolean;
        protected _deleted: boolean;
        constructor(params: FinalElementParams);
        protected _isDeletedCheck(): boolean;
        get parent(): Parent;
        set parent(parent: Parent);
        setParent(parent: Parent): this;
        get visible(): boolean;
        set visible(visible: boolean);
        setVisible(visible: boolean): this;
        show(): this;
        hide(): this;
        toggle(): this;
        get deleted(): boolean;
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
        get uiInputModeWhenVisible(): boolean;
        set uiInputModeWhenVisible(newValue: boolean);
        setUiInputModeWhenVisible(newValue: boolean): this;
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
    /**
     * Registers a button and returns a function to unregister it.
     * @param name - The name of the button.
     * @param button - The button to register.
     * @returns A function to unregister the button.
     */
    export function registerButton(name: string, button: Button): () => void;
    /**
     * Makes a name for a widget.
     * @param parent - The parent of the widget.
     * @param receiver - The receiver of the widget.
     * @returns The name of the widget.
     */
    export function makeName(parent: Parent, receiver: GlobalReceiver | TeamReceiver | PlayerReceiver): string;
    /**
     * Delegates properties from a source object to a target object.
     * Creates getters, setters, and setter methods (e.g., setPropertyName) for each property.
     * @param target - The object to add properties to (typically `this`)
     * @param source - The object to delegate to
     * @param properties - Array of property names to delegate
     */
    export function delegateProperties<T extends object, S extends object>(
        target: T,
        source: S,
        properties: readonly string[]
    ): void;
    /**
     * Gets the position from the parameters, given either x/y or position.
     * @param params - The parameters.
     * @returns The position.
     */
    export function getPosition(params: ElementParams): Position;
    /**
     * Gets the size from the parameters, given either width/height or size.
     * @param params - The parameters.
     * @returns The size.
     */
    export function getSize(params: ElementParams): Size;
    /**
     * Gets the receiver from the parameters, given either player, team, or neither.
     * @param parent - The parent of the widget.
     * @param receiverParam - The receiver parameter.
     * @returns The receiver.
     */
    export function getReceiver(
        parent: Parent,
        receiverParam?: mod.Player | mod.Team
    ): GlobalReceiver | TeamReceiver | PlayerReceiver;
    /**
     * Handles a button event. Must be called in the `OnPlayerUIButtonEvent` handler.
     * @param player - The player who pressed the button.
     * @param widget - The widget that was pressed.
     * @param event - The button event.
     */
    export function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void;
    export {};
}
