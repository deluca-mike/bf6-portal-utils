import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 7.0.0
export namespace UI {
    /****** Logging ******/

    const logging = new Logging('UI');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

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
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

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

    // EitherPosition type is used to allow either position or x/y.
    type EitherPosition =
        | ({ position?: Position } & { x?: never; y?: never })
        | ({ x?: number; y?: number } & { position?: never });

    // EitherSize type is used to allow either size or width/height.
    type EitherSize =
        | ({ size?: Size } & { width?: never; height?: never })
        | ({ width?: number; height?: number } & { size?: never });

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

        protected _inputModeRequesters: Set<Element> = new Set();

        protected constructor(id: string, receiver: T) {
            this._id = id;
            this._nativeReceiver = receiver;
        }

        /**
         * The ID of the receiver. Used mainly for generating UI Widget names and for debugging purposes.
         */
        public get id(): string {
            return this._id;
        }

        /**
         * The native receiver of the receiver. This is the actual player or team object, not the receiver object.
         */
        public get nativeReceiver(): T {
            return this._nativeReceiver;
        }

        /**
         * Whether input mode is requested for this receiver.
         */
        public get isInputModeRequested(): boolean {
            return this._inputModeRequesters.size > 0;
        }

        /**
         * Adds an element to the input mode requesters.
         * @param element - The element to add.
         */
        public addInputModeRequester(element: Element): void {
            const wasAlreadyRequested = this.isInputModeRequested;
            this._inputModeRequesters.add(element);

            // If input mode was already requested, do nothing (there is obviously at least one requester).
            if (wasAlreadyRequested) return;

            if (this._nativeReceiver) {
                mod.EnableUIInputMode(true, this._nativeReceiver);
            } else {
                mod.EnableUIInputMode(true);
            }
        }

