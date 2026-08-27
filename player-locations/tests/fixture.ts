import type { Vectors } from '../../vectors/index.ts';
import type { MockPlayerData } from './harness.ts';

// Deterministic Pseudo-Random Generator (Mulberry32)
function mulberry32(seed: number): () => number {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface TestFixtureData {
    players: MockPlayerData[];
    connectedIds: number[];
    activeIds: number[];
    inactiveOriginIds: number[];
    disconnectedIds: number[];
    positions: Map<number, Vectors.Vector3>;
}

/**
 * Generates a deterministic 90-player test fixture with 80 active and 10 inactive near-origin players.
 * @returns Complete TestFixtureData object.
 */
export function createDefaultFixture(): TestFixtureData {
    const rng = mulberry32(1337);

    const players: MockPlayerData[] = [];
    const connectedIds: number[] = [];
    const activeIds: number[] = [];
    const inactiveOriginIds: number[] = [];
    const disconnectedIds: number[] = [];
    const positions = new Map<number, Vectors.Vector3>();

    // 10 Disconnected Slot IDs: 9, 19, 29, 39, 49, 59, 69, 79, 89, 99
    const disconnectedSet = new Set([9, 19, 29, 39, 49, 59, 69, 79, 89, 99]);

    // 10 Inactive Near-Origin Slot IDs: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90
    const inactiveOriginSet = new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);

    for (let id = 0; id < 100; ++id) {
        if (disconnectedSet.has(id)) {
            disconnectedIds.push(id);
            players.push({
                id,
                connected: false,
                valid: false,
                position: { x: 0, y: 0, z: 0 },
            });
            continue;
        }

        connectedIds.push(id);

        if (inactiveOriginSet.has(id)) {
            inactiveOriginIds.push(id);
            // Near-origin coordinates (< 0.001m / 1mm)
            const jitterX = (rng() - 0.5) * 0.0008;
            const jitterY = (rng() - 0.5) * 0.0008;
            const jitterZ = (rng() - 0.5) * 0.0008;
            const pos = { x: jitterX, y: jitterY, z: jitterZ };

            positions.set(id, pos);
            players.push({
                id,
                connected: true,
                valid: true,
                position: pos,
            });
        } else {
            activeIds.push(id);
            // Uniformly scattered in [-10000, 10000] meters
            const x = Math.round((rng() * 20000 - 10000) * 1000) / 1000;
            const y = Math.round((rng() * 2000 - 500) * 1000) / 1000; // Elevation between -500m and 1500m
            const z = Math.round((rng() * 20000 - 10000) * 1000) / 1000;
            const pos = { x, y, z };

            positions.set(id, pos);
            players.push({
                id,
                connected: true,
                valid: true,
                position: pos,
            });
        }
    }

    return {
        players,
        connectedIds,
        activeIds,
        inactiveOriginIds,
        disconnectedIds,
        positions,
    };
}

// =========================================================================
// Brute-Force Ground Truth Solvers (for Baseline Cross-Verification)
// =========================================================================

