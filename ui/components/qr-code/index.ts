import { Colors } from '../../../colors/index.ts';
import { Events } from '../../../events/index.ts';
import { QREncoder } from './encoder.ts';
import { UI } from '../../index.ts';

// version: 1.0.0
export class UIQRCode extends UI.Element {
    /**
     * The maximum number of QR code widgets that can exist concurrently in memory.
     */
    public static readonly MAX_QR_CODES = 128;

    /**
     * Maximum supported QR Code version (1 through 40). Defaults to 18.
     * Determines the compile-time sizing of preallocated static scratch buffers (_scratchBuffer and _rectBuffer),
     * bounding memory consumption while accommodating large payloads up to Version 18 (~500+ alphanumeric characters).
     * Any payload requiring a version greater than `MAX_QR_VERSION` will safely fail initialization without drawing.
     */
    public static readonly MAX_QR_VERSION = 18;

    /**
     * Default quiet zone margin in module units per ISO/IEC 18004.
     */
    public static readonly DEFAULT_MARGIN = 4;

    /**
     * Minimum required quiet zone margin in module units per ISO/IEC 18004.
     */
    public static readonly MIN_QUIET_ZONE = 4;

    /**
     * Total native engine `mod` FFI execution cost budget permitted per server tick (`Events.OnTickStart`).
     * Operations consume from this budget according to their configured costs (`drawCost`, `updateCost`, `deleteCost`):
     * `cost = count * costPerOp`.
     * Defaults to 10.
     */
    public static tickBudget = 10;

    /**
     * Cost incurred per native widget container addition (`mod.AddUIContainer`).
     * Defaults to 1.0 (permitting up to 10 container creations per tick with default `tickBudget` of 10).
     */
    public static drawCost = 1.0;

    /**
     * Cost incurred per native widget background color update (`mod.SetUIWidgetBgColor`).
     * Defaults to 0.25 (permitting up to 40 widget color updates per tick with default `tickBudget` of 10).
     */
    public static updateCost = 0.25;

    /**
     * Cost incurred per native widget deletion (`mod.DeleteUIWidget`).
     * Defaults to 0.5 (permitting up to 20 widget deletions per tick with default `tickBudget` of 10).
     */
    public static deleteCost = 0.5;

    private static readonly MAX_QR_ORDER = 4 * UIQRCode.MAX_QR_VERSION + 17;

    private static readonly MAX_MODULES = UIQRCode.MAX_QR_ORDER * UIQRCode.MAX_QR_ORDER;

    private static readonly BASE_MODULE_SIZE = 10;

    private static readonly _MAX_GENERATIONS = 65_535;

    private static readonly _STATE_IDLE = 0;

    private static readonly _STATE_DRAWING = 1;

    private static readonly _STATE_UPDATING = 2;

    private static readonly _STATE_DELETING = 3;

    private static readonly _ECC_MASK = 0x3; // Bits 0..1

    private static readonly _STATE_SHIFT = 2;

    private static readonly _STATE_MASK = 0x3; // Bits 2..3

    private static readonly _STATE_CLEAR_MASK = ~(UIQRCode._STATE_MASK << UIQRCode._STATE_SHIFT); // ~0x0C

    private static readonly _DIRTY_COLOR_MID_DRAW = 1 << 4; // Bit 4

    private static _activeQrCodeCount: number = 0;

    private static _firstFreeQrCode: number = 0;

    private static readonly _generations = new Uint16Array(UIQRCode.MAX_QR_CODES);

    /**
     * Intrusive slot metadata array serving dual-duty to minimize QuickJS static memory:
     * - When inactive (slot is free): Stores the 0-based index of the next free slot in the intrusive free-list.
     * - When active (slot in use): Multiplexes packed runtime state bits:
     *     - Bits 0..1: 2-bit ECC mode index (0 = Low, 1 = Medium, 2 = Quartile, 3 = High).
     *     - Bits 2..3: 2-bit operational state (0 = Idle, 1 = Drawing, 2 = Updating, 3 = Deleting).
     *     - Bit 4: Mid-draw dirty flag indicating a color update occurred while actively drawing.
     */
    private static readonly _nextFreeQrCode = new Int16Array(UIQRCode.MAX_QR_CODES);

    private static readonly _elementToQRCodeSlot: Int16Array = UI.Element._elementToCustomSlot;

    private static readonly _qrWidgets = new Array<mod.UIWidget | null>(UIQRCode.MAX_QR_CODES);

    private static readonly _childWidgets = new Array<mod.UIWidget[] | null>(UIQRCode.MAX_QR_CODES);

