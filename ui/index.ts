// version: 4.0.0
export namespace UI {
    /****** Types ******/

    type BaseParams = {
        anchor?: mod.UIAnchor;
        parent?: Root | Container;
        visible?: boolean;
        padding?: number;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        depth?: mod.UIDepth;
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

    // Container children parameters with a 'type' property and the properties required by that element's constructor.
    export type ChildParams<T> = T & {
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
        children: Element[];
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    }

    /****** Classes ******/

    export class Node {
        protected _name: string;

        protected _uiWidget: mod.UIWidget;

        public constructor(name: string, uiWidget: mod.UIWidget) {
            this._name = name;
            this._uiWidget = uiWidget;
        }

        public get uiWidget(): mod.UIWidget {
            return this._uiWidget;
        }

        public get name(): string {
            return this._name;
        }
    }

    export class Root extends Node implements Parent {
        public static readonly instance = new Root();

        private _children: Element[] = [];

        private constructor() {
            super('root', mod.GetUIRoot());
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

    export class Element extends Node {
        protected _parent: Root | Container;

        protected _receiver?: mod.Player | mod.Team;

        public constructor(name: string, parent: Root | Container, receiver?: mod.Player | mod.Team) {
            super(name, mod.FindUIWidgetWithName(name) as mod.UIWidget);
            this._parent = parent;
            this._receiver = receiver;
        }

        public get parent(): Root | Container {
            return this._parent;
        }

        public set parent(parent: Root | Container) {
            mod.SetUIWidgetParent(this._uiWidget, parent.uiWidget);

            const oldParent = this._parent;
            this._parent = parent;

            oldParent.detachChild(this);
            parent.attachChild(this);
        }

        public setParent(parent: Root | Container): this {
            this.parent = parent;
            return this;
        }

        public get receiver(): mod.Player | mod.Team | undefined {
            return this._receiver;
        }

        public get visible(): boolean {
            return mod.GetUIWidgetVisible(this._uiWidget);
        }

        public set visible(visible: boolean) {
            mod.SetUIWidgetVisible(this._uiWidget, visible);
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
            mod.DeleteUIWidget(this._uiWidget);
        }

        public get x(): number {
            return mod.XComponentOf(mod.GetUIWidgetPosition(this._uiWidget));
        }

        public set x(x: number) {
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(x, this.y, 0));
        }

        public setX(x: number): this {
            this.x = x;
            return this;
        }

        public get y(): number {
            return mod.YComponentOf(mod.GetUIWidgetPosition(this._uiWidget));
        }

        public set y(y: number) {
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(this.x, y, 0));
        }

        public setY(y: number): this {
            this.y = y;
            return this;
        }

        public get position(): Position {
            const position = mod.GetUIWidgetPosition(this._uiWidget);
            return { x: mod.XComponentOf(position), y: mod.YComponentOf(position) };
        }

        public set position(params: Position) {
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(params.x, params.y, 0));
        }

        public setPosition(params: Position): this {
            this.position = params;
            return this;
        }

        public get width(): number {
            return mod.XComponentOf(mod.GetUIWidgetSize(this._uiWidget));
        }

        public set width(width: number) {
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, this.height, 0));
        }

        public setWidth(width: number): this {
            this.width = width;
            return this;
        }

        public get height(): number {
            return mod.YComponentOf(mod.GetUIWidgetSize(this._uiWidget));
        }

        public set height(height: number) {
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(this.width, height, 0));
        }

        public setHeight(height: number): this {
            this.height = height;
            return this;
        }

        public get size(): Size {
            const size = mod.GetUIWidgetSize(this._uiWidget);
            return { width: mod.XComponentOf(size), height: mod.YComponentOf(size) };
        }

        public set size(params: Size) {
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
        }

        public setSize(params: Size): this {
            this.size = params;
            return this;
        }

        public get bgColor(): mod.Vector {
            return mod.GetUIWidgetBgColor(this._uiWidget);
        }

        public set bgColor(color: mod.Vector) {
            mod.SetUIWidgetBgColor(this._uiWidget, color);
        }

        public setBgColor(color: mod.Vector): this {
            this.bgColor = color;
            return this;
        }

        public get bgAlpha(): number {
            return mod.GetUIWidgetBgAlpha(this._uiWidget);
        }

        public set bgAlpha(alpha: number) {
            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);
        }

        public setBgAlpha(alpha: number): this {
            this.bgAlpha = alpha;
            return this;
        }

        public get bgFill(): mod.UIBgFill {
            return mod.GetUIWidgetBgFill(this._uiWidget);
        }

        public set bgFill(fill: mod.UIBgFill) {
            mod.SetUIWidgetBgFill(this._uiWidget, fill);
        }

        public setBgFill(fill: mod.UIBgFill): this {
            this.bgFill = fill;
            return this;
        }

        public get depth(): mod.UIDepth {
            return mod.GetUIWidgetDepth(this._uiWidget);
        }

        public set depth(depth: mod.UIDepth) {
            mod.SetUIWidgetDepth(this._uiWidget, depth);
        }

        public setDepth(depth: mod.UIDepth): this {
            this.depth = depth;
            return this;
        }

        public get anchor(): mod.UIAnchor {
            return mod.GetUIWidgetAnchor(this._uiWidget);
        }

        public set anchor(anchor: mod.UIAnchor) {
            mod.SetUIWidgetAnchor(this._uiWidget, anchor);
        }

        public setAnchor(anchor: mod.UIAnchor): this {
            this.anchor = anchor;
            return this;
        }

        public get padding(): number {
            return mod.GetUIWidgetPadding(this._uiWidget);
        }

        public set padding(padding: number) {
            mod.SetUIWidgetPadding(this._uiWidget, padding);
        }

        public setPadding(padding: number): this {
            this.padding = padding;
            return this;
        }
    }

    export class Container extends Element implements Parent {
        private _children: Element[] = [];

        public constructor(params: ContainerParams, receiver?: mod.Player | mod.Team) {
            const parent = params.parent ?? ROOT_NODE;
            const name = makeName(parent, receiver);

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
                name,
                getPositionVector(params),
                getSizeVector(params),
                params.anchor ?? mod.UIAnchor.Center,
                parent.uiWidget,
                params.visible ?? true,
                params.padding ?? 0,
                params.bgColor ?? COLORS.WHITE,
                params.bgAlpha ?? 0,
                params.bgFill ?? mod.UIBgFill.None,
                params.depth ?? mod.UIDepth.AboveGameUI,
            ];

            if (receiver == undefined) {
                mod.AddUIContainer(...args);
            } else {
                mod.AddUIContainer(...args, receiver);
            }

            super(name, parent);

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
            this._children.forEach((child) => child.delete());

            mod.DeleteUIWidget(this._uiWidget);
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

        public constructor(params: TextParams, receiver?: mod.Player | mod.Team) {
            const parent = params.parent ?? ROOT_NODE;
            const name = makeName(parent, receiver);

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
                name,
                getPositionVector(params),
                getSizeVector(params),
                params.anchor ?? mod.UIAnchor.Center,
                parent.uiWidget,
                params.visible ?? true,
                params.padding ?? 0,
                params.bgColor ?? COLORS.WHITE,
                params.bgAlpha ?? 0,
                params.bgFill ?? mod.UIBgFill.None,
                params.message,
                params.textSize ?? 36,
                params.textColor ?? COLORS.BLACK,
                params.textAlpha ?? 1,
                params.textAnchor ?? mod.UIAnchor.Center,
                params.depth ?? mod.UIDepth.AboveGameUI,
            ];

            if (receiver == undefined) {
                mod.AddUIText(...args);
            } else {
                mod.AddUIText(...args, receiver);
            }

            super(name, parent);

            this._message = params.message;
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
            return mod.GetUITextAlpha(this._uiWidget);
        }

        public set textAlpha(alpha: number) {
            mod.SetUITextAlpha(this._uiWidget, alpha);
        }

        public setTextAlpha(alpha: number): this {
            this.textAlpha = alpha;
            return this;
        }

        public get textAnchor(): mod.UIAnchor {
            return mod.GetUITextAnchor(this._uiWidget);
        }

        public set textAnchor(anchor: mod.UIAnchor) {
            mod.SetUITextAnchor(this._uiWidget, anchor);
        }

        public setTextAnchor(anchor: mod.UIAnchor): this {
            this.textAnchor = anchor;
            return this;
        }

        public get textColor(): mod.Vector {
            return mod.GetUITextColor(this._uiWidget);
        }

        public set textColor(color: mod.Vector) {
            mod.SetUITextColor(this._uiWidget, color);
        }

        public setTextColor(color: mod.Vector): this {
            this.textColor = color;
            return this;
        }

        public get textSize(): number {
            return mod.GetUITextSize(this._uiWidget);
        }

        public set textSize(size: number) {
            mod.SetUITextSize(this._uiWidget, size);
        }

        public setTextSize(size: number): this {
            this.textSize = size;
            return this;
        }
    }

    export class Button extends Element {
        public constructor(params: ButtonParams, receiver?: mod.Player | mod.Team) {
            const parent = params.parent ?? ROOT_NODE;
            const name = makeName(parent, receiver);

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
                name,
                getPositionVector(params),
                getSizeVector(params),
                params.anchor ?? mod.UIAnchor.Center,
                parent.uiWidget,
                params.visible ?? true,
                params.padding ?? 0,
                params.bgColor ?? COLORS.WHITE,
                params.bgAlpha ?? 0,
                params.bgFill ?? mod.UIBgFill.None,
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
                params.depth ?? mod.UIDepth.AboveGameUI,
            ];

            if (receiver == undefined) {
                mod.AddUIButton(...args);
            } else {
                mod.AddUIButton(...args, receiver);
            }

            super(name, parent);

            if (params.onClick) {
                CLICK_HANDLERS.set(this._name, params.onClick);
            }
        }

        public override delete(): void {
            if (CLICK_HANDLERS.has(this._name)) {
                CLICK_HANDLERS.delete(this._name);
            }

            super.delete();
        }

        public get alphaBase(): number {
            return mod.GetUIButtonAlphaBase(this._uiWidget);
        }

        public set alphaBase(alpha: number) {
            mod.SetUIButtonAlphaBase(this._uiWidget, alpha);
        }

        public setAlphaBase(alpha: number): this {
            this.alphaBase = alpha;
            return this;
        }

        public get alphaDisabled(): number {
            return mod.GetUIButtonAlphaDisabled(this._uiWidget);
        }

        public set alphaDisabled(alpha: number) {
            mod.SetUIButtonAlphaDisabled(this._uiWidget, alpha);
        }

        public setAlphaDisabled(alpha: number): this {
            this.alphaDisabled = alpha;
            return this;
        }

        public get alphaFocused(): number {
            return mod.GetUIButtonAlphaFocused(this._uiWidget);
        }

        public set alphaFocused(alpha: number) {
            mod.SetUIButtonAlphaFocused(this._uiWidget, alpha);
        }

        public setAlphaFocused(alpha: number): this {
            this.alphaFocused = alpha;
            return this;
        }

        public get alphaHover(): number {
            return mod.GetUIButtonAlphaHover(this._uiWidget);
        }

        public set alphaHover(alpha: number) {
            mod.SetUIButtonAlphaHover(this._uiWidget, alpha);
        }

        public setAlphaHover(alpha: number): this {
            this.alphaHover = alpha;
            return this;
        }

        public get alphaPressed(): number {
            return mod.GetUIButtonAlphaPressed(this._uiWidget);
        }

        public set alphaPressed(alpha: number) {
            mod.SetUIButtonAlphaPressed(this._uiWidget, alpha);
        }

        public setAlphaPressed(alpha: number): this {
            this.alphaPressed = alpha;
            return this;
        }

        public get colorBase(): mod.Vector {
            return mod.GetUIButtonColorBase(this._uiWidget);
        }

        public set colorBase(color: mod.Vector) {
            mod.SetUIButtonColorBase(this._uiWidget, color);
        }

        public setColorBase(color: mod.Vector): this {
            this.colorBase = color;
            return this;
        }

        public get colorDisabled(): mod.Vector {
            return mod.GetUIButtonColorDisabled(this._uiWidget);
        }

        public set colorDisabled(color: mod.Vector) {
            mod.SetUIButtonColorDisabled(this._uiWidget, color);
        }

        public setColorDisabled(color: mod.Vector): this {
            this.colorDisabled = color;
            return this;
        }

        public get colorFocused(): mod.Vector {
            return mod.GetUIButtonColorFocused(this._uiWidget);
        }

        public set colorFocused(color: mod.Vector) {
            mod.SetUIButtonColorFocused(this._uiWidget, color);
        }

        public setColorFocused(color: mod.Vector): this {
            this.colorFocused = color;
            return this;
        }

        public get colorHover(): mod.Vector {
            return mod.GetUIButtonColorHover(this._uiWidget);
        }

        public set colorHover(color: mod.Vector) {
            mod.SetUIButtonColorHover(this._uiWidget, color);
        }

        public setColorHover(color: mod.Vector): this {
            this.colorHover = color;
            return this;
        }

        public get colorPressed(): mod.Vector {
            return mod.GetUIButtonColorPressed(this._uiWidget);
        }

        public set colorPressed(color: mod.Vector) {
            mod.SetUIButtonColorPressed(this._uiWidget, color);
        }

        public setColorPressed(color: mod.Vector): this {
            this.colorPressed = color;
            return this;
        }

        public get enabled(): boolean {
            return mod.GetUIButtonEnabled(this._uiWidget);
        }

        public set enabled(enabled: boolean) {
            mod.SetUIButtonEnabled(this._uiWidget, enabled);
        }

        public setEnabled(enabled: boolean): this {
            this.enabled = enabled;
            return this;
        }

        public get onClick(): ((player: mod.Player) => Promise<void>) | undefined {
            return CLICK_HANDLERS.get(this._name);
        }

        public set onClick(onClick: ((player: mod.Player) => Promise<void>) | undefined) {
            if (onClick) {
                CLICK_HANDLERS.set(this._name, onClick);
            } else {
                CLICK_HANDLERS.delete(this._name);
            }
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

        // Button properties (delegated via delegateProperties)
        declare public alphaBase: number;
        declare public alphaDisabled: number;
        declare public alphaFocused: number;
        declare public alphaHover: number;
        declare public alphaPressed: number;
        declare public colorBase: mod.Vector;
        declare public colorDisabled: mod.Vector;
        declare public colorFocused: mod.Vector;
        declare public colorHover: mod.Vector;
        declare public colorPressed: mod.Vector;
        declare public enabled: boolean;
        declare public onClick: ((player: mod.Player) => Promise<void>) | undefined;

        // Button setter methods (delegated via delegateProperties)
        declare public setAlphaBase: (alpha: number) => this;
        declare public setAlphaDisabled: (alpha: number) => this;
        declare public setAlphaFocused: (alpha: number) => this;
        declare public setAlphaHover: (alpha: number) => this;
        declare public setAlphaPressed: (alpha: number) => this;
        declare public setColorBase: (color: mod.Vector) => this;
        declare public setColorDisabled: (color: mod.Vector) => this;
        declare public setColorFocused: (color: mod.Vector) => this;
        declare public setColorHover: (color: mod.Vector) => this;
        declare public setColorPressed: (color: mod.Vector) => this;
        declare public setEnabled: (enabled: boolean) => this;
        declare public setOnClick: (onClick: ((player: mod.Player) => Promise<void>) | undefined) => this;

        protected constructor(
            params: ButtonParams,
            receiver: mod.Player | mod.Team | undefined,
            createContent: (container: Container, params: ButtonParams) => TContent,
            contentProperties: TContentProps
        ) {
            const containerParams = {
                ...params,
                bgColor: COLORS.WHITE,
                bgAlpha: 0,
                bgFill: mod.UIBgFill.None,
            } as ContainerParams;

            const container = new Container(containerParams, receiver);

            super(container.name, container.parent);

            const buttonParams: ButtonParams = {
                parent: container,
                width: params.width ?? params.size?.width ?? 0,
                height: params.height ?? params.size?.height ?? 0,
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
                depth: params.depth ?? mod.UIDepth.AboveGameUI,
                onClick: params.onClick,
            };

            this._button = new Button(buttonParams);

            this._content = createContent(container, params);

            // Delegate Button properties
            delegateProperties(this, this._button, [
                'alphaBase',
                'alphaDisabled',
                'alphaFocused',
                'alphaHover',
                'alphaPressed',
                'colorBase',
                'colorDisabled',
                'colorFocused',
                'colorHover',
                'colorPressed',
                'enabled',
                'onClick',
            ]);

            // Delegate content properties
            delegateProperties(this, this._content, contentProperties);
        }

        public override delete(): void {
            this._button.delete();
            this._content.delete();

            super.delete();
        }

        public override set size(params: Size) {
            super.setSize(params);

            this._button.setSize(params);
            this._content.setSize(params);
        }

        public override setSize(params: Size): this {
            this.size = params;
            return this;
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

        public constructor(params: TextButtonParams, receiver?: mod.Player | mod.Team) {
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
                    depth: buttonParams.depth ?? mod.UIDepth.AboveGameUI,
                };

                return new Text(textParams);
            };

            super(params, receiver, createContent, TEXT_BUTTON_CONTENT_PROPERTIES);
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

    const CLICK_HANDLERS = new Map<string, (player: mod.Player) => Promise<void>>();

    /****** Utils ******/

    let counter: number = 0;

    function makeName(parent: Node, receiver?: mod.Player | mod.Team): string {
        return `${parent.name}${receiver ? `_${mod.GetObjId(receiver)}` : ''}_${counter++}`;
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
            // Create getter and setter
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

            // Create setter method (e.g., setAlphaBase)
            const setterMethodName = `set${prop.charAt(0).toUpperCase() + prop.slice(1)}`;
            (target as Record<string, unknown>)[setterMethodName] = function (value: unknown) {
                (source as Record<string, unknown>)[prop] = value;
                return this;
            };
        }
    }

    function getPositionVector(params: ElementParams): mod.Vector {
        return mod.CreateVector(params.x ?? params.position?.x ?? 0, params.y ?? params.position?.y ?? 0, 0);
    }

    function getSizeVector(params: ElementParams): mod.Vector {
        return mod.CreateVector(params.width ?? params.size?.width ?? 0, params.height ?? params.size?.height ?? 0, 0);
    }

    export function handleButtonClick(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        // NOTE: mod.UIButtonEvent is currently broken or undefined, so we're not using it for now.
        // if (event != mod.UIButtonEvent.ButtonUp) return;

        const name = mod.GetUIWidgetName(widget);

        const clickHandler = CLICK_HANDLERS.get(name);

        if (!clickHandler) return;

        clickHandler(player).catch((error) => {
            console.log(`<UI> Error in click handler for widget ${name}:`, error);
        });
    }
}
