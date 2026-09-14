import { Colors } from '../../../colors/index.ts';
import { UI } from '../../index.ts';

// version: 3.0.0
export class UIQRCode extends UI.Element {
    /**
     * The maximum number of QR code widgets that can exist concurrently in memory.
     */
    public static readonly MAX_QR_CODES = 128;

    private static readonly BASE_MODULE_SIZE = 10;

    private static readonly _MAX_GENERATIONS = 65_535;

    private static _activeQrCodeCount: number = 0;

    private static _firstFreeQrCode: number = 0;

    private static readonly _generations = new Uint16Array(UIQRCode.MAX_QR_CODES);

    private static readonly _nextFreeQrCode = new Int16Array(UIQRCode.MAX_QR_CODES);

    private static readonly _elementToQrCodeSlot = new Int16Array(UI.MAX_ELEMENTS);

    private static readonly _scales = new Float32Array(UIQRCode.MAX_QR_CODES);

    private static readonly _margins = new Int16Array(UIQRCode.MAX_QR_CODES);

    private static readonly _matrixSizes = new Uint8Array(UIQRCode.MAX_QR_CODES);

    private static readonly _childWidgets = new Array<UIQRCode.ChildModule[] | null>(UIQRCode.MAX_QR_CODES);

    // Reusable flat visited buffer to avoid garbage collection allocations during rendering
    private static readonly _visitedBuffer = new Uint8Array(177 * 177);

    static {
        for (let i = 0; i < UIQRCode.MAX_QR_CODES - 1; ++i) {
            UIQRCode._nextFreeQrCode[i] = i + 1;
        }

        UIQRCode._nextFreeQrCode[UIQRCode.MAX_QR_CODES - 1] = UI.Element._INVALID_INDEX;
        UIQRCode._generations.fill(0);
        UIQRCode._childWidgets.fill(null);
        UIQRCode._elementToQrCodeSlot.fill(UI.Element._INVALID_INDEX);
    }

    /**
     * Returns the number of active QR code elements.
     * @returns The active QR code count.
     */
    public static getActiveQRCodeCount(): number {
        return UIQRCode._activeQrCodeCount;
    }

    /**
     * Resolves the 0-based QR code slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveQrCodeSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        return UIQRCode._elementToQrCodeSlot[elementSlot];
    }

    protected get _qrCodeSlot(): number {
        const slot = this._slot;

        return slot !== UI.Element._INVALID_INDEX ? UIQRCode._elementToQrCodeSlot[slot] : UI.Element._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._qrCodeSlot !== UI.Element._INVALID_INDEX;
    }

    /**
     * Resolves the 0-based QR code slot for this QR instance and logs a warning if invalid.
     * @returns The 0-based QR slot index (0 to MAX_QR_CODES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveQrCodeSlotAndLogWarning(): number {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        const qrSlot = UIQRCode._elementToQrCodeSlot[elementSlot];

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
        UIQRCode._nextFreeQrCode[slot] = UI.Element._INVALID_INDEX;
        UIQRCode._childWidgets[slot] = null;
        UIQRCode._elementToQrCodeSlot[elementSlot] = slot;

        UIQRCode._activeQrCodeCount++;

        return slot;
    }

    /**
     * Frees the QR code slot associated with this QR instance.
     */
    private _freeQrCodeSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const slot = UIQRCode._elementToQrCodeSlot[elementSlot];

        if (slot === UI.Element._INVALID_INDEX || slot < 0 || slot >= UIQRCode.MAX_QR_CODES) return;

        UIQRCode._scales[slot] = 0;
        UIQRCode._margins[slot] = 0;
        UIQRCode._matrixSizes[slot] = 0;
        UIQRCode._childWidgets[slot] = null;
        UIQRCode._elementToQrCodeSlot[elementSlot] = UI.Element._INVALID_INDEX;

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
     * Creates a new optimized QR code element.
     * @param params - The parameters for the QR code.
     */
    public constructor(params: UIQRCode.Params) {
        const matrix = UIQRCode._resolveMatrix(params);
        const matrixSize = matrix ? matrix.length : 0;
        const scale = params.scale ?? 1;
        const margin = params.margin ?? 0;
        const totalUnits = matrixSize + 2 * margin;

        const baseWidth =
            params.width ??
            params.size?.width ??
            (totalUnits > 0 ? totalUnits * UIQRCode.BASE_MODULE_SIZE * scale : 100);

        const baseHeight =
            params.height ??
            params.size?.height ??
            (totalUnits > 0 ? totalUnits * UIQRCode.BASE_MODULE_SIZE * scale : 100);

        const lightColor = params.lightColor ?? UI.COLORS.WHITE;
        const lightAlpha = params.lightAlpha ?? 1;
        const darkColor = params.darkColor ?? UI.COLORS.BLACK;
        const darkAlpha = params.darkAlpha ?? 1;

        const { x, y } = UI.Element._getPosition(params);

        // The root element is created as a container that acts as the Phase 1 solid background canvas
        super(
            params.position !== undefined
                ? {
                      position: params.position,
                      width: baseWidth,
                      height: baseHeight,
                      parent: params.parent,
                      anchor: params.anchor,
                      visible: params.visible,
                      bgColor: lightColor,
                      bgAlpha: lightAlpha,
                      bgFill: UI.BgFill.Solid,
                      depth: params.depth,
                      receiver: params.receiver,
                      uiInputModeWhenVisible: params.uiInputModeWhenVisible,
                  }
                : {
                      x,
                      y,
                      width: baseWidth,
                      height: baseHeight,
                      parent: params.parent,
                      anchor: params.anchor,
                      visible: params.visible,
                      bgColor: lightColor,
                      bgAlpha: lightAlpha,
                      bgFill: UI.BgFill.Solid,
                      depth: params.depth,
                      receiver: params.receiver,
                      uiInputModeWhenVisible: params.uiInputModeWhenVisible,
                  }
        );

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        const qrSlot = this._allocateQrCodeSlot();

        if (qrSlot === UI.Element._INVALID_INDEX) {
            super.delete();
            return;
        }

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const depth = params.depth ?? UI.Depth.AboveGameUI;

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);
        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeBgFillSolid = UI.Element._getNativeBgFill(UI.BgFill.Solid);

