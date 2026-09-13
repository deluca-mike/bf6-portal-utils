import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';

// version: 10.0.0
export class UIImage extends UI.Element {
    private static readonly _imageRgba = new Uint32Array(UI.MAX_ELEMENTS);
    private static readonly _imageType = new Uint8Array(UI.MAX_ELEMENTS);

    private static _setImageRgba(slot: number, color: Colors.Color, alpha: number): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        UIImage._imageRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _setImageColor(slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = UIImage._imageRgba[slot] & 0xff;
        UIImage._imageRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    private static _setImageAlpha(slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        UIImage._imageRgba[slot] = (UIImage._imageRgba[slot] & ~0xff) | aInt;
    }

    private static _getImageColor(slot: number, out?: Colors.Color): Colors.Color {
        const rgba = UIImage._imageRgba[slot];
        const r = (rgba >>> 24) / 255;
        const g = ((rgba >>> 16) & 0xff) / 255;
        const b = ((rgba >>> 8) & 0xff) / 255;
        if (out) {
            out.r = r;
            out.g = g;
            out.b = b;
            return out;
        }
        return { r, g, b };
    }

    private static _getImageAlpha(slot: number): number {
        return (UIImage._imageRgba[slot] & 0xff) / 255;
    }

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
        UIImage._setImageRgba(slot, imageColor, imageAlpha);
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIImage._imageType[slot] = 0;
        UIImage._imageRgba[slot] = 0;
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

        UIImage._imageType[slot] = imageType;
        mod.SetUIImageType(this._uiWidget, UI.Element._getNativeImageType(imageType));

        return this;
    }

    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public get imageAlpha(): number | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIImage._getImageAlpha(slot);
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

        UIImage._setImageAlpha(slot, alpha);
        mod.SetUIImageAlpha(this._uiWidget, alpha);

        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color, or undefined if deleted.
     */
    public get imageColor(): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIImage._getImageColor(slot);
    }

    /**
     * Retrieves the image color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The image color, or undefined if deleted.
     */
    public getImageColor(out?: Colors.Color): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIImage._getImageColor(slot, out);
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

        UIImage._setImageColor(slot, color);
        mod.SetUIImageColor(this._uiWidget, Colors.toVector(color));

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
