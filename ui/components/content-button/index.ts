import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 10.0.0
 */
class ScratchParent extends UI.Node implements UI.Parent {
    public constructor() {
        super(UI.Node._INVALID_INDEX);
    }

    public set(id: number): void {
        this._id = id;
    }

    public get parent(): null {
        return null;
    }

    public getParent(): null {
        return null;
    }

    public get children(): readonly UI.Element[] {
        return [];
    }

    public getChildren(): readonly UI.Element[] {
        return [];
    }

    public getChild(): null {
        return null;
    }

    public getChildCount(): number {
        return 0;
    }

    public forEachChild(): void {}
}

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the pattern of wrapping a button and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 10.0.0
 */
export abstract class UIContentButton<TContent extends UI.Element> extends UI.Element implements UI.Button {
    private static readonly _scratchParent = new ScratchParent();

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

        UIContentButton._scratchParent.set(id);
        this._content = createContent(UIContentButton._scratchParent, widthNetOfPadding, heightNetOfPadding);
        UIContentButton._scratchParent.set(UI.Node._INVALID_INDEX);
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
     * The wrapped content element, or undefined if deleted.
     * @returns The content element, or undefined if deleted.
     */
    public get content(): TContent | undefined {
        return this.getContent();
    }

    /**
     * Retrieves the wrapped content element, or undefined if deleted.
     * @returns The content element, or undefined if deleted.
     */
    public getContent(): TContent | undefined {
        return this._isDeletedCheck() ? undefined : this._content;
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
        if (this._isDeletedCheck()) return this;

        super.setWidth(width);
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(width, this.height ?? 0, 0));
        this._content.width = Math.max(0, width - this._padding * 2);
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
        if (this._isDeletedCheck()) return this;

