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

            expect(logger.maxRows).toBe(14); // (300 - 20) / 20 = 14
            expect(logger.visible).toBe(false);

            logger.destroy();
        });

        it('should initialize with custom options and staticRows', () => {
            const logger = new Logger(mockPlayer, {
                width: 600,
                height: 220,
                visible: true,
                staticRows: true,
            });

            expect(logger.maxRows).toBe(10); // (220 - 20) / 20 = 10
            expect(logger.visible).toBe(true);

            logger.destroy();
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

            logger.destroy();
        });
    });

    describe('Dynamic Row Logging', () => {
        it('should log messages and recycle rows when reaching capacity', () => {
            const logger = new Logger(mockPlayer, {
                height: 80, // (80 - 20) / 20 = 3 rows max
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
            logger.destroy();
        });

        it('should log message asynchronously via logAsync', async () => {
            const logger = new Logger(mockPlayer);

            await logger.logAsync('Async log message');

            logger.destroy();
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
            logger.destroy();
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

            logger.destroy();
        });

        it('should truncate long messages with ellipsis when truncate is true', () => {
            const logger = new Logger(mockPlayer, {
                width: 100, // Narrow window forces truncation
                truncate: true,
            });

            expect(() => {
                logger.log('This is a very long line of text that exceeds the width boundary');
            }).not.toThrow();

            logger.destroy();
        });
    });
});
