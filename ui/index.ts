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

    /**
     * Maximum number of UI widgets supported simultaneously.
     */
    export const MAX_WIDGETS = 2048;

    /**
     * Maximum number of interactive UI buttons supported simultaneously.
     */
    export const MAX_BUTTONS = 512;

    /**
     * Sentinel value representing an invalid or uninitialized widget index.
     */
    export const INVALID_INDEX = -1;

    /**
     * Unique identifier for a UI widget.
     */
    export type WidgetID = number & { readonly __brand: 'WidgetID' };

    /**
     * Sentinel value representing an invalid widget ID.
     */
    export const INVALID_WIDGET_ID = -1 as WidgetID;

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

    // Intrusive free-list initialization for widgets (IDs start at 1; 0 is Root.instance)
    for (let i = 1; i < MAX_WIDGETS - 1; ++i) {
        _nextSibling[i] = i + 1;
    }
    _nextSibling[MAX_WIDGETS - 1] = INVALID_INDEX;

    _parents.fill(INVALID_INDEX);
    _firstChild.fill(INVALID_INDEX);
    _nativeWidgets.fill(null);
    _receivers.fill(null);
    _instances.fill(null);

    let _firstFree = 1;

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

    function _setFlag(index: number, flag: number): void {
        _flags[index] |= flag;
    }

    function _clearFlag(index: number, flag: number): void {
        _flags[index] &= ~flag;
    }

    function _getButtonId(flags: number): number {
        return (flags >> BUTTON_ID_SHIFT) & BUTTON_ID_MASK;
    }

    function _setButtonId(index: number, btnId: number): void {
        _flags[index] = (_flags[index] & FLAGS_MASK) | ((btnId & BUTTON_ID_MASK) << BUTTON_ID_SHIFT);
    }

    /****** Internal SoA Slot Allocators ******/

    function _allocateSlot(): number {
        if (_firstFree === INVALID_INDEX) {
            logging.log('UI widget pool full', LogLevel.Error);
            return INVALID_INDEX;
        }

        const index = _firstFree;
        _firstFree = _nextSibling[index];
        _nextSibling[index] = INVALID_INDEX;
        _firstChild[index] = INVALID_INDEX;
        _parents[index] = INVALID_INDEX;
        _flags[index] = FLAG_IN_USE;

        return index;
    }

    function _freeSlot(index: number): void {
        if (index <= 0 || index >= MAX_WIDGETS) return;

        _flags[index] = 0;
        _nativeWidgets[index] = null;
        _receivers[index] = null;
        _instances[index] = null;
        _parents[index] = INVALID_INDEX;
        _firstChild[index] = INVALID_INDEX;
        _x[index] = 0;
        _y[index] = 0;
        _width[index] = 0;
        _height[index] = 0;

        _nextSibling[index] = _firstFree;
        _firstFree = index;
    }

    function _allocateButtonSlot(widgetIndex: number): number {
        if (_firstFreeButton === INVALID_INDEX) {
            logging.log('UI button pool full', LogLevel.Error);
            return 0;
        }

        const slot = _firstFreeButton;
        _firstFreeButton = _buttonWidgetId[slot];
        _buttonWidgetId[slot] = widgetIndex;
        _buttonOnClickUp[slot] = null;
        _buttonOnClickDown[slot] = null;
        _buttonOnFocusIn[slot] = null;
        _buttonOnFocusOut[slot] = null;

        _setButtonId(widgetIndex, slot);

        return slot;
    }

    function _freeButtonSlot(widgetIndex: number): void {
        const slot = _getButtonId(_flags[widgetIndex]);

        if (slot === 0 || slot >= _buttonWidgetId.length) return;

        _buttonOnClickUp[slot] = null;
        _buttonOnClickDown[slot] = null;
        _buttonOnFocusIn[slot] = null;
        _buttonOnFocusOut[slot] = null;

        _buttonWidgetId[slot] = _firstFreeButton;
        _firstFreeButton = slot;

        _setButtonId(widgetIndex, 0);
    }

    function _attachChild(parentId: number, childId: number): void {
        if (parentId < 0 || parentId >= MAX_WIDGETS || childId < 0 || childId >= MAX_WIDGETS) return;

        _parents[childId] = parentId;
        _nextSibling[childId] = _firstChild[parentId];
        _firstChild[parentId] = childId;
    }

    function _detachChild(parentId: number, childId: number): void {
        if (parentId < 0 || parentId >= MAX_WIDGETS || childId < 0 || childId >= MAX_WIDGETS) return;

        if (_firstChild[parentId] === childId) {
            _firstChild[parentId] = _nextSibling[childId];
            _nextSibling[childId] = INVALID_INDEX;
            _parents[childId] = INVALID_INDEX;
            return;
        }

        let curr = _firstChild[parentId];

        while (curr !== INVALID_INDEX) {
            const next = _nextSibling[curr];

            if (next === childId) {
                _nextSibling[curr] = _nextSibling[childId];
                _nextSibling[childId] = INVALID_INDEX;
                _parents[childId] = INVALID_INDEX;
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
        onClickDown?: ButtonHandler;
        onClickUp?: ButtonHandler;
        onFocusIn?: ButtonHandler;
        onFocusOut?: ButtonHandler;
    };

    /**
     * The parent of an element.
     */
    export type Parent = {
        readonly id: number;
        readonly receiver: mod.Player | mod.Team | undefined;
        readonly children: readonly Element[];
        getChild(index: number): Element | undefined;
        forEachChild(callback: (child: Element, index: number) => void): void;
        attachChild(child: Element): void;
        detachChild(child: Element): void;
    };

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
        public static readonly instance = new GlobalReceiver();

        private constructor() {
            super(undefined);
        }
    }

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
         * The unique widget ID.
         * @returns The widget ID.
         */
        public get id(): number {
            return this._id;
        }

        /**
         * The underlying native Battlefield Portal UIWidget handle for this node.
         * @returns The native UIWidget handle.
         */
        protected get _uiWidget(): mod.UIWidget {
            return _nativeWidgets[this._id]!;
        }

        /**
         * The target audience receiver for the node (player or team, or undefined if global).
         * @returns The native receiver.
         */
        public get receiver(): mod.Player | mod.Team | undefined {
            return _receivers[this._id]?.nativeReceiver;
        }
    }

    /**
     * The root node. This is the root of the UI tree for the entire server.
     */
    export class Root extends Node implements Parent {
        /**
         * The singleton instance of the root node.
         */
        public static readonly instance = new Root();

        private constructor() {
            super(0);
            _flags[0] = FLAG_IN_USE | FLAG_VISIBLE;
            _parents[0] = INVALID_INDEX;
            _firstChild[0] = INVALID_INDEX;
            _nextSibling[0] = INVALID_INDEX;
            _receivers[0] = GlobalReceiver.instance;
        }

        /**
         * @inheritdoc
         */
        protected override get _uiWidget(): mod.UIWidget {
            if (!_nativeWidgets[0]) {
                _nativeWidgets[0] = mod.GetUIRoot();
            }

            return _nativeWidgets[0]!;
        }

        /**
         * Returns a snapshot array of direct child elements.
         * @returns Array of direct children.
         */
        public get children(): readonly Element[] {
            const list: Element[] = [];
            let curr = _firstChild[0];

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
         * @returns The child element, or undefined if out of bounds.
         */
        public getChild(index: number): Element | undefined {
            let curr = _firstChild[0];
            let idx = 0;

            while (curr !== INVALID_INDEX) {
                if (idx === index) return _instances[curr] ?? undefined;

                curr = _nextSibling[curr];
                idx++;
            }

            return undefined;
        }

        /**
         * Iterates over all direct child elements without allocating an intermediate array.
         * @param callback - Function invoked for each child.
         */
        public forEachChild(callback: (child: Element, index: number) => void): void {
            let curr = _firstChild[0];
            let idx = 0;

            while (curr !== INVALID_INDEX) {
                const next = _nextSibling[curr];
                const inst = _instances[curr];

                if (inst) {
                    CallbackHandler.invoke(callback, inst, idx++, undefined, undefined, logging);
                }

                curr = next;
            }
        }

        /**
         * Attaches a child to the root node.
         * @param child - The child to attach.
         */
        public attachChild(child: Element): void {
            if (child.id === INVALID_INDEX) return;

            _attachChild(0, child.id);
        }

        /**
         * Detaches a child from the root node.
         * @param child - The child to detach.
         */
        public detachChild(child: Element): void {
            if (child.id === INVALID_INDEX) return;

            _detachChild(0, child.id);
        }
    }

    /**
     * The base element class. All elements are nodes, and all nodes are UI widgets.
     */
    export abstract class Element extends Node {
        protected _name: string;

        /**
         * The constructor for an element.
         * @param id - The allocated slot index.
         * @param params - The parameters for the element.
         */
        public constructor(id: number, params: FinalElementParams) {
            super(id);
            this._name = params.name;

            _nativeWidgets[id] = mod.FindUIWidgetWithName(params.name) as mod.UIWidget;
            _receivers[id] = params.receiver;
            _instances[id] = this;

            _x[id] = params.x;
            _y[id] = params.y;
            _width[id] = params.width;
            _height[id] = params.height;

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

            _flags[id] = flags;

            _attachChild(params.parent.id, id);
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
            return id >= 0 && id < MAX_WIDGETS ? _firstChild[id] : INVALID_INDEX;
        }

        protected static _getNextSibling(id: number): number {
            return id >= 0 && id < MAX_WIDGETS ? _nextSibling[id] : INVALID_INDEX;
        }

        protected static _getInstance(id: number): Element | undefined {
            return id >= 0 && id < MAX_WIDGETS ? (_instances[id] ?? undefined) : undefined;
        }

        protected static _getNativeWidget(id: number): mod.UIWidget | undefined {
            return id >= 0 && id < MAX_WIDGETS ? (_nativeWidgets[id] ?? undefined) : undefined;
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
         * @returns The position.
         */
        protected static _getPosition(params: ElementParams): Position {
            return { x: params.x ?? params.position?.x ?? 0, y: params.y ?? params.position?.y ?? 0 };
        }

        /**
         * Gets the size from the parameters, given either width/height or size.
         * @param params - The parameters.
         * @returns The size.
         */
        protected static _getSize(params: ElementParams): Size {
            return {
                width: params.width ?? params.size?.width ?? 0,
                height: params.height ?? params.size?.height ?? 0,
            };
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
            if (!receiverParam) return _receivers[parent.id] ?? GlobalReceiver.instance;

            const parentReceiver = _receivers[parent.id];

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

            return GlobalReceiver.instance;
        }

        /****** Protected Button Slot Accessors for Subclasses ******/

        protected _allocateButtonSlot(): number {
            return _allocateButtonSlot(this._id);
        }

        protected _freeButtonSlot(): void {
            _freeButtonSlot(this._id);
        }

        protected _getButtonSlot(): number {
            return _getButtonId(_flags[this._id]);
        }

        protected _setButtonOnClickUp(slot: number, handler: ButtonHandler | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnClickUp[slot] = handler ?? null;
            }
        }

        protected _getButtonOnClickUp(slot: number): ButtonHandler | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnClickUp[slot] ?? undefined) : undefined;
        }

        protected _setButtonOnClickDown(slot: number, handler: ButtonHandler | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnClickDown[slot] = handler ?? null;
            }
        }

        protected _getButtonOnClickDown(slot: number): ButtonHandler | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnClickDown[slot] ?? undefined) : undefined;
        }

        protected _setButtonOnFocusIn(slot: number, handler: ButtonHandler | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnFocusIn[slot] = handler ?? null;
            }
        }

        protected _getButtonOnFocusIn(slot: number): ButtonHandler | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnFocusIn[slot] ?? undefined) : undefined;
        }

        protected _setButtonOnFocusOut(slot: number, handler: ButtonHandler | undefined): void {
            if (slot > 0 && slot <= MAX_BUTTONS) {
                _buttonOnFocusOut[slot] = handler ?? null;
            }
        }

        protected _getButtonOnFocusOut(slot: number): ButtonHandler | undefined {
            return slot > 0 && slot <= MAX_BUTTONS ? (_buttonOnFocusOut[slot] ?? undefined) : undefined;
        }

        protected _isDeletedCheck(): boolean {
            if (this._id === INVALID_INDEX) {
                logging.log(`Element ${this._name} already deleted`, LogLevel.Warning);
                return true;
            }

            return false;
        }

        /**
         * The parent of the element.
         * @returns The parent of the element.
         */
        public get parent(): Parent {
            const parentId = _parents[this._id];

            if (parentId === 0) return Root.instance;

            return (_instances[parentId] as unknown as Parent) ?? Root.instance;
        }

        /**
         * Sets the parent of the element.
         * @param parent - The parent to set.
         */
        public set parent(parent: Parent) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetParent(this._uiWidget, _nativeWidgets[parent.id]!);

            const oldParentId = _parents[this._id];

            if (oldParentId !== INVALID_INDEX) {
                _detachChild(oldParentId, this._id);
            }

            _attachChild(parent.id, this._id);
        }

        /**
         * Whether the element is visible.
         * @returns True if visible, false otherwise.
         */
        public get visible(): boolean {
            if (this._isDeletedCheck()) return false;

            return _isVisible(_flags[this._id]);
        }

        /**
         * Sets the visibility of the element.
         * @param visible - The visibility to set.
         */
        public set visible(visible: boolean) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetVisible(this._uiWidget, visible);

            if (visible) {
                _setFlag(this._id, FLAG_VISIBLE);
            } else {
                _clearFlag(this._id, FLAG_VISIBLE);
            }

            const flags = _flags[this._id];
            const uiInputModeWhenVisible = _isUIInputModeWhenVisible(flags);
            const hasInputMode = _hasInputMode(flags);

            if (!uiInputModeWhenVisible) return;

            if (visible && !hasInputMode) {
                _setFlag(this._id, FLAG_HAS_INPUT_MODE);
                _receivers[this._id]?.addInputModeRequester();
            } else if (!visible && hasInputMode) {
                _clearFlag(this._id, FLAG_HAS_INPUT_MODE);
                _receivers[this._id]?.removeInputModeRequester();
            }
        }

        /**
         * Whether the element is deleted.
         * @returns True if deleted, false otherwise.
         */
        public get deleted(): boolean {
            return this._id === INVALID_INDEX;
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
            if (!_isInUse(_flags[id])) return;

            // 1. Recursively delete all children
            let child = _firstChild[id];

            while (child !== INVALID_INDEX) {
                const next = _nextSibling[child];
                const childInstance = _instances[child];

                if (childInstance) {
                    childInstance.delete();
                } else {
                    this._deleteRecursive(child);
                }

                child = next;
            }

            // 2. Detach from parent
            const parentId = _parents[id];

            if (parentId !== INVALID_INDEX) {
                _detachChild(parentId, id);
            }

            // 3. Free button slot if allocated
            const flags = _flags[id];

            if (_getButtonId(flags) !== 0) {
                _freeButtonSlot(id);
            }

            // 4. Remove input mode requester if active
            if (_hasInputMode(flags)) {
                _receivers[id]?.removeInputModeRequester();
            }

            // 5. Delete native widget
            const nativeWidget = _nativeWidgets[id];

            if (nativeWidget) {
                mod.DeleteUIWidget(nativeWidget);
            }

            // 6. Free slot
            _freeSlot(id);
        }

        /**
         * The X position of the element.
         * @returns The X position of the element.
         */
        public get x(): number {
            return this._isDeletedCheck() ? 0 : _x[this._id];
        }

        /**
         * Sets the X position of the element.
         * @param x - The X position to set.
         */
        public set x(x: number) {
            if (this._isDeletedCheck()) return;

            _x[this._id] = x;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(x, _y[this._id], 0));
        }

        /**
         * The Y position of the element.
         * @returns The Y position of the element.
         */
        public get y(): number {
            return this._isDeletedCheck() ? 0 : _y[this._id];
        }

        /**
         * Sets the Y position of the element.
         * @param y - The Y position to set.
         */
        public set y(y: number) {
            if (this._isDeletedCheck()) return;

            _y[this._id] = y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(_x[this._id], y, 0));
        }

        /**
         * The position of the element.
         * @returns The position of the element.
         */
        public get position(): Position {
            return this._isDeletedCheck() ? { x: 0, y: 0 } : { x: _x[this._id], y: _y[this._id] };
        }

        /**
         * Sets the position of the element.
         * @param params - The position to set.
         */
        public set position(params: Position) {
            if (this._isDeletedCheck()) return;

            _x[this._id] = params.x;
            _y[this._id] = params.y;
            mod.SetUIWidgetPosition(this._uiWidget, mod.CreateVector(params.x, params.y, 0));
        }

        /**
         * The width of the element.
         * @returns The width of the element.
         */
        public get width(): number {
            return this._isDeletedCheck() ? 0 : _width[this._id];
        }

        /**
         * Sets the width of the element.
         * @param width - The width to set.
         */
        public set width(width: number) {
            if (this._isDeletedCheck()) return;

            _width[this._id] = width;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(width, _height[this._id], 0));
        }

        /**
         * The height of the element.
         * @returns The height of the element.
         */
        public get height(): number {
            return this._isDeletedCheck() ? 0 : _height[this._id];
        }

        /**
         * Sets the height of the element.
         * @param height - The height to set.
         */
        public set height(height: number) {
            if (this._isDeletedCheck()) return;

            _height[this._id] = height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(_width[this._id], height, 0));
        }

        /**
         * The size of the element.
         * @returns The size of the element.
         */
        public get size(): Size {
            return this._isDeletedCheck()
                ? { width: 0, height: 0 }
                : { width: _width[this._id], height: _height[this._id] };
        }

        /**
         * Sets the size of the element.
         * @param params - The size to set.
         */
        public set size(params: Size) {
            if (this._isDeletedCheck()) return;

            _width[this._id] = params.width;
            _height[this._id] = params.height;
            mod.SetUIWidgetSize(this._uiWidget, mod.CreateVector(params.width, params.height, 0));
        }

        /**
         * The background color of the element.
         * @returns The background color of the element.
         */
        public get bgColor(): mod.Vector {
            return this._isDeletedCheck() ? COLORS.WHITE : mod.GetUIWidgetBgColor(this._uiWidget);
        }

        /**
         * Sets the background color of the element.
         * @param color - The background color to set.
         */
        public set bgColor(color: mod.Vector) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgColor(this._uiWidget, color);
        }

        /**
         * The background alpha of the element.
         * @returns The background alpha of the element.
         */
        public get bgAlpha(): number {
            return this._isDeletedCheck() ? 0 : mod.GetUIWidgetBgAlpha(this._uiWidget);
        }

        /**
         * Sets the background alpha of the element.
         * @param alpha - The background alpha to set.
         */
        public set bgAlpha(alpha: number) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgAlpha(this._uiWidget, alpha);
        }

        /**
         * The background fill of the element.
         * @returns The background fill of the element.
         */
        public get bgFill(): mod.UIBgFill {
            return this._isDeletedCheck() ? mod.UIBgFill.None : mod.GetUIWidgetBgFill(this._uiWidget);
        }

        /**
         * Sets the background fill of the element.
         * @param fill - The background fill to set.
         */
        public set bgFill(fill: mod.UIBgFill) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetBgFill(this._uiWidget, fill);
        }

        /**
         * The depth of the element.
         * @returns The depth of the element.
         */
        public get depth(): mod.UIDepth {
            return this._isDeletedCheck() ? mod.UIDepth.AboveGameUI : mod.GetUIWidgetDepth(this._uiWidget);
        }

        /**
         * Sets the depth of the element.
         * @param depth - The depth to set.
         */
        public set depth(depth: mod.UIDepth) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetDepth(this._uiWidget, depth);
        }

        /**
         * The anchor of the element.
         * @returns The anchor of the element.
         */
        public get anchor(): mod.UIAnchor {
            return this._isDeletedCheck() ? mod.UIAnchor.Center : mod.GetUIWidgetAnchor(this._uiWidget);
        }

        /**
         * Sets the anchor of the element.
         * @param anchor - The anchor to set.
         */
        public set anchor(anchor: mod.UIAnchor) {
            if (this._isDeletedCheck()) return;

            mod.SetUIWidgetAnchor(this._uiWidget, anchor);
        }

        /**
         * Whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @returns True if UI input mode is requested when visible, false otherwise.
         */
        public get uiInputModeWhenVisible(): boolean {
            return this._isDeletedCheck() ? false : _isUIInputModeWhenVisible(_flags[this._id]);
        }

        /**
         * Sets whether the element will request UI input mode to be enabled for its receiver when it becomes visible.
         * @param newValue - The new value.
         */
        public set uiInputModeWhenVisible(newValue: boolean) {
            if (this._isDeletedCheck()) return;

            const isVisible = _isVisible(_flags[this._id]);
            const hasInputMode = _hasInputMode(_flags[this._id]);

            if (newValue) {
                _setFlag(this._id, FLAG_UI_INPUT_MODE_WHEN_VISIBLE);
            } else {
                _clearFlag(this._id, FLAG_UI_INPUT_MODE_WHEN_VISIBLE);
            }

            if (newValue && isVisible && !hasInputMode) {
                _setFlag(this._id, FLAG_HAS_INPUT_MODE);
                _receivers[this._id]?.addInputModeRequester();
            } else if ((!newValue || !isVisible) && hasInputMode) {
                _clearFlag(this._id, FLAG_HAS_INPUT_MODE);
                _receivers[this._id]?.removeInputModeRequester();
            }
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

    /**
     * The root node. This is the root of the UI tree and the default parent for all elements.
     */
    export const ROOT_NODE = Root.instance;

    /****** Button Event Handler ******/

    /**
     * Handles a button event with zero intermediate object allocations.
     * @param player - The player who triggered the button event.
     * @param widget - The widget that was triggered.
     * @param event - The button event.
     */
    function handleButtonEvent(player: mod.Player, widget: mod.UIWidget, event: mod.UIButtonEvent): void {
        const name = mod.GetUIWidgetName(widget);
        const widgetIndex = parseInt(name.slice(3), 10);

        if (isNaN(widgetIndex) || widgetIndex <= 0 || widgetIndex >= MAX_WIDGETS) return;

        const btnSlot = _getButtonId(_flags[widgetIndex]);

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

        CallbackHandler.invoke(handler, player, undefined, undefined, undefined, logging);
    }

    Events.OnPlayerUIButtonEvent.subscribe(handleButtonEvent);

    Events.OnPlayerLeaveGame.subscribe((player: mod.Player) => {
        PlayerReceiver.clear(mod.GetObjId(player));
    });
}
