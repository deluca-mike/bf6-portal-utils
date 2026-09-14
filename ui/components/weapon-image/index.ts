import { UI } from '../../index.ts';

// version: 10.0.0
export class UIWeaponImage extends UI.Element {
    /**
     * The maximum number of weapon image widgets that can exist concurrently in memory.
     */
    public static readonly MAX_WEAPON_IMAGES = 128;

    private static readonly _MAX_GENERATIONS = 65_535;

    private static _activeWeaponImageCount: number = 0;

    private static _firstFreeWeaponImage: number = 0;

    private static readonly _generations = new Uint16Array(UIWeaponImage.MAX_WEAPON_IMAGES);

    private static readonly _nextFreeWeaponImage = new Int16Array(UIWeaponImage.MAX_WEAPON_IMAGES);

    private static readonly _elementToWeaponSlot = new Int16Array(UI.MAX_ELEMENTS);

    private static readonly _weapons = new Array<mod.Weapons | null>(UIWeaponImage.MAX_WEAPON_IMAGES);

    private static readonly _weaponPackages = new Array<mod.WeaponPackage | null>(UIWeaponImage.MAX_WEAPON_IMAGES);

    static {
        for (let i = 0; i < UIWeaponImage.MAX_WEAPON_IMAGES - 1; ++i) {
            UIWeaponImage._nextFreeWeaponImage[i] = i + 1;
        }

        UIWeaponImage._nextFreeWeaponImage[UIWeaponImage.MAX_WEAPON_IMAGES - 1] = UI.Element._INVALID_INDEX;
        UIWeaponImage._generations.fill(0);
        UIWeaponImage._weapons.fill(null);
        UIWeaponImage._weaponPackages.fill(null);
        UIWeaponImage._elementToWeaponSlot.fill(UI.Element._INVALID_INDEX);
    }

    /**
     * Returns the number of active weapon image elements.
     * @returns The active weapon image count.
     */
    public static getActiveWeaponImageCount(): number {
        return UIWeaponImage._activeWeaponImageCount;
    }

