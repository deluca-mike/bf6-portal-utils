// version 2.0.0
export namespace ModExtensions {
    interface ExtendedMod {
        strings: Record<string, string | undefined>;
    }

    /**
     * Returns whether an event damage type is a specified player damage type.
     * @param eventDamageType - The event damage type to compare.
     * @param playerDamageType - The player damage type to compare against.
     * @returns True if the event damage type is the specified player damage type.
     */
    export function isDamageType(eventDamageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean {
        return mod.EventDamageTypeCompare(eventDamageType, playerDamageType);
    }

    /**
     * Returns whether an event death type is a specified player death type.
     * @param eventDeathType - The event death type to compare.
     * @param playerDeathType - The player death type to compare against.
     * @returns True if the event death type is the specified player death type.
     */
    export function isDeathType(eventDeathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean {
        return mod.EventDeathTypeCompare(eventDeathType, playerDeathType);
    }

    /**
     * Returns whether an event weapon unlock is a specified gadget.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param gadget - The gadget to compare against.
     * @returns True if the event weapon unlock is the specified gadget.
     */
    export function isGadget(weaponUnlock: mod.WeaponUnlock, gadget: mod.Gadgets): boolean {
        return mod.EventWeaponCompare(weaponUnlock, gadget);
    }

    /**
     * Returns whether an event weapon unlock is a specified weapon.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param weapon - The weapon to compare against.
     * @returns True if the event weapon unlock is the specified weapon.
     */
    export function isWeapon(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean {
        return mod.EventWeaponCompare(weaponUnlock, weapon);
    }

    /**
     * Returns the player damage type of an event damage type.
     * @param eventDamageType - The event damage type.
     * @returns The player damage type of the event damage type.
     */
    export function getPlayerDamageType(eventDamageType: mod.DamageType): mod.PlayerDamageTypes | undefined {
        for (const playerDamageType of Object.values(mod.PlayerDamageTypes)) {
            if (isDamageType(eventDamageType, playerDamageType as mod.PlayerDamageTypes)) {
                return playerDamageType as mod.PlayerDamageTypes;
            }
        }

        return undefined;
    }

    /**
     * Returns the player death type of an event death type.
     * @param eventDeathType - The event death type.
     * @returns The player death type of the event death type.
     */
    export function getPlayerDeathType(eventDeathType: mod.DeathType): mod.PlayerDeathTypes | undefined {
        for (const playerDeathType of Object.values(mod.PlayerDeathTypes)) {
            if (isDeathType(eventDeathType, playerDeathType as mod.PlayerDeathTypes)) {
                return playerDeathType as mod.PlayerDeathTypes;
            }
        }

        return undefined;
    }

    /**
     * Returns the gadget of an event weapon unlock.
     * IMPORTANT: This functions iterates over all gadgets in the mod.Gadgets enum, so use with caution.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The gadget of the event weapon unlock.
     */
    export function getGadget(weaponUnlock: mod.WeaponUnlock): mod.Gadgets | undefined {
        for (const gadget of Object.values(mod.Gadgets)) {
            if (isGadget(weaponUnlock, gadget as mod.Gadgets)) {
                return gadget as mod.Gadgets;
            }
        }

        return undefined;
    }

    /**
     * Returns the weapon of an event weapon unlock.
     * IMPORTANT: This functions iterates over all weapons in the mod.Weapons enum, so use with caution.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The weapon of the event weapon unlock.
     */
    export function getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons | undefined {
        for (const weapon of Object.values(mod.Weapons)) {
            if (isWeapon(weaponUnlock, weapon as mod.Weapons)) {
                return weapon as mod.Weapons;
            }
        }

        return undefined;
    }

    /**
     * Returns the string of a key in the strings file.
     * @param key - The string key.
     * @returns The string value.
     */
    export function getString(key: string): string | undefined {
        return (mod as unknown as ExtendedMod).strings[key];
    }
}
