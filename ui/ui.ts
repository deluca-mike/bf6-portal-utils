// version: 1.3.0

class UI {

    private static readonly CLICK_HANDLERS = new Map<string, (player: mod.Player) => Promise<void>>();

    public static readonly COLORS = {
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
    };

    private static rootNode: UI.Node;

    private static counter: number = 0;

    public static root(): UI.Node {
        if (UI.rootNode) return UI.rootNode;

        UI.rootNode = {
            type: UI.Type.Root,
            name: 'ui_root',
            uiWidget: () => mod.GetUIRoot(),
        };

        return UI.rootNode;
    }

    public static createContainer(params: UI.ContainerParams, receiver?: mod.Player | mod.Team): UI.Container {
        const parent = UI.parseNode(params.parent);
        const name = params.name ?? UI.makeName(parent, receiver);
    
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
            parent.uiWidget(),
            params.visible ?? true,
            params.padding ?? 0,
            params.bgColor ?? UI.COLORS.BLACK,
            params.bgAlpha ?? 1,
            params.bgFill ?? mod.UIBgFill.Solid,
            params.depth ?? mod.UIDepth.AboveGameUI,
        ];
    
        if (receiver == undefined) {
            mod.AddUIContainer(...args);
        } else {
            mod.AddUIContainer(...args, receiver);
        }

        const uiWidget = () => mod.FindUIWidgetWithName(name) as mod.UIWidget;

        const container = {
            type: UI.Type.Container,
            name: name,
            uiWidget: uiWidget,
            parent: parent,
            children: [] as (UI.Container | UI.Text | UI.Button)[],
            isVisible: () => mod.GetUIWidgetVisible(uiWidget()),
            show: () => mod.SetUIWidgetVisible(uiWidget(), true),
            hide: () => mod.SetUIWidgetVisible(uiWidget(), false),
            delete: () => mod.DeleteUIWidget(uiWidget()),
            getPosition: () => UI.getPosition(uiWidget()),
            setPosition: (x: number, y: number) => mod.SetUIWidgetPosition(uiWidget(), mod.CreateVector(x, y, 0)),
            getSize: () => UI.getSize(uiWidget()),
            setSize: (width: number, height: number) => mod.SetUIWidgetSize(uiWidget(), mod.CreateVector(width, height, 0)),
        };

        for (const childParams of params.childrenParams ?? []) {
            childParams.parent = container;

            const child =
                childParams.type === 'container' ? UI.createContainer(childParams) :
                childParams.type === 'text' ? UI.createText(childParams as UI.TextParams) :
                childParams.type === 'button' ? UI.createButton(childParams as UI.ButtonParams) :
                undefined;

            if (!child) continue;

            container.children.push(child);
        }
    
