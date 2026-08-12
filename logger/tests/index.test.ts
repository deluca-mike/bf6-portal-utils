import './mockMod.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetMockState } from '../../ui/tests/mockMod.ts';
import { Logger } from '../index.ts';

describe('Logger Module Tests', () => {
    const mockPlayer = { _id: 1 } as unknown as mod.Player;

    beforeEach(() => {
        resetMockState();
    });

    describe('Constructor and Dimensions', () => {
        it('should initialize with default options and calculate maxRows correctly', () => {
            const logger = new Logger(mockPlayer);

            expect(logger.maxRows).toBe(12); // (304 - 16) / 24 = 12
            expect(logger.visible).toBe(false);

            logger.delete();
        });

        it('should initialize with custom options and staticRows', () => {
            const logger = new Logger(mockPlayer, {
                width: 600,
                height: 220,
                visible: true,
                staticRows: true,
            });

            expect(logger.maxRows).toBe(8); // ~~((220 - 16) / 24) = 8
            expect(logger.visible).toBe(true);

            logger.delete();
        });
    });

    describe('Visibility Controls', () => {
        it('should show, hide, and toggle visibility', () => {
            const logger = new Logger(mockPlayer);

            expect(logger.visible).toBe(false);

            logger.show();
            expect(logger.visible).toBe(true);

            logger.hide();
            expect(logger.visible).toBe(false);

            logger.toggle();
            expect(logger.visible).toBe(true);

            logger.toggle();
            expect(logger.visible).toBe(false);

            logger.visible = true;
            expect(logger.visible).toBe(true);

            logger.delete();
        });
    });

    describe('Dynamic Row Logging', () => {
        it('should log messages and recycle rows when reaching capacity', () => {
            const logger = new Logger(mockPlayer, {
                height: 88, // (88 - 16) / 24 = 3 rows max
            });

            expect(logger.maxRows).toBe(3);

            logger.log('Message 1');
            logger.log('Message 2');
            logger.log('Message 3');

            // Log 4th message - should recycle top row to bottom
            expect(() => {
                logger.log('Message 4');
            }).not.toThrow();

            logger.clear();
            logger.delete();
        });

        it('should log message asynchronously via logAsync', async () => {
            const logger = new Logger(mockPlayer);

            await logger.logAsync('Async log message');

            logger.delete();
        });
    });

    describe('Static Row Logging', () => {
        it('should log to specific row indices when staticRows is true', () => {
            const logger = new Logger(mockPlayer, {
                height: 100, // 4 max rows: indices 0..3
                staticRows: true,
            });

            logger.log('Row 0 text', 0);
            logger.log('Row 2 text', 2);

            // Out of bounds row index should be ignored safely
            expect(() => {
                logger.log('Invalid row', 99);
                logger.log('Negative row', -1);
            }).not.toThrow();

            logger.clear();
            logger.delete();
        });
    });

    describe('Text Formatting and Truncation', () => {
        it('should format message parts with spaces and special characters', () => {
            const logger = new Logger(mockPlayer, {
                width: 500,
            });

            expect(() => {
                logger.log('Player: 100 HP | Score: 42');
            }).not.toThrow();

            logger.delete();
        });

        it('should truncate long messages with ellipsis when truncate is true', () => {
            const logger = new Logger(mockPlayer, {
                width: 100, // Narrow window forces truncation
                truncate: true,
            });

            expect(() => {
                logger.log('This is a very long line of text that exceeds the width boundary');
            }).not.toThrow();

            logger.delete();
        });
    });

    describe('Censored Characters and 2-Character Pairs', () => {
        it('should expose CENSORED_CHARS and SAFE_CENSORED_PAIRS as static properties on Logger', () => {
            expect(Logger.CENSORED_CHARS).toEqual(['f', 'F']);
            expect(Logger.SAFE_CENSORED_PAIRS).toEqual([')', '/', ':', '=', '{', '|', '}']);
        });

        it('should verify strings.json does not contain standalone censored chars, format templates, or unsafe pairs', () => {
            const loggerStrings = mod.stringkeys.logger as {
                chars: Record<string, string>;
                format: Record<string, string>;
            };
            expect(loggerStrings.chars['f']).toBeUndefined();
            expect(loggerStrings.chars['F']).toBeUndefined();
            expect(loggerStrings.format['f2']).toBeUndefined();
            expect(loggerStrings.format['f3']).toBeUndefined();
            expect(loggerStrings.format['f4']).toBeUndefined();
            expect(loggerStrings.format['F2']).toBeUndefined();
            expect(loggerStrings.format['F3']).toBeUndefined();
            expect(loggerStrings.format['F4']).toBeUndefined();

            // Unsafe pairs must not exist
            expect(loggerStrings.chars['fa']).toBeUndefined();
            expect(loggerStrings.chars['f ']).toBeUndefined();
            expect(loggerStrings.chars['f.']).toBeUndefined();
            expect(loggerStrings.chars['Fa']).toBeUndefined();
            expect(loggerStrings.chars['F ']).toBeUndefined();
            expect(loggerStrings.chars['F.']).toBeUndefined();

            // Safe pairs must exist
            expect(loggerStrings.chars['ff']).toBe('ff');
            expect(loggerStrings.chars['f=']).toBe('f=');
            expect(loggerStrings.chars['f:']).toBe('f:');
            expect(loggerStrings.chars['f/']).toBe('f/');
            expect(loggerStrings.chars['f)']).toBe('f)');
            expect(loggerStrings.chars['f{']).toBe('f{');
            expect(loggerStrings.chars['f|']).toBe('f|');
            expect(loggerStrings.chars['f}']).toBe('f}');
            expect(loggerStrings.chars['FF']).toBe('FF');
            expect(loggerStrings.chars['F=']).toBe('F=');
            expect(loggerStrings.chars['F:']).toBe('F:');
            expect(loggerStrings.chars['F/']).toBe('F/');
            expect(loggerStrings.chars['F)']).toBe('F)');
            expect(loggerStrings.chars['F{']).toBe('F{');
            expect(loggerStrings.chars['F|']).toBe('F|');
            expect(loggerStrings.chars['F}']).toBe('F}');
        });

        it('should tokenize text containing censored characters using hybrid safe pairs and doubling', () => {
            const getParts = (Logger as unknown as { _getParts: (text: string) => string[] })._getParts;

            expect(getParts('hello')).toEqual(['hell', 'o']);
            expect(getParts('hello world')).toEqual(['hell', 'o', ' ', 'worl', 'd']);

            // Doubling fallback for standard occurrences
            expect(getParts('fast')).toEqual(['ff', 'ast']);
            expect(getParts('foo')).toEqual(['ff', 'oo']);
            expect(getParts('leaf')).toEqual(['lea', 'ff']);
            expect(getParts('f')).toEqual(['ff']);
            expect(getParts('F')).toEqual(['FF']);
            expect(getParts('Press F')).toEqual(['Pres', 's', ' ', 'FF']);
            expect(getParts('Ff')).toEqual(['FF', 'ff']);
            expect(getParts('fF')).toEqual(['ff', 'FF']);
            expect(getParts('f bar')).toEqual(['ff', ' ', 'bar']);

            // Natural double f preservation
            expect(getParts('off')).toEqual(['o', 'ff']);
            expect(getParts('buffer')).toEqual(['bu', 'ff', 'er']);
            expect(getParts('ffff')).toEqual(['ff', 'ff']);
            expect(getParts('fff')).toEqual(['ff', 'ff']);

            // Natural safe punctuation pairs
            expect(getParts('f=10')).toEqual(['f=', '10']);
            expect(getParts('f/s')).toEqual(['f/', 's']);
            expect(getParts('f: true')).toEqual(['f:', ' ', 'true']);
            expect(getParts('bar(f)')).toEqual(['bar(', 'f)']);
            expect(getParts('foo(f)')).toEqual(['ff', 'oo(', 'f)']);
            expect(getParts('F=5')).toEqual(['F=', '5']);
            expect(getParts('F: 42')).toEqual(['F:', ' ', '42']);
        });

        it('should build messages with direct 2-char pairs for censored prefixes and standard format for non-censored', () => {
            const buildMessage = (Logger as unknown as { _buildMessage: (part: string) => mod.Message })._buildMessage;

            // Censored 2-char pairs (no format template, no args)
            expect(buildMessage('ff')).toEqual({ content: 'ff', args: [] });
            expect(buildMessage('f=')).toEqual({ content: 'f=', args: [] });
            expect(buildMessage('f:')).toEqual({ content: 'f:', args: [] });
            expect(buildMessage('f/')).toEqual({ content: 'f/', args: [] });
            expect(buildMessage('FF')).toEqual({ content: 'FF', args: [] });
            expect(buildMessage('F=')).toEqual({ content: 'F=', args: [] });

            // Non-censored parts
            expect(buildMessage('a')).toEqual({ content: 'a', args: [] });
            expect(buildMessage('ab')).toEqual({ content: 'a{}', args: ['b'] });
            expect(buildMessage('abc')).toEqual({ content: 'a{}{}', args: ['b', 'c'] });
            expect(buildMessage('abcd')).toEqual({ content: 'a{}{}{}', args: ['b', 'c', 'd'] });
        });

        it('should log complex strings with censored words without errors in static and dynamic modes', () => {
            const staticLogger = new Logger(mockPlayer, { staticRows: true });
            const dynamicLogger = new Logger(mockPlayer);

            const testMessages = [
                'press f to pay respects',
                'Fast and Furious: Final Frontier',
                'off-by-one buffer overflow in function foo(x)',
                'ffff fff ff f FFFF FFF FF F',
                'leaf floating on water',
            ];

            for (const msg of testMessages) {
                expect(() => staticLogger.log(msg, 0)).not.toThrow();
                expect(() => dynamicLogger.log(msg)).not.toThrow();
            }

            staticLogger.delete();
            dynamicLogger.delete();
        });
    });

    describe('Exotic Characters Support', () => {
        it('should expose EXOTIC_CHARS as static property on Logger', () => {
            expect(Logger.EXOTIC_CHARS).toBeDefined();
            expect(Logger.EXOTIC_CHARS.length).toBeGreaterThan(0);
            expect(Logger.EXOTIC_CHARS).toContain('©');
            expect(Logger.EXOTIC_CHARS).toContain('®');
            expect(Logger.EXOTIC_CHARS).toContain('™');
            expect(Logger.EXOTIC_CHARS).toContain('π');
            expect(Logger.EXOTIC_CHARS).toContain('Ω');
            expect(Logger.EXOTIC_CHARS).toContain('°');
        });

        it('should verify strings.json contains exotic characters in chars and not in format', () => {
            const loggerStrings = mod.stringkeys.logger as {
                chars: Record<string, string>;
                format: Record<string, string>;
            };

            for (const exoticChar of Logger.EXOTIC_CHARS) {
                expect(loggerStrings.chars[exoticChar]).toBe(exoticChar);
                expect(loggerStrings.format[`${exoticChar}2`]).toBeUndefined();
                expect(loggerStrings.format[`${exoticChar}3`]).toBeUndefined();
                expect(loggerStrings.format[`${exoticChar}4`]).toBeUndefined();
            }
        });

        it('should tokenize exotic characters as standalone chunks or 2nd, 3rd, 4th in a chunk', () => {
            const getParts = (Logger as unknown as { _getParts: (text: string) => string[] })._getParts;

            // Standalone when at start of chunk
            expect(getParts('©')).toEqual(['©']);
            expect(getParts('©®™')).toEqual(['©', '®', '™']);
            expect(getParts('©2026')).toEqual(['©', '2026']);
            expect(getParts('hello © world')).toEqual(['hell', 'o', ' ', '©', ' ', 'worl', 'd']);

            // 2nd, 3rd, 4th character in a chunk starting with non-exotic
            expect(getParts('a©')).toEqual(['a©']);
            expect(getParts('ab©')).toEqual(['ab©']);
            expect(getParts('abc©')).toEqual(['abc©']);
            expect(getParts('abcd©')).toEqual(['abcd', '©']);
            expect(getParts('a©b©')).toEqual(['a©b©']);

            // Real-world examples
            expect(getParts('Temp: 25°C')).toEqual(['Temp', ':', ' ', '25°C']);
            expect(getParts('E=mc²')).toEqual(['E=mc', '²']);
            expect(getParts('π ≈ 3.14')).toEqual(['π', ' ', '≈', ' ', '3.14']);

            // Interaction with censored characters
            expect(getParts('f°')).toEqual(['ff', '°']);
            expect(getParts('°f')).toEqual(['°', 'ff']);
        });

        it('should build messages with exotic characters as standalone or args', () => {
            const buildMessage = (Logger as unknown as { _buildMessage: (part: string) => mod.Message })._buildMessage;

            // Standalone exotic character (length 1)
            expect(buildMessage('©')).toEqual({ content: '©', args: [] });
            expect(buildMessage('°')).toEqual({ content: '°', args: [] });

            // Exotic character as 2nd, 3rd, 4th arg in format template
            expect(buildMessage('a©')).toEqual({ content: 'a{}', args: ['©'] });
            expect(buildMessage('ab©')).toEqual({ content: 'a{}{}', args: ['b', '©'] });
            expect(buildMessage('abc©')).toEqual({ content: 'a{}{}{}', args: ['b', 'c', '©'] });
        });

        it('should calculate widths for non-ASCII exotic characters correctly based on setWidths', () => {
            const logger = new Logger(mockPlayer);
            const getTextWidth = (logger as unknown as { _getTextWidth: (part: string) => number })._getTextWidth.bind(
                logger
            );

            expect(getTextWidth('●')).toBe(20); // 200 tenths
            expect(getTextWidth('‰')).toBe(22.5); // 225 tenths
            expect(getTextWidth('–')).toBe(11.5); // 115 tenths
            expect(getTextWidth('—')).toBe(15.5); // 155 tenths
            expect(getTextWidth('¿')).toBe(11.5); // 115 tenths
            expect(getTextWidth('©')).toBe(13); // 130 tenths
            expect(getTextWidth('°')).toBe(7); // 70 tenths
            expect(getTextWidth('²')).toBe(6); // 60 tenths
            expect(getTextWidth('‘')).toBe(4); // 40 tenths

            // Combined ASCII and non-ASCII string: '2' (9.5) + '5' (9.5) + '°' (7.0) + 'C' (10.5) = 36.5
            expect(getTextWidth('25°C')).toBe(36.5);

            logger.delete();
        });

        it('should log messages containing exotic characters in static and dynamic modes without throwing', () => {
            const staticLogger = new Logger(mockPlayer, { staticRows: true });
            const dynamicLogger = new Logger(mockPlayer);

            const testMessages = [
                '© 2026 Battlefield Portal Utils™',
                'Temperature: 25°C ± 0.5°C',
                'Formula: E = mc² | π ≈ 3.14159',
                'Resistance: 100 Ω | Current: 5 µA',
                'Special bullets: • Bullet 1 • Bullet 2 — em dash',
            ];

            for (const msg of testMessages) {
                expect(() => staticLogger.log(msg, 0)).not.toThrow();
                expect(() => dynamicLogger.log(msg)).not.toThrow();
            }

            staticLogger.delete();
            dynamicLogger.delete();
        });
    });
});
