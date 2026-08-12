import { UI } from '../../index.ts';

// version: 9.0.0
export class UIWeaponImage extends UI.Element {
    private static readonly _weapons = new Array<mod.Weapons | null>(UI.MAX_ELEMENTS);
    private static readonly _weaponPackages = new Array<mod.WeaponPackage | null>(UI.MAX_ELEMENTS);

    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    public constructor(params: UIWeaponImage.Params) {
        super(params);

        if (!this._isValid) return;

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? mod.UIAnchor.Center;
        const visible = params.visible ?? true;
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

        this._bindNativeWidget(name);

        UIWeaponImage._weapons[this._slot] = params.weapon;
        UIWeaponImage._weaponPackages[this._slot] = weaponPackage;

        // `mod.AddUIWeaponImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        const slot = this._getSlotAndLogWarning();

        if (slot === UI.Element._INVALID_INDEX) return;

        UIWeaponImage._weapons[slot] = null;
        UIWeaponImage._weaponPackages[slot] = null;
        super.delete();
    }

    /**
     * The weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public get weapon(): mod.Weapons | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIWeaponImage._weapons[slot] ?? undefined);
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
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     * @returns This weapon image for chaining.
     */
    public setWeapon(weapon: mod.Weapons): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        UIWeaponImage._logging.log('Setting UIWeaponImage weapon not supported', UI.LogLevel.Warning);

        return this;
    }

    /**
     * The weapon package of the weapon image, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    public get weaponPackage(): mod.WeaponPackage | undefined {
        const slot = this._slot;

        return slot === UI.Element._INVALID_INDEX ? undefined : (UIWeaponImage._weaponPackages[slot] ?? undefined);
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
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     * @returns This weapon image for chaining.
     */
    public setWeaponPackage(weaponPackage: mod.WeaponPackage): this {
        if (this._getIsInvalidAndLogWarning()) return this;

        UIWeaponImage._logging.log('Setting UIWeaponImage weaponPackage not supported', UI.LogLevel.Warning);

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
