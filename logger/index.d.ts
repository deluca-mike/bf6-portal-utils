import { UI } from '../ui/index.ts';
import { UIContainer } from '../ui/components/container/index.ts';
export declare class Logger {
    private static readonly _PADDING;
    private static _getParts;
    private static _getCharacterWidth;
    private static _buildMessage;
    private static _getChar;
    /**
     * Creates a new logger with specific options.
     * @param player - The player to to draw the logger for.
     * @param options - The options for the logger.
     * @param options.staticRows - Whether to use static rows (`true`) or dynamic rows (`false`).
     * @param options.truncate - Whether to truncate long messages with ellipses.
     * @param options.parent - The parent container for the logger.
     * @param options.anchor - The anchor for the logger.
     * @param options.x - The x position of the logger.
     * @param options.y - The y position of the logger.
     * @param options.width - The width of the logger.
     * @param options.height - The height of the logger.
     * @param options.bgColor - The background color of the logger.
     * @param options.bgAlpha - The background alpha of the logger.
     * @param options.bgFill - The background fill of the logger.
     * @param options.textColor - The text color of the logger.
     * @param options.textScale - The text scale of the logger.
     * @param options.visible - Whether to show the logger.
     */
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
    /**
     * Show the logger.
     * @returns The logger instance.
     */
    show(): Logger;
    /**
     * Hide the logger.
     * @returns The logger instance.
     */
    hide(): Logger;
    /**
     * Toggle the visibility of the logger.
     * @returns The logger instance.
     */
    toggle(): Logger;
    /**
     * Clear the logger.
     * @returns The logger instance.
     */
    clear(): Logger;
    /**
     * Destroy the logger.
     */
    destroy(): void;
    /**
     * Log a message to the logger asynchronously (non-blocking microtask).
     * @param text - The text to log.
     * @param rowIndex - The row index to log the message to (if using static rows, default is 0).
     * @returns The logger instance.
     */
    logAsync(text: string, rowIndex?: number): Promise<void>;
    /**
     * Log a message to the logger.
     * @param text - The text to log.
     * @param rowIndex - The row index to log the message to (if using static rows, default is 0).
     * @returns The logger instance.
     */
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
        parent?: UI.Root | UIContainer;
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
