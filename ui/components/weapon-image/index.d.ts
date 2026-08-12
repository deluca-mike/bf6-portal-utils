import { UI } from '../../index.ts';
export declare class UIWeaponImage extends UI.Element {
    private static readonly _weapons;
    private static readonly _weaponPackages;
    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    constructor(params: UIWeaponImage.Params);
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    get weapon(): mod.Weapons | undefined;
    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     */
    set weapon(weapon: mod.Weapons);
    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     * @returns This weapon image for chaining.
     */
    setWeapon(weapon: mod.Weapons): this;
    /**
     * The weapon package of the weapon image, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    get weaponPackage(): mod.WeaponPackage | undefined;
    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     */
    set weaponPackage(weaponPackage: mod.WeaponPackage);
    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     * @returns This weapon image for chaining.
     */
    setWeaponPackage(weaponPackage: mod.WeaponPackage): this;
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
