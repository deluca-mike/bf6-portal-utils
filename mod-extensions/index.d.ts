export declare namespace ModExtensions {
    /**
     * Returns whether an event damage type is a specified player damage type.
     * @param eventDamageType - The event damage type to compare.
     * @param playerDamageType - The player damage type to compare against.
     * @returns True if the event damage type is the specified player damage type.
     */
    function isDamageType(eventDamageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean;
    /**
     * Returns whether an event death type is a specified player death type.
     * @param eventDeathType - The event death type to compare.
     * @param playerDeathType - The player death type to compare against.
     * @returns True if the event death type is the specified player death type.
     */
    function isDeathType(eventDeathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean;
    /**
     * Returns whether an event weapon unlock is a specified gadget.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param gadget - The gadget to compare against.
     * @returns True if the event weapon unlock is the specified gadget.
     */
    function isGadget(weaponUnlock: mod.WeaponUnlock, gadget: mod.Gadgets): boolean;
    /**
     * Returns whether an event weapon unlock is a specified weapon.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param weapon - The weapon to compare against.
     * @returns True if the event weapon unlock is the specified weapon.
     */
    function isWeapon(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean;
    /**
     * Returns the player damage type of an event damage type.
     * @param eventDamageType - The event damage type.
     * @returns The player damage type of the event damage type.
     */
    function getPlayerDamageType(eventDamageType: mod.DamageType): mod.PlayerDamageTypes | undefined;
    /**
     * Returns the player death type of an event death type.
     * @param eventDeathType - The event death type.
     * @returns The player death type of the event death type.
     */
    function getPlayerDeathType(eventDeathType: mod.DeathType): mod.PlayerDeathTypes | undefined;
    /**
     * Returns the gadget of an event weapon unlock.
     * IMPORTANT: This functions iterates over all gadgets in the mod.Gadgets enum, so use with caution.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The gadget of the event weapon unlock.
     */
    function getGadget(weaponUnlock: mod.WeaponUnlock): mod.Gadgets | undefined;
    /**
     * Returns the weapon of an event weapon unlock.
     * IMPORTANT: This functions iterates over all weapons in the mod.Weapons enum, so use with caution.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The weapon of the event weapon unlock.
     */
    function getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons | undefined;
    /**
     * Returns the string of a key in the strings file.
     * @param key - The string key.
     * @returns The string value.
     */
    function getString(key: string): string | undefined;
}
