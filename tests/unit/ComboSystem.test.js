/**
 * Unit tests for ComboSystem
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  ComboSystem,
  DEFAULT_COMBO_CONFIG,
  getComboSystem,
  resetComboSystem,
} from '@/game/ComboSystem.js';
import { GameEvents, resetEventBus } from '@/utils/EventEmitter.js';

describe('ComboSystem', () => {
  let combo;

  beforeEach(() => {
    vi.useFakeTimers();
    resetEventBus();
    resetComboSystem();
    combo = new ComboSystem();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should start with 0 combo', () => {
      expect(combo.combo).toBe(0);
    });

    it('should use default config', () => {
      expect(combo._config.maxCombo).toBe(DEFAULT_COMBO_CONFIG.maxCombo);
    });

    it('should accept custom config', () => {
      const custom = new ComboSystem({ maxCombo: 50 });
      expect(custom._config.maxCombo).toBe(50);
    });
  });

  describe('combo', () => {
    it('should return current combo count', () => {
      expect(combo.combo).toBe(0);
      combo.registerHit();
      expect(combo.combo).toBe(1);
    });
  });

  describe('multiplier', () => {
    it('should return 1.0 at combo 0', () => {
      expect(combo.multiplier).toBe(1.0);
    });

    it('should return 1.5 at combo 5', () => {
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      expect(combo.multiplier).toBe(1.5);
    });

    it('should return 2.0 at combo 10', () => {
      for (let i = 0; i < 10; i++) {
        combo.registerHit();
      }
      expect(combo.multiplier).toBe(2.0);
    });

    it('should return 3.0 at combo 20', () => {
      for (let i = 0; i < 20; i++) {
        combo.registerHit();
      }
      expect(combo.multiplier).toBe(3.0);
    });

    it('should return 5.0 at combo 50', () => {
      for (let i = 0; i < 50; i++) {
        combo.registerHit();
      }
      expect(combo.multiplier).toBe(5.0);
    });
  });

  describe('tier', () => {
    it('should return correct tier', () => {
      expect(combo.tier).toBe(0);
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      expect(combo.tier).toBe(1);
    });
  });

  describe('registerHit', () => {
    it('should increment combo', () => {
      combo.registerHit();
      expect(combo.combo).toBe(1);
      combo.registerHit();
      expect(combo.combo).toBe(2);
    });

    it('should return hit info', () => {
      const result = combo.registerHit();
      expect(result.combo).toBe(1);
      expect(result.multiplier).toBe(1.0);
      expect(result.tierUp).toBe(false);
    });

    it('should indicate tier up', () => {
      for (let i = 0; i < 4; i++) {
        combo.registerHit();
      }
      const result = combo.registerHit();
      expect(result.tierUp).toBe(true);
      expect(result.tier).toBe(1);
    });

    it('should track max combo', () => {
      for (let i = 0; i < 10; i++) {
        combo.registerHit();
      }
      combo.registerMiss();
      expect(combo.maxComboReached).toBe(10);
    });

    it('should increment total hits', () => {
      combo.registerHit();
      combo.registerHit();
      expect(combo.totalHits).toBe(2);
    });

    it('should emit COMBO_INCREASE event', () => {
      const callback = vi.fn();
      combo.on(GameEvents.COMBO_INCREASE, callback);
      combo.registerHit();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ combo: 1, multiplier: 1.0 })
      );
    });

    it('should emit tierUp event', () => {
      const callback = vi.fn();
      combo.on('tierUp', callback);
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ tier: 1, multiplier: 1.5 })
      );
    });

    it('should cap at maxCombo', () => {
      combo = new ComboSystem({ maxCombo: 5 });
      for (let i = 0; i < 10; i++) {
        combo.registerHit();
      }
      expect(combo.combo).toBe(5);
    });
  });

  describe('registerMiss', () => {
    it('should reset combo', () => {
      for (let i = 0; i < 10; i++) {
        combo.registerHit();
      }
      combo.registerMiss();
      expect(combo.combo).toBe(0);
    });

    it('should return lost combo info', () => {
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      const result = combo.registerMiss();
      expect(result.lostCombo).toBe(5);
      expect(result.hadCombo).toBe(true);
    });

    it('should return hadCombo false when no combo', () => {
      const result = combo.registerMiss();
      expect(result.hadCombo).toBe(false);
    });

    it('should increment total misses', () => {
      combo.registerMiss();
      combo.registerMiss();
      expect(combo.totalMisses).toBe(2);
    });

    it('should emit COMBO_RESET event when combo > 0', () => {
      const callback = vi.fn();
      combo.on(GameEvents.COMBO_RESET, callback);
      combo.registerHit();
      combo.registerMiss();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ previousCombo: 1, reason: 'miss' })
      );
    });

    it('should not emit event when no combo', () => {
      const callback = vi.fn();
      combo.on(GameEvents.COMBO_RESET, callback);
      combo.registerMiss();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('combo timeout', () => {
    it('should reset combo after timeout', () => {
      combo.registerHit();
      expect(combo.combo).toBe(1);

      vi.advanceTimersByTime(DEFAULT_COMBO_CONFIG.comboTimeout + 100);

      expect(combo.combo).toBe(0);
    });

    it('should emit COMBO_RESET on timeout', () => {
      const callback = vi.fn();
      combo.on(GameEvents.COMBO_RESET, callback);
      combo.registerHit();

      vi.advanceTimersByTime(DEFAULT_COMBO_CONFIG.comboTimeout + 100);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'timeout' })
      );
    });

    it('should extend timeout on hit', () => {
      combo.registerHit();
      vi.advanceTimersByTime(2000);
      combo.registerHit();
      vi.advanceTimersByTime(2000);

      expect(combo.combo).toBe(2);

      vi.advanceTimersByTime(DEFAULT_COMBO_CONFIG.comboTimeout + 100);
      expect(combo.combo).toBe(0);
    });
  });

  describe('timeRemaining', () => {
    it('should return 0 when no combo', () => {
      expect(combo.timeRemaining).toBe(0);
    });

    it('should return remaining time', () => {
      combo.registerHit();
      expect(combo.timeRemaining).toBe(DEFAULT_COMBO_CONFIG.comboTimeout);

      vi.advanceTimersByTime(1000);
      expect(combo.timeRemaining).toBe(DEFAULT_COMBO_CONFIG.comboTimeout - 1000);
    });
  });

  describe('timeProgress', () => {
    it('should return 0 when no combo', () => {
      expect(combo.timeProgress).toBe(0);
    });

    it('should return progress ratio', () => {
      combo.registerHit();
      expect(combo.timeProgress).toBe(1);

      vi.advanceTimersByTime(1500);
      expect(combo.timeProgress).toBe(0.5);
    });
  });

  describe('accuracy', () => {
    it('should return 0 when no shots', () => {
      expect(combo.accuracy).toBe(0);
    });

    it('should calculate accuracy correctly', () => {
      combo.registerHit();
      combo.registerHit();
      combo.registerMiss();
      expect(combo.accuracy).toBeCloseTo(66.67, 1);
    });

    it('should return 100 for perfect accuracy', () => {
      combo.registerHit();
      combo.registerHit();
      combo.registerHit();
      expect(combo.accuracy).toBe(100);
    });
  });

  describe('applyMultiplier', () => {
    it('should multiply base score', () => {
      expect(combo.applyMultiplier(100)).toBe(100);

      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      expect(combo.applyMultiplier(100)).toBe(150);
    });

    it('should round to integer', () => {
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      expect(combo.applyMultiplier(33)).toBe(50); // 33 * 1.5 = 49.5 -> 50
    });
  });

  describe('reset', () => {
    it('should reset all statistics', () => {
      combo.registerHit();
      combo.registerHit();
      combo.registerMiss();
      combo.reset();

      expect(combo.combo).toBe(0);
      expect(combo.maxComboReached).toBe(0);
      expect(combo.totalHits).toBe(0);
      expect(combo.totalMisses).toBe(0);
    });
  });

  describe('resetCombo', () => {
    it('should only reset combo, not stats', () => {
      combo.registerHit();
      combo.registerHit();
      combo.resetCombo();

      expect(combo.combo).toBe(0);
      expect(combo.totalHits).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return all statistics', () => {
      combo.registerHit();
      combo.registerHit();
      combo.registerMiss();

      const stats = combo.getStats();
      expect(stats.combo).toBe(0);
      expect(stats.maxCombo).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.accuracy).toBeCloseTo(66.67, 1);
    });
  });

  describe('getNextTierInfo', () => {
    it('should return next tier info', () => {
      const info = combo.getNextTierInfo();
      expect(info.nextTier).toBe(1);
      expect(info.comboNeeded).toBe(5);
      expect(info.nextMultiplier).toBe(1.5);
    });

    it('should return null at max tier', () => {
      for (let i = 0; i < 50; i++) {
        combo.registerHit();
      }
      const info = combo.getNextTierInfo();
      expect(info).toBeNull();
    });

    it('should update as combo increases', () => {
      for (let i = 0; i < 5; i++) {
        combo.registerHit();
      }
      const info = combo.getNextTierInfo();
      expect(info.nextTier).toBe(2);
      expect(info.comboNeeded).toBe(5);
      expect(info.nextMultiplier).toBe(2.0);
    });
  });
});

describe('Global ComboSystem', () => {
  beforeEach(() => {
    resetComboSystem();
  });

  it('should return same instance', () => {
    const c1 = getComboSystem();
    const c2 = getComboSystem();
    expect(c1).toBe(c2);
  });

  it('should reset properly', () => {
    const c1 = getComboSystem();
    c1.registerHit();
    resetComboSystem();
    const c2 = getComboSystem();
    expect(c2).not.toBe(c1);
    expect(c2.combo).toBe(0);
  });
});
