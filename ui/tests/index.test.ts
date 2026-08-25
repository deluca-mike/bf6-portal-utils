import './mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UI } from '../index.ts';
import { UIContainer } from '../components/container/index.ts';
import { UIButton } from '../components/button/index.ts';
import { UIText } from '../components/text/index.ts';
import { UIImage } from '../components/image/index.ts';
import { UIWeaponImage } from '../components/weapon-image/index.ts';
import { UIGadgetImage } from '../components/gadget-image/index.ts';
import { UITextButton } from '../components/text-button/index.ts';
import { UIImageButton } from '../components/image-button/index.ts';
import { UIWeaponImageButton } from '../components/weapon-image-button/index.ts';
import { UIGadgetImageButton } from '../components/gadget-image-button/index.ts';
import { UIContainerButton } from '../components/container-button/index.ts';
import { Events } from '../../events/index.ts';
import { mockWidgets, mockInputModeCalls, resetMockState } from './mockMod.ts';

describe('UI Module & Components Lifecycle Tests', () => {
    beforeEach(() => {
        resetMockState();
    });

    afterEach(() => {
        // Clean up root children
        for (const child of [...UI.ROOT_NODE.children]) {
            child.delete();
        }
    });

    describe('Basic Lifecycle & Slot Allocation', () => {
        it('should allocate sequential slot IDs starting from 1 for elements', () => {
            const container = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const btn = new UIButton({ x: 10, y: 10, width: 50, height: 20 });

            expect(container.id).toBeGreaterThanOrEqual(1);
            expect(btn.id).toBeGreaterThanOrEqual(1);
            expect(container.id).not.toBe(btn.id);
            expect(container.deleted).toBe(false);
            expect(btn.deleted).toBe(false);

            container.delete();
            btn.delete();

            expect(container.deleted).toBe(true);
            expect(container.id).toBe(UI.INVALID_INDEX);
            expect(btn.deleted).toBe(true);
            expect(btn.id).toBe(UI.INVALID_INDEX);
        });

        it('should reuse slots after deletion via the free list', () => {
            const el1 = new UIContainer({ x: 0, y: 0, width: 10, height: 10 });
            const slot1 = el1.id;

            el1.delete();

            const el2 = new UIContainer({ x: 0, y: 0, width: 10, height: 10 });
            expect(el2.id).toBe(slot1);

            el2.delete();
        });

        it('should ignore mutations on deleted elements without crashing', () => {
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

            expect(btn.deleted).toBe(true);
            expect(btn.x).toBe(0);
            expect(btn.y).toBe(0);
            expect(btn.visible).toBe(false);
            expect(btn.enabled).toBe(false);
            expect(btn.onClickUp).toBeUndefined();
        });
    });

    describe('Singly-Linked LCRS Tree Hierarchy & Parent-Child Navigation', () => {
        it('should manage children in UIContainer and root node', () => {
            const parentContainer = new UIContainer({ x: 0, y: 0, width: 200, height: 200 });
            expect(parentContainer.children.length).toBe(0);

            const child1 = new UIText({
                parent: parentContainer,
                message: mod.Message('child1'),
                x: 0,
                y: 0,
                width: 50,
                height: 20,
            });

            const child2 = new UIText({
                parent: parentContainer,
                message: mod.Message('child2'),
                x: 0,
                y: 20,
                width: 50,
                height: 20,
            });

            expect(parentContainer.children.length).toBe(2);
            expect(parentContainer.getChild(0)).toBe(child2); // Prepend order
            expect(parentContainer.getChild(1)).toBe(child1);
            expect(parentContainer.getChild(99)).toBeUndefined();

            const visited: UI.Element[] = [];
            parentContainer.forEachChild((child, index) => {
                visited.push(child);
                expect(index).toBe(visited.length - 1);
            });

            expect(visited.length).toBe(2);
            expect(visited[0]).toBe(child2);
            expect(visited[1]).toBe(child1);

            parentContainer.delete();
            expect(child1.deleted).toBe(true);
            expect(child2.deleted).toBe(true);
        });

        it('should properly reparent elements when setting parent property', () => {
            const containerA = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            const containerB = new UIContainer({ x: 100, y: 0, width: 100, height: 100 });

            const child = new UIText({
                parent: containerA,
                message: mod.Message('test'),
                x: 0,
                y: 0,
                width: 50,
                height: 20,
            });

            expect(containerA.children.length).toBe(1);
            expect(containerB.children.length).toBe(0);
            expect(child.parent).toBe(containerA);

            child.parent = containerB;

            expect(containerA.children.length).toBe(0);
            expect(containerB.children.length).toBe(1);
            expect(child.parent).toBe(containerB);

            containerA.delete();
            containerB.delete();
        });

        it('should correctly resolve native root widget when defaulting parent to UI.ROOT_NODE and reparenting', () => {
            // Constructing with default parent (UI.ROOT_NODE)
            const rootElement = new UIContainer({ x: 0, y: 0, width: 100, height: 100 });
            expect(rootElement.parent).toBe(UI.ROOT_NODE);
            expect(UI.ROOT_NODE.children).toContain(rootElement);

            const nativeMock = mockWidgets.get(`ui_${rootElement.id}`);
            expect(nativeMock).toBeDefined();
            expect(nativeMock?.parent).toBeDefined();
            expect(nativeMock?.parent?.name).toBe('ui_0');

            // Reparent to a child container, then back to UI.ROOT_NODE
            const childContainer = new UIContainer({ parent: rootElement, x: 0, y: 0, width: 50, height: 50 });
            const subChild = new UIText({ parent: childContainer, message: mod.Message('test') });
            expect(subChild.parent).toBe(childContainer);

            // Reparent back to root
            subChild.parent = UI.ROOT_NODE;
            expect(subChild.parent).toBe(UI.ROOT_NODE);
            expect(mockWidgets.get(`ui_${subChild.id}`)?.parent?.name).toBe('ui_0');

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

    describe('Coordinate & Dimension Caching', () => {
        it('should cache and update x, y, width, height, position, size', () => {
            const container = new UIContainer({ x: 15, y: 25, width: 150, height: 75 });

            expect(container.x).toBe(15);
            expect(container.y).toBe(25);
            expect(container.width).toBe(150);
            expect(container.height).toBe(75);
            expect(container.position).toEqual({ x: 15, y: 25 });
            expect(container.size).toEqual({ width: 150, height: 75 });

            container.x = 30;
            expect(container.x).toBe(30);
            expect(container.position).toEqual({ x: 30, y: 25 });

            container.y = 40;
            expect(container.y).toBe(40);
            expect(container.position).toEqual({ x: 30, y: 40 });

            container.position = { x: 100, y: 200 };
            expect(container.x).toBe(100);
            expect(container.y).toBe(200);

            container.width = 300;
            expect(container.width).toBe(300);

            container.height = 400;
            expect(container.height).toBe(400);

            container.size = { width: 500, height: 600 };
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

            const fakePlayer = { _id: 42, _type: 1 } as unknown as mod.Player;
            const widgetName = `ui_${button.id}`;
            const nativeWidget = mockWidgets.get(widgetName)!;

            // Trigger events through the central Events channel
            Events.OnPlayerUIButtonEvent.trigger(
                fakePlayer,
                nativeWidget as unknown as mod.UIWidget,
                mod.UIButtonEvent.ButtonDown
            );
            expect(clickDownSpy).toHaveBeenCalledTimes(1);
            expect(clickDownSpy).toHaveBeenCalledWith(fakePlayer, undefined, undefined, undefined);

            Events.OnPlayerUIButtonEvent.trigger(
                fakePlayer,
                nativeWidget as unknown as mod.UIWidget,
                mod.UIButtonEvent.ButtonUp
            );
            expect(clickUpSpy).toHaveBeenCalledTimes(1);

            Events.OnPlayerUIButtonEvent.trigger(
                fakePlayer,
                nativeWidget as unknown as mod.UIWidget,
                mod.UIButtonEvent.FocusIn
            );
            expect(focusInSpy).toHaveBeenCalledTimes(1);

            Events.OnPlayerUIButtonEvent.trigger(
                fakePlayer,
                nativeWidget as unknown as mod.UIWidget,
                mod.UIButtonEvent.FocusOut
            );
            expect(focusOutSpy).toHaveBeenCalledTimes(1);

            button.delete();
        });
    });

    describe('Composite Buttons & Specialized Components', () => {
        it('should construct UITextButton with padding and synchronize disabled styling', () => {
            const textButton = new UITextButton({
                x: 0,
                y: 0,
                width: 200,
                height: 50,
                padding: 5,
                message: mod.Message('Click Me'),
                textSize: 24,
                textColor: { x: 1, y: 1, z: 1 },
                textDisabledColor: { x: 0.5, y: 0.5, z: 0.5 },
                enabled: true,
            });

            expect(textButton.enabled).toBe(true);
            expect(textButton.padding).toBe(5);
            expect(textButton.message).toEqual(mod.Message('Click Me'));

            // Toggle enabled state
            textButton.enabled = false;
            expect(textButton.enabled).toBe(false);

            textButton.enabled = true;
            expect(textButton.enabled).toBe(true);

            // Resizing should cascade to content with padding deduction
            textButton.width = 300;
            expect(textButton.width).toBe(300);

            textButton.delete();
            expect(textButton.deleted).toBe(true);
        });

        it('should construct UIImage and UIImageButton and update image properties', () => {
            const image = new UIImage({
                x: 0,
                y: 0,
                width: 32,
                height: 32,
                imageType: mod.UIImageType.Icon,
                imageColor: { x: 1, y: 1, z: 1 },
                imageAlpha: 0.8,
            });
            expect(image.imageType).toBe(mod.UIImageType.Icon);
            expect(image.imageAlpha).toBe(0.8);
            image.delete();

            const imageButton = new UIImageButton({
                x: 0,
                y: 0,
                width: 64,
                height: 64,
                imageType: mod.UIImageType.Icon,
                imageColor: { x: 1, y: 0, z: 0 },
            });

            expect(imageButton.imageType).toBe(mod.UIImageType.Icon);
            expect(imageButton.imageColor).toEqual({ x: 1, y: 0, z: 0 });

            imageButton.imageColor = { x: 0, y: 1, z: 0 };
            expect(imageButton.imageColor).toEqual({ x: 0, y: 1, z: 0 });

            imageButton.delete();
            expect(imageButton.deleted).toBe(true);
        });

        it('should construct UIWeaponImage, UIGadgetImage, and UIContainerButton', () => {
            const weaponImage = new UIWeaponImage({
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                weapon: mod.Weapons.AK24,
            });
            expect(weaponImage.weapon).toBe(mod.Weapons.AK24);
            weaponImage.delete();

            const gadgetImage = new UIGadgetImage({
                x: 0,
                y: 0,
                width: 50,
                height: 50,
                gadget: mod.Gadgets.Medkit,
            });
            expect(gadgetImage.gadget).toBe(mod.Gadgets.Medkit);
            gadgetImage.delete();

            const weaponBtn = new UIWeaponImageButton({
                x: 0,
                y: 0,
                width: 120,
                height: 60,
                weapon: mod.Weapons.M5A3,
            });
            expect(weaponBtn.weapon).toBe(mod.Weapons.M5A3);
            weaponBtn.delete();

            const gadgetBtn = new UIGadgetImageButton({
                x: 0,
                y: 0,
                width: 80,
                height: 80,
                gadget: mod.Gadgets.Medkit,
            });
            expect(gadgetBtn.gadget).toBe(mod.Gadgets.Medkit);
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
                message: mod.Message('Inner Text'),
            });
            expect(containerBtn.innerContainer.children.length).toBe(1);
            expect(containerBtn.innerContainer.children[0]).toBe(innerChild);

            containerBtn.delete();
            expect(containerBtn.deleted).toBe(true);
            expect(innerChild.deleted).toBe(true);
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

            menu.visible = false;
            expect(mockInputModeCalls.length).toBe(2);
            expect(mockInputModeCalls[1].enabled).toBe(false);

            menu.visible = true;
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
            expect(globalElem.receiver).toBeUndefined();

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
                message: mod.Message('child'),
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
            Events.OnPlayerLeaveGame.trigger(playerA);

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
    });
});
