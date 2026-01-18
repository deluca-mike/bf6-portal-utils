import { UIContentButton } from '../content-button/index.ts';
import { UIContainer } from '../container/index.ts';
import { UIButton } from '../button/index.ts';
declare const CONTAINER_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIContainerButton extends UIContentButton<
    UIContainer,
    typeof CONTAINER_BUTTON_CONTENT_PROPERTIES
> {
    constructor(params: UIContainerButton.Params);
    get innerContainer(): UIContainer;
}
export declare namespace UIContainerButton {
    type Params = UIButton.Params & UIContainer.Params;
}
export {};
