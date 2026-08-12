import { describe, expect, it, vi } from 'vitest';
import { Benchmarker } from '../index.ts';

describe('Benchmarker Module Tests', () => {
    describe('run', () => {
        it('should execute synchronous function the specified number of iterations and return elapsed time', () => {
            let count = 0;
            const fn = vi.fn(() => {
                count++;
            });

            const elapsed = Benchmarker.run(fn, 5);

            expect(fn).toHaveBeenCalledTimes(5);
            expect(count).toBe(5);
            expect(typeof elapsed).toBe('number');
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });

        it('should default iterations to 1', () => {
            const fn = vi.fn();
            Benchmarker.run(fn);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('runAsync', () => {
        it('should execute asynchronous function the specified number of iterations and return elapsed time', async () => {
            let count = 0;
            const fn = vi.fn(async () => {
                count++;
                await Promise.resolve();
            });

            const elapsed = await Benchmarker.runAsync(fn, 3);

            expect(fn).toHaveBeenCalledTimes(3);
            expect(count).toBe(3);
            expect(typeof elapsed).toBe('number');
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });

        it('should default iterations to 1 for async', async () => {
            const fn = vi.fn(async () => {});
            await Benchmarker.runAsync(fn);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('findMaxIterations', () => {
        it('should run batches until targetMs time budget is reached', () => {
            let calls = 0;
            const fn = vi.fn(() => {
                calls++;
            });

            let currentTime = 1000;
            const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
                currentTime += 2;
                return currentTime;
            });

            const total = Benchmarker.findMaxIterations(fn, 10, 5);

            dateSpy.mockRestore();

            expect(total).toBeGreaterThan(0);
            expect(calls).toBe(total);
            expect(total % 5).toBe(0);
        });

        it('should use default targetMs and batchSize', () => {
            let calls = 0;
            const fn = () => {
                calls++;
            };

            const total = Benchmarker.findMaxIterations(fn, 5, 10);
            expect(total).toBeGreaterThan(0);
            expect(calls).toBe(total);
        });
    });

    describe('findMaxIterationsAsync', () => {
        it('should run async batches until targetMs time budget is reached', async () => {
            let calls = 0;
            const fn = vi.fn(async () => {
                calls++;
                await Promise.resolve();
            });

            let currentTime = 1000;
            const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
                currentTime += 5;
                return currentTime;
            });

            const total = await Benchmarker.findMaxIterationsAsync(fn, 15, 2);

            dateSpy.mockRestore();

            expect(total).toBeGreaterThan(0);
            expect(calls).toBe(total);
            expect(total % 2).toBe(0);
        });
    });
});
