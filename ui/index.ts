// version: 5.0.0
export namespace UI {
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

    // EitherPosition type is used to allow either position or x/y.
    type EitherPosition =
        | ({ position?: Position } & { x?: never; y?: never })
        | ({ x?: number; y?: number } & { position?: never });

    // EitherSize type is used to allow either size or width/height.
    type EitherSize =
        | ({ size?: Size } & { width?: never; height?: never })
        | ({ width?: number; height?: number } & { size?: never });

    // Base params type
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

    // Container children parameters with a 'type' property and the properties required by that element's constructor.
    export type ChildParams<T extends ElementParams> = T & {
        type: new (params: T, receiver?: mod.Player | mod.Team) => Element;
    };

    // Export ContainerParams with properly typed childrenParams
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

    class GlobalReceiver extends Receiver<undefined> {
        public static readonly instance = new GlobalReceiver();

        private constructor() {
            super('g', undefined);
        }
    }

    class TeamReceiver extends Receiver<mod.Team> {
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

    class PlayerReceiver extends Receiver<mod.Player> {
        private static _instances = new Map<number, PlayerReceiver>();

        private constructor(receiver: mod.Player) {
            super(`p${mod.GetObjId(receiver)}`, receiver);
            PlayerReceiver._instances.set(mod.GetObjId(receiver), this);
        }

        public static getInstance(receiver: mod.Player): PlayerReceiver {
            return PlayerReceiver._instances.get(mod.GetObjId(receiver)) ?? new PlayerReceiver(receiver);
        }
    }

    export abstract class Node {
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

        private _children: Element[] = [];

        private constructor() {
            super('root', mod.GetUIRoot(), GlobalReceiver.instance);
        }

        public get children(): Element[] {
            return this._children;
        }

        public attachChild(child: Element): this {
            if (child.parent !== this) return this;

            if (this._children.includes(child)) return this;

            this._children.push(child);

            return this;
        }

        public detachChild(child: Element): this {
            if (child.parent === this) return this;

            const index = this._children.indexOf(child);

            if (index === -1) return this;

            this._children.splice(index, 1);

            return this;
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
        protected _padding: number;
        protected _uiInputModeWhenVisible: boolean;

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
            this._padding = params.padding;
            this._uiInputModeWhenVisible = params.uiInputModeWhenVisible;
        }

        public get parent(): Parent {
            return this._parent;
        }

        public set parent(parent: Parent) {
            mod.SetUIWidgetParent(this._uiWidget, parent.uiWidget);

            const oldParent = this._parent;
            this._parent = parent;

            oldParent.detachChild(this);
            parent.attachChild(this);
        }

        public setParent(parent: Parent): this {
            this.parent = parent;
            return this;
        }

        public get visible(): boolean {
            return this._visible;
        }

