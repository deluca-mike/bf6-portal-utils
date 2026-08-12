# Sounds Module

<ai>

This TypeScript `Sounds` namespace wraps Battlefield Portal’s SFX workflow into a pure functional decorator API around native `mod.SFX` spatial objects. It creates spatial sounds, routes playback to specific audiences (players, squads, or teams), handles stepped volume fading, timed stops, and automatic cleanup. The module builds on the [`Timers`](../timers/README.md) module for delays/fades and uses the [`Logging`](../logging/README.md) module for optional diagnostics.

Use **`Sounds.create()`** to spawn a native `mod.SFX` object, or pass any existing `mod.SFX` (from map fixtures or other modules) into **`Sounds.play()`**, **`Sounds.stop()`**, **`Sounds.fade()`**, and **`Sounds.dispose()`**. For fire-and-forget one-shots, call **`Sounds.playOneShot()`** which creates, plays, and automatically unspawns the sound upon duration expiry.

> **Resource Management.** Sounds created with `Sounds.create()` or `mod.SpawnObject()` remain active on the server until **`Sounds.dispose(sfx)`** or **`mod.UnspawnObject(sfx)`** is called. Fire-and-forget sounds created via **`Sounds.playOneShot()`** are automatically disposed upon duration expiry. Always dispose long-lived sounds when their lifecycle ends (e.g. game phase transition or player leave).

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the namespace in your code:
    ```ts
    import { Sounds } from 'bf6-portal-utils/sounds';
    ```
3. Use a **`mod.RuntimeSpawn_Common`** SFX asset: names start with **`SFX_`**; use `_SimpleLoop2D` / `_OneShot2D` for non-positional audio, or `_SimpleLoop3D` / `_OneShot3D` for 3D positional audio.
4. Call **`Sounds.playOneShot()`** for fire-and-forget sounds, or **`Sounds.create()`** + **`Sounds.play()`** for manual lifecycle control.
5. Bundle with [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) as usual.

<ai>

### Example: fire-and-forget one-shot

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// Plays a 3D explosion sound for 3 seconds, then automatically unspawns/disposes it:
Sounds.playOneShot(mod.RuntimeSpawn_Common.SFX_Explosions_Large_OneShot3D, 3_000, 1.0, {
    position: mod.CreateVector(100, 20, -50),
    attenuationRange: 50,
});
```

### Example: one-shot with automatic fade

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// Plays a 2D sound for 5 seconds that automatically begins fading out after 2 seconds:
Sounds.playOneShot(mod.RuntimeSpawn_Common.SFX_UI_EOR_Counting_SimpleLoop2D, 5_000, 0.8, {
    fadeOptions: {
        delay: 2_000,
        duration: 3_000,
        targetAmplitude: 0,
        stopOnComplete: true,
    },
});
```

### Example: persistent spatial sound manipulation

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// 1. Create native mod.SFX spatial object:
const alarmSFX = Sounds.create(
    mod.RuntimeSpawn_Common.SFX_GameModes_Rush_Alarm_SimpleLoop3D,
    mod.CreateVector(0, 5, 0)
);

// 2. Play it with an initial attenuation range:
Sounds.play(alarmSFX, 1.0, { attenuationRange: 30 });

// 3. Move the spatial object natively or via a spatial physics library:
mod.MoveObjectOverTime(alarmSFX, mod.CreateVector(20, 5, 0), mod.CreateVector(0, 0, 0), 5, false, false);

// 4. Smoothly fade it out:
Sounds.fade(alarmSFX, {
    startAmplitude: 1.0,
    targetAmplitude: 0,
    duration: 3_000,
    stopOnComplete: true,
});

