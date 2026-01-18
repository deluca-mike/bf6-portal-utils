import { UI } from '../../index.ts';
export declare class UIGadgetImage extends UI.Element {
    protected _gadget: mod.Gadgets;
    constructor(params: UIGadgetImage.Params);
    get gadget(): mod.Gadgets;
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the gadget.
     */
    set gadget(gadget: mod.Gadgets);
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the gadget.
     * @param gadget - The gadget to set.
     * @returns The UIGadgetImage instance.
     */
    setGadget(gadget: mod.Gadgets): this;
}
export declare namespace UIGadgetImage {
    type Params = UI.ElementParams & {
        gadget: mod.Gadgets;
    };
}
