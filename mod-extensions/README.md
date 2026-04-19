# Mod Extensions Module

<ai>

The Battlefield Portal runtime injects a documented `mod` namespace. Some additional APIs exist at runtime but are not on the default type declarations. The `ModExtensions` namespace wraps those behind typed helpers and provides additional helpers for common tasks: event type comparisons (damage, death, gadget, weapon) and runtime string lookup, without casting `mod` yourself.

</ai>

---

## Quick Start

1. Install: `npm install -D bf6-portal-utils`
2. Import:

    ```ts
    import { ModExtensions } from 'bf6-portal-utils/mod-extensions';
    ```

3. Use helpers (see below). Bundle with [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) as usual.

<ai>

### Example

```ts
import { ModExtensions } from 'bf6-portal-utils/mod-extensions';
import { Events } from 'bf6-portal-utils/events';

Events.OnPlayerDied.subscribe((event: mod.OnPlayerDiedEvent) => {
    if (ModExtensions.isDeathType(event.deathType, mod.PlayerDeathTypes.Headshot)) {
        // Headshot-specific logic
    }
});

const label = ModExtensions.getString('gameMode.hud.section.label');
```

</ai>

---

## Core Concepts

- **Undocumented API** – Helpers call native `mod` functions/properties not on the official types; implementation uses internal casts so your code stays typed.
- **Event types** – Payloads use opaque types (`mod.DamageType`, `mod.DeathType`, `mod.WeaponUnlock`). This module exposes compare APIs as `isDamageType`, `isDeathType`, `isGadget`, `isWeapon`, plus resolvers that map to enum values where needed.
- **Runtime strings** – `getString(key)` reads `mod.strings` populated from your `string.json`.

---

## API Reference

### `namespace ModExtensions`

| Method | Description |
| --- | --- |
| `isDamageType(eventDamageType, playerDamageType)` | Whether the event damage type matches the given `mod.PlayerDamageTypes`. Uses `EventDamageTypeCompare`. |
| `isDeathType(eventDeathType, playerDeathType)` | Whether the event death type matches the given `mod.PlayerDeathTypes`. Uses `EventDeathTypeCompare`. |
| `isGadget(weaponUnlock, gadget)` | Whether the weapon unlock matches the given `mod.Gadgets`. Uses `EventWeaponCompare`. |
| `isWeapon(weaponUnlock, weapon)` | Whether the weapon unlock matches the given `mod.Weapons`. Uses `EventWeaponCompare`. |
| `getPlayerDamageType(damageType)` | Resolves to `mod.PlayerDamageTypes` or `undefined`. |
| `getPlayerDeathType(deathType)` | Resolves to `mod.PlayerDeathTypes` or `undefined`. |
| `getGadget(weaponUnlock)` | Resolves to `mod.Gadgets` or `undefined`. **Iterates all gadgets** — avoid hot paths. |
| `getWeapon(weaponUnlock)` | Resolves to `mod.Weapons` or `undefined`. **Iterates all weapons** — avoid hot paths. |
| `getString(key)` | Runtime string for the key from the experience’s `string.json` / `mod.strings`. |

---

## Limitations

- Undocumented APIs may change in future game updates.
- Prefer `isGadget` / `isWeapon` over `getGadget` / `getWeapon` when you only need to test a known enum value.
- Missing or unexposed keys return `undefined` from `getString`.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/)
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler)

---

## Feedback

This module is under **active development**. Issues and suggestions for additional safe wrappers are welcome.

---
