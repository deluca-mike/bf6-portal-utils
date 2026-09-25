import { describe, expect, it, vi } from 'vitest';
import { CallbackHandler } from '../index.ts';
import { Logging } from '../../logging/index.ts';

describe('CallbackHandler Module Tests', () => {
    describe('invoke', () => {
        it('should format sync error message with named callback and no context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            function namedCallback() {
                throw new Error('sync failure');
            }

            CallbackHandler.invoke(namedCallback, undefined, undefined, undefined, undefined, logging);

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in sync namedCallback callback:', expect.any(Error));
        });

        it('should format sync error message with named callback and context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            function namedCallback() {
                throw new Error('sync failure');
            }

            CallbackHandler.invoke(
                namedCallback,
                undefined,
                undefined,
                undefined,
                undefined,
                logging,
                'MyModule.onEvent'
            );

            expect(logSpy).toHaveBeenCalledWith(
                '<Test> Error in MyModule.onEvent sync namedCallback callback:',
                expect.any(Error)
            );
        });

        it('should format sync error message with anonymous callback and no context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invoke(
                () => {
                    throw new Error('sync failure');
                },
                undefined,
                undefined,
                undefined,
                undefined,
                logging
            );

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in sync anonymous callback:', expect.any(Error));
        });

        it('should format sync error message with anonymous callback and context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invoke(
                () => {
                    throw new Error('sync failure');
                },
                undefined,
                undefined,
                undefined,
                undefined,
                logging,
                'customContext'
            );

            expect(logSpy).toHaveBeenCalledWith(
                '<Test> Error in customContext sync anonymous callback:',
                expect.any(Error)
            );
        });

        it('should format async error message with anonymous callback and no context', async () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invoke(
                async () => {
                    throw new Error('async failure');
                },
                undefined,
                undefined,
                undefined,
                undefined,
                logging
            );

            await Promise.resolve();

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in async anonymous callback:', expect.any(Error));
        });

        it('should format async error message with anonymous callback and context', async () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invoke(
                async () => {
                    throw new Error('async failure');
                },
                undefined,
                undefined,
                undefined,
                undefined,
                logging,
                'customContext'
            );

            await Promise.resolve();

            expect(logSpy).toHaveBeenCalledWith(
                '<Test> Error in customContext async anonymous callback:',
                expect.any(Error)
            );
        });

        it('should format async error message with named callback and no context', async () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            async function asyncNamedCallback() {
                throw new Error('async failure');
            }

            CallbackHandler.invoke(asyncNamedCallback, undefined, undefined, undefined, undefined, logging);

            await Promise.resolve();

            expect(logSpy).toHaveBeenCalledWith(
                '<Test> Error in async asyncNamedCallback callback:',
                expect.any(Error)
            );
        });

        it('should format async error message with named callback and context', async () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            async function asyncNamedCallback() {
                throw new Error('async failure');
            }

            CallbackHandler.invoke(
                asyncNamedCallback,
                undefined,
                undefined,
                undefined,
                undefined,
                logging,
                'customContext'
            );

            await Promise.resolve();

            expect(logSpy).toHaveBeenCalledWith(
                '<Test> Error in customContext async asyncNamedCallback callback:',
                expect.any(Error)
            );
        });

        it('should safely pass up to 4 arguments directly to the callback', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            const receivedArgs: unknown[] = [];
            const directFn = (a: number, b: string, c: boolean, d: object) => {
                receivedArgs.push(a, b, c, d);
            };

            const objArg = { id: 1 };
            CallbackHandler.invoke(directFn, 10, 'portal', true, objArg, logging);

            expect(receivedArgs).toEqual([10, 'portal', true, objArg]);
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('should do nothing when callback is null or undefined', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invoke(null, 1, 2, 3, 4, logging);
            CallbackHandler.invoke(undefined, 1, 2, 3, 4, logging);

            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('invokeNoArgs', () => {
        it('should safely invoke no-arg callback without context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invokeNoArgs(() => {
                throw new Error('noArgs failure');
            }, logging);

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in sync anonymous callback:', expect.any(Error));
        });

        it('should safely invoke no-arg callback with context', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invokeNoArgs(
                () => {
                    throw new Error('noArgs failure');
                },
                logging,
                'tick'
            );

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in tick sync anonymous callback:', expect.any(Error));
        });

        it('should handle async errors in no-arg callback', async () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invokeNoArgs(async () => {
                throw new Error('async noArgs failure');
            }, logging);

            await Promise.resolve();

            expect(logSpy).toHaveBeenCalledWith('<Test> Error in async anonymous callback:', expect.any(Error));
        });

        it('should do nothing when callback is null or undefined', () => {
            const logging = new Logging('Test');
            const logSpy = vi.fn();
            logging.setLogging(logSpy, Logging.LogLevel.Error);

            CallbackHandler.invokeNoArgs(null, logging);
            CallbackHandler.invokeNoArgs(undefined, logging);

            expect(logSpy).not.toHaveBeenCalled();
        });
    });
});
