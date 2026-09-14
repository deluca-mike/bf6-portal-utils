import { UI } from '../../index.ts';
export declare class UIGadgetImage extends UI.Element {
    /**
     * The maximum number of gadget image widgets that can exist concurrently in memory.
     */
    static readonly MAX_GADGET_IMAGES = 64;
    private static readonly _MAX_GENERATIONS;
    private static _activeGadgetImageCount;
    private static _firstFreeGadgetImage;
    private static readonly _generations;
    private static readonly _nextFreeGadget;
    private static readonly _elementToGadgetSlot;
    private static readonly _gadgets;
    /**
     * Returns the number of active gadget image elements.
     * @returns The active gadget image count.
     */
    static getActiveGadgetImageCount(): number;
    /**
     * Resolves the 0-based gadget slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based gadget slot index (0 to MAX_GADGET_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveGadgetSlot(elementId: number): number;
    protected get _gadgetSlot(): number;
    protected get _isValid(): boolean;
    /**
     * Resolves the 0-based gadget slot for this gadget image instance and logs a warning if invalid.
     * @returns The 0-based gadget slot index (0 to MAX_GADGET_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveGadgetSlotAndLogWarning(): number;
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Allocates a gadget slot for this gadget image instance.
     * @returns The allocated gadget slot index (0 to MAX_GADGET_IMAGES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateGadgetSlot;
    /**
     * Frees the gadget slot associated with this gadget image instance.
     */
    private _freeGadgetSlot;
    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    constructor(params: UIGadgetImage.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    get gadget(): mod.Gadgets | undefined;
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    set gadget(gadget: mod.Gadgets);
    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This gadget image for chaining.
     */
    setGadget(gadget: mod.Gadgets): this;
}
export declare namespace UIGadgetImage {
    /**
     * The parameters for creating a new gadget image.
     */
    type Params = UI.ElementParams & {
        gadget: mod.Gadgets;
    };
}
