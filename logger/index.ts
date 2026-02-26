import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
import { UIText } from '../ui/components/text/index.ts';

// version: 3.1.2
export class Logger {
    private static readonly _PADDING: number = 10;

    private static _getParts(text: string): string[] {
        return (text.match(/( |[^ ]{1,3})/g) ?? []) as string[];
    }

    private static _getCharacterWidth(char: string): number {
        if (['W', 'm', '@'].includes(char)) return 14;
        if (['['].includes(char)) return 13; // TODO: '[' is always prepended by a '\', so needs to be larger than ']'.
        if (['M', 'w'].includes(char)) return 12.5;
        if (['#', '?', '+'].includes(char)) return 12;
        if (['-', '='].includes(char)) return 11.5;
        if (['U', '$', '%', '&', '~'].includes(char)) return 11;
        if (['C', 'D', 'G', 'H', 'N', 'O', 'Q', 'S', '<', '>'].includes(char)) return 10.5;
        if (['0', '3', '6', '8', '9', 'A', 'B', 'V', 'X', '_'].includes(char)) return 10;
        if (['2', '4', '5', 'E', 'F', 'K', 'P', 'R', 'Y', 'Z', 'a', 'h', 's'].includes(char)) return 9.5;
        if (['7', 'b', 'c', 'd', 'e', 'g', 'n', 'o', 'p', 'q', 'u', '^', '*', '`'].includes(char)) return 9;
        if (['L', 'T', 'k', 'v', 'x', 'y', 'z'].includes(char)) return 8.5; // TODO: Maybe 'x' could be 8.
        if (['J', ']', '"', '\\', '/'].includes(char)) return 8;
        if (['1'].includes(char)) return 7.5;
        if ([' '].includes(char)) return 7;
        if (['r'].includes(char)) return 6.5; // TODO: Maybe 'r' should be 6.
        if (['f', '{', '}'].includes(char)) return 6; // TODO: Maybe 'f' should be 5.5.
        if (['t'].includes(char)) return 5.5;
        if (['(', ')', ','].includes(char)) return 5;
        if (["'", ';'].includes(char)) return 4.5;
        if (['!', 'I', '|', '.', ':'].includes(char)) return 4;
        if (['i', 'j', 'l'].includes(char)) return 3.5;

        return 10;
    }

    private static _buildMessage(part: string): mod.Message {
        if (part.length === 3) {
            return mod.Message(
                mod.stringkeys.logger.format[3],
                Logger._getChar(part[0]),
                Logger._getChar(part[1]),
                Logger._getChar(part[2])
            );
        }

        if (part.length === 2) {
            return mod.Message(mod.stringkeys.logger.format[2], Logger._getChar(part[0]), Logger._getChar(part[1]));
        }

        if (part.length === 1) {
            return mod.Message(mod.stringkeys.logger.format[1], Logger._getChar(part[0]));
        }

        return mod.Message(mod.stringkeys.logger.format.badFormat);
    }

    private static _getChar(char: string): string {
        return mod.stringkeys.logger.chars[char] ?? mod.stringkeys.logger.chars['*'];
    }

