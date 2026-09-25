import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
    base122ToBytes,
    base64ToBytes,
    bytesToBase122,
    bytesToBase64,
    decodeBase122,
    deserializePixelArt,
    encodeBase122,
    encodePixelArtFromFile,
    encodePixelArtFromRgba,
    deltaEOklab,
    findNearestAlphaIndex,
    generateAlphaPalette,
    hilbert3D,
    isBase122,
    parseColor,
    quantizeAlphaMedianCut,
    quantizeAlphaMostFrequent,
    quantizeAlphaPalette,
    resolveAlphaThreshold,
    RgbaColor,
    rgbToHsv,
    rgbToOklab,
    runCli,
    serializePixelArt,
    sortPalettePerceptual,
} from '../scripts/encode-pixel-art.ts';

describe('Pixel Art Encoder & Serialization Engine', () => {
    describe('Serialization and Deserialization Round-Trip', () => {
        it('round-trips 8-bit coordinates with multi-color palette and opacity', () => {
            const width = 32;
            const height = 32;
            const hasOpacity = true;
            const is16BitCoords = false;
            const isMonochrome = false;
            const palette: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 128 },
                { r: 0, g: 0, b: 255, a: 64 },
            ];
            const rectangles: EncodedRect[] = [
                { x: 0, y: 0, w: 32, h: 16, paletteIndex: 0 },
                { x: 4, y: 16, w: 12, h: 8, paletteIndex: 1 },
                { x: 20, y: 20, w: 4, h: 4, paletteIndex: 2 },
            ];

            const binary = serializePixelArt(
                width,
                height,
                hasOpacity,
                is16BitCoords,
                isMonochrome,
                palette,
                rectangles
            );

            // Test deserializing from raw Uint8Array
            const decodedFromBytes = deserializePixelArt(binary);
            expect(decodedFromBytes.width).toBe(width);
            expect(decodedFromBytes.height).toBe(height);
            expect(decodedFromBytes.hasOpacity).toBe(true);
            expect(decodedFromBytes.is16BitCoords).toBe(false);
            expect(decodedFromBytes.isMonochrome).toBe(false);
            expect(decodedFromBytes.palette).toEqual(palette);
            expect(decodedFromBytes.rectangles).toEqual(rectangles);

            // Test deserializing from Base64 string
            const base64 = bytesToBase64(binary);
            const decodedFromBase64 = deserializePixelArt(base64);
            expect(decodedFromBase64).toEqual(decodedFromBytes);

            // Test deserializing from Base122 string
            const base122 = bytesToBase122(binary);
            const decodedFromBase122 = deserializePixelArt(base122);
            expect(decodedFromBase122).toEqual(decodedFromBytes);
            expect(base122.length).toBeLessThan(base64.length);
        });

        it('round-trips 1-color monochrome mode without palette or paletteIndex bytes', () => {
            const width = 16;
            const height = 16;
            const hasOpacity = false;
            const is16BitCoords = false;
            const isMonochrome = true;
            const rectangles: EncodedRect[] = [
                { x: 0, y: 0, w: 16, h: 8, paletteIndex: 0 },
                { x: 2, y: 8, w: 12, h: 4, paletteIndex: 0 },
            ];

            const binary = serializePixelArt(width, height, hasOpacity, is16BitCoords, isMonochrome, [], rectangles);

            // Exact byte breakdown: 1 (flags: 0x04) + 2 (dims: 16, 16) + 2 (rectCount: 2) + 2 * 4 (rects: 8 bytes) = 13 bytes total!
            expect(binary.byteLength).toBe(13);

            const decoded = deserializePixelArt(binary);
            expect(decoded.width).toBe(16);
            expect(decoded.height).toBe(16);
            expect(decoded.isMonochrome).toBe(true);
            expect(decoded.palette).toEqual([]);
            expect(decoded.rectangles).toEqual(rectangles);
        });

        it('round-trips 16-bit coordinates with opacity disabled', () => {
            const width = 512;
            const height = 512;
            const hasOpacity = false;
            const is16BitCoords = true;
            const isMonochrome = false;
            const palette: RgbaColor[] = [
                { r: 100, g: 150, b: 200, a: 255 },
                { r: 50, g: 75, b: 100, a: 255 },
            ];
            const rectangles: EncodedRect[] = [
                { x: 0, y: 0, w: 512, h: 256, paletteIndex: 0 },
                { x: 260, y: 300, w: 100, h: 150, paletteIndex: 1 },
            ];

            const binary = serializePixelArt(
                width,
                height,
                hasOpacity,
                is16BitCoords,
                isMonochrome,
                palette,
                rectangles
            );

            const decoded = deserializePixelArt(binary);
            expect(decoded.width).toBe(512);
            expect(decoded.height).toBe(512);
            expect(decoded.hasOpacity).toBe(false);
            expect(decoded.is16BitCoords).toBe(true);
            expect(decoded.isMonochrome).toBe(false);
            expect(decoded.palette).toEqual(palette);
            expect(decoded.rectangles).toEqual(rectangles);
        });

        it('round-trips Base64 string conversion helpers', () => {
            const originalBytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255, 42, 99]);
            const b64 = bytesToBase64(originalBytes);
            const reconstructed = base64ToBytes(b64);

            expect(reconstructed).toEqual(originalBytes);
        });

        it('round-trips Base122 string conversion with arbitrary and illegal ASCII byte sequences', () => {
            // Test 1: Empty byte array
            expect(decodeBase122(encodeBase122(new Uint8Array(0)))).toEqual(new Uint8Array(0));

            // Test 2: Single byte
            for (let b = 0; b < 256; ++b) {
                const singleByte = new Uint8Array([b]);
                const encoded = encodeBase122(singleByte);
                const decoded = decodeBase122(encoded);
                expect(decoded).toEqual(singleByte);
            }

            // Test 3: Byte sequence that triggers illegal character mappings (0, 10, 13, 34, 38, 92)
            const illegalValues = [0, 10, 13, 34, 38, 92];
            const testPayload = new Uint8Array(256 + illegalValues.length * 4);
            for (let i = 0; i < 256; ++i) {
                testPayload[i] = i;
            }
            for (let i = 0; i < illegalValues.length; ++i) {
                testPayload[256 + i * 4] = illegalValues[i];
                testPayload[256 + i * 4 + 1] = illegalValues[i] << 1;
                testPayload[256 + i * 4 + 2] = illegalValues[i] ^ 0x55;
                testPayload[256 + i * 4 + 3] = illegalValues[i] ^ 0xaa;
            }

            const b122 = bytesToBase122(testPayload);
            const reconstructed = base122ToBytes(b122);
            expect(reconstructed).toEqual(testPayload);

            // Test 4: Verify Base122 length is ~18% smaller than Base64
            const b64 = bytesToBase64(testPayload);
            expect(b122.length).toBeLessThan(b64.length);
        });

        it('auto-detects Base122 vs Base64 payloads accurately', () => {
            const bytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 250]);
            const b64 = bytesToBase64(bytes);
            const b122 = bytesToBase122(bytes);

            expect(isBase122(b64)).toBe(false);
            // b122 contains non-base64 chars or 2-byte sequences
            expect(isBase122(b122)).toBe(true);
        });
    });

    describe('End-to-End Image Encoding & Palette Extraction', () => {
        it('encodes RGBA buffer with maxColors: 1 into monochrome payload', () => {
            const width = 8;
            const height = 8;
            const pixels: RgbaColor[] = [];

            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    if (x === y) {
                        pixels.push({ r: 255, g: 255, b: 255, a: 255 }); // Foreground
                    } else {
                        pixels.push({ r: 0, g: 0, b: 0, a: 0 }); // Transparent
                    }
                }
            }

            const encoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: false,
            });

            expect(encoded.width).toBe(8);
            expect(encoded.height).toBe(8);
            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.palette.length).toBe(0);

            const deserialized = deserializePixelArt(encoded.base64);
            expect(deserialized.width).toBe(8);
            expect(deserialized.height).toBe(8);
            expect(deserialized.isMonochrome).toBe(true);
            expect(deserialized.rectangles.length).toBe(encoded.rectangles.length);
        });

        it('encodes multi-color RGBA buffer into multi-color payload', () => {
            const width = 8;
            const height = 8;
            const pixels: RgbaColor[] = [];

            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    if (x === y) {
                        pixels.push({ r: 255, g: 255, b: 0, a: 255 }); // Yellow
                    } else {
                        pixels.push({ r: 32, g: 32, b: 32, a: 255 }); // Gray
                    }
                }
            }

            const encoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 2,
                supportOpacity: false,
            });

            expect(encoded.width).toBe(8);
            expect(encoded.height).toBe(8);
            expect(encoded.isMonochrome).toBe(false);
            expect(encoded.palette.length).toBeLessThanOrEqual(2);

            const deserialized = deserializePixelArt(encoded.base64);
            expect(deserialized.width).toBe(8);
            expect(deserialized.height).toBe(8);
            expect(deserialized.isMonochrome).toBe(false);
            expect(deserialized.rectangles.length).toBe(encoded.rectangles.length);
            expect(deserialized.palette.length).toBe(encoded.palette.length);
        });

        it('ignores transparent background pixels even when supportOpacity is false', () => {
            const width = 4;
            const height = 4;
            const pixels: RgbaColor[] = [
                // Top row solid green, all other 3 rows transparent
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },
                { r: 0, g: 255, b: 0, a: 255 },

                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },

                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },

                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 0 },
            ];

            const encoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 4,
                supportOpacity: false, // Opacity disabled: payload has no alpha bytes!
            });

            // Palette should only have 1 color (Green)
            expect(encoded.palette.length).toBe(0); // Monochrome because only 1 unique color
            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.hasOpacity).toBe(false);

            // Exactly 1 rectangle covering only row 0 (y=0, h=1, w=4)
            expect(encoded.rectangles.length).toBe(1);
            expect(encoded.rectangles[0]).toEqual({ x: 0, y: 0, w: 4, h: 1, paletteIndex: 0 });
        });

        it('respects alphaThreshold when supportOpacity is false (filtering low-alpha fringe)', () => {
            const width = 4;
            const height = 2;
            const pixels: RgbaColor[] = [
                // Row 0: high-alpha pixels (>= 128)
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 150 },
                { r: 255, g: 255, b: 255, a: 128 },
                { r: 255, g: 255, b: 255, a: 255 },

                // Row 1: low-alpha fringe pixels (< 128)
                { r: 255, g: 255, b: 255, a: 100 },
                { r: 255, g: 255, b: 255, a: 50 },
                { r: 255, g: 255, b: 255, a: 20 },
                { r: 255, g: 255, b: 255, a: 0 },
            ];

            // Test 1: Default threshold with supportOpacity: false is 128
            const defaultEncoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: false,
            });
            // Row 0 (all >= 128) should be kept as 1 merged rectangle; Row 1 (< 128) discarded
            expect(defaultEncoded.rectangles.length).toBe(1);
            expect(defaultEncoded.rectangles[0]).toEqual({ x: 0, y: 0, w: 4, h: 1, paletteIndex: 0 });

            // Test 2: Custom low threshold (alphaThreshold: 20 or 0.1) retains row 1 pixels too
            const lowThresholdEncoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: false,
                alphaThreshold: 20,
            });
            // 7 pixels are >= 20, 1 pixel is < 20 (0)
            expect(lowThresholdEncoded.rectangles.length).toBeGreaterThan(1);

            // Test 3: High threshold (alphaThreshold: 200) retains only pixels with a >= 200 (x=0, x=3 in row 0)
            const highThresholdEncoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: false,
                alphaThreshold: 200,
            });
            expect(highThresholdEncoded.rectangles.length).toBe(2);
            expect(highThresholdEncoded.rectangles[0]).toEqual({ x: 0, y: 0, w: 1, h: 1, paletteIndex: 0 });
            expect(highThresholdEncoded.rectangles[1]).toEqual({ x: 3, y: 0, w: 1, h: 1, paletteIndex: 0 });
        });

        it('supports fractional alphaThreshold (0.0 to 1.0)', () => {
            const width = 2;
            const height = 1;
            const pixels: RgbaColor[] = [
                { r: 255, g: 0, b: 0, a: 100 }, // ~0.39
                { r: 255, g: 0, b: 0, a: 200 }, // ~0.78
            ];

            // Threshold 0.5 (~128) should discard pixel 0 and keep pixel 1
            const encoded = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: false,
                alphaThreshold: 0.5,
            });
            expect(encoded.rectangles.length).toBe(1);
            expect(encoded.rectangles[0]).toEqual({ x: 1, y: 0, w: 1, h: 1, paletteIndex: 0 });
        });

        it('respects alphaThreshold when supportOpacity is true in monochrome mode', () => {
            const width = 4;
            const height = 2;
            const pixels: RgbaColor[] = [
                // Row 0: high-alpha pixels (>= 128)
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 150 },
                { r: 255, g: 255, b: 255, a: 128 },
                { r: 255, g: 255, b: 255, a: 255 },

                // Row 1: low-alpha fringe pixels (< 128)
                { r: 255, g: 255, b: 255, a: 100 },
                { r: 255, g: 255, b: 255, a: 50 },
                { r: 255, g: 255, b: 255, a: 20 },
                { r: 255, g: 255, b: 255, a: 0 },
            ];

            // With alphaThreshold: 128 and supportOpacity: true in monochrome mode,
            // Row 0 (all >= 128) is kept as 1 merged rectangle; Row 1 (< 128) is cut out
            const encoded128 = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: true,
                alphaThreshold: 128,
            });
            expect(encoded128.rectangles.length).toBe(1);
            expect(encoded128.rectangles[0]).toEqual({ x: 0, y: 0, w: 4, h: 1, paletteIndex: 0 });

            // With alphaThreshold: 200, only the 2 pixels >= 200 (x=0, x=3) survive
            const encoded200 = encodePixelArtFromRgba(pixels, width, height, {
                maxColors: 1,
                supportOpacity: true,
                alphaThreshold: 200,
            });
            expect(encoded200.rectangles.length).toBe(2);
            expect(encoded200.rectangles[0]).toEqual({ x: 0, y: 0, w: 1, h: 1, paletteIndex: 0 });
            expect(encoded200.rectangles[1]).toEqual({ x: 3, y: 0, w: 1, h: 1, paletteIndex: 0 });
        });

        it('parses color strings in hex, rgb, and rgba formats', () => {
            expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
            expect(parseColor('#0f08')).toEqual({ r: 0, g: 255, b: 0, a: 136 });
            expect(parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 255, a: 255 });
            expect(parseColor('#ffffff80')).toEqual({ r: 255, g: 255, b: 255, a: 128 });
            expect(parseColor('rgb(100, 150, 200)')).toEqual({ r: 100, g: 150, b: 200, a: 255 });
            expect(parseColor('rgba(100, 150, 200, 0.5)')).toEqual({ r: 100, g: 150, b: 200, a: 128 });
            expect(parseColor({ r: 10, g: 20, b: 30, a: 40 })).toEqual({ r: 10, g: 20, b: 30, a: 40 });
        });

        it('quantizes palette using most-frequent algorithm on aliased-square-in-triangle-in-circle-on-white.png', () => {
            const samplePath = path.resolve(
                __dirname,
                'pixel-art-samples/aliased-square-in-triangle-in-circle-on-white-no-opacity.png'
            );

            const encoded = encodePixelArtFromFile(samplePath, {
                maxColors: 4,
                paletteAlgorithm: 'most-frequent',
                supportOpacity: true,
            });

            expect(encoded.palette.length).toBe(4);
            const paletteRgb = encoded.palette.map((c: RgbaColor) => `${c.r},${c.g},${c.b}`);
            // Must contain pure white, red, blue, green with no blending
            expect(paletteRgb).toContain('255,255,255');
            expect(paletteRgb).toContain('255,0,0');
            expect(paletteRgb).toContain('0,0,255');
            expect(paletteRgb).toContain('0,255,0');
        });

        it('quantizes palette using user-defined customPalette', () => {
            const width = 4;
            const height = 1;
            const pixels: RgbaColor[] = [
                { r: 250, g: 10, b: 10, a: 255 },
                { r: 10, g: 250, b: 10, a: 255 },
                { r: 10, g: 10, b: 250, a: 255 },
                { r: 240, g: 240, b: 10, a: 255 },
            ];

            const customPalette = ['#ff0000', '#00ff00', '#0000ff'];

            const encoded = encodePixelArtFromRgba(pixels, width, height, {
                paletteAlgorithm: 'user-defined',
                customPalette,
                supportOpacity: false,
            });

            expect(encoded.palette.length).toBe(3);
            expect(encoded.palette[0]).toEqual({ r: 255, g: 0, b: 0, a: 255 });
            expect(encoded.palette[1]).toEqual({ r: 0, g: 255, b: 0, a: 255 });
            expect(encoded.palette[2]).toEqual({ r: 0, g: 0, b: 255, a: 255 });
        });

        it('converts RGB to HSV accurately with rgbToHsv', () => {
            expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 });
            expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 1, v: 1 });
            expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 1, v: 1 });
            expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
            expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 1 });
            expect(rgbToHsv(128, 128, 128)).toEqual({ h: 0, s: 0, v: 128 / 255 });
        });

        it('converts RGB to Oklab color space accurately with rgbToOklab', () => {
            const blackLab = rgbToOklab(0, 0, 0);
            expect(blackLab.L).toBeCloseTo(0, 3);
            expect(blackLab.a).toBeCloseTo(0, 3);
            expect(blackLab.b).toBeCloseTo(0, 3);

            const whiteLab = rgbToOklab(255, 255, 255);
            expect(whiteLab.L).toBeCloseTo(1.0, 3);
            expect(whiteLab.a).toBeCloseTo(0, 3);
            expect(whiteLab.b).toBeCloseTo(0, 3);

            const redLab = rgbToOklab(255, 0, 0);
            expect(redLab.L).toBeGreaterThan(0.5);
            expect(redLab.a).toBeGreaterThan(0.15); // positive a = red direction

            const greenLab = rgbToOklab(0, 255, 0);
            expect(greenLab.a).toBeLessThan(-0.15); // negative a = green direction

            const blueLab = rgbToOklab(0, 0, 255);
            expect(blueLab.b).toBeLessThan(-0.2); // negative b = blue direction
        });

        it('computes perceptual color difference with deltaEOklab', () => {
            const red = { r: 255, g: 0, b: 0, a: 255 };
            const darkRed = { r: 180, g: 0, b: 0, a: 255 };
            const blue = { r: 0, g: 0, b: 255, a: 255 };

            const distRedDarkRed = deltaEOklab(red, darkRed);
            const distRedBlue = deltaEOklab(red, blue);

            // Red is much closer perceptually to Dark Red than to Blue
            expect(distRedDarkRed).toBeLessThan(distRedBlue);
        });

        it('computes 3D Hilbert curve index preserving spatial proximity with hilbert3D', () => {
            const h1 = hilbert3D(0, 0, 0, 10);
            const h2 = hilbert3D(1, 0, 0, 10);
            const hFar = hilbert3D(1023, 1023, 1023, 10);

            expect(h1).toBe(0);
            expect(Math.abs(h2 - h1)).toBeLessThan(Math.abs(hFar - h1));
        });

        it('sorts palettes perceptually using Oklab and 3D Hilbert curve so similar colors are adjacent', () => {
            const unsorted: RgbaColor[] = [
                { r: 0, g: 0, b: 255, a: 255 }, // Pure Blue
                { r: 255, g: 255, b: 255, a: 255 }, // White
                { r: 255, g: 0, b: 0, a: 255 }, // Pure Red
                { r: 0, g: 0, b: 0, a: 255 }, // Black
                { r: 240, g: 20, b: 20, a: 255 }, // Bright Crimson (very close to Red)
                { r: 0, g: 255, b: 0, a: 255 }, // Pure Green
                { r: 20, g: 20, b: 240, a: 255 }, // Navy Blue (very close to Blue)
            ];

            const sorted = sortPalettePerceptual(unsorted);

            // Every color must be preserved
            expect(sorted.length).toBe(unsorted.length);

            // The two blues (Pure Blue and Navy Blue) must be adjacent to each other
            const pureBlueIdx = sorted.findIndex((c) => c.r === 0 && c.g === 0 && c.b === 255);
            const navyBlueIdx = sorted.findIndex((c) => c.r === 20 && c.g === 20 && c.b === 240);
            expect(Math.abs(pureBlueIdx - navyBlueIdx)).toBe(1);

            // The two reds (Pure Red and Crimson) must be adjacent to each other
            const pureRedIdx = sorted.findIndex((c) => c.r === 255 && c.g === 0 && c.b === 0);
            const crimsonIdx = sorted.findIndex((c) => c.r === 240 && c.g === 20 && c.b === 20);
            expect(Math.abs(pureRedIdx - crimsonIdx)).toBe(1);
        });

        it('resolves alpha threshold properly treating integer 1 as 1 (not 255)', () => {
            // Integer 1 should stay 1 (not Math.round(1 * 255) = 255)
            expect(resolveAlphaThreshold(1, true)).toBe(1);
            expect(resolveAlphaThreshold(2, true)).toBe(2);
            expect(resolveAlphaThreshold(128, true)).toBe(128);
            expect(resolveAlphaThreshold(255, true)).toBe(255);

            // Fractional values 0 < x < 1 resolve to 0..255
            expect(resolveAlphaThreshold(0.5, true)).toBe(128);
            expect(resolveAlphaThreshold(0.1, true)).toBe(26);

            // Defaults
            expect(resolveAlphaThreshold(undefined, true)).toBe(1);
            expect(resolveAlphaThreshold(undefined, false)).toBe(128);
        });

        it('quantizes alpha levels accurately with quantizeAlphaPalette', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 255, g: 255, b: 255, a: 128 },
                { r: 255, g: 255, b: 255, a: 64 },
                { r: 255, g: 255, b: 255, a: 0 }, // Below threshold
            ];

            const alphaPalette = quantizeAlphaMedianCut(pixels, 4, 1);
            expect(alphaPalette.length).toBe(3);
            expect(alphaPalette[0].a).toBe(64);
            expect(alphaPalette[1].a).toBe(128);
            expect(alphaPalette[2].a).toBe(255);
            expect(quantizeAlphaPalette(pixels, 4, 1)).toEqual(alphaPalette);

            expect(findNearestAlphaIndex(70, alphaPalette)).toBe(0); // 70 is closest to 64
            expect(findNearestAlphaIndex(130, alphaPalette)).toBe(1); // 130 is closest to 128
        });

        it('supports Most Frequent alpha quantization in monochrome mode', () => {
            const pixels: RgbaColor[] = [
                // 5 pixels with alpha 200
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 200 },
                { r: 255, g: 255, b: 255, a: 200 },

                // 3 pixels with alpha 100
                { r: 255, g: 255, b: 255, a: 100 },
                { r: 255, g: 255, b: 255, a: 100 },
                { r: 255, g: 255, b: 255, a: 100 },

                // 1 pixel with alpha 50
                { r: 255, g: 255, b: 255, a: 50 },

                // 1 pixel with alpha 0 (below threshold)
                { r: 255, g: 255, b: 255, a: 0 },
            ];

            // Request top 2 most frequent alphas -> should be 100 and 200
            const mostFreq = quantizeAlphaMostFrequent(pixels, 2, 1);
            expect(mostFreq.length).toBe(2);
            expect(mostFreq[0].a).toBe(100);
            expect(mostFreq[1].a).toBe(200);

            const encoded = encodePixelArtFromRgba(pixels, 10, 1, {
                monochrome: true,
                supportOpacity: true,
                maxColors: 2,
                paletteAlgorithm: 'most-frequent',
            });
            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.palette.length).toBe(2);
            expect(encoded.palette[0].a).toBe(100);
            expect(encoded.palette[1].a).toBe(200);
        });

        it('supports User Defined custom alpha palette in monochrome mode', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 },
                { r: 255, g: 255, b: 255, a: 120 },
                { r: 255, g: 255, b: 255, a: 40 },
            ];

            // User-defined numeric string / hex / number alphas
            const customAlphas = ['50', '150', '255'];
            const generated = generateAlphaPalette(pixels, 10, 1, 'user-defined', customAlphas);
            expect(generated.length).toBe(3);
            expect(generated[0].a).toBe(50);
            expect(generated[1].a).toBe(150);
            expect(generated[2].a).toBe(255);

            const encoded = encodePixelArtFromRgba(pixels, 3, 1, {
                monochrome: true,
                supportOpacity: true,
                paletteAlgorithm: 'user-defined',
                customPalette: customAlphas,
            });
            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.palette.length).toBe(3);
            expect(encoded.palette[0].a).toBe(50);
            expect(encoded.palette[1].a).toBe(150);
            expect(encoded.palette[2].a).toBe(255);
        });

        it('encodes monochrome artwork with varied alpha levels into compact alpha palette', () => {
            const pixels: RgbaColor[] = [
                { r: 255, g: 255, b: 255, a: 255 }, // High opacity
                { r: 255, g: 255, b: 255, a: 128 }, // Medium opacity
                { r: 255, g: 255, b: 255, a: 64 }, // Low opacity
                { r: 0, g: 0, b: 0, a: 0 }, // Transparent cutout
            ];

            const encoded = encodePixelArtFromRgba(pixels, 2, 2, {
                monochrome: true,
                supportOpacity: true,
                maxColors: 4,
                alphaThreshold: 1,
            });

            expect(encoded.isMonochrome).toBe(true);
            expect(encoded.hasOpacity).toBe(true);
            expect(encoded.palette.length).toBe(3);
            expect(encoded.palette[0].a).toBe(64);
            expect(encoded.palette[1].a).toBe(128);
            expect(encoded.palette[2].a).toBe(255);

            // Deserialization round-trip
            const deserialized = deserializePixelArt(encoded.base64);
            expect(deserialized.isMonochrome).toBe(true);
            expect(deserialized.hasOpacity).toBe(true);
            expect(deserialized.palette.length).toBe(3);
            expect(deserialized.palette[0].a).toBe(64);
            expect(deserialized.palette[1].a).toBe(128);
            expect(deserialized.palette[2].a).toBe(255);
            expect(deserialized.rectangles.length).toBe(encoded.rectangles.length);
        });
    });

    describe('CLI Execution & OutType Handling', () => {
        const sampleImage = path.resolve(__dirname, 'pixel-art-samples/black-aliased-circle-on-transparent.png');

        it('outputs ONLY base64 encoding by default (without --json)', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli([sampleImage]);

            expect(logSpy).toHaveBeenCalledTimes(1);
            const output = logSpy.mock.calls[0][0];
            expect(typeof output).toBe('string');
            expect(isBase122(output)).toBe(false);

            // Verify it deserializes into valid pixel art
            const deserialized = deserializePixelArt(output);
            expect(deserialized.width).toBeGreaterThan(0);
            expect(deserialized.height).toBeGreaterThan(0);

            logSpy.mockRestore();
        });

        it('outputs ONLY base122 encoding when --out-type base122 is specified', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli([sampleImage, '--out-type', 'base122']);

            expect(logSpy).toHaveBeenCalledTimes(1);
            const output = logSpy.mock.calls[0][0];
            expect(typeof output).toBe('string');
            expect(isBase122(output)).toBe(true);

            // Verify it deserializes into valid pixel art
            const deserialized = deserializePixelArt(output);
            expect(deserialized.width).toBeGreaterThan(0);
            expect(deserialized.height).toBeGreaterThan(0);

            logSpy.mockRestore();
        });

        it('outputs ONLY base122 encoding when --outType base122 is specified', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli([sampleImage, '--outType', 'base122']);

            expect(logSpy).toHaveBeenCalledTimes(1);
            const output = logSpy.mock.calls[0][0];
            expect(typeof output).toBe('string');
            expect(isBase122(output)).toBe(true);

            logSpy.mockRestore();
        });

        it('outputs ONLY base64 encoding when --out-type base64 is specified', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli([sampleImage, '--out-type', 'base64']);

            expect(logSpy).toHaveBeenCalledTimes(1);
            const output = logSpy.mock.calls[0][0];
            expect(typeof output).toBe('string');
            expect(isBase122(output)).toBe(false);

            logSpy.mockRestore();
        });

        it('outputs full JSON payload when --json flag is present', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli([sampleImage, '--json']);

            expect(logSpy).toHaveBeenCalledTimes(1);
            const output = logSpy.mock.calls[0][0];
            const parsed = JSON.parse(output);

            expect(parsed).toHaveProperty('width');
            expect(parsed).toHaveProperty('height');
            expect(parsed).toHaveProperty('base64');
            expect(parsed).toHaveProperty('base122');
            expect(parsed).toHaveProperty('stats');
            expect(parsed.stats).toHaveProperty('rawPixelCount');
            expect(parsed.stats).toHaveProperty('drawCallCount');

            logSpy.mockRestore();
        });

        it('prints help when --help flag is passed', () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            runCli(['--help']);

            expect(logSpy).toHaveBeenCalledTimes(1);
            expect(logSpy.mock.calls[0][0]).toContain('Usage:');
            expect(logSpy.mock.calls[0][0]).toContain('--out-type');

            logSpy.mockRestore();
        });

        it('exits with error on invalid outType', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit(1)');
            }) as never);

            expect(() => {
                runCli([sampleImage, '--out-type', 'invalid_format']);
            }).toThrow('process.exit(1)');

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid outType'));

            errorSpy.mockRestore();
            exitSpy.mockRestore();
        });
    });
});
