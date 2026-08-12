import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 9.0.0
export namespace UI {
    /****** Logging ******/

    const logging = new Logging('UI');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

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
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

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

    /****** Classes ******/

    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _id: string;

        protected _nativeReceiver: T;

        protected _inputModeRequesterCount: number = 0;

        protected constructor(id: string, receiver: T) {
            this._id = id;
            this._nativeReceiver = receiver;
        }

        /**
         * The ID of the receiver. Used mainly for generating UI Widget names and for debugging purposes.
         * @returns The ID of the receiver.
         */
        public get id(): string {
            return this._id;
        }

        /**
         * The native receiver of the receiver. This is the actual player or team object, not the receiver object.
         * @returns The native receiver.
         */
        public get nativeReceiver(): T {
            return this._nativeReceiver;
        }

        /**
         * Whether input mode is requested for this receiver.
         * @returns True if input mode is requested, false otherwise.
         */
        public get isInputModeRequested(): boolean {
            return this._inputModeRequesterCount > 0;
        }

        /**
         * Increments the input mode requester count and enables input mode if transitioning from 0 to 1.
         */
        public addInputModeRequester(): void {
            if (++this._inputModeRequesterCount !== 1) return;

            if (this._nativeReceiver) {
                mod.EnableUIInputMode(true, this._nativeReceiver);
            } else {
                mod.EnableUIInputMode(true);
            }
        }

        /**
         * Decrements the input mode requester count and disables input mode if transitioning from 1 to 0.
         */
        public removeInputModeRequester(): void {
            if (this._inputModeRequesterCount <= 0 || --this._inputModeRequesterCount !== 0) return;

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

    /**
     * The team receiver. This is the receiver for a single team.
     */
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
     * The base node class. All elements are nodes, and all nodes are UI widgets.
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
         * The underlying native Battlefield Portal UIWidget handle for this node.
         *
         * Warning: Exercise caution when operating on the widget outside of this module/component,
         * as direct mutations via native `mod.*` APIs can desynchronize internal state and cause runtime errors.
         * @returns The native UIWidget handle.
         */
        public get uiWidget(): mod.UIWidget {
            return this._uiWidget;
        }

        /**
         * The receiver of the node.
         * @returns The receiver of the node.
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

        protected _children?: Element[];

        private constructor() {
            super('ui_0', mod.GetUIRoot(), GlobalReceiver.instance);
        }

        /**
         * Returns a shallow copy of the list of direct child elements.
         * @returns Array of direct children.
         */
        public get children(): readonly Element[] {
            return this._children ? this._children.slice() : [];
        }

        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, or undefined if out of bounds.
         */
        public getChild(index: number): Element | undefined {
            return this._children ? this._children[index] : undefined;
        }

        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        public forEachChild(callback: (child: Element, index: number) => void): void {
            if (!this._children) return;

            const count = this._children.length;

            for (let i = 0; i < count; ++i) {
                callback(this._children[i]!, i);
            }
        }

        /**
         * Attaches a child to the root node.
         * @param child - The child to attach.
         */
        public attachChild(child: Element): void {
            if (!this._children) {
                this._children = [child];
                return;
            }

            this._children.push(child);
        }

        /**
         * Detaches a child from the root node.
         * @param child - The child to detach.
         */
        public detachChild(child: Element): void {
            if (!this._children) return;

            const idx = this._children.indexOf(child);

            if (idx === -1) return;

            const last = this._children.pop()!;

            if (idx < this._children.length) {
                this._children[idx] = last;
            }
        }
    }

    /**
     * The base element class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Element extends Node {
        protected _parent: Parent;
        protected _uiInputModeWhenVisible: boolean;
        protected _hasInputMode: boolean = false;
        protected _deleted: boolean = false;

        /**
         * The constructor for an element.
         * @param params - The parameters for the element.
         */
        public constructor(params: FinalElementParams) {
            super(params.name, mod.FindUIWidgetWithName(params.name) as mod.UIWidget, params.receiver);

            this._parent = params.parent;
            this._uiInputModeWhenVisible = params.uiInputModeWhenVisible;

            this._parent.attachChild(this);

            if (this._uiInputModeWhenVisible && params.visible) {
                this._hasInputMode = true;
                this._receiver.addInputModeRequester();
            }
        }

        protected _isDeletedCheck(): boolean {
            if (this._deleted) {
                logging.log(`Element ${this._name} already deleted`, LogLevel.Warning);
                return true;
            }

            return false;
        }

