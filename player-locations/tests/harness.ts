import { Events } from '../../events/index.ts';
import type { Vectors } from '../../vectors/index.ts';

export interface MockPlayerData {
    id: number;
    connected: boolean;
    valid: boolean;
    position: Vectors.Vector3;
}

/**
 * Lightweight test harness to mock Battlefield Portal runtime and event channels.
 */
export class PortalTestHarness {
    private players: Map<number, MockPlayerData> = new Map();

    constructor() {
        this.setupGlobalMod();
    }

    public setupGlobalMod(): void {
        const playersMap = this.players;

        const mockMod = {
            SoldierStateVector: {
                GetPosition: 0,
                GetLinearVelocity: 1,
            },
            AllPlayers(): MockPlayerData[] {
                const connectedList: MockPlayerData[] = [];

                for (const p of playersMap.values()) {
                    if (p.connected) {
                        connectedList.push(p);
                    }
                }

                return connectedList;
            },
            CountOf(arr: unknown[]): number {
                return arr ? arr.length : 0;
            },
            ValueInArray(arr: unknown[], idx: number): unknown {
                return arr ? arr[idx] : undefined;
            },
            GetObjId(player: MockPlayerData | number): number {
                if (typeof player === 'number') return player;

                return player ? player.id : -1;
            },
            GetPlayer(id: number): MockPlayerData | null {
                const p = playersMap.get(id);

                return p && p.connected ? p : null;
            },
            IsPlayerValid(player: MockPlayerData | null): boolean {
                return !!(player && player.valid && player.connected);
            },
            GetSoldierState(player: MockPlayerData, _state: number): Vectors.Vector3 {
                return player.position;
            },
            GetObjectPosition(player: MockPlayerData): Vectors.Vector3 {
                return player ? player.position : { x: 0, y: 0, z: 0 };
            },
            CreateVector(x: number, y: number, z: number): Vectors.Vector3 {
                return { x, y, z };
            },
            XComponentOf(vector: Vectors.Vector3): number {
                return vector ? vector.x : 0;
            },
            YComponentOf(vector: Vectors.Vector3): number {
                return vector ? vector.y : 0;
            },
            ZComponentOf(vector: Vectors.Vector3): number {
                return vector ? vector.z : 0;
            },
        };

        (globalThis as unknown as { mod: unknown }).mod = mockMod;
    }

    public setPlayer(id: number, data: Partial<MockPlayerData>): void {
        const existing = this.players.get(id) || {
            id,
            connected: true,
            valid: true,
            position: { x: 0, y: 0, z: 0 },
        };

        const updated: MockPlayerData = {
            ...existing,
            ...data,
            id,
            position: data.position ? { ...data.position } : existing.position,
        };

        this.players.set(id, updated);
    }

    public getPlayer(id: number): MockPlayerData | undefined {
        return this.players.get(id);
    }

    public connectPlayer(id: number, position: Vectors.Vector3 = { x: 10, y: 10, z: 10 }): void {
        this.setPlayer(id, { connected: true, valid: true, position });
        const p = this.players.get(id)!;
        Events.OnPlayerJoinGame.trigger(p as unknown as mod.Player);
    }

    public disconnectPlayer(id: number): void {
        const p = this.players.get(id);

        if (p) {
            p.connected = false;
        }

        Events.OnPlayerLeaveGame.trigger(id);
    }

    public stepTick(): void {
        Events.OngoingGlobal.trigger();
    }

    public reset(): void {
        this.players.clear();
    }
}
