import { UI } from '../../index.ts';

// version: 1.0.1
export class UIWeaponImage extends UI.Element {
    protected _weapon: mod.Weapons;
    protected _weaponPackage: mod.WeaponPackage;

    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    public constructor(params: UIWeaponImage.Params) {
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.getReceiver(parent, params.receiver);
        const name = UI.makeName(parent, receiver);
        const { x, y } = UI.getPosition(params);
        const { width, height } = UI.getSize(params);

        const elementParams: UI.FinalElementParams = {
            name,
            parent,
            visible: params.visible ?? true,
            x,
            y,
            width,
            height,
            anchor: params.anchor ?? mod.UIAnchor.Center,
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth: mod.UIDepth.AboveGameUI,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        };

        const weapon = params.weapon;
        const weaponPackage = params.weaponPackage ?? mod.CreateNewWeaponPackage();

        const args: [
            string, // name
            mod.Vector, // position
            mod.Vector, // size
            mod.UIAnchor, // anchor
            mod.Weapons, // weapon,
            mod.UIWidget, // parent
            mod.WeaponPackage, // weaponPackage
        ] = [
            name,
            mod.CreateVector(x, y, 0),
            mod.CreateVector(width, height, 0),
            elementParams.anchor,
            weapon,
            parent.uiWidget,
            weaponPackage,
        ];

        if (receiver instanceof UI.GlobalReceiver) {
            mod.AddUIWeaponImage(...args);
        } else {
            mod.AddUIWeaponImage(...args, receiver.nativeReceiver);
        }

        super(elementParams);

        this._weapon = weapon;
        this._weaponPackage = weaponPackage;

        // `mod.AddUIWeaponImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!elementParams.visible) {
            this.setVisible(false);
        }
    }

    /**
     * The weapon of the weapon image.
     */
    public get weapon(): mod.Weapons {
        return this._weapon;
    }

    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     */
    public set weapon(weapon: mod.Weapons) {
        if (this._isDeletedCheck()) return;

        this._logging.log('Setting UIWeaponImage weapon not supported.', UI.LogLevel.Warning);
    }

    /**
     * Sets the weapon of the weapon image. Useful for chaining operations.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The weapon to set.
     * @returns This element instance.
     */
    public setWeapon(weapon: mod.Weapons): this {
        this._weapon = weapon;
        return this;
    }

    /**
     * The weapon package of the weapon image.
     */
    public get weaponPackage(): mod.WeaponPackage {
        return this._weaponPackage;
    }

    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     */
    public set weaponPackage(weaponPackage: mod.WeaponPackage) {
        if (this._isDeletedCheck()) return;

        this._logging.log('Setting UIWeaponImage weaponPackage not supported.', UI.LogLevel.Warning);
    }

    /**
     * Sets the weapon package of the weapon image. Useful for chaining operations.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The weapon package to set.
     * @returns This element instance.
     */
    public setWeaponPackage(weaponPackage: mod.WeaponPackage): this {
        this._weaponPackage = weaponPackage;
        return this;
    }
}

export namespace UIWeaponImage {
    /**
     * The parameters for creating a new weapon image.
     */
    export type Params = UI.ElementParams & {
        weapon: mod.Weapons;
        weaponPackage?: mod.WeaponPackage;
    };
}
