export declare namespace ModExtensions {
    /**
     * Camera types.
     */
    enum CameraType {
        FirstPerson = 'FirstPerson',
        ThirdPerson = 'ThirdPerson',
        TopDown = 'TopDown',
        Isometric = 'Isometric',
        Fixed = 'Fixed',
        Free = 'Free',
        Default = 'DEFAULT',
    }
    /**
     * Camera parameters for setting the camera for a player.
     * Requires at least one of `target` or `cameraType` to be defined.
     * `cameraNumber` can only be set if `cameraType` is also set.
     * @param target - The target to set the camera to follow/attach.
     * @param cameraType - The camera type.
     * @param cameraNumber - The camera index.
     */
    type CameraParameters =
        | {
              target: mod.Player;
              cameraType?: undefined;
              cameraNumber?: undefined;
          }
        | {
              target: mod.Player;
              cameraType: CameraType;
              cameraNumber?: number;
          }
        | {
              target?: undefined;
              cameraType: CameraType;
              cameraNumber?: number;
          };
    /**
     * Set the camera for a player.
     * @param player - The player to set the camera for.
     * @param parameters - The parameters to of the camera.
     */
    function setCameraForPlayer(player: mod.Player, parameters: CameraParameters): void;
    /**
     * Set the camera for all players.
     * @param parameters - The parameters to of the camera.
     */
    function setCameraForAll(parameters: CameraParameters): void;
    /**
     * Returns whether an event damage type is a specified player damage type.
     * @param damageType - The event damage type to compare.
     * @param playerDamageType - The player damage type to compare against.
     * @returns True if the event damage type is the specified player damage type.
     */
    function isDamageType(damageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean;
    /**
     * Returns whether an event death type is a specified player death type.
     * @param deathType - The event death type to compare.
     * @param playerDeathType - The player death type to compare against.
     * @returns True if the event death type is the specified player death type.
     */
    function isDeathType(deathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean;
    /**
     * Returns whether an event weapon unlock is a specified weapon.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param weapon - The weapon to compare against.
     * @returns True if the event weapon unlock is the specified weapon.
     */
    function isWeapon(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean;
    /**
     * Returns the player damage type of an event damage type.
     * @param damageType - The event damage type.
     * @returns The player damage type of the event damage type.
     */
    function getPlayerDamageType(damageType: mod.DamageType): mod.PlayerDamageTypes | undefined;
    /**
     * Returns the player death type of an event death type.
     * @param deathType - The event death type.
     * @returns The player death type of the event death type.
     */
    function getPlayerDeathType(deathType: mod.DeathType): mod.PlayerDeathTypes | undefined;
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
