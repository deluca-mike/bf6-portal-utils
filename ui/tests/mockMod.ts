export interface MockVector {
    x: number;
    y: number;
    z: number;
}

export interface MockWidget {
    _id: number;
    name: string;
    parent?: MockWidget;
    visible: boolean;
    position: MockVector;
    size: MockVector;
    bgColor: MockVector;
    bgAlpha: number;
    bgFill: number;
    depth: number;
    anchor: number;
    padding: number;
    enabled?: boolean;
    baseColor?: MockVector;
    baseAlpha?: number;
    disabledColor?: MockVector;
    disabledAlpha?: number;
    pressedColor?: MockVector;
    pressedAlpha?: number;
    focusedColor?: MockVector;
    focusedAlpha?: number;
    message?: unknown;
    textSize?: number;
    textColor?: MockVector;
    textAlpha?: number;
    textAnchor?: number;
    imageType?: number;
    imageColor?: MockVector;
    imageAlpha?: number;
    eventsEnabled: Record<number, boolean>;
    deleted?: boolean;
}

export const mockWidgets = new Map<string, MockWidget>();
export const mockInputModeCalls: Array<{ enabled: boolean; receiver?: unknown }> = [];

export const mockRootWidget: MockWidget = {
    _id: 0,
    name: 'ui_0',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    size: { x: 1920, y: 1080, z: 0 },
    bgColor: { x: 0, y: 0, z: 0 },
    bgAlpha: 0,
    bgFill: 0,
    depth: 0,
    anchor: 0,
    padding: 0,
    eventsEnabled: {},
};

mockWidgets.set('ui_0', mockRootWidget);

/**
 * Resets the mocked UI state for test isolation.
 */
export function resetMockState(): void {
    mockWidgets.clear();
    mockWidgets.set('ui_0', mockRootWidget);
    mockInputModeCalls.length = 0;
}