export const GroundTruth = {
    sphere(fixture: TestFixtureData, cx: number, cy: number, cz: number, radius: number): number[] {
        if (radius <= 0) return [];

        const rSq = radius * radius;
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dz = p.z - cz;

            if (dx * dx + dy * dy + dz * dz <= rSq + 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    cylinder(
        fixture: TestFixtureData,
        cx: number,
        cz: number,
        radius: number,
        minY: number = -Infinity,
        maxY: number = Infinity
    ): number[] {
        if (radius <= 0) return [];

        const rSq = radius * radius;
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.y < minY || p.y > maxY) continue;

            const dx = p.x - cx;
            const dz = p.z - cz;

            if (dx * dx + dz * dz <= rSq + 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    aabb(
        fixture: TestFixtureData,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number
    ): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (
                p.x >= minX - 1e-7 &&
                p.x <= maxX + 1e-7 &&
                p.y >= minY - 1e-7 &&
                p.y <= maxY + 1e-7 &&
                p.z >= minZ - 1e-7 &&
                p.z <= maxZ + 1e-7
            ) {
                result.push(id);
            }
        }

        return result;
    },

    prism(
        fixture: TestFixtureData,
        vertices: { x: number; z: number }[],
        minY: number = -Infinity,
        maxY: number = Infinity
    ): number[] | null {
        const count = vertices.length;

        if (count < 3 || count > 32) return null;

        const vertX: number[] = [];
        const vertZ: number[] = [];

        for (let i = 0; i < count; ++i) {
            vertX.push(vertices[i].x);
            vertZ.push(vertices[i].z);
        }

        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.y < minY || p.y > maxY) continue;

            let inside = false;

            for (let i = 0, j = count - 1; i < count; j = i++) {
                const xi = vertX[i];
                const zi = vertZ[i];
                const xj = vertX[j];
                const zj = vertZ[j];

                const intersect = zi > p.z !== zj > p.z && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;

                if (intersect) {
                    inside = !inside;
                }
            }

            if (inside) {
                result.push(id);
            }
        }

        return result;
    },

    above(fixture: TestFixtureData, y: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.y >= y - 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    below(fixture: TestFixtureData, y: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.y <= y + 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    eastOf(fixture: TestFixtureData, x: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.x >= x - 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    westOf(fixture: TestFixtureData, x: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.x <= x + 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    southOf(fixture: TestFixtureData, z: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.z >= z - 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    northOf(fixture: TestFixtureData, z: number): number[] {
        const result: number[] = [];

        for (const id of fixture.activeIds) {
            const p = fixture.positions.get(id)!;

            if (p.z <= z + 1e-7) {
                result.push(id);
            }
        }

        return result;
    },

    kClosest(
        fixture: TestFixtureData,
        cx: number,
        cy: number,
        cz: number,
        k: number,
        filterFn?: (id: number) => boolean
    ): number[] {
        if (k <= 0) return [];

        const candidates = fixture.activeIds
            .filter((id) => !filterFn || filterFn(id))
            .map((id) => {
                const p = fixture.positions.get(id)!;
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dz = p.z - cz;

                return { id, distSq: dx * dx + dy * dy + dz * dz };
            });

        candidates.sort((a, b) => a.distSq - b.distSq);

        return candidates.slice(0, k).map((c) => c.id);
    },

    kFarthest(
        fixture: TestFixtureData,
        cx: number,
        cy: number,
        cz: number,
        k: number,
        filterFn?: (id: number) => boolean
    ): number[] {
        if (k <= 0) return [];

        const candidates = fixture.activeIds
            .filter((id) => !filterFn || filterFn(id))
            .map((id) => {
                const p = fixture.positions.get(id)!;
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dz = p.z - cz;

                return { id, distSq: dx * dx + dy * dy + dz * dz };
            });

        candidates.sort((a, b) => b.distSq - a.distSq);

        return candidates.slice(0, k).map((c) => c.id);
    },

    kHighest(fixture: TestFixtureData, k: number, filterFn?: (id: number) => boolean): number[] {
        if (k <= 0) return [];

        const candidates = fixture.activeIds
            .filter((id) => !filterFn || filterFn(id))
            .map((id) => ({ id, y: fixture.positions.get(id)!.y }));

        candidates.sort((a, b) => b.y - a.y);

        return candidates.slice(0, k).map((c) => c.id);
    },

    kLowest(fixture: TestFixtureData, k: number, filterFn?: (id: number) => boolean): number[] {
        if (k <= 0) return [];

        const candidates = fixture.activeIds
            .filter((id) => !filterFn || filterFn(id))
            .map((id) => ({ id, y: fixture.positions.get(id)!.y }));

        candidates.sort((a, b) => a.y - b.y);

        return candidates.slice(0, k).map((c) => c.id);
    },
};
