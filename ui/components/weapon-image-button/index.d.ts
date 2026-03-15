import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';
export declare class UIWeaponImageButton extends UIContentButton<UIWeaponImage> {
    weapon: mod.Weapons;
    weaponPackage: mod.WeaponPackage;
    setWeapon: (weapon: mod.Weapons) => this;
    setWeaponPackage: (weaponPackage: mod.WeaponPackage) => this;
    /**
     * Creates a new weapon image button.
     * @param params - The parameters for the weapon image button.
     */
    constructor(params: UIWeaponImageButton.Params);
}
export declare namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    type Params = UIButton.Params & UIWeaponImage.Params;
}
