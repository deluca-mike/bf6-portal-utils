import { CallbackHandler } from '../callback-handler/index.ts';
import { Colors } from '../colors/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 10.0.0
export namespace UI {
    /**
     * A transparent 3-channel RGB color.
     */
    export type Color = Colors.Color;
    /****** Logging ******/

    const logging = new Logging('UI');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to attempt to append a string form of the error to
     * the text of the log message.
     * @param log - The logger function: `(formattedText, error?) => void | Promise<void>`. `error` is the same value
     *              passed to `log()` (if any), for inspection (e.g. `instanceof Error`, `stack`). `formattedText` may
     *              also include ` - Error: …` when `includeRawError` is true.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - When true and `log()` receives an error, attempts to append a string form of the error
     *                          to the text of the log message.
     */
    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /****** Constants & Limits ******/

    const ROOT_NODE_ID = 0;
    const INVALID_INDEX = -1;
    const GENERATION_MULTIPLIER = 10000;
    const MAX_GENERATION = 65535;

    /**
     * Maximum number of UI elements supported simultaneously.
     */
    export const MAX_ELEMENTS = 2048;

    /**
     * Retrieves the number of currently active UI elements.
     * @returns The active element count.
     */
    export function getActiveElementCount(): number {
        return _activeElementCount;
    }

    // Bitflags and bitfield shifts/masks for _flags (Uint16Array)
    const FLAG_IN_USE = 1 << 0; // 0x0001
    const FLAG_VISIBLE = 1 << 1; // 0x0002
    const FLAG_HAS_INPUT_MODE = 1 << 2; // 0x0004
    const FLAG_UI_INPUT_MODE_WHEN_VISIBLE = 1 << 3; // 0x0008
    const DEPTH_SHIFT = 4;
    const DEPTH_MASK = 0x1; // 1 bit (0: AboveGameUI, 1: BelowGameUI)
    const BG_FILL_SHIFT = 5;
    const BG_FILL_MASK = 0xf; // 4 bits (0..8)
    const ANCHOR_SHIFT = 9;
    const ANCHOR_MASK = 0xf; // 4 bits (0..8)

    const RECEIVER_GLOBAL = 164;
    const RECEIVER_TEAM_OFFSET = 100;

    /****** SoA Buffers ******/

    const _flags = new Uint16Array(MAX_ELEMENTS);
    const _generations = new Uint16Array(MAX_ELEMENTS);
    const _parents = new Int16Array(MAX_ELEMENTS);
    const _firstChild = new Int16Array(MAX_ELEMENTS);
    const _nextSibling = new Int16Array(MAX_ELEMENTS);

    const _x = new Float32Array(MAX_ELEMENTS);
    const _y = new Float32Array(MAX_ELEMENTS);
    const _width = new Float32Array(MAX_ELEMENTS);
    const _height = new Float32Array(MAX_ELEMENTS);
    const _bgRgba = new Uint32Array(MAX_ELEMENTS);
    const _foregroundRgba = new Uint32Array(MAX_ELEMENTS);

    const _nativeWidgets = new Array<mod.UIWidget | null>(MAX_ELEMENTS);
    const _instances = new Array<Element | null>(MAX_ELEMENTS);

    /**
     * Target receiver IDs per UI element slot:
     * - 0..99: Player receiver (player object ID 0..99)
     * - 100..163: Team receiver (team object ID 0..63, offset by +100)
     * - 164: Global receiver (all players and teams)
     *
     * NOTE: Currently allocated as a dedicated Uint8Array to save memory over a Uint32Array
     * _flags. If more element flags are added in the future and _flags is expanded from
     * Uint16Array to Uint32Array, these 8 bits can be packed directly into 8 unused bits of
     * _flags to save an additional 2 KB.
     */
    const _receiverIds = new Uint8Array(MAX_ELEMENTS);

    // Intrusive free-list initialization for elements (array slots 0..MAX_ELEMENTS-1)
    for (let i = 0; i < MAX_ELEMENTS - 1; ++i) {
        _nextSibling[i] = i + 1;
    }
    _nextSibling[MAX_ELEMENTS - 1] = INVALID_INDEX;

    _parents.fill(INVALID_INDEX);
    _firstChild.fill(INVALID_INDEX);
    _nativeWidgets.fill(null);
    _receiverIds.fill(RECEIVER_GLOBAL);
    _instances.fill(null);

    let _firstFree = 0;
    let _firstRoot = INVALID_INDEX;
    let _activeElementCount = 0;

    let _rootNativeWidget: mod.UIWidget | null = null;

    function _getRootNativeWidget(): mod.UIWidget {
        if (!_rootNativeWidget) {
            _rootNativeWidget = mod.GetUIRoot();
        }

        return _rootNativeWidget;
    }

    /****** Flag & Bit Helper Functions ******/

    function _hasFlag(slot: number, flag: number): boolean {
        return (_flags[slot] & flag) !== 0;
    }

    function _setFlag(slot: number, flag: number): void {
        _flags[slot] |= flag;
    }

    function _clearFlag(slot: number, flag: number): void {
        _flags[slot] &= ~flag;
    }

    function _isInUse(slot: number): boolean {
        return _hasFlag(slot, FLAG_IN_USE);
    }

    function _isVisible(slot: number): boolean {
        return _hasFlag(slot, FLAG_VISIBLE);
    }

    function _hasInputMode(slot: number): boolean {
        return _hasFlag(slot, FLAG_HAS_INPUT_MODE);
    }

    function _isUIInputModeWhenVisible(slot: number): boolean {
        return _hasFlag(slot, FLAG_UI_INPUT_MODE_WHEN_VISIBLE);
    }

    const _NATIVE_ANCHORS: readonly mod.UIAnchor[] = [
        mod.UIAnchor.TopLeft,
        mod.UIAnchor.TopCenter,
        mod.UIAnchor.TopRight,
        mod.UIAnchor.CenterLeft,
        mod.UIAnchor.Center,
        mod.UIAnchor.CenterRight,
        mod.UIAnchor.BottomLeft,
        mod.UIAnchor.BottomCenter,
        mod.UIAnchor.BottomRight,
    ];

