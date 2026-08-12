import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 9.0.0
export namespace UI {
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

    // Bitflags for _flags
    const FLAG_IN_USE = 1 << 0; // 0x01
    const FLAG_VISIBLE = 1 << 1; // 0x02
    const FLAG_HAS_INPUT_MODE = 1 << 2; // 0x04
    const FLAG_UI_INPUT_MODE_WHEN_VISIBLE = 1 << 3; // 0x08

    /****** SoA Buffers ******/

    const _flags = new Uint8Array(MAX_ELEMENTS);
    const _generations = new Uint16Array(MAX_ELEMENTS);
    const _parents = new Int16Array(MAX_ELEMENTS);
    const _firstChild = new Int16Array(MAX_ELEMENTS);
    const _nextSibling = new Int16Array(MAX_ELEMENTS);

    const _x = new Float32Array(MAX_ELEMENTS);
    const _y = new Float32Array(MAX_ELEMENTS);
    const _width = new Float32Array(MAX_ELEMENTS);
    const _height = new Float32Array(MAX_ELEMENTS);

    const _nativeWidgets = new Array<mod.UIWidget | null>(MAX_ELEMENTS);
    const _receivers = new Array<Receiver<mod.Player | mod.Team | undefined> | null>(MAX_ELEMENTS);
    const _instances = new Array<Element | null>(MAX_ELEMENTS);

    // Intrusive free-list initialization for elements (array slots 0..MAX_ELEMENTS-1)
    for (let i = 0; i < MAX_ELEMENTS - 1; ++i) {
        _nextSibling[i] = i + 1;
    }
    _nextSibling[MAX_ELEMENTS - 1] = INVALID_INDEX;

    _parents.fill(INVALID_INDEX);
    _firstChild.fill(INVALID_INDEX);
    _nativeWidgets.fill(null);
    _receivers.fill(null);
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
        _nativeWidgets[slot] = null;
        _receivers[slot] = null;
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
        anchor?: mod.UIAnchor;
        parent?: Parent;
        visible?: boolean;
        bgColor?: mod.Vector;
        bgAlpha?: number;
        bgFill?: mod.UIBgFill;
        depth?: mod.UIDepth;
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

            return _receivers[slot]?.nativeReceiver ?? null;
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
         */
        protected override get _uiWidget(): mod.UIWidget {
            return _getRootNativeWidget();
        }

        /**
         * @inheritdoc
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
            return this._slot !== INVALID_INDEX ? (_receivers[this._slot] ?? undefined) : undefined;
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

            _receivers[slot] = receiver;
            _instances[slot] = this;

            _x[slot] = x;
            _y[slot] = y;
            _width[slot] = width;
            _height[slot] = height;

            let flags = FLAG_IN_USE;

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

            _attachChild(_resolveNodeSlotAndLogWarning(parent), slot);
        }

        /****** Protected Static Helpers for Subclasses ******/

        protected static _resolveSlot(id: number): number {
            return _resolveSlot(id);
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
                return (parentSlot !== INVALID_INDEX ? _receivers[parentSlot] : undefined) ?? _globalReceiver;
            }

