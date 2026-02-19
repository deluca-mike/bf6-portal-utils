# Logging Module

<ai>

This TypeScript `Logging` class provides a fail-safe logging abstraction for Battlefield Portal experience developers. It abstracts away the logic to log text and errors to an arbitrary logging method in a fail-safe way, with configurable log level filtering. The class can be used directly within a BF6 Portal experience or can be used within other modules to provide consistent, safe logging functionality.

Key features include fail-safe error handling that prevents logging failures from crashing your mod, configurable log level filtering to control verbosity, optional error message inclusion, support for both synchronous and asynchronous logger functions, and automatic error-to-string conversion that safely handles any error type.

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
    // Set up logging with console.log, minimum log level of Warning, and include errors
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

    /**
     * Re-export LogLevel enum for convenience for controlling logging verbosity.
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

    export function doSomething(): void {
        // Use the logging internally
        logging.log('Doing something', Logging.LogLevel.Info);
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

- **Error Handling** – Errors of any type can be passed to the `log()` method. The class safely converts errors to strings using multiple fallback strategies, ensuring that even malformed error objects can be logged.

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
| `log(text: string, logLevel?: LogLevel, error?: unknown): void` | Logs a message with the specified log level and optional error. The message is only logged if a logger is attached and the log level meets the minimum threshold. If `includeError` is enabled and an error is provided, it will be appended to the message. Default log level is `Warning`. |
| `willLog(logLevel: LogLevel): boolean` | Checks if a message with the given log level would actually be logged. Use this to avoid building expensive log messages when logging is disabled or below the threshold. Returns `true` if logging will occur, `false` otherwise. |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Attaches a logger function and configures the minimum log level and error inclusion. Pass `undefined` for `log` to disable logging. Default log level is `Warning`, default `includeError` is `false`. |

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
    // Set up logging
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
    // Enable error inclusion
    logging.setLogging(
        (text) => console.log(text),
        Logging.LogLevel.Warning,
        true // includeError = true
    );

    try {
        riskyOperation();
    } catch (error) {
        // Error will be appended to the log message
        logging.log('Operation failed', Logging.LogLevel.Error, error);
        // Output: <MyMod> Operation failed - Error: [error message]
    }
}
```

### Conditional Logging with `willLog()`

```ts
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyMod');

export async function OnGameModeStarted(): Promise<void> {
    logging.setLogging((text) => console.log(text), Logging.LogLevel.Warning);

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

async function asyncLogger(text: string): Promise<void> {
    // Simulate async logging (e.g., sending to external service)
    await someAsyncLoggingService.log(text);
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

    // Disable logging by passing undefined
    logging.setLogging(undefined);

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

5. **Optional Error Inclusion** – If `includeError` is enabled and an error is provided to `log()`, the error is converted to a string and appended to the message in the format ` - Error: [error string]`.

---

<ai>

## Known Limitations & Caveats

- **Error String Conversion Limitations** – While the class safely converts errors to strings, complex error objects may lose information in the conversion process. Only the error message (for `Error` instances) or the result of `String()` conversion is preserved. Also, while a logger like `console.log` can easily accept complex and log error objects or strings, other UI loggers (like the `Logger` module) may not, so consider `includeError = false` unless necessary.

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
- See [`FFASpawnPoints`](../ffa-spawn-points/index.ts), [`SolidUI`](../solid-ui/index.ts), and [`UI`](../ui/index.ts) modules for examples of `Logging` integration within modules.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (log aggregation, persistence, formatting options, structured logging, etc.), so please share your experiences.

---
