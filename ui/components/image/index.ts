import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';

// version: 10.0.0
export class UIImage extends UI.Element {
    protected static readonly _DIRTY_IMAGE_TYPE = 1 << UI.Element._UNUSED_DIRTY_OFFSET;
    protected static override readonly _UNUSED_DIRTY_OFFSET = UI.Element._UNUSED_DIRTY_OFFSET + 1;

    private static readonly _imageType = new Uint8Array(UI.MAX_ELEMENTS);

    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    public constructor(params: UIImage.Params) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 0;
        const bgFill = params.bgFill ?? UI.BgFill.None;
        const depth = params.depth ?? UI.Depth.AboveGameUI;
        const imageColor = params.imageColor ?? UI.COLORS.WHITE;
        const imageAlpha = params.imageAlpha ?? 1;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeBgFill = UI.Element._getNativeBgFill(bgFill);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeImageType = UI.Element._getNativeImageType(params.imageType);

        if (!receiver.nativeReceiver) {
            mod.AddUIImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                nativeImageType,
                Colors.toVector(imageColor),
                imageAlpha,
                nativeDepth
            );
        } else {
            mod.AddUIImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBgFill,
                nativeImageType,
                Colors.toVector(imageColor),
                imageAlpha,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        const slot = this._slot;
        UIImage._imageType[slot] = params.imageType;
        UI.Element._setForegroundAlpha(slot, imageAlpha);
        UI.Element._setForegroundColor(slot, imageColor);
    }

    /**
     * @inheritdoc
     */
    protected override _handleFlush(flags: number, widget: mod.UIWidget): void {
        super._handleFlush(flags, widget);

        const slot = this._slot;

        if (flags & UIImage._DIRTY_IMAGE_TYPE) {
            mod.SetUIImageType(widget, UI.Element._getNativeImageType(UIImage._imageType[slot] as UI.ImageType));
        }

        if (flags & UI.Element._DIRTY_FOREGROUND_COLOR) {
            mod.SetUIImageColor(widget, Colors.toVector(UI.Element._getForegroundColor(slot)));
        }

        if (flags & UI.Element._DIRTY_FOREGROUND_ALPHA) {
            mod.SetUIImageAlpha(widget, UI.Element._getForegroundAlpha(slot));
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIImage._imageType[slot] = 0;
        super.delete();
    }

    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public get imageType(): UI.ImageType | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIImage._imageType[slot] as UI.ImageType);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: UI.ImageType) {
        this.setImageType(imageType);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image for chaining.
     */
    public setImageType(imageType: UI.ImageType): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        if (UIImage._imageType[slot] === imageType) return this;

        UIImage._imageType[slot] = imageType;
        UI.Element._markDirty(slot, UIImage._DIRTY_IMAGE_TYPE);

        return this;
    }

    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public get imageAlpha(): number | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundAlpha(slot);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        this.setImageAlpha(alpha);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     * @returns This image for chaining.
     */
    public setImageAlpha(alpha: number): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        if (UI.Element._setForegroundAlpha(slot, alpha)) {
            UI.Element._markDirty(slot, UI.Element._DIRTY_FOREGROUND_ALPHA);
        }

        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color, or undefined if deleted.
     */
    public get imageColor(): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot);
    }

    /**
     * Retrieves the image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The image color, or undefined if deleted.
     */
    public getImageColor(out?: Colors.Color): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot, out);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: Colors.Color) {
        this.setImageColor(color);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image for chaining.
     */
    public setImageColor(color: Colors.Color): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        if (UI.Element._setForegroundColor(slot, color)) {
            UI.Element._markDirty(slot, UI.Element._DIRTY_FOREGROUND_COLOR);
        }

        return this;
    }
}

export namespace UIImage {
    /**
     * The parameters for creating a new image.
     */
    export type Params = UI.ElementParams & {
        imageType: UI.ImageType;
        imageColor?: Colors.Color;
        imageAlpha?: number;
    };
}
