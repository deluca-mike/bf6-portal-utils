# Map Detector Module

<ai>

This TypeScript `MapDetector` class enables Battlefield Portal experience developers to detect the current map by analyzing the coordinates of Team 1's Headquarters (HQ). This utility is necessary because `mod.IsCurrentMap` from the official Battlefield Portal API is currently broken and unreliable.

</ai>

---

## Quick Start

1. Install the package: `npm install -D bf6-portal-utils`
2. Import the module in your code:
    ```ts
    import { MapDetector } from 'bf6-portal-utils/map-detector';
    ```
3. Access the current map using any of the provided getters or methods.
4. Use [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) to bundle your mod (it will automatically inline the code).

<ai>

### Example

```ts
import { MapDetector } from 'bf6-portal-utils/map-detector';
import { Events } from 'bf6-portal-utils/events';

// If your experience uses custom spatial data that moves HQ1 on certain maps, set the
// expected HQ1 coordinates for each affected map here (after imports, not in an event handler).
MapDetector.setCoordinates(MapDetector.Map.Downtown, { x: -1044, y: 122, z: 220 });
MapDetector.setCoordinates(MapDetector.Map.Eastwood, { x: -195, y: 231, z: -41 });

Events.OnGameModeStarted.subscribe(() => {
    // Optional: Configure logging for map detection debugging
    MapDetector.setLogging((text) => console.log(text), MapDetector.LogLevel.Warning);

    // Get the current map as a MapDetector.Map enum
    const map = MapDetector.currentMap();

    if (map == MapDetector.Map.Downtown) {
        // Handle Downtown-specific logic
    }

    if (map == MapDetector.Map.Eastwood) {
        // Handle Eastwood-specific logic
    }

    // Get the current map as a string
    const mapName = MapDetector.currentMapName();
    console.log(`Current map: ${mapName}`);
});
```

</ai>

---

## API Reference

### `namespace MapDetector`

The `MapDetector` namespace contains map detection functions and related types.

#### `MapDetector.LogLevel`

An enum re-exported from the `Logging` module for controlling logging verbosity. Use this with `MapDetector.setLogging()` to configure the minimum log level for map detection logging.

Available log levels:

- `Debug` (0) – Debug-level messages. Most verbose.
- `Info` (1) – Informational messages.
- `Warning` (2) – Warning messages. Includes failed map detection and missing native enum entries. Default minimum log level.
- `Error` (3) – Error messages. Includes errors when getting HQ coordinates. Least verbose.

For more details on log levels, see the [`Logging` module documentation](../logging/README.md).

#### Constants

| Constant             | Type     | Value     | Description                                                 |
| -------------------- | -------- | --------- | ----------------------------------------------------------- |
| `MIN_MAP_COORDINATE` | `number` | `-32_768` | Minimum coordinate supported (signed 16-bit integer limit). |
| `MAX_MAP_COORDINATE` | `number` | `32_767`  | Maximum coordinate supported (signed 16-bit integer limit). |

#### Static Methods

| Method | Description |
| --- | --- |
| `setLogging(log?: (text: string) => Promise<void> \| void, logLevel?: LogLevel, includeRawError?: boolean): void` | Configures logging for the MapDetector module. The map detector logs warnings when map detection fails or when maps are not available in the native enum, and errors when HQ coordinate retrieval fails. Pass `undefined` (or `null`) for `log` to disable logging. Default log level is `Warning`, default `includeRawError` is `false`. See the [`Logging` module documentation](../logging/README.md). |
| `setCoordinates(map: MapDetector.Map, coordinates: Vectors.Vector3): void` | Sets the expected HQ1 coordinates used for detecting the given map. Coordinates are rounded to nearest integers and clamped to `[-32,768, 32,767]`. Call this for **each map** where your experience uses custom spatial data that moves Team 1's HQ—at the **top of your file** (after imports), not in an event handler, so coordinates are set before any detection runs. Only the **integer parts** of the coordinates are used for matching (decimals are ignored); this is sufficient because map HQ positions differ significantly. |
| `currentMap(): MapDetector.Map \| null` | Returns the current map as a `MapDetector.Map` enum value, or `null` if the map cannot be determined. |
| `currentNativeMap(): mod.Maps \| null` | Returns the current map as a `mod.Maps` enum value (native Battlefield Portal API), or `null` if the map cannot be determined or is not available in the native enum. |
| `currentMapName(): string \| null` | Returns the current map as a string (e.g., `"Downtown"`), or `null` if the map cannot be determined. |
| `isCurrentMap(map: MapDetector.Map): boolean` | Returns `true` if the current map matches the given `MapDetector.Map` enum value. |
| `isCurrentNativeMap(map: mod.Maps): boolean` | Returns `true` if the current map matches the given `mod.Maps` enum value. |

