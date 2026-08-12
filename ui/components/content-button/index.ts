import { UI } from '../../index.ts';
import { UIBaseButton } from '../base-button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 9.0.0
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
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const padding = params.padding ?? 0;
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                UI.COLORS.WHITE,
                0,
                mod.UIBgFill.None,
                depth
            );
        } else {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                padding,
                UI.COLORS.WHITE,
                0,
                mod.UIBgFill.None,
                depth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        const buttonName = `${name}_b`;
        const enabled = params.enabled ?? true;
        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? mod.UIBgFill.Solid;
        const baseColor = params.baseColor ?? UI.COLORS.BF_GREY_2;
        const baseAlpha = params.baseAlpha ?? 1;
        const disabledColor = params.disabledColor ?? UI.COLORS.BF_GREY_3;
        const disabledAlpha = params.disabledAlpha ?? 1;
        const pressedColor = params.pressedColor ?? UI.COLORS.BF_GREEN_BRIGHT;
        const pressedAlpha = params.pressedAlpha ?? 1;
        const focusedColor = params.focusedColor ?? UI.COLORS.BF_GREY_1;
        const focusedAlpha = params.focusedAlpha ?? 1;

        if (!receiver.nativeReceiver) {
            mod.AddUIButton(
                buttonName,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(width, height, 0),
                mod.UIAnchor.Center,
                this._uiWidget,
                true,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                enabled,
                baseColor,
                baseAlpha,
                disabledColor,
                disabledAlpha,
                pressedColor,
                pressedAlpha,
                focusedColor,
                focusedAlpha,
                focusedColor,
                focusedAlpha,
                depth
            );
        } else {
            mod.AddUIButton(
                buttonName,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(width, height, 0),
                mod.UIAnchor.Center,
                this._uiWidget,
                true,
                0,
                bgColor,
                bgAlpha,
                bgFill,
                enabled,
                baseColor,
                baseAlpha,
                disabledColor,
                disabledAlpha,
                pressedColor,
                pressedAlpha,
                focusedColor,
                focusedAlpha,
                focusedColor,
                focusedAlpha,
                depth,
                receiver.nativeReceiver
            );
        }

        const buttonWidget = mod.FindUIWidgetWithName(buttonName) as mod.UIWidget;
        const btnSlot = this._buttonSlot;

        UIContentButton._padding[btnSlot] = padding;
        UIContentButton._buttonWidgets[btnSlot] = buttonWidget;

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
     * @returns The base color vector, or undefined if deleted.
     */
    public get baseColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : mod.GetUIButtonColorBase(UIContentButton._buttonWidgets[btnSlot]!);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        this.setBaseColor(color);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This content button for chaining.
     */
    public setBaseColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        mod.SetUIButtonColorBase(UIContentButton._buttonWidgets[btnSlot]!, color);

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
            : mod.GetUIButtonAlphaBase(UIContentButton._buttonWidgets[btnSlot]!);
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

        mod.SetUIButtonAlphaBase(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public get disabledColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : mod.GetUIButtonColorDisabled(UIContentButton._buttonWidgets[btnSlot]!);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        this.setDisabledColor(color);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This content button for chaining.
     */
    public setDisabledColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        mod.SetUIButtonColorDisabled(UIContentButton._buttonWidgets[btnSlot]!, color);

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
            : mod.GetUIButtonAlphaDisabled(UIContentButton._buttonWidgets[btnSlot]!);
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

        mod.SetUIButtonAlphaDisabled(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public get pressedColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : mod.GetUIButtonColorPressed(UIContentButton._buttonWidgets[btnSlot]!);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        this.setPressedColor(color);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This content button for chaining.
     */
    public setPressedColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        mod.SetUIButtonColorPressed(UIContentButton._buttonWidgets[btnSlot]!, color);

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
            : mod.GetUIButtonAlphaPressed(UIContentButton._buttonWidgets[btnSlot]!);
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

        mod.SetUIButtonAlphaPressed(UIContentButton._buttonWidgets[btnSlot]!, alpha);

        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public get focusedColor(): mod.Vector | undefined {
        const btnSlot = this._buttonSlot;

        return btnSlot === UIBaseButton._INVALID_INDEX
            ? undefined
            : mod.GetUIButtonColorFocused(UIContentButton._buttonWidgets[btnSlot]!);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        this.setFocusedColor(color);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This content button for chaining.
     */
    public setFocusedColor(color: mod.Vector): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        mod.SetUIButtonColorFocused(UIContentButton._buttonWidgets[btnSlot]!, color);

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
            : mod.GetUIButtonAlphaFocused(UIContentButton._buttonWidgets[btnSlot]!);
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
