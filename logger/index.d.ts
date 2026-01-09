import { UI } from '../ui/index.ts';
export declare class Logger {
    private static readonly _PADDING;
    private static _getParts;
    private static _getCharacterWidth;
    private static _buildMessage;
    private static _getChar;
    constructor(player: mod.Player, options?: Logger.Options);
    private _window;
    private _staticRows;
    private _truncate;
    private _rows;
    private _nextRowIndex;
    private _width;
    private _height;
    private _textColor;
    private _scaleFactor;
    private _rowHeight;
    private _maxRows;
    get maxRows(): number;
    get name(): string;
    get visible(): boolean;
    set visible(visible: boolean);
    show(): Logger;
    hide(): Logger;
    toggle(): Logger;
    clear(): Logger;
    destroy(): void;
    logAsync(text: string, rowIndex?: number): Promise<void>;
    log(text: string, rowIndex?: number): Logger;
    private _logInRow;
    private _logNext;
    private _logNextParts;
    private _fillRow;
    private _rowLimitReached;
    private _prepareNextRow;
    private _createRow;
    private _deleteRow;
    private _createPartText;
    private _getTextWidth;
}
export declare namespace Logger {
    interface Options {
        staticRows?: boolean;
        truncate?: boolean;
        parent?: UI.Root | UI.Container;
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
