/* eslint-disable */
// Auto-generated from scripts/encode-pixel-art.ts - DO NOT EDIT DIRECTLY
(function (global) {
    'use strict';

    /****** Color Distance & Quantization Helpers ******/
    /**
     * Parses a hex string (#RGB, #RGBA, #RRGGBB, #RRGGBBAA), CSS rgb/rgba string, or RgbaColor object into an RgbaColor object.
     * @param input - Color string or object.
     * @returns Parsed RgbaColor.
     */
    function parseColor(input) {
        if (typeof input !== 'string') {
            return {
                r: Math.max(0, Math.min(255, Math.round(input.r))),
                g: Math.max(0, Math.min(255, Math.round(input.g))),
                b: Math.max(0, Math.min(255, Math.round(input.b))),
                a: Math.max(0, Math.min(255, Math.round(input.a !== undefined ? input.a : 255))),
            };
        }
        const str = input.trim();
        if (str.startsWith('#')) {
            const hex = str.slice(1);
            if (hex.length === 3) {
                // #RGB
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                return { r, g, b, a: 255 };
            } else if (hex.length === 4) {
                // #RGBA
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                const a = parseInt(hex[3] + hex[3], 16);
                return { r, g, b, a };
            } else if (hex.length === 6) {
                // #RRGGBB
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                return { r, g, b, a: 255 };
            } else if (hex.length === 8) {
                // #RRGGBBAA
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                const a = parseInt(hex.slice(6, 8), 16);
                return { r, g, b, a };
            }
        }
        // rgb(r, g, b) or rgba(r, g, b, a)
        const rgbaMatch = str.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1], 10);
            const g = parseInt(rgbaMatch[2], 10);
            const b = parseInt(rgbaMatch[3], 10);
            let a = 255;
            if (rgbaMatch[4] !== undefined) {
                const rawA = parseFloat(rgbaMatch[4]);
                a = rawA <= 1.0 ? Math.round(rawA * 255) : Math.round(rawA);
            }
            return {
                r: Math.max(0, Math.min(255, r)),
                g: Math.max(0, Math.min(255, g)),
                b: Math.max(0, Math.min(255, b)),
                a: Math.max(0, Math.min(255, a)),
            };
        }
        // Pure numeric alpha string (e.g. "128", "255", "0.5")
        if (!isNaN(Number(str)) && str.length > 0) {
            const num = Number(str);
            const a = num <= 1.0 && num > 0 ? Math.round(num * 255) : Math.round(num);
            return {
                r: 255,
                g: 255,
                b: 255,
                a: Math.max(0, Math.min(255, a)),
            };
        }
        return { r: 0, g: 0, b: 0, a: 255 };
    }
    /**
     * Resolves the effective 0..255 alpha threshold based on options and opacity mode.
     * @param threshold - Configured alpha threshold (optional).
     * @param supportOpacity - Whether opacity is enabled.
     * @returns Resolved integer threshold in [0, 255].
     */
    function resolveAlphaThreshold(threshold, supportOpacity) {
        if (threshold === undefined) return supportOpacity ? 1 : 128;
        if (threshold > 0 && threshold < 1) return Math.round(threshold * 255);
        return Math.max(0, Math.min(255, Math.round(threshold)));
    }
    /**
     * Linearizes an sRGB 8-bit channel value (0..255) to linear light [0, 1].
     * @param c - Color channel value [0, 255].
     * @returns Linearized value in [0, 1].
     */
    function srgbToLinear(c) {
        const v = Math.max(0, Math.min(255, c)) / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    /**
     * Converts an RGBA color to Oklab perceptual color space coordinates.
     * @param r - Red channel [0, 255].
     * @param g - Green channel [0, 255].
     * @param b - Blue channel [0, 255].
     * @param a - Alpha channel [0, 255] (optional, default: 255).
     * @returns Object with L (lightness: 0..1), a (green-red: ~ -0.4..+0.4), b (blue-yellow: ~ -0.4..+0.4), and alpha (0..255).
     */
    function rgbToOklab(r, g, b, a = 255) {
        const lr = srgbToLinear(r);
        const lg = srgbToLinear(g);
        const lb = srgbToLinear(b);
        const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
        const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
        const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
        const l_ = Math.cbrt(l);
        const m_ = Math.cbrt(m);
        const s_ = Math.cbrt(s);
        const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
        const oklabA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
        const oklabB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
        return {
            L,
            a: oklabA,
            b: oklabB,
            alpha: Math.max(0, Math.min(255, a !== undefined ? a : 255)),
        };
    }
    /**
     * Computes the Oklab perceptual color difference (Delta E OK) between two colors,
     * optionally weighted with alpha difference if opacity is supported.
     * @param c1 - First color.
     * @param c2 - Second color.
     * @returns Perceptual Delta E distance.
     */
    function deltaEOklab(c1, c2) {
        const lab1 = rgbToOklab(c1.r, c1.g, c1.b, c1.a);
        const lab2 = rgbToOklab(c2.r, c2.g, c2.b, c2.a);
        const dL = lab1.L - lab2.L;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        const dAlpha = (lab1.alpha - lab2.alpha) / 255;
        return Math.sqrt(dL * dL + da * da + db * db + 0.25 * dAlpha * dAlpha);
    }
    /**
     * Computes the 3D Hilbert curve index for discrete coordinates (x, y, z).
     * Preserves 3D spatial locality in 1D scalar space.
     * @param x - First coordinate (integer in [0, 2^bits - 1]).
     * @param y - Second coordinate (integer in [0, 2^bits - 1]).
     * @param z - Third coordinate (integer in [0, 2^bits - 1]).
     * @param bits - Precision bits per dimension (default: 10).
     * @returns 1D Hilbert Curve index.
     */
    function hilbert3D(x, y, z, bits = 10) {
        const maxCoord = (1 << bits) - 1;
        const X = [
            Math.max(0, Math.min(maxCoord, Math.floor(x))),
            Math.max(0, Math.min(maxCoord, Math.floor(y))),
            Math.max(0, Math.min(maxCoord, Math.floor(z))),
        ];
        const n = 3;
        const m = 1 << (bits - 1);
        // Inverse transpose
        for (let q = m; q > 0; q >>>= 1) {
            const p = q - 1;
            for (let i = 0; i < n; i++) {
                if ((X[i] & q) !== 0) {
                    X[0] ^= p;
                } else {
                    const t = (X[0] ^ X[i]) & p;
                    X[0] ^= t;
                    X[i] ^= t;
                }
            }
        }
        // Gray decode
        for (let i = 1; i < n; i++) {
            X[i] ^= X[i - 1];
        }
        let t = 0;
        for (let q = m; q > 1; q >>>= 1) {
            if ((X[n - 1] & q) !== 0) {
                t ^= q - 1;
            }
        }
        for (let i = 0; i < n; i++) {
            X[i] ^= t;
        }
        // Interleave bits into scalar index
        let index = 0;
        for (let b = bits - 1; b >= 0; b--) {
            const bit = 1 << b;
            const bit0 = (X[0] & bit) !== 0 ? 1 : 0;
            const bit1 = (X[1] & bit) !== 0 ? 1 : 0;
            const bit2 = (X[2] & bit) !== 0 ? 1 : 0;
            index = index * 8 + (bit0 | (bit1 << 1) | (bit2 << 2));
        }
        return index;
    }
    /**
     * Sorts an array of RGBA colors using the Oklab perceptual color space and a 3D Space-Filling Hilbert Curve,
     * refined by a minimum perceptual Delta E path. This ensures adjacent colors are maximally similar to human vision.
     * @param palette - Input RGBA color palette.
     * @returns New sorted RGBA color palette.
     */
    function sortPalettePerceptual(palette) {
        if (palette.length <= 1) return [...palette];
        // Compute Oklab and 3D Hilbert coordinates
        const items = palette.map((c) => {
            const lab = rgbToOklab(c.r, c.g, c.b, c.a !== undefined ? c.a : 255);
            // Map L in [0, 1] -> 0..1023
            const x = Math.max(0, Math.min(1023, Math.round(lab.L * 1023)));
            // Map a in [-0.4, 0.4] -> 0..1023
            const y = Math.max(0, Math.min(1023, Math.round(((lab.a + 0.4) / 0.8) * 1023)));
            // Map b in [-0.4, 0.4] -> 0..1023
            const z = Math.max(0, Math.min(1023, Math.round(((lab.b + 0.4) / 0.8) * 1023)));
            const hIndex = hilbert3D(x, y, z, 10);
            return { color: c, lab, hIndex };
        });
        // Initial sort by Hilbert Curve index in Oklab space
        items.sort((a, b) => a.hIndex - b.hIndex);
        // Greedy Nearest-Neighbor path minimization on Delta E starting from lowest lightness
        const unvisited = [...items];
        let minLIdx = 0;
        for (let i = 1; i < unvisited.length; ++i) {
            if (unvisited[i].lab.L < unvisited[minLIdx].lab.L) {
                minLIdx = i;
            }
        }
        const path = [unvisited.splice(minLIdx, 1)[0]];
        while (unvisited.length > 0) {
            const current = path[path.length - 1];
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < unvisited.length; ++i) {
                const cand = unvisited[i];
                const dL = current.lab.L - cand.lab.L;
                const da = current.lab.a - cand.lab.a;
                const db = current.lab.b - cand.lab.b;
                const dAlpha = (current.lab.alpha - cand.lab.alpha) / 255;
                const dist = dL * dL + da * da + db * db + 0.25 * dAlpha * dAlpha;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
            path.push(unvisited.splice(bestIdx, 1)[0]);
        }
        // 2-opt refinement to untangle any crossings along the perceptual tour
        let improved = true;
        let iterations = 0;
        const n = path.length;
        while (improved && iterations < 50 && n > 3) {
            improved = false;
            iterations++;
            for (let i = 0; i < n - 2; i++) {
                for (let j = i + 2; j < n; j++) {
                    const c_i = path[i].lab;
                    const c_i1 = path[i + 1].lab;
                    const c_j = path[j].lab;
                    const c_j1 = j + 1 < n ? path[j + 1].lab : null;
                    const d = (l1, l2) => {
                        const dL = l1.L - l2.L;
                        const da = l1.a - l2.a;
                        const db = l1.b - l2.b;
                        const dAlpha = (l1.alpha - l2.alpha) / 255;
                        return Math.sqrt(dL * dL + da * da + db * db + 0.25 * dAlpha * dAlpha);
                    };
                    const currentDist = d(c_i, c_i1) + (c_j1 ? d(c_j, c_j1) : 0);
                    const newDist = d(c_i, c_j) + (c_j1 ? d(c_i1, c_j1) : 0);
                    if (newDist + 1e-6 >= currentDist) continue;
                    let left = i + 1;
                    let right = j;
                    while (left < right) {
                        const tmp = path[left];
                        path[left] = path[right];
                        path[right] = tmp;
                        left++;
                        right--;
                    }
                    improved = true;
                }
            }
        }
        return path.map((item) => item.color);
    }
    /**
     * Converts an RGB color (0..255) to HSV representation (Hue: 0..360, Saturation: 0..1, Value: 0..1).
     * @param r - Red channel [0, 255].
     * @param g - Green channel [0, 255].
     * @param b - Blue channel [0, 255].
     * @returns Object with h (0..360), s (0..1), and v (0..1).
     */
    function rgbToHsv(r, g, b) {
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        const delta = max - min;
        let h = 0;
        if (delta > 1e-6) {
            if (max === rNorm) {
                h = ((gNorm - bNorm) / delta) % 6;
            } else if (max === gNorm) {
                h = (bNorm - rNorm) / delta + 2;
            } else {
                h = (rNorm - gNorm) / delta + 4;
            }
            h = Math.round(h * 60);
            if (h < 0) {
                h += 360;
            }
        }
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        return { h, s, v };
    }
    /**
     * Computes squared Euclidean color distance between two RGBA colors.
     * @param c1 - First color.
     * @param c2 - Second color.
     * @param checkAlpha - Whether to include alpha channel in distance calculation.
     * @returns Squared distance.
     */
    function getColorDistanceSq(c1, c2, checkAlpha) {
        const dr = c1.r - c2.r;
        const dg = c1.g - c2.g;
        const db = c1.b - c2.b;
        const rgbDist = dr * dr + dg * dg + db * db;
        if (!checkAlpha) return rgbDist;
        const da = c1.a - c2.a;
        return rgbDist + da * da;
    }
    /**
     * Finds the nearest palette index for a given RGBA color.
     * @param color - Target color.
     * @param palette - Available color palette.
     * @param checkAlpha - Whether to match alpha channel.
     * @returns Index of closest color in palette.
     */
    function findNearestPaletteIndex(color, palette, checkAlpha) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < palette.length; ++i) {
            const dist = getColorDistanceSq(color, palette[i], checkAlpha);
            if (dist >= minDist) continue;
            minDist = dist;
            nearestIdx = i;
        }
        return nearestIdx;
    }
    /**
     * Splits a color box along its axis with the greatest range.
     * @param box - Color box to split.
     * @param checkAlpha - Whether to consider alpha axis.
     * @returns Two split color boxes.
     */
    function splitColorBox(box, checkAlpha) {
        let minR = 255,
            maxR = 0;
        let minG = 255,
            maxG = 0;
        let minB = 255,
            maxB = 0;
        let minA = 255,
            maxA = 0;
        for (let i = 0; i < box.colors.length; ++i) {
            const c = box.colors[i];
            if (c.r < minR) minR = c.r;
            if (c.r > maxR) maxR = c.r;
            if (c.g < minG) minG = c.g;
            if (c.g > maxG) maxG = c.g;
            if (c.b < minB) minB = c.b;
            if (c.b > maxB) maxB = c.b;
            if (checkAlpha) {
                if (c.a < minA) minA = c.a;
                if (c.a > maxA) maxA = c.a;
            }
        }
        const rangeR = maxR - minR;
        const rangeG = maxG - minG;
        const rangeB = maxB - minB;
        const rangeA = checkAlpha ? maxA - minA : 0;
        let axis = 'r';
        let maxRange = rangeR;
        if (rangeG > maxRange) {
            maxRange = rangeG;
            axis = 'g';
        }
        if (rangeB > maxRange) {
            maxRange = rangeB;
            axis = 'b';
        }
        if (rangeA > maxRange) {
            axis = 'a';
        }
        box.colors.sort((c1, c2) => c1[axis] - c2[axis]);
        const mid = Math.floor(box.colors.length / 2);
        return [{ colors: box.colors.slice(0, mid) }, { colors: box.colors.slice(mid) }];
    }
    /**
     * Computes average RGBA color for a box.
     * @param colors - Array of colors in the box.
     * @returns Average RGBA color.
     */
    function getAverageColor(colors) {
        if (colors.length === 0) return { r: 0, g: 0, b: 0, a: 255 };
        let sumR = 0,
            sumG = 0,
            sumB = 0,
            sumA = 0;
        for (let i = 0; i < colors.length; ++i) {
            sumR += colors[i].r;
            sumG += colors[i].g;
            sumB += colors[i].b;
            sumA += colors[i].a;
        }
        const count = colors.length;
        return {
            r: Math.round(sumR / count),
            g: Math.round(sumG / count),
            b: Math.round(sumB / count),
            a: Math.round(sumA / count),
        };
    }
    /**
     * Generates an optimal palette of up to maxColors using median-cut quantization.
     * @param pixels - Input pixel array.
     * @param maxColors - Maximum allowed colors.
     * @param checkAlpha - Whether to include alpha channel.
     * @param alphaThreshold - Threshold below which pixels are excluded from palette.
     * @returns Generated color palette.
     */
    function quantizeMedianCut(pixels, maxColors, checkAlpha, alphaThreshold) {
        const validPixels = [];
        // Filter out pixels below the alpha threshold
        for (let i = 0; i < pixels.length; ++i) {
            if (pixels[i].a < alphaThreshold) continue;
            validPixels.push(pixels[i]);
        }
        if (validPixels.length === 0) {
            return [{ r: 255, g: 255, b: 255, a: 255 }];
        }
        // Identify unique colors first
        const uniqueMap = new Map();
        for (let i = 0; i < validPixels.length; ++i) {
            const c = validPixels[i];
            const key = checkAlpha
                ? ((c.r << 24) | (c.g << 16) | (c.b << 8) | c.a) >>> 0
                : ((c.r << 16) | (c.g << 8) | c.b) >>> 0;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, c);
            }
        }
        const uniqueColors = Array.from(uniqueMap.values());
        if (uniqueColors.length <= maxColors) {
            if (checkAlpha) return uniqueColors;
            return uniqueColors.map((c) => ({ r: c.r, g: c.g, b: c.b, a: 255 }));
        }
        // Median-cut clustering
        const boxes = [{ colors: validPixels }];
        while (boxes.length < maxColors) {
            let largestBoxIdx = -1;
            let maxCount = 0;
            for (let i = 0; i < boxes.length; ++i) {
                if (boxes[i].colors.length > maxCount && boxes[i].colors.length >= 2) {
                    maxCount = boxes[i].colors.length;
                    largestBoxIdx = i;
                }
            }
            if (largestBoxIdx === -1) break;
            const [box1, box2] = splitColorBox(boxes[largestBoxIdx], checkAlpha);
            boxes.splice(largestBoxIdx, 1, box1, box2);
        }
        const averaged = boxes.map((b) => getAverageColor(b.colors));
        if (checkAlpha) return averaged;
        return averaged.map((c) => ({ r: c.r, g: c.g, b: c.b, a: 255 }));
    }
    /**
     * Generates a palette of up to maxColors using the most-frequent color algorithm.
     * Selects the top N most frequent RGBA (or RGB) colors by pixel count.
     * @param pixels - Input pixel array.
     * @param maxColors - Maximum allowed colors.
     * @param checkAlpha - Whether to include alpha channel.
     * @param alphaThreshold - Threshold below which pixels are excluded from palette.
     * @returns Selected top most frequent color palette.
     */
    function quantizeMostFrequent(pixels, maxColors, checkAlpha, alphaThreshold) {
        const validPixels = [];
        // Filter out pixels below the alpha threshold
        for (let i = 0; i < pixels.length; ++i) {
            if (pixels[i].a < alphaThreshold) continue;
            validPixels.push(pixels[i]);
        }
        if (validPixels.length === 0) {
            return [{ r: 255, g: 255, b: 255, a: 255 }];
        }
        // Count frequency for each unique color
        const freqMap = new Map();
        for (let i = 0; i < validPixels.length; ++i) {
            const c = validPixels[i];
            const r = c.r;
            const g = c.g;
            const b = c.b;
            const a = checkAlpha ? c.a : 255;
            const key = checkAlpha ? ((r << 24) | (g << 16) | (b << 8) | a) >>> 0 : ((r << 16) | (g << 8) | b) >>> 0;
            const entry = freqMap.get(key);
            if (entry) {
                entry.count++;
            } else {
                freqMap.set(key, { color: { r, g, b, a }, count: 1 });
            }
        }
        // Sort by count descending, with secondary tie-breaker by key
        const sorted = Array.from(freqMap.entries())
            .sort((a, b) => {
                if (b[1].count !== a[1].count) {
                    return b[1].count - a[1].count;
                }
                return a[0] - b[0];
            })
            .map((entry) => entry[1].color);
        return sorted.slice(0, Math.max(1, maxColors));
    }
    /**
     * Generates an optimal palette based on the chosen algorithm or user-defined palette.
     * @param pixels - Input pixel array.
     * @param maxColors - Maximum allowed colors.
     * @param checkAlpha - Whether to include alpha channel.
     * @param alphaThreshold - Threshold below which pixels are excluded from palette.
     * @param algorithm - Palette quantization algorithm ('median-cut' | 'most-frequent' | 'user-defined').
     * @param customPalette - Optional custom palette for 'user-defined' algorithm.
     * @returns Generated color palette.
     */
    function generatePalette(pixels, maxColors, checkAlpha, alphaThreshold, algorithm = 'median-cut', customPalette) {
        let result;
        if (algorithm === 'user-defined' || (customPalette && customPalette.length > 0)) {
            if (!customPalette || customPalette.length === 0) return [{ r: 255, g: 255, b: 255, a: 255 }];
            const parsed = customPalette.map(parseColor);
            const uniqueList = [];
            const seen = new Set();
            for (const c of parsed) {
                const formatted = checkAlpha ? c : { r: c.r, g: c.g, b: c.b, a: 255 };
                const key = `${formatted.r},${formatted.g},${formatted.b},${formatted.a}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueList.push(formatted);
                }
                if (uniqueList.length >= maxColors) break;
            }
            return uniqueList.length > 0 ? uniqueList : [{ r: 255, g: 255, b: 255, a: 255 }];
        } else if (algorithm === 'most-frequent') {
            result = quantizeMostFrequent(pixels, maxColors, checkAlpha, alphaThreshold);
        } else {
            result = quantizeMedianCut(pixels, maxColors, checkAlpha, alphaThreshold);
        }
        return sortPalettePerceptual(result);
    }
    /**
     * Quantizes the alpha channel using 1D Median Cut (cumulative histogram partitioning).
     * @param pixels - Input pixel array.
     * @param maxAlphas - Maximum number of alpha levels (1..256).
     * @param alphaThreshold - Threshold below which pixels are excluded.
     * @returns Array of RGBA colors with r=255, g=255, b=255 and discrete alpha levels sorted ascending.
     */
    function quantizeAlphaMedianCut(pixels, maxAlphas, alphaThreshold) {
        const counts = new Map();
        for (let i = 0; i < pixels.length; ++i) {
            const a = pixels[i].a !== undefined ? pixels[i].a : 255;
            if (a >= alphaThreshold) {
                counts.set(a, (counts.get(a) ?? 0) + 1);
            }
        }
        if (counts.size === 0) return [{ r: 255, g: 255, b: 255, a: 255 }];
        const uniqueAlphas = Array.from(counts.keys()).sort((a, b) => a - b);
        if (uniqueAlphas.length <= maxAlphas) return uniqueAlphas.map((a) => ({ r: 255, g: 255, b: 255, a }));
        // 1D histogram partitioning by cumulative pixel weight
        let totalCount = 0;
        for (const count of counts.values()) {
            totalCount += count;
        }
        const targetBinWeight = totalCount / maxAlphas;
        const resultAlphas = [];
        let currentWeight = 0;
        let currentWeightedSum = 0;
        for (let i = 0; i < uniqueAlphas.length; ++i) {
            const a = uniqueAlphas[i];
            const count = counts.get(a);
            currentWeightedSum += a * count;
            currentWeight += count;
            if (currentWeight >= targetBinWeight && resultAlphas.length < maxAlphas - 1) {
                resultAlphas.push(Math.round(currentWeightedSum / currentWeight));
                currentWeightedSum = 0;
                currentWeight = 0;
            }
        }
        const distinctSet = new Set(resultAlphas);
        if (distinctSet.size < Math.min(maxAlphas, uniqueAlphas.length)) {
            const sortedByFreq = [...uniqueAlphas].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
            for (const a of sortedByFreq) {
                if (distinctSet.has(a)) continue;
                distinctSet.add(a);
                if (distinctSet.size >= maxAlphas) break;
            }
        }
        const distinct = Array.from(distinctSet).sort((a, b) => a - b);
        if (distinct.length === 0) return [{ r: 255, g: 255, b: 255, a: 255 }];
        return distinct.map((a) => ({ r: 255, g: 255, b: 255, a }));
    }
    /**
     * Quantizes the alpha channel using the Most Frequent algorithm.
     * Selects the top N most frequent alpha values >= alphaThreshold.
     * @param pixels - Input pixel array.
     * @param maxAlphas - Maximum number of alpha levels (1..256).
     * @param alphaThreshold - Threshold below which pixels are excluded.
     * @returns Array of RGBA colors with r=255, g=255, b=255 and discrete alpha levels sorted ascending.
     */
    function quantizeAlphaMostFrequent(pixels, maxAlphas, alphaThreshold) {
        const counts = new Map();
        for (let i = 0; i < pixels.length; ++i) {
            const a = pixels[i].a !== undefined ? pixels[i].a : 255;
            if (a >= alphaThreshold) {
                counts.set(a, (counts.get(a) ?? 0) + 1);
            }
        }
        if (counts.size === 0) return [{ r: 255, g: 255, b: 255, a: 255 }];
        const sortedByFrequency = Array.from(counts.entries())
            .sort((a, b) => {
                if (b[1] !== a[1]) {
                    return b[1] - a[1];
                }
                return b[0] - a[0];
            })
            .slice(0, Math.max(1, maxAlphas))
            .map((entry) => entry[0])
            .sort((a, b) => a - b);
        return sortedByFrequency.map((a) => ({ r: 255, g: 255, b: 255, a }));
    }
    /**
     * Generates an alpha-only color palette for monochrome graphics with transparency.
     * @param pixels - Input pixel array.
     * @param maxAlphas - Maximum number of discrete alpha levels (1..256).
     * @param alphaThreshold - Threshold below which pixels are excluded.
     * @param algorithm - Palette algorithm ('median-cut' | 'most-frequent' | 'user-defined').
     * @param customPalette - Optional custom palette or alpha values.
     * @returns Generated alpha palette array.
     */
    function generateAlphaPalette(pixels, maxAlphas, alphaThreshold, algorithm = 'median-cut', customPalette) {
        if (algorithm === 'user-defined' || (customPalette && customPalette.length > 0)) {
            if (!customPalette || customPalette.length === 0) return [{ r: 255, g: 255, b: 255, a: 255 }];
            const parsed = customPalette.map((c) => {
                if (typeof c === 'number') {
                    const a = c <= 1.0 && c > 0 ? Math.round(c * 255) : Math.round(c);
                    return { r: 255, g: 255, b: 255, a: Math.max(0, Math.min(255, a)) };
                }
                const p = parseColor(c);
                return { r: 255, g: 255, b: 255, a: p.a !== undefined ? p.a : 255 };
            });
            const sorted = parsed.sort((a, b) => a.a - b.a);
            const uniqueList = [];
            const seen = new Set();
            for (const item of sorted) {
                if (!seen.has(item.a)) {
                    seen.add(item.a);
                    uniqueList.push(item);
                }
                if (uniqueList.length >= maxAlphas) break;
            }
            return uniqueList.length > 0 ? uniqueList : [{ r: 255, g: 255, b: 255, a: 255 }];
        }
        if (algorithm === 'most-frequent') return quantizeAlphaMostFrequent(pixels, maxAlphas, alphaThreshold);
        return quantizeAlphaMedianCut(pixels, maxAlphas, alphaThreshold);
    }
    /**
     * Alias for generateAlphaPalette / quantizeAlphaMedianCut.
     */
    const quantizeAlphaPalette = generateAlphaPalette;
    /**
     * Finds the nearest alpha palette index for a given alpha value.
     * @param alpha - Input alpha value (0..255).
     * @param palette - Alpha palette.
     * @returns Nearest palette index.
     */
    function findNearestAlphaIndex(alpha, palette) {
        let bestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < palette.length; ++i) {
            const diff = Math.abs(palette[i].a - alpha);
            if (diff >= minDiff) continue;
            minDiff = diff;
            bestIdx = i;
            if (diff === 0) break;
        }
        return bestIdx;
    }
    /****** Image Resampling & Downsampling ******/
    /**
     * Resamples raw PNG RGBA buffer to the target grid dimensions.
     * @param srcData - Source RGBA byte buffer.
     * @param srcWidth - Source width.
     * @param srcHeight - Source height.
     * @param dstWidth - Target width.
     * @param dstHeight - Target height.
     * @returns Resampled RGBA pixels array.
     */
    function resampleImageData(srcData, srcWidth, srcHeight, dstWidth, dstHeight) {
        const output = new Array(dstWidth * dstHeight);
        const scaleX = srcWidth / dstWidth;
        const scaleY = srcHeight / dstHeight;
        for (let y = 0; y < dstHeight; ++y) {
            for (let x = 0; x < dstWidth; ++x) {
                // Nearest-neighbor sampling preserves crisp pixel art edges
                const srcX = Math.min(srcWidth - 1, Math.floor((x + 0.5) * scaleX));
                const srcY = Math.min(srcHeight - 1, Math.floor((y + 0.5) * scaleY));
                const srcIdx = (srcY * srcWidth + srcX) * 4;
                output[y * dstWidth + x] = {
                    r: srcData[srcIdx],
                    g: srcData[srcIdx + 1],
                    b: srcData[srcIdx + 2],
                    a: srcData[srcIdx + 3],
                };
            }
        }
        return output;
    }
    /****** 2D Rectilinear Painter's Decomposition ******/
    /**
     * Checks if a rectangular block of target color can safely be drawn without overwriting
     * transparent or translucent cells, and without overwriting already finalized cells.
     * @param targetGrid - Target color indices grid.
     * @param currentGrid - Current canvas state grid.
     * @param alphaGrid - Alpha values grid.
     * @param gridWidth - Grid width.
     * @param gridHeight - Grid height.
     * @param x0 - Starting X coordinate.
     * @param y0 - Starting Y coordinate.
     * @param w - Span width.
     * @param h - Span height.
     * @param colorIdx - Target palette color index.
     * @returns True if rectangle can be safely drawn and absorbs new pixels.
     */
    function canDrawOpaqueRect(targetGrid, currentGrid, alphaGrid, gridWidth, gridHeight, x0, y0, w, h, colorIdx) {
        if (x0 + w > gridWidth || y0 + h > gridHeight) return false;
        let absorbsNewPixels = false;
        for (let dy = 0; dy < h; ++dy) {
            const rowOffset = (y0 + dy) * gridWidth;
            for (let dx = 0; dx < w; ++dx) {
                const idx = rowOffset + (x0 + dx);
                const a = alphaGrid[idx];
                // Never paint over transparent or translucent pixels
                if (a < 255) return false;
                const targetC = targetGrid[idx];
                const currentC = currentGrid[idx];
                // If the cell is already correct, overdrawing it with the same color is harmless,
                // but overdrawing it with a different color destroys finalized work.
                if (currentC !== -1 && currentC === targetC && targetC !== colorIdx) return false;
                if (targetC === colorIdx && currentC !== colorIdx) {
                    absorbsNewPixels = true;
                }
            }
        }
        return absorbsNewPixels;
    }
    /**
     * Computes maximum horizontal span for an opaque rectangle.
     * @param targetGrid - Target color indices grid.
     * @param currentGrid - Current canvas state grid.
     * @param alphaGrid - Alpha values grid.
     * @param gridWidth - Grid width.
     * @param x0 - Starting X coordinate.
     * @param y - Current row Y coordinate.
     * @param colorIdx - Target palette color index.
     * @returns Maximum safe width span.
     */
    function findMaxOpaqueSpanW(targetGrid, currentGrid, alphaGrid, gridWidth, x0, y, colorIdx) {
        let w = 0;
        const rowOffset = y * gridWidth;
        while (x0 + w < gridWidth) {
            const idx = rowOffset + (x0 + w);
            const a = alphaGrid[idx];
            // Stop at translucent or transparent boundary
            if (a < 255) break;
            const targetC = targetGrid[idx];
            const currentC = currentGrid[idx];
            // Stop if this cell is already finalized with another color
            if (currentC !== -1 && currentC === targetC && targetC !== colorIdx) break;
            w++;
        }
        return w;
    }
    /**
     * Computes maximum vertical span matching a given width w.
     * @param targetGrid - Target color indices grid.
     * @param currentGrid - Current canvas state grid.
     * @param alphaGrid - Alpha values grid.
     * @param gridWidth - Grid width.
     * @param gridHeight - Grid height.
     * @param x0 - Starting X coordinate.
     * @param y0 - Starting Y coordinate.
     * @param w - Span width.
     * @param colorIdx - Target palette color index.
     * @returns Maximum safe vertical span height.
     */
    function findMaxOpaqueSpanH(targetGrid, currentGrid, alphaGrid, gridWidth, gridHeight, x0, y0, w, colorIdx) {
        let h = 0;
        while (y0 + h < gridHeight) {
            if (
                !canDrawOpaqueRect(
                    targetGrid,
                    currentGrid,
                    alphaGrid,
                    gridWidth,
                    gridHeight,
                    x0,
                    y0,
                    w,
                    h + 1,
                    colorIdx
                )
            ) {
                break;
            }
            h++;
        }
        return h;
    }
    /**
     * Decomposes opaque pixels using the Painter's Algorithm.
     * @param targetGrid - Target color indices grid.
     * @param currentGrid - Current canvas state grid.
     * @param alphaGrid - Alpha values grid.
     * @param gridWidth - Grid width.
     * @param gridHeight - Grid height.
     * @param colorCount - Total number of palette colors.
     * @returns Array of encoded rectangles ordered back-to-front.
     */
    function decomposeOpaqueLayers(targetGrid, currentGrid, alphaGrid, gridWidth, gridHeight, colorCount) {
        const rectangles = [];
        // Frequency analysis to order colors from largest base layers to smaller details
        const colorCounts = new Int32Array(colorCount);
        for (let i = 0; i < targetGrid.length; ++i) {
            const c = targetGrid[i];
            if (c >= 0 && alphaGrid[i] === 255) {
                colorCounts[c]++;
            }
        }
        const sortedColors = Array.from({ length: colorCount }, (_, i) => i)
            .filter((c) => colorCounts[c] > 0)
            .sort((a, b) => colorCounts[b] - colorCounts[a]);
        // Greedy Painter's sweep per color layer
        for (let pass = 0; pass < sortedColors.length; ++pass) {
            const colorIdx = sortedColors[pass];
            for (let y = 0; y < gridHeight; ++y) {
                for (let x = 0; x < gridWidth; ++x) {
                    const idx = y * gridWidth + x;
                    // Skip if not needing this color or if translucent/transparent
                    if (targetGrid[idx] !== colorIdx || currentGrid[idx] === colorIdx || alphaGrid[idx] < 255) continue;
                    // Expand horizontally
                    const maxW = findMaxOpaqueSpanW(targetGrid, currentGrid, alphaGrid, gridWidth, x, y, colorIdx);
                    if (maxW <= 0) continue;
                    // Expand vertically
                    const maxH = findMaxOpaqueSpanH(
                        targetGrid,
                        currentGrid,
                        alphaGrid,
                        gridWidth,
                        gridHeight,
                        x,
                        y,
                        maxW,
                        colorIdx
                    );
                    if (maxH <= 0) continue;
                    // Record rectangle
                    rectangles.push({ x, y, w: maxW, h: maxH, paletteIndex: colorIdx });
                    // Apply to currentGrid
                    for (let dy = 0; dy < maxH; ++dy) {
                        const markRowOffset = (y + dy) * gridWidth;
                        for (let dx = 0; dx < maxW; ++dx) {
                            currentGrid[markRowOffset + (x + dx)] = colorIdx;
                        }
                    }
                    x += maxW - 1;
                }
            }
        }
        return rectangles;
    }
    /**
     * Decomposes translucent pixels (0 < alpha < 255) using strictly disjoint 2D RLE merging.
     * @param targetGrid - Target color indices grid.
     * @param visitedGrid - Visited cells tracking grid.
     * @param alphaGrid - Alpha values grid.
     * @param gridWidth - Grid width.
     * @param gridHeight - Grid height.
     * @returns Array of disjoint translucent rectangles.
     */
    function decomposeTranslucentLayers(targetGrid, visitedGrid, alphaGrid, gridWidth, gridHeight) {
        const rectangles = [];
        for (let y = 0; y < gridHeight; ++y) {
            for (let x = 0; x < gridWidth; ++x) {
                const idx = y * gridWidth + x;
                const a = alphaGrid[idx];
                // Only process unvisited translucent pixels
                if (a === 0 || a === 255 || visitedGrid[idx] !== 0) continue;
                const colorIdx = targetGrid[idx];
                // Step 1: Expand width horizontally
                let w = 1;
                while (x + w < gridWidth) {
                    const nextIdx = y * gridWidth + (x + w);
                    if (visitedGrid[nextIdx] !== 0 || targetGrid[nextIdx] !== colorIdx || alphaGrid[nextIdx] !== a) {
                        break;
                    }
                    w++;
                }
                // Step 2: Expand height vertically
                let h = 1;
                while (y + h < gridHeight) {
                    let rowValid = true;
                    const nextRowOffset = (y + h) * gridWidth;
                    for (let dx = 0; dx < w; ++dx) {
                        const testIdx = nextRowOffset + (x + dx);
                        if (
                            visitedGrid[testIdx] !== 0 ||
                            targetGrid[testIdx] !== colorIdx ||
                            alphaGrid[testIdx] !== a
                        ) {
                            rowValid = false;
                            break;
                        }
                    }
                    if (!rowValid) break;
                    h++;
                }
                // Record disjoint rectangle
                rectangles.push({ x, y, w, h, paletteIndex: colorIdx });
                // Mark as visited
                for (let dy = 0; dy < h; ++dy) {
                    const markRowOffset = (y + dy) * gridWidth;
                    for (let dx = 0; dx < w; ++dx) {
                        visitedGrid[markRowOffset + (x + dx)] = 1;
                    }
                }
                x += w - 1;
            }
        }
        return rectangles;
    }
    /**
     * Serializes the header, palette, and rectangle stream into a packed Uint8Array.
     * @param width - Image width.
     * @param height - Image height.
     * @param hasOpacity - Whether opacity is enabled.
     * @param is16BitCoords - Whether coordinates use 16-bit encoding.
     * @param isMonochrome - Whether 1-color monochrome mode is enabled (no palette/paletteIndex).
     * @param palette - Color palette array.
     * @param rectangles - Array of encoded rectangles.
     * @returns Packed binary Uint8Array.
     */
    function serializePixelArt(width, height, hasOpacity, is16BitCoords, isMonochrome, palette, rectangles) {
        const paletteSize = isMonochrome ? (hasOpacity ? palette.length : 0) : palette.length;
        const rectCount = rectangles.length;
        const hasPaletteIndex = !isMonochrome || hasOpacity;
        // Calculate buffer byte length
        const headerBytes = 1 + (is16BitCoords ? 4 : 2);
        let paletteBytes = 0;
        if (!isMonochrome) {
            paletteBytes = 1 + paletteSize * (hasOpacity ? 4 : 3);
        } else if (hasOpacity) {
            paletteBytes = 1 + paletteSize * 1;
        }
        const rectEntryBytes = is16BitCoords ? (hasPaletteIndex ? 9 : 8) : hasPaletteIndex ? 5 : 4;
        const rectBytes = 2 + rectCount * rectEntryBytes;
        const totalBytes = headerBytes + paletteBytes + rectBytes;
        const buffer = new Uint8Array(totalBytes);
        let offset = 0;
        // Flags: bit 0 = hasOpacity, bit 1 = is16BitCoords, bit 2 = isMonochrome
        let flags = 0;
        if (hasOpacity) flags |= 0x01;
        if (is16BitCoords) flags |= 0x02;
        if (isMonochrome) flags |= 0x04;
        buffer[offset++] = flags;
        // Dimensions
        if (is16BitCoords) {
            buffer[offset++] = width & 0xff;
            buffer[offset++] = (width >> 8) & 0xff;
            buffer[offset++] = height & 0xff;
            buffer[offset++] = (height >> 8) & 0xff;
        } else {
            buffer[offset++] = width & 0xff;
            buffer[offset++] = height & 0xff;
        }
        // Palette
        if (!isMonochrome) {
            buffer[offset++] = (paletteSize - 1) & 0xff;
            for (let i = 0; i < paletteSize; ++i) {
                const c = palette[i];
                buffer[offset++] = c.r & 0xff;
                buffer[offset++] = c.g & 0xff;
                buffer[offset++] = c.b & 0xff;
                if (hasOpacity) {
                    buffer[offset++] = c.a & 0xff;
                }
            }
        } else if (hasOpacity) {
            buffer[offset++] = (paletteSize - 1) & 0xff;
            for (let i = 0; i < paletteSize; ++i) {
                buffer[offset++] = palette[i].a & 0xff;
            }
        }
        // Rectangle Count (Uint16 LE)
        buffer[offset++] = rectCount & 0xff;
        buffer[offset++] = (rectCount >> 8) & 0xff;
        // Rectangles Array
        for (let i = 0; i < rectCount; ++i) {
            const r = rectangles[i];
            if (is16BitCoords) {
                buffer[offset++] = r.x & 0xff;
                buffer[offset++] = (r.x >> 8) & 0xff;
                buffer[offset++] = r.y & 0xff;
                buffer[offset++] = (r.y >> 8) & 0xff;
                buffer[offset++] = r.w & 0xff;
                buffer[offset++] = (r.w >> 8) & 0xff;
                buffer[offset++] = r.h & 0xff;
                buffer[offset++] = (r.h >> 8) & 0xff;
                if (hasPaletteIndex) {
                    buffer[offset++] = r.paletteIndex & 0xff;
                }
            } else {
                buffer[offset++] = r.x & 0xff;
                buffer[offset++] = r.y & 0xff;
                buffer[offset++] = r.w & 0xff;
                buffer[offset++] = r.h & 0xff;
                if (hasPaletteIndex) {
                    buffer[offset++] = r.paletteIndex & 0xff;
                }
            }
        }
        return buffer;
    }
    /****** Base64 & Base122 Binary-To-Text Encodings ******/
    const B122_ILLEGALS = [0, 10, 13, 34, 38, 92]; // \0, \n, \r, ", &, \
    const B122_SHORTENED = 0b111; // 7
    /**
     * Encodes raw binary byte array into Base122 UTF-8 string.
     * @param rawData - Input binary bytes.
     * @returns Base122 encoded string.
     */
    function encodeBase122(rawData) {
        let curIndex = 0;
        let curBit = 0;
        const outBytes = [];
        function get7() {
            if (curIndex >= rawData.length) return false;
            const firstByte = rawData[curIndex];
            let firstPart = ((0b11111110 >>> curBit) & firstByte) << curBit;
            firstPart >>= 1;
            curBit += 7;
            if (curBit < 8) return firstPart;
            curBit -= 8;
            curIndex++;
            if (curIndex >= rawData.length) return firstPart;
            const secondByte = rawData[curIndex];
            let secondPart = (0xff00 >>> curBit) & secondByte & 0xff;
            secondPart >>= 8 - curBit;
            return firstPart | secondPart;
        }
        while (true) {
            const bits = get7();
            if (bits === false) break;
            const illegalIndex = B122_ILLEGALS.indexOf(bits);
            if (illegalIndex === -1) {
                outBytes.push(bits);
                continue;
            }
            let nextBits = get7();
            let b1 = 0b11000010;
            let b2 = 0b10000000;
            if (nextBits === false) {
                b1 |= (0b111 & B122_SHORTENED) << 2;
                nextBits = bits;
            } else {
                b1 |= (0b111 & illegalIndex) << 2;
            }
            const firstBit = (nextBits & 0b01000000) > 0 ? 1 : 0;
            b1 |= firstBit;
            b2 |= nextBits & 0b00111111;
            outBytes.push(b1, b2);
        }
        if (typeof Buffer !== 'undefined') return Buffer.from(outBytes).toString('utf-8');
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(new Uint8Array(outBytes));
    }
    /**
     * Decodes a Base122 string back into raw Uint8Array binary bytes.
     * @param strData - Base122 encoded string.
     * @param outBuffer - Optional destination buffer.
     * @returns Decoded Uint8Array.
     */
    function decodeBase122(strData, outBuffer) {
        const maxLen = Math.ceil(strData.length * 1.75) + 8;
        const decoded = outBuffer ?? new Uint8Array(maxLen);
        let decodedIndex = 0;
        let curByte = 0;
        let bitOfByte = 0;
        function push7(byte) {
            byte <<= 1;
            curByte |= byte >>> bitOfByte;
            bitOfByte += 7;
            if (bitOfByte < 8) return;
            decoded[decodedIndex++] = curByte;
            bitOfByte -= 8;
            curByte = (byte << (7 - bitOfByte)) & 255;
        }
        for (let i = 0; i < strData.length; ++i) {
            const c = strData.charCodeAt(i);
            if (c > 127) {
                const illegalIndex = (c >>> 8) & 7;
                if (illegalIndex !== B122_SHORTENED) {
                    push7(B122_ILLEGALS[illegalIndex]);
                }
                push7(c & 127);
            } else {
                push7(c);
            }
        }
        return outBuffer ? decoded.subarray(0, decodedIndex) : decoded.slice(0, decodedIndex);
    }
    /**
     * Converts a Uint8Array buffer to a Base122 string.
     * @param bytes - Input binary byte buffer.
     * @returns Base122 encoded string.
     */
    function bytesToBase122(bytes) {
        return encodeBase122(bytes);
    }
    /**
     * Converts a Base122 string to a Uint8Array byte buffer.
     * @param base122 - Base122 encoded string.
     * @returns Decoded Uint8Array byte buffer.
     */
    function base122ToBytes(base122) {
        return decodeBase122(base122);
    }
    /**
     * Checks if an encoded string is Base122 (contains non-Base64 or UTF-8 multi-byte characters).
     * @param str - Input encoded payload string.
     * @returns True if Base122, false if Base64.
     */
    function isBase122(str) {
        for (let i = 0; i < str.length; ++i) {
            const c = str.charCodeAt(i);
            if (c > 127) return true;
            const isB64Char =
                (c >= 65 && c <= 90) || // A-Z
                (c >= 97 && c <= 122) || // a-z
                (c >= 48 && c <= 57) || // 0-9
                c === 43 || // +
                c === 47 || // /
                c === 61; // =
            if (!isB64Char) return true;
        }
        return false;
    }
    /**
     * Converts a Base64 string to a Uint8Array byte buffer.
     * @param base64 - Base64 encoded string.
     * @returns Decoded Uint8Array byte buffer.
     */
    function base64ToBytes(base64) {
        if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(base64, 'base64'));
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; ++i) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    /**
     * Converts a Uint8Array buffer to a standard Base64 string.
     * @param bytes - Input binary byte buffer.
     * @returns Base64 encoded string.
     */
    function bytesToBase64(bytes) {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
        }
        // Browser fallback
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; ++i) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    /**
     * Deserializes a packed binary Uint8Array, Base122, or Base64 string back into structured pixel art data.
     * @param input - Packed binary byte array, Base122 string, or Base64 string.
     * @returns Deserialized pixel art data (width, height, hasOpacity, is16BitCoords, isMonochrome, palette, rectangles).
     */
    function deserializePixelArt(input) {
        const bytes =
            typeof input === 'string' ? (isBase122(input) ? base122ToBytes(input) : base64ToBytes(input)) : input;
        let offset = 0;
        const flags = bytes[offset++];
        const hasOpacity = (flags & 0x01) !== 0;
        const is16BitCoords = (flags & 0x02) !== 0;
        const isMonochrome = (flags & 0x04) !== 0;
        let width = 0;
        let height = 0;
        if (is16BitCoords) {
            width = bytes[offset++] | (bytes[offset++] << 8);
            height = bytes[offset++] | (bytes[offset++] << 8);
        } else {
            width = bytes[offset++];
            height = bytes[offset++];
        }
        let palette = [];
        if (!isMonochrome) {
            const paletteCount = bytes[offset++] + 1;
            palette = new Array(paletteCount);
            for (let i = 0; i < paletteCount; ++i) {
                const r = bytes[offset++];
                const g = bytes[offset++];
                const b = bytes[offset++];
                const a = hasOpacity ? bytes[offset++] : 255;
                palette[i] = { r, g, b, a };
            }
        } else if (hasOpacity) {
            const paletteCount = bytes[offset++] + 1;
            palette = new Array(paletteCount);
            for (let i = 0; i < paletteCount; ++i) {
                const a = bytes[offset++];
                palette[i] = { r: 255, g: 255, b: 255, a };
            }
        }
        const rectCount = bytes[offset++] | (bytes[offset++] << 8);
        const rectangles = new Array(rectCount);
        const hasPaletteIndex = !isMonochrome || hasOpacity;
        for (let i = 0; i < rectCount; ++i) {
            let rx = 0,
                ry = 0,
                rw = 0,
                rh = 0;
            if (is16BitCoords) {
                rx = bytes[offset++] | (bytes[offset++] << 8);
                ry = bytes[offset++] | (bytes[offset++] << 8);
                rw = bytes[offset++] | (bytes[offset++] << 8);
                rh = bytes[offset++] | (bytes[offset++] << 8);
            } else {
                rx = bytes[offset++];
                ry = bytes[offset++];
                rw = bytes[offset++];
                rh = bytes[offset++];
            }
            const paletteIndex = hasPaletteIndex ? bytes[offset++] : 0;
            rectangles[i] = { x: rx, y: ry, w: rw, h: rh, paletteIndex };
        }
        return {
            width,
            height,
            hasOpacity,
            is16BitCoords,
            isMonochrome,
            palette,
            rectangles,
        };
    }
    /****** High-Level Encoder Function ******/
    /**
     * Encodes an RGBA pixel buffer into the optimized pixel art binary format and Base64 string.
     * @param pixels - Input RGBA pixel array.
     * @param width - Image width.
     * @param height - Image height.
     * @param options - Encoding options.
     * @returns Encoded pixel art data and statistics.
     */
    function encodePixelArtFromRgba(pixels, width, height, options = {}) {
        const requestedMaxColors = options.maxColors ?? 32;
        const maxColors = Math.min(256, Math.max(1, requestedMaxColors));
        const supportOpacity = options.supportOpacity ?? true;
        const alphaThreshold = resolveAlphaThreshold(options.alphaThreshold, supportOpacity);
        const algorithm = options.paletteAlgorithm ?? (options.customPalette ? 'user-defined' : 'median-cut');
        const is16BitCoords = width > 255 || height > 255;
        const isExplicitMonochrome = options.monochrome === true;
        const isAutoMonochrome1Color =
            options.monochrome === undefined && maxColors === 1 && algorithm !== 'user-defined';
        let isMonochrome = isExplicitMonochrome || isAutoMonochrome1Color;
        // Palette quantization
        let palette;
        if (isMonochrome) {
            if (supportOpacity) {
                palette = generateAlphaPalette(pixels, maxColors, alphaThreshold, algorithm, options.customPalette);
            } else {
                palette = [{ r: 255, g: 255, b: 255, a: 255 }];
            }
        } else {
            palette = generatePalette(
                pixels,
                maxColors,
                supportOpacity,
                alphaThreshold,
                algorithm,
                options.customPalette
            );
            if (
                options.monochrome === undefined &&
                !supportOpacity &&
                palette.length <= 1 &&
                algorithm !== 'user-defined'
            ) {
                isMonochrome = true;
            }
        }
        // Map pixels to palette indices & build alpha buffer
        const targetGrid = new Int16Array(width * height);
        const alphaGrid = new Uint8Array(width * height);
        const colorIndexCache = new Map();
        for (let i = 0; i < pixels.length; ++i) {
            const p = pixels[i];
            if (p.a < alphaThreshold) {
                alphaGrid[i] = 0;
                targetGrid[i] = -1; // Transparent cutout
            } else if (isMonochrome) {
                if (supportOpacity) {
                    const idx = findNearestAlphaIndex(p.a, palette);
                    targetGrid[i] = idx;
                    alphaGrid[i] = palette[idx].a;
                } else {
                    targetGrid[i] = 0;
                    alphaGrid[i] = 255;
                }
            } else {
                const a = supportOpacity ? p.a : 255;
                alphaGrid[i] = a;
                const key = supportOpacity
                    ? ((p.r << 24) | (p.g << 16) | (p.b << 8) | p.a) >>> 0
                    : ((p.r << 16) | (p.g << 8) | p.b) >>> 0;
                let idx = colorIndexCache.get(key);
                if (idx === undefined) {
                    idx = findNearestPaletteIndex(p, palette, supportOpacity);
                    colorIndexCache.set(key, idx);
                }
                targetGrid[i] = idx;
            }
        }
        // Decompose into rectangles
        const currentGrid = new Int16Array(width * height).fill(-1);
        const opaqueRects = decomposeOpaqueLayers(targetGrid, currentGrid, alphaGrid, width, height, palette.length);
        const visitedGrid = new Uint8Array(width * height);
        const translucentRects = supportOpacity
            ? decomposeTranslucentLayers(targetGrid, visitedGrid, alphaGrid, width, height)
            : [];
        const allRectangles = [...opaqueRects, ...translucentRects];
        // Serialize
        const binary = serializePixelArt(
            width,
            height,
            supportOpacity,
            is16BitCoords,
            isMonochrome,
            palette,
            allRectangles
        );
        const base64 = bytesToBase64(binary);
        const base122 = bytesToBase122(binary);
        const rawPixelCount = width * height;
        const drawCallCount = allRectangles.length;
        const reductionPercent =
            rawPixelCount > 0 ? Math.round(((rawPixelCount - drawCallCount) / rawPixelCount) * 100) : 0;
        return {
            width,
            height,
            hasOpacity: supportOpacity,
            is16BitCoords,
            isMonochrome,
            palette: isMonochrome && !supportOpacity ? [] : palette,
            rectangles: allRectangles,
            base64,
            base122,
            stats: {
                rawPixelCount,
                drawCallCount,
                drawCallReductionPercent: reductionPercent,
                byteSize: binary.byteLength,
                base64Length: base64.length,
                base122Length: base122.length,
            },
        };
    }

    const PixelArtEncoder = {
        encodePixelArtFromRgba,
        deserializePixelArt,
        quantizeMedianCut,
        quantizeMostFrequent,
        quantizeAlphaPalette,
        quantizeAlphaMedianCut,
        quantizeAlphaMostFrequent,
        generateAlphaPalette,
        findNearestAlphaIndex,
        generatePalette,
        parseColor,
        rgbToOklab,
        deltaEOklab,
        hilbert3D,
        sortPalettePerceptual,
        rgbToHsv,
        bytesToBase64,
        base64ToBytes,
        bytesToBase122,
        base122ToBytes,
        isBase122,
        resolveAlphaThreshold,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PixelArtEncoder;
    }
    if (typeof window !== 'undefined') {
        window.PixelArtEncoder = PixelArtEncoder;
    }
    global.PixelArtEncoder = PixelArtEncoder;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
