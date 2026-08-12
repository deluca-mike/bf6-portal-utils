# Mod Extensions Module

<ai>

The `ModExtensions` namespace provides helper functions for resolving opaque event payloads (such as `mod.DamageType`, `mod.DeathType`, and `mod.WeaponUnlock`) to their corresponding Battlefield Portal enum values (`mod.PlayerDamageTypes`, `mod.PlayerDeathTypes`, `mod.Gadgets`, and `mod.Weapons`).

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
    // Resolve opaque event deathType to the PlayerDeathTypes enum value
    const deathType = ModExtensions.getPlayerDeathType(event.deathType);

    if (deathType === mod.PlayerDeathTypes.Headshot) {
        // Headshot-specific logic
    }
});

Events.OnPlayerDamaged.subscribe((event: mod.OnPlayerDamagedEvent) => {
    // Resolve opaque event damageType to the PlayerDamageTypes enum value
    const damageType = ModExtensions.getPlayerDamageType(event.damageType);

    if (damageType === mod.PlayerDamageTypes.Explosion) {
        // Explosion-specific logic
    }
});
```

</ai>

---

## Core Concepts

- **Opaque Event Payload Resolution** – Battlefield Portal events emit opaque types (`mod.DamageType`, `mod.DeathType`, `mod.WeaponUnlock`) that require engine comparison calls (`mod.EventDamageTypeCompare`, `mod.EventDeathTypeCompare`, `mod.EventWeaponCompare`). This module resolves them to concrete enum values when you need to inspect or branch across unknown event types.
- **Zero Runtime Allocations** – Enum values are cached in static reference arrays on load and scanned via index loops, generating **0 heap allocations** and **0 GC pressure** during gameplay.

---

## API Reference

### `namespace ModExtensions`

| Method | Description |
| --- | --- |
| `getPlayerDamageType(eventDamageType: mod.DamageType): mod.PlayerDamageTypes \| undefined` | Resolves an opaque event `DamageType` to its corresponding `mod.PlayerDamageTypes` enum value, or `undefined` if not matched. |
| `getPlayerDeathType(eventDeathType: mod.DeathType): mod.PlayerDeathTypes \| undefined` | Resolves an opaque event `DeathType` to its corresponding `mod.PlayerDeathTypes` enum value, or `undefined` if not matched. |
| `getGadget(weaponUnlock: mod.WeaponUnlock): mod.Gadgets \| undefined` | Resolves an opaque event `WeaponUnlock` to its corresponding `mod.Gadgets` enum value, or `undefined` if not matched. |
| `getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons \| undefined` | Resolves an opaque event `WeaponUnlock` to its corresponding `mod.Weapons` enum value, or `undefined` if not matched. |

---

## Limitations

- If you only need to check against a single specific known enum value, calling `mod.EventDamageTypeCompare(damageType, mod.PlayerDamageTypes.Headshot)` directly is faster than resolving the full enum. Use `ModExtensions` when you need to discover or switch over unknown event types.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/)
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler)

---

## Feedback

This module is under **active development**. Issues and suggestions for additional helper functions that improve base API ergonomics or that expose hidden functionality are welcome.
