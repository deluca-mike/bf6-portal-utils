# Logging Module

<ai>

This TypeScript `Logging` class provides a fail-safe logging abstraction for Battlefield Portal experience developers. It abstracts away the logic to log text and errors to an arbitrary logging function in a fail-safe way, with configurable log level filtering. The class can be used directly within a BF6 Portal experience or can be used within other modules to provide consistent, safe logging functionality.

Key features include fail-safe error handling that prevents logging failures from crashing your mod, configurable log level filtering to control verbosity, optional error message inclusion in the formatted text, support for both synchronous and asynchronous logging functions, automatic error-to-string conversion for that suffix, and a **second callback argument** so your logging function receives the raw `error` value from `log()` (for example `instanceof Error` checks and `stack` access) independent of `includeRawError`.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Logging } from 'bf6-portal-utils/logging';
    ```
3. Create an instance with a unique tag for your module or experience.
4. Configure logging using `setLogging()` to attach your logger function.
5. Use `log()` to write log messages with optional log levels and error information.
6. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example: Direct Usage in Portal Experience

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    // Set up logging with console.log, minimum log level of Warning, and include error messages in the text.
    logging.setLogging((text) => console.log(text), Logging.LogLevel.Warning, true);

    // Log an info message
    logging.log('Game mode started', Logging.LogLevel.Info); // Won't be logged

    if (!someCheck()) {
        // Log an warning message
        logging.log('Some check failed', Logging.LogLevel.Warning);
    }

    // Log an error with an error object
    try {
        someRiskyOperation();
    } catch (error) {
        logging.log('Failed to perform operation', Logging.LogLevel.Error, error);
    }

    // Debug messages won't be logged if log level is Warning or higher
    logging.log('Debug information', Logging.LogLevel.Debug); // Won't be logged
}
```

### Example: Usage Within a Module

```ts
import { Logging } from '../logging/index.ts';

export namespace MyModule {
    const logging = new Logging('MyModule');

    // Re-export LogLevel enum for convenience for controlling logging verbosity.
    export const LogLevel = Logging.LogLevel;

    export function setLogging(
        log?: (text: string, error?: unknown) => Promise<void> | void,
        logLevel?: Logging.LogLevel,
        includeRawError?: boolean
    ): void {
        logging.setLogging(log, logLevel, includeRawError);
    }

    export function doSomething(): void {
        logging.log('Doing something', Logging.LogLevel.Info);
    }

    export function trySomething(): void {
        try {
            somethingThatMightFail();
        } catch (error: unknown) {
            logging.log('Something failed', Logging.LogLevel.Error, error);
        }
    }
}

// Usage in experience:
// MyModule.setLogging((text) => console.log(text), MyModule.LogLevel.Info);
```

</ai>

---

## Core Concepts

- **Fail-Safe Design** – All logging operations are wrapped in try-catch blocks to ensure that logger failures (synchronous or asynchronous) never crash your mod. If a logger throws an error or rejects a promise, the error is caught and logged to the console as a fallback.

- **Log Level Filtering** – Messages are only logged if their log level meets or exceeds the configured minimum log level. This allows you to control verbosity at runtime without modifying code.

- **Error Handling** – Errors of any type can be passed to the `log()` method. The same value is forwarded as the logger callback’s optional second argument (`error?: unknown`), so your sink can inspect real `Error` instances (for example `stack`) or other thrown values. Separately, when `includeRawError` is true, a safe string form of the error is also appended to the first argument (the formatted line).

- **Tagged Logging** – Each instance is created with a unique tag that prefixes all log messages, making it easy to identify the source of log entries in multi-module experiences.

- **Async Logger Support** – Logger functions can return `Promise<void>` or `void`. If a promise is returned, the class handles promise rejections to prevent unhandled promise rejections.

---

## API Reference

### `class Logging`

#### Constructor

| Method | Description |
| --- | --- |
| `constructor(tag: string)` | Creates a new `Logging` instance with the specified tag. The tag will prefix all log messages. |

#### Instance Methods

| Method | Description |
| --- | --- |
| `log(text: string, logLevel?: LogLevel, error?: unknown): void` | Logs a message with the specified log level and optional error. The message is only logged if a logger is attached and the log level meets the minimum threshold. If `includeRawError` is enabled and an error is provided, it will be appended to the message. Default log level is `Warning`. |
| `willLog(logLevel: LogLevel): boolean` | Checks if a message with the given log level would actually be logged. Use this to avoid building expensive log messages when logging is disabled or below the threshold. Returns `true` if logging will occur, `false` otherwise. |
| `setLogging(log?: (text: string, error?: unknown) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Attaches a logger function and configures the minimum log level and error suffix on the formatted text. Pass `undefined` (or `null`) for `log` to disable logging. Default log level is `Warning`, default `includeRawError` is `false`. The callback always receives the formatted message as the first argument; the second is the optional `error` passed to `log()` (same reference/value, not re-stringified by the class beyond the optional suffix in `text`). |

### `namespace Logging`

#### `enum LogLevel`

| Value     | Numeric Value | Description                                                            |
| --------- | ------------- | ---------------------------------------------------------------------- |
| `Debug`   | `0`           | Debug-level messages. Most verbose, typically used during development. |
| `Info`    | `1`           | Informational messages. General operational information.               |
| `Warning` | `2`           | Warning messages. Indicates potential issues or unexpected conditions. |
| `Error`   | `3`           | Error messages. Indicates errors that need attention. Least verbose.   |

Log levels are compared numerically, so `Error` (3) > `Warning` (2) > `Info` (1) > `Debug` (0). Messages are only logged if their log level is greater than or equal to the configured minimum log level.

---

<ai>

## Usage Patterns

### Basic Logging

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    // Set up logging (second callback arg is omitted when log() had no error)
    logging.setLogging((text) => console.log(text), Logging.LogLevel.Info);

    // Log messages at different levels
    logging.log('Debug message', Logging.LogLevel.Debug); // Won't be logged (below Info)
    logging.log('Info message', Logging.LogLevel.Info); // Will be logged
    logging.log('Warning message', Logging.LogLevel.Warning); // Will be logged
    logging.log('Error message', Logging.LogLevel.Error); // Will be logged
}
```

