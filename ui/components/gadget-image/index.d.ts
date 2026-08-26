import { UI } from '../../index.ts';
export declare class UIGadgetImage extends UI.Element {
    protected _gadget: mod.Gadgets;
    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    constructor(params: UIGadgetImage.Params);
    /**
     * The gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    get gadget(): mod.Gadgets | undefined;
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    set gadget(gadget: mod.Gadgets);
    /**
     * Retrieves the gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    getGadget(): mod.Gadgets | undefined;
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This gadget image for chaining.
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