        super.setHeight(height);
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(this.width ?? 0, height, 0));
        this._content.height = Math.max(0, height - this._padding * 2);
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
        if (this._isDeletedCheck()) return this;

        super.setSize(params);
        mod.SetUIWidgetSize(this._buttonWidget, mod.CreateVector(params.width, params.height, 0));

        this._content.size = {
            width: Math.max(0, params.width - this._padding * 2),
            height: Math.max(0, params.height - this._padding * 2),
        };
        return this;
    }

    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public get enabled(): boolean | undefined {
        return this.getEnabled();
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * Retrieves whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public getEnabled(): boolean | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonEnabled(this._buttonWidget);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This content button for chaining.
     */
    public setEnabled(enabled: boolean): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonEnabled(this._buttonWidget, enabled);
        return this;
    }

    /**
     * The padding of the content button, or undefined if deleted.
     * @returns The padding in pixels, or undefined if deleted.
     */
    public get padding(): number | undefined {
        return this.getPadding();
    }

    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     */
    public set padding(padding: number) {
        this.setPadding(padding);
    }

    /**
     * Retrieves the padding of the content button, or undefined if deleted.
     * @returns The padding in pixels, or undefined if deleted.
     */
    public getPadding(): number | undefined {
        return this._isDeletedCheck() ? undefined : this._padding;
    }

    /**
     * Sets the padding of the content button.
     * @param padding - The new padding.
     * @returns This content button for chaining.
     */
    public setPadding(padding: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIWidgetPadding(this._uiWidget, (this._padding = padding));
        return this;
    }

    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    public get baseColor(): mod.Vector | undefined {
        return this.getBaseColor();
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        this.setBaseColor(color);
    }

    /**
     * Retrieves the base color of the button, or undefined if deleted.
     * @returns The base color vector, or undefined if deleted.
     */
    public getBaseColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorBase(this._buttonWidget);
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This content button for chaining.
     */
    public setBaseColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorBase(this._buttonWidget, color);
        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        return this.getBaseAlpha();
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        this.setBaseAlpha(alpha);
    }

    /**
     * Retrieves the base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public getBaseAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaBase(this._buttonWidget);
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This content button for chaining.
     */
    public setBaseAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaBase(this._buttonWidget, alpha);
        return this;
    }

    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public get disabledColor(): mod.Vector | undefined {
        return this.getDisabledColor();
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        this.setDisabledColor(color);
    }

    /**
     * Retrieves the disabled color of the button, or undefined if deleted.
     * @returns The disabled color vector, or undefined if deleted.
     */
    public getDisabledColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorDisabled(this._buttonWidget);
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This content button for chaining.
     */
    public setDisabledColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorDisabled(this._buttonWidget, color);
        return this;
    }

    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public get disabledAlpha(): number | undefined {
        return this.getDisabledAlpha();
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        this.setDisabledAlpha(alpha);
    }

    /**
     * Retrieves the disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    public getDisabledAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaDisabled(this._buttonWidget);
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This content button for chaining.
     */
    public setDisabledAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaDisabled(this._buttonWidget, alpha);
        return this;
    }

    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public get pressedColor(): mod.Vector | undefined {
        return this.getPressedColor();
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        this.setPressedColor(color);
    }

    /**
     * Retrieves the pressed color of the button, or undefined if deleted.
     * @returns The pressed color vector, or undefined if deleted.
     */
    public getPressedColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorPressed(this._buttonWidget);
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This content button for chaining.
     */
    public setPressedColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorPressed(this._buttonWidget, color);
        return this;
    }

    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public get pressedAlpha(): number | undefined {
        return this.getPressedAlpha();
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        this.setPressedAlpha(alpha);
    }

    /**
     * Retrieves the pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    public getPressedAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaPressed(this._buttonWidget);
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This content button for chaining.
     */
    public setPressedAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaPressed(this._buttonWidget, alpha);
        return this;
    }

    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public get focusedColor(): mod.Vector | undefined {
        return this.getFocusedColor();
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        this.setFocusedColor(color);
    }

    /**
     * Retrieves the focused color of the button, or undefined if deleted.
     * @returns The focused color vector, or undefined if deleted.
     */
    public getFocusedColor(): mod.Vector | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonColorFocused(this._buttonWidget);
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This content button for chaining.
     */
    public setFocusedColor(color: mod.Vector): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonColorFocused(this._buttonWidget, color);
        return this;
    }

    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public get focusedAlpha(): number | undefined {
        return this.getFocusedAlpha();
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        this.setFocusedAlpha(alpha);
    }

    /**
     * Retrieves the focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    public getFocusedAlpha(): number | undefined {
        return this._isDeletedCheck() ? undefined : mod.GetUIButtonAlphaFocused(this._buttonWidget);
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This content button for chaining.
     */
    public setFocusedAlpha(alpha: number): this {
        if (this._isDeletedCheck()) return this;

        mod.SetUIButtonAlphaFocused(this._buttonWidget, alpha);
        return this;
    }

    /**
     * The click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    public get onClickDown(): UI.ButtonHandler | null | undefined {
        return this.getOnClickDown();
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | null | undefined) {
        this.setOnClickDown(onClickDown);
    }

    /**
     * Retrieves the click down handler of the button, null if unset, or undefined if deleted.
     * @returns The click down handler, null, or undefined.
     */
    public getOnClickDown(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnClickDown(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     * @returns This content button for chaining.
     */
    public setOnClickDown(onClickDown?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickDown(btnSlot);

        if (onClickDown && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonDown, true);
        } else if (!onClickDown && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonDown, false);
        }

        this._setButtonOnClickDown(btnSlot, onClickDown);
        return this;
    }

    /**
     * The click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | null | undefined {
        return this.getOnClickUp();
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | null | undefined) {
        this.setOnClickUp(onClickUp);
    }

    /**
     * Retrieves the click up handler of the button, null if unset, or undefined if deleted.
     * @returns The click up handler, null, or undefined.
     */
    public getOnClickUp(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnClickUp(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     * @returns This content button for chaining.
     */
    public setOnClickUp(onClickUp?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnClickUp(btnSlot);

        if (onClickUp && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonUp, true);
        } else if (!onClickUp && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.ButtonUp, false);
        }

        this._setButtonOnClickUp(btnSlot, onClickUp);
        return this;
    }

    /**
     * The focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | null | undefined {
        return this.getOnFocusIn();
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | null | undefined) {
        this.setOnFocusIn(onFocusIn);
    }

    /**
     * Retrieves the focus in handler of the button, null if unset, or undefined if deleted.
     * @returns The focus in handler, null, or undefined.
     */
    public getOnFocusIn(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnFocusIn(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     * @returns This content button for chaining.
     */
    public setOnFocusIn(onFocusIn?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusIn(btnSlot);

        if (onFocusIn && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusIn, true);
        } else if (!onFocusIn && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusIn, false);
        }

        this._setButtonOnFocusIn(btnSlot, onFocusIn);
        return this;
    }

    /**
     * The focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | null | undefined {
        return this.getOnFocusOut();
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | null | undefined) {
        this.setOnFocusOut(onFocusOut);
    }

    /**
     * Retrieves the focus out handler of the button, null if unset, or undefined if deleted.
     * @returns The focus out handler, null, or undefined.
     */
    public getOnFocusOut(): UI.ButtonHandler | null | undefined {
        return this._isDeletedCheck() ? undefined : (this._getButtonOnFocusOut(this._getButtonSlot()) ?? null);
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     * @returns This content button for chaining.
     */
    public setOnFocusOut(onFocusOut?: UI.ButtonHandler | null): this {
        if (this._isDeletedCheck()) return this;

        const btnSlot = this._getButtonSlot();
        const prev = this._getButtonOnFocusOut(btnSlot);

        if (onFocusOut && !prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusOut, true);
        } else if (!onFocusOut && prev) {
            mod.EnableUIButtonEvent(this._buttonWidget, mod.UIButtonEvent.FocusOut, false);
        }

        this._setButtonOnFocusOut(btnSlot, onFocusOut);
        return this;
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
