# Sounds Module

<ai>

This TypeScript `Sounds` namespace wraps Battlefield Portal’s SFX workflow: it spawns `mod.SFX` objects, plays them in 2D or 3D with optional per-player, per-squad, or per-team routing, and supports timed playback, stepped fades, and cleanup. The module builds on the [`Timers`](../timers/README.md) module for delays and fades (Portal’s runtime has no native `setTimeout`), and uses the [`Logging`](../logging/README.md) module for optional play logging.

Use **`Sound2D`** for non-positional audio and **`Sound3D`** for world-positioned audio with attenuation. For fire-and-forget clips, call **`Sound2D.play()`** or **`Sound3D.play()`**, which return a **`stop`** function—keep it and call it when playback should end if you did not pass a finite **`duration`** (or a fade that ends with **`stopOnComplete`**) so the instance can **`dispose()`** and unspawn the SFX. For long-lived or manually controlled sounds, construct **`new Sound2D(...)`** or **`new Sound3D(...)`** and call **`play()`**, **`stop()`**, **`fade()`**, and **`dispose()`** as needed.

> **Resource leaks.** Each sound instance wraps a spawned **`mod.SFX`**. That object is only **`UnspawnObject`**’d when **`dispose()`** runs (directly or via the one-shot **`stop`** callback). If you **never** call **`dispose()`** on an instance you created, **never** call the **`stop`** function returned from **`Sound2D.play`** / **`Sound3D.play`**, and for a one-shot you **omit** **`duration`** and **do not** supply **`fadeOptions`** that imply a bounded end (e.g. **`stopOnComplete: true`** with a completing fade), the underlying SFX **stays spawned**—a **resource leak** for the rest of the match (or until the experience ends). Always tie cleanup to player leave, UI teardown, game phase changes, or a fixed **`duration`**.

> **Choosing `RuntimeSpawn_Common` SFX values.** In **`bf6-portal-mod-types`**, entries under **`mod.RuntimeSpawn_Common`** that are sound effects all use the **`SFX_`** prefix. For this module, pick names that match the playback mode: **`Sound3D`** expects assets whose names end with **`_SimpleLoop3D`** or **`_OneShot3D`**; **`Sound2D`** expects names ending with **`_SimpleLoop2D`** or **`_OneShot2D`**. Using the wrong variant can yield incorrect or silent behavior in-game.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the namespace in your code:
    ```ts
    import { Sounds } from 'bf6-portal-utils/sounds';
    ```
3. Use a **`mod.RuntimeSpawn_Common`** SFX asset: names start with **`SFX_`**; use **`_SimpleLoop2D`** / **`_OneShot2D`** with **`Sound2D`** and **`_SimpleLoop3D`** / **`_OneShot3D`** with **`Sound3D`** (see callout above).
4. Either call **`Sounds.Sound2D.play()`** / **`Sounds.Sound3D.play()`** for one-shots (and retain the returned **`stop`** function), or **`new Sounds.Sound2D()`** / **`new Sounds.Sound3D()`** for instance-based control.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example: one-shot with fixed duration

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// In your mod: `sfxAsset` is a `mod.RuntimeSpawn_Common` 3D SFX (e.g. ..._OneShot3D); `worldPosition` is `mod.Vector`.
// Optional: Info-level logs when sounds play (see Sounds.setLogging)
Sounds.setLogging((text) => console.log(text), Sounds.LogLevel.Info);

const stopExplosion = Sounds.Sound3D.play(sfxAsset, worldPosition, {
    duration: 3_000,
    amplitude: 1.0,
    attenuationRange: 25,
});

// If you need to cut it short (also cancels the internal auto-dispose timer):
// stopExplosion();
```

### Example: looping / indefinite one-shot (must call `stop`)

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// In your mod: `sfxAsset` is a 2D SFX (e.g. ..._SimpleLoop2D); `somePlayer` is `mod.Player`.
// Omit `duration` for indefinite playback. You MUST keep and call `stop` to unspawn the SFX.
const stopAlarm = Sounds.Sound2D.play(sfxAsset, {
    target: somePlayer,
    amplitude: 0.8,
});

// Later (e.g. when leaving deploy screen or ending the objective)
stopAlarm();
```

### Example: instance-based playback

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// In your mod: `sfxAsset` is a 3D SFX enum value; `poiPosition` is `mod.Vector`.
const ambience = new Sounds.Sound3D(sfxAsset, poiPosition, {
    amplitude: 0.5,
    attenuationRange: 15,
});

// Start playback, then fade out over 4s (fade calls `stop()` when amplitude hits 0).
ambience.play().fade({ duration: 4_000 });

