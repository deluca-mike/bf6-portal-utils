import './mockMod.ts';
import { describe, expect, it } from 'vitest';
import { ModExtensions } from '../index.ts';

describe('ModExtensions Module Tests', () => {
    describe('getPlayerDamageType', () => {
        it('should return matching player damage type when comparison succeeds', () => {
            const result = ModExtensions.getPlayerDamageType('Bullet' as unknown as mod.DamageType);
            expect(result).toBe('Bullet');
        });

        it('should return null when no damage type matches', () => {
            const result = ModExtensions.getPlayerDamageType('UnknownDamage' as unknown as mod.DamageType);
            expect(result).toBeNull();
        });
    });

    describe('getPlayerDeathType', () => {
        it('should return matching player death type when comparison succeeds', () => {
            const result = ModExtensions.getPlayerDeathType('Suicide' as unknown as mod.DeathType);
            expect(result).toBe('Suicide');
        });

        it('should return null when no death type matches', () => {
            const result = ModExtensions.getPlayerDeathType('UnknownDeath' as unknown as mod.DeathType);
            expect(result).toBeNull();
        });
    });

    describe('getGadget', () => {
        it('should return matching gadget when comparison succeeds', () => {
            const result = ModExtensions.getGadget('Medkit' as unknown as mod.WeaponUnlock);
            expect(result).toBe('Medkit');
        });

        it('should return null when no gadget matches', () => {
            const result = ModExtensions.getGadget('NonExistentGadget' as unknown as mod.WeaponUnlock);
            expect(result).toBeNull();
        });
    });

    describe('getWeapon', () => {
        it('should return matching weapon when comparison succeeds', () => {
            const result = ModExtensions.getWeapon('AK47' as unknown as mod.WeaponUnlock);
            expect(result).toBe('AK47');
        });

        it('should return null when no weapon matches', () => {
            const result = ModExtensions.getWeapon('NonExistentWeapon' as unknown as mod.WeaponUnlock);
            expect(result).toBeNull();
        });
    });
});
