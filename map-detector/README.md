# Map Detector Module

This TypeScript `MapDetector` class enables Battlefield Portal experience developers to detect the current map by
analyzing the coordinates of Team 1's Headquarters (HQ). This utility is necessary because `mod.IsCurrentMap` from the
official Battlefield Portal API is currently broken and unreliable.

The detector captures the HQ coordinates as soon as the class loads (before any runtime modifications can occur) and
uses these coordinates to identify which map is currently active.

> **Note** All Battlefield Portal types referenced below (`mod.Player`, `mod.Vector`, `mod.Maps`, etc.) come from
> [`mod/index.d.ts`](../mod/index.d.ts); check that file for exact signatures.

---

## Prerequisites

1. **Package installation** – Install `bf6-portal-utils` as a dev dependency in your project.
2. **Bundler** – Use the [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) package to bundle your
   mod. The bundler automatically handles code inlining.
3. **Spatial data assumption** – This utility assumes that the spatial data loaded with the map has not changed the
   location of Team 1's HQ. If custom spatial modifications have moved the HQ, detection may fail.

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { MapDetector } from 'bf6-portal-utils/map-detector';
    ```
3. Access the current map using any of the provided getters or methods.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will
   automatically inline the code).

### Example

```ts
import { MapDetector } from 'bf6-portal-utils/map-detector';

export async function OnGameModeStarted(): Promise<void> {
    // Get the current map as a MapDetector.Map enum
    const map = MapDetector.currentMap();
    if (map == MapDetector.Map.Downtown) {
        // Handle Downtown-specific logic
    }

    // Get the current map as a mod.Maps enum (native API)
    const nativeMap = MapDetector.currentNativeMap();
    if (nativeMap == mod.Maps.Granite_MainStreet) {
        // Handle using native enum
    }

    // Get the current map as a string
    const mapName = MapDetector.currentMapName();
    console.log(`Current map: ${mapName}`);

    // Check if current map matches a specific map
    if (MapDetector.isCurrentMap(MapDetector.Map.Eastwood)) {
        // Eastwood-specific setup
    }

    // Get HQ coordinates for debugging
    const hq = MapDetector.getHQCoordinates(2);
    console.log(`HQ position: <${hq.x}, ${hq.y}, ${hq.z}>`);
}
```

---

## API Reference

### `class MapDetector`

#### Static Methods

| Method                                       | Description                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `currentMap(): MapDetector.Map \| undefined` | Returns the current map as a `MapDetector.Map` enum value, or `undefined` if the map cannot be determined.                                                                 |
| `currentNativeMap(): mod.Maps \| undefined`  | Returns the current map as a `mod.Maps` enum value (native Battlefield Portal API), or `undefined` if the map cannot be determined or is not available in the native enum. |
| `currentMapName(): string \| undefined`      | Returns the current map as a string (e.g., `"Downtown"`), or `undefined` if the map cannot be determined.                                                                  |

#### Static Methods

| Method                                                                          | Description                                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isCurrentMap(map: MapDetector.Map): boolean`                                   | Returns `true` if the current map matches the given `MapDetector.Map` enum value.                                                                          |
| `isCurrentNativeMap(map: mod.Maps): boolean`                                    | Returns `true` if the current map matches the given `mod.Maps` enum value.                                                                                 |
| `getHQCoordinates(decimalPlaces?: number): { x: number, y: number, z: number }` | Returns the Team 1 HQ coordinates rounded to the specified number of decimal places (default: 2). Useful for debugging or discovering new map coordinates. |

---

## Supported Maps

The `MapDetector` class supports detection of the following maps via the `MapDetector.Map` enum:

- Area 22B
- Blackwell Fields
- Defense Nexus
- Downtown
- Eastwood
- Empire State
- Golf Course
- Iberian Offensive
- Liberation Peak
- Manhattan Bridge
- Marina
- Mirak Valley
- New Sobek City
- Operation Firestorm
- Portal Sandbox
- Redline Storage
- Saints Quarter
- Siege of Cairo

---

## Known Limitations

### Missing Maps in Native Enum

The maps **"Area 22B"** and **"Redline Storage"** are not available in the native `mod.Maps` enum due to an oversight in
the Battlefield Portal API. As a result:

- `MapDetector.currentNativeMap` will return `undefined` for these maps (they are not present in `mod.Maps`).
- `MapDetector.isCurrentNativeMap()` will always return `false` for these maps when checking against any `mod.Maps`
  value.
- `MapDetector.currenMap` and `MapDetector.isCurrentMap` **will behave correctly for these maps**.

Therefore, use `MapDetector.Map` enum values and the `isCurrentMap()` method when working with these maps (or
preferably, for all maps).

### Detection Method

The detector identifies maps primarily by the X-coordinate of Team 1's HQ, with Y-coordinate used for disambiguation in
two cases (Mirak Valley vs New Sobek City). If custom spatial data or modifications have moved the HQ from its default
position, detection will fail and all getters will return `undefined`.

---

## How It Works

The `MapDetector` uses a coordinate-based detection system:

1. **Coordinate Matching** – The detector compares the Team 1's HQ X-coordinate (and Y-coordinate when needed) against
   known map HQ positions.
2. **Enum Mapping** – Detected maps can be returned as either `MapDetector.Map` enum values or mapped to the native
   `mod.Maps` enum where available.

The detection is fast and requires no additional setup, making it suitable for use in any event handler or game logic.

---

## Further Reference

- [`bf6-portal-mod-types`](https://www.npmjs.com/package/bf6-portal-mod-types) – Official Battlefield Portal type
  declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package mods for
  Portal.
- Battlefield Builder docs – For information about spatial data and HQ positioning.

---

## Feedback & Support

This module is under **active development**. If you discover new maps that need to be added, or encounter issues with
detection accuracy, please open an issue or reach out through the project channels. Contributions to expand map support
are welcome.

---
