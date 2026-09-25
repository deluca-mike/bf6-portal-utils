import * as fs from 'node:fs';
import * as path from 'node:path';
import { QREncoder } from '../ui/components/qr-code/encoder.ts';

export type BooleanMatrix = ReadonlyArray<ReadonlyArray<boolean>>;

export interface MergedRectangle {
    col: number;
    row: number;
    w: number;
    h: number;
}

export interface EncodedQRResult {
    version: number;
    size: number;
    matrix: boolean[][];
    rectangles: MergedRectangle[];
    totalRectangles: number;
    naiveCount: number;
    savings: number;
}

const MAX_MODULES = (4 * QREncoder.MAX_QR_VERSION + 17) * (4 * QREncoder.MAX_QR_VERSION + 17);
const _scratchBuffer = new Uint8Array(MAX_MODULES);
const _rectBuffer = new Uint32Array(MAX_MODULES);

/**
 * Encodes a payload (string, Uint8Array, or number array) into a 2D boolean QR code matrix.
 * @param data - The payload data to encode.
 * @param ecc - Error correction level.
 * @returns 2D square boolean matrix, or null on error.
 */
export function encodeQRCode(data: QREncoder.Payload, ecc: QREncoder.ECC = QREncoder.ECC.Medium): boolean[][] | null {
    return QREncoder.encode(data, ecc, { scratchBuffer: _scratchBuffer });
}

/**
 * Encodes a payload into a 2D boolean matrix and greedy rectilinear merged rectangles.
 * Returns null if data is invalid or payload exceeds capacity.
 * @param data - The payload data to encode.
 * @param ecc - Error correction level.
 * @param maxVersion - Maximum permissible QR version (1..40, default: 40).
 * @returns Encoded QR result with rectangle packing metrics, or null on error.
 */
