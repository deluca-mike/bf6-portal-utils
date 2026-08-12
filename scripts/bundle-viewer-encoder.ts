import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. BUNDLE PIXEL ART ENCODER (scripts/encode-pixel-art.ts -> pages/pixel-art-studio/pixel-art-encoder.js)
// ============================================================================

function bundlePixelArtEncoder(): void {
    const sourcePath = path.resolve(__dirname, 'encode-pixel-art.ts');
    const targetPath = path.resolve(__dirname, '../pages/pixel-art-studio/pixel-art-encoder.js');

    const sourceContent = fs.readFileSync(sourcePath, 'utf8');

    // Strip Node-only imports (fs, path, pngjs)
    let browserCode = sourceContent
        .replace("import * as fs from 'node:fs';", '')
        .replace("import * as path from 'node:path';", '')
        .replace("import { PNG } from 'pngjs';", '');

    // Exclude encodePixelArtFromFile and CLI execution which require Node.js fs/PNG
    const fileFuncIdx = browserCode.indexOf('export function encodePixelArtFromFile');
    if (fileFuncIdx !== -1) {
        const jsDocIdx = browserCode.lastIndexOf('/**', fileFuncIdx);
        browserCode = browserCode.slice(0, jsDocIdx !== -1 ? jsDocIdx : fileFuncIdx);
    }

    const transpiled = ts.transpileModule(browserCode, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            removeComments: false,
        },
    });

    const bundledJs = `/* eslint-disable */
// Auto-generated from scripts/encode-pixel-art.ts - DO NOT EDIT DIRECTLY
(function (global) {
    "use strict";

${transpiled.outputText.replace(/export /g, '')}

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
`;

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, bundledJs, 'utf8');
    console.log(`Successfully generated ${targetPath}`);
}

// ============================================================================
// 2. BUNDLE QR CODE ENCODER (ui/components/qr-code/index.ts -> pages/qr-code-studio/qr-code-encoder.js)
// ============================================================================

function bundleQRCodeEncoder(): void {
    const sourcePath = path.resolve(__dirname, '../ui/components/qr-code/encoder.ts');
    const targetPath = path.resolve(__dirname, '../pages/qr-code-studio/qr-code-encoder.js');

    const sourceContent = fs.readFileSync(sourcePath, 'utf8');

    const transpiled = ts.transpileModule(sourceContent, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            removeComments: false,
        },
    });

    const bundledJs = `/* eslint-disable */
// Auto-generated from ui/components/qr-code/encoder.ts - DO NOT EDIT DIRECTLY
(function (global) {
    "use strict";

${transpiled.outputText.replace(/export /g, '')}

    const MAX_MODULES = (4 * QREncoder.MAX_QR_VERSION + 17) * (4 * QREncoder.MAX_QR_VERSION + 17);
    const _scratchBuffer = new Uint8Array(MAX_MODULES);
    const _rectBuffer = new Uint32Array(MAX_MODULES);

    function encodeToRectangles(data, ecc = QREncoder.ECC.Medium, maxVersion = 40) {
        const size = QREncoder.encodeToBuffer(data, ecc, _scratchBuffer, maxVersion);
        if (size <= 0) return null;

        const matrix = new Array(size);
        const version = (size - 17) / 4;
        let naiveCount = 0;

        for (let r = 0; r < size; ++r) {
            const row = new Array(size);
            const rowOffset = r * size;
            for (let c = 0; c < size; ++c) {
                const isDark = (_scratchBuffer[rowOffset + c] & 2) !== 0;
                row[c] = isDark;
                if (isDark) naiveCount++;
            }
            matrix[r] = row;
        }

        const rectCount = QREncoder.packRectangles(_scratchBuffer, size, _rectBuffer);
        const rectangles = new Array(rectCount);

        for (let i = 0; i < rectCount; ++i) {
            const packed = _rectBuffer[i];
            rectangles[i] = {
                col: (packed >>> 24) & 0xff,
                row: (packed >>> 16) & 0xff,
                w: (packed >>> 8) & 0xff,
                h: packed & 0xff,
            };
        }

        const savings = naiveCount > 0 ? (1 - rectCount / naiveCount) * 100 : 0;

        return {
            version,
            size,
            matrix,
            rectangles,
            totalRectangles: rectCount,
            naiveCount,
            savings,
        };
    }

    class UIQRCodeExtended {
        static get _rectBuffer() { return _rectBuffer; }
        static get _scratchBuffer() { return _scratchBuffer; }
        static encode(data, ecc = QREncoder.ECC.Medium) {
            return QREncoder.encode(data, ecc, { scratchBuffer: _scratchBuffer });
        }
        static encodeToRectangles(data, ecc = QREncoder.ECC.Medium) {
            return encodeToRectangles(data, ecc);
        }
    }

    const UIQRCodeEncoder = {
        QREncoder,
        UIQRCodeExtended,
        encode: (data, ecc) => QREncoder.encode(data, ecc, { scratchBuffer: _scratchBuffer }),
        encodeToRectangles,
        ECC: QREncoder.ECC,
        MAX_QR_VERSION: QREncoder.MAX_QR_VERSION,
        DEFAULT_MARGIN: QREncoder.DEFAULT_MARGIN,
        MIN_QUIET_ZONE: QREncoder.MIN_QUIET_ZONE,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UIQRCodeEncoder;
    }
    if (typeof window !== 'undefined') {
        window.QREncoder = QREncoder;
        window.UIQRCodeExtended = UIQRCodeExtended;
        window.UIQRCodeEncoder = UIQRCodeEncoder;
    }
    global.QREncoder = QREncoder;
    global.UIQRCodeExtended = UIQRCodeExtended;
    global.UIQRCodeEncoder = UIQRCodeEncoder;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
`;

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, bundledJs, 'utf8');
    console.log(`Successfully generated ${targetPath}`);
}

bundlePixelArtEncoder();
bundleQRCodeEncoder();
