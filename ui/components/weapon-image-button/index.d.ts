import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';
export declare class UIWeaponImageButton extends UIContentButton<UIWeaponImage> {
    /**
     * Creates a new weapon image button.
     * @param params - The parameters for the weapon image button.
     */
    constructor(params: UIWeaponImageButton.Params);
    /**
     * The weapon of the weapon image button, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    get weapon(): mod.Weapons | undefined;
    /**
     * Retrieves the weapon of the weapon image button, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    getWeapon(): mod.Weapons | undefined;
    /**
     * The weapon package of the weapon image button, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    get weaponPackage(): mod.WeaponPackage | undefined;
    /**
     * Retrieves the weapon package of the weapon image button, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    getWeaponPackage(): mod.WeaponPackage | undefined;
}
export declare namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    type Params = UIButton.Params & UIWeaponImage.Params;
}