    // Unified scratch buffer: Bit 0 = isFunction (1), Bit 1 = isDark (2), Bit 2 = isVisited (4)
    protected static readonly _scratchBuffer = new Uint8Array(UIQRCode.MAX_MODULES);

    // Tier 1 Queue: Pending generation-encoded element IDs (512 bytes)
    private static readonly _pendingQrIds = new Int32Array(UIQRCode.MAX_QR_CODES);

    private static _pendingQrHead = 0;

    private static _pendingQrTail = 0;

    private static _pendingQrCount = 0;

    // Tier 2 Active QR Packed Rectangle Buffer
    // Format: (col << 24) | (row << 16) | (spanW << 8) | spanH
    protected static readonly _rectBuffer = new Uint32Array(UIQRCode.MAX_MODULES);

    private static _activeThrottledId: number = UI.Element._INVALID_INDEX;

    protected static _rectCount = 0;

    private static _rectCursor = 0;

    // Active drawing session scalar dimensions
    private static _activeCellWidth = 0;

    private static _activeCellHeight = 0;

    private static _activeMargin = 0;

    private static readonly _margins = new Uint8Array(UIQRCode.MAX_QR_CODES);

    private static readonly _pendingData = new Array<UIQRCode.Payload | null>(UIQRCode.MAX_QR_CODES).fill(null);

    private static _isSubscribed = false;

    static {
        for (let i = 0; i < UIQRCode.MAX_QR_CODES - 1; ++i) {
            UIQRCode._nextFreeQrCode[i] = i + 1;
        }

        UIQRCode._nextFreeQrCode[UIQRCode.MAX_QR_CODES - 1] = UI.Element._INVALID_INDEX;
        UIQRCode._generations.fill(0);
        UIQRCode._qrWidgets.fill(null);
        UIQRCode._childWidgets.fill(null);
        UIQRCode._margins.fill(UIQRCode.DEFAULT_MARGIN);
        UIQRCode._pendingData.fill(null);
        UIQRCode._pendingQrIds.fill(UI.Element._INVALID_INDEX);
    }

    /**
     * Returns the number of active QR code elements.
     * @returns The active QR code count.
     */
    public static getActiveQRCodeCount(): number {
        return UIQRCode._activeQrCodeCount;
    }

    private static _getState(slot: number): number {
        return (UIQRCode._nextFreeQrCode[slot] >> UIQRCode._STATE_SHIFT) & UIQRCode._STATE_MASK;
    }

    private static _setState(slot: number, state: number): void {
        UIQRCode._nextFreeQrCode[slot] =
            (UIQRCode._nextFreeQrCode[slot] & UIQRCode._STATE_CLEAR_MASK) |
            ((state & UIQRCode._STATE_MASK) << UIQRCode._STATE_SHIFT);
    }

    private static _getMidDrawDirty(slot: number): boolean {
        return (UIQRCode._nextFreeQrCode[slot] & UIQRCode._DIRTY_COLOR_MID_DRAW) !== 0;
    }

    private static _setMidDrawDirty(slot: number, dirty: boolean): void {
        if (dirty) {
            UIQRCode._nextFreeQrCode[slot] |= UIQRCode._DIRTY_COLOR_MID_DRAW;
        } else {
            UIQRCode._nextFreeQrCode[slot] &= ~UIQRCode._DIRTY_COLOR_MID_DRAW;
        }
    }

    private static _getEcc(slot: number): number {
        return UIQRCode._nextFreeQrCode[slot] & UIQRCode._ECC_MASK;
    }

    private static _setEcc(slot: number, eccIdx: number): void {
        UIQRCode._nextFreeQrCode[slot] =
            (UIQRCode._nextFreeQrCode[slot] & ~UIQRCode._ECC_MASK) | (eccIdx & UIQRCode._ECC_MASK);
    }

