import { Colors } from '../../../colors/index.ts';
import { QREncoder } from './encoder.ts';
import { UI } from '../../index.ts';
export declare class UIQRCode extends UI.Element {
    /**
     * The maximum number of QR code widgets that can exist concurrently in memory.
     */
    static readonly MAX_QR_CODES = 128;
    /**
     * Maximum supported QR Code version (1 through 40). Defaults to 18.
     * Determines the compile-time sizing of preallocated static scratch buffers (_scratchBuffer and _rectBuffer),
     * bounding memory consumption while accommodating large payloads up to Version 18 (~500+ alphanumeric characters).
     * Any payload requiring a version greater than `MAX_QR_VERSION` will safely fail initialization without drawing.
     */
    static readonly MAX_QR_VERSION = 18;
    /**
     * Default quiet zone margin in module units per ISO/IEC 18004.
     */
    static readonly DEFAULT_MARGIN = 4;
    /**
     * Minimum required quiet zone margin in module units per ISO/IEC 18004.
     */
    static readonly MIN_QUIET_ZONE = 4;
    /**
     * Total native engine `mod` FFI execution cost budget permitted per server tick (`Events.OnTickStart`).
     * Operations consume from this budget according to their configured costs (`drawCost`, `updateCost`, `deleteCost`):
     * `cost = count * costPerOp`.
     * Defaults to 10.
     */
    static tickBudget: number;
    /**
     * Cost incurred per native widget container addition (`mod.AddUIContainer`).
     * Defaults to 1.0 (permitting up to 10 container creations per tick with default `tickBudget` of 10).
     */
    static drawCost: number;
    /**
     * Cost incurred per native widget background color update (`mod.SetUIWidgetBgColor`).
     * Defaults to 0.25 (permitting up to 40 widget color updates per tick with default `tickBudget` of 10).
     */
    static updateCost: number;
    /**
     * Cost incurred per native widget deletion (`mod.DeleteUIWidget`).
     * Defaults to 0.5 (permitting up to 20 widget deletions per tick with default `tickBudget` of 10).
     */
    static deleteCost: number;
    private static readonly MAX_QR_ORDER;
    private static readonly MAX_MODULES;
    private static readonly BASE_MODULE_SIZE;
    private static readonly _MAX_GENERATIONS;
    private static readonly _STATE_IDLE;
    private static readonly _STATE_DRAWING;
    private static readonly _STATE_UPDATING;
    private static readonly _STATE_DELETING;
    private static readonly _ECC_MASK;
    private static readonly _STATE_SHIFT;
    private static readonly _STATE_MASK;
    private static readonly _STATE_CLEAR_MASK;
    private static readonly _DIRTY_COLOR_MID_DRAW;
    private static _activeQrCodeCount;
    private static _firstFreeQrCode;
    private static readonly _generations;
    /**
     * Intrusive slot metadata array serving dual-duty to minimize QuickJS static memory:
     * - When inactive (slot is free): Stores the 0-based index of the next free slot in the intrusive free-list.
     * - When active (slot in use): Multiplexes packed runtime state bits:
     *     - Bits 0..1: 2-bit ECC mode index (0 = Low, 1 = Medium, 2 = Quartile, 3 = High).
     *     - Bits 2..3: 2-bit operational state (0 = Idle, 1 = Drawing, 2 = Updating, 3 = Deleting).
     *     - Bit 4: Mid-draw dirty flag indicating a color update occurred while actively drawing.
     */
    private static readonly _nextFreeQrCode;
    private static readonly _elementToQRCodeSlot;
    private static readonly _qrWidgets;
    private static readonly _childWidgets;
    protected static readonly _scratchBuffer: Uint8Array<ArrayBuffer>;
    private static readonly _pendingQrIds;
    private static _pendingQrHead;
    private static _pendingQrTail;
    private static _pendingQrCount;
    protected static readonly _rectBuffer: Uint32Array<ArrayBuffer>;
    private static _activeThrottledId;
    protected static _rectCount: number;
    private static _rectCursor;
    private static _activeCellWidth;
    private static _activeCellHeight;
    private static _activeMargin;
    private static readonly _margins;
    private static readonly _pendingData;
    private static _isSubscribed;
    /**
     * Returns the number of active QR code elements.
     * @returns The active QR code count.
     */
    static getActiveQRCodeCount(): number;
    private static _getState;
    private static _setState;
    private static _getMidDrawDirty;
    private static _setMidDrawDirty;
    private static _getEcc;
    private static _setEcc;
    /**
     * Resolves the 0-based QR code slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveQrCodeSlot(elementId: number): number;
    private static _resetRects;
    private static _activateQr;
    private static _activateUpdate;
    private static _activateDelete;
    private static _activateNext;
    private static _endActiveOperation;
    private static _drawBatch;
    private static _updateBatch;
    private static _deleteBatch;
    private static _pushPendingQr;
    private static _popPendingQr;
    private static _handleTick;
    private static _ensureTickSubscribed;
    protected static _packRectangles(N: number): void;
    /**
     * Creates a new optimized QR code element.
     * @param params - The parameters for the QR code.
     */
    constructor(params: UIQRCode.Params);
    protected get _qrCodeSlot(): number;
    protected get _isValid(): boolean;
    get isDeleted(): boolean;
    /**
     * Resolves the 0-based QR code slot for this QR instance and logs a warning if invalid.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveQrCodeSlotAndLogWarning(): number;
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Allocates a QR code slot for this QR instance.
     * @returns The allocated QR slot index (0 to MAX_QR_CODES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateQrCodeSlot;
    /**
     * Frees the QR code slot associated with this QR instance.
     */
    private _freeQrCodeSlot;
    /**
     * The intermediate QR container widget (centered inside the base container).
     * @returns The QR container widget, or null if deleted/unallocated.
     */
    protected get _qrWidget(): mod.UIWidget | null;
    /**
     * @inheritdoc
     */
    protected _handleFlush(flags: number, widget: mod.UIWidget): void;
    /**
     * @inheritdoc
     */
    protected _finalizeDelete(): void;
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The current lifecycle state of this QR code (Idle, Drawing, Updating, Deleting),
     * or undefined if the element has been deleted.
     * @returns The current lifecycle state, or undefined if deleted.
     */
    get state(): UIQRCode.State | undefined;
    /**
     * The rendering progress of this QR code from 0 to 100 percent.
     * Returns 100 when Idle, 0 when queued, Math.floor((cursor / count) * 100)
     * when actively Drawing, Updating, or Deleting, or undefined if deleted.
     * @returns The operation progress (0..100) or undefined if deleted.
     */
    get progress(): number | undefined;
    /**
     * Indicates whether all child module rectangle widgets have finished rendering and the QR code is idle.
     * Returns true when Idle, false when Drawing, Updating, or Deleting,
     * or undefined if the element has been deleted.
     * @returns True if idle, false if busy, or undefined if deleted.
     */
    get isReady(): boolean | undefined;
    /**
     * The total number of native draw calls (widgets) used to render this QR code.
     * Includes the base container, QR container, and all internal module rectangle widgets.
     * @returns The total draw call count, or undefined if deleted.
     */
    get drawCallCount(): number | undefined;
    /**
     * The foreground (dark module) color of the QR code, or undefined if deleted.
     * @returns The foreground color, or undefined if deleted.
     */
    get color(): Colors.Color | undefined;
    /**
     * Retrieves the foreground (dark module) color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The foreground color, or undefined if deleted.
     */
    getColor(out?: Colors.Color): Colors.Color | undefined;
    /**
     * Sets the foreground (dark module) color of the QR code.
     * @param color - The new foreground color.
     */
    set color(color: Colors.Color);
    /**
     * Sets the foreground (dark module) color of the QR code.
     * Batches native color updates across ticks using updateCost and tickBudget.
     * @param color - The new foreground color.
     * @returns This element for chaining.
     */
    setColor(color: Colors.Color): this;
}
export declare namespace UIQRCode {
    /**
     * The lifecycle state of a QR code instance.
     */
    enum State {
        Idle = 0,
        Drawing = 1,
        Updating = 2,
        Deleting = 3,
    }
    /**
     * QR Code Error Correction Levels.
     */
    export import ECC = QREncoder.ECC;
    /**
     * Polymorphic payload data type: UTF-8 string, raw binary byte array, or number array.
     */
    type Payload = QREncoder.Payload;
    /**
     * The parameters for creating a new UIQRCode element.
     */
    type Params = UI.ElementParams & {
        /**
         * Payload to encode into a QR code (string, Uint8Array, or number array).
         */
        data: Payload;
        /**
         * Error correction level (defaults to `ECC.Medium`).
         */
        ecc?: ECC;
        /**
         * Scale multiplier used to compute default width and height. When `1`, the smallest module is 10 units wide/tall. Defaults to `1`.
         */
        scale?: number;
        /**
         * Quiet zone margin in module units around the QR code (defaults to 4, minimum 4).
         */
        margin?: number;
        /**
         * Color for dark modules (defaults to `UI.COLORS.BLACK`).
         */
        color?: Colors.Color;
    };
}
