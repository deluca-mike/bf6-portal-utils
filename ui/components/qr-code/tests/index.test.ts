import '../../../tests/mockMod.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { Colors } from '../../../../colors/index.ts';
import { Events } from '../../../../events/index.ts';
import { UI } from '../../../index.ts';
import { UIQRCode } from '../index.ts';
import { QREncoder } from '../encoder.ts';
import { UIQRCodeExtended } from '../../../../scripts/encode-qr-code.ts';
import { mockWidgets, resetMockState } from '../../../tests/mockMod.ts';

/**
 * Helper to convert a 2D boolean QR matrix into RGBA image data for jsQR decoder.
 * @param matrix - 2D boolean matrix.
 * @param modulePixelSize - Pixel size per module.
 * @param quietZone - Quiet zone margin modules.
 * @returns Object with RGBA clamped array, width, and height.
 */
function matrixToImageData(
    matrix: UIQRCode.BooleanMatrix,
    modulePixelSize = 4,
    quietZone = 4
): { data: Uint8ClampedArray; width: number; height: number } {
    const N = matrix.length;
    const totalModules = N + 2 * quietZone;
    const width = totalModules * modulePixelSize;
    const height = totalModules * modulePixelSize;
    const data = new Uint8ClampedArray(width * height * 4);

    // Initialize background to white (255, 255, 255, 255)
    data.fill(255);

    for (let r = 0; r < N; ++r) {
        for (let c = 0; c < N; ++c) {
            if (matrix[r][c]) {
                const startX = (c + quietZone) * modulePixelSize;
                const startY = (r + quietZone) * modulePixelSize;

                for (let py = 0; py < modulePixelSize; ++py) {
                    for (let px = 0; px < modulePixelSize; ++px) {
                        const idx = ((startY + py) * width + (startX + px)) * 4;
                        data[idx] = 0; // R
                        data[idx + 1] = 0; // G
                        data[idx + 2] = 0; // B
                        data[idx + 3] = 255; // A
                    }
                }
            }
        }
    }

    return { data, width, height };
}

/**
 * Decodes a 2D boolean matrix using jsQR and returns the decoded string data.
 * @param matrix - 2D boolean matrix to decode.
 * @returns The decoded string payload, or null if decoding failed.
 */
function decodeMatrix(matrix: UIQRCode.BooleanMatrix): string | null {
    const img = matrixToImageData(matrix);
    const result = jsQR(img.data, img.width, img.height);
    return result ? result.data : null;
}

/**
 * Decodes a 2D boolean matrix using jsQR and returns raw byte data.
 * @param matrix - 2D boolean matrix to decode.
 * @returns Decoded byte array or null if decoding failed.
 */
function decodeMatrixBytes(matrix: UIQRCode.BooleanMatrix): number[] | null {
    const img = matrixToImageData(matrix);
    const result = jsQR(img.data, img.width, img.height);
    return result ? (result.binaryData ?? null) : null;
}

function drainDrawQueue(maxTicks = 100): void {
    for (let i = 0; i < maxTicks; ++i) {
        Events.OnTickStart.trigger();
    }
}