    const _NATIVE_BG_FILLS: readonly mod.UIBgFill[] = [
        mod.UIBgFill.None,
        mod.UIBgFill.Solid,
        mod.UIBgFill.Blur,
        mod.UIBgFill.GradientBottom,
        mod.UIBgFill.GradientLeft,
        mod.UIBgFill.GradientRight,
        mod.UIBgFill.GradientTop,
        mod.UIBgFill.OutlineThick,
        mod.UIBgFill.OutlineThin,
    ];

    const _NATIVE_DEPTHS: readonly mod.UIDepth[] = [mod.UIDepth.AboveGameUI, mod.UIDepth.BelowGameUI];

    const _NATIVE_IMAGE_TYPES: readonly mod.UIImageType[] = [
        mod.UIImageType.None,
        mod.UIImageType.CrownOutline,
        mod.UIImageType.CrownSolid,
        mod.UIImageType.QuestionMark,
        mod.UIImageType.RifleAmmo,
        mod.UIImageType.SelfHeal,
        mod.UIImageType.SpawnBeacon,
        mod.UIImageType.TEMP_PortalIcon,
    ];

    function _setAnchor(slot: number, anchor: Anchor): void {
        _flags[slot] = (_flags[slot] & ~(ANCHOR_MASK << ANCHOR_SHIFT)) | ((anchor & ANCHOR_MASK) << ANCHOR_SHIFT);
    }

    function _getAnchor(slot: number): Anchor {
        return ((_flags[slot] >>> ANCHOR_SHIFT) & ANCHOR_MASK) as Anchor;
    }

    function _setBgFill(slot: number, fill: BgFill): void {
        _flags[slot] = (_flags[slot] & ~(BG_FILL_MASK << BG_FILL_SHIFT)) | ((fill & BG_FILL_MASK) << BG_FILL_SHIFT);
    }

    function _getBgFill(slot: number): BgFill {
        return ((_flags[slot] >>> BG_FILL_SHIFT) & BG_FILL_MASK) as BgFill;
    }

    function _setDepth(slot: number, depth: Depth): void {
        _flags[slot] = (_flags[slot] & ~(DEPTH_MASK << DEPTH_SHIFT)) | ((depth & DEPTH_MASK) << DEPTH_SHIFT);
    }

    function _getDepth(slot: number): Depth {
        return ((_flags[slot] >>> DEPTH_SHIFT) & DEPTH_MASK) as Depth;
    }

    function _setBgColor(slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = _bgRgba[slot] & 0xff;
        _bgRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    function _setBgAlpha(slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        _bgRgba[slot] = (_bgRgba[slot] & ~0xff) | aInt;
    }

    function _getBgColor(slot: number, out?: Colors.Color): Colors.Color {
        const rgba = _bgRgba[slot];
        const r = (rgba >>> 24) / 255;
        const g = ((rgba >>> 16) & 0xff) / 255;
        const b = ((rgba >>> 8) & 0xff) / 255;

        if (out) {
            out.r = r;
            out.g = g;
            out.b = b;
            return out;
        }

        return { r, g, b };
    }

    function _getBgAlpha(slot: number): number {
        return (_bgRgba[slot] & 0xff) / 255;
    }

    function _setForegroundColor(slot: number, color: Colors.Color): void {
        const rInt = Math.min(Math.max(Math.round(color.r * 255), 0), 255);
        const gInt = Math.min(Math.max(Math.round(color.g * 255), 0), 255);
        const bInt = Math.min(Math.max(Math.round(color.b * 255), 0), 255);
        const aInt = _foregroundRgba[slot] & 0xff;
        _foregroundRgba[slot] = (rInt << 24) | (gInt << 16) | (bInt << 8) | aInt;
    }

    function _setForegroundAlpha(slot: number, alpha: number): void {
        const aInt = Math.min(Math.max(Math.round(alpha * 255), 0), 255);
        _foregroundRgba[slot] = (_foregroundRgba[slot] & ~0xff) | aInt;
    }

    function _getForegroundColor(slot: number, out?: Colors.Color): Colors.Color {
        const rgba = _foregroundRgba[slot];
        const r = (rgba >>> 24) / 255;
        const g = ((rgba >>> 16) & 0xff) / 255;
        const b = ((rgba >>> 8) & 0xff) / 255;

        if (out) {
            out.r = r;
            out.g = g;
            out.b = b;
            return out;
        }

        return { r, g, b };
    }

    function _getForegroundAlpha(slot: number): number {
        return (_foregroundRgba[slot] & 0xff) / 255;
    }

    /**
     * Encodes an internal array index and its current generation into a public node ID.
     * 1-based offset ensures slot 0 with generation 0 starts at ID 1, preserving ROOT_NODE_ID = 0.
     * @param slot - The internal array index.
     * @returns The encoded public node ID.
     */
    function _encodeId(slot: number): number {
        return slot + 1 + GENERATION_MULTIPLIER * _generations[slot];
    }

    /**
     * Resolves a public generation-encoded node ID to its internal array index.
     * @param id - The public generation-encoded node ID.
     * @returns The internal array index, or INVALID_INDEX if invalid, generation-mismatched, or inactive.
     */
    function _resolveSlot(id: number): number {
        if (id <= 0) return INVALID_INDEX;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_ELEMENTS) return INVALID_INDEX;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);

        if (_generations[slot] !== idGen || !_isInUse(slot)) return INVALID_INDEX;

