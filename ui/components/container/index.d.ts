import { UI } from '../../index.ts';
export declare class UIContainer extends UI.Element implements UI.Parent {
    /**
     * Creates a new container.
     * @param params - The parameters for the container.
     */
    constructor(params: UIContainer.Params);
    /**
     * Returns a snapshot array of direct child elements, or undefined if deleted.
     * @returns Array of direct children, or undefined if deleted.
     */
    get children(): readonly UI.Element[] | undefined;
    /**
     * Retrieves a child element at the specified index.
     * @param index - Zero-based index of the child.
     * @returns The child element, null if out of bounds, or undefined if deleted.
     */
    getChild(index: number): UI.Element | null | undefined;
    /**
     * The total direct child count of the container, or undefined if deleted.
     * @returns The number of direct children, or undefined if deleted.
     */
    get childCount(): number | undefined;
    /**
     * Iterates over all direct child elements without allocating an intermediate array.
     * @param callback - Function invoked for each child.
     */
    forEachChild(callback: (child: UI.Element, index: number) => void): void;
}
export declare namespace UIContainer {
    /**
     * UIContainer children parameters with a 'type' property and the properties required by that element's constructor.
     * @template T - The type of the element.
     */
    type ChildParams<T extends UI.ElementParams = any> = T & {
        type: new (params: T) => UI.Element;
    };
    /**
     * The parameters for creating a new container.
     */
    type Params = UI.ElementParams & {
        childrenParams?: ChildParams<any>[];
    };
}
