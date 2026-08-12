import { UI } from '../../index.ts';
export declare class UIWeaponImage extends UI.Element {
    protected _weapon: mod.Weapons;
    protected _weaponPackage: mod.WeaponPackage;
    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    constructor(params: UIWeaponImage.Params);
    /**
     * The weapon of the weapon image.
     * @returns The weapon.
     */
    get weapon(): mod.Weapons;
    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     */
    set weapon(weapon: mod.Weapons);
    /**
     * The weapon package of the weapon image.
     * @returns The weapon package.
     */
    get weaponPackage(): mod.WeaponPackage;
    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     */
    set weaponPackage(weaponPackage: mod.WeaponPackage);
}
export declare namespace UIWeaponImage {
    /**
     * The parameters for creating a new weapon image.
     */
    type Params = UI.ElementParams & {
        weapon: mod.Weapons;
        weaponPackage?: mod.WeaponPackage;
    };
}
