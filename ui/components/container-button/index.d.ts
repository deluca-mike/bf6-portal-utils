import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';
declare const CONTAINER_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIContainerButton extends UIContentButton<
    UIContainer,
    typeof CONTAINER_BUTTON_CONTENT_PROPERTIES
> {
    /**
     * Creates a new container button.
     * @param params - The parameters for the container button.
     */
    constructor(params: UIContainerButton.Params);
    /**
     * The inner container of the container button. Use this as a normal UIContainer that can be used as a parent for
     * other elements.
     */
    get innerContainer(): UIContainer;
}
export declare namespace UIContainerButton {
    /**
     * The parameters for creating a new container button.
     */
    type Params = UIButton.Params & UIContainer.Params;
}
export {};
