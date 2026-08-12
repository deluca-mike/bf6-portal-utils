import { Colors } from '../../../colors/index.ts';
import { Events } from '../../../events/index.ts';
import { UI } from '../../index.ts';

// version: 1.0.0
export class UIPixelArt extends UI.Element {
    /**
     * The maximum number of pixel art widgets that can exist concurrently in memory.
     */
    public static readonly MAX_PIXEL_ARTS = 128;

    /**
     * Global per-tick budget for throttled native widget operations (default: 10).
     */
    public static tickBudget: number = 10;

    /**
     * Budget cost per child rectangle widget drawn (default: 1.0).
     */
    public static drawCost: number = 1.0;

    /**
     * Budget cost per child rectangle widget recolored during update (default: 0.25).
     */
    public static updateCost: number = 0.25;

    /**
     * Budget cost per child rectangle widget deleted (default: 0.5).
     */
    public static deleteCost: number = 0.5;

    private static readonly _HEADER_FLAG_HAS_OPACITY = 1 << 0; // 0x01

    private static readonly _HEADER_FLAG_16BIT_COORDS = 1 << 1; // 0x02

    private static readonly _HEADER_FLAG_MONOCHROME = 1 << 2; // 0x04

    private static readonly _MAX_GENERATIONS = 65_535;

    private static readonly _STATE_IDLE = 0;

    private static readonly _STATE_DRAWING = 1;

    private static readonly _STATE_UPDATING = 2;

    private static readonly _STATE_DELETING = 3;

    private static readonly _STATE_SHIFT = 2;

    private static readonly _STATE_MASK = 0x3;

    private static readonly _STATE_CLEAR_MASK = ~(UIPixelArt._STATE_MASK << UIPixelArt._STATE_SHIFT);

    private static readonly _FLAG_MONOCHROME = 1 << 0; // Bit 0

    private static readonly _DIRTY_COLOR_MID_DRAW = 1 << 4; // Bit 4

    private static _activePixelArtCount: number = 0;

    private static _firstFreePixelArt: number = 0;

    private static readonly _generations = new Uint16Array(UIPixelArt.MAX_PIXEL_ARTS);

    /**
     * Intrusive slot metadata array serving dual-duty to minimize QuickJS static memory:
     * - When inactive (slot is free): Stores the 0-based index of the next free slot in the intrusive free-list.
     * - When active (slot in use): Multiplexes packed runtime state bits:
     *     - Bit 0: Monochrome flag (1 if monochrome, 0 if multi-color).
     *     - Bits 2..3: 2-bit operational state (0 = Idle, 1 = Drawing, 2 = Updating, 3 = Deleting).
     *     - Bit 4: Mid-draw dirty flag indicating a color update occurred while actively drawing.
     */
    private static readonly _nextFreePixelArt = new Int16Array(UIPixelArt.MAX_PIXEL_ARTS);

    private static readonly _elementToPixelArtSlot: Int16Array = UI.Element._elementToCustomSlot;

    private static readonly _artWidgets = new Array<mod.UIWidget | null>(UIPixelArt.MAX_PIXEL_ARTS);

    private static readonly _childWidgets = new Array<mod.UIWidget[] | null>(UIPixelArt.MAX_PIXEL_ARTS);

    // Pre-allocated static palette caches for zero-allocation palette decoding (up to 256 entries)
    private static readonly _paletteColors = new Array<mod.Vector>(256);

    private static readonly _paletteAlphas = new Float32Array(256);

    // Tier 1 Queue: Pending generation-encoded element IDs (512 bytes)
    private static readonly _pendingPixelArtIds = new Int32Array(UIPixelArt.MAX_PIXEL_ARTS);

    private static _pendingPixelArtHead = 0;

    private static _pendingPixelArtTail = 0;

    private static _pendingPixelArtCount = 0;

    private static readonly _pendingData = new Array<string | null>(UIPixelArt.MAX_PIXEL_ARTS).fill(null);

    // Tier 2 Active Throttled Session Variables
    private static _activeThrottledId: number = UI.Element._INVALID_INDEX;

    private static _rectCount = 0;

    private static _rectCursor = 0;

    // Active drawing session scalars
    private static _activeCellWidth = 0;

    private static _activeCellHeight = 0;

    private static _activeIs16BitCoords = false;

    private static _activeIsMonochrome = false;

    private static _activeHasOpacity = false;

    private static _activeMonoColorVec: mod.Vector | null = null;

    private static _isSubscribed = false;

    // Static stream reader state for zero-allocation Base64 / Base122 decoding
    private static _readerStr: string = '';

    private static _readerLen: number = 0;

    private static _readerCharIdx: number = 0;

    private static _readerIsB122: boolean = false;

    private static _readerB64Buffer: number = 0;

    private static _readerB64Bits: number = 0;

    private static _readerB122Byte: number = 0;

    private static _readerB122BitOfByte: number = 0;

    private static _readerB122Pending7Bit: number = -1;

    // Reusable static Base64 lookup table
    private static readonly _B64_LOOKUP = new Int8Array(256);

    // Base122 illegal byte values: \0, \n, \r, ", &, \
    private static readonly _B122_ILLEGALS: readonly number[] = [0, 10, 13, 34, 38, 92];

    static {
        for (let i = 0; i < UIPixelArt.MAX_PIXEL_ARTS - 1; ++i) {
            UIPixelArt._nextFreePixelArt[i] = i + 1;
        }

        UIPixelArt._nextFreePixelArt[UIPixelArt.MAX_PIXEL_ARTS - 1] = UI.Element._INVALID_INDEX;
        UIPixelArt._generations.fill(0);
        UIPixelArt._artWidgets.fill(null);
        UIPixelArt._childWidgets.fill(null);
        UIPixelArt._elementToPixelArtSlot.fill(UI.Element._INVALID_INDEX);
        UIPixelArt._pendingData.fill(null);
        UIPixelArt._pendingPixelArtIds.fill(UI.Element._INVALID_INDEX);

        // Populate base64 lookup table
        UIPixelArt._B64_LOOKUP.fill(-1);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        for (let i = 0; i < chars.length; ++i) {
            UIPixelArt._B64_LOOKUP[chars.charCodeAt(i)] = i;
        }
    }

