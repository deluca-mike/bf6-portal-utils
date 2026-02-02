import { UI } from '../../index.ts';
export declare class UIGadgetImage extends UI.Element {
    protected _gadget: mod.Gadgets;
    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    constructor(params: UIGadgetImage.Params);
    /**
     * The gadget of the gadget image.
     */
    get gadget(): mod.Gadgets;
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    set gadget(gadget: mod.Gadgets);
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This element instance.
     */
    setGadget(gadget: mod.Gadgets): this;
}
export declare namespace UIGadgetImage {
    /**
     * The parameters for creating a new gadget image.
     */
    type Params = UI.ElementParams & {
        gadget: mod.Gadgets;
    };
}
