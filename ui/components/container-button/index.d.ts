import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';
export declare class UIContainerButton extends UIContentButton<UIContainer> {
    /**
     * Creates a new container button.
     * @param params - The parameters for the container button.
     */
    constructor(params: UIContainerButton.Params);
    /**
     * The inner container of the container button, or undefined if deleted. Use this as a normal UIContainer that can be used as a parent for
     * other elements.
     * @returns The inner UIContainer instance, or undefined if deleted.
     */
    get innerContainer(): UIContainer | undefined;
    /**
     * Retrieves the inner container of the container button, or undefined if deleted.
     * @returns The inner UIContainer instance, or undefined if deleted.
     */
    getInnerContainer(): UIContainer | undefined;
}
export declare namespace UIContainerButton {
    /**
     * The parameters for creating a new container button.
     */
    type Params = UIButton.Params & UIContainer.Params;
}
