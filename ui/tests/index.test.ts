import './mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
                textColor: mod.CreateVector(1, 1, 1),
                textDisabledColor: mod.CreateVector(0.5, 0.5, 0.5),
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
            expect(textButton.textColor).toEqual(mod.CreateVector(1, 1, 1));
            expect(content.textColor).toEqual(mod.CreateVector(1, 1, 1));

            // Toggle enabled state to disabled
            textButton.setEnabled(false);
            expect(textButton.enabled).toBe(false);
            expect(content.textColor).toEqual(mod.CreateVector(0.5, 0.5, 0.5));
            expect(textButton.textColor).toEqual(mod.CreateVector(1, 1, 1));
            expect(textButton.textDisabledColor).toEqual(mod.CreateVector(0.5, 0.5, 0.5));

            // Re-enable and verify original color is restored
            textButton.setEnabled(true);
            expect(textButton.enabled).toBe(true);
            expect(content.textColor).toEqual(mod.CreateVector(1, 1, 1));
            expect(textButton.textColor).toEqual(mod.CreateVector(1, 1, 1));

            // Resizing should cascade to content with padding deduction
            textButton.setWidth(300);
            expect(textButton.width).toBe(300);

            textButton.delete();
            expect(textButton.isDeleted).toBe(true);
        });

        it('should correctly restore text color and alpha across enable/disable cycles and property updates', () => {
            const enabledColor = mod.CreateVector(0.1, 0.2, 0.3);
            const disabledColor = mod.CreateVector(0.8, 0.8, 0.8);
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
            expect(textButton.textColor).toEqual(enabledColor);
            expect(textButton.textAlpha).toBe(0.9);
            expect(content.textColor).toEqual(enabledColor);
            expect(content.textAlpha).toBe(0.9);

            // Disable button
            textButton.enabled = false;
            expect(textButton.enabled).toBe(false);
            expect(content.textColor).toEqual(disabledColor);
            expect(content.textAlpha).toBe(0.4);
            expect(textButton.textColor).toEqual(enabledColor);
            expect(textButton.textAlpha).toBe(0.9);
            expect(textButton.textDisabledColor).toEqual(disabledColor);
            expect(textButton.textDisabledAlpha).toBe(0.4);

            // Mutate enabled text color while disabled
            const newEnabledColor = mod.CreateVector(0.4, 0.5, 0.6);
            textButton.textColor = newEnabledColor;
            textButton.textAlpha = 0.75;
            // Native widget should remain disabled
            expect(content.textColor).toEqual(disabledColor);
            expect(content.textAlpha).toBe(0.4);
            expect(textButton.textColor).toEqual(newEnabledColor);
            expect(textButton.textAlpha).toBe(0.75);

            // Re-enable button: new enabled colors should apply
            textButton.enabled = true;
            expect(textButton.enabled).toBe(true);
            expect(content.textColor).toEqual(newEnabledColor);
            expect(content.textAlpha).toBe(0.75);
            expect(textButton.textColor).toEqual(newEnabledColor);

            textButton.delete();
        });

        it('should handle UITextButton created with enabled: false initially', () => {
            const enabledColor = mod.CreateVector(0, 1, 0);
            const disabledColor = mod.CreateVector(0.3, 0.3, 0.3);
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
            expect(content.textColor).toEqual(disabledColor);
            expect(content.textAlpha).toBe(0.5);
            expect(textButton.textColor).toEqual(enabledColor);

            textButton.setEnabled(true);
            expect(textButton.enabled).toBe(true);
            expect(content.textColor).toEqual(enabledColor);
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
            const imageType = (mod.UIImageType as unknown as { Icon: mod.UIImageType }).Icon;
            const image = new UIImage({
                x: 0,
                y: 0,
                width: 32,
                height: 32,
                imageType,
                imageColor: mod.CreateVector(1, 1, 1),
                imageAlpha: 0.8,
            });
            expect(image.imageType).toBe(imageType);
            expect(image.imageAlpha).toBe(0.8);
            image.delete();

            const imageButton = new UIImageButton({
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                imageType,
                imageColor: mod.CreateVector(1, 0, 0),
                imageAlpha: 0.9,
                imageDisabledColor: mod.CreateVector(0.2, 0.2, 0.2),
                imageDisabledAlpha: 0.3,
                enabled: true,
            });

            const btnContent = imageButton.content!;
            expect(imageButton.imageType).toBe(imageType);
            expect(imageButton.imageColor).toEqual(mod.CreateVector(1, 0, 0));
            expect(imageButton.imageAlpha).toBe(0.9);
            expect(btnContent.imageColor).toEqual(mod.CreateVector(1, 0, 0));
            expect(btnContent.imageAlpha).toBe(0.9);

            // Toggle to disabled
            imageButton.setEnabled(false);
            expect(imageButton.enabled).toBe(false);
            expect(btnContent.imageColor).toEqual(mod.CreateVector(0.2, 0.2, 0.2));
            expect(btnContent.imageAlpha).toBe(0.3);
            expect(imageButton.imageColor).toEqual(mod.CreateVector(1, 0, 0));
            expect(imageButton.imageAlpha).toBe(0.9);
            expect(imageButton.imageDisabledColor).toEqual(mod.CreateVector(0.2, 0.2, 0.2));
            expect(imageButton.imageDisabledAlpha).toBe(0.3);

            // Re-enable and verify restored color
            imageButton.setEnabled(true);
            expect(imageButton.enabled).toBe(true);
            expect(btnContent.imageColor).toEqual(mod.CreateVector(1, 0, 0));
            expect(btnContent.imageAlpha).toBe(0.9);

            imageButton.setImageColor(mod.CreateVector(0, 1, 0));
            expect(imageButton.imageColor).toEqual(mod.CreateVector(0, 1, 0));
            expect(btnContent.imageColor).toEqual(mod.CreateVector(0, 1, 0));

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
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].enabled).toBe(true);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].receiver).toBe(playerA);

            // Player A leaves the game -> clears receiver cache
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
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].enabled).toBe(true);
            expect(mockInputModeCalls[mockInputModeCalls.length - 1].receiver).toBe(playerB);

            elemA.delete();
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
});
