import './mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Colors } from '../../colors/index.ts';
import { UI } from '../index.ts';
import { UIBaseButton } from '../components/base-button/index.ts';
import { UIContainer } from '../components/container/index.ts';
import { UIButton } from '../components/button/index.ts';
import { UIText } from '../components/text/index.ts';
import { UIImage } from '../components/image/index.ts';
import { UIWeaponImage } from '../components/weapon-image/index.ts';
import { UIGadgetImage } from '../components/gadget-image/index.ts';
import { UIContentButton } from '../components/content-button/index.ts';
import { UITextButton } from '../components/text-button/index.ts';
import { UIImageButton } from '../components/image-button/index.ts';
import { UIWeaponImageButton } from '../components/weapon-image-button/index.ts';
import { UIGadgetImageButton } from '../components/gadget-image-button/index.ts';
import { UIContainerButton } from '../components/container-button/index.ts';
import { Events } from '../../events/index.ts';
import { mockWidgets, mockInputModeCalls, resetMockState } from './mockMod.ts';

function getInternalId(element: UI.Element): number {
    return UI.Node._getId(element);
}

function getInternalNativeWidget(element: UI.Element): mod.UIWidget {
    return UI.Element._getNativeWidget(element)!;
}

describe('UI Module & Components Lifecycle Tests', () => {
    beforeEach(() => {
        resetMockState();
    });

    afterEach(() => {
        // Clean up root children
        for (const child of [...(UI.ROOT_NODE.children ?? [])]) {
            child.delete();
        }
    });

    describe('Basic Lifecycle & Slot Allocation', () => {
        it('should allocate generational slot IDs starting from 1 for elements', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const btn = new UIButton({ x: 10, y: 10, width: 50, height: 20 });

            expect(container.isDeleted).toBe(false);
            expect(container.isValid).toBe(true);
            expect(btn.isDeleted).toBe(false);
            expect(btn.isValid).toBe(true);

            container.delete();
            btn.delete();

            expect(container.isDeleted).toBe(true);
            expect(container.isValid).toBe(false);

            expect(btn.isDeleted).toBe(true);
            expect(btn.isValid).toBe(false);
        });

        it('should increment generations and reuse slots after deletion', () => {
            const el1 = new UIContainer({ x: 0, y: 0, width: 10, height: 10 });
            const id1 = getInternalId(el1);
            const slot1 = (id1 % 10000) - 1;
            const gen1 = Math.floor(id1 / 10000);

            expect(el1.isValid).toBe(true);
            expect(el1.isDeleted).toBe(false);

            el1.delete();
            expect(el1.isDeleted).toBe(true);
            expect(el1.isValid).toBe(false);

            const el2 = new UIContainer({ x: 0, y: 0, width: 10, height: 10 });
            const id2 = getInternalId(el2);
            const slot2 = (id2 % 10000) - 1;
            const gen2 = Math.floor(id2 / 10000);

            expect(slot2).toBe(slot1); // Reuses the same slot
            expect(gen2).toBe(gen1 + 1); // Incremented generation
            expect(el2.isValid).toBe(true);
            expect(el2.isDeleted).toBe(false);
            expect(el1.isDeleted).toBe(true); // Old generation instance remains deleted

            el2.delete();
            expect(el2.isDeleted).toBe(true);
            expect(el2.isValid).toBe(false);
        });

        it('should correctly handle node isDeleted and isValid for root node and elements', () => {
            expect(UI.ROOT_NODE.isDeleted).toBe(false); // Root node
            expect(UI.ROOT_NODE.isValid).toBe(true);
        });

        it('should accurately track active element and button counts', () => {
            const initialElements = UI.getActiveElementCount();
            const initialButtons = UIButton.getActiveButtonCount();

            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            expect(UI.getActiveElementCount()).toBe(initialElements + 1);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons);

            const btn = new UIButton({ x: 10, y: 10, width: 50, height: 20 });
            expect(UI.getActiveElementCount()).toBe(initialElements + 2);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons + 1);

            const txtBtn = new UITextButton({
                x: 0,
                y: 0,
                width: 100,
                height: 30,
                label: mod.Message(mod.stringkeys.labels.button1),
            });
            // UITextButton creates container (parent) + text (content) -> 2 UI.Elements and 1 button slot
            expect(UI.getActiveElementCount()).toBe(initialElements + 4);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons + 2);

            btn.delete();
            expect(UI.getActiveElementCount()).toBe(initialElements + 3);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons + 1);

            txtBtn.delete();
            expect(UI.getActiveElementCount()).toBe(initialElements + 1);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons);

            container.delete();
            expect(UI.getActiveElementCount()).toBe(initialElements);
            expect(UIButton.getActiveButtonCount()).toBe(initialButtons);
        });

        it('should return undefined for all property getters on deleted elements and ignore mutations without crashing', () => {
            const btn = new UIButton({ x: 0, y: 0, width: 100, height: 50 });
            btn.delete();

            // Mutating deleted element
            btn.x = 200;
            btn.y = 300;
            btn.width = 400;
            btn.height = 500;
            btn.visible = true;
            btn.enabled = false;
            btn.onClickUp = () => {};

            expect(btn.isDeleted).toBe(true);
            expect(btn.x).toBeUndefined();
            expect(btn.y).toBeUndefined();
            expect(btn.width).toBeUndefined();
            expect(btn.height).toBeUndefined();
            expect(btn.position).toBeUndefined();
            expect(btn.getPosition()).toBeUndefined();
            expect(btn.size).toBeUndefined();
            expect(btn.getSize()).toBeUndefined();
            expect(btn.visible).toBeUndefined();
            expect(btn.enabled).toBeUndefined();
            expect(btn.onClickUp).toBeUndefined();
            expect(btn.parent).toBeUndefined();
            expect(btn.receiver).toBeUndefined();
        });

        it('should return null for existing components with unset properties', () => {
            const globalElem = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const btn = new UIButton({ x: 10, y: 10, width: 50, height: 20 });

            // Global element has unset (global) receiver -> returns null
            expect(globalElem.receiver).toBeNull();

            // Button with unset handlers -> returns null
            expect(btn.onClickDown).toBeNull();
            expect(btn.onClickUp).toBeNull();
            expect(btn.onFocusIn).toBeNull();
            expect(btn.onFocusOut).toBeNull();

            // ROOT_NODE parent and receiver are null
            expect(UI.ROOT_NODE.parent).toBeNull();
            expect(UI.ROOT_NODE.receiver).toBeNull();

            globalElem.delete();
            btn.delete();
        });
    });

    describe('Singly-Linked LCRS Tree Hierarchy & Parent-Child Navigation', () => {
        it('should manage children in UIContainer and root node', () => {
            const parentContainer = new UIContainer({ x: 0, y: 0, width: 200, height: 200 });
            const polymorphicParent: UI.Parent = parentContainer;
            expect(parentContainer.children?.length).toBe(0);
            expect(parentContainer.childCount).toBe(0);
            expect(polymorphicParent.childCount).toBe(0);

            const child1 = new UIText({
                parent: parentContainer,
                label: mod.Message('child1'),
                x: 0,
                y: 0,
                width: 50,
                height: 20,
            });

            const child2 = new UIText({
                parent: parentContainer,
                label: mod.Message('child2'),
                x: 0,
                y: 20,
                width: 50,
                height: 20,
            });

            expect(parentContainer.children?.length).toBe(2);
            expect(parentContainer.childCount).toBe(2);
            expect(polymorphicParent.childCount).toBe(2);
            expect(parentContainer.getChild(0)).toBe(child2); // Prepend order
            expect(parentContainer.getChild(1)).toBe(child1);
            expect(parentContainer.getChild(99)).toBeNull(); // Out of bounds returns null
            expect(parentContainer.getChild(-1)).toBeNull();

            const visited: UI.Element[] = [];
            parentContainer.forEachChild((child, index) => {
                visited.push(child);
                expect(index).toBe(visited.length - 1);
            });

            expect(visited.length).toBe(2);
            expect(visited[0]).toBe(child2);
            expect(visited[1]).toBe(child1);

            parentContainer.delete();
            expect(child1.isDeleted).toBe(true);
            expect(child2.isDeleted).toBe(true);
            expect(parentContainer.children).toBeUndefined();
            expect(parentContainer.childCount).toBeUndefined();
            expect(parentContainer.getChild(0)).toBeUndefined();
            expect(polymorphicParent.childCount).toBeUndefined();
        });

        it('should properly reparent elements when setting parent property and chaining with setParent', () => {
            const containerA = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const containerB = new UIContainer({ x: 100, y: 0, width: 100, height: 100 });

            const child = new UIText({
                parent: containerA,
                label: mod.Message('test'),
                x: 0,
                y: 0,
                width: 50,
                height: 20,
            });

            expect(containerA.children?.length).toBe(1);
            expect(containerB.children?.length).toBe(0);
            expect(child.parent).toBe(containerA);

            child.setParent(containerB);

            expect(containerA.children?.length).toBe(0);
            expect(containerB.children?.length).toBe(1);
            expect(child.parent).toBe(containerB);

            containerA.delete();
            containerB.delete();
        });

        it('should correctly resolve native root widget when defaulting parent to UI.ROOT_NODE and reparenting', () => {
            // Constructing with default parent (UI.ROOT_NODE)
            const rootElement = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            expect(rootElement.parent).toBe(UI.ROOT_NODE);
            expect(UI.ROOT_NODE.children).toContain(rootElement);
            expect(UI.ROOT_NODE.childCount).toBeGreaterThanOrEqual(1);

            const nativeMock = mockWidgets.get(`ui_${getInternalId(rootElement)}`);
            expect(nativeMock).toBeDefined();
            expect(nativeMock?.parent).toBeDefined();
            expect(nativeMock?.parent?.name).toBe('ui_root');

            // Reparent to a child container, then back to UI.ROOT_NODE
            const childContainer = new UIContainer({ parent: rootElement, x: 0, y: 0, width: 50, height: 50 });
            const subChild = new UIText({ parent: childContainer, label: mod.Message('test') });
            expect(subChild.parent).toBe(childContainer);

            // Reparent back to root
            subChild.parent = UI.ROOT_NODE;
            expect(subChild.parent).toBe(UI.ROOT_NODE);
            UI.flush();
            expect(mockWidgets.get(`ui_${getInternalId(subChild)}`)?.parent?.name).toBe('ui_root');

            rootElement.delete();
            subChild.delete();
        });

        it('should correctly unlink middle, first, and last children in LCRS sibling chains', () => {
            const parent = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });

            const c1 = new UIContainer({ parent, x: 0, y: 0, width: 10, height: 10 });
            const c2 = new UIContainer({ parent, x: 0, y: 0, width: 10, height: 10 });
            const c3 = new UIContainer({ parent, x: 0, y: 0, width: 10, height: 10 });

            // Order of children head-to-tail: [c3, c2, c1]
            expect(parent.children).toEqual([c3, c2, c1]);

            // Unlink middle (c2)
            c2.delete();
            expect(parent.children).toEqual([c3, c1]);

            // Unlink first (c3)
            c3.delete();
            expect(parent.children).toEqual([c1]);

            // Unlink last (c1)
            c1.delete();
            expect(parent.children).toEqual([]);

            parent.delete();
        });

        it('should return an invalid element without throwing when constructing with an invalid/deleted parent', () => {
            const parent = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            parent.delete();
            expect(parent.isValid).toBe(false);

            const invalidText = new UIText({ parent, label: mod.Message('test') });
            expect(invalidText.isValid).toBe(false);
            expect(invalidText.id).toBe(UI.Node._INVALID_INDEX);
            expect(invalidText.parent).toBeUndefined();

            const invalidContainer = new UIContainer({ parent, x: 0, y: 0, width: 10, height: 10 });
            expect(invalidContainer.isValid).toBe(false);
            expect(invalidContainer.id).toBe(UI.Node._INVALID_INDEX);

            const invalidImage = new UIImage({ parent, imageType: UI.ImageType.CrownOutline, width: 10, height: 10 });
            expect(invalidImage.isValid).toBe(false);

            const invalidButton = new UIButton({ parent, width: 10, height: 10 });
            expect(invalidButton.isValid).toBe(false);

            const invalidTextBtn = new UITextButton({ parent, label: mod.Message('test'), width: 10, height: 10 });
            expect(invalidTextBtn.isValid).toBe(false);

            const invalidImageBtn = new UIImageButton({
                parent,
                imageType: UI.ImageType.CrownOutline,
                width: 10,
                height: 10,
            });
            expect(invalidImageBtn.isValid).toBe(false);

            const invalidContainerBtn = new UIContainerButton({ parent, width: 10, height: 10 });
            expect(invalidContainerBtn.isValid).toBe(false);

            const invalidGadgetImg = new UIGadgetImage({ parent, gadget: mod.Gadgets.Medkit, width: 10, height: 10 });
            expect(invalidGadgetImg.isValid).toBe(false);

            const invalidWeaponImg = new UIWeaponImage({ parent, weapon: mod.Weapons.M5A3, width: 10, height: 10 });
            expect(invalidWeaponImg.isValid).toBe(false);
        });
    });

    describe('Coordinate & Dimension Caching and Zero Allocation Out Arguments', () => {
        it('should cache and update x, y, width, height, position, size with properties and setters', () => {
            const container = new UIContainer({ x: 15, y: 25, width: 150, height: 75 });

            expect(container.x).toBe(15);
            expect(container.y).toBe(25);
            expect(container.width).toBe(150);
            expect(container.height).toBe(75);
            expect(container.position).toEqual({ x: 15, y: 25 });
            expect(container.size).toEqual({ width: 150, height: 75 });

            // Zero allocation position query
            const scratchPos: UI.Position = { x: 0, y: 0 };
            const returnedPos = container.getPosition(scratchPos);
            expect(returnedPos).toBe(scratchPos);
            expect(scratchPos).toEqual({ x: 15, y: 25 });

            // Zero allocation size query
            const scratchSize: UI.Size = { width: 0, height: 0 };
            const returnedSize = container.getSize(scratchSize);
            expect(returnedSize).toBe(scratchSize);
            expect(scratchSize).toEqual({ width: 150, height: 75 });

            container.setX(30);
            expect(container.x).toBe(30);
            expect(container.position).toEqual({ x: 30, y: 25 });

            container.setY(40);
            expect(container.y).toBe(40);
            expect(container.position).toEqual({ x: 30, y: 40 });

            container.setPosition({ x: 100, y: 200 });
            expect(container.x).toBe(100);
            expect(container.y).toBe(200);

            container.setWidth(300);
            expect(container.width).toBe(300);

            container.setHeight(400);
            expect(container.height).toBe(400);

            container.setSize({ width: 500, height: 600 });
            expect(container.width).toBe(500);
            expect(container.height).toBe(600);

            container.delete();
        });
    });

    describe('Interactive Buttons & Event Dispatch', () => {
        it('should allocate button slots and route native button events via Events', () => {
            const clickUpSpy = vi.fn();
            const clickDownSpy = vi.fn();
            const focusInSpy = vi.fn();
            const focusOutSpy = vi.fn();

            const button = new UIButton({
                x: 0,
                y: 0,
                width: 100,
                height: 40,
                onClickUp: clickUpSpy,
                onClickDown: clickDownSpy,
                onFocusIn: focusInSpy,
                onFocusOut: focusOutSpy,
            });

            expect(button.onClickDown).toBe(clickDownSpy);
            expect(button.onClickUp).toBe(clickUpSpy);
            expect(button.onFocusIn).toBe(focusInSpy);
            expect(button.onFocusOut).toBe(focusOutSpy);

            const fakePlayer = { _id: 42, _type: 1 } as unknown as mod.Player;
            const nativeWidget = getInternalNativeWidget(button);

            // Trigger events through the central Events channel
            Events.OnPlayerUIButtonEvent.trigger(fakePlayer, nativeWidget, mod.UIButtonEvent.ButtonDown);
            expect(clickDownSpy).toHaveBeenCalledTimes(1);
            expect(clickDownSpy).toHaveBeenCalledWith(fakePlayer, undefined, undefined, undefined);

            Events.OnPlayerUIButtonEvent.trigger(fakePlayer, nativeWidget, mod.UIButtonEvent.ButtonUp);
            expect(clickUpSpy).toHaveBeenCalledTimes(1);

            Events.OnPlayerUIButtonEvent.trigger(fakePlayer, nativeWidget, mod.UIButtonEvent.FocusIn);
            expect(focusInSpy).toHaveBeenCalledTimes(1);

            Events.OnPlayerUIButtonEvent.trigger(fakePlayer, nativeWidget, mod.UIButtonEvent.FocusOut);
            expect(focusOutSpy).toHaveBeenCalledTimes(1);

            button.delete();
        });
    });

    describe('Composite Buttons & Specialized Components', () => {
        it('should construct UITextButton with padding, synchronize disabled styling, and dispatch events', () => {
            const clickSpy = vi.fn();
            const textButton = new UITextButton({
                x: 0,
                y: 0,
                width: 200,
                height: 50,
                padding: 5,
                label: mod.Message('Click Me'),
                textSize: 24,
                textColor: { r: 1, g: 1, b: 1 },
                textDisabledColor: { r: 0.5, g: 0.5, b: 0.5 },
                enabled: true,
                onClickUp: clickSpy,
            });

            expect(textButton.enabled).toBe(true);
            expect(textButton.padding).toBe(5);
            expect(textButton.label).toEqual(mod.Message('Click Me'));

            // Verify event dispatch via _b button widget
            const fakePlayer = { _id: 10, _type: 1 } as unknown as mod.Player;
            const containerNative = getInternalNativeWidget(textButton);
            const nativeBtnWidget = mod.FindUIWidgetWithName(`${mod.GetUIWidgetName(containerNative)}_b`);
            Events.OnPlayerUIButtonEvent.trigger(fakePlayer, nativeBtnWidget, mod.UIButtonEvent.ButtonUp);
            expect(clickSpy).toHaveBeenCalledTimes(1);

            // Verify initial enabled colors
            const content = textButton.content!;
            expect(Colors.equals(textButton.textColor!, { r: 1, g: 1, b: 1 }, 0.005)).toBe(true);
            expect(Colors.equals(content.textColor!, { r: 1, g: 1, b: 1 }, 0.005)).toBe(true);

            // Toggle enabled state to disabled
            textButton.setEnabled(false);
            expect(textButton.enabled).toBe(false);
            expect(Colors.equals(content.textColor!, { r: 0.5, g: 0.5, b: 0.5 }, 0.005)).toBe(true);
            expect(Colors.equals(textButton.textColor!, { r: 1, g: 1, b: 1 }, 0.005)).toBe(true);
            expect(Colors.equals(textButton.textDisabledColor!, { r: 0.5, g: 0.5, b: 0.5 }, 0.005)).toBe(true);

            // Re-enable and verify original color is restored
            textButton.setEnabled(true);
            expect(textButton.enabled).toBe(true);
            expect(Colors.equals(content.textColor!, { r: 1, g: 1, b: 1 }, 0.005)).toBe(true);
            expect(Colors.equals(textButton.textColor!, { r: 1, g: 1, b: 1 }, 0.005)).toBe(true);

            // Resizing should cascade to content with padding deduction
            textButton.setWidth(300);
            expect(textButton.width).toBe(300);

            textButton.delete();
            expect(textButton.isDeleted).toBe(true);
        });

        it('should correctly restore text color and alpha across enable/disable cycles and property updates', () => {
            const enabledColor = { r: 0.1, g: 0.2, b: 0.3 };
            const disabledColor = { r: 0.8, g: 0.8, b: 0.8 };
            const textButton = new UITextButton({
                x: 0,
                y: 0,
                width: 100,
                height: 40,
                label: mod.Message('Test'),
                textColor: enabledColor,
                textAlpha: 0.9,
                textDisabledColor: disabledColor,
                textDisabledAlpha: 0.4,
                enabled: true,
            });

            const content = textButton.content!;
            expect(Colors.equals(textButton.textColor!, enabledColor, 0.005)).toBe(true);
            expect(textButton.textAlpha).toBeCloseTo(0.9, 2);
            expect(Colors.equals(content.textColor!, enabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBeCloseTo(0.9, 2);

            // Disable button
            textButton.enabled = false;
            expect(textButton.enabled).toBe(false);
            expect(Colors.equals(content.textColor!, disabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBeCloseTo(0.4, 2);
            expect(Colors.equals(textButton.textColor!, enabledColor, 0.005)).toBe(true);
            expect(textButton.textAlpha).toBeCloseTo(0.9, 2);
            expect(Colors.equals(textButton.textDisabledColor!, disabledColor, 0.005)).toBe(true);
            expect(textButton.textDisabledAlpha).toBeCloseTo(0.4, 2);

            // Mutate enabled text color while disabled
            const newEnabledColor = { r: 0.4, g: 0.5, b: 0.6 };
            textButton.textColor = newEnabledColor;
            textButton.textAlpha = 0.75;
            // Native widget should remain disabled
            expect(Colors.equals(content.textColor!, disabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBeCloseTo(0.4, 2);
            expect(Colors.equals(textButton.textColor!, newEnabledColor, 0.005)).toBe(true);
            expect(textButton.textAlpha).toBeCloseTo(0.75, 2);

            // Re-enable button: new enabled colors should apply
            textButton.enabled = true;
            expect(textButton.enabled).toBe(true);
            expect(Colors.equals(content.textColor!, newEnabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBeCloseTo(0.75, 2);
            expect(Colors.equals(textButton.textColor!, newEnabledColor, 0.005)).toBe(true);

            textButton.delete();
        });

        it('should handle UITextButton created with enabled: false initially', () => {
            const enabledColor = { r: 0, g: 1, b: 0 };
            const disabledColor = { r: 0.3, g: 0.3, b: 0.3 };
            const textButton = new UITextButton({
                x: 0,
                y: 0,
                width: 100,
                height: 40,
                label: mod.Message('Init Disabled'),
                textColor: enabledColor,
                textAlpha: 1,
                textDisabledColor: disabledColor,
                textDisabledAlpha: 0.5,
                enabled: false,
            });

            const content = textButton.content!;
            expect(textButton.enabled).toBe(false);
            expect(Colors.equals(content.textColor!, disabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBeCloseTo(0.5, 2);
            expect(Colors.equals(textButton.textColor!, enabledColor, 0.005)).toBe(true);

            textButton.setEnabled(true);
            expect(textButton.enabled).toBe(true);
            expect(Colors.equals(content.textColor!, enabledColor, 0.005)).toBe(true);
            expect(content.textAlpha).toBe(1);

            textButton.delete();
        });

        it('should provide _ScratchParent with childCount 0 during UIContentButton content creation', () => {
            let scratchChildCount: number | undefined;

            class CustomContentButton extends UIContentButton<UIText> {
                public constructor() {
                    super({ x: 0, y: 0, width: 100, height: 50 }, (parent, width, height) => {
                        scratchChildCount = parent.childCount;
                        return new UIText({ parent, width, height, label: mod.Message('test') });
                    });
                }
            }

            const btn = new CustomContentButton();
            expect(scratchChildCount).toBe(0);
            btn.delete();
        });

        it('should construct UIImage and UIImageButton and update image properties', () => {
            const imageType = UI.ImageType.CrownOutline;
            const image = new UIImage({
                x: 0,
                y: 0,
                width: 32,
                height: 32,
                imageType,
                imageColor: { r: 1, g: 1, b: 1 },
                imageAlpha: 0.8,
            });
            expect(image.imageType).toBe(imageType);
            expect(image.imageAlpha).toBeCloseTo(0.8, 2);
            image.delete();

            const imageButton = new UIImageButton({
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                imageType,
                imageColor: { r: 1, g: 0, b: 0 },
                imageAlpha: 0.9,
                imageDisabledColor: { r: 0.2, g: 0.2, b: 0.2 },
                imageDisabledAlpha: 0.3,
                enabled: true,
            });

            const btnContent = imageButton.content!;
            expect(imageButton.imageType).toBe(imageType);
            expect(Colors.equals(imageButton.imageColor!, { r: 1, g: 0, b: 0 }, 0.005)).toBe(true);
            expect(imageButton.imageAlpha).toBeCloseTo(0.9, 2);
            expect(Colors.equals(btnContent.imageColor!, { r: 1, g: 0, b: 0 }, 0.005)).toBe(true);
            expect(btnContent.imageAlpha).toBeCloseTo(0.9, 2);

            // Toggle to disabled
            imageButton.setEnabled(false);
            expect(imageButton.enabled).toBe(false);
            expect(Colors.equals(btnContent.imageColor!, { r: 0.2, g: 0.2, b: 0.2 }, 0.005)).toBe(true);
            expect(btnContent.imageAlpha).toBeCloseTo(0.3, 2);
            expect(Colors.equals(imageButton.imageColor!, { r: 1, g: 0, b: 0 }, 0.005)).toBe(true);
            expect(imageButton.imageAlpha).toBeCloseTo(0.9, 2);
            expect(Colors.equals(imageButton.imageDisabledColor!, { r: 0.2, g: 0.2, b: 0.2 }, 0.005)).toBe(true);
            expect(imageButton.imageDisabledAlpha).toBeCloseTo(0.3, 2);

            // Re-enable and verify restored color
            imageButton.setEnabled(true);
            expect(imageButton.enabled).toBe(true);
            expect(Colors.equals(btnContent.imageColor!, { r: 1, g: 0, b: 0 }, 0.005)).toBe(true);
            expect(btnContent.imageAlpha).toBeCloseTo(0.9, 2);

            imageButton.setImageColor({ r: 0, g: 1, b: 0 });
            expect(Colors.equals(imageButton.imageColor!, { r: 0, g: 1, b: 0 }, 0.005)).toBe(true);
            expect(Colors.equals(btnContent.imageColor!, { r: 0, g: 1, b: 0 }, 0.005)).toBe(true);

            imageButton.delete();
            expect(imageButton.isDeleted).toBe(true);
        });

        it('should construct UIWeaponImage, UIGadgetImage, and UIContainerButton', () => {
            const ak24 = (mod.Weapons as unknown as { AK24: mod.Weapons }).AK24;
            const m5a3 = (mod.Weapons as unknown as { M5A3: mod.Weapons }).M5A3;
            const medkit = (mod.Gadgets as unknown as { Medkit: mod.Gadgets }).Medkit;

            const weaponImage = new UIWeaponImage({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                weapon: ak24,
            });
            expect(weaponImage.weapon).toBe(ak24);
            weaponImage.delete();

            const gadgetImage = new UIGadgetImage({
                x: 0,
                y: 0,
                width: 50,
                height: 50,
                gadget: medkit,
            });
            expect(gadgetImage.gadget).toBe(medkit);
            gadgetImage.delete();

            const weaponBtn = new UIWeaponImageButton({
                x: 0,
                y: 0,
                width: 120,
                height: 60,
                weapon: m5a3,
            });
            expect(weaponBtn.weapon).toBe(m5a3);
            weaponBtn.delete();

            const gadgetBtn = new UIGadgetImageButton({
                x: 0,
                y: 0,
                width: 80,
                height: 80,
                gadget: medkit,
            });
            expect(gadgetBtn.gadget).toBe(medkit);
            gadgetBtn.delete();

            const containerBtn = new UIContainerButton({
                x: 0,
                y: 0,
                width: 200,
                height: 100,
            });
            expect(containerBtn.innerContainer).toBeDefined();

            const innerChild = new UIText({
                parent: containerBtn.innerContainer,
                label: mod.Message('Inner Text'),
            });
            expect(containerBtn.innerContainer?.children?.length).toBe(1);
            expect(containerBtn.innerContainer?.children?.[0]).toBe(innerChild);

            containerBtn.delete();
            expect(containerBtn.isDeleted).toBe(true);
            expect(innerChild.isDeleted).toBe(true);
        });

        it('should enforce UIWeaponImage sub-pool limit and slot reuse', () => {
            const ak24 = (mod.Weapons as unknown as { AK24: mod.Weapons }).AK24;
            const weapons: UIWeaponImage[] = [];

            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(0);

            for (let i = 0; i < UIWeaponImage.MAX_WEAPON_IMAGES; ++i) {
                weapons.push(
                    new UIWeaponImage({
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 50,
                        weapon: ak24,
                    })
                );
            }

            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(UIWeaponImage.MAX_WEAPON_IMAGES);

            // Pool full -> next weapon image should fail and delete itself
            const overflow = new UIWeaponImage({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                weapon: ak24,
            });
            expect(overflow.isDeleted).toBe(true);
            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(UIWeaponImage.MAX_WEAPON_IMAGES);

            // Free a slot
            weapons[0].delete();
            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(UIWeaponImage.MAX_WEAPON_IMAGES - 1);

            // Reuse freed slot
            const replacement = new UIWeaponImage({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                weapon: ak24,
            });
            expect(replacement.isDeleted).toBe(false);
            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(UIWeaponImage.MAX_WEAPON_IMAGES);

            // Cleanup
            replacement.delete();
            for (let i = 1; i < weapons.length; ++i) {
                weapons[i].delete();
            }
            expect(UIWeaponImage.getActiveWeaponImageCount()).toBe(0);
        });

        it('should enforce UIGadgetImage sub-pool limit and slot reuse', () => {
            const medkit = (mod.Gadgets as unknown as { Medkit: mod.Gadgets }).Medkit;
            const gadgets: UIGadgetImage[] = [];

            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(0);

            for (let i = 0; i < UIGadgetImage.MAX_GADGET_IMAGES; ++i) {
                gadgets.push(
                    new UIGadgetImage({
                        x: 0,
                        y: 0,
                        width: 50,
                        height: 50,
                        gadget: medkit,
                    })
                );
            }

            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(UIGadgetImage.MAX_GADGET_IMAGES);

            // Pool full -> next gadget image should fail and delete itself
            const overflow = new UIGadgetImage({
                x: 0,
                y: 0,
                width: 50,
                height: 50,
                gadget: medkit,
            });
            expect(overflow.isDeleted).toBe(true);
            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(UIGadgetImage.MAX_GADGET_IMAGES);

            // Free a slot
            gadgets[0].delete();
            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(UIGadgetImage.MAX_GADGET_IMAGES - 1);

            // Reuse freed slot
            const replacement = new UIGadgetImage({
                x: 0,
                y: 0,
                width: 50,
                height: 50,
                gadget: medkit,
            });
            expect(replacement.isDeleted).toBe(false);
            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(UIGadgetImage.MAX_GADGET_IMAGES);

            // Cleanup
            replacement.delete();
            for (let i = 1; i < gadgets.length; ++i) {
                gadgets[i].delete();
            }
            expect(UIGadgetImage.getActiveGadgetImageCount()).toBe(0);
        });
    });

    describe('UI Input Mode Automatic Reference Counting', () => {
        it('should enable and disable input mode when visibility changes on requesters', () => {
            const menu = new UIContainer({
                x: 0,
                y: 0,
                width: 300,
                height: 300,
                visible: true,
                uiInputModeWhenVisible: true,
            });

            expect(mockInputModeCalls.length).toBe(1);
            expect(mockInputModeCalls[0].enabled).toBe(true);

            menu.setVisible(false);
            expect(mockInputModeCalls.length).toBe(2);
            expect(mockInputModeCalls[1].enabled).toBe(false);

            menu.setVisible(true);
            expect(mockInputModeCalls.length).toBe(3);
            expect(mockInputModeCalls[2].enabled).toBe(true);

            menu.delete();
            expect(mockInputModeCalls.length).toBe(4);
            expect(mockInputModeCalls[3].enabled).toBe(false);
        });
    });

    describe('Receiver Resolution & Native Handle Exposure', () => {
        it('should correctly expose native receivers and inherit from parent', () => {
            const fakePlayer = { _id: 10, _type: 1 } as unknown as mod.Player;
            const fakeTeam = { _id: 2, _type: 2 } as unknown as mod.Team;

            const globalElem = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            expect(globalElem.receiver).toBeNull();

            const playerElem = new UIContainer({
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                receiver: fakePlayer,
            });
            expect(playerElem.receiver).toBe(fakePlayer);

            const teamElem = new UIContainer({
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                receiver: fakeTeam,
            });
            expect(teamElem.receiver).toBe(fakeTeam);

            // Inherited receiver from parent
            const childElem = new UIText({
                parent: playerElem,
                label: mod.Message('child'),
            });
            expect(childElem.receiver).toBe(fakePlayer);

            globalElem.delete();
            playerElem.delete();
            teamElem.delete();
        });

        it('should replace receiver and reset state when player ID is recycled or player leaves', () => {
            const playerA = { _id: 5, _type: 1, name: 'PlayerA' } as unknown as mod.Player;
            const playerB = { _id: 5, _type: 1, name: 'PlayerB' } as unknown as mod.Player;

            const elemA = new UIContainer({
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                receiver: playerA,
                visible: true,
                uiInputModeWhenVisible: true,
            });

            expect(elemA.receiver).toBe(playerA);
            expect(mockInputModeCalls.length).toBe(1);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].enabled).toBe(true);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].receiver).toBe(playerA);

            // Player A leaves the game -> clears receiver cache for player ID 5
            Events.OnPlayerLeaveGame.trigger(5);

            // A new element for playerA (or player with recycled ID 5) should get a fresh receiver instance.
            // With a fresh instance, adding an input mode requester will transition count from 0 -> 1 and call EnableUIInputMode again.
            const elemA2 = new UIContainer({
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                receiver: playerA,
                visible: true,
                uiInputModeWhenVisible: true,
            });

            expect(elemA2.receiver).toBe(playerA);
            expect(mockInputModeCalls.length).toBe(2);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].enabled).toBe(true);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].receiver).toBe(playerA);

            // Player leaves again
            Events.OnPlayerLeaveGame.trigger(5);

            // Player B connects and is assigned the recycled ID 5
            const elemB = new UIContainer({
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                receiver: playerB,
                visible: true,
                uiInputModeWhenVisible: true,
            });

            expect(elemB.receiver).toBe(playerB);
            expect(mockInputModeCalls.length).toBe(3);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].enabled).toBe(true);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].receiver).toBe(playerB);

            elemA.delete();
            elemA2.delete();
            elemB.delete();
        });

        it('should track active button count, recycle button slots with generations, and handle button slot lifecycle', () => {
            const initialCount = UIBaseButton.getActiveButtonCount();
            expect(initialCount).toBe(0);

            const btn = new UIButton({ x: 0, y: 0, width: 100, height: 50 });
            expect(btn instanceof UIBaseButton).toBe(true);
            expect(UIBaseButton.getActiveButtonCount()).toBe(1);

            const textBtn = new UITextButton({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                label: mod.Message('Test'),
            });
            expect(textBtn instanceof UIBaseButton).toBe(true);
            expect(UIBaseButton.getActiveButtonCount()).toBe(2);

            btn.delete();
            expect(UIBaseButton.getActiveButtonCount()).toBe(1);

            textBtn.delete();
            expect(UIBaseButton.getActiveButtonCount()).toBe(0);
        });

        it('should throw an error when attempting to add a widget with a non-container parent in mock engine', () => {
            const nonContainer = {
                _id: 999,
                name: 'fake_button',
                visible: true,
                position: { x: 0, y: 0, z: 0 },
                size: { x: 100, y: 50, z: 0 },
                bgColor: { x: 1, y: 1, z: 1 },
                bgAlpha: 1,
                bgFill: 0,
                depth: 0,
                anchor: 0,
                padding: 0,
                eventsEnabled: {},
                isContainer: false,
            };

            expect(() => {
                mod.AddUIText(
                    'test_text',
                    mod.CreateVector(0, 0, 0),
                    mod.CreateVector(100, 50, 0),
                    mod.UIAnchor.Center,
                    nonContainer as unknown as mod.UIWidget,
                    true,
                    0,
                    mod.CreateVector(1, 1, 1),
                    1,
                    mod.UIBgFill.None,
                    mod.Message('Err'),
                    24,
                    mod.CreateVector(0, 0, 0),
                    1,
                    mod.UIAnchor.Center,
                    mod.UIDepth.AboveGameUI
                );
            }).toThrow('Parent widget must be a UIContainer');
        });

        it('should throw an error when attempting to call EnableUIButtonEvent on a non-button widget', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const containerWidget = getInternalNativeWidget(container);

            expect(() => {
                mod.EnableUIButtonEvent(containerWidget, mod.UIButtonEvent.ButtonUp, true);
            }).toThrow('Widget must be a UIButton to enable button events');

            container.delete();
        });
    });

    describe('Dirty Property Tracking & Tick-End Deferred FFI Flushing', () => {
        it('should coalesce multiple position changes into a single SetUIWidgetPosition call on flush', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            UI.flush();

            const spy = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetPosition'
            );
            spy.mockClear();

            container.x = 10;
            container.y = 20;
            container.setX(30);
            container.setPosition({ x: 40, y: 50 });

            // In-memory getters immediately reflect latest values
            expect(container.x).toBe(40);
            expect(container.y).toBe(50);
            expect(container.position).toEqual({ x: 40, y: 50 });
            // No FFI calls made yet
            expect(spy).not.toHaveBeenCalled();

            // Flush commits once
            UI.flush();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(getInternalNativeWidget(container), { x: 40, y: 50, z: 0 });

            // Subsequent flush does nothing
            UI.flush();
            expect(spy).toHaveBeenCalledTimes(1);

            container.delete();
            spy.mockRestore();
        });

        it('should delta-check properties and avoid dirty marking if values are identical', () => {
            const container = new UIContainer({
                x: 10,
                y: 20,
                width: 100,
                height: 50,
                bgColor: Colors.RED,
                bgAlpha: 0.5,
            });
            UI.flush();

            const spyPos = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetPosition'
            );
            const spySize = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetSize'
            );
            const spyBgColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgColor'
            );
            const spyBgAlpha = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgAlpha'
            );

            spyPos.mockClear();
            spySize.mockClear();
            spyBgColor.mockClear();
            spyBgAlpha.mockClear();

            // Set to identical values
            container.x = 10;
            container.y = 20;
            container.width = 100;
            container.height = 50;
            container.bgColor = Colors.RED;
            container.bgAlpha = 0.5;

            UI.flush();

            expect(spyPos).not.toHaveBeenCalled();
            expect(spySize).not.toHaveBeenCalled();
            expect(spyBgColor).not.toHaveBeenCalled();
            expect(spyBgAlpha).not.toHaveBeenCalled();

            container.delete();
            spyPos.mockRestore();
            spySize.mockRestore();
            spyBgColor.mockRestore();
            spyBgAlpha.mockRestore();
        });

        it('should coalesce multiple size, background, anchor, depth, visibility, and parent changes', () => {
            const root1 = new UIContainer({ x: 0, y: 0, width: 200, height: 200 });
            const root2 = new UIContainer({ x: 0, y: 0, width: 200, height: 200 });
            const child = new UIContainer({ parent: root1, x: 0, y: 0, width: 50, height: 50 });
            UI.flush();

            const spyParent = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetParent'
            );
            const spyVis = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetVisible'
            );
            const spySize = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetSize'
            );
            const spyBgFill = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgFill'
            );
            const spyDepth = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetDepth'
            );
            const spyAnchor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetAnchor'
            );

            child.parent = root2;
            child.parent = root1;
            child.parent = root2;

            child.visible = false;
            child.visible = true;
            child.visible = false;

            child.width = 60;
            child.height = 70;
            child.setSize({ width: 80, height: 90 });

            child.bgFill = mod.UIBgFill.GradientBottom;
            child.bgFill = mod.UIBgFill.Blur;

            child.depth = mod.UIDepth.BelowGameUI;
            child.anchor = mod.UIAnchor.BottomRight;

            expect(child.parent).toBe(root2);
            expect(child.visible).toBe(false);
            expect(child.width).toBe(80);
            expect(child.height).toBe(90);
            expect(child.bgFill).toBe(mod.UIBgFill.Blur);
            expect(child.depth).toBe(mod.UIDepth.BelowGameUI);
            expect(child.anchor).toBe(mod.UIAnchor.BottomRight);

            expect(spyParent).not.toHaveBeenCalled();
            expect(spyVis).not.toHaveBeenCalled();
            expect(spySize).not.toHaveBeenCalled();
            expect(spyBgFill).not.toHaveBeenCalled();
            expect(spyDepth).not.toHaveBeenCalled();
            expect(spyAnchor).not.toHaveBeenCalled();

            UI.flush();

            expect(spyParent).toHaveBeenCalledTimes(1);
            expect(spyVis).toHaveBeenCalledTimes(1);
            expect(spySize).toHaveBeenCalledTimes(1);
            expect(spyBgFill).toHaveBeenCalledTimes(1);
            expect(spyDepth).toHaveBeenCalledTimes(1);
            expect(spyAnchor).toHaveBeenCalledTimes(1);

            root1.delete();
            root2.delete();
            child.delete();
            spyParent.mockRestore();
            spyVis.mockRestore();
            spySize.mockRestore();
            spyBgFill.mockRestore();
            spyDepth.mockRestore();
            spyAnchor.mockRestore();
        });

        it('should coalesce component-specific dirty properties for UIText', () => {
            const text = new UIText({
                label: mod.Message('Hello'),
                textSize: 20,
                textColor: Colors.WHITE,
                textAlpha: 1,
                padding: 5,
            });
            UI.flush();

            const spySize = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUITextSize'
            );
            const spyColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUITextColor'
            );
            const spyAlpha = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUITextAlpha'
            );
            const spyPadding = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetPadding'
            );

            text.textSize = 24;
            text.textSize = 32;

            text.textColor = Colors.RED;
            text.textColor = Colors.GREEN;

            text.textAlpha = 0.8;
            text.textAlpha = 0.5;

            text.padding = 10;
            text.padding = 15;

            expect(text.textSize).toBe(32);
            expect(text.textColor).toEqual(Colors.GREEN);
            expect(text.textAlpha).toBeCloseTo(0.5, 2);
            expect(text.padding).toBe(15);

            expect(spySize).not.toHaveBeenCalled();
            expect(spyColor).not.toHaveBeenCalled();
            expect(spyAlpha).not.toHaveBeenCalled();
            expect(spyPadding).not.toHaveBeenCalled();

            UI.flush();

            expect(spySize).toHaveBeenCalledTimes(1);
            expect(spySize).toHaveBeenCalledWith(getInternalNativeWidget(text), 32);

            expect(spyColor).toHaveBeenCalledTimes(1);
            expect(spyAlpha).toHaveBeenCalledTimes(1);
            expect(spyPadding).toHaveBeenCalledTimes(1);
            expect(spyPadding).toHaveBeenCalledWith(getInternalNativeWidget(text), 15);

            text.delete();
            spySize.mockRestore();
            spyColor.mockRestore();
            spyAlpha.mockRestore();
            spyPadding.mockRestore();
        });

        it('should coalesce component-specific dirty properties for UIImage', () => {
            const img = new UIImage({
                imageType: mod.UIImageType.CrownOutline,
                imageColor: Colors.WHITE,
                imageAlpha: 1,
            });
            UI.flush();

            const spyType = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIImageType'
            );
            const spyColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIImageColor'
            );
            const spyAlpha = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIImageAlpha'
            );

            img.imageType = mod.UIImageType.SpawnBeacon;
            img.imageType = mod.UIImageType.CrownSolid;

            img.imageColor = Colors.BLUE;
            img.imageColor = Colors.YELLOW;

            img.imageAlpha = 0.7;
            img.imageAlpha = 0.4;

            expect(img.imageType).toBe(mod.UIImageType.CrownSolid);
            expect(img.imageColor).toEqual(Colors.YELLOW);
            expect(img.imageAlpha).toBeCloseTo(0.4, 2);

            expect(spyType).not.toHaveBeenCalled();
            expect(spyColor).not.toHaveBeenCalled();
            expect(spyAlpha).not.toHaveBeenCalled();

            UI.flush();

            expect(spyType).toHaveBeenCalledTimes(1);
            expect(spyType).toHaveBeenCalledWith(getInternalNativeWidget(img), mod.UIImageType.CrownSolid);
            expect(spyColor).toHaveBeenCalledTimes(1);
            expect(spyAlpha).toHaveBeenCalledTimes(1);

            img.delete();
            spyType.mockRestore();
            spyColor.mockRestore();
            spyAlpha.mockRestore();
        });

        it('should coalesce button styling and enabled state in UIBaseButton', () => {
            const btn = new UIButton({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                enabled: true,
                disabledColor: Colors.RED,
                disabledAlpha: 0.5,
            });
            UI.flush();

            const spyEnabled = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIButtonEnabled'
            );
            const spyDisColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIButtonColorDisabled'
            );
            const spyDisAlpha = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIButtonAlphaDisabled'
            );

            btn.enabled = false;
            btn.enabled = true;
            btn.enabled = false;

            btn.disabledColor = Colors.BLUE;
            btn.disabledAlpha = 0.2;

            expect(btn.enabled).toBe(false);
            expect(btn.disabledColor).toEqual(Colors.BLUE);
            expect(btn.disabledAlpha).toBeCloseTo(0.2, 2);

            expect(spyEnabled).not.toHaveBeenCalled();
            expect(spyDisColor).not.toHaveBeenCalled();
            expect(spyDisAlpha).not.toHaveBeenCalled();

            UI.flush();

            expect(spyEnabled).toHaveBeenCalledTimes(1);
            expect(spyEnabled).toHaveBeenCalledWith(getInternalNativeWidget(btn), false);
            expect(spyDisColor).toHaveBeenCalledTimes(1);
            expect(spyDisAlpha).toHaveBeenCalledTimes(1);

            btn.delete();
            spyEnabled.mockRestore();
            spyDisColor.mockRestore();
            spyDisAlpha.mockRestore();
        });

        it('should coalesce inner button size updates in UIContainerButton', () => {
            const contentBtn = new UIContainerButton({
                x: 0,
                y: 0,
                width: 100,
                height: 60,
                padding: 10,
            });
            UI.flush();

            const innerBtnWidget = mockWidgets.get(`ui_${getInternalId(contentBtn)}_b`);
            expect(innerBtnWidget).toBeDefined();
            expect(innerBtnWidget?.size).toEqual({ x: 100, y: 60, z: 0 });

            const spySize = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetSize'
            );
            spySize.mockClear();

            contentBtn.padding = 5;
            contentBtn.setSize({ width: 200, height: 100 });

            // In memory
            expect(contentBtn.width).toBe(200);
            expect(contentBtn.height).toBe(100);

            expect(spySize).not.toHaveBeenCalled();

            UI.flush();

            // spySize should have been called for contentBtn (200x100), innerBtn (200x100), and innerContainer (190x90)
            expect(spySize).toHaveBeenCalledTimes(3);
            expect(innerBtnWidget?.size).toEqual({ x: 200, y: 100, z: 0 });
            expect(contentBtn.innerContainer?.width).toBe(190);
            expect(contentBtn.innerContainer?.height).toBe(90);

            contentBtn.delete();
            spySize.mockRestore();
        });

        it('should cancel dirty updates when an element is deleted before flush', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            UI.flush();

            const spyPos = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetPosition'
            );
            const spySize = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetSize'
            );
            const spyBgColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgColor'
            );

            spyPos.mockClear();
            spySize.mockClear();
            spyBgColor.mockClear();

            container.setPosition({ x: 50, y: 50 });
            container.setSize({ width: 200, height: 200 });
            container.bgColor = Colors.RED;

            // Delete before flush
            container.delete();

            UI.flush();

            expect(spyPos).not.toHaveBeenCalled();
            expect(spySize).not.toHaveBeenCalled();
            expect(spyBgColor).not.toHaveBeenCalled();

            spyPos.mockRestore();
            spySize.mockRestore();
            spyBgColor.mockRestore();
        });

        it('should automatically flush dirty state when Events.OnTickEnd triggers at tick-end', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            UI.flush();

            const spyPos = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetPosition'
            );
            spyPos.mockClear();

            container.setPosition({ x: 123, y: 456 });
            expect(spyPos).not.toHaveBeenCalled();

            // Trigger OnTickEnd tick
            Events.OnTickEnd.trigger();

            // Dirty state should have been automatically flushed
            expect(spyPos).toHaveBeenCalledTimes(1);
            expect(spyPos).toHaveBeenCalledWith(getInternalNativeWidget(container), { x: 123, y: 456, z: 0 });

            container.delete();
            spyPos.mockRestore();
        });

        it('should correctly initialize and reflect component default bgAlpha and bgFill', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const button = new UIButton({ x: 10, y: 10, width: 50, height: 20 });
            const textButton = new UITextButton({ x: 20, y: 20, width: 60, height: 30, text: 'Click' });

            // UIContainer defaults to bgAlpha: 0 and bgFill: None
            expect(container.bgAlpha).toBe(0);
            expect(container.bgFill).toBe(UI.BgFill.None);

            // UIButton defaults to bgAlpha: 1 and bgFill: Solid
            expect(button.bgAlpha).toBe(1);
            expect(button.bgFill).toBe(UI.BgFill.Solid);

            // UITextButton (content button) defaults to bgAlpha: 1 and bgFill: Solid
            expect(textButton.bgAlpha).toBe(1);
            expect(textButton.bgFill).toBe(UI.BgFill.Solid);

            container.delete();
            button.delete();
            textButton.delete();
        });

        it('should flush bgAlpha, bgFill, and bgColor to inner button widget in UIContentButton', () => {
            const textButton = new UITextButton({ x: 0, y: 0, width: 100, height: 40, text: 'Test' });
            UI.flush();

            const innerBtnWidget = mockWidgets.get(`ui_${getInternalId(textButton)}_b`);
            expect(innerBtnWidget).toBeDefined();

            const spyBgColor = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgColor'
            );
            const spyBgAlpha = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgAlpha'
            );
            const spyBgFill = vi.spyOn(
                mod as unknown as Record<string, (...args: unknown[]) => unknown>,
                'SetUIWidgetBgFill'
            );

            spyBgColor.mockClear();
            spyBgAlpha.mockClear();
            spyBgFill.mockClear();

            textButton.setBgColor(Colors.RED);
            textButton.setBgAlpha(0.75);
            textButton.setBgFill(UI.BgFill.Blur);

            expect(textButton.bgAlpha).toBeCloseTo(0.75, 2);
            expect(textButton.bgFill).toBe(UI.BgFill.Blur);
            expect(textButton.bgColor).toEqual(Colors.RED);

            UI.flush();

            // Should update both outer container (via UI.flush base loop) and inner button widget (via _handleFlush)
            expect(spyBgColor).toHaveBeenCalledTimes(2);
            expect(spyBgAlpha).toHaveBeenCalledTimes(2);
            expect(spyBgFill).toHaveBeenCalledTimes(2);

            expect(innerBtnWidget?.bgAlpha).toBeCloseTo(0.75, 2);
            expect(innerBtnWidget?.bgFill).toBe(UI.BgFill.Blur);
            expect(innerBtnWidget?.bgColor).toEqual({ x: 1, y: 0, z: 0 });

            textButton.delete();
            spyBgColor.mockRestore();
            spyBgAlpha.mockRestore();
            spyBgFill.mockRestore();
        });
    });
});