    private static _getState(slot: number): number {
        return (UIPixelArt._nextFreePixelArt[slot] >> UIPixelArt._STATE_SHIFT) & UIPixelArt._STATE_MASK;
    }

    private static _setState(slot: number, state: number): void {
        UIPixelArt._nextFreePixelArt[slot] =
            (UIPixelArt._nextFreePixelArt[slot] & UIPixelArt._STATE_CLEAR_MASK) |
            ((state & UIPixelArt._STATE_MASK) << UIPixelArt._STATE_SHIFT);
    }

    private static _getMidDrawDirty(slot: number): boolean {
        return (UIPixelArt._nextFreePixelArt[slot] & UIPixelArt._DIRTY_COLOR_MID_DRAW) !== 0;
    }

    private static _setMidDrawDirty(slot: number, dirty: boolean): void {
        if (dirty) {
            UIPixelArt._nextFreePixelArt[slot] |= UIPixelArt._DIRTY_COLOR_MID_DRAW;
        } else {
            UIPixelArt._nextFreePixelArt[slot] &= ~UIPixelArt._DIRTY_COLOR_MID_DRAW;
        }
    }

    /**
     * Checks if a pixel art slot contains a monochrome image.
     * @param paSlot - The pixel art slot index.
     * @returns True if monochrome, false otherwise.
     */
    protected static _isMonochrome(paSlot: number): boolean {
        return (
            paSlot >= 0 &&
            paSlot < UIPixelArt.MAX_PIXEL_ARTS &&
            UIPixelArt._artWidgets[paSlot] !== null &&
            (UIPixelArt._nextFreePixelArt[paSlot] & UIPixelArt._FLAG_MONOCHROME) !== 0
        );
    }

    /**
     * Returns the number of active pixel art elements.
     * @returns The active pixel art count.
     */
    public static getActivePixelArtCount(): number {
        return UIPixelArt._activePixelArtCount;
    }

