import { UI } from '../../index.ts';
export declare abstract class UIBaseButton extends UI.Element {
    /**
     * The maximum number of button widgets that can exist concurrently in memory.
     */
    static readonly MAX_BUTTONS = 512;
    protected static readonly _MAX_GENERATIONS = 65535;
    protected static _activeButtonCount: number;
    protected static _firstFreeButton: number;
    protected static readonly _generations: Uint16Array<ArrayBuffer>;
    protected static readonly _nextFreeButton: Int16Array<ArrayBuffer>;
    protected static readonly _elementToButtonSlot: Int16Array<ArrayBuffer>;
    protected static readonly _buttonOnClickUp: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnClickDown: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnFocusIn: (UI.ButtonHandler | null)[];
    protected static readonly _buttonOnFocusOut: (UI.ButtonHandler | null)[];
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
        baseColor?: mod.Vector;
        baseAlpha?: number;
        disabledColor?: mod.Vector;
        disabledAlpha?: number;
        pressedColor?: mod.Vector;
        pressedAlpha?: number;
        focusedColor?: mod.Vector;
        focusedAlpha?: number;
    };
    type Params = UI.ElementParams & Styling & Handlers;
}
