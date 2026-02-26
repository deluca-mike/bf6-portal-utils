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
    /**
     * The size of an element.
     */
    export type Size = {
        width: number;
        height: number;
    };
    /**
     * The position of an element.
     */
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
    /**
     * The parameters for a base element.
     */
    export type ElementParams = BaseParams & EitherPosition & EitherSize;
    /**
     * The final internal parameters for an Element constructor.
     */
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
    /**
     * The parent of an element.
     */
    export interface Parent {
        name: string;
        uiWidget: mod.UIWidget;
        receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        children: Element[];
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    }
    /**
     * The minimum interface for a button.
     */
    export interface Button {
        onClick: ((player: mod.Player) => Promise<void> | void) | undefined;
    }
    /****** Classes ******/
    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _id: string;
        protected _nativeReceiver: T;
        protected _inputModeRequesters: Set<Element>;
        protected constructor(id: string, receiver: T);
        /**
         * The ID of the receiver. Used mainly for generating UI Widget names and for debugging purposes.
         */
        get id(): string;
        /**
         * The native receiver of the receiver. This is the actual player or team object, not the receiver object.
         */
        get nativeReceiver(): T;
        /**
         * Whether input mode is requested for this receiver.
         */
        get isInputModeRequested(): boolean;
        /**
         * Adds an element to the input mode requesters.
         * @param element - The element to add.
         */
        addInputModeRequester(element: Element): void;
        /**
         * Removes an element from the input mode requesters.
         * @param element - The element to remove.
         */
        removeInputModeRequester(element: Element): void;
    }
    /**
     * The global receiver. This is the receiver for all players and teams.
     */
    export class GlobalReceiver extends Receiver<undefined> {
        /**
         * The singleton instance of the global receiver.
         */
        static readonly instance: GlobalReceiver;
        private constructor();
    }
    export class TeamReceiver extends Receiver<mod.Team> {
        private static _instances;
        private constructor();
        /**
         * Gets or creates the instance of the team receiver for a given team.
         * @param receiver - The team to get the instance for.
         * @returns The instance of the team receiver.
         */
        static getInstance(receiver: mod.Team): TeamReceiver;
    }
    /**
     * The player receiver. This is the receiver for a single player.
     */
    export class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances;
        private constructor();
        /**
         * Gets or creates the instance of the player receiver for a given player.
         * @param receiver - The player to get the instance for.
         * @returns The instance of the player receiver.
         */
        static getInstance(receiver: mod.Player): PlayerReceiver;
    }
    /**
     * The base node class. All elements are nodes, adn all nodes are UI widgets.
     */
    export abstract class Node {
        protected readonly _logging: Logging;
        protected _name: string;
        protected _uiWidget: mod.UIWidget;
        protected _receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        /**
         * The constructor for a node.
         * @param name - The name of the node.
         * @param uiWidget - The UI widget of the node.
         * @param receiver - The receiver of the node.
         */
        constructor(name: string, uiWidget: mod.UIWidget, receiver: GlobalReceiver | TeamReceiver | PlayerReceiver);
        /**
         * The name of the node. This is the name of the UIWidget.
         */
        get name(): string;
        /**
         * The UIWidget of the node.
         */
        get uiWidget(): mod.UIWidget;
        /**
         * The receiver of the node.
         */
        get receiver(): GlobalReceiver | TeamReceiver | PlayerReceiver;
    }
    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        /**
         * The singleton instance of the root node.
         */
        static readonly instance: Root;
        private _children;
        private constructor();
        /**
         * The children of the root node.
         */
        get children(): Element[];
        /**
         * Attaches a child to the root node.
         * @param child - The child to attach.
         */
        attachChild(child: Element): void;
        /**
         * Detaches a child from the root node.
         * @param child - The child to detach.
         */
        detachChild(child: Element): void;
    }
    /**
     * The base element class. All elements are nodes, and all nodes are UI widgets.
     */
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
        /**
         * The constructor for an element.
         * @param params - The parameters for the element.
         */
        constructor(params: FinalElementParams);
        protected _isDeletedCheck(): boolean;
        /**
         * The parent of the element.
         */
        get parent(): Parent;
        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        set parent(parent: Parent);
        /**
         * Sets the parent of the element. Useful for chaining operations.
         * @param parent - The parent to set.
         * @returns This element instance.
         */
        setParent(parent: Parent): this;
        /**
         * Whether the element is visible.
         */
        get visible(): boolean;
        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        set visible(visible: boolean);
        /**
         * Sets the visibility of the element. Useful for chaining operations.
         * @param visible - The visibility to set.
         * @returns This element instance.
         */
        setVisible(visible: boolean): this;
        /**
         * Shows the element.
         * @returns This element instance.
         */
        show(): this;
        /**
         * Hides the element.
         * @returns This element instance.
         */
        hide(): this;
        /**
         * Toggles the visibility of the element.
         * @returns This element instance.
         */
        toggle(): this;
        /**
         * Whether the element is deleted. This is needed to block all setter operations after the element is deleted
         * but a reference to the element is still in memory and the experience code is still trying to use it.
         */
        get deleted(): boolean;
        /**
         * Deletes the element. Does not return `this` for chaining because the element is destroyed and no other calls
         * on it should be performed.
         */
        delete(): void;
        /**
         * The X position of the element.
         */
        get x(): number;
        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        set x(x: number);
        /**
         * Sets the X position of the element. Useful for chaining operations.
         * @param x - The X position to set.
         * @returns This element instance.
         */
        setX(x: number): this;
        /**
         * The Y position of the element.
         */
        get y(): number;
        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        set y(y: number);
        /**
         * Sets the Y position of the element. Useful for chaining operations.
         * @param y - The Y position to set.
         * @returns This element instance.
         */
        setY(y: number): this;
        /**
         * The position of the element.
         */
        get position(): Position;
        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        set position(params: Position);
        /**
         * Sets the position of the element. Useful for chaining operations.
         * @param params - The position to set.
         * @returns This element instance.
         */
        setPosition(params: Position): this;
        /**
         * The width of the element.
         */
        get width(): number;
        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        set width(width: number);
        /**
         * Sets the width of the element. Useful for chaining operations.
         * @param width - The width to set.
         * @returns This element instance.
         */
        setWidth(width: number): this;
        /**
         * The height of the element.
         */
        get height(): number;
        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        set height(height: number);
        /**
         * Sets the height of the element. Useful for chaining operations.
         * @param height - The height to set.
         * @returns This element instance.
         */
        setHeight(height: number): this;
        /**
         * The size of the element.
         */
        get size(): Size;
        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        set size(params: Size);
        /**
         * Sets the size of the element. Useful for chaining operations.
         * @param params - The size to set.
         * @returns This element instance.
         */
        setSize(params: Size): this;
        /**
         * The background color of the element.
         */
        get bgColor(): mod.Vector;
        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        set bgColor(color: mod.Vector);
        /**
         * Sets the background color of the element. Useful for chaining operations.
         * @param color - The background color to set.
         * @returns This element instance.
         */
        setBgColor(color: mod.Vector): this;
        /**
         * The background alpha of the element.
         */
        get bgAlpha(): number;
        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        set bgAlpha(alpha: number);
        /**
         * Sets the background alpha of the element. Useful for chaining operations.
         * @param alpha - The background alpha to set.
         * @returns This element instance.
         */
        setBgAlpha(alpha: number): this;
        /**
         * The background fill of the element.
         */
        get bgFill(): mod.UIBgFill;
        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        set bgFill(fill: mod.UIBgFill);
        /**
         * Sets the background fill of the element. Useful for chaining operations.
         * @param fill - The background fill to set.
         * @returns This element instance.
         */
        setBgFill(fill: mod.UIBgFill): this;
        /**
         * The depth of the element.
         */
        get depth(): mod.UIDepth;
        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        set depth(depth: mod.UIDepth);
        /**
         * Sets the depth of the element. Useful for chaining operations.
         * @param depth - The depth to set.
         * @returns This element instance.
         */
        setDepth(depth: mod.UIDepth): this;
        /**
         * The anchor of the element.
         */
        get anchor(): mod.UIAnchor;
        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        set anchor(anchor: mod.UIAnchor);
        /**
         * Sets the anchor of the element. Useful for chaining operations.
         * @param anchor - The anchor to set.
         * @returns This element instance.
         */
        setAnchor(anchor: mod.UIAnchor): this;
        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         */
        get uiInputModeWhenVisible(): boolean;
        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * Has an immediate effect on the receiver's input mode state.
         * @param newValue - The new value.
         */
        set uiInputModeWhenVisible(newValue: boolean);
        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * Has an immediate effect on the receiver's input mode state.
         * Useful for chaining operations.
         * @param newValue - The new value.
         * @returns This element instance.
         */
        setUiInputModeWhenVisible(newValue: boolean): this;
    }
    /****** Constants ******/
    /**
     * Some useful colors.
     */
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
    /**
     * The root node. This is the root of the UI tree and the default parent for all elements.
     */
    export const ROOT_NODE: Root;
    /**
     * Registers a button and returns a function to unregister it.
     * @param name - The name of the button.
     * @param button - The button to register.
     * @returns A function to unregister the button.
     */
    export function registerButton(name: string, button: Button): () => void;
    /**
     * Makes a deterministic name for a widget given its parent and receiver.
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
    export {};
}
