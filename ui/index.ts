// version: 3.0.0
export namespace UI {
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
        BF_GREY_1: mod.CreateVector(0.8353, 0.9216, 0.9765), // D5EBF9
        BF_GREY_2: mod.CreateVector(0.3294, 0.3686, 0.3882), // 545E63
        BF_GREY_3: mod.CreateVector(0.2118, 0.2235, 0.2353), // 36393C
        BF_GREY_4: mod.CreateVector(0.0314, 0.0431, 0.0431), // 080B0B,
        BF_BLUE_BRIGHT: mod.CreateVector(0.4392, 0.9216, 1.0), // 70EBFF
        BF_BLUE_DARK: mod.CreateVector(0.0745, 0.1843, 0.2471), // 132F3F
        BF_RED_BRIGHT: mod.CreateVector(1.0, 0.5137, 0.3804), // FF8361
        BF_RED_DARK: mod.CreateVector(0.251, 0.0941, 0.0667), // 401811
        BF_GREEN_BRIGHT: mod.CreateVector(0.6784, 0.9922, 0.5255), // ADFD86
        BF_GREEN_DARK: mod.CreateVector(0.2784, 0.4471, 0.2118), // 477236
        BF_YELLOW_BRIGHT: mod.CreateVector(1.0, 0.9882, 0.6118), // FFFC9C
        BF_YELLOW_DARK: mod.CreateVector(0.4431, 0.3765, 0.0), // 716000
    };

    export enum Type {
        Root = 'root',
        Container = 'container',
        Text = 'text',
        Button = 'button',
    }

    type Params = {
        type?: Type;
        name?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        anchor?: mod.UIAnchor;
        parent?: mod.UIWidget | Parent;
        visible?: boolean;
        padding?: number;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        depth?: mod.UIDepth;
    };

    export type ContainerParams = Params & {
        childrenParams?: (ContainerParams | TextParams | ButtonParams)[];
    };

    export type TextParams = Params & {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
        textAnchor?: mod.UIAnchor;
    };

    export type LabelParams = {
        message: mod.Message;
        textSize?: number;
        textColor?: mod.Vector;
        textAlpha?: number;
    };

    export type ButtonParams = Params & {
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
        label?: LabelParams;
    };

    export class Node {
        protected _uiWidget: mod.UIWidget;

        protected _name: string;

        public constructor(uiWidget: mod.UIWidget, name: string) {
            this._uiWidget = uiWidget;
            this._name = name;
        }

        public get uiWidget(): mod.UIWidget {
            return this._uiWidget;
        }

        public get name(): string {
            return this._name;
        }
    }

    interface Parent extends Node {
        children: Element[];
        addChild(child: Element): void;
        syncChildren(): void;
    }

    class Root extends Node implements Parent {
        private _children: Element[] = [];

        public get children(): Element[] {
            return this._children;
        }

        public constructor() {
            super(mod.GetUIRoot(), 'ui_root');
        }

        public addChild(child: Element): this {
            if (child.parent !== this) return this; // TODO: throw error.

            if (this._children.includes(child)) return this;

            this._children.push(child);

            return this;
        }

        public syncChildren(): this {
            this._children = this._children.filter(({ parent }) => parent === this);

            return this;
        }
    }

    class UnknownNode extends Node implements Parent {
        public constructor(uiWidget: mod.UIWidget) {
            super(uiWidget, 'ui_unknown');
        }

        public get children(): Element[] {
            return [];
        }

        public addChild(child: Element): this {
            return this;
        }

        public syncChildren(): this {
            return this;
        }
    }

    export type Size = {
        width: number;
        height: number;
    };

    export type Position = {
        x: number;
        y: number;
    };

    const CLICK_HANDLERS = new Map<string, (player: mod.Player) => Promise<void>>();

    export const ROOT_NODE = new Root();

    let counter: number = 0;

    function makeName(parent: Parent, receiver?: mod.Player | mod.Team): string {
        return `${parent.name}${receiver ? `_${mod.GetObjId(receiver)}` : ''}_${counter++}`;
    }

    function parseParent(parent?: Parent | mod.UIWidget): Parent {
        if (!parent) return ROOT_NODE;

        if (parent instanceof Container) return parent as Container;

        return new UnknownNode(parent as mod.UIWidget);
    }

    export class Element extends Node {
        protected _parent: Parent;

        public constructor(uiWidget: mod.UIWidget, name: string, parent: Parent) {
            super(uiWidget, name);

            this._parent = parent;
            parent.addChild(this);
        }

        public get parent(): Parent {
            return this._parent;
        }

        public set parent(parent: Parent) {
            const oldParent = this._parent;

            this._parent = parent;
            parent.addChild(this);

            oldParent.syncChildren();
        }

        public setParent(parent: Parent): this {
            this.parent = parent;
            return this;
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
            this.parent.syncChildren();
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

        public get children(): Element[] {
            return this._children;
        }

        public constructor(params: ContainerParams, receiver?: mod.Player | mod.Team) {
            const parent = parseParent(params.parent);
            const name = params.name ?? makeName(parent, receiver);

            const args: [
                string,
                mod.Vector,
                mod.Vector,
                mod.UIAnchor,
                mod.UIWidget,
                boolean,
                number,
                mod.Vector,
                number,
                mod.UIBgFill,
                mod.UIDepth,
            ] = [
                name,
                mod.CreateVector(params.x ?? 0, params.y ?? 0, 0),
                mod.CreateVector(params.width ?? 0, params.height ?? 0, 0),
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

            const uiWidget = mod.FindUIWidgetWithName(name) as mod.UIWidget;

            super(uiWidget, name, parent);

            for (const childParams of params.childrenParams ?? []) {
                childParams.parent = this;

                if (childParams.type === Type.Container) {
                    new Container(childParams);
                } else if (childParams.type === Type.Text) {
                    new Text(childParams as TextParams);
                } else if (childParams.type === Type.Button) {
                    new Button(childParams as ButtonParams);
                } else {
                    continue; // TODO: throw error.
                }
            }
        }

        public addChild(child: Element): this {
            if (child.parent !== this) return this; // TODO: throw error.

            if (this._children.includes(child)) return this;

            this._children.push(child);

            return this;
        }

        public syncChildren(): this {
            this._children = this._children.filter(({ parent }) => parent === this);

            return this;
        }
    }

    export class Text extends Element {
        public constructor(params: TextParams, receiver?: mod.Player | mod.Team) {
            const parent = parseParent(params.parent);
            const name = params.name ?? makeName(parent, receiver);

            const args: [
                string,
                mod.Vector,
                mod.Vector,
                mod.UIAnchor,
                mod.UIWidget,
                boolean,
                number,
                mod.Vector,
                number,
                mod.UIBgFill,
                mod.Message,
                number,
                mod.Vector,
                number,
                mod.UIAnchor,
                mod.UIDepth,
            ] = [
                name,
                mod.CreateVector(params.x ?? 0, params.y ?? 0, 0),
                mod.CreateVector(params.width ?? 0, params.height ?? 0, 0),
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

            const uiWidget = mod.FindUIWidgetWithName(name) as mod.UIWidget;

            super(uiWidget, name, parent);
        }

        public set message(message: mod.Message) {
            mod.SetUITextLabel(this._uiWidget, message);
        }

        public setMessage(message: mod.Message): this {
            this.message = message;
            return this;
        }
    }

    export class Button extends Container {
        private _buttonName: string;

        private _buttonUiWidget: mod.UIWidget;

        private _label?: Text;

        public constructor(params: ButtonParams, receiver?: mod.Player | mod.Team) {
            const parent = parseParent(params.parent);

            const containerParams: ContainerParams = {
                x: params.x,
                y: params.y,
                width: params.width,
                height: params.height,
                anchor: params.anchor,
                parent,
                visible: params.visible,
                padding: 0,
                bgColor: COLORS.BF_GREY_4,
                bgAlpha: 0,
                bgFill: mod.UIBgFill.None,
                depth: params.depth ?? mod.UIDepth.AboveGameUI,
            };

            super(containerParams, receiver);

            const buttonName = params.name ?? `${this._name}_button`;

            mod.AddUIButton(
                buttonName,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(params.width ?? 0, params.height ?? 0, 0),
                params.anchor ?? mod.UIAnchor.Center,
                this.uiWidget,
                true,
                params.padding ?? 0,
                params.bgColor ?? COLORS.WHITE,
                params.bgAlpha ?? 1,
                params.bgFill ?? mod.UIBgFill.Solid,
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
                params.depth ?? mod.UIDepth.AboveGameUI
            );

            if (params.onClick) {
                CLICK_HANDLERS.set(buttonName, params.onClick);
            }

            const buttonUiWidget = mod.FindUIWidgetWithName(buttonName) as mod.UIWidget;

            this._label = params.label
                ? new Text({
                      ...params.label,
                      name: `${this._name}_label`,
                      parent: this.uiWidget,
                      width: params.width,
                      height: params.height,
                      visible: true,
                      depth: params.depth,
                  })
                : undefined;

            this._buttonName = buttonName;
            this._buttonUiWidget = buttonUiWidget;
        }

        public get buttonName(): string {
            return this._buttonName;
        }

        public get buttonUiWidget(): mod.UIWidget {
            return this._buttonUiWidget;
        }

        public get alphaBase(): number {
            return mod.GetUIButtonAlphaBase(this._buttonUiWidget);
        }

        public set alphaBase(alpha: number) {
            mod.SetUIButtonAlphaBase(this._buttonUiWidget, alpha);
        }

        public setAlphaBase(alpha: number): this {
            this.alphaBase = alpha;
            return this;
        }

        public get alphaDisabled(): number {
            return mod.GetUIButtonAlphaDisabled(this._buttonUiWidget);
        }

        public set alphaDisabled(alpha: number) {
            mod.SetUIButtonAlphaDisabled(this._buttonUiWidget, alpha);
        }

        public setAlphaDisabled(alpha: number): this {
            this.alphaDisabled = alpha;
            return this;
        }

        public get alphaFocused(): number {
            return mod.GetUIButtonAlphaFocused(this._buttonUiWidget);
        }

        public set alphaFocused(alpha: number) {
            mod.SetUIButtonAlphaFocused(this._buttonUiWidget, alpha);
        }

        public setAlphaFocused(alpha: number): this {
            this.alphaFocused = alpha;
            return this;
        }

        public get alphaHover(): number {
            return mod.GetUIButtonAlphaHover(this._buttonUiWidget);
        }

        public set alphaHover(alpha: number) {
            mod.SetUIButtonAlphaHover(this._buttonUiWidget, alpha);
        }

        public setAlphaHover(alpha: number): this {
            this.alphaHover = alpha;
            return this;
        }

        public get alphaPressed(): number {
            return mod.GetUIButtonAlphaPressed(this._buttonUiWidget);
        }

        public set alphaPressed(alpha: number) {
            mod.SetUIButtonAlphaPressed(this._buttonUiWidget, alpha);
        }

        public setAlphaPressed(alpha: number): this {
            this.alphaPressed = alpha;
            return this;
        }

        public get colorBase(): mod.Vector {
            return mod.GetUIButtonColorBase(this._buttonUiWidget);
        }

        public set colorBase(color: mod.Vector) {
            mod.SetUIButtonColorBase(this._buttonUiWidget, color);
        }

        public setColorBase(color: mod.Vector): this {
            this.colorBase = color;
            return this;
        }

        public get colorDisabled(): mod.Vector {
            return mod.GetUIButtonColorDisabled(this._buttonUiWidget);
        }

        public set colorDisabled(color: mod.Vector) {
            mod.SetUIButtonColorDisabled(this._buttonUiWidget, color);
        }

        public setColorDisabled(color: mod.Vector): this {
            this.colorDisabled = color;
            return this;
        }

        public get colorFocused(): mod.Vector {
            return mod.GetUIButtonColorFocused(this._buttonUiWidget);
        }

        public set colorFocused(color: mod.Vector) {
            mod.SetUIButtonColorFocused(this._buttonUiWidget, color);
        }

        public setColorFocused(color: mod.Vector): this {
            this.colorFocused = color;
            return this;
        }

        public get colorHover(): mod.Vector {
            return mod.GetUIButtonColorHover(this._buttonUiWidget);
        }

        public set colorHover(color: mod.Vector) {
            mod.SetUIButtonColorHover(this._buttonUiWidget, color);
        }

        public setColorHover(color: mod.Vector): this {
            this.colorHover = color;
            return this;
        }

        public get colorPressed(): mod.Vector {
            return mod.GetUIButtonColorPressed(this._buttonUiWidget);
        }

        public set colorPressed(color: mod.Vector) {
            mod.SetUIButtonColorPressed(this._buttonUiWidget, color);
        }

        public setColorPressed(color: mod.Vector): this {
            this.colorPressed = color;
            return this;
        }

        public get enabled(): boolean {
            return mod.GetUIButtonEnabled(this._buttonUiWidget);
        }

        public set enabled(enabled: boolean) {
            mod.SetUIButtonEnabled(this._buttonUiWidget, enabled);
        }

        public setEnabled(enabled: boolean): this {
            this.enabled = enabled;
            return this;
        }

        public set labelMessage(message: mod.Message) {
            this._label?.setMessage(message);
        }

        public setLabelMessage(message: mod.Message): this {
            this.labelMessage = message;
            return this;
        }

        public override set size(params: Size) {
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
            mod.SetUIWidgetSize(this._buttonUiWidget, mod.CreateVector(params.width, params.height, 0));
            this._label?.setSize({ width: params.width, height: params.height });
        }

        public override setSize(params: Size): this {
            this.size = params;
            return this;
        }
    }

    export function handleButtonClick(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        // NOTE: mod.UIButtonEvent is currently broken or undefined, so we're not using it for now.
        // if (event != mod.UIButtonEvent.ButtonUp) return;

        const clickHandler = CLICK_HANDLERS.get(mod.GetUIWidgetName(widget));

        if (!clickHandler) return;

        clickHandler(player).catch((error) => {
            console.log(`<UI> Error in click handler for widget ${mod.GetUIWidgetName(widget)}:`, error);
        });
    }
}
