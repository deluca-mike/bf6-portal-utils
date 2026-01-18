import { UI } from '../../index.ts';
export declare class UIContainer extends UI.Element implements UI.Parent {
    protected _children: Set<UI.Element>;
    constructor(params: UIContainer.Params);
    get children(): UI.Element[];
    delete(): void;
    attachChild(child: UI.Element): void;
    detachChild(child: UI.Element): void;
}
export declare namespace UIContainer {
    type ChildParams<T extends UI.ElementParams> = T & {
        type: new (params: T) => UI.Element;
    };
    type Params = UI.ElementParams & {
        childrenParams?: ChildParams<any>[];
    };
}
