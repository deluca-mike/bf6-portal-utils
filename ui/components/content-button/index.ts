import { UI } from '../../index.ts';
import { UIButton } from '../button/index.ts';

/**
 * Base class for buttons that contain content elements (Text, Image, etc.).
 * Handles the common pattern of wrapping a UIButton and content element in a UIContainer.
 * @template TContent - The type of the content element (Text, Image, etc.)
 * @template TContentProps - Array of property names to delegate from the content element
 * @version 6.1.1
 */
export abstract class UIContentButton<TContent extends UI.Element, TContentProps extends readonly string[]>
    extends UI.Element
{
    protected _padding: number;

    protected _button: UIButton;

    protected _content: TContent;

    // UIButton properties (delegated via delegateProperties).
    declare public baseColor: mod.Vector;
    declare public baseAlpha: number;
    declare public disabledColor: mod.Vector;
    declare public disabledAlpha: number;
    declare public pressedColor: mod.Vector;
    declare public pressedAlpha: number;
    declare public hoverColor: mod.Vector;
    declare public hoverAlpha: number;
    declare public focusedColor: mod.Vector;
    declare public focusedAlpha: number;
    declare public onClick: ((player: mod.Player) => Promise<void> | void) | undefined;

    // UIButton setter methods (delegated via delegateProperties).
    declare public setBaseColor: (color: mod.Vector) => this;
    declare public setBaseAlpha: (alpha: number) => this;
    declare public setDisabledColor: (color: mod.Vector) => this;
    declare public setDisabledAlpha: (alpha: number) => this;
    declare public setPressedColor: (color: mod.Vector) => this;
    declare public setPressedAlpha: (alpha: number) => this;
    declare public setHoverColor: (color: mod.Vector) => this;
    declare public setHoverAlpha: (alpha: number) => this;
    declare public setFocusedColor: (color: mod.Vector) => this;
    declare public setFocusedAlpha: (alpha: number) => this;
    declare public setOnClick: (onClick: ((player: mod.Player) => Promise<void> | void) | undefined) => this;

    /**
     * Creates a new content button.
     * @param params - The parameters for the content button.
     * @param createContent - A function to create the content element.
     * @param contentProperties - The properties to delegate from the content element.
     */
    protected constructor(
        params: UIContentButton.Params,
        createContent: (parent: UI.Parent, width: number, height: number) => TContent,
        contentProperties: TContentProps
    ) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName(parent, receiver);
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

        // Mock parent needed to allow proper wiring of the button and content elements, and we do not want `this` to
        // need to expose `children`, `attachChild`, and `detachChild`.
        const mockParent: UI.Parent = {
            name: this._name,
            uiWidget: this._uiWidget,
            receiver: this._receiver,
            children: [],
            attachChild(child: UI.Element): void {},
            detachChild(child: UI.Element): void {},
        };

        // Defaults will from from `UIButton` constructor.
        const buttonParams: UIButton.Params = {
            parent: mockParent,
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
            hoverColor: params.hoverColor,
            hoverAlpha: params.hoverAlpha,
            focusedColor: params.focusedColor,
            focusedAlpha: params.focusedAlpha,
            depth,
            onClick: params.onClick,
        };

        this._button = new UIButton(buttonParams);

        const widthNetOfPadding = Math.max(0, width - padding * 2);
        const heightNetOfPadding = Math.max(0, height - padding * 2);

        this._content = createContent(mockParent, widthNetOfPadding, heightNetOfPadding);

        // Delegate UIButton properties.
        UI.delegateProperties(this, this._button, [
            'bgColor',
            'bgAlpha',
            'bgFill',
            'baseColor',
            'baseAlpha',
            'disabledColor',
            'disabledAlpha',
            'pressedColor',
            'pressedAlpha',
            'focusedAlpha',
            'focusedColor',
            'hoverAlpha',
            'hoverColor',
            'onClick',
        ]);

        // Delegate content properties.
        UI.delegateProperties(this, this._content, contentProperties);
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
        this._button.setWidth(width);
        this._content.setWidth(Math.max(0, width - this._padding * 2));
    }

    /**
     * @inheritdoc
     */
    public override setWidth(width: number): this {
        this.width = width;
        return this;
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
        this._button.setHeight(height);
        this._content.setHeight(Math.max(0, height - this._padding * 2));
    }

    /**
     * @inheritdoc
     */
    public override setHeight(height: number): this {
        this.height = height;
        return this;
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
        this._button.setSize(params);

        this._content.setSize({
            width: Math.max(0, params.width - this._padding * 2),
            height: Math.max(0, params.height - this._padding * 2),
        });
    }

    /**
     * @inheritdoc
     */
    public override setSize(params: UI.Size): this {
        this.size = params;
        return this;
    }

    /**
     * Whether the button is enabled.
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
     * Sets whether the button is enabled. Useful for chaining operations.
     * @param enabled - The new enabled state.
     * @returns This element instance.
     */
    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    /**
     * The padding of the content button.
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
     * Sets the padding of the content button. Useful for chaining operations.
     * @param padding - The new padding.
     * @returns This element instance.
     */
    public setPadding(padding: number): this {
        this.padding = padding;
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
