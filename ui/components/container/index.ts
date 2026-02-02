import { UI } from '../../index.ts';

// version: 6.0.1
export class UIContainer extends UI.Element implements UI.Parent {
    protected _children: Set<UI.Element> = new Set();

    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    public constructor(params: UIContainer.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName(parent, receiver);
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);

        const elementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: params.bgColor ?? UI.COLORS.WHITE,
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
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            parent.uiWidget,
            elementParams.visible,
            0,
            elementParams.bgColor,
            elementParams.bgAlpha,
            elementParams.bgFill,
            elementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIContainer(...args);
        } else {
            mod.AddUIContainer(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        for (const childParams of params.childrenParams ?? []) {
            childParams.parent = this;

            new childParams.type(childParams);
        }
    }

    /**
     * The children of the container.
     */
    public get children(): UI.Element[] {
        return Array.from(this._children);
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        for (const child of this._children) {
            child.delete();
        }

        super.delete();
    }

    /**
     * Attaches a child to the container.
     * @param child - The child to attach.
     */
    public attachChild(child: UI.Element): void {
        if (this._deleted) return;

        this._children.add(child);
    }

    /**
     * Detaches a child from the container.
     * @param child - The child to detach.
     */
    public detachChild(child: UI.Element): void {
        this._children.delete(child);
    }
}

export namespace UIContainer {
    /**
     * UIContainer children parameters with a 'type' property and the properties required by that element's constructor.
     * @param T - The type of the element.
     * @returns The child parameters.
     */
    export type ChildParams<T extends UI.ElementParams> = T & {
        type: new (params: T) => UI.Element;
    };

    /**
     * The parameters for creating a new container.
     * @param T - The type of the element.
     * @returns The container parameters.
     */
    export type Params = UI.ElementParams & {
        childrenParams?: ChildParams<any>[];
    };
}
