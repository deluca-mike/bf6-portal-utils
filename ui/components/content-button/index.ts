import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 10.0.0
 */
export abstract class UIContentButton<TContent extends UI.Element> extends UIBaseButton {
    private static readonly _ScratchParent = class extends UI.Node implements UI.Parent {
        public constructor() {
            super(UI.Node._INVALID_INDEX);
        }

        public set(id: number): void {
            this._id = id;
        }

        public get parent(): null {
            return null;
        }

        public get children(): readonly UI.Element[] {
            return [];
        }

        public getChild(): null {
            return null;
        }

        public get childCount(): number {
            return 0;
        }

        public forEachChild(): void {}
    };

    private static readonly _scratchParent = new UIContentButton._ScratchParent();

    protected static readonly _padding = new Float32Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _buttonWidgets = new Array<mod.UIWidget | null>(UIBaseButton.MAX_BUTTONS);

    protected static readonly _contents = new Array<UI.Element | null>(UIBaseButton.MAX_BUTTONS);

    private static readonly _baseRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    private static readonly _disabledRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    private static readonly _pressedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    private static readonly _focusedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    protected static _packRgba(color: Colors.Color, alpha: number): number {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        return (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    protected static _unpackColor(rgba: number, out?: Colors.Color): Colors.Color {
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

    protected static _unpackAlpha(rgba: number): number {
        return (rgba & 0xff) / 255;
    }

    protected static _setRgb(arr: Uint32Array, slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = arr[slot] & 0xff;
        arr[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    protected static _setAlpha(arr: Uint32Array, slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        arr[slot] = (arr[slot] & ~0xff) | aInt;
    }

    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent
    ) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const depth = params.depth ?? UI.Depth.AboveGameUI;
        const padding = params.padding ?? 0;
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeBgFillNone = UI.Element._getNativeBgFill(UI.BgFill.None);
        const nativeCenterAnchor = UI.Element._getNativeAnchor(UI.Anchor.Center);

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                Colors.toVector(UI.COLORS.WHITE),
                0,
                nativeBgFillNone,
                nativeDepth
            );
        } else {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                Colors.toVector(UI.COLORS.WHITE),
                0,
                nativeBgFillNone,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        const buttonName = `${name}_b`;
        const enabled = params.enabled ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? UI.BgFill.Solid;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        const nativeBtnBgFill = UI.Element._getNativeBgFill(bgFill);

        if (!receiver.nativeReceiver) {
            mod.AddUIButton(
                buttonName,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(width, height, 0),
                nativeCenterAnchor,
                this._uiWidget,
                true,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBtnBgFill,
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
                buttonName,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(width, height, 0),
                nativeCenterAnchor,
                this._uiWidget,
                true,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeBtnBgFill,
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

        const buttonWidget = mod.FindUIWidgetWithName(buttonName) as mod.UIWidget;
        const btnSlot = this._buttonSlot;

        UIContentButton._padding[btnSlot] = padding;
        UIContentButton._buttonWidgets[btnSlot] = buttonWidget;
        UIContentButton._baseRgba[btnSlot] = UIContentButton._packRgba(baseColor, baseAlpha);
        UIContentButton._disabledRgba[btnSlot] = UIContentButton._packRgba(disabledColor, disabledAlpha);
        UIContentButton._pressedRgba[btnSlot] = UIContentButton._packRgba(pressedColor, pressedAlpha);
        UIContentButton._focusedRgba[btnSlot] = UIContentButton._packRgba(focusedColor, focusedAlpha);

        if (params.onClickDown) {
            this._setButtonHandler(UIBaseButton.Event.ClickDown, params.onClickDown);
        }

        if (params.onClickUp) {
            this._setButtonHandler(UIBaseButton.Event.ClickUp, params.onClickUp);
        }

        if (params.onFocusIn) {
            this._setButtonHandler(UIBaseButton.Event.FocusIn, params.onFocusIn);
        }

        if (params.onFocusOut) {
            this._setButtonHandler(UIBaseButton.Event.FocusOut, params.onFocusOut);
        }

        const widthNetOfPadding = Math.max(0, width - padding * 2);
        const heightNetOfPadding = Math.max(0, height - padding * 2);

        UIContentButton._scratchParent.set(this._id);

        UIContentButton._contents[btnSlot] = createContent(
            UIContentButton._scratchParent,
            widthNetOfPadding,
            heightNetOfPadding
        );

        UIContentButton._scratchParent.set(UI.Node._INVALID_INDEX);
    }

    protected override get _buttonUIWidget(): mod.UIWidget | null {
        const btnSlot = this._buttonSlot;
        return btnSlot !== UIBaseButton._INVALID_INDEX ? UIContentButton._buttonWidgets[btnSlot] : null;
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const btnSlot = this._buttonSlot;

        if (btnSlot !== UIBaseButton._INVALID_INDEX) {
            UIContentButton._contents[btnSlot]?.delete();

            const buttonWidget = UIContentButton._buttonWidgets[btnSlot];

            if (buttonWidget) {
                mod.DeleteUIWidget(buttonWidget);
            }

            UIContentButton._contents[btnSlot] = null;
            UIContentButton._buttonWidgets[btnSlot] = null;
            UIContentButton._padding[btnSlot] = 0;
            UIContentButton._baseRgba[btnSlot] = 0;
            UIContentButton._disabledRgba[btnSlot] = 0;
            UIContentButton._pressedRgba[btnSlot] = 0;
            UIContentButton._focusedRgba[btnSlot] = 0;
        }

        super.delete();
    }

    /**
     * The wrapped content element, or undefined if deleted.
     * @returns The content element, or undefined if deleted.
     */
    public get content(): TContent | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : (UIContentButton._contents[btnSlot] as TContent);
    }

    /**
     * @inheritdoc
     * @returns The width in screen units, or undefined if deleted.
     */
    public override get width(): number | undefined {
        return super.width;
    }

    /**
     * @inheritdoc
     */
    public override set width(width: number) {
        this.setWidth(width);
    }

    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    public override setWidth(width: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        super.setWidth(width);

        mod.SetUIWidgetSize(UIContentButton._buttonWidgets[btnSlot]!, mod.CreateVector(width, this.height ?? 0, 0));

        const content = UIContentButton._contents[btnSlot];

        if (content) {
            content.width = Math.max(0, width - UIContentButton._padding[btnSlot] * 2);
        }

        return this;
    }

    /**
     * @inheritdoc
     * @returns The height in screen units, or undefined if deleted.
     */
    public override get height(): number | undefined {
        return super.height;
    }

    /**
     * @inheritdoc
     */
    public override set height(height: number) {
        this.setHeight(height);
    }

    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    public override setHeight(height: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        super.setHeight(height);

        mod.SetUIWidgetSize(UIContentButton._buttonWidgets[btnSlot]!, mod.CreateVector(this.width ?? 0, height, 0));

        const content = UIContentButton._contents[btnSlot];

        if (content) {
            content.height = Math.max(0, height - UIContentButton._padding[btnSlot] * 2);
        }

        return this;
    }

    /**
     * @inheritdoc
     * @returns The size object, or undefined if deleted.
     */
    public override get size(): UI.Size | undefined {
        return super.size;
    }

    /**
     * @inheritdoc
     */
    public override set size(params: UI.Size) {
        this.setSize(params);
    }

    /**
     * @inheritdoc
     * @returns This content button for chaining.
     */
    public override setSize(params: UI.Size): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        super.setSize(params);

        mod.SetUIWidgetSize(UIContentButton._buttonWidgets[btnSlot]!, mod.CreateVector(params.width, params.height, 0));

        const content = UIContentButton._contents[btnSlot];

        if (content) {
            content.size = {
                width: Math.max(0, params.width - UIContentButton._padding[btnSlot] * 2),
                height: Math.max(0, params.height - UIContentButton._padding[btnSlot] * 2),
            };
        }

        return this;
    }

    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public get enabled(): boolean | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : mod.GetUIButtonEnabled(UIContentButton._buttonWidgets[btnSlot]!);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * Hook invoked when the enabled state of the content button changes.
     * @param _enabled - Whether the button is enabled.
     */
    protected _setContentEnabled(_enabled: boolean): void {}

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This content button for chaining.
     */
    public setEnabled(enabled: boolean): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        mod.SetUIButtonEnabled(UIContentButton._buttonWidgets[btnSlot]!, enabled);
        this._setContentEnabled(enabled);

        return this;
    }

    /**
     * The padding of the content button, or undefined if deleted.
     * @returns The padding in pixels, or undefined if deleted.
     */
    public get padding(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX ? undefined : UIContentButton._padding[btnSlot];
    }

    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        this.setPadding(padding);
    }

    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     * @returns This content button for chaining.
     */
    public setPadding(padding: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._padding[btnSlot] = padding;
        mod.SetUIWidgetPadding(this._uiWidget, padding);

        return this;
    }

    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color, or undefined if deleted.
     */
    public get baseColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._baseRgba[btnSlot]);
    }

    /**
     * Retrieves the base color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The base color, or undefined if deleted.
     */
    public getBaseColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._baseRgba[btnSlot], out);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: Colors.Color) {
        this.setBaseColor(color);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This content button for chaining.
     */
    public setBaseColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setRgb(UIContentButton._baseRgba, btnSlot, color);
        mod.SetUIButtonColorBase(UIContentButton._buttonWidgets[btnSlot]!, Colors.toVector(color));

        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackAlpha(UIContentButton._baseRgba[btnSlot]);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        this.setBaseAlpha(alpha);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This content button for chaining.
     */
    public setBaseAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setAlpha(UIContentButton._baseRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaBase(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color, or undefined if deleted.
     */
    public get disabledColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._disabledRgba[btnSlot]);
    }

    /**
     * Retrieves the disabled color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled color, or undefined if deleted.
     */
    public getDisabledColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._disabledRgba[btnSlot], out);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: Colors.Color) {
        this.setDisabledColor(color);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This content button for chaining.
     */
    public setDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setRgb(UIContentButton._disabledRgba, btnSlot, color);
        mod.SetUIButtonColorDisabled(UIContentButton._buttonWidgets[btnSlot]!, Colors.toVector(color));

        return this;
    }

    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public get disabledAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackAlpha(UIContentButton._disabledRgba[btnSlot]);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        this.setDisabledAlpha(alpha);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This content button for chaining.
     */
    public setDisabledAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setAlpha(UIContentButton._disabledRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaDisabled(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color, or undefined if deleted.
     */
    public get pressedColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._pressedRgba[btnSlot]);
    }

    /**
     * Retrieves the pressed color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The pressed color, or undefined if deleted.
     */
    public getPressedColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._pressedRgba[btnSlot], out);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: Colors.Color) {
        this.setPressedColor(color);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This content button for chaining.
     */
    public setPressedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setRgb(UIContentButton._pressedRgba, btnSlot, color);
        mod.SetUIButtonColorPressed(UIContentButton._buttonWidgets[btnSlot]!, Colors.toVector(color));

        return this;
    }

    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public get pressedAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackAlpha(UIContentButton._pressedRgba[btnSlot]);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        this.setPressedAlpha(alpha);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This content button for chaining.
     */
    public setPressedAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setAlpha(UIContentButton._pressedRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaPressed(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color, or undefined if deleted.
     */
    public get focusedColor(): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._focusedRgba[btnSlot]);
    }

    /**
     * Retrieves the focused color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The focused color, or undefined if deleted.
     */
    public getFocusedColor(out?: Colors.Color): Colors.Color | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackColor(UIContentButton._focusedRgba[btnSlot], out);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: Colors.Color) {
        this.setFocusedColor(color);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This content button for chaining.
     */
    public setFocusedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setRgb(UIContentButton._focusedRgba, btnSlot, color);
        mod.SetUIButtonColorFocused(UIContentButton._buttonWidgets[btnSlot]!, Colors.toVector(color));

        return this;
    }

    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public get focusedAlpha(): number | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : UIContentButton._unpackAlpha(UIContentButton._focusedRgba[btnSlot]);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        this.setFocusedAlpha(alpha);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This content button for chaining.
     */
    public setFocusedAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIContentButton._setAlpha(UIContentButton._focusedRgba, btnSlot, alpha);
        mod.SetUIButtonAlphaFocused(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }
}

export namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    export type Params = UIBaseButton.Params & {
        padding?: number;
    };
}