    /**
     * Resolves the 0-based pixel art slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based pixel art slot index, or -1 if invalid or unallocated.
     */
    protected static _resolvePixelArtSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        return UIPixelArt._elementToPixelArtSlot[elementSlot];
    }

    /**
     * Initializes the static stream reader with the payload string.
     * @param data - The payload string.
     */
    private static _initReader(data: string): void {
        UIPixelArt._readerStr = data;
        UIPixelArt._readerLen = data.length;
        UIPixelArt._readerCharIdx = 0;
        UIPixelArt._readerB64Buffer = 0;
        UIPixelArt._readerB64Bits = 0;
        UIPixelArt._readerB122Byte = 0;
        UIPixelArt._readerB122BitOfByte = 0;
        UIPixelArt._readerB122Pending7Bit = -1;

        const len = data.length;
        const lookup = UIPixelArt._B64_LOOKUP;
        let isB122 = false;

        for (let i = 0; i < len; ++i) {
            const c = data.charCodeAt(i);

            if (c > 127 || (c !== 61 && lookup[c] === -1)) {
                isB122 = true;
                break;
            }
        }

        UIPixelArt._readerIsB122 = isB122;
    }

    /**
     * Reads the next 8-bit unsigned byte from the Base122 streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8FromB122(): number {
        const str = UIPixelArt._readerStr;
        const len = UIPixelArt._readerLen;
        const illegals = UIPixelArt._B122_ILLEGALS;

        while (UIPixelArt._readerCharIdx < len || UIPixelArt._readerB122Pending7Bit !== -1) {
            let sevenBit: number;

            if (UIPixelArt._readerB122Pending7Bit !== -1) {
                sevenBit = UIPixelArt._readerB122Pending7Bit;
                UIPixelArt._readerB122Pending7Bit = -1;
            } else {
                const c = str.charCodeAt(UIPixelArt._readerCharIdx++);

                if (c > 127) {
                    const illegalIndex = (c >>> 8) & 7;

                    if (illegalIndex !== 7) {
                        sevenBit = illegals[illegalIndex];
                        UIPixelArt._readerB122Pending7Bit = c & 127;
                    } else {
                        sevenBit = c & 127;
                    }
                } else {
                    sevenBit = c;
                }
            }

            const b = sevenBit << 1;
            UIPixelArt._readerB122Byte |= b >>> UIPixelArt._readerB122BitOfByte;
            UIPixelArt._readerB122BitOfByte += 7;

            if (UIPixelArt._readerB122BitOfByte < 8) continue;

            const result = UIPixelArt._readerB122Byte;
            UIPixelArt._readerB122BitOfByte -= 8;
            UIPixelArt._readerB122Byte = (b << (7 - UIPixelArt._readerB122BitOfByte)) & 255;

            return result;
        }

        return -1;
    }

    /**
     * Reads the next 8-bit unsigned byte from the Base64 streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8FromB64(): number {
        const base64 = UIPixelArt._readerStr;
        const len = UIPixelArt._readerLen;
        const lookup = UIPixelArt._B64_LOOKUP;

        while (UIPixelArt._readerB64Bits < 8 && UIPixelArt._readerCharIdx < len) {
            const charCode = base64.charCodeAt(UIPixelArt._readerCharIdx++);

            if (charCode === 61) break; // '=' padding

            if (charCode > 255) continue;

            const val = lookup[charCode];

            if (val === -1) continue;

            UIPixelArt._readerB64Buffer = (UIPixelArt._readerB64Buffer << 6) | val;
            UIPixelArt._readerB64Bits += 6;
        }

        if (UIPixelArt._readerB64Bits < 8) return -1;

        UIPixelArt._readerB64Bits -= 8;

        return (UIPixelArt._readerB64Buffer >>> UIPixelArt._readerB64Bits) & 0xff;
    }

    /**
     * Reads the next 8-bit unsigned byte from the streaming decoder.
     * @returns The byte value (0..255) or -1 if end of stream or corrupted.
     */
    private static _readUint8(): number {
        return UIPixelArt._readerIsB122 ? UIPixelArt._readUint8FromB122() : UIPixelArt._readUint8FromB64();
    }

    /**
     * Reads the next 16-bit unsigned little-endian integer from the streaming decoder.
     * @returns The 16-bit integer (0..65535) or -1 if end of stream or corrupted.
     */
    private static _readUint16(): number {
        const b0 = UIPixelArt._readUint8();
        const b1 = UIPixelArt._readUint8();

        if (b0 === -1 || b1 === -1) return -1;

        return b0 | (b1 << 8);
    }

    /**
     * Parses the RGB/RGBA color palette from the stream into the static palette caches.
     * @param hasOpacity - Whether the palette entries contain an alpha channel byte.
     * @returns True if parsing succeeded, false if data was invalid or corrupted.
     */
    private static _parseColorPalette(hasOpacity: boolean): boolean {
        const rawPaletteCount = UIPixelArt._readUint8();

        if (rawPaletteCount === -1) {
            UIPixelArt._logging.log('Invalid palette header', UI.LogLevel.Error);
            return false;
        }

        const paletteCount = rawPaletteCount + 1;

        for (let i = 0; i < paletteCount; ++i) {
            const rawR = UIPixelArt._readUint8();
            const rawG = UIPixelArt._readUint8();
            const rawB = UIPixelArt._readUint8();
            const rawA = hasOpacity ? UIPixelArt._readUint8() : 255;

            if (rawR === -1 || rawG === -1 || rawB === -1 || rawA === -1) {
                UIPixelArt._logging.log('Corrupted palette data', UI.LogLevel.Error);
                return false;
            }

            const r = rawR / 255;
            const g = rawG / 255;
            const b = rawB / 255;
            const a = rawA / 255;

            UIPixelArt._paletteColors[i] = mod.CreateVector(r, g, b);
            UIPixelArt._paletteAlphas[i] = a;
        }

        return true;
    }

    /**
     * Parses the monochrome alpha palette from the stream into the static palette alphas cache.
     * @returns True if parsing succeeded, false if data was invalid or corrupted.
     */
    private static _parseAlphaPalette(): boolean {
        const rawPaletteCount = UIPixelArt._readUint8();

        if (rawPaletteCount === -1) {
            UIPixelArt._logging.log('Invalid palette header', UI.LogLevel.Error);
            return false;
        }

        const paletteCount = rawPaletteCount + 1;

        for (let i = 0; i < paletteCount; ++i) {
            const rawA = UIPixelArt._readUint8();

            if (rawA === -1) {
                UIPixelArt._logging.log('Corrupted alpha palette data', UI.LogLevel.Error);
                return false;
            }

            UIPixelArt._paletteAlphas[i] = rawA / 255;
        }

        return true;
    }

    private static _pushPendingPixelArt(elementId: number): void {
        if (UIPixelArt._pendingPixelArtCount >= UIPixelArt.MAX_PIXEL_ARTS) {
            UIPixelArt._logging.log('Pending pixel art queue overflow', UI.LogLevel.Error);
            return;
        }

        UIPixelArt._pendingPixelArtIds[UIPixelArt._pendingPixelArtTail] = elementId;
        UIPixelArt._pendingPixelArtTail = (UIPixelArt._pendingPixelArtTail + 1) % UIPixelArt.MAX_PIXEL_ARTS;
        UIPixelArt._pendingPixelArtCount++;
    }

    private static _popPendingPixelArt(): number | null {
        while (UIPixelArt._pendingPixelArtCount > 0) {
            const elementId = UIPixelArt._pendingPixelArtIds[UIPixelArt._pendingPixelArtHead];
            UIPixelArt._pendingPixelArtHead = (UIPixelArt._pendingPixelArtHead + 1) % UIPixelArt.MAX_PIXEL_ARTS;
            UIPixelArt._pendingPixelArtCount--;

            const paSlot = UIPixelArt._resolvePixelArtSlot(elementId);

            if (paSlot !== UI.Element._INVALID_INDEX) return elementId;
        }

        return null;
    }

    private static _activatePixelArt(elementId: number): boolean {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return false;

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX) return false;

        const data = UIPixelArt._pendingData[paSlot];

        if (data == null) return false;

        UIPixelArt._activeThrottledId = elementId;
        UIPixelArt._initReader(data);

        // Free payload immediately upon activation
        UIPixelArt._pendingData[paSlot] = null;

        const flags = UIPixelArt._readUint8();

        if (flags === -1) {
            UIPixelArt._logging.log('Corrupted pixel art data payload', UI.LogLevel.Error);
            UIPixelArt._endActiveOperation();
            return false;
        }

        const hasOpacity = (flags & UIPixelArt._HEADER_FLAG_HAS_OPACITY) !== 0;
        const is16BitCoords = (flags & UIPixelArt._HEADER_FLAG_16BIT_COORDS) !== 0;
        const isMonochrome = (flags & UIPixelArt._HEADER_FLAG_MONOCHROME) !== 0;

        let gridWidth = 0;
        let gridHeight = 0;

        if (is16BitCoords) {
            gridWidth = UIPixelArt._readUint16();
            gridHeight = UIPixelArt._readUint16();
        } else {
            gridWidth = UIPixelArt._readUint8();
            gridHeight = UIPixelArt._readUint8();
        }

        if (gridWidth <= 0 || gridHeight <= 0) {
            UIPixelArt._logging.log('Invalid pixel art dimensions', UI.LogLevel.Error);
            UIPixelArt._endActiveOperation();
            return false;
        }

        const fgColor = UI.Element._getForegroundColor(elementSlot);

        if (!isMonochrome) {
            if (!UIPixelArt._parseColorPalette(hasOpacity)) {
                UIPixelArt._endActiveOperation();
                return false;
            }
        } else if (hasOpacity) {
            if (!UIPixelArt._parseAlphaPalette()) {
                UIPixelArt._endActiveOperation();
                return false;
            }
        }

        const rectCount = UIPixelArt._readUint16();

        if (rectCount === -1) {
            UIPixelArt._logging.log('Invalid rectangle count', UI.LogLevel.Error);
            UIPixelArt._endActiveOperation();
            return false;
        }

        const baseWidth = UI.Element._getWidth(elementSlot);
        const baseHeight = UI.Element._getHeight(elementSlot);

        UIPixelArt._activeCellWidth = baseWidth / gridWidth;
        UIPixelArt._activeCellHeight = baseHeight / gridHeight;
        UIPixelArt._activeIs16BitCoords = is16BitCoords;
        UIPixelArt._activeIsMonochrome = isMonochrome;
        UIPixelArt._activeHasOpacity = hasOpacity;
        UIPixelArt._activeMonoColorVec = isMonochrome ? Colors.toVector(fgColor ?? UI.COLORS.WHITE) : null;

        UIPixelArt._rectCount = rectCount;
        UIPixelArt._rectCursor = 0;
        UIPixelArt._childWidgets[paSlot] = new Array<mod.UIWidget>(rectCount);

        if (rectCount === 0) {
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_IDLE);
            UIPixelArt._endActiveOperation();
        }

        return true;
    }

    private static _activateUpdate(elementId: number): boolean {
        const paSlot = UIPixelArt._resolvePixelArtSlot(elementId);

        if (paSlot === UI.Element._INVALID_INDEX) return false;

        const childWidgets = UIPixelArt._childWidgets[paSlot];

        if (!childWidgets || childWidgets.length === 0) {
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_IDLE);
            return false;
        }

        UIPixelArt._activeThrottledId = elementId;
        UIPixelArt._rectCursor = 0;
        UIPixelArt._rectCount = childWidgets.length;

        return true;
    }

    private static _activateDelete(elementId: number): boolean {
        const paSlot = UIPixelArt._resolvePixelArtSlot(elementId);

        if (paSlot === UI.Element._INVALID_INDEX) return false;

        // Free any payload that was never decoded (deleted before first activation)
        UIPixelArt._pendingData[paSlot] = null;
        UIPixelArt._readerStr = '';

        UIPixelArt._activeThrottledId = elementId;
        UIPixelArt._rectCursor = 0;
        UIPixelArt._rectCount = UIPixelArt._childWidgets[paSlot]?.length ?? 0;

        return true;
    }

    private static _activateNext(elementId: number): boolean {
        const paSlot = UIPixelArt._resolvePixelArtSlot(elementId);

        if (paSlot === UI.Element._INVALID_INDEX) return false;

        const state = UIPixelArt._getState(paSlot);

        if (state === UIPixelArt._STATE_DRAWING) return UIPixelArt._activatePixelArt(elementId);

        if (state === UIPixelArt._STATE_UPDATING) return UIPixelArt._activateUpdate(elementId);

        if (state === UIPixelArt._STATE_DELETING) return UIPixelArt._activateDelete(elementId);

        return false;
    }

    private static _endActiveOperation(): void {
        UIPixelArt._activeThrottledId = UI.Element._INVALID_INDEX;
        UIPixelArt._rectCount = 0;
        UIPixelArt._rectCursor = 0;
        UIPixelArt._readerStr = '';
    }

    private static _drawBatch(budget: number): number {
        const elementId = UIPixelArt._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const artWidget = UIPixelArt._artWidgets[paSlot];

        if (!artWidget) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const childWidgets = UIPixelArt._childWidgets[paSlot];

        if (!childWidgets) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const paInstance = UI.Element._getInstance(elementSlot) as UIPixelArt | undefined;

        if (!paInstance || !paInstance._isValid) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const receiver = paInstance._receiver;
        const depth = paInstance.depth ?? UI.Depth.AboveGameUI;
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeTopLeft = UI.Element._getNativeAnchor(UI.Anchor.TopLeft);
        const nativeBgFillSolid = UI.Element._getNativeBgFill(UI.BgFill.Solid);
        const name = paInstance._name;

        const cellWidth = UIPixelArt._activeCellWidth;
        const cellHeight = UIPixelArt._activeCellHeight;
        const is16BitCoords = UIPixelArt._activeIs16BitCoords;
        const isMonochrome = UIPixelArt._activeIsMonochrome;
        const hasOpacity = UIPixelArt._activeHasOpacity;
        const monoColorVec = UIPixelArt._activeMonoColorVec;

        let drawn = 0;

        while (UIPixelArt._rectCursor < UIPixelArt._rectCount && drawn < budget) {
            let rx = 0;
            let ry = 0;
            let rw = 0;
            let rh = 0;

            if (is16BitCoords) {
                rx = UIPixelArt._readUint16();
                ry = UIPixelArt._readUint16();
                rw = UIPixelArt._readUint16();
                rh = UIPixelArt._readUint16();
            } else {
                rx = UIPixelArt._readUint8();
                ry = UIPixelArt._readUint8();
                rw = UIPixelArt._readUint8();
                rh = UIPixelArt._readUint8();
            }

            if (rx === -1 || ry === -1 || rw === -1 || rh === -1) {
                UIPixelArt._logging.log('Corrupted rectangle stream', UI.LogLevel.Error);
                break;
            }

            let paletteIdx = 0;
            let colorVec: mod.Vector;
            let alphaVal: number;

            if (isMonochrome) {
                if (hasOpacity) {
                    paletteIdx = UIPixelArt._readUint8();

                    if (paletteIdx === -1) break;

                    colorVec = monoColorVec!;
                    alphaVal = UIPixelArt._paletteAlphas[paletteIdx] ?? 1;
                } else {
                    paletteIdx = 0;
                    colorVec = monoColorVec!;
                    alphaVal = 1;
                }
            } else {
                paletteIdx = UIPixelArt._readUint8();

                if (paletteIdx === -1) break;

                colorVec = UIPixelArt._paletteColors[paletteIdx] ?? UI.ZERO_VECTOR;
                alphaVal = UIPixelArt._paletteAlphas[paletteIdx] ?? 1;
            }

            const x0 = Math.round(rx * cellWidth);
            const y0 = Math.round(ry * cellHeight);
            const x1 = Math.round((rx + rw) * cellWidth);
            const y1 = Math.round((ry + rh) * cellHeight);
            const w = Math.max(1, x1 - x0);
            const h = Math.max(1, y1 - y0);

            const cursor = UIPixelArt._rectCursor;
            const childName = `${name}_art_${cursor + 1}`;

            if (!receiver || !receiver.nativeReceiver) {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0 - 0.01, y0 - 0.01, 0),
                    mod.CreateVector(w + 0.02, h + 0.02, 0),
                    nativeTopLeft,
                    artWidget,
                    true,
                    0,
                    colorVec,
                    alphaVal,
                    nativeBgFillSolid,
                    nativeDepth
                );
            } else {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0 - 0.01, y0 - 0.01, 0),
                    mod.CreateVector(w + 0.02, h + 0.02, 0),
                    nativeTopLeft,
                    artWidget,
                    true,
                    0,
                    colorVec,
                    alphaVal,
                    nativeBgFillSolid,
                    nativeDepth,
                    receiver.nativeReceiver
                );
            }

            childWidgets[cursor] = mod.FindUIWidgetWithName(childName) as mod.UIWidget;
            UIPixelArt._rectCursor++;
            drawn++;
        }

        if (UIPixelArt._rectCursor < UIPixelArt._rectCount) return drawn;

        // End of active draw stream
        UIPixelArt._readerStr = '';

        if (UIPixelArt._getMidDrawDirty(paSlot)) {
            UIPixelArt._setMidDrawDirty(paSlot, false);
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_UPDATING);
            UIPixelArt._rectCursor = 0;
        } else {
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_IDLE);
            UIPixelArt._endActiveOperation();
        }

        return drawn;
    }

    private static _updateBatch(budget: number): number {
        const elementId = UIPixelArt._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const childWidgets = UIPixelArt._childWidgets[paSlot];

        if (!childWidgets || childWidgets.length === 0) {
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_IDLE);
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const color = UI.Element._getForegroundColor(elementSlot);
        const colorVec = Colors.toVector(color);
        let updated = 0;

        while (UIPixelArt._rectCursor < UIPixelArt._rectCount && updated < budget) {
            const w = childWidgets[UIPixelArt._rectCursor];

            if (w) {
                mod.SetUIWidgetBgColor(w, colorVec);
            }

            UIPixelArt._rectCursor++;
            updated++;
        }

        if (UIPixelArt._rectCursor >= UIPixelArt._rectCount) {
            UIPixelArt._setState(paSlot, UIPixelArt._STATE_IDLE);
            UIPixelArt._endActiveOperation();
        }

        return updated;
    }

    private static _deleteBatch(budget: number): number {
        const elementId = UIPixelArt._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._endActiveOperation();
            return 0;
        }

        const childWidgets = UIPixelArt._childWidgets[paSlot];
        let deleted = 0;

        if (childWidgets) {
            while (UIPixelArt._rectCursor < UIPixelArt._rectCount && deleted < budget) {
                const w = childWidgets[UIPixelArt._rectCursor];

                if (w) {
                    mod.DeleteUIWidget(w);
                    childWidgets[UIPixelArt._rectCursor] = null as unknown as mod.UIWidget;
                }

                UIPixelArt._rectCursor++;
                deleted++;
            }
        }

        if (UIPixelArt._rectCursor < UIPixelArt._rectCount) return deleted;

        if (childWidgets) {
            childWidgets.length = 0;
            UIPixelArt._childWidgets[paSlot] = null;
        }

        const artWidget = UIPixelArt._artWidgets[paSlot];

        if (artWidget) {
            mod.DeleteUIWidget(artWidget);
            UIPixelArt._artWidgets[paSlot] = null;
        }

        const instance = UI.Element._getInstance(elementSlot) as UIPixelArt | undefined;

        UIPixelArt._endActiveOperation();

        if (instance) {
            instance._finalizeDelete();
        }

        return deleted;
    }

    private static _handleTick = (): void => {
        let budget = UIPixelArt.tickBudget;

        while (budget > 0.001) {
            if (UIPixelArt._activeThrottledId === UI.Element._INVALID_INDEX) {
                const nextId = UIPixelArt._popPendingPixelArt();

                if (nextId === null) break;

                if (!UIPixelArt._activateNext(nextId)) continue;
            }

            if (UIPixelArt._activeThrottledId === UI.Element._INVALID_INDEX) continue;

            const paSlot = UIPixelArt._resolvePixelArtSlot(UIPixelArt._activeThrottledId);

            if (paSlot === UI.Element._INVALID_INDEX) {
                UIPixelArt._endActiveOperation();
                continue;
            }

            const state = UIPixelArt._getState(paSlot);

            if (state === UIPixelArt._STATE_DRAWING) {
                const cost = Math.max(0.001, UIPixelArt.drawCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const drawn = UIPixelArt._drawBatch(allowed);

                if (drawn === 0) {
                    UIPixelArt._endActiveOperation();
                    continue;
                }

                budget -= drawn * cost;

                if (
                    UIPixelArt._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIPixelArt._getState(paSlot) === UIPixelArt._STATE_DRAWING &&
                    UIPixelArt._rectCursor < UIPixelArt._rectCount
                ) {
                    break;
                }
            } else if (state === UIPixelArt._STATE_UPDATING) {
                const cost = Math.max(0.001, UIPixelArt.updateCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const updated = UIPixelArt._updateBatch(allowed);

                if (updated === 0) {
                    UIPixelArt._endActiveOperation();
                    continue;
                }

                budget -= updated * cost;

                if (
                    UIPixelArt._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIPixelArt._rectCursor < UIPixelArt._rectCount
                ) {
                    break;
                }
            } else if (state === UIPixelArt._STATE_DELETING) {
                const cost = Math.max(0.001, UIPixelArt.deleteCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const deleted = UIPixelArt._deleteBatch(allowed);

                if (deleted === 0) {
                    UIPixelArt._endActiveOperation();
                    continue;
                }

                budget -= deleted * cost;

                if (
                    UIPixelArt._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIPixelArt._rectCursor < UIPixelArt._rectCount
                ) {
                    break;
                }
            } else {
                UIPixelArt._endActiveOperation();
            }
        }
    };

    private static _ensureTickSubscribed(): void {
        if (UIPixelArt._isSubscribed) return;

        UIPixelArt._isSubscribed = true;
        Events.OnTickStart.subscribe(UIPixelArt._handleTick, Events.EventPriority.Last);
    }

    /**
     * Creates a new optimized pixel art element.
     * @param params - The parameters for the pixel art.
     */
    public constructor(params: UIPixelArt.Params) {
        super(params);

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        if (!params.data || params.data.length === 0) {
            UIPixelArt._logging.log('Invalid or empty pixel art data payload', UI.LogLevel.Error);
            super.delete();
            return;
        }

        UIPixelArt._initReader(params.data);

        // Parse Header
        const flags = UIPixelArt._readUint8();

        if (flags === -1) {
            UIPixelArt._logging.log('Invalid or empty pixel art data payload', UI.LogLevel.Error);
            UIPixelArt._readerStr = '';
            super.delete();
            return;
        }

        const is16BitCoords = (flags & UIPixelArt._HEADER_FLAG_16BIT_COORDS) !== 0;
        const isMonochrome = (flags & UIPixelArt._HEADER_FLAG_MONOCHROME) !== 0;

        let gridWidth = 0;
        let gridHeight = 0;

        if (is16BitCoords) {
            gridWidth = UIPixelArt._readUint16();
            gridHeight = UIPixelArt._readUint16();
        } else {
            gridWidth = UIPixelArt._readUint8();
            gridHeight = UIPixelArt._readUint8();
        }

        // Release reader string reference
        UIPixelArt._readerStr = '';

        if (gridWidth <= 0 || gridHeight <= 0) {
            UIPixelArt._logging.log('Invalid pixel art dimensions', UI.LogLevel.Error);
            super.delete();
            return;
        }

        const paSlot = this._allocatePixelArtSlot(isMonochrome);

        if (paSlot === UI.Element._INVALID_INDEX) {
            super.delete();
            return;
        }

        // Foreground color for monochrome images
        const fgColor = params.color ?? (isMonochrome ? UI.COLORS.WHITE : undefined);

        if (isMonochrome && fgColor) {
            UI.Element._setForegroundColor(this._slot, fgColor);
        }

        // Sizing & Positioning from ElementParams
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const baseWidth = width > 0 ? width : gridWidth;
        const baseHeight = height > 0 ? height : gridHeight;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const depth = params.depth ?? UI.Depth.AboveGameUI;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeCenterAnchor = UI.Element._getNativeAnchor(UI.Anchor.Center);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeBgFill = UI.Element._getNativeBgFill(params.bgFill ?? UI.BgFill.Solid);
        const nativeBgFillNone = UI.Element._getNativeBgFill(UI.BgFill.None);

        const rootBgColor = params.bgColor ?? UI.COLORS.BLACK;
        const bgA = params.bgAlpha ?? 0;

        // 1. Draw "Base Container" (at x, y, width, height, parent, depth, receiver, visible, anchoring)
        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(rootBgColor),
                bgA,
                nativeBgFill,
                nativeDepth
            );
        } else {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(rootBgColor),
                bgA,
                nativeBgFill,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);
        this.setSize({ width: baseWidth, height: baseHeight });

        const baseContainerWidget = this._uiWidget!;

        // 2. Draw "Art Container" (parent is base container, same size as base container, x=0, y=0, anchor=Center)
        const artName = `${name}_art`;

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                artName,
                UI.ZERO_VECTOR,
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeCenterAnchor,
                baseContainerWidget,
                true,
                0,
                UI.ZERO_VECTOR,
                0,
                nativeBgFillNone,
                nativeDepth
            );
        } else {
            mod.AddUIContainer(
                artName,
                UI.ZERO_VECTOR,
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeCenterAnchor,
                baseContainerWidget,
                true,
                0,
                UI.ZERO_VECTOR,
                0,
                nativeBgFillNone,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        const artWidget = mod.FindUIWidgetWithName(artName) as mod.UIWidget;
        UIPixelArt._artWidgets[paSlot] = artWidget;

        // Store payload and enqueue into two-tier throttling dispatcher
        UIPixelArt._pendingData[paSlot] = params.data;
        UIPixelArt._setState(paSlot, UIPixelArt._STATE_DRAWING);

        UIPixelArt._ensureTickSubscribed();
        UIPixelArt._pushPendingPixelArt(this._id);
    }

    /**
     * @inheritdoc
     */
    protected override _handleFlush(flags: number, widget: mod.UIWidget): void {
        super._handleFlush(flags, widget);

        const slot = this._slot;
        const paSlot = UIPixelArt._elementToPixelArtSlot[slot];

        if (paSlot === UI.Element._INVALID_INDEX) return;

        if (!UIPixelArt._isMonochrome(paSlot)) return;

        const dirtyColor = (flags & UI.Element._DIRTY_FOREGROUND_COLOR) !== 0;

        if (!dirtyColor) return;

        const children = UIPixelArt._childWidgets[paSlot];

        if (!children) return;

        const colorVec = Colors.toVector(UI.Element._getForegroundColor(slot));

        for (let i = 0; i < children.length; ++i) {
            const childWidget = children[i];

            if (!childWidget) continue;

            mod.SetUIWidgetBgColor(childWidget, colorVec);
        }
    }

    protected get _pixelArtSlot(): number {
        const slot = this._slot;
        return slot !== UI.Element._INVALID_INDEX ? UIPixelArt._elementToPixelArtSlot[slot] : UI.Element._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._pixelArtSlot !== UI.Element._INVALID_INDEX;
    }

    public override get isDeleted(): boolean {
        if (super.isDeleted) return true;

        const paSlot = this._pixelArtSlot;

        if (paSlot === UI.Element._INVALID_INDEX) return true;

        return UIPixelArt._getState(paSlot) === UIPixelArt._STATE_DELETING;
    }

    /**
     * Resolves the 0-based slot for this instance and logs a warning if invalid.
     * @returns The 0-based pixel art slot index, or -1 if invalid or unallocated.
     */
    protected _resolvePixelArtSlotAndLogWarning(): number {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX) {
            UIPixelArt._logging.log('Pixel art element is deleted', UI.LogLevel.Warning);
            return UI.Element._INVALID_INDEX;
        }

        return paSlot;
    }

    /**
     * Checks if this instance is invalid and logs a warning if so.
     * @returns True if invalid, false if valid.
     */
    protected override _getIsInvalidAndLogWarning(): boolean {
        return this._resolvePixelArtSlotAndLogWarning() === UI.Element._INVALID_INDEX;
    }

    /**
     * Allocates a pixel art slot from the static sub-pool.
     * @param isMonochrome - Whether the pixel art is monochrome.
     * @returns The allocated slot index, or -1 if full or invalid.
     */
    private _allocatePixelArtSlot(isMonochrome: boolean): number {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return UI.Element._INVALID_INDEX;

        if (UIPixelArt._firstFreePixelArt === UI.Element._INVALID_INDEX) {
            UIPixelArt._logging.log('Pixel art pool is full', UI.LogLevel.Error);
            return UI.Element._INVALID_INDEX;
        }

        const slot = UIPixelArt._firstFreePixelArt;
        UIPixelArt._firstFreePixelArt = UIPixelArt._nextFreePixelArt[slot];

        UIPixelArt._nextFreePixelArt[slot] =
            ((UIPixelArt._STATE_DRAWING & UIPixelArt._STATE_MASK) << UIPixelArt._STATE_SHIFT) |
            (isMonochrome ? UIPixelArt._FLAG_MONOCHROME : 0);

        UIPixelArt._childWidgets[slot] = null;
        UIPixelArt._pendingData[slot] = null;
        UIPixelArt._elementToPixelArtSlot[elementSlot] = slot;
        UIPixelArt._activePixelArtCount++;

        return slot;
    }

    /**
     * Frees the pixel art slot associated with this instance.
     */
    private _freePixelArtSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const paSlot = UIPixelArt._elementToPixelArtSlot[elementSlot];

        if (paSlot === UI.Element._INVALID_INDEX || paSlot < 0 || paSlot >= UIPixelArt.MAX_PIXEL_ARTS) return;

        UIPixelArt._artWidgets[paSlot] = null;

        if (UIPixelArt._childWidgets[paSlot]) {
            UIPixelArt._childWidgets[paSlot]!.length = 0;
            UIPixelArt._childWidgets[paSlot] = null;
        }

        UIPixelArt._pendingData[paSlot] = null;
        UIPixelArt._elementToPixelArtSlot[elementSlot] = UI.Element._INVALID_INDEX;
        UIPixelArt._activePixelArtCount--;

        if (UIPixelArt._generations[paSlot] < UIPixelArt._MAX_GENERATIONS) {
            UIPixelArt._generations[paSlot]++;
            UIPixelArt._nextFreePixelArt[paSlot] = UIPixelArt._firstFreePixelArt;
            UIPixelArt._firstFreePixelArt = paSlot;
        } else if (UIPixelArt._logging.willLog(UI.LogLevel.Warning)) {
            UIPixelArt._logging.log(
                `Pixel art slot ${paSlot} exhausted max generations and was retired`,
                UI.LogLevel.Warning
            );
        }
    }

    /**
     * @inheritdoc
     */
    protected _finalizeDelete(): void {
        this._freePixelArtSlot();
        super.delete();
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this.isDeleted) return;

        const paSlot = this._pixelArtSlot;

        if (paSlot === UI.Element._INVALID_INDEX) return;

        const currentState = UIPixelArt._getState(paSlot);

        if (currentState === UIPixelArt._STATE_DELETING) return;

        const widgets = UIPixelArt._childWidgets[paSlot];

        if (!widgets || widgets.length === 0) {
            if (this._id === UIPixelArt._activeThrottledId) {
                UIPixelArt._endActiveOperation();
            }

            const artWidget = UIPixelArt._artWidgets[paSlot];

            if (artWidget) {
                mod.DeleteUIWidget(artWidget);
                UIPixelArt._artWidgets[paSlot] = null;
            }

            this._finalizeDelete();
            return;
        }

        UIPixelArt._setState(paSlot, UIPixelArt._STATE_DELETING);
        UIPixelArt._setMidDrawDirty(paSlot, false);

        if (this._id === UIPixelArt._activeThrottledId) {
            const countToDelete = currentState === UIPixelArt._STATE_DRAWING ? UIPixelArt._rectCursor : widgets.length;
            UIPixelArt._rectCursor = 0;
            UIPixelArt._rectCount = countToDelete;
        } else if (currentState === UIPixelArt._STATE_IDLE) {
            UIPixelArt._ensureTickSubscribed();
            UIPixelArt._pushPendingPixelArt(this._id);
        }
    }

    /**
     * The current lifecycle state of this pixel art (Idle, Drawing, Updating, Deleting),
     * or undefined if the element has been deleted.
     * @returns The current lifecycle state, or undefined if deleted.
     */
    public get state(): UIPixelArt.State | undefined {
        if (this.isDeleted) return undefined;

        const paSlot = this._pixelArtSlot;

        if (paSlot === UI.Element._INVALID_INDEX) return undefined;

        return UIPixelArt._getState(paSlot);
    }

    /**
     * The rendering progress of this pixel art from 0 to 100 percent.
     * Returns 100 when Idle, 0 when queued, Math.floor((cursor / count) * 100)
     * when actively Drawing, Updating, or Deleting, or undefined if deleted.
     * @returns The operation progress (0..100) or undefined if deleted.
     */
    public get progress(): number | undefined {
        if (this.isDeleted) return undefined;

        const paSlot = this._pixelArtSlot;

        if (paSlot === UI.Element._INVALID_INDEX) return undefined;

        const state = UIPixelArt._getState(paSlot);

        if (state === UIPixelArt._STATE_IDLE) return 100;

        if (this._id === UIPixelArt._activeThrottledId) {
            return UIPixelArt._rectCount > 0 ? Math.floor((UIPixelArt._rectCursor / UIPixelArt._rectCount) * 100) : 100;
        }

        return 0;
    }

    /**
     * Indicates whether all child rectangle widgets have finished rendering and the pixel art is idle.
     * Returns true when Idle, false when Drawing, Updating, or Deleting,
     * or undefined if the element has been deleted.
     * @returns True if idle, false if busy, or undefined if deleted.
     */
    public get isReady(): boolean | undefined {
        if (this.isDeleted) return undefined;

        const paSlot = this._pixelArtSlot;

        if (paSlot === UI.Element._INVALID_INDEX) return undefined;

        const state = UIPixelArt._getState(paSlot);

        return state === UIPixelArt._STATE_IDLE;
    }

    /**
     * Whether this pixel art instance is monochrome.
     * @returns True if monochrome, false if multi-color, or undefined if deleted.
     */
    public get isMonochrome(): boolean | undefined {
        const paSlot = this._pixelArtSlot;
        return paSlot === UI.Element._INVALID_INDEX ? undefined : UIPixelArt._isMonochrome(paSlot);
    }

    /**
     * The total number of native draw calls (containers) used by this pixel art element.
     * Includes the base container, art container, and all child rectangle widgets.
     * @returns The draw call count, or undefined if deleted.
     */
    public get drawCallCount(): number | undefined {
        if (this.isDeleted) return undefined;

        const slot = this._pixelArtSlot;

        if (slot === UI.Element._INVALID_INDEX) return undefined;

        const widgets = UIPixelArt._childWidgets[slot];

        let count = 2; // Base Container + Art Container

        if (!widgets) return count;

        for (let i = 0; i < widgets.length; ++i) {
            if (widgets[i]) {
                count++;
            }
        }

        return count;
    }

    /**
     * The foreground/tint color of the pixel art.
     * @returns The foreground color for monochrome images, null for multi-color images, or undefined if deleted.
     */
    public get color(): Colors.Color | null | undefined {
        const slot = this._slot;

        if (slot === UI.Element._INVALID_INDEX) return undefined;

        const paSlot = UIPixelArt._elementToPixelArtSlot[slot];

        if (paSlot === UI.Element._INVALID_INDEX) return undefined;

        return UIPixelArt._isMonochrome(paSlot) ? UI.Element._getForegroundColor(slot) : null;
    }

    /**
     * Sets the foreground/tint color of the pixel art.
     * Only applies to monochrome pixel art images (no-op for multi-color).
     * @param color - The new foreground/tint color.
     */
    public set color(color: Colors.Color) {
        this.setColor(color);
    }

    /**
     * Gets the foreground/tint color of the pixel art into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The foreground color for monochrome images, null for multi-color images, or undefined if deleted.
     */
    public getColor(out?: Colors.Color): Colors.Color | null | undefined {
        const slot = this._slot;

        if (slot === UI.Element._INVALID_INDEX) return undefined;

        const paSlot = UIPixelArt._elementToPixelArtSlot[slot];

        if (paSlot === UI.Element._INVALID_INDEX) return undefined;

        return UIPixelArt._isMonochrome(paSlot) ? UI.Element._getForegroundColor(slot, out) : null;
    }

    /**
     * Sets the foreground/tint color of the pixel art.
     * Batches native color updates across ticks using updateCost and tickBudget.
     * Only applies to monochrome pixel art images (no-op for multi-color).
     * @param color - The new foreground/tint color.
     * @returns This element for chaining.
     */
    public setColor(color: Colors.Color): this {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return this;

        const paSlot = this._resolvePixelArtSlotAndLogWarning();

        if (paSlot === UI.Element._INVALID_INDEX || !UIPixelArt._isMonochrome(paSlot)) return this;

        if (UI.Element._setForegroundColor(elementSlot, color)) {
            UI.Element._markDirty(elementSlot, UI.Element._DIRTY_FOREGROUND_COLOR);
        }

        const state = UIPixelArt._getState(paSlot);

        if (state === UIPixelArt._STATE_DELETING) return this;

        if (state === UIPixelArt._STATE_DRAWING) {
            if (this._id === UIPixelArt._activeThrottledId && UIPixelArt._rectCursor > 0) {
                UIPixelArt._setMidDrawDirty(paSlot, true);
            }

            return this;
        }

        if (state === UIPixelArt._STATE_UPDATING) {
            if (this._id === UIPixelArt._activeThrottledId) {
                UIPixelArt._rectCursor = 0;
            }

            return this;
        }

        // State is Idle: transition to Updating and enqueue
        UIPixelArt._setState(paSlot, UIPixelArt._STATE_UPDATING);
        UIPixelArt._ensureTickSubscribed();
        UIPixelArt._pushPendingPixelArt(this._id);

        return this;
    }
}

export namespace UIPixelArt {
    /**
     * Throttled operation lifecycle states.
     */
    export enum State {
        Idle = 0,
        Drawing = 1,
        Updating = 2,
        Deleting = 3,
    }

    /**
     * Parameters for creating a UIPixelArt element.
     */
    export type Params = UI.ElementParams & {
        /** The Base64 or Base122 encoded pixel art payload. */
        data: string;
        /** Optional foreground color (monochrome) or tint color (multi-color). */
        color?: Colors.Color;
    };
}
