import { Logging } from '../logging/index.ts';
export declare namespace UI {
    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel: typeof Logging.LogLevel;
    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void;
    /**
     * Maximum number of UI elements supported simultaneously.
     */
    export const MAX_ELEMENTS = 2048;
    /**
     * Retrieves the number of currently active UI elements.
     * @returns The active element count.
     */
    export function getActiveElementCount(): number;
    /****** Types ******/
    /**
     * The type of a button handler.
     */
    export type ButtonHandler = (player: mod.Player) => Promise<void> | void;
    /**
     * The parent of an element.
     */
    export interface Parent extends Node {
        readonly receiver: mod.Player | mod.Team | null | undefined;
        readonly parent: Parent | null | undefined;
        readonly children: readonly Element[] | undefined;
        readonly childCount: number | undefined;
        getChild(index: number): Element | null | undefined;
        forEachChild(callback: (child: Element, index: number) => void): void;
    }
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
        protected static readonly _ROOT_NODE_ID = 0;
        protected static readonly _INVALID_INDEX = -1;
        protected static readonly _logging: Logging;
        protected _id: number;
        /**
         * The constructor for a node.
         * @param id - The internal widget ID.
         */
        constructor(id: number);
        /**
         * Internal static helper to read a Node's ID with zero casting.
         * @param node - The node to get the ID for.
         * @returns The node ID.
         */
        static _getId(node: Node): number;
        /**
         * The public generation-encoded node ID.
         * @returns The node ID.
         */
        get id(): number;
        /**
         * Checks whether this node is currently active and alive.
         * @returns True if the node is alive, false otherwise.
         */
        get isValid(): boolean;
        /**
         * Checks whether this node has been deleted.
         * @returns True if deleted, false if active, or undefined if invalid.
         */
        get isDeleted(): boolean | undefined;
        /**
         * The underlying native Battlefield Portal UIWidget handle for this node.
         * @returns The native UIWidget handle.
         */
        protected get _uiWidget(): mod.UIWidget;
        /**
         * The target audience receiver for the node (player or team, null if global, undefined if deleted).
         * @returns The native receiver, null, or undefined.
         */
        get receiver(): mod.Player | mod.Team | null | undefined;
    }
    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        constructor();
        /**
         * @inheritdoc
         */
        protected get _uiWidget(): mod.UIWidget;
        /**
         * @inheritdoc
         */
        get receiver(): null;
        /**
         * The parent of the root node is null.
         * @returns null.
         */
        get parent(): null;
        /**
         * Returns a snapshot array of direct child elements.
         * @returns Array of direct children.
         */
        get children(): readonly Element[];
        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, or null if out of bounds.
         */
        getChild(index: number): Element | null;
        /**
         * The total direct child count of the root node.
         * @returns The number of direct children.
         */
        get childCount(): number;
        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        forEachChild(callback: (child: Element, index: number) => void): void;
    }
    /**
     * The root node. This is the root of the UI tree and the default parent for all elements.
     */
    export const ROOT_NODE: Root;
    /**
     * The base element class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Element extends Node {
        protected static readonly _ROOT_NODE_ID = 0;
        protected static readonly _INVALID_INDEX = -1;
        protected static readonly _scratchPos: Position;
        protected static readonly _scratchSize: Size;
        protected get _slot(): number;
        protected get _isValid(): boolean;
        protected _getSlotAndLogWarning(): number;
        protected _getIsInvalidAndLogWarning(): boolean;
        protected get _receiver(): Receiver<mod.Player | mod.Team | undefined> | undefined;
        protected get _firstChild(): number;
        protected get _name(): string;
        /**
         * Binds the native engine widget to the allocated element slot.
         * @param nameOrWidget - The native widget name string (to find via mod.FindUIWidgetWithName) or widget handle.
         */
        protected _bindNativeWidget(nameOrWidget: string | mod.UIWidget): void;
        /**
         * The constructor for an element.
         * Allocates a slot and initializes element state, or assigns INVALID_INDEX if allocation fails.
         * @param params - The initialization parameters for the element.
         */
        protected constructor(params?: ElementParams);
        /****** Protected Static Helpers for Subclasses ******/
        protected static _resolveSlot(id: number): number;
        protected static _getNextSibling(slot: number): number;
        protected static _getInstance(slot: number): Element | undefined;
        protected static _getNativeWidget(target: Parent | Node | number): mod.UIWidget | undefined;
        /**
         * Gets the position from the parameters, given either x/y or position.
         * @param params - The parameters.
         * @param out - Optional target Position object to populate.
         * @returns The position.
         */
        protected static _getPosition(params: ElementParams, out?: Position): Position;
        /**
         * Gets the size from the parameters, given either width/height or size.
         * @param params - The parameters.
         * @param out - Optional target Size object to populate.
         * @returns The size.
         */
        protected static _getSize(params: ElementParams, out?: Size): Size;
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
        /**
         * The parent of the element, or undefined if deleted.
         * @returns The parent of the element, or undefined.
         */
        get parent(): Parent | undefined;
        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        set parent(parent: Parent);
        /**
         * Sets the parent of the element.
         * @param parent - The new parent.
         * @returns This element for chaining.
         */
        setParent(parent: Parent): this;
        /**
         * Whether the element is visible, or undefined if deleted.
         * @returns True if visible, false if invisible, or undefined if deleted.
         */
        get visible(): boolean | undefined;
        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        set visible(visible: boolean);
        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         * @returns This element for chaining.
         */
        setVisible(visible: boolean): this;
        /**
         * Shows the element (alias for `setVisible(true)`).
         * @returns This element for chaining.
         */
        show(): this;
        /**
         * Hides the element (alias for `setVisible(false)`).
         * @returns This element for chaining.
         */
        hide(): this;
        /**
         * Deletes the element.
         */
        delete(): void;
        private _deleteRecursiveSlot;
        /**
         * The X position of the element, or undefined if deleted.
         * @returns The X position of the element, or undefined.
         */
        get x(): number | undefined;
        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        set x(x: number);
        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         * @returns This element for chaining.
         */
        setX(x: number): this;
        /**
         * The Y position of the element, or undefined if deleted.
         * @returns The Y position of the element, or undefined.
         */
        get y(): number | undefined;
        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        set y(y: number);
        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         * @returns This element for chaining.
         */
        setY(y: number): this;
        /**
         * The position of the element, or undefined if deleted.
         * @returns The position of the element, or undefined.
         */
        get position(): Position | undefined;
        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        set position(params: Position);
        /**
         * Retrieves the position of the element, or undefined if deleted.
         * @param out - Optional target Position object to populate for zero allocations.
         * @returns The position of the element, or undefined.
         */
        getPosition(out?: Position): Position | undefined;
        /**
         * Sets the position of the element.
         * @param params - The position to set.
         * @returns This element for chaining.
         */
        setPosition(params: Position): this;
        /**
         * The width of the element, or undefined if deleted.
         * @returns The width of the element, or undefined.
         */
        get width(): number | undefined;
        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        set width(width: number);
        /**
         * Sets the width of the element.
         * @param width - The width to set.
         * @returns This element for chaining.
         */
        setWidth(width: number): this;
        /**
         * The height of the element, or undefined if deleted.
         * @returns The height of the element, or undefined.
         */
        get height(): number | undefined;
        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        set height(height: number);
        /**
         * Sets the height of the element.
         * @param height - The height to set.
         * @returns This element for chaining.
         */
        setHeight(height: number): this;
        /**
         * The size of the element, or undefined if deleted.
         * @returns The size of the element, or undefined.
         */
        get size(): Size | undefined;
        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        set size(params: Size);
        /**
         * Retrieves the size of the element, or undefined if deleted.
         * @param out - Optional target Size object to populate for zero allocations.
         * @returns The size of the element, or undefined.
         */
        getSize(out?: Size): Size | undefined;
        /**
         * Sets the size of the element.
         * @param params - The size to set.
         * @returns This element for chaining.
         */
        setSize(params: Size): this;
        /**
         * The background color of the element, or undefined if deleted.
         * @returns The background color of the element, or undefined.
         */
        get bgColor(): mod.Vector | undefined;
        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        set bgColor(color: mod.Vector);
        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         * @returns This element for chaining.
         */
        setBgColor(color: mod.Vector): this;
        /**
         * The background alpha of the element, or undefined if deleted.
         * @returns The background alpha of the element, or undefined.
         */
        get bgAlpha(): number | undefined;
        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        set bgAlpha(alpha: number);
        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         * @returns This element for chaining.
         */
        setBgAlpha(alpha: number): this;
        /**
         * The background fill of the element, or undefined if deleted.
         * @returns The background fill of the element, or undefined.
         */
        get bgFill(): mod.UIBgFill | undefined;
        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        set bgFill(fill: mod.UIBgFill);
        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         * @returns This element for chaining.
         */
        setBgFill(fill: mod.UIBgFill): this;
        /**
         * The depth of the element, or undefined if deleted.
         * @returns The depth of the element, or undefined.
         */
        get depth(): mod.UIDepth | undefined;
        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        set depth(depth: mod.UIDepth);
        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         * @returns This element for chaining.
         */
        setDepth(depth: mod.UIDepth): this;
        /**
         * The anchor of the element, or undefined if deleted.
         * @returns The anchor of the element, or undefined.
         */
        get anchor(): mod.UIAnchor | undefined;
        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        set anchor(anchor: mod.UIAnchor);
        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         * @returns This element for chaining.
         */
        setAnchor(anchor: mod.UIAnchor): this;
        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false if not, or undefined if deleted.
         */
        get uiInputModeWhenVisible(): boolean | undefined;
        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        set uiInputModeWhenVisible(newValue: boolean);
        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         * @returns This element for chaining.
         */
        setUiInputModeWhenVisible(newValue: boolean): this;
    }
    /****** Constants ******/
    /**
     * Some useful colors.
     */
    export const COLORS: Readonly<{
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
    }>;
    export {};
}
