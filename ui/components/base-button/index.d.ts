import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
export declare abstract class UIBaseButton extends UI.Element {
    protected static readonly _DIRTY_BTN_ENABLED: number;
    protected static readonly _DIRTY_BTN_DISABLED_COLOR: number;
    protected static readonly _DIRTY_BTN_DISABLED_ALPHA: number;
    protected static readonly _DIRTY_BTN_PRESSED_COLOR: number;
    protected static readonly _DIRTY_BTN_PRESSED_ALPHA: number;
    protected static readonly _DIRTY_BTN_FOCUSED_COLOR: number;
    protected static readonly _DIRTY_BTN_FOCUSED_ALPHA: number;
    protected static readonly _UNUSED_DIRTY_OFFSET: number;
    /**
     * The maximum number of button widgets that can exist concurrently in memory.
     */
    static readonly MAX_BUTTONS = 512;
    protected static readonly _MAX_GENERATIONS = 65535;
    protected static _activeButtonCount: number;
    protected static _firstFreeButton: number;
    protected static readonly _generations: Uint16Array<ArrayBuffer>;
    protected static readonly _nextFreeButton: Int16Array<ArrayBuffer>;
    protected static readonly _elementToButtonSlot: Int16Array;
    protected static readonly _buttonOnClickUp: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnClickDown: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnFocusIn: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnFocusOut: (UI.ButtonHandler | null)[];
    protected static readonly _disabledRgba: Uint32Array<ArrayBuffer>;
    protected static readonly _pressedRgba: Uint32Array<ArrayBuffer>;
    protected static readonly _focusedRgba: Uint32Array<ArrayBuffer>;
    protected static _unpackColor(rgba: number, out?: Colors.Color): Colors.Color;
    protected static _unpackAlpha(rgba: number): number;
    protected static _setRgb(array: Uint32Array, slot: number, color: Colors.Color): boolean;
    protected static _setAlpha(array: Uint32Array, slot: number, alpha: number): boolean;
    /**
     * @inheritdoc
     */
    protected _handleFlush(flags: number, widget: mod.UIWidget): void;
    /**
     * Returns the number of active button elements.
     * @returns The active button count.
     */
    static getActiveButtonCount(): number;
    /**
     * Resolves the 0-based button slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based button slot index (0 to MAX_BUTTONS - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveButtonSlot(elementId: number): number;
    /**
     * Handles a button event with zero intermediate object allocations.
     * @param player - The player who triggered the button event.
     * @param widget - The widget that was triggered.
     * @param event - The button event.
     */
    private static _handleButtonEvent;
    /**
     * Allocates a button slot for this button instance.
     * @returns The allocated button slot index (0 to MAX_BUTTONS - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateButtonSlot;
    /**
     * Frees the button slot associated with this button instance.
     */
    private _freeButtonSlot;
    /**
     * The native button UIWidget handle associated with this button instance.
     * Concrete subclasses should return their actual button UIWidget handle.
     * @returns The native button UIWidget handle, or null if not available.
     */
    protected get _buttonUIWidget(): mod.UIWidget | null;
    protected get _buttonSlot(): number;
    protected get _isValid(): boolean;
    /**
     * Resolves the 0-based button slot for this button instance and logs a warning if invalid.
     * @returns The 0-based button slot index (0 to MAX_BUTTONS - 1), or -1 if invalid or unallocated.
     */
    protected _resolveButtonSlotAndLogWarning(): number;
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Retrieves the button handler for this element and event type.
     * @param event - The internal button event type.
     * @returns The registered handler, null if unset, or undefined if invalid.
     */
    protected _getButtonHandler(event: UIBaseButton.Event): UI.ButtonHandler | null | undefined;
    /**
     * Sets or clears a button event handler, enabling or disabling engine events as needed.
     * @param event - The internal button event type.
     * @param handler - The handler callback, or null/undefined to clear.
     */
    protected _setButtonHandler(event: UIBaseButton.Event, handler?: UI.ButtonHandler | null): void;
    protected _setupButtonHandlers(params: UIBaseButton.Params): void;
    /**
     * Initializes the base button element.
     * Allocates both the underlying UI.Element slot and the button slot.
     * @param params - The initialization parameters for the button.
     */
    protected constructor(params?: UIBaseButton.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The callback invoked when the button is clicked up, or undefined if deleted.
     * @returns The click up handler, null if unset, or undefined if deleted.
     */
    get onClickUp(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the callback invoked when the button is clicked up.
     * @param handler - The click up handler callback, or null to clear.
     */
    set onClickUp(handler: UI.ButtonHandler | null);
    /**
     * Sets the callback invoked when the button is clicked up.
     * @param handler - The click up handler callback, or null to clear.
     * @returns This button for chaining.
     */
    setOnClickUp(handler?: UI.ButtonHandler | null): this;
    /**
     * The callback invoked when the button is clicked down, or undefined if deleted.
     * @returns The click down handler, null if unset, or undefined if deleted.
     */
    get onClickDown(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the callback invoked when the button is clicked down.
     * @param handler - The click down handler callback, or null to clear.
     */
    set onClickDown(handler: UI.ButtonHandler | null);
    /**
     * Sets the callback invoked when the button is clicked down.
     * @param handler - The click down handler callback, or null to clear.
     * @returns This button for chaining.
     */
    setOnClickDown(handler?: UI.ButtonHandler | null): this;
    /**
     * The callback invoked when the button receives focus, or undefined if deleted.
     * @returns The focus in handler, null if unset, or undefined if deleted.
     */
    get onFocusIn(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the callback invoked when the button receives focus.
     * @param handler - The focus in handler callback, or null to clear.
     */
    set onFocusIn(handler: UI.ButtonHandler | null);
    /**
     * Sets the callback invoked when the button receives focus.
     * @param handler - The focus in handler callback, or null to clear.
     * @returns This button for chaining.
     */
    setOnFocusIn(handler?: UI.ButtonHandler | null): this;
    /**
     * The callback invoked when the button loses focus, or undefined if deleted.
     * @returns The focus out handler, null if unset, or undefined if deleted.
     */
    get onFocusOut(): UI.ButtonHandler | null | undefined;
    /**
     * Sets the callback invoked when the button loses focus.
     * @param handler - The focus out handler callback, or null to clear.
     */
    set onFocusOut(handler: UI.ButtonHandler | null);
    /**
     * Sets the callback invoked when the button loses focus.
     * @param handler - The focus out handler callback, or null to clear.
     * @returns This button for chaining.
     */
    setOnFocusOut(handler?: UI.ButtonHandler | null): this;
    /**
     * Hook invoked when the enabled state of the button changes (e.g. for content buttons to update child elements).
     * @param _enabled - Whether the button is enabled.
     */
    protected _setContentEnabled(_enabled: boolean): void;
    /**
     * Whether the button is enabled, or undefined if deleted.
     * @returns True if enabled, false if disabled, or undefined if deleted.
     */
    get enabled(): boolean | undefined;
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     */
    set enabled(enabled: boolean);
    /**
     * Sets whether the button is enabled.
     * @param enabled - The new enabled state.
     * @returns This button for chaining.
     */
    setEnabled(enabled: boolean): this;
    /**
     * The base color of the button, or undefined if deleted.
     * @returns The base color, or undefined if deleted.
     */
    get baseColor(): Colors.Color | undefined;
    /**
     * Retrieves the base color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The base color, or undefined if deleted.
     */
    getBaseColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     */
    set baseColor(color: Colors.Color);
    /**
     * Sets the base color of the button.
     * @param color - The new base color.
     * @returns This button for chaining.
     */
    setBaseColor(color: Colors.Color): this;
    /**
     * The base alpha of the button, or undefined if deleted.
     * @returns The base alpha opacity, or undefined if deleted.
     */
    get baseAlpha(): number | undefined;
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     */
    set baseAlpha(alpha: number);
    /**
     * Sets the base alpha of the button.
     * @param alpha - The new base alpha.
     * @returns This button for chaining.
     */
    setBaseAlpha(alpha: number): this;
    /**
     * The disabled color of the button, or undefined if deleted.
     * @returns The disabled color, or undefined if deleted.
     */
    get disabledColor(): Colors.Color | undefined;
    /**
     * Retrieves the disabled color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The disabled color, or undefined if deleted.
     */
    getDisabledColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     */
    set disabledColor(color: Colors.Color);
    /**
     * Sets the disabled color of the button.
     * @param color - The new disabled color.
     * @returns This button for chaining.
     */
    setDisabledColor(color: Colors.Color): this;
    /**
     * The disabled alpha of the button, or undefined if deleted.
     * @returns The disabled alpha opacity, or undefined if deleted.
     */
    get disabledAlpha(): number | undefined;
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     */
    set disabledAlpha(alpha: number);
    /**
     * Sets the disabled alpha of the button.
     * @param alpha - The new disabled alpha.
     * @returns This button for chaining.
     */
    setDisabledAlpha(alpha: number): this;
    /**
     * The pressed color of the button, or undefined if deleted.
     * @returns The pressed color, or undefined if deleted.
     */
    get pressedColor(): Colors.Color | undefined;
    /**
     * Retrieves the pressed color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The pressed color, or undefined if deleted.
     */
    getPressedColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     */
    set pressedColor(color: Colors.Color);
    /**
     * Sets the pressed color of the button.
     * @param color - The new pressed color.
     * @returns This button for chaining.
     */
    setPressedColor(color: Colors.Color): this;
    /**
     * The pressed alpha of the button, or undefined if deleted.
     * @returns The pressed alpha opacity, or undefined if deleted.
     */
    get pressedAlpha(): number | undefined;
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     */
    set pressedAlpha(alpha: number);
    /**
     * Sets the pressed alpha of the button.
     * @param alpha - The new pressed alpha.
     * @returns This button for chaining.
     */
    setPressedAlpha(alpha: number): this;
    /**
     * The focused color of the button, or undefined if deleted.
     * @returns The focused color, or undefined if deleted.
     */
    get focusedColor(): Colors.Color | undefined;
    /**
     * Retrieves the focused color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The focused color, or undefined if deleted.
     */
    getFocusedColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     */
    set focusedColor(color: Colors.Color);
    /**
     * Sets the focused color of the button.
     * @param color - The new focused color.
     * @returns This button for chaining.
     */
    setFocusedColor(color: Colors.Color): this;
    /**
     * The focused alpha of the button, or undefined if deleted.
     * @returns The focused alpha opacity, or undefined if deleted.
     */
    get focusedAlpha(): number | undefined;
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     */
    set focusedAlpha(alpha: number);
    /**
     * Sets the focused alpha of the button.
     * @param alpha - The new focused alpha.
     * @returns This button for chaining.
     */
    setFocusedAlpha(alpha: number): this;
}
export declare namespace UIBaseButton {
    enum Event {
        ClickUp = 0,
        ClickDown = 1,
        FocusIn = 2,
        FocusOut = 3,
    }
    type Handlers = {
        onClickUp?: UI.ButtonHandler;
        onClickDown?: UI.ButtonHandler;
        onFocusIn?: UI.ButtonHandler;
        onFocusOut?: UI.ButtonHandler;
    };
    type Styling = {
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
    type Params = UI.ElementParams & Styling & Handlers;
}
