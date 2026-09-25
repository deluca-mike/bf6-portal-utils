import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    Events,
    EventPriority,
    OngoingGlobal,
    OnTickStart,
    OnTickEnd,
    OnPlayerDied,
    OnPlayerDamaged,
    OnTimeLimitReached,
} from '../index.ts';
import { Logging } from '../../logging/index.ts';

describe('Events Module Tests', () => {
    const tickEndResolvers: Array<() => void> = [];

    function resolveNextTickEnd(): void {
        const next = tickEndResolvers.shift();
        if (next) next();
    }

    beforeEach(() => {
        vi.useFakeTimers();
        tickEndResolvers.length = 0;
        (globalThis as unknown as { mod: Record<string, unknown> }).mod = {
            GetMatchTimeElapsed: () => 100,
            Wait: vi.fn().mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        tickEndResolvers.push(resolve);
                    })
            ),
        };
    });

    afterEach(async () => {
        while (tickEndResolvers.length > 0) {
            tickEndResolvers.shift()!();
        }
        await Promise.resolve();
        vi.useRealTimers();
    });

    describe('EventPriority', () => {
        it('should define standard priority constants', () => {
            expect(EventPriority.First).toBe(-100);
            expect(EventPriority.Normal).toBe(0);
            expect(EventPriority.Last).toBe(100);
            expect(Events.EventPriority).toBe(EventPriority);
        });

        it('should execute handlers in order of priority (First -> Normal -> Last)', () => {
            const executionOrder: string[] = [];

            const firstHandler = vi.fn(() => executionOrder.push('first'));
            const normalHandler = vi.fn(() => executionOrder.push('normal'));
            const lastHandler = vi.fn(() => executionOrder.push('last'));

            // Subscribe out of order
            const unsubLast = Events.OngoingGlobal.subscribe(lastHandler, EventPriority.Last);
            const unsubFirst = Events.OngoingGlobal.subscribe(firstHandler, EventPriority.First);
            const unsubNormal = Events.OngoingGlobal.subscribe(normalHandler, EventPriority.Normal);

            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['first', 'normal', 'last']);

            unsubFirst();
            unsubNormal();
            unsubLast();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });

        it('should maintain stable FIFO order for handlers with the same priority', () => {
            const executionOrder: string[] = [];

            const hFirst1 = vi.fn(() => executionOrder.push('first1'));
            const hFirst2 = vi.fn(() => executionOrder.push('first2'));
            const hNormal1 = vi.fn(() => executionOrder.push('normal1'));
            const hNormal2 = vi.fn(() => executionOrder.push('normal2'));
            const hLast1 = vi.fn(() => executionOrder.push('last1'));
            const hLast2 = vi.fn(() => executionOrder.push('last2'));

            // Interleaved subscriptions with same priorities
            const unsubNormal1 = Events.OngoingGlobal.subscribe(hNormal1, EventPriority.Normal);
            const unsubFirst1 = Events.OngoingGlobal.subscribe(hFirst1, EventPriority.First);
            const unsubLast1 = Events.OngoingGlobal.subscribe(hLast1, EventPriority.Last);
            const unsubNormal2 = Events.OngoingGlobal.subscribe(hNormal2, EventPriority.Normal);
            const unsubFirst2 = Events.OngoingGlobal.subscribe(hFirst2, EventPriority.First);
            const unsubLast2 = Events.OngoingGlobal.subscribe(hLast2, EventPriority.Last);

            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['first1', 'first2', 'normal1', 'normal2', 'last1', 'last2']);

            unsubFirst1();
            unsubFirst2();
            unsubNormal1();
            unsubNormal2();
            unsubLast1();
            unsubLast2();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });

        it('should support custom numeric priorities', () => {
            const executionOrder: string[] = [];

            const hEarly = vi.fn(() => executionOrder.push('-200'));
            const hPreNormal = vi.fn(() => executionOrder.push('-10'));
            const hDefault = vi.fn(() => executionOrder.push('default_0'));
            const hPostNormal = vi.fn(() => executionOrder.push('50'));
            const hSuperLate = vi.fn(() => executionOrder.push('999'));

            const unsub50 = Events.OngoingGlobal.subscribe(hPostNormal, 50);
            const unsubEarly = Events.OngoingGlobal.subscribe(hEarly, -200);
            const unsubDefault = Events.OngoingGlobal.subscribe(hDefault); // default is Normal (0)
            const unsubLate = Events.OngoingGlobal.subscribe(hSuperLate, 999);
            const unsubPre = Events.OngoingGlobal.subscribe(hPreNormal, -10);

            Events.OngoingGlobal.trigger();

            expect(executionOrder).toEqual(['-200', '-10', 'default_0', '50', '999']);

            unsubEarly();
            unsubPre();
            unsubDefault();
            unsub50();
            unsubLate();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });

        it('should support priority in static Events.subscribe', () => {
            const executionOrder: string[] = [];

            const hFirst = vi.fn(() => executionOrder.push('first'));
            const hNormal = vi.fn(() => executionOrder.push('normal'));
            const hLast = vi.fn(() => executionOrder.push('last'));

            const unsubLast = Events.subscribe(Events.Type.OnGameModeStarted, hLast, EventPriority.Last);
            const unsubFirst = Events.subscribe(Events.Type.OnGameModeStarted, hFirst, EventPriority.First);
            const unsubNormal = Events.subscribe(Events.Type.OnGameModeStarted, hNormal);

            Events.trigger(Events.Type.OnGameModeStarted);

            expect(executionOrder).toEqual(['first', 'normal', 'last']);

            unsubFirst();
            unsubNormal();
            unsubLast();
            expect(Events.handlerCount(Events.Type.OnGameModeStarted)).toBe(0);
        });

        it('should correctly handle dynamic subscribe and unsubscribe at runtime preserving priorities', () => {
            const executionOrder: string[] = [];

            const hNormal = vi.fn(() => executionOrder.push('normal'));
            const hLast = vi.fn(() => executionOrder.push('last'));
            const hFirst = vi.fn(() => executionOrder.push('first'));

            const unsubNormal = Events.OngoingGlobal.subscribe(hNormal, EventPriority.Normal);
            const unsubLast = Events.OngoingGlobal.subscribe(hLast, EventPriority.Last);

            Events.OngoingGlobal.trigger();
            expect(executionOrder).toEqual(['normal', 'last']);

            // Dynamically add a First handler at runtime
            executionOrder.length = 0;
            const unsubFirst = Events.OngoingGlobal.subscribe(hFirst, EventPriority.First);

            Events.OngoingGlobal.trigger();
            expect(executionOrder).toEqual(['first', 'normal', 'last']);

            // Dynamically unsubscribe the middle (normal) handler
            executionOrder.length = 0;
            unsubNormal();

            Events.OngoingGlobal.trigger();
            expect(executionOrder).toEqual(['first', 'last']);

            unsubFirst();
            unsubLast();
            expect(Events.OngoingGlobal.handlerCount()).toBe(0);
        });
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

    describe('OnTickStart and OnTickEnd', () => {
        it('should alias OnTickStart to OngoingGlobal', () => {
            expect(Events.OnTickStart).toBe(Events.OngoingGlobal);

            const initialCount = Events.OngoingGlobal.handlerCount();
            const handler = vi.fn();
            const unsub = Events.OnTickStart.subscribe(handler);

            expect(Events.OngoingGlobal.handlerCount()).toBe(initialCount + 1);
            expect(Events.OnTickStart.handlerCount()).toBe(initialCount + 1);

            OnTickStart();
            expect(handler).toHaveBeenCalledTimes(1);

            unsub();
            expect(Events.OnTickStart.handlerCount()).toBe(initialCount);
        });

        it('should execute OnTickEnd handlers when mod.Wait(0) resolves', async () => {
            const order: string[] = [];
            const hFirst = vi.fn(() => order.push('first'));
            const hNormal = vi.fn(() => order.push('normal'));
            const hLast = vi.fn(() => order.push('last'));

            const unsubLast = Events.OnTickEnd.subscribe(hLast, EventPriority.Last);
            const unsubFirst = Events.OnTickEnd.subscribe(hFirst, EventPriority.First);
            const unsubNormal = Events.OnTickEnd.subscribe(hNormal, EventPriority.Normal);

            // Starting tick
            OngoingGlobal();
            expect(order).toEqual([]);

            // Resolve mod.Wait(0)
            resolveNextTickEnd();
            await Promise.resolve(); // drain microtasks

            expect(order).toEqual(['first', 'normal', 'last']);

            unsubFirst();
            unsubNormal();
            unsubLast();
        });

        it('should isolate errors in OnTickEnd handlers without breaking execution', async () => {
            const failingHandler = vi.fn(() => {
                throw new Error('OnTickEnd failure');
            });
            const successHandler = vi.fn();

            const unsub1 = Events.OnTickEnd.subscribe(failingHandler);
            const unsub2 = Events.OnTickEnd.subscribe(successHandler);

            OngoingGlobal();

            resolveNextTickEnd();
            await Promise.resolve();

            expect(failingHandler).toHaveBeenCalledTimes(1);
            expect(successHandler).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2();
        });

        it('should trigger OnTickEnd channel through standalone wrapper', () => {
            const handler = vi.fn();
            const unsub = Events.OnTickEnd.subscribe(handler);

            OnTickEnd();
            expect(handler).toHaveBeenCalledTimes(1);

            unsub();
        });
    });
});
