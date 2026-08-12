import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';

// version: 9.0.0
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

        super(params, createContent);
    }

    /**
     * The inner container of the container button, or undefined if deleted. Use this as a normal UIContainer that can be used as a parent for
     * other elements.
     * @returns The inner UIContainer instance, or undefined if deleted.
     */
    public get innerContainer(): UIContainer | undefined {
        return this.content;
    }
}

export namespace UIContainerButton {
    /**
     * The parameters for creating a new container button.
     */
    export type Params = UIButton.Params & UIContainer.Params;
}