        return container;
    }

    public static createText(params: UI.TextParams, receiver?: mod.Player | mod.Team): UI.Text {
        const parent = UI.parseNode(params.parent);
        const name = params.name ?? UI.makeName(parent, receiver);
    
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
            parent.uiWidget(),
            params.visible ?? true,
            params.padding ?? 0,
            params.bgColor ?? UI.COLORS.WHITE,
            params.bgAlpha ?? 0,
            params.bgFill ?? mod.UIBgFill.None,
            params.message,
            params.textSize ?? 36,
            params.textColor ?? UI.COLORS.BLACK,
            params.textAlpha ?? 1,
            params.textAnchor ?? mod.UIAnchor.Center,
            params.depth ?? mod.UIDepth.AboveGameUI,
        ];
    
        if (receiver == undefined) {
            mod.AddUIText(...args);
        } else {
            mod.AddUIText(...args, receiver);
        }
    
        const uiWidget = () => mod.FindUIWidgetWithName(name) as mod.UIWidget;

        return {
            type: UI.Type.Text,
            name: name,
            uiWidget: uiWidget,
            parent: parent,
            isVisible: () => mod.GetUIWidgetVisible(uiWidget()),
            show: () => mod.SetUIWidgetVisible(uiWidget(), true),
            hide: () => mod.SetUIWidgetVisible(uiWidget(), false),
            delete: () => mod.DeleteUIWidget(uiWidget()),
            getPosition: () => UI.getPosition(uiWidget()),
            setPosition: (x: number, y: number) => mod.SetUIWidgetPosition(uiWidget(), mod.CreateVector(x, y, 0)),
            getSize: () => UI.getSize(uiWidget()),
            setSize: (width: number, height: number) => mod.SetUIWidgetSize(uiWidget(), mod.CreateVector(width, height, 0)),
            setMessage: (message: mod.Message) => mod.SetUITextLabel(uiWidget(), message),
        };
    }

    public static createButton(params: UI.ButtonParams, receiver?: mod.Player | mod.Team): UI.Button {
        const parent = UI.parseNode(params.parent);
    
        const containerParams: UI.ContainerParams = {
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
            anchor: params.anchor,
            parent: parent,
            visible: params.visible,
            padding: 0,
            bgColor: UI.COLORS.BLACK,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth: params.depth,
        };
    
        const container = UI.createContainer(containerParams, receiver);
        const buttonName = params.name ?? `${container.name}_button`;

        const containerUiWidget = container.uiWidget();
    
        mod.AddUIButton(
            buttonName,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(params.width ?? 0, params.height ?? 0, 0),
            params.anchor ?? mod.UIAnchor.Center,
            containerUiWidget,
            true,
            params.padding ?? 0,
            params.bgColor ?? UI.COLORS.BLACK,
            params.bgAlpha ?? 1,
            params.bgFill ?? mod.UIBgFill.Solid,
            params.buttonEnabled ?? true,
            params.baseColor ?? UI.COLORS.WHITE,
            params.baseAlpha ?? 1,
            params.disabledColor ?? UI.COLORS.GREY_50,
            params.disabledAlpha ?? 1,
            params.pressedColor ?? UI.COLORS.GREEN,
            params.pressedAlpha ?? 1,
            params.hoverColor ?? UI.COLORS.CYAN,
            params.hoverAlpha ?? 1,
            params.focusedColor ?? UI.COLORS.YELLOW,
            params.focusedAlpha ?? 1,
            params.depth ?? mod.UIDepth.AboveGameUI,
        );
    
        if (params.onClick) {
            UI.CLICK_HANDLERS.set(buttonName, params.onClick);
        }
    
        const buttonUiWidget = () => mod.FindUIWidgetWithName(buttonName) as mod.UIWidget;

        const label = params.label ? UI.createText({
            ...params.label,
            name: `${container.name}_label`,
            parent: containerUiWidget,
            width: params.width,
            height: params.height,
            visible: true,
            depth: params.depth,
        }) : undefined;

        const setSize = (width: number, height: number) => {
            container.setSize(width, height);
            mod.SetUIWidgetSize(buttonUiWidget(), mod.CreateVector(width, height, 0));
            label?.setSize(width, height);
        };

        return {
            type: UI.Type.Button,
            name: container.name,
            uiWidget: () => containerUiWidget,
            parent: container.parent,
            buttonName: buttonName,
            buttonUiWidget: buttonUiWidget,
            isVisible: () => mod.GetUIWidgetVisible(containerUiWidget),
            show: () => mod.SetUIWidgetVisible(containerUiWidget, true),
            hide: () => mod.SetUIWidgetVisible(containerUiWidget, false),
            delete: () => mod.DeleteUIWidget(containerUiWidget),
            getPosition: () => UI.getPosition(containerUiWidget),
            setPosition: (x: number, y: number) => mod.SetUIWidgetPosition(containerUiWidget, mod.CreateVector(x, y, 0)),
            getSize: () => UI.getSize(containerUiWidget),
            setSize: setSize,
            isEnabled: () => mod.GetUIButtonEnabled(buttonUiWidget()),
            enable: () => mod.SetUIButtonEnabled(buttonUiWidget(), true),
            disable: () => mod.SetUIButtonEnabled(buttonUiWidget(), false),
            labelName: label?.name,
            labelUiWidget: label?.uiWidget,
            setLabelMessage: label?.setMessage,
        };
    }

    public static async handleButtonClick(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): Promise<void> {
        // NOTE: mod.UIButtonEvent is currently broken or undefined, so we're not using it for now.
        // if (event != mod.UIButtonEvent.ButtonUp) return;

        const clickHandler = UI.CLICK_HANDLERS.get(mod.GetUIWidgetName(widget));

        if (!clickHandler) return;

        await clickHandler(player);
    }

    public static parseNode(node?: UI.Node | mod.UIWidget): UI.Node {
        if (!node) return UI.root();
        
        if (node.hasOwnProperty('uiWidget')) return node as UI.Node;

        return {
            type: UI.Type.Unknown,
            name: 'ui_unknown',
            uiWidget: () => node as mod.UIWidget,
        };
    }

    private static makeName(parent: UI.Node, receiver?: mod.Player | mod.Team): string {
        return `${parent.name}${receiver ? `_${mod.GetObjId(receiver)}` : ''}_${UI.counter++}`;
    }

    private static getPosition(widget: mod.UIWidget): { x: number, y: number } {
        const position = mod.GetUIWidgetPosition(widget);
        return { x: mod.XComponentOf(position), y: mod.YComponentOf(position) };
    }

    private static getSize(widget: mod.UIWidget): { width: number, height: number } {
        const size = mod.GetUIWidgetSize(widget);
        return { width: mod.XComponentOf(size), height: mod.YComponentOf(size) };
    }

}

