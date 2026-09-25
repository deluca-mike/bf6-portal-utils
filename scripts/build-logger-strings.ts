import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loggerPath = path.resolve(__dirname, '../logger/index.ts');
const loggerSource = fs.readFileSync(loggerPath, 'utf8');

const match = loggerSource.match(/CENSORED_CHARS\s*=\s*(\[[^\]]*\])/);

if (!match) throw new Error(`Could not find CENSORED_CHARS array in ${loggerPath}`);

const censoredChars = new Function(`return ${match[1]}`)() as readonly string[];
console.log(`Found CENSORED_CHARS in Logger:`, censoredChars);

const safePairsMatch = loggerSource.match(/SAFE_CENSORED_PAIRS\s*=\s*(\[[^\]]*\])/);

if (!safePairsMatch) throw new Error(`Could not find SAFE_CENSORED_PAIRS array in ${loggerPath}`);

const safePairs = new Function(`return ${safePairsMatch[1]}`)() as readonly string[];
console.log(`Found SAFE_CENSORED_PAIRS in Logger:`, safePairs);

const exoticCharsMatch = loggerSource.match(/EXOTIC_CHARS\s*=\s*(\[[^\]]*\])/);

if (!exoticCharsMatch) throw new Error(`Could not find EXOTIC_CHARS array in ${loggerPath}`);

const exoticChars = new Function(`return ${exoticCharsMatch[1]}`)() as readonly string[];
console.log(`Found EXOTIC_CHARS in Logger: ${exoticChars.length} characters`);

// All printable ASCII characters from 0x20 (' ') to 0x7E ('~')
const ALL_CHARS: string[] = [];
for (let code = 32; code <= 126; code++) {
    ALL_CHARS.push(String.fromCharCode(code));
}

const censoredSet = new Set<string>(censoredChars);

const format: Record<string, string> = {
    badFormat: '_<Bad Format>_',
};

for (const char of ALL_CHARS) {
    if (censoredSet.has(char)) continue;

    format[`${char}2`] = `${char}{}`;
    format[`${char}3`] = `${char}{}{}`;
    format[`${char}4`] = `${char}{}{}{}`;
}

const chars: Record<string, string> = {};

// 1. Single non-censored characters
for (const char of ALL_CHARS) {
    if (censoredSet.has(char)) continue;

    chars[char] = char;
}

// 2. Single exotic characters (standalone only)
for (const char of exoticChars) {
    chars[char] = char;
}

// 3. Safe 2-character pairs for censored characters:
//    - Doubled character (e.g. "ff", "FF")
//    - Natural safe punctuation pairs (e.g. "f=", "f:", etc.)
for (const censoredChar of censoredChars) {
    const doublePair = censoredChar + censoredChar;
    chars[doublePair] = doublePair;

    for (const secondChar of safePairs) {
        const pair = censoredChar + secondChar;
        chars[pair] = pair;
    }
}

const stringsJson = {
    logger: {
        format,
        chars,
    },
};

const targetPath = path.resolve(__dirname, '../logger/strings.json');

fs.writeFileSync(targetPath, JSON.stringify(stringsJson, null, 4) + '\n', 'utf8');

console.log(
    `Generated ${targetPath} successfully with ${Object.keys(chars).length} chars and ${Object.keys(format).length} format keys.`
);
