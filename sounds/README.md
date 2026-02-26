# Sounds Module

<ai>

This TypeScript `Sounds` namespace abstracts away and handles the nuance, oddities, and pitfalls that come with playing sounds at runtime in Battlefield Portal experiences. The module provides efficient sound object management through automatic pooling and reuse, handles different playback scenarios (2D global, 2D per-player/squad/team, and 3D positional with optional target filtering), manages sound durations automatically, and provides manual control when needed.

Key features include automatic sound object reuse to minimize spawn overhead, intelligent availability tracking to prevent sound conflicts, automatic stopping after specified durations, and support for infinite-duration sounds (e.g., looping assets).

</ai>

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

<ai>

### Example

```ts
import { Sounds } from 'bf6-portal-utils/sounds';

// Define your sound assets (obtain these from your Battlefield Portal experience's asset browser)
const SOUND_ALPHA_2D = mod.RuntimeSpawn_Common.SFX_UI_EOR_RankUp_Extra_OneShot2D;
const SOUND_BULLET_3D = mod.RuntimeSpawn_Common.SFX_Projectiles_Flybys_Bullet_Crack_Sniper_Close_OneShot3D;
const SOUND_LOOP_2D = mod.RuntimeSpawn_Common.SFX_UI_EOR_Counting_SimpleLoop2D;
const SOUND_LOOP_3D = mod.RuntimeSpawn_Common.SFX_GameModes_BR_Mission_DemoCrew_Alarm_Close_SimpleLoop3D;

const playerUndeployedLoops: Map<number, () => void> = new Map();

export async function OnGameModeStarted(): Promise<void> {
    // Optional: Set up logging for debugging
    Sounds.setLogging((text) => console.log(text), Sounds.LogLevel.Info);

    // Optional: Preload some sounds to reduce first-play latency (minimal, if any)
    Sounds.preload(SOUND_ALPHA_2D);
    Sounds.preload(SOUND_BULLET_3D);
    Sounds.preload(SOUND_LOOP_2D);

    // Play an infinite-duration looping sound at each HQ.
    const hqPosition1 = mod.GetObjectPosition(mod.GetHQ(1));
    const hqPosition2 = mod.GetObjectPosition(mod.GetHQ(2));

    const ambientSound1 = Sounds.play3D(SOUND_LOOP_3D, hqPosition1, {
        amplitude: 3,
        attenuationRange: 100, // Sound can be heard up to 100 meters away
        duration: 0, // 0 = infinite duration
    });

    const ambientSound2 = Sounds.play3D(SOUND_LOOP_3D, hqPosition2, {
        amplitude: 3,
        attenuationRange: 100, // Sound can be heard up to 100 meters away
        duration: 0, // 0 = infinite duration
    });
}

export async function OnPlayerJoinGame(eventPlayer: mod.Player): Promise<void> {
    // Play a 2D sound for all players
    Sounds.play2D(SOUND_ALPHA_2D, { amplitude: 0.8, duration: 2000 });
}

export function OnPlayerUndeploy(eventPlayer: mod.Player): void {
    // Play a 2D sound loop for a specific player
    const stopSound = Sounds.play2D(SOUND_LOOP_2D, {
        target: eventPlayer,
        amplitude: 1,
        duration: 0,
    });

    // Save the stop function so it can be called once the player leaves the deploy screen.
    playerUndeployedLoops.set(mod.GetObjId(eventPlayer), stopSound);
}

export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    // Stop the looping sound if it exists for the player.
    playerUndeployedLoops.get(mod.GetObjId(eventPlayer))?.();
}

export async function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
): Promise<void> {
    const victimPosition = mod.GetSoldierState(victim, mod.SoldierStateVector.GetPosition);

    // Play a 3D positional sound at the victim's location
    Sounds.play3D(SOUND_BULLET_3D, victimPosition, {
        amplitude: 1.5,
        attenuationRange: 50, // Sound can be heard up to 50 meters away
        duration: 5000,
    });
}
```

</ai>

---

## Core Concepts

- **Sound Object Pooling** – The system maintains a pool of reusable sound objects (`mod.SFX`) for each sound asset, organized into `available` and `active` sets. When a sound needs to be played, the system reserves an available sound object from the pool or creates a new one if none are available. This minimizes spawn overhead and improves performance.
- **Availability Management** – Sound objects are tracked in two sets: `available` (ready for reuse) and `active` (currently in use). When a sound is played, its object is reserved from `available` or created and added to `active`. When the sound stops (automatically or manually), the object is moved back to `available` for reuse.
- **Automatic Duration Management** – Sounds with a non-zero duration automatically stop after the specified duration using the `Timers` module. When stopped, the sound object is automatically returned to the `available` set. You can also stop sounds manually by calling the returned stop function.
- **Infinite Duration Support** – Setting `duration` to `0` creates a sound that plays indefinitely until manually stopped. No automatic stop timer is scheduled for infinite-duration sounds. This is useful for looping ambient sounds.
- **2D vs 3D Playback** – 2D sounds are heard equally by all (or targeted) players regardless of position. 3D sounds are positional and attenuate with distance from the source location. Both 2D and 3D support an optional `target` (`Player`, `Squad`, `Team`, or `undefined`): 2D targets who hears the sound; 3D restricts who can hear the sound at that location (all players in range vs. only the specified player/squad/team in range).