    /**
     * Resolves the 0-based QR code slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveQrCodeSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        return UIQRCode._elementToQRCodeSlot[elementSlot];
    }

    private static _resetRects(): void {
        UIQRCode._rectCount = 0;
        UIQRCode._rectCursor = 0;
    }

    private static _activateQr(elementId: number): boolean {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return false;

        const qrSlot = UIQRCode._elementToQRCodeSlot[elementSlot];

        if (qrSlot === UI.Element._INVALID_INDEX) return false;

        const data = UIQRCode._pendingData[qrSlot];

        if (data == null) return false;

        const eccIdx = UIQRCode._getEcc(qrSlot);

        UIQRCode._activeThrottledId = elementId;
        UIQRCode._resetRects();

        const size = QREncoder.encodeToBuffer(
            data,
            eccIdx,
            UIQRCode._scratchBuffer,
            UIQRCode.MAX_QR_VERSION,
            UIQRCode._logging
        );

        // Free payload immediately upon encoding
        UIQRCode._pendingData[qrSlot] = null;

        if (size <= 0) {
            UIQRCode._activeThrottledId = UI.Element._INVALID_INDEX;
            return false;
        }

        const margin = UIQRCode._margins[qrSlot];
        const width = UI.Element._getWidth(elementSlot);
        const height = UI.Element._getHeight(elementSlot);
        const qrSize = Math.min(width, height);
        const gridUnits = size + 2 * margin;

        UIQRCode._activeMargin = margin;
        UIQRCode._activeCellWidth = qrSize / gridUnits;
        UIQRCode._activeCellHeight = qrSize / gridUnits;

        UIQRCode._packRectangles(size);
        UIQRCode._childWidgets[qrSlot] = new Array<mod.UIWidget>(UIQRCode._rectCount);

        if (UIQRCode._rectCount === 0) {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            UIQRCode._endActiveOperation();
        }

        return true;
    }

    private static _activateUpdate(elementId: number): boolean {
        const qrSlot = UIQRCode._resolveQrCodeSlot(elementId);

        if (qrSlot === UI.Element._INVALID_INDEX) return false;

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets || darkWidgets.length === 0) {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            return false;
        }

        UIQRCode._activeThrottledId = elementId;
        UIQRCode._rectCursor = 0;
        UIQRCode._rectCount = darkWidgets.length;

        return true;
    }

    private static _activateDelete(elementId: number): boolean {
        const qrSlot = UIQRCode._resolveQrCodeSlot(elementId);

        if (qrSlot === UI.Element._INVALID_INDEX) return false;

        // Free any payload that was never encoded (QR deleted before first activation)
        UIQRCode._pendingData[qrSlot] = null;

        UIQRCode._activeThrottledId = elementId;
        UIQRCode._rectCursor = 0;
        UIQRCode._rectCount = UIQRCode._childWidgets[qrSlot]?.length ?? 0;

        return true;
    }

    private static _activateNext(elementId: number): boolean {
        const qrSlot = UIQRCode._resolveQrCodeSlot(elementId);

        if (qrSlot === UI.Element._INVALID_INDEX) return false;

        const state = UIQRCode._getState(qrSlot);

        if (state === UIQRCode._STATE_DRAWING) return UIQRCode._activateQr(elementId);

        if (state === UIQRCode._STATE_UPDATING) return UIQRCode._activateUpdate(elementId);

        if (state === UIQRCode._STATE_DELETING) return UIQRCode._activateDelete(elementId);

        return false;
    }

    private static _endActiveOperation(): void {
        UIQRCode._activeThrottledId = UI.Element._INVALID_INDEX;
        UIQRCode._resetRects();
    }

    private static _drawBatch(budget: number): number {
        const elementId = UIQRCode._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const qrSlot = UIQRCode._elementToQRCodeSlot[elementSlot];

        if (qrSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const parentWidget = UIQRCode._qrWidgets[qrSlot];

        if (!parentWidget) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const margin = UIQRCode._activeMargin;
        const cellWidth = UIQRCode._activeCellWidth;
        const cellHeight = UIQRCode._activeCellHeight;
        const darkColor = UI.Element._getForegroundColor(elementSlot);
        const darkVec = Colors.toVector(darkColor);
        const nativeSolidFill = UI.Element._getNativeBgFill(UI.BgFill.Solid);

        const qrInstance = UI.Element._getInstance(elementSlot) as UIQRCode | undefined;

        if (!qrInstance || !qrInstance._isValid) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const receiver = qrInstance._receiver;
        const depth = qrInstance.depth ?? UI.Depth.AboveGameUI;
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeTopLeft = UI.Element._getNativeAnchor(UI.Anchor.TopLeft);

        let drawn = 0;

        while (UIQRCode._rectCursor < UIQRCode._rectCount && drawn < budget) {
            const cursor = UIQRCode._rectCursor;
            const packed = UIQRCode._rectBuffer[cursor];
            const col = (packed >>> 24) & 0xff;
            const row = (packed >>> 16) & 0xff;
            const spanW = (packed >>> 8) & 0xff;
            const spanH = packed & 0xff;

            const x0 = Math.round((col + margin) * cellWidth);
            const y0 = Math.round((row + margin) * cellHeight);
            const x1 = Math.round((col + spanW + margin) * cellWidth);
            const y1 = Math.round((row + spanH + margin) * cellHeight);
            const w = Math.max(1, x1 - x0);
            const h = Math.max(1, y1 - y0);

            const childName = `ui_qr_${elementId}_${cursor + 1}`;

            if (!receiver || !receiver.nativeReceiver) {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0 - 0.01, y0 - 0.01, 0),
                    mod.CreateVector(w + 0.02, h + 0.02, 0),
                    nativeTopLeft,
                    parentWidget,
                    true,
                    0,
                    darkVec,
                    1,
                    nativeSolidFill,
                    nativeDepth
                );
            } else {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0 - 0.01, y0 - 0.01, 0),
                    mod.CreateVector(w + 0.02, h + 0.02, 0),
                    nativeTopLeft,
                    parentWidget,
                    true,
                    0,
                    darkVec,
                    1,
                    nativeSolidFill,
                    nativeDepth,
                    receiver.nativeReceiver
                );
            }

            darkWidgets[cursor] = mod.FindUIWidgetWithName(childName) as mod.UIWidget;
            UIQRCode._rectCursor++;
            drawn++;
        }

        if (UIQRCode._rectCursor < UIQRCode._rectCount) return drawn;

        if (UIQRCode._getMidDrawDirty(qrSlot)) {
            UIQRCode._setMidDrawDirty(qrSlot, false);
            UIQRCode._setState(qrSlot, UIQRCode._STATE_UPDATING);
            UIQRCode._rectCursor = 0;
        } else {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            UIQRCode._endActiveOperation();
        }

        return drawn;
    }

    private static _updateBatch(budget: number): number {
        const elementId = UIQRCode._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const qrSlot = UIQRCode._elementToQRCodeSlot[elementSlot];

        if (qrSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets || darkWidgets.length === 0) {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            UIQRCode._endActiveOperation();
            return 0;
        }

        const color = UI.Element._getForegroundColor(elementSlot);
        const darkVec = Colors.toVector(color);
        let updated = 0;

        while (UIQRCode._rectCursor < UIQRCode._rectCount && updated < budget) {
            const w = darkWidgets[UIQRCode._rectCursor];

            if (w) {
                mod.SetUIWidgetBgColor(w, darkVec);
            }

            UIQRCode._rectCursor++;
            updated++;
        }

        if (UIQRCode._rectCursor >= UIQRCode._rectCount) {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            UIQRCode._endActiveOperation();
        }

        return updated;
    }

    private static _deleteBatch(budget: number): number {
        const elementId = UIQRCode._activeThrottledId;

        if (elementId === UI.Element._INVALID_INDEX) return 0;

        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const qrSlot = UIQRCode._elementToQRCodeSlot[elementSlot];

        if (qrSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._endActiveOperation();
            return 0;
        }

        const darkWidgets = UIQRCode._childWidgets[qrSlot];
        let deleted = 0;

        if (darkWidgets) {
            while (UIQRCode._rectCursor < UIQRCode._rectCount && deleted < budget) {
                const w = darkWidgets[UIQRCode._rectCursor];

                if (w) {
                    mod.DeleteUIWidget(w);
                    darkWidgets[UIQRCode._rectCursor] = null as unknown as mod.UIWidget;
                }

                UIQRCode._rectCursor++;
                deleted++;
            }
        }

        if (UIQRCode._rectCursor < UIQRCode._rectCount) return deleted;

        if (darkWidgets) {
            darkWidgets.length = 0;
            UIQRCode._childWidgets[qrSlot] = null;
        }

        const qrWidget = UIQRCode._qrWidgets[qrSlot];

        if (qrWidget) {
            mod.DeleteUIWidget(qrWidget);
            UIQRCode._qrWidgets[qrSlot] = null;
        }

        const instance = UI.Element._getInstance(elementSlot) as UIQRCode | undefined;

        UIQRCode._endActiveOperation();

        if (instance) {
            instance._finalizeDelete();
        }

        return deleted;
    }

    private static _pushPendingQr(elementId: number): void {
        if (UIQRCode._pendingQrCount >= UIQRCode.MAX_QR_CODES) {
            UIQRCode._logging.log('Pending QR queue overflow', UI.LogLevel.Error);
            return;
        }

        UIQRCode._pendingQrIds[UIQRCode._pendingQrTail] = elementId;
        UIQRCode._pendingQrTail = (UIQRCode._pendingQrTail + 1) % UIQRCode.MAX_QR_CODES;
        UIQRCode._pendingQrCount++;
    }

    private static _popPendingQr(): number | null {
        while (UIQRCode._pendingQrCount > 0) {
            const elementId = UIQRCode._pendingQrIds[UIQRCode._pendingQrHead];
            UIQRCode._pendingQrHead = (UIQRCode._pendingQrHead + 1) % UIQRCode.MAX_QR_CODES;
            UIQRCode._pendingQrCount--;

            const qrSlot = UIQRCode._resolveQrCodeSlot(elementId);

            if (qrSlot !== UI.Element._INVALID_INDEX) return elementId;
        }

        return null;
    }

    private static _handleTick = (): void => {
        let budget = UIQRCode.tickBudget;

        while (budget > 0.001) {
            if (UIQRCode._activeThrottledId === UI.Element._INVALID_INDEX) {
                const nextId = UIQRCode._popPendingQr();

                if (nextId === null) break;

                if (!UIQRCode._activateNext(nextId)) continue;
            }

            if (UIQRCode._activeThrottledId === UI.Element._INVALID_INDEX) continue;

            const qrSlot = UIQRCode._resolveQrCodeSlot(UIQRCode._activeThrottledId);

            if (qrSlot === UI.Element._INVALID_INDEX) {
                UIQRCode._endActiveOperation();
                continue;
            }

            const state = UIQRCode._getState(qrSlot);

            if (state === UIQRCode._STATE_DRAWING) {
                const cost = Math.max(0.001, UIQRCode.drawCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const drawn = UIQRCode._drawBatch(allowed);

                if (drawn === 0) {
                    UIQRCode._endActiveOperation();
                    continue;
                }

                budget -= drawn * cost;

                if (
                    UIQRCode._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIQRCode._getState(qrSlot) === UIQRCode._STATE_DRAWING &&
                    UIQRCode._rectCursor < UIQRCode._rectCount
                ) {
                    break;
                }
            } else if (state === UIQRCode._STATE_UPDATING) {
                const cost = Math.max(0.001, UIQRCode.updateCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const updated = UIQRCode._updateBatch(allowed);

                if (updated === 0) {
                    UIQRCode._endActiveOperation();
                    continue;
                }

                budget -= updated * cost;

                if (
                    UIQRCode._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIQRCode._rectCursor < UIQRCode._rectCount
                ) {
                    break;
                }
            } else if (state === UIQRCode._STATE_DELETING) {
                const cost = Math.max(0.001, UIQRCode.deleteCost);
                const allowed = Math.max(1, Math.floor(budget / cost));
                const deleted = UIQRCode._deleteBatch(allowed);

                if (deleted === 0) {
                    UIQRCode._endActiveOperation();
                    continue;
                }

                budget -= deleted * cost;

                if (
                    UIQRCode._activeThrottledId !== UI.Element._INVALID_INDEX &&
                    UIQRCode._rectCursor < UIQRCode._rectCount
                ) {
                    break;
                }
            } else {
                UIQRCode._endActiveOperation();
            }
        }
    };

    private static _ensureTickSubscribed(): void {
        if (UIQRCode._isSubscribed) return;

        UIQRCode._isSubscribed = true;
        Events.OnTickStart.subscribe(UIQRCode._handleTick, Events.EventPriority.Last);
    }

    protected static _packRectangles(N: number): void {
        UIQRCode._resetRects();
        UIQRCode._rectCount = QREncoder.packRectangles(UIQRCode._scratchBuffer, N, UIQRCode._rectBuffer);
    }

    /**
     * Creates a new optimized QR code element.
     * @param params - The parameters for the QR code.
     */
    public constructor(params: UIQRCode.Params) {
        super(params);

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        const scale = params.scale ?? 1;
        const margin = Math.max(UIQRCode.MIN_QUIET_ZONE, Math.floor(params.margin ?? UIQRCode.DEFAULT_MARGIN));

        if (params.data == null) {
            UIQRCode._logging.log('Missing or null data', UI.LogLevel.Error);
            super.delete();
            return;
        }

        const ecc = params.ecc ?? UIQRCode.ECC.Medium;
        const eccIdx = QREncoder.getEccIndex(ecc);
        const byteLen = QREncoder.getDataByteLength(params.data);
        const versionInfo = byteLen >= 0 ? QREncoder.selectVersion(byteLen, eccIdx, UIQRCode.MAX_QR_VERSION) : null;

        if (byteLen < 0 || !versionInfo || versionInfo.version > UIQRCode.MAX_QR_VERSION) {
            UIQRCode._logging.log(
                `Data exceeds capacity of configured MAX_QR_VERSION (V${UIQRCode.MAX_QR_VERSION}) (${byteLen} bytes requires V${versionInfo?.version})`,
                UI.LogLevel.Error
            );

            super.delete();
            return;
        }

        const qrSlot = this._allocateQrCodeSlot();

        if (qrSlot === UI.Element._INVALID_INDEX) {
            super.delete();
            return;
        }

        UIQRCode._margins[qrSlot] = margin;

        const matrixSize = 17 + 4 * versionInfo.version;
        const totalUnits = matrixSize + 2 * margin;

        const defaultQrSize = totalUnits > 0 ? totalUnits * UIQRCode.BASE_MODULE_SIZE * scale : 100;

        const baseWidth = params.width ?? params.size?.width ?? defaultQrSize;
        const baseHeight = params.height ?? params.size?.height ?? defaultQrSize;

        const qrSize = Math.min(baseWidth, baseHeight);
        const qrWidth = qrSize;
        const qrHeight = qrSize;

        const bgColor = params.bgColor ?? UI.COLORS.WHITE;
        const bgAlpha = params.bgAlpha ?? 1;
        const bgFill = params.bgFill ?? UI.BgFill.Solid;
        const color = params.color ?? UI.COLORS.BLACK;

        const { x, y } = UI.Element._getPosition(params);
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const depth = params.depth ?? UI.Depth.AboveGameUI;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeCenterAnchor = UI.Element._getNativeAnchor(UI.Anchor.Center);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeLightFill = UI.Element._getNativeBgFill(bgFill);
        const nativeBgFillNone = UI.Element._getNativeBgFill(UI.BgFill.None);

        // 1. Base Container (reacts to positioning, sizing, background color/alpha/fill)
        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(bgColor),
                bgAlpha,
                nativeLightFill,
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
                Colors.toVector(bgColor),
                bgAlpha,
                nativeLightFill,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);
        this.setSize({ width: baseWidth, height: baseHeight });
        super.setBgColor(bgColor);
        super.setBgAlpha(bgAlpha);
        super.setBgFill(bgFill);

