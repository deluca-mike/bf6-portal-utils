# Callback Handler Module

<ai>

The `CallbackHandler` namespace provides a small utility for safely invoking user callbacks (sync or async). It catches synchronous throws and asynchronous promise rejections, logs them via a passed-in `Logging` instance, and does not rethrow—so a failing callback cannot kill the execution of the calling logic. Other modules in this repo (e.g. Timers, Events, UI, Raycast, Clocks) use it internally; you can use it in your own modules when invoking optional or user-provided callbacks.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module and a `Logging` instance:
    ```ts
    import { CallbackHandler } from 'bf6-portal-utils/callback-handler';
    import { Logging } from 'bf6-portal-utils/logging';
    ```
3. When invoking an optional or user-provided callback, use `CallbackHandler.invoke()` or `CallbackHandler.invokeNoArgs()` instead of calling the callback directly.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { CallbackHandler } from 'bf6-portal-utils/callback-handler';
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyModule');

// Optional callback with arguments
function notifyPlayer(player: mod.Player, message: string): void {
    CallbackHandler.invoke(this._onMessage, [player, message], 'onMessage', logging, Logging.LogLevel.Error);
}

// Optional no-args callback (e.g. timer tick, event fired)
function tick(): void {
    CallbackHandler.invokeNoArgs(this._onTick, 'onTick', logging, Logging.LogLevel.Error);
}
```

</ai>

---

## API Reference

### `namespace CallbackHandler`

#### Static Methods

| Method | Description |
| --- | --- |
| `invoke<T>(callback: T \| undefined, args: Parameters<T>, errorContext: string, logging: Logging, logLevel?: Logging.LogLevel): void` | Invokes `callback` with `args` if defined. Handles both synchronous and asynchronous callbacks (returning `void` or `Promise<void>`). Sync errors are caught and logged with the given `errorContext`; async rejections are logged via `.catch()`. Does not rethrow. Default `logLevel` is `Logging.LogLevel.Error`. |
| `invokeNoArgs(callback: (() => Promise<void> \| void) \| undefined, errorContext: string, logging: Logging, logLevel?: Logging.LogLevel): void` | Convenience wrapper that invokes a no-argument callback. Equivalent to `invoke(callback, [], errorContext, logging, logLevel)`. |

---

## How It Works

1. **No-op when undefined** – If `callback` is `undefined`, the functions return immediately without calling the logger.
2. **Sync errors** – The callback is run in a `try/catch`. Any thrown value is passed to `logging.log()` with the provided `errorContext` and `logLevel`, then execution continues.
3. **Async errors** – If the callback returns a `Promise`, its rejection is handled with `.catch()` and logged the same way, avoiding unhandled promise rejections.

Using `CallbackHandler` ensures that a single bad callback does not break the rest of your mod; errors are isolated and reported through your existing logging setup.

---

## Further Reference

- [Logging module](../logging/README.md) – Used for error reporting; you pass your own `Logging` instance.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