---

## API Reference

### `namespace Sounds`

The namespace is not instantiated; all members are static or types.

#### Static Methods

| Method | Description |
| --- | --- |
| `play2D(sfxAsset: mod.RuntimeSpawn_Common, params?: Sounds.Params2D): () => void` | Plays a 2D sound that can be heard by all players (or a specific player, squad, or team via the `target` parameter). Returns a stop function that can be called to stop the sound manually. Default duration is `3000` milliseconds. |
| `play3D(sfxAsset: mod.RuntimeSpawn_Common, position: mod.Vector, params?: Sounds.Params3D): () => void` | Plays a 3D positional sound at the specified world position. The sound attenuates with distance based on `attenuationRange`. Optional `target` restricts which players in range hear the sound (default `undefined` = all players in range). Returns a stop function that can be called to stop the sound manually. Default duration is `10000` milliseconds. |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: Sounds.LogLevel, includeError?: boolean): void` | Configures logging for the Sounds module. Sound playback events and errors are automatically logged using the configured logger. This allows you to monitor and debug sound behavior. Pass `undefined` for `log` to disable logging. Default log level is `Info`, default `includeError` is `false`. The runtime error can be very large and may cause issues with UI loggers. For more information, see the [`Logging` module documentation](../logging/README.md). |
| `preload(sfxAsset: mod.RuntimeSpawn_Common): void` | Creates a sound object for the given asset if one doesn't already exist. This helps the game client load the sound asset into memory so it can play quicker when needed. Only needed once per asset, if at all. |
| `objectCount(): number` | Returns the total number of sound objects created across all assets. Useful for monitoring resource usage. |
| `objectCountsForAsset(sfxAsset: mod.RuntimeSpawn_Common): Sounds.ObjectCounts` | Returns the number of `available` and `active` sound objects for the given sound asset. Useful for monitoring per-asset resource usage. |

---

## Configuration & Defaults

The following values control sound behavior. Most can be overridden via the optional `params` arguments on `play2D()` and `play3D()`.

| Setting | Type | Default | How to change | Description |
| --- | --- | --- | --- | --- |
| `DEFAULT_2D_DURATION` | `number` | `3000` | Edit constant | Default duration (milliseconds) for 2D sounds when not specified in `params.duration`. |
| `DEFAULT_3D_DURATION` | `number` | `10000` | Edit constant | Default duration (milliseconds) for 3D sounds when not specified in `params.duration`. |
| `amplitude` (2D) | `number` | `1` | `params.amplitude` | Volume level for 2D sounds (typically 0.0 to 1.0, but can exceed 1.0 for amplification). |
| `amplitude` (3D) | `number` | `1` | `params.amplitude` | Volume level for 3D sounds (typically 0.0 to 1.0, but can exceed 1.0 for amplification). |
| `attenuationRange` | `number` | `10` | `params.attenuationRange` | Maximum distance (meters) at which a 3D sound can be heard. Sounds fade out as distance increases. |
| `duration` | `number` | See defaults above | `params.duration` | How long the sound plays before automatically stopping. Set to `0` for infinite duration (useful for looping assets). |

---

## Types & Interfaces

All types are defined inside the `Sounds` namespace in [`index.ts`](index.ts). Internal types (e.g. pooled sound objects) are not exported.

### Return Value

Both `play2D()` and `play3D()` return a stop function that can be called to stop the sound manually:

```ts
const stopSound = Sounds.play2D(mySoundAsset, { duration: 10000 });
// ... later ...
stopSound(); // Stops the sound manually. Safe to call multiple times, but only the first time will do anything.
```

### `Sounds.Params2D`

Optional parameters for 2D sound playback:

```ts
type Params2D = {
    amplitude?: number; // Volume level (default: 1)
    target?: mod.Player | mod.Squad | mod.Team; // If specified, only this player/squad/team hears the sound. If undefined, all players hear the sound.
    duration?: number; // Duration in milliseconds (default: 3000). Use 0 for infinite duration.
};
```

**Note:** The `target` parameter can be a `Player`, `Squad`, `Team`, or `undefined` (all players).

### `Sounds.Params3D`

Optional parameters for 3D positional sound playback:

```ts
type Params3D = {
    amplitude?: number; // Volume level (default: 1)
    attenuationRange?: number; // Maximum hearing distance in meters (default: 10)
    target?: mod.Player | mod.Squad | mod.Team; // If specified, only this player/squad/team in range hears the sound. If undefined, all players in range hear the sound.
    duration?: number; // Duration in milliseconds (default: 10000). Use 0 for infinite duration.
};
```

### `Sounds.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `Sounds.setLogging()` to configure the minimum log level for sound playback event logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose. Includes object creation, pool management, and availability checks.
- `Info` (1) – Informational messages. Default minimum log level. Includes sound playback events.
- `Warning` (2) – Warning messages. Includes attempts to stop already-stopped sounds.
- `Error` (3) – Error messages. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