export function encodeToRectangles(
    data: QREncoder.Payload,
    ecc: QREncoder.ECC | string = QREncoder.ECC.Medium,
    maxVersion: number = QREncoder.MAX_QR_VERSION
): EncodedQRResult | null {
    const size = QREncoder.encodeToBuffer(data, ecc, _scratchBuffer, maxVersion);

    if (size <= 0) return null;

    const matrix: boolean[][] = new Array(size);
    const version = (size - 17) / 4;
    let naiveCount = 0;

    for (let r = 0; r < size; ++r) {
        const row = new Array<boolean>(size);
        const rowOffset = r * size;
        for (let c = 0; c < size; ++c) {
            const isDark = (_scratchBuffer[rowOffset + c] & 2) !== 0;
            row[c] = isDark;
            if (isDark) naiveCount++;
        }
        matrix[r] = row;
    }

    const rectCount = QREncoder.packRectangles(_scratchBuffer, size, _rectBuffer);
    const rectangles: MergedRectangle[] = new Array(rectCount);

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

/**
 * Class exposing offline encoder utilities and backward-compatible helper methods.
 */
export class UIQRCodeExtended {
    public static readonly _rectBuffer = _rectBuffer;
    public static readonly _scratchBuffer = _scratchBuffer;

    public static encode(data: QREncoder.Payload, ecc: QREncoder.ECC = QREncoder.ECC.Medium): boolean[][] | null {
        return encodeQRCode(data, ecc);
    }

    public static encodeToRectangles(
        data: QREncoder.Payload,
        ecc: QREncoder.ECC = QREncoder.ECC.Medium
    ): EncodedQRResult | null {
        return encodeToRectangles(data, ecc);
    }
}

/**
 * Parses a string into an ECC enum value.
 * @param eccStr - The string to parse.
 * @returns Valid QREncoder.ECC enum value.
 */
export function parseEcc(eccStr?: string): QREncoder.ECC {
    return QREncoder.getEccIndex(eccStr ?? 'M') === 0
        ? QREncoder.ECC.Low
        : QREncoder.getEccIndex(eccStr ?? 'M') === 2
          ? QREncoder.ECC.Quartile
          : QREncoder.getEccIndex(eccStr ?? 'M') === 3
            ? QREncoder.ECC.High
            : QREncoder.ECC.Medium;
}

/**
 * Reads a text or binary file from disk and encodes it into merged rectangles.
 * @param filePath - Path to file.
 * @param ecc - Error correction level.
 * @returns Encoded QR result or null on error.
 */
export function encodeQRCodeFromFile(
    filePath: string,
    ecc: QREncoder.ECC = QREncoder.ECC.Medium
): EncodedQRResult | null {
    const buffer = fs.readFileSync(filePath);
    return encodeToRectangles(buffer, ecc);
}

/**
 * Renders an ASCII preview of the QR boolean matrix using unicode half-block characters.
 * @param matrix - 2D boolean matrix.
 * @param margin - Quiet zone margin in module units.
 * @param invert - Inverts light/dark modules.
 * @returns Multi-line string.
 */
export function renderAsciiQr(matrix: boolean[][], margin: number = 4, invert: boolean = false): string {
    const N = matrix.length;
    const totalSize = N + 2 * margin;

    const fullGrid: boolean[][] = Array.from({ length: totalSize }, (_, r) =>
        Array.from({ length: totalSize }, (_, c) => {
            const mr = r - margin;
            const mc = c - margin;
            if (mr >= 0 && mr < N && mc >= 0 && mc < N) {
                return matrix[mr][mc];
            }
            return false;
        })
    );

    const lines: string[] = [];
    for (let r = 0; r < totalSize; r += 2) {
        let line = '';
        for (let c = 0; c < totalSize; ++c) {
            let top = fullGrid[r][c];
            let bot = r + 1 < totalSize ? fullGrid[r + 1][c] : false;

            if (invert) {
                top = !top;
                bot = !bot;
            }

            // In typical dark terminal backgrounds:
            // Light background modules = white (█), Dark modules = black ( )
            if (!top && !bot) {
                line += '█';
            } else if (top && !bot) {
                line += '▄';
            } else if (!top && bot) {
                line += '▀';
            } else {
                line += ' ';
            }
        }
        lines.push(line);
    }

    return lines.join('\n');
}

/****** CLI Runner ******/

/**
 * Parses CLI command-line arguments and runs the QR code encoder.
 */
function runCli(): void {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: npx ts-node scripts/encode-qr-code.ts <text-or-url> [options]

Options:
  --data <string>                    Explicit payload data string
  --file <path>                      Read payload data from a file
  --ecc <level>                      Error correction level: L | M | Q | H (default: M)
  --margin <number>                  Quiet zone margin in module units (default: 4, min: 4)
  --scale <number>                   Scale multiplier for generated snippet sizing (default: 1)
  --no-preview                       Suppress ASCII QR code terminal preview
  --invert                           Invert dark/light modules in terminal preview
  --json                             Output full JSON report with matrix and rectangles
  -h, --help                         Display this help message
`);
        return;
    }

    let payload: string | Uint8Array | null = null;
    let filePath: string | null = null;
    let ecc: QREncoder.ECC = QREncoder.ECC.Medium;
    let margin = 4;
    let scale = 1;
    let showPreview = true;
    let invert = false;
    let jsonOutput = false;

    if (args.length > 0 && !args[0].startsWith('-')) {
        payload = args[0];
    }

    for (let i = 0; i < args.length; ++i) {
        if ((args[i] === '--data' || args[i] === '-d') && args[i + 1]) {
            payload = args[++i];
        } else if ((args[i] === '--file' || args[i] === '-f') && args[i + 1]) {
            filePath = path.resolve(args[++i]);
        } else if ((args[i] === '--ecc' || args[i] === '-e') && args[i + 1]) {
            ecc = parseEcc(args[++i]);
        } else if ((args[i] === '--margin' || args[i] === '-m') && args[i + 1]) {
            margin = Math.max(4, parseInt(args[++i], 10) || 4);
        } else if ((args[i] === '--scale' || args[i] === '-s') && args[i + 1]) {
            scale = Math.max(0.1, parseFloat(args[++i]) || 1);
        } else if (args[i] === '--no-preview') {
            showPreview = false;
        } else if (args[i] === '--invert') {
            invert = true;
        } else if (args[i] === '--json') {
            jsonOutput = true;
        }
    }

    if (filePath) {
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
        }
        try {
            payload = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err);
            process.exit(1);
        }
    }

    if (payload == null) {
        console.error('Error: No payload provided. Specify text/URL or use --file <path>');
        process.exit(1);
    }

    const result = encodeToRectangles(payload, ecc);

    if (!result) {
        console.error(
            `Error: Failed to encode QR code. Payload may exceed capacity for configured MAX_QR_VERSION (${QREncoder.MAX_QR_VERSION}).`
        );
        process.exit(1);
    }

    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    const payloadStr = typeof payload === 'string' ? payload : `[Binary ${payload.length} bytes]`;
    const payloadBytes = typeof payload === 'string' ? Buffer.byteLength(payload, 'utf8') : payload.length;
    const totalUnits = result.size + 2 * margin;
    const pixelSize = Math.round(totalUnits * 10 * scale);

    console.log(`\n=== QR Code Encoding Summary ===`);
    console.log(`Payload:          ${payloadStr.length > 60 ? payloadStr.slice(0, 57) + '...' : payloadStr}`);
    console.log(`Payload Size:     ${payloadBytes} bytes`);
    console.log(`Version:          Version ${result.version} (${result.size} x ${result.size} matrix)`);
    console.log(`Dimensions:       ${totalUnits} x ${totalUnits} units (with ${margin}-module quiet zone margin)`);
    console.log(`Error Correction: Level ${ecc}`);
    console.log(`Naive Modules:    ${result.naiveCount} dark cells`);
    console.log(
        `Draw Calls:       ${result.totalRectangles + 2} widgets (${result.totalRectangles} module rects + 2 containers, -${Math.round(result.savings)}% reduction)`
    );
    console.log(`Saved Widgets:    ${result.naiveCount - result.totalRectangles} native containers eliminated`);

    if (showPreview) {
        console.log(`\nASCII Preview (Quiet zone: ${margin}):\n`);
        console.log(renderAsciiQr(result.matrix, margin, invert));
    }

    console.log(`\nTypeScript Snippet:`);
    console.log(`const qrCode = new UIQRCode({`);
    if (typeof payload === 'string') {
        console.log(`    data: '${payload.replace(/'/g, "\\'")}',`);
    } else {
        console.log(`    data: new Uint8Array([${Array.from(payload).join(', ')}]),`);
    }
    console.log(
        `    ecc: UIQRCode.ECC.${ecc === 'L' ? 'Low' : ecc === 'M' ? 'Medium' : ecc === 'Q' ? 'Quartile' : 'High'},`
    );
    console.log(`    margin: ${margin},`);
    console.log(`    size: { width: ${pixelSize}, height: ${pixelSize} },`);
    console.log(`});\n`);
}

// Execute if run directly from command line
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('encode-qr-code.ts')) {
    runCli();
}
