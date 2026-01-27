import { UI } from '../../index.ts';
export declare class UIWeaponImage extends UI.Element {
    protected _weapon: mod.Weapons;
    protected _weaponPackage: mod.WeaponPackage;
    constructor(params: UIWeaponImage.Params);
    get weapon(): mod.Weapons;
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the weapon.
     */
    set weapon(weapon: mod.Weapons);
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the weapon.
     * @param weapon - The weapon to set.
     * @returns The UIWeaponImage instance.
     */
    setWeapon(weapon: mod.Weapons): this;
    get weaponPackage(): mod.WeaponPackage;
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the weapon package.
     */
    set weaponPackage(weaponPackage: mod.WeaponPackage);
    /**
     * @deprecated Currently not supported as underlying Portal API lacks the ability to set the weapon package.
     * @param weaponPackage - The weapon package to set.
     * @returns The UIWeaponImage instance.
     */
    setWeaponPackage(weaponPackage: mod.WeaponPackage): this;
}
export declare namespace UIWeaponImage {
    type Params = UI.ElementParams & {
        weapon: mod.Weapons;
        weaponPackage?: mod.WeaponPackage;
    };
}
