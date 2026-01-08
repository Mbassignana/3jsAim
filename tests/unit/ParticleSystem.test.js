/**
 * Unit tests for ParticleSystem
 * Tests particle emission, lifecycle, and presets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  ParticleSystem,
  ParticleEmitter,
  ParticlePresets,
  getParticleSystem,
  resetParticleSystem,
} from '../../src/effects/ParticleSystem.js';

describe('ParticleSystem', () => {
  let particleSystem;

  beforeEach(() => {
    particleSystem = new ParticleSystem();
  });

  afterEach(() => {
    particleSystem.clear();
  });

  // ==========================================================================
  // Particle Presets
  // ==========================================================================
  describe('ParticlePresets', () => {
    it('should have all expected presets defined', () => {
      expect(ParticlePresets.WALL_IMPACT).toBeDefined();
      expect(ParticlePresets.NEAR_MISS).toBeDefined();
      expect(ParticlePresets.TARGET_HIT).toBeDefined();
      expect(ParticlePresets.TARGET_DESTROY).toBeDefined();
      expect(ParticlePresets.BULLET_TRAIL).toBeDefined();
      expect(ParticlePresets.MUZZLE_FLASH).toBeDefined();
      expect(ParticlePresets.SHELL_CASING).toBeDefined();
      expect(ParticlePresets.DUST_CLOUD).toBeDefined();
      expect(ParticlePresets.SPARKS).toBeDefined();
      expect(ParticlePresets.BLOOD_SPLATTER).toBeDefined();
    });

    it('should have required properties for each preset', () => {
      for (const [name, preset] of Object.entries(ParticlePresets)) {
        expect(preset.type, `${name} should have type`).toBeDefined();
        expect(preset.particleCount, `${name} should have particleCount`).toBeGreaterThan(0);
        expect(preset.particle, `${name} should have particle config`).toBeDefined();
        expect(preset.particle.minLife, `${name} should have minLife`).toBeDefined();
        expect(preset.particle.maxLife, `${name} should have maxLife`).toBeDefined();
        expect(preset.particle.startColor, `${name} should have startColor`).toBeDefined();
      }
    });

    it('should have valid emitter types', () => {
      const validTypes = ['point', 'cone', 'sphere', 'trail'];
      for (const preset of Object.values(ParticlePresets)) {
        expect(validTypes).toContain(preset.type);
      }
    });
  });

  // ==========================================================================
  // ParticleEmitter
  // ==========================================================================
  describe('ParticleEmitter', () => {
    describe('constructor', () => {
      it('should create emitter with config', () => {
        const config = {
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 10,
          duration: 0,
          particle: {
            minLife: 0.5,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            startColor: '#ffffff',
          },
        };

        const emitter = new ParticleEmitter(config);

        expect(emitter.position).toEqual(config.position);
        expect(emitter.particles).toHaveLength(0);
        expect(emitter.isComplete).toBe(false);
      });
    });

    describe('emit()', () => {
      it('should create particles on emit', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 0.5,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();

        expect(emitter.particles).toHaveLength(5);
        expect(emitter.activeCount).toBe(5);
      });

      it('should mark instant emitter as complete', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0, // Instant
          particle: {
            minLife: 0.5,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();

        // Emission complete, but particles still alive
        expect(emitter._isComplete).toBe(true);
        expect(emitter.isComplete).toBe(false); // Particles still active
      });

      it('should emit custom count', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 10,
          duration: 0,
          particle: {
            minLife: 0.5,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 2,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit(3);

        expect(emitter.particles).toHaveLength(3);
      });
    });

    describe('update()', () => {
      it('should update particle positions', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 100,
            maxSpeed: 100,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
            gravity: 0,
            drag: 1,
          },
        });

        emitter.emit();
        const initialPos = { ...emitter.particles[0].position };

        emitter.update(0.1);

        // Position should have changed
        const particle = emitter.particles[0];
        expect(
          particle.position.x !== initialPos.x ||
            particle.position.y !== initialPos.y ||
            particle.position.z !== initialPos.z
        ).toBe(true);
      });

      it('should reduce particle life over time', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();
        expect(emitter.particles[0].life).toBe(1.0);

        emitter.update(0.5);
        expect(emitter.particles[0].life).toBeCloseTo(0.5, 1);
      });

      it('should deactivate dead particles', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 0.5,
            maxLife: 0.5,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();
        expect(emitter.particles[0].isActive).toBe(true);

        emitter.update(0.6); // Exceeds max life

        expect(emitter.particles[0].isActive).toBe(false);
      });

      it('should apply gravity to particles', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
            gravity: 100,
          },
        });

        emitter.emit();
        const initialVelY = emitter.particles[0].velocity.y;

        emitter.update(0.1);

        // Y velocity should decrease due to gravity
        expect(emitter.particles[0].velocity.y).toBeLessThan(initialVelY);
      });

      it('should emit over duration for non-instant emitters', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 10,
          duration: 1.0, // Emit over 1 second
          particle: {
            minLife: 2.0,
            maxLife: 2.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        // Should not have particles yet
        expect(emitter.particles).toHaveLength(0);

        emitter.update(0.5); // 5 particles should be emitted

        expect(emitter.particles.length).toBeGreaterThanOrEqual(4);
        expect(emitter.particles.length).toBeLessThanOrEqual(6);
      });

      it('should interpolate color during lifecycle', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ff0000',
            endColor: '#0000ff',
          },
        });

        emitter.emit();
        expect(emitter.particles[0].color).toBe('#ff0000');

        emitter.update(0.5); // Half life

        // Color should be interpolated (purple-ish)
        const color = emitter.particles[0].color;
        expect(color).not.toBe('#ff0000');
        expect(color).not.toBe('#0000ff');
      });

      it('should fade alpha when fadeOut is enabled', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
            fadeOut: true,
          },
        });

        emitter.emit();
        expect(emitter.particles[0].alpha).toBe(1.0);

        emitter.update(0.5);

        expect(emitter.particles[0].alpha).toBeCloseTo(0.5, 1);
      });
    });

    describe('isComplete', () => {
      it('should be complete when all particles dead', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 2,
          duration: 0,
          particle: {
            minLife: 0.1,
            maxLife: 0.1,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();
        expect(emitter.isComplete).toBe(false);

        emitter.update(0.2);

        expect(emitter.isComplete).toBe(true);
      });
    });

    describe('getActiveParticles()', () => {
      it('should return only active particles', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 0.5,
            maxLife: 0.5,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();
        expect(emitter.getActiveParticles()).toHaveLength(5);

        emitter.update(0.6);
        expect(emitter.getActiveParticles()).toHaveLength(0);
      });
    });

    describe('emission types', () => {
      it('should emit in cone pattern', () => {
        const emitter = new ParticleEmitter({
          type: 'cone',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
          spread: Math.PI / 4,
          particleCount: 10,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 100,
            maxSpeed: 100,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();

        // All particles should have positive x velocity (general direction)
        // Due to spread, some might have slight negative y but x should be positive
        const posXCount = emitter.particles.filter((p) => p.velocity.x > 0).length;
        expect(posXCount).toBeGreaterThan(5); // Most should go in positive x direction
      });

      it('should emit in sphere pattern', () => {
        const emitter = new ParticleEmitter({
          type: 'sphere',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 20,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 100,
            maxSpeed: 100,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();

        // Should have particles going in all directions
        const posX = emitter.particles.filter((p) => p.velocity.x > 0).length;
        const negX = emitter.particles.filter((p) => p.velocity.x < 0).length;
        const posY = emitter.particles.filter((p) => p.velocity.y > 0).length;
        const negY = emitter.particles.filter((p) => p.velocity.y < 0).length;

        expect(posX).toBeGreaterThan(0);
        expect(negX).toBeGreaterThan(0);
        expect(posY).toBeGreaterThan(0);
        expect(negY).toBeGreaterThan(0);
      });
    });

    describe('reset()', () => {
      it('should clear all particles', () => {
        const emitter = new ParticleEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        emitter.emit();
        expect(emitter.particles).toHaveLength(5);

        emitter.reset();

        expect(emitter.particles).toHaveLength(0);
        expect(emitter._isComplete).toBe(false);
      });
    });
  });

  // ==========================================================================
  // ParticleSystem
  // ==========================================================================
  describe('ParticleSystem', () => {
    describe('constructor', () => {
      it('should create system with defaults', () => {
        expect(particleSystem.particleCount).toBe(0);
        expect(particleSystem.emitterCount).toBe(0);
      });
    });

    describe('createEmitter()', () => {
      it('should create and track emitter', () => {
        const emitter = particleSystem.createEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        expect(emitter).toBeInstanceOf(ParticleEmitter);
        expect(particleSystem.emitterCount).toBe(1);
        expect(particleSystem.particleCount).toBe(5);
      });

      it('should emit emitter:created event', () => {
        const callback = vi.fn();
        particleSystem.on('emitter:created', callback);

        particleSystem.createEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 50,
            maxSpeed: 100,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        expect(callback).toHaveBeenCalled();
      });
    });

    describe('createFromPreset()', () => {
      it('should create emitter from preset', () => {
        const emitter = particleSystem.createFromPreset('WALL_IMPACT', {
          x: 5,
          y: 10,
          z: 0,
        });

        expect(emitter).not.toBeNull();
        expect(emitter.position).toEqual({ x: 5, y: 10, z: 0 });
        expect(particleSystem.particleCount).toBe(ParticlePresets.WALL_IMPACT.particleCount);
      });

      it('should return null for unknown preset', () => {
        const emitter = particleSystem.createFromPreset('UNKNOWN', { x: 0, y: 0, z: 0 });

        expect(emitter).toBeNull();
      });

      it('should allow option overrides', () => {
        const _emitter = particleSystem.createFromPreset(
          'WALL_IMPACT',
          { x: 0, y: 0, z: 0 },
          {
            particleCount: 5,
          }
        );

        expect(particleSystem.particleCount).toBe(5);
      });
    });

    describe('convenience methods', () => {
      it('should create wall impact effect', () => {
        const emitter = particleSystem.createWallImpact({ x: 5, y: 5, z: 0 });

        expect(emitter).not.toBeNull();
        expect(particleSystem.particleCount).toBeGreaterThan(0);
      });

      it('should create near miss effect', () => {
        const emitter = particleSystem.createNearMiss({ x: 5, y: 5, z: 0 });

        expect(emitter).not.toBeNull();
      });

      it('should create target hit effect', () => {
        const emitter = particleSystem.createTargetHit({ x: 5, y: 5, z: 0 });

        expect(emitter).not.toBeNull();
      });

      it('should create target hit with custom color', () => {
        const emitter = particleSystem.createTargetHit({ x: 5, y: 5, z: 0 }, null, '#00ff00');

        expect(emitter).not.toBeNull();
      });

      it('should create target destroy effect', () => {
        const emitter = particleSystem.createTargetDestroy({ x: 5, y: 5, z: 0 });

        expect(emitter).not.toBeNull();
      });

      it('should create muzzle flash effect', () => {
        const emitter = particleSystem.createMuzzleFlash(
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 }
        );

        expect(emitter).not.toBeNull();
      });

      it('should create shell casing effect', () => {
        const emitter = particleSystem.createShellCasing(
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 1, z: 0 }
        );

        expect(emitter).not.toBeNull();
      });
    });

    describe('update()', () => {
      it('should update all emitters', () => {
        particleSystem.createWallImpact({ x: 0, y: 0, z: 0 });
        particleSystem.createNearMiss({ x: 5, y: 5, z: 0 });

        const initialCount = particleSystem.particleCount;

        particleSystem.update(0.1);

        // Particles should still be alive (short update)
        // NEAR_MISS has duration > 0, so more particles may have spawned
        expect(particleSystem.particleCount).toBeGreaterThanOrEqual(initialCount);
      });

      it('should remove completed emitters with autoCleanup', () => {
        particleSystem.createEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 0.1,
            maxLife: 0.1,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        expect(particleSystem.emitterCount).toBe(1);

        particleSystem.update(0.2);

        expect(particleSystem.emitterCount).toBe(0);
      });

      it('should keep emitters without autoCleanup', () => {
        const system = new ParticleSystem({ autoCleanup: false });

        system.createEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 1,
          duration: 0,
          particle: {
            minLife: 0.1,
            maxLife: 0.1,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        system.update(0.2);

        expect(system.emitterCount).toBe(1);
        system.clear();
      });
    });

    describe('getAllParticles()', () => {
      it('should return all particles from all emitters', () => {
        particleSystem.createEmitter({
          type: 'point',
          position: { x: 0, y: 0, z: 0 },
          particleCount: 5,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        particleSystem.createEmitter({
          type: 'point',
          position: { x: 10, y: 10, z: 0 },
          particleCount: 3,
          duration: 0,
          particle: {
            minLife: 1.0,
            maxLife: 1.0,
            minSpeed: 0,
            maxSpeed: 0,
            minSize: 5,
            maxSize: 5,
            startColor: '#ffffff',
          },
        });

        const particles = particleSystem.getAllParticles();
        expect(particles).toHaveLength(8);
      });
    });

    describe('clear()', () => {
      it('should remove all emitters', () => {
        particleSystem.createWallImpact({ x: 0, y: 0, z: 0 });
        particleSystem.createNearMiss({ x: 5, y: 5, z: 0 });

        expect(particleSystem.emitterCount).toBe(2);

        particleSystem.clear();

        expect(particleSystem.emitterCount).toBe(0);
        expect(particleSystem.particleCount).toBe(0);
      });

      it('should emit system:cleared event', () => {
        const callback = vi.fn();
        particleSystem.on('system:cleared', callback);

        particleSystem.clear();

        expect(callback).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetParticleSystem();
    });

    it('should return same instance', () => {
      const instance1 = getParticleSystem();
      const instance2 = getParticleSystem();

      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getParticleSystem();
      instance1.createWallImpact({ x: 0, y: 0, z: 0 });

      resetParticleSystem();

      const instance2 = getParticleSystem();
      expect(instance2).not.toBe(instance1);
      expect(instance2.emitterCount).toBe(0);
    });
  });
});
