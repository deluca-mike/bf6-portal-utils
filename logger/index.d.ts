import { UI } from '../ui/index.ts';
export declare class Logger {
    private static readonly _ROW_HEIGHT;
    private static readonly _PADDING;
    private static readonly _STATIC_PROMISE;
    private static readonly _CHAR_WIDTHS_TENTHS;
    private static _getParts;
    private static _buildMessage;
    private static _getChar;
    /**
     * Creates a new logger with specific options.
     * @param player - The player to draw the logger for.
     * @param options - The options for the logger.
     */
    constructor(player: mod.Player, options?: Logger.Options);
    private _window;
    private _staticRows;
    private _truncate;
    private _staticRowsList;
    private _dynamicRows;
    private _width;
    private _height;
    private _textColor;
    private _maxRows;
    /**
     * The maximum number of rows in the logger.
     * @returns The maximum row count.
     */
    get maxRows(): number;
    /**
     * Whether the logger window is visible.
     * @returns True if visible, false otherwise.
     */
    get visible(): boolean;
    /**
     * Sets whether the logger window is visible.
     * @param visible - The new visibility state.
     */
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
    private _prepareNextRow;
    private _fillRow;
    private _rowLimitReached;
    private _setPartText;
    private _hideRemainingWidgets;
    private _getTextWidth;
}
export declare namespace Logger {
    /**
     * Options for the logger.
     */
    interface Options {
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
