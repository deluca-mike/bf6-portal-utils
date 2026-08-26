import { UI } from '../../index.ts';

// version: 4.0.0
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
                UI.Element._getNativeWidget(parent)!,
                weaponPackage
            );
        } else {
            mod.AddUIWeaponImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                anchor,
                params.weapon,
                UI.Element._getNativeWidget(parent)!,
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
     * The weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public get weapon(): mod.Weapons | undefined {
        return this.getWeapon();
    }

    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     */
    public set weapon(weapon: mod.Weapons) {
        this.setWeapon(weapon);
    }

    /**
     * Retrieves the weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public getWeapon(): mod.Weapons | undefined {
        return this._isDeletedCheck() ? undefined : this._weapon;
    }

    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     * @returns This weapon image for chaining.
     */
    public setWeapon(weapon: mod.Weapons): this {
        if (this._isDeletedCheck()) return this;

        this._logging.log('Setting UIWeaponImage weapon not supported', UI.LogLevel.Warning);
        return this;
    }

    /**
     * The weapon package of the weapon image, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public get weaponPackage(): mod.WeaponPackage | undefined {
        return this.getWeaponPackage();
    }

    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     */
    public set weaponPackage(weaponPackage: mod.WeaponPackage) {
        this.setWeaponPackage(weaponPackage);
    }

    /**
     * Retrieves the weapon package of the weapon image, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public getWeaponPackage(): mod.WeaponPackage | undefined {
        return this._isDeletedCheck() ? undefined : this._weaponPackage;
    }

    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     * @returns This weapon image for chaining.
     */
    public setWeaponPackage(weaponPackage: mod.WeaponPackage): this {
        if (this._isDeletedCheck()) return this;

        this._logging.log('Setting UIWeaponImage weaponPackage not supported', UI.LogLevel.Warning);
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
