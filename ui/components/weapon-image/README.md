# UIWeaponImage Component

<ai>

The `UIWeaponImage` component creates a widget that displays an image of a weapon. Weapon images are useful for displaying weapon icons in the UI, such as in weapon selection menus or loadout screens.

</ai>

> **Note** This component extends `UI.Element`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIWeaponImage } from 'bf6-portal-utils/ui/components/weapon-image';

const weaponPackage = mod.CreateNewWeaponPackage();
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Ammo_Hollow_Point, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Barrel_11_Extended, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Magazine_25rnd_Magazine, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Right_Laser_Light_Combo_Green, weaponPackage);

// Create a weapon image
const weaponImage = new UIWeaponImage({
    weapon: mod.Weapons.AssaultRifle_AK4D,
    weaponPackage: weaponPackage,
    position: { x: 0, y: 0 },
    size: { width: 128, height: 64 },
    visible: true,
});
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| `x`, `y` | `number = 0` | Position relative to `anchor`. Mutually exclusive with `position`. |
| `position` | `UI.Position \| undefined` | Position as `{ x: number; y: number }`. Mutually exclusive with `x`/`y`. |
| `width`, `height` | `number = 0` | Size in screen units. Mutually exclusive with `size`. |
| `size` | `UI.Size \| undefined` | Size as `{ width: number; height: number }`. Mutually exclusive with `width`/`height`. |
| `anchor` | `mod.UIAnchor = mod.UIAnchor.Center` | See `mod` namespace for enum values. |
| `parent` | `UI.Parent \| undefined` | Parent node. Defaults to `UI.ROOT_NODE` when omitted. Parent-child relationships are automatically managed. |
| `visible` | `boolean = true` | Initial visibility. Note: The underlying Portal API lacks the ability to define starting invisibility, so visibility is set manually after construction. |
| `depth` | `mod.UIDepth = mod.UIDepth.AboveGameUI` | Z-order. |
| `receiver` | `mod.Player \| mod.Team \| undefined` | Target audience. When omitted, inherits parent's receiver (or global if parent is `UI.ROOT_NODE`). Console warnings displayed for incompatible receivers. |
| `uiInputModeWhenVisible` | `boolean = false` | Automatically manage UI input mode based on visibility (see [UI Input Mode Management](../../README.md#ui-input-mode-management) section). |
| `weapon` | `mod.Weapons` | **Required.** The weapon to display. |
| `weaponPackage` | `mod.WeaponPackage = mod.CreateNewWeaponPackage()` | The weapon package (attachments, etc.) to display with the weapon. |

---

## Properties & Methods

### Inherited from `UI.Element`

`UIWeaponImage` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### WeaponImage-Specific

- **`weapon: mod.Weapons`** (getter) – The weapon being displayed (read-only).

- **`weapon: mod.Weapons`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon image after it has been created. Setting this property will log a warning and have no effect.

- **`setWeapon(weapon: mod.Weapons): UIWeaponImage`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon image after it has been created. Returns `this` for method chaining but has no effect.

- **`weaponPackage: mod.WeaponPackage`** (getter) – The weapon package being displayed (read-only). **Note** Adding attachments to this weapon package will have no effect on the UI element.

- **`weaponPackage: mod.WeaponPackage`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon package after it has been created. Setting this property will log a warning and have no effect.

- **`setWeaponPackage(weaponPackage: mod.WeaponPackage): UIWeaponImage`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon package after it has been created. Returns `this` for method chaining but has no effect.

---

## Type Definitions

### `UIWeaponImage.Params`

```ts
type Params = UI.ElementParams & {
    weapon: mod.Weapons; // Required (no default)
    weaponPackage?: mod.WeaponPackage; // Default: mod.CreateNewWeaponPackage()
};
```

---

## Usage Notes

- **Weapon Immutability**: Once a `UIWeaponImage` is created, the weapon and weapon package cannot be changed. The `weapon` and `weaponPackage` setters and their corresponding `set` methods are deprecated and will log a warning if used. To change the displayed weapon, create a new `UIWeaponImage` instance.

- **Weapon Package**: The `weaponPackage` parameter allows you to specify weapon attachments and modifications. If not provided, a new empty weapon package is created using `mod.CreateNewWeaponPackage()`.

- **Initial Visibility Limitation**: The underlying Portal API (`mod.AddUIWeaponImage`) lacks the ability to define starting invisibility. If you set `visible: false` in the constructor parameters, the component will automatically set visibility to `false` after construction, which may result in the image showing very briefly, unless it is a child of a parent that is already not visible.

- **Method Chaining**: The `setWeapon()` and `setWeaponPackage()` methods return `this` for method chaining, but note that they have no effect due to API limitations.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
