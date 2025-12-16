import { UI } from '../ui';

// version: 2.0.0
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
        if (part.length === 3)
            return mod.Message(
                mod.stringkeys.logger.format[3],
                Logger._getChar(part[0]),
                Logger._getChar(part[1]),
                Logger._getChar(part[2])
            );

        if (part.length === 2)
            return mod.Message(mod.stringkeys.logger.format[2], Logger._getChar(part[0]), Logger._getChar(part[1]));

        if (part.length === 1) return mod.Message(mod.stringkeys.logger.format[1], Logger._getChar(part[0]));

        return mod.Message(mod.stringkeys.logger.format.badFormat);
    }

    private static _getChar(char: string): string {
        return mod.stringkeys.logger.chars[char] ?? mod.stringkeys.logger.chars['*'];
    }

    constructor(player: mod.Player, options?: Logger.Options) {
        this._width = options?.width ?? 400;
        this._height = options?.height ?? 300;
        this._textColor = options?.textColor ?? UI.COLORS.BF_GREEN_BRIGHT;

        this._window = new UI.Container(
            {
                x: options?.x ?? 10,
                y: options?.y ?? 10,
                width: this._width,
                height: this._height,
                parent: options?.parent,
                anchor: options?.anchor ?? mod.UIAnchor.TopLeft,
                bgColor: options?.bgColor ?? UI.COLORS.BF_GREY_4,
                bgAlpha: options?.bgAlpha ?? 0.5,
                bgFill: options?.bgFill ?? mod.UIBgFill.Blur,
                padding: Logger._PADDING,
                visible: options?.visible ?? false,
            },
            player
        );

        this._staticRows = options?.staticRows ?? false;
        this._truncate = this._staticRows || (options?.truncate ?? false);
        // this._scaleFactor = options?.textScale === 'small' ? 0.8 : options?.textScale === 'large' ? 1.2 : 1;
        this._scaleFactor = 1; // TODO: Implement fixes/corrections for part widths when scale factor is not 1.
        this._rowHeight = 20 * this._scaleFactor;
        this._maxRows = ~~((this._height - Logger._PADDING) / this._rowHeight); // round down to nearest integer
        this._nextRowIndex = this._maxRows - 1;
    }

    private _window: UI.Container;

    private _staticRows: boolean;

    private _truncate: boolean;

    private _rows: { [rowIndex: number]: UI.Container } = {};

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

    public show(): Logger {
        this._window.show();
        return this;
    }

    public hide(): Logger {
        this._window.hide();
        return this;
    }

    public toggle(): Logger {
        this._window.visible = !this._window.visible;
        return this;
    }

    public clear(): Logger {
        Object.keys(this._rows).forEach((key) => this._deleteRow(parseInt(key)));
        return this;
    }

    public destroy(): void {
        this.clear();
        this._window.delete();
    }

    public log(text: string, rowIndex?: number): Logger {
        this._staticRows ? this._logInRow(text, rowIndex ?? 0) : this._logNext(text);
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
        const remaining = this._fillRow(this._prepareNextRow(), parts);

        if (!remaining) return;

        this._logNextParts(remaining);
    }

    private _fillRow(row: UI.Container, parts: string[]): string[] | null {
        let x = 0;
        let lastPartIndex = -1;

        for (let i = 0; i < parts.length; ++i) {
            const isLastPart = i === parts.length - 1;

            if (this._rowLimitReached(x, parts[i], isLastPart)) {
                if (this._truncate) {
                    this.createPartText(row, '...', x, 3);
                    return null;
                }

                return parts.slice(lastPartIndex + 1);
            }

            // Extra width of 3 for the last part (which likely does not have 3 characters).
            x += this.createPartText(row, parts[i], x, isLastPart ? 3 : 0);

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

    private _prepareNextRow(): UI.Container {
        const rowIndex = this._nextRowIndex;
        const row = this._createRow(rowIndex, (this._maxRows - 1) * this._rowHeight);

        this._nextRowIndex = (rowIndex + 1) % this._maxRows;

        Object.values(this._rows).forEach((row, index) => {
            if (!row) return;

            const { y } = row.position;

            if (y <= 1) return this._deleteRow(index);

            row.position = { x: 0, y: y - this._rowHeight };
        });

        return row;
    }

    private _createRow(rowIndex: number, y?: number): UI.Container {
        this._deleteRow(rowIndex);

        const row = new UI.Container({
            x: 0,
            y: y ?? this._rowHeight * rowIndex,
            width: this._width - Logger._PADDING * 2,
            height: this._rowHeight,
            anchor: mod.UIAnchor.TopLeft,
            parent: this._window.uiWidget,
            bgFill: mod.UIBgFill.None,
        });

        this._rows[rowIndex] = row;

        return row;
    }

    private _deleteRow(rowIndex: number): void {
        this._rows[rowIndex]?.delete();
        delete this._rows[rowIndex];
    }

    private createPartText(row: UI.Container, part: string, x: number, extraWidth: number = 0): number {
        if (part === ' ') return 7; // Space won't be a character, but instead just an instruction for the next part to be offset by 7.

        const partWidth = this._getTextWidth(part) + extraWidth;

        new UI.Text({
            x: x,
            y: 0,
            width: partWidth,
            height: this._rowHeight,
            anchor: mod.UIAnchor.CenterLeft,
            parent: row.uiWidget,
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
    export interface Options {
        staticRows?: boolean;
        truncate?: boolean;
        parent?: mod.UIWidget | UI.Node;
        anchor?: mod.UIAnchor;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        textColor?: mod.Vector;
        textScale?: 'small' | 'medium' | 'large';
        visible?: boolean;
    }
}
