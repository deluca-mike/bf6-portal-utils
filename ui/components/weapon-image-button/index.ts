import { UI } from '../../index.ts';
import { UIContentButton } from '../content-button/index.ts';
import { UIButton } from '../button/index.ts';
import { UIWeaponImage } from '../weapon-image/index.ts';

// version: 10.0.0
export class UIWeaponImageButton extends UIContentButton<UIWeaponImage> {
    private static readonly _scratchWeaponParams: UIWeaponImage.Params = {
        weapon: null as unknown as mod.Weapons,
    };

    /**
     * Creates a new weapon image button.
     * @param params - The parameters for the weapon image button.
     */
    public constructor(params: UIWeaponImageButton.Params) {
        const createContent = (parent: UI.Parent, width: number, height: number): UIWeaponImage => {
            const scratch = UIWeaponImageButton._scratchWeaponParams;
            scratch.parent = parent;
            scratch.width = width;
            scratch.height = height;
            scratch.weapon = params.weapon;
            scratch.weaponPackage = params.weaponPackage;
            scratch.depth = params.depth;

            const weaponImage = new UIWeaponImage(scratch);

            scratch.parent = undefined;
            scratch.weapon = null as unknown as mod.Weapons;
            scratch.weaponPackage = undefined;

            return weaponImage;
        };

        super(params, createContent);
    }

    /**
     * The weapon of the weapon image button, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public get weapon(): mod.Weapons | undefined {
        return this._isValid ? this.content?.weapon : undefined;
    }

    /**
     * The weapon package of the weapon image button, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public get weaponPackage(): mod.WeaponPackage | undefined {
        return this._isValid ? this.content?.weaponPackage : undefined;
    }
}

export namespace UIWeaponImageButton {
    /**
     * The parameters for creating a new weapon image button.
     */
    export type Params = UIButton.Params & UIWeaponImage.Params;
}
