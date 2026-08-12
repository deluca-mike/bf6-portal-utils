# Colors Module

<ai>

The `Colors` namespace provides a high-performance, transparent color representation and manipulation engine tailored for Battlefield Portal. Colors are represented as simple transparent JavaScript objects `{ r, g, b }` with normalized channel values in the range $[0, 1]$.

Key features include:

- **Transparent Representation (`Color`)** – Plain `{ r, g, b }` objects with zero opaque wrapper overhead, allowing instant property access, destructuring, spread operations, and JSON serialization.
- **Dedicated Color Domain Utilities** – Built-in support for hex parsing (`fromHex`), hex formatting (`toHex`), clamping (`clamp`), tinting / Hadamard modulation (`tint`), and perceived luminance calculations (`luminance`).
- **Comprehensive Math & Blending** – Zero-allocation `lerp`, `add`, `subtract`, `multiply`, `divide`, `equals`, `set`, `copy`, and `clone` utilities supporting optional caller-provided `out` objects for garbage-free per-frame loops.
- **Standard & Battlefield Brand Presets** – Pre-packaged constants (`WHITE`, `BLACK`, `RED`, `BF_BLUE_BRIGHT`, `BF_RED_DARK`, etc.) frozen for runtime safety.
- **Zero-Allocation Bridging** – Seamless conversion to/from engine native `mod.Vector` (`toVector`, `fromVector`) and spatial `Vectors.Vector3` (`toVector3`, `fromVector3`).

</ai>

---

## Quick Start

1. Import the module:
    ```ts
    import { Colors } from 'bf6-portal-utils/colors';
    ```

<ai>

### Examples

#### 1. Creating and Manipulating Colors

```ts
import { Colors } from 'bf6-portal-utils/colors';

// Parse from Hex
const orange = Colors.fromHex('#FF8361'); // { r: 1.0, g: 0.5137, b: 0.3804 }
const cyan = Colors.fromHex('00FFFF'); // { r: 0, g: 1, b: 1 }

// Convert back to Hex
const hexString = Colors.toHex(orange); // '#FF8361'

// Zero-allocation linear interpolation
const scratchColor: Colors.Color = { r: 0, g: 0, b: 0 };
Colors.lerp(Colors.RED, Colors.BLUE, 0.5, scratchColor);
```

#### 2. Color Tinting and Scaling

```ts
import { Colors } from 'bf6-portal-utils/colors';

const baseColor = Colors.fromHex('#D5EBF9');
const tintColor = { r: 1.0, g: 0.8, b: 0.8 };

// Element-wise modulation (Hadamard product)
const tinted = Colors.tint(baseColor, tintColor);

// Brightness multiplier
const dimColor = Colors.multiply(baseColor, 0.5);
```

#### 3. Interoperability with Engine and Vectors

```ts
import { Colors } from 'bf6-portal-utils/colors';
import { Vectors } from 'bf6-portal-utils/vectors';

const color = Colors.RED;

// Bridge to engine native vector
const modVec = Colors.toVector(color); // mod.CreateVector(1, 0, 0)

// Bridge to spatial Vector3
const vec3: Vectors.Vector3 = Colors.toVector3(color); // { x: 1, y: 0, z: 0 }
```

</ai>
