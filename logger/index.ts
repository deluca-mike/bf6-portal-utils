import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UIText } from '../ui/components/text/index.ts';

// version: 4.0.0
export class Logger {
    private static readonly _ROW_HEIGHT: number = 20;

    private static readonly _PADDING: number = 10;

    private static readonly _STATIC_PROMISE: Promise<void> = Promise.resolve();

    private static readonly _CHAR_WIDTHS_TENTHS: Uint8Array = new Uint8Array(128);

    static {
        Logger._CHAR_WIDTHS_TENTHS.fill(100);

        const setWidths = (chars: string, tenths: number): void => {
            for (let i = 0; i < chars.length; ++i) {
                Logger._CHAR_WIDTHS_TENTHS[chars.charCodeAt(i)] = tenths;
            }
        };

        setWidths('Wm@', 140);
        setWidths('[', 130); // '[' is always prepended by a '\', so needs to be larger than ']'.
        setWidths('Mw', 125);
        setWidths('#?+', 120);
        setWidths('-=', 115);
        setWidths('U$%&~', 110);
        setWidths('CDGHNOQS<>', 105);
        setWidths('03689ABVX_', 100);
        setWidths('245EFKPRYZahs', 95);
        setWidths('7bcdegnopqu^*`', 90);
        setWidths('LTkvxyz', 85); // TODO: Maybe 'x' could be 8.
        setWidths('J]"\\/', 80);
        setWidths('1', 75);
        setWidths(' ', 70);
        setWidths('r', 65); // TODO: Maybe 'r' should be 6.
        setWidths('f{}', 60); // TODO: Maybe 'f' should be 5.5.
        setWidths('t', 55);
        setWidths('(),', 50);
        setWidths("';", 45);
        setWidths('!I|.:', 40);
        setWidths('ijl', 35);
    }

    private static _getParts(text: string): string[] {
        return (text.match(/( |[^ ]{1,4})/g) ?? []) as string[];
    }

    private static _buildMessage(part: string): mod.Message {
        if (part.length === 1) return mod.Message(Logger._getChar(part[0]));

        const char0 = part[0];
        const key = char0 + part.length;
        const formatRecord = mod.stringkeys.logger.format as Record<string, string>;

        const formatKey =
            formatRecord[key] ?? formatRecord['*' + part.length] ?? mod.stringkeys.logger.format.badFormat;

        if (part.length === 4) {
            return mod.Message(formatKey, Logger._getChar(part[1]), Logger._getChar(part[2]), Logger._getChar(part[3]));
        }

        if (part.length === 3) {
            return mod.Message(formatKey, Logger._getChar(part[1]), Logger._getChar(part[2]));
        }

        if (part.length === 2) {
            return mod.Message(formatKey, Logger._getChar(part[1]));
        }

        return mod.Message(mod.stringkeys.logger.format.badFormat);
    }

    private static _getChar(char: string): string {
        return mod.stringkeys.logger.chars[char] ?? mod.stringkeys.logger.chars['*'];
    }

    /**
     * Creates a new logger with specific options.
     * @param player - The player to draw the logger for.
     * @param options - The options for the logger.
     */
    constructor(player: mod.Player, options?: Logger.Options) {
        this._width = options?.width ?? 400;
        this._height = options?.height ?? 300;
        this._textColor = options?.textColor ?? UI.COLORS.BF_GREEN_BRIGHT;

        this._window = new UIContainer({
            x: options?.x ?? 10,
            y: options?.y ?? 10,
            width: this._width,
            height: this._height,
            parent: options?.parent,
            anchor: options?.anchor ?? mod.UIAnchor.TopLeft,
            bgColor: options?.bgColor ?? UI.COLORS.BF_GREY_4,
            bgAlpha: options?.bgAlpha ?? 0.5,
            bgFill: options?.bgFill ?? mod.UIBgFill.Blur,
            visible: options?.visible ?? false,
            receiver: player,
        });

        this._staticRows = options?.staticRows ?? false;
        this._truncate = this._staticRows || (options?.truncate ?? false);
        this._maxRows = ~~((this._height - 2 * Logger._PADDING) / Logger._ROW_HEIGHT);

        if (this._staticRows) {
            this._staticRowsList = new Array(this._maxRows).fill(null);
        }
    }

    private _window: UIContainer;

    private _staticRows: boolean;

    private _truncate: boolean;

    private _staticRowsList: (UIContainer | null)[] = [];

    private _dynamicRows: UIContainer[] = [];

    private _width: number;

    private _height: number;

    private _textColor: mod.Vector;

    private _maxRows: number;

