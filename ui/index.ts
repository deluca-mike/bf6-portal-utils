import { CallbackHandler } from '../callback-handler/index.ts';
import { Events } from '../events/index.ts';
import { Logging } from '../logging/index.ts';

// version: 10.0.0
export namespace UI {
    /****** Logging ******/

    const logging = new Logging('UI');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined (or null) to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeRawError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    /****** Constants & Limits ******/

    const ROOT_NODE_ID = 0;
    const INVALID_INDEX = -1;

    /**
     * Maximum number of UI widgets supported simultaneously.
     */
    export const MAX_WIDGETS = 2048;

    /**
     * Maximum number of interactive UI buttons supported simultaneously.
     */
    export const MAX_BUTTONS = 512;

    // Bitflags (lower 5 bits of _flags)
    const FLAG_IN_USE = 1 << 0; // 0x01
    const FLAG_VISIBLE = 1 << 1; // 0x02
    const FLAG_HAS_INPUT_MODE = 1 << 2; // 0x04
    const FLAG_UI_INPUT_MODE_WHEN_VISIBLE = 1 << 3; // 0x08
    // Bit 4 (0x10) is reserved for future use

    const FLAGS_MASK = 0x1f;
    const BUTTON_ID_SHIFT = 5;
    const BUTTON_ID_MASK = 0x7ff; // 11 bits (up to 2047 buttons)

    /****** SoA Buffers ******/

    const _flags = new Uint16Array(MAX_WIDGETS);
    const _parents = new Int16Array(MAX_WIDGETS);
    const _firstChild = new Int16Array(MAX_WIDGETS);
    const _nextSibling = new Int16Array(MAX_WIDGETS);

    const _x = new Float32Array(MAX_WIDGETS);
    const _y = new Float32Array(MAX_WIDGETS);
    const _width = new Float32Array(MAX_WIDGETS);
    const _height = new Float32Array(MAX_WIDGETS);

    const _nativeWidgets = new Array<mod.UIWidget | null>(MAX_WIDGETS);
    const _receivers = new Array<Receiver<mod.Player | mod.Team | undefined> | null>(MAX_WIDGETS);
    const _instances = new Array<Element | null>(MAX_WIDGETS);

    // Intrusive free-list initialization for widgets (array slots 0..MAX_WIDGETS-1)
    for (let i = 0; i < MAX_WIDGETS - 1; ++i) {
        _nextSibling[i] = i + 1;
    }
    _nextSibling[MAX_WIDGETS - 1] = INVALID_INDEX;

    _parents.fill(INVALID_INDEX);
    _firstChild.fill(INVALID_INDEX);
    _nativeWidgets.fill(null);
    _receivers.fill(null);
    _instances.fill(null);

    let _firstFree = 0;
    let _firstRoot = INVALID_INDEX;

    // Button Storage (1-indexed, slot 0 = not a button)
    const _buttonWidgetId = new Int16Array(MAX_BUTTONS + 1);
    const _buttonOnClickUp = new Array<ButtonHandler | null>(MAX_BUTTONS + 1);
    const _buttonOnClickDown = new Array<ButtonHandler | null>(MAX_BUTTONS + 1);
    const _buttonOnFocusIn = new Array<ButtonHandler | null>(MAX_BUTTONS + 1);
    const _buttonOnFocusOut = new Array<ButtonHandler | null>(MAX_BUTTONS + 1);

    for (let i = 1; i < MAX_BUTTONS; ++i) {
        _buttonWidgetId[i] = i + 1;
    }
    _buttonWidgetId[MAX_BUTTONS] = INVALID_INDEX;

    _buttonOnClickUp.fill(null);
    _buttonOnClickDown.fill(null);
    _buttonOnFocusIn.fill(null);
    _buttonOnFocusOut.fill(null);

    let _firstFreeButton = 1;

    let _rootNativeWidget: mod.UIWidget | null = null;

    function _getRootNativeWidget(): mod.UIWidget {
        if (!_rootNativeWidget) {
            _rootNativeWidget = mod.GetUIRoot();
        }

        return _rootNativeWidget;
    }