        public set visible(visible: boolean) {
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

        public delete(): void {
            if (this._uiInputModeWhenVisible) {
                this._receiver.removeInputModeRequester(this);
            }

            mod.DeleteUIWidget(this._uiWidget);
        }

        public get x(): number {
            return this._x;
        }

        public set x(x: number) {
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
            mod.SetUIWidgetAnchor(this._uiWidget, (this._anchor = anchor));
        }

        public setAnchor(anchor: mod.UIAnchor): this {
            this.anchor = anchor;
            return this;
        }

        public get padding(): number {
            return this._padding;
        }

        public set padding(padding: number) {
            mod.SetUIWidgetPadding(this._uiWidget, (this._padding = padding));
        }

        public setPadding(padding: number): this {
            this.padding = padding;
            return this;
        }

        public get uiInputModeWhenVisible(): boolean {
            return this._uiInputModeWhenVisible;
        }

        public set uiInputModeWhenVisible(newValue: boolean) {
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

    export class Container extends Element implements Parent {
        private _children: Element[] = [];

        public constructor(params: ContainerParams) {
            const parent = params.parent ?? ROOT_NODE;
            const receiver = getReceiver(parent, params.receiver);
            const { x, y } = getPosition(params);
            const { width, height } = getSize(params);

            const elementParams: FinalElementParams = {
                name: makeName(parent, receiver),
                parent,
                visible: params.visible ?? true,
                x,
                y,
                width,
                height,
                anchor: params.anchor ?? mod.UIAnchor.Center,
                padding: params.padding ?? 0,
                bgColor: params.bgColor ?? COLORS.WHITE,
                bgAlpha: params.bgAlpha ?? 0,
                bgFill: params.bgFill ?? mod.UIBgFill.None,
                depth: params.depth ?? mod.UIDepth.AboveGameUI,
                receiver,
                uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
            };

            const args: [
                string, // name
                mod.Vector, // position
                mod.Vector, // size
                mod.UIAnchor, // anchor
                mod.UIWidget, // parent
                boolean, // visible
                number, // padding
                mod.Vector, // bgColor
                number, // bgAlpha
                mod.UIBgFill, // bgFill
                mod.UIDepth, // depth
            ] = [
                elementParams.name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                elementParams.anchor,
                parent.uiWidget,
                elementParams.visible,
                elementParams.padding,
                elementParams.bgColor,
                elementParams.bgAlpha,
                elementParams.bgFill,
                elementParams.depth,
            ];

            if (receiver instanceof GlobalReceiver) {
                mod.AddUIContainer(...args);
            } else {
                mod.AddUIContainer(...args, receiver.nativeReceiver);
            }

            super(elementParams);

            for (const childParams of params.childrenParams ?? []) {
                childParams.parent = this;

                const child = new childParams.type(childParams, receiver);

                this._children.push(child);
            }
        }

        public get children(): Element[] {
            return this._children;
        }

        public override delete(): void {
            for (const child of this._children) {
                child.delete();
            }

            super.delete();
        }

        public attachChild(child: Element): this {
            if (child.parent !== this) return this;

            if (this._children.includes(child)) return this;

            this._children.push(child);

            return this;
        }

        public detachChild(child: Element): this {
            if (child.parent === this) return this;

            const index = this._children.indexOf(child);

            if (index === -1) return this;

            this._children.splice(index, 1);

            return this;
        }
    }

    export class Text extends Element {
        private _message: mod.Message;
        private _textSize: number;
        private _textColor: mod.Vector;
        private _textAlpha: number;
        private _textAnchor: mod.UIAnchor;

        public constructor(params: TextParams) {
            const parent = params.parent ?? ROOT_NODE;
            const receiver = getReceiver(parent, params.receiver);
            const { x, y } = getPosition(params);
            const { width, height } = getSize(params);

            const elementParams: FinalElementParams = {
                name: makeName(parent, receiver),
                parent,
                visible: params.visible ?? true,
                x,
                y,
                width,
                height,
                anchor: params.anchor ?? mod.UIAnchor.Center,
                padding: params.padding ?? 0,
                bgColor: params.bgColor ?? COLORS.WHITE,
                bgAlpha: params.bgAlpha ?? 0,
                bgFill: params.bgFill ?? mod.UIBgFill.None,
                depth: params.depth ?? mod.UIDepth.AboveGameUI,
                receiver,
                uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
            };

            const message = params.message;
            const textSize = params.textSize ?? 36;
            const textColor = params.textColor ?? COLORS.BLACK;
            const textAlpha = params.textAlpha ?? 1;
            const textAnchor = params.textAnchor ?? mod.UIAnchor.Center;

            const args: [
                string, // name
                mod.Vector, // position
                mod.Vector, // size
                mod.UIAnchor, // anchor
                mod.UIWidget, // parent
                boolean, // visible
                number, // padding
                mod.Vector, // bgColor
                number, // bgAlpha
                mod.UIBgFill, // bgFill
                mod.Message, // message
                number, // textSize
                mod.Vector, // textColor
                number, // textAlpha
                mod.UIAnchor, // textAnchor
                mod.UIDepth, // depth
            ] = [
                elementParams.name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                elementParams.anchor,
                parent.uiWidget,
                elementParams.visible,
                elementParams.padding,
                elementParams.bgColor,
                elementParams.bgAlpha,
                elementParams.bgFill,
                message,
                textSize,
                textColor,
                textAlpha,
                textAnchor,
                elementParams.depth,
            ];

            if (receiver instanceof GlobalReceiver) {
                mod.AddUIText(...args);
            } else {
                mod.AddUIText(...args, receiver.nativeReceiver);
            }

            super(elementParams);

            this._message = params.message;
            this._textSize = textSize;
            this._textColor = textColor;
            this._textAlpha = textAlpha;
            this._textAnchor = textAnchor;
        }

        public get message(): mod.Message {
            return this._message;
        }

        public set message(message: mod.Message) {
            mod.SetUITextLabel(this._uiWidget, message);
        }

        public setMessage(message: mod.Message): this {
            this.message = message;
            return this;
        }

        public get textAlpha(): number {
            return this._textAlpha;
        }

        public set textAlpha(alpha: number) {
            mod.SetUITextAlpha(this._uiWidget, (this._textAlpha = alpha));
        }

        public setTextAlpha(alpha: number): this {
            this.textAlpha = alpha;
            return this;
        }

        public get textAnchor(): mod.UIAnchor {
            return this._textAnchor;
        }

        public set textAnchor(anchor: mod.UIAnchor) {
            mod.SetUITextAnchor(this._uiWidget, (this._textAnchor = anchor));
        }

        public setTextAnchor(anchor: mod.UIAnchor): this {
            this.textAnchor = anchor;
            return this;
        }

        public get textColor(): mod.Vector {
            return this._textColor;
        }

        public set textColor(color: mod.Vector) {
            mod.SetUITextColor(this._uiWidget, (this._textColor = color));
        }

        public setTextColor(color: mod.Vector): this {
            this.textColor = color;
            return this;
        }

        public get textSize(): number {
            return this._textSize;
        }

        public set textSize(size: number) {
            mod.SetUITextSize(this._uiWidget, (this._textSize = size));
        }

        public setTextSize(size: number): this {
            this.textSize = size;
            return this;
        }
    }

    export class Button extends Element {
        private _buttonEnabled: boolean;
        private _baseColor: mod.Vector;
        private _baseAlpha: number;
        private _disabledColor: mod.Vector;
        private _disabledAlpha: number;
        private _pressedColor: mod.Vector;
        private _pressedAlpha: number;
        private _hoverColor: mod.Vector;
        private _hoverAlpha: number;
        private _focusedColor: mod.Vector;
        private _focusedAlpha: number;
        private _onClick: ((player: mod.Player) => Promise<void>) | undefined;

        public constructor(params: ButtonParams) {
            const parent = params.parent ?? ROOT_NODE;
            const receiver = getReceiver(parent, params.receiver);
            const { x, y } = getPosition(params);
            const { width, height } = getSize(params);

            const elementParams: FinalElementParams = {
                name: makeName(parent, receiver),
                parent,
                visible: params.visible ?? true,
                x,
                y,
                width,
                height,
                anchor: params.anchor ?? mod.UIAnchor.Center,
                padding: params.padding ?? 0,
                bgColor: params.bgColor ?? COLORS.WHITE,
                bgAlpha: params.bgAlpha ?? 0,
                bgFill: params.bgFill ?? mod.UIBgFill.None,
                depth: params.depth ?? mod.UIDepth.AboveGameUI,
                receiver,
                uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
            };

            const buttonEnabled = params.buttonEnabled ?? true;
            const baseColor = params.baseColor ?? COLORS.BF_GREY_2;
            const baseAlpha = params.baseAlpha ?? 1;
            const disabledColor = params.disabledColor ?? COLORS.BF_GREY_3;
            const disabledAlpha = params.disabledAlpha ?? 1;
            const pressedColor = params.pressedColor ?? COLORS.BF_GREEN_BRIGHT;
            const pressedAlpha = params.pressedAlpha ?? 1;
            const hoverColor = params.hoverColor ?? COLORS.BF_GREY_1;
            const hoverAlpha = params.hoverAlpha ?? 1;
            const focusedColor = params.focusedColor ?? COLORS.BF_GREY_1;
            const focusedAlpha = params.focusedAlpha ?? 1;
            const onClick = params.onClick;

            const args: [
                string, // name
                mod.Vector, // position
                mod.Vector, // size
                mod.UIAnchor, // anchor
                mod.UIWidget, // parent
                boolean, // visible
                number, // padding
                mod.Vector, // bgColor
                number, // bgAlpha
                mod.UIBgFill, // bgFill
                boolean, // buttonEnabled
                mod.Vector, // baseColor
                number, // baseAlpha
                mod.Vector, // disabledColor
                number, // disabledAlpha
                mod.Vector, // pressedColor
                number, // pressedAlpha
                mod.Vector, // hoverColor
                number, // hoverAlpha
                mod.Vector, // focusedColor
                number, // focusedAlpha
                mod.UIDepth, // depth
            ] = [
                elementParams.name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                elementParams.anchor,
                parent.uiWidget,
                elementParams.visible,
                elementParams.padding,
                elementParams.bgColor,
                elementParams.bgAlpha,
                elementParams.bgFill,
                params.buttonEnabled ?? true,
                params.baseColor ?? COLORS.BF_GREY_2,
                params.baseAlpha ?? 1,
                params.disabledColor ?? COLORS.BF_GREY_3,
                params.disabledAlpha ?? 1,
                params.pressedColor ?? COLORS.BF_GREEN_BRIGHT,
                params.pressedAlpha ?? 1,
                params.hoverColor ?? COLORS.BF_GREY_1,
                params.hoverAlpha ?? 1,
                params.focusedColor ?? COLORS.BF_GREY_1,
                params.focusedAlpha ?? 1,
                elementParams.depth,
            ];

            if (receiver instanceof GlobalReceiver) {
                mod.AddUIButton(...args);
            } else {
                mod.AddUIButton(...args, receiver.nativeReceiver);
            }

            super(elementParams);

            this._buttonEnabled = buttonEnabled;
            this._baseColor = baseColor;
            this._baseAlpha = baseAlpha;
            this._disabledColor = disabledColor;
            this._disabledAlpha = disabledAlpha;
            this._pressedColor = pressedColor;
            this._pressedAlpha = pressedAlpha;
            this._hoverColor = hoverColor;
            this._hoverAlpha = hoverAlpha;
            this._focusedColor = focusedColor;
            this._focusedAlpha = focusedAlpha;
            this._onClick = onClick;

            BUTTONS.set(this._name, this);
        }

        public override delete(): void {
            BUTTONS.delete(this._name);

            super.delete();
        }

        public get enabled(): boolean {
            return this._buttonEnabled;
        }

        public set enabled(enabled: boolean) {
            mod.SetUIButtonEnabled(this._uiWidget, (this._buttonEnabled = enabled));
        }

        public setEnabled(enabled: boolean): this {
            this.enabled = enabled;
            return this;
        }

        public get baseColor(): mod.Vector {
            return this._baseColor;
        }

        public set baseColor(color: mod.Vector) {
            mod.SetUIButtonColorBase(this._uiWidget, (this._baseColor = color));
        }

        public setBaseColor(color: mod.Vector): this {
            this.baseColor = color;
            return this;
        }

        public get baseAlpha(): number {
            return this._baseAlpha;
        }

        public set baseAlpha(alpha: number) {
            mod.SetUIButtonAlphaBase(this._uiWidget, (this._baseAlpha = alpha));
        }

        public setBaseAlpha(alpha: number): this {
            this.baseAlpha = alpha;
            return this;
        }

        public get disabledColor(): mod.Vector {
            return this._disabledColor;
        }

        public set disabledColor(color: mod.Vector) {
            mod.SetUIButtonColorDisabled(this._uiWidget, (this._disabledColor = color));
        }

        public setDisabledColor(color: mod.Vector): this {
            this.disabledColor = color;
            return this;
        }

        public get disabledAlpha(): number {
            return this._disabledAlpha;
        }

        public set disabledAlpha(alpha: number) {
            mod.SetUIButtonAlphaDisabled(this._uiWidget, (this._disabledAlpha = alpha));
        }

        public setDisabledAlpha(alpha: number): this {
            this.disabledAlpha = alpha;
            return this;
        }

        public get pressedColor(): mod.Vector {
            return this._pressedColor;
        }

        public set pressedColor(color: mod.Vector) {
            mod.SetUIButtonColorPressed(this._uiWidget, (this._pressedColor = color));
        }

        public setColorPressed(color: mod.Vector): this {
            this.pressedColor = color;
            return this;
        }

        public get pressedAlpha(): number {
            return this._pressedAlpha;
        }

        public set pressedAlpha(alpha: number) {
            mod.SetUIButtonAlphaPressed(this._uiWidget, (this._pressedAlpha = alpha));
        }

        public setPressedAlpha(alpha: number): this {
            this.pressedAlpha = alpha;
            return this;
        }

        public get hoverColor(): mod.Vector {
            return this._hoverColor;
        }

        public set hoverColor(color: mod.Vector) {
            mod.SetUIButtonColorHover(this._uiWidget, (this._hoverColor = color));
        }

        public setHoverColor(color: mod.Vector): this {
            this.hoverColor = color;
            return this;
        }

        public get hoverAlpha(): number {
            return this._hoverAlpha;
        }

        public set hoverAlpha(alpha: number) {
            mod.SetUIButtonAlphaHover(this._uiWidget, (this._hoverAlpha = alpha));
        }

        public setHoverAlpha(alpha: number): this {
            this.hoverAlpha = alpha;
            return this;
        }

        public get focusedColor(): mod.Vector {
            return this._focusedColor;
        }

        public set focusedColor(color: mod.Vector) {
            mod.SetUIButtonColorFocused(this._uiWidget, (this._focusedColor = color));
        }

        public setFocusedColor(color: mod.Vector): this {
            this.focusedColor = color;
            return this;
        }

        public get focusedAlpha(): number {
            return this._focusedAlpha;
        }

        public set focusedAlpha(alpha: number) {
            mod.SetUIButtonAlphaFocused(this._uiWidget, (this._focusedAlpha = alpha));
        }

        public setFocusedAlpha(alpha: number): this {
            this.focusedAlpha = alpha;
            return this;
        }

        public get onClick(): ((player: mod.Player) => Promise<void>) | undefined {
            return this._onClick;
        }

        public set onClick(onClick: ((player: mod.Player) => Promise<void>) | undefined) {
            this._onClick = onClick;
        }

        public setOnClick(onClick: ((player: mod.Player) => Promise<void>) | undefined): this {
            this.onClick = onClick;
            return this;
        }
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

        // Button properties (delegated via delegateProperties).
        declare public enabled: boolean;
        declare public baseColor: mod.Vector;
        declare public baseAlpha: number;
        declare public disabledColor: mod.Vector;
        declare public disabledAlpha: number;
        declare public pressedColor: mod.Vector;
        declare public pressedAlpha: number;
        declare public hoverColor: mod.Vector;
        declare public hoverAlpha: number;
        declare public focusedColor: mod.Vector;
        declare public focusedAlpha: number;
        declare public onClick: ((player: mod.Player) => Promise<void>) | undefined;

        // Button setter methods (delegated via delegateProperties).
        declare public setEnabled: (enabled: boolean) => this;
        declare public setBaseColor: (color: mod.Vector) => this;
        declare public setBaseAlpha: (alpha: number) => this;
        declare public setDisabledColor: (color: mod.Vector) => this;
        declare public setDisabledAlpha: (alpha: number) => this;
        declare public setPressedColor: (color: mod.Vector) => this;
        declare public setPressedAlpha: (alpha: number) => this;
        declare public setHoverColor: (color: mod.Vector) => this;
        declare public setHoverAlpha: (alpha: number) => this;
        declare public setFocusedColor: (color: mod.Vector) => this;
        declare public setFocusedAlpha: (alpha: number) => this;
        declare public setOnClick: (onClick: ((player: mod.Player) => Promise<void>) | undefined) => this;

        protected constructor(
            params: ButtonParams,
            createContent: (container: Container, params: ButtonParams) => TContent,
            contentProperties: TContentProps
        ) {
            const parent = params.parent ?? ROOT_NODE;
            const receiver = getReceiver(parent, params.receiver);
            const { x, y } = getPosition(params);
            const { width, height } = getSize(params);
            const depth = params.depth ?? mod.UIDepth.AboveGameUI;

            const containerParams = {
                parent,
                visible: params.visible ?? true,
                x,
                y,
                width,
                height,
                anchor: params.anchor ?? mod.UIAnchor.Center,
                padding: params.padding ?? 0,
                bgColor: COLORS.WHITE,
                bgAlpha: 0,
                bgFill: mod.UIBgFill.None,
                depth,
                receiver: params.receiver,
                uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
            };

            const container = new Container(containerParams);

            const elementParams: FinalElementParams = {
                ...containerParams,
                name: makeName(parent, receiver),
                receiver,
            };

            super(elementParams);

            const buttonParams: ButtonParams = {
                parent: container,
                width,
                height,
                bgColor: params.bgColor ?? COLORS.WHITE,
                bgAlpha: params.bgAlpha ?? 1,
                bgFill: params.bgFill ?? mod.UIBgFill.Solid,
                buttonEnabled: params.buttonEnabled ?? true,
                baseColor: params.baseColor ?? COLORS.BF_GREY_2,
                baseAlpha: params.baseAlpha ?? 1,
                disabledColor: params.disabledColor ?? COLORS.BF_GREY_3,
                disabledAlpha: params.disabledAlpha ?? 1,
                pressedColor: params.pressedColor ?? COLORS.BF_GREEN_BRIGHT,
                pressedAlpha: params.pressedAlpha ?? 1,
                hoverColor: params.hoverColor ?? COLORS.BF_GREY_1,
                hoverAlpha: params.hoverAlpha ?? 1,
                focusedColor: params.focusedColor ?? COLORS.BF_GREY_1,
                focusedAlpha: params.focusedAlpha ?? 1,
                depth,
                onClick: params.onClick,
            };

            this._button = new Button(buttonParams);

            this._content = createContent(container, params);

            // Delegate Button properties.
            delegateProperties(this, this._button, [
                'bgColor',
                'bgAlpha',
                'bgFill',
                'enabled',
                'baseColor',
                'baseAlpha',
                'disabledColor',
                'disabledAlpha',
                'pressedColor',
                'pressedAlpha',
                'focusedAlpha',
                'focusedColor',
                'hoverAlpha',
                'hoverColor',
                'onClick',
            ]);

            // Delegate content properties.
            delegateProperties(this, this._content, contentProperties);
        }

        public override delete(): void {
            this._button.delete();
            this._content.delete();

            super.delete();
        }

        public override set width(width: number) {
            super.setWidth(width); // Updates the container width
            this._button.setWidth(width);
            this._content.setWidth(width);
        }

        public override set height(height: number) {
            super.setHeight(height); // Updates the container height
            this._button.setHeight(height);
            this._content.setHeight(height);
        }

        public override set size(params: Size) {
            super.setSize(params); // Updates the container size
            this._button.setSize(params);
            this._content.setSize(params);
        }
    }

    const TEXT_BUTTON_CONTENT_PROPERTIES = ['message', 'textAlpha', 'textAnchor', 'textSize'] as const;

    export class TextButton extends BaseButtonWithContent<Text, typeof TEXT_BUTTON_CONTENT_PROPERTIES> {
        // Text properties (delegated via delegateProperties)
        declare public message: mod.Message;
        declare public textAlpha: number;
        declare public textAnchor: mod.UIAnchor;
        declare public textSize: number;

        // Text setter methods (delegated via delegateProperties)
        declare public setMessage: (message: mod.Message) => this;
        declare public setTextAlpha: (alpha: number) => this;
        declare public setTextAnchor: (anchor: mod.UIAnchor) => this;
        declare public setTextSize: (size: number) => this;

        public constructor(params: TextButtonParams) {
            const createContent = (container: Container, buttonParams: ButtonParams): Text => {
                const textParams: TextParams = {
                    parent: container,
                    width: buttonParams.width ?? buttonParams.size?.width ?? 0,
                    height: buttonParams.height ?? buttonParams.size?.height ?? 0,
                    message: params.message,
                    textSize: params.textSize,
                    textColor: params.textColor,
                    textAlpha: params.textAlpha,
                    textAnchor: params.textAnchor,
                    depth: buttonParams.depth,
                };

                return new Text(textParams);
            };

            super(params, createContent, TEXT_BUTTON_CONTENT_PROPERTIES);
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

    const BUTTONS = new Map<string, Button>();

    /****** Utils ******/

    let counter: number = 0;

    function isTeam(receiver?: mod.Player | mod.Team): receiver is mod.Team {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Team);
    }

    function isPlayer(receiver?: mod.Player | mod.Team): receiver is mod.Player {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Player);
    }

    function makeName(parent: Parent, receiver: GlobalReceiver | TeamReceiver | PlayerReceiver): string {
        return `${parent.name}${parent.receiver !== receiver ? `_${receiver.id}` : ''}_${counter++}`;
    }

    /**
     * Delegates properties from a source object to a target object.
     * Creates getters, setters, and setter methods (e.g., setPropertyName) for each property.
     * @param target - The object to add properties to (typically `this`)
     * @param source - The object to delegate to
     * @param properties - Array of property names to delegate
     */
    function delegateProperties<T extends object, S extends object>(
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

    function getPosition(params: ElementParams): Position {
        return { x: params.x ?? params.position?.x ?? 0, y: params.y ?? params.position?.y ?? 0 };
    }

    function getSize(params: ElementParams): Size {
        return { width: params.width ?? params.size?.width ?? 0, height: params.height ?? params.size?.height ?? 0 };
    }

    function getReceiver(
        parent: Parent,
        receiverParam?: mod.Player | mod.Team
    ): GlobalReceiver | TeamReceiver | PlayerReceiver {
        if (isTeam(receiverParam)) {
            const receiver = TeamReceiver.getInstance(receiverParam);

            if (parent.receiver instanceof TeamReceiver && parent.receiver !== receiver) {
                console.log('<UI> Warning: Team receiver mismatch with parent.');
            }

            if (parent.receiver instanceof PlayerReceiver) {
                console.log('<UI> Warning: Parent receiver scope is more narrow.');
            }

            return receiver;
        }

        if (isPlayer(receiverParam)) {
            const receiver = PlayerReceiver.getInstance(receiverParam);

            if (parent.receiver instanceof PlayerReceiver && parent.receiver !== receiver) {
                console.log('<UI> Warning: Player receiver mismatch with parent.');
            }

            if (
                parent.receiver instanceof TeamReceiver &&
                !mod.Equals(parent.receiver.nativeReceiver, mod.GetTeam(receiverParam))
            ) {
                console.log('<UI> Warning: Parent receiver is different team.');
            }

            return receiver;
        }

        return GlobalReceiver.instance;
    }

    export function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        // NOTE: `event: mod.UIButtonEvent` is currently broken or undefined, so we're not using it for now.

        const name = mod.GetUIWidgetName(widget);

        BUTTONS.get(name)
            ?.onClick?.(player)
            .catch((error) => {
                console.log(`<UI> Error in click handler for widget ${name}:`, error);
            });
    }
}
