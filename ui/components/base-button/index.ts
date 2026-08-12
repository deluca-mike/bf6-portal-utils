import { CallbackHandler } from '../../../callback-handler/index.ts';
import { Events } from '../../../events/index.ts';
import { UI } from '../../index.ts';

// version: 1.0.0
export abstract class UIBaseButton extends UI.Element {
    /**
     * The maximum number of button widgets that can exist concurrently in memory.
     */
    public static readonly MAX_BUTTONS = 512;

    protected static readonly _MAX_GENERATIONS = 65_535;

    protected static _activeButtonCount: number = 0;

    protected static _firstFreeButton: number = 0;

    protected static readonly _generations = new Uint16Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _nextFreeButton = new Int16Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _elementToButtonSlot = new Int16Array(UI.MAX_ELEMENTS);

    protected static readonly _buttonOnClickUp = new Array<UI.ButtonHandler | null>(UIBaseButton.MAX_BUTTONS);

    protected static readonly _buttonOnClickDown = new Array<UI.ButtonHandler | null>(UIBaseButton.MAX_BUTTONS);

    protected static readonly _buttonOnFocusIn = new Array<UI.ButtonHandler | null>(UIBaseButton.MAX_BUTTONS);

    protected static readonly _buttonOnFocusOut = new Array<UI.ButtonHandler | null>(UIBaseButton.MAX_BUTTONS);

    static {
        for (let i = 0; i < UIBaseButton.MAX_BUTTONS - 1; ++i) {
            UIBaseButton._nextFreeButton[i] = i + 1;
        }

        UIBaseButton._nextFreeButton[UIBaseButton.MAX_BUTTONS - 1] = UIBaseButton._INVALID_INDEX;

        UIBaseButton._generations.fill(0);
        UIBaseButton._buttonOnClickUp.fill(null);
        UIBaseButton._buttonOnClickDown.fill(null);
        UIBaseButton._buttonOnFocusIn.fill(null);
        UIBaseButton._buttonOnFocusOut.fill(null);
        UIBaseButton._elementToButtonSlot.fill(UIBaseButton._INVALID_INDEX);

        Events.OnPlayerUIButtonEvent.subscribe(UIBaseButton._handleButtonEvent);
    }

    /**
     * Returns the number of active button elements.
     * @returns The active button count.
     */
    public static getActiveButtonCount(): number {
        return UIBaseButton._activeButtonCount;
    }

    /**
     * Resolves the 0-based button slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based button slot index (0 to MAX_BUTTONS - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveButtonSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UIBaseButton._INVALID_INDEX;

        return UIBaseButton._elementToButtonSlot[elementSlot];
    }

    /**
     * Handles a button event with zero intermediate object allocations.
     * @param player - The player who triggered the button event.
     * @param widget - The widget that was triggered.
     * @param event - The button event.
     */
    private static _handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        const name = mod.GetUIWidgetName(widget);
        const match = /^ui_(\d+)/.exec(name);
        const elementId = match ? parseInt(match[1], 10) : NaN;

        if (isNaN(elementId) || elementId <= 0) return;

        const slot = UIBaseButton._resolveButtonSlot(elementId);

        if (slot === UIBaseButton._INVALID_INDEX) {
            UIBaseButton._logging.log(`Button ${name} not found or slot unassigned`, UI.LogLevel.Warning);
            return;
        }

        let handler: UI.ButtonHandler | null = null;

