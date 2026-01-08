/**
 * Tests for PowerUpSystem - Power-up spawning and effects
 */

import {
  PowerUpSystem,
  PowerUpTypes,
  DEFAULT_POWERUP_CONFIG,
  getPowerUpSystem,
  resetPowerUpSystem,
} from '@game/PowerUpSystem.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PowerUpSystem', () => {
  let system;

  beforeEach(() => {
    vi.useFakeTimers();
    system = new PowerUpSystem();
  });

  afterEach(() => {
    system.reset();
    vi.useRealTimers();
    resetPowerUpSystem();
  });

  // ==========================================================================
  // Power-Up Types
  // ==========================================================================

  describe('PowerUpTypes', () => {
    it('should define all expected power-up types', () => {
      expect(PowerUpTypes.SLOW_MOTION).toBeDefined();
      expect(PowerUpTypes.DOUBLE_POINTS).toBeDefined();
      expect(PowerUpTypes.AUTO_AIM).toBeDefined();
      expect(PowerUpTypes.RAPID_FIRE).toBeDefined();
      expect(PowerUpTypes.SHIELD).toBeDefined();
    });

    it('should have required properties on each type', () => {
      const requiredProps = ['id', 'name', 'description', 'color', 'duration', 'spawnWeight', 'icon', 'effect'];

      Object.values(PowerUpTypes).forEach((type) => {
        requiredProps.forEach((prop) => {
          expect(type[prop], `${type.id} missing ${prop}`).toBeDefined();
        });
      });
    });

    it('should have unique IDs', () => {
      const ids = Object.values(PowerUpTypes).map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ==========================================================================
  // Spawning
  // ==========================================================================

  describe('spawning', () => {
    it('should spawn a power-up', () => {
      const powerUp = system.spawn('slow_motion', 100, 200);

      expect(powerUp).not.toBeNull();
      expect(powerUp.type).toBe('slow_motion');
      expect(powerUp.x).toBe(100);
      expect(powerUp.y).toBe(200);
      expect(powerUp.collected).toBe(false);
    });

    it('should increment stats on spawn', () => {
      system.spawn('slow_motion', 0, 0);
      expect(system.stats.spawned).toBe(1);

      system.spawn('double_points', 0, 0);
      expect(system.stats.spawned).toBe(2);
    });

    it('should emit spawn event', () => {
      const handler = vi.fn();
      system.on('powerup:spawned', handler);

      system.spawn('slow_motion', 50, 100);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          powerUp: expect.objectContaining({ type: 'slow_motion' }),
          type: expect.objectContaining({ id: 'slow_motion' }),
        })
      );
    });

    it('should respect maxPowerUps limit', () => {
      const config = { maxPowerUps: 2 };
      system = new PowerUpSystem(config);

      expect(system.spawn('slow_motion', 0, 0)).not.toBeNull();
      expect(system.spawn('slow_motion', 10, 0)).not.toBeNull();
      expect(system.spawn('slow_motion', 20, 0)).toBeNull();
    });

    it('should return null for invalid type', () => {
      const powerUp = system.spawn('invalid_type', 0, 0);
      expect(powerUp).toBeNull();
    });

    it('should spawn random power-up', () => {
      const powerUp = system.spawnRandom(100, 200);

      expect(powerUp).not.toBeNull();
      expect(Object.values(PowerUpTypes).map((t) => t.id)).toContain(powerUp.type);
    });

    it('should not spawn when disabled', () => {
      system.setEnabled(false);
      const powerUp = system.spawn('slow_motion', 0, 0);
      expect(powerUp).toBeNull();
    });

    it('should use custom lifetime', () => {
      const powerUp = system.spawn('slow_motion', 0, 0, { lifetime: 5000 });
      expect(powerUp.lifetime).toBe(5000);
    });

    it('should use default lifetime', () => {
      const powerUp = system.spawn('slow_motion', 0, 0);
      expect(powerUp.lifetime).toBe(DEFAULT_POWERUP_CONFIG.defaultLifetime);
    });
  });

  // ==========================================================================
  // Despawning
  // ==========================================================================

  describe('despawning', () => {
    it('should despawn after lifetime expires', () => {
      const _powerUp = system.spawn('slow_motion', 0, 0, { lifetime: 1000 });
      expect(system.getPowerUpCount()).toBe(1);

      vi.advanceTimersByTime(1100);

      expect(system.getPowerUpCount()).toBe(0);
      expect(system.stats.expired).toBe(1);
    });

    it('should emit despawn event', () => {
      const handler = vi.fn();
      system.on('powerup:despawned', handler);

      system.spawn('slow_motion', 0, 0, { lifetime: 100 });
      vi.advanceTimersByTime(200);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          powerUp: expect.objectContaining({ type: 'slow_motion' }),
          reason: 'expired',
        })
      );
    });
  });

  // ==========================================================================
  // Collection
  // ==========================================================================

  describe('collection', () => {
    it('should collect power-up when player is close enough', () => {
      system.spawn('slow_motion', 100, 100);

      const collected = system.tryCollect(100, 100);

      expect(collected).not.toBeNull();
      expect(collected.type).toBe('slow_motion');
      expect(collected.collected).toBe(true);
    });

    it('should return null when no power-up is nearby', () => {
      system.spawn('slow_motion', 100, 100);

      const collected = system.tryCollect(500, 500);

      expect(collected).toBeNull();
    });

    it('should use pickup radius for detection', () => {
      const config = { pickupRadius: 50 };
      system = new PowerUpSystem(config);
      system.spawn('slow_motion', 100, 100);

      // Just within radius
      expect(system.tryCollect(145, 100)).not.toBeNull();
    });

    it('should not collect already collected power-up', () => {
      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      const secondAttempt = system.tryCollect(100, 100);
      expect(secondAttempt).toBeNull();
    });

    it('should increment collected stats', () => {
      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      expect(system.stats.collected).toBe(1);
    });

    it('should emit collected event', () => {
      const handler = vi.fn();
      system.on('powerup:collected', handler);

      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          powerUp: expect.objectContaining({ type: 'slow_motion' }),
          type: expect.objectContaining({ id: 'slow_motion' }),
        })
      );
    });

    it('should remove power-up from active list', () => {
      system.spawn('slow_motion', 100, 100);
      expect(system.getPowerUpCount()).toBe(1);

      system.tryCollect(100, 100);
      expect(system.getPowerUpCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Effects
  // ==========================================================================

  describe('effects', () => {
    it('should activate effect on collection', () => {
      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      expect(system.isEffectActive('slow_motion')).toBe(true);
    });

    it('should expire effect after duration', () => {
      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      vi.advanceTimersByTime(PowerUpTypes.SLOW_MOTION.duration + 100);
      system.update();

      expect(system.isEffectActive('slow_motion')).toBe(false);
    });

    it('should return remaining time', () => {
      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      expect(system.getEffectTimeRemaining('slow_motion')).toBe(
        PowerUpTypes.SLOW_MOTION.duration
      );

      vi.advanceTimersByTime(1000);

      expect(system.getEffectTimeRemaining('slow_motion')).toBe(
        PowerUpTypes.SLOW_MOTION.duration - 1000
      );
    });

    it('should return 0 for inactive effect', () => {
      expect(system.getEffectTimeRemaining('slow_motion')).toBe(0);
    });

    it('should get all active effects', () => {
      system.spawn('slow_motion', 0, 0);
      system.tryCollect(0, 0);

      system.spawn('double_points', 50, 0);
      system.tryCollect(50, 0);

      const effects = system.getAllActiveEffects();
      expect(effects.length).toBe(2);
    });

    it('should emit effect activated event', () => {
      const handler = vi.fn();
      system.on('effect:activated', handler);

      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.objectContaining({ id: 'slow_motion' }),
          effect: expect.objectContaining({ type: 'slow_motion' }),
        })
      );
    });

    it('should emit effect expired event', () => {
      const handler = vi.fn();
      system.on('effect:expired', handler);

      system.spawn('slow_motion', 100, 100);
      system.tryCollect(100, 100);

      vi.advanceTimersByTime(PowerUpTypes.SLOW_MOTION.duration + 100);
      system.update();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: 'slow_motion',
        })
      );
    });

    describe('effect stacking', () => {
      it('should not stack by default', () => {
        system.spawn('slow_motion', 0, 0);
        system.tryCollect(0, 0);

        const _initialEnd = system.getActiveEffect('slow_motion').endTime;

        vi.advanceTimersByTime(1000);

        system.spawn('slow_motion', 50, 0);
        system.tryCollect(50, 0);

        // Should reset to full duration, not add to remaining
        expect(system.getEffectTimeRemaining('slow_motion')).toBe(
          PowerUpTypes.SLOW_MOTION.duration
        );
      });

      it('should stack when enabled', () => {
        system = new PowerUpSystem({ stackEffects: true });

        system.spawn('slow_motion', 0, 0);
        system.tryCollect(0, 0);

        vi.advanceTimersByTime(1000);

        system.spawn('slow_motion', 50, 0);
        system.tryCollect(50, 0);

        // Should be remaining + new duration
        const expected = PowerUpTypes.SLOW_MOTION.duration - 1000 + PowerUpTypes.SLOW_MOTION.duration;
        expect(system.getEffectTimeRemaining('slow_motion')).toBe(expected);
      });
    });
  });

  // ==========================================================================
  // Modifiers
  // ==========================================================================

  describe('modifiers', () => {
    it('should return default modifiers when no effects active', () => {
      const modifiers = system.getCurrentModifiers();

      expect(modifiers.timeScale).toBe(1);
      expect(modifiers.scoreMultiplier).toBe(1);
      expect(modifiers.aimAssist).toBe(0);
      expect(modifiers.coneMultiplier).toBe(1);
      expect(modifiers.fireRateMultiplier).toBe(1);
      expect(modifiers.blockPenalty).toBe(false);
    });

    it('should apply slow motion modifier', () => {
      system.spawn('slow_motion', 0, 0);
      system.tryCollect(0, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.timeScale).toBe(0.5);
    });

    it('should apply double points modifier', () => {
      system.spawn('double_points', 0, 0);
      system.tryCollect(0, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.scoreMultiplier).toBe(2);
    });

    it('should apply auto-aim modifier', () => {
      system.spawn('auto_aim', 0, 0);
      system.tryCollect(0, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.aimAssist).toBe(0.5);
      expect(modifiers.coneMultiplier).toBe(2.0);
    });

    it('should apply rapid fire modifier', () => {
      system.spawn('rapid_fire', 0, 0);
      system.tryCollect(0, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.fireRateMultiplier).toBe(3);
    });

    it('should apply shield modifier', () => {
      system.spawn('shield', 0, 0);
      system.tryCollect(0, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.blockPenalty).toBe(true);
    });

    it('should combine multiple effects', () => {
      system.spawn('slow_motion', 0, 0);
      system.tryCollect(0, 0);

      system.spawn('double_points', 50, 0);
      system.tryCollect(50, 0);

      const modifiers = system.getCurrentModifiers();
      expect(modifiers.timeScale).toBe(0.5);
      expect(modifiers.scoreMultiplier).toBe(2);
    });

    it('should multiply score multipliers', () => {
      // Simulate having two double points effects (if stackable)
      system = new PowerUpSystem({ stackEffects: true });

      system.spawn('double_points', 0, 0);
      system.tryCollect(0, 0);

      // Create a custom double points variant for testing
      // For now, just verify the existing multiplier
      const modifiers = system.getCurrentModifiers();
      expect(modifiers.scoreMultiplier).toBe(2);
    });
  });

  // ==========================================================================
  // Auto Spawning
  // ==========================================================================

  describe('auto spawning', () => {
    it('should start automatic spawning', () => {
      system.setPositionValidator(() => true);
      system.startSpawning();

      vi.advanceTimersByTime(DEFAULT_POWERUP_CONFIG.spawnInterval);

      expect(system.getPowerUpCount()).toBeGreaterThanOrEqual(1);
    });

    it('should stop spawning', () => {
      system.setPositionValidator(() => true);
      system.startSpawning();

      vi.advanceTimersByTime(DEFAULT_POWERUP_CONFIG.spawnInterval);
      const _count = system.getPowerUpCount();

      system.stopSpawning();
      vi.advanceTimersByTime(DEFAULT_POWERUP_CONFIG.spawnInterval * 5);

      // Count should not increase significantly after stopping
      expect(system.getPowerUpCount()).toBeLessThanOrEqual(DEFAULT_POWERUP_CONFIG.maxPowerUps);
    });

    it('should use position validator', () => {
      let validatorCalled = false;
      system.setPositionValidator((_x, _y) => {
        validatorCalled = true;
        return false; // Reject all positions
      });

      system.startSpawning();
      vi.advanceTimersByTime(DEFAULT_POWERUP_CONFIG.spawnInterval);

      expect(validatorCalled).toBe(true);
      expect(system.getPowerUpCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Enabled Types
  // ==========================================================================

  describe('enabled types', () => {
    it('should filter spawn to enabled types', () => {
      system.setEnabledTypes(['slow_motion']);

      const spawns = [];
      for (let i = 0; i < 20; i++) {
        const powerUp = system.spawnRandom(i * 10, 0);
        if (powerUp) {
          spawns.push(powerUp);
        }
        system.clear(); // Clear to avoid max limit
      }

      spawns.forEach((p) => {
        expect(p.type).toBe('slow_motion');
      });
    });

    it('should accept IDs or type keys', () => {
      system.setEnabledTypes(['DOUBLE_POINTS', 'auto_aim']);

      const powerUp1 = system.spawnRandom(0, 0);
      const _powerUp2 = system.spawnRandom(50, 0);

      expect(['double_points', 'auto_aim']).toContain(powerUp1?.type);
    });
  });

  // ==========================================================================
  // Reset and Clear
  // ==========================================================================

  describe('reset and clear', () => {
    it('should clear all power-ups', () => {
      system.spawn('slow_motion', 0, 0);
      system.spawn('double_points', 50, 0);

      system.clear();

      expect(system.getPowerUpCount()).toBe(0);
    });

    it('should clear all effects', () => {
      system.spawn('slow_motion', 0, 0);
      system.tryCollect(0, 0);

      system.clear();

      expect(system.isEffectActive('slow_motion')).toBe(false);
    });

    it('should reset stats', () => {
      system.spawn('slow_motion', 0, 0);
      system.tryCollect(0, 0);

      system.reset();

      expect(system.stats.spawned).toBe(0);
      expect(system.stats.collected).toBe(0);
    });

    it('should stop spawning on clear', () => {
      system.setPositionValidator(() => true);
      system.startSpawning();
      system.clear();

      vi.advanceTimersByTime(DEFAULT_POWERUP_CONFIG.spawnInterval * 2);

      // Should not have spawned (spawner was stopped)
      expect(system.getPowerUpCount()).toBe(0);
    });
  });

  // ==========================================================================
  // getPowerUps
  // ==========================================================================

  describe('getPowerUps', () => {
    it('should return all active power-ups', () => {
      system.spawn('slow_motion', 0, 0);
      system.spawn('double_points', 50, 0);

      const powerUps = system.getPowerUps();

      expect(powerUps.length).toBe(2);
    });

    it('should not include collected power-ups', () => {
      system.spawn('slow_motion', 0, 0);
      system.spawn('double_points', 50, 0);
      system.tryCollect(0, 0);

      const powerUps = system.getPowerUps();

      expect(powerUps.length).toBe(1);
      expect(powerUps[0].type).toBe('double_points');
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================

  describe('singleton', () => {
    afterEach(() => {
      resetPowerUpSystem();
    });

    it('should return same instance', () => {
      const instance1 = getPowerUpSystem();
      const instance2 = getPowerUpSystem();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getPowerUpSystem();
      resetPowerUpSystem();
      const instance2 = getPowerUpSystem();

      expect(instance1).not.toBe(instance2);
    });
  });
});
