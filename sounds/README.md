# Sounds Module

This TypeScript `Sounds` class abstracts away and handles the nuance, oddities, and pitfalls that come with playing sounds at runtime in Battlefield Portal experiences. The module provides efficient sound object management through automatic pooling and reuse, handles different playback scenarios (2D global, 2D per-player/squad/team, and 3D positional), manages sound durations automatically, and provides manual control when needed.

Key features include automatic sound object reuse to minimize spawn overhead, intelligent availability tracking to prevent sound conflicts, automatic stopping after specified durations, and support for infinite-duration sounds (e.g., looping assets).

> **Note**
> The `Sounds` class is self-contained and requires no additional modules or setup. All Battlefield Portal types referenced below (`mod.Player`, `mod.Vector`, `mod.RuntimeSpawn_Common`, `mod.SFX`, etc.) come from [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your mod. The bundler automatically handles code inlining.
3. **SFX Assets** – You'll need `mod.RuntimeSpawn_Common` references to your sound effect assets (typically obtained from the Battlefield Portal asset browser or via `mod.GetRuntimeSpawnCommon`).

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { Sounds } from 'bf6-portal-utils/sounds';
    ```
3. Optionally set up logging for debugging (recommended during development).
4. Call `Sounds.play2D()` or `Sounds.play3D()` to play sounds as needed.
5. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

### Example

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// Define your sound assets (obtain these from your Battlefield Portal experience's asset browser)
const SOUND_ALPHA_2D = mod.RuntimeSpawn_Common.SFX_UI_EOR_RankUp_Extra_OneShot2D;
const SOUND_BULLET_3D = mod.RuntimeSpawn_Common.SFX_Projectiles_Flybys_Bullet_Crack_Sniper_Close_OneShot3D;
const SOUND_LOOP_2D = mod.RuntimeSpawn_Common.SFX_UI_EOR_Counting_SimpleLoop2D;
const SOUND_LOOP_3D = mod.RuntimeSpawn_Common.SFX_GameModes_BR_Mission_DemoCrew_Alarm_Close_SimpleLoop3D;

const playerUndeployedLoops: Map<number, Sounds.PlayedSound> = new Map();

export async function OnGameModeStarted(): Promise<void> {
    // Optional: Set up logging for debugging
    Sounds.setLogging((text) => console.log(text), Sounds.LogLevel.Info);

    // Optional: Preload some sounds to reduce first-play latency (minimal, if any)
    Sounds.preload(SOUND_ALPHA_2D);
    Sounds.preload(SOUND_BULLET_3D);
    Sounds.preload(SOUND_LOOP_2D);

    // Play an infinite-duration looping sound at each HQ.
    const hqPosition1 = mod.GetObjectPosition(mod.GetHQ(1));
    const hqPosition2 =  mod.GetObjectPosition(mod.GetHQ(2));

    const ambientSound = Sounds.play3D(SOUND_LOOP_3D, hqPosition1, {
        amplitude: 3,
        attenuationRange: 100,  // Sound can be heard up to 100 meters away
        duration: 0  // 0 = infinite duration
    });

    const ambientSound = Sounds.play3D(SOUND_LOOP_3D, hqPosition2, {
        amplitude: 3,
        attenuationRange: 100,  // Sound can be heard up to 100 meters away
        duration: 0  // 0 = infinite duration
    });
}

export async function OnPlayerJoinGame(eventPlayer: mod.Player): Promise<void> {
    // Play a 2D sound for all players
    Sounds.play2D(SOUND_ALPHA_2D, { amplitude: 0.8, duration: 2 });
}

export function OnPlayerUndeploy(eventPlayer: mod.Player): void {
    // Play a 2D sound loop for a specific player
    const playedSound = Sounds.play2D(SOUND_LOOP_2D, {
        player: eventPlayer,
        amplitude: 1,
        duration: 0
    });

    // Save the looping PlayedSound so it can be stopped once the player leaves the deploy screen.
    playerUndeployedLoops.set(mod.GetObjId(eventPlayer), playedSound);
}

export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    // Stop the looping PlayedSound if it exists for the player.
    playerUndeployedLoops.get(mod.GetObjId(eventPlayer))?.stop();
}

export async function OnPlayerDied(victim: mod.Player, killer: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock): Promise<void> {
    const victimPosition = mod.GetSoldierState(victim, mod.SoldierStateVector.GetPosition);

    // Play a 3D positional sound at the victim's location
    Sounds.play3D(SOUND_BULLET_3D, victimPosition, {
        amplitude: 1.5,
        attenuationRange: 50,  // Sound can be heard up to 50 meters away
        duration: 5
    });
}
```

---

## Core Concepts

- **Sound Object Pooling** – The system maintains a pool of reusable sound objects (`mod.SFX`) for each sound asset. When a sound needs to be played, the system finds an available sound object from the pool or creates a new one if none are available. This minimizes spawn overhead and improves performance.
- **Availability Tracking** – Each sound object tracks when it will become available again using `availableTime`. This prevents conflicts where multiple sounds try to use the same object simultaneously.
- **Automatic Duration Management** – Sounds automatically stop after their specified duration (plus a small buffer to prevent overlap). You can also stop sounds manually via the returned `PlayedSound` object.
- **Infinite Duration Support** – Setting `duration` to `0` creates a sound that plays indefinitely until manually stopped. This is useful, but not required, for looping ambient sounds.
- **2D vs 3D Playback** – 2D sounds are heard equally by all (or targeted) players regardless of position. 3D sounds are positional and attenuate with distance from the source location.

---

## API Reference

### `class Sounds`

#### Static Methods

| Method | Description |
| --- | --- |
| `play2D(sfxAsset: mod.RuntimeSpawn_Common, params?: Sounds.Params2D): Sounds.PlayedSound` | Plays a 2D sound that can be heard by all players (or a specific player, squad, or team). Returns a `PlayedSound` object that can be used to stop the sound manually. Default duration is `3` seconds. |
| `play3D(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, params?: Sounds.Params3D): Sounds.PlayedSound` | Plays a 3D positional sound at the specified world position. The sound attenuates with distance based on `attenuationRange`. Returns a `PlayedSound` object that can be used to stop the sound manually. Default duration is `10` seconds. |
| `setLogging(log?: (text: string) => void, logLevel?: Sounds.LogLevel): void` | Attaches a logger function and defines a minimum log level. Useful for debugging sound behavior. Default log level is `Info` if not specified. Set `log` to `undefined` to disable logging. |
| `preload(sfxAsset: mod.RuntimeSpawn_Common): void` | Creates a sound object for the given asset if one doesn't already exist. This helps the game client load the sound asset into memory so it can play quicker when needed. Only needed once per asset, if at all. |

#### Static Properties

| Property | Type | Description |
| --- | --- | --- |
| `objectCount` | `number` | Returns the total number of `SoundObject`s created across all assets. Useful for monitoring resource usage. |
| `objectCountForAsset(sfxAsset: mod.RuntimeSpawn_Common): number` | `number` | Returns the number of `SoundObject`s created for the given sound asset. Useful for monitoring per-asset resource usage. |

---

## Configuration & Defaults

The following values control sound behavior. Most can be overridden via the optional `params` arguments on `play2D()` and `play3D()`.

| Setting | Type | Default | How to change | Description |
| --- | --- | --- | --- | --- |
| `DEFAULT_2D_DURATION` | `number` | `3` | Edit constant | Default duration (seconds) for 2D sounds when not specified in `params.duration`. |
| `DEFAULT_3D_DURATION` | `number` | `10` | Edit constant | Default duration (seconds) for 3D sounds when not specified in `params.duration`. |
| `DURATION_BUFFER` | `number` | `1` | Edit constant | Additional time (seconds) added to sound duration to prevent overlap when reusing sound objects. |
| `amplitude` (2D) | `number` | `1` | `params.amplitude` | Volume level for 2D sounds (typically 0.0 to 1.0, but can exceed 1.0 for amplification). |
| `amplitude` (3D) | `number` | `1` | `params.amplitude` | Volume level for 3D sounds (typically 0.0 to 1.0, but can exceed 1.0 for amplification). |
| `attenuationRange` | `number` | `10` | `params.attenuationRange` | Maximum distance (meters) at which a 3D sound can be heard. Sounds fade out as distance increases. |
| `duration` | `number` | See defaults above | `params.duration` | How long the sound plays before automatically stopping. Set to `0` for infinite duration (useful for looping assets). |

---

## Types & Interfaces

All types are defined inside the `Sounds` namespace in [`sounds.ts`](sounds.ts).

### `Sounds.PlayedSound`

Returned by `play2D()` and `play3D()`, provides manual control over the playing sound:

```ts
type PlayedSound = {
    stop: () => void,  // Stops the sound immediately. Safe to call multiple times.
}
```

**Usage:**
```ts
const sound = Sounds.play2D(mySoundAsset, { duration: 10 });
// ... later ...
sound.stop();  // Stops the sound manually
```

### `Sounds.Params2D`

Optional parameters for 2D sound playback:

```ts
type Params2D = {
    amplitude?: number,      // Volume level (default: 1)
    player?: mod.Player,     // If specified, only this player hears the sound
    squad?: mod.Squad,       // If specified, only players in this squad hear the sound
    team?: mod.Team,         // If specified, only players on this team hear the sound
    duration?: number,       // Duration in seconds (default: 3). Use 0 for infinite duration.
}
```

**Note:** Only one of `player`, `squad`, or `team` should be specified. If none are specified, all players hear the sound.

### `Sounds.Params3D`

Optional parameters for 3D positional sound playback:

```ts
type Params3D = {
    amplitude?: number,         // Volume level (default: 1)
    attenuationRange?: number, // Maximum hearing distance in meters (default: 10)
    duration?: number,          // Duration in seconds (default: 10). Use 0 for infinite duration.
}
```

### `Sounds.LogLevel`

Enumeration of log levels for filtering debug output:

```ts
enum LogLevel {
    Debug = 0,  // Most verbose (includes object creation, availability checks, etc.)
    Info = 1,   // Default level (includes sound playback events)
    Error = 2   // Only errors (e.g., attempting to stop already-stopped sounds)
}
```

### `Sounds.SoundObject`

Internal type representing a pooled sound object (exposed for reference):

```ts
type SoundObject = {
    sfx: mod.SFX,              // The underlying Battlefield Portal sound object
    availableTime: number,    // Match time when this object becomes available for reuse
}
```

---

## How It Works

The `Sounds` class uses a pooling and reuse system to efficiently manage sound playback:

1. **Sound Object Pooling** – For each unique sound asset (`mod.RuntimeSpawn_Common`), the system maintains an array of reusable `SoundObject` instances. These objects are created on-demand and reused across multiple play requests.

2. **Availability Tracking** – Each `SoundObject` tracks when it becomes available for reuse via `availableTime`. When a sound is played, its `availableTime` is set to `currentTime + duration + DURATION_BUFFER`. The system only reuses objects whose `availableTime` has passed.

3. **Automatic Object Creation** – If no available sound object is found in the pool, a new one is automatically created by spawning the asset at the origin `(0, 0, 0)`. The spawn location doesn't matter for sound objects; only the `PlaySound` call determines where/how the sound is heard.

4. **Duration Management** – When a sound is played with a duration > 0, the system schedules an automatic stop using `mod.Wait(duration)`. The `PlayedSound.stop()` method provides manual control and includes safeguards to prevent stopping sounds that have already finished.

5. **Infinite Duration** – When `duration` is `0`, the sound object's `availableTime` is set to `Number.MAX_SAFE_INTEGER`, effectively reserving it indefinitely until manually stopped.

6. **2D vs 3D Selection** – The system automatically calls the appropriate `mod.PlaySound` overload based on the parameters provided:
   - `play2D()` with no target → `mod.PlaySound(sfx, amplitude)`
   - `play2D()` with `player` → `mod.PlaySound(sfx, amplitude, player)`
   - `play2D()` with `squad` → `mod.PlaySound(sfx, amplitude, squad)`
   - `play2D()` with `team` → `mod.PlaySound(sfx, amplitude, team)`
   - `play3D()` → `mod.PlaySound(sfx, amplitude, position, attenuationRange)`

---

## Known Limitations & Caveats

- **Sound Object Growth** – The system creates new sound objects when none are available, but never destroys them. In long-running matches with many unique sounds, this can lead to gradual memory growth. Consider using `objectCount` and `objectCountForAsset()` to monitor usage.

- **Availability Search Performance** – The system uses `Array.find()` to locate available sound objects, which scans from the beginning of the array each time. With many sound objects per asset, this can become a performance bottleneck, but it is unlikely unless the user is playing many long duration sounds at the same time. See Future Work for planned improvements.

- **Infinite Duration Objects** – Sound objects with infinite duration (`duration: 0`) are effectively removed from the pool until manually stopped. **Important:** For infinite-duration sounds, you must keep a reference to the returned `PlayedSound` object so you can call `stop()` when needed. Without this reference, the sound will play indefinitely (whether or not it's actually making sound, as it might not be a looping asset) and the underlying `SoundObject` cannot be freed or reused, effectively leaking resources. While the resource cost is small, this can accumulate over time if many infinite-duration sounds are started without proper cleanup.

- **Concurrent Playback** – The system allows multiple instances of sounds to play simultaneously for a given location or target. If you need to prevent overlapping sounds, you'll need to implement that logic yourself.

---

## Future Work

The following improvements are planned for future versions:

- Considering a `play` function on `Sounds.PlayedSound` that plays it again and extends the time, or if not available, provisions a new sound object.

- A purge function or dispose function for old sound objects.

- Overall object limiter.

- Per-asset object limiter.

- Perhaps an aggressive reuse of sound objects if limit reached.

- Smart object despawner.

- Reworking the `SoundObject` reservation logic to pop them out when they are reserved (and push them back on when they become available) to speed up finding available sound objects.

- Exposing functionality to stop all `PlayedSound`s (perhaps with optional filters such as by asset, duration type, etc.) to provide a fallback mechanism for cases where references to infinite-duration sounds have been lost.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for Portal.
- Battlefield Builder docs – For information about sound assets, runtime spawn commons, and audio limitations.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (performance optimizations, additional playback modes, better resource management, etc.), so please share your experiences.

---