        /**
         * The parent of the element.
         * @returns The parent of the element.
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
         * Whether the element is visible.
         * @returns True if visible, false otherwise.
         */
        public get visible(): boolean {
            return mod.GetUIWidgetVisible(this._uiWidget);
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        public set visible(visible: boolean) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetVisible(this._uiWidget, visible);

            if (!this._uiInputModeWhenVisible) return;

            if (visible && !this._hasInputMode) {
                this._hasInputMode = true;
                this._receiver.addInputModeRequester();
            } else if (!visible && this._hasInputMode) {
                this._hasInputMode = false;
                this._receiver.removeInputModeRequester();
            }
        }

        /**
         * Whether the element is deleted.
         * @returns True if deleted, false otherwise.
         */
        public get deleted(): boolean {
            return this._deleted;
        }

        /**
         * Deletes the element.
         */
        public delete(): void {
            if (this._isDeletedCheck()) return;

            this._deleted = true;

            if (this._hasInputMode) {
                this._hasInputMode = false;
                this._receiver.removeInputModeRequester();
            }

            this._parent.detachChild(this);

            mod.DeleteUIWidget(this._uiWidget);
        }

        /**
         * The X position of the element.
         * @returns The X position of the element.
         */
        public get x(): number {
            return mod.XComponentOf(mod.GetUIWidgetPosition(this._uiWidget));
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        public set x(x: number) {
            if (this._isDeletedCheck()) return;

            const cur = mod.GetUIWidgetPosition(this._uiWidget);

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(x, mod.YComponentOf(cur), 0));
        }

        /**
         * The Y position of the element.
         * @returns The Y position of the element.
         */
        public get y(): number {
            return mod.YComponentOf(mod.GetUIWidgetPosition(this._uiWidget));
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        public set y(y: number) {
            if (this._isDeletedCheck()) return;

            const cur = mod.GetUIWidgetPosition(this._uiWidget);

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(mod.XComponentOf(cur), y, 0));
        }

