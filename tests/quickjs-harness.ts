import {
    newQuickJSWASMModule,
    type QuickJSContext,
    type QuickJSRuntime,
    type QuickJSWASMModule,
} from 'quickjs-emscripten';
import { build } from 'vite';

export interface QuickJSMemoryStats {
    memory_used_size: number;
    malloc_count: number;
    obj_count: number;
    prop_count: number;
    shape_count: number;
    atom_count: number;
}

export interface QuickJSBenchmarkResult {
    Scenario: string;
    Entities: number | string;
    'Heap Delta': string;
    'Per-Item': string;
    'Live Objs Delta': number;
    'Malloc Delta': number;
    'Drift After Cleanup': string;
    'ARC Status': string;
}

let quickJSModulePromise: Promise<QuickJSWASMModule> | null = null;

/**
 * Retrieves or initializes the QuickJS WebAssembly module singleton.
 * @returns The initialized QuickJS WASM module instance.
 */
export async function getQuickJS(): Promise<QuickJSWASMModule> {
    if (!quickJSModulePromise) {
        quickJSModulePromise = newQuickJSWASMModule();
    }
    return quickJSModulePromise;
}

/**
 * Formats a byte count into a human-readable B / KB / MB string.
 * @param bytes - The number of bytes to format.
 * @returns Formatted string representation.
 */
