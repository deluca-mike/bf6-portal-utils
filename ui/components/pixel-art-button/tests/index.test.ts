import '../../../tests/mockMod.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Colors } from '../../../../colors/index.ts';
import { Events } from '../../../../events/index.ts';
import { UI } from '../../../index.ts';
import { UIPixelArt } from '../../pixel-art/index.ts';
import { UIPixelArtButton } from '../index.ts';
import { encodePixelArtFromRgba, RgbaColor } from '../../../../scripts/encode-pixel-art.ts';
import { mockWidgets, resetMockState } from '../../../tests/mockMod.ts';

function drainDrawQueue(maxTicks = 100): void {
    for (let i = 0; i < maxTicks; ++i) {
        Events.OnTickStart.trigger();
    }
}

describe('UIPixelArtButton Component & Lifecycle Verification', () => {
    beforeEach(() => {
        resetMockState();
        UIPixelArt.tickBudget = 10;
        UIPixelArt.drawCost = 1.0;
        UIPixelArt.updateCost = 0.25;
        UIPixelArt.deleteCost = 0.5;
    });

    afterEach(() => {
        UIPixelArt.tickBudget = 10;
        UIPixelArt.drawCost = 1.0;
        UIPixelArt.updateCost = 0.25;
        UIPixelArt.deleteCost = 0.5;
        drainDrawQueue(20);
    });

    it('constructs container, button, and inner UIPixelArt correctly', () => {
        const pixels: RgbaColor[] = [
            { r: 255, g: 0, b: 0, a: 255 },
            { r: 0, g: 255, b: 0, a: 255 },
        ];
        const encoded = encodePixelArtFromRgba(pixels, 2, 1);

        const btn = new UIPixelArtButton({
            x: 50,
            y: 100,
            width: 120,
            height: 60,
            data: encoded.base64,
            pixelArtColor: UI.COLORS.WHITE,
            pixelArtDisabledColor: UI.COLORS.BF_GREY_2,
            padding: 5,
        });

        try {
            expect(btn.isValid).toBe(true);
            expect(btn.isDeleted).toBe(false);

            const innerPa = btn.pixelArt;
            expect(innerPa).toBeDefined();
            expect(innerPa?.isValid).toBe(true);
            expect(btn.isMonochrome).toBe(false);

            // Container size is 120x60, content size is (120 - 10) x (60 - 10) = 110x50
            expect(btn.width).toBe(120);
            expect(btn.height).toBe(60);
            expect(innerPa?.width).toBe(110);
            expect(innerPa?.height).toBe(50);

            // Root container and button widgets
            const rootWidget = mockWidgets.get(`ui_${btn.id}`);
            const btnWidget = mockWidgets.get(`ui_${btn.id}_b`);
            expect(rootWidget).toBeDefined();
            expect(btnWidget).toBeDefined();

            drainDrawQueue();
            expect(btn.isReady).toBe(true);
            expect(btn.state).toBe(UIPixelArt.State.Idle);
            expect(btn.progress).toBe(100);
            expect(btn.drawCallCount).toBeGreaterThan(0);
        } finally {
            btn.delete();
            drainDrawQueue();
        }
    });

    it('manages enabled/disabled color states for monochrome pixel art', () => {
        const pixels: RgbaColor[] = [
            { r: 255, g: 255, b: 255, a: 255 },
            { r: 0, g: 0, b: 0, a: 0 },
        ];
        const encoded = encodePixelArtFromRgba(pixels, 2, 1, {
            monochrome: true,
            supportOpacity: false,
        });

        const activeColor = { r: 1, g: 0.5, b: 0 };
        const disabledColor = { r: 0.2, g: 0.2, b: 0.2 };

        const btn = new UIPixelArtButton({
            data: encoded.base64,
            pixelArtColor: activeColor,
            pixelArtDisabledColor: disabledColor,
            enabled: true,
        });

        try {
            expect(btn.isMonochrome).toBe(true);
            expect(btn.enabled).toBe(true);
            expect(Colors.equals(btn.pixelArtColor!, activeColor, 0.005)).toBe(true);
            expect(Colors.equals(btn.pixelArtDisabledColor!, disabledColor, 0.005)).toBe(true);

            drainDrawQueue();
            expect(Colors.equals(btn.pixelArt!.color!, activeColor, 0.005)).toBe(true);

            // Toggle to disabled -> color switches to pixelArtDisabledColor
            btn.setEnabled(false);
            expect(btn.enabled).toBe(false);
            drainDrawQueue();
            expect(Colors.equals(btn.pixelArt!.color!, disabledColor, 0.005)).toBe(true);

            // Toggle back to enabled -> color switches back to activeColor
            btn.setEnabled(true);
            expect(btn.enabled).toBe(true);
            drainDrawQueue();
            expect(Colors.equals(btn.pixelArt!.color!, activeColor, 0.005)).toBe(true);
        } finally {
            btn.delete();
            drainDrawQueue();
        }
    });

    it('updates pixelArtColor and pixelArtDisabledColor dynamically with zero-allocation reuse', () => {
        const pixels: RgbaColor[] = [{ r: 255, g: 255, b: 255, a: 255 }];
        const encoded = encodePixelArtFromRgba(pixels, 1, 1, { monochrome: true });

        const btn = new UIPixelArtButton({
            data: encoded.base64,
            pixelArtColor: UI.COLORS.WHITE,
            pixelArtDisabledColor: UI.COLORS.BF_GREY_2,
        });

        try {
            const outColor: Colors.Color = { r: 0, g: 0, b: 0 };
            const returnedColor = btn.getPixelArtColor(outColor);
            expect(returnedColor).toBe(outColor);
            expect(Colors.equals(outColor, UI.COLORS.WHITE, 0.005)).toBe(true);

            const newColor = { r: 0, g: 1, b: 0 };
            btn.setPixelArtColor(newColor);
            expect(Colors.equals(btn.pixelArtColor!, newColor, 0.005)).toBe(true);

            const outDisabled: Colors.Color = { r: 0, g: 0, b: 0 };
            btn.getPixelArtDisabledColor(outDisabled);
            expect(Colors.equals(outDisabled, UI.COLORS.BF_GREY_2, 0.005)).toBe(true);

            const newDisabled = { r: 0.1, g: 0.1, b: 0.1 };
            btn.setPixelArtDisabledColor(newDisabled);
            expect(Colors.equals(btn.pixelArtDisabledColor!, newDisabled, 0.005)).toBe(true);
        } finally {
            btn.delete();
            drainDrawQueue();
        }
    });

    it('cleans up all widgets and unregisters upon delete()', () => {
        const pixels: RgbaColor[] = [{ r: 255, g: 0, b: 0, a: 255 }];
        const encoded = encodePixelArtFromRgba(pixels, 1, 1);

        const btn = new UIPixelArtButton({
            data: encoded.base64,
        });

        drainDrawQueue();
        expect(btn.isValid).toBe(true);

        btn.delete();
        drainDrawQueue();

        expect(btn.isDeleted).toBe(true);
        expect(btn.pixelArt).toBeUndefined();
        expect(btn.state).toBeUndefined();
        expect(btn.progress).toBeUndefined();
        expect(btn.isReady).toBeUndefined();
        expect(btn.pixelArtColor).toBeUndefined();
    });
});