    /**
     * Creates a new logger with specific options.
     * @param player - The player to to draw the logger for.
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
        // this._scaleFactor = options?.textScale === 'small' ? 0.8 : options?.textScale === 'large' ? 1.2 : 1;
        this._scaleFactor = 1; // TODO: Implement fixes/corrections for part widths when scale factor is not 1.
        this._rowHeight = 20 * this._scaleFactor;
        this._maxRows = ~~((this._height - 2 * Logger._PADDING) / this._rowHeight); // round down to nearest integer
        this._nextRowIndex = this._maxRows - 1;
    }

    private _window: UIContainer;

    private _staticRows: boolean;

    private _truncate: boolean;

    private _rows: { [rowIndex: number]: UIContainer } = {};

    private _nextRowIndex: number;

    private _width: number;

    private _height: number;

    private _textColor: mod.Vector;

    private _scaleFactor: number;

    private _rowHeight: number;

    private _maxRows: number;

    public get maxRows(): number {
        return this._maxRows;
    }

    public get name(): string {
        return this._window.name;
    }

    public get visible(): boolean {
        return this._window.visible;
    }

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
        Object.keys(this._rows).forEach((key) => this._deleteRow(parseInt(key)));
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
        await Promise.resolve();

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
        if (rowIndex >= this._maxRows) return; // Actually, this should be an error.

        this._fillRow(this._createRow(rowIndex), Logger._getParts(text));
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

    private _fillRow(row: UIContainer, parts: string[]): string[] | null {
        let x = 0;
        let lastPartIndex = -1;

        for (let i = 0; i < parts.length; ++i) {
            const isLastPart = i === parts.length - 1;

            if (this._rowLimitReached(x, parts[i], isLastPart)) {
                if (this._truncate) {
                    this._createPartText(row, '...', x, 3);
                    return null;
                }

                return parts.slice(lastPartIndex + 1);
            }

            // Extra width of 3 for the last part (which likely does not have 3 characters).
            x += this._createPartText(row, parts[i], x, isLastPart ? 3 : 0);

            lastPartIndex = i;
        }

        return null;
    }

    private _rowLimitReached(x: number, part: string, isLastPart: boolean): boolean {
        const limit = this._width - Logger._PADDING * 2 - 3; // the row width minus the padding and 3 extra.

        // The early limit is the row width minus the padding, the width of the largest possible part and the width of the ellipsis.
        if (x + 57 <= limit) return false;

        // The last part is too long.
        if (isLastPart && x + this._getTextWidth(part) >= limit) return true;

        // The part plus the width of the ellipsis is too long.
        if (x + this._getTextWidth(part) + 12 >= limit) return true;

        return false;
    }

    private _prepareNextRow(): UIContainer {
        // _rows keys are always 0.._maxRows-1 (no gaps), so Object.values order matches key order and index === rowIndex.
        Object.values(this._rows).forEach((row, index) => {
            if (!row) return;

            if (row.y <= Logger._PADDING + 1) return this._deleteRow(index);

            row.y -= this._rowHeight;
        });

        const rowIndex = this._nextRowIndex;
        this._nextRowIndex = (rowIndex + 1) % this._maxRows;

        return this._createRow(rowIndex, Logger._PADDING + (this._maxRows - 1) * this._rowHeight);
    }

    private _createRow(rowIndex: number, y?: number): UIContainer {
        this._deleteRow(rowIndex);

        const row = new UIContainer({
            x: Logger._PADDING,
            y: y ?? Logger._PADDING + this._rowHeight * rowIndex,
            width: this._width - Logger._PADDING * 2,
            height: this._rowHeight,
            anchor: mod.UIAnchor.TopLeft,
            parent: this._window,
            bgFill: mod.UIBgFill.None,
        });

        this._rows[rowIndex] = row;

        return row;
    }

    private _deleteRow(rowIndex: number): void {
        this._rows[rowIndex]?.delete();
        delete this._rows[rowIndex];
    }

    private _createPartText(row: UIContainer, part: string, x: number, extraWidth: number = 0): number {
        if (part === ' ') return 7; // Space won't be a character, but instead just an instruction for the next part to be offset by 7.

        const partWidth = this._getTextWidth(part) + extraWidth;

        new UIText({
            x: x,
            y: 0,
            width: partWidth,
            height: this._rowHeight,
            anchor: mod.UIAnchor.CenterLeft,
            parent: row,
            message: Logger._buildMessage(part),
            textSize: this._rowHeight,
            textColor: this._textColor,
            textAnchor: mod.UIAnchor.CenterLeft,
        });

        return partWidth;
    }

    private _getTextWidth(part: string): number {
        return (
            this._scaleFactor *
            part.split('').reduce((accumulator, character) => accumulator + Logger._getCharacterWidth(character), 0)
        );
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
        parent?: UI.Root | UIContainer;
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
         * The text scale of the logger.
         */
        textScale?: 'small' | 'medium' | 'large';
        /**
         * Whether to show the logger.
         */
        visible?: boolean;
    }
}
