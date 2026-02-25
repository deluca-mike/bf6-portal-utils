import { Logging } from '../logging/index.ts';

// version: 1.0.0
export namespace LocalizedMessages {
    const logging = new Logging('LM');

    /**
     * Log levels for controlling logging verbosity.
     */
    export const LogLevel = Logging.LogLevel;

    /**
     * Attaches a logger and defines a minimum log level and whether to include the runtime error in the log.
     * @param log - The logger function to use. Pass undefined to disable logging.
     * @param logLevel - The minimum log level to use.
     * @param includeError - Whether to include the runtime error in the log.
     */
    export function setLogging(
        log?: (text: string) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeError);
    }

    //#region Types
    /**
     * A string key proxy for any string in `mod.stringkeys`.
     */
    export type Stringkey = {
        [key: string]: Stringkey;
    };

    type StringkeyWithPath = Stringkey & {
        _path: string[];
    };

    /**
     * The locales supported by the localized messages system.
     */
    export type Locale =
        | '_aa'
        | '_af'
        | '_am'
        | '_ar'
        | '_ay'
        | '_az'
        | '_be'
        | '_bg'
        | '_bi'
        | '_bn'
        | '_bs'
        | '_byn'
        | '_ca'
        | '_ch'
        | '_cs'
        | '_da'
        | '_de'
        | '_dv'
        | '_dz'
        | '_el'
        | '_en'
        | '_es'
        | '_et'
        | '_fa'
        | '_fan'
        | '_ff'
        | '_fi'
        | '_fj'
        | '_fo'
        | '_fr'
        | '_ga'
        | '_gn'
        | '_gv'
        | '_he'
        | '_hi'
        | '_hif'
        | '_hr'
        | '_ht'
        | '_hu'
        | '_hy'
        | '_id'
        | '_is'
        | '_it'
        | '_ja'
        | '_ka'
        | '_kg'
        | '_kk'
        | '_kl'
        | '_km'
        | '_ko'
        | '_ku'
        | '_kun'
        | '_ky'
        | '_la'
        | '_lb'
        | '_ln'
        | '_lo'
        | '_lt'
        | '_lu'
        | '_lv'
        | '_mg'
        | '_mh'
        | '_mi'
        | '_mk'
        | '_mn'
        | '_ms'
        | '_mt'
        | '_my'
        | '_na'
        | '_nb'
        | '_nd'
        | '_ne'
        | '_nl'
        | '_nn'
        | '_no'
        | '_nr'
        | '_nrb'
        | '_ny'
        | '_pa'
        | '_pl'
        | '_ps'
        | '_pt'
        | '_qu'
        | '_rar'
        | '_rm'
        | '_rn'
        | '_ro'
        | '_rtm'
        | '_ru'
        | '_rw'
        | '_sg'
        | '_si'
        | '_sk'
        | '_sl'
        | '_sm'
        | '_sn'
        | '_so'
        | '_sq'
        | '_sr'
        | '_ss'
        | '_ssy'
        | '_st'
        | '_sv'
        | '_sw'
        | '_ta'
        | '_tg'
        | '_th'
        | '_ti'
        | '_tig'
        | '_tk'
        | '_tn'
        | '_to'
        | '_tr'
        | '_ts'
        | '_uk'
        | '_ur'
        | '_uz'
        | '_ve'
        | '_vi'
        | '_xh'
        | '_zh'
        | '_zu';
    //#endregion

    let locale: Locale = '_en';
    let fallbackLocale: Locale = '_en';

    /**
     * Sets the locale.
     * @param locale - The new locale.
     */
    export function setLocale(newLocale: Locale): void {
        locale = newLocale;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Locale set to ${locale}.`, LogLevel.Info);
        }
    }

    /**
     * Sets the fallback locale.
     * @param fallbackLocale - The new fallback locale.
     */
    export function setFallbackLocale(newFallbackLocale: Locale): void {
        fallbackLocale = newFallbackLocale;

        if (logging.willLog(LogLevel.Info)) {
            logging.log(`Fallback locale set to ${fallbackLocale}.`, LogLevel.Info);
        }
    }

    /**
     * @returns The current locale.
     */
    export function getLocale(): Locale {
        return locale;
    }

    /**
     * @returns The current fallback locale.
     */
    export function getFallbackLocale(): Locale {
        return fallbackLocale;
    }

    export const strings = createStringkeysProxy([]);

    function stringkeysProxyGet(target: Stringkey, prop: string | symbol): Stringkey | string[] {
        const path = (target as StringkeyWithPath)._path ?? [];
        return prop === '_path' ? path : createStringkeysProxy([...path, String(prop)]);
    }

    const stringkeysProxyHandler: ProxyHandler<Stringkey> = {
        get: stringkeysProxyGet,
    };

    function createStringkeysProxy(path: string[]): Stringkey {
        return new Proxy<StringkeyWithPath>({ _path: path } as StringkeyWithPath, stringkeysProxyHandler);
    }

    function resolveStringkeysProxy(
        stringkey: StringkeyWithPath,
        undefinedErrorString: string = mod.stringkeys.localizedMessages.undefinedStringKey,
        localeNotFoundErrorString: string = mod.stringkeys.localizedMessages.localeNotFound
    ): string {
        const path = stringkey._path ?? [];
        let current = mod.stringkeys;

        logging.log(`Resolving stringkeys proxy for path: ${path.join('.')}`, LogLevel.Debug);

        for (const key of path) {
            logging.log(`Checking key: ${key}`, LogLevel.Debug);

            if (typeof current === 'object') {
                current = current[key];
                continue;
            }

            current = undefined;
            break;
        }

        if (typeof current === 'string') return current;

        if (typeof current !== 'object') {
            logging.log(`String not found: ${path.join('.')}`, LogLevel.Warning);
            return undefinedErrorString;
        }

        // If the value has the current locale key, return the translated string.
        if (typeof current[locale] === 'string') return current[locale];

        // If the value has the fallback locale key, return the translated string.
        if (typeof current[fallbackLocale] === 'string') return current[fallbackLocale];

        // A locale we're looking for was not found.
        logging.log(`Locales ${locale} and ${fallbackLocale} not found for string ${path.join('.')}`, LogLevel.Warning);
        return localeNotFoundErrorString;
    }

    function resolveArg(
        arg: Stringkey | number | mod.Player,
        undefinedErrorString?: string,
        localeNotFoundErrorString?: string
    ): string | number | mod.Player {
        if (typeof arg === 'number') {
            return arg;
        }

        if ((arg as StringkeyWithPath)._path) {
            return resolveStringkeysProxy(arg as StringkeyWithPath, undefinedErrorString, localeNotFoundErrorString);
        }

        return arg as mod.Player;
    }

    /**
     * Creates a Message with a single argument.
     * @param arg0 - The argument.
     * @returns The created Message.
     */
    export function createMessage(arg0: Stringkey | number | mod.Player): mod.Message;

    /**
     * Creates a Message with two arguments.
     * @param arg0 - The first argument (can be a template Stringkey with a single {} placeholder).
     * @param arg1 - The second argument.
     * @returns The created Message.
     */
    export function createMessage(
        arg0: Stringkey | number | mod.Player,
        arg1: Stringkey | number | mod.Player
    ): mod.Message;

    /**
     * Creates a Message with three arguments.
     * @param arg0 - The first argument (can be a template Stringkey with two {} placeholders).
     * @param arg1 - The second argument.
     * @param arg2 - The third argument.
     * @returns The created Message.
     */
    export function createMessage(
        arg0: Stringkey | number | mod.Player,
        arg1: Stringkey | number | mod.Player,
        arg2: Stringkey | number | mod.Player
    ): mod.Message;

    /**
     * Creates a Message with four arguments.
     * @param arg0 - The first argument (can be a template Stringkey with three {} placeholders).
     * @param arg1 - The second argument.
     * @param arg2 - The third argument.
     * @param arg3 - The fourth argument.
     * @returns The created Message.
     */
    export function createMessage(
        arg0: Stringkey | number | mod.Player,
        arg1: Stringkey | number | mod.Player,
        arg2: Stringkey | number | mod.Player,
        arg3: Stringkey | number | mod.Player
    ): mod.Message;

    export function createMessage(
        arg0: Stringkey | number | mod.Player,
        arg1?: Stringkey | number | mod.Player,
        arg2?: Stringkey | number | mod.Player,
        arg3?: Stringkey | number | mod.Player
    ): mod.Message {
        if (arg1 === undefined) {
            return mod.Message(resolveArg(arg0));
        }

        if (arg2 === undefined) {
            return mod.Message(
                resolveArg(
                    arg0,
                    mod.stringkeys.localizedMessages.undefinedStringKey1,
                    mod.stringkeys.localizedMessages.localeNotFound1
                ),
                resolveArg(arg1)
            );
        }

        if (arg3 === undefined) {
            return mod.Message(
                resolveArg(
                    arg0,
                    mod.stringkeys.localizedMessages.undefinedStringKey2,
                    mod.stringkeys.localizedMessages.localeNotFound2
                ),
                resolveArg(arg1),
                resolveArg(arg2)
            );
        }

        return mod.Message(
            resolveArg(
                arg0,
                mod.stringkeys.localizedMessages.undefinedStringKey3,
                mod.stringkeys.localizedMessages.localeNotFound3
            ),
            resolveArg(arg1),
            resolveArg(arg2),
            resolveArg(arg3)
        );
    }
}
