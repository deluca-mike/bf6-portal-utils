import { UI } from '../../index.ts';

// version: 5.0.0
export class UIImage extends UI.Element {
    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    public constructor(params: UIImage.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 0;
        const bgFill = params.bgFill ?? mod.UIBgFill.None;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const imageColor = params.imageColor ?? UI.COLORS.WHITE;
        const imageAlpha = params.imageAlpha ?? 1;

        if (!receiver.nativeReceiver) {
            mod.AddUIImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                params.imageType,
                imageColor,
                imageAlpha,
                depth
            );
        } else {
            mod.AddUIImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                params.imageType,
                imageColor,
                imageAlpha,
                depth,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor,
            bgAlpha,
            bgFill,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });
    }

    /**
     * The type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public get imageType(): mod.UIImageType | undefined {
        return this.getImageType();
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        this.setImageType(imageType);
    }

    /**
     * Retrieves the type of the image, or undefined if deleted.
     * @returns The image type, or undefined if deleted.
     */
    public getImageType(): mod.UIImageType | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIImageType(this._uiWidget);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     * @returns This image for chaining.
     */
    public setImageType(imageType: mod.UIImageType): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIImageType(this._uiWidget, imageType);
        return this;
    }

    /**
     * The alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public get imageAlpha(): number | undefined {
        return this.getImageAlpha();
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        this.setImageAlpha(alpha);
    }

    /**
     * Retrieves the alpha of the image, or undefined if deleted.
     * @returns The image alpha opacity, or undefined if deleted.
     */
    public getImageAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIImageAlpha(this._uiWidget);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     * @returns This image for chaining.
     */
    public setImageAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIImageAlpha(this._uiWidget, alpha);
        return this;
    }

    /**
     * The color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    public get imageColor(): mod.Vector | undefined {
        return this.getImageColor();
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        this.setImageColor(color);
    }

    /**
     * Retrieves the color of the image, or undefined if deleted.
     * @returns The image color vector, or undefined if deleted.
     */
    public getImageColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIImageColor(this._uiWidget);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     * @returns This image for chaining.
     */
    public setImageColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIImageColor(this._uiWidget, color);
        return this;
    }
}

export namespace UIImage {
    /**
     * The parameters for creating a new image.
     */
    export type Params = UI.ElementParams & {
        imageType: mod.UIImageType;
        imageColor?: mod.Vector;
        imageAlpha?: number;
    };
}