    /****** Flag & Bit Helper Functions ******/

    function _isInUse(flags: number): boolean {
        return (flags & FLAG_IN_USE) !== 0;
    }

    function _isVisible(flags: number): boolean {
        return (flags & FLAG_VISIBLE) !== 0;
    }

    function _hasInputMode(flags: number): boolean {
        return (flags & FLAG_HAS_INPUT_MODE) !== 0;
    }

    function _isUIInputModeWhenVisible(flags: number): boolean {
        return (flags & FLAG_UI_INPUT_MODE_WHEN_VISIBLE) !== 0;
    }

    function _setFlag(slot: number, flag: number): void {
        _flags[slot] |= flag;
    }

    function _clearFlag(slot: number, flag: number): void {
        _flags[slot] &= ~flag;
    }

    function _getButtonId(flags: number): number {
        return (flags >> BUTTON_ID_SHIFT) & BUTTON_ID_MASK;
    }

    function _setButtonId(slot: number, btnId: number): void {
        _flags[slot] = (_flags[slot] & FLAGS_MASK) | ((btnId & BUTTON_ID_MASK) << BUTTON_ID_SHIFT);
    }

    /****** Internal SoA Slot Allocators & Hierarchy Helpers ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('UI widget pool full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const slot = _firstFree;
        _firstFree = _nextSibling[slot];
        _nextSibling[slot] = INVALID_INDEX;
        _firstChild[slot] = INVALID_INDEX;
        _parents[slot] = ROOT_NODE_ID;
        _flags[slot] = FLAG_IN_USE;

        return slot + 1;
    }

    function _freeSlot(id: number): void {
        const slot = id - 1;
        if (slot < 0 || slot >= MAX_WIDGETS) return;

        const parentId = _parents[slot];

        if (parentId !== INVALID_INDEX) {
            _detachChild(parentId, id);
        }

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

        _nextSibling[slot] = _firstFree;
        _firstFree = slot;
    }

    function _allocateButtonSlot(widgetId: number): number {
        if (_firstFreeButton === INVALID_INDEX) {
            logging.log('UI button pool full', LogLevel.Error);
            return 0;
        }

        const slot = _firstFreeButton;
        _firstFreeButton = _buttonWidgetId[slot];
        _buttonWidgetId[slot] = widgetId;
        _buttonOnClickUp[slot] = null;
        _buttonOnClickDown[slot] = null;
        _buttonOnFocusIn[slot] = null;
        _buttonOnFocusOut[slot] = null;

        _setButtonId(widgetId - 1, slot);

        return slot;
    }

    function _freeButtonSlot(widgetId: number): void {
        const slot = _getButtonId(_flags[widgetId - 1]);

        if (slot === 0 || slot >= _buttonWidgetId.length) return;

        _buttonOnClickUp[slot] = null;
        _buttonOnClickDown[slot] = null;
        _buttonOnFocusIn[slot] = null;
        _buttonOnFocusOut[slot] = null;

        _buttonWidgetId[slot] = _firstFreeButton;
        _firstFreeButton = slot;

        _setButtonId(widgetId - 1, 0);
    }

    function _attachChild(parentId: number, childId: number): void {
        const childSlot = childId - 1;
        if (childSlot < 0 || childSlot >= MAX_WIDGETS) return;

        _parents[childSlot] = parentId;

        if (parentId === ROOT_NODE_ID) {
            _nextSibling[childSlot] = _firstRoot;
            _firstRoot = childSlot;
            return;
        }

        const parentSlot = parentId - 1;
        if (parentSlot < 0 || parentSlot >= MAX_WIDGETS) return;

        _nextSibling[childSlot] = _firstChild[parentSlot];
        _firstChild[parentSlot] = childSlot;
    }

    function _detachChild(parentId: number, childId: number): void {
        const childSlot = childId - 1;
        if (childSlot < 0 || childSlot >= MAX_WIDGETS) return;

        if (parentId === ROOT_NODE_ID) {
            if (_firstRoot === INVALID_INDEX) return;

            if (_firstRoot === childSlot) {
                _firstRoot = _nextSibling[childSlot];
                _nextSibling[childSlot] = INVALID_INDEX;
                _parents[childSlot] = INVALID_INDEX;
                return;
            }

            for (let prev = _firstRoot; prev !== INVALID_INDEX; prev = _nextSibling[prev]) {
                if (_nextSibling[prev] !== childSlot) continue;

                _nextSibling[prev] = _nextSibling[childSlot];
                _nextSibling[childSlot] = INVALID_INDEX;
                _parents[childSlot] = INVALID_INDEX;
                return;
            }
            return;
        }

        const parentSlot = parentId - 1;
        if (parentSlot < 0 || parentSlot >= MAX_WIDGETS) return;

        if (_firstChild[parentSlot] === childSlot) {
            _firstChild[parentSlot] = _nextSibling[childSlot];
            _nextSibling[childSlot] = INVALID_INDEX;
            _parents[childSlot] = INVALID_INDEX;
            return;
        }

        let curr = _firstChild[parentSlot];

        while (curr !== INVALID_INDEX) {
            const next = _nextSibling[curr];

            if (next === childSlot) {
                _nextSibling[curr] = _nextSibling[childSlot];
                _nextSibling[childSlot] = INVALID_INDEX;
                _parents[childSlot] = INVALID_INDEX;
                return;
            }

            curr = next;
        }
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
     * The minimum interface for a button.
     */
    export type Button = {
        onClickDown?: ButtonHandler | null;
        onClickUp?: ButtonHandler | null;
        onFocusIn?: ButtonHandler | null;
        onFocusOut?: ButtonHandler | null;
        getOnClickDown?(): ButtonHandler | null | undefined;
        getOnClickUp?(): ButtonHandler | null | undefined;
        getOnFocusIn?(): ButtonHandler | null | undefined;
        getOnFocusOut?(): ButtonHandler | null | undefined;
    };

