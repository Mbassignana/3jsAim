/**
 * Unit tests for SettingsManager
 * Tests settings persistence, validation, and presets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  SettingsManager,
  DefaultSettings,
  QualityPresets,
  ColorblindPalettes,
  getSettingsManager,
  resetSettingsManager,
} from '../../src/ui/SettingsManager.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('SettingsManager', () => {
  let settings;

  beforeEach(() => {
    localStorageMock.clear();
    settings = new SettingsManager();
  });

  // ==========================================================================
  // Default Settings
  // ==========================================================================
  describe('Default Settings', () => {
    it('should have all settings categories defined', () => {
      expect(DefaultSettings.controls).toBeDefined();
      expect(DefaultSettings.audio).toBeDefined();
      expect(DefaultSettings.graphics).toBeDefined();
      expect(DefaultSettings.ui).toBeDefined();
      expect(DefaultSettings.accessibility).toBeDefined();
    });

    it('should have default control settings', () => {
      expect(DefaultSettings.controls.mouseSensitivity).toBe(1.0);
      expect(DefaultSettings.controls.invertY).toBe(false);
      expect(DefaultSettings.controls.keybinds).toBeDefined();
    });

    it('should have default audio settings', () => {
      expect(DefaultSettings.audio.masterVolume).toBe(80);
      expect(DefaultSettings.audio.sfxVolume).toBe(100);
      expect(DefaultSettings.audio.musicVolume).toBe(50);
    });

    it('should have default graphics settings', () => {
      expect(DefaultSettings.graphics.quality).toBe('high');
      expect(DefaultSettings.graphics.particles).toBe(true);
      expect(DefaultSettings.graphics.shadows).toBe(true);
    });

    it('should have default UI settings', () => {
      expect(DefaultSettings.ui.crosshairStyle).toBe('cross');
      expect(DefaultSettings.ui.crosshairColor).toBe('#00ff00');
      expect(DefaultSettings.ui.hitMarkers).toBe(true);
    });

    it('should have default accessibility settings', () => {
      expect(DefaultSettings.accessibility.colorblindMode).toBe('off');
      expect(DefaultSettings.accessibility.reduceMotion).toBe(false);
    });
  });

  // ==========================================================================
  // Quality Presets
  // ==========================================================================
  describe('Quality Presets', () => {
    it('should have all quality presets', () => {
      expect(QualityPresets.low).toBeDefined();
      expect(QualityPresets.medium).toBeDefined();
      expect(QualityPresets.high).toBeDefined();
      expect(QualityPresets.ultra).toBeDefined();
    });

    it('should have progressively better settings', () => {
      expect(QualityPresets.low.particles).toBe(false);
      expect(QualityPresets.medium.particles).toBe(true);
      expect(QualityPresets.low.shadows).toBe(false);
      expect(QualityPresets.high.shadows).toBe(true);
      expect(QualityPresets.low.renderScale).toBeLessThan(QualityPresets.high.renderScale);
    });
  });

  // ==========================================================================
  // Colorblind Palettes
  // ==========================================================================
  describe('Colorblind Palettes', () => {
    it('should have all colorblind modes', () => {
      expect(ColorblindPalettes.off).toBeDefined();
      expect(ColorblindPalettes.protanopia).toBeDefined();
      expect(ColorblindPalettes.deuteranopia).toBeDefined();
      expect(ColorblindPalettes.tritanopia).toBeDefined();
    });

    it('should have required colors', () => {
      for (const palette of Object.values(ColorblindPalettes)) {
        expect(palette.target).toBeDefined();
        expect(palette.hit).toBeDefined();
        expect(palette.miss).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Constructor & Loading
  // ==========================================================================
  describe('constructor', () => {
    it('should load default settings', () => {
      const all = settings.getAll();
      expect(all.audio.masterVolume).toBe(DefaultSettings.audio.masterVolume);
    });

    it('should load saved settings from localStorage', () => {
      const saved = {
        audio: { masterVolume: 50 },
      };
      localStorageMock.setItem('game_settings', JSON.stringify(saved));

      const newSettings = new SettingsManager();
      expect(newSettings.get('audio.masterVolume')).toBe(50);
    });

    it('should merge saved settings with defaults', () => {
      const saved = {
        audio: { masterVolume: 50 }, // Only audio saved
      };
      localStorageMock.setItem('game_settings', JSON.stringify(saved));

      const newSettings = new SettingsManager();
      // Saved audio setting
      expect(newSettings.get('audio.masterVolume')).toBe(50);
      // Default graphics setting
      expect(newSettings.get('graphics.quality')).toBe('high');
    });

    it('should handle invalid localStorage data', () => {
      localStorageMock.setItem('game_settings', 'invalid json');

      const newSettings = new SettingsManager();
      // Should fall back to defaults
      expect(newSettings.get('audio.masterVolume')).toBe(DefaultSettings.audio.masterVolume);
    });
  });

  // ==========================================================================
  // Getting Settings
  // ==========================================================================
  describe('getAll()', () => {
    it('should return all settings', () => {
      const all = settings.getAll();
      expect(all.controls).toBeDefined();
      expect(all.audio).toBeDefined();
      expect(all.graphics).toBeDefined();
    });

    it('should return a copy', () => {
      const all1 = settings.getAll();
      all1.audio.masterVolume = 0;

      const all2 = settings.getAll();
      expect(all2.audio.masterVolume).not.toBe(0);
    });
  });

  describe('getCategory()', () => {
    it('should return settings for a category', () => {
      const audio = settings.getCategory('audio');
      expect(audio.masterVolume).toBeDefined();
      expect(audio.sfxVolume).toBeDefined();
    });

    it('should return a copy', () => {
      const audio = settings.getCategory('audio');
      audio.masterVolume = 0;

      expect(settings.get('audio.masterVolume')).not.toBe(0);
    });
  });

  describe('get()', () => {
    it('should get nested value by path', () => {
      expect(settings.get('audio.masterVolume')).toBe(DefaultSettings.audio.masterVolume);
      expect(settings.get('controls.mouseSensitivity')).toBe(DefaultSettings.controls.mouseSensitivity);
    });

    it('should return undefined for invalid path', () => {
      expect(settings.get('invalid.path')).toBeUndefined();
    });

    it('should get deeply nested values', () => {
      expect(settings.get('controls.keybinds.forward')).toBe('KeyW');
    });
  });

  // ==========================================================================
  // Setting Values
  // ==========================================================================
  describe('set()', () => {
    it('should set a value', () => {
      settings.set('audio.masterVolume', 50);
      expect(settings.get('audio.masterVolume')).toBe(50);
    });

    it('should emit setting:changed event', () => {
      const callback = vi.fn();
      settings.on('setting:changed', callback);

      settings.set('audio.masterVolume', 50);

      expect(callback).toHaveBeenCalledWith({
        path: 'audio.masterVolume',
        oldValue: 80,
        newValue: 50,
      });
    });

    it('should save to localStorage by default', () => {
      settings.set('audio.masterVolume', 50);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should not save when save=false', () => {
      localStorageMock.setItem.mockClear();
      settings.set('audio.masterVolume', 50, false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should validate numeric values', () => {
      settings.set('audio.masterVolume', 150); // Over max
      expect(settings.get('audio.masterVolume')).toBe(100);

      settings.set('audio.masterVolume', -10); // Under min
      expect(settings.get('audio.masterVolume')).toBe(0);
    });

    it('should validate enum values', () => {
      settings.set('graphics.quality', 'invalid');
      expect(settings.get('graphics.quality')).toBe('high'); // Default
    });

    it('should validate sensitivity values', () => {
      settings.set('controls.mouseSensitivity', 10); // Over max (5.0)
      expect(settings.get('controls.mouseSensitivity')).toBe(5.0);

      settings.set('controls.mouseSensitivity', 0.01); // Under min (0.1)
      expect(settings.get('controls.mouseSensitivity')).toBe(0.1);
    });
  });

  describe('setMultiple()', () => {
    it('should set multiple values at once', () => {
      settings.setMultiple({
        'audio.masterVolume': 50,
        'audio.musicVolume': 30,
        'graphics.quality': 'low',
      });

      expect(settings.get('audio.masterVolume')).toBe(50);
      expect(settings.get('audio.musicVolume')).toBe(30);
      expect(settings.get('graphics.quality')).toBe('low');
    });

    it('should only save once', () => {
      localStorageMock.setItem.mockClear();

      settings.setMultiple({
        'audio.masterVolume': 50,
        'audio.musicVolume': 30,
      });

      // Should save once at the end
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Quality Presets
  // ==========================================================================
  describe('applyQualityPreset()', () => {
    it('should apply preset settings', () => {
      settings.applyQualityPreset('low');

      expect(settings.get('graphics.quality')).toBe('low');
      expect(settings.get('graphics.particles')).toBe(false);
      expect(settings.get('graphics.shadows')).toBe(false);
      expect(settings.get('graphics.renderScale')).toBe(0.75);
    });

    it('should emit quality:changed event', () => {
      const callback = vi.fn();
      settings.on('quality:changed', callback);

      settings.applyQualityPreset('ultra');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].quality).toBe('ultra');
    });

    it('should ignore invalid presets', () => {
      const originalQuality = settings.get('graphics.quality');
      settings.applyQualityPreset('invalid');
      expect(settings.get('graphics.quality')).toBe(originalQuality);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('resetToDefaults()', () => {
    it('should reset all settings to defaults', () => {
      settings.set('audio.masterVolume', 50);
      settings.set('graphics.quality', 'low');

      settings.resetToDefaults();

      expect(settings.get('audio.masterVolume')).toBe(DefaultSettings.audio.masterVolume);
      expect(settings.get('graphics.quality')).toBe(DefaultSettings.graphics.quality);
    });

    it('should emit settings:reset event', () => {
      const callback = vi.fn();
      settings.on('settings:reset', callback);

      settings.resetToDefaults();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('resetCategory()', () => {
    it('should reset only specified category', () => {
      settings.set('audio.masterVolume', 50);
      settings.set('graphics.quality', 'low');

      settings.resetCategory('audio');

      expect(settings.get('audio.masterVolume')).toBe(DefaultSettings.audio.masterVolume);
      expect(settings.get('graphics.quality')).toBe('low'); // Unchanged
    });

    it('should emit category:reset event', () => {
      const callback = vi.fn();
      settings.on('category:reset', callback);

      settings.resetCategory('audio');

      expect(callback).toHaveBeenCalledWith({ category: 'audio' });
    });
  });

  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  describe('getColorPalette()', () => {
    it('should return default palette', () => {
      const palette = settings.getColorPalette();
      expect(palette).toEqual(ColorblindPalettes.off);
    });

    it('should return colorblind palette', () => {
      settings.set('accessibility.colorblindMode', 'protanopia');
      const palette = settings.getColorPalette();
      expect(palette).toEqual(ColorblindPalettes.protanopia);
    });
  });

  describe('getEffectiveSensitivity()', () => {
    it('should return mouse sensitivity', () => {
      settings.set('controls.mouseSensitivity', 2.0);
      expect(settings.getEffectiveSensitivity()).toBe(2.0);
    });
  });

  describe('getEffectiveAimSensitivity()', () => {
    it('should multiply sensitivities', () => {
      settings.set('controls.mouseSensitivity', 2.0);
      settings.set('controls.aimSensitivity', 0.5);
      expect(settings.getEffectiveAimSensitivity()).toBe(1.0);
    });
  });

  describe('getEffectiveVolume()', () => {
    it('should calculate sfx volume', () => {
      settings.set('audio.masterVolume', 50);
      settings.set('audio.sfxVolume', 100);
      expect(settings.getEffectiveVolume('sfx')).toBe(0.5);
    });

    it('should calculate music volume', () => {
      settings.set('audio.masterVolume', 100);
      settings.set('audio.musicVolume', 50);
      expect(settings.getEffectiveVolume('music')).toBe(0.5);
    });
  });

  describe('isEffectEnabled()', () => {
    it('should check graphics setting', () => {
      settings.set('graphics.particles', true);
      expect(settings.isEffectEnabled('particles')).toBe(true);

      settings.set('graphics.particles', false);
      expect(settings.isEffectEnabled('particles')).toBe(false);
    });

    it('should respect reduceMotion setting', () => {
      settings.set('graphics.screenShake', true);
      settings.set('accessibility.reduceMotion', true);

      expect(settings.isEffectEnabled('screenShake')).toBe(false);
      expect(settings.isEffectEnabled('particles')).toBe(false);
    });
  });

  // ==========================================================================
  // Import/Export
  // ==========================================================================
  describe('export()', () => {
    it('should export settings as JSON', () => {
      const exported = settings.export();
      const parsed = JSON.parse(exported);

      expect(parsed.audio).toBeDefined();
      expect(parsed.graphics).toBeDefined();
    });
  });

  describe('import()', () => {
    it('should import valid JSON', () => {
      const toImport = JSON.stringify({
        audio: { masterVolume: 25 },
      });

      const result = settings.import(toImport);

      expect(result).toBe(true);
      expect(settings.get('audio.masterVolume')).toBe(25);
    });

    it('should emit settings:imported event', () => {
      const callback = vi.fn();
      settings.on('settings:imported', callback);

      settings.import(JSON.stringify({ audio: { masterVolume: 25 } }));

      expect(callback).toHaveBeenCalled();
    });

    it('should return false for invalid JSON', () => {
      const result = settings.import('invalid json');
      expect(result).toBe(false);
    });

    it('should merge with defaults', () => {
      const toImport = JSON.stringify({
        audio: { masterVolume: 25 },
      });

      settings.import(toImport);

      // Imported value
      expect(settings.get('audio.masterVolume')).toBe(25);
      // Default value (not in import)
      expect(settings.get('graphics.quality')).toBe('high');
    });
  });

  // ==========================================================================
  // Pending Changes
  // ==========================================================================
  describe('pending changes', () => {
    describe('beginChanges()', () => {
      it('should save current state', () => {
        settings.set('audio.masterVolume', 50);
        settings.beginChanges();
        settings.set('audio.masterVolume', 75);

        // Can still cancel
        settings.cancelChanges();
        expect(settings.get('audio.masterVolume')).toBe(50);
      });
    });

    describe('applyChanges()', () => {
      it('should apply and clear pending', () => {
        const callback = vi.fn();
        settings.on('settings:applied', callback);

        settings.beginChanges();
        settings.set('audio.masterVolume', 75);
        settings.applyChanges();

        expect(callback).toHaveBeenCalled();
        expect(settings.get('audio.masterVolume')).toBe(75);
      });
    });

    describe('cancelChanges()', () => {
      it('should revert to saved state', () => {
        const callback = vi.fn();
        settings.on('settings:cancelled', callback);

        settings.set('audio.masterVolume', 50);
        settings.beginChanges();
        settings.set('audio.masterVolume', 100);
        settings.cancelChanges();

        expect(callback).toHaveBeenCalled();
        expect(settings.get('audio.masterVolume')).toBe(50);
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetSettingsManager();
    });

    it('should return same instance', () => {
      const instance1 = getSettingsManager();
      const instance2 = getSettingsManager();
      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getSettingsManager();
      resetSettingsManager();
      const instance2 = getSettingsManager();
      expect(instance2).not.toBe(instance1);
    });
  });
});
