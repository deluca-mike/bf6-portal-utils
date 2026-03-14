// version 1.0.0
export namespace ModExtensions {
    interface ExtendedMod {
        EventDamageTypeCompare(damageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean;
        EventDeathTypeCompare(deathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean;
        EventWeaponCompare(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean;
        SetCameraTargetForPlayer(player: mod.Player, target: mod.Player): void;
        SetCameraTypeForPlayer(player: mod.Player, cameraType: mod.Cameras, cameraNumber?: number): void;
        SetCameraForPlayer(
            player: mod.Player,
            target: mod.Player,
            cameraType: mod.Cameras,
            cameraNumber?: number
        ): void;
        SetCameraTargetForAll(target: mod.Player): void;
        SetCameraTypeForAll(cameraType: mod.Cameras, cameraNumber?: number): void;
        SetCameraForAll(target: mod.Player, cameraType: mod.Cameras, cameraNumber?: number): void;
        strings: Record<string, string | undefined>;
    }

    /**
     * Camera types.
     */
    export enum CameraType {
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
    export type CameraParameters =
        | { target: mod.Player; cameraType?: undefined; cameraNumber?: undefined }
        | { target: mod.Player; cameraType: CameraType; cameraNumber?: number }
        | { target?: undefined; cameraType: CameraType; cameraNumber?: number };

    /**
     * Set the camera for a player.
     * @param player - The player to set the camera for.
     * @param parameters - The parameters to of the camera.
     */
    export function setCameraForPlayer(player: mod.Player, parameters: CameraParameters): void {
        if (parameters.target === undefined) {
            if (parameters.cameraNumber === undefined) {
                (mod as unknown as ExtendedMod).SetCameraTypeForPlayer(
                    player,
                    (mod.Cameras as any)[parameters.cameraType]
                );
            } else {
                (mod as unknown as ExtendedMod).SetCameraTypeForPlayer(
                    player,
                    (mod.Cameras as any)[parameters.cameraType],
                    parameters.cameraNumber
                );
            }
        } else if (parameters.cameraType === undefined) {
            (mod as unknown as ExtendedMod).SetCameraTargetForPlayer(player, parameters.target);
        } else {
            if (parameters.cameraNumber === undefined) {
                (mod as unknown as ExtendedMod).SetCameraForPlayer(
                    player,
                    parameters.target,
                    (mod.Cameras as any)[parameters.cameraType]
                );
            } else {
                (mod as unknown as ExtendedMod).SetCameraForPlayer(
                    player,
                    parameters.target,
                    (mod.Cameras as any)[parameters.cameraType],
                    parameters.cameraNumber
                );
            }
        }
    }

    /**
     * Set the camera for all players.
     * @param parameters - The parameters to of the camera.
     */
    export function setCameraForAll(parameters: CameraParameters): void {
        if (parameters.target === undefined) {
            if (parameters.cameraNumber === undefined) {
                (mod as unknown as ExtendedMod).SetCameraTypeForAll((mod.Cameras as any)[parameters.cameraType]);
            } else {
                (mod as unknown as ExtendedMod).SetCameraTypeForAll(
                    (mod.Cameras as any)[parameters.cameraType],
                    parameters.cameraNumber
                );
            }
        } else if (parameters.cameraType === undefined) {
            (mod as unknown as ExtendedMod).SetCameraTargetForAll(parameters.target);
        } else {
            if (parameters.cameraNumber === undefined) {
                (mod as unknown as ExtendedMod).SetCameraForAll(
                    parameters.target,
                    (mod.Cameras as any)[parameters.cameraType]
                );
            } else {
                (mod as unknown as ExtendedMod).SetCameraForAll(
                    parameters.target,
                    (mod.Cameras as any)[parameters.cameraType],
                    parameters.cameraNumber
                );
            }
        }
    }

    /**
     * Returns whether an event damage type is a specified player damage type.
     * @param damageType - The event damage type to compare.
     * @param playerDamageType - The player damage type to compare against.
     * @returns True if the event damage type is the specified player damage type.
     */
    export function isDamageType(damageType: mod.DamageType, playerDamageType: mod.PlayerDamageTypes): boolean {
        return (mod as unknown as ExtendedMod).EventDamageTypeCompare(damageType, playerDamageType);
    }

    /**
     * Returns whether an event death type is a specified player death type.
     * @param deathType - The event death type to compare.
     * @param playerDeathType - The player death type to compare against.
     * @returns True if the event death type is the specified player death type.
     */
    export function isDeathType(deathType: mod.DeathType, playerDeathType: mod.PlayerDeathTypes): boolean {
        return (mod as unknown as ExtendedMod).EventDeathTypeCompare(deathType, playerDeathType);
    }

    /**
     * Returns whether an event weapon unlock is a specified weapon.
     * @param weaponUnlock - The event weapon unlock to compare.
     * @param weapon - The weapon to compare against.
     * @returns True if the event weapon unlock is the specified weapon.
     */
    export function isWeapon(weaponUnlock: mod.WeaponUnlock, weapon: mod.Weapons): boolean {
        return (mod as unknown as ExtendedMod).EventWeaponCompare(weaponUnlock, weapon);
    }

    /**
     * Returns the player damage type of an event damage type.
     * @param damageType - The event damage type.
     * @returns The player damage type of the event damage type.
     */
    export function getPlayerDamageType(damageType: mod.DamageType): mod.PlayerDamageTypes | undefined {
        for (const playerDamageType of Object.values(mod.PlayerDamageTypes)) {
            if (isDamageType(damageType, playerDamageType as mod.PlayerDamageTypes)) {
                return playerDamageType as mod.PlayerDamageTypes;
            }
        }

        return undefined;
    }

    /**
     * Returns the player death type of an event death type.
     * @param deathType - The event death type.
     * @returns The player death type of the event death type.
     */
    export function getPlayerDeathType(deathType: mod.DeathType): mod.PlayerDeathTypes | undefined {
        for (const playerDeathType of Object.values(mod.PlayerDeathTypes)) {
            if (isDeathType(deathType, playerDeathType as mod.PlayerDeathTypes)) {
                return playerDeathType as mod.PlayerDeathTypes;
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