describe('UIQRCode Component', () => {
    beforeEach(() => {
        resetMockState();
        UIQRCode.tickBudget = 10;
        UIQRCode.drawCost = 1.0;
        UIQRCode.updateCost = 0.25;
        UIQRCode.deleteCost = 0.5;
    });

    afterEach(() => {
        UIQRCode.tickBudget = 10;
        UIQRCode.drawCost = 1.0;
        UIQRCode.updateCost = 0.25;
        UIQRCode.deleteCost = 0.5;
        drainDrawQueue(20);
    });

    describe('Initialization & Rendering', () => {
        it('renders a QR code from a text payload and verifies slot conservation', () => {
            const data = 'HELLO_PORTAL';
            const qr = new UIQRCode({
                data,
                x: 100,
                y: 100,
            });

            expect(qr.drawCallCount).toBeGreaterThan(0);
            expect(qr.width).toBeGreaterThan(0);
            expect(qr.height).toBeGreaterThan(0);

            // Slot conservation: Only 1 slot in UI.MAX_ELEMENTS and 1 in UIQRCode consumed
            expect(UI.getActiveElementCount()).toBe(1);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);

            qr.delete();
            expect(UI.getActiveElementCount()).toBe(0);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('renders a QR code from a text payload using the standalone encoder', () => {
            const data = 'https://portal.battlefield.com';
            const matrix = QREncoder.encode(data, QREncoder.ECC.Medium)!;
            expect(matrix).not.toBeNull();
            const qr = new UIQRCode({
                data,
                ecc: UIQRCode.ECC.Medium,
                scale: 1,
            });

            try {
                const N = matrix.length;
                const expectedSize = (N + 2 * UIQRCode.DEFAULT_MARGIN) * 10;
                expect(qr.width).toBe(expectedSize);
                expect(qr.height).toBe(expectedSize);
                expect(qr.drawCallCount).toBeGreaterThan(0);

                // Verify decoding matches payload
                expect(decodeMatrix(matrix)).toBe(data);
            } finally {
                qr.delete();
            }
        });

        it('verifies 3-tier container hierarchy (Base Container -> QR Container -> Child Rectangles)', () => {
            const data = 'HIERARCHY_TEST';
            const qr = new UIQRCode({
                data,
                x: 100,
                y: 200,
                anchor: UI.Anchor.TopLeft,
                color: UI.COLORS.BLACK,
                bgColor: UI.COLORS.WHITE,
                bgAlpha: 0.8,
            });

            try {
                // 1. Base Container (created in constructor, before first tick)
                const baseName = `ui_${qr.id}`;
                const baseWidget = mockWidgets.get(baseName);
                expect(baseWidget).toBeDefined();
                expect(baseWidget!.position).toEqual({ x: 100, y: 200, z: 0 });
                expect(baseWidget!.anchor).toBe(UI.Element._getNativeAnchor(UI.Anchor.TopLeft));
                expect(baseWidget!.bgColor).toEqual(Colors.toVector(UI.COLORS.WHITE));
                expect(baseWidget!.bgAlpha).toBe(0.8);

                // 2. QR Container (created in constructor, before first tick)
                const qrName = `ui_${qr.id}_qr`;
                const qrWidget = mockWidgets.get(qrName);
                expect(qrWidget).toBeDefined();
                expect(qrWidget!.parent).toBe(baseWidget);
                expect(qrWidget!.position).toEqual({ x: 0, y: 0, z: 0 });
                expect(qrWidget!.anchor).toBe(UI.Element._getNativeAnchor(UI.Anchor.Center));
                expect(qrWidget!.bgAlpha).toBe(0);

                // 3. Child Module Rectangles are drawn on the first tick
                drainDrawQueue(50);
                const nativeTopLeft = UI.Element._getNativeAnchor(UI.Anchor.TopLeft);
                const childRects = Array.from(mockWidgets.values()).filter((w) => w.parent === qrWidget);
                expect(childRects.length).toBeGreaterThan(0);

                for (const rw of childRects) {
                    expect(rw.parent).toBe(qrWidget);
                    expect(rw.anchor).toBe(nativeTopLeft);
                    expect(rw.size.x).toBeGreaterThan(0);
                    expect(rw.size.y).toBeGreaterThan(0);
                    expect(rw.bgAlpha).toBe(1);
                }

                // Total draw calls: Base Container (1) + QR Container (1) + Rectangles (N)
                expect(qr.drawCallCount).toBe(childRects.length + 2);
            } finally {
                qr.delete();
            }
        });
    });

    describe('Scale & Margin Options', () => {
        it('scales module size proportionally with scale parameter', () => {
            const data = 'HELLO';
            const matrix = QREncoder.encode(data, QREncoder.ECC.Medium)!;
            const N = matrix.length;
            const quietModules = 2 * UIQRCode.DEFAULT_MARGIN;

            const qr1 = new UIQRCode({ data, scale: 1 });
            try {
                expect(qr1.width).toBe((N + quietModules) * 10);
                expect(qr1.height).toBe((N + quietModules) * 10);
            } finally {
                qr1.delete();
            }

            const qr2 = new UIQRCode({ data, scale: 2 });
            try {
                expect(qr2.width).toBe((N + quietModules) * 20);
                expect(qr2.height).toBe((N + quietModules) * 20);
            } finally {
                qr2.delete();
            }

            const qr3 = new UIQRCode({ data, scale: 0.5 });
            try {
                expect(qr3.width).toBe((N + quietModules) * 5);
                expect(qr3.height).toBe((N + quietModules) * 5);
            } finally {
                qr3.delete();
            }
        });

        it('supports quiet zone margins in module units (enforcing minimum of 4)', () => {
            const data = 'TEST';
            const matrix = QREncoder.encode(data, QREncoder.ECC.Medium)!;
            const N = matrix.length;
            const margin = 5;
            const qr = new UIQRCode({
                data,
                scale: 1,
                margin,
            });

            try {
                const expectedTotalUnits = N + 2 * margin;
                expect(qr.width).toBe(expectedTotalUnits * 10);
                expect(qr.height).toBe(expectedTotalUnits * 10);
            } finally {
                qr.delete();
            }

            // Margin under MIN_QUIET_ZONE is clamped to 4
            const qrClamped = new UIQRCode({
                data,
                scale: 1,
                margin: 2,
            });

            try {
                expect(qrClamped.width).toBe((N + 8) * 10);
                expect(qrClamped.height).toBe((N + 8) * 10);
            } finally {
                qrClamped.delete();
            }
        });

        it('allows explicit width/height override', () => {
            const qr = new UIQRCode({
                data: 'EXPLICIT_SIZE',
                width: 500,
                height: 500,
            });

            try {
                expect(qr.width).toBe(500);
                expect(qr.height).toBe(500);
            } finally {
                qr.delete();
            }
        });
    });

    describe('Draw Call Optimization & Hybrid Rendering', () => {
        it('drastically reduces draw calls compared to naive cell-by-cell rendering (>60% savings)', () => {
            const data = 'https://example.com/join?code=BF6-PORTAL-MATCH-12345';
            const matrix = QREncoder.encode(data, QREncoder.ECC.Medium)!;
            const qr = new UIQRCode({
                data,
                ecc: UIQRCode.ECC.Medium,
            });

            try {
                drainDrawQueue(50);
                const N = matrix.length;

                // Calculate naive black cell count
                let naiveBlackCellCount = 0;
                for (let r = 0; r < N; ++r) {
                    for (let c = 0; c < N; ++c) {
                        if (matrix[r][c]) naiveBlackCellCount++;
                    }
                }

                const optimizedDrawCalls = qr.drawCallCount!;
                const reduction = 1 - optimizedDrawCalls / naiveBlackCellCount;

                // Verify optimization achieves > 60% reduction
                expect(reduction).toBeGreaterThanOrEqual(0.6);
                expect(optimizedDrawCalls).toBeLessThan(naiveBlackCellCount * 0.4);
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('renders structural elements seamlessly with rectilinear merging', () => {
            // Version 2 QR code (25x25) has 3 Finders + 1 Alignment Pattern
            const qr = new UIQRCode({
                data: 'VERSION_2_PAYLOAD_TEST_STRING_1234567890',
                ecc: UIQRCode.ECC.High,
            });

            try {
                drainDrawQueue(50);
                expect(qr.drawCallCount).toBeGreaterThan(0);
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });
    });

    describe('Dynamic In-Place Visual Mutations & Sub-Pool Lifecycle', () => {
        it('supports dynamic in-place color and light alpha mutations via UI.flush()', () => {
            const qr = new UIQRCode({
                data: 'COLORS',
                color: UI.COLORS.BLACK,
                bgColor: UI.COLORS.WHITE,
                bgAlpha: 1,
            });

            try {
                drainDrawQueue(50);
                const qrName = `ui_${qr.id}_qr`;
                const qrWidget = mockWidgets.get(qrName)!;
                const childRects = Array.from(mockWidgets.values()).filter((w) => w.parent === qrWidget);

                qr.setColor(UI.COLORS.BLUE);
                drainDrawQueue(50);
                expect(Colors.equals(qr.color!, UI.COLORS.BLUE, 0.005)).toBe(true);

                qr.setBgColor(UI.COLORS.GREY_25);
                expect(Colors.equals(qr.bgColor!, UI.COLORS.GREY_25, 0.005)).toBe(true);

                qr.setBgAlpha(0.5);
                expect(qr.bgAlpha).toBeCloseTo(0.5, 2);

                UI.flush();

                const baseWidget = mockWidgets.get(`ui_${qr.id}`)!;
                expect(baseWidget.bgColor.x).toBeCloseTo(UI.COLORS.GREY_25.r, 2);
                expect(baseWidget.bgAlpha).toBeCloseTo(0.5, 2);

                const blueVec = Colors.toVector(UI.COLORS.BLUE);
                for (const rw of childRects) {
                    expect(rw.bgColor.x).toBeCloseTo(blueVec.x, 2);
                    expect(rw.bgColor.y).toBeCloseTo(blueVec.y, 2);
                    expect(rw.bgColor.z).toBeCloseTo(blueVec.z, 2);
                    expect(rw.bgAlpha).toBe(1);
                }
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('provides scale and margin sizing defined at construction time', () => {
            const data = 'IMMUTABLE_TEST';
            const matrix = QREncoder.encode(data, QREncoder.ECC.Medium)!;
            const N = matrix.length;

            const qr = new UIQRCode({
                data,
                scale: 2,
                margin: 6,
            });

            try {
                expect(qr.width).toBe((N + 12) * 20);
                expect(qr.height).toBe((N + 12) * 20);
            } finally {
                qr.delete();
            }

            // Margin under MIN_QUIET_ZONE is clamped to 4
            const qrClamped = new UIQRCode({
                data,
                margin: 1,
            });

            try {
                expect(qrClamped.width).toBe((N + 8) * 10);
                expect(qrClamped.height).toBe((N + 8) * 10);
            } finally {
                qrClamped.delete();
            }
        });

        it('supports dynamic in-place background fill mutations via UI.flush()', () => {
            const qr = new UIQRCode({
                data: 'FILL_TEST',
                bgFill: UI.BgFill.Solid,
            });

            try {
                expect(qr.bgFill).toBe(UI.BgFill.Solid);

                // Mutate background fill via setBgFill
                qr.setBgFill(UI.BgFill.Blur);
                expect(qr.bgFill).toBe(UI.BgFill.Blur);

                UI.flush();

                const baseWidget = mockWidgets.get(`ui_${qr.id}`)!;
                expect(baseWidget.bgFill).toBe(UI.Element._getNativeBgFill(UI.BgFill.Blur));
            } finally {
                qr.delete();
            }
        });

        it('correctly cleans up all native widgets on delete()', () => {
            const initialWidgetCount = mockWidgets.size;

            const qr = new UIQRCode({
                data: 'CLEANUP_TEST',
            });

            expect(mockWidgets.size).toBeGreaterThan(initialWidgetCount);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);

            qr.delete();
            expect(qr.drawCallCount).toBeUndefined();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('enforces MAX_QR_CODES = 128 sub-pool limit and slot reuse', () => {
            const qrs: UIQRCode[] = [];
            for (let i = 0; i < UIQRCode.MAX_QR_CODES; ++i) {
                qrs.push(new UIQRCode({ data: `QR_${i}` }));
            }

            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Pool full -> next QR should fail and delete itself cleanly
            const overflowQr = new UIQRCode({ data: 'OVERFLOW' });
            expect(overflowQr.isDeleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Free one slot
            qrs[0].delete();
            drainDrawQueue();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(127);

            // Re-allocate
            const replacement = new UIQRCode({ data: 'REPLACEMENT' });
            expect(replacement.isDeleted).toBe(false);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Clean up all
            replacement.delete();
            for (let i = 1; i < qrs.length; ++i) {
                qrs[i].delete();
            }
            drainDrawQueue();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('supports polymorphic data payloads (Uint8Array and number[])', () => {
            const bytes = new Uint8Array([72, 69, 76, 76, 79]); // "HELLO"
            const qrBytes = new UIQRCode({ data: bytes });
            expect(qrBytes.isDeleted).toBe(false);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);
            qrBytes.delete();

            const numbers = [87, 79, 82, 76, 68]; // "WORLD"
            const qrNums = new UIQRCode({ data: numbers });
            expect(qrNums.isDeleted).toBe(false);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);
            qrNums.delete();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('handles null, undefined, or oversized data gracefully without throwing', () => {
            // Null data
            const nullQr = new UIQRCode({ data: null as any });
            expect(nullQr.isDeleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);

            // Undefined data
            const undefQr = new UIQRCode({ data: undefined as any });
            expect(undefQr.isDeleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);

            // Oversized data (> 2953 bytes, exceeds QR Version 40 capacity)
            const hugeData = new Uint8Array(3000);
            const hugeQr = new UIQRCode({ data: hugeData });
            expect(hugeQr.isDeleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });
    });

    describe('Standalone QR Encoder Matrix Verification (Decoded with jsQR)', () => {
        it('accurately encodes and decodes short strings', () => {
            const payloads = ['HELLO', '1234567890', 'https://bf6.portal', 'Battlefield Portal Scripting'];

            for (const payload of payloads) {
                const matrix = QREncoder.encode(payload, QREncoder.ECC.Medium);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes and decodes all 4 Error Correction Levels (L, M, Q, H)', () => {
            const payload = 'https://discord.gg/portal-creators-123';
            const eccLevels = [QREncoder.ECC.Low, QREncoder.ECC.Medium, QREncoder.ECC.Quartile, QREncoder.ECC.High];

            for (const ecc of eccLevels) {
                const matrix = QREncoder.encode(payload, ecc);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes special characters, symbols, and punctuation', () => {
            const payload = 'ABC xyz 123 !@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\';
            const matrix = QREncoder.encode(payload, QREncoder.ECC.Medium);
            const decoded = decodeMatrix(matrix);
            expect(decoded).toBe(payload);
        });

        it('accurately encodes longer payloads spanning higher QR versions (V2 through V10+)', () => {
            const testSizes = [30, 60, 120, 250];

            for (const size of testSizes) {
                const payload = 'A'.repeat(size);
                const matrix = QREncoder.encode(payload, QREncoder.ECC.Medium);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes URLs with complex query parameters', () => {
            const url =
                'https://portal.battlefield.com/play?server=us-east-1&matchId=987654321&mode=conquest&mods=bf6-portal-utils';
            const matrix = QREncoder.encode(url, QREncoder.ECC.Quartile);
            const decoded = decodeMatrix(matrix);
            expect(decoded).toBe(url);
        });

        it('accurately encodes and decodes raw Uint8Array binary bytes', () => {
            const rawBytes = new Uint8Array([0x00, 0xff, 0x80, 0xfe, 0x01, 0x7f, 0x42, 0x13, 0x37]);
            const matrix = QREncoder.encode(rawBytes, QREncoder.ECC.Medium);
            expect(matrix).not.toBeNull();
            const decodedBytes = decodeMatrixBytes(matrix!);
            expect(decodedBytes).toEqual(Array.from(rawBytes));
        });

        it('accurately encodes and decodes number array payloads', () => {
            const numArray = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const matrix = QREncoder.encode(numArray, QREncoder.ECC.Medium);
            expect(matrix).not.toBeNull();
            const decodedBytes = decodeMatrixBytes(matrix!);
            expect(decodedBytes).toEqual(numArray);
        });

        it('returns null without throwing on invalid, null, or undefined data', () => {
            expect(QREncoder.encode(null as any)).toBeNull();
            expect(QREncoder.encode(undefined as any)).toBeNull();
            expect(QREncoder.encode({ invalid: true } as any)).toBeNull();
        });

        it('returns null without throwing when payload exceeds QR Version 40 capacity', () => {
            const oversizedBytes = new Uint8Array(3000);
            expect(QREncoder.encode(oversizedBytes, QREncoder.ECC.Low)).toBeNull();
        });

        it('rejects payload that exceeds MAX_QR_VERSION and deallocates cleanly', () => {
            const largePayload = new Uint8Array(800);
            expect(
                QREncoder.encode(largePayload, QREncoder.ECC.Medium, { maxVersion: UIQRCode.MAX_QR_VERSION })
            ).toBeNull();

            const initialActive = UIQRCode.getActiveQRCodeCount();
            const qr = new UIQRCode({ data: largePayload });

            expect(qr.isDeleted).toBe(true);
            expect(qr.isReady).toBeUndefined();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(initialActive);
        });

        it('supports encodeInternal with explicit scratch buffer and parameter validation', () => {
            const buffer = new Uint8Array(4096);
            const size = QREncoder.encodeToBuffer('HELLO_PORTAL', QREncoder.ECC.Medium, buffer);
            expect(size).toBe(21); // Version 1 is 21x21

            // Buffer too small
            const tinyBuffer = new Uint8Array(10);
            expect(QREncoder.encodeToBuffer('HELLO_PORTAL', QREncoder.ECC.Medium, tinyBuffer)).toBe(-1);

            // Null or invalid scratch buffer
            expect(QREncoder.encodeToBuffer('HELLO_PORTAL', QREncoder.ECC.Medium, null as any)).toBe(-1);

            // Null or invalid data
            expect(QREncoder.encodeToBuffer(null as any, QREncoder.ECC.Medium, buffer)).toBe(-1);
            expect(QREncoder.encodeToBuffer(undefined as any, QREncoder.ECC.Medium, buffer)).toBe(-1);
            expect(QREncoder.encodeToBuffer({ invalid: true } as any, QREncoder.ECC.Medium, buffer)).toBe(-1);

            // Oversized payload
            const oversized = new Uint8Array(3000);
            expect(QREncoder.encodeToBuffer(oversized, QREncoder.ECC.Low, buffer)).toBe(-1);
        });

        it('verifies getDataByteLength, getEccIndex, and selectVersion helper functions', () => {
            // getDataByteLength
            expect(QREncoder.getDataByteLength('HELLO')).toBe(5);
            expect(QREncoder.getDataByteLength('こんにちは')).toBe(15); // 5 Japanese characters * 3 UTF-8 bytes
            expect(QREncoder.getDataByteLength(new Uint8Array(10))).toBe(10);
            expect(QREncoder.getDataByteLength([1, 2, 3, 4])).toBe(4);
            expect(QREncoder.getDataByteLength(new Uint32Array(5))).toBe(20);
            expect(QREncoder.getDataByteLength(null as any)).toBe(-1);

            // getEccIndex
            expect(QREncoder.getEccIndex(QREncoder.ECC.Low)).toBe(0);
            expect(QREncoder.getEccIndex(QREncoder.ECC.Medium)).toBe(1);
            expect(QREncoder.getEccIndex(QREncoder.ECC.Quartile)).toBe(2);
            expect(QREncoder.getEccIndex(QREncoder.ECC.High)).toBe(3);
            expect(QREncoder.getEccIndex('UNKNOWN' as any)).toBe(1);

            // selectVersion
            const vInfo = QREncoder.selectVersion(10, 1);
            expect(vInfo).not.toBeNull();
            expect(vInfo!.version).toBe(1);
            expect(vInfo!.totalDataCodewords).toBe(16);

            // Exceeding capacity returns null
            expect(QREncoder.selectVersion(4000, 1)).toBeNull();
        });
    });

    describe('Throttling Dispatcher & isReady Lifecycle', () => {
        it('is ready on first tick when rectangle count is within tickBudget / drawCost', () => {
            UIQRCode.tickBudget = 128;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'A' });

            try {
                expect(qr.isReady).toBe(false);
                expect(qr.drawCallCount).toBe(2);
                expect(qr.isDeleted).toBe(false);

                Events.OnTickStart.trigger();

                expect(qr.isReady).toBe(true);
                expect(qr.drawCallCount).toBeGreaterThan(2);
                expect(qr.isDeleted).toBe(false);
            } finally {
                qr.delete();
                drainDrawQueue();
                expect(qr.isReady).toBeUndefined();
            }
        });

        it('throttles across ticks when budget is lower than rectangle count', () => {
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'MULTI_TICK_STREAMING_TEST' });

            try {
                // Immediately after constructor, only base + qr containers (2 draw calls)
                expect(qr.isReady).toBe(false);
                expect(qr.drawCallCount).toBe(2);

                // Tick 1: draws first 10 rectangles
                Events.OnTickStart.trigger();
                expect(qr.isReady).toBe(false);
                expect(qr.drawCallCount).toBe(10 + 2);

                // Tick 2: draws another 10 rectangles
                Events.OnTickStart.trigger();
                expect(qr.drawCallCount).toBe(20 + 2);

                // Advance ticks until drawing completes
                let ticks = 0;
                while (!qr.isReady && ticks < 20) {
                    Events.OnTickStart.trigger();
                    ticks++;
                }

                expect(qr.isReady).toBe(true);
                expect(qr.drawCallCount).toBeGreaterThan(20 + 2);
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('drains pending rectangles across ticks when throttled', () => {
            UIQRCode.tickBudget = 5;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'FLUSH_DRAIN_TEST' });

            try {
                expect(qr.isReady).toBe(false);
                expect(qr.drawCallCount).toBe(2);

                Events.OnTickStart.trigger();
                expect(qr.isReady).toBe(false);
                expect(qr.drawCallCount).toBe(5 + 2);

                drainDrawQueue(50);

                expect(qr.isReady).toBe(true);
                expect(qr.drawCallCount).toBeGreaterThan(7);
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('queues multiple QR codes in Tier 1 and processes them sequentially', () => {
            UIQRCode.tickBudget = 15;
            UIQRCode.drawCost = 1.0;
            const qr1 = new UIQRCode({ data: 'FIRST_QUEUED_QR_CODE' });
            const qr2 = new UIQRCode({ data: 'SECOND_QUEUED_QR_CODE' });

            try {
                // Both QR 1 and QR 2 are queued initially (0 rects drawn)
                expect(qr1.isReady).toBe(false);
                expect(qr1.drawCallCount).toBe(2);

                expect(qr2.isReady).toBe(false);
                expect(qr2.drawCallCount).toBe(2); // Only base + qr containers

                // Tick 1: QR 1 becomes active and draws 15 rectangles
                Events.OnTickStart.trigger();
                expect(qr1.drawCallCount).toBe(15 + 2);
                expect(qr2.drawCallCount).toBe(2);

                // Advance until QR 1 is finished
                while (!qr1.isReady) {
                    Events.OnTickStart.trigger();
                }

                expect(qr1.isReady).toBe(true);

                // Now advance until QR 2 is finished
                while (!qr2.isReady) {
                    Events.OnTickStart.trigger();
                }

                expect(qr2.isReady).toBe(true);
                expect(qr2.drawCallCount).toBeGreaterThan(2);
            } finally {
                qr1.delete();
                qr2.delete();
                drainDrawQueue();
            }
        });

        it('handles mid-draw deletion cleanly without leaving orphaned state', () => {
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            const qr1 = new UIQRCode({ data: 'ABORT_MID_DRAW_TEST' });
            const qr2 = new UIQRCode({ data: 'SECOND_QR_WAITING' });

            try {
                expect(qr1.isReady).toBe(false);
                expect(qr2.isReady).toBe(false);

                // Tick 1: QR 1 activates and draws 10 rectangles
                Events.OnTickStart.trigger();
                expect(qr1.drawCallCount).toBe(10 + 2);

                // Delete QR 1 while it is actively being throttled
                qr1.delete();
                expect(qr1.isReady).toBeUndefined();
                expect(qr1.isDeleted).toBe(true);

                // Trigger next tick: QR 1 deletion completes and QR 2 activates
                Events.OnTickStart.trigger();
                expect(qr2.drawCallCount).toBeGreaterThan(2);

                drainDrawQueue(50);
                expect(qr2.isReady).toBe(true);
            } finally {
                qr2.delete();
                drainDrawQueue();
            }
        });

        it('safely skips Tier 1 queued QR if deleted before its turn', () => {
            UIQRCode.tickBudget = 5;
            UIQRCode.drawCost = 1.0;
            const qr1 = new UIQRCode({ data: 'QR1_ACTIVE' });
            const qr2 = new UIQRCode({ data: 'QR2_QUEUED' });
            const qr3 = new UIQRCode({ data: 'QR3_QUEUED' });

            try {
                // Delete qr2 while waiting in queue
                qr2.delete();
                expect(qr2.isReady).toBeUndefined();

                // Flush queue: should finish qr1 and qr3 without throwing
                drainDrawQueue(50);

                expect(qr1.isReady).toBe(true);
                expect(qr3.isReady).toBe(true);
            } finally {
                qr1.delete();
                qr3.delete();
                drainDrawQueue();
            }
        });

        it('returns undefined for isReady on invalid or failed QR initialization', () => {
            const invalidQr = new UIQRCode({ data: null as unknown as string });
            expect(invalidQr.isReady).toBeUndefined();
            expect(invalidQr.isDeleted).toBe(true);
        });

        it('tracks rendering progress from 0% while queued to 100% when complete', () => {
            UIQRCode.tickBudget = 5;
            UIQRCode.drawCost = 1.0;
            const qr1 = new UIQRCode({ data: 'PROGRESS_TRACKING_1' });
            const qr2 = new UIQRCode({ data: 'PROGRESS_TRACKING_2' });

            try {
                // Both are queued in Tier 1, progress should be 0
                expect(qr1.progress).toBe(0);
                expect(qr1.isReady).toBe(false);
                expect(qr2.progress).toBe(0);
                expect(qr2.isReady).toBe(false);

                // Tick 1: qr1 is active, partially drawn
                Events.OnTickStart.trigger();
                expect(qr1.progress).toBeGreaterThan(0);
                expect(qr1.progress).toBeLessThan(100);
                expect(qr1.isReady).toBe(false);

                // qr2 is still queued in Tier 1, progress should be 0
                expect(qr2.progress).toBe(0);
                expect(qr2.isReady).toBe(false);

                // Advance ticks for qr1
                let lastProgress = qr1.progress!;
                while (qr1.progress! < 100) {
                    Events.OnTickStart.trigger();
                    expect(qr1.progress).toBeGreaterThanOrEqual(lastProgress);
                    lastProgress = qr1.progress!;
                }

                expect(qr1.progress).toBe(100);
                expect(qr1.isReady).toBe(true);

                // qr2 should now become active on next tick or be advancing
                Events.OnTickStart.trigger();
                expect(qr2.progress).toBeGreaterThan(0);

                // Complete qr2
                drainDrawQueue(50);
                expect(qr2.progress).toBe(100);
                expect(qr2.isReady).toBe(true);
            } finally {
                qr1.delete();
                qr2.delete();
                drainDrawQueue();
            }
        });

        it('returns undefined for progress on deleted or failed QR codes', () => {
            UIQRCode.tickBudget = 256;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'DELETE_PROGRESS_TEST' });
            Events.OnTickStart.trigger();
            expect(qr.progress).toBe(100);
            qr.delete();
            drainDrawQueue();
            expect(qr.progress).toBeUndefined();

            const invalidQr = new UIQRCode({ data: null as unknown as string });
            expect(invalidQr.progress).toBeUndefined();
        });
    });

    describe('Throttled Color Updates & Asynchronous Deletion', () => {
        it('throttles setColor() across ticks and reports updating progress and state', () => {
            UIQRCode.tickBudget = 256;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'COLOR_UPDATE_THROTTLE_TEST' });
            Events.OnTickStart.trigger();
            expect(qr.state).toBe(UIQRCode.State.Idle);
            expect(qr.isReady).toBe(true);
            expect(qr.progress).toBe(100);

            // Restrict update capacity to 20 per tick
            UIQRCode.tickBudget = 20;
            UIQRCode.updateCost = 1.0;

            qr.setColor({ r: 1, g: 0, b: 0 });

            // After calling setColor, state is Updating and queued (progress is 0 until first update tick)
            expect(qr.state).toBe(UIQRCode.State.Updating);
            expect(qr.isReady).toBe(false);
            expect(qr.progress).toBe(0);

            // Trigger tick 1: first batch of 20 updates runs
            Events.OnTickStart.trigger();
            expect(qr.state).toBe(UIQRCode.State.Updating);
            expect(qr.isReady).toBe(false);
            expect(qr.progress).toBeGreaterThan(0);
            expect(qr.progress).toBeLessThan(100);

            // Advance ticks to drain the color update
            while (qr.state === UIQRCode.State.Updating) {
                Events.OnTickStart.trigger();
            }

            expect(qr.state).toBe(UIQRCode.State.Idle);
            expect(qr.isReady).toBe(true);
            expect(qr.progress).toBe(100);
            qr.delete();
            drainDrawQueue();
        });

        it('throttles delete() across ticks and deletes containers only after all child rectangles are removed', () => {
            UIQRCode.tickBudget = 256;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({ data: 'CONTAINER_DELETION_ORDER_TEST' });
            Events.OnTickStart.trigger();
            expect(qr.isReady).toBe(true);
            const initialDrawCalls = qr.drawCallCount!;
            expect(initialDrawCalls).toBeGreaterThan(30);

            const baseWidget = (qr as unknown as { _uiWidget: { deleted?: boolean } })._uiWidget;
            const qrContainerWidget = (qr as unknown as { _qrWidget: { deleted?: boolean } })._qrWidget;
            expect(baseWidget).toBeDefined();
            expect(qrContainerWidget).toBeDefined();

            // Restrict delete capacity to 15 per tick
            UIQRCode.tickBudget = 15;
            UIQRCode.deleteCost = 1.0;

            qr.delete();

            // Instance is immediately marked deleted
            expect(qr.isDeleted).toBe(true);
            expect(qr.isReady).toBeUndefined();
            expect(qr.progress).toBeUndefined();

            // Slot is still held by the throttler while child widgets are being deleted
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);

            // Containers must NOT be deleted yet!
            expect(baseWidget.deleted).toBeFalsy();
            expect(qrContainerWidget.deleted).toBeFalsy();

            // Advance ticks until deletion finishes
            drainDrawQueue(20);

            // Now all rectangles, QR container, and Base container must be deleted, and slot freed
            expect(baseWidget.deleted).toBe(true);
            expect(qrContainerWidget.deleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('handles mid-draw delete by deleting only the already drawn rectangles', () => {
            // Draw only 10 rectangles on creation
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            UIQRCode.deleteCost = 0.1;

            const qr = new UIQRCode({ data: 'MID_DRAW_DELETE_TEST' });
            expect(qr.state).toBe(UIQRCode.State.Drawing);
            expect(qr.drawCallCount).toBe(2);

            // Tick 1: draws first 10 rectangles
            Events.OnTickStart.trigger();
            expect(qr.state).toBe(UIQRCode.State.Drawing);
            expect(qr.drawCallCount).toBe(10 + 2);

            // Delete immediately: only 10 child rectangles were drawn
            qr.delete();
            expect(qr.isDeleted).toBe(true);

            // Deletion finishes on next tick
            drainDrawQueue(5);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('handles mid-draw setColor by seamlessly transitioning to updating state to recolor all rectangles', () => {
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            UIQRCode.updateCost = 0.5;

            const qr = new UIQRCode({
                data: 'MID_DRAW_COLOR_TEST',
                color: { r: 1, g: 0, b: 0 },
            });
            const qrId = (qr as unknown as { _id: number })._id;

            try {
                expect(qr.state).toBe(UIQRCode.State.Drawing);
                expect(qr.drawCallCount).toBe(2);

                // Tick 1: draws first 10 rectangles (red)
                Events.OnTickStart.trigger();
                expect(qr.state).toBe(UIQRCode.State.Drawing);
                expect(qr.drawCallCount).toBe(10 + 2);

                // Initial 10 rectangles are red
                const firstWidget = mod.FindUIWidgetWithName(`ui_qr_${qrId}_1`) as unknown as {
                    bgColor: { x: number; y: number; z: number };
                };
                expect(firstWidget.bgColor.x).toBe(1);
                expect(firstWidget.bgColor.y).toBe(0);
                expect(firstWidget.bgColor.z).toBe(0);

                // Update color mid-draw to blue
                qr.setColor({ r: 0, g: 0, b: 1 });

                // Remains in drawing state until all rectangles are instantiated
                expect(qr.state).toBe(UIQRCode.State.Drawing);
                expect(qr.isReady).toBe(false);

                // Advance ticks for drawing to finish
                while (qr.state === UIQRCode.State.Drawing) {
                    Events.OnTickStart.trigger();
                }

                // Drawing finished: must have transitioned into Updating to recolor early rectangles
                expect(qr.state).toBe(UIQRCode.State.Updating);
                expect(qr.isReady).toBe(false);

                // Advance ticks until updating completes
                while (qr.state === UIQRCode.State.Updating) {
                    Events.OnTickStart.trigger();
                }

                expect(qr.state).toBe(UIQRCode.State.Idle);
                expect(qr.isReady).toBe(true);
                expect(qr.progress).toBe(100);

                // Verify all rectangles, including the first batch, are now blue
                const totalRects = qr.drawCallCount! - 2;
                expect(totalRects).toBeGreaterThan(30);

                for (let i = 1; i <= totalRects; ++i) {
                    const rectWidget = mod.FindUIWidgetWithName(`ui_qr_${qrId}_${i}`) as unknown as {
                        bgColor: { x: number; y: number; z: number };
                    };
                    expect(rectWidget.bgColor.x).toBe(0);
                    expect(rectWidget.bgColor.y).toBe(0);
                    expect(rectWidget.bgColor.z).toBe(1);
                }
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('handles mid-update updates by resetting cursor and applying the latest color across all rectangles', () => {
            UIQRCode.tickBudget = 256;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({
                data: 'MID_UPDATE_UPDATE_TEST',
                color: { r: 1, g: 0, b: 0 },
            });
            Events.OnTickStart.trigger();
            const qrId = (qr as unknown as { _id: number })._id;

            try {
                expect(qr.isReady).toBe(true);
                expect(qr.state).toBe(UIQRCode.State.Idle);

                // Restrict update capacity so setColor takes multiple ticks
                UIQRCode.tickBudget = 10;
                UIQRCode.updateCost = 1.0;

                // Start updating to green
                qr.setColor({ r: 0, g: 1, b: 0 });
                expect(qr.state).toBe(UIQRCode.State.Updating);
                expect(qr.isReady).toBe(false);

                // Tick 1: updates first 10 rectangles to green
                Events.OnTickStart.trigger();
                expect(qr.state).toBe(UIQRCode.State.Updating);

                // Initial 10 rectangles are green
                const w1 = mod.FindUIWidgetWithName(`ui_qr_${qrId}_1`) as unknown as {
                    bgColor: { x: number; y: number; z: number };
                };
                expect(w1.bgColor.x).toBe(0);
                expect(w1.bgColor.y).toBe(1);
                expect(w1.bgColor.z).toBe(0);

                // Mid-update: request a new color (blue)
                qr.setColor({ r: 0, g: 0, b: 1 });
                expect(qr.state).toBe(UIQRCode.State.Updating);
                expect(qr.isReady).toBe(false);

                // Advance ticks until updating finishes
                while (qr.state === UIQRCode.State.Updating) {
                    Events.OnTickStart.trigger();
                }

                expect(qr.state).toBe(UIQRCode.State.Idle);
                expect(qr.isReady).toBe(true);
                expect(qr.progress).toBe(100);

                // All rectangles must now be blue
                const totalRects = qr.drawCallCount! - 2;
                for (let i = 1; i <= totalRects; ++i) {
                    const rectWidget = mod.FindUIWidgetWithName(`ui_qr_${qrId}_${i}`) as unknown as {
                        bgColor: { x: number; y: number; z: number };
                    };
                    expect(rectWidget.bgColor.x).toBe(0);
                    expect(rectWidget.bgColor.y).toBe(0);
                    expect(rectWidget.bgColor.z).toBe(1);
                }
            } finally {
                qr.delete();
                drainDrawQueue();
            }
        });

        it('handles mid-update deletes by safely deleting all child rectangles before removing containers', () => {
            UIQRCode.tickBudget = 256;
            UIQRCode.drawCost = 1.0;
            const qr = new UIQRCode({
                data: 'MID_UPDATE_DELETE_TEST',
                color: { r: 1, g: 0, b: 0 },
            });
            Events.OnTickStart.trigger();

            expect(qr.isReady).toBe(true);
            const initialDrawCalls = qr.drawCallCount!;
            expect(initialDrawCalls).toBeGreaterThan(30);

            const baseWidget = (qr as unknown as { _uiWidget: { deleted?: boolean } })._uiWidget;
            const qrContainerWidget = (qr as unknown as { _qrWidget: { deleted?: boolean } })._qrWidget;

            // Restrict update cost and delete cost
            UIQRCode.tickBudget = 10;
            UIQRCode.updateCost = 1.0;
            UIQRCode.deleteCost = 0.8;

            // Start color update
            qr.setColor({ r: 0, g: 1, b: 0 });
            expect(qr.state).toBe(UIQRCode.State.Updating);
            expect(qr.isReady).toBe(false);

            // Mid-update: request deletion
            qr.delete();

            // Instance is immediately marked deleted
            expect(qr.isDeleted).toBe(true);
            expect(qr.isReady).toBeUndefined();
            expect(qr.progress).toBeUndefined();

            // Slot is still held while rectangles are being deleted across ticks
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);
            expect(baseWidget.deleted).toBeFalsy();
            expect(qrContainerWidget.deleted).toBeFalsy();

            // Advance ticks until deletion completes
            drainDrawQueue(20);

            // Containers must only be deleted after child widgets are all removed
            expect(baseWidget.deleted).toBe(true);
            expect(qrContainerWidget.deleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('handles queued mid-update color updates while waiting in Tier 1 queue', () => {
            // Create and fully render qr2 first
            const qr2 = new UIQRCode({
                data: 'QUEUED_UPDATE_TARGET',
                color: { r: 1, g: 0, b: 0 },
            });
            drainDrawQueue(20);
            expect(qr2.isReady).toBe(true);
            const qr2Id = (qr2 as unknown as { _id: number })._id;

            // Make throttler busy by drawing qr1 across multiple ticks
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            const qr1 = new UIQRCode({ data: 'ACTIVE_BUSY_QR_1' });
            expect(qr1.state).toBe(UIQRCode.State.Drawing);

            try {
                // Request green update on qr2 while qr1 is active -> enters Tier 1 queue
                qr2.setColor({ r: 0, g: 1, b: 0 });
                expect(qr2.state).toBe(UIQRCode.State.Updating);
                expect(qr2.isReady).toBe(false);

                // While qr2 is queued in Tier 1, request blue update
                qr2.setColor({ r: 0, g: 0, b: 1 });
                expect(qr2.state).toBe(UIQRCode.State.Updating);
                expect(qr2.isReady).toBe(false);

                // Drain queue until both complete
                drainDrawQueue(30);

                expect(qr1.isReady).toBe(true);
                expect(qr2.isReady).toBe(true);
                expect(qr2.state).toBe(UIQRCode.State.Idle);

                // All rectangles of qr2 must be blue
                const totalRects = qr2.drawCallCount! - 2;
                for (let i = 1; i <= totalRects; ++i) {
                    const rectWidget = mod.FindUIWidgetWithName(`ui_qr_${qr2Id}_${i}`) as unknown as {
                        bgColor: { x: number; y: number; z: number };
                    };
                    expect(rectWidget.bgColor.x).toBe(0);
                    expect(rectWidget.bgColor.y).toBe(0);
                    expect(rectWidget.bgColor.z).toBe(1);
                }
            } finally {
                qr1.delete();
                qr2.delete();
                drainDrawQueue();
            }
        });

        it('handles queued mid-update deletes while waiting in Tier 1 queue', () => {
            // Create and fully render qr2 first
            const qr2 = new UIQRCode({
                data: 'QUEUED_DELETE_TARGET',
                color: { r: 1, g: 0, b: 0 },
            });
            drainDrawQueue(20);
            expect(qr2.isReady).toBe(true);

            const baseWidget = (qr2 as unknown as { _uiWidget: { deleted?: boolean } })._uiWidget;
            const qrContainerWidget = (qr2 as unknown as { _qrWidget: { deleted?: boolean } })._qrWidget;

            // Make throttler busy by drawing qr1 across multiple ticks
            UIQRCode.tickBudget = 10;
            UIQRCode.drawCost = 1.0;
            UIQRCode.deleteCost = 0.6;
            const qr1 = new UIQRCode({ data: 'ACTIVE_BUSY_QR_2' });
            expect(qr1.state).toBe(UIQRCode.State.Drawing);

            try {
                // Request color update on qr2 while qr1 is active -> enters Tier 1 queue
                qr2.setColor({ r: 0, g: 1, b: 0 });
                expect(qr2.state).toBe(UIQRCode.State.Updating);

                // While queued, request deletion
                qr2.delete();
                expect(qr2.isDeleted).toBe(true);
                expect(qr2.isReady).toBeUndefined();

                // Containers still alive while queued
                expect(baseWidget.deleted).toBeFalsy();
                expect(qrContainerWidget.deleted).toBeFalsy();

                // Drain queue until qr1 finishes and qr2 deletion executes
                drainDrawQueue(30);

                // Now qr2 containers must be deleted
                expect(baseWidget.deleted).toBe(true);
                expect(qrContainerWidget.deleted).toBe(true);
            } finally {
                qr1.delete();
                drainDrawQueue();
            }
        });
    });

    describe('UIQRCodeExtended (Tooling & Web Studio Encoder)', () => {
        it('encodes payload and returns merged rectangles and accurate metrics', () => {
            const result = UIQRCodeExtended.encodeToRectangles('https://battlefield.com', UIQRCode.ECC.Medium);
            expect(result).not.toBeNull();
            expect(result!.size).toBeGreaterThan(0);
            expect(result!.version).toBeGreaterThanOrEqual(1);
            expect(result!.matrix.length).toBe(result!.size);
            expect(result!.totalRectangles).toBeGreaterThan(0);
            expect(result!.naiveCount).toBeGreaterThan(result!.totalRectangles);
            expect(result!.savings).toBeGreaterThan(0);
            expect(result!.rectangles.length).toBe(result!.totalRectangles);

            for (const rect of result!.rectangles) {
                expect(rect.col).toBeGreaterThanOrEqual(0);
                expect(rect.row).toBeGreaterThanOrEqual(0);
                expect(rect.w).toBeGreaterThan(0);
                expect(rect.h).toBeGreaterThan(0);
            }
        });

        it('returns null on invalid payload or capacity overflow', () => {
            // @ts-expect-error - testing invalid input
            expect(UIQRCodeExtended.encodeToRectangles(null)).toBeNull();
            // @ts-expect-error - testing invalid input
            expect(UIQRCodeExtended.encode(null)).toBeNull();
        });
    });
});
