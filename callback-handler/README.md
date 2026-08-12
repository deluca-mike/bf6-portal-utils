# Callback Handler Module

<ai>

The `CallbackHandler` namespace provides a lightweight utility for safely invoking user callbacks (sync or async) with **zero runtime allocations**. It catches synchronous throws and asynchronous promise rejections, logs them via a passed-in `Logging` instance at `LogLevel.Error`, and does not rethrow—ensuring that a failing callback cannot disrupt host execution.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module and a `Logging` instance:
    ```ts
    import { CallbackHandler } from 'bf6-portal-utils/callback-handler';
    import { Logging } from 'bf6-portal-utils/logging';
    ```
3. When invoking an optional or user-provided callback, use `CallbackHandler.invokeNoArgs()` or `CallbackHandler.invoke()`.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { CallbackHandler } from 'bf6-portal-utils/callback-handler';
import { Logging } from 'bf6-portal-utils/logging';

const logging = new Logging('MyModule');

// Optional callback with up to 4 arguments (zero allocations)
function notifyPlayer(player: mod.Player, message: string): void {
    CallbackHandler.invoke(this._onMessage, player, message, undefined, undefined, logging, 'notifyPlayer');
}

// Optional no-args callback (zero allocations)
function tick(): void {
    CallbackHandler.invokeNoArgs(this._onTick, logging);
}
```

</ai>

---

## API Reference

### `namespace CallbackHandler`

#### Static Methods

| Method | Description |
| --- | --- |
| `invokeNoArgs(callback: (() => Promise<void> \| void) \| null \| undefined, logging: Logging, context?: string): void` | Safely invokes a no-argument callback. Sync errors are caught and logged at `LogLevel.Error`; async rejections are logged via `.catch()`. Does not rethrow. |
| `invoke<T>(callback: T \| null \| undefined, a: unknown, b: unknown, c: unknown, d: unknown, logging: Logging, context?: string): void` | Safely invokes `callback` directly with up to 4 explicit arguments. Avoids rest parameter array creations and spread operator allocations at runtime. |

---

## How It Works

1. **No-op when undefined or null** – If `callback` is `undefined` or `null`, the functions return immediately without calling the logger.
2. **Sync errors** – The callback is run in a `try/catch`. Any thrown value is logged to `logging.log()` at `LogLevel.Error` with the callback's name (or `'anonymous callback'`) and optional `context` prefix, then execution continues.
3. **Async errors** – If the callback returns a `Promise`, its rejection is handled with `.catch()` and logged the same way, preventing unhandled promise rejections.
4. **Zero Allocations** – Both `invoke` and `invokeNoArgs` pass arguments explicitly without creating rest parameter arrays (`...args`) or closure wrappers, resulting in zero runtime garbage collection pressure.

---

## Further Reference

- [Logging module](../logging/README.md) – Used for error reporting; you pass your own `Logging` instance.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.
