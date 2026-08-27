import { describe, expect, it, vi } from 'vitest';
import { Logging } from '../index.ts';

describe('Logging Module Tests', () => {
    describe('constructor and basic log formatting', () => {
        it('should format message with tag and invoke logger', () => {
            const logging = new Logging('TestTag');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Info);

            logging.log('Hello world', Logging.LogLevel.Info);

            expect(logSpy).toHaveBeenCalledWith('<TestTag> Hello world', undefined);
        });

        it('should default log level to Warning when setLogging is called without logLevel', () => {
            const logging = new Logging('DefaultLevel');
            const logSpy = vi.fn();
            logging.setLogging(logSpy);

            logging.log('Debug msg', Logging.LogLevel.Debug);
            logging.log('Info msg', Logging.LogLevel.Info);
            expect(logSpy).not.toHaveBeenCalled();

            logging.log('Warning msg', Logging.LogLevel.Warning);
            expect(logSpy).toHaveBeenCalledWith('<DefaultLevel> Warning msg', undefined);

            logging.log('Error msg', Logging.LogLevel.Error);
            expect(logSpy).toHaveBeenCalledWith('<DefaultLevel> Error msg', undefined);
        });

        it('should do nothing if no logger is attached', () => {
            const logging = new Logging('NoLogger');
            expect(() => {
                logging.log('Hello', Logging.LogLevel.Error);
            }).not.toThrow();
        });
    });

    describe('willLog', () => {
        it('should return false if no logger is set', () => {
            const logging = new Logging('WillLogTest');
            expect(logging.willLog(Logging.LogLevel.Debug)).toBe(false);
            expect(logging.willLog(Logging.LogLevel.Error)).toBe(false);
        });

        it('should return true only when level is >= configured log level', () => {
            const logging = new Logging('WillLogTest');
            logging.setLogging(() => {}, Logging.LogLevel.Warning);

            expect(logging.willLog(Logging.LogLevel.Debug)).toBe(false);
            expect(logging.willLog(Logging.LogLevel.Info)).toBe(false);
            expect(logging.willLog(Logging.LogLevel.Warning)).toBe(true);
            expect(logging.willLog(Logging.LogLevel.Error)).toBe(true);
        });
    });

    describe('error formatting and includeRawError', () => {
        it('should pass error as second argument to logger function', () => {
            const logging = new Logging('ErrorTest');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            const err = new Error('custom error');
            logging.log('Something failed', Logging.LogLevel.Error, err);

            expect(logSpy).toHaveBeenCalledWith('<ErrorTest> Something failed', err);
        });

        it('should append error string to formatted text when includeRawError is true', () => {
            const logging = new Logging('ErrorTest');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error, true);

            const err = new Error('network timeout');
            logging.log('Request failed', Logging.LogLevel.Error, err);

            expect(logSpy).toHaveBeenCalledWith('<ErrorTest> Request failed - Error: network timeout', err);
        });

        it('should safely format non-Error objects when includeRawError is true', () => {
            const logging = new Logging('ErrorTest');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error, true);

            logging.log('Failure', Logging.LogLevel.Error, { code: 404 });
            expect(logSpy).toHaveBeenCalledWith('<ErrorTest> Failure - Error: [object Object]', { code: 404 });

            logging.log('Failure string', Logging.LogLevel.Error, 'string error');
            expect(logSpy).toHaveBeenCalledWith('<ErrorTest> Failure string - Error: string error', 'string error');
        });

        it('should handle errors with throwing message or toString properties', () => {
            const logging = new Logging('ErrorTest');
            let loggedText = '';
            logging.setLogging(
                (text) => {
                    loggedText = text;
                },
                Logging.LogLevel.Error,
                true
            );

            const throwingError = new Error();
            Object.defineProperty(throwingError, 'message', {
                get() {
                    throw new Error('boom');
                },
            });

            logging.log('Crash', Logging.LogLevel.Error, throwingError);
            expect(loggedText).toBe('<ErrorTest> Crash - Error: Error (message unavailable)');

            const throwingObj = {
                toString() {
                    throw new Error('cannot stringify');
                },
            };
            logging.log('Object crash', Logging.LogLevel.Error, throwingObj);
            expect(loggedText).toBe('<ErrorTest> Object crash - Error: [Error object]');
        });
    });

    describe('error safety during logger execution', () => {
        it('should catch synchronous logger errors and log to console without crashing', () => {
            const logging = new Logging('SyncErr');
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            logging.setLogging(() => {
                throw new Error('sync throw');
            }, Logging.LogLevel.Info);

            expect(() => {
                logging.log('Message', Logging.LogLevel.Info);
            }).not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith('<SyncErr> Error in sync logger:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should catch asynchronous logger promise rejections and log to console', async () => {
            const logging = new Logging('AsyncErr');
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            logging.setLogging(async () => {
                throw new Error('async throw');
            }, Logging.LogLevel.Info);

            logging.log('Message', Logging.LogLevel.Info);

            await Promise.resolve();

            expect(consoleSpy).toHaveBeenCalledWith('<AsyncErr> Error in async logger:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });
});
