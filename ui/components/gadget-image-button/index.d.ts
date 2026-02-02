import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';
declare const GADGET_IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIGadgetImageButton extends UIContentButton<
    UIGadgetImage,
    typeof GADGET_IMAGE_BUTTON_CONTENT_PROPERTIES
> {
    gadget: mod.Gadgets;
    setGadget: (gadget: mod.Gadgets) => this;
    /**
     * Creates a new gadget image button.
     * @param params - The parameters for the gadget image button.
     */
    constructor(params: UIGadgetImageButton.Params);
}
export declare namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    type Params = UIButton.Params & UIGadgetImage.Params;
}
export {};
