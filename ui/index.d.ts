import { Logging } from '../logging/index.ts';
export declare namespace UI {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /****** Types ******/
    /**
     * The type of a button handler.
     */
    export type ButtonHandler = (player: mod.Player) => Promise<void> | void;
    /**
     * The minimum interface for a button.
     */
    export type Button = {
        onClickDown?: ButtonHandler;
        onClickUp?: ButtonHandler;
        onFocusIn?: ButtonHandler;
        onFocusOut?: ButtonHandler;
    };
    /**
     * The parent of an element.
     */
    export type Parent = {
        uiWidget: mod.UIWidget;
        receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;
        children: readonly Element[];
        getChild(index: number): Element | undefined;
        forEachChild(callback: (child: Element, index: number) => void): void;
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    };
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
    /****** Classes ******/
    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _id: string;
        protected _nativeReceiver: T;
        protected _inputModeRequesterCount: number;
        protected constructor(id: string, receiver: T);
        /**
         * The ID of the receiver. Used mainly for generating UI Widget names and for debugging purposes.
         * @returns The ID of the receiver.
         */
        get id(): string;
        /**
         * The native receiver of the receiver. This is the actual player or team object, not the receiver object.
         * @returns The native receiver.
         */
        get nativeReceiver(): T;
        /**
         * Whether input mode is requested for this receiver.
         * @returns True if input mode is requested, false otherwise.
         */
        get isInputModeRequested(): boolean;
        /**
         * Increments the input mode requester count and enables input mode if transitioning from 0 to 1.
         */
        addInputModeRequester(): void;
        /**
         * Decrements the input mode requester count and disables input mode if transitioning from 1 to 0.
         */
        removeInputModeRequester(): void;
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
    /**
     * The team receiver. This is the receiver for a single team.
     */
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
     * The base node class. All elements are nodes, and all nodes are UI widgets.
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
         * The underlying native Battlefield Portal UIWidget handle for this node.
         *
         * Warning: Exercise caution when operating on the widget outside of this module/component,
         * as direct mutations via native `mod.*` APIs can desynchronize internal state and cause runtime errors.
         * @returns The native UIWidget handle.
         */
        get uiWidget(): mod.UIWidget;
        /**
         * The receiver of the node.
         * @returns The receiver of the node.
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
        protected _children?: Element[];
        private constructor();
        /**
         * Returns a shallow copy of the list of direct child elements.
         * @returns Array of direct children.
         */
        get children(): readonly Element[];
        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, or undefined if out of bounds.
         */
        getChild(index: number): Element | undefined;
        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        forEachChild(callback: (child: Element, index: number) => void): void;
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
        protected _uiInputModeWhenVisible: boolean;
        protected _hasInputMode: boolean;
        protected _deleted: boolean;
        /**
         * The constructor for an element.
         * @param params - The parameters for the element.
         */
        constructor(params: FinalElementParams);
        protected _isDeletedCheck(): boolean;
        /**
         * The parent of the element.
         * @returns The parent of the element.
         */
        get parent(): Parent;
        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        set parent(parent: Parent);
        /**
         * Whether the element is visible.
         * @returns True if visible, false otherwise.
         */
        get visible(): boolean;
        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        set visible(visible: boolean);
        /**
         * Whether the element is deleted.
         * @returns True if deleted, false otherwise.
         */
        get deleted(): boolean;
        /**
         * Deletes the element.
         */
        delete(): void;
        /**
         * The X position of the element.
         * @returns The X position of the element.
         */
        get x(): number;
        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        set x(x: number);
        /**
         * The Y position of the element.
         * @returns The Y position of the element.
         */
        get y(): number;
        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        set y(y: number);
        /**
         * The position of the element.
         * @returns The position of the element.
         */
        get position(): Position;
        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        set position(params: Position);
        /**
         * The width of the element.
         * @returns The width of the element.
         */
        get width(): number;
        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        set width(width: number);
        /**
         * The height of the element.
         * @returns The height of the element.
         */
        get height(): number;
        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        set height(height: number);
        /**
         * The size of the element.
         * @returns The size of the element.
         */
        get size(): Size;
        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        set size(params: Size);
        /**
         * The background color of the element.
         * @returns The background color of the element.
         */
        get bgColor(): mod.Vector;
        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        set bgColor(color: mod.Vector);
        /**
         * The background alpha of the element.
         * @returns The background alpha of the element.
         */
        get bgAlpha(): number;
        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        set bgAlpha(alpha: number);
        /**
         * The background fill of the element.
         * @returns The background fill of the element.
         */
        get bgFill(): mod.UIBgFill;
        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        set bgFill(fill: mod.UIBgFill);
        /**
         * The depth of the element.
         * @returns The depth of the element.
         */
        get depth(): mod.UIDepth;
        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        set depth(depth: mod.UIDepth);
        /**
         * The anchor of the element.
         * @returns The anchor of the element.
         */
        get anchor(): mod.UIAnchor;
        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        set anchor(anchor: mod.UIAnchor);
        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false otherwise.
         */
        get uiInputModeWhenVisible(): boolean;
        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        set uiInputModeWhenVisible(newValue: boolean);
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
     * Makes a deterministic, sequential name for a widget in the format `ui_${++counter}`.
     * @returns The name of the widget.
     */
    export function makeName(): string;
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
