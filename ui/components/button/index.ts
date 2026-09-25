import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';

// version: 10.0.0
export class UIButton extends UIBaseButton {
    /**
     * Creates a new button.
     * @param params - The parameters for the button.
     * Note that all colors are multiplied onto `bgColor`, so it is best to leave `bgColor` as its default, which is white.
     * Similarly, alphas are also multiplied onto `bgAlpha`, however only `bgAlpha` will control the alpha of the `bgFill` effect.
     */
    public constructor(params: UIButton.Params) {
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
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? UI.BgFill.Solid;
        const depth = params.depth ?? UI.Depth.AboveGameUI;
        const enabled = params.enabled ?? true;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeBgFill = UI.Element._getNativeBgFill(bgFill);
        const nativeDepth = UI.Element._getNativeDepth(depth);

        if (!receiver.nativeReceiver) {
            mod.AddUIButton(
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
                enabled,
                Colors.toVector(baseColor),
                baseAlpha,
                Colors.toVector(disabledColor),
                disabledAlpha,
                Colors.toVector(pressedColor),
                pressedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                nativeDepth
            );
        } else {
            mod.AddUIButton(
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
                enabled,
                Colors.toVector(baseColor),
                baseAlpha,
                Colors.toVector(disabledColor),
                disabledAlpha,
                Colors.toVector(pressedColor),
                pressedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                Colors.toVector(focusedColor),
                focusedAlpha,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        // These are both valid slots since `this._isValid` was true above.
        const slot = this._slot;
        const btnSlot = this._buttonSlot;

        UI.Element._setBgAlpha(slot, bgAlpha);
        UI.Element._setBgFill(slot, bgFill);
        UI.Element._setEnabled(slot, enabled);
        UI.Element._setForegroundAlpha(slot, baseAlpha);
        UI.Element._setForegroundColor(slot, baseColor);
        UIBaseButton._setAlpha(UIBaseButton._disabledRgba, btnSlot, disabledAlpha);
        UIBaseButton._setRgb(UIBaseButton._disabledRgba, btnSlot, disabledColor);
        UIBaseButton._setAlpha(UIBaseButton._pressedRgba, btnSlot, pressedAlpha);
        UIBaseButton._setRgb(UIBaseButton._pressedRgba, btnSlot, pressedColor);
        UIBaseButton._setAlpha(UIBaseButton._focusedRgba, btnSlot, focusedAlpha);
        UIBaseButton._setRgb(UIBaseButton._focusedRgba, btnSlot, focusedColor);

        this._setupButtonHandlers(params);
    }
}

export namespace UIButton {
    export import Event = UIBaseButton.Event;
    export type Handlers = UIBaseButton.Handlers;
    export type Styling = UIBaseButton.Styling;
    export type Params = UIBaseButton.Params;
}
