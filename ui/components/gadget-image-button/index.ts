import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';

// version: 1.0.2
export class UIGadgetImageButton extends UIContentButton<UIGadgetImage> {
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

        super(params, createContent, ['gadget'] as readonly string[]);
    }
}

export namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    export type Params = UIButton.Params & UIGadgetImage.Params;
}