### `Sounds.ObjectCounts`

Returned by `objectCountsForAsset()` to provide visibility into pool usage:

```ts
type ObjectCounts = {
    available: number; // Number of available sound objects
    active: number; // Number of active sound objects
};
```

---

## How It Works

The `Sounds` namespace uses a pooling and reuse system to efficiently manage sound playback:

1. **Sound Object Pooling** – For each unique sound asset (`mod.RuntimeSpawn_Common`), the system maintains a pool containing two sets: `available` (ready for reuse) and `active` (currently in use). These objects are created on-demand and reused across multiple play requests.

2. **Reservation and Creation** – When a sound needs to be played, the system reserves a sound object:
    - First, it checks the `available` set for an existing sound object that can be reused
    - If an available object is found, it's removed from `available`, added to `active`, and returned
    - If no available object exists, a new sound object is created (by spawning the asset at the origin `(0, 0, 0)`) and added to the `active` set. The spawn location doesn't matter for sound objects; only the `PlaySound` call determines where/how the sound is heard.

3. **Automatic Duration Management** – When a sound is played with a duration > 0, the system schedules an automatic stop using `Timers.setTimeout(duration)`. When the timer fires or the sound is stopped manually, the sound object is stopped with `mod.StopSound()`, removed from `active`, and returned to `available` for reuse.

4. **Infinite Duration** – When `duration` is `0`, no automatic stop timer is scheduled. The sound object remains in the `active` set until manually stopped via the returned stop function. Once stopped, it's moved back to `available` for reuse.

5. **2D vs 3D and target** – The system calls the appropriate `mod.PlaySound` overload based on the parameters provided:
    - `play2D()` with no `target` → `mod.PlaySound(sfx, amplitude)`
    - `play2D()` with `target` as `Player` → `mod.PlaySound(sfx, amplitude, player)`
    - `play2D()` with `target` as `Squad` → `mod.PlaySound(sfx, amplitude, squad)`
    - `play2D()` with `target` as `Team` → `mod.PlaySound(sfx, amplitude, team)`
    - `play3D()` with no `target` → `mod.PlaySound(sfx, amplitude, position, attenuationRange)`
    - `play3D()` with `target` as `Player` / `Squad` / `Team` → `mod.PlaySound(sfx, amplitude, position, attenuationRange, target)` so only that player/squad/team in range hears the sound

6. **Logging** – The module uses the `Logging` module for internal logging. Sound playback events, object creation, pool management, and errors are logged according to the configured log level. Use `Sounds.setLogging()` to configure a logger function, minimum log level, and whether to include error details.

---

## Known Limitations & Caveats

- **Sound Object Growth** – The system creates new sound objects when none are available, but never destroys them. In long-running matches with many unique sounds, this can lead to gradual memory growth. Consider using `objectCount()` and `objectCountsForAsset()` to monitor usage.

- **Availability Search Performance** – The system uses `Set.values().next().value` to get an available sound object, which is efficient for Set operations. With many sound objects per asset, this remains performant. However, if you're playing many long-duration sounds simultaneously, you may see gradual growth in the number of sound objects. See Future Work for planned improvements.

<ai>

- **Infinite Duration Objects** – Sound objects with infinite duration (`duration: 0`) remain in the `active` set until manually stopped. **Important:** For infinite-duration sounds, you must keep a reference to the returned stop function so you can call it when needed. Without this reference, the sound will play indefinitely (whether or not it's actually making sound, as it might not be a looping asset) and the underlying `SoundObject` cannot be freed or reused, effectively leaking resources. While the resource cost is small, this can accumulate over time if many infinite-duration sounds are started without proper cleanup.

- **Concurrent Playback** – The system allows multiple instances of sounds to play simultaneously for a given location or target. If you need to prevent overlapping sounds, you'll need to implement that logic yourself.

</ai>

---

## Future Work

The following improvements are planned for future versions:

- A purge function or dispose function for old sound objects.

- Overall object limiter.

- Per-asset object limiter.

- Perhaps an aggressive reuse of sound objects if limit reached.

- Smart object despawner.

- Exposing functionality to stop all playing sounds (perhaps with optional filters such as by asset, duration type, etc.) to provide a fallback mechanism for cases where references to infinite-duration sound stop functions have been lost.

- Track the sounds playing for any target or globally and allow them to be stopped.

---

## Further Reference

- [Timers module](../timers/README.md) – The timing module used internally.
- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. Feature requests, bug reports, usage questions, or general ideas are welcome—open an issue or reach out through the project channels and you'll get a timely response. Real-world use cases help shape the roadmap (performance optimizations, additional playback modes, better resource management, etc.), so please share your experiences.

---
