import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events, OngoingGlobal, OnPlayerDied, OnPlayerDamaged, OnTimeLimitReached } from '../index.ts';
import { Logging } from '../../logging/index.ts';

describe('Events Module Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        (globalThis as unknown as { mod: Record<string, unknown> }).mod = {
            GetMatchTimeElapsed: () => 100,
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Channel Subscription and Unsubscription', () => {
        it('should subscribe to an event channel and receive triggers', () => {
            const handler = vi.fn();
            const unsubscribe = Events.OngoingGlobal.subscribe(handler);

            expect(Events.OngoingGlobal.handlerCount()).toBe(1);

            Events.OngoingGlobal.trigger();

            expect(handler).toHaveBeenCalledTimes(1);

            unsubscribe();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);

            Events.OngoingGlobal.trigger();
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should support explicit unsubscribe method on channel', () => {
            const handler = vi.fn();
            Events.OnPlayerLeaveGame.subscribe(handler);

            expect(Events.OnPlayerLeaveGame.handlerCount()).toBe(1);

            Events.OnPlayerLeaveGame.trigger(123);
            expect(handler).toHaveBeenCalledWith(123, undefined, undefined, undefined);

            Events.OnPlayerLeaveGame.unsubscribe(handler);
            expect(Events.OnPlayerLeaveGame.handlerCount()).toBe(0);

            Events.OnPlayerLeaveGame.trigger(123);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should support Events.subscribe, Events.unsubscribe, and Events.trigger static methods', () => {
            const handler = vi.fn();
            const unsub = Events.subscribe(Events.Type.OnGameModeStarted, handler);

            expect(Events.handlerCount(Events.Type.OnGameModeStarted)).toBe(1);

            Events.trigger(Events.Type.OnGameModeStarted);
            expect(handler).toHaveBeenCalledTimes(1);

            unsub();
            expect(Events.handlerCount(Events.Type.OnGameModeStarted)).toBe(0);
        });

        it('should handle unsubscription when handler was not registered or list is null', () => {
            const handler = vi.fn();
            expect(() => {
                Events.OnBombDropped.unsubscribe(handler);
            }).not.toThrow();
        });

        it('should not skip subsequent handlers when a handler unsubscribes during trigger execution', () => {
            const executionOrder: string[] = [];

            const handler1 = vi.fn(() => {
                executionOrder.push('h1');
                Events.OngoingGlobal.unsubscribe(handler1);
            });

            const handler2 = vi.fn(() => {
                executionOrder.push('h2');
            });

            const handler3 = vi.fn(() => {
                executionOrder.push('h3');
            });

            Events.OngoingGlobal.subscribe(handler1);
            const unsub2 = Events.OngoingGlobal.subscribe(handler2);
            const unsub3 = Events.OngoingGlobal.subscribe(handler3);

            expect(Events.OngoingGlobal.handlerCount()).toBe(3);

            // First trigger: handler1 unsubscribes itself during execution
            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h1', 'h2', 'h3']);
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
            expect(handler3).toHaveBeenCalledTimes(1);
            expect(Events.OngoingGlobal.handlerCount()).toBe(2);

            // Second trigger: handler1 is no longer called
            executionOrder.length = 0;
            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h2', 'h3']);
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(2);
            expect(handler3).toHaveBeenCalledTimes(2);

            unsub2();
            unsub3();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });

        it('should handle multiple handlers unsubscribing during the same trigger execution', () => {
            const executionOrder: string[] = [];

            const handler1 = vi.fn(() => {
                executionOrder.push('h1');
                Events.OngoingGlobal.unsubscribe(handler1);
            });

            const handler2 = vi.fn(() => {
                executionOrder.push('h2');
                Events.OngoingGlobal.unsubscribe(handler2);
            });

            const handler3 = vi.fn(() => {
                executionOrder.push('h3');
            });

            Events.OngoingGlobal.subscribe(handler1);
            Events.OngoingGlobal.subscribe(handler2);
            const unsub3 = Events.OngoingGlobal.subscribe(handler3);

            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h1', 'h2', 'h3']);
            expect(Events.OngoingGlobal.handlerCount()).toBe(1);

            executionOrder.length = 0;
            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h3']);

            unsub3();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });

        it('should not execute handlers subscribed during trigger execution until next trigger', () => {
            const executionOrder: string[] = [];

            let unsub2: (() => void) | undefined;
            const handler2 = vi.fn(() => {
                executionOrder.push('h2');
            });

            const handler1 = vi.fn(() => {
                executionOrder.push('h1');
                if (!unsub2) {
                    unsub2 = Events.OngoingGlobal.subscribe(handler2);
                }
            });

            const unsub1 = Events.OngoingGlobal.subscribe(handler1);

            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h1']);
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).not.toHaveBeenCalled();
            expect(Events.OngoingGlobal.handlerCount()).toBe(2);

            executionOrder.length = 0;
            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['h1', 'h2']);
            expect(handler1).toHaveBeenCalledTimes(2);
            expect(handler2).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2?.();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });
    });

    describe('Payload and Parameter Delivery', () => {
        it('should deliver up to 4 arguments accurately to handlers', () => {
            const handler = vi.fn();
            const unsub = Events.OnPlayerDamaged.subscribe(handler);

            const victim = { id: 1 } as unknown as mod.Player;
            const attacker = { id: 2 } as unknown as mod.Player;
            const damageType = 3 as unknown as mod.DamageType;
            const weapon = 4 as unknown as mod.WeaponUnlock;

            Events.OnPlayerDamaged.trigger(victim, attacker, damageType, weapon);

            expect(handler).toHaveBeenCalledWith(victim, attacker, damageType, weapon);

            unsub();
        });

        it('should deliver strongly-typed single argument to OnPlayerLeaveGame channel handlers', () => {
            let receivedId: number | null = null;
            const unsub = Events.OnPlayerLeaveGame.subscribe((playerId: number) => {
                receivedId = playerId;
            });

            Events.OnPlayerLeaveGame.trigger(42);
            expect(receivedId).toBe(42);

            unsub();
        });
    });

    describe('Handler Isolation and Error Handling', () => {
        it('should continue executing remaining handlers if one handler throws', () => {
            const failingHandler = vi.fn(() => {
                throw new Error('Handler failure');
            });
            const succeedingHandler = vi.fn();

            const unsub1 = Events.OngoingGlobal.subscribe(failingHandler);
            const unsub2 = Events.OngoingGlobal.subscribe(succeedingHandler);

            expect(() => {
                Events.OngoingGlobal.trigger();
            }).not.toThrow();

            expect(failingHandler).toHaveBeenCalledTimes(1);
            expect(succeedingHandler).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2();
        });

        it('should log incomplete triggers when incompleteTriggers is detected', () => {
            const logSpy = vi.fn();
            Events.setLogging(logSpy, Logging.LogLevel.Warning);

            const channel = Events.OngoingPlayer;
            channel.incompleteTriggers = 2; // simulate incomplete trigger counter

            const dummyHandler = vi.fn();
            const unsub = channel.subscribe(dummyHandler);

            channel.trigger({} as unknown as mod.Player);

            // Advance time and trigger OngoingGlobal so Timers.setTimeout callback runs
            vi.advanceTimersByTime(10_000);
            Events.OngoingGlobal.trigger();

            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining('incomplete triggers for OngoingPlayer in last 10000ms'),
                undefined
            );

            unsub();
        });
    });

    describe('Exported Wrapper Functions', () => {
        it('should trigger corresponding event channels through standalone wrappers', () => {
            const globalHandler = vi.fn();
            const unsubGlobal = Events.OngoingGlobal.subscribe(globalHandler);
            OngoingGlobal();
            expect(globalHandler).toHaveBeenCalledTimes(1);
            unsubGlobal();

            const diedHandler = vi.fn();
            const unsubDied = Events.OnPlayerDied.subscribe(diedHandler);
            const p1 = {} as unknown as mod.Player;
            const p2 = {} as unknown as mod.Player;
            OnPlayerDied(p1, p2, 0 as unknown as mod.DeathType, 0 as unknown as mod.WeaponUnlock);
            expect(diedHandler).toHaveBeenCalledWith(p1, p2, 0, 0);
            unsubDied();

            const damageHandler = vi.fn();
            const unsubDamage = Events.OnPlayerDamaged.subscribe(damageHandler);
            OnPlayerDamaged(p1, p2, 0 as unknown as mod.DamageType, 0 as unknown as mod.WeaponUnlock);
            expect(damageHandler).toHaveBeenCalledWith(p1, p2, 0, 0);
            unsubDamage();
        });

        it('should guard OnTimeLimitReached when match time elapsed is 0', () => {
            const handler = vi.fn();
            const unsub = Events.OnTimeLimitReached.subscribe(handler);

            (globalThis as unknown as { mod: Record<string, unknown> }).mod.GetMatchTimeElapsed = () => 0;

            OnTimeLimitReached();
            expect(handler).not.toHaveBeenCalled();

            (globalThis as unknown as { mod: Record<string, unknown> }).mod.GetMatchTimeElapsed = () => 500;

            OnTimeLimitReached();
            expect(handler).toHaveBeenCalledTimes(1);

            unsub();
        });
    });
});
