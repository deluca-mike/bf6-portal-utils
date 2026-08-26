import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';

// version: 3.0.0
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
     * The weapon of the weapon image button, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public get weapon(): mod.Weapons | undefined {
        return this.getWeapon();
    }

    /**
     * Retrieves the weapon of the weapon image button, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public getWeapon(): mod.Weapons | undefined {
        return this._isDeletedCheck() ? undefined : this._content.weapon;
    }

    /**
     * The weapon package of the weapon image button, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public get weaponPackage(): mod.WeaponPackage | undefined {
        return this.getWeaponPackage();
    }

    /**
     * Retrieves the weapon package of the weapon image button, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public getWeaponPackage(): mod.WeaponPackage | undefined {
        return this._isDeletedCheck() ? undefined : this._content.weaponPackage;
    }
}

export namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    export type Params = UIButton.Params & UIWeaponImage.Params;
}