        if (!receiver.nativeReceiver) {
            mod.AddUIContainer(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(baseWidth, baseHeight, 0),
                nativeAnchor,
                UI.Element._getNativeWidget(parent)!,
                visible,
                0,
                Colors.toVector(lightColor),
                lightAlpha,
                nativeBgFillSolid,
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
                Colors.toVector(lightColor),
                lightAlpha,
                nativeBgFillSolid,
                nativeDepth,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        UIQRCode._scales[qrSlot] = scale;
        UIQRCode._margins[qrSlot] = margin;
        UIQRCode._matrixSizes[qrSlot] = matrixSize;
        UIQRCode._childWidgets[qrSlot] = [];

        UI.Element._setForegroundAlpha(this._slot, darkAlpha);
        UI.Element._setForegroundColor(this._slot, darkColor);

        if (matrix) {
            this._renderQR(
                qrSlot,
                matrix,
                baseWidth,
                baseHeight,
                scale,
                margin,
                darkColor,
                darkAlpha,
                lightColor,
                lightAlpha
            );
        }
    }

    /**
     * Resolves the boolean matrix from parameters (either provided directly or encoded from text).
     * @param params - The initialization parameters.
     * @returns The resolved 2D boolean matrix, or null if neither was provided.
     */
    private static _resolveMatrix(params: UIQRCode.Params): UIQRCode.BooleanMatrix | null {
        if (params.matrix) return UIQRCode._normalizeMatrix(params.matrix);

        if (params.text !== undefined) return UIQRCode.Encoder.encode(params.text, params.ecc ?? UIQRCode.ECC.Medium);

        return null;
    }

    /**
     * Normalizes a user-supplied matrix (with numbers or booleans) into a boolean matrix.
     * @param matrix - The input 2D matrix.
     * @returns A 2D boolean array.
     */
    private static _normalizeMatrix(matrix: UIQRCode.Matrix): UIQRCode.BooleanMatrix {
        const height = matrix.length;
        const result: boolean[][] = new Array(height);

        for (let r = 0; r < height; ++r) {
            const row = matrix[r];
            const width = row.length;
            const boolRow: boolean[] = new Array(width);

            for (let c = 0; c < width; ++c) {
                const val = row[c];
                boolRow[c] = val === true || val === 1;
            }

            result[r] = boolRow;
        }

        return result;
    }

    /**
     * Renders the QR code sub-rectangles using the hybrid Painter's Algorithm + rectilinear merging.
     * @param qrSlot - The allocated QR code sub-pool slot.
     * @param matrix - The QR code boolean matrix.
     * @param totalWidth - Total pixel width.
     * @param totalHeight - Total pixel height.
     * @param scale - Scale multiplier.
     * @param margin - Margin in module units.
     * @param darkColor - Dark module color.
     * @param darkAlpha - Dark module opacity.
     * @param lightColor - Light module color.
     * @param lightAlpha - Light module opacity.
     */
    private _renderQR(
        qrSlot: number,
        matrix: UIQRCode.BooleanMatrix,
        totalWidth: number,
        totalHeight: number,
        scale: number,
        margin: number,
        darkColor: Colors.Color,
        darkAlpha: number,
        lightColor: Colors.Color,
        lightAlpha: number
    ): void {
        const parentWidget = this._uiWidget;
        const receiver = this._receiver!;
        const depth = this.depth ?? UI.Depth.AboveGameUI;
        const N = matrix.length;

        if (N === 0) return;

        const darkVec = Colors.toVector(darkColor);
        const lightVec = Colors.toVector(lightColor);

        const gridUnits = N + 2 * margin;
        const cellWidth = totalWidth / gridUnits;
        const cellHeight = totalHeight / gridUnits;

        const childModules: UIQRCode.ChildModule[] = [];

        const nativeDepth = UI.Element._getNativeDepth(depth);
        const nativeTopLeft = UI.Element._getNativeAnchor(UI.Anchor.TopLeft);
        const nativeBgFillSolid = UI.Element._getNativeBgFill(UI.BgFill.Solid);

        // Reset visited tracking buffer
        const totalCells = N * N;
        if (UIQRCode._visitedBuffer.length < totalCells) {
            // Unlikely to exceed 177x177, but guard against large custom matrices
            UIQRCode._visitedBuffer.fill(0);
        } else {
            UIQRCode._visitedBuffer.fill(0, 0, totalCells);
        }

        const visited = UIQRCode._visitedBuffer;

        /**
         * Helper to add a native solid rectangular container attached to this QR container.
         * @param col - Starting module column.
         * @param row - Starting module row.
         * @param spanW - Module width span.
         * @param spanH - Module height span.
         * @param color - Fill color vector.
         * @param alpha - Fill alpha opacity.
         * @param isLight - Whether this rectangle represents a light cutout.
         */
        const drawRect = (
            col: number,
            row: number,
            spanW: number,
            spanH: number,
            color: mod.Vector,
            alpha: number,
            isLight: boolean
        ): void => {
            const x0 = Math.round((col + margin) * cellWidth);
            const y0 = Math.round((row + margin) * cellHeight);
            const x1 = Math.round((col + spanW + margin) * cellWidth);
            const y1 = Math.round((row + spanH + margin) * cellHeight);
            const w = Math.max(1, x1 - x0);
            const h = Math.max(1, y1 - y0);

            const childName = `ui_qr_${this._id}_${childModules.length + 1}`;

            if (!receiver.nativeReceiver) {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0, y0, 0),
                    mod.CreateVector(w, h, 0),
                    nativeTopLeft,
                    parentWidget,
                    true,
                    0,
                    color,
                    alpha,
                    nativeBgFillSolid,
                    nativeDepth
                );
            } else {
                mod.AddUIContainer(
                    childName,
                    mod.CreateVector(x0, y0, 0),
                    mod.CreateVector(w, h, 0),
                    nativeTopLeft,
                    parentWidget,
                    true,
                    0,
                    color,
                    alpha,
                    nativeBgFillSolid,
                    nativeDepth,
                    receiver.nativeReceiver
                );
            }

            const widget = mod.FindUIWidgetWithName(childName) as mod.UIWidget;
            childModules.push({ widget, col, row, spanW, spanH, isLight });
        };

        // Phase 2: Structural Elements (Z-Index Stacking)
        const isStandardSize = N >= 21 && (N - 17) % 4 === 0;
        const version = isStandardSize ? (N - 17) / 4 : 0;