    /**
     * The parent of an element.
     */
    export interface Parent extends Node {
        readonly receiver: mod.Player | mod.Team | null | undefined;
        readonly children: readonly Element[] | undefined;
        getReceiver(): mod.Player | mod.Team | null | undefined;
        getParent(): Parent | null | undefined;
        getChildren(): readonly Element[] | undefined;
        getChild(index: number): Element | null | undefined;
        getChildCount(): number | undefined;
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

    /**
     * The final internal parameters for an Element constructor.
     */
    export type FinalElementParams = {
        name: string;
        parent: Parent;
        anchor: mod.UIAnchor;
        visible: boolean;
        bgColor: mod.Vector;
        bgAlpha: number;
        bgFill: mod.UIBgFill;
        depth: mod.UIDepth;
        x: number;
        y: number;
        width: number;
        height: number;
        receiver: Receiver<mod.Player | mod.Team | undefined>;
        uiInputModeWhenVisible: boolean;
    };

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
        protected readonly _logging: Logging = logging; // Every node has access to the singleton UI logging instance.
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
         * The underlying native Battlefield Portal UIWidget handle for this node.
         * @returns The native UIWidget handle.
         */
        protected get _uiWidget(): mod.UIWidget {
            if (this._id === ROOT_NODE_ID) {
                return _getRootNativeWidget();
            }
            return _nativeWidgets[this._id - 1]!;
        }

        /**
         * The target audience receiver for the node (player or team, null if global, undefined if deleted).
         * @returns The native receiver, null, or undefined.
         */
        public get receiver(): mod.Player | mod.Team | null | undefined {
            return this.getReceiver();
        }

