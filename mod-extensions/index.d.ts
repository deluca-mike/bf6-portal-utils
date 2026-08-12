export declare namespace ModExtensions {
    /**
     * Returns the player damage type of an event damage type.
     * @param eventDamageType - The event damage type.
     * @returns The player damage type of the event damage type, or undefined if no match is found.
     */
    function getPlayerDamageType(eventDamageType: mod.DamageType): mod.PlayerDamageTypes | undefined;
    /**
     * Returns the player death type of an event death type.
     * @param eventDeathType - The event death type.
     * @returns The player death type of the event death type, or undefined if no match is found.
     */
    function getPlayerDeathType(eventDeathType: mod.DeathType): mod.PlayerDeathTypes | undefined;
    /**
     * Returns the gadget of an event weapon unlock.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The gadget of the event weapon unlock, or undefined if no match is found.
     */
    function getGadget(weaponUnlock: mod.WeaponUnlock): mod.Gadgets | undefined;
    /**
     * Returns the weapon of an event weapon unlock.
     * @param weaponUnlock - The event weapon unlock.
     * @returns The weapon of the event weapon unlock, or undefined if no match is found.
     */
    function getWeapon(weaponUnlock: mod.WeaponUnlock): mod.Weapons | undefined;
}
