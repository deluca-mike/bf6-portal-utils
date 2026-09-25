export declare class QREncoder {
    /** Maximum QR code version per ISO/IEC 18004. */
    static readonly MAX_QR_VERSION = 40;
    /** Default quiet zone margin in module units. */
    static readonly DEFAULT_MARGIN = 4;
    /** Minimum quiet zone margin in module units. */
    static readonly MIN_QUIET_ZONE = 4;
    private static readonly GF_EXP;
    private static readonly GF_LOG;
    private static readonly GENERATOR_POLYS;
    private static gfMul;
    private static polyMul;
    private static readonly _rsMsgBuffer;
    private static readonly _utf8Buffer;
    private static readonly _dataCodewordsBuffer;
    private static readonly _interleavedBuffer;
    private static readonly _eccBytesBuffer;
    private static readonly _blockOffsets;
    private static readonly _blockLens;
    private static readonly _eccBlockOffsets;
    private static readonly _versionResult;
    /**
     * ECC table per version (1..40) and ECC index (0:L, 1:M, 2:Q, 3:H).
     * Format: [eccCodewordsPerBlock, numBlocksG1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
     */
    private static readonly ECC_TABLE;
    private static readonly FORMAT_COORDS_TOP_LEFT;
    private static computeReedSolomon;
    private static encodeUtf8;
    /**
     * Converts ECC level enum or string representation to numeric index (0: Low, 1: Medium, 2: Quartile, 3: High).
     * @param ecc - Error correction level enum, string, or number.
     * @returns Numeric index 0..3.
     */
    static getEccIndex(ecc: QREncoder.ECC | string | number): number;
    /**
     * Calculates the byte length of the polymorphic payload without allocating memory.
     * @param data - Payload data to measure.
     * @returns Encoded byte count or -1 if invalid.
     */
    static getDataByteLength(data: QREncoder.Payload): number;
    private static getVersionInfoBits;
    private static getFormatInfoBits;
    private static getSecondFormatCoord;
    /**
     * Selects the smallest QR version accommodating dataByteLen with eccIdx.
     * @param dataByteLen - Data length in bytes.
     * @param eccIdx - Numeric error correction level index 0..3 or enum.
     * @param maxVersion - Upper version limit (1..40, default: 40).
     * @param logger - Optional logging instance to report capacity errors.
     * @returns Object with version and totalDataCodewords, or null if capacity exceeded.
     */
    static selectVersion(
        dataByteLen: number,
        eccIdx: number | QREncoder.ECC | string,
        maxVersion?: number,
        logger?: QREncoder.LoggerLike
    ): QREncoder.VersionInfo | null;
    private static buildDataBytes;
    private static interleaveBlocks;
    private static drawFinder;
    private static drawFinders;
    private static drawAlignments;
    private static drawTimingPatterns;
    private static reserveFormatAndVersionInfo;
    private static placeDataCodewords;
    private static isMaskCondition;
    private static getCellBit;
    private static calculatePenalty;
    private static evaluateBestMask;
    private static applyMask;
    private static writeFormatAndVersionInfo;
    /**
     * Encodes a payload directly into a target scratch buffer in-place without heap allocations.
     * Bit flags populated: Bit 0 = isFunction (1), Bit 1 = isDark (2), Bit 2 = isVisited (0).
     * @param data - The payload data to encode.
     * @param eccOrIdx - Error correction level enum, string ('L'|'M'|'Q'|'H'), or numeric index (0..3).
     * @param scratchBuffer - Reference to destination Uint8Array buffer (at least size * size modules).
     * @param maxVersion - Maximum permissible QR version (1..40, default: 40).
     * @param logger - Optional logger to receive error messages.
     * @returns Dimension size of square matrix (21..177) or -1 on failure.
     */
    static encodeToBuffer(
        data: QREncoder.Payload,
        eccOrIdx: QREncoder.ECC | string | number,
        scratchBuffer: Uint8Array,
        maxVersion?: number,
        logger?: QREncoder.LoggerLike
    ): number;
    /**
     * Encodes a payload (string, Uint8Array, or number array) into a 2D boolean QR code matrix.
     * Returns null if data is invalid or payload exceeds capacity.
     * @param data - The payload data to encode.
     * @param ecc - Error correction level.
     * @param options - Encoding options (maxVersion, scratchBuffer).
     * @returns 2D square boolean matrix, or null on error.
     */
    static encode(
        data: QREncoder.Payload,
        ecc?: QREncoder.ECC | string,
        options?: QREncoder.EncodeOptions
    ): boolean[][] | null;
    /**
     * Renders a payload as an ASCII preview using unicode half-block characters.
     * @param data - The payload data to encode.
     * @param options - ASCII rendering options.
     * @returns Multi-line string or null on error.
     */
    static encodeToAscii(data: QREncoder.Payload, options?: QREncoder.AsciiOptions): string | null;
    /**
     * Calculates the vertical span of unvisited dark cells for greedy rectangle merging.
     * @param scratch - Matrix scratch buffer.
     * @param r - Starting row.
     * @param c - Starting column.
     * @param w - Horizontal width of the span.
     * @param N - Matrix dimension.
     * @returns Vertical height of merged span.
     */
    static computeVerticalSpan(scratch: Uint8Array, r: number, c: number, w: number, N: number): number;
    /**
     * Merges individual dark modules in scratch into optimal rectilinear rectangles.
     * Format: (col << 24) | (row << 16) | (spanW << 8) | spanH.
     * @param scratch - Matrix scratch buffer containing encoded QR bitflags.
     * @param N - Dimension size of the matrix.
     * @param rectBuffer - Output buffer receiving packed 32-bit rectangle descriptors.
     * @returns Number of packed rectangles.
     */
    static packRectangles(scratch: Uint8Array, N: number, rectBuffer: Uint32Array): number;
}
export declare namespace QREncoder {
    /**
     * QR Code Error Correction Levels.
     */
    enum ECC {
        Low = 'L',
        Medium = 'M',
        Quartile = 'Q',
        High = 'H',
    }
    /**
     * Polymorphic payload data type: UTF-8 string, raw binary byte array, number array, or ArrayBufferView.
     */
    type Payload = string | Uint8Array | readonly number[] | ArrayBufferView;
    /**
     * 2D Matrix of booleans representing QR module cells.
     */
    type BooleanMatrix = boolean[][];
    /**
     * Version and capacity result returned by selectVersion.
     */
    interface VersionInfo {
        version: number;
        totalDataCodewords: number;
    }
    /**
     * Lightweight logger interface to avoid circular dependencies.
     */
    interface LoggerLike {
        log(message: string, level?: number): void;
    }
    /**
     * Options for QR encoding.
     */
    interface EncodeOptions {
        /** Error correction level (defaults to Medium). */
        ecc?: QREncoder.ECC | 'L' | 'M' | 'Q' | 'H';
        /** Maximum allowable version (1..40, default 40). */
        maxVersion?: number;
        /** Optional preallocated scratch buffer to use for internal matrix generation. */
        scratchBuffer?: Uint8Array;
    }
    /**
     * Options for ASCII QR code rendering.
     */
    interface AsciiOptions extends QREncoder.EncodeOptions {
        /** Quiet zone margin in module units (default: 4, min: 4). */
        margin?: number;
        /** Whether to invert dark/light modules. */
        invert?: boolean;
    }
    /**
     * Standard ISO/IEC 18004 alignment pattern center locations for versions 1 through 40.
     */
    const ALIGNMENT_POSITIONS: ReadonlyArray<ReadonlyArray<number>>;
}
