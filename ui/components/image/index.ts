import { UI } from '../../index.ts';

// version: 4.0.0
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
                UI.Element._getNativeWidget(parent.id)!,
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
                UI.Element._getNativeWidget(parent.id)!,
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
     * The type of the image.
     * @returns The image type.
     */
    public get imageType(): mod.UIImageType {
        return this._isDeletedCheck() ? mod.UIImageType.None : mod.GetUIImageType(this._uiWidget);
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageType(this._uiWidget, imageType);
    }

    /**
     * The alpha of the image.
     * @returns The image alpha opacity.
     */
    public get imageAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIImageAlpha(this._uiWidget);
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageAlpha(this._uiWidget, alpha);
    }

    /**
     * The color of the image.
     * @returns The image color vector.
     */
    public get imageColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIImageColor(this._uiWidget);
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageColor(this._uiWidget, color);
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
