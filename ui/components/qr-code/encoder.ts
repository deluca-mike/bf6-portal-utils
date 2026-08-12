// version: 1.0.0
export class QREncoder {
    /** Maximum QR code version per ISO/IEC 18004. */
    public static readonly MAX_QR_VERSION = 40;

    /** Default quiet zone margin in module units. */
    public static readonly DEFAULT_MARGIN = 4;

    /** Minimum quiet zone margin in module units. */
    public static readonly MIN_QUIET_ZONE = 4;

    private static readonly GF_EXP = new Uint8Array(512);
    private static readonly GF_LOG = new Uint8Array(256);
    private static readonly GENERATOR_POLYS: Uint8Array[] = new Array<Uint8Array>(31);

    static {
        // Precompute Galois Field tables GF(256) with primitive polynomial 0x11D
        let x = 1;

        for (let i = 0; i < 255; ++i) {
            QREncoder.GF_EXP[i] = x;
            QREncoder.GF_EXP[i + 255] = x;
            QREncoder.GF_LOG[x] = i;
            x <<= 1;

            if (x & 0x100) {
                x ^= 0x11d;
            }
        }

        // Precompute generator polynomials for degrees 1..30 at module load
        let currentGen: Uint8Array = new Uint8Array([1]);

        for (let i = 0; i < 30; ++i) {
            currentGen = QREncoder.polyMul(currentGen, new Uint8Array([1, QREncoder.GF_EXP[i]]));
            QREncoder.GENERATOR_POLYS[i + 1] = currentGen;
        }
    }

    private static gfMul(a: number, b: number): number {
        return a === 0 || b === 0 ? 0 : QREncoder.GF_EXP[QREncoder.GF_LOG[a] + QREncoder.GF_LOG[b]];
    }

    private static polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
        const result = new Uint8Array(p1.length + p2.length - 1);

        for (let i = 0; i < p1.length; ++i) {
            for (let j = 0; j < p2.length; ++j) {
                result[i + j] ^= QREncoder.gfMul(p1[i], p2[j]);
            }
        }

