import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';

const WEAPON_IMAGE_BUTTON_CONTENT_PROPERTIES: readonly string[] = ['weapon', 'weaponPackage'] as const;

// version: 1.0.1
export class UIWeaponImageButton extends UIContentButton<UIWeaponImage, typeof WEAPON_IMAGE_BUTTON_CONTENT_PROPERTIES> {
    // UIWeaponImage properties (delegated via delegateProperties)
    declare public weapon: mod.Weapons;
    declare public weaponPackage: mod.WeaponPackage;

    // UIWeaponImage setter methods (delegated via delegateProperties)
    declare public setWeapon: (weapon: mod.Weapons) => this;
    declare public setWeaponPackage: (weaponPackage: mod.WeaponPackage) => this;

    /**
     * Creates a new weapon image button.
     * @param params - The parameters for the weapon image button.
     */
    public constructor(params: UIWeaponImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIWeaponImage => {
            const weaponImageParams: UIWeaponImage.Params = {
                parent,
                width,
                height,
                weapon: params.weapon,
                weaponPackage: params.weaponPackage,
                depth: params.depth,
            };

            return new UIWeaponImage(weaponImageParams);
        };

        super(params, createContent, WEAPON_IMAGE_BUTTON_CONTENT_PROPERTIES);
    }
}

export namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    export type Params = UIButton.Params & UIWeaponImage.Params;
}
