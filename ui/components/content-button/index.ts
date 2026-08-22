import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 9.0.0
 */
export abstract class UIContentButton<TContent extends UI.Element> extends UI.Element implements UI.Button {
    private static readonly _scratchParent: {
        id: number;
        receiver: UI.Parent['receiver'];
        children: readonly UI.Element[];
        getChild(index: number): UI.Element | undefined;
        forEachChild(callback: (child: UI.Element, index: number) => void): void;
        attachChild(child: UI.Element): void;
        detachChild(child: UI.Element): void;
    } = {
        id: 0,
        receiver: undefined as unknown as UI.Parent['receiver'],
        children: [],
        getChild(): UI.Element | undefined {
            return undefined;
        },
        forEachChild(): void {},
        attachChild(child: UI.Element): void {
            if (this.id !== 0 && child.id !== UI.INVALID_INDEX) {
                UI.Element._attachChild(this.id, child.id);
            }
        },
        detachChild(child: UI.Element): void {
            if (this.id !== 0 && child.id !== UI.INVALID_INDEX) {
                UI.Element._detachChild(this.id, child.id);
            }
        },
    };

    protected _padding: number;

    protected _buttonWidget: mod.UIWidget;

    protected _content: TContent;

    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent
    ) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
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
                UI.Element._getNativeWidget(parent.id)!,
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
                UI.Element._getNativeWidget(parent.id)!,
                visible,
                padding,
                UI.COLORS.WHITE,
                0,
                mod.UIBgFill.None,
                depth,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        this._padding = padding;

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

        this._buttonWidget = mod.FindUIWidgetWithName(buttonName) as mod.UIWidget;

        const btnSlot = this._allocateButtonSlot();

        if (params.onClickDown) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonDown, true);
            this._setButtonOnClickDown(btnSlot, params.onClickDown);
        }

        if (params.onClickUp) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonUp, true);
            this._setButtonOnClickUp(btnSlot, params.onClickUp);
        }

        if (params.onFocusIn) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusIn, true);
            this._setButtonOnFocusIn(btnSlot, params.onFocusIn);
        }

        if (params.onFocusOut) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusOut, true);
            this._setButtonOnFocusOut(btnSlot, params.onFocusOut);
        }

        const widthNetOfPadding = Math.max(0, width - padding * 2);
        const heightNetOfPadding = Math.max(0, height - padding * 2);

        UIContentButton._scratchParent.id = id;
        UIContentButton._scratchParent.receiver = this.receiver;

        this._content = createContent(
            UIContentButton._scratchParent as unknown as UI.Parent,
            widthNetOfPadding,
            heightNetOfPadding
        );

        UIContentButton._scratchParent.id = 0;
        UIContentButton._scratchParent.receiver = undefined as unknown as UI.Parent['receiver'];
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this._isDeletedCheck()) return;

        if (this._content) {
            this._content.delete();
        }

        if (this._buttonWidget) {
            mod.DeleteUIWidget(this._buttonWidget);
        }

        super.delete();
    }

    /**
     * @inheritdoc
     */
    public override get width(): number {
        return super.width;
    }

    /**
     * @inheritdoc
     */
    public override set width(width: number) {
        if (this._isDeletedCheck()) return;

        super.width = width;
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(width, this.height, 0));
        this._content.width = Math.max(0, width - this._padding * 2);
    }

    /**
     * @inheritdoc
     */
    public override get height(): number {
        return super.height;
    }

    /**
     * @inheritdoc
     */
    public override set height(height: number) {
        if (this._isDeletedCheck()) return;

        super.height = height;
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(this.width, height, 0));
        this._content.height = Math.max(0, height - this._padding * 2);
    }

    /**
     * @inheritdoc
     */
    public override get size(): UI.Size {
        return super.size;
    }

    /**
     * @inheritdoc
     */
    public override set size(params: UI.Size) {
        if (this._isDeletedCheck()) return;

        super.size = params;
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(params.width, params.height, 0));

        this._content.size = {
            width: Math.max(0, params.width - this._padding * 2),
            height: Math.max(0, params.height - this._padding * 2),
        };
    }

    /**
     * Whether the button is enabled.
     * @returns True if enabled, false otherwise.
     */
    public get enabled(): boolean {
        return this._isDeletedCheck() ? false : mod.GetUIButtonEnabled(this._buttonWidget);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonEnabled(this._buttonWidget, enabled);
    }

    /**
     * The padding of the content button.
     * @returns The padding in pixels.
     */
    public get padding(): number {
        return this._padding;
    }

    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetPadding(this._uiWidget, (this._padding = padding));
    }

    /**
     * The base color of the button.
     * @returns The base color vector.
     */
    public get baseColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorBase(this._buttonWidget);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorBase(this._buttonWidget, color);
    }

    /**
     * The base alpha of the button.
     * @returns The base alpha opacity.
     */
    public get baseAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaBase(this._buttonWidget);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaBase(this._buttonWidget, alpha);
    }

    /**
     * The disabled color of the button.
     * @returns The disabled color vector.
     */
    public get disabledColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorDisabled(this._buttonWidget);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorDisabled(this._buttonWidget, color);
    }

    /**
     * The disabled alpha of the button.
     * @returns The disabled alpha opacity.
     */
    public get disabledAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaDisabled(this._buttonWidget);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaDisabled(this._buttonWidget, alpha);
    }

    /**
     * The pressed color of the button.
     * @returns The pressed color vector.
     */
    public get pressedColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorPressed(this._buttonWidget);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorPressed(this._buttonWidget, color);
    }

    /**
     * The pressed alpha of the button.
     * @returns The pressed alpha opacity.
     */
    public get pressedAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaPressed(this._buttonWidget);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaPressed(this._buttonWidget, alpha);
    }

    /**
     * The focused color of the button.
     * @returns The focused color vector.
     */
    public get focusedColor(): mod.Vector {
        return this._isDeletedCheck() ? UI.COLORS.WHITE : mod.GetUIButtonColorFocused(this._buttonWidget);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonColorFocused(this._buttonWidget, color);
    }

    /**
     * The focused alpha of the button.
     * @returns The focused alpha opacity.
     */
    public get focusedAlpha(): number {
        return this._isDeletedCheck() ? 1 : mod.GetUIButtonAlphaFocused(this._buttonWidget);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIButtonAlphaFocused(this._buttonWidget, alpha);
    }

    /**
     * The click down handler of the button.
     * @returns The click down handler, or undefined.
     */
    public get onClickDown(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnClickDown(this._getButtonSlot());
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickDown(btnSlot);

        if (onClickDown && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonDown, true);
        } else if (!onClickDown && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonDown, false);
        }

        this._setButtonOnClickDown(btnSlot, onClickDown);
    }

    /**
     * The click up handler of the button.
     * @returns The click up handler, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnClickUp(this._getButtonSlot());
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickUp(btnSlot);

        if (onClickUp && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonUp, true);
        } else if (!onClickUp && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonUp, false);
        }

        this._setButtonOnClickUp(btnSlot, onClickUp);
    }

    /**
     * The focus in handler of the button.
     * @returns The focus in handler, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnFocusIn(this._getButtonSlot());
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusIn(btnSlot);

        if (onFocusIn && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusIn, true);
        } else if (!onFocusIn && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusIn, false);
        }

        this._setButtonOnFocusIn(btnSlot, onFocusIn);
    }

    /**
     * The focus out handler of the button.
     * @returns The focus out handler, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | undefined {
        return this._isDeletedCheck() ? undefined : this._getButtonOnFocusOut(this._getButtonSlot());
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusOut(btnSlot);

        if (onFocusOut && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusOut, true);
        } else if (!onFocusOut && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusOut, false);
        }

        this._setButtonOnFocusOut(btnSlot, onFocusOut);
    }
}

export namespace UIContentButton {
    /**
     * The parameters for creating a new content button.
     */
    export type Params = UIButton.Params & {
        padding?: number;
    };
}
