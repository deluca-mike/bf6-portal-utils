import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';
export declare class UIPixelArt extends UI.Element {
    /**
     * The maximum number of pixel art widgets that can exist concurrently in memory.
     */
    static readonly MAX_PIXEL_ARTS = 128;
    /**
     * Global per-tick budget for throttled native widget operations (default: 10).
     */
    static tickBudget: number;
    /**
     * Budget cost per child rectangle widget drawn (default: 1.0).
     */
    static drawCost: number;
    /**
     * Budget cost per child rectangle widget recolored during update (default: 0.25).
     */
    static updateCost: number;
    /**
     * Budget cost per child rectangle widget deleted (default: 0.5).
     */
    static deleteCost: number;
    private static readonly _HEADER_FLAG_HAS_OPACITY;
    private static readonly _HEADER_FLAG_16BIT_COORDS;
    private static readonly _HEADER_FLAG_MONOCHROME;
    private static readonly _MAX_GENERATIONS;
    private static readonly _STATE_IDLE;
    private static readonly _STATE_DRAWING;
    private static readonly _STATE_UPDATING;
    private static readonly _STATE_DELETING;
    private static readonly _STATE_SHIFT;
    private static readonly _STATE_MASK;
    private static readonly _STATE_CLEAR_MASK;
    private static readonly _FLAG_MONOCHROME;
    private static readonly _DIRTY_COLOR_MID_DRAW;
    private static _activePixelArtCount;
    private static _firstFreePixelArt;
    private static readonly _generations;
    /**
     * Intrusive slot metadata array serving dual-duty to minimize QuickJS static memory:
     * - When inactive (slot is free): Stores the 0-based index of the next free slot in the intrusive free-list.
     * - When active (slot in use): Multiplexes packed runtime state bits:
     *     - Bit 0: Monochrome flag (1 if monochrome, 0 if multi-color).
     *     - Bits 2..3: 2-bit operational state (0 = Idle, 1 = Drawing, 2 = Updating, 3 = Deleting).
     *     - Bit 4: Mid-draw dirty flag indicating a color update occurred while actively drawing.
     */
    private static readonly _nextFreePixelArt;
    private static readonly _elementToPixelArtSlot;
    private static readonly _artWidgets;
    private static readonly _childWidgets;
    private static readonly _paletteColors;
    private static readonly _paletteAlphas;
    private static readonly _pendingPixelArtIds;
    private static _pendingPixelArtHead;
    private static _pendingPixelArtTail;
    private static _pendingPixelArtCount;
    private static readonly _pendingData;
    private static _activeThrottledId;
    private static _rectCount;
    private static _rectCursor;
    private static _activeCellWidth;
    private static _activeCellHeight;
    private static _activeIs16BitCoords;
    private static _activeIsMonochrome;
    private static _activeHasOpacity;
    private static _activeMonoColorVec;
    private static _isSubscribed;
    private static _readerStr;
    private static _readerLen;
    private static _readerCharIdx;
    private static _readerIsB122;
    private static _readerB64Buffer;
    private static _readerB64Bits;
    private static _readerB122Byte;
    private static _readerB122BitOfByte;
    private static _readerB122Pending7Bit;
    private static readonly _B64_LOOKUP;
    private static readonly _B122_ILLEGALS;
    private static _getState;
    private static _setState;
    private static _getMidDrawDirty;
    private static _setMidDrawDirty;
    /**
     * Checks if a pixel art slot contains a monochrome image.
     * @param paSlot - The pixel art slot index.
     * @returns True if monochrome, false otherwise.
     */
    protected static _isMonochrome(paSlot: number): boolean;
    /**
     * Returns the number of active pixel art elements.
     * @returns The active pixel art count.
     */
    static getActivePixelArtCount(): number;
    /**
     * Resolves the 0-based pixel art slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based pixel art slot index, or -1 if invalid or unallocated.
     */
    protected static _resolvePixelArtSlot(elementId: number): number;
    /**
     * Initializes the static stream reader with the payload string.
     * @param data - The payload string.
     */
    private static _initReader;
    /**
     * Reads the next 8-bit unsigned byte from the Base122 streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8FromB122;
    /**
     * Reads the next 8-bit unsigned byte from the Base64 streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8FromB64;
    /**
     * Reads the next 8-bit unsigned byte from the streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8;
    /**
     * Reads the next 16-bit unsigned little-endian integer from the streaming decoder.
     * @returns The 16-bit integer (0..65535) or -1 if end of stream or corrupted.
     */
    private static _readUint16;
    /**
     * Parses the RGB/RGBA color palette from the stream into the static palette caches.
     * @param hasOpacity - Whether the palette entries contain an alpha channel byte.
     * @returns True if parsing succeeded, false if data was invalid or corrupted.
     */
    private static _parseColorPalette;
    /**
     * Parses the monochrome alpha palette from the stream into the static palette alphas cache.
     * @returns True if parsing succeeded, false if data was invalid or corrupted.
     */
    private static _parseAlphaPalette;
    private static _pushPendingPixelArt;
    private static _popPendingPixelArt;
    private static _activatePixelArt;
    private static _activateUpdate;
    private static _activateDelete;
    private static _activateNext;
    private static _endActiveOperation;
    private static _drawBatch;
    private static _updateBatch;
    private static _deleteBatch;
    private static _handleTick;
    private static _ensureTickSubscribed;
    /**
     * Creates a new optimized pixel art element.
     * @param params - The parameters for the pixel art.
     */
    constructor(params: UIPixelArt.Params);
    /**
     * @inheritdoc
     */
    protected _handleFlush(flags: number, widget: mod.UIWidget): void;
    protected get _pixelArtSlot(): number;
    protected get _isValid(): boolean;
    get isDeleted(): boolean;
    /**
     * Resolves the 0-based slot for this instance and logs a warning if invalid.
     * @returns The 0-based pixel art slot index, or -1 if invalid or unallocated.
     */
    protected _resolvePixelArtSlotAndLogWarning(): number;
    /**
     * Checks if this instance is invalid and logs a warning if so.
     * @returns True if invalid, false if valid.
     */
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Allocates a pixel art slot from the static sub-pool.
     * @param isMonochrome - Whether the pixel art is monochrome.
     * @returns The allocated slot index, or -1 if full or invalid.
     */
    private _allocatePixelArtSlot;
    /**
     * Frees the pixel art slot associated with this instance.
     */
    private _freePixelArtSlot;
    /**
     * @inheritdoc
     */
    protected _finalizeDelete(): void;
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The current lifecycle state of this pixel art (Idle, Drawing, Updating, Deleting),
     * or undefined if the element has been deleted.
     * @returns The current lifecycle state, or undefined if deleted.
     */
    get state(): UIPixelArt.State | undefined;
    /**
     * The rendering progress of this pixel art from 0 to 100 percent.
     * Returns 100 when Idle, 0 when queued, Math.floor((cursor / count) * 100)
     * when actively Drawing, Updating, or Deleting, or undefined if deleted.
     * @returns The operation progress (0..100) or undefined if deleted.
     */
    get progress(): number | undefined;
    /**
     * Indicates whether all child rectangle widgets have finished rendering and the pixel art is idle.
     * Returns true when Idle, false when Drawing, Updating, or Deleting,
     * or undefined if the element has been deleted.
     * @returns True if idle, false if busy, or undefined if deleted.
     */
    get isReady(): boolean | undefined;
    /**
     * Whether this pixel art instance is monochrome.
     * @returns True if monochrome, false if multi-color, or undefined if deleted.
     */
    get isMonochrome(): boolean | undefined;
    /**
     * The total number of native draw calls (containers) used by this pixel art element.
     * Includes the base container, art container, and all child rectangle widgets.
     * @returns The draw call count, or undefined if deleted.
     */
    get drawCallCount(): number | undefined;
    /**
     * The foreground/tint color of the pixel art.
     * @returns The foreground color for monochrome images, null for multi-color images, or undefined if deleted.
     */
    get color(): Colors.Color | null | undefined;
    /**
     * Sets the foreground/tint color of the pixel art.
     * Only applies to monochrome pixel art images (no-op for multi-color).
     * @param color - The new foreground/tint color.
     */
    set color(color: Colors.Color);
    /**
     * Gets the foreground/tint color of the pixel art into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The foreground color for monochrome images, null for multi-color images, or undefined if deleted.
     */
    getColor(out?: Colors.Color): Colors.Color | null | undefined;
    /**
     * Sets the foreground/tint color of the pixel art.
     * Batches native color updates across ticks using updateCost and tickBudget.
     * Only applies to monochrome pixel art images (no-op for multi-color).
     * @param color - The new foreground/tint color.
     * @returns This element for chaining.
     */
    setColor(color: Colors.Color): this;
}
export declare namespace UIPixelArt {
    /**
     * Throttled operation lifecycle states.
     */
    enum State {
        Idle = 0,
        Drawing = 1,
        Updating = 2,
        Deleting = 3,
    }
    /**
     * Parameters for creating a UIPixelArt element.
     */
    type Params = UI.ElementParams & {
        /** The Base64 or Base122 encoded pixel art payload. */
        data: string;
        /** Optional foreground color (monochrome) or tint color (multi-color). */
        color?: Colors.Color;
    };
}