const mockMod: Record<string, unknown> = {
    GetUIRoot: () => mockRootWidget,
    FindUIWidgetWithName: (name: string): MockWidget => {
        let w = mockWidgets.get(name);
        if (!w) {
            w = {
                _id: parseInt(name.replace('ui_', ''), 10) || 0,
                name,
                visible: true,
                position: { x: 0, y: 0, z: 0 },
                size: { x: 0, y: 0, z: 0 },
                bgColor: { x: 1, y: 1, z: 1 },
                bgAlpha: 0,
                bgFill: 0,
                depth: 0,
                anchor: 0,
                padding: 0,
                eventsEnabled: {},
            };
            mockWidgets.set(name, w);
        }
        return w;
    },
    AddUIContainer: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        parent: MockWidget,
        visible: boolean,
        padding: number,
        bgColor: MockVector,
        bgAlpha: number,
        bgFill: number,
        depth: number
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible,
            padding,
            bgColor,
            bgAlpha,
            bgFill,
            depth,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    AddUIButton: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        parent: MockWidget,
        visible: boolean,
        padding: number,
        bgColor: MockVector,
        bgAlpha: number,
        bgFill: number,
        enabled: boolean,
        baseColor: MockVector,
        baseAlpha: number,
        disabledColor: MockVector,
        disabledAlpha: number,
        pressedColor: MockVector,
        pressedAlpha: number,
        focusedColor: MockVector,
        focusedAlpha: number,
        focusedColor2: MockVector,
        focusedAlpha2: number,
        depth: number
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible,
            padding,
            bgColor,
            bgAlpha,
            bgFill,
            enabled,
            baseColor,
            baseAlpha,
            disabledColor,
            disabledAlpha,
            pressedColor,
            pressedAlpha,
            focusedColor,
            focusedAlpha,
            depth,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    AddUIText: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        parent: MockWidget,
        visible: boolean,
        padding: number,
        bgColor: MockVector,
        bgAlpha: number,
        bgFill: number,
        message: unknown,
        textSize: number,
        textColor: MockVector,
        textAlpha: number,
        textAnchor: number,
        depth: number
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible,
            padding,
            bgColor,
            bgAlpha,
            bgFill,
            message,
            textSize,
            textColor,
            textAlpha,
            textAnchor,
            depth,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    AddUIImage: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        parent: MockWidget,
        visible: boolean,
        padding: number,
        bgColor: MockVector,
        bgAlpha: number,
        bgFill: number,
        imageType: number,
        imageColor: MockVector,
        imageAlpha: number,
        depth: number
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible,
            padding,
            bgColor,
            bgAlpha,
            bgFill,
            imageType,
            imageColor,
            imageAlpha,
            depth,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    AddUIGadgetImage: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        _gadget: number,
        parent: MockWidget
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible: true,
            padding: 0,
            bgColor: { x: 1, y: 1, z: 1 },
            bgAlpha: 0,
            bgFill: 0,
            depth: 0,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    AddUIWeaponImage: (
        name: string,
        pos: MockVector,
        size: MockVector,
        anchor: number,
        _weapon: number,
        parent: MockWidget,
        _pkg: unknown
    ): MockWidget => {
        const w: MockWidget = {
            _id: parseInt(name.replace('ui_', ''), 10) || 0,
            name,
            position: pos,
            size,
            anchor,
            parent,
            visible: true,
            padding: 0,
            bgColor: { x: 1, y: 1, z: 1 },
            bgAlpha: 0,
            bgFill: 0,
            depth: 0,
            eventsEnabled: {},
        };
        mockWidgets.set(name, w);
        return w;
    },
    DeleteUIWidget: (widget: MockWidget) => {
        widget.deleted = true;
        mockWidgets.delete(widget.name);
    },
    SetUIWidgetParent: (widget: MockWidget, parent: MockWidget) => {
        widget.parent = parent;
    },
    SetUIWidgetVisible: (widget: MockWidget, visible: boolean) => {
        widget.visible = visible;
    },
    SetUIWidgetPosition: (widget: MockWidget, pos: MockVector) => {
        widget.position = pos;
    },
    SetUIWidgetSize: (widget: MockWidget, size: MockVector) => {
        widget.size = size;
    },
    SetUIWidgetBgColor: (widget: MockWidget, color: MockVector) => {
        widget.bgColor = color;
    },
    SetUIWidgetBgAlpha: (widget: MockWidget, alpha: number) => {
        widget.bgAlpha = alpha;
    },
    SetUIWidgetBgFill: (widget: MockWidget, fill: number) => {
        widget.bgFill = fill;
    },
    SetUIWidgetDepth: (widget: MockWidget, depth: number) => {
        widget.depth = depth;
    },
    SetUIWidgetAnchor: (widget: MockWidget, anchor: number) => {
        widget.anchor = anchor;
    },
    SetUIWidgetPadding: (widget: MockWidget, padding: number) => {
        widget.padding = padding;
    },
    GetUIWidgetName: (widget: MockWidget) => widget.name,
    GetUIWidgetBgColor: (widget: MockWidget) => widget.bgColor,
    GetUIWidgetBgAlpha: (widget: MockWidget) => widget.bgAlpha,
    GetUIWidgetBgFill: (widget: MockWidget) => widget.bgFill,
    GetUIWidgetDepth: (widget: MockWidget) => widget.depth,
    GetUIWidgetAnchor: (widget: MockWidget) => widget.anchor,
    GetUIWidgetPadding: (widget: MockWidget) => widget.padding,
    SetUIButtonEnabled: (widget: MockWidget, enabled: boolean) => {
        widget.enabled = enabled;
    },
    GetUIButtonEnabled: (widget: MockWidget) => widget.enabled ?? true,
    SetUIButtonColorBase: (widget: MockWidget, color: MockVector) => {
        widget.baseColor = color;
    },
    GetUIButtonColorBase: (widget: MockWidget) => widget.baseColor ?? { x: 1, y: 1, z: 1 },
    SetUIButtonAlphaBase: (widget: MockWidget, alpha: number) => {
        widget.baseAlpha = alpha;
    },
    GetUIButtonAlphaBase: (widget: MockWidget) => widget.baseAlpha ?? 1,
    SetUIButtonColorDisabled: (widget: MockWidget, color: MockVector) => {
        widget.disabledColor = color;
    },
    GetUIButtonColorDisabled: (widget: MockWidget) => widget.disabledColor ?? { x: 1, y: 1, z: 1 },
    SetUIButtonAlphaDisabled: (widget: MockWidget, alpha: number) => {
        widget.disabledAlpha = alpha;
    },
    GetUIButtonAlphaDisabled: (widget: MockWidget) => widget.disabledAlpha ?? 1,
    SetUIButtonColorPressed: (widget: MockWidget, color: MockVector) => {
        widget.pressedColor = color;
    },
    GetUIButtonColorPressed: (widget: MockWidget) => widget.pressedColor ?? { x: 1, y: 1, z: 1 },
    SetUIButtonAlphaPressed: (widget: MockWidget, alpha: number) => {
        widget.pressedAlpha = alpha;
    },
    GetUIButtonAlphaPressed: (widget: MockWidget) => widget.pressedAlpha ?? 1,
    SetUIButtonColorFocused: (widget: MockWidget, color: MockVector) => {
        widget.focusedColor = color;
    },
    GetUIButtonColorFocused: (widget: MockWidget) => widget.focusedColor ?? { x: 1, y: 1, z: 1 },
    SetUIButtonAlphaFocused: (widget: MockWidget, alpha: number) => {
        widget.focusedAlpha = alpha;
    },
    GetUIButtonAlphaFocused: (widget: MockWidget) => widget.focusedAlpha ?? 1,
    EnableUIButtonEvent: (widget: MockWidget, event: number, enabled: boolean) => {
        widget.eventsEnabled[event] = enabled;
    },
    SetUITextLabel: (widget: MockWidget, message: unknown) => {
        widget.message = message;
    },
    SetUITextAlpha: (widget: MockWidget, alpha: number) => {
        widget.textAlpha = alpha;
    },
    GetUITextAlpha: (widget: MockWidget) => widget.textAlpha ?? 1,
    SetUITextColor: (widget: MockWidget, color: MockVector) => {
        widget.textColor = color;
    },
    GetUITextColor: (widget: MockWidget) => widget.textColor ?? { x: 0, y: 0, z: 0 },
    SetUITextSize: (widget: MockWidget, size: number) => {
        widget.textSize = size;
    },
    GetUITextSize: (widget: MockWidget) => widget.textSize ?? 36,
    SetUITextAnchor: (widget: MockWidget, anchor: number) => {
        widget.textAnchor = anchor;
    },
    GetUITextAnchor: (widget: MockWidget) => widget.textAnchor ?? 0,
    SetUIImageType: (widget: MockWidget, type: number) => {
        widget.imageType = type;
    },
    GetUIImageType: (widget: MockWidget) => widget.imageType ?? 0,
    SetUIImageAlpha: (widget: MockWidget, alpha: number) => {
        widget.imageAlpha = alpha;
    },
    GetUIImageAlpha: (widget: MockWidget) => widget.imageAlpha ?? 1,
    SetUIImageColor: (widget: MockWidget, color: MockVector) => {
        widget.imageColor = color;
    },
    GetUIImageColor: (widget: MockWidget) => widget.imageColor ?? { x: 1, y: 1, z: 1 },
    CreateVector: (x: number, y: number, z: number): MockVector => ({ x, y, z }),
    CreateNewWeaponPackage: () => ({}),
    EnableUIInputMode: (enabled: boolean, receiver?: unknown) => {
        mockInputModeCalls.push({ enabled, receiver });
    },
    GetObjId: (obj: { _id?: number }) => obj?._id ?? 1,
    IsType: (obj: { _type?: number }, type: number) => obj?._type === type,
    Equals: (a: unknown, b: unknown) => a === b,
    Message: (content: unknown) => ({ content }),
    UIAnchor: {
        Center: 0,
        TopLeft: 1,
        TopCenter: 2,
        TopRight: 3,
        CenterLeft: 4,
        CenterRight: 5,
        BottomLeft: 6,
        BottomCenter: 7,
        BottomRight: 8,
    },
    UIBgFill: {
        None: 0,
        Solid: 1,
    },
    UIDepth: {
        BehindGameUI: 0,
        GameUI: 1,
        AboveGameUI: 2,
    },
    UIButtonEvent: {
        ButtonDown: 0,
        ButtonUp: 1,
        FocusIn: 2,
        FocusOut: 3,
    },
    UIImageType: {
        None: 0,
        Icon: 1,
    },
    Weapons: {
        M5A3: 1,
        AK24: 2,
    },
    Gadgets: {
        Medkit: 1,
    },
    Types: {
        Player: 1,
        Team: 2,
    },
    stringkeys: {
        labels: {
            hello: 'hello',
            clickMe: 'clickMe',
        },
    },
};

(globalThis as unknown as { mod: Record<string, unknown> }).mod = mockMod;