        return result;
    }

    // Small static processing buffers for zero-allocation encoding
    private static readonly _rsMsgBuffer = new Uint8Array(256);
    private static readonly _utf8Buffer = new Uint8Array(2953);
    private static readonly _dataCodewordsBuffer = new Uint8Array(3706);
    private static readonly _interleavedBuffer = new Uint8Array(3706);
    private static readonly _eccBytesBuffer = new Uint8Array(3706);
    private static readonly _blockOffsets = new Uint16Array(128);
    private static readonly _blockLens = new Uint16Array(128);
    private static readonly _eccBlockOffsets = new Uint16Array(128);
    private static readonly _versionResult: QREncoder.VersionInfo = { version: 0, totalDataCodewords: 0 };

    /**
     * ECC table per version (1..40) and ECC index (0:L, 1:M, 2:Q, 3:H).
     * Format: [eccCodewordsPerBlock, numBlocksG1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
     */
    private static readonly ECC_TABLE: ReadonlyArray<ReadonlyArray<[number, number, number, number, number]>> =
        Object.freeze([
            // V1
            [
                [7, 1, 19, 0, 0],
                [10, 1, 16, 0, 0],
                [13, 1, 13, 0, 0],
                [17, 1, 9, 0, 0],
            ],
            // V2
            [
                [10, 1, 34, 0, 0],
                [16, 1, 28, 0, 0],
                [22, 1, 22, 0, 0],
                [28, 1, 16, 0, 0],
            ],
            // V3
            [
                [15, 1, 55, 0, 0],
                [26, 1, 44, 0, 0],
                [18, 2, 17, 0, 0],
                [22, 2, 13, 0, 0],
            ],
            // V4
            [
                [20, 1, 80, 0, 0],
                [18, 2, 32, 0, 0],
                [26, 2, 24, 0, 0],
                [16, 4, 9, 0, 0],
            ],
            // V5
            [
                [26, 1, 108, 0, 0],
                [24, 2, 43, 0, 0],
                [18, 2, 15, 2, 16],
                [22, 2, 11, 2, 12],
            ],
            // V6
            [
                [18, 2, 68, 0, 0],
                [16, 4, 27, 0, 0],
                [24, 4, 19, 0, 0],
                [28, 4, 15, 0, 0],
            ],
            // V7
            [
                [20, 2, 78, 0, 0],
                [18, 4, 31, 0, 0],
                [18, 2, 14, 4, 15],
                [26, 4, 13, 1, 14],
            ],
            // V8
            [
                [24, 2, 97, 0, 0],
                [22, 2, 38, 2, 39],
                [22, 4, 18, 2, 19],
                [26, 4, 14, 2, 15],
            ],
            // V9
            [
                [30, 2, 116, 0, 0],
                [22, 3, 36, 2, 37],
                [20, 4, 16, 4, 17],
                [24, 4, 12, 4, 13],
            ],
            // V10
            [
                [18, 2, 68, 2, 69],
                [26, 4, 43, 1, 44],
                [24, 6, 19, 2, 20],
                [28, 6, 15, 2, 16],
            ],
            // V11
            [
                [20, 4, 81, 0, 0],
                [30, 1, 50, 4, 51],
                [28, 4, 22, 4, 23],
                [24, 3, 12, 8, 13],
            ],
            // V12
            [
                [24, 2, 92, 2, 93],
                [22, 6, 36, 2, 37],
                [26, 4, 20, 6, 21],
                [28, 7, 14, 4, 15],
            ],
            // V13
            [
                [26, 4, 107, 0, 0],
                [22, 8, 37, 1, 38],
                [24, 8, 20, 4, 21],
                [22, 12, 11, 4, 12],
            ],
            // V14
            [
                [30, 3, 115, 1, 116],
                [24, 4, 40, 5, 41],
                [20, 11, 16, 5, 17],
                [24, 11, 12, 5, 13],
            ],
            // V15
            [
                [22, 5, 87, 1, 88],
                [24, 5, 41, 5, 42],
                [30, 5, 24, 7, 25],
                [24, 11, 12, 7, 13],
            ],
            // V16
            [
                [24, 5, 98, 1, 99],
                [28, 7, 45, 3, 46],
                [24, 15, 19, 2, 20],
                [30, 3, 15, 13, 16],
            ],
            // V17
            [
                [28, 1, 107, 5, 108],
                [28, 10, 46, 1, 47],
                [28, 1, 22, 15, 23],
                [28, 2, 14, 17, 15],
            ],
            // V18
            [
                [30, 5, 120, 1, 121],
                [26, 9, 43, 4, 44],
                [28, 17, 22, 1, 23],
                [28, 2, 14, 19, 15],
            ],
            // V19
            [
                [28, 3, 113, 4, 114],
                [26, 3, 44, 11, 45],
                [26, 17, 21, 4, 22],
                [26, 9, 13, 16, 14],
            ],
            // V20
            [
                [28, 3, 107, 5, 108],
                [26, 3, 41, 13, 42],
                [30, 15, 24, 5, 25],
                [28, 15, 15, 10, 16],
            ],
            // V21
            [
                [28, 4, 116, 4, 117],
                [26, 17, 42, 0, 0],
                [28, 17, 22, 6, 23],
                [30, 19, 16, 6, 17],
            ],
            // V22
            [
                [28, 2, 111, 7, 112],
                [28, 17, 46, 0, 0],
                [30, 7, 24, 16, 25],
                [24, 34, 13, 0, 0],
            ],
            // V23
            [
                [30, 4, 121, 5, 122],
                [28, 4, 47, 14, 48],
                [30, 11, 24, 14, 25],
                [30, 16, 15, 14, 16],
            ],
            // V24
            [
                [30, 6, 117, 4, 118],
                [28, 6, 45, 14, 46],
                [30, 11, 24, 16, 25],
                [30, 30, 16, 2, 17],
            ],
            // V25
            [
                [26, 8, 106, 4, 107],
                [28, 8, 47, 13, 48],
                [30, 7, 24, 22, 25],
                [30, 22, 15, 13, 16],
            ],
            // V26
            [
                [28, 10, 114, 2, 115],
                [28, 19, 46, 4, 47],
                [28, 28, 22, 6, 23],
                [30, 33, 16, 4, 17],
            ],
            // V27
            [
                [30, 8, 122, 4, 123],
                [28, 22, 45, 3, 46],
                [30, 8, 23, 26, 24],
                [30, 12, 15, 28, 16],
            ],
            // V28
            [
                [30, 3, 117, 10, 118],
                [28, 3, 45, 23, 46],
                [30, 4, 24, 31, 25],
                [30, 11, 15, 31, 16],
            ],
            // V29
            [
                [30, 7, 116, 7, 117],
                [28, 21, 45, 7, 46],
                [30, 1, 23, 37, 24],
                [30, 19, 15, 26, 16],
            ],
            // V30
            [
                [30, 5, 115, 10, 116],
                [28, 19, 47, 10, 48],
                [30, 15, 24, 25, 25],
                [30, 23, 15, 25, 16],
            ],
            // V31
            [
                [30, 13, 115, 3, 116],
                [28, 2, 46, 29, 47],
                [30, 42, 24, 1, 25],
                [30, 23, 15, 28, 16],
            ],
            // V32
            [
                [30, 17, 115, 0, 0],
                [28, 10, 46, 23, 47],
                [30, 10, 24, 35, 25],
                [30, 19, 15, 35, 16],
            ],
            // V33
            [
                [30, 17, 115, 1, 116],
                [28, 14, 46, 21, 47],
                [30, 29, 24, 19, 25],
                [30, 11, 15, 46, 16],
            ],
            // V34
            [
                [30, 13, 115, 6, 116],
                [28, 14, 46, 23, 47],
                [30, 44, 24, 7, 25],
                [30, 59, 16, 1, 17],
            ],
            // V35
            [
                [30, 12, 121, 7, 122],
                [28, 12, 47, 26, 48],
                [30, 39, 24, 14, 25],
                [30, 22, 15, 41, 16],
            ],
            // V36
            [
                [30, 6, 121, 14, 122],
                [28, 6, 47, 34, 48],
                [30, 46, 24, 10, 25],
                [30, 2, 15, 64, 16],
            ],
            // V37
            [
                [30, 17, 122, 4, 123],
                [28, 29, 46, 14, 47],
                [30, 49, 24, 10, 25],
                [30, 24, 15, 46, 16],
            ],
            // V38
            [
                [30, 4, 122, 18, 123],
                [28, 13, 46, 32, 47],
                [30, 48, 24, 14, 25],
                [30, 42, 15, 32, 16],
            ],
            // V39
            [
                [30, 20, 117, 4, 118],
                [28, 40, 47, 7, 48],
                [30, 43, 24, 22, 25],
                [30, 10, 15, 67, 16],
            ],
            // V40
            [
                [30, 19, 118, 6, 119],
                [28, 18, 47, 31, 48],
                [30, 34, 24, 34, 25],
                [30, 20, 15, 61, 16],
            ],
        ]);

    private static readonly FORMAT_COORDS_TOP_LEFT: ReadonlyArray<readonly [number, number]> = Object.freeze([
        [0, 8],
        [1, 8],
        [2, 8],
        [3, 8],
        [4, 8],
        [5, 8],
        [7, 8],
        [8, 8],
        [8, 7],
        [8, 5],
        [8, 4],
        [8, 3],
        [8, 2],
        [8, 1],
        [8, 0],
    ]);

    private static computeReedSolomon(
        data: Uint8Array,
        dataOffset: number,
        dataLen: number,
        eccLen: number,
        outEcc: Uint8Array,
        outEccOffset: number
    ): void {
        const gen = QREncoder.GENERATOR_POLYS[eccLen];
        const totalLen = dataLen + eccLen;

        for (let i = 0; i < dataLen; ++i) {
            QREncoder._rsMsgBuffer[i] = data[dataOffset + i];
        }

        for (let i = dataLen; i < totalLen; ++i) {
            QREncoder._rsMsgBuffer[i] = 0;
        }

        for (let i = 0; i < dataLen; ++i) {
            const coef = QREncoder._rsMsgBuffer[i];
            if (coef === 0) continue;

            for (let j = 0; j < gen.length; ++j) {
                QREncoder._rsMsgBuffer[i + j] ^= QREncoder.gfMul(gen[j], coef);
            }
        }

        for (let i = 0; i < eccLen; ++i) {
            outEcc[outEccOffset + i] = QREncoder._rsMsgBuffer[dataLen + i];
        }
    }

    private static encodeUtf8(str: string): number {
        let outIdx = 0;
        const max = QREncoder._utf8Buffer.length;

        for (let i = 0; i < str.length; ++i) {
            const code = str.charCodeAt(i);

            if (code < 0x80) {
                if (outIdx >= max) return -1;

                QREncoder._utf8Buffer[outIdx++] = code;
            } else if (code < 0x800) {
                if (outIdx + 1 >= max) return -1;

                QREncoder._utf8Buffer[outIdx++] = 0xc0 | (code >> 6);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | (code & 0x3f);
            } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
                if (outIdx + 3 >= max) return -1;

                const next = str.charCodeAt(++i);
                const codePoint = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);

                QREncoder._utf8Buffer[outIdx++] = 0xf0 | (codePoint >> 18);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | ((codePoint >> 12) & 0x3f);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | ((codePoint >> 6) & 0x3f);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | (codePoint & 0x3f);
            } else {
                if (outIdx + 2 >= max) return -1;

                QREncoder._utf8Buffer[outIdx++] = 0xe0 | (code >> 12);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | ((code >> 6) & 0x3f);
                QREncoder._utf8Buffer[outIdx++] = 0x80 | (code & 0x3f);
            }
        }

        return outIdx;
    }

    /**
     * Converts ECC level enum or string representation to numeric index (0: Low, 1: Medium, 2: Quartile, 3: High).
     * @param ecc - Error correction level enum, string, or number.
     * @returns Numeric index 0..3.
     */
    public static getEccIndex(ecc: QREncoder.ECC | string | number): number {
        if (typeof ecc === 'number') return ecc >= 0 && ecc <= 3 ? ecc : 1;

        if (typeof ecc === 'string') {
            const norm = ecc.toUpperCase();

            if (norm === 'L' || norm === 'LOW') return 0;
            if (norm === 'M' || norm === 'MEDIUM') return 1;
            if (norm === 'Q' || norm === 'QUARTILE') return 2;
            if (norm === 'H' || norm === 'HIGH') return 3;
        }

        return 1;
    }

    /**
     * Calculates the byte length of the polymorphic payload without allocating memory.
     * @param data - Payload data to measure.
     * @returns Encoded byte count or -1 if invalid.
     */
    public static getDataByteLength(data: QREncoder.Payload): number {
        if (typeof data === 'string') {
            let len = 0;

            for (let i = 0; i < data.length; ++i) {
                const code = data.charCodeAt(i);

                if (code < 0x80) {
                    len++;
                } else if (code < 0x800) {
                    len += 2;
                } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < data.length) {
                    i++;
                    len += 4;
                } else {
                    len += 3;
                }
            }

            return len;
        }

        if (data instanceof Uint8Array || Array.isArray(data)) return data.length;

        if (ArrayBuffer.isView(data)) return data.byteLength;

        return -1;
    }

    private static getVersionInfoBits(version: number): number {
        let d = version << 12;

        while (d >= 1 << 12) {
            const shift = 31 - Math.clz32(d) - 12;

            if (shift < 0) break;

            d ^= 0x1f25 << shift;
        }

        return (version << 12) | d;
    }

    private static getFormatInfoBits(eccOrIdx: QREncoder.ECC | string | number, mask: number): number {
        const eccIdx = QREncoder.getEccIndex(eccOrIdx);
        const eccBits = [1, 0, 3, 2][eccIdx];
        const data = (eccBits << 3) | mask;
        let d = data << 10;

        while (d >= 1 << 10) {
            const shift = 31 - Math.clz32(d) - 10;

            if (shift < 0) break;

            d ^= 0x537 << shift;
        }

        return ((data << 10) | d) ^ 0x5412;
    }

    private static getSecondFormatCoord(index: number, size: number): [number, number] {
        return index < 7 ? [size - 1 - index, 8] : [8, size - 15 + index];
    }

    /**
     * Selects the smallest QR version accommodating dataByteLen with eccIdx.
     * @param dataByteLen - Data length in bytes.
     * @param eccIdx - Numeric error correction level index 0..3 or enum.
     * @param maxVersion - Upper version limit (1..40, default: 40).
     * @param logger - Optional logging instance to report capacity errors.
     * @returns Object with version and totalDataCodewords, or null if capacity exceeded.
     */
    public static selectVersion(
        dataByteLen: number,
        eccIdx: number | QREncoder.ECC | string,
        maxVersion: number = QREncoder.MAX_QR_VERSION,
        logger?: QREncoder.LoggerLike
    ): QREncoder.VersionInfo | null {
        const idx = typeof eccIdx === 'number' ? eccIdx : QREncoder.getEccIndex(eccIdx);
        const limit = Math.min(40, Math.max(1, maxVersion));

        for (let v = 1; v <= limit; ++v) {
            const eccConfig = QREncoder.ECC_TABLE[v - 1][idx];
            const dataCapacity = eccConfig[1] * eccConfig[2] + eccConfig[3] * eccConfig[4];

            const charCountBits = v < 10 ? 8 : 16;
            const totalBits = 4 + charCountBits + dataByteLen * 8;
            const totalBytes = Math.ceil(totalBits / 8);

            if (totalBytes > dataCapacity) continue;

            QREncoder._versionResult.version = v;
            QREncoder._versionResult.totalDataCodewords = dataCapacity;

            return QREncoder._versionResult;
        }

        if (logger) {
            logger.log(`Data payload too large for QR code (bytes: ${dataByteLen})`);
        }

        return null;
    }

    private static buildDataBytes(dataLen: number, version: number, totalDataCodewords: number): void {
        const charCountBits = version < 10 ? 8 : 16;
        let bitCount = 0;

        QREncoder._dataCodewordsBuffer.fill(0, 0, totalDataCodewords);

        function pushBits(val: number, len: number): void {
            for (let i = len - 1; i >= 0; --i) {
                const bit = (val >> i) & 1;
                const byteIndex = bitCount >> 3;
                const bitPos = 7 - (bitCount & 7);

                if (bitPos === 7) {
                    QREncoder._dataCodewordsBuffer[byteIndex] = bit << 7;
                } else {
                    QREncoder._dataCodewordsBuffer[byteIndex] |= bit << bitPos;
                }

                bitCount++;
            }
        }

        // Mode indicator (0100 for 8-bit byte mode)
        pushBits(0b0100, 4);
        pushBits(dataLen, charCountBits);

        for (let i = 0; i < dataLen; ++i) {
            pushBits(QREncoder._utf8Buffer[i], 8);
        }

        // Terminator (up to 4 bits)
        const capacityBits = totalDataCodewords * 8;
        const termLen = Math.min(4, capacityBits - bitCount);
        pushBits(0, termLen);

        // Pad to byte boundary
        while (bitCount % 8 !== 0) {
            pushBits(0, 1);
        }

        // Pad bytes (0xEC, 0x11)
        const padBytes = [0xec, 0x11];
        let padIdx = 0;

        while (bitCount < capacityBits) {
            pushBits(padBytes[padIdx], 8);
            padIdx ^= 1;
        }
    }

    private static interleaveBlocks(version: number, eccIdx: number): number {
        const eccConfig = QREncoder.ECC_TABLE[version - 1][eccIdx];
        const eccPerBlock = eccConfig[0];
        const numBlocksG1 = eccConfig[1];
        const dataPerBlockG1 = eccConfig[2];
        const numBlocksG2 = eccConfig[3];
        const dataPerBlockG2 = eccConfig[4];
        const totalBlocks = numBlocksG1 + numBlocksG2;

        let dataOffset = 0;
        let eccOffset = 0;

        function processBlockGroup(startBlockIdx: number, numBlocks: number, dataPerBlock: number): void {
            for (let b = 0; b < numBlocks; ++b) {
                const blockIdx = startBlockIdx + b;
                QREncoder._blockOffsets[blockIdx] = dataOffset;
                QREncoder._blockLens[blockIdx] = dataPerBlock;
                QREncoder._eccBlockOffsets[blockIdx] = eccOffset;

                QREncoder.computeReedSolomon(
                    QREncoder._dataCodewordsBuffer,
                    dataOffset,
                    dataPerBlock,
                    eccPerBlock,
                    QREncoder._eccBytesBuffer,
                    eccOffset
                );

                dataOffset += dataPerBlock;
                eccOffset += eccPerBlock;
            }
        }

        processBlockGroup(0, numBlocksG1, dataPerBlockG1);
        processBlockGroup(numBlocksG1, numBlocksG2, dataPerBlockG2);

        // Interleave data codewords into _interleavedBuffer
        let outIdx = 0;
        const maxDataBlockLen = Math.max(dataPerBlockG1, dataPerBlockG2);

        for (let i = 0; i < maxDataBlockLen; ++i) {
            for (let b = 0; b < totalBlocks; ++b) {
                if (i < QREncoder._blockLens[b]) {
                    QREncoder._interleavedBuffer[outIdx++] =
                        QREncoder._dataCodewordsBuffer[QREncoder._blockOffsets[b] + i];
                }
            }
        }

        // Interleave ECC codewords into _interleavedBuffer
        for (let i = 0; i < eccPerBlock; ++i) {
            for (let b = 0; b < totalBlocks; ++b) {
                QREncoder._interleavedBuffer[outIdx++] = QREncoder._eccBytesBuffer[QREncoder._eccBlockOffsets[b] + i];
            }
        }

        return outIdx;
    }

    private static drawFinder(size: number, r: number, c: number, scratch: Uint8Array): void {
        for (let i = -1; i <= 7; ++i) {
            for (let j = -1; j <= 7; ++j) {
                const nr = r + i;
                const nc = c + j;

                if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

                if (i >= 0 && i <= 6 && j >= 0 && j <= 6) {
                    const isBlack = i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
                    scratch[nr * size + nc] = 1 | (isBlack ? 2 : 0);
                } else {
                    scratch[nr * size + nc] = 1; // Separator
                }
            }
        }
    }

    private static drawFinders(size: number, scratch: Uint8Array): void {
        QREncoder.drawFinder(size, 0, 0, scratch);
        QREncoder.drawFinder(size, 0, size - 7, scratch);
        QREncoder.drawFinder(size, size - 7, 0, scratch);
    }

    private static drawAlignments(size: number, version: number, scratch: Uint8Array): void {
        if (version < 2) return;

        const positions = QREncoder.ALIGNMENT_POSITIONS[version - 1];

        for (let p1 = 0; p1 < positions.length; ++p1) {
            const r = positions[p1];

            for (let p2 = 0; p2 < positions.length; ++p2) {
                const c = positions[p2];

                if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;

                for (let i = -2; i <= 2; ++i) {
                    for (let j = -2; j <= 2; ++j) {
                        const isBlack = Math.max(Math.abs(i), Math.abs(j)) === 2 || (i === 0 && j === 0);
                        scratch[(r + i) * size + (c + j)] = 1 | (isBlack ? 2 : 0);
                    }
                }
            }
        }
    }

    private static drawTimingPatterns(size: number, scratch: Uint8Array): void {
        for (let i = 8; i < size - 8; ++i) {
            scratch[6 * size + i] = 1 | (i % 2 === 0 ? 2 : 0);
            scratch[i * size + 6] = 1 | (i % 2 === 0 ? 2 : 0);
        }

        // Dark module
        scratch[(size - 8) * size + 8] = 1 | 2;
    }

    private static reserveFormatAndVersionInfo(size: number, version: number, scratch: Uint8Array): void {
        for (let i = 0; i <= 8; ++i) {
            scratch[8 * size + i] |= 1;
            scratch[i * size + 8] |= 1;
        }

        for (let i = 0; i < 8; ++i) {
            scratch[8 * size + (size - 1 - i)] |= 1;
        }

        for (let i = 0; i < 7; ++i) {
            scratch[(size - 1 - i) * size + 8] |= 1;
        }

        if (version < 7) return;

        for (let i = 0; i < 6; ++i) {
            for (let j = 0; j < 3; ++j) {
                scratch[i * size + (size - 11 + j)] |= 1;
                scratch[(size - 11 + j) * size + i] |= 1;
            }
        }
    }

    private static placeDataCodewords(size: number, totalCodewords: number, scratch: Uint8Array): void {
        const totalDataBits = totalCodewords * 8;
        let bitIdx = 0;
        let right = size - 1;
        let upward = true;

        while (right > 0) {
            if (right === 6) right--; // Skip vertical timing column

            for (let vert = 0; vert < size; ++vert) {
                const r = upward ? size - 1 - vert : vert;

                for (let colOffset = 0; colOffset < 2; ++colOffset) {
                    const c = right - colOffset;
                    const offset = r * size + c;

                    if ((scratch[offset] & 1) !== 0) continue;

                    let bit = false;

                    if (bitIdx < totalDataBits) {
                        const byte = QREncoder._interleavedBuffer[bitIdx >> 3];
                        const bitPos = 7 - (bitIdx & 7);
                        bit = ((byte >> bitPos) & 1) === 1;
                    }

                    bitIdx++;
                    scratch[offset] = bit ? 2 : 0;
                }
            }

            upward = !upward;
            right -= 2;
        }
    }

    private static isMaskCondition(m: number, r: number, c: number): boolean {
        switch (m) {
            case 0:
                return (r + c) % 2 === 0;
            case 1:
                return r % 2 === 0;
            case 2:
                return c % 3 === 0;
            case 3:
                return (r + c) % 3 === 0;
            case 4:
                return ((r >> 1) + Math.floor(c / 3)) % 2 === 0;
            case 5:
                return ((r * c) % 2) + ((r * c) % 3) === 0;
            case 6:
                return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
            case 7:
                return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
            default:
                return false;
        }
    }

    private static getCellBit(r: number, c: number, m: number, size: number, scratch: Uint8Array): boolean {
        const val = scratch[r * size + c];
        const isDark = (val & 2) !== 0;
        const isFunc = (val & 1) !== 0;

        return isFunc ? isDark : isDark !== QREncoder.isMaskCondition(m, r, c);
    }

    private static calculatePenalty(m: number, size: number, scratch: Uint8Array): number {
        let penalty = 0;

        // Penalty 1: Runs of 5+ same color in rows/columns
        for (let r = 0; r < size; ++r) {
            let rowCount = 0;
            let rowColor = false;
            let colCount = 0;
            let colColor = false;

            for (let c = 0; c < size; ++c) {
                const rColor = QREncoder.getCellBit(r, c, m, size, scratch);

                if (c === 0 || rColor !== rowColor) {
                    rowColor = rColor;
                    rowCount = 1;
                } else {
                    rowCount++;

                    if (rowCount === 5) {
                        penalty += 3;
                    } else if (rowCount > 5) {
                        penalty++;
                    }
                }

                const cColor = QREncoder.getCellBit(c, r, m, size, scratch);

                if (c === 0 || cColor !== colColor) {
                    colColor = cColor;
                    colCount = 1;
                } else {
                    colCount++;

                    if (colCount === 5) {
                        penalty += 3;
                    } else if (colCount > 5) {
                        penalty++;
                    }
                }
            }
        }

        // Penalty 2: 2x2 blocks
        for (let r = 0; r < size - 1; ++r) {
            for (let c = 0; c < size - 1; ++c) {
                const val = QREncoder.getCellBit(r, c, m, size, scratch);

                if (
                    val === QREncoder.getCellBit(r, c + 1, m, size, scratch) &&
                    val === QREncoder.getCellBit(r + 1, c, m, size, scratch) &&
                    val === QREncoder.getCellBit(r + 1, c + 1, m, size, scratch)
                ) {
                    penalty += 3;
                }
            }
        }

        // Penalty 4: Dark module ratio
        let darkCount = 0;

        for (let r = 0; r < size; ++r) {
            for (let c = 0; c < size; ++c) {
                if (QREncoder.getCellBit(r, c, m, size, scratch)) {
                    darkCount++;
                }
            }
        }

        const ratio = (darkCount * 100) / (size * size);
        const step = Math.floor(Math.abs(ratio - 50) / 5);
        penalty += step * 10;

        return penalty;
    }

    private static evaluateBestMask(size: number, eccIdx: number, scratch: Uint8Array): number {
        let bestMask = 0;
        let lowestPenalty = Infinity;

        for (let m = 0; m < 8; ++m) {
            // Apply temporary format info for mask evaluation
            const formatBits = QREncoder.getFormatInfoBits(eccIdx, m);

            for (let i = 0; i < 15; ++i) {
                const bit = ((formatBits >> i) & 1) === 1;
                const [r1, c1] = QREncoder.FORMAT_COORDS_TOP_LEFT[i];
                const [r2, c2] = QREncoder.getSecondFormatCoord(i, size);
                scratch[r1 * size + c1] = 1 | (bit ? 2 : 0);
                scratch[r2 * size + c2] = 1 | (bit ? 2 : 0);
            }

            const penalty = QREncoder.calculatePenalty(m, size, scratch);

            if (penalty < lowestPenalty) {
                lowestPenalty = penalty;
                bestMask = m;
            }
        }

        return bestMask;
    }

    private static applyMask(size: number, mask: number, scratch: Uint8Array): void {
        for (let r = 0; r < size; ++r) {
            const rowOffset = r * size;

            for (let c = 0; c < size; ++c) {
                const offset = rowOffset + c;

                if ((scratch[offset] & 1) === 0 && QREncoder.isMaskCondition(mask, r, c)) {
                    scratch[offset] ^= 2;
                }
            }
        }
    }

    private static writeFormatAndVersionInfo(
        size: number,
        eccIdx: number,
        mask: number,
        version: number,
        scratch: Uint8Array
    ): void {
        const formatBits = QREncoder.getFormatInfoBits(eccIdx, mask);

        for (let i = 0; i < 15; ++i) {
            const bit = ((formatBits >> i) & 1) === 1;
            const [r1, c1] = QREncoder.FORMAT_COORDS_TOP_LEFT[i];
            const [r2, c2] = QREncoder.getSecondFormatCoord(i, size);
            scratch[r1 * size + c1] = 1 | (bit ? 2 : 0);
            scratch[r2 * size + c2] = 1 | (bit ? 2 : 0);
        }

        if (version < 7) return;

        const verBits = QREncoder.getVersionInfoBits(version);

        for (let i = 0; i < 18; ++i) {
            const bit = ((verBits >> i) & 1) === 1;
            const a = Math.floor(i / 3);
            const b = (i % 3) + size - 11;
            scratch[a * size + b] = 1 | (bit ? 2 : 0);
            scratch[b * size + a] = 1 | (bit ? 2 : 0);
        }
    }

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
    public static encodeToBuffer(
        data: QREncoder.Payload,
        eccOrIdx: QREncoder.ECC | string | number,
        scratchBuffer: Uint8Array,
        maxVersion: number = QREncoder.MAX_QR_VERSION,
        logger?: QREncoder.LoggerLike
    ): number {
        if (scratchBuffer == null) return -1;

        if (data == null) {
            if (logger) {
                logger.log('Cannot encode QR code: data is null or undefined');
            }

            return -1;
        }

        let dataLen = 0;

        if (typeof data === 'string') {
            dataLen = QREncoder.encodeUtf8(data);

            if (dataLen < 0) {
                if (logger) {
                    logger.log('Cannot encode QR code: UTF-8 payload exceeds buffer capacity');
                }

                return -1;
            }
        } else if (data instanceof Uint8Array) {
            dataLen = data.length;

            if (dataLen > QREncoder._utf8Buffer.length) return -1;

            for (let i = 0; i < dataLen; ++i) {
                QREncoder._utf8Buffer[i] = data[i];
            }
        } else if (ArrayBuffer.isView(data)) {
            dataLen = data.byteLength;

            if (dataLen > QREncoder._utf8Buffer.length) return -1;

            const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

            for (let i = 0; i < dataLen; ++i) {
                QREncoder._utf8Buffer[i] = view[i];
            }
        } else if (Array.isArray(data)) {
            dataLen = data.length;

            if (dataLen > QREncoder._utf8Buffer.length) return -1;

            for (let i = 0; i < dataLen; ++i) {
                QREncoder._utf8Buffer[i] = data[i];
            }
        } else {
            if (logger) {
                logger.log('Cannot encode QR code: data must be a string, Uint8Array, or number array');
            }

            return -1;
        }

        const eccIdx = QREncoder.getEccIndex(eccOrIdx);
        const versionInfo = QREncoder.selectVersion(dataLen, eccIdx, maxVersion, logger);

        if (!versionInfo || versionInfo.version > maxVersion) return -1;

        const { version, totalDataCodewords } = versionInfo;
        const size = 17 + 4 * version;

        if (scratchBuffer.length < size * size) return -1;

        QREncoder.buildDataBytes(dataLen, version, totalDataCodewords);

        const totalCodewords = QREncoder.interleaveBlocks(version, eccIdx);

        scratchBuffer.fill(0, 0, size * size);

        QREncoder.drawFinders(size, scratchBuffer);
        QREncoder.drawAlignments(size, version, scratchBuffer);
        QREncoder.drawTimingPatterns(size, scratchBuffer);
        QREncoder.reserveFormatAndVersionInfo(size, version, scratchBuffer);
        QREncoder.placeDataCodewords(size, totalCodewords, scratchBuffer);

        const bestMask = QREncoder.evaluateBestMask(size, eccIdx, scratchBuffer);
        QREncoder.applyMask(size, bestMask, scratchBuffer);
        QREncoder.writeFormatAndVersionInfo(size, eccIdx, bestMask, version, scratchBuffer);

        return size;
    }

    /**
     * Encodes a payload (string, Uint8Array, or number array) into a 2D boolean QR code matrix.
     * Returns null if data is invalid or payload exceeds capacity.
     * @param data - The payload data to encode.
     * @param ecc - Error correction level.
     * @param options - Encoding options (maxVersion, scratchBuffer).
     * @returns 2D square boolean matrix, or null on error.
     */
    public static encode(
        data: QREncoder.Payload,
        ecc: QREncoder.ECC | string = QREncoder.ECC.Medium,
        options?: QREncoder.EncodeOptions
    ): boolean[][] | null {
        if (data == null) return null;

        const eccIdx = QREncoder.getEccIndex(ecc);
        const byteLen = QREncoder.getDataByteLength(data);

        if (byteLen < 0) return null;

        const maxVersion = options?.maxVersion ?? QREncoder.MAX_QR_VERSION;
        const versionInfo = QREncoder.selectVersion(byteLen, eccIdx, maxVersion);

        if (!versionInfo || versionInfo.version > maxVersion) return null;

        const size = 17 + 4 * versionInfo.version;
        const minBytes = size * size;
        let scratch = options?.scratchBuffer;

        if (!scratch || scratch.length < minBytes) {
            scratch = new Uint8Array(minBytes);
        }

        const encodedSize = QREncoder.encodeToBuffer(data, eccIdx, scratch, maxVersion);

        if (encodedSize !== size) return null;

        const matrix: boolean[][] = new Array(size);

        for (let r = 0; r < size; ++r) {
            const row = new Array<boolean>(size);
            const rowOffset = r * size;

            for (let c = 0; c < size; ++c) {
                row[c] = (scratch[rowOffset + c] & 2) !== 0;
            }

            matrix[r] = row;
        }

        return matrix;
    }

    /**
     * Renders a payload as an ASCII preview using unicode half-block characters.
     * @param data - The payload data to encode.
     * @param options - ASCII rendering options.
     * @returns Multi-line string or null on error.
     */
    public static encodeToAscii(data: QREncoder.Payload, options?: QREncoder.AsciiOptions): string | null {
        const matrix = QREncoder.encode(data, options?.ecc ?? QREncoder.ECC.Medium, options);

        if (!matrix) return null;

        const margin = Math.max(4, options?.margin ?? 4);
        const invert = options?.invert ?? false;
        const N = matrix.length;
        const totalSize = N + 2 * margin;

        const fullGrid: boolean[][] = Array.from({ length: totalSize }, (_, r) =>
            Array.from({ length: totalSize }, (_, c) => {
                const mr = r - margin;
                const mc = c - margin;

                if (mr >= 0 && mr < N && mc >= 0 && mc < N) return matrix[mr][mc];

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

    /**
     * Calculates the vertical span of unvisited dark cells for greedy rectangle merging.
     * @param scratch - Matrix scratch buffer.
     * @param r - Starting row.
     * @param c - Starting column.
     * @param w - Horizontal width of the span.
     * @param N - Matrix dimension.
     * @returns Vertical height of merged span.
     */
    public static computeVerticalSpan(scratch: Uint8Array, r: number, c: number, w: number, N: number): number {
        let h = 1;

        while (r + h < N) {
            const nextRowOffset = (r + h) * N;
            let hasUnvisited = false;

            for (let k = 0; k < w; ++k) {
                const val = scratch[nextRowOffset + (c + k)];

                if ((val & 2) === 0) return h;

                if ((val & 4) === 0) {
                    hasUnvisited = true;
                }
            }

            if (!hasUnvisited) return h;

            h++;
        }

        return h;
    }

    /**
     * Merges individual dark modules in scratch into optimal rectilinear rectangles.
     * Format: (col << 24) | (row << 16) | (spanW << 8) | spanH.
     * @param scratch - Matrix scratch buffer containing encoded QR bitflags.
     * @param N - Dimension size of the matrix.
     * @param rectBuffer - Output buffer receiving packed 32-bit rectangle descriptors.
     * @returns Number of packed rectangles.
     */
    public static packRectangles(scratch: Uint8Array, N: number, rectBuffer: Uint32Array): number {
        let rectCount = 0;
        const maxRects = rectBuffer.length;

        for (let r = 0; r < N; ++r) {
            const rowOffset = r * N;

            for (let c = 0; c < N; ++c) {
                const val = scratch[rowOffset + c];

                // Must be dark module (bit 1) and not yet visited (bit 2)
                if ((val & 2) === 0 || (val & 4) !== 0) continue;

                // Step 1: Expand Horizontally across unvisited (bit 2 = 0) and previously drawn dark modules
                let w = 1;
                let lastUnvisitedW = 1;

                while (c + w < N) {
                    const nextVal = scratch[rowOffset + (c + w)];

                    if ((nextVal & 2) === 0) break;

                    if ((nextVal & 4) === 0) {
                        lastUnvisitedW = w + 1;
                    }

                    w++;
                }

                // Trim trailing overlap that does not absorb any new unvisited cells
                w = lastUnvisitedW;

                // Step 2: Expand Vertically
                const h = QREncoder.computeVerticalSpan(scratch, r, c, w, N);

                // Step 3: Pack Merged Dark Rectangle into rectBuffer
                if (rectCount < maxRects) {
                    const packed = ((c << 24) | (r << 16) | (w << 8) | h) >>> 0;
                    rectBuffer[rectCount++] = packed;
                }

                // Step 4: Mark w x h region as visited (set bit 2: 4)
                for (let i = 0; i < h; ++i) {
                    const markRowOffset = (r + i) * N;

                    for (let j = 0; j < w; ++j) {
                        scratch[markRowOffset + (c + j)] |= 4;
                    }
                }

                // Advance column cursor past merged block
                c += w - 1;
            }
        }

        return rectCount;
    }
}

export namespace QREncoder {
    /**
     * QR Code Error Correction Levels.
     */
    export enum ECC {
        Low = 'L',
        Medium = 'M',
        Quartile = 'Q',
        High = 'H',
    }

    /**
     * Polymorphic payload data type: UTF-8 string, raw binary byte array, number array, or ArrayBufferView.
     */
    export type Payload = string | Uint8Array | readonly number[] | ArrayBufferView;

    /**
     * 2D Matrix of booleans representing QR module cells.
     */
    export type BooleanMatrix = boolean[][];

    /**
     * Version and capacity result returned by selectVersion.
     */
    export interface VersionInfo {
        version: number;
        totalDataCodewords: number;
    }

    /**
     * Lightweight logger interface to avoid circular dependencies.
     */
    export interface LoggerLike {
        log(message: string, level?: number): void;
    }

    /**
     * Options for QR encoding.
     */
    export interface EncodeOptions {
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
    export interface AsciiOptions extends QREncoder.EncodeOptions {
        /** Quiet zone margin in module units (default: 4, min: 4). */
        margin?: number;
        /** Whether to invert dark/light modules. */
        invert?: boolean;
    }

    /**
     * Standard ISO/IEC 18004 alignment pattern center locations for versions 1 through 40.
     */
    export const ALIGNMENT_POSITIONS: ReadonlyArray<ReadonlyArray<number>> = Object.freeze([
        [], // V1
        [6, 18], // V2
        [6, 22], // V3
        [6, 26], // V4
        [6, 30], // V5
        [6, 34], // V6
        [6, 22, 38], // V7
        [6, 24, 42], // V8
        [6, 26, 46], // V9
        [6, 28, 50], // V10
        [6, 30, 54], // V11
        [6, 32, 58], // V12
        [6, 34, 62], // V13
        [6, 26, 46, 66], // V14
        [6, 26, 48, 70], // V15
        [6, 26, 50, 74], // V16
        [6, 30, 54, 78], // V17
        [6, 30, 56, 82], // V18
        [6, 30, 58, 86], // V19
        [6, 34, 62, 90], // V20
        [6, 28, 50, 72, 94], // V21
        [6, 26, 50, 74, 98], // V22
        [6, 30, 54, 78, 102], // V23
        [6, 28, 54, 80, 106], // V24
        [6, 32, 58, 84, 110], // V25
        [6, 30, 58, 86, 114], // V26
        [6, 34, 62, 90, 118], // V27
        [6, 26, 50, 74, 98, 122], // V28
        [6, 30, 54, 78, 102, 126], // V29
        [6, 26, 52, 78, 104, 130], // V30
        [6, 30, 56, 82, 108, 134], // V31
        [6, 34, 60, 86, 112, 138], // V32
        [6, 30, 58, 86, 114, 142], // V33
        [6, 34, 62, 90, 118, 146], // V34
        [6, 30, 54, 78, 102, 126, 150], // V35
        [6, 24, 50, 76, 102, 128, 154], // V36
        [6, 28, 54, 80, 106, 132, 158], // V37
        [6, 32, 58, 84, 110, 136, 162], // V38
        [6, 26, 54, 82, 110, 138, 166], // V39
        [6, 30, 58, 86, 114, 142, 170], // V40
    ]);
}