export function formatBytes(bytes: number): string {
    if (Math.abs(bytes) < 1024) return `${bytes} B`;
    if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * In-memory bundle cache so we only compile each module once.
 */
const bundleCache = new Map<string, string>();

/**
 * Compiles and bundles a TypeScript entry point in-memory into an IIFE bundle for QuickJS.
 * @param entryPath - Absolute path to the source file.
 * @param globalName - Global namespace variable name for the bundle.
 * @returns Bundled JavaScript code as a string.
 */
export async function bundleModule(entryPath: string, globalName: string): Promise<string> {
    const cacheKey = `${entryPath}:${globalName}`;
    const cached = bundleCache.get(cacheKey);
    if (cached) return cached;

    const result = await build({
        build: {
            lib: {
                entry: entryPath,
                formats: ['iife'],
                name: globalName,
            },
            write: false,
            minify: false,
        },
        logLevel: 'silent',
    });

    const output = Array.isArray(result) ? result[0] : result;
    if ('output' in output && output.output[0] && 'code' in output.output[0]) {
        const code = output.output[0].code;
        bundleCache.set(cacheKey, code);
        return code;
    }

    throw new Error(`Failed to bundle entry point: ${entryPath}`);
}

export interface QuickJSServerInstance {
    runtime: QuickJSRuntime;
    context: QuickJSContext;
    evalCode: (code: string) => void;
    flushJobs: () => number;
    getMemoryUsage: () => QuickJSMemoryStats;
    benchmarkScenario: (params: {
        scenario: string;
        entities: number | string;
        numericCount?: number;
        unit?: string;
        run: string;
        cleanup?: string;
    }) => QuickJSBenchmarkResult;
    dispose: () => void;
}

/**
 * Creates an isolated QuickJS runtime & context configured to simulate
 * the Battlefield 6 Portal server environment.
 *
 * Mock state is kept on the host side (Node.js/V8) so that mock bookkeeping
 * does NOT allocate inside the QuickJS heap or skew benchmark measurements.
 * @param options - Configuration options for memory limit and stack size.
 * @param options.memoryLimitBytes - Optional maximum memory limit in bytes.
 * @param options.maxStackSizeBytes - Optional maximum stack size in bytes.
 * @returns QuickJS server simulation harness.
 */
export async function createQuickJSServerContext(options?: {
    memoryLimitBytes?: number;
    maxStackSizeBytes?: number;
}): Promise<QuickJSServerInstance> {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();

    // Default to BF6 Portal-like memory limits (e.g. 32 MB heap, 512 KB stack)
    if (options?.memoryLimitBytes !== undefined) {
        runtime.setMemoryLimit(options.memoryLimitBytes);
    } else {
        runtime.setMemoryLimit(32 * 1024 * 1024);
    }

    if (options?.maxStackSizeBytes !== undefined) {
        runtime.setMaxStackSize(options.maxStackSizeBytes);
    } else {
        runtime.setMaxStackSize(512 * 1024);
    }

    // Host-side mock widget storage (ZERO QuickJS heap footprint for mock storage)
    const hostWidgets = new Map<string, Record<string, unknown>>();
    let nextWidgetId = 1;

    // Inject mock `mod` global namespace
    const modObj = context.newObject();

    // Helper to register host C-function on mod
    function registerHostFunction(
        name: string,
        fn: (
            ...args: Parameters<Parameters<QuickJSContext['newFunction']>[1]>
        ) => ReturnType<Parameters<QuickJSContext['newFunction']>[1]>
    ): void {
        const funcHandle = context.newFunction(name, fn);
        context.setProp(modObj, name, funcHandle);
        funcHandle.dispose();
    }

    // Helper to set numeric enum object
    function setEnum(name: string, values: Record<string, number>): void {
        const enumObj = context.newObject();
        for (const [k, v] of Object.entries(values)) {
            const num = context.newNumber(v);
            context.setProp(enumObj, k, num);
            num.dispose();
        }
        context.setProp(modObj, name, enumObj);
        enumObj.dispose();
    }

    registerHostFunction('GetUIRoot', () => {
        const rootWidgetObj = context.newObject();
        const rootId = context.newNumber(-1);
        const rootName = context.newString('ui_root');
        context.setProp(rootWidgetObj, '_id', rootId);
        context.setProp(rootWidgetObj, 'name', rootName);
        context.setProp(rootWidgetObj, 'visible', context.true);
        rootId.dispose();
        rootName.dispose();
        return rootWidgetObj;
    });

    registerHostFunction('FindUIWidgetWithName', (nameHandle) => {
        const name = context.getString(nameHandle);
        let w = hostWidgets.get(name);
        if (!w) {
            w = { _id: nextWidgetId++, name };
            hostWidgets.set(name, w);
        }
        const obj = context.newObject();
        const idH = context.newNumber(w._id as number);
        const nameH = context.newString(name);
        context.setProp(obj, '_id', idH);
        context.setProp(obj, 'name', nameH);
        idH.dispose();
        nameH.dispose();
        return obj;
    });

    const createWidgetStub = (nameHandle: Parameters<Parameters<QuickJSContext['newFunction']>[1]>[0]) => {
        const name = context.getString(nameHandle);
        const id = nextWidgetId++;
        hostWidgets.set(name, { _id: id, name });
        const obj = context.newObject();
        const idH = context.newNumber(id);
        const nameH = context.newString(name);
        context.setProp(obj, '_id', idH);
        context.setProp(obj, 'name', nameH);
        idH.dispose();
        nameH.dispose();
        return obj;
    };

    registerHostFunction('AddUIContainer', createWidgetStub);
    registerHostFunction('AddUIButton', createWidgetStub);
    registerHostFunction('AddUIText', createWidgetStub);
    registerHostFunction('AddUIImage', createWidgetStub);
    registerHostFunction('AddUIGadgetImage', createWidgetStub);
    registerHostFunction('AddUIWeaponImage', createWidgetStub);

    registerHostFunction('DeleteUIWidget', (widgetHandle) => {
        const nameHandle = context.getProp(widgetHandle, 'name');
        if (context.typeof(nameHandle) === 'string') {
            const name = context.getString(nameHandle);
            hostWidgets.delete(name);
        }
        nameHandle.dispose();
        return context.undefined;
    });

    // Void setters (pure host mutations, zero JS allocations)
    const voidSetters = [
        'SetUIWidgetParent',
        'SetUIWidgetVisible',
        'SetUIWidgetPosition',
        'SetUIWidgetSize',
        'SetUIWidgetBgColor',
        'SetUIWidgetBgAlpha',
        'SetUIWidgetBgFill',
        'SetUIWidgetDepth',
        'SetUIWidgetAnchor',
        'SetUIWidgetPadding',
        'SetUIButtonEnabled',
        'SetUIButtonColorBase',
        'SetUIButtonAlphaBase',
        'SetUIButtonColorDisabled',
        'SetUIButtonAlphaDisabled',
        'SetUIButtonColorPressed',
        'SetUIButtonAlphaPressed',
        'SetUIButtonColorFocused',
        'SetUIButtonAlphaFocused',
        'EnableUIButtonEvent',
        'SetUITextLabel',
        'SetUITextAlpha',
        'SetUITextColor',
        'SetUITextSize',
        'SetUITextAnchor',
        'SetUIImageType',
        'SetUIImageAlpha',
        'SetUIImageColor',
        'EnableUIInputMode',
    ];
    for (const setter of voidSetters) {
        registerHostFunction(setter, () => context.undefined);
    }

    // Getters returning primitives
    registerHostFunction('GetUIWidgetName', (w) => context.getProp(w, 'name'));
    registerHostFunction('GetUIButtonEnabled', () => context.true);
    registerHostFunction('GetUIButtonAlphaBase', () => context.newNumber(1));
    registerHostFunction('GetUIButtonAlphaDisabled', () => context.newNumber(1));
    registerHostFunction('GetUIButtonAlphaPressed', () => context.newNumber(1));
    registerHostFunction('GetUIButtonAlphaFocused', () => context.newNumber(1));
    registerHostFunction('GetUITextAlpha', () => context.newNumber(1));
    registerHostFunction('GetUITextSize', () => context.newNumber(36));
    registerHostFunction('GetUITextAnchor', () => context.newNumber(0));
    registerHostFunction('GetUIImageType', () => context.newNumber(0));
    registerHostFunction('GetUIImageAlpha', () => context.newNumber(1));
    registerHostFunction('GetUIWidgetBgAlpha', () => context.newNumber(0));
    registerHostFunction('GetUIWidgetBgFill', () => context.newNumber(0));
    registerHostFunction('GetUIWidgetDepth', () => context.newNumber(0));
    registerHostFunction('GetUIWidgetAnchor', () => context.newNumber(0));
    registerHostFunction('GetUIWidgetPadding', () => context.newNumber(0));

    // Vector helper
    registerHostFunction('CreateVector', (xH, yH, zH) => {
        const vec = context.newObject();
        context.setProp(vec, 'x', xH);
        context.setProp(vec, 'y', yH);
        context.setProp(vec, 'z', zH);
        return vec;
    });

    registerHostFunction('CreateNewWeaponPackage', () => context.newObject());

    registerHostFunction('GetObjId', (objH) => {
        const idH = context.getProp(objH, '_id');
        if (context.typeof(idH) === 'number') {
            return idH;
        }
        idH.dispose();
        return context.newNumber(1);
    });

    registerHostFunction('IsType', () => context.true);
    registerHostFunction('Equals', (a, b) => (context.isEqual(a, b) ? context.true : context.false));
    registerHostFunction('Message', (contentH) => {
        const msg = context.newObject();
        context.setProp(msg, 'content', contentH);
        return msg;
    });

    // Enums
    setEnum('UIAnchor', {
        Center: 0,
        TopLeft: 1,
        TopCenter: 2,
        TopRight: 3,
        CenterLeft: 4,
        CenterRight: 5,
        BottomLeft: 6,
        BottomCenter: 7,
        BottomRight: 8,
    });
    setEnum('UIBgFill', { None: 0, Solid: 1 });
    setEnum('UIDepth', { BehindGameUI: 0, GameUI: 1, AboveGameUI: 2 });
    setEnum('UIButtonEvent', { ButtonDown: 0, ButtonUp: 1, FocusIn: 2, FocusOut: 3 });
    setEnum('UIImageType', { None: 0, Icon: 1 });
    setEnum('Weapons', { M5A3: 1, AK24: 2 });
    setEnum('Gadgets', { Medkit: 1 });
    setEnum('Types', { Player: 1, Team: 2 });

    context.setProp(context.global, 'mod', modObj);
    modObj.dispose();

    function getMemoryUsage(): QuickJSMemoryStats {
        const memHandle = runtime.computeMemoryUsage();
        const mem = context.dump(memHandle) as QuickJSMemoryStats;
        memHandle.dispose();
        return mem;
    }

    function flushJobs(): number {
        let count = 0;
        while (runtime.hasPendingJob()) {
            runtime.executePendingJobs();
            count++;
        }
        return count;
    }

    function evalCode(code: string): void {
        const res = context.evalCode(code);
        if (res.error) {
            const err = context.dump(res.error);
            res.error.dispose();
            throw new Error(`QuickJS Execution Error: ${JSON.stringify(err)}`);
        }
        res.value.dispose();
    }

    function benchmarkScenario(params: {
        scenario: string;
        entities: number | string;
        numericCount?: number;
        unit?: string;
        run: string;
        cleanup?: string;
    }): QuickJSBenchmarkResult {
        flushJobs();
        const baseline = getMemoryUsage();

        evalCode(params.run);
        flushJobs();

        const peak = getMemoryUsage();
        const allocatedBytes = peak.memory_used_size - baseline.memory_used_size;
        const peakObjs = peak.obj_count - baseline.obj_count;
        const peakMalloc = peak.malloc_count - baseline.malloc_count;

        if (params.cleanup) {
            evalCode(params.cleanup);
            flushJobs();
        }

        const post = getMemoryUsage();
        const driftBytes = post.memory_used_size - baseline.memory_used_size;
        const liveObjsDrift = post.obj_count - baseline.obj_count;

        const count = params.numericCount ?? (typeof params.entities === 'number' ? params.entities : 1);
        const perItemVal = allocatedBytes / count;
        const perItemUnit = params.unit ? ` B/${params.unit}` : ' B';

        return {
            Scenario: params.scenario,
            Entities: params.entities,
            'Heap Delta': formatBytes(allocatedBytes),
            'Per-Item': `${perItemVal.toFixed(1)}${perItemUnit}`,
            'Live Objs Delta': peakObjs,
            'Malloc Delta': peakMalloc,
            'Drift After Cleanup': formatBytes(driftBytes),
            'ARC Status':
                liveObjsDrift === 0
                    ? '✓ Zero Drift (100% ARC freed)'
                    : `Δ ${liveObjsDrift} objs (${formatBytes(driftBytes)})`,
        };
    }

    return {
        runtime,
        context,
        evalCode,
        flushJobs,
        getMemoryUsage,
        benchmarkScenario,
        dispose: () => {
            context.dispose();
            runtime.dispose();
        },
    };
}