    /**
     * Resolves the 0-based weapon slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveWeaponSlot(elementId: number): number {
        const elementSlot = UI.Element._resolveSlot(elementId);

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        return UIWeaponImage._elementToWeaponSlot[elementSlot];
    }

    protected get _weaponSlot(): number {
        const slot = this._slot;

        return slot !== UI.Element._INVALID_INDEX
            ? UIWeaponImage._elementToWeaponSlot[slot]
            : UI.Element._INVALID_INDEX;
    }

    protected override get _isValid(): boolean {
        return this._weaponSlot !== UI.Element._INVALID_INDEX;
    }

    /**
     * Resolves the 0-based weapon slot for this weapon image instance and logs a warning if invalid.
     * @returns The 0-based weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveWeaponSlotAndLogWarning(): number {
        const elementSlot = this._getSlotAndLogWarning();

        if (elementSlot === UI.Element._INVALID_INDEX) return UI.Element._INVALID_INDEX;

        const weaponSlot = UIWeaponImage._elementToWeaponSlot[elementSlot];

        if (weaponSlot === UI.Element._INVALID_INDEX) {
            UIWeaponImage._logging.log(`Weapon image is deleted`, UI.LogLevel.Warning);
            return UI.Element._INVALID_INDEX;
        }

        return weaponSlot;
    }

    protected override _getIsInvalidAndLogWarning(): boolean {
        return this._resolveWeaponSlotAndLogWarning() === UI.Element._INVALID_INDEX;
    }

    /**
     * Allocates a weapon slot for this weapon image instance.
     * @returns The allocated weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateWeaponSlot(): number {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return UI.Element._INVALID_INDEX;

        if (UIWeaponImage._firstFreeWeaponImage === UI.Element._INVALID_INDEX) {
            UIWeaponImage._logging.log('Weapon image pool is full', UI.LogLevel.Error);
            return UI.Element._INVALID_INDEX;
        }

        const slot = UIWeaponImage._firstFreeWeaponImage;

        UIWeaponImage._firstFreeWeaponImage = UIWeaponImage._nextFreeWeaponImage[slot];
        UIWeaponImage._nextFreeWeaponImage[slot] = UI.Element._INVALID_INDEX;
        UIWeaponImage._weapons[slot] = null;
        UIWeaponImage._weaponPackages[slot] = null;
        UIWeaponImage._elementToWeaponSlot[elementSlot] = slot;

        UIWeaponImage._activeWeaponImageCount++;

        return slot;
    }

    /**
     * Frees the weapon slot associated with this weapon image instance.
     */
    private _freeWeaponSlot(): void {
        const elementSlot = this._slot;

        if (elementSlot < 0 || elementSlot >= UI.MAX_ELEMENTS) return;

        const slot = UIWeaponImage._elementToWeaponSlot[elementSlot];

        if (slot === UI.Element._INVALID_INDEX || slot < 0 || slot >= UIWeaponImage.MAX_WEAPON_IMAGES) return;

        UIWeaponImage._weapons[slot] = null;
        UIWeaponImage._weaponPackages[slot] = null;
        UIWeaponImage._elementToWeaponSlot[elementSlot] = UI.Element._INVALID_INDEX;

        UIWeaponImage._activeWeaponImageCount--;

        if (UIWeaponImage._generations[slot] < UIWeaponImage._MAX_GENERATIONS) {
            UIWeaponImage._generations[slot]++;
            UIWeaponImage._nextFreeWeaponImage[slot] = UIWeaponImage._firstFreeWeaponImage;
            UIWeaponImage._firstFreeWeaponImage = slot;
        } else if (UIWeaponImage._logging.willLog(UI.LogLevel.Warning)) {
            UIWeaponImage._logging.log(
                `Weapon image slot ${slot} exhausted max generations and was retired`,
                UI.LogLevel.Warning
            );
        }
    }

    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    public constructor(params: UIWeaponImage.Params) {
        super(params);

        if (!params || this._slot === UI.Element._INVALID_INDEX) return;

        const weaponSlot = this._allocateWeaponSlot();

        if (weaponSlot === UI.Element._INVALID_INDEX) {
            super.delete();
            return;
        }

        const parent = params.parent ?? UI.ROOT_NODE;
        const receiver = this._receiver!;
        const name = this._name;
        const { x, y } = UI.Element._getPosition(params);
        const { width, height } = UI.Element._getSize(params);
        const anchor = params.anchor ?? UI.Anchor.Center;
        const visible = params.visible ?? true;
        const weaponPackage = params.weaponPackage ?? mod.CreateNewWeaponPackage();

        const nativeAnchor = UI.Element._getNativeAnchor(anchor);

        if (!receiver.nativeReceiver) {
            mod.AddUIWeaponImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                params.weapon,
                UI.Element._getNativeWidget(parent)!,
                weaponPackage
            );
        } else {
            mod.AddUIWeaponImage(
                name,
                mod.CreateVector(x, y, 0),
                mod.CreateVector(width, height, 0),
                nativeAnchor,
                params.weapon,
                UI.Element._getNativeWidget(parent)!,
                weaponPackage,
                receiver.nativeReceiver
            );
        }

        this._bindNativeWidget(name);

        UIWeaponImage._weapons[weaponSlot] = params.weapon;
        UIWeaponImage._weaponPackages[weaponSlot] = weaponPackage;

        // `mod.AddUIWeaponImage` lacks the ability to define starting invisibility, so we have to set it manually.
        if (!visible) {
            this.visible = false;
        }
    }

    /**
     * @inheritdoc
     */
    public override delete(): void {
        if (this._getIsInvalidAndLogWarning()) return;

        this._freeWeaponSlot();
        super.delete();
    }

    /**
     * The weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    public get weapon(): mod.Weapons | undefined {
        const slot = this._weaponSlot;

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
        const slot = this._weaponSlot;

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