// `stop()` does not unspawn the SFX. When this instance is no longer needed (e.g. player left, objective ended), call
// `ambience.dispose()`. This is not shown here because it must run after you are done with playback, not immediately
// after `play()` / `fade()`.
```

</ai>

---

## Core Concepts

- **SFX spawn assets** – Use **`mod.RuntimeSpawn_Common`** entries prefixed with **`SFX_`**. Match the suffix to the class: **`_SimpleLoop2D`** / **`_OneShot2D`** for **`Sound2D`**; **`_SimpleLoop3D`** / **`_OneShot3D`** for **`Sound3D`**.
- **2D vs 3D** – `Sound2D` spawns the SFX at the origin with zero rotation (positional args required by `SpawnObject`); playback uses `PlaySound` without a world position. `Sound3D` spawns at a real world position and uses that position and an **attenuation range** (meters, default **10**) for distance falloff.
- **Audience routing** – Optional **`target`** in constructor options: `mod.Player`, `mod.Squad`, or `mod.Team`. If omitted, **all players** hear the sound (subject to 3D attenuation for `Sound3D`).
- **Amplitude** – Default **1.0**. While playing, updates go through `mod.SetSoundAmplitude`. The **`fade()`** helper steps amplitude down (or up) over time using **`Timers.setTimeout`**.
- **Playback timing** – **`play(duration?)`**: if **`duration` is `undefined`**, no auto-**`stop`** is scheduled (infinite until you **`stop()`** or **`dispose()`**). If **`duration` is any number (including `0`)**, a timer calls **`stop()`** after that many milliseconds (`0` is effectively immediate).
- **One-shot helpers** – **`Sound2D.play`** / **`Sound3D.play`** take **`OneShotOptions2D`** / **`OneShotOptions3D`** (see [Types](#types)). They return **`() => void`** that clears the internal auto-dispose timer (if any), **`stop()`**s, and **`dispose()`**s. If **`duration`** is omitted **and** the fade does not imply a bounded end, **no** auto-dispose runs—you **must** call the returned function or you **leak** the SFX spawn (see note at top).
- **Cleanup** – **`stop()`** stops playback but **does not** **`UnspawnObject`** the SFX. **`dispose()`** unspawns the underlying `mod.SFX` once (and **`stop()`**s first if still playing). It is safe to call **`stop()`** on an already stopped sound (no-op). Calling the one-shot **`stop`** multiple times is safe after the first full teardown. Instance owners **must** call **`dispose()`** when the instance is no longer needed (construction always spawns).
- **Logging** – **`Sounds.setLogging()`** configures the shared logger; play paths can emit **Info**-level messages when enabled (see implementation for details).

---

## API Reference

### `namespace Sounds`

The namespace is not instantiated; exported members are types, classes, and **`setLogging`**.

#### `Sounds.LogLevel`

Re-exported from the **`Logging`** module for use with **`Sounds.setLogging()`**. See the [`Logging` module documentation](../logging/README.md) for levels (`Debug`, `Info`, `Warning`, `Error`).

#### Static methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeError?: boolean): void` | Configures logging for the Sounds module. Pass **`undefined`** for **`log`** to disable. Default minimum level and **`includeError`** follow the same pattern as other utils modules; see [`Logging`](../logging/README.md). |

#### Classes

##### `Sounds.Sound2D`

| Member | Description |
| --- | --- |
| `static play(sfxAsset, options?): () => void` | Creates a 2D sound, plays it according to **`OneShotOptions2D`**, and returns **`stop`**. Call **`stop`** to end playback, cancel the internal auto-dispose timeout (if scheduled), and **`dispose()`** the instance. |
| `constructor(sfxAsset, options?)` | Creates a 2D sound instance; spawns the SFX immediately. Options: **`Options2D`** (`amplitude`, `target`). |
| `play(duration?: number): this` | Starts or restarts playback; optional **`duration`** in ms (see Core Concepts). |
| `stop(): this` | Stops playback and clears stop/fade timers. |
| `fade(options?: Sounds.FadeOptions): this` | Steps amplitude toward **`targetAmplitude`** (default **0**) over **`duration`** ms (default **2000**), after optional **`delay`**. Non-positive **`steps`** in options are treated as **1**. If **`stopOnComplete`** (default **`true`** when target amplitude is **0**), **`stop()`** runs when the fade finishes. No-op if not playing. |
| `cancelStop()` / `cancelFade(): this` | Clears the auto-stop or fade timeout chain. |
| `dispose(): void` | If playing, cancels timers and **`stop()`**s. Then **`UnspawnObject`** the SFX once if not already disposed (also runs when not playing). |
| `disposed`, `playing`, `sfxAsset`, `amplitude`, `target` | Getters; **`amplitude`** has a setter and **`setAmplitude`** for chaining. |

##### `Sounds.Sound3D`

Same instance API as **`Sound2D`**, plus:

| Member | Description |
| --- | --- |
| `static play(sfxAsset, position, options?): () => void` | One-shot 3D playback; options are **`OneShotOptions3D`** (includes **`attenuationRange`**). |
| `constructor(sfxAsset, position, options?)` | **`position`** is the world location for spawn and **`PlaySound`**. **`attenuationRange`** defaults to **10** meters if omitted. |
| `location` | Getter for the world position vector. |
| `attenuationRange` | Getter/setter; **`setAttenuationRange`** for chaining. |

---

## Types

### `Sounds.FadeOptions`

