import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';

const CONTAINER_BUTTON_CONTENT_PROPERTIES: readonly string[] = [] as const;

// version: 1.0.0
export class UIContainerButton extends UIContentButton<UIContainer, typeof CONTAINER_BUTTON_CONTENT_PROPERTIES> {
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

        super(params, createContent, CONTAINER_BUTTON_CONTENT_PROPERTIES);
    }

    public get innerContainer(): UIContainer {
        return this._content;
    }
}

export namespace UIContainerButton {
    export type Params = UIButton.Params & UIContainer.Params;
}
