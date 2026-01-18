import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';
declare const WEAPON_IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[];
export declare class UIWeaponImageButton extends UIContentButton<
    UIWeaponImage,
    typeof WEAPON_IMAGE_BUTTON_CONTENT_PROPERTIES
> {
    weapon: mod.Weapons;
    weaponPackage: mod.WeaponPackage;
    setWeapon: (weapon: mod.Weapons) => this;
    setWeaponPackage: (weaponPackage: mod.WeaponPackage) => this;
    constructor(params: UIWeaponImageButton.Params);
}
export declare namespace UIWeaponImageButton {
    type Params = UIButton.Params & UIWeaponImage.Params;
}
export {};