// 5. Clean up when no longer needed:
// Sounds.dispose(alarmSFX);
```

</ai>

---

## Core Concepts

- **Native `mod.SFX` Handles** – All functions accept and return raw engine `mod.SFX` spatial objects. No wrapper class instances are created.
- **Interoperability** – Map fixtures placed in the Portal spatial editor or SFX spawned by other modules can be passed directly into `Sounds.play()`, `Sounds.fade()`, `Sounds.stop()`, etc.
- **2D vs 3D Positioning** – For 2D sounds, `position` and `attenuationRange` options are ignored by the engine. For 3D sounds, providing `position` or `attenuationRange` routes playback through 3D spatial attenuation overloads.
- **Audience Validation & Errors** – If a `target` is passed that is not a valid `mod.Player`, `mod.Squad`, or `mod.Team`, an Error is logged and thrown.
- **Stateless & Resilient** – `Sounds` does not cache object positions or amplitude values, eliminating stale cache bugs when sounds are moved or modified externally.
- **Self-Cleaning Timers** – Internal state (`Map<number, SFXState>`) only stores active timer IDs (`stopTimerId` and `fadeTimerId`). Active timers automatically validate target object existence on each tick and clean up state immediately when finished or if the sound is unspawned externally.

---

## API Reference

### `namespace Sounds`

#### `Sounds.LogLevel`

Re-exported from the **`Logging`** module for use with **`Sounds.setLogging()`**.

#### Methods

| Function | Description |
| --- | --- |
| `create(sfxAsset, position?): mod.SFX` | Spawns a new native `mod.SFX` spatial object at the given position (default `0,0,0`) with zero rotation. |
| `play(sfx: mod.SFX, amplitude: number, options?): void` | Plays any `mod.SFX` object with the specified amplitude and optional configuration (`target`, `position`, `attenuationRange`, `duration`, `fadeOptions`). No-ops if target is invalid. Note: `position` and `attenuationRange` are ignored for 2D sounds. |
| `playOneShot(sfxAsset, duration: number, amplitude: number, options?): mod.SFX` | Creates an SFX, plays it for `duration` (ms), and automatically unspawns/disposes it when finished. No-ops if target is invalid. Note: `position` and `attenuationRange` are ignored for 2D sounds. |
| `stop(sfx: mod.SFX, delay?: number): void` | Stops playback and clears active stop or fade timers. Optional `delay` in ms. |
| `fade(sfx: mod.SFX, options: FadeOptions): void` | Fades the amplitude of a sound over time using a single stepped interval. |
| `setAmplitude(sfx: mod.SFX, amplitude: number): void` | Sets the amplitude of a sound immediately via `mod.SetSoundAmplitude`. |
| `cancelStop(sfx: mod.SFX): void` | Cancels any active auto-stop timer on the sound. |
| `cancelFade(sfx: mod.SFX): void` | Cancels any active fade timer on the sound. |
| `dispose(sfx: mod.SFX): void` | Stops playback, clears timers, removes state tracking, and unspawns the `mod.SFX` object. |
| `isValid(sfxId: number): boolean` | Returns `true` if the sound ID is currently valid and spawned in the engine. |
| `setLogging(log?, logLevel?, includeRawError?): void` | Configures logging for the Sounds module. |

---

## Types

### `Sounds.FadeOptions`

| Property | Default | Description |
| --- | --- | --- |
| `startAmplitude` | _(required)_ | Starting amplitude of the fade. |
| `targetAmplitude` | `0` | Target amplitude of the sound at end of fade. |
| `delay` | `0` | Ms before the fade begins. |
| `duration` | `2000` | Total fade duration in ms. |
| `steps` | `10` | Number of interpolation steps. |
| `stopOnComplete` | `true` if `targetAmplitude === 0`, else `false` | Whether `stop()` is called when the fade completes. |

### `Sounds.PlayOptions`

| Property | Default | Description |
| --- | --- | --- |
| `target` | _(all players)_ | Optional `mod.Player`, `mod.Squad`, or `mod.Team` audience. |
| `position` | _(none)_ | World position (`mod.Vector` or `Vectors.Vector3`). Ignored for 2D sounds. |
| `attenuationRange` | `10` | Distance attenuation in meters (used when position is specified). Ignored for 2D sounds. |
| `duration` | _(none)_ | Optional duration in ms after which the sound stops automatically. |
| `fadeOptions` | _(none)_ | Optional fade settings (without `startAmplitude`, which uses `amplitude`). |

### `Sounds.PlayOneShotOptions`

Alias of `Sounds.PlayOptions`.

---

## Further Reference

- [`Logging` module](../logging/README.md) – Shared logging configuration.
- [`Timers` module](../timers/README.md) – Used for playback timeouts and fade intervals.
- [`Vectors` module](../vectors/README.md) – Vector math and conversion helpers.
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Native declarations for `RuntimeSpawn_Common`, `PlaySound`, and `SFX`.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – Bundler for Portal experiences.
