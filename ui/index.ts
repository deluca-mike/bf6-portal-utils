import { Logging } from '../logging/index.ts';

// version: 6.0.0
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

    export type Size = {
        width: number;
        height: number;
    };

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

    // Base params type
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

        protected _inputModeRequesters: Set<Element> = new Set();

        protected constructor(id: string, receiver: T) {
            this._id = id;
            this._nativeReceiver = receiver;
        }

        public get id(): string {
            return this._id;
        }

        public get nativeReceiver(): T {
            return this._nativeReceiver;
        }

        public get isInputModeRequested(): boolean {
            return this._inputModeRequesters.size > 0;
        }

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

    export class GlobalReceiver extends Receiver<undefined> {
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

        public static getInstance(receiver: mod.Team): TeamReceiver {
            return TeamReceiver._instances.get(mod.GetObjId(receiver)) ?? new TeamReceiver(receiver);
        }
    }

    export class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances = new Map<number, PlayerReceiver>();

        private constructor(receiver: mod.Player) {
            const id = mod.GetObjId(receiver);
            super(`p${id}`, receiver);
            PlayerReceiver._instances.set(id, this);
        }

        public static getInstance(receiver: mod.Player): PlayerReceiver {
            return PlayerReceiver._instances.get(mod.GetObjId(receiver)) ?? new PlayerReceiver(receiver);
        }
    }

    export abstract class Node {
        protected readonly _logging: Logging = logging; // Every node has access to the singleton UI logging instance.
        protected _name: string;
        protected _uiWidget: mod.UIWidget;
        protected _receiver: GlobalReceiver | TeamReceiver | PlayerReceiver;

        public constructor(
            name: string,
            uiWidget: mod.UIWidget,
            receiver: GlobalReceiver | TeamReceiver | PlayerReceiver
        ) {
            this._name = name;
            this._uiWidget = uiWidget;
            this._receiver = receiver;
        }

        public get name(): string {
            return this._name;
        }

        public get uiWidget(): mod.UIWidget {
            return this._uiWidget;
        }

        public get receiver(): GlobalReceiver | TeamReceiver | PlayerReceiver {
            return this._receiver;
        }
    }

    export class Root extends Node implements Parent {
        public static readonly instance = new Root();

        private _children: Set<Element> = new Set();

        private constructor() {
            super('root', mod.GetUIRoot(), GlobalReceiver.instance);
        }

        public get children(): Element[] {
            return Array.from(this._children);
        }

        public attachChild(child: Element): void {
            this._children.add(child);
        }

        public detachChild(child: Element): void {
            this._children.delete(child);
        }
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
        protected _deleted: boolean = false;

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

        public get parent(): Parent {
            return this._parent;
        }

        public set parent(parent: Parent) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetParent(this._uiWidget, parent.uiWidget);

            this._parent.detachChild(this);

            this._parent = parent;

            this._parent.attachChild(this);
        }

        public setParent(parent: Parent): this {
            this.parent = parent;
            return this;
        }

        public get visible(): boolean {
            return this._visible;
        }

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

        public setVisible(visible: boolean): this {
            this.visible = visible;
            return this;
        }

        public show(): this {
            this.visible = true;
            return this;
        }

        public hide(): this {
            this.visible = false;
            return this;
        }

        public toggle(): this {
            this.visible = !this.visible;
            return this;
        }

        public get deleted(): boolean {
            return this._deleted;
        }

        public delete(): void {
            if (this._isDeletedCheck()) return;

            this._deleted = true;

            if (this._uiInputModeWhenVisible) {
                this._receiver.removeInputModeRequester(this);
            }

            this._parent.detachChild(this);

            mod.DeleteUIWidget(this._uiWidget);
        }

        public get x(): number {
            return this._x;
        }

        public set x(x: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector((this._x = x), this.y, 0));
        }

        public setX(x: number): this {
            this.x = x;
            return this;
        }

        public get y(): number {
            return this._y;
        }

        public set y(y: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(this.x, (this._y = y), 0));
        }

        public setY(y: number): this {
            this.y = y;
            return this;
        }

        public get position(): Position {
            return { x: this._x, y: this._y };
        }

        public set position(params: Position) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector((this._x = params.x), (this._y = params.y), 0));
        }

        public setPosition(params: Position): this {
            this.position = params;
            return this;
        }

        public get width(): number {
            return this._width;
        }

        public set width(width: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector((this._width = width), this.height, 0));
        }

        public setWidth(width: number): this {
            this.width = width;
            return this;
        }

        public get height(): number {
            return this._height;
        }

        public set height(height: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(this.width, (this._height = height), 0));
        }

        public setHeight(height: number): this {
            this.height = height;
            return this;
        }

        public get size(): Size {
            return { width: this._width, height: this._height };
        }

        public set size(params: Size) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetSize(
                this._uiWidget,
                mod.CreateVector((this._width = params.width), (this._height = params.height), 0)
            );
        }

        public setSize(params: Size): this {
            this.size = params;
            return this;
        }

        public get bgColor(): mod.Vector {
            return this._bgColor;
        }

        public set bgColor(color: mod.Vector) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgColor(this._uiWidget, (this._bgColor = color));
        }

        public setBgColor(color: mod.Vector): this {
            this.bgColor = color;
            return this;
        }

        public get bgAlpha(): number {
            return this._bgAlpha;
        }

        public set bgAlpha(alpha: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgAlpha(this._uiWidget, (this._bgAlpha = alpha));
        }

        public setBgAlpha(alpha: number): this {
            this.bgAlpha = alpha;
            return this;
        }

        public get bgFill(): mod.UIBgFill {
            return this._bgFill;
        }

        public set bgFill(fill: mod.UIBgFill) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgFill(this._uiWidget, (this._bgFill = fill));
        }

        public setBgFill(fill: mod.UIBgFill): this {
            this.bgFill = fill;
            return this;
        }

        public get depth(): mod.UIDepth {
            return this._depth;
        }

        public set depth(depth: mod.UIDepth) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetDepth(this._uiWidget, (this._depth = depth));
        }

        public setDepth(depth: mod.UIDepth): this {
            this.depth = depth;
            return this;
        }

        public get anchor(): mod.UIAnchor {
            return this._anchor;
        }

        public set anchor(anchor: mod.UIAnchor) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetAnchor(this._uiWidget, (this._anchor = anchor));
        }

        public setAnchor(anchor: mod.UIAnchor): this {
            this.anchor = anchor;
            return this;
        }

        public get uiInputModeWhenVisible(): boolean {
            return this._uiInputModeWhenVisible;
        }

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

        public setUiInputModeWhenVisible(newValue: boolean): this {
            this.uiInputModeWhenVisible = newValue;
            return this;
        }
    }

    /****** Constants ******/

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

    export const ROOT_NODE = Root.instance;

    /****** Button Registry ******/

    const BUTTONS = new Map<string, Button>();

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
     * Makes a name for a widget.
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

    /**
     * Handles a button event. Must be called in the `OnPlayerUIButtonEvent` handler.
     * @param player - The player who pressed the button.
     * @param widget - The widget that was pressed.
     * @param event - The button event.
     */
    export function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        // NOTE: `event: mod.UIButtonEvent` is currently broken or undefined, so we're not using it for now.
        const name = mod.GetUIWidgetName(widget);

        BUTTONS.get(name)
            ?.onClick?.(player)
            .catch((error: unknown) => {
                logging.log(`Error in click handler for widget ${name}.`, LogLevel.Error, error);
            });
    }
}
