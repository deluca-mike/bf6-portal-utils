import { UI } from '../../index.ts';

// version: 4.0.0
export class UIGadgetImage extends UI.Element {
    protected _gadget: mod.Gadgets;

    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    public constructor(params: UIGadgetImage.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;

        if (!receiver.nativeReceiver) {
            mod.AddUIGadgetImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                params.gadget,
                UI.Element._getNativeWidget(parent)!
            );
        } else {
            mod.AddUIGadgetImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                params.gadget,
                UI.Element._getNativeWidget(parent)!,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        this._gadget = params.gadget;

        // `mod.AddUIGadgetImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    /**
     * The gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public get gadget(): mod.Gadgets | undefined {
        return this.getGadget();
    }

    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    public set gadget(gadget: mod.Gadgets) {
        this.setGadget(gadget);
    }

    /**
     * Retrieves the gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public getGadget(): mod.Gadgets | undefined {
        return this._isDeletedCheck() ? undefined : this._gadget;
    }

    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This gadget image for chaining.
     */
    public setGadget(gadget: mod.Gadgets): this {
        if (this._isDeletedCheck()) return this;

        this._logging.log('Setting UIGadgetImage gadget not supported', UI.LogLevel.Warning);
        return this;
    }
}

export namespace UIGadgetImage {
    /**
     * The parameters for creating a new gadget image.
     */
    export type Params = UI.ElementParams & {
        gadget: mod.Gadgets;
    };
}
