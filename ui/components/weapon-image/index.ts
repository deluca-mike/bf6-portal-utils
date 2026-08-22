import { UI } from '../../index.ts';

// version: 3.0.0
export class UIWeaponImage extends UI.Element {
    protected _weapon: mod.Weapons;
    protected _weaponPackage: mod.WeaponPackage;

    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    public constructor(params: UIWeaponImage.Params) {
        const id = UI.Element._allocateSlot();
        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = UI.Element._getReceiver(parent, params.receiver);
        const name = UI.Element._makeName(id);
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
        const depth = params.depth ?? mod.UIDepth.AboveGameUI;
        const weaponPackage = params.weaponPackage ?? mod.CreateNewWeaponPackage();

        if (!receiver.nativeReceiver) {
            mod.AddUIWeaponImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                params.weapon,
                UI.Element._getNativeWidget(parent.id)!,
                weaponPackage
            );
        } else {
            mod.AddUIWeaponImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                params.weapon,
                UI.Element._getNativeWidget(parent.id)!,
                weaponPackage,
                receiver.nativeReceiver
            );
        }

        super(id, {
            name,
            parent,
            anchor,
            visible,
            bgColor: UI.COLORS.WHITE,
            bgAlpha: 0,
            bgFill: mod.UIBgFill.None,
            depth,
            x,
            y,
            width,
            height,
            receiver,
            uiInputModeWhenVisible: params.uiInputModeWhenVisible ?? false,
        });

        this._weapon = params.weapon;
        this._weaponPackage = weaponPackage;

        // `mod.AddUIWeaponImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    /**
     * The weapon of the weapon image.
     * @returns The weapon.
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

        this._logging.log('Setting UIWeaponImage weapon not supported', UI.LogLevel.Warning);
    }

    /**
     * The weapon package of the weapon image.
     * @returns The weapon package.
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

        this._logging.log('Setting UIWeaponImage weaponPackage not supported', UI.LogLevel.Warning);
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
