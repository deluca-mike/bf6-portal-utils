import { UI } from '../../index.ts';

// version: 9.0.0
export class UIGadgetImage extends UI.Element {
    private static readonly _gadgets = new Array<mod.Gadgets | null>(UI.MAX_ELEMENTS);

    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    public constructor(params: UIGadgetImage.Params) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;

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

        this._bindNativeWidget(name);

        UIGadgetImage._gadgets[this._slot] = params.gadget;

        // `mod.AddUIGadgetImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIGadgetImage._gadgets[slot] = null;
        super.delete();
    }

    /**
     * The gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public get gadget(): mod.Gadgets | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIGadgetImage._gadgets[slot] ?? undefined);
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
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This gadget image for chaining.
     */
    public setGadget(gadget: mod.Gadgets): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        UIGadgetImage._logging.log('Setting UIGadgetImage gadget not supported', UI.LogLevel.Warning);

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
