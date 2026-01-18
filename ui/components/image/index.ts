import { UI } from '../../index.ts';

// version: 1.0.0
export class UIImage extends UI.Element {
    protected _imageType: mod.UIImageType;
    protected _imageColor: mod.Vector;
    protected _imageAlpha: number;

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

    public get imageType(): mod.UIImageType {
        return this._imageType;
    }

    public set imageType(imageType: mod.UIImageType) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageType(this._uiWidget, (this._imageType = imageType));
    }

    public setImageType(imageType: mod.UIImageType): this {
        this.imageType = imageType;
        return this;
    }

    public get imageAlpha(): number {
        return this._imageAlpha;
    }

    public set imageAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageAlpha(this._uiWidget, (this._imageAlpha = alpha));
    }

    public setImageAlpha(alpha: number): this {
        this.imageAlpha = alpha;
        return this;
    }

    public get imageColor(): mod.Vector {
        return this._imageColor;
    }

    public set imageColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIImageColor(this._uiWidget, (this._imageColor = color));
    }

    public setImageColor(color: mod.Vector): this {
        this.imageColor = color;
        return this;
    }
}

export namespace UIImage {
    export type Params = UI.ElementParams & {
        imageType: mod.UIImageType;
        imageColor?: mod.Vector;
        imageAlpha?: number;
    };
}
