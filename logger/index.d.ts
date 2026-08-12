import { UI } from '../ui/index.ts';
export declare class Logger {
    /**
     * List of characters that cannot appear standalone in the strings file or as mod.Message arguments.
     */
    static readonly CENSORED_CHARS: readonly ['f', 'F'];
    /**
     * Supported non-ASCII UTF-8 characters that can be displayed by the logger.
     * These characters only appear as standalone string keys in the "chars" section
     * of the strings file to minimize file size and avoid combinatorial format templates.
     */
    static readonly EXOTIC_CHARS: readonly [
        '¿',
        '¡',
        '«',
        '»',
        '§',
        '¶',
        '©',
        '®',
        '™',
        'ª',
        'º',
        '¹',
        '²',
        '³',
        '⁴',
        '⁵',
        '⁶',
        '⁷',
        '⁸',
        '⁹',
        '‘',
        '’',
        '“',
        '”',
        '‚',
        '„',
        '‹',
        '›',
        '–',
        '—',
        '•',
        '…',
        '⁄',
        '†',
        '‡',
        '‰',
        '×',
        '÷',
        '±',
        '≠',
        '≈',
        '≤',
        '≥',
        'π',
        'Ω',
        'Δ',
        'µ',
        '√',
        '∞',
        '∑',
        '∏',
        '∫',
        '∂',
        '¬',
        '·',
        '¢',
        '£',
        '¥',
        '€',
        '◊',
        '●',
        '°',
        'ˆ',
        'ˇ',
        '˚',
        '¯',
    ];
    /**
     * Safe second characters that can be paired naturally with a censored character in the strings file.
     */
    static readonly SAFE_CENSORED_PAIRS: readonly [')', '/', ':', '=', '{', '|', '}'];
    private static readonly _CENSORED_SET;
    private static readonly _SAFE_PAIR_SET;
    private static readonly _EXOTIC_SET;
    private static readonly _ROW_HEIGHT;
    private static readonly _TEXT_SIZE;
    private static readonly _PADDING;
    private static readonly _CHAR_WIDTHS_TENTHS;
    private static readonly _EXOTIC_CHAR_WIDTHS_TENTHS;
    private static readonly _activeLoggers;
    private static readonly _onTickEnd;
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
    private _pendingStaticRows;
    private _dynamicRows;
    private _pendingDynamicQueue;
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
     * Clear the logger, deleting rendered rows and discarding pending unflushed logs.
     * @returns The logger instance.
     */
    clear(): Logger;
    /**
     * Deletes the logger.
     */
    delete(): void;
    /**
     * Log a message to the logger. Messages are batched and flushed to the UI at Events.OnTickEnd (priority 90).
     * In static mode, writes to `rowIndex` (default 0). In dynamic mode, appends to the log queue.
     * @param text - The text to log.
     * @param rowIndex - The row index to log the message to (if using static rows, default is 0).
     * @returns The logger instance.
     */
    log(text: string, rowIndex?: number): Logger;
    /**
     * Flushes all pending batched log entries immediately.
     * Normally called automatically at Events.OnTickEnd (priority 90).
     * @returns The logger instance.
     */
    flush(): Logger;
    private _flushDynamicQueue;
    private _logInRow;
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
        anchor?: UI.Anchor;
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
        bgColor?: UI.Color;
        /**
         * The background alpha of the logger.
         */
        bgAlpha?: number;
        /**
         * The background fill of the logger.
         */
        bgFill?: UI.BgFill;
        /**
         * The text color of the logger.
         */
        textColor?: UI.Color;
        /**
         * Whether to show the logger.
         */
        visible?: boolean;
    }
}
