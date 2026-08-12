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
     * The weapon of the weapon image button.
     * @returns The weapon.
     */
    get weapon(): mod.Weapons;
    /**
     * The weapon package of the weapon image button.
     * @returns The weapon package.
     */
    get weaponPackage(): mod.WeaponPackage;
}
export declare namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    type Params = UIButton.Params & UIWeaponImage.Params;
}
