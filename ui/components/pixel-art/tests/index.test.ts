import '../../../tests/mockMod.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Colors } from '../../../../colors/index.ts';
import { Events } from '../../../../events/index.ts';
import { UI } from '../../../index.ts';
import { UIPixelArt } from '../index.ts';
import { encodePixelArtFromRgba, RgbaColor } from '../../../../scripts/encode-pixel-art.ts';
import { mockWidgets, resetMockState } from '../../../tests/mockMod.ts';

function drainDrawQueue(maxTicks = 100): void {
    for (let i = 0; i < maxTicks; ++i) {
        Events.OnTickStart.trigger();
    }
}

describe('UIPixelArt Component & Engine Mock Verification', () => {
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

    describe('Container Hierarchy & Anchoring Invariants', () => {
        it('constructs Base Container -> Art Container -> Child Rectangles hierarchy correctly', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 0, b: 255, a: 255 },
                { r: 255, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2);

            const pa = new UIPixelArt({
                data: encoded.base64,
                x: 150,
                y: 250,
                width: 100,
                height: 100,
                anchor: UI.Anchor.TopRight,
                depth: UI.Depth.BelowGameUI,
                bgColor: { r: 0.1, g: 0.2, b: 0.3 },
                bgAlpha: 0.6,
            });

            try {
                // Base & Art containers are created synchronously
                const baseWidget = mockWidgets.get(`ui_${pa.id}`)!;
                expect(baseWidget).toBeDefined();
                expect(baseWidget.position).toEqual({ x: 150, y: 250, z: 0 });
                expect(baseWidget.size).toEqual({ x: 100, y: 100, z: 0 });
                expect(baseWidget.anchor).toBe(UI.Element._getNativeAnchor(UI.Anchor.TopRight));
                expect(baseWidget.bgColor).toEqual(Colors.toVector({ r: 0.1, g: 0.2, b: 0.3 }));
                expect(baseWidget.bgAlpha).toBe(0.6);

                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName);
                expect(artWidget).toBeDefined();
                expect(artWidget!.parent).toBe(baseWidget);
                expect(artWidget!.position).toEqual({ x: 0, y: 0, z: 0 });
                expect(artWidget!.size).toEqual({ x: 100, y: 100, z: 0 });
                expect(artWidget!.anchor).toBe(UI.Element._getNativeAnchor(UI.Anchor.Center));
                expect(artWidget!.bgAlpha).toBe(0);

                // Drain queue to finish drawing rectangles
                drainDrawQueue();

                // Verify Child Rectangles
                const nativeTopLeft = UI.Element._getNativeAnchor(UI.Anchor.TopLeft);
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);
                expect(rectWidgets.length).toBeGreaterThan(0);

                for (const rw of rectWidgets) {
                    expect(rw.parent).toBe(artWidget);
                    expect(rw.anchor).toBe(nativeTopLeft);
                    expect(rw.size.x).toBeGreaterThan(0);
                    expect(rw.size.y).toBeGreaterThan(0);
                }

                // Total draw calls: Base Container (1) + Art Container (1) + Rectangles (N)
                expect(pa.drawCallCount).toBe(rectWidgets.length + 2);
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('defaults width and height to gridWidth and gridHeight when omitted', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 1);

            const pa = new UIPixelArt({
                data: encoded.base64,
            });

            try {
                const baseWidget = mockWidgets.get(`ui_${pa.id}`)!;
                expect(pa.width).toBe(2);
                expect(pa.height).toBe(1);
                expect(baseWidget.size).toEqual({ x: 2, y: 1, z: 0 });
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });
    });

    describe('Visual Output & Pixel Reconstruction Verification', () => {
        it('accurately reconstructs all pixels from mockWidgets against source RGBA image', () => {
            const sourcePalette: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 }, // 0: Red
                { r: 0, g: 255, b: 0, a: 255 }, // 1: Green
                { r: 0, g: 0, b: 255, a: 255 }, // 2: Blue
                { r: 255, g: 255, b: 0, a: 255 }, // 3: Yellow
            ];

            const gridW = 4;
            const gridH = 4;
            const sourcePixels: RgbaColor[] = [
                sourcePalette[0],
                sourcePalette[1],
                sourcePalette[2],
                sourcePalette[3],
                sourcePalette[1],
                sourcePalette[2],
                sourcePalette[3],
                sourcePalette[0],
                sourcePalette[2],
                sourcePalette[3],
                sourcePalette[0],
                sourcePalette[1],
                sourcePalette[3],
                sourcePalette[0],
                sourcePalette[1],
                sourcePalette[2],
            ];

            const encoded = encodePixelArtFromRgba(sourcePixels, gridW, gridH, {
                maxColors: 4,
                supportOpacity: false,
            });

            const renderSize = 40; // 10 pixels per grid cell
            const pa = new UIPixelArt({
                data: encoded.base64,
                width: renderSize,
                height: renderSize,
            });

            try {
                drainDrawQueue();

                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                // Reconstruct a 40x40 canvas in memory by executing painter's algorithm
                const canvas: RgbaColor[] = [];
                for (let i = 0; i < renderSize * renderSize; ++i) {
                    canvas.push({ r: 0, g: 0, b: 0, a: 0 });
                }

                for (const rw of rectWidgets) {
                    const rx = Math.round(rw.position.x);
                    const ry = Math.round(rw.position.y);
                    const rwWidth = Math.round(rw.size.x);
                    const rwHeight = Math.round(rw.size.y);
                    const r = Math.round(rw.bgColor.x * 255);
                    const g = Math.round(rw.bgColor.y * 255);
                    const b = Math.round(rw.bgColor.z * 255);
                    const a = Math.round(rw.bgAlpha * 255);

                    for (let py = ry; py < ry + rwHeight && py < renderSize; ++py) {
                        for (let px = rx; px < rx + rwWidth && px < renderSize; ++px) {
                            canvas[py * renderSize + px] = { r, g, b, a };
                        }
                    }
                }

                // Verify each cell center in reconstructed canvas matches the source pixel
                for (let gy = 0; gy < gridH; ++gy) {
                    for (let gx = 0; gx < gridW; ++gx) {
                        const sampleX = gx * 10 + 5;
                        const sampleY = gy * 10 + 5;
                        const sampledColor = canvas[sampleY * renderSize + sampleX];
                        const expectedColor = sourcePixels[gy * gridW + gx];

                        expect(sampledColor.r).toBeCloseTo(expectedColor.r, -1);
                        expect(sampledColor.g).toBeCloseTo(expectedColor.g, -1);
                        expect(sampledColor.b).toBeCloseTo(expectedColor.b, -1);
                    }
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('renders identically from Base122 encoded payload with auto-detection', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 0, b: 255, a: 255 },
                { r: 255, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2);

            const paB64 = new UIPixelArt({
                data: encoded.base64,
                width: 50,
                height: 50,
            });
            drainDrawQueue();
            const b64DrawCalls = paB64.drawCallCount;
            paB64.delete();
            drainDrawQueue();

            const paB122 = new UIPixelArt({
                data: encoded.base122,
                width: 50,
                height: 50,
            });
            try {
                drainDrawQueue();
                expect(paB122.drawCallCount).toBe(b64DrawCalls);
                expect(paB122.width).toBe(50);
                expect(paB122.height).toBe(50);
            } finally {
                paB122.delete();
                drainDrawQueue();
            }
        });

        it('supports 1-color monochrome mode rendering with custom foreground color', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 255, g: 255, b: 255, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2, { maxColors: 1 });
            expect(encoded.isMonochrome).toBe(true);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 60,
                height: 60,
                color: { r: 1, g: 0.5, b: 0 },
            });

            try {
                drainDrawQueue();
                expect(pa.drawCallCount).toBeGreaterThan(0);
                expect(Colors.equals(pa.color!, { r: 1, g: 0.5, b: 0 }, 0.01)).toBe(true);

                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                for (const rw of rectWidgets) {
                    expect(rw.bgColor.x).toBeCloseTo(1, 2);
                    expect(rw.bgColor.y).toBeCloseTo(0.5, 2);
                    expect(rw.bgColor.z).toBeCloseTo(0, 2);
                    expect(rw.bgAlpha).toBeCloseTo(1, 2);
                }

                expect(pa.isMonochrome).toBe(true);

                // Mutate color
                pa.setColor({ r: 0, g: 1, b: 0 });
                expect(Colors.equals(pa.color!, { r: 0, g: 1, b: 0 }, 0.01)).toBe(true);

                drainDrawQueue();

                for (const rw of rectWidgets) {
                    expect(rw.bgColor.x).toBeCloseTo(0, 2);
                    expect(rw.bgColor.y).toBeCloseTo(1, 2);
                    expect(rw.bgColor.z).toBeCloseTo(0, 2);
                    expect(rw.bgAlpha).toBeCloseTo(1, 2);
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }

            expect(pa.isMonochrome).toBeUndefined();
            expect(pa.color).toBeUndefined();
            expect(pa.getColor()).toBeUndefined();
        });

        it('returns null for color on multi-color pixel art and ignores setters', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 0, b: 255, a: 255 },
                { r: 255, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2, { maxColors: 4 });
            expect(encoded.isMonochrome).toBe(false);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 50,
                height: 50,
            });

            try {
                drainDrawQueue();
                expect(pa.isMonochrome).toBe(false);
                expect(pa.color).toBeNull();
                expect(pa.getColor()).toBeNull();
                const outColor: Colors.Color = { r: 0.5, g: 0.5, b: 0.5 };
                expect(pa.getColor(outColor)).toBeNull();

                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);
                expect(rectWidgets.length).toBeGreaterThan(0);
                const initialBgColors = rectWidgets.map((rw) => ({ ...rw.bgColor }));
                const initialBgAlphas = rectWidgets.map((rw) => rw.bgAlpha);

                pa.setColor({ r: 1, g: 0, b: 1 });
                expect(pa.color).toBeNull();

                drainDrawQueue();

                for (let i = 0; i < rectWidgets.length; ++i) {
                    expect(rectWidgets[i].bgColor.x).toBe(initialBgColors[i].x);
                    expect(rectWidgets[i].bgColor.y).toBe(initialBgColors[i].y);
                    expect(rectWidgets[i].bgColor.z).toBe(initialBgColors[i].z);
                    expect(rectWidgets[i].bgAlpha).toBe(initialBgAlphas[i]);
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }

            expect(pa.isMonochrome).toBeUndefined();
            expect(pa.color).toBeUndefined();
        });

        it('properly scopes background styling to Base Container only', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 255, g: 255, b: 255, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 1, { maxColors: 1 });

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 100,
                height: 50,
                bgColor: { r: 0.1, g: 0.1, b: 0.1 },
                bgAlpha: 0.2,
                bgFill: UI.BgFill.Solid,
            });

            try {
                drainDrawQueue();
                const baseWidget = mockWidgets.get(`ui_${pa.id}`)!;
                const artWidget = mockWidgets.get(`ui_${pa.id}_art`)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                expect(baseWidget.bgColor).toEqual(Colors.toVector({ r: 0.1, g: 0.1, b: 0.1 }));
                expect(baseWidget.bgAlpha).toBeCloseTo(0.2, 2);
                expect(baseWidget.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.Solid));

                expect(artWidget.bgAlpha).toBe(0);
                expect(artWidget.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.None));

                pa.setBgColor({ r: 0.8, g: 0.2, b: 0.4 });
                pa.setBgAlpha(0.9);
                pa.setBgFill(UI.BgFill.Blur);

                UI.flush();

                expect(baseWidget.bgColor).toEqual(Colors.toVector({ r: 0.8, g: 0.2, b: 0.4 }));
                expect(baseWidget.bgAlpha).toBeCloseTo(0.9, 2);
                expect(baseWidget.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.Blur));

                expect(artWidget.bgAlpha).toBe(0);
                expect(artWidget.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.None));
                for (const rw of rectWidgets) {
                    expect(rw.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.Solid));
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('supports monochrome mode with varied alpha levels and runtime tinting', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 255, g: 255, b: 255, a: 128 },
                { r: 255, g: 255, b: 255, a: 64 },
                { r: 0, g: 0, b: 0, a: 0 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2, {
                monochrome: true,
                supportOpacity: true,
                maxColors: 4,
            });
            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.hasOpacity).toBe(true);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 40,
                height: 40,
                color: { r: 0, g: 0.5, b: 1 },
            });

            try {
                drainDrawQueue();
                expect(pa.drawCallCount).toBeGreaterThan(0);
                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                for (const rw of rectWidgets) {
                    expect(rw.bgColor.x).toBeCloseTo(0, 2);
                    expect(rw.bgColor.y).toBeCloseTo(0.5, 2);
                    expect(rw.bgColor.z).toBeCloseTo(1, 2);
                    expect(rw.bgAlpha).toBeGreaterThan(0);
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('supports 16-bit coordinate encoding for large grid resolutions', () => {
            const largeW = 256;
            const largeH = 1;
            const pixels: RgbaColor[] = new Array(largeW * largeH).fill({ r: 255, g: 0, b: 0, a: 255 });

            const encoded = encodePixelArtFromRgba(pixels, largeW, largeH);
            expect(encoded.is16BitCoords).toBe(true);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 512,
                height: 10,
            });

            try {
                drainDrawQueue();
                expect(pa.width).toBe(512);
                expect(pa.height).toBe(10);
                expect(pa.drawCallCount).toBeGreaterThan(0);
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });
    });

    describe('Two-Tier Sequential Throttling & Operational Lifecycle Dispatcher', () => {
        it('throttles child rectangle draw creation across server ticks with budget accounting', () => {
            // Create an 8x8 checkerboard image generating ~32 distinct rectangles
            const checkerboard: RgbaColor[] = [];
            for (let r = 0; r < 8; ++r) {
                for (let c = 0; c < 8; ++c) {
                    checkerboard.push(
                        (r + c) % 2 === 0 ? { r: 255, g: 0, b: 0, a: 255 } : { r: 0, g: 0, b: 255, a: 255 }
                    );
                }
            }
            const encoded = encodePixelArtFromRgba(checkerboard, 8, 8);

            // Configure tick budget to draw exactly 10 rectangles per tick (drawCost = 1.0)
            UIPixelArt.tickBudget = 10;
            UIPixelArt.drawCost = 1.0;

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 80,
                height: 80,
            });

            try {
                // Immediately after constructor: Enqueued, state is Drawing, progress is 0, isReady is false
                expect(pa.state).toBe(UIPixelArt.State.Drawing);
                expect(pa.progress).toBe(0);
                expect(pa.isReady).toBe(false);

                // Tick 1: Activates and draws first 10 rectangles
                Events.OnTickStart.trigger();
                expect(pa.state).toBe(UIPixelArt.State.Drawing);
                expect(pa.progress).toBeGreaterThan(0);
                expect(pa.progress).toBeLessThan(100);
                expect(pa.isReady).toBe(false);

                // Subsequent ticks: Continues drawing until finished
                while (pa.state === UIPixelArt.State.Drawing) {
                    Events.OnTickStart.trigger();
                }

                // Final state: Idle, progress 100, isReady true
                expect(pa.state).toBe(UIPixelArt.State.Idle);
                expect(pa.progress).toBe(100);
                expect(pa.isReady).toBe(true);
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('throttles setColor() across ticks and reports updating progress and state', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 255, g: 255, b: 255, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2, { maxColors: 1 });

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 50,
                height: 50,
                color: { r: 1, g: 0, b: 0 },
            });

            try {
                drainDrawQueue();
                expect(pa.state).toBe(UIPixelArt.State.Idle);
                expect(pa.isReady).toBe(true);

                // Throttle updates: tickBudget = 1, updateCost = 1.0 (1 widget per tick)
                UIPixelArt.tickBudget = 1;
                UIPixelArt.updateCost = 1.0;

                pa.setColor({ r: 0, g: 1, b: 0 });
                expect(pa.state).toBe(UIPixelArt.State.Updating);
                expect(pa.isReady).toBe(false);

                Events.OnTickStart.trigger();
                // Continues updating until finished
                while (pa.state === UIPixelArt.State.Updating) {
                    Events.OnTickStart.trigger();
                }

                expect(pa.state).toBe(UIPixelArt.State.Idle);
                expect(pa.isReady).toBe(true);
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('handles mid-draw setColor by seamlessly transitioning to updating state to recolor all rectangles', () => {
            const checkerboard: RgbaColor[] = [];
            for (let r = 0; r < 6; ++r) {
                for (let c = 0; c < 6; ++c) {
                    checkerboard.push(
                        (r + c) % 2 === 0 ? { r: 255, g: 255, b: 255, a: 255 } : { r: 0, g: 0, b: 0, a: 0 }
                    );
                }
            }
            const encoded = encodePixelArtFromRgba(checkerboard, 6, 6, { maxColors: 1 });

            UIPixelArt.tickBudget = 4;
            UIPixelArt.drawCost = 1.0;
            UIPixelArt.updateCost = 0.5;

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 60,
                height: 60,
                color: { r: 1, g: 0, b: 0 },
            });

            try {
                // Step 1: Tick 1 draws initial batch
                Events.OnTickStart.trigger();
                expect(pa.state).toBe(UIPixelArt.State.Drawing);

                // Step 2: Mutate color mid-draw
                pa.setColor({ r: 0, g: 0, b: 1 });
                // Stays in Drawing until all rectangles exist
                expect(pa.state).toBe(UIPixelArt.State.Drawing);

                // Step 3: Advance ticks until draw completes
                while (pa.state === UIPixelArt.State.Drawing) {
                    Events.OnTickStart.trigger();
                }

                // Step 4: Seamlessly transitions to Updating to apply new color to all rectangles
                expect(pa.state).toBe(UIPixelArt.State.Updating);

                while (pa.state === UIPixelArt.State.Updating) {
                    Events.OnTickStart.trigger();
                }

                // Step 5: Finished and Idle
                expect(pa.state).toBe(UIPixelArt.State.Idle);
                expect(pa.isReady).toBe(true);

                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                for (const rw of rectWidgets) {
                    expect(rw.bgColor.x).toBeCloseTo(0, 2);
                    expect(rw.bgColor.y).toBeCloseTo(0, 2);
                    expect(rw.bgColor.z).toBeCloseTo(1, 2);
                }
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });

        it('handles mid-draw deletion cleanly without leaving orphaned state or leaking widgets', () => {
            const checkerboard: RgbaColor[] = [];
            for (let r = 0; r < 6; ++r) {
                for (let c = 0; c < 6; ++c) {
                    checkerboard.push(
                        (r + c) % 2 === 0 ? { r: 255, g: 0, b: 0, a: 255 } : { r: 0, g: 255, b: 0, a: 255 }
                    );
                }
            }
            const encoded = encodePixelArtFromRgba(checkerboard, 6, 6);

            UIPixelArt.tickBudget = 4;
            UIPixelArt.drawCost = 1.0;
            UIPixelArt.deleteCost = 0.5;

            const initialWidgets = mockWidgets.size;
            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 60,
                height: 60,
            });

            expect(pa.state).toBe(UIPixelArt.State.Drawing);

            // Draw first batch
            Events.OnTickStart.trigger();
            expect(pa.state).toBe(UIPixelArt.State.Drawing);

            // Delete mid-draw
            pa.delete();
            expect(pa.isDeleted).toBe(true);
            expect(pa.state).toBeUndefined();
            expect(pa.isReady).toBeUndefined();
            expect(pa.progress).toBeUndefined();

            // Drain remaining ticks to finish deletion
            drainDrawQueue();

            // All widgets should be completely cleaned up
            expect(mockWidgets.size).toBe(initialWidgets);
            expect(UIPixelArt.getActivePixelArtCount()).toBe(0);
        });

        it('processes multiple pixel art instances sequentially in FIFO order', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 1);

            UIPixelArt.tickBudget = 1;
            UIPixelArt.drawCost = 1.0;

            const pa1 = new UIPixelArt({ data: encoded.base64 });
            const pa2 = new UIPixelArt({ data: encoded.base64 });

            try {
                // pa1 is first in queue
                expect(pa1.state).toBe(UIPixelArt.State.Drawing);
                expect(pa2.state).toBe(UIPixelArt.State.Drawing);

                // Tick 1: pa1 begins drawing
                Events.OnTickStart.trigger();
                expect(pa1.progress).toBeGreaterThan(0);
                expect(pa2.progress).toBe(0); // pa2 still queued

                // Advance until pa1 finishes
                while (pa1.state === UIPixelArt.State.Drawing) {
                    Events.OnTickStart.trigger();
                }

                expect(pa1.state).toBe(UIPixelArt.State.Idle);

                // pa2 now draws
                while (pa2.state === UIPixelArt.State.Drawing) {
                    Events.OnTickStart.trigger();
                }

                expect(pa2.state).toBe(UIPixelArt.State.Idle);
            } finally {
                pa1.delete();
                pa2.delete();
                drainDrawQueue();
            }
        });
    });

    describe('Sub-Pool Lifecycle, Disposal & Zero Memory Leaks', () => {
        it('cleans up all child rectangle widgets and art container on delete()', () => {
            const initialWidgetCount = mockWidgets.size;

            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 0, b: 255, a: 255 },
                { r: 255, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 2);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 100,
                height: 100,
            });

            drainDrawQueue();

            expect(mockWidgets.size).toBeGreaterThan(initialWidgetCount + 2);
            expect(UI.getActiveElementCount()).toBe(1);
            expect(UIPixelArt.getActivePixelArtCount()).toBe(1);

            pa.delete();
            drainDrawQueue();

            expect(mockWidgets.size).toBe(initialWidgetCount);
            expect(UI.getActiveElementCount()).toBe(0);
            expect(UIPixelArt.getActivePixelArtCount()).toBe(0);
            expect(pa.drawCallCount).toBeUndefined();
        });

        it('enforces MAX_PIXEL_ARTS = 128 limit and slot recycling', () => {
            const pixels: RgbaColor[] = [{ r: 255, g: 255, b: 255, a: 255 }];
            const encoded = encodePixelArtFromRgba(pixels, 1, 1);

            const pas: UIPixelArt[] = [];
            for (let i = 0; i < UIPixelArt.MAX_PIXEL_ARTS; ++i) {
                pas.push(new UIPixelArt({ data: encoded.base64 }));
            }

            drainDrawQueue();
            expect(UIPixelArt.getActivePixelArtCount()).toBe(128);

            // Pool full -> next pixel art fails and is deleted
            const overflowPa = new UIPixelArt({ data: encoded.base64 });
            expect(overflowPa.isDeleted).toBe(true);
            expect(UIPixelArt.getActivePixelArtCount()).toBe(128);

            // Free slot and allocate replacement
            pas[0].delete();
            drainDrawQueue();
            expect(UIPixelArt.getActivePixelArtCount()).toBe(127);

            const replacement = new UIPixelArt({ data: encoded.base64 });
            drainDrawQueue();
            expect(replacement.isDeleted).toBe(false);
            expect(UIPixelArt.getActivePixelArtCount()).toBe(128);

            // Cleanup
            replacement.delete();
            for (let i = 1; i < pas.length; ++i) {
                pas[i].delete();
            }
            drainDrawQueue();
            expect(UIPixelArt.getActivePixelArtCount()).toBe(0);
        });

        it('repositioning or resizing base container does not mutate child rectangles', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
            ];
            const encoded = encodePixelArtFromRgba(pixels, 2, 1);

            const pa = new UIPixelArt({
                data: encoded.base64,
                width: 100,
                height: 50,
            });

            try {
                drainDrawQueue();
                const artName = `ui_${pa.id}_art`;
                const artWidget = mockWidgets.get(artName)!;
                const rectWidgets = Array.from(mockWidgets.values()).filter((w) => w.parent === artWidget);

                const rect1PosBefore = { ...rectWidgets[0].position };
                const rect1SizeBefore = { ...rectWidgets[0].size };

                // Move and resize base container
                pa.setPosition({ x: 300, y: 400 });
                pa.setSize({ width: 200, height: 100 });

                expect(pa.x).toBe(300);
                expect(pa.y).toBe(400);
                expect(pa.width).toBe(200);
                expect(pa.height).toBe(100);

                UI.flush();
                const baseWidget = mockWidgets.get(`ui_${pa.id}`)!;
                expect(baseWidget.position).toEqual({ x: 300, y: 400, z: 0 });
                expect(baseWidget.size).toEqual({ x: 200, y: 100, z: 0 });

                // Child rectangle positions/sizes remain completely untouched
                expect(rectWidgets[0].position).toEqual(rect1PosBefore);
                expect(rectWidgets[0].size).toEqual(rect1SizeBefore);
            } finally {
                pa.delete();
                drainDrawQueue();
            }
        });
    });
});
