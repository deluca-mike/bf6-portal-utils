import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @version 8.0.0
 */
export abstract class UIContentButton<TContent extends UI.Element> extends UI.Element {
    private static readonly _scratchParent: UI.Parent = {
        uiWidget: undefined as unknown as mod.UIWidget,
        receiver: undefined as unknown as UI.Parent['receiver'],
        children: [],
        getChild(): UI.Element | undefined {
            return undefined;
        },
        forEachChild(): void {},
        attachChild(): void {},
        detachChild(): void {},
    };

    protected _padding: number;

    protected _button: UIButton;

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
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName();
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const padding = params.padding ?? 0;

        const containerElementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const containerArgs: [
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
            mod.UIDepth, // depth
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            containerElementParams.anchor,
            parent.uiWidget,
            containerElementParams.visible,
            padding,
            containerElementParams.bgColor,
            containerElementParams.bgAlpha,
            containerElementParams.bgFill,
            containerElementParams.depth,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIContainer(...containerArgs);
        } else {
            mod.AddUIContainer(...containerArgs, receiver.nativeReceiver);
        }

        super(containerElementParams);

        this._padding = padding;

        // Scratch parent temporarily routes underlying widget and receiver to child button and content
        // elements during synchronous construction without exposing parent methods on this element.
        UIContentButton._scratchParent.uiWidget = this._uiWidget;
        UIContentButton._scratchParent.receiver = this._receiver;

        const buttonParams: UIButton.Params = {
            parent: UIContentButton._scratchParent,
            width,
            height,
            bgColor: params.bgColor,
            bgAlpha: params.bgAlpha,
            bgFill: params.bgFill,
            enabled: params.enabled,
            baseColor: params.baseColor,
            baseAlpha: params.baseAlpha,
            disabledColor: params.disabledColor,
            disabledAlpha: params.disabledAlpha,
            pressedColor: params.pressedColor,
            pressedAlpha: params.pressedAlpha,
            focusedColor: params.focusedColor,
            focusedAlpha: params.focusedAlpha,
            depth,
            onClickDown: params.onClickDown,
            onClickUp: params.onClickUp,
            onFocusIn: params.onFocusIn,
            onFocusOut: params.onFocusOut,
        };

        this._button = new UIButton(buttonParams);

        const widthNetOfPadding = Math.max(0, width - padding * 2);
        const heightNetOfPadding = Math.max(0, height - padding * 2);

        this._content = createContent(UIContentButton._scratchParent, widthNetOfPadding, heightNetOfPadding);

        UIContentButton._scratchParent.uiWidget = undefined as unknown as mod.UIWidget;
        UIContentButton._scratchParent.receiver = undefined as unknown as UI.Parent['receiver'];
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        this._button.delete();
        this._content.delete();

        super.delete();
    }

    /**
     * @inheritdoc
     */
    public override get width(): number {
        return this._button.width;
    }

    /**
     * @inheritdoc
     */
    public override set width(width: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, this.height, 0));
        this._button.width = width;
        this._content.width = Math.max(0, width - this._padding * 2);
    }

    /**
     * @inheritdoc
     */
    public override get height(): number {
        return this._button.height;
    }

    /**
     * @inheritdoc
     */
    public override set height(height: number) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(this.width, height, 0));
        this._button.height = height;
        this._content.height = Math.max(0, height - this._padding * 2);
    }

    /**
     * @inheritdoc
     */
    public override get size(): UI.Size {
        return { width: this._button.width, height: this._button.height };
    }

    /**
     * @inheritdoc
     */
    public override set size(params: UI.Size) {
        if (this._isDeletedCheck()) return;

        mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
        this._button.size = params;

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
        return this._button.enabled;
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        if (this._isDeletedCheck()) return;

        this._button.enabled = enabled;
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
        return this._button.baseColor;
    }

    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    public set baseColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._button.baseColor = color;
    }

    /**
     * The base alpha of the button.
     * @returns The base alpha opacity.
     */
    public get baseAlpha(): number {
        return this._button.baseAlpha;
    }

    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    public set baseAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._button.baseAlpha = alpha;
    }

    /**
     * The disabled color of the button.
     * @returns The disabled color vector.
     */
    public get disabledColor(): mod.Vector {
        return this._button.disabledColor;
    }

    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    public set disabledColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._button.disabledColor = color;
    }

    /**
     * The disabled alpha of the button.
     * @returns The disabled alpha opacity.
     */
    public get disabledAlpha(): number {
        return this._button.disabledAlpha;
    }

    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    public set disabledAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._button.disabledAlpha = alpha;
    }

    /**
     * The pressed color of the button.
     * @returns The pressed color vector.
     */
    public get pressedColor(): mod.Vector {
        return this._button.pressedColor;
    }

    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    public set pressedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._button.pressedColor = color;
    }

    /**
     * The pressed alpha of the button.
     * @returns The pressed alpha opacity.
     */
    public get pressedAlpha(): number {
        return this._button.pressedAlpha;
    }

    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    public set pressedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._button.pressedAlpha = alpha;
    }

    /**
     * The focused color of the button.
     * @returns The focused color vector.
     */
    public get focusedColor(): mod.Vector {
        return this._button.focusedColor;
    }

    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    public set focusedColor(color: mod.Vector) {
        if (this._isDeletedCheck()) return;

        this._button.focusedColor = color;
    }

    /**
     * The focused alpha of the button.
     * @returns The focused alpha opacity.
     */
    public get focusedAlpha(): number {
        return this._button.focusedAlpha;
    }

    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    public set focusedAlpha(alpha: number) {
        if (this._isDeletedCheck()) return;

        this._button.focusedAlpha = alpha;
    }

    /**
     * The click down handler of the button.
     * @returns The click down handler, or undefined.
     */
    public get onClickDown(): UI.ButtonHandler | undefined {
        return this._button.onClickDown;
    }

    /**
     * Sets the click down handler of the button.
     * @param onClickDown - The new click down handler.
     */
    public set onClickDown(onClickDown: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        this._button.onClickDown = onClickDown;
    }

    /**
     * The click up handler of the button.
     * @returns The click up handler, or undefined.
     */
    public get onClickUp(): UI.ButtonHandler | undefined {
        return this._button.onClickUp;
    }

    /**
     * Sets the click up handler of the button.
     * @param onClickUp - The new click up handler.
     */
    public set onClickUp(onClickUp: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        this._button.onClickUp = onClickUp;
    }

    /**
     * The focus in handler of the button.
     * @returns The focus in handler, or undefined.
     */
    public get onFocusIn(): UI.ButtonHandler | undefined {
        return this._button.onFocusIn;
    }

    /**
     * Sets the focus in handler of the button.
     * @param onFocusIn - The new focus in handler.
     */
    public set onFocusIn(onFocusIn: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        this._button.onFocusIn = onFocusIn;
    }

    /**
     * The focus out handler of the button.
     * @returns The focus out handler, or undefined.
     */
    public get onFocusOut(): UI.ButtonHandler | undefined {
        return this._button.onFocusOut;
    }

    /**
     * Sets the focus out handler of the button.
     * @param onFocusOut - The new focus out handler.
     */
    public set onFocusOut(onFocusOut: UI.ButtonHandler | undefined) {
        if (this._isDeletedCheck()) return;

        this._button.onFocusOut = onFocusOut;
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