### Error Logging

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    // includeRawError: append a safe string form to `text`; second arg is always the raw value from log()
    logging.setLogging(
        (text, err) => {
            console.log(text);

            if (err instanceof Error) {
                console.log(err.stack ?? err);
            }
        },
        Logging.LogLevel.Warning,
        true // also append " - Error: …" to `text`
    );

    try {
        riskyOperation();
    } catch (error) {
        logging.log('Operation failed', Logging.LogLevel.Error, error);
    }
}
```

### Conditional Logging with `willLog()`

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    logging.setLogging((text) => console.log(text), Logging.LogLevel.Warning); // error param omitted when unused

    // Avoid expensive string building if logging won't occur
    if (logging.willLog(Logging.LogLevel.Debug)) {
        const expensiveData = buildExpensiveDebugString();
        logging.log(expensiveData, Logging.LogLevel.Debug);
    }
}
```

### Async Logger Functions

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

async function asyncLogger(text: string, error?: unknown): Promise<void> {
    // Simulate async logging (e.g., sending to external service)
    await someAsyncLoggingService.log(text, error);
}

export async function OnGameModeStarted(): Promise<void> {
    // Async loggers are fully supported
    logging.setLogging(asyncLogger, Logging.LogLevel.Info);

    // If the async logger rejects, it's caught and logged to console
    logging.log('This will be sent async', Logging.LogLevel.Info);
}
```

### Disabling Logging

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    // Initially enable logging
    logging.setLogging((text) => console.log(text), Logging.LogLevel.Info);

    logging.log('This will be logged', Logging.LogLevel.Info);

    // Disable logging by passing undefined (or null)
    logging.setLogging(null);

    logging.log('This will not be logged', Logging.LogLevel.Info);
}
```

</ai>

---

## How It Works

The `Logging` class implements fail-safe logging with the following mechanisms:

1. **Log Level Filtering** – Before attempting to log, the class checks if a logger is attached and if the message's log level meets the minimum threshold. Messages below the threshold are silently ignored.

2. **Error-to-String Conversion** – The `_safeErrorToString()` method uses multiple fallback strategies to convert errors to strings:
    - First, it checks if the error is an `Error` instance and attempts to read its `message` property
    - If that fails, it attempts a generic `String()` conversion
    - If all else fails, it returns a fallback string like `'[Error object]'` or `'[Unable to stringify error]'`
    - All operations are wrapped in try-catch to ensure the method never throws

3. **Fail-Safe Logger Execution** – The `log()` method wraps logger execution in a try-catch block:
    - If the logger is synchronous and throws, the error is caught and logged to `console.log` as a fallback
    - If the logger returns a `Promise`, the promise rejection is caught and logged to `console.log` to prevent unhandled promise rejections
    - This ensures that logger failures never crash your mod

4. **Tagged Messages** – All log messages are prefixed with `<tag>` where `tag` is the value provided to the constructor. This makes it easy to identify the source of log entries in multi-module experiences.

5. **Optional Error Inclusion in Text** – If `includeRawError` is enabled and an error is provided to `log()`, `_safeErrorToString()` is used and the result is appended to the first callback argument in the format ` - Error: [error string]`.

6. **Raw Error Forwarding** – Regardless of `includeRawError`, the logger is invoked as `logger(formattedText, error)` where `error` is the same optional third argument passed to `log()` (`undefined` if omitted). Your implementation can branch on `instanceof Error` to read `stack`, or handle non-`Error` throws (like Promise rejections) without losing the original value.

---

<ai>

## Known Limitations & Caveats

- **Error String Conversion vs Raw Value** – The suffix appended to `text` when `includeRawError` is true uses `_safeErrorToString()` only (message for `Error`, else `String()`, with fallbacks). Rich fields are not serialized there. Use the callback’s second argument when you need the original thrown value, `Error.stack`, or custom error types.

- **Sinks That Only Accept Strings** – If your backend or UI logger cannot accept arbitrary `unknown` values, ignore the second parameter and rely on `text` only; set `includeRawError = true` if you need a short string summary on the line.

- **Async Logger Timing** – If a logger function returns a `Promise`, the `log()` method does not await it. The promise is handled in a fire-and-forget manner to prevent blocking. This means you cannot rely on the log operation completing before your code continues.

</ai>

---

## Future Work

The following features are planned for upcoming releases:

### Log Formatting Options

Currently, the the message format is fixed: `<tag> message - Error: [error]`, but a future release will allow custom formatting, timestamps, or structured logging.

### mod.Message Support

Support for error messages in the `mod.Message` type to allow displaying via logging functions that publish to any of Portal's native UI components (i.e. `mod.SendErrorReport`, `mod.DisplayCustomNotificationMessage`, etc).

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
- See [`FFASpawnPoints`](../ffa-spawn-points/index.ts), [`Solid`](../solid/index.ts), and [`UI`](../ui/index.ts) modules for examples of `Logging` integration within modules.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (log aggregation, persistence, formatting options, structured logging, etc.), so please share your experiences.

---
