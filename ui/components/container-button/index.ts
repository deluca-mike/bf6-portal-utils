import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';

// version: 1.0.2
export class UIContainerButton extends UIContentButton<UIContainer> {
    /**
     * Creates a new container button.
     * @param params - The parameters for the container button.
     */
    public constructor(params: UIContainerButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIContainer => {
            const containerParams: UIContainer.Params = {
                parent,
                width,
                height,
                depth: params.depth,
                childrenParams: params.childrenParams,
            };

            return new UIContainer(containerParams);
        };

        super(params, createContent, [] as readonly string[]);
    }

    /**
     * The inner container of the container button. Use this as a normal UIContainer that can be used as a parent for
     * other elements.
     */
    public get innerContainer(): UIContainer {
        return this._content;
    }
}

export namespace UIContainerButton {
    /**
     * The parameters for creating a new container button.
     */
    export type Params = UIButton.Params & UIContainer.Params;
}