        /**
         * Removes an element from the input mode requesters.
         * @param element - The element to remove.
         */
        public removeInputModeRequester(element: Element): void {
            const wasAlreadyRequested = this.isInputModeRequested;
            this._inputModeRequesters.delete(element);

            // If input mode was not requested, do nothing (there are obviously still no requesters).
            if (!wasAlreadyRequested) return;

            // If input mode is still requested, do nothing (there is still at least one requester).
            if (this.isInputModeRequested) return;

            if (this._nativeReceiver) {
                mod.EnableUIInputMode(false, this._nativeReceiver);
            } else {
                mod.EnableUIInputMode(false);
            }
        }
    }

    /**
     * The global receiver. This is the receiver for all players and teams.
     */
    export class GlobalReceiver extends Receiver<undefined> {
        /**
         * The singleton instance of the global receiver.
         */
        public static readonly instance = new GlobalReceiver();

        private constructor() {
            super('g', undefined);
        }
    }

    export class TeamReceiver extends Receiver<mod.Team> {
        private static _instances = new Map<number, TeamReceiver>();

        private constructor(receiver: mod.Team) {
            const id = mod.GetObjId(receiver);
            super(`t${id}`, receiver);
            TeamReceiver._instances.set(id, this);
        }

        /**
         * Gets or creates the instance of the team receiver for a given team.
         * @param receiver - The team to get the instance for.
         * @returns The instance of the team receiver.
         */
        public static getInstance(receiver: mod.Team): TeamReceiver {
            return TeamReceiver._instances.get(mod.GetObjId(receiver)) ?? new TeamReceiver(receiver);
        }
    }

    /**
     * The player receiver. This is the receiver for a single player.
     */
    export class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances = new Map<number, PlayerReceiver>();

        private constructor(receiver: mod.Player) {
            const id = mod.GetObjId(receiver);
            super(`p${id}`, receiver);
            PlayerReceiver._instances.set(id, this);
        }

        /**
         * Gets or creates the instance of the player receiver for a given player.
         * @param receiver - The player to get the instance for.
         * @returns The instance of the player receiver.
         */
        public static getInstance(receiver: mod.Player): PlayerReceiver {
            return PlayerReceiver._instances.get(mod.GetObjId(receiver)) ?? new PlayerReceiver(receiver);
        }
    }

    /**
     * The base node class. All elements are nodes, adn all nodes are UI widgets.
     */
    export abstract class Node {
        protected readonly _logging: Logging = logging; // Every node has access to the singleton UI logging instance.
        protected _name: string;
        protected _uiWidget: mod.UIWidget;
        protected _receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;

        /**
         * The constructor for a node.
         * @param name - The name of the node.
         * @param uiWidget - The UI widget of the node.
         * @param receiver - The receiver of the node.
         */
        public constructor(
            name: string,
            uiWidget: mod.UIWidget,
            receiver: GlobalReceiver | TeamReceiver | PlayerReceiver
        ) {
            this._name = name;
            this._uiWidget = uiWidget;
            this._receiver = receiver;
        }

        /**
         * The name of the node. This is the name of the UIWidget.
         */
        public get name(): string {
            return this._name;
        }

        /**
         * The UIWidget of the node.
         */
        public get uiWidget(): mod.UIWidget {
            return this._uiWidget;
        }

        /**
         * The receiver of the node.
         */
        public get receiver(): GlobalReceiver | TeamReceiver | PlayerReceiver {
            return this._receiver;
        }
    }

    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        /**
         * The singleton instance of the root node.
         */
        public static readonly instance = new Root();

        private _children: Set<Element> = new Set();

        private constructor() {
            super('root', mod.GetUIRoot(), GlobalReceiver.instance);
        }

        /**
         * The children of the root node.
         */
        public get children(): Element[] {
            return Array.from(this._children);
        }

        /**
         * Attaches a child to the root node.
         * @param child - The child to attach.
         */
        public attachChild(child: Element): void {
            this._children.add(child);
        }

        /**
         * Detaches a child from the root node.
         * @param child - The child to detach.
         */
        public detachChild(child: Element): void {
            this._children.delete(child);
        }
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
        protected _deleted: boolean = false;

        /**
         * The constructor for an element.
         * @param params - The parameters for the element.
         */
        public constructor(params: FinalElementParams) {
            super(params.name, mod.FindUIWidgetWithName(params.name) as mod.UIWidget, params.receiver);

            this._parent = params.parent;
            this._visible = params.visible;
            this._x = params.x;
            this._y = params.y;
            this._width = params.width;
            this._height = params.height;
            this._bgColor = params.bgColor;
            this._bgAlpha = params.bgAlpha;
            this._bgFill = params.bgFill;
            this._depth = params.depth;
            this._anchor = params.anchor;
            this._uiInputModeWhenVisible = params.uiInputModeWhenVisible;

            this._parent.attachChild(this);

            if (this._uiInputModeWhenVisible && this._visible) {
                this._receiver.addInputModeRequester(this);
            }
        }

        protected _isDeletedCheck(): boolean {
            if (this._deleted) {
                logging.log(`Element ${this.name} already deleted.`, LogLevel.Warning);
                return true;
            }

            return false;
        }

        /**
         * The parent of the element.
         */
        public get parent(): Parent {
            return this._parent;
        }

        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        public set parent(parent: Parent) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetParent(this._uiWidget, parent.uiWidget);

            this._parent.detachChild(this);

            this._parent = parent;

            this._parent.attachChild(this);
        }

        /**
         * Sets the parent of the element. Useful for chaining operations.
         * @param parent - The parent to set.
         * @returns This element instance.
         */
        public setParent(parent: Parent): this {
            this.parent = parent;
            return this;
        }

        /**
         * Whether the element is visible.
         */
        public get visible(): boolean {
            return this._visible;
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        public set visible(visible: boolean) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetVisible(this._uiWidget, (this._visible = visible));

            if (!this._uiInputModeWhenVisible) return;

            if (visible) {
                this._receiver.addInputModeRequester(this);
            } else {
                this._receiver.removeInputModeRequester(this);
            }
        }

        /**
         * Sets the visibility of the element. Useful for chaining operations.
         * @param visible - The visibility to set.
         * @returns This element instance.
         */
        public setVisible(visible: boolean): this {
            this.visible = visible;
            return this;
        }

        /**
         * Shows the element.
         * @returns This element instance.
         */
        public show(): this {
            this.visible = true;
            return this;
        }

        /**
         * Hides the element.
         * @returns This element instance.
         */
        public hide(): this {
            this.visible = false;
            return this;
        }

        /**
         * Toggles the visibility of the element.
         * @returns This element instance.
         */
        public toggle(): this {
            this.visible = !this.visible;
            return this;
        }

        /**
         * Whether the element is deleted. This is needed to block all setter operations after the element is deleted
         * but a reference to the element is still in memory and the experience code is still trying to use it.
         */
        public get deleted(): boolean {
            return this._deleted;
        }

        /**
         * Deletes the element. Does not return `this` for chaining because the element is destroyed and no other calls
         * on it should be performed.
         */
        public delete(): void {
            if (this._isDeletedCheck()) return;

            this._deleted = true;

            if (this._uiInputModeWhenVisible) {
                this._receiver.removeInputModeRequester(this);
            }

            this._parent.detachChild(this);

            mod.DeleteUIWidget(this._uiWidget);
        }

        /**
         * The X position of the element.
         */
        public get x(): number {
            return this._x;
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        public set x(x: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector((this._x = x), this.y, 0));
        }

        /**
         * Sets the X position of the element. Useful for chaining operations.
         * @param x - The X position to set.
         * @returns This element instance.
         */
        public setX(x: number): this {
            this.x = x;
            return this;
        }

        /**
         * The Y position of the element.
         */
        public get y(): number {
            return this._y;
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        public set y(y: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(this.x, (this._y = y), 0));
        }

        /**
         * Sets the Y position of the element. Useful for chaining operations.
         * @param y - The Y position to set.
         * @returns This element instance.
         */
        public setY(y: number): this {
            this.y = y;
            return this;
        }

        /**
         * The position of the element.
         */
        public get position(): Position {
            return { x: this._x, y: this._y };
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        public set position(params: Position) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector((this._x = params.x), (this._y = params.y), 0));
        }

        /**
         * Sets the position of the element. Useful for chaining operations.
         * @param params - The position to set.
         * @returns This element instance.
         */
        public setPosition(params: Position): this {
            this.position = params;
            return this;
        }

        /**
         * The width of the element.
         */
        public get width(): number {
            return this._width;
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        public set width(width: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector((this._width = width), this.height, 0));
        }

        /**
         * Sets the width of the element. Useful for chaining operations.
         * @param width - The width to set.
         * @returns This element instance.
         */
        public setWidth(width: number): this {
            this.width = width;
            return this;
        }

        /**
         * The height of the element.
         */
        public get height(): number {
            return this._height;
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        public set height(height: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(this.width, (this._height = height), 0));
        }

        /**
         * Sets the height of the element. Useful for chaining operations.
         * @param height - The height to set.
         * @returns This element instance.
         */
        public setHeight(height: number): this {
            this.height = height;
            return this;
        }

        /**
         * The size of the element.
         */
        public get size(): Size {
            return { width: this._width, height: this._height };
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        public set size(params: Size) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(
                this._uiWidget,
                mod.CreateVector((this._width = params.width), (this._height = params.height), 0)
            );
        }

        /**
         * Sets the size of the element. Useful for chaining operations.
         * @param params - The size to set.
         * @returns This element instance.
         */
        public setSize(params: Size): this {
            this.size = params;
            return this;
        }

        /**
         * The background color of the element.
         */
        public get bgColor(): mod.Vector {
            return this._bgColor;
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: mod.Vector) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgColor(this._uiWidget, (this._bgColor = color));
        }

        /**
         * Sets the background color of the element. Useful for chaining operations.
         * @param color - The background color to set.
         * @returns This element instance.
         */
        public setBgColor(color: mod.Vector): this {
            this.bgColor = color;
            return this;
        }

        /**
         * The background alpha of the element.
         */
        public get bgAlpha(): number {
            return this._bgAlpha;
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        public set bgAlpha(alpha: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgAlpha(this._uiWidget, (this._bgAlpha = alpha));
        }

        /**
         * Sets the background alpha of the element. Useful for chaining operations.
         * @param alpha - The background alpha to set.
         * @returns This element instance.
         */
        public setBgAlpha(alpha: number): this {
            this.bgAlpha = alpha;
            return this;
        }

        /**
         * The background fill of the element.
         */
        public get bgFill(): mod.UIBgFill {
            return this._bgFill;
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: mod.UIBgFill) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgFill(this._uiWidget, (this._bgFill = fill));
        }

        /**
         * Sets the background fill of the element. Useful for chaining operations.
         * @param fill - The background fill to set.
         * @returns This element instance.
         */
        public setBgFill(fill: mod.UIBgFill): this {
            this.bgFill = fill;
            return this;
        }

        /**
         * The depth of the element.
         */
        public get depth(): mod.UIDepth {
            return this._depth;
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: mod.UIDepth) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetDepth(this._uiWidget, (this._depth = depth));
        }

        /**
         * Sets the depth of the element. Useful for chaining operations.
         * @param depth - The depth to set.
         * @returns This element instance.
         */
        public setDepth(depth: mod.UIDepth): this {
            this.depth = depth;
            return this;
        }

        /**
         * The anchor of the element.
         */
        public get anchor(): mod.UIAnchor {
            return this._anchor;
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: mod.UIAnchor) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetAnchor(this._uiWidget, (this._anchor = anchor));
        }

        /**
         * Sets the anchor of the element. Useful for chaining operations.
         * @param anchor - The anchor to set.
         * @returns This element instance.
         */
        public setAnchor(anchor: mod.UIAnchor): this {
            this.anchor = anchor;
            return this;
        }

        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         */
        public get uiInputModeWhenVisible(): boolean {
            return this._uiInputModeWhenVisible;
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * Has an immediate effect on the receiver's input mode state.
         * @param newValue - The new value.
         */
        public set uiInputModeWhenVisible(newValue: boolean) {
            if (this._isDeletedCheck()) return;

            const previousValue = this._uiInputModeWhenVisible;

            if (previousValue === newValue) return;

            this._uiInputModeWhenVisible = newValue;

            // If `uiInputModeWhenVisible` is being enabled and the element is visible...
            if (newValue && this.visible) {
                // ...add the element as an input mode requester.
                this._receiver.addInputModeRequester(this);
            } else {
                // ...remove the element as an input mode requester.
                this._receiver.removeInputModeRequester(this);
            }
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * Has an immediate effect on the receiver's input mode state.
         * Useful for chaining operations.
         * @param newValue - The new value.
         * @returns This element instance.
         */
        public setUiInputModeWhenVisible(newValue: boolean): this {
            this.uiInputModeWhenVisible = newValue;
            return this;
        }
    }

    /****** Constants ******/

    /**
     * Some useful colors.
     */
    export const COLORS = {
        BLACK: mod.CreateVector(0, 0, 0),
        GREY_25: mod.CreateVector(0.25, 0.25, 0.25),
        GREY_50: mod.CreateVector(0.5, 0.5, 0.5),
        GREY_75: mod.CreateVector(0.75, 0.75, 0.75),
        WHITE: mod.CreateVector(1, 1, 1),
        RED: mod.CreateVector(1, 0, 0),
        GREEN: mod.CreateVector(0, 1, 0),
        BLUE: mod.CreateVector(0, 0, 1),
        YELLOW: mod.CreateVector(1, 1, 0),
        PURPLE: mod.CreateVector(1, 0, 1),
        CYAN: mod.CreateVector(0, 1, 1),
        MAGENTA: mod.CreateVector(1, 0, 1),
        BF_GREY_1: mod.CreateVector(0.8353, 0.9216, 0.9765), // #D5EBF9
        BF_GREY_2: mod.CreateVector(0.3294, 0.3686, 0.3882), // #545E63
        BF_GREY_3: mod.CreateVector(0.2118, 0.2235, 0.2353), // #36393C
        BF_GREY_4: mod.CreateVector(0.0314, 0.0431, 0.0431), // #080B0B,
        BF_BLUE_BRIGHT: mod.CreateVector(0.4392, 0.9216, 1.0), // #70EBFF
        BF_BLUE_DARK: mod.CreateVector(0.0745, 0.1843, 0.2471), // #132F3F
        BF_RED_BRIGHT: mod.CreateVector(1.0, 0.5137, 0.3804), // #FF8361
        BF_RED_DARK: mod.CreateVector(0.251, 0.0941, 0.0667), // #401811
        BF_GREEN_BRIGHT: mod.CreateVector(0.6784, 0.9922, 0.5255), // #ADFD86
        BF_GREEN_DARK: mod.CreateVector(0.2784, 0.4471, 0.2118), // #477236
        BF_YELLOW_BRIGHT: mod.CreateVector(1.0, 0.9882, 0.6118), // #FFFC9C
        BF_YELLOW_DARK: mod.CreateVector(0.4431, 0.3765, 0.0), // #716000
    };

    /**
     * The root node. This is the root of the UI tree and the default parent for all elements.
     */
    export const ROOT_NODE = Root.instance;

    /****** Button Registry ******/

    const BUTTONS = new Map<string, Button>();

    Events.OnPlayerUIButtonEvent.subscribe(handleButtonEvent);

    /**
     * Handles a button event.
     * @param player - The player who pressed the button.
     * @param widget - The widget that was pressed.
     * @param event - The button event.
     */
    function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        // NOTE: `event: mod.UIButtonEvent` is currently broken or undefined, so we're not using it for now.
        const name = mod.GetUIWidgetName(widget);

        const onClick = BUTTONS.get(name)?.onClick;

        if (!onClick) return;

        CallbackHandler.invoke(onClick, [player], `click handler for widget ${name}`, logging, LogLevel.Error);
    }

    /**
     * Registers a button and returns a function to unregister it.
     * @param name - The name of the button.
     * @param button - The button to register.
     * @returns A function to unregister the button.
     */
    export function registerButton(name: string, button: Button): () => void {
        if (BUTTONS.has(name)) {
            logging.log(`Button ${name} already registered.`, LogLevel.Warning);
            return () => {};
        }

        BUTTONS.set(name, button);

        return () => {
            BUTTONS.delete(name);
        };
    }

    /****** Utils ******/

    let counter: number = 0;

    function isTeam(receiver?: mod.Player | mod.Team): receiver is mod.Team {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Team);
    }

    function isPlayer(receiver?: mod.Player | mod.Team): receiver is mod.Player {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Player);
    }

    /**
     * Makes a deterministic name for a widget given its parent and receiver.
     * @param parent - The parent of the widget.
     * @param receiver - The receiver of the widget.
     * @returns The name of the widget.
     */
    export function makeName(parent: Parent, receiver: GlobalReceiver | TeamReceiver | PlayerReceiver): string {
        return `${parent.name}${parent.receiver !== receiver ? `_${receiver.id}` : ''}_${counter++}`;
    }

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
    ): void {
        for (const prop of properties) {
            // Create getter and setter.
            Object.defineProperty(target, prop, {
                get() {
                    return (source as Record<string, unknown>)[prop];
                },
                set(value: unknown) {
                    (source as Record<string, unknown>)[prop] = value;
                },
                enumerable: true,
                configurable: true,
            });

            // Create setter method (e.g., setBaseAlpha).
            const setterMethodName = `set${prop.charAt(0).toUpperCase() + prop.slice(1)}`;

            (target as Record<string, unknown>)[setterMethodName] = function (value: unknown) {
                (source as Record<string, unknown>)[prop] = value;
                return this;
            };
        }
    }

    /**
     * Gets the position from the parameters, given either x/y or position.
     * @param params - The parameters.
     * @returns The position.
     */
    export function getPosition(params: ElementParams): Position {
        return { x: params.x ?? params.position?.x ?? 0, y: params.y ?? params.position?.y ?? 0 };
    }

    /**
     * Gets the size from the parameters, given either width/height or size.
     * @param params - The parameters.
     * @returns The size.
     */
    export function getSize(params: ElementParams): Size {
        return { width: params.width ?? params.size?.width ?? 0, height: params.height ?? params.size?.height ?? 0 };
    }

    /**
     * Gets the receiver from the parameters, given either player, team, or neither.
     * @param parent - The parent of the widget.
     * @param receiverParam - The receiver parameter.
     * @returns The receiver.
     */
    export function getReceiver(
        parent: Parent,
        receiverParam?: mod.Player | mod.Team
    ): GlobalReceiver | TeamReceiver | PlayerReceiver {
        if (!receiverParam) return parent.receiver;

        if (isTeam(receiverParam)) {
            const receiver = TeamReceiver.getInstance(receiverParam);

            if (parent.receiver instanceof TeamReceiver && parent.receiver !== receiver) {
                logging.log('Team receiver mismatch with parent.', LogLevel.Warning);
            }

            if (parent.receiver instanceof PlayerReceiver) {
                logging.log('Parent receiver scope is more narrow.', LogLevel.Warning);
            }

            return receiver;
        }

        if (isPlayer(receiverParam)) {
            const receiver = PlayerReceiver.getInstance(receiverParam);

            if (parent.receiver instanceof PlayerReceiver && parent.receiver !== receiver) {
                logging.log('Player receiver mismatch with parent.', LogLevel.Warning);
            }

            if (
                parent.receiver instanceof TeamReceiver &&
                !mod.Equals(parent.receiver.nativeReceiver, mod.GetTeam(receiverParam))
            ) {
                logging.log('Parent receiver is different team.', LogLevel.Warning);
            }

            return receiver;
        }

        return GlobalReceiver.instance;
    }
}
