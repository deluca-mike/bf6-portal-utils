import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';

// version: 10.0.0
export class UIGadgetImageButton extends UIContentButton<UIGadgetImage> {
    private static readonly _scratchGadgetParams: UIGadgetImage.Params = {
        gadget: null as unknown as mod.Gadgets,
    };

    /**
     * Creates a new gadget image button.
     * @param params - The parameters for the gadget image button.
     */
    public constructor(params: UIGadgetImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIGadgetImage => {
            const scratch = UIGadgetImageButton._scratchGadgetParams;
            scratch.parent = parent;
            scratch.width = width;
            scratch.height = height;
            scratch.gadget = params.gadget;
            scratch.depth = params.depth;

            const gadgetImage = new UIGadgetImage(scratch);

            scratch.parent = undefined;
            scratch.gadget = null as unknown as mod.Gadgets;

            return gadgetImage;
        };

        super(params, createContent);
    }

    /**
     * The gadget of the gadget image button, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public get gadget(): mod.Gadgets | undefined {
        return this._isValid ? this.content?.gadget : undefined;
    }
}

export namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    export type Params = UIButton.Params & UIGadgetImage.Params;
}
