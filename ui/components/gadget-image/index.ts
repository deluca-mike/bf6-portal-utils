import { UI } from '../../index.ts';

// version: 10.0.0
export class UIGadgetImage extends UI.Element {
    /**
     * The maximum number of gadget image widgets that can exist concurrently in memory.
     */
    public static readonly MAX_GADGET_IMAGES = 128;

    private static readonly _MAX_GENERATIONS = 65_535;

    private static _activeGadgetImageCount: number = 0;

    private static _firstFreeGadgetImage: number = 0;

    private static readonly _generations = new Uint16Array(UIGadgetImage.MAX_GADGET_IMAGES);

    private static readonly _nextFreeGadget = new Int16Array(UIGadgetImage.MAX_GADGET_IMAGES);

    private static readonly _elementToGadgetSlot: Int16Array = UI.Element._elementToCustomSlot;

    private static readonly _gadgets = new Array<mod.Gadgets | null>(UIGadgetImage.MAX_GADGET_IMAGES);

    static {
        for (let i = 0; i < UIGadgetImage.MAX_GADGET_IMAGES - 1; ++i) {
            UIGadgetImage._nextFreeGadget[i] = i + 1;
        }

        UIGadgetImage._nextFreeGadget[UIGadgetImage.MAX_GADGET_IMAGES - 1] = UI.Element._INVALID_INDEX;
        UIGadgetImage._generations.fill(0);
        UIGadgetImage._gadgets.fill(null);
        UIGadgetImage._elementToGadgetSlot.fill(UI.Element._INVALID_INDEX);
    }

    /**
     * Returns the number of active gadget image elements.
     * @returns The active gadget image count.
     */
    public static getActiveGadgetImageCount(): number {
        return UIGadgetImage._activeGadgetImageCount;
    }

    /**
     * Resolves the 0-based gadget slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based gadget slot index (0 to MAX_GADGET_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveGadgetSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        return UIGadgetImage._elementToGadgetSlot[elementSlot];
    }

    /**
     * Creates a new gadget image.
     * @param params - The parameters for the gadget image.
     */
    public constructor(params: UIGadgetImage.Params) {
        super(params);

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        const gadgetSlot = this._allocateGadgetSlot();

        if (gadgetSlot === UI.Element._INVALID_INDEX) {
            super.delete();
            return;
        }

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);

        if (!receiver.nativeReceiver) {
            mod.AddUIGadgetImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                params.gadget,
                UI.Element._getNativeWidget(parent)!
            );
        } else {
            mod.AddUIGadgetImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                params.gadget,
                UI.Element._getNativeWidget(parent)!,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        UIGadgetImage._gadgets[gadgetSlot] = params.gadget;

        // `mod.AddUIGadgetImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    protected get _gadgetSlot(): number {
        const slot = this._slot;

        return slot !== UI.Element._INVALID_INDEX
            ? UIGadgetImage._elementToGadgetSlot[slot]
            : UI.Element._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._gadgetSlot !== UI.Element._INVALID_INDEX;
    }

    /**
     * Resolves the 0-based gadget slot for this gadget image instance and logs a warning if invalid.
     * @returns The 0-based gadget slot index (0 to MAX_GADGET_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveGadgetSlotAndLogWarning(): number {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        const gadgetSlot = UIGadgetImage._elementToGadgetSlot[elementSlot];

        if (gadgetSlot === UI.Element._INVALID_INDEX) {
            UIGadgetImage._logging.log(`Gadget image is deleted`, UI.LogLevel.Warning);
            return UI.Element._INVALID_INDEX;
        }

        return gadgetSlot;
    }

    protected override _getIsInvalidAndLogWarning(): boolean {
        return this._resolveGadgetSlotAndLogWarning() === UI.Element._INVALID_INDEX;
    }

    /**
     * Allocates a gadget slot for this gadget image instance.
     * @returns The allocated gadget slot index (0 to MAX_GADGET_IMAGES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateGadgetSlot(): number {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return UI.Element._INVALID_INDEX;

        if (UIGadgetImage._firstFreeGadgetImage === UI.Element._INVALID_INDEX) {
            UIGadgetImage._logging.log('Gadget image pool is full', UI.LogLevel.Error);
            return UI.Element._INVALID_INDEX;
        }

        const slot = UIGadgetImage._firstFreeGadgetImage;

        UIGadgetImage._firstFreeGadgetImage = UIGadgetImage._nextFreeGadget[slot];
        UIGadgetImage._nextFreeGadget[slot] = UI.Element._INVALID_INDEX;
        UIGadgetImage._gadgets[slot] = null;
        UIGadgetImage._elementToGadgetSlot[elementSlot] = slot;

        UIGadgetImage._activeGadgetImageCount++;

        return slot;
    }

    /**
     * Frees the gadget slot associated with this gadget image instance.
     */
    private _freeGadgetSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const slot = UIGadgetImage._elementToGadgetSlot[elementSlot];

        if (slot === UI.Element._INVALID_INDEX || slot < 0 || slot >= UIGadgetImage.MAX_GADGET_IMAGES) return;

        UIGadgetImage._gadgets[slot] = null;
        UIGadgetImage._elementToGadgetSlot[elementSlot] = UI.Element._INVALID_INDEX;

        UIGadgetImage._activeGadgetImageCount--;

        if (UIGadgetImage._generations[slot] < UIGadgetImage._MAX_GENERATIONS) {
            UIGadgetImage._generations[slot]++;
            UIGadgetImage._nextFreeGadget[slot] = UIGadgetImage._firstFreeGadgetImage;
            UIGadgetImage._firstFreeGadgetImage = slot;
        } else if (UIGadgetImage._logging.willLog(UI.LogLevel.Warning)) {
            UIGadgetImage._logging.log(
                `Gadget image slot ${slot} exhausted max generations and was retired`,
                UI.LogLevel.Warning
            );
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this._getIsInvalidAndLogWarning()) return;

        this._freeGadgetSlot();
        super.delete();
    }

    /**
     * The gadget of the gadget image, or undefined if deleted.
     * @returns The gadget, or undefined if deleted.
     */
    public get gadget(): mod.Gadgets | undefined {
        const slot = this._gadgetSlot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIGadgetImage._gadgets[slot] ?? undefined);
    }

    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     */
    public set gadget(gadget: mod.Gadgets) {
        this.setGadget(gadget);
    }

    /**
     * Sets the gadget of the gadget image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the gadget after it has
     * been created.
     * @param gadget - The new gadget.
     * @returns This gadget image for chaining.
     */
    public setGadget(gadget: mod.Gadgets): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        UIGadgetImage._logging.log('Setting UIGadgetImage gadget not supported', UI.LogLevel.Warning);

        return this;
    }
}

export namespace UIGadgetImage {
    /**
     * The parameters for creating a new gadget image.
     */
    export type Params = UI.ElementParams & {
        gadget: mod.Gadgets;
    };
}