    /**
     * The maximum number of rows in the logger.
     * @returns The maximum row count.
     */
    public get maxRows(): number {
        return this._maxRows;
    }

    /**
     * Whether the logger window is visible.
     * @returns True if visible, false otherwise.
     */
    public get visible(): boolean {
        return this._window.visible ?? false;
    }

    /**
     * Sets whether the logger window is visible.
     * @param visible - The new visibility state.
     */
    public set visible(visible: boolean) {
        this._window.visible = visible;
    }

    /**
     * Show the logger.
     * @returns The logger instance.
     */
    public show(): Logger {
        this.visible = true;
        return this;
    }

    /**
     * Hide the logger.
     * @returns The logger instance.
     */
    public hide(): Logger {
        this.visible = false;
        return this;
    }

    /**
     * Toggle the visibility of the logger.
     * @returns The logger instance.
     */
    public toggle(): Logger {
        this.visible = !this.visible;
        return this;
    }

    /**
     * Clear the logger.
     * @returns The logger instance.
     */
    public clear(): Logger {
        if (this._staticRows) {
            for (let i = 0; i < this._staticRowsList.length; ++i) {
                this._staticRowsList[i]?.delete();
                this._staticRowsList[i] = null;
            }
        } else {
            for (let i = 0; i < this._dynamicRows.length; ++i) {
                this._dynamicRows[i].delete();
            }

            this._dynamicRows.length = 0;
        }

        return this;
    }

    /**
     * Destroy the logger.
     */
    public destroy(): void {
        this.clear();
        this._window.delete();
    }

    /**
     * Log a message to the logger asynchronously (non-blocking microtask).
     * @param text - The text to log.
     * @param rowIndex - The row index to log the message to (if using static rows, default is 0).
     * @returns The logger instance.
     */
    public async logAsync(text: string, rowIndex?: number): Promise<void> {
        await Logger._STATIC_PROMISE;

        try {
            this.log(text, rowIndex);
        } catch {
            // Swallow errors to prevent unhandled promise rejections when the promise is not awaited.
        }
    }

    /**
     * Log a message to the logger.
     * @param text - The text to log.
     * @param rowIndex - The row index to log the message to (if using static rows, default is 0).
     * @returns The logger instance.
     */
    public log(text: string, rowIndex?: number): Logger {
        if (this._staticRows) {
            this._logInRow(text, rowIndex ?? 0);
        } else {
            this._logNext(text);
        }

        return this;
    }

    private _logInRow(text: string, rowIndex: number): void {
        if (rowIndex < 0 || rowIndex >= this._maxRows) return; // TODO: Actually, this should be an error.

        let row = this._staticRowsList[rowIndex];

        if (!row) {
            row = new UIContainer({
                x: Logger._PADDING,
                y: Logger._PADDING + rowIndex * Logger._ROW_HEIGHT,
                width: this._width - Logger._PADDING * 2,
                height: Logger._ROW_HEIGHT,
                anchor: mod.UIAnchor.TopLeft,
                parent: this._window,
                bgFill: mod.UIBgFill.None,
            });

            this._staticRowsList[rowIndex] = row;
        }

        this._fillRow(row, Logger._getParts(text));
    }

    private _logNext(text: string): void {
        this._logNextParts(Logger._getParts(text));
    }

    private _logNextParts(parts: string[]): void {
        let remaining: string[] | null = parts;

        while (remaining !== null) {
            const row = this._prepareNextRow();
            remaining = this._fillRow(row, remaining);
        }
    }

    private _prepareNextRow(): UIContainer {
        const bottomY = Logger._PADDING + (this._maxRows - 1) * Logger._ROW_HEIGHT;

        if (this._dynamicRows.length < this._maxRows) {
            // Window is not yet full. Shift existing rows up and add a new row at the bottom.
            for (let i = 0; i < this._dynamicRows.length; ++i) {
                this._dynamicRows[i].y = (this._dynamicRows[i].y ?? 0) - Logger._ROW_HEIGHT;
            }

            const newRow = new UIContainer({
                x: Logger._PADDING,
                y: bottomY,
                width: this._width - Logger._PADDING * 2,
                height: Logger._ROW_HEIGHT,
                anchor: mod.UIAnchor.TopLeft,
                parent: this._window,
                bgFill: mod.UIBgFill.None,
            });

            this._dynamicRows.push(newRow);
            return newRow;
        }

        // Window is full. Recycle the top row by repositioning it to the bottom.
        const recycledRow = this._dynamicRows.shift()!;
        recycledRow.y = bottomY;

        for (let i = 0; i < this._dynamicRows.length; ++i) {
            this._dynamicRows[i].y = (this._dynamicRows[i].y ?? 0) - Logger._ROW_HEIGHT;
        }

        this._dynamicRows.push(recycledRow);
        return recycledRow;
    }

