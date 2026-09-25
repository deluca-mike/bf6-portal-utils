import * as fs from 'node:fs';
import * as path from 'node:path';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
    deserializePixelArt,
    encodePixelArtFromRgba,
    PaletteAlgorithm,
    PixelArtEncoderOptions,
    resampleImageData,
    RgbaColor,
} from '../scripts/encode-pixel-art.ts';

interface PreparedSample {
    name: string;
    originalWidth: number;
    originalHeight: number;
    targetWidth: number;
    targetHeight: number;
    pixels: RgbaColor[];
    userDefinedPalette10: RgbaColor[];
}

const SAMPLES_DIR = path.resolve(__dirname, 'pixel-art-samples');

const SAMPLE_FILES = [
    'aliased-square-in-triangle-in-circle-on-white-no-opacity.png',
    'black-aliased-circle-on-transparent.png',
    'black-aliased-circle-on-white-no-opacity.png',
    'black-anti-aliased-b-on-transparent.png',
    'black-anti-aliased-icon-on-transparent.png',
    'portal-hi-fidelity-no-opacity.png',
];

const MONOCHROME_OPTIONS = [false, true] as const;
const OPACITY_OPTIONS = [false, true] as const;
const ALPHA_THRESHOLDS = [1, 2, 128, 240, 254, 255] as const;
const MAX_COLORS_OPTIONS = [1, 2, 3, 4, 32, 48, 63, 64] as const;
const PALETTE_ALGORITHMS: PaletteAlgorithm[] = ['median-cut', 'most-frequent', 'user-defined'];

