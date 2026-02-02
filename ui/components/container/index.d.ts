import { UI } from '../../index.ts';
export declare class UIContainer extends UI.Element implements UI.Parent {
    protected _children: Set<UI.Element>;
    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    constructor(params: UIContainer.Params);
    /**
     * The children of the container.
     */
    get children(): UI.Element[];
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * Attaches a child to the container.
     * @param child - The child to attach.
     */
    attachChild(child: UI.Element): void;
    /**
     * Detaches a child from the container.
     * @param child - The child to detach.
     */
    detachChild(child: UI.Element): void;
}
export declare namespace UIContainer {
    /**
     * UIContainer children parameters with a 'type' property and the properties required by that element's constructor.
     * @param T - The type of the element.
     * @returns The child parameters.
     */
    type ChildParams<T extends UI.ElementParams> = T & {
        type: new (params: T) => UI.Element;
    };
    /**
     * The parameters for creating a new container.
     * @param T - The type of the element.
     * @returns The container parameters.
     */
    type Params = UI.ElementParams & {
        childrenParams?: ChildParams<any>[];
    };
}