        if (version >= 1 && version <= 40) {
            // Finder Patterns (3 Corner Eyes)
            const finders = [
                { r: 0, c: 0 },
                { r: 0, c: N - 7 },
                { r: N - 7, c: 0 },
            ];

            for (let f = 0; f < 3; ++f) {
                const { r, c } = finders[f];
                // Layer 1: 7x7 Dark base
                drawRect(c, r, 7, 7, darkVec, darkAlpha, false);
                // Layer 2: 5x5 Light cutout
                drawRect(c + 1, r + 1, 5, 5, lightVec, lightAlpha, true);
                // Layer 3: 3x3 Dark core
                drawRect(c + 2, r + 2, 3, 3, darkVec, darkAlpha, false);

                // Mark 7x7 cells as visited
                for (let i = 0; i < 7; ++i) {
                    const rowOffset = (r + i) * N;
                    for (let j = 0; j < 7; ++j) {
                        visited[rowOffset + (c + j)] = 1;
                    }
                }
            }

            // Alignment Patterns (Version >= 2)
            if (version >= 2) {
                const positions = UIQRCode.ALIGNMENT_POSITIONS[version - 1];
                const posLen = positions.length;

                for (let p1 = 0; p1 < posLen; ++p1) {
                    const rc = positions[p1];

                    for (let p2 = 0; p2 < posLen; ++p2) {
                        const cc = positions[p2];

                        // Skip positions that collide with Finder Pattern corners
                        if ((rc <= 8 && cc <= 8) || (rc <= 8 && cc >= N - 9) || (rc >= N - 9 && cc <= 8)) {
                            continue;
                        }

                        const r = rc - 2;
                        const c = cc - 2;

                        // Layer 1: 5x5 Dark base
                        drawRect(c, r, 5, 5, darkVec, darkAlpha, false);
                        // Layer 2: 3x3 Light cutout
                        drawRect(c + 1, r + 1, 3, 3, lightVec, lightAlpha, true);
                        // Layer 3: 1x1 Dark core
                        drawRect(c + 2, r + 2, 1, 1, darkVec, darkAlpha, false);

                        // Mark 5x5 cells as visited
                        for (let i = 0; i < 5; ++i) {
                            const rowOffset = (r + i) * N;

                            for (let j = 0; j < 5; ++j) {
                                visited[rowOffset + (c + j)] = 1;
                            }
                        }
                    }
                }
            }
        }

        // Phase 3: Data Modules (Greedy Rectilinear Merging)
        for (let r = 0; r < N; ++r) {
            const row = matrix[r];
            const rowOffset = r * N;

            for (let c = 0; c < N; ++c) {
                if (!row[c] || visited[rowOffset + c] === 1) continue;

                // Step 3a: Expand Horizontally
                let w = 1;
                while (c + w < N && row[c + w] && visited[rowOffset + (c + w)] === 0) {
                    w++;
                }

                // Step 3b: Expand Vertically
                let h = 1;
                verticalCheck: while (r + h < N) {
                    const nextRow = matrix[r + h];
                    const nextRowOffset = (r + h) * N;

                    for (let k = 0; k < w; ++k) {
                        if (!nextRow[c + k] || visited[nextRowOffset + (c + k)] === 1) {
                            break verticalCheck;
                        }
                    }

                    h++;
                }

                // Step 3c: Draw Merged Dark Rectangle
                drawRect(c, r, w, h, darkVec, darkAlpha, false);

                // Step 3d: Mark w x h region as visited
                for (let i = 0; i < h; ++i) {
                    const markRowOffset = (r + i) * N;

                    for (let j = 0; j < w; ++j) {
                        visited[markRowOffset + (c + j)] = 1;
                    }
                }

                // Advance column cursor past merged block
                c += w - 1;
            }
        }

        UIQRCode._childWidgets[qrSlot] = childModules;
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return;

        const modules = UIQRCode._childWidgets[qrSlot];

        if (modules) {
            for (let i = 0; i < modules.length; ++i) {
                mod.DeleteUIWidget(modules[i].widget);
            }
        }