        if (mod.Equals(event, mod.UIButtonEvent.ButtonUp)) {
            handler = UIBaseButton._buttonOnClickUp[slot];

            if (!handler) {
                UIBaseButton._logging.log(`Button ${name} has no onClickUp handler`, UI.LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.ButtonDown)) {
            handler = UIBaseButton._buttonOnClickDown[slot];

            if (!handler) {
                UIBaseButton._logging.log(`Button ${name} has no onClickDown handler`, UI.LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusIn)) {
            handler = UIBaseButton._buttonOnFocusIn[slot];

            if (!handler) {
                UIBaseButton._logging.log(`Button ${name} has no onFocusIn handler`, UI.LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusOut)) {
            handler = UIBaseButton._buttonOnFocusOut[slot];

            if (!handler) {
                UIBaseButton._logging.log(`Button ${name} has no onFocusOut handler`, UI.LogLevel.Warning);
                return;
            }
        }

        if (!handler) {
            UIBaseButton._logging.log('HoverIn and HoverOut button events not supported', UI.LogLevel.Warning);
            return;
        }

        CallbackHandler.invoke(handler, player, undefined, undefined, undefined, UIBaseButton._logging, 'buttonEvent');
    }

    /**
     * Allocates a button slot for this button instance.
     * @returns The allocated button slot index (0 to MAX_BUTTONS - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateButtonSlot(): number {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return UIBaseButton._INVALID_INDEX;

        if (UIBaseButton._firstFreeButton === UIBaseButton._INVALID_INDEX) {
            UIBaseButton._logging.log('Button pool is full', UI.LogLevel.Error);
            return UIBaseButton._INVALID_INDEX;
        }

        const slot = UIBaseButton._firstFreeButton;

        UIBaseButton._firstFreeButton = UIBaseButton._nextFreeButton[slot];
        UIBaseButton._nextFreeButton[slot] = UIBaseButton._INVALID_INDEX;
        UIBaseButton._buttonOnClickUp[slot] = null;
        UIBaseButton._buttonOnClickDown[slot] = null;
        UIBaseButton._buttonOnFocusIn[slot] = null;
        UIBaseButton._buttonOnFocusOut[slot] = null;
        UIBaseButton._elementToButtonSlot[elementSlot] = slot;

        UIBaseButton._activeButtonCount++;

        return slot;
    }

    /**
     * Frees the button slot associated with this button instance.
     */
    private _freeButtonSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const slot = UIBaseButton._elementToButtonSlot[elementSlot];

        if (slot === UIBaseButton._INVALID_INDEX || slot < 0 || slot >= UIBaseButton.MAX_BUTTONS) return;

        UIBaseButton._buttonOnClickUp[slot] = null;
        UIBaseButton._buttonOnClickDown[slot] = null;
        UIBaseButton._buttonOnFocusIn[slot] = null;
        UIBaseButton._buttonOnFocusOut[slot] = null;
        UIBaseButton._elementToButtonSlot[elementSlot] = UIBaseButton._INVALID_INDEX;

        UIBaseButton._activeButtonCount--;

        if (UIBaseButton._generations[slot] < UIBaseButton._MAX_GENERATIONS) {
            UIBaseButton._generations[slot]++;
            UIBaseButton._nextFreeButton[slot] = UIBaseButton._firstFreeButton;
            UIBaseButton._firstFreeButton = slot;
        } else if (UIBaseButton._logging.willLog(UI.LogLevel.Warning)) {
            UIBaseButton._logging.log(
                `Button slot ${slot} exhausted max generations and was retired`,
                UI.LogLevel.Warning
            );
        }
    }

    /**
     * The native button UIWidget handle associated with this button instance.
     * Concrete subclasses should return their actual button UIWidget handle.
     * @returns The native button UIWidget handle, or null if not available.
     */
    protected get _buttonUIWidget(): mod.UIWidget | null {
        return this._uiWidget;
    }

    protected get _buttonSlot(): number {
        const slot = this._slot;

        return slot !== UI.Element._INVALID_INDEX
            ? UIBaseButton._elementToButtonSlot[slot]
            : UIBaseButton._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._buttonSlot !== UIBaseButton._INVALID_INDEX;
    }

    /**
     * Resolves the 0-based button slot for this button instance and logs a warning if invalid.
     * @returns The 0-based button slot index (0 to MAX_BUTTONS - 1), or -1 if invalid or unallocated.
     */
    protected _resolveButtonSlotAndLogWarning(): number {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return UIBaseButton._INVALID_INDEX;

        const btnSlot = UIBaseButton._elementToButtonSlot[elementSlot];

        if (btnSlot === UIBaseButton._INVALID_INDEX) {
            UIBaseButton._logging.log(`Button is deleted`, UI.LogLevel.Warning);
            return UIBaseButton._INVALID_INDEX;
        }

        return btnSlot;
    }

    protected override _getIsInvalidAndLogWarning(): boolean {
        return this._resolveButtonSlotAndLogWarning() === UIBaseButton._INVALID_INDEX;
    }

    /**
     * Retrieves the button handler for this element and event type.
     * @param event - The internal button event type.
     * @returns The registered handler, null if unset, or undefined if invalid.
     */
    protected _getButtonHandler(event: UIBaseButton.Event): UI.ButtonHandler | null | undefined {
        const btnSlot = this._buttonSlot;

        if (btnSlot === UIBaseButton._INVALID_INDEX) return undefined;

        switch (event) {
            case UIBaseButton.Event.ClickUp:
                return UIBaseButton._buttonOnClickUp[btnSlot] ?? null;
            case UIBaseButton.Event.ClickDown:
                return UIBaseButton._buttonOnClickDown[btnSlot] ?? null;
            case UIBaseButton.Event.FocusIn:
                return UIBaseButton._buttonOnFocusIn[btnSlot] ?? null;
            case UIBaseButton.Event.FocusOut:
                return UIBaseButton._buttonOnFocusOut[btnSlot] ?? null;
            default:
                return undefined;
        }
    }

    /**
     * Sets or clears a button event handler, enabling or disabling engine events as needed.
     * @param event - The internal button event type.
     * @param handler - The handler callback, or null/undefined to clear.
     */
    protected _setButtonHandler(event: UIBaseButton.Event, handler?: UI.ButtonHandler | null): void {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return;

        const buttonWidget = this._buttonUIWidget;

        if (!buttonWidget) return;

        let prev: UI.ButtonHandler | null = null;
        let nativeEvent: mod.UIButtonEvent;

        switch (event) {
            case UIBaseButton.Event.ClickUp:
                prev = UIBaseButton._buttonOnClickUp[btnSlot];
                UIBaseButton._buttonOnClickUp[btnSlot] = handler ?? null;
                nativeEvent = mod.UIButtonEvent.ButtonUp;
                break;
            case UIBaseButton.Event.ClickDown:
                prev = UIBaseButton._buttonOnClickDown[btnSlot];
                UIBaseButton._buttonOnClickDown[btnSlot] = handler ?? null;
                nativeEvent = mod.UIButtonEvent.ButtonDown;
                break;
            case UIBaseButton.Event.FocusIn:
                prev = UIBaseButton._buttonOnFocusIn[btnSlot];
                UIBaseButton._buttonOnFocusIn[btnSlot] = handler ?? null;
                nativeEvent = mod.UIButtonEvent.FocusIn;
                break;
            case UIBaseButton.Event.FocusOut:
                prev = UIBaseButton._buttonOnFocusOut[btnSlot];
                UIBaseButton._buttonOnFocusOut[btnSlot] = handler ?? null;
                nativeEvent = mod.UIButtonEvent.FocusOut;
                break;
            default:
                return;
        }

        if (handler && !prev) {
            mod.EnableUIButtonEvent(buttonWidget, nativeEvent, true);
        } else if (!handler && prev) {
            mod.EnableUIButtonEvent(buttonWidget, nativeEvent, false);
        }
    }

    /**
     * Initializes the base button element.
     * Allocates both the underlying UI.Element slot and the button slot.
     * @param params - The initialization parameters for the button.
     */
    protected constructor(params?: UIBaseButton.Params) {
        super(params);

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        const btnSlot = this._allocateButtonSlot();

        if (btnSlot === UIBaseButton._INVALID_INDEX) {
            this.delete();
            return;
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this._getIsInvalidAndLogWarning()) return;

        this._freeButtonSlot();
        super.delete();
    }

    /**
     * The callback invoked when the button is clicked up, or undefined if deleted.
     * @returns The click up handler, null if unset, or undefined if deleted.
     */
    public get onClickUp(): UI.ButtonHandler | null | undefined {
        return this._isValid ? this._getButtonHandler(UIBaseButton.Event.ClickUp) : undefined;
    }

    /**
     * Sets the callback invoked when the button is clicked up.
     * @param handler - The click up handler callback, or null to clear.
     */
    public set onClickUp(handler: UI.ButtonHandler | null) {
        this.setOnClickUp(handler);
    }

    /**
     * Sets the callback invoked when the button is clicked up.
     * @param handler - The click up handler callback, or null to clear.
     * @returns This button for chaining.
     */
    public setOnClickUp(handler?: UI.ButtonHandler | null): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this._setButtonHandler(UIBaseButton.Event.ClickUp, handler);

        return this;
    }