    private _fillRow(row: UIContainer, parts: string[]): string[] | null {
        let x = 0;
        let lastPartIndex = -1;
        let widgetIndex = 0;
        const children = row.children;

        if (!children) return null;

        for (let i = 0; i < parts.length; ++i) {
            const isLastPart = i === parts.length - 1;

            if (this._rowLimitReached(x, parts[i], isLastPart)) {
                if (this._truncate) {
                    this._setPartText(row, children, widgetIndex++, '...', x, 3);
                    this._hideRemainingWidgets(children, widgetIndex);
                    return null;
                }

                this._hideRemainingWidgets(children, widgetIndex);

                return parts.slice(lastPartIndex + 1);
            }

            if (parts[i] === ' ') {
                x += 7; // Space won't be a character, but instead just an instruction for the next part to be offset by 7.
            } else {
                // Extra width of 3 for the last part (which likely does not have 4 characters).
                const partWidth = this._setPartText(row, children, widgetIndex++, parts[i], x, isLastPart ? 3 : 0);
                x += partWidth;
            }

            lastPartIndex = i;
        }

        this._hideRemainingWidgets(children, widgetIndex);
        return null;
    }

    private _rowLimitReached(x: number, part: string, isLastPart: boolean): boolean {
        const limit = this._width - Logger._PADDING * 2 - 3; // The row width minus the padding and 3 extra.

        // Max part width for 4 chars (4 * 14 = 56) + ellipsis width (12) + extra (3) = 71
        if (x + 71 <= limit) return false;

        const partWidth = this._getTextWidth(part);

        // The last part is too long.
        if (isLastPart && x + partWidth >= limit) return true;

        // The part plus the width of the ellipsis is too long.
        if (x + partWidth + 12 >= limit) return true;

        return false;
    }

    private _setPartText(
        row: UIContainer,
        children: readonly UI.Element[],
        index: number,
        part: string,
        x: number,
        extraWidth: number = 0
    ): number {
        const partWidth = this._getTextWidth(part) + extraWidth;

        if (index < children.length) {
            const textWidget = children[index] as UIText;
            textWidget.message = Logger._buildMessage(part);
            textWidget.x = x;
            textWidget.width = partWidth;
            textWidget.visible = true;
        } else {
            new UIText({
                x,
                y: 0,
                width: partWidth,
                height: Logger._ROW_HEIGHT,
                anchor: mod.UIAnchor.CenterLeft,
                parent: row,
                message: Logger._buildMessage(part),
                textSize: Logger._ROW_HEIGHT,
                textColor: this._textColor,
                textAnchor: mod.UIAnchor.CenterLeft,
            });
        }

        return partWidth;
    }

    private _hideRemainingWidgets(children: readonly UI.Element[], fromIndex: number): void {
        for (let i = fromIndex; i < children.length; ++i) {
            children[i].visible = false;
        }
    }

    private _getTextWidth(part: string): number {
        let totalTenths = 0;

        for (let i = 0; i < part.length; ++i) {
            const code = part.charCodeAt(i);
            totalTenths += code < 128 ? Logger._CHAR_WIDTHS_TENTHS[code] : 100;
        }

        return totalTenths / 10;
    }
}

export namespace Logger {
    /**
     * Options for the logger.
     */
    export interface Options {
        /**
         * Whether to use static rows (`true`) or dynamic rows (`false`).
         */
        staticRows?: boolean;
        /**
         * Whether to truncate long messages with ellipses.
         */
        truncate?: boolean;
        /**
         * The parent container for the logger.
         */
        parent?: UI.Parent;
        /**
         * The anchor for the logger.
         */
        anchor?: mod.UIAnchor;
        /**
         * The x position of the logger.
         */
        x?: number;
        /**
         * The y position of the logger.
         */
        y?: number;
        /**
         * The width of the logger.
         */
        width?: number;
        /**
         * The height of the logger.
         */
        height?: number;
        /**
         * The background color of the logger.
         */
        bgColor?: mod.Vector;
        /**
         * The background alpha of the logger.
         */
        bgAlpha?: number;
        /**
         * The background fill of the logger.
         */
        bgFill?: mod.UIBgFill;
        /**
         * The text color of the logger.
         */
        textColor?: mod.Vector;
        /**
         * Whether to show the logger.
         */
        visible?: boolean;
    }
}