describe('Pixel Art Encoder - Exhaustive Permutation Matrix Test', () => {
    const preparedSamples: Map<string, PreparedSample> = new Map();

    beforeAll(() => {
        for (const fileName of SAMPLE_FILES) {
            const filePath = path.join(SAMPLES_DIR, fileName);
            const buffer = fs.readFileSync(filePath);
            const png = PNG.sync.read(buffer);

            // Compute target resolution (fit within max 128 dimension preserving aspect ratio)
            const maxDimension = 128;
            const scale = maxDimension / Math.max(png.width, png.height);
            const targetWidth = Math.max(1, Math.round(png.width * scale));
            const targetHeight = Math.max(1, Math.round(png.height * scale));

            const pixels: RgbaColor[] =
                targetWidth === png.width && targetHeight === png.height
                    ? Array.from({ length: png.width * png.height }, (_, i) => ({
                          r: png.data[i * 4],
                          g: png.data[i * 4 + 1],
                          b: png.data[i * 4 + 2],
                          a: png.data[i * 4 + 3],
                      }))
                    : resampleImageData(png.data, png.width, png.height, targetWidth, targetHeight);

            // 1. Filter non-transparent candidate pixels
            const nonTransparent = pixels.filter((p) => p.a > 0);
            const candidatePool = nonTransparent.length > 0 ? nonTransparent : pixels;

            // 2. Take up to 1000 stratified/evenly-spaced deterministic samples across the candidate pool
            const sampleCount = Math.min(1000, candidatePool.length);
            const step1000 = candidatePool.length / sampleCount;
            const sampled1000: RgbaColor[] = Array.from(
                { length: sampleCount },
                (_, i) => candidatePool[Math.floor(i * step1000)]
            );

            // 3. Deterministically reduce the 1000 samples to a representative set of 10 colors for user-defined palettes
            const step10 = sampled1000.length / 10;
            const userDefinedPalette10: RgbaColor[] = Array.from(
                { length: Math.min(10, sampled1000.length) },
                (_, i) => sampled1000[Math.floor(i * step10)]
            );

            preparedSamples.set(fileName, {
                name: fileName,
                originalWidth: png.width,
                originalHeight: png.height,
                targetWidth,
                targetHeight,
                pixels,
                userDefinedPalette10,
            });
        }
    });

    describe.each(SAMPLE_FILES)('Sample: %s', (sampleName) => {
        let sample: PreparedSample;

        beforeAll(() => {
            const s = preparedSamples.get(sampleName);
            if (!s) {
                throw new Error(`Sample ${sampleName} not found in prepared samples.`);
            }
            sample = s;
        });

        describe.each(MONOCHROME_OPTIONS)('Monochrome: %s', (monochrome) => {
            describe.each(OPACITY_OPTIONS)('Support Opacity: %s', (supportOpacity) => {
                describe.each(ALPHA_THRESHOLDS)('Alpha Cutout Threshold: %i', (alphaThreshold) => {
                    it(`validates all maxColor & algorithm permutations (24 combinations)`, () => {
                        const { targetWidth, targetHeight, pixels, userDefinedPalette10 } = sample;

                        for (const maxColors of MAX_COLORS_OPTIONS) {
                            for (const paletteAlgorithm of PALETTE_ALGORITHMS) {
                                const customPalette =
                                    paletteAlgorithm === 'user-defined' ? userDefinedPalette10 : undefined;

                                const options: PixelArtEncoderOptions = {
                                    monochrome,
                                    supportOpacity,
                                    alphaThreshold,
                                    maxColors,
                                    paletteAlgorithm,
                                    customPalette,
                                };

                                const tag = `[${sampleName} | mono=${monochrome} | opacity=${supportOpacity} | thresh=${alphaThreshold} | maxColors=${maxColors} | algo=${paletteAlgorithm}]`;

                                // 1. Assertion: Encoding succeeds
                                const encoded = encodePixelArtFromRgba(pixels, targetWidth, targetHeight, options);

                                expect(encoded, `${tag} Encoded data should be defined`).toBeDefined();
                                expect(encoded.width, `${tag} Width mismatch`).toBe(targetWidth);
                                expect(encoded.height, `${tag} Height mismatch`).toBe(targetHeight);
                                expect(encoded.hasOpacity, `${tag} hasOpacity mismatch`).toBe(supportOpacity);
                                expect(encoded.is16BitCoords, `${tag} is16BitCoords mismatch`).toBe(false);
                                expect(encoded.isMonochrome, `${tag} isMonochrome mismatch`).toBe(monochrome);

                                // 2. Compute ground-truth filtered pixels
                                const filteredPixels = pixels.filter((p) => p.a >= alphaThreshold);

                                // 3. Palette Invariants
                                if (monochrome && !supportOpacity) {
                                    // 1-color binary mode has 0 palette entries
                                    expect(
                                        encoded.palette.length,
                                        `${tag} Palette should be empty for monochrome without opacity`
                                    ).toBe(0);
                                } else if (filteredPixels.length === 0) {
                                    // If all pixels are below threshold, rectangles are 0, and fallback palette is 1 item or user-defined
                                    expect(
                                        encoded.rectangles.length,
                                        `${tag} Empty image should have 0 rectangles`
                                    ).toBe(0);
                                    expect(
                                        encoded.palette.length,
                                        `${tag} Fallback palette length`
                                    ).toBeLessThanOrEqual(maxColors);
                                } else if (monochrome && supportOpacity) {
                                    // Palette contains pure white RGB with varied alpha levels
                                    expect(
                                        encoded.palette.length,
                                        `${tag} Palette should not exceed maxColors`
                                    ).toBeLessThanOrEqual(maxColors);

                                    for (const entry of encoded.palette) {
                                        expect(entry.r, `${tag} Monochrome entry R channel`).toBe(255);
                                        expect(entry.g, `${tag} Monochrome entry G channel`).toBe(255);
                                        expect(entry.b, `${tag} Monochrome entry B channel`).toBe(255);
                                        if (paletteAlgorithm !== 'user-defined') {
                                            expect(entry.a, `${tag} Monochrome entry A channel`).toBeGreaterThanOrEqual(
                                                alphaThreshold
                                            );
                                        }
                                    }

                                    // Check unique alpha saturation
                                    if (paletteAlgorithm === 'user-defined') {
                                        const uniqueCustomAlphas = new Set(userDefinedPalette10.map((c) => c.a));
                                        const expectedMax = Math.min(maxColors, uniqueCustomAlphas.size);
                                        expect(encoded.palette.length, `${tag} Palette size under user-defined`).toBe(
                                            expectedMax
                                        );
                                    } else {
                                        const uniqueAlphas = new Set(filteredPixels.map((p) => p.a));
                                        const expectedCount = Math.min(maxColors, uniqueAlphas.size);
                                        expect(encoded.palette.length, `${tag} Palette size for monochrome alpha`).toBe(
                                            expectedCount
                                        );
                                    }
                                } else if (!monochrome && supportOpacity) {
                                    expect(encoded.palette.length, `${tag} Palette length`).toBeLessThanOrEqual(
                                        maxColors
                                    );

                                    if (paletteAlgorithm !== 'user-defined') {
                                        for (const entry of encoded.palette) {
                                            expect(entry.a, `${tag} Palette color alpha`).toBeGreaterThanOrEqual(
                                                alphaThreshold
                                            );
                                        }
                                    }

                                    if (paletteAlgorithm === 'user-defined') {
                                        const uniqueCustomColors = new Set(
                                            userDefinedPalette10.map((c) => `${c.r},${c.g},${c.b},${c.a}`)
                                        );
                                        const expectedMax = Math.min(maxColors, uniqueCustomColors.size);
                                        expect(encoded.palette.length, `${tag} Palette size under user-defined`).toBe(
                                            expectedMax
                                        );
                                    } else {
                                        const uniqueRgba = new Set(
                                            filteredPixels.map((p) => `${p.r},${p.g},${p.b},${p.a}`)
                                        );
                                        const expectedCount = Math.min(maxColors, uniqueRgba.size);
                                        expect(
                                            encoded.palette.length,
                                            `${tag} Palette size for color with opacity`
                                        ).toBe(expectedCount);
                                    }
                                } else {
                                    // Color without opacity (opaque RGB)
                                    expect(encoded.palette.length, `${tag} Palette length`).toBeLessThanOrEqual(
                                        maxColors
                                    );

                                    for (const entry of encoded.palette) {
                                        expect(entry.a, `${tag} Color without opacity entry A`).toBe(255);
                                    }

                                    if (paletteAlgorithm === 'user-defined') {
                                        const customRgb = new Set(
                                            userDefinedPalette10.map((c) => `${c.r},${c.g},${c.b}`)
                                        );
                                        const expectedMax = Math.min(maxColors, customRgb.size);
                                        expect(encoded.palette.length, `${tag} Palette size under user-defined`).toBe(
                                            expectedMax
                                        );
                                    } else {
                                        const uniqueRgb = new Set(filteredPixels.map((p) => `${p.r},${p.g},${p.b}`));
                                        const expectedCount = Math.min(maxColors, uniqueRgb.size);
                                        expect(
                                            encoded.palette.length,
                                            `${tag} Palette size for color without opacity`
                                        ).toBe(expectedCount);
                                    }
                                }

                                // 4. Geometry and Index Bounds
                                const paletteLen = encoded.palette.length;
                                for (const rect of encoded.rectangles) {
                                    expect(rect.x, `${tag} rect.x >= 0`).toBeGreaterThanOrEqual(0);
                                    expect(rect.y, `${tag} rect.y >= 0`).toBeGreaterThanOrEqual(0);
                                    expect(rect.w, `${tag} rect.w > 0`).toBeGreaterThan(0);
                                    expect(rect.h, `${tag} rect.h > 0`).toBeGreaterThan(0);
                                    expect(rect.x + rect.w, `${tag} rect.x + rect.w <= width`).toBeLessThanOrEqual(
                                        targetWidth
                                    );
                                    expect(rect.y + rect.h, `${tag} rect.y + rect.h <= height`).toBeLessThanOrEqual(
                                        targetHeight
                                    );

                                    if (paletteLen > 0) {
                                        expect(
                                            rect.paletteIndex,
                                            `${tag} rect.paletteIndex >= 0`
                                        ).toBeGreaterThanOrEqual(0);
                                        expect(
                                            rect.paletteIndex,
                                            `${tag} rect.paletteIndex < palette.length`
                                        ).toBeLessThan(paletteLen);
                                    } else {
                                        expect(
                                            rect.paletteIndex,
                                            `${tag} rect.paletteIndex === 0 for binary mode`
                                        ).toBe(0);
                                    }
                                }

                                // 5. Draw Call Stats
                                expect(encoded.stats.drawCallCount, `${tag} Draw call count`).toBe(
                                    encoded.rectangles.length
                                );
                                expect(
                                    encoded.stats.drawCallCount,
                                    `${tag} Draw call count <= raw pixels`
                                ).toBeLessThanOrEqual(targetWidth * targetHeight);

                                // 6. Binary Serialization & Round-Trip Deserialization
                                const decodedFromBase64 = deserializePixelArt(encoded.base64);
                                expect(decodedFromBase64.width, `${tag} Base64 decoded width`).toBe(targetWidth);
                                expect(decodedFromBase64.height, `${tag} Base64 decoded height`).toBe(targetHeight);
                                expect(decodedFromBase64.hasOpacity, `${tag} Base64 decoded hasOpacity`).toBe(
                                    supportOpacity
                                );
                                expect(decodedFromBase64.isMonochrome, `${tag} Base64 decoded isMonochrome`).toBe(
                                    monochrome
                                );
                                expect(decodedFromBase64.palette, `${tag} Base64 decoded palette`).toEqual(
                                    encoded.palette
                                );
                                expect(decodedFromBase64.rectangles, `${tag} Base64 decoded rectangles`).toEqual(
                                    encoded.rectangles
                                );

                                const decodedFromBase122 = deserializePixelArt(encoded.base122);
                                expect(
                                    decodedFromBase122,
                                    `${tag} Base122 decoded should match Base64 decoded`
                                ).toEqual(decodedFromBase64);
                            }
                        }
                    });
                });
            });
        });
    });
});