    /**
     * The callback invoked when the button is clicked down, or undefined if deleted.
     * @returns The click down handler, null if unset, or undefined if deleted.
     */
    public get onClickDown(): UI.ButtonHandler | null | undefined {
        return this._isValid ? this._getButtonHandler(UIBaseButton.Event.ClickDown) : undefined;
    }

    /**
     * Sets the callback invoked when the button is clicked down.
     * @param handler - The click down handler callback, or null to clear.
     */
    public set onClickDown(handler: UI.ButtonHandler | null) {
        this.setOnClickDown(handler);
    }

    /**
     * Sets the callback invoked when the button is clicked down.
     * @param handler - The click down handler callback, or null to clear.
     * @returns This button for chaining.
     */
    public setOnClickDown(handler?: UI.ButtonHandler | null): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this._setButtonHandler(UIBaseButton.Event.ClickDown, handler);

        return this;
    }

    /**
     * The callback invoked when the button receives focus, or undefined if deleted.
     * @returns The focus in handler, null if unset, or undefined if deleted.
     */
    public get onFocusIn(): UI.ButtonHandler | null | undefined {
        return this._isValid ? this._getButtonHandler(UIBaseButton.Event.FocusIn) : undefined;
    }

    /**
     * Sets the callback invoked when the button receives focus.
     * @param handler - The focus in handler callback, or null to clear.
     */
    public set onFocusIn(handler: UI.ButtonHandler | null) {
        this.setOnFocusIn(handler);
    }

    /**
     * Sets the callback invoked when the button receives focus.
     * @param handler - The focus in handler callback, or null to clear.
     * @returns This button for chaining.
     */
    public setOnFocusIn(handler?: UI.ButtonHandler | null): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this._setButtonHandler(UIBaseButton.Event.FocusIn, handler);

        return this;
    }

    /**
     * The callback invoked when the button loses focus, or undefined if deleted.
     * @returns The focus out handler, null if unset, or undefined if deleted.
     */
    public get onFocusOut(): UI.ButtonHandler | null | undefined {
        return this._isValid ? this._getButtonHandler(UIBaseButton.Event.FocusOut) : undefined;
    }

    /**
     * Sets the callback invoked when the button loses focus.
     * @param handler - The focus out handler callback, or null to clear.
     */
    public set onFocusOut(handler: UI.ButtonHandler | null) {
        this.setOnFocusOut(handler);
    }

    /**
     * Sets the callback invoked when the button loses focus.
     * @param handler - The focus out handler callback, or null to clear.
     * @returns This button for chaining.
     */
    public setOnFocusOut(handler?: UI.ButtonHandler | null): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        this._setButtonHandler(UIBaseButton.Event.FocusOut, handler);

        return this;
    }
}

export namespace UIBaseButton {
    export enum Event {
        ClickUp = 0,
        ClickDown = 1,
        FocusIn = 2,
        FocusOut = 3,
    }

    export type Handlers = {
        onClickUp?: UI.ButtonHandler;
        onClickDown?: UI.ButtonHandler;
        onFocusIn?: UI.ButtonHandler;
        onFocusOut?: UI.ButtonHandler;
    };

    export type Styling = {
        enabled?: boolean;
        baseColor?: mod.Vector;
        baseAlpha?: number;
        disabledColor?: mod.Vector;
        disabledAlpha?: number;
        pressedColor?: mod.Vector;
        pressedAlpha?: number;
        focusedColor?: mod.Vector;
        focusedAlpha?: number;
    };

    export type Params = UI.ElementParams & Styling & Handlers;
}