        this._freeQrCodeSlot();
        super.delete();
    }

    /**
     * The total number of native draw calls (widgets) used to render this QR code.
     * @returns The total draw call count, or undefined if deleted.
     */
    public get drawCallCount(): number | undefined {
        const slot = this._qrCodeSlot;

        if (slot === UI.Element._INVALID_INDEX) return undefined;

        const modules = UIQRCode._childWidgets[slot];

        return modules ? modules.length + 1 : 1;
    }

    /**
     * The scale multiplier applied to module sizing.
     * @returns The scale multiplier, or undefined if deleted.
     */
    public get scale(): number | undefined {
        const slot = this._qrCodeSlot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIQRCode._scales[slot];
    }

    /**
     * Sets the scale of the QR code and re-renders child rectangles.
     * @param scale - The new scale multiplier.
     */
    public set scale(scale: number) {
        this.setScale(scale);
    }

    /**
     * Sets the scale of the QR code and re-renders child rectangles.
     * @param scale - The new scale multiplier.
     * @returns This element for chaining.
     */
    public setScale(scale: number): this {
        const slot = this._resolveQrCodeSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIQRCode._scales[slot] = scale;
        this._updateModuleLayout(slot);

        return this;
    }

    /**
     * The margin (quiet zone) in module units.
     * @returns The margin count, or undefined if deleted.
     */
    public get margin(): number | undefined {
        const slot = this._qrCodeSlot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UIQRCode._margins[slot];
    }

    /**
     * Sets the margin (quiet zone) in module units and re-renders.
     * @param margin - The margin in module units.
     */
    public set margin(margin: number) {
        this.setMargin(margin);
    }

    /**
     * Sets the margin (quiet zone) in module units and re-renders.
     * @param margin - The margin in module units.
     * @returns This element for chaining.
     */
    public setMargin(margin: number): this {
        const slot = this._resolveQrCodeSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return this;

        UIQRCode._margins[slot] = margin;
        this._updateModuleLayout(slot);

        return this;
    }

    /**
     * The dark module color, or undefined if deleted.
     * @returns The dark module color, or undefined if deleted.
     */
    public get darkColor(): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot);
    }

    /**
     * Retrieves the dark module color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The dark module color, or undefined if deleted.
     */
    public getDarkColor(out?: Colors.Color): Colors.Color | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundColor(slot, out);
    }

    /**
     * Sets the dark module color.
     * @param color - The new dark module color.
     */
    public set darkColor(color: Colors.Color) {
        this.setDarkColor(color);
    }

    /**
     * Sets the dark module color.
     * @param color - The new dark module color.
     * @returns This element for chaining.
     */
    public setDarkColor(color: Colors.Color): this {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return this;

        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return this;

        UI.Element._setForegroundColor(elementSlot, color);
        const modules = UIQRCode._childWidgets[qrSlot];

        if (!modules) return this;

        const darkVec = Colors.toVector(color);

        for (let i = 0; i < modules.length; ++i) {
            const modInfo = modules[i];

            if (modInfo.isLight) continue;

            mod.SetUIWidgetBgColor(modInfo.widget, darkVec);
        }

        return this;
    }

    /**
     * The dark module alpha opacity, or undefined if deleted.
     * @returns The dark module alpha opacity, or undefined if deleted.
     */
    public get darkAlpha(): number | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : UI.Element._getForegroundAlpha(slot);
    }

    /**
     * Sets the dark module alpha opacity.
     * @param alpha - The new dark module alpha opacity.
     */
    public set darkAlpha(alpha: number) {
        this.setDarkAlpha(alpha);
    }

    /**
     * Sets the dark module alpha opacity.
     * @param alpha - The new dark module alpha opacity.
     * @returns This element for chaining.
     */
    public setDarkAlpha(alpha: number): this {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return this;

        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return this;

        UI.Element._setForegroundAlpha(elementSlot, alpha);
        const modules = UIQRCode._childWidgets[qrSlot];

        if (!modules) return this;

        for (let i = 0; i < modules.length; ++i) {
            const modInfo = modules[i];

            if (modInfo.isLight) continue;

            mod.SetUIWidgetBgAlpha(modInfo.widget, alpha);
        }

        return this;
    }

    /**
     * The light module (background) color, or undefined if deleted.
     * @returns The light color, or undefined if deleted.
     */
    public get lightColor(): Colors.Color | undefined {
        return this.bgColor;
    }

    /**
     * Retrieves the light module color into an optional target Color object for zero-allocation reuse.
     * @param out - Optional target Color to write into.
     * @returns The light module color, or undefined if deleted.
     */
    public getLightColor(out?: Colors.Color): Colors.Color | undefined {
        return this.getBgColor(out);
    }

    /**
     * Sets the light module (background) color.
     * @param color - The new light color.
     */
    public set lightColor(color: Colors.Color) {
        this.setLightColor(color);
    }

    /**
     * Sets the light module (background) color.
     * @param color - The new light color.
     * @returns This element for chaining.
     */
    public setLightColor(color: Colors.Color): this {
        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return this;

        super.setBgColor(color);
        const modules = UIQRCode._childWidgets[qrSlot];

        if (!modules) return this;

        const lightVec = Colors.toVector(color);

        for (let i = 0; i < modules.length; ++i) {
            const modInfo = modules[i];

            if (!modInfo.isLight) continue;

            mod.SetUIWidgetBgColor(modInfo.widget, lightVec);
        }

        return this;
    }

    /**
     * @inheritdoc
     * @returns This element for chaining.
     */
    public override setBgColor(color: Colors.Color): this {
        return this.setLightColor(color);
    }

    /**
     * The light module alpha opacity, or undefined if deleted.
     * @returns The light module alpha opacity, or undefined if deleted.
     */
    public get lightAlpha(): number | undefined {
        return this.bgAlpha;
    }

    /**
     * Sets the light module alpha opacity.
     * @param alpha - The new light module alpha opacity.
     */
    public set lightAlpha(alpha: number) {
        this.setLightAlpha(alpha);
    }

    /**
     * Sets the light module alpha opacity.
     * @param alpha - The new light module alpha opacity.
     * @returns This element for chaining.
     */
    public setLightAlpha(alpha: number): this {
        const qrSlot = this._resolveQrCodeSlotAndLogWarning();

        if (qrSlot === UI.Element._INVALID_INDEX) return this;

        super.setBgAlpha(alpha);
        const modules = UIQRCode._childWidgets[qrSlot];

        if (!modules) return this;

        for (let i = 0; i < modules.length; ++i) {
            const modInfo = modules[i];

            if (!modInfo.isLight) continue;

            mod.SetUIWidgetBgAlpha(modInfo.widget, alpha);
        }

        return this;
    }

    /**
     * @inheritdoc
     * @returns This element for chaining.
     */
    public override setBgAlpha(alpha: number): this {
        return this.setLightAlpha(alpha);
    }

    /**
     * Updates the position and size of all child modules in place upon scale or margin change.
     * @param qrSlot - The QR code sub-pool slot index.
     */
    private _updateModuleLayout(qrSlot: number): void {
        const N = UIQRCode._matrixSizes[qrSlot];

        if (N === 0) return;

        const scale = UIQRCode._scales[qrSlot];
        const margin = UIQRCode._margins[qrSlot];
        const gridUnits = N + 2 * margin;

        const totalWidth = gridUnits * UIQRCode.BASE_MODULE_SIZE * scale;
        const totalHeight = gridUnits * UIQRCode.BASE_MODULE_SIZE * scale;

        this.setWidth(totalWidth);
        this.setHeight(totalHeight);

        const cellWidth = totalWidth / gridUnits;
        const cellHeight = totalHeight / gridUnits;

        const modules = UIQRCode._childWidgets[qrSlot];

        if (!modules) return;

        for (let i = 0; i < modules.length; ++i) {
            const m = modules[i];
            const x0 = Math.round((m.col + margin) * cellWidth);
            const y0 = Math.round((m.row + margin) * cellHeight);
            const x1 = Math.round((m.col + m.spanW + margin) * cellWidth);
            const y1 = Math.round((m.row + m.spanH + margin) * cellHeight);
            const w = Math.max(1, x1 - x0);
            const h = Math.max(1, y1 - y0);

            mod.SetUIWidgetPosition(m.widget, mod.CreateVector(x0, y0, 0));
            mod.SetUIWidgetSize(m.widget, mod.CreateVector(w, h, 0));
        }
    }
}

export namespace UIQRCode {
    /**
     * Represents a single child module container widget with its relative grid bounds.
     */
    export interface ChildModule {
        widget: mod.UIWidget;
        col: number;
        row: number;
        spanW: number;
        spanH: number;
        isLight: boolean;
    }

    /**
     * Standard ISO/IEC 18004 alignment pattern center locations for versions 1 through 40.
     */
    export const ALIGNMENT_POSITIONS: ReadonlyArray<ReadonlyArray<number>> = Object.freeze([
        [], // V1
        [6, 18], // V2
        [6, 22], // V3
        [6, 26], // V4
        [6, 30], // V5
        [6, 34], // V6
        [6, 22, 38], // V7
        [6, 24, 42], // V8
        [6, 26, 46], // V9
        [6, 28, 50], // V10
        [6, 30, 54], // V11
        [6, 32, 58], // V12
        [6, 34, 62], // V13
        [6, 26, 46, 66], // V14
        [6, 26, 48, 70], // V15
        [6, 26, 50, 74], // V16
        [6, 30, 54, 78], // V17
        [6, 30, 56, 82], // V18
        [6, 30, 58, 86], // V19
        [6, 34, 62, 90], // V20
        [6, 28, 50, 72, 94], // V21
        [6, 26, 50, 74, 98], // V22
        [6, 30, 54, 78, 102], // V23
        [6, 28, 54, 80, 106], // V24
        [6, 32, 58, 84, 110], // V25
        [6, 30, 58, 86, 114], // V26
        [6, 34, 62, 90, 118], // V27
        [6, 26, 50, 74, 98, 122], // V28
        [6, 30, 54, 78, 102, 126], // V29
        [6, 26, 52, 78, 104, 130], // V30
        [6, 30, 56, 82, 108, 134], // V31
        [6, 34, 60, 86, 112, 138], // V32
        [6, 30, 58, 86, 114, 142], // V33
        [6, 34, 62, 90, 118, 146], // V34
        [6, 30, 54, 78, 102, 126, 150], // V35
        [6, 24, 50, 76, 102, 128, 154], // V36
        [6, 28, 54, 80, 106, 132, 158], // V37
        [6, 32, 58, 84, 110, 136, 162], // V38
        [6, 26, 54, 82, 110, 138, 166], // V39
        [6, 30, 58, 86, 114, 142, 170], // V40
    ]);

