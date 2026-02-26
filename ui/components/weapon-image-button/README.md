# UIWeaponImageButton Component

<ai>

The `UIWeaponImageButton` component creates a button with an integrated weapon image. It combines `UIButton` and `UIWeaponImage` functionality into a single element, wrapping both in a container and delegating properties appropriately.

</ai>

> **Note** This component extends `UIContentButton<UIWeaponImage>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

```ts
import { UIWeaponImageButton } from 'bf6-portal-utils/ui/components/weapon-image-button';
import { UI } from 'bf6-portal-utils/ui';

const weaponPackage = mod.CreateNewWeaponPackage();
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Ammo_Hollow_Point, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Barrel_11_Extended, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Magazine_25rnd_Magazine, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Right_Laser_Light_Combo_Green, weaponPackage);

// Create a weapon image button with a click handler
const button = new UIWeaponImageButton({
    position: { x: 0, y: 0 },
    size: { width: 128, height: 64 },
    weapon: mod.Weapons.AssaultRifle_AK4D,
    weaponPackage: weaponPackage,
    onClick: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} clicked the AK24 button!`);
    },
    visible: true,
});

// Update button properties
button.setEnabled(false).setBaseColor(UI.COLORS.BLUE);
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIButton.Params`, plus: |
| `weapon` | `mod.Weapons` | **Required.** The weapon to display. |
| `weaponPackage` | `mod.WeaponPackage = mod.CreateNewWeaponPackage()` | The weapon package (attachments, etc.) to display with the weapon. |
| `padding` | `number = 0` | Container padding. |

For a complete list of `UIButton.Params`, see the [UIButton documentation](../button/README.md).

---

## Properties & Methods

### Inherited from `UI.Element`

`UIWeaponImageButton` inherits all properties and methods from `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size` (with getters/setters and method chaining)
- **Visibility**: `visible`, `show()`, `hide()`, `toggle()`
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `deleted`
- **Parent Management**: `parent`, `setParent()`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode).

### Delegated from Internal Button

All button properties are delegated from the internal `UIButton` instance:

- **Button State**: `enabled`, `setEnabled()`
- **Click Handler**: `onClick`, `setOnClick()`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `hoverColor`, `focusedColor` (with setter methods)
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `hoverAlpha`, `focusedAlpha` (with setter methods)
- **Background**: `bgColor`, `bgAlpha`, `bgFill` (delegated from button)

### Delegated from Internal Weapon Image

Weapon image properties are delegated from the internal `UIWeaponImage` instance:

- **`weapon: mod.Weapons`** (getter) – The weapon being displayed (read-only).

- **`weapon: mod.Weapons`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon image after it has been created. Setting this property will log a warning and have no effect.

- **`setWeapon(weapon: mod.Weapons): UIWeaponImageButton`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon image after it has been created. Returns `this` for method chaining but has no effect.

- **`weaponPackage: mod.WeaponPackage`** (getter) – The weapon package being displayed (read-only). **Note** Adding attachments to this weapon package will have no effect on the UI element.

- **`weaponPackage: mod.WeaponPackage`** (setter) – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon package after it has been created. Setting this property will log a warning and have no effect.

- **`setWeaponPackage(weaponPackage: mod.WeaponPackage): UIWeaponImageButton`** – **Deprecated.** Currently not supported as the underlying Portal API lacks the ability to set the weapon package after it has been created. Returns `this` for method chaining but has no effect.

### WeaponImageButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The weapon image's size is automatically adjusted to account for padding.

- **`setPadding(padding: number): UIWeaponImageButton`** – Sets padding and returns `this` for method chaining.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and weapon image width, accounting for padding.

- **`height: number`** (getter/setter) – Setting height also updates the button widget and weapon image height, accounting for padding.

- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and weapon image size, accounting for padding.

- **`setSize(params: UI.Size): UIWeaponImageButton`** – Sets size for container, button, and weapon image, returns `this`.

---

## Type Definitions

### `UIWeaponImageButton.Params`

```ts
type Params = UIButton.Params & UIWeaponImage.Params;
```

---

## Usage Notes

- **Weapon Immutability**: Once a `UIWeaponImageButton` is created, the weapon and weapon package cannot be changed. The `weapon` and `weaponPackage` setters and their corresponding `set` methods are deprecated and will log a warning if used. To change the displayed weapon, create a new `UIWeaponImageButton` instance.

- **Weapon Package**: The `weaponPackage` parameter allows you to specify weapon attachments and modifications. If not provided, a new empty weapon package is created using `mod.CreateNewWeaponPackage()`.

- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and weapon image size, accounting for padding.

- **Padding**: The component supports padding, which creates space between the button border and the weapon image. The weapon image size is automatically adjusted to account for padding.

- **Method Chaining**: All setter methods return `this`, allowing you to chain multiple operations together.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIWeaponImage Documentation](../weapon-image/README.md) – For information about weapon image properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
