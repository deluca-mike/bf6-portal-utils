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
    /****** Constants & Limits ******/
    /**
     * Maximum number of UI widgets supported simultaneously.
     */
    export const MAX_WIDGETS = 2048;
    /**
     * Maximum number of interactive UI buttons supported simultaneously.
     */
    export const MAX_BUTTONS = 512;
    /**
     * Sentinel value representing an invalid or uninitialized widget index.
     */
    export const INVALID_INDEX = -1;
    /**
     * Unique identifier for a UI widget.
     */
    export type WidgetID = number & {
        readonly __brand: 'WidgetID';
    };
    /**
     * Sentinel value representing an invalid widget ID.
     */
    export const INVALID_WIDGET_ID: WidgetID;
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
        readonly id: number;
        readonly receiver: mod.Player | mod.Team | undefined;
        readonly children: readonly Element[];
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
        receiver: Receiver<mod.Player | mod.Team | undefined>;
        uiInputModeWhenVisible: boolean;
    };
    /****** Classes ******/
    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _nativeReceiver: T;
        protected _inputModeRequesterCount: number;
        protected constructor(receiver: T);
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
     * The base node class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Node {
        protected readonly _logging: Logging;
        protected _id: number;
        /**
         * The constructor for a node.
         * @param id - The internal widget ID.
         */
        constructor(id: number);
        /**
         * The unique widget ID.
         * @returns The widget ID.
         */
        get id(): number;
        /**
         * The underlying native Battlefield Portal UIWidget handle for this node.
         * @returns The native UIWidget handle.
         */
        protected get _uiWidget(): mod.UIWidget;
        /**
         * The target audience receiver for the node (player or team, or undefined if global).
         * @returns The native receiver.
         */
        get receiver(): mod.Player | mod.Team | undefined;
    }
    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        /**
         * The singleton instance of the root node.
         */
        static readonly instance: Root;
        private constructor();
        /**
         * @inheritdoc
         */
        protected get _uiWidget(): mod.UIWidget;
        /**
         * Returns a snapshot array of direct child elements.
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
        protected _name: string;
        /**
         * The constructor for an element.
         * @param id - The allocated slot index.
         * @param params - The parameters for the element.
         */
        constructor(id: number, params: FinalElementParams);
        /****** Protected Static Helpers for Subclasses ******/
        protected static _allocateSlot(): number;
        protected static _freeSlot(id: number): void;
        protected static _attachChild(parentId: number, childId: number): void;
        protected static _detachChild(parentId: number, childId: number): void;
        protected static _getFirstChild(id: number): number;
        protected static _getNextSibling(id: number): number;
        protected static _getInstance(id: number): Element | undefined;
        protected static _getNativeWidget(id: number): mod.UIWidget | undefined;
        /**
         * Makes a deterministic, sequential name for a widget in the format `ui_${id}`.
         * @param id - The widget slot ID.
         * @returns The name of the widget.
         */
        protected static _makeName(id: number): string;
        /**
         * Gets the position from the parameters, given either x/y or position.
         * @param params - The parameters.
         * @returns The position.
         */
        protected static _getPosition(params: ElementParams): Position;
        /**
         * Gets the size from the parameters, given either width/height or size.
         * @param params - The parameters.
         * @returns The size.
         */
        protected static _getSize(params: ElementParams): Size;
        /**
         * Gets the receiver from the parameters, given either player, team, or neither.
         * @param parent - The parent of the widget.
         * @param receiverParam - The receiver parameter.
         * @returns The receiver.
         */
        protected static _getReceiver(
            parent: Parent,
            receiverParam?: mod.Player | mod.Team
        ): Receiver<mod.Player | mod.Team | undefined>;
        /****** Protected Button Slot Accessors for Subclasses ******/
        protected _allocateButtonSlot(): number;
        protected _freeButtonSlot(): void;
        protected _getButtonSlot(): number;
        protected _setButtonOnClickUp(slot: number, handler: ButtonHandler | undefined): void;
        protected _getButtonOnClickUp(slot: number): ButtonHandler | undefined;
        protected _setButtonOnClickDown(slot: number, handler: ButtonHandler | undefined): void;
        protected _getButtonOnClickDown(slot: number): ButtonHandler | undefined;
        protected _setButtonOnFocusIn(slot: number, handler: ButtonHandler | undefined): void;
        protected _getButtonOnFocusIn(slot: number): ButtonHandler | undefined;
        protected _setButtonOnFocusOut(slot: number, handler: ButtonHandler | undefined): void;
        protected _getButtonOnFocusOut(slot: number): ButtonHandler | undefined;
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
        private _deleteRecursive;
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
    export {};
}
