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
    constructor(params: UIGadgetImageButton.Params);
}
export declare namespace UIGadgetImageButton {
    type Params = UIButton.Params & UIGadgetImage.Params;
}
export {};
