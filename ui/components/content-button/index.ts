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

    protected static readonly _contentRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _contentDisabledRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

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
        const slot = this._slot;
        const btnSlot = this._buttonSlot;

        UIContentButton._padding[btnSlot] = padding;
        UIContentButton._buttonWidgets[btnSlot] = buttonWidget;

        if (slot !== UI.Element._INVALID_INDEX && btnSlot !== UIBaseButton._INVALID_INDEX) {
            UI.Element._setForegroundAlpha(slot, baseAlpha);
            UI.Element._setForegroundColor(slot, baseColor);
            UIBaseButton._setAlpha(UIBaseButton._disabledRgba, btnSlot, disabledAlpha);
            UIBaseButton._setRgb(UIBaseButton._disabledRgba, btnSlot, disabledColor);
            UIBaseButton._setAlpha(UIBaseButton._pressedRgba, btnSlot, pressedAlpha);
            UIBaseButton._setRgb(UIBaseButton._pressedRgba, btnSlot, pressedColor);
            UIBaseButton._setAlpha(UIBaseButton._focusedRgba, btnSlot, focusedAlpha);
            UIBaseButton._setRgb(UIBaseButton._focusedRgba, btnSlot, focusedColor);
        }

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
            UIContentButton._contentRgba[btnSlot] = 0;
            UIContentButton._contentDisabledRgba[btnSlot] = 0;
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
}

export namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    export type Params = UIBaseButton.Params & {
        padding?: number;
    };
}
