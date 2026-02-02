import { UI } from '../../index.ts';

// version: 1.0.1
export class UIImage extends UI.Element {
    protected _imageType: mod.UIImageType;
    protected _imageColor: mod.Vector;
    protected _imageAlpha: number;

    /**
     * Creates a new image.
     * @param params - The parameters for the image.
     */
    public constructor(params: UIImage.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName(parent, receiver);
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);

        const elementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: params.bgColor ?? UI.COLORS.WHITE,
            bgAlpha: params.bgAlpha ?? 0,
            bgFill: params.bgFill ?? mod.UIBgFill.None,
            depth: params.depth ?? mod.UIDepth.AboveGameUI,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const imageType = params.imageType;
        const imageColor = params.imageColor ?? UI.COLORS.WHITE;
        const imageAlpha = params.imageAlpha ?? 0;

        const args: [
            string, // name
            mod.Vector, // position
            mod.Vector, // size
            mod.UIAnchor, // anchor
            mod.UIWidget, // parent
            boolean, // visible
            number, // padding
            mod.Vector, // bgColor
            number, // bgAlpha
            mod.UIBgFill, // bgFill
            mod.UIImageType, // imageType
            mod.Vector, // imageColor
            number, // imageAlpha
            mod.UIDepth, // depth
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            parent.uiWidget,
            elementParams.visible,
            0,
            elementParams.bgColor,
            elementParams.bgAlpha,
            elementParams.bgFill,
            imageType,
            imageColor,
            imageAlpha,
            elementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIImage(...args);
        } else {
            mod.AddUIImage(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        this._imageType = imageType;
        this._imageColor = imageColor;
        this._imageAlpha = imageAlpha;
    }

    /**
     * The type of the image.
     */
    public get imageType(): mod.UIImageType {
        return this._imageType;
    }

    /**
     * Sets the type of the image.
     * @param imageType - The new type of the image.
     */
    public set imageType(imageType: mod.UIImageType) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageType(this._uiWidget, (this._imageType = imageType));
    }

    /**
     * Sets the type of the image. Useful for chaining operations.
     * @param imageType - The new type of the image.
     * @returns This element instance.
     */
    public setImageType(imageType: mod.UIImageType): this {
        this.imageType = imageType;
        return this;
    }

    /**
     * The alpha of the image.
     */
    public get imageAlpha(): number {
        return this._imageAlpha;
    }

    /**
     * Sets the alpha of the image.
     * @param alpha - The new alpha of the image.
     */
    public set imageAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageAlpha(this._uiWidget, (this._imageAlpha = alpha));
    }

    /**
     * Sets the alpha of the image. Useful for chaining operations.
     * @param alpha - The new alpha of the image.
     * @returns This element instance.
     */
    public setImageAlpha(alpha: number): this {
        this.imageAlpha = alpha;
        return this;
    }

    /**
     * The color of the image.
     */
    public get imageColor(): mod.Vector {
        return this._imageColor;
    }

    /**
     * Sets the color of the image.
     * @param color - The new color of the image.
     */
    public set imageColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageColor(this._uiWidget, (this._imageColor = color));
    }

    /**
     * Sets the color of the image. Useful for chaining operations.
     * @param color - The new color of the image.
     * @returns This element instance.
     */
    public setImageColor(color: mod.Vector): this {
        this.imageColor = color;
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