        /**
         * Retrieves the target audience receiver for the node.
         * @returns The native receiver, null if global, or undefined if deleted.
         */
        public getReceiver(): mod.Player | mod.Team | null | undefined {
            if (this._id === INVALID_INDEX) return undefined;
            if (this._id === ROOT_NODE_ID) return null;
            return _receivers[this._id - 1]?.nativeReceiver ?? null;
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
         * @inheritdoc
         */
        public override getReceiver(): null {
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
         * Retrieves the parent of the root node.
         * @returns null.
         */
        public getParent(): null {
            return null;
        }

        /**
         * Returns a snapshot array of direct child elements.
         * @returns Array of direct children.
         */
        public get children(): readonly Element[] {
            return this.getChildren();
        }

        /**
         * Retrieves a snapshot array of direct child elements.
         * @returns Array of direct children.
         */
        public getChildren(): readonly Element[] {
            const list: Element[] = [];
            list.length = 0;
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
         * Retrieves the total direct child count of the root node.
         * @returns The number of direct children.
         */
        public getChildCount(): number {
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

        protected _name: string;

        private get _slot(): number {
            return this._id - 1;
        }

        /**
         * The constructor for an element.
         * @param id - The allocated slot ID (1-based).
         * @param params - The parameters for the element.
         */
        public constructor(id: number, params: FinalElementParams) {
            super(id);
            this._name = params.name;

            const slot = id - 1;
            _nativeWidgets[slot] = mod.FindUIWidgetWithName(params.name) as mod.UIWidget;
            _receivers[slot] = params.receiver;
            _instances[slot] = this;

            _x[slot] = params.x;
            _y[slot] = params.y;
            _width[slot] = params.width;
            _height[slot] = params.height;

            let flags = FLAG_IN_USE;

            if (params.visible) {
                flags |= FLAG_VISIBLE;
            }

            if (params.uiInputModeWhenVisible) {
                flags |= FLAG_UI_INPUT_MODE_WHEN_VISIBLE;
            }

            if (params.uiInputModeWhenVisible && params.visible) {
                flags |= FLAG_HAS_INPUT_MODE;
                params.receiver.addInputModeRequester();
            }

            _flags[slot] = flags;

            _attachChild(Node._getId(params.parent), id);
        }

        /****** Protected Static Helpers for Subclasses ******/

        protected static _allocateSlot(): number {
            return _allocateSlot();
        }

        protected static _freeSlot(id: number): void {
            _freeSlot(id);
        }

        protected static _attachChild(parentId: number, childId: number): void {
            _attachChild(parentId, childId);
        }

        protected static _detachChild(parentId: number, childId: number): void {
            _detachChild(parentId, childId);
        }

        protected static _getFirstChild(id: number): number {
            if (id === ROOT_NODE_ID) return _firstRoot;
            const slot = id - 1;
            return slot >= 0 && slot < MAX_WIDGETS ? _firstChild[slot] : INVALID_INDEX;
        }

        protected static _getNextSibling(slot: number): number {
            return slot >= 0 && slot < MAX_WIDGETS ? _nextSibling[slot] : INVALID_INDEX;
        }

        protected static _getInstance(slot: number): Element | undefined {
            return slot >= 0 && slot < MAX_WIDGETS ? (_instances[slot] ?? undefined) : undefined;
        }

        public static _getNativeWidget(target: Parent | Node | number): mod.UIWidget | undefined {
            const id = typeof target === 'number' ? target : Node._getId(target);
            if (id === ROOT_NODE_ID) {
                return _getRootNativeWidget();
            }

            const slot = id - 1;
            return slot >= 0 && slot < MAX_WIDGETS ? (_nativeWidgets[slot] ?? undefined) : undefined;
        }

        /**
         * Makes a deterministic, sequential name for a widget in the format `ui_${id}`.
         * @param id - The widget slot ID.
         * @returns The name of the widget.
         */
        protected static _makeName(id: number): string {
            return `ui_${id}`;
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
            const parentId = Node._getId(parent);
            if (!receiverParam) {
                return (parentId !== ROOT_NODE_ID ? _receivers[parentId - 1] : undefined) ?? _globalReceiver;
            }

            const parentReceiver = parentId !== ROOT_NODE_ID ? _receivers[parentId - 1] : undefined;

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

        /****** Protected Button Slot Accessors for Subclasses ******/

        protected _allocateButtonSlot(): number {
            return _allocateButtonSlot(this._id);
        }

        protected _freeButtonSlot(): void {
            _freeButtonSlot(this._id);
        }

        protected _getButtonSlot(): number {
            return _getButtonId(_flags[this._slot]);
        }

        protected _setButtonOnClickUp(slot: number, handler: ButtonHandler | null | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnClickUp[slot] = handler ?? null;
            }
        }

        protected _getButtonOnClickUp(slot: number): ButtonHandler | null | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnClickUp[slot] ?? null) : undefined;
        }

        protected _setButtonOnClickDown(slot: number, handler: ButtonHandler | null | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnClickDown[slot] = handler ?? null;
            }
        }

        protected _getButtonOnClickDown(slot: number): ButtonHandler | null | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnClickDown[slot] ?? null) : undefined;
        }

