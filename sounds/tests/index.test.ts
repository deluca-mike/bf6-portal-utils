import './mockMod.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockTypes, resetSoundsMock, MockSFX } from './mockMod.ts';
import { Sounds } from '../index.ts';
import { Events } from '../../events/index.ts';

describe('Sounds Module Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetSoundsMock();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Creation and Validation', () => {
        it('should create an SFX object at specified position and check validity', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common, { x: 1, y: 2, z: 3 });
            const sfxId = (sfx as unknown as MockSFX)._id;

            expect(sfx).toBeDefined();
            expect(Sounds.isValid(sfxId)).toBe(true);

            Sounds.dispose(sfx);
            expect(Sounds.isValid(sfxId)).toBe(false);
        });
    });

    describe('Playback (2D & 3D & Targets)', () => {
        it('should play sound in 2D with amplitude', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 0.8);

            const mockObj = sfx as unknown as MockSFX;
            expect(mockObj.isPlaying).toBe(true);
            expect(mockObj.amplitude).toBe(0.8);
        });

        it('should play sound in 3D with position and attenuation', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 0.5, {
                position: { x: 10, y: 0, z: 10 },
                attenuationRange: 25,
            });

            const mockObj = sfx as unknown as MockSFX;
            expect(mockObj.isPlaying).toBe(true);
            expect(mockObj.amplitude).toBe(0.5);
        });

        it('should target specific Player, Squad, or Team', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            const playerTarget = { _type: mockTypes.Player };
            const squadTarget = { _type: mockTypes.Squad };
            const teamTarget = { _type: mockTypes.Team };

            expect(() => {
                Sounds.play(sfx, 1.0, { target: playerTarget as unknown as mod.Player });
                Sounds.play(sfx, 1.0, { target: squadTarget as unknown as mod.Squad });
                Sounds.play(sfx, 1.0, { target: teamTarget as unknown as mod.Team });
            }).not.toThrow();
        });

        it('should auto-stop after duration', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 1.0, { duration: 3000 });

            const mockObj = sfx as unknown as MockSFX;
            expect(mockObj.isPlaying).toBe(true);

            // Advance 2s
            vi.advanceTimersByTime(2000);
            Events.OngoingGlobal.trigger();
            expect(mockObj.isPlaying).toBe(true);

            // Advance past 3s
            vi.advanceTimersByTime(1500);
            Events.OngoingGlobal.trigger();
            expect(mockObj.isPlaying).toBe(false);
        });
    });

    describe('One-shot Playback', () => {
        it('should play and automatically dispose upon duration completion', () => {
            const sfx = Sounds.playOneShot('TestSFX' as unknown as mod.RuntimeSpawn_Common, 2000, 0.9);
            const sfxId = (sfx as unknown as MockSFX)._id;

            expect(Sounds.isValid(sfxId)).toBe(true);
            expect((sfx as unknown as MockSFX).isPlaying).toBe(true);

            vi.advanceTimersByTime(2500);
            Events.OngoingGlobal.trigger();

            expect(Sounds.isValid(sfxId)).toBe(false);
        });
    });

    describe('Stop and Cancel', () => {
        it('should stop playback immediately or with delay', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 1.0);

            const mockObj = sfx as unknown as MockSFX;
            expect(mockObj.isPlaying).toBe(true);

            Sounds.stop(sfx);
            expect(mockObj.isPlaying).toBe(false);

            Sounds.play(sfx, 1.0);
            Sounds.stop(sfx, 1000);
            expect(mockObj.isPlaying).toBe(true);

            vi.advanceTimersByTime(1100);
            Events.OngoingGlobal.trigger();
            expect(mockObj.isPlaying).toBe(false);
        });

        it('should cancel active stop timer', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 1.0);
            Sounds.stop(sfx, 2000);

            Sounds.cancelStop(sfx);

            vi.advanceTimersByTime(3000);
            Events.OngoingGlobal.trigger();

            expect((sfx as unknown as MockSFX).isPlaying).toBe(true);
        });
    });

    describe('Fading and Amplitude Control', () => {
        it('should set amplitude directly', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.setAmplitude(sfx, 0.42);
            expect((sfx as unknown as MockSFX).amplitude).toBe(0.42);
        });

        it('should fade amplitude over time and stop on complete', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.play(sfx, 1.0);

            Sounds.fade(sfx, {
                startAmplitude: 1.0,
                targetAmplitude: 0,
                duration: 1000,
                steps: 4, // 250ms per step
                stopOnComplete: true,
            });

            const mockObj = sfx as unknown as MockSFX;

            // Step 1 (250ms): amplitude drops to 0.75
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect(mockObj.amplitude).toBeCloseTo(0.75, 2);

            // Step 2 (500ms): amplitude drops to 0.50
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect(mockObj.amplitude).toBeCloseTo(0.5, 2);

            // Step 3 (750ms): amplitude drops to 0.25
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect(mockObj.amplitude).toBeCloseTo(0.25, 2);

            // Step 4 (1000ms): amplitude drops to 0.00 and stops
            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect(mockObj.amplitude).toBeCloseTo(0, 2);
            expect(mockObj.isPlaying).toBe(false);
        });

        it('should cancel active fade', () => {
            const sfx = Sounds.create('TestSFX' as unknown as mod.RuntimeSpawn_Common);
            Sounds.fade(sfx, {
                startAmplitude: 1.0,
                targetAmplitude: 0,
                duration: 1000,
                steps: 4,
            });

            vi.advanceTimersByTime(250);
            Events.OngoingGlobal.trigger();
            expect((sfx as unknown as MockSFX).amplitude).toBeCloseTo(0.75, 2);

            Sounds.cancelFade(sfx);

            vi.advanceTimersByTime(1000);
            Events.OngoingGlobal.trigger();
            expect((sfx as unknown as MockSFX).amplitude).toBeCloseTo(0.75, 2);
        });
    });
});
