import { UI } from '../../index.ts';

// version: 2.0.0
export class UIGadgetImage extends UI.Element {
    protected _gadget: mod.Gadgets;

    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    public constructor(params: UIGadgetImage.Params) {
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
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth: mod.UIDepth.AboveGameUI,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const args: [
            string, // name
            mod.Vector, // position
            mod.Vector, // size
            mod.UIAnchor, // anchor
            mod.Gadgets, // gadget,
            mod.UIWidget, // parent
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            params.gadget,
            parent.uiWidget,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIGadgetImage(...args);
        } else {
            mod.AddUIGadgetImage(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        this._gadget = params.gadget;

        // `mod.AddUIGadgetImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!elementParams.visible) {
            this.visible = false;
        }
    }

    /**
     * The gadget of the gadget image.
     * @returns The gadget.
     */
    public get gadget(): mod.Gadgets {
        return this._gadget;
    }

    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    public set gadget(gadget: mod.Gadgets) {
        if (this._isDeletedCheck()) return;

        this._logging.log('Setting UIGadgetImage gadget not supported', UI.LogLevel.Warning);
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