    /**
     * 2D Matrix of numbers (1/0) or booleans representing QR module cells.
     */
    export type Matrix = ReadonlyArray<ReadonlyArray<boolean | number>>;

    /**
     * 2D Matrix of booleans representing QR module cells.
     */
    export type BooleanMatrix = ReadonlyArray<ReadonlyArray<boolean>>;

    /**
     * QR Code Error Correction Levels.
     */
    export enum ECC {
        Low = 'L',
        Medium = 'M',
        Quartile = 'Q',
        High = 'H',
    }

    /**
     * The parameters for creating a new UIQRCode element.
     */
    export type Params = UI.ElementParams & {
        /**
         * Text string to encode into a QR code. Mutually exclusive with `matrix`.
         */
        text?: string;
        /**
         * Optional pre-generated 2D matrix (array of rows containing 1/0 or true/false).
         */
        matrix?: UIQRCode.Matrix;
        /**
         * Error correction level when `text` is provided (defaults to `ECC.Medium`).
         */
        ecc?: UIQRCode.ECC;
        /**
         * Scale multiplier. When `1`, the smallest module is 10 units wide/tall. When `2`, it is 20 units. Defaults to `1`.
         */
        scale?: number;
        /**
         * Quiet zone margin in module units around the QR code (defaults to `0`).
         */
        margin?: number;
        /**
         * Color for dark modules (defaults to `UI.COLORS.BLACK`).
         */
        darkColor?: Colors.Color;
        /**
         * Opacity for dark modules (defaults to `1`).
         */
        darkAlpha?: number;
        /**
         * Color for light modules and background canvas (defaults to `UI.COLORS.WHITE`).
         */
        lightColor?: Colors.Color;
        /**
         * Opacity for light modules and background canvas (defaults to `1`).
         */
        lightAlpha?: number;
    };

    /**
     * Self-contained, zero-dependency QR code matrix generator.
     */
    export namespace Encoder {
        const GF_EXP = new Uint8Array(512);
        const GF_LOG = new Uint8Array(256);

        // Precompute Galois Field tables GF(256) with primitive polynomial 0x11D
        let x = 1;
        for (let i = 0; i < 255; ++i) {
            GF_EXP[i] = x;
            GF_EXP[i + 255] = x;
            GF_LOG[x] = i;
            x <<= 1;

            if (x & 0x100) {
                x ^= 0x11d;
            }
        }

        function gfMul(a: number, b: number): number {
            return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
        }

        function polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
            const result = new Uint8Array(p1.length + p2.length - 1);

            for (let i = 0; i < p1.length; ++i) {
                for (let j = 0; j < p2.length; ++j) {
                    result[i + j] ^= gfMul(p1[i], p2[j]);
                }
            }

            return result;
        }

