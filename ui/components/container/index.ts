import { UI } from '../../index.ts';

// version: 7.0.0
export class UIContainer extends UI.Element implements UI.Parent {
    protected _children?: UI.Element[];

    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    public constructor(params: UIContainer.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName();
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
     * Returns a shallow copy of the list of direct child elements.
     * @returns Array of direct children.
     */
    public get children(): readonly UI.Element[] {
        return this._children ? this._children.slice() : [];
    }

    /**
     * Retrieves a child element at the specified index.
     * @param index - Zero-based index of the child.
     * @returns The child element, or undefined if out of bounds.
     */
    public getChild(index: number): UI.Element | undefined {
        return this._children ? this._children[index] : undefined;
    }

    /**
     * Iterates over all direct child elements without allocating an intermediate array.
     * @param callback - Function invoked for each child.
     */
    public forEachChild(callback: (child: UI.Element, index: number) => void): void {
        if (!this._children) return;

        const count = this._children.length;

        for (let i = 0; i < count; ++i) {
            callback(this._children[i]!, i);
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this._children) {
            const children = this._children;
            this._children = undefined;

            for (let i = 0; i < children.length; ++i) {
                children[i].delete();
            }
        }

        super.delete();
    }

    /**
     * Attaches a child to the container.
     * @param child - The child to attach.
     */
    public attachChild(child: UI.Element): void {
        if (this._deleted) return;

        if (!this._children) {
            this._children = [child];
            return;
        }

        this._children.push(child);
    }

    /**
     * Detaches a child from the container.
     * @param child - The child to detach.
     */
    public detachChild(child: UI.Element): void {
        if (!this._children) return;

        const idx = this._children.indexOf(child);

        if (idx === -1) return;

        const last = this._children.pop()!;

        if (idx < this._children.length) {
            this._children[idx] = last;
        }
    }
}

export namespace UIContainer {
    /**
     * UIContainer children parameters with a 'type' property and the properties required by that element's constructor.
     * @template T - The type of the element.
     */
    export type ChildParams<T extends UI.ElementParams> = T & {
        type: new (params: T) => UI.Element;
    };

    /**
     * The parameters for creating a new container.
     */
    export type Params = UI.ElementParams & {
        childrenParams?: ChildParams<UI.ElementParams>[];
    };
}