        return slot;
    }

    /**
     * Resolves a public generation-encoded node ID to its internal array index, and logs a warning if it is deleted.
     * @param id - The public generation-encoded node ID.
     * @returns The internal array index, or INVALID_INDEX if invalid, generation-mismatched, or inactive.
     */
    function _resolveSlotAndLogWarning(id: number): number {
        if (id <= 0) return INVALID_INDEX;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_ELEMENTS) return INVALID_INDEX;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);
        const gen = _generations[slot];

        if (idGen < gen) {
            logging.log('Element is deleted', LogLevel.Warning);
            return INVALID_INDEX;
        }

        if (gen !== idGen || !_isInUse(slot)) return INVALID_INDEX;

        return slot;
    }

    function isDeleted(id: number): boolean | undefined {
        if (id === ROOT_NODE_ID) return false;

        if (id <= 0) return undefined;

        const slot = (id % GENERATION_MULTIPLIER) - 1;

        if (slot < 0 || slot >= MAX_ELEMENTS) return undefined;

        const idGen = Math.floor(id / GENERATION_MULTIPLIER);
        const gen = _generations[slot];

        if (idGen > gen) return undefined;

        if (idGen < gen) return true;

        return _isInUse(slot) ? false : undefined;
    }

    function isValid(id: number): boolean {
        return id === ROOT_NODE_ID || _resolveSlot(id) !== INVALID_INDEX;
    }

    /****** Internal SoA Slot Allocators & Hierarchy Helpers ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('Element pool is full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        _firstFree = _nextSibling[slot];
        _nextSibling[slot] = INVALID_INDEX;
        _firstChild[slot] = INVALID_INDEX;
        _parents[slot] = INVALID_INDEX;
        _flags[slot] = FLAG_IN_USE;

        _activeElementCount++;

        return slot;
    }

    function _freeSlot(slot: number): void {
        _flags[slot] = 0;
        _bgRgba[slot] = 0;
        _foregroundRgba[slot] = 0;
        _nativeWidgets[slot] = null;
        _receiverIds[slot] = RECEIVER_GLOBAL;
        _instances[slot] = null;
        _parents[slot] = INVALID_INDEX;
        _firstChild[slot] = INVALID_INDEX;
        _x[slot] = 0;
        _y[slot] = 0;
        _width[slot] = 0;
        _height[slot] = 0;

        _activeElementCount--;

        if (_generations[slot] < MAX_GENERATION) {
            _generations[slot]++;
            _nextSibling[slot] = _firstFree;
            _firstFree = slot;
        } else if (logging.willLog(LogLevel.Warning)) {
            logging.log(`Slot ${slot} exhausted max generations and was retired`, LogLevel.Warning);
        }
    }

    function _attachChild(parentSlot: number, childSlot: number): void {
        _parents[childSlot] = parentSlot;

        if (parentSlot === INVALID_INDEX) {
            _nextSibling[childSlot] = _firstRoot;
            _firstRoot = childSlot;

            return;
        }

        _nextSibling[childSlot] = _firstChild[parentSlot];
        _firstChild[parentSlot] = childSlot;
    }

    function _detachChild(parentSlot: number, childSlot: number): void {
        const head = parentSlot === INVALID_INDEX ? _firstRoot : _firstChild[parentSlot];

        if (head === childSlot) {
            if (parentSlot === INVALID_INDEX) {
                _firstRoot = _nextSibling[childSlot];
            } else {
                _firstChild[parentSlot] = _nextSibling[childSlot];
            }
        } else {
            let curr = head;

            while (curr !== INVALID_INDEX && _nextSibling[curr] !== childSlot) {
                curr = _nextSibling[curr];
            }

            if (curr !== INVALID_INDEX) {
                _nextSibling[curr] = _nextSibling[childSlot];
            }
        }

        _parents[childSlot] = INVALID_INDEX;
        _nextSibling[childSlot] = INVALID_INDEX;
    }

    function _resolveNodeSlotAndLogWarning(target?: Parent | number | null): number {
        if (!target) return INVALID_INDEX;

        const id = typeof target === 'number' ? target : Node._getId(target);

        return id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlotAndLogWarning(id);
    }

    function _resolveNodeSlot(target?: Parent | number | null): number {
        if (!target) return INVALID_INDEX;

        const id = typeof target === 'number' ? target : Node._getId(target);

        return id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlot(id);
    }

    function isTeam(receiver?: mod.Player | mod.Team): receiver is mod.Team {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Team);
    }

    function isPlayer(receiver?: mod.Player | mod.Team): receiver is mod.Player {
        return receiver !== undefined && mod.IsType(receiver, mod.Types.Player);
    }

    /****** Enums ******/

    /**
     * Anchor alignment positions for UI elements.
     */
    export enum Anchor {
        TopLeft = 0,
        TopCenter = 1,
        TopRight = 2,
        CenterLeft = 3,
        Center = 4,
        CenterRight = 5,
        BottomLeft = 6,
        BottomCenter = 7,
        BottomRight = 8,
    }

    /**
     * Background fill styles for UI elements.
     */
    export enum BgFill {
        None = 0,
        Solid = 1,
        Blur = 2,
        GradientBottom = 3,
        GradientLeft = 4,
        GradientRight = 5,
        GradientTop = 6,
        OutlineThick = 7,
        OutlineThin = 8,
    }

    /**
     * Z-order rendering depth for UI elements.
     */
    export enum Depth {
        AboveGameUI = 0,
        BelowGameUI = 1,
    }

    /**
     * Available image glyph / icon types.
     */
    export enum ImageType {
        None = 0,
        CrownOutline = 1,
        CrownSolid = 2,
        QuestionMark = 3,
        RifleAmmo = 4,
        SelfHeal = 5,
        SpawnBeacon = 6,
        TEMP_PortalIcon = 7,
    }

    /****** Types ******/

    /**
     * The type of a button handler.
     */
    export type ButtonHandler = (player: mod.Player) => Promise<void> | void;

    /**
     * The parent of an element.
     */
    export interface Parent extends Node {
        readonly receiver: mod.Player | mod.Team | null | undefined;
        readonly parent: Parent | null | undefined;
        readonly children: readonly Element[] | undefined;
        readonly childCount: number | undefined;
        getChild(index: number): Element | null | undefined;
        forEachChild(callback: (child: Element, index: number) => void): void;
    }

    type BaseParams = {
        anchor?: Anchor;
        parent?: Parent;
        visible?: boolean;
        bgColor?: Colors.Color;
        bgAlpha?: number;
        bgFill?: BgFill;
        depth?: Depth;
        receiver?: mod.Player | mod.Team;
        uiInputModeWhenVisible?: boolean;
    };

    /**
     * The size of an element.
     */
    export type Size = {
        width: number;
        height: number;
    };

    /**
     * The position of an element.
     */
    export type Position = {
        x: number;
        y: number;
    };

    // EitherPosition type is used to allow either position or x/y.
    type EitherPosition =
        | ({ position?: Position } & { x?: never; y?: never })
        | ({ x?: number; y?: number } & { position?: never });

    // EitherSize type is used to allow either size or width/height.
    type EitherSize =
        | ({ size?: Size } & { width?: never; height?: never })
        | ({ width?: number; height?: number } & { size?: never });

    /**
     * The parameters for a base element.
     */
    export type ElementParams = BaseParams & EitherPosition & EitherSize;

    /****** Classes ******/

    abstract class Receiver<T extends mod.Player | mod.Team | undefined> {
        protected _nativeReceiver: T;

        protected _inputModeRequesterCount: number = 0;

        protected constructor(receiver: T) {
            this._nativeReceiver = receiver;
        }

        /**
         * The native receiver of the receiver. This is the actual player or team object, not the receiver object.
         * @returns The native receiver.
         */
        public get nativeReceiver(): T {
            return this._nativeReceiver;
        }

        /**
         * Whether input mode is requested for this receiver.
         * @returns True if input mode is requested, false otherwise.
         */
        public get isInputModeRequested(): boolean {
            return this._inputModeRequesterCount > 0;
        }

        /**
         * Increments the input mode requester count and enables input mode if transitioning from 0 to 1.
         */
        public addInputModeRequester(): void {
            if (++this._inputModeRequesterCount !== 1) return;

            if (this._nativeReceiver) {
                mod.EnableUIInputMode(true, this._nativeReceiver);
            } else {
                mod.EnableUIInputMode(true);
            }
        }

        /**
         * Decrements the input mode requester count and disables input mode if transitioning from 1 to 0.
         */
        public removeInputModeRequester(): void {
            if (this._inputModeRequesterCount <= 0 || --this._inputModeRequesterCount !== 0) return;

            if (this._nativeReceiver) {
                mod.EnableUIInputMode(false, this._nativeReceiver);
            } else {
                mod.EnableUIInputMode(false);
            }
        }
    }

    /**
     * The global receiver. This is the receiver for all players and teams.
     */
    class GlobalReceiver extends Receiver<undefined> {
        public constructor() {
            super(undefined);
        }
    }

    const _globalReceiver = new GlobalReceiver();

    /**
     * The team receiver. This is the receiver for a single team.
     */
    class TeamReceiver extends Receiver<mod.Team> {
        private static readonly _instances = new Array<TeamReceiver | null>(64).fill(null);

        private constructor(receiver: mod.Team) {
            super(receiver);
        }

        /**
         * Gets or creates the instance of the team receiver for a given team.
         * @param receiver - The team to get the instance for.
         * @returns The instance of the team receiver.
         */
        public static getInstance(receiver: mod.Team): TeamReceiver {
            const id = mod.GetObjId(receiver);
            const existing = TeamReceiver._instances[id];

            if (existing && mod.Equals(existing.nativeReceiver, receiver)) return existing;

            return (TeamReceiver._instances[id] = new TeamReceiver(receiver));
        }

        /**
         * Clears the cached receiver for a given team ID.
         * @param id - The team object ID.
         */
        public static clear(id: number): void {
            TeamReceiver._instances[id] = null;
        }

        /**
         * Retrieves the cached receiver for a given team ID if it exists.
         * @param id - The team object ID.
         * @returns The cached team receiver instance or null.
         */
        public static getById(id: number): TeamReceiver | null {
            return TeamReceiver._instances[id] ?? null;
        }
    }

    /**
     * The player receiver. This is the receiver for a single player.
     */
    class PlayerReceiver extends Receiver<mod.Player> {
        private static readonly _instances = new Array<PlayerReceiver | null>(100).fill(null);

        private constructor(receiver: mod.Player) {
            super(receiver);
        }

        /**
         * Gets or creates the instance of the player receiver for a given player.
         * @param receiver - The player to get the instance for.
         * @returns The instance of the player receiver.
         */
        public static getInstance(receiver: mod.Player): PlayerReceiver {
            const id = mod.GetObjId(receiver);
            const existing = PlayerReceiver._instances[id];

            if (existing && mod.Equals(existing.nativeReceiver, receiver)) return existing;

            return (PlayerReceiver._instances[id] = new PlayerReceiver(receiver));
        }

        /**
         * Clears the cached receiver for a given player ID.
         * @param id - The player object ID.
         */
        public static clear(id: number): void {
            PlayerReceiver._instances[id] = null;
        }

        /**
         * Retrieves the cached receiver for a given player ID if it exists.
         * @param id - The player object ID.
         * @returns The cached player receiver instance or null.
         */
        public static getById(id: number): PlayerReceiver | null {
            return PlayerReceiver._instances[id] ?? null;
        }
    }

    function _getReceiver(slot: number): Receiver<mod.Player | mod.Team | undefined> {
        const id = _receiverIds[slot];

        if (id === RECEIVER_GLOBAL) return _globalReceiver;

        if (id >= RECEIVER_TEAM_OFFSET) return TeamReceiver.getById(id - RECEIVER_TEAM_OFFSET) ?? _globalReceiver;

        return PlayerReceiver.getById(id) ?? _globalReceiver;
    }

    function _encodeReceiver(receiver: Receiver<mod.Player | mod.Team | undefined>): number {
        if (receiver instanceof PlayerReceiver) return mod.GetObjId(receiver.nativeReceiver);

        if (receiver instanceof TeamReceiver) return RECEIVER_TEAM_OFFSET + mod.GetObjId(receiver.nativeReceiver);

        return RECEIVER_GLOBAL;
    }

    /**
     * The base node class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Node {
        protected static readonly _ROOT_NODE_ID = ROOT_NODE_ID;

        protected static readonly _INVALID_INDEX = INVALID_INDEX;

        protected static readonly _logging: Logging = logging; // Every node subclass has access to the singleton UI logging instance.

        protected _id: number;

        /**
         * The constructor for a node.
         * @param id - The internal widget ID.
         */
        public constructor(id: number) {
            this._id = id;
        }

        /**
         * Internal static helper to read a Node's ID with zero casting.
         * @param node - The node to get the ID for.
         * @returns The node ID.
         */
        public static _getId(node: Node): number {
            return node._id;
        }

        /**
         * The public generation-encoded node ID.
         * @returns The node ID.
         */
        public get id(): number {
            return this._id;
        }

        /**
         * Checks whether this node is currently active and alive.
         * @returns True if the node is alive, false otherwise.
         */
        public get isValid(): boolean {
            return isValid(this._id);
        }

        /**
         * Checks whether this node has been deleted.
         * @returns True if deleted, false if active, or undefined if invalid.
         */
        public get isDeleted(): boolean | undefined {
            return isDeleted(this._id);
        }

        /**
         * The underlying native Battlefield Portal UIWidget handle for this node.
         * @returns The native UIWidget handle.
         */
        protected get _uiWidget(): mod.UIWidget {
            if (this._id === ROOT_NODE_ID) return _getRootNativeWidget();

            const slot = _resolveSlot(this._id);

            return (slot !== INVALID_INDEX ? _nativeWidgets[slot] : undefined)!;
        }

        /**
         * The target audience receiver for the node (player or team, null if global, undefined if deleted).
         * @returns The native receiver, null, or undefined.
         */
        public get receiver(): mod.Player | mod.Team | null | undefined {
            if (this._id === ROOT_NODE_ID) return null;

            const slot = _resolveSlot(this._id);

            if (slot === INVALID_INDEX) return undefined;

            return _getReceiver(slot).nativeReceiver ?? null;
        }
    }

    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        public constructor() {
            super(ROOT_NODE_ID);
        }

        /**
         * @inheritdoc
         * @returns The root UI widget.
         */
        protected override get _uiWidget(): mod.UIWidget {
            return _getRootNativeWidget();
        }

        /**
         * @inheritdoc
         * @returns null.
         */
        public override get receiver(): null {
            return null;
        }

        /**
         * The parent of the root node is null.
         * @returns null.
         */
        public get parent(): null {
            return null;
        }

        /**
         * Returns a snapshot array of direct child elements.
         * @returns Array of direct children.
         */
        public get children(): readonly Element[] {
            const list: Element[] = [];
            let curr = _firstRoot;

            while (curr !== INVALID_INDEX) {
                const inst = _instances[curr];

                if (inst) {
                    list.push(inst);
                }

                curr = _nextSibling[curr];
            }

            return list;
        }

        /**
         * Retrieves a child element at the specified index.
         * @param index - Zero-based index of the child.
         * @returns The child element, or null if out of bounds.
         */
        public getChild(index: number): Element | null {
            if (index < 0) return null;

            let curr = _firstRoot;
            let idx = 0;

            while (curr !== INVALID_INDEX) {
                if (idx === index) return _instances[curr] ?? null;

                curr = _nextSibling[curr];
                idx++;
            }

            return null;
        }

        /**
         * The total direct child count of the root node.
         * @returns The number of direct children.
         */
        public get childCount(): number {
            let count = 0;
            let curr = _firstRoot;

            while (curr !== INVALID_INDEX) {
                count++;
                curr = _nextSibling[curr];
            }

            return count;
        }

        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        public forEachChild(callback: (child: Element, index: number) => void): void {
            let curr = _firstRoot;
            let idx = 0;

            while (curr !== INVALID_INDEX) {
                const next = _nextSibling[curr];
                const inst = _instances[curr];

                if (inst) {
                    CallbackHandler.invoke(callback, inst, idx++, undefined, undefined, logging, 'forEachChild');
                }

                curr = next;
            }
        }
    }

    /**
     * The root node. This is the root of the UI tree and the default parent for all elements.
     */
    export const ROOT_NODE: Root = new Root();

    /**
     * The base element class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Element extends Node {
        protected static readonly _ROOT_NODE_ID = ROOT_NODE_ID;

        protected static readonly _INVALID_INDEX = INVALID_INDEX;

        protected static readonly _scratchPos: Position = { x: 0, y: 0 };

        protected static readonly _scratchSize: Size = { width: 0, height: 0 };

        protected get _slot(): number {
            return this._id === ROOT_NODE_ID ? INVALID_INDEX : _resolveSlot(this._id);
        }

        protected get _isValid(): boolean {
            return this._slot !== INVALID_INDEX;
        }

        protected _getSlotAndLogWarning(): number {
            return _resolveSlotAndLogWarning(this._id);
        }

        protected _getIsInvalidAndLogWarning(): boolean {
            if (this._slot === INVALID_INDEX) {
                logging.log(`Element is deleted`, LogLevel.Warning);
                return true;
            }

            return false;
        }

        protected get _receiver(): Receiver<mod.Player | mod.Team | undefined> | undefined {
            return this._slot !== INVALID_INDEX ? _getReceiver(this._slot) : undefined;
        }

        protected get _firstChild(): number {
            if (this._id === ROOT_NODE_ID) return _firstRoot;

            const slot = this._slot;

            return slot >= 0 && slot < MAX_ELEMENTS ? _firstChild[slot] : INVALID_INDEX;
        }

        protected get _name(): string {
            return `ui_${this._id}`;
        }

        /**
         * Binds the native engine widget to the allocated element slot.
         * @param nameOrWidget - The native widget name string (to find via mod.FindUIWidgetWithName) or widget handle.
         */
        protected _bindNativeWidget(nameOrWidget: string | mod.UIWidget): void {
            const slot = this._slot;

            if (slot < 0 || slot >= MAX_ELEMENTS) return;

            if (typeof nameOrWidget === 'string') {
                _nativeWidgets[slot] = mod.FindUIWidgetWithName(nameOrWidget) as mod.UIWidget;
            } else {
                _nativeWidgets[slot] = nameOrWidget;
            }
        }

        /**
         * The constructor for an element.
         * Allocates a slot and initializes element state, or assigns INVALID_INDEX if allocation fails.
         * @param params - The initialization parameters for the element.
         */
        protected constructor(params?: ElementParams) {
            if (!params) {
                super(INVALID_INDEX);
                return;
            }

            const slot = _allocateSlot();

            if (slot === INVALID_INDEX) {
                super(INVALID_INDEX);
                return;
            }

            super(_encodeId(slot));

            const parent = params.parent ?? ROOT_NODE;
            const receiver = Element._getReceiver(parent, params.receiver);
            const { x, y } = Element._getPosition(params);
            const { width, height } = Element._getSize(params);
            const visible = params.visible ?? true;
            const uiInputModeWhenVisible = params.uiInputModeWhenVisible ?? false;
            const anchor = params.anchor ?? Anchor.Center;
            const bgFill = params.bgFill ?? BgFill.None;
            const depth = params.depth ?? Depth.AboveGameUI;
            const bgColor = params.bgColor ?? Colors.WHITE;
            const bgAlpha = params.bgAlpha ?? 0;

            _receiverIds[slot] = _encodeReceiver(receiver);
            _instances[slot] = this;

            _x[slot] = x;
            _y[slot] = y;
            _width[slot] = width;
            _height[slot] = height;

            let flags = FLAG_IN_USE;
            flags |= (depth & DEPTH_MASK) << DEPTH_SHIFT;
            flags |= (bgFill & BG_FILL_MASK) << BG_FILL_SHIFT;
            flags |= (anchor & ANCHOR_MASK) << ANCHOR_SHIFT;

            if (visible) {
                flags |= FLAG_VISIBLE;
            }

            if (uiInputModeWhenVisible) {
                flags |= FLAG_UI_INPUT_MODE_WHEN_VISIBLE;
            }

            if (uiInputModeWhenVisible && visible) {
                flags |= FLAG_HAS_INPUT_MODE;
                receiver.addInputModeRequester();
            }

            _flags[slot] = flags;
            _setBgAlpha(slot, bgAlpha);
            _setBgColor(slot, bgColor);

            _attachChild(_resolveNodeSlotAndLogWarning(parent), slot);
        }

        /****** Protected Static Helpers for Subclasses ******/

        protected static _getNativeAnchor(anchor: Anchor): mod.UIAnchor {
            return _NATIVE_ANCHORS[anchor];
        }

        protected static _getNativeBgFill(bgFill: BgFill): mod.UIBgFill {
            return _NATIVE_BG_FILLS[bgFill];
        }

        protected static _getNativeDepth(depth: Depth): mod.UIDepth {
            return _NATIVE_DEPTHS[depth];
        }

        protected static _getNativeImageType(imageType: ImageType): mod.UIImageType {
            return _NATIVE_IMAGE_TYPES[imageType];
        }

        protected static _resolveSlot(id: number): number {
            return _resolveSlot(id);
        }

        protected static _setForegroundColor(slot: number, color: Colors.Color): void {
            _setForegroundColor(slot, color);
        }

        protected static _setForegroundAlpha(slot: number, alpha: number): void {
            _setForegroundAlpha(slot, alpha);
        }

        protected static _getForegroundColor(slot: number, out?: Colors.Color): Colors.Color {
            return _getForegroundColor(slot, out);
        }

        protected static _getForegroundAlpha(slot: number): number {
            return _getForegroundAlpha(slot);
        }

        protected static _getNextSibling(slot: number): number {
            return slot >= 0 && slot < MAX_ELEMENTS ? _nextSibling[slot] : INVALID_INDEX;
        }

        protected static _getInstance(slot: number): Element | undefined {
            return slot >= 0 && slot < MAX_ELEMENTS ? (_instances[slot] ?? undefined) : undefined;
        }

        protected static _getNativeWidget(target: Parent | Node | number): mod.UIWidget | undefined {
            const id = typeof target === 'number' ? target : Node._getId(target);

            if (id === ROOT_NODE_ID) return _getRootNativeWidget();

            const slot = _resolveSlot(id);

            return slot >= 0 && slot < MAX_ELEMENTS ? (_nativeWidgets[slot] ?? undefined) : undefined;
        }

        /**
         * Gets the position from the parameters, given either x/y or position.
         * @param params - The parameters.
         * @param out - Optional target Position object to populate.
         * @returns The position.
         */
        protected static _getPosition(params: ElementParams, out?: Position): Position {
            const target = out ?? Element._scratchPos;
            target.x = params.x ?? params.position?.x ?? 0;
            target.y = params.y ?? params.position?.y ?? 0;

            return target;
        }

        /**
         * Gets the size from the parameters, given either width/height or size.
         * @param params - The parameters.
         * @param out - Optional target Size object to populate.
         * @returns The size.
         */
        protected static _getSize(params: ElementParams, out?: Size): Size {
            const target = out ?? Element._scratchSize;
            target.width = params.width ?? params.size?.width ?? 0;
            target.height = params.height ?? params.size?.height ?? 0;

            return target;
        }

        /**
         * Gets the receiver from the parameters, given either player, team, or neither.
         * @param parent - The parent of the widget.
         * @param receiverParam - The receiver parameter.
         * @returns The receiver.
         */
        protected static _getReceiver(
            parent: Parent,
            receiverParam?: mod.Player | mod.Team
        ): Receiver<mod.Player | mod.Team | undefined> {
            const parentSlot = _resolveNodeSlot(parent);

            if (!receiverParam) {
                return (parentSlot !== INVALID_INDEX ? _getReceiver(parentSlot) : undefined) ?? _globalReceiver;
            }

            const parentReceiver = parentSlot !== INVALID_INDEX ? _getReceiver(parentSlot) : undefined;

            if (isTeam(receiverParam)) {
                const receiver = TeamReceiver.getInstance(receiverParam);

                if (parentReceiver instanceof TeamReceiver && parentReceiver !== receiver) {
                    logging.log('Team receiver mismatch with parent', LogLevel.Warning);
                }

                if (parentReceiver instanceof PlayerReceiver) {
                    logging.log('Parent receiver scope is more narrow', LogLevel.Warning);
                }

                return receiver;
            }

            if (isPlayer(receiverParam)) {
                const receiver = PlayerReceiver.getInstance(receiverParam);

                if (parentReceiver instanceof PlayerReceiver && parentReceiver !== receiver) {
                    logging.log('Player receiver mismatch with parent', LogLevel.Warning);
                }

                if (
                    parentReceiver instanceof TeamReceiver &&
                    parentReceiver.nativeReceiver &&
                    !mod.Equals(parentReceiver.nativeReceiver, mod.GetTeam(receiverParam))
                ) {
                    logging.log('Parent receiver is different team', LogLevel.Warning);
                }

                return receiver;
            }

            return _globalReceiver;
        }

        /**
         * The parent of the element, or undefined if deleted.
         * @returns The parent of the element, or undefined.
         */
        public get parent(): Parent | undefined {
            const slot = this._slot;

            if (slot === INVALID_INDEX) return undefined;

            const parentSlot = _parents[slot];

            if (parentSlot === INVALID_INDEX) return ROOT_NODE;

            return (_instances[parentSlot] as (Element & Parent) | null) ?? ROOT_NODE;
        }

        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        public set parent(parent: Parent) {
            this.setParent(parent);
        }

        /**
         * Sets the parent of the element.
         * @param parent - The new parent.
         * @returns This element for chaining.
         */
        public setParent(parent: Parent): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            const parentId = Node._getId(parent);

            if (parentId === this._id) return this;

            // Circular hierarchy check
            let ancestor: Parent | null | undefined = parent;

            while (ancestor) {
                if (Node._getId(ancestor) === this._id) {
                    logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                    return this;
                }

                ancestor = ancestor.parent;
            }

            const oldParentSlot = _parents[slot];
            const newParentSlot = _resolveNodeSlotAndLogWarning(parent);

            if (oldParentSlot === newParentSlot) return this;

            _detachChild(oldParentSlot, slot);
            _attachChild(newParentSlot, slot);

            mod.SetUIWidgetParent(this._uiWidget, Element._getNativeWidget(parentId)!);

            return this;
        }

        /**
         * Whether the element is visible, or undefined if deleted.
         * @returns True if visible, false if invisible, or undefined if deleted.
         */
        public get visible(): boolean | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _isVisible(slot);
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        public set visible(visible: boolean) {
            this.setVisible(visible);
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         * @returns This element for chaining.
         */
        public setVisible(visible: boolean): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            mod.SetUIWidgetVisible(this._uiWidget, visible);

            if (visible) {
                _setFlag(slot, FLAG_VISIBLE);
            } else {
                _clearFlag(slot, FLAG_VISIBLE);
            }

            if (!_isUIInputModeWhenVisible(slot)) return this;

            const hasInputMode = _hasInputMode(slot);

            if (visible && !hasInputMode) {
                _setFlag(slot, FLAG_HAS_INPUT_MODE);
                _getReceiver(slot).addInputModeRequester();
            } else if (!visible && hasInputMode) {
                _clearFlag(slot, FLAG_HAS_INPUT_MODE);
                _getReceiver(slot).removeInputModeRequester();
            }

            return this;
        }

        /**
         * Shows the element (alias for `setVisible(true)`).
         * @returns This element for chaining.
         */
        public show(): this {
            return this.setVisible(true);
        }

        /**
         * Hides the element (alias for `setVisible(false)`).
         * @returns This element for chaining.
         */
        public hide(): this {
            return this.setVisible(false);
        }

        /**
         * Deletes the element.
         */
        public delete(): void {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return;

            this._deleteRecursiveSlot(slot);
        }

        private _deleteRecursiveSlot(slot: number): void {
            // 1. Recursively delete all children
            let child = _firstChild[slot];

            while (child !== INVALID_INDEX) {
                const next = _nextSibling[child];
                const childInstance = _instances[child];

                if (childInstance) {
                    childInstance.delete();
                } else {
                    this._deleteRecursiveSlot(child);
                }

                child = next;
            }

            // 2. Detach from parent
            const parentSlot = _parents[slot];

            _detachChild(parentSlot, slot);

            // 3. Remove input mode requester if active
            if (_hasInputMode(slot)) {
                _getReceiver(slot).removeInputModeRequester();
            }

            // 4. Delete native widget
            const nativeWidget = _nativeWidgets[slot];

            if (nativeWidget) {
                mod.DeleteUIWidget(nativeWidget);
            }

            // 5. Free slot
            _freeSlot(slot);
        }

        /**
         * The X position of the element, or undefined if deleted.
         * @returns The X position of the element, or undefined.
         */
        public get x(): number | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _x[slot];
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        public set x(x: number) {
            this.setX(x);
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         * @returns This element for chaining.
         */
        public setX(x: number): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _x[slot] = x;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(x, _y[slot], 0));

            return this;
        }

        /**
         * The Y position of the element, or undefined if deleted.
         * @returns The Y position of the element, or undefined.
         */
        public get y(): number | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _y[slot];
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        public set y(y: number) {
            this.setY(y);
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         * @returns This element for chaining.
         */
        public setY(y: number): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _y[slot] = y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(_x[slot], y, 0));

            return this;
        }

        /**
         * The position of the element, or undefined if deleted.
         * @returns The position of the element, or undefined.
         */
        public get position(): Position | undefined {
            return this.getPosition();
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        public set position(params: Position) {
            this.setPosition(params);
        }

        /**
         * Retrieves the position of the element, or undefined if deleted.
         * @param out - Optional target Position object to populate for zero allocations.
         * @returns The position of the element, or undefined.
         */
        public getPosition(out?: Position): Position | undefined {
            const slot = this._slot;

            if (slot === INVALID_INDEX) return undefined;

            const target = out ?? { x: 0, y: 0 };
            target.x = _x[slot];
            target.y = _y[slot];

            return target;
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         * @returns This element for chaining.
         */
        public setPosition(params: Position): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _x[slot] = params.x;
            _y[slot] = params.y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(params.x, params.y, 0));

            return this;
        }

        /**
         * The width of the element, or undefined if deleted.
         * @returns The width of the element, or undefined.
         */
        public get width(): number | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _width[slot];
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        public set width(width: number) {
            this.setWidth(width);
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         * @returns This element for chaining.
         */
        public setWidth(width: number): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _width[slot] = width;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, _height[slot], 0));

            return this;
        }

        /**
         * The height of the element, or undefined if deleted.
         * @returns The height of the element, or undefined.
         */
        public get height(): number | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _height[slot];
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        public set height(height: number) {
            this.setHeight(height);
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         * @returns This element for chaining.
         */
        public setHeight(height: number): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _height[slot] = height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(_width[slot], height, 0));

            return this;
        }

        /**
         * The size of the element, or undefined if deleted.
         * @returns The size of the element, or undefined.
         */
        public get size(): Size | undefined {
            return this.getSize();
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        public set size(params: Size) {
            this.setSize(params);
        }

        /**
         * Retrieves the size of the element, or undefined if deleted.
         * @param out - Optional target Size object to populate for zero allocations.
         * @returns The size of the element, or undefined.
         */
        public getSize(out?: Size): Size | undefined {
            const slot = this._slot;

            if (slot === INVALID_INDEX) return undefined;

            const target = out ?? { width: 0, height: 0 };
            target.width = _width[slot];
            target.height = _height[slot];

            return target;
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         * @returns This element for chaining.
         */
        public setSize(params: Size): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _width[slot] = params.width;
            _height[slot] = params.height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));

            return this;
        }

        /**
         * The background color of the element, or undefined if deleted.
         * @returns The background color of the element, or undefined.
         */
        public get bgColor(): Color | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getBgColor(slot);
        }

        /**
         * Retrieves the background color of the element into an optional target Color object for zero-allocation reuse.
         * @param out - Optional target Color to write into.
         * @returns The background color, or undefined if deleted.
         */
        public getBgColor(out?: Color): Color | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getBgColor(slot, out);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: Color) {
            this.setBgColor(color);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         * @returns This element for chaining.
         */
        public setBgColor(color: Color): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _setBgColor(slot, color);
            mod.SetUIWidgetBgColor(this._uiWidget, Colors.toVector(color));

            return this;
        }

        /**
         * The background alpha of the element, or undefined if deleted.
         * @returns The background alpha of the element, or undefined.
         */
        public get bgAlpha(): number | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getBgAlpha(slot);
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        public set bgAlpha(alpha: number) {
            this.setBgAlpha(alpha);
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         * @returns This element for chaining.
         */
        public setBgAlpha(alpha: number): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _setBgAlpha(slot, alpha);
            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);

            return this;
        }

        /**
         * The background fill of the element, or undefined if deleted.
         * @returns The background fill of the element, or undefined.
         */
        public get bgFill(): BgFill | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getBgFill(slot);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: BgFill) {
            this.setBgFill(fill);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         * @returns This element for chaining.
         */
        public setBgFill(fill: BgFill): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _setBgFill(slot, fill);
            mod.SetUIWidgetBgFill(this._uiWidget, _NATIVE_BG_FILLS[fill]);

            return this;
        }

        /**
         * The depth of the element, or undefined if deleted.
         * @returns The depth of the element, or undefined.
         */
        public get depth(): Depth | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getDepth(slot);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: Depth) {
            this.setDepth(depth);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         * @returns This element for chaining.
         */
        public setDepth(depth: Depth): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _setDepth(slot, depth);
            mod.SetUIWidgetDepth(this._uiWidget, _NATIVE_DEPTHS[depth]);

            return this;
        }

        /**
         * The anchor of the element, or undefined if deleted.
         * @returns The anchor of the element, or undefined.
         */
        public get anchor(): Anchor | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _getAnchor(slot);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: Anchor) {
            this.setAnchor(anchor);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         * @returns This element for chaining.
         */
        public setAnchor(anchor: Anchor): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            _setAnchor(slot, anchor);
            mod.SetUIWidgetAnchor(this._uiWidget, _NATIVE_ANCHORS[anchor]);

            return this;
        }

        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false if not, or undefined if deleted.
         */
        public get uiInputModeWhenVisible(): boolean | undefined {
            const slot = this._slot;

            return slot === INVALID_INDEX ? undefined : _isUIInputModeWhenVisible(slot);
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        public set uiInputModeWhenVisible(newValue: boolean) {
            this.setUiInputModeWhenVisible(newValue);
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         * @returns This element for chaining.
         */
        public setUiInputModeWhenVisible(newValue: boolean): this {
            const slot = this._getSlotAndLogWarning();

            if (slot === INVALID_INDEX) return this;

            const isVisible = _isVisible(slot);
            const hasInputMode = _hasInputMode(slot);

            if (newValue) {
                _setFlag(slot, FLAG_UI_INPUT_MODE_WHEN_VISIBLE);
            } else {
                _clearFlag(slot, FLAG_UI_INPUT_MODE_WHEN_VISIBLE);
            }

            if (newValue && isVisible && !hasInputMode) {
                _setFlag(slot, FLAG_HAS_INPUT_MODE);
                _getReceiver(slot).addInputModeRequester();
            } else if ((!newValue || !isVisible) && hasInputMode) {
                _clearFlag(slot, FLAG_HAS_INPUT_MODE);
                _getReceiver(slot).removeInputModeRequester();
            }

            return this;
        }
    }

    /****** Constants ******/

    /**
     * Re-export of standard and Battlefield color presets.
     */
    export const COLORS = Colors.PRESETS;

    Events.OnPlayerLeaveGame.subscribe((playerId: number) => {
        PlayerReceiver.clear(playerId);
    });
}
