import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';

const GADGET_IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['gadget'] as const;

// version: 1.0.1
export class UIGadgetImageButton extends UIContentButton<UIGadgetImage, typeof GADGET_IMAGE_BUTTON_CONTENT_PROPERTIES> {
    // UIGadgetImage properties (delegated via delegateProperties)
    declare public gadget: mod.Gadgets;

    // UIGadgetImage setter methods (delegated via delegateProperties)
    declare public setGadget: (gadget: mod.Gadgets) => this;

    /**
     * Creates a new gadget image button.
     * @param params - The parameters for the gadget image button.
     */
    public constructor(params: UIGadgetImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIGadgetImage => {
            const gadgetImageParams: UIGadgetImage.Params = {
                parent,
                width,
                height,
                gadget: params.gadget,
                depth: params.depth,
            };

            return new UIGadgetImage(gadgetImageParams);
        };

        super(params, createContent, GADGET_IMAGE_BUTTON_CONTENT_PROPERTIES);
    }
}

export namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    export type Params = UIButton.Params & UIGadgetImage.Params;
}