---

<ai>

## Supported Maps

The `MapDetector` namespace supports detection of the following maps via the `MapDetector.Map` enum:

- Area 22B
- Bellum1988's Operation Metro (see [Missing Maps in Native Enum](#missing-maps-in-native-enum))
- Blackwell Fields
- Cairo Bazaar
- Complex 3
- Contaminated
- Defense Nexus
- Downtown
- Eastwood
- Empire State
- Golf Course
- Hagental Base
- Iberian Offensive
- Liberation Peak
- Manhattan Bridge
- Marina
- Mirak Valley
- New Sobek City
- Operation Firestorm
- Portal Sandbox
- Railway to Golmud
- Redline Storage
- Saints Quarter
- Siege of Cairo

---

## Custom map spatial layouts

If your experience uses **custom spatial data** that moves Team 1's HQ from its default position on one or more maps, detection would otherwise fail. Call **`MapDetector.setCoordinates(map, coordinates)`** for **each map** where HQ1 has a non-default position. Do this **at the top of your file** (after imports), **not** inside an event handler—your code does not know the current map until the detector runs, so you must pre-configure every map whose layout you have changed. Pass the (x, y, z) position of HQ1 for that layout; coordinates are rounded to integers and clamped to `[-32,768, 32,767]`. That is sufficient because HQ positions differ widely between maps, so integer comparison is enough to distinguish them.

---

## Known Limitations

### Missing Maps in Native Enum

The map **"Bellum1988's Operation Metro"** is not available in the native `mod.Maps` enum (it is missing from the Battlefield Portal API). As a result:

- `MapDetector.currentNativeMap()` will return `null` for that map.
- `MapDetector.isCurrentNativeMap()` will always return `false` for that map when checking against any `mod.Maps` value.
- `MapDetector.currentMap()` and `MapDetector.isCurrentMap()` **behave correctly for that map**.

Use `MapDetector.Map` enum values and `isCurrentMap()` when working with that map (or for consistency, for all maps).

### Detection Method

The detector identifies maps by comparing the **integer parts** of Team 1's HQ position (x, y, z) to the known coordinates for each map; decimal parts are ignored. If custom spatial data has moved HQ1 on certain maps, call `setCoordinates()` at the top of your file for each affected map with the new HQ1 position so detection continues to work.

</ai>

---

## How It Works

The `MapDetector` uses a coordinate-based detection system:

1. **Structure of Arrays** – The module stores all map coordinates and native map equivalents in flat, parallel arrays (`_mapKeys`, `_mapX: Int16Array`, `_mapY: Int16Array`, `_mapZ: Int16Array`, `_mapNative`).
2. **Coordinate Matching** – The detector reads Team 1's HQ position and compares only the **integer parts** of x, y, and z to the known arrays (decimal parts are ignored). You can override stored coordinates via `setCoordinates()` when using custom spatial layouts that move the HQ.
3. **Memoization (Caching)** – Because the map does not dynamically change during a single run of a Portal script, the detector caches the index after the first successful map detection. All subsequent calls to `currentMap()` or `currentNativeMap()` return the cached result instantly in `O(1)` time without polling the HQ position again.
4. **Enum Mapping** – Detected maps can be returned as either `MapDetector.Map` enum values or mapped to the native `mod.Maps` enum where available (some maps are not in the native enum).
5. **Error Logging** – When map detection fails or HQ coordinate retrieval encounters errors, warnings and errors are logged using the configured logger.

The detection is extremely fast, allocation-free, and requires no additional setup for default spatial data; for custom layouts, call `setCoordinates()` at the top of your file for each map where your experience has a non-default HQ1 position.

---

## Further Reference

- [`bf6-portal-mod-types`](https://deluca-mike.github.io/bf6-portal-mod-types/) – Official Battlefield Portal type declarations consumed by this module.
- [`bf6-portal-bundler`](https://www.npmjs.com/package/bf6-portal-bundler) – The bundler tool used to package TypeScript code for Portal experiences.

---

## Feedback & Support

This module is under **active development**. If you discover new maps that need to be added, or encounter issues with detection accuracy, please open an issue or reach out through the project channels. Contributions to expand map support are welcome.

---
