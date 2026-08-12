import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from '../../events/index.ts';
import { Solid } from '../index.ts';

describe('Solid Reactive System Tests', () => {
    beforeEach(() => {
        Solid.setLogging(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createSignal, read, and write', () => {
        it('should initialize with starting value and read correctly', () => {
            const countSig = Solid.createSignal(10);
            expect(Solid.read(countSig)).toBe(10);
        });

        it('should update value via direct setter', () => {
            const countSig = Solid.createSignal(0);
            Solid.write(countSig, 5);
            expect(Solid.read(countSig)).toBe(5);
        });

        it('should update value via updater function', () => {
            const countSig = Solid.createSignal(10);
            Solid.write(countSig, (prev) => prev + 5);
            expect(Solid.read(countSig)).toBe(15);
        });

        it('should ignore updates if value is unchanged (primitive equality)', async () => {
            const countSig = Solid.createSignal(42);
            let runs = 0;

            Solid.createEffect(() => {
                Solid.read(countSig);
                ++runs;
            });

            expect(runs).toBe(1);

            Solid.write(countSig, 42);
            await Promise.resolve();
            expect(runs).toBe(1);
        });

        it('should ignore updates if objects or arrays are deeply equal', async () => {
            const stateSig = Solid.createSignal({ x: 10, y: [1, 2, 3] });
            let runs = 0;

            Solid.createEffect(() => {
                Solid.read(stateSig);
                ++runs;
            });

            expect(runs).toBe(1);

            Solid.write(stateSig, { x: 10, y: [1, 2, 3] });
            await Promise.resolve();
            expect(runs).toBe(1);

            Solid.write(stateSig, { x: 10, y: [1, 2, 4] });
            await Promise.resolve();
            expect(runs).toBe(2);
        });

        it('should protect against stale ID access after destroySignal via generation counters', () => {
            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Warning);

            const sig = Solid.createSignal(100);
            expect(Solid.read(sig)).toBe(100);

            Solid.destroySignal(sig);

            // Attempting to read stale ID should log warning and return undefined
            expect(Solid.read(sig)).toBeUndefined();
            expect(logFn).toHaveBeenCalledWith(expect.stringContaining('invalid or destroyed Signal'), undefined);

            // Allocating a new signal may reuse the slot with an incremented generation
            const newSig = Solid.createSignal(200);
            expect(newSig).not.toBe(sig); // ID should differ due to generation
            expect(Solid.read(newSig)).toBe(200);
            expect(Solid.read(sig)).toBeUndefined();
        });

        it('should track active signal and subscriber counts accurately', () => {
            const initialSignals = Solid.getActiveSignals();
            const initialSubs = Solid.getActiveSubscribers();

            const sig1 = Solid.createSignal(1);
            const sig2 = Solid.createSignal(2);
            expect(Solid.getActiveSignals()).toBe(initialSignals + 2);

            const eff1 = Solid.createEffect(() => {
                Solid.read(sig1);
            });
            expect(Solid.getActiveSubscribers()).toBe(initialSubs + 1);

            Solid.destroyEffect(eff1);
            expect(Solid.getActiveSubscribers()).toBe(initialSubs);

            Solid.destroySignal(sig1);
            Solid.destroySignal(sig2);
            expect(Solid.getActiveSignals()).toBe(initialSignals);
        });

        it('should log error and return -1 when signal pool is full without throwing', () => {
            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Error);

            const allocated: Solid.SignalID<number>[] = [];
            const remaining = Solid.MAX_SIGNALS - Solid.getActiveSignals();

            for (let i = 0; i < remaining; ++i) {
                allocated.push(Solid.createSignal(i));
            }

            // Next allocation should fail gracefully
            const overflowSig = Solid.createSignal(9999);
            expect(overflowSig).toBe(-1);
            expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Signal pool is full'), undefined);

            // Operations on invalid signal should no-op safely without crashing
            expect(Solid.read(overflowSig)).toBeUndefined();
            Solid.write(overflowSig, 123);
            Solid.destroySignal(overflowSig);

            // Cleanup
            for (let i = 0; i < allocated.length; ++i) {
                Solid.destroySignal(allocated[i]);
            }
        });
    });

    describe('createEffect and destroyEffect', () => {
        it('should run synchronously on creation', () => {
            let executed = false;
            Solid.createEffect(() => {
                executed = true;
            });
            expect(executed).toBe(true);
        });

        it('should re-run when tracked signals change', async () => {
            const countSig = Solid.createSignal(0);
            let observed = -1;

            Solid.createEffect(() => {
                observed = Solid.read(countSig);
            });

            expect(observed).toBe(0);

            Solid.write(countSig, 1);
            expect(observed).toBe(0); // Batched via microtask

            await Promise.resolve();
            expect(observed).toBe(1);
        });

        it('should stop tracking and executing when destroyed', async () => {
            const countSig = Solid.createSignal(0);
            let runs = 0;

            const effectId = Solid.createEffect(() => {
                Solid.read(countSig);
                ++runs;
            });

            expect(runs).toBe(1);

            Solid.write(countSig, 1);
            await Promise.resolve();
            expect(runs).toBe(2);

            Solid.destroyEffect(effectId);

            Solid.write(countSig, 2);
            await Promise.resolve();
            expect(runs).toBe(2);
        });

        it('should handle dynamic dependency branching correctly without array allocations', async () => {
            const condSig = Solid.createSignal(true);
            const aSig = Solid.createSignal('A1');
            const bSig = Solid.createSignal('B1');

            let result = '';
            let runs = 0;

            Solid.createEffect(() => {
                ++runs;
                result = Solid.read(condSig) ? Solid.read(aSig) : Solid.read(bSig);
            });

            expect(result).toBe('A1');
            expect(runs).toBe(1);

            // Updating B should NOT trigger effect while cond is true
            Solid.write(bSig, 'B2');
            await Promise.resolve();
            expect(result).toBe('A1');
            expect(runs).toBe(1);

            // Updating A SHOULD trigger effect
            Solid.write(aSig, 'A2');
            await Promise.resolve();
            expect(result).toBe('A2');
            expect(runs).toBe(2);

            // Switch branch to B
            Solid.write(condSig, false);
            await Promise.resolve();
            expect(result).toBe('B2');
            expect(runs).toBe(3);

            // Now updating A should NOT trigger effect
            Solid.write(aSig, 'A3');
            await Promise.resolve();
            expect(result).toBe('B2');
            expect(runs).toBe(3);

            // Updating B SHOULD trigger effect
            Solid.write(bSig, 'B3');
            await Promise.resolve();
            expect(result).toBe('B3');
            expect(runs).toBe(4);
        });

        it('should enforce MAX_DEPS_PER_SUB (8) limit and log error when exceeded', () => {
            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Error);

            const signals = Array.from({ length: 10 }, (_, i) => Solid.createSignal(i));

            Solid.createEffect(() => {
                for (let i = 0; i < signals.length; ++i) {
                    Solid.read(signals[i]);
                }
            });

            expect(logFn).toHaveBeenCalledWith(
                expect.stringContaining('Subscriber exceeded max dependencies'),
                undefined
            );
        });

        it('should catch errors in effect and allow other effects to continue', async () => {
            const triggerSig = Solid.createSignal(0);
            let safeRuns = 0;

            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Error, true);

            Solid.createEffect(() => {
                if (Solid.read(triggerSig) === 1) {
                    throw new Error('Boom in effect');
                }
            });

            Solid.createEffect(() => {
                Solid.read(triggerSig);
                ++safeRuns;
            });

            expect(safeRuns).toBe(1);

            Solid.write(triggerSig, 1);
            await Promise.resolve();

            expect(safeRuns).toBe(2);
            expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Error in effect:'), expect.any(Error));
        });

        it('should log error and return -1 when subscriber pool is full without throwing', () => {
            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Error);

            const allocated: Solid.EffectID[] = [];
            const remaining = Solid.MAX_SUBSCRIBERS - Solid.getActiveSubscribers();

            for (let i = 0; i < remaining; ++i) {
                allocated.push(Solid.createEffect(() => {}));
            }

            // Next allocation should fail gracefully
            const overflowEff = Solid.createEffect(() => {});
            expect(overflowEff).toBe(-1);
            expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Subscriber pool is full'), undefined);

            // Destroying invalid effect should no-op safely without crashing
            Solid.destroyEffect(overflowEff);

            // Cleanup
            for (let i = 0; i < allocated.length; ++i) {
                Solid.destroyEffect(allocated[i]);
            }
        });
    });

    describe('createMemo', () => {
        it('should compute and memoize derived values', async () => {
            const firstSig = Solid.createSignal('John');
            const lastSig = Solid.createSignal('Doe');

            let memoComputes = 0;
            const fullNameSig = Solid.createMemo(() => {
                ++memoComputes;
                return `${Solid.read(firstSig)} ${Solid.read(lastSig)}`;
            });

            expect(Solid.read(fullNameSig)).toBe('John Doe');
            expect(memoComputes).toBeGreaterThanOrEqual(1);

            Solid.write(firstSig, 'Jane');
            await Promise.resolve();
            expect(Solid.read(fullNameSig)).toBe('Jane Doe');
        });

        it('should only notify downstream subscribers when memo value actually changes', async () => {
            const countSig = Solid.createSignal(0);

            const paritySig = Solid.createMemo(() => (Solid.read<number>(countSig) % 2 === 0 ? 'even' : 'odd'));

            let downstreamRuns = 0;
            Solid.createEffect(() => {
                Solid.read(paritySig);
                ++downstreamRuns;
            });

            expect(downstreamRuns).toBe(1);

            // count goes from 0 -> 2 (parity remains 'even')
            Solid.write(countSig, 2);
            await Promise.resolve();
            expect(Solid.read(paritySig)).toBe('even');
            expect(downstreamRuns).toBe(1); // Downstream effect should NOT re-run

            // count goes from 2 -> 3 (parity changes to 'odd')
            Solid.write(countSig, 3);
            await Promise.resolve();
            expect(Solid.read(paritySig)).toBe('odd');
            expect(downstreamRuns).toBe(2);
        });
    });

    describe('untrack', () => {
        it('should read signal without establishing dependency', async () => {
            const trackedSig = Solid.createSignal(0);
            const untrackedSig = Solid.createSignal(100);

            let observed = -1;
            let runs = 0;

            Solid.createEffect(() => {
                ++runs;
                observed = Solid.read<number>(trackedSig) + Solid.untrack(() => Solid.read<number>(untrackedSig));
            });

            expect(observed).toBe(100);
            expect(runs).toBe(1);

            Solid.write(untrackedSig, 200);
            await Promise.resolve();
            expect(runs).toBe(1);
            expect(observed).toBe(100);

            Solid.write(trackedSig, 1);
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(observed).toBe(201);
        });
    });

    describe('createRoot & onCleanup', () => {
        it('should create detached scope and destroy child signals and effects on disposal', async () => {
            const countSig = Solid.createSignal(0);
            let rootCleanedUp = false;
            let runs = 0;

            let disposeRoot!: () => void;
            let childSig!: Solid.SignalID;

            Solid.createRoot((dispose) => {
                disposeRoot = dispose;
                childSig = Solid.createSignal(999);

                Solid.onCleanup(() => {
                    rootCleanedUp = true;
                });

                Solid.createEffect(() => {
                    Solid.read(countSig);
                    ++runs;
                });
            });

            expect(runs).toBe(1);
            expect(rootCleanedUp).toBe(false);
            expect(Solid.read(childSig)).toBe(999);

            Solid.write(countSig, 1);
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(rootCleanedUp).toBe(false);

            disposeRoot();
            expect(rootCleanedUp).toBe(true);
            expect(Solid.read(childSig)).toBeUndefined(); // Child signal destroyed

            Solid.write(countSig, 2);
            await Promise.resolve();
            expect(runs).toBe(2); // Child effect not run
        });

        it('should run onCleanup inside effects before re-executing or on disposal', async () => {
            const countSig = Solid.createSignal(0);
            const events: string[] = [];

            const effectId = Solid.createEffect(() => {
                const c = Solid.read(countSig);
                events.push(`run:${c}`);
                Solid.onCleanup(() => {
                    events.push(`clean:${c}`);
                });
            });

            expect(events).toEqual(['run:0']);

            Solid.write(countSig, 1);
            await Promise.resolve();
            expect(events[events.length - 1]).toBe('run:1');

            Solid.destroyEffect(effectId);
        });
    });

    describe('createStore', () => {
        it('should track property reads and trigger updates on mutation', async () => {
            const [state, setState] = Solid.createStore({ user: { name: 'Alice', age: 30 }, count: 0 });

            let nameObserved = '';
            let ageObserved = 0;
            let nameRuns = 0;
            let ageRuns = 0;

            Solid.createEffect(() => {
                nameObserved = state.user.name;
                ++nameRuns;
            });

            Solid.createEffect(() => {
                ageObserved = state.user.age;
                ++ageRuns;
            });

            expect(nameObserved).toBe('Alice');
            expect(ageObserved).toBe(30);
            expect(nameRuns).toBe(1);
            expect(ageRuns).toBe(1);

            setState((s) => {
                s.user.name = 'Bob';
            });
            await Promise.resolve();

            expect(nameObserved).toBe('Bob');
            expect(nameRuns).toBe(2);
            expect(ageRuns).toBe(1);

            setState((s) => {
                s.user.age = 31;
            });
            await Promise.resolve();

            expect(ageObserved).toBe(31);
            expect(nameRuns).toBe(2);
            expect(ageRuns).toBe(2);
        });

        it('should handle property mutation and deletion in store', async () => {
            const [store, setStore] = Solid.createStore<{ greeting: string; temp?: string }>({
                greeting: 'hello',
                temp: 'temporary',
            });

            let greetVal = '';
            let tempVal: string | undefined = '';

            Solid.createEffect(() => {
                greetVal = store.greeting;
            });

            Solid.createEffect(() => {
                tempVal = store.temp;
            });

            expect(greetVal).toBe('hello');
            expect(tempVal).toBe('temporary');

            setStore((s) => {
                s.greeting = 'hi';
            });
            await Promise.resolve();
            expect(greetVal).toBe('hi');

            setStore((s) => {
                delete s.temp;
            });
            await Promise.resolve();
            expect(tempVal).toBeUndefined();
        });
    });

    describe('createContext & useContext', () => {
        it('should return defaultValue when not provided', () => {
            const ThemeContext = Solid.createContext('light');
            expect(Solid.useContext(ThemeContext)).toBe('light');
        });

        it('should provide value within scope and restore previous value', () => {
            const ThemeContext = Solid.createContext('light');

            ThemeContext.provide('dark', () => {
                expect(Solid.useContext(ThemeContext)).toBe('dark');

                ThemeContext.provide('blue', () => {
                    expect(Solid.useContext(ThemeContext)).toBe('blue');
                });

                expect(Solid.useContext(ThemeContext)).toBe('dark');
            });

            expect(Solid.useContext(ThemeContext)).toBe('light');
        });
    });

    describe('Scheduler & Defer Ticks', () => {
        it('should batch multiple synchronous signal updates into a single effect execution (deferTicks: 0)', async () => {
            const aSig = Solid.createSignal(0);
            const bSig = Solid.createSignal(0);

            let runs = 0;
            Solid.createEffect(() => {
                Solid.read(aSig);
                Solid.read(bSig);
                ++runs;
            });

            expect(runs).toBe(1);

            Solid.write(aSig, 1);
            Solid.write(bSig, 1);
            Solid.write(aSig, 2);
            Solid.write(bSig, 2);

            expect(runs).toBe(1);

            await Promise.resolve();
            expect(runs).toBe(2);
        });

        it('should coalesce updates with deferTicks > 0 across global ticks', async () => {
            const countSig = Solid.createSignal(0);
            let observed = -1;
            let runs = 0;

            Solid.createEffect(
                () => {
                    observed = Solid.read(countSig);
                    ++runs;
                },
                { deferTicks: 3 }
            );

            expect(runs).toBe(1);
            expect(observed).toBe(0);

            Solid.write(countSig, 10);
            await Promise.resolve();
            expect(runs).toBe(1);

            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(1);

            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(1);

            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(observed).toBe(10);
        });

        it('should clamp deferTicks values between 0 and MAX_DEFER_TICKS (65535)', () => {
            const countSig = Solid.createSignal(0);

            // Large values beyond 65535 should clamp without overflowing Uint16
            const eff1 = Solid.createEffect(
                () => {
                    Solid.read(countSig);
                },
                { deferTicks: 100_000 }
            );

            expect(eff1).not.toBe(-1);

            // Negative values should clamp to 0
            const eff2 = Solid.createEffect(
                () => {
                    Solid.read(countSig);
                },
                { deferTicks: -10 }
            );

            expect(eff2).not.toBe(-1);

            Solid.destroyEffect(eff1);
            Solid.destroyEffect(eff2);
        });
    });

    describe('HyperScript Factory (h)', () => {
        class MockWidget {
            public text: string = '';
            public width: number = 0;
            public height: number = 0;
            public onClick?: () => void;
            public isDeleted = false;

            constructor(params: { text?: string; width?: number; height?: number; onClick?: () => void }) {
                if (params.text !== undefined) this.text = params.text;
                if (params.width !== undefined) this.width = params.width;
                if (params.height !== undefined) this.height = params.height;
                if (params.onClick !== undefined) this.onClick = params.onClick;
            }

            delete(): void {
                this.isDeleted = true;
            }
        }

        it('should instantiate component with static props and preserve event handlers', () => {
            const clickFn = vi.fn();
            const widget = Solid.h(MockWidget, {
                text: 'Hello',
                width: 100,
                height: 50,
                onClick: clickFn,
            });

            expect(widget.text).toBe('Hello');
            expect(widget.width).toBe(100);
            expect(widget.height).toBe(50);
            expect(widget.onClick).toBe(clickFn);
        });

        it('should bind reactive signal properties and update widget on signal changes', async () => {
            const textSig = Solid.createSignal('Initial');
            const widthSig = Solid.createSignal(100);

            const widget = Solid.h(MockWidget, {
                text: () => Solid.read(textSig),
                width: () => Solid.read(widthSig),
            });

            expect(widget.text).toBe('Initial');
            expect(widget.width).toBe(100);

            Solid.write(textSig, 'Updated');
            Solid.write(widthSig, 200);
            await Promise.resolve();

            expect(widget.text).toBe('Updated');
            expect(widget.width).toBe(200);
        });

        it('should bind reactive SignalID properties directly', async () => {
            const textSig = Solid.createSignal('Initial');
            const widthSig = Solid.createSignal(100);

            const widget = Solid.h(MockWidget, {
                text: textSig,
                width: widthSig,
            });

            expect(widget.text).toBe('Initial');
            expect(widget.width).toBe(100);

            Solid.write(textSig, 'Direct');
            Solid.write(widthSig, 350);
            await Promise.resolve();

            expect(widget.text).toBe('Direct');
            expect(widget.width).toBe(350);
        });

        it('should clean up widget via scope lifecycle on createRoot disposal', async () => {
            let widget!: MockWidget;
            const textSig = Solid.createSignal('Initial');

            let disposeRoot!: () => void;
            Solid.createRoot((dispose) => {
                disposeRoot = dispose;
                widget = Solid.h(MockWidget, {
                    text: () => Solid.read(textSig),
                });
            });

            expect(widget.text).toBe('Initial');
            expect(widget.isDeleted).toBe(false);

            disposeRoot();
            expect(widget.isDeleted).toBe(true);

            Solid.write(textSig, 'Should Not Throw Or Update');
            await Promise.resolve();
            expect(widget.text).toBe('Initial');
        });

        it('should self-prune and destroy subscriber effects when widget is deleted out-of-band', async () => {
            const textSig = Solid.createSignal('Initial');
            const initialSubs = Solid.getActiveSubscribers();

            // Create widget without createRoot
            const widget = Solid.h(MockWidget, {
                text: () => Solid.read(textSig),
            });

            expect(Solid.getActiveSubscribers()).toBe(initialSubs + 1);

            // Imperatively delete widget out-of-band
            widget.delete();
            expect(widget.isDeleted).toBe(true);

            // Trigger signal update -> effect executes, sees isDeleted, and self-prunes!
            Solid.write(textSig, 'Trigger Prune');
            await Promise.resolve();

            // Subscriber slot was reclaimed!
            expect(Solid.getActiveSubscribers()).toBe(initialSubs);
        });

        it('should invoke functional components correctly', () => {
            const MyComponent = (props: { title?: string }) => {
                return new MockWidget({ text: props.title ?? 'Default' });
            };

            const widget = Solid.h(MyComponent, { title: 'Custom' });
            expect(widget.text).toBe('Custom');
        });
    });

    describe('Index List Component', () => {
        class MockRow {
            public value: string = '';
            public isDeleted = false;

            constructor(params: { value?: string }) {
                if (params.value !== undefined) this.value = params.value;
            }

            delete(): void {
                this.isDeleted = true;
            }
        }

        it('should render items, grow list, shrink list, and update items in place', async () => {
            const itemsSig = Solid.createSignal(['A', 'B', 'C']);
            const rows: MockRow[] = [];

            Solid.createRoot(() => {
                Solid.Index(itemsSig, (itemSig) => {
                    const row = Solid.h(MockRow, {
                        value: () => Solid.read(itemSig),
                    });
                    rows.push(row);
                    return row;
                });
            });

            expect(rows.length).toBe(3);
            expect(rows[0].value).toBe('A');
            expect(rows[1].value).toBe('B');
            expect(rows[2].value).toBe('C');

            Solid.write(itemsSig, ['A', 'B_NEW', 'C']);
            await Promise.resolve();
            expect(rows.length).toBe(3);
            expect(rows[1].value).toBe('B_NEW');

            Solid.write(itemsSig, ['A', 'B_NEW', 'C', 'D']);
            await Promise.resolve();
            expect(rows.length).toBe(4);
            expect(rows[3].value).toBe('D');

            const rowD = rows[3];
            Solid.write(itemsSig, ['A', 'B_NEW']);
            await Promise.resolve();
            expect(rowD.isDeleted).toBe(true);
        });
    });

    describe('Edge Graph Topology & Multiplexing', () => {
        it('should handle single subscriber and multiple subscribers with zero array allocations', async () => {
            const signalSig = Solid.createSignal(1);

            let val1 = 0;
            let val2 = 0;
            let val3 = 0;

            const effect1 = Solid.createEffect(() => {
                val1 = Solid.read(signalSig);
            });
            expect(val1).toBe(1);

            const effect2 = Solid.createEffect(() => {
                val2 = Solid.read(signalSig);
            });
            expect(val2).toBe(1);

            const effect3 = Solid.createEffect(() => {
                val3 = Solid.read(signalSig);
            });
            expect(val3).toBe(1);

            Solid.write(signalSig, 2);
            await Promise.resolve();
            expect(val1).toBe(2);
            expect(val2).toBe(2);
            expect(val3).toBe(2);

            Solid.destroyEffect(effect3);
            Solid.write(signalSig, 3);
            await Promise.resolve();
            expect(val1).toBe(3);
            expect(val2).toBe(3);
            expect(val3).toBe(2);

            Solid.destroyEffect(effect2);
            Solid.write(signalSig, 4);
            await Promise.resolve();
            expect(val1).toBe(4);
            expect(val2).toBe(3);

            Solid.destroyEffect(effect1);
            Solid.write(signalSig, 5);
            await Promise.resolve();
            expect(val1).toBe(4);
        });

        it('should correctly evaluate diamond dependency graphs', async () => {
            const sourceSig = Solid.createSignal(1);

            const aSig = Solid.createMemo(() => Solid.read<number>(sourceSig) * 2);
            const bSig = Solid.createMemo(() => Solid.read<number>(sourceSig) * 3);
            const combinedSig = Solid.createMemo(() => Solid.read<number>(aSig) + Solid.read<number>(bSig));

            let effectRuns = 0;
            let finalValue = 0;

            Solid.createEffect(() => {
                finalValue = Solid.read(combinedSig);
                ++effectRuns;
            });

            expect(finalValue).toBe(5);
            expect(effectRuns).toBe(1);

            Solid.write(sourceSig, 2);
            await Promise.resolve();

            expect(finalValue).toBe(10);
            expect(effectRuns).toBe(2);
        });
    });

    describe('Scheduler Limits & Error Safeguards', () => {
        it('should enforce MAX_FLUSHES_PER_TICK safeguard on infinite re-entrant loops', async () => {
            const logFn = vi.fn();
            Solid.setLogging(logFn, Solid.LogLevel.Error);

            const signalA = Solid.createSignal(0);
            const signalB = Solid.createSignal(0);

            Solid.createEffect(() => {
                const a = Solid.read<number>(signalA);
                if (a < 2000) {
                    Solid.write(signalB, a + 1);
                }
            });

            Solid.createEffect(() => {
                const b = Solid.read<number>(signalB);
                if (b < 2000) {
                    Solid.write(signalA, b + 1);
                }
            });

            Solid.write(signalA, 1);

            for (let i = 0; i < 20; ++i) {
                await Promise.resolve();
            }

            expect(logFn).toHaveBeenCalledWith(
                expect.stringMatching(/Max (executions per flush|flushes per tick) exceeded/),
                undefined
            );
        });
    });
});
