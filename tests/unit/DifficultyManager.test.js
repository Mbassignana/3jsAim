/**
 * Unit tests for DifficultyManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  DifficultyManager,
  DifficultyLevel,
  DifficultyPresets,
  getDifficultyManager,
  resetDifficultyManager,
} from '@/game/DifficultyManager.js';

describe('DifficultyManager', () => {
  let manager;

  beforeEach(() => {
    resetDifficultyManager();
    manager = new DifficultyManager();
  });

  describe('constructor', () => {
    it('should start with medium difficulty', () => {
      expect(manager.level).toBe(DifficultyLevel.MEDIUM);
    });

    it('should have valid settings', () => {
      const settings = manager.settings;
      expect(settings.spawnInterval).toBeDefined();
      expect(settings.initialCircles).toBeDefined();
      expect(settings.gameDuration).toBeDefined();
    });
  });

  describe('level', () => {
    it('should return current level', () => {
      expect(manager.level).toBe(DifficultyLevel.MEDIUM);
    });
  });

  describe('settings', () => {
    it('should return a copy of settings', () => {
      const settings1 = manager.settings;
      const settings2 = manager.settings;
      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });
  });

  describe('displayName', () => {
    it('should return display name', () => {
      expect(manager.displayName).toBe('Medium');
    });
  });

  describe('setLevel', () => {
    it('should change to easy', () => {
      manager.setLevel(DifficultyLevel.EASY);
      expect(manager.level).toBe(DifficultyLevel.EASY);
      expect(manager.displayName).toBe('Easy');
    });

    it('should change to hard', () => {
      manager.setLevel(DifficultyLevel.HARD);
      expect(manager.level).toBe(DifficultyLevel.HARD);
    });

    it('should change to extreme', () => {
      manager.setLevel(DifficultyLevel.EXTREME);
      expect(manager.level).toBe(DifficultyLevel.EXTREME);
    });

    it('should return true on success', () => {
      const result = manager.setLevel(DifficultyLevel.EASY);
      expect(result).toBe(true);
    });

    it('should return false for invalid level', () => {
      const result = manager.setLevel('invalid');
      expect(result).toBe(false);
    });

    it('should emit difficultyChanged event', () => {
      const callback = vi.fn();
      manager.on('difficultyChanged', callback);
      manager.setLevel(DifficultyLevel.HARD);
      expect(callback).toHaveBeenCalledWith({
        level: DifficultyLevel.HARD,
        settings: expect.any(Object),
      });
    });

    it('should return false for custom without custom settings', () => {
      const result = manager.setLevel(DifficultyLevel.CUSTOM);
      expect(result).toBe(false);
    });
  });

  describe('setCustomSettings', () => {
    it('should set custom settings', () => {
      manager.setCustomSettings({ spawnInterval: 15, name: 'My Custom' });
      manager.setLevel(DifficultyLevel.CUSTOM);
      expect(manager.settings.spawnInterval).toBe(15);
      expect(manager.displayName).toBe('My Custom');
    });

    it('should use Medium as base', () => {
      manager.setCustomSettings({ spawnInterval: 15 });
      manager.setLevel(DifficultyLevel.CUSTOM);
      expect(manager.settings.gameDuration).toBe(DifficultyPresets.medium.gameDuration);
    });

    it('should update if already on custom', () => {
      manager.setCustomSettings({ spawnInterval: 15 });
      manager.setLevel(DifficultyLevel.CUSTOM);
      manager.setCustomSettings({ spawnInterval: 10 });
      expect(manager.settings.spawnInterval).toBe(10);
    });
  });

  describe('getAvailableLevels', () => {
    it('should return all preset levels', () => {
      const levels = manager.getAvailableLevels();
      expect(levels.length).toBe(4);
      expect(levels.map((l) => l.level)).toContain(DifficultyLevel.EASY);
      expect(levels.map((l) => l.level)).toContain(DifficultyLevel.HARD);
    });

    it('should include custom if set', () => {
      manager.setCustomSettings({ name: 'Test' });
      const levels = manager.getAvailableLevels();
      expect(levels.length).toBe(5);
      expect(levels.map((l) => l.level)).toContain(DifficultyLevel.CUSTOM);
    });
  });

  describe('getSettingsForLevel', () => {
    it('should return settings for valid level', () => {
      const settings = manager.getSettingsForLevel(DifficultyLevel.EASY);
      expect(settings).toEqual(DifficultyPresets[DifficultyLevel.EASY]);
    });

    it('should return null for invalid level', () => {
      const settings = manager.getSettingsForLevel('invalid');
      expect(settings).toBeNull();
    });

    it('should return custom settings when set', () => {
      manager.setCustomSettings({ spawnInterval: 5 });
      const settings = manager.getSettingsForLevel(DifficultyLevel.CUSTOM);
      expect(settings.spawnInterval).toBe(5);
    });
  });

  describe('calculateHitPoints', () => {
    it('should return base points for medium', () => {
      const points = manager.calculateHitPoints();
      expect(points).toBe(15); // 10 * 1.5 multiplier
    });

    it('should double for bonus targets', () => {
      const normal = manager.calculateHitPoints(false);
      const bonus = manager.calculateHitPoints(true);
      expect(bonus).toBe(normal * 2);
    });

    it('should apply difficulty multiplier', () => {
      manager.setLevel(DifficultyLevel.EXTREME);
      const points = manager.calculateHitPoints();
      expect(points).toBe(60); // 20 * 3.0 multiplier
    });
  });

  describe('getNpcPenalty', () => {
    it('should return 0 for easy', () => {
      manager.setLevel(DifficultyLevel.EASY);
      expect(manager.getNpcPenalty()).toBe(0);
    });

    it('should return 1 for medium', () => {
      expect(manager.getNpcPenalty()).toBe(1);
    });

    it('should return 5 for extreme', () => {
      manager.setLevel(DifficultyLevel.EXTREME);
      expect(manager.getNpcPenalty()).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset to medium', () => {
      manager.setLevel(DifficultyLevel.EXTREME);
      manager.reset();
      expect(manager.level).toBe(DifficultyLevel.MEDIUM);
    });
  });

  describe('getAdaptiveSettings', () => {
    it('should return modified settings based on performance', () => {
      const base = manager.settings;
      const adaptive = manager.getAdaptiveSettings(1.0); // Perfect performance
      expect(adaptive.spawnInterval).toBeLessThan(base.spawnInterval);
      expect(adaptive.circleSpeed).toBeGreaterThan(base.circleSpeed);
    });

    it('should not change with 0 performance', () => {
      const base = manager.settings;
      const adaptive = manager.getAdaptiveSettings(0);
      expect(adaptive.spawnInterval).toBe(base.spawnInterval);
    });

    it('should clamp performance factor', () => {
      const adaptive1 = manager.getAdaptiveSettings(-1);
      const adaptive2 = manager.getAdaptiveSettings(0);
      expect(adaptive1.spawnInterval).toBe(adaptive2.spawnInterval);

      const adaptive3 = manager.getAdaptiveSettings(2);
      const adaptive4 = manager.getAdaptiveSettings(1);
      expect(adaptive3.spawnInterval).toBe(adaptive4.spawnInterval);
    });
  });
});

describe('DifficultyPresets', () => {
  it('should have all required fields', () => {
    const requiredFields = [
      'name',
      'spawnInterval',
      'initialCircles',
      'maxCircles',
      'circleLifetime',
      'gameDuration',
      'pointsPerHit',
    ];

    Object.values(DifficultyPresets).forEach((preset) => {
      requiredFields.forEach((field) => {
        expect(preset[field]).toBeDefined();
      });
    });
  });

  it('should have increasing difficulty', () => {
    const { easy, medium, hard, extreme } = DifficultyPresets;

    // Harder = shorter spawn interval
    expect(easy.spawnInterval).toBeGreaterThan(medium.spawnInterval);
    expect(medium.spawnInterval).toBeGreaterThan(hard.spawnInterval);
    expect(hard.spawnInterval).toBeGreaterThan(extreme.spawnInterval);

    // Harder = higher score multiplier
    expect(easy.scoreMultiplier).toBeLessThan(medium.scoreMultiplier);
    expect(medium.scoreMultiplier).toBeLessThan(hard.scoreMultiplier);
    expect(hard.scoreMultiplier).toBeLessThan(extreme.scoreMultiplier);
  });
});

describe('Global DifficultyManager', () => {
  beforeEach(() => {
    resetDifficultyManager();
  });

  it('should return same instance', () => {
    const dm1 = getDifficultyManager();
    const dm2 = getDifficultyManager();
    expect(dm1).toBe(dm2);
  });

  it('should reset properly', () => {
    const dm1 = getDifficultyManager();
    dm1.setLevel(DifficultyLevel.HARD);
    resetDifficultyManager();
    const dm2 = getDifficultyManager();
    expect(dm2).not.toBe(dm1);
    expect(dm2.level).toBe(DifficultyLevel.MEDIUM);
  });
});
