import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';
export declare class UIGadgetImageButton extends UIContentButton<UIGadgetImage> {
    /**
     * Creates a new gadget image button.
     * @param params - The parameters for the gadget image button.
     */
    constructor(params: UIGadgetImageButton.Params);
    /**
     * The gadget of the gadget image button.
     * @returns The gadget.
     */
    get gadget(): mod.Gadgets;
}
export declare namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    type Params = UIButton.Params & UIGadgetImage.Params;
}
