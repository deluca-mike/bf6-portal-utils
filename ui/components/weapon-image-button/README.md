# UIWeaponImageButton Component

<ai>

The `UIWeaponImageButton` component creates a button with an integrated weapon image. It combines `UIButton` and `UIWeaponImage` functionality into a single element, wrapping both in a container and forwarding properties cleanly.

</ai>

> **Note** This component extends `UIContentButton<UIWeaponImage>`. For information about the base `UI` namespace functionality, see the [main UI documentation](../../README.md).

---

## Quick Start

<ai>

```ts
import { UIWeaponImageButton } from 'bf6-portal-utils/ui/components/weapon-image-button';
import { UI } from 'bf6-portal-utils/ui';

const weaponPackage = mod.CreateNewWeaponPackage();
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Ammo_Hollow_Point, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Barrel_11_Extended, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Magazine_25rnd_Magazine, weaponPackage);
mod.AddAttachmentToWeaponPackage(mod.WeaponAttachments.Right_Laser_Light_Combo_Green, weaponPackage);

// Create a weapon image button with a handler (e.g. onClickUp)
const button = new UIWeaponImageButton({
    position: { x: 0, y: 0 },
    size: { width: 128, height: 64 },
    weapon: mod.Weapons.AssaultRifle_AK4D,
    weaponPackage: weaponPackage,
    onClickUp: async (player: mod.Player) => {
        console.log(`Player ${mod.GetObjId(player)} activated the AK24 button!`);
    },
    visible: true,
});

// Update button properties
button.enabled = false;
button.baseColor = UI.COLORS.BLUE;
```

</ai>

---

## Constructor Parameters

| Param | Type / Default | Notes |
| --- | --- | --- |
| All parameters from `UIBaseButton.Params`, plus: |
| `weapon` | `mod.Weapons` | **Required.** The weapon to display. |
| `weaponPackage` | `mod.WeaponPackage = mod.CreateNewWeaponPackage()` | The weapon package (attachments, etc.) to display with the weapon. |
| `padding` | `number = 0` | Container padding. |

For a complete list of `UIBaseButton.Params`, see the [UIBaseButton documentation](../base-button/README.md).

---

## Properties & Methods

### Inherited from `UIBaseButton` / `UI.Element`

`UIWeaponImageButton` inherits all properties from `UIBaseButton` and `UI.Element`, including:

- **Position & Size**: `x`, `y`, `width`, `height`, `position`, `size`
- **Visibility**: `visible`
- **Background**: `bgColor`, `bgAlpha`, `bgFill`
- **Layout**: `anchor`, `depth`
- **UI Input Mode**: `uiInputModeWhenVisible`
- **Lifecycle**: `delete()`, `isDeleted`, `isValid`
- **Parent Management**: `parent`
- **Button State**: `enabled`
- **Button handlers**: `onClickDown`, `onClickUp`, `onFocusIn`, `onFocusOut`
- **Button Colors**: `baseColor`, `disabledColor`, `pressedColor`, `focusedColor`
- **Button Alphas**: `baseAlpha`, `disabledAlpha`, `pressedAlpha`, `focusedAlpha`

For complete documentation of these properties, see the [main UI documentation](../../README.md#abstract-class-uielement-extends-uinode) and [UIBaseButton documentation](../base-button/README.md).

### Delegated from Internal Weapon Image

- **`weapon: mod.Weapons`** (getter) – The weapon being displayed (read-only).
- **`weaponPackage: mod.WeaponPackage`** (getter) – The weapon package being displayed (read-only).

### WeaponImageButton-Specific

- **`padding: number`** (getter/setter) – Container padding. The weapon image's size is automatically adjusted to account for padding.

### Overrides

- **`width: number`** (getter/setter) – Setting width also updates the button widget and weapon image width, accounting for padding.
- **`height: number`** (getter/setter) – Setting height also updates the button widget and weapon image height, accounting for padding.
- **`size: UI.Size`** (getter/setter) – Setting size also updates the button widget and weapon image size, accounting for padding.

---

## Type Definitions

### `UIWeaponImageButton.Params`

```ts
type Params = UIBaseButton.Params & UIWeaponImage.Params;
```

---

## Usage Notes

- **Weapon Immutability**: Once a `UIWeaponImageButton` is created, the weapon and weapon package cannot be changed. To change the displayed weapon, create a new `UIWeaponImageButton` instance.
- **Weapon Package**: The `weaponPackage` parameter allows you to specify weapon attachments and modifications. If not provided, a new empty weapon package is created using `mod.CreateNewWeaponPackage()`.
- **Size Synchronization**: Setting `width`, `height`, or `size` automatically updates the button widget and weapon image size, accounting for padding.
- **Padding**: The component supports padding, which creates space between the button border and the weapon image. The weapon image size is automatically adjusted to account for padding.

---

## Further Reference

- [Main UI Documentation](../../README.md) – For information about the base `UI` namespace and `Element` class
- [UIContentButton Documentation](../content-button/README.md) – For information about the base class
- [UIButton Documentation](../button/README.md) – For information about button properties
- [UIWeaponImage Documentation](../weapon-image/README.md) – For information about weapon image properties
- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type declarations