        function getGeneratorPoly(degree: number): Uint8Array {
            let poly: Uint8Array = new Uint8Array([1]);

            for (let i = 0; i < degree; ++i) {
                poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]));
            }

            return poly;
        }

        function computeReedSolomon(data: Uint8Array, eccLen: number): Uint8Array {
            const gen = getGeneratorPoly(eccLen);
            const msg = new Uint8Array(data.length + eccLen);
            msg.set(data);

            for (let i = 0; i < data.length; ++i) {
                const coef = msg[i];

                if (coef === 0) continue;

                for (let j = 0; j < gen.length; ++j) {
                    msg[i + j] ^= gfMul(gen[j], coef);
                }
            }

            const out = new Uint8Array(eccLen);
            out.set(msg.subarray(data.length));

            return out;
        }

        function encodeUtf8(str: string): Uint8Array {
            const bytes: number[] = [];

            for (let i = 0; i < str.length; ++i) {
                const code = str.charCodeAt(i);

                if (code < 0x80) {
                    bytes.push(code);
                } else if (code < 0x800) {
                    bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
                } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
                    const next = str.charCodeAt(++i);
                    const codePoint = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);

                    bytes.push(
                        0xf0 | (codePoint >> 18),
                        0x80 | ((codePoint >> 12) & 0x3f),
                        0x80 | ((codePoint >> 6) & 0x3f),
                        0x80 | (codePoint & 0x3f)
                    );
                } else {
                    bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                }
            }

            return new Uint8Array(bytes);
        }

        /**
         * ECC table per version (1..40) and ECC index (0:L, 1:M, 2:Q, 3:H).
         * Format: [eccCodewordsPerBlock, numBlocksG1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
         */
        const ECC_TABLE: ReadonlyArray<ReadonlyArray<[number, number, number, number, number]>> = Object.freeze([
            // V1
            [
                [7, 1, 19, 0, 0],
                [10, 1, 16, 0, 0],
                [13, 1, 13, 0, 0],
                [17, 1, 9, 0, 0],
            ],
            // V2
            [
                [10, 1, 34, 0, 0],
                [16, 1, 28, 0, 0],
                [22, 1, 22, 0, 0],
                [28, 1, 16, 0, 0],
            ],
            // V3
            [
                [15, 1, 55, 0, 0],
                [26, 1, 44, 0, 0],
                [18, 2, 17, 0, 0],
                [22, 2, 13, 0, 0],
            ],
            // V4
            [
                [20, 1, 80, 0, 0],
                [18, 2, 32, 0, 0],
                [26, 2, 24, 0, 0],
                [16, 4, 9, 0, 0],
            ],
            // V5
            [
                [26, 1, 108, 0, 0],
                [24, 2, 43, 0, 0],
                [18, 2, 15, 2, 16],
                [22, 2, 11, 2, 12],
            ],
            // V6
            [
                [18, 2, 68, 0, 0],
                [16, 4, 27, 0, 0],
                [24, 4, 19, 0, 0],
                [28, 4, 15, 0, 0],
            ],
            // V7
            [
                [20, 2, 78, 0, 0],
                [18, 4, 31, 0, 0],
                [18, 2, 14, 4, 15],
                [26, 4, 13, 1, 14],
            ],
            // V8
            [
                [24, 2, 97, 0, 0],
                [22, 2, 38, 2, 39],
                [22, 4, 18, 2, 19],
                [26, 4, 14, 2, 15],
            ],
            // V9
            [
                [30, 2, 116, 0, 0],
                [22, 3, 36, 2, 37],
                [20, 4, 16, 4, 17],
                [24, 4, 12, 4, 13],
            ],
            // V10
            [
                [18, 2, 68, 2, 69],
                [26, 4, 43, 1, 44],
                [24, 6, 19, 2, 20],
                [28, 6, 15, 2, 16],
            ],
            // V11
            [
                [20, 4, 81, 0, 0],
                [30, 1, 50, 4, 51],
                [28, 4, 22, 4, 23],
                [24, 3, 12, 8, 13],
            ],
            // V12
            [
                [24, 2, 92, 2, 93],
                [22, 6, 36, 2, 37],
                [26, 4, 20, 6, 21],
                [28, 7, 14, 4, 15],
            ],
            // V13
            [
                [26, 4, 107, 0, 0],
                [22, 8, 37, 1, 38],
                [24, 8, 20, 4, 21],
                [22, 12, 11, 4, 12],
            ],
            // V14
            [
                [30, 3, 115, 1, 116],
                [24, 4, 40, 5, 41],
                [20, 11, 16, 5, 17],
                [24, 11, 12, 5, 13],
            ],
            // V15
            [
                [22, 5, 87, 1, 88],
                [24, 5, 41, 5, 42],
                [30, 5, 24, 7, 25],
                [24, 11, 12, 7, 13],
            ],
            // V16
            [
                [24, 5, 98, 1, 99],
                [28, 7, 45, 3, 46],
                [24, 15, 19, 2, 20],
                [30, 3, 15, 13, 16],
            ],
            // V17
            [
                [28, 1, 107, 5, 108],
                [28, 10, 46, 1, 47],
                [28, 1, 22, 15, 23],
                [28, 2, 14, 17, 15],
            ],
            // V18
            [
                [30, 5, 120, 1, 121],
                [26, 9, 43, 4, 44],
                [28, 17, 22, 1, 23],
                [28, 2, 14, 19, 15],
            ],
            // V19
            [
                [28, 3, 113, 4, 114],
                [26, 3, 44, 11, 45],
                [26, 17, 21, 4, 22],
                [26, 9, 13, 16, 14],
            ],
            // V20
            [
                [28, 3, 107, 5, 108],
                [26, 3, 41, 13, 42],
                [30, 15, 24, 5, 25],
                [28, 15, 15, 10, 16],
            ],
            // V21
            [
                [28, 4, 116, 4, 117],
                [26, 17, 42, 0, 0],
                [28, 17, 22, 6, 23],
                [30, 19, 16, 6, 17],
            ],
            // V22
            [
                [28, 2, 111, 7, 112],
                [28, 17, 46, 0, 0],
                [30, 7, 24, 16, 25],
                [24, 34, 13, 0, 0],
            ],
            // V23
            [
                [30, 4, 121, 5, 122],
                [28, 4, 47, 14, 48],
                [30, 11, 24, 14, 25],
                [30, 16, 15, 14, 16],
            ],
            // V24
            [
                [30, 6, 117, 4, 118],
                [28, 6, 45, 14, 46],
                [30, 11, 24, 16, 25],
                [30, 30, 16, 2, 17],
            ],
            // V25
            [
                [26, 8, 106, 4, 107],
                [28, 8, 47, 13, 48],
                [30, 7, 24, 22, 25],
                [30, 22, 15, 13, 16],
            ],
            // V26
            [
                [28, 10, 114, 2, 115],
                [28, 19, 46, 4, 47],
                [28, 28, 22, 6, 23],
                [30, 33, 16, 4, 17],
            ],
            // V27
            [
                [30, 8, 122, 4, 123],
                [28, 22, 45, 3, 46],
                [30, 8, 23, 26, 24],
                [30, 12, 15, 28, 16],
            ],
            // V28
            [
                [30, 3, 117, 10, 118],
                [28, 3, 45, 23, 46],
                [30, 4, 24, 31, 25],
                [30, 11, 15, 31, 16],
            ],
            // V29
            [
                [30, 7, 116, 7, 117],
                [28, 21, 45, 7, 46],
                [30, 1, 23, 37, 24],
                [30, 19, 15, 26, 16],
            ],
            // V30
            [
                [30, 5, 115, 10, 116],
                [28, 19, 47, 10, 48],
                [30, 15, 24, 25, 25],
                [30, 23, 15, 25, 16],
            ],
            // V31
            [
                [30, 13, 115, 3, 116],
                [28, 2, 46, 29, 47],
                [30, 42, 24, 1, 25],
                [30, 23, 15, 28, 16],
            ],
            // V32
            [
                [30, 17, 115, 0, 0],
                [28, 10, 46, 23, 47],
                [30, 10, 24, 35, 25],
                [30, 19, 15, 35, 16],
            ],
            // V33
            [
                [30, 17, 115, 1, 116],
                [28, 14, 46, 21, 47],
                [30, 29, 24, 19, 25],
                [30, 11, 15, 46, 16],
            ],
            // V34
            [
                [30, 13, 115, 6, 116],
                [28, 14, 46, 23, 47],
                [30, 44, 24, 7, 25],
                [30, 59, 16, 1, 17],
            ],
            // V35
            [
                [30, 12, 121, 7, 122],
                [28, 12, 47, 26, 48],
                [30, 39, 24, 14, 25],
                [30, 22, 15, 41, 16],
            ],
            // V36
            [
                [30, 6, 121, 14, 122],
                [28, 6, 47, 34, 48],
                [30, 46, 24, 10, 25],
                [30, 2, 15, 64, 16],
            ],
            // V37
            [
                [30, 17, 122, 4, 123],
                [28, 29, 46, 14, 47],
                [30, 49, 24, 10, 25],
                [30, 24, 15, 46, 16],
            ],
            // V38
            [
                [30, 4, 122, 18, 123],
                [28, 13, 46, 32, 47],
                [30, 48, 24, 14, 25],
                [30, 42, 15, 32, 16],
            ],
            // V39
            [
                [30, 20, 117, 4, 118],
                [28, 40, 47, 7, 48],
                [30, 43, 24, 22, 25],
                [30, 10, 15, 67, 16],
            ],
            // V40
            [
                [30, 19, 118, 6, 119],
                [28, 18, 47, 31, 48],
                [30, 34, 24, 34, 25],
                [30, 20, 15, 61, 16],
            ],
        ]);

        function getEccIndex(ecc: UIQRCode.ECC): number {
            switch (ecc) {
                case UIQRCode.ECC.Low:
                    return 0;
                case UIQRCode.ECC.Medium:
                    return 1;
                case UIQRCode.ECC.Quartile:
                    return 2;
                case UIQRCode.ECC.High:
                    return 3;
            }
        }

        function getVersionInfoBits(version: number): number {
            let d = version << 12;

            while (d >= 1 << 12) {
                const shift = 31 - Math.clz32(d) - 12;

                if (shift < 0) break;

                d ^= 0x1f25 << shift;
            }

            return (version << 12) | d;
        }

        function getFormatInfoBits(ecc: UIQRCode.ECC, mask: number): number {
            const eccBits = [1, 0, 3, 2][getEccIndex(ecc)];
            const data = (eccBits << 3) | mask;
            let d = data << 10;

            while (d >= 1 << 10) {
                const shift = 31 - Math.clz32(d) - 10;

                if (shift < 0) break;

                d ^= 0x537 << shift;
            }

            return ((data << 10) | d) ^ 0x5412;
        }

        /**
         * Encodes a text payload into a 2D boolean QR code matrix.
         * @param text - The text to encode.
         * @param ecc - Error correction level.
         * @returns 2D square boolean matrix.
         */
        export function encode(text: string, ecc: UIQRCode.ECC = UIQRCode.ECC.Medium): boolean[][] {
            const utf8 = encodeUtf8(text);
            const eccIdx = getEccIndex(ecc);

            // Find minimum version that fits data
            let version = 0;
            let totalDataCodewords = 0;

            for (let v = 1; v <= 40; ++v) {
                const eccConfig = ECC_TABLE[v - 1][eccIdx];
                const dataCapacity = eccConfig[1] * eccConfig[2] + eccConfig[3] * eccConfig[4];

                const charCountBits = v < 10 ? 8 : 16;
                const totalBits = 4 + charCountBits + utf8.length * 8;
                const totalBytes = Math.ceil(totalBits / 8);

                if (totalBytes <= dataCapacity) {
                    version = v;
                    totalDataCodewords = dataCapacity;
                    break;
                }
            }

            if (version === 0) {
                throw new Error(`Data payload too large for QR code (ECC: ${ecc}, bytes: ${utf8.length})`);
            }

            // Construct bitstream
            const charCountBits = version < 10 ? 8 : 16;
            const bitStream: number[] = [];

            function pushBits(val: number, len: number): void {
                for (let i = len - 1; i >= 0; --i) {
                    bitStream.push((val >> i) & 1);
                }
            }

            // Mode indicator (0100 for 8-bit byte mode)
            pushBits(0b0100, 4);
            pushBits(utf8.length, charCountBits);

            for (let i = 0; i < utf8.length; ++i) {
                pushBits(utf8[i], 8);
            }

            // Terminator (up to 4 bits)
            const capacityBits = totalDataCodewords * 8;
            const termLen = Math.min(4, capacityBits - bitStream.length);
            pushBits(0, termLen);

            // Pad to byte boundary
            while (bitStream.length % 8 !== 0) {
                bitStream.push(0);
            }

            // Pad bytes (0xEC, 0x11)
            const padBytes = [0xec, 0x11];
            let padIdx = 0;
            while (bitStream.length < capacityBits) {
                pushBits(padBytes[padIdx], 8);
                padIdx ^= 1;
            }

            // Convert bitStream to data codewords
            const dataBytes = new Uint8Array(totalDataCodewords);

            for (let i = 0; i < totalDataCodewords; ++i) {
                let byte = 0;

                for (let b = 0; b < 8; ++b) {
                    byte = (byte << 1) | bitStream[i * 8 + b];
                }

                dataBytes[i] = byte;
            }

            // Break into blocks and compute Reed-Solomon ECC
            const eccConfig = ECC_TABLE[version - 1][eccIdx];
            const eccPerBlock = eccConfig[0];
            const numBlocks = eccConfig[1] + eccConfig[3];

            const dataBlocks: Uint8Array[] = [];
            const eccBlocks: Uint8Array[] = [];

            let offset = 0;

            for (let b = 0; b < eccConfig[1]; ++b) {
                const len = eccConfig[2];
                const blockData = dataBytes.subarray(offset, offset + len);
                offset += len;
                dataBlocks.push(blockData);
                eccBlocks.push(computeReedSolomon(blockData, eccPerBlock));
            }

            for (let b = 0; b < eccConfig[3]; ++b) {
                const len = eccConfig[4];
                const blockData = dataBytes.subarray(offset, offset + len);
                offset += len;
                dataBlocks.push(blockData);
                eccBlocks.push(computeReedSolomon(blockData, eccPerBlock));
            }

            // Interleave data and ECC codewords
            const finalCodewords: number[] = [];
            const maxDataBlockLen = Math.max(eccConfig[2], eccConfig[4]);

            for (let i = 0; i < maxDataBlockLen; ++i) {
                for (let b = 0; b < numBlocks; ++b) {
                    if (i < dataBlocks[b].length) {
                        finalCodewords.push(dataBlocks[b][i]);
                    }
                }
            }

            for (let i = 0; i < eccPerBlock; ++i) {
                for (let b = 0; b < numBlocks; ++b) {
                    finalCodewords.push(eccBlocks[b][i]);
                }
            }

            // Matrix generation
            const size = 17 + 4 * version;
            const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
            const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

            function setModule(r: number, c: number, val: boolean, isFunc = true): void {
                matrix[r][c] = val;

                if (isFunc) {
                    isFunction[r][c] = true;
                }
            }

            // Finder patterns
            function drawFinder(r: number, c: number): void {
                for (let i = -1; i <= 7; ++i) {
                    for (let j = -1; j <= 7; ++j) {
                        const nr = r + i;
                        const nc = c + j;

                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

                        if (i >= 0 && i <= 6 && j >= 0 && j <= 6) {
                            const isBlack =
                                i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);

                            setModule(nr, nc, isBlack);
                        } else {
                            setModule(nr, nc, false); // Separator
                        }
                    }
                }
            }

            drawFinder(0, 0);
            drawFinder(0, size - 7);
            drawFinder(size - 7, 0);

            // Alignment patterns
            if (version >= 2) {
                const positions = UIQRCode.ALIGNMENT_POSITIONS[version - 1];

                for (let p1 = 0; p1 < positions.length; ++p1) {
                    const r = positions[p1];

                    for (let p2 = 0; p2 < positions.length; ++p2) {
                        const c = positions[p2];

                        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;

                        for (let i = -2; i <= 2; ++i) {
                            for (let j = -2; j <= 2; ++j) {
                                const isBlack = Math.max(Math.abs(i), Math.abs(j)) === 2 || (i === 0 && j === 0);
                                setModule(r + i, c + j, isBlack);
                            }
                        }
                    }
                }
            }

            // Timing patterns
            for (let i = 8; i < size - 8; ++i) {
                setModule(6, i, i % 2 === 0);
                setModule(i, 6, i % 2 === 0);
            }

            // Dark module
            setModule(size - 8, 8, true);

            // Reserve format info
            for (let i = 0; i <= 8; ++i) {
                if (!isFunction[8][i]) setModule(8, i, false);
                if (!isFunction[i][8]) setModule(i, 8, false);
            }

            for (let i = 0; i < 8; ++i) {
                setModule(8, size - 1 - i, false);
            }

            for (let i = 0; i < 7; ++i) {
                setModule(size - 1 - i, 8, false);
            }

            // Reserve version info (v >= 7)
            if (version >= 7) {
                for (let i = 0; i < 6; ++i) {
                    for (let j = 0; j < 3; ++j) {
                        setModule(i, size - 11 + j, false);
                        setModule(size - 11 + j, i, false);
                    }
                }
            }

            // Place data bits in zigzag path
            const totalDataBits = finalCodewords.length * 8;
            let bitIdx = 0;
            let right = size - 1;
            let upward = true;

            while (right > 0) {
                if (right === 6) right--; // Skip vertical timing column

                for (let vert = 0; vert < size; ++vert) {
                    const r = upward ? size - 1 - vert : vert;

                    for (let colOffset = 0; colOffset < 2; ++colOffset) {
                        const c = right - colOffset;

                        if (isFunction[r][c]) continue;

                        let bit = false;

                        if (bitIdx < totalDataBits) {
                            const byte = finalCodewords[bitIdx >> 3];
                            const bitPos = 7 - (bitIdx & 7);
                            bit = ((byte >> bitPos) & 1) === 1;
                        }

                        bitIdx++;
                        matrix[r][c] = bit;
                    }
                }

                upward = !upward;
                right -= 2;
            }

            // Evaluate best mask pattern (0..7)
            function isMaskCondition(m: number, r: number, c: number): boolean {
                switch (m) {
                    case 0:
                        return (r + c) % 2 === 0;
                    case 1:
                        return r % 2 === 0;
                    case 2:
                        return c % 3 === 0;
                    case 3:
                        return (r + c) % 3 === 0;
                    case 4:
                        return ((r >> 1) + Math.floor(c / 3)) % 2 === 0;
                    case 5:
                        return ((r * c) % 2) + ((r * c) % 3) === 0;
                    case 6:
                        return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
                    case 7:
                        return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
                    default:
                        return false;
                }
            }

            let bestMask = 0;
            let lowestPenalty = Infinity;

            for (let m = 0; m < 8; ++m) {
                let penalty = 0;

                // Copy matrix with mask applied
                const testMat: boolean[][] = new Array(size);

                for (let r = 0; r < size; ++r) {
                    testMat[r] = new Array(size);

                    for (let c = 0; c < size; ++c) {
                        testMat[r][c] = isFunction[r][c]
                            ? matrix[r][c]
                            : isMaskCondition(m, r, c)
                              ? !matrix[r][c]
                              : matrix[r][c];
                    }
                }

                // Apply format info for mask evaluation
                const formatBits = getFormatInfoBits(ecc, m);

                const formatCoords = [
                    [0, 8],
                    [1, 8],
                    [2, 8],
                    [3, 8],
                    [4, 8],
                    [5, 8],
                    [7, 8],
                    [8, 8],
                    [8, 7],
                    [8, 5],
                    [8, 4],
                    [8, 3],
                    [8, 2],
                    [8, 1],
                    [8, 0],
                ];

                const formatCoords2 = [
                    [size - 1, 8],
                    [size - 2, 8],
                    [size - 3, 8],
                    [size - 4, 8],
                    [size - 5, 8],
                    [size - 6, 8],
                    [size - 7, 8],
                    [8, size - 8],
                    [8, size - 7],
                    [8, size - 6],
                    [8, size - 5],
                    [8, size - 4],
                    [8, size - 3],
                    [8, size - 2],
                    [8, size - 1],
                ];

                for (let i = 0; i < 15; ++i) {
                    const bit = ((formatBits >> i) & 1) === 1;
                    testMat[formatCoords[i][0]][formatCoords[i][1]] = bit;
                    testMat[formatCoords2[i][0]][formatCoords2[i][1]] = bit;
                }

                // Penalty 1: Runs of 5+ same color in rows/columns
                for (let r = 0; r < size; ++r) {
                    let rowCount = 0;
                    let rowColor = false;
                    let colCount = 0;
                    let colColor = false;

                    for (let c = 0; c < size; ++c) {
                        if (c === 0 || testMat[r][c] !== rowColor) {
                            rowColor = testMat[r][c];
                            rowCount = 1;
                        } else {
                            rowCount++;

                            if (rowCount === 5) {
                                penalty += 3;
                            } else if (rowCount > 5) {
                                penalty++;
                            }
                        }

                        if (c === 0 || testMat[c][r] !== colColor) {
                            colColor = testMat[c][r];
                            colCount = 1;
                        } else {
                            colCount++;

                            if (colCount === 5) {
                                penalty += 3;
                            } else if (colCount > 5) {
                                penalty++;
                            }
                        }
                    }
                }

                // Penalty 2: 2x2 blocks
                for (let r = 0; r < size - 1; ++r) {
                    for (let c = 0; c < size - 1; ++c) {
                        const val = testMat[r][c];

                        if (val === testMat[r][c + 1] && val === testMat[r + 1][c] && val === testMat[r + 1][c + 1]) {
                            penalty += 3;
                        }
                    }
                }

                // Penalty 4: Dark module ratio
                let darkCount = 0;

                for (let r = 0; r < size; ++r) {
                    for (let c = 0; c < size; ++c) {
                        if (testMat[r][c]) {
                            darkCount++;
                        }
                    }
                }

                const ratio = (darkCount * 100) / (size * size);
                const step = Math.floor(Math.abs(ratio - 50) / 5);
                penalty += step * 10;

                if (penalty < lowestPenalty) {
                    lowestPenalty = penalty;
                    bestMask = m;
                }
            }

            // Apply best mask to non-function modules
            for (let r = 0; r < size; ++r) {
                for (let c = 0; c < size; ++c) {
                    if (!isFunction[r][c] && isMaskCondition(bestMask, r, c)) {
                        matrix[r][c] = !matrix[r][c];
                    }
                }
            }

            // Write Format information (15 bits)
            const formatBits = getFormatInfoBits(ecc, bestMask);

            const formatCoords = [
                [0, 8],
                [1, 8],
                [2, 8],
                [3, 8],
                [4, 8],
                [5, 8],
                [7, 8],
                [8, 8],
                [8, 7],
                [8, 5],
                [8, 4],
                [8, 3],
                [8, 2],
                [8, 1],
                [8, 0],
            ];

            const formatCoords2 = [
                [size - 1, 8],
                [size - 2, 8],
                [size - 3, 8],
                [size - 4, 8],
                [size - 5, 8],
                [size - 6, 8],
                [size - 7, 8],
                [8, size - 8],
                [8, size - 7],
                [8, size - 6],
                [8, size - 5],
                [8, size - 4],
                [8, size - 3],
                [8, size - 2],
                [8, size - 1],
            ];

            for (let i = 0; i < 15; ++i) {
                const bit = ((formatBits >> i) & 1) === 1;
                setModule(formatCoords[i][0], formatCoords[i][1], bit);
                setModule(formatCoords2[i][0], formatCoords2[i][1], bit);
            }

            // Write Version information (18 bits, v >= 7)
            if (version >= 7) {
                const verBits = getVersionInfoBits(version);

                for (let i = 0; i < 18; ++i) {
                    const bit = ((verBits >> i) & 1) === 1;
                    const a = Math.floor(i / 3);
                    const b = (i % 3) + size - 11;
                    setModule(a, b, bit);
                    setModule(b, a, bit);
                }
            }

            return matrix;
        }
    }
}
