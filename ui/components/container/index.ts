import { CallbackHandler } from '../../../callback-handler/index.ts';
import { UI } from '../../index.ts';

// version: 8.0.0
export class UIContainer extends UI.Element implements UI.Parent {
    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    public constructor(params: UIContainer.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 0;
        const bgFill = params.bgFill ?? mod.UIBgFill.None;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent.id)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                depth
            );
        } else {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent.id)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                depth,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor,
            bgAlpha,
            bgFill,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        for (const childParams of params.childrenParams ?? []) {
            childParams.parent = this;

            new childParams.type(childParams);
        }
    }

    /**
     * Returns a snapshot array of direct child elements.
     * @returns Array of direct children.
     */
    public get children(): readonly UI.Element[] {
        if (this._isDeletedCheck()) return [];

        const list: UI.Element[] = [];
        let curr = UI.Element._getFirstChild(this._id);

        while (curr !== UI.INVALID_INDEX) {
            const inst = UI.Element._getInstance(curr);

            if (inst) {
                list.push(inst);
            }

            curr = UI.Element._getNextSibling(curr);
        }

        return list;
    }

    /**
     * Retrieves a child element at the specified index.
     * @param index - Zero-based index of the child.
     * @returns The child element, or undefined if out of bounds.
     */
    public getChild(index: number): UI.Element | undefined {
        if (this._isDeletedCheck()) return undefined;

        let curr = UI.Element._getFirstChild(this._id);
        let idx = 0;

        while (curr !== UI.INVALID_INDEX) {
            if (idx === index) return UI.Element._getInstance(curr);

            curr = UI.Element._getNextSibling(curr);
            idx++;
        }

        return undefined;
    }

    /**
     * Iterates over all direct child elements without allocating an intermediate array.
     * @param callback - Function invoked for each child.
     */
    public forEachChild(callback: (child: UI.Element, index: number) => void): void {
        if (this._isDeletedCheck()) return;

        let curr = UI.Element._getFirstChild(this._id);
        let idx = 0;

        while (curr !== UI.INVALID_INDEX) {
            const next = UI.Element._getNextSibling(curr);
            const inst = UI.Element._getInstance(curr);

            if (inst) {
                CallbackHandler.invoke(callback, inst, idx++, undefined, undefined, this._logging);
            }

            curr = next;
        }
    }

    /**
     * Attaches a child to the container.
     * @param child - The child to attach.
     */
    public attachChild(child: UI.Element): void {
        if (this._isDeletedCheck() || child.id === UI.INVALID_INDEX) return;

        UI.Element._attachChild(this._id, child.id);
    }

    /**
     * Detaches a child from the container.
     * @param child - The child to detach.
     */
    public detachChild(child: UI.Element): void {
        if (this._isDeletedCheck() || child.id === UI.INVALID_INDEX) return;

        UI.Element._detachChild(this._id, child.id);
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
