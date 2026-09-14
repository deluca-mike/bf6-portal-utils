import { UIBaseButton } from '../base-button/index.ts';
export declare class UIButton extends UIBaseButton {
    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    constructor(params: UIButton.Params);
}
export declare namespace UIButton {
    export import Event = UIBaseButton.Event;
    type Handlers = UIBaseButton.Handlers;
    type Styling = UIBaseButton.Styling;
    type Params = UIBaseButton.Params;
}