| Property | Default | Description |
| --- | --- | --- |
| `delay` | `0` | Ms before the first amplitude step. |
| `duration` | `2000` | Total fade duration in ms. |
| `targetAmplitude` | `0` | Amplitude at end of fade. |
| `steps` | `10` | Number of steps; values **≤ 0** are clamped to **1**. |
| `stopOnComplete` | `true` if `targetAmplitude === 0`, else `false` | Whether **`stop()`** runs when the fade completes. |

### `Sounds.Options2D`

| Property | Default | Description |
| --- | --- | --- |
| `amplitude` | `1` | Playback amplitude. |
| `target` | _(all players)_ | Optional **`mod.Player`**, **`mod.Squad`**, or **`mod.Team`**; only that audience hears the sound. |

### `Sounds.OneShotOptions2D`

Used with **`Sound2D.play()`**. Combines **`Options2D`** with one-shot-only fields:

| Property | Description |
| --- | --- |
| `duration` | Optional ms cap on playback. **Omit** for indefinite duration (you **must** call the returned **`stop`** or the SFX is **not** unspawned). **`0`** schedules an immediate **`stop`**. |
| `fadeOptions` | Optional **`Sounds.FadeOptions`**. When the fade completes with **`stopOnComplete`**, teardown time is bounded and an auto-dispose timer may run (together with **`duration`** when both apply). |

### `Sounds.Options3D`

**`Options2D`** plus:

| Property           | Default | Description                     |
| ------------------ | ------- | ------------------------------- |
| `attenuationRange` | `10`    | Distance attenuation in meters. |

### `Sounds.OneShotOptions3D`

Used with **`Sound3D.play()`**. Same shape as **`OneShotOptions2D`**, including **`Options3D`** fields (**`attenuationRange`** optional on the static **`play`** options object; same rules as **`Options3D`**).

---

## Usage Patterns

- **Short cues** – Use **`play(asset, pos?, { duration: N })`** so the instance disposes shortly after **`N`** ms (plus a small internal buffer).
- **Deploy screen / UI loops** – Use indefinite **`play`** and store **`stop`**; call it when the player leaves the screen or you hide the UI.
- **World ambience** – Hold a **`Sound3D`** instance, **`play()`** without duration, **`fade()`** or **`dispose()`** when the area unloads.
- **Per-player feedback** – Pass **`target: player`** (or squad/team) in options so only that audience hears the clip.

---

## How It Works

1. **Construction** – Each sound calls **`mod.SpawnObject`** with the given **`RuntimeSpawn_Common`** asset. **`Sound2D`** uses **`Vectors.ZERO_VECTOR`** for position/orientation as required; **`Sound3D`** uses your **`position`** and zero rotation for spawn.
2. **Play** – Delegates to the appropriate **`mod.PlaySound`** overload (global vs player/squad/team), using the current **`amplitude`** and, for 3D, **`position`** and **`attenuationRange`**.
3. **Timed stop** – **`Timers.setTimeout`** invokes **`stop()`** when **`duration`** is provided to **`play()`** or computed for one-shots.
4. **Fade** – Schedules a chain of timeouts: each step adjusts **`amplitude`** (and thus **`SetSoundAmplitude`** while playing) until the target step count is reached.
5. **One-shot teardown** – When a finite end time is known (from **`duration`** and/or a completing fade with **`stopOnComplete`**), an extra timeout runs **`stop`** + **`dispose`** after a short buffer (**100** ms) so **`StopSound`** / fade completion can settle. The returned **`stop`** clears that timeout first to avoid redundant work.
6. **Dispose** – **`mod.UnspawnObject`** on the SFX object; guarded so it runs once.

---

## Known Limitations & Caveats

- **Resource leaks** – Failure to **`dispose()`** instance sounds, or to call the one-shot **`stop`** when **`duration`** is omitted and no completing fade with **`stopOnComplete`** bounds playback, leaves the **`mod.SFX`** spawned until the match ends. See the callout in the [introduction](#sounds-module).
- **Indefinite one-shots** – If you omit **`duration`** and there is no bound from **`fadeOptions`**, you **must** call the returned **`stop`** function (or the spawned object is not torn down by this module).
- **`duration: 0`** – Treated as a real timeout of zero ms (immediate **`stop`**), not “infinite.”
- **Timer precision** – Delays use the shared **`Timers`** module (built on **`mod.Wait`**), so sub-second behavior is subject to the same precision as elsewhere in your mod.
- **No built-in preload** – This module does not wrap a preload API; spawn/play cost happens on construction / **`play`** as with raw Portal usage.
- **Logging volume** – **`Info`** play logs can be chatty; use **`willLog`**-appropriate levels in production if you enable logging.

---

## Further Reference

- [`Logging` module](../logging/README.md) – Shared logging configuration.
- [`Timers` module](../timers/README.md) – Used for playback timeouts and fade steps.
- [`Vectors` module](../vectors/README.md) – Zero vector and vector string helpers used internally.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – **`RuntimeSpawn_Common`**, **`PlaySound`**, **`SFX`**, and related declarations.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – Bundler for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap, so please share your experiences.

---
