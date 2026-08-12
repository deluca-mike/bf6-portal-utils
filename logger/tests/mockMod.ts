import '../../ui/tests/mockMod.ts';
import stringsJson from '../strings.json' with { type: 'json' };

const modGlobal = globalThis as unknown as {
    mod: {
        stringkeys: Record<string, unknown>;
        Message: (content: unknown, ...args: unknown[]) => unknown;
        UIBgFill: Record<string, number>;
    };
};

modGlobal.mod.stringkeys = modGlobal.mod.stringkeys || {};
modGlobal.mod.stringkeys.logger = stringsJson.logger;
modGlobal.mod.Message = (content: unknown, ...args: unknown[]) => ({ content, args });
modGlobal.mod.UIBgFill = {
    ...modGlobal.mod.UIBgFill,
    Blur: 2,
};

export {};
