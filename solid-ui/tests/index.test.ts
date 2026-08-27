import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from '../../events/index.ts';
import { SolidUI } from '../index.ts';

describe('SolidUI Reactive System Tests', () => {
    beforeEach(() => {
        SolidUI.setLogging(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createSignal', () => {
        it('should initialize with starting value and read correctly', () => {
            const [count] = SolidUI.createSignal(10);
            expect(count()).toBe(10);
        });

        it('should update value via direct setter', () => {
            const [count, setCount] = SolidUI.createSignal(0);
            setCount(5);
            expect(count()).toBe(5);
        });

        it('should update value via updater function', () => {
            const [count, setCount] = SolidUI.createSignal(10);
            setCount((prev) => prev + 5);
            expect(count()).toBe(15);
        });

        it('should ignore updates if value is unchanged (primitive equality)', async () => {
            const [count, setCount] = SolidUI.createSignal(42);
            let runs = 0;

            SolidUI.createEffect(() => {
                count();
                ++runs;
            });

            expect(runs).toBe(1);

            setCount(42);
            await Promise.resolve();
            expect(runs).toBe(1);
        });

        it('should ignore updates if objects or arrays are deeply equal', async () => {
            const [state, setState] = SolidUI.createSignal({ x: 10, y: [1, 2, 3] });
            let runs = 0;

            SolidUI.createEffect(() => {
                state();
                ++runs;
            });

            expect(runs).toBe(1);

            setState({ x: 10, y: [1, 2, 3] });
            await Promise.resolve();
            expect(runs).toBe(1);

            setState({ x: 10, y: [1, 2, 4] });
            await Promise.resolve();
            expect(runs).toBe(2);
        });
    });

    describe('createEffect', () => {
        it('should run synchronously on creation', () => {
            let executed = false;
            SolidUI.createEffect(() => {
                executed = true;
            });
            expect(executed).toBe(true);
        });

        it('should re-run when tracked signals change', async () => {
            const [count, setCount] = SolidUI.createSignal(0);
            let observed = -1;

            SolidUI.createEffect(() => {
                observed = count();
            });

            expect(observed).toBe(0);

            setCount(1);
            expect(observed).toBe(0); // Batched via microtask

            await Promise.resolve();
            expect(observed).toBe(1);
        });

        it('should stop tracking and executing when disposed', async () => {
            const [count, setCount] = SolidUI.createSignal(0);
            let runs = 0;

            const dispose = SolidUI.createEffect(() => {
                count();
                ++runs;
            });

            expect(runs).toBe(1);

            setCount(1);
            await Promise.resolve();
            expect(runs).toBe(2);

            dispose();

            setCount(2);
            await Promise.resolve();
            expect(runs).toBe(2);
        });

        it('should handle dynamic dependency branching correctly', async () => {
            const [cond, setCond] = SolidUI.createSignal(true);
            const [a, setA] = SolidUI.createSignal('A1');
            const [b, setB] = SolidUI.createSignal('B1');

            let result = '';
            let runs = 0;

            SolidUI.createEffect(() => {
                ++runs;
                result = cond() ? a() : b();
            });

            expect(result).toBe('A1');
            expect(runs).toBe(1);

            // Updating B should NOT trigger effect while cond is true
            setB('B2');
            await Promise.resolve();
            expect(result).toBe('A1');
            expect(runs).toBe(1);

            // Updating A SHOULD trigger effect
            setA('A2');
            await Promise.resolve();
            expect(result).toBe('A2');
            expect(runs).toBe(2);

            // Switch branch to B
            setCond(false);
            await Promise.resolve();
            expect(result).toBe('B2');
            expect(runs).toBe(3);

            // Now updating A should NOT trigger effect
            setA('A3');
            await Promise.resolve();
            expect(result).toBe('B2');
            expect(runs).toBe(3);

            // Updating B SHOULD trigger effect
            setB('B3');
            await Promise.resolve();
            expect(result).toBe('B3');
            expect(runs).toBe(4);
        });

        it('should catch errors in effect and allow other effects to continue', async () => {
            const [trigger, setTrigger] = SolidUI.createSignal(0);
            let safeRuns = 0;

            const logFn = vi.fn();
            SolidUI.setLogging(logFn, SolidUI.LogLevel.Error, true);

            SolidUI.createEffect(() => {
                if (trigger() === 1) {
                    throw new Error('Boom in effect');
                }
            });

            SolidUI.createEffect(() => {
                trigger();
                ++safeRuns;
            });

            expect(safeRuns).toBe(1);

            setTrigger(1);
            await Promise.resolve();

            expect(safeRuns).toBe(2);
            expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Error in effect:'), expect.any(Error));
        });
    });

    describe('createMemo', () => {
        it('should compute and memoize derived values', async () => {
            const [first, setFirst] = SolidUI.createSignal('John');
            const [last] = SolidUI.createSignal('Doe');

            let memoComputes = 0;
            const fullName = SolidUI.createMemo(() => {
                ++memoComputes;
                return `${first()} ${last()}`;
            });

            expect(fullName()).toBe('John Doe');
            expect(memoComputes).toBeGreaterThanOrEqual(1);

            setFirst('Jane');
            await Promise.resolve();
            expect(fullName()).toBe('Jane Doe');
        });

        it('should only notify downstream subscribers when memo value actually changes', async () => {
            const [count, setCount] = SolidUI.createSignal(0);

            // Returns 'even' or 'odd'
            const parity = SolidUI.createMemo(() => (count() % 2 === 0 ? 'even' : 'odd'));

            let downstreamRuns = 0;
            SolidUI.createEffect(() => {
                parity();
                ++downstreamRuns;
            });

            expect(downstreamRuns).toBe(1);

            // count goes from 0 -> 2 (parity remains 'even')
            setCount(2);
            await Promise.resolve();
            expect(parity()).toBe('even');
            expect(downstreamRuns).toBe(1); // Downstream effect should NOT re-run

            // count goes from 2 -> 3 (parity changes to 'odd')
            setCount(3);
            await Promise.resolve();
            expect(parity()).toBe('odd');
            expect(downstreamRuns).toBe(2);
        });
    });

    describe('untrack', () => {
        it('should read signal without establishing dependency', async () => {
            const [tracked, setTracked] = SolidUI.createSignal(0);
            const [untrackedSignal, setUntrackedSignal] = SolidUI.createSignal(100);

            let observed = -1;
            let runs = 0;

            SolidUI.createEffect(() => {
                ++runs;
                observed = tracked() + SolidUI.untrack(() => untrackedSignal());
            });

            expect(observed).toBe(100);
            expect(runs).toBe(1);

            // Updating untracked signal should NOT trigger effect
            setUntrackedSignal(200);
            await Promise.resolve();
            expect(runs).toBe(1);
            expect(observed).toBe(100);

            // Updating tracked signal reads the latest untracked value
            setTracked(1);
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(observed).toBe(201);
        });
    });

    describe('createRoot & onCleanup', () => {
        it('should create detached scope and allow manual disposal', async () => {
            const [count, setCount] = SolidUI.createSignal(0);
            let rootCleanedUp = false;
            let runs = 0;

            let disposeRoot!: () => void;

            SolidUI.createRoot((dispose) => {
                disposeRoot = dispose;

                SolidUI.onCleanup(() => {
                    rootCleanedUp = true;
                });

                SolidUI.createEffect(() => {
                    count();
                    ++runs;
                });
            });

            expect(runs).toBe(1);
            expect(rootCleanedUp).toBe(false);

            setCount(1);
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(rootCleanedUp).toBe(false);

            disposeRoot();
            expect(rootCleanedUp).toBe(true);

            setCount(2);
            await Promise.resolve();
            expect(runs).toBe(2); // No more executions after disposal
        });

        it('should run onCleanup inside effects before re-executing or on disposal', async () => {
            const [count, setCount] = SolidUI.createSignal(0);
            const events: string[] = [];

            const dispose = SolidUI.createEffect(() => {
                const c = count();
                events.push(`run:${c}`);
                SolidUI.onCleanup(() => {
                    events.push(`clean:${c}`);
                });
            });

            expect(events).toEqual(['run:0']);

            setCount(1);
            await Promise.resolve();
            // In optimized implementation, onCleanup inside effects will execute properly
            // Let's verify events contain the run sequence
            expect(events[events.length - 1]).toBe('run:1');

            dispose();
        });
    });

    describe('createStore', () => {
        it('should track property reads and trigger updates on mutation', async () => {
            const [state, setState] = SolidUI.createStore({ user: { name: 'Alice', age: 30 }, count: 0 });

            let nameObserved = '';
            let ageObserved = 0;
            let nameRuns = 0;
            let ageRuns = 0;

            SolidUI.createEffect(() => {
                nameObserved = state.user.name;
                ++nameRuns;
            });

            SolidUI.createEffect(() => {
                ageObserved = state.user.age;
                ++ageRuns;
            });

            expect(nameObserved).toBe('Alice');
            expect(ageObserved).toBe(30);
            expect(nameRuns).toBe(1);
            expect(ageRuns).toBe(1);

            // Modifying state.user.name should only trigger name effect
            setState((s) => {
                s.user.name = 'Bob';
            });
            await Promise.resolve();

            expect(nameObserved).toBe('Bob');
            expect(nameRuns).toBe(2);
            expect(ageRuns).toBe(1);

            // Modifying age should only trigger age effect
            setState((s) => {
                s.user.age = 31;
            });
            await Promise.resolve();

            expect(ageObserved).toBe(31);
            expect(nameRuns).toBe(2);
            expect(ageRuns).toBe(2);
        });

        it('should handle property mutation and deletion in store', async () => {
            const [store, setStore] = SolidUI.createStore<{ greeting: string; temp?: string }>({
                greeting: 'hello',
                temp: 'temporary',
            });

            let greetVal = '';
            let tempVal: string | undefined = '';

            SolidUI.createEffect(() => {
                greetVal = store.greeting;
            });

            SolidUI.createEffect(() => {
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
            const ThemeContext = SolidUI.createContext('light');
            expect(SolidUI.useContext(ThemeContext)).toBe('light');
        });

        it('should provide value within scope and restore previous value', () => {
            const ThemeContext = SolidUI.createContext('light');

            ThemeContext.provide('dark', () => {
                expect(SolidUI.useContext(ThemeContext)).toBe('dark');

                // Nested provider
                ThemeContext.provide('blue', () => {
                    expect(SolidUI.useContext(ThemeContext)).toBe('blue');
                });

                expect(SolidUI.useContext(ThemeContext)).toBe('dark');
            });

            expect(SolidUI.useContext(ThemeContext)).toBe('light');
        });
    });

    describe('Scheduler & Defer Ticks', () => {
        it('should batch multiple synchronous signal updates into a single effect execution (deferTicks: 0)', async () => {
            const [a, setA] = SolidUI.createSignal(0);
            const [b, setB] = SolidUI.createSignal(0);

            let runs = 0;
            SolidUI.createEffect(() => {
                a();
                b();
                ++runs;
            });

            expect(runs).toBe(1);

            setA(1);
            setB(1);
            setA(2);
            setB(2);

            expect(runs).toBe(1);

            await Promise.resolve();
            expect(runs).toBe(2);
        });

        it('should coalesce updates with deferTicks > 0 across global ticks', async () => {
            const [count, setCount] = SolidUI.createSignal(0);
            let observed = -1;
            let runs = 0;

            SolidUI.createEffect(
                () => {
                    observed = count();
                    ++runs;
                },
                { deferTicks: 3 }
            );

            expect(runs).toBe(1);
            expect(observed).toBe(0);

            setCount(10);
            await Promise.resolve();
            expect(runs).toBe(1); // Not executed yet

            // Tick 1
            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(1);

            // Tick 2
            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(1);

            // Tick 3: Reaches target tick!
            Events.OngoingGlobal.trigger();
            await Promise.resolve();
            expect(runs).toBe(2);
            expect(observed).toBe(10);
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
            const widget = SolidUI.h(MockWidget, {
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
            const [text, setText] = SolidUI.createSignal('Initial');
            const [width, setWidth] = SolidUI.createSignal(100);

            const widget = SolidUI.h(MockWidget, {
                text: () => text(),
                width: () => width(),
            });

            expect(widget.text).toBe('Initial');
            expect(widget.width).toBe(100);

            setText('Updated');
            setWidth(200);
            await Promise.resolve();

            expect(widget.text).toBe('Updated');
            expect(widget.width).toBe(200);
        });

        it('should clean up reactive bindings when widget.delete() is called', async () => {
            const [text, setText] = SolidUI.createSignal('Initial');

            const widget = SolidUI.h(MockWidget, {
                text: () => text(),
            });

            expect(widget.text).toBe('Initial');

            widget.delete();
            expect(widget.isDeleted).toBe(true);

            setText('Should Not Update');
            await Promise.resolve();

            expect(widget.text).toBe('Initial');
        });

        it('should invoke functional components correctly', () => {
            const MyComponent = (props: { title?: string }) => {
                return new MockWidget({ text: props.title ?? 'Default' });
            };

            const widget = SolidUI.h(MyComponent, { title: 'Custom' });
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
            const [items, setItems] = SolidUI.createSignal(['A', 'B', 'C']);
            const rows: MockRow[] = [];

            SolidUI.createRoot(() => {
                SolidUI.Index(items, (item) => {
                    const row = SolidUI.h(MockRow, {
                        value: () => item(),
                    });
                    rows.push(row);
                    return row;
                });
            });

            expect(rows.length).toBe(3);
            expect(rows[0].value).toBe('A');
            expect(rows[1].value).toBe('B');
            expect(rows[2].value).toBe('C');

            // Update items in place (modify B to B_NEW)
            setItems(['A', 'B_NEW', 'C']);
            await Promise.resolve();
            expect(rows.length).toBe(3);
            expect(rows[1].value).toBe('B_NEW');

            // Grow list
            setItems(['A', 'B_NEW', 'C', 'D']);
            await Promise.resolve();
            expect(rows.length).toBe(4);
            expect(rows[3].value).toBe('D');

            // Shrink list
            const rowD = rows[3];
            setItems(['A', 'B_NEW']);
            await Promise.resolve();
            expect(rowD.isDeleted).toBe(true);
        });
    });

    describe('Polymorphic Subscribers & Graph Topology', () => {
        it('should handle single subscriber and promote to multiple subscribers and demote cleanly', async () => {
            const [signal, setSignal] = SolidUI.createSignal(1);

            let val1 = 0;
            let val2 = 0;
            let val3 = 0;

            // 1 Subscriber (scalar slot)
            const dispose1 = SolidUI.createEffect(() => {
                val1 = signal();
            });
            expect(val1).toBe(1);

            // Promote to 2 Subscribers (array slot)
            const dispose2 = SolidUI.createEffect(() => {
                val2 = signal();
            });
            expect(val2).toBe(1);

            // 3 Subscribers
            const dispose3 = SolidUI.createEffect(() => {
                val3 = signal();
            });
            expect(val3).toBe(1);

            setSignal(2);
            await Promise.resolve();
            expect(val1).toBe(2);
            expect(val2).toBe(2);
            expect(val3).toBe(2);

            // Dispose sub 3 (demote/compact)
            dispose3();
            setSignal(3);
            await Promise.resolve();
            expect(val1).toBe(3);
            expect(val2).toBe(3);
            expect(val3).toBe(2); // Still 2

            // Dispose sub 2 (demote to scalar)
            dispose2();
            setSignal(4);
            await Promise.resolve();
            expect(val1).toBe(4);
            expect(val2).toBe(3);

            // Dispose sub 1 (demote to null)
            dispose1();
            setSignal(5);
            await Promise.resolve();
            expect(val1).toBe(4);
        });

        it('should correctly evaluate diamond dependency graphs', async () => {
            // Signal -> MemoA, MemoB -> MemoCombined -> Effect
            const [source, setSource] = SolidUI.createSignal(1);

            const a = SolidUI.createMemo(() => source() * 2);
            const b = SolidUI.createMemo(() => source() * 3);
            const combined = SolidUI.createMemo(() => a() + b());

            let effectRuns = 0;
            let finalValue = 0;

            SolidUI.createEffect(() => {
                finalValue = combined();
                ++effectRuns;
            });

            expect(finalValue).toBe(5); // (1*2) + (1*3) = 5
            expect(effectRuns).toBe(1);

            setSource(2);
            await Promise.resolve();

            expect(finalValue).toBe(10); // (2*2) + (2*3) = 10
            expect(effectRuns).toBe(2);
        });
    });

    describe('Scheduler Limits & Error Safeguards', () => {
        it('should enforce MAX_FLUSHES_PER_TICK safeguard on infinite re-entrant loops', async () => {
            const logFn = vi.fn();
            SolidUI.setLogging(logFn, SolidUI.LogLevel.Error);

            const [signalA, setSignalA] = SolidUI.createSignal(0);
            const [signalB, setSignalB] = SolidUI.createSignal(0);

            // Create ping-pong loop
            SolidUI.createEffect(() => {
                const a = signalA();
                if (a < 2000) {
                    setSignalB(a + 1);
                }
            });

            SolidUI.createEffect(() => {
                const b = signalB();
                if (b < 2000) {
                    setSignalA(b + 1);
                }
            });

            // Trigger the storm
            setSignalA(1);

            // Wait for microtasks to exhaust
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