        /**
         * The position of the element.
         * @returns The position of the element.
         */
        public get position(): Position {
            const pos = mod.GetUIWidgetPosition(this._uiWidget);

            return { x: mod.XComponentOf(pos), y: mod.YComponentOf(pos) };
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        public set position(params: Position) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(params.x, params.y, 0));
        }

        /**
         * The width of the element.
         * @returns The width of the element.
         */
        public get width(): number {
            return mod.XComponentOf(mod.GetUIWidgetSize(this._uiWidget));
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        public set width(width: number) {
            if (this._isDeletedCheck()) return;

            const cur = mod.GetUIWidgetSize(this._uiWidget);

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, mod.YComponentOf(cur), 0));
        }

        /**
         * The height of the element.
         * @returns The height of the element.
         */
        public get height(): number {
            return mod.YComponentOf(mod.GetUIWidgetSize(this._uiWidget));
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        public set height(height: number) {
            if (this._isDeletedCheck()) return;

            const cur = mod.GetUIWidgetSize(this._uiWidget);

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(mod.XComponentOf(cur), height, 0));
        }

        /**
         * The size of the element.
         * @returns The size of the element.
         */
        public get size(): Size {
            const s = mod.GetUIWidgetSize(this._uiWidget);

            return { width: mod.XComponentOf(s), height: mod.YComponentOf(s) };
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        public set size(params: Size) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
        }

        /**
         * The background color of the element.
         * @returns The background color of the element.
         */
        public get bgColor(): mod.Vector {
            return mod.GetUIWidgetBgColor(this._uiWidget);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: mod.Vector) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgColor(this._uiWidget, color);
        }

        /**
         * The background alpha of the element.
         * @returns The background alpha of the element.
         */
        public get bgAlpha(): number {
            return mod.GetUIWidgetBgAlpha(this._uiWidget);
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        public set bgAlpha(alpha: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);
        }

        /**
         * The background fill of the element.
         * @returns The background fill of the element.
         */
        public get bgFill(): mod.UIBgFill {
            return mod.GetUIWidgetBgFill(this._uiWidget);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: mod.UIBgFill) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgFill(this._uiWidget, fill);
        }

        /**
         * The depth of the element.
         * @returns The depth of the element.
         */
        public get depth(): mod.UIDepth {
            return mod.GetUIWidgetDepth(this._uiWidget);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: mod.UIDepth) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetDepth(this._uiWidget, depth);
        }

        /**
         * The anchor of the element.
         * @returns The anchor of the element.
         */
        public get anchor(): mod.UIAnchor {
            return mod.GetUIWidgetAnchor(this._uiWidget);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: mod.UIAnchor) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetAnchor(this._uiWidget, anchor);
        }

        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false otherwise.
         */
        public get uiInputModeWhenVisible(): boolean {
            return this._uiInputModeWhenVisible;
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        public set uiInputModeWhenVisible(newValue: boolean) {
            if (this._isDeletedCheck()) return;

            if (this._uiInputModeWhenVisible === newValue) return;

            this._uiInputModeWhenVisible = newValue;

            const isVisible = mod.GetUIWidgetVisible(this._uiWidget);

            if (newValue && isVisible && !this._hasInputMode) {
                this._hasInputMode = true;
                this._receiver.addInputModeRequester();
            } else if ((!newValue || !isVisible) && this._hasInputMode) {
                this._hasInputMode = false;
                this._receiver.removeInputModeRequester();
            }
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

    /**
     * Handles a button event with zero intermediate object allocations.
     * @param player - The player who triggered the button event.
     * @param widget - The widget that was triggered.
     * @param event - The button event.
     */
    function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        const name = mod.GetUIWidgetName(widget);
        const button = BUTTONS.get(name);

        if (!button) {
            logging.log(`Button ${name} not found`, LogLevel.Warning);
            return;
        }

        let handler: ButtonHandler | undefined;

        if (mod.Equals(event, mod.UIButtonEvent.ButtonUp)) {
            handler = button.onClickUp;

            if (!handler) {
                logging.log(`Button ${name} has no onClickUp handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.ButtonDown)) {
            handler = button.onClickDown;

            if (!handler) {
                logging.log(`Button ${name} has no onClickDown handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusIn)) {
            handler = button.onFocusIn;

            if (!handler) {
                logging.log(`Button ${name} has no onFocusIn handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusOut)) {
            handler = button.onFocusOut;

            if (!handler) {
                logging.log(`Button ${name} has no onFocusOut handler`, LogLevel.Warning);
                return;
            }
        }

        if (!handler) {
            logging.log('HoverIn and HoverOut button events not supported', LogLevel.Warning);
            return;
        }

        CallbackHandler.invoke(handler, player, undefined, undefined, undefined, logging);
    }

    /**
     * Registers a button and returns a function to unregister it.
     * @param name - The name of the button.
     * @param button - The button to register.
     * @returns A function to unregister the button.
     */
    export function registerButton(name: string, button: Button): () => void {
        if (BUTTONS.has(name)) {
            logging.log(`Button ${name} already registered`, LogLevel.Warning);
            return () => {};
        }

        BUTTONS.set(name, button);

        const unregister = () => {
            BUTTONS.delete(name);
        };

        return unregister;
    }

    Events.OnPlayerUIButtonEvent.subscribe(handleButtonEvent);

    /****** Utils ******/

    let counter: number = 0;

    function isTeam(receiver?: mod.Player | mod.Team): receiver is mod.Team {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Team);
    }

    function isPlayer(receiver?: mod.Player | mod.Team): receiver is mod.Player {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Player);
    }

    /**
     * Makes a deterministic, sequential name for a widget in the format `ui_${++counter}`.
     * @returns The name of the widget.
     */
    export function makeName(): string {
        return `ui_${++counter}`;
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
                logging.log('Team receiver mismatch with parent', LogLevel.Warning);
            }

            if (parent.receiver instanceof PlayerReceiver) {
                logging.log('Parent receiver scope is more narrow', LogLevel.Warning);
            }

            return receiver;
        }

        if (isPlayer(receiverParam)) {
            const receiver = PlayerReceiver.getInstance(receiverParam);

            if (parent.receiver instanceof PlayerReceiver && parent.receiver !== receiver) {
                logging.log('Player receiver mismatch with parent', LogLevel.Warning);
            }

            if (
                parent.receiver instanceof TeamReceiver &&
                !mod.Equals(parent.receiver.nativeReceiver, mod.GetTeam(receiverParam))
            ) {
                logging.log('Parent receiver is different team', LogLevel.Warning);
            }

            return receiver;
        }

        return GlobalReceiver.instance;
    }
}
