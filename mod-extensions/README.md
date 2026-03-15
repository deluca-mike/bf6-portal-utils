# Mod Extensions Module

<ai>

The Battlefield Portal runtime injects a documented `mod` namespace that provides the official API for experiences. Some additional APIs exist on `mod` at runtime but are not included in the default type declarations, so they are not directly accessible without circumventing TypeScript’s `mod` type. The `ModExtensions` namespace in this module wraps those undocumented APIs behind typed, ergonomic helpers. Use it when you need camera control, event type comparisons (damage type, death type, weapon), or runtime string lookup without casting `mod` yourself.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { ModExtensions } from 'bf6-portal-utils/mod-extensions';
    ```
3. Call the appropriate helpers (e.g. `ModExtensions.setCameraForPlayer`, `ModExtensions.isDamageType`, `ModExtensions.getString`).
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { ModExtensions } from 'bf6-portal-utils/mod-extensions';
import { Events } from 'bf6-portal-utils/events';

Events.OnPlayerDeployed.subscribe((player: mod.Player) => {
    // Set camera to follow another player (e.g. spectator mode)
    const target = mod.GetPlayersInRadius(mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition), 50)[0];
    if (target !== undefined) {
        ModExtensions.setCameraForPlayer(player, { target, cameraType: ModExtensions.CameraType.ThirdPerson });
    }
});

// In a damage or death handler: check event types
Events.OnPlayerDied.subscribe((event: mod.OnPlayerDiedEvent) => {
    if (ModExtensions.isDeathType(event.deathType, mod.PlayerDeathTypes.Headshot)) {
        // Headshot-specific logic
    }
});

// Look up a string from the runtime strings file
const label = ModExtensions.getString('gameMode.hud.section.label');
```

</ai>

---

## Core Concepts

- **Undocumented API** – The helpers call native `mod` functions and properties that exist at runtime but are not in the official type declarations. The module uses an internal extended `mod` type and casts only inside the implementation so your code stays type-safe.
- **Camera control** – You can set a player’s (or all players’) camera target, camera type, or both. Parameters are expressed as a single object; at least one of `target` or `cameraType` must be set.
- **Event type comparison** – Event payloads expose opaque types (e.g. `mod.DamageType`, `mod.DeathType`, `mod.WeaponUnlock`). The native API provides compare functions that are not on the documented `mod` type; this module exposes them as `isDamageType`, `isDeathType`, and `isWeapon`, plus optional resolvers that map event types to the corresponding enum values.
- **Runtime strings** – The runtime populates `mod.strings` from your `string.json`; this is not in the default types. `getString(key)` provides typed access to that map.

---

## API Reference

### `namespace ModExtensions`

The namespace is not instantiated; all members are static or types.

#### `ModExtensions.CameraType`

Enum of supported camera types. Use with `setCameraForPlayer` and `setCameraForAll` when setting `cameraType`.

| Value         | Description                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `FirstPerson` | First-person view.                                                               |
| `ThirdPerson` | Third-person view.                                                               |
| `TopDown`     | Top-down view.                                                                   |
| `Isometric`   | Similar to `FirstPerson`, but scaled/distorted differently.                      |
| `Fixed`       | Locked to the target's position the moment it is set and cannot be manipulated.  |
| `Free`        | Allows free roam in space, but there is no yaw control, so it is awkward to use. |
| `Default`     | It is unclear if and how it is different from `FirstPerson`.                     |

#### `ModExtensions.CameraParameters`

Discriminated type for camera settings. At least one of `target` or `cameraType` must be set. `cameraNumber` may only be set when `cameraType` is set.

- `{ target: mod.Player; cameraType?: undefined; cameraNumber?: undefined }` – Set only the camera target.
- `{ target: mod.Player; cameraType: CameraType; cameraNumber?: number }` – Set target and optionally type and index.
- `{ target?: undefined; cameraType: CameraType; cameraNumber?: number }` – Set only camera type (and optionally index).

#### Static Methods

| Method | Description |
| --- | --- |
| `setCameraForPlayer(player: mod.Player, parameters: CameraParameters): void` | Sets the camera for the given player. Use `parameters` to set target and/or camera type (and optional `cameraNumber` when setting type). |
| `setCameraForAll(parameters: CameraParameters): void` | Sets the camera for all players. Same parameter shape as `setCameraForPlayer`. |
| `isDamageType(damageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean` | Returns whether the event damage type matches the given `mod.PlayerDamageTypes` value. Uses the undocumented `EventDamageTypeCompare` API. |
| `isDeathType(deathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean` | Returns whether the event death type matches the given `mod.PlayerDeathTypes` value. Uses the undocumented `EventDeathTypeCompare` API. |
| `isWeapon(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean` | Returns whether the event weapon unlock matches the given `mod.Weapons` value. Uses the undocumented `EventWeaponCompare` API. |
| `getPlayerDamageType(damageType: mod.DamageType): mod.PlayerDamageTypes \| undefined` | Resolves an event damage type to the corresponding `mod.PlayerDamageTypes` by iterating over the enum. Returns `undefined` if no match. |
| `getPlayerDeathType(deathType: mod.DeathType): mod.PlayerDeathTypes \| undefined` | Resolves an event death type to the corresponding `mod.PlayerDeathTypes` by iterating over the enum. Returns `undefined` if no match. |
| `getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons \| undefined` | Resolves an event weapon unlock to the corresponding `mod.Weapons` by iterating over the enum. Returns `undefined` if no match. **Note:** Iterates over all weapons; use with caution in hot paths. |
| `getString(key: string): string \| undefined` | Returns the runtime string for the given key (from the experience’s `string.json`). Uses the undocumented `mod.strings` map. |

---

## Usage Patterns

- **Spectator / replay** – Use `setCameraForPlayer` or `setCameraForAll` with a target player and optional `CameraType` to drive spectator or kill-cam style views.
- **Damage / death handling** – Use `isDamageType`, `isDeathType`, or `isWeapon` in `OnPlayerDamaged`, `OnPlayerDied`, or similar handlers to branch on how the player was damaged or killed.
- **Resolving event types** – When you need the enum value (e.g. for UI or logging), use `getPlayerDamageType`, `getPlayerDeathType`, or `getWeapon`; handle `undefined` when the type is unknown.
- **Runtime strings** – Use `getString(key)` to read values from the runtime string table (e.g. keys that mirror your `string.json` structure) when you need the resolved string instead of passing a key to `mod.Message`.

---

## Known Limitations & Caveats

- **Undocumented API** – The underlying `mod` APIs are not part of the documented Portal surface. They may change or be removed in future game updates; use at your own risk.
- **getWeapon cost** – `getWeapon` iterates over all values in `mod.Weapons`. Avoid calling it in very hot paths; prefer `isWeapon` when you only need to check against a known weapon.
- **Camera behavior** – Camera behavior is engine-defined. Not all combinations of target and type may be supported in all contexts (e.g. deploy screen, end-of-round).
- **Strings** – `getString` returns whatever the runtime has stored for the key; keys that are not present in your `string.json` or that the engine does not expose will yield `undefined`.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Documented Battlefield Portal type declarations; this module extends access to undocumented APIs that coexist with those types.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. If you discover other undocumented `mod` APIs that would fit here or run into issues with the existing helpers, please open an issue or reach out through the project channels.

---
