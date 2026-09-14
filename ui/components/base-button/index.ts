import { CallbackHandler } from '../../../callback-handler/index.ts';
import { Colors } from '../../../colors/index.ts';
import { Events } from '../../../events/index.ts';
import { UI } from '../../index.ts';

// version: 10.0.0
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

    protected static readonly _disabledRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _pressedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

    protected static readonly _focusedRgba = new Uint32Array(UIBaseButton.MAX_BUTTONS);

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
        UIBaseButton._disabledRgba[slot] = 0;
        UIBaseButton._pressedRgba[slot] = 0;
        UIBaseButton._focusedRgba[slot] = 0;
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

        if (btnSlot !== UIBaseButton._INVALID_INDEX) return;

        this.delete();
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

    /**
     * Hook invoked when the enabled state of the button changes (e.g. for content buttons to update child elements).
     * @param _enabled - Whether the button is enabled.
     */
    protected _setContentEnabled(_enabled: boolean): void {}

    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    public get enabled(): boolean | undefined {
        const widget = this._buttonUIWidget;
        return widget && this._isValid ? mod.GetUIButtonEnabled(widget) : undefined;
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    public set enabled(enabled: boolean) {
        this.setEnabled(enabled);
    }

    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    public setEnabled(enabled: boolean): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonEnabled(widget, enabled);
        }
        this._setContentEnabled(enabled);

        return this;
    }

    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color, or undefined if deleted.
     */
    public get baseColor(): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot);
    }

    /**
     * Retrieves the base color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The base color, or undefined if deleted.
     */
    public getBaseColor(out?: Colors.Color): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot, out);
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
     * @returns This button for chaining.
     */
    public setBaseColor(color: Colors.Color): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UI.Element._setForegroundColor(slot, color);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonColorBase(widget, Colors.toVector(color));
        }

        return this;
    }

    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    public get baseAlpha(): number | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundAlpha(slot);
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
     * @returns This button for chaining.
     */
    public setBaseAlpha(alpha: number): this {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UI.Element._setForegroundAlpha(slot, alpha);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonAlphaBase(widget, alpha);
        }

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
            : UIBaseButton._unpackColor(UIBaseButton._disabledRgba[btnSlot]);
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
            : UIBaseButton._unpackColor(UIBaseButton._disabledRgba[btnSlot], out);
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
     * @returns This button for chaining.
     */
    public setDisabledColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIBaseButton._disabledRgba, btnSlot, color);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonColorDisabled(widget, Colors.toVector(color));
        }

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
            : UIBaseButton._unpackAlpha(UIBaseButton._disabledRgba[btnSlot]);
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
     * @returns This button for chaining.
     */
    public setDisabledAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setAlpha(UIBaseButton._disabledRgba, btnSlot, alpha);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonAlphaDisabled(widget, alpha);
        }

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
            : UIBaseButton._unpackColor(UIBaseButton._pressedRgba[btnSlot]);
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
            : UIBaseButton._unpackColor(UIBaseButton._pressedRgba[btnSlot], out);
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
     * @returns This button for chaining.
     */
    public setPressedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIBaseButton._pressedRgba, btnSlot, color);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonColorPressed(widget, Colors.toVector(color));
        }

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
            : UIBaseButton._unpackAlpha(UIBaseButton._pressedRgba[btnSlot]);
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
     * @returns This button for chaining.
     */
    public setPressedAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setAlpha(UIBaseButton._pressedRgba, btnSlot, alpha);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonAlphaPressed(widget, alpha);
        }

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
            : UIBaseButton._unpackColor(UIBaseButton._focusedRgba[btnSlot]);
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
            : UIBaseButton._unpackColor(UIBaseButton._focusedRgba[btnSlot], out);
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
     * @returns This button for chaining.
     */
    public setFocusedColor(color: Colors.Color): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setRgb(UIBaseButton._focusedRgba, btnSlot, color);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonColorFocused(widget, Colors.toVector(color));
        }

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
            : UIBaseButton._unpackAlpha(UIBaseButton._focusedRgba[btnSlot]);
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
     * @returns This button for chaining.
     */
    public setFocusedAlpha(alpha: number): this {
        const btnSlot = this._resolveButtonSlotAndLogWarning();

        if (btnSlot === UIBaseButton._INVALID_INDEX) return this;

        UIBaseButton._setAlpha(UIBaseButton._focusedRgba, btnSlot, alpha);
        const widget = this._buttonUIWidget;
        if (widget) {
            mod.SetUIButtonAlphaFocused(widget, alpha);
        }

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
        baseColor?: Colors.Color;
        baseAlpha?: number;
        disabledColor?: Colors.Color;
        disabledAlpha?: number;
        pressedColor?: Colors.Color;
        pressedAlpha?: number;
        focusedColor?: Colors.Color;
        focusedAlpha?: number;
    };

    export type Params = UI.ElementParams & Styling & Handlers;
}
