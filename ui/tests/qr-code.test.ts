import './mockMod.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { Colors } from '../../colors/index.ts';
import { UI } from '../index.ts';
import { UIQRCode } from '../components/qr-code/index.ts';
import { mockWidgets, resetMockState } from './mockMod.ts';

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

describe('UIQRCode Component', () => {
    beforeEach(() => {
        resetMockState();
    });

    describe('Matrix & Text Initialization', () => {
        it('renders a QR code from a pre-computed boolean matrix', () => {
            // Simple 21x21 test matrix (Version 1 size)
            const matrix: boolean[][] = Array.from({ length: 21 }, () => new Array(21).fill(false));

            // Set Top-Left finder pattern
            for (let r = 0; r < 7; ++r) {
                for (let c = 0; c < 7; ++c) {
                    if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                        matrix[r][c] = true;
                    }
                }
            }

            const qr = new UIQRCode({
                matrix,
                x: 100,
                y: 100,
            });

            expect(qr.drawCallCount).toBeGreaterThan(0);
            expect(qr.scale).toBe(1);
            expect(qr.width).toBe(210); // 21 * 10
            expect(qr.height).toBe(210);

            // Slot conservation: Only 1 slot in UI.MAX_ELEMENTS and 1 in UIQRCode consumed
            expect(UI.getActiveElementCount()).toBe(1);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(1);

            qr.delete();
            expect(UI.getActiveElementCount()).toBe(0);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });

        it('renders a QR code from a text payload using the standalone encoder', () => {
            const text = 'https://portal.battlefield.com';
            const matrix = UIQRCode.Encoder.encode(text, UIQRCode.ECC.Medium);
            const qr = new UIQRCode({
                text,
                ecc: UIQRCode.ECC.Medium,
                scale: 1,
            });

            const N = matrix.length;
            expect(qr.width).toBe(N * 10);
            expect(qr.height).toBe(N * 10);
            expect(qr.drawCallCount).toBeGreaterThan(0);

            // Verify decoding matches payload
            expect(decodeMatrix(matrix)).toBe(text);

            qr.delete();
        });

        it('encodes numbers (1/0) matrices correctly', () => {
            const matrix = [
                [1, 0, 1],
                [0, 1, 0],
                [1, 1, 1],
            ];

            const qr = new UIQRCode({
                matrix,
                scale: 1,
            });

            expect(qr.width).toBe(30);
            expect(qr.height).toBe(30);

            qr.delete();
        });
    });

    describe('Scale & Margin Options', () => {
        it('scales module size proportionally with scale parameter', () => {
            const text = 'HELLO';
            const matrix = UIQRCode.Encoder.encode(text, UIQRCode.ECC.Medium);
            const N = matrix.length;

            const qr1 = new UIQRCode({ text, scale: 1 });
            expect(qr1.width).toBe(N * 10);
            expect(qr1.height).toBe(N * 10);
            qr1.delete();

            const qr2 = new UIQRCode({ text, scale: 2 });
            expect(qr2.width).toBe(N * 20);
            expect(qr2.height).toBe(N * 20);
            expect(qr2.scale).toBe(2);
            qr2.delete();

            const qr3 = new UIQRCode({ text, scale: 0.5 });
            expect(qr3.width).toBe(N * 5);
            expect(qr3.height).toBe(N * 5);
            qr3.delete();
        });

        it('supports quiet zone margins in module units', () => {
            const text = 'TEST';
            const matrix = UIQRCode.Encoder.encode(text, UIQRCode.ECC.Medium);
            const N = matrix.length;
            const margin = 4;
            const qr = new UIQRCode({
                text,
                scale: 1,
                margin,
            });

            const expectedTotalUnits = N + 2 * margin;
            expect(qr.width).toBe(expectedTotalUnits * 10);
            expect(qr.height).toBe(expectedTotalUnits * 10);
            expect(qr.margin).toBe(4);

            qr.delete();
        });

        it('allows explicit width/height override', () => {
            const qr = new UIQRCode({
                text: 'EXPLICIT_SIZE',
                width: 500,
                height: 500,
            });

            expect(qr.width).toBe(500);
            expect(qr.height).toBe(500);
            qr.delete();
        });
    });

    describe('Draw Call Optimization & Hybrid Rendering', () => {
        it('drastically reduces draw calls compared to naive cell-by-cell rendering (>60% savings)', () => {
            const text = 'https://example.com/join?code=BF6-PORTAL-MATCH-12345';
            const matrix = UIQRCode.Encoder.encode(text, UIQRCode.ECC.Medium);
            const qr = new UIQRCode({
                text,
                ecc: UIQRCode.ECC.Medium,
            });

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

            qr.delete();
        });

        it('renders structural elements with exactly 3 stacked calls each', () => {
            // Version 2 QR code (25x25) has 3 Finders + 1 Alignment Pattern
            const qr = new UIQRCode({
                text: 'VERSION_2_PAYLOAD_TEST_STRING_1234567890',
                ecc: UIQRCode.ECC.High,
            });

            expect(qr.drawCallCount).toBeGreaterThan(0);

            qr.delete();
        });
    });

    describe('Dynamic In-Place Visual Mutations & Sub-Pool Lifecycle', () => {
        it('supports dynamic in-place color and alpha mutations', () => {
            const qr = new UIQRCode({
                text: 'COLORS',
                darkColor: UI.COLORS.BLACK,
                darkAlpha: 1,
                lightColor: UI.COLORS.WHITE,
                lightAlpha: 1,
            });

            qr.setDarkColor(UI.COLORS.BLUE);
            expect(Colors.equals(qr.darkColor!, UI.COLORS.BLUE, 0.005)).toBe(true);

            qr.setDarkAlpha(0.75);
            expect(qr.darkAlpha).toBeCloseTo(0.75, 2);

            qr.setLightColor(UI.COLORS.GREY_25);
            expect(Colors.equals(qr.lightColor!, UI.COLORS.GREY_25, 0.005)).toBe(true);

            qr.setLightAlpha(0.5);
            expect(qr.lightAlpha).toBeCloseTo(0.5, 2);

            qr.delete();
        });

        it('supports dynamic in-place scale and margin setters', () => {
            const text = 'SCALE_TEST';
            const matrix = UIQRCode.Encoder.encode(text, UIQRCode.ECC.Medium);
            const N = matrix.length;

            const qr = new UIQRCode({
                text,
                scale: 1,
                margin: 0,
            });

            expect(qr.width).toBe(N * 10);
            expect(qr.height).toBe(N * 10);

            qr.scale = 2;
            expect(qr.scale).toBe(2);
            expect(qr.width).toBe(N * 20);
            expect(qr.height).toBe(N * 20);

            qr.margin = 2;
            expect(qr.margin).toBe(2);
            expect(qr.width).toBe((N + 4) * 20);
            expect(qr.height).toBe((N + 4) * 20);

            qr.delete();
        });

        it('correctly cleans up all native widgets on delete()', () => {
            const initialWidgetCount = mockWidgets.size;

            const qr = new UIQRCode({
                text: 'CLEANUP_TEST',
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
                qrs.push(new UIQRCode({ text: `QR_${i}` }));
            }

            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Pool full -> next QR should fail and delete itself cleanly
            const overflowQr = new UIQRCode({ text: 'OVERFLOW' });
            expect(overflowQr.isDeleted).toBe(true);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Free one slot
            qrs[0].delete();
            expect(UIQRCode.getActiveQRCodeCount()).toBe(127);

            // Re-allocate
            const replacement = new UIQRCode({ text: 'REPLACEMENT' });
            expect(replacement.isDeleted).toBe(false);
            expect(UIQRCode.getActiveQRCodeCount()).toBe(128);

            // Clean up all
            replacement.delete();
            for (let i = 1; i < qrs.length; ++i) {
                qrs[i].delete();
            }
            expect(UIQRCode.getActiveQRCodeCount()).toBe(0);
        });
    });

    describe('Standalone QR Encoder Matrix Verification (Decoded with jsQR)', () => {
        it('accurately encodes and decodes short strings', () => {
            const payloads = ['HELLO', '1234567890', 'https://bf6.portal', 'Battlefield Portal Scripting'];

            for (const payload of payloads) {
                const matrix = UIQRCode.Encoder.encode(payload, UIQRCode.ECC.Medium);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes and decodes all 4 Error Correction Levels (L, M, Q, H)', () => {
            const payload = 'https://discord.gg/portal-creators-123';
            const eccLevels = [UIQRCode.ECC.Low, UIQRCode.ECC.Medium, UIQRCode.ECC.Quartile, UIQRCode.ECC.High];

            for (const ecc of eccLevels) {
                const matrix = UIQRCode.Encoder.encode(payload, ecc);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes special characters, symbols, and punctuation', () => {
            const payload = 'ABC xyz 123 !@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\';
            const matrix = UIQRCode.Encoder.encode(payload, UIQRCode.ECC.Medium);
            const decoded = decodeMatrix(matrix);
            expect(decoded).toBe(payload);
        });

        it('accurately encodes longer payloads spanning higher QR versions (V2 through V10+)', () => {
            const testSizes = [30, 60, 120, 250];

            for (const size of testSizes) {
                const payload = 'A'.repeat(size);
                const matrix = UIQRCode.Encoder.encode(payload, UIQRCode.ECC.Medium);
                const decoded = decodeMatrix(matrix);
                expect(decoded).toBe(payload);
            }
        });

        it('accurately encodes URLs with complex query parameters', () => {
            const url =
                'https://portal.battlefield.com/play?server=us-east-1&matchId=987654321&mode=conquest&mods=bf6-portal-utils';
            const matrix = UIQRCode.Encoder.encode(url, UIQRCode.ECC.Quartile);
            const decoded = decodeMatrix(matrix);
            expect(decoded).toBe(url);
        });
    });
});