        const baseContainerWidget = this._uiWidget!;

        // 2. QR Container (centered inside Base Container, transparent)
        const qrName = `${name}_qr`;

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                qrName,
                UI.ZERO_VECTOR,
                mod.CreateVector(qrWidth, qrHeight, 0),
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
                qrName,
                UI.ZERO_VECTOR,
                mod.CreateVector(qrWidth, qrHeight, 0),
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

        UIQRCode._qrWidgets[qrSlot] = mod.FindUIWidgetWithName(qrName) as mod.UIWidget;

        UI.Element._setForegroundColor(this._slot, color);

        // Store payload and ECC in per-slot state
        UIQRCode._pendingData[qrSlot] = params.data;
        UIQRCode._setEcc(qrSlot, eccIdx);
        UIQRCode._setState(qrSlot, UIQRCode._STATE_DRAWING);

        // 3. Dispatch to Throttler – always enqueue; _handleTick drives all batching
        UIQRCode._ensureTickSubscribed();
        UIQRCode._pushPendingQr(this._id);
    }

    protected get _qrCodeSlot(): number {
        const slot = this._slot;

        return slot !== UI.Element._INVALID_INDEX ? UIQRCode._elementToQRCodeSlot[slot] : UI.Element._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._slot !== UI.Element._INVALID_INDEX;
    }

    public override get isDeleted(): boolean {
        if (super.isDeleted) return true;

        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return true;

        return UIQRCode._getState(qrSlot) === UIQRCode._STATE_DELETING;
    }

    /**
     * Resolves the 0-based QR code slot for this QR instance and logs a warning if invalid.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveQrCodeSlotAndLogWarning(): number {
        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) {
            UIQRCode._logging.log(`QR code is deleted`, UI.LogLevel.Warning);
            return UI.Element._INVALID_INDEX;
        }

        return qrSlot;
    }

    protected override _getIsInvalidAndLogWarning(): boolean {
        return this._resolveQrCodeSlotAndLogWarning() === UI.Element._INVALID_INDEX;
    }

    /**
     * Allocates a QR code slot for this QR instance.
     * @returns The allocated QR slot index (0 to MAX_QR_CODES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateQrCodeSlot(): number {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return UI.Element._INVALID_INDEX;

        if (UIQRCode._firstFreeQrCode === UI.Element._INVALID_INDEX) {
            UIQRCode._logging.log('QR code pool is full', UI.LogLevel.Error);
            return UI.Element._INVALID_INDEX;
        }

        const slot = UIQRCode._firstFreeQrCode;

        UIQRCode._firstFreeQrCode = UIQRCode._nextFreeQrCode[slot];
        UIQRCode._nextFreeQrCode[slot] = (UIQRCode._STATE_DRAWING << 2) | 0;

        UIQRCode._childWidgets[slot] = null;
        UIQRCode._elementToQRCodeSlot[elementSlot] = slot;
        UIQRCode._margins[slot] = UIQRCode.DEFAULT_MARGIN;
        UIQRCode._pendingData[slot] = null;

        UIQRCode._activeQrCodeCount++;

        return slot;
    }

    /**
     * Frees the QR code slot associated with this QR instance.
     */
    private _freeQrCodeSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const slot = UIQRCode._elementToQRCodeSlot[elementSlot];

        if (slot === UI.Element._INVALID_INDEX || slot < 0 || slot >= UIQRCode.MAX_QR_CODES) return;

        UIQRCode._qrWidgets[slot] = null;

        if (UIQRCode._childWidgets[slot]) {
            UIQRCode._childWidgets[slot]!.length = 0;
            UIQRCode._childWidgets[slot] = null;
        }

        UIQRCode._pendingData[slot] = null;
        UIQRCode._margins[slot] = UIQRCode.DEFAULT_MARGIN;
        UIQRCode._elementToQRCodeSlot[elementSlot] = UI.Element._INVALID_INDEX;

        UIQRCode._activeQrCodeCount--;

        if (UIQRCode._generations[slot] < UIQRCode._MAX_GENERATIONS) {
            UIQRCode._generations[slot]++;
            UIQRCode._nextFreeQrCode[slot] = UIQRCode._firstFreeQrCode;
            UIQRCode._firstFreeQrCode = slot;
        } else if (UIQRCode._logging.willLog(UI.LogLevel.Warning)) {
            UIQRCode._logging.log(
                `QR code slot ${slot} exhausted max generations and was retired`,
                UI.LogLevel.Warning
            );
        }
    }

    /**
     * The intermediate QR container widget (centered inside the base container).
     * @returns The QR container widget, or null if deleted/unallocated.
     */
    protected get _qrWidget(): mod.UIWidget | null {
        const slot = this._qrCodeSlot;

        return slot === UI.Element._INVALID_INDEX ? null : UIQRCode._qrWidgets[slot];
    }

    /**
     * @inheritdoc
     */
    protected override _handleFlush(flags: number, widget: mod.UIWidget): void {
        super._handleFlush(flags, widget);

        const slot = this._slot;
        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return;

        const dirtyFgColor = (flags & UI.Element._DIRTY_FOREGROUND_COLOR) !== 0;

        if (!dirtyFgColor) return;

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets) return;

        const fgColorVec = Colors.toVector(UI.Element._getForegroundColor(slot));

        for (let i = 0; i < darkWidgets.length; ++i) {
            const childWidget = darkWidgets[i];

            if (!childWidget) continue;

            mod.SetUIWidgetBgColor(childWidget, fgColorVec);
        }
    }

    /**
     * @inheritdoc
     */
    protected _finalizeDelete(): void {
        this._freeQrCodeSlot();
        super.delete();
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this.isDeleted) return;

        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return;

        const currentState = UIQRCode._getState(qrSlot);

        if (currentState === UIQRCode._STATE_DELETING) return;

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets || darkWidgets.length === 0) {
            if (this._id === UIQRCode._activeThrottledId) {
                UIQRCode._endActiveOperation();
            }

            const qrWidget = UIQRCode._qrWidgets[qrSlot];

            if (qrWidget) {
                mod.DeleteUIWidget(qrWidget);
                UIQRCode._qrWidgets[qrSlot] = null;
            }

            this._finalizeDelete();

            return;
        }

        UIQRCode._setState(qrSlot, UIQRCode._STATE_DELETING);
        UIQRCode._setMidDrawDirty(qrSlot, false);

        if (this._id === UIQRCode._activeThrottledId) {
            // Already active: snapshot drawn widget count and reset cursor so _handleTick transitions to _deleteBatch on its next call.
            const countToDelete = currentState === UIQRCode._STATE_DRAWING ? UIQRCode._rectCursor : darkWidgets.length;

            UIQRCode._rectCursor = 0;
            UIQRCode._rectCount = countToDelete;
        } else if (currentState === UIQRCode._STATE_IDLE) {
            // Not yet queued: push to queue. QRs already queued in DRAWING or UPDATING state need no push — _activateNext reads the
            // updated DELETING state when it pops them.
            UIQRCode._ensureTickSubscribed();
            UIQRCode._pushPendingQr(this._id);
        }
    }

    /**
     * The current lifecycle state of this QR code (Idle, Drawing, Updating, Deleting),
     * or undefined if the element has been deleted.
     * @returns The current lifecycle state, or undefined if deleted.
     */
    public get state(): UIQRCode.State | undefined {
        if (this.isDeleted) return undefined;

        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return undefined;

        return UIQRCode._getState(qrSlot);
    }

    /**
     * The rendering progress of this QR code from 0 to 100 percent.
     * Returns 100 when Idle, 0 when queued, Math.floor((cursor / count) * 100)
     * when actively Drawing, Updating, or Deleting, or undefined if deleted.
     * @returns The operation progress (0..100) or undefined if deleted.
     */
    public get progress(): number | undefined {
        if (this.isDeleted) return undefined;

        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return undefined;

        const state = UIQRCode._getState(qrSlot);

        if (state === UIQRCode._STATE_IDLE) return 100;

        if (this._id === UIQRCode._activeThrottledId) {
            return UIQRCode._rectCount > 0 ? Math.floor((UIQRCode._rectCursor / UIQRCode._rectCount) * 100) : 100;
        }

        return 0;
    }

    /**
     * Indicates whether all child module rectangle widgets have finished rendering and the QR code is idle.
     * Returns true when Idle, false when Drawing, Updating, or Deleting,
     * or undefined if the element has been deleted.
     * @returns True if idle, false if busy, or undefined if deleted.
     */
    public get isReady(): boolean | undefined {
        if (this.isDeleted) return undefined;

        const qrSlot = this._qrCodeSlot;

        if (qrSlot === UI.Element._INVALID_INDEX) return undefined;

        const state = UIQRCode._getState(qrSlot);

        return state === UIQRCode._STATE_IDLE;
    }

    /**
     * The total number of native draw calls (widgets) used to render this QR code.
     * Includes the base container, QR container, and all internal module rectangle widgets.
     * @returns The total draw call count, or undefined if deleted.
     */
    public get drawCallCount(): number | undefined {
        if (this.isDeleted) return undefined;

        const slot = this._qrCodeSlot;

        if (slot === UI.Element._INVALID_INDEX) return undefined;

        const widgets = UIQRCode._childWidgets[slot];

        let count = 2;

        if (!widgets) return count;

        for (let i = 0; i < widgets.length; ++i) {
            if (widgets[i]) {
                count++;
            }
        }

        return count;
    }

    /**
     * The foreground (dark module) color of the QR code, or undefined if deleted.
     * @returns The foreground color, or undefined if deleted.
     */
    public get color(): Colors.Color | undefined {
        if (this.isDeleted) return undefined;

        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot);
    }

    /**
     * Retrieves the foreground (dark module) color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The foreground color, or undefined if deleted.
     */
    public getColor(out?: Colors.Color): Colors.Color | undefined {
        if (this.isDeleted) return undefined;

        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot, out);
    }

    /**
     * Sets the foreground (dark module) color of the QR code.
     * @param color - The new foreground color.
     */
    public set color(color: Colors.Color) {
        this.setColor(color);
    }

    /**
     * Sets the foreground (dark module) color of the QR code.
     * Batches native color updates across ticks using updateCost and tickBudget.
     * @param color - The new foreground color.
     * @returns This element for chaining.
     */
    public setColor(color: Colors.Color): this {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return this;

        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return this;

        if (UI.Element._setForegroundColor(elementSlot, color)) {
            UI.Element._markDirty(elementSlot, UI.Element._DIRTY_FOREGROUND_COLOR);
        }

        const state = UIQRCode._getState(qrSlot);

        if (state === UIQRCode._STATE_DELETING) return this;

        if (state === UIQRCode._STATE_DRAWING) {
            if (this._id === UIQRCode._activeThrottledId && UIQRCode._rectCursor > 0) {
                UIQRCode._setMidDrawDirty(qrSlot, true);
            }

            return this;
        }

        UIQRCode._setState(qrSlot, UIQRCode._STATE_UPDATING);

        const darkWidgets = UIQRCode._childWidgets[qrSlot];

        if (!darkWidgets || darkWidgets.length === 0) {
            UIQRCode._setState(qrSlot, UIQRCode._STATE_IDLE);
            return this;
        }

        if (this._id === UIQRCode._activeThrottledId) {
            // Already active: reset cursor so _handleTick recolors all widgets from the start with the new color on its next call.
            UIQRCode._rectCursor = 0;
            UIQRCode._rectCount = darkWidgets.length;
        } else if (state === UIQRCode._STATE_IDLE) {
            // Transitioning from Idle: push to queue. QRs already queued in  UPDATING state need no push — they carry the new color
            // and _activateUpdate always starts from cursor 0.
            UIQRCode._ensureTickSubscribed();
            UIQRCode._pushPendingQr(this._id);
        }

        return this;
    }
}

export namespace UIQRCode {
    /**
     * The lifecycle state of a QR code instance.
     */
    export enum State {
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
    export type Payload = QREncoder.Payload;

    /**
     * The parameters for creating a new UIQRCode element.
     */
    export type Params = UI.ElementParams & {
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
