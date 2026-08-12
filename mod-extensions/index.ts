// version 3.0.0
export namespace ModExtensions {
    const _damageTypes = Object.values(mod.PlayerDamageTypes) as mod.PlayerDamageTypes[];
    const _deathTypes = Object.values(mod.PlayerDeathTypes) as mod.PlayerDeathTypes[];
    const _gadgets = Object.values(mod.Gadgets) as mod.Gadgets[];
    const _weapons = Object.values(mod.Weapons) as mod.Weapons[];

    /**
     * Returns the player damage type of an event damage type.
     * @param eventDamageType - The event damage type.
     * @returns The player damage type of the event damage type, or undefined if no match is found.
     */
    export function getPlayerDamageType(eventDamageType: mod.DamageType): mod.PlayerDamageTypes | undefined {
        const count = _damageTypes.length;

        for (let i = 0; i < count; ++i) {
            const damageType = _damageTypes[i]!;

            if (mod.EventDamageTypeCompare(eventDamageType, damageType)) return damageType;
        }

        return undefined;
    }

    /**
     * Returns the player death type of an event death type.
     * @param eventDeathType - The event death type.
     * @returns The player death type of the event death type, or undefined if no match is found.
     */
    export function getPlayerDeathType(eventDeathType: mod.DeathType): mod.PlayerDeathTypes | undefined {
        const count = _deathTypes.length;

        for (let i = 0; i < count; ++i) {
            const deathType = _deathTypes[i]!;

            if (mod.EventDeathTypeCompare(eventDeathType, deathType)) return deathType;
        }

        return undefined;
    }

    /**
     * Returns the gadget of an event weapon unlock.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The gadget of the event weapon unlock, or undefined if no match is found.
     */
    export function getGadget(weaponUnlock: mod.WeaponUnlock): mod.Gadgets | undefined {
        const count = _gadgets.length;

        for (let i = 0; i < count; ++i) {
            const gadget = _gadgets[i]!;

            if (mod.EventWeaponCompare(weaponUnlock, gadget)) return gadget;
        }

        return undefined;
    }

    /**
     * Returns the weapon of an event weapon unlock.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The weapon of the event weapon unlock, or undefined if no match is found.
     */
    export function getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons | undefined {
        const count = _weapons.length;

        for (let i = 0; i < count; ++i) {
            const weapon = _weapons[i]!;

            if (mod.EventWeaponCompare(weaponUnlock, weapon)) return weapon;
        }

        return undefined;
    }
}
