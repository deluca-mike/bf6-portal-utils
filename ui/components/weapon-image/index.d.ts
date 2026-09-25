import { UI } from '../../index.ts';
export declare class UIWeaponImage extends UI.Element {
    /**
     * The maximum number of weapon image widgets that can exist concurrently in memory.
     */
    static readonly MAX_WEAPON_IMAGES = 128;
    private static readonly _MAX_GENERATIONS;
    private static _activeWeaponImageCount;
    private static _firstFreeWeaponImage;
    private static readonly _generations;
    private static readonly _nextFreeWeaponImage;
    private static readonly _elementToWeaponSlot;
    private static readonly _weapons;
    private static readonly _weaponPackages;
    /**
     * Returns the number of active weapon image elements.
     * @returns The active weapon image count.
     */
    static getActiveWeaponImageCount(): number;
    /**
     * Resolves the 0-based weapon slot for an element ID.
     * @param elementId - The element ID.
     * @returns The 0-based weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected static _resolveWeaponSlot(elementId: number): number;
    /**
     * Creates a new weapon image.
     * @param params - The parameters for the weapon image.
     */
    constructor(params: UIWeaponImage.Params);
    protected get _weaponSlot(): number;
    protected get _isValid(): boolean;
    /**
     * Resolves the 0-based weapon slot for this weapon image instance and logs a warning if invalid.
     * @returns The 0-based weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or -1 if invalid or unallocated.
     */
    protected _resolveWeaponSlotAndLogWarning(): number;
    protected _getIsInvalidAndLogWarning(): boolean;
    /**
     * Allocates a weapon slot for this weapon image instance.
     * @returns The allocated weapon slot index (0 to MAX_WEAPON_IMAGES - 1), or INVALID_INDEX (-1) if full or invalid.
     */
    private _allocateWeaponSlot;
    /**
     * Frees the weapon slot associated with this weapon image instance.
     */
    private _freeWeaponSlot;
    /**
     * @inheritdoc
     */
    delete(): void;
    /**
     * The weapon of the weapon image, or undefined if deleted.
     * @returns The weapon, or undefined if deleted.
     */
    get weapon(): mod.Weapons | undefined;
    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     */
    set weapon(weapon: mod.Weapons);
    /**
     * Sets the weapon of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon after it has
     * been created.
     * @param weapon - The new weapon.
     * @returns This weapon image for chaining.
     */
    setWeapon(weapon: mod.Weapons): this;
    /**
     * The weapon package of the weapon image, or undefined if deleted.
     * @returns The weapon package, or undefined if deleted.
     */
    get weaponPackage(): mod.WeaponPackage | undefined;
    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     */
    set weaponPackage(weaponPackage: mod.WeaponPackage);
    /**
     * Sets the weapon package of the weapon image.
     * @deprecated Currently not supported as the underlying Portal API lacks the ability to set the weapon package
     * after it has been created.
     * @param weaponPackage - The new weapon package.
     * @returns This weapon image for chaining.
     */
    setWeaponPackage(weaponPackage: mod.WeaponPackage): this;
}
export declare namespace UIWeaponImage {
    /**
     * The parameters for creating a new weapon image.
     */
    type Params = UI.ElementParams & {
        weapon: mod.Weapons;
        weaponPackage?: mod.WeaponPackage;
    };
}