            const parentReceiver = parentSlot !== INVALID_INDEX ? _receivers[parentSlot] : undefined;

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
                _receivers[slot]?.addInputModeRequester();
            } else if (!visible && hasInputMode) {
                _clearFlag(slot, FLAG_HAS_INPUT_MODE);
                _receivers[slot]?.removeInputModeRequester();
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
                _receivers[slot]?.removeInputModeRequester();
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
        public get bgColor(): mod.Vector | undefined {
            return this._isValid ? mod.GetUIWidgetBgColor(this._uiWidget) : undefined;
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: mod.Vector) {
            this.setBgColor(color);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         * @returns This element for chaining.
         */
        public setBgColor(color: mod.Vector): this {
            if (this._getIsInvalidAndLogWarning()) return this;

            mod.SetUIWidgetBgColor(this._uiWidget, color);

            return this;
        }

        /**
         * The background alpha of the element, or undefined if deleted.
         * @returns The background alpha of the element, or undefined.
         */
        public get bgAlpha(): number | undefined {
            return this._isValid ? mod.GetUIWidgetBgAlpha(this._uiWidget) : undefined;
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
            if (this._getIsInvalidAndLogWarning()) return this;

            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);

            return this;
        }

        /**
         * The background fill of the element, or undefined if deleted.
         * @returns The background fill of the element, or undefined.
         */
        public get bgFill(): mod.UIBgFill | undefined {
            return this._isValid ? mod.GetUIWidgetBgFill(this._uiWidget) : undefined;
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: mod.UIBgFill) {
            this.setBgFill(fill);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         * @returns This element for chaining.
         */
        public setBgFill(fill: mod.UIBgFill): this {
            if (this._getIsInvalidAndLogWarning()) return this;

            mod.SetUIWidgetBgFill(this._uiWidget, fill);

            return this;
        }

        /**
         * The depth of the element, or undefined if deleted.
         * @returns The depth of the element, or undefined.
         */
        public get depth(): mod.UIDepth | undefined {
            return this._isValid ? mod.GetUIWidgetDepth(this._uiWidget) : undefined;
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: mod.UIDepth) {
            this.setDepth(depth);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         * @returns This element for chaining.
         */
        public setDepth(depth: mod.UIDepth): this {
            if (this._getIsInvalidAndLogWarning()) return this;

            mod.SetUIWidgetDepth(this._uiWidget, depth);

            return this;
        }

        /**
         * The anchor of the element, or undefined if deleted.
         * @returns The anchor of the element, or undefined.
         */
        public get anchor(): mod.UIAnchor | undefined {
            return this._isValid ? mod.GetUIWidgetAnchor(this._uiWidget) : undefined;
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: mod.UIAnchor) {
            this.setAnchor(anchor);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         * @returns This element for chaining.
         */
        public setAnchor(anchor: mod.UIAnchor): this {
            if (this._getIsInvalidAndLogWarning()) return this;

            mod.SetUIWidgetAnchor(this._uiWidget, anchor);

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
                _receivers[slot]?.addInputModeRequester();
            } else if ((!newValue || !isVisible) && hasInputMode) {
                _clearFlag(slot, FLAG_HAS_INPUT_MODE);
                _receivers[slot]?.removeInputModeRequester();
            }

            return this;
        }
    }

    /****** Constants ******/

    /**
     * Some useful colors.
     */
    export const COLORS = Object.freeze({
        BLACK: mod.CreateVector(0, 0, 0),
        GREY_25: mod.CreateVector(0.25, 0.25, 0.25),
        GREY_50: mod.CreateVector(0.5, 0.5, 0.5),
        GREY_75: mod.CreateVector(0.75, 0.75, 0.75),
        WHITE: mod.CreateVector(1, 1, 1),
        RED: mod.CreateVector(1, 0, 0),
        GREEN: mod.CreateVector(0, 1, 0),
        BLUE: mod.CreateVector(0, 0, 1),
        YELLOW: mod.CreateVector(1, 1, 0),
        PURPLE: mod.CreateVector(1, 0, 1),
        CYAN: mod.CreateVector(0, 1, 1),
        MAGENTA: mod.CreateVector(1, 0, 1),
        BF_GREY_1: mod.CreateVector(0.8353, 0.9216, 0.9765), // #D5EBF9
        BF_GREY_2: mod.CreateVector(0.3294, 0.3686, 0.3882), // #545E63
        BF_GREY_3: mod.CreateVector(0.2118, 0.2235, 0.2353), // #36393C
        BF_GREY_4: mod.CreateVector(0.0314, 0.0431, 0.0431), // #080B0B,
        BF_BLUE_BRIGHT: mod.CreateVector(0.4392, 0.9216, 1.0), // #70EBFF
        BF_BLUE_DARK: mod.CreateVector(0.0745, 0.1843, 0.2471), // #132F3F
        BF_RED_BRIGHT: mod.CreateVector(1.0, 0.5137, 0.3804), // #FF8361
        BF_RED_DARK: mod.CreateVector(0.251, 0.0941, 0.0667), // #401811
        BF_GREEN_BRIGHT: mod.CreateVector(0.6784, 0.9922, 0.5255), // #ADFD86
        BF_GREEN_DARK: mod.CreateVector(0.2784, 0.4471, 0.2118), // #477236
        BF_YELLOW_BRIGHT: mod.CreateVector(1.0, 0.9882, 0.6118), // #FFFC9C
        BF_YELLOW_DARK: mod.CreateVector(0.4431, 0.3765, 0.0), // #716000
    });

    Events.OnPlayerLeaveGame.subscribe((player: mod.Player) => {
        PlayerReceiver.clear(mod.GetObjId(player));
    });
}