        protected _setButtonOnFocusIn(slot: number, handler: ButtonHandler | null | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnFocusIn[slot] = handler ?? null;
            }
        }

        protected _getButtonOnFocusIn(slot: number): ButtonHandler | null | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnFocusIn[slot] ?? null) : undefined;
        }

        protected _setButtonOnFocusOut(slot: number, handler: ButtonHandler | null | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnFocusOut[slot] = handler ?? null;
            }
        }

        protected _getButtonOnFocusOut(slot: number): ButtonHandler | null | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnFocusOut[slot] ?? null) : undefined;
        }

        protected _isDeletedCheck(): boolean {
            if (this._id === INVALID_INDEX) {
                logging.log('Element is deleted', LogLevel.Warning);
                return true;
            }

            return false;
        }

        /**
         * Whether the element is deleted.
         * @returns True if deleted, false otherwise.
         */
        public get isDeleted(): boolean {
            return this._id === INVALID_INDEX;
        }

        /**
         * Retrieves whether the element is deleted.
         * @returns True if deleted, false otherwise.
         */
        public getIsDeleted(): boolean {
            return this._id === INVALID_INDEX;
        }

        /**
         * The parent of the element, or undefined if deleted.
         * @returns The parent of the element, or undefined.
         */
        public get parent(): Parent | undefined {
            return this.getParent();
        }

        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        public set parent(parent: Parent) {
            this.setParent(parent);
        }

        /**
         * Retrieves the parent of the element, or undefined if deleted.
         * @returns The parent of the element, or undefined.
         */
        public getParent(): Parent | undefined {
            if (this._isDeletedCheck()) return undefined;

            const parentId = _parents[this._slot];

            if (parentId === ROOT_NODE_ID) return ROOT_NODE;
            if (parentId === INVALID_INDEX) return undefined;

            const parentSlot = parentId - 1;
            return (_instances[parentSlot] as (Element & Parent) | null) ?? ROOT_NODE;
        }

        /**
         * Sets the parent of the element.
         * @param parent - The new parent.
         * @returns This element for chaining.
         */
        public setParent(parent: Parent): this {
            if (this._isDeletedCheck()) return this;

            const parentId = Node._getId(parent);
            if (parentId === this._id) return this;

            // Circular hierarchy check
            let ancestor: Parent | null | undefined = parent;
            while (ancestor) {
                if (Node._getId(ancestor) === this._id) {
                    logging.log('Cannot create circular parent-child hierarchy', LogLevel.Warning);
                    return this;
                }
                ancestor = ancestor.getParent();
            }

            const slot = this._slot;
            const oldParentId = _parents[slot];
            if (oldParentId === parentId) return this;

            _detachChild(oldParentId, this._id);
            _attachChild(parentId, this._id);

            mod.SetUIWidgetParent(this._uiWidget, Element._getNativeWidget(parentId)!);

            return this;
        }

        /**
         * Whether the element is visible, or undefined if deleted.
         * @returns True if visible, false if invisible, or undefined if deleted.
         */
        public get visible(): boolean | undefined {
            return this.getVisible();
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        public set visible(visible: boolean) {
            this.setVisible(visible);
        }

        /**
         * Retrieves the visibility of the element, or undefined if deleted.
         * @returns True if visible, false if invisible, or undefined if deleted.
         */
        public getVisible(): boolean | undefined {
            if (this._isDeletedCheck()) return undefined;

            return _isVisible(_flags[this._slot]);
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         * @returns This element for chaining.
         */
        public setVisible(visible: boolean): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetVisible(this._uiWidget, visible);

            const slot = this._slot;
            if (visible) {
                _setFlag(slot, FLAG_VISIBLE);
            } else {
                _clearFlag(slot, FLAG_VISIBLE);
            }

            const flags = _flags[slot];
            const uiInputModeWhenVisible = _isUIInputModeWhenVisible(flags);
            const hasInputMode = _hasInputMode(flags);

            if (!uiInputModeWhenVisible) return this;

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
         * Deletes the element.
         */
        public delete(): void {
            if (this._isDeletedCheck()) return;

            const id = this._id;
            this._id = INVALID_INDEX; // Nullify element ID so it no longer maps to SoA buffers

            this._deleteRecursive(id);
        }

        private _deleteRecursive(id: number): void {
            const slot = id - 1;
            if (!_isInUse(_flags[slot])) return;

            // 1. Recursively delete all children
            let child = _firstChild[slot];

            while (child !== INVALID_INDEX) {
                const next = _nextSibling[child];
                const childInstance = _instances[child];

                if (childInstance) {
                    childInstance.delete();
                } else {
                    this._deleteRecursive(child + 1);
                }

                child = next;
            }

            // 2. Detach from parent
            const parentId = _parents[slot];

            if (parentId !== INVALID_INDEX) {
                _detachChild(parentId, id);
            }

            // 3. Free button slot if allocated
            const flags = _flags[slot];

            if (_getButtonId(flags) !== 0) {
                _freeButtonSlot(id);
            }

            // 4. Remove input mode requester if active
            if (_hasInputMode(flags)) {
                _receivers[slot]?.removeInputModeRequester();
            }

            // 5. Delete native widget
            const nativeWidget = _nativeWidgets[slot];

            if (nativeWidget) {
                mod.DeleteUIWidget(nativeWidget);
            }

            // 6. Free slot
            _freeSlot(id);
        }

        /**
         * The X position of the element, or undefined if deleted.
         * @returns The X position of the element, or undefined.
         */
        public get x(): number | undefined {
            return this.getX();
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        public set x(x: number) {
            this.setX(x);
        }

        /**
         * Retrieves the X position of the element, or undefined if deleted.
         * @returns The X position of the element, or undefined.
         */
        public getX(): number | undefined {
            return this._isDeletedCheck() ? undefined : _x[this._slot];
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         * @returns This element for chaining.
         */
        public setX(x: number): this {
            if (this._isDeletedCheck()) return this;

            _x[this._slot] = x;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(x, _y[this._slot], 0));
            return this;
        }

        /**
         * The Y position of the element, or undefined if deleted.
         * @returns The Y position of the element, or undefined.
         */
        public get y(): number | undefined {
            return this.getY();
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        public set y(y: number) {
            this.setY(y);
        }

        /**
         * Retrieves the Y position of the element, or undefined if deleted.
         * @returns The Y position of the element, or undefined.
         */
        public getY(): number | undefined {
            return this._isDeletedCheck() ? undefined : _y[this._slot];
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         * @returns This element for chaining.
         */
        public setY(y: number): this {
            if (this._isDeletedCheck()) return this;

            _y[this._slot] = y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(_x[this._slot], y, 0));
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
            if (this._isDeletedCheck()) return undefined;

            const target = out ?? { x: 0, y: 0 };
            target.x = _x[this._slot];
            target.y = _y[this._slot];
            return target;
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         * @returns This element for chaining.
         */
        public setPosition(params: Position): this {
            if (this._isDeletedCheck()) return this;

            _x[this._slot] = params.x;
            _y[this._slot] = params.y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(params.x, params.y, 0));
            return this;
        }

        /**
         * The width of the element, or undefined if deleted.
         * @returns The width of the element, or undefined.
         */
        public get width(): number | undefined {
            return this.getWidth();
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        public set width(width: number) {
            this.setWidth(width);
        }

        /**
         * Retrieves the width of the element, or undefined if deleted.
         * @returns The width of the element, or undefined.
         */
        public getWidth(): number | undefined {
            return this._isDeletedCheck() ? undefined : _width[this._slot];
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         * @returns This element for chaining.
         */
        public setWidth(width: number): this {
            if (this._isDeletedCheck()) return this;

            _width[this._slot] = width;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, _height[this._slot], 0));
            return this;
        }

        /**
         * The height of the element, or undefined if deleted.
         * @returns The height of the element, or undefined.
         */
        public get height(): number | undefined {
            return this.getHeight();
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        public set height(height: number) {
            this.setHeight(height);
        }

        /**
         * Retrieves the height of the element, or undefined if deleted.
         * @returns The height of the element, or undefined.
         */
        public getHeight(): number | undefined {
            return this._isDeletedCheck() ? undefined : _height[this._slot];
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         * @returns This element for chaining.
         */
        public setHeight(height: number): this {
            if (this._isDeletedCheck()) return this;

            _height[this._slot] = height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(_width[this._slot], height, 0));
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
            if (this._isDeletedCheck()) return undefined;

            const target = out ?? { width: 0, height: 0 };
            target.width = _width[this._slot];
            target.height = _height[this._slot];
            return target;
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         * @returns This element for chaining.
         */
        public setSize(params: Size): this {
            if (this._isDeletedCheck()) return this;

            _width[this._slot] = params.width;
            _height[this._slot] = params.height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
            return this;
        }

        /**
         * The background color of the element, or undefined if deleted.
         * @returns The background color of the element, or undefined.
         */
        public get bgColor(): mod.Vector | undefined {
            return this.getBgColor();
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: mod.Vector) {
            this.setBgColor(color);
        }

        /**
         * Retrieves the background color of the element, or undefined if deleted.
         * @returns The background color vector, or undefined.
         */
        public getBgColor(): mod.Vector | undefined {
            return this._isDeletedCheck() ? undefined : mod.GetUIWidgetBgColor(this._uiWidget);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         * @returns This element for chaining.
         */
        public setBgColor(color: mod.Vector): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetBgColor(this._uiWidget, color);
            return this;
        }

        /**
         * The background alpha of the element, or undefined if deleted.
         * @returns The background alpha of the element, or undefined.
         */
        public get bgAlpha(): number | undefined {
            return this.getBgAlpha();
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        public set bgAlpha(alpha: number) {
            this.setBgAlpha(alpha);
        }

        /**
         * Retrieves the background alpha of the element, or undefined if deleted.
         * @returns The background alpha, or undefined.
         */
        public getBgAlpha(): number | undefined {
            return this._isDeletedCheck() ? undefined : mod.GetUIWidgetBgAlpha(this._uiWidget);
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         * @returns This element for chaining.
         */
        public setBgAlpha(alpha: number): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);
            return this;
        }

        /**
         * The background fill of the element, or undefined if deleted.
         * @returns The background fill of the element, or undefined.
         */
        public get bgFill(): mod.UIBgFill | undefined {
            return this.getBgFill();
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: mod.UIBgFill) {
            this.setBgFill(fill);
        }

        /**
         * Retrieves the background fill of the element, or undefined if deleted.
         * @returns The background fill, or undefined.
         */
        public getBgFill(): mod.UIBgFill | undefined {
            return this._isDeletedCheck() ? undefined : mod.GetUIWidgetBgFill(this._uiWidget);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         * @returns This element for chaining.
         */
        public setBgFill(fill: mod.UIBgFill): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetBgFill(this._uiWidget, fill);
            return this;
        }

        /**
         * The depth of the element, or undefined if deleted.
         * @returns The depth of the element, or undefined.
         */
        public get depth(): mod.UIDepth | undefined {
            return this.getDepth();
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: mod.UIDepth) {
            this.setDepth(depth);
        }

        /**
         * Retrieves the depth of the element, or undefined if deleted.
         * @returns The depth of the element, or undefined.
         */
        public getDepth(): mod.UIDepth | undefined {
            return this._isDeletedCheck() ? undefined : mod.GetUIWidgetDepth(this._uiWidget);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         * @returns This element for chaining.
         */
        public setDepth(depth: mod.UIDepth): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetDepth(this._uiWidget, depth);
            return this;
        }

        /**
         * The anchor of the element, or undefined if deleted.
         * @returns The anchor of the element, or undefined.
         */
        public get anchor(): mod.UIAnchor | undefined {
            return this.getAnchor();
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: mod.UIAnchor) {
            this.setAnchor(anchor);
        }

        /**
         * Retrieves the anchor of the element, or undefined if deleted.
         * @returns The anchor of the element, or undefined.
         */
        public getAnchor(): mod.UIAnchor | undefined {
            return this._isDeletedCheck() ? undefined : mod.GetUIWidgetAnchor(this._uiWidget);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         * @returns This element for chaining.
         */
        public setAnchor(anchor: mod.UIAnchor): this {
            if (this._isDeletedCheck()) return this;

            mod.SetUIWidgetAnchor(this._uiWidget, anchor);
            return this;
        }

        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false if not, or undefined if deleted.
         */
        public get uiInputModeWhenVisible(): boolean | undefined {
            return this.getUiInputModeWhenVisible();
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        public set uiInputModeWhenVisible(newValue: boolean) {
            this.setUiInputModeWhenVisible(newValue);
        }

        /**
         * Retrieves whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false if not, or undefined if deleted.
         */
        public getUiInputModeWhenVisible(): boolean | undefined {
            return this._isDeletedCheck() ? undefined : _isUIInputModeWhenVisible(_flags[this._slot]);
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         * @returns This element for chaining.
         */
        public setUiInputModeWhenVisible(newValue: boolean): this {
            if (this._isDeletedCheck()) return this;

            const slot = this._slot;
            const isVisible = _isVisible(_flags[slot]);
            const hasInputMode = _hasInputMode(_flags[slot]);

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
    export const COLORS = {
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
    };

    /****** Button Event Handler ******/

    /**
     * Handles a button event with zero intermediate object allocations.
     * @param player - The player who triggered the button event.
     * @param widget - The widget that was triggered.
     * @param event - The button event.
     */
    function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        const name = mod.GetUIWidgetName(widget);
        const match = /^ui_(\d+)/.exec(name);
        const widgetId = match ? parseInt(match[1], 10) : NaN;

        if (isNaN(widgetId) || widgetId <= 0 || widgetId > MAX_WIDGETS) return;

        const slot = widgetId - 1;
        const btnSlot = _getButtonId(_flags[slot]);

        if (btnSlot === 0 || btnSlot > MAX_BUTTONS) {
            logging.log(`Button ${name} not found or slot unassigned`, LogLevel.Warning);
            return;
        }

        let handler: ButtonHandler | null = null;

        if (mod.Equals(event, mod.UIButtonEvent.ButtonUp)) {
            handler = _buttonOnClickUp[btnSlot];

            if (!handler) {
                logging.log(`Button ${name} has no onClickUp handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.ButtonDown)) {
            handler = _buttonOnClickDown[btnSlot];

            if (!handler) {
                logging.log(`Button ${name} has no onClickDown handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusIn)) {
            handler = _buttonOnFocusIn[btnSlot];

            if (!handler) {
                logging.log(`Button ${name} has no onFocusIn handler`, LogLevel.Warning);
                return;
            }
        } else if (mod.Equals(event, mod.UIButtonEvent.FocusOut)) {
            handler = _buttonOnFocusOut[btnSlot];

            if (!handler) {
                logging.log(`Button ${name} has no onFocusOut handler`, LogLevel.Warning);
                return;
            }
        }

        if (!handler) {
            logging.log('HoverIn and HoverOut button events not supported', LogLevel.Warning);
            return;
        }

        CallbackHandler.invoke(handler, player, undefined, undefined, undefined, logging, 'buttonEvent');
    }

    Events.OnPlayerUIButtonEvent.subscribe(handleButtonEvent);

    Events.OnPlayerLeaveGame.subscribe((player: mod.Player) => {
        PlayerReceiver.clear(mod.GetObjId(player));
    });
}
