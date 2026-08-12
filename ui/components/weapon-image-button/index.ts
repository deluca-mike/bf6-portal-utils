import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';

// version: 2.0.0
export class UIWeaponImageButton extends UIContentButton<UIWeaponImage> {
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

        super(params, createContent);
    }

    /**
     * The weapon of the weapon image button.
     * @returns The weapon.
     */
    public get weapon(): mod.Weapons {
        return this._content.weapon;
    }

    /**
     * The weapon package of the weapon image button.
     * @returns The weapon package.
     */
    public get weaponPackage(): mod.WeaponPackage {
        return this._content.weaponPackage;
    }
}

export namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    export type Params = UIButton.Params & UIWeaponImage.Params;
}
