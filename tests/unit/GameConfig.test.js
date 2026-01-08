/**
 * Unit tests for GameConfig
 */

import { describe, it, expect } from 'vitest';

import { GameConfig, cloneConfig, validateConfig, mergeConfig } from '@/game/GameConfig.js';

describe('GameConfig', () => {
  describe('structure', () => {
    it('should have all required top-level sections', () => {
      expect(GameConfig.timing).toBeDefined();
      expect(GameConfig.player).toBeDefined();
      expect(GameConfig.circles).toBeDefined();
      expect(GameConfig.npcs).toBeDefined();
      expect(GameConfig.physics).toBeDefined();
      expect(GameConfig.scene).toBeDefined();
      expect(GameConfig.camera).toBeDefined();
      expect(GameConfig.ui).toBeDefined();
      expect(GameConfig.audio).toBeDefined();
      expect(GameConfig.debug).toBeDefined();
    });

    it('should have valid timing defaults', () => {
      expect(GameConfig.timing.defaultGameDuration).toBe(120);
      expect(GameConfig.timing.spawnInterval).toBe(30);
      expect(GameConfig.timing.targetTickRate).toBe(60);
    });

    it('should have valid player defaults', () => {
      expect(GameConfig.player.height).toBe(1.7);
      expect(GameConfig.player.moveSpeed).toBeGreaterThan(0);
      expect(GameConfig.player.mouseSensitivity).toBeGreaterThan(0);
    });

    it('should have valid circle colors', () => {
      expect(GameConfig.circles.colors).toBeInstanceOf(Array);
      expect(GameConfig.circles.colors.length).toBeGreaterThan(0);
      GameConfig.circles.colors.forEach((color) => {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });

    it('should have valid physics gravity', () => {
      expect(GameConfig.physics.gravity).toBeLessThan(0);
    });
  });
});

describe('cloneConfig', () => {
  it('should create a deep copy of the config', () => {
    const clone = cloneConfig();
    expect(clone).toEqual(GameConfig);
    expect(clone).not.toBe(GameConfig);
  });

  it('should create independent nested objects', () => {
    const clone = cloneConfig();
    clone.timing.defaultGameDuration = 999;
    expect(GameConfig.timing.defaultGameDuration).toBe(120);
  });

  it('should clone arrays independently', () => {
    const clone = cloneConfig();
    clone.circles.colors.push(0x000000);
    expect(GameConfig.circles.colors.length).toBe(8);
  });
});

describe('validateConfig', () => {
  it('should validate the default config', () => {
    const result = validateConfig(GameConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid timing values', () => {
    const config = cloneConfig();
    config.timing.defaultGameDuration = -10;
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('defaultGameDuration'))).toBe(true);
  });

  it('should detect invalid player height', () => {
    const config = cloneConfig();
    config.player.height = 0;
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('player.height'))).toBe(true);
  });

  it('should detect invalid player move speed', () => {
    const config = cloneConfig();
    config.player.moveSpeed = -5;
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('player.moveSpeed'))).toBe(true);
  });

  it('should detect invalid circle maxCount', () => {
    const config = cloneConfig();
    config.circles.maxCount = 0;
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('circles.maxCount'))).toBe(true);
  });

  it('should detect empty circle colors', () => {
    const config = cloneConfig();
    config.circles.colors = [];
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('circles.colors'))).toBe(true);
  });

  it('should detect invalid physics gravity type', () => {
    const config = cloneConfig();
    config.physics.gravity = 'fast';
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('physics.gravity'))).toBe(true);
  });

  it('should handle missing sections gracefully', () => {
    const config = { timing: {}, player: {}, circles: {}, physics: {} };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('mergeConfig', () => {
  it('should merge custom values into default config', () => {
    const merged = mergeConfig({
      timing: { defaultGameDuration: 60 },
    });
    expect(merged.timing.defaultGameDuration).toBe(60);
    expect(merged.timing.spawnInterval).toBe(30); // unchanged
  });

  it('should deeply merge nested objects', () => {
    const merged = mergeConfig({
      player: { moveSpeed: 10 },
    });
    expect(merged.player.moveSpeed).toBe(10);
    expect(merged.player.height).toBe(1.7); // unchanged
    expect(merged.player.mouseSensitivity).toBe(0.002); // unchanged
  });

  it('should not modify the original GameConfig', () => {
    mergeConfig({
      timing: { defaultGameDuration: 999 },
    });
    expect(GameConfig.timing.defaultGameDuration).toBe(120);
  });

  it('should handle empty custom config', () => {
    const merged = mergeConfig({});
    expect(merged).toEqual(GameConfig);
  });

  it('should handle arrays by replacement', () => {
    const newColors = [0xffffff, 0x000000];
    const merged = mergeConfig({
      circles: { colors: newColors },
    });
    expect(merged.circles.colors).toEqual(newColors);
    expect(merged.circles.maxCount).toBe(12); // other values unchanged
  });

  it('should add new properties', () => {
    const merged = mergeConfig({
      custom: { newSetting: true },
    });
    expect(merged.custom).toEqual({ newSetting: true });
  });
});
