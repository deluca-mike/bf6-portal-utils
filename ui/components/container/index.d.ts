import { UI } from '../../index.ts';
export declare class UIContainer extends UI.Element implements UI.Parent {
    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    constructor(params: UIContainer.Params);
    /**
     * Returns a snapshot array of direct child elements.
     * @returns Array of direct children.
     */
    get children(): readonly UI.Element[];
    /**
     * Retrieves a child element at the specified index.
     * @param index - Zero-based index of the child.
     * @returns The child element, or undefined if out of bounds.
     */
    getChild(index: number): UI.Element | undefined;
    /**
     * Iterates over all direct child elements without allocating an intermediate array.
     * @param callback - Function invoked for each child.
     */
    forEachChild(callback: (child: UI.Element, index: number) => void): void;
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
     * @template T - The type of the element.
     */
    type ChildParams<T extends UI.ElementParams> = T & {
        type: new (params: T) => UI.Element;
    };
    /**
     * The parameters for creating a new container.
     */
    type Params = UI.ElementParams & {
        childrenParams?: ChildParams<UI.ElementParams>[];
    };
}