namespace UI {

    export enum Type {
        Root = 'root',
        Container = 'container',
        Text = 'text',
        Button = 'button',
        Unknown = 'unknown',
    }

    export type Node = {
        type: Type,
        name: string,
        uiWidget: () => mod.UIWidget,
    }

    export type Element = Node & {
        parent: Node,
        isVisible: () => boolean,
        show: () => void,
        hide: () => void,
        delete: () => void,
        getPosition: () => { x: number, y: number },
        setPosition: (x: number, y: number) => void,
        getSize: () => { width: number, height: number },
        setSize: (width: number, height: number) => void,
    }

    export type Container = Element & {
        children: (Container | Text | Button)[],
    }
    
    export type Text = Element & {
        setMessage: (message: mod.Message) => void,
    }
    
    export type Button = Element & {
        buttonName: string,
        buttonUiWidget: () => mod.UIWidget,
        isEnabled: () => boolean,
        enable: () => void,
        disable: () => void,
        labelName?: string,
        labelUiWidget?: () => mod.UIWidget,
        setLabelMessage?: (message: mod.Message) => void,
    }

    interface Params {
        type?: Type,
        name?: string,
        x?: number,
        y?: number,
        width?: number,
        height?: number,
        anchor?: mod.UIAnchor,
        parent?: mod.UIWidget | Node,
        visible?: boolean,
        padding?: number,
        bgColor?: mod.Vector,
        bgAlpha?: number,
        bgFill?: mod.UIBgFill,
        depth?: mod.UIDepth,
    }

    export interface ContainerParams extends Params {
        childrenParams?: (ContainerParams | TextParams | ButtonParams)[],
    }

    export interface TextParams extends Params {
        message: mod.Message,
        textSize?: number,
        textColor?: mod.Vector,
        textAlpha?: number,
        textAnchor?: mod.UIAnchor,
    }

    export interface LabelParams {
        message: mod.Message,
        textSize?: number,
        textColor?: mod.Vector,
        textAlpha?: number,
    }

    export interface ButtonParams extends Params {
        buttonEnabled?: boolean,
        baseColor?: mod.Vector,
        baseAlpha?: number,
        disabledColor?: mod.Vector,
        disabledAlpha?: number,
        pressedColor?: mod.Vector,
        pressedAlpha?: number,
        hoverColor?: mod.Vector,
        hoverAlpha?: number,
        focusedColor?: mod.Vector,
        focusedAlpha?: number,
        onClick?: (player: mod.Player) => Promise<void>,
        label?: LabelParams,
    }

}
