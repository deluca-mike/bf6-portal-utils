import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIGadgetImage } from '../gadget-image/index.ts';

// version: 3.0.0
export class UIGadgetImageButton extends UIContentButton<UIGadgetImage> {
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

        super(params, createContent);
    }

    /**
     * The gadget of the gadget image button, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public get gadget(): mod.Gadgets | undefined {
        return this.getGadget();
    }

    /**
     * Retrieves the gadget of the gadget image button, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public getGadget(): mod.Gadgets | undefined {
        return this._isDeletedCheck() ? undefined : this._content.gadget;
    }
}

export namespace UIGadgetImageButton {
    /**
     * The parameters for creating a new gadget image button.
     */
    export type Params = UIButton.Params & UIGadgetImage.Params;
}
