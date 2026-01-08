/**
 * Unit tests for ColorblindSupport
 * Tests colorblind mode palettes, simulation, and color mapping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ColorblindSupport,
  ColorblindModes,
  ExtendedPalettes,
  ColorSimulation,
  getColorblindSupport,
  resetColorblindSupport,
} from '../../src/accessibility/ColorblindSupport.js';
import { resetSettingsManager } from '../../src/ui/SettingsManager.js';

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

describe('ColorblindSupport', () => {
  let colorblind;

  beforeEach(() => {
    localStorageMock.clear();
    resetSettingsManager();
    colorblind = new ColorblindSupport();
  });

  afterEach(() => {
    resetColorblindSupport();
  });

  // ==========================================================================
  // ColorblindModes
  // ==========================================================================
  describe('ColorblindModes', () => {
    it('should define all colorblind modes', () => {
      expect(ColorblindModes.OFF).toBe('off');
      expect(ColorblindModes.PROTANOPIA).toBe('protanopia');
      expect(ColorblindModes.DEUTERANOPIA).toBe('deuteranopia');
      expect(ColorblindModes.TRITANOPIA).toBe('tritanopia');
    });
  });

  // ==========================================================================
  // ExtendedPalettes
  // ==========================================================================
  describe('ExtendedPalettes', () => {
    it('should have palettes for all modes', () => {
      expect(ExtendedPalettes.off).toBeDefined();
      expect(ExtendedPalettes.protanopia).toBeDefined();
      expect(ExtendedPalettes.deuteranopia).toBeDefined();
      expect(ExtendedPalettes.tritanopia).toBeDefined();
    });

    it('should have all required colors in each palette', () => {
      const requiredColors = [
        'target', 'targetAlt', 'targetMoving', 'targetBonus',
        'hit', 'miss', 'danger', 'success',
      ];

      for (const palette of Object.values(ExtendedPalettes)) {
        for (const color of requiredColors) {
          expect(palette[color], `Missing ${color}`).toBeDefined();
          expect(palette[color]).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    });

    it('should have different colors for colorblind modes', () => {
      // Protanopia should not use standard red
      expect(ExtendedPalettes.protanopia.target).not.toBe(ExtendedPalettes.off.target);
      expect(ExtendedPalettes.protanopia.miss).not.toBe(ExtendedPalettes.off.miss);
    });
  });

  // ==========================================================================
  // ColorSimulation
  // ==========================================================================
  describe('ColorSimulation', () => {
    describe('hexToRgb()', () => {
      it('should convert hex to RGB', () => {
        expect(ColorSimulation.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(ColorSimulation.hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
        expect(ColorSimulation.hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        expect(ColorSimulation.hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(ColorSimulation.hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      });

      it('should handle without hash', () => {
        expect(ColorSimulation.hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      });

      it('should return black for invalid input', () => {
        expect(ColorSimulation.hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
      });
    });

    describe('rgbToHex()', () => {
      it('should convert RGB to hex', () => {
        expect(ColorSimulation.rgbToHex(255, 0, 0)).toBe('#ff0000');
        expect(ColorSimulation.rgbToHex(0, 255, 0)).toBe('#00ff00');
        expect(ColorSimulation.rgbToHex(0, 0, 255)).toBe('#0000ff');
      });

      it('should clamp values to 0-255', () => {
        expect(ColorSimulation.rgbToHex(300, -10, 128)).toBe('#ff0080');
      });
    });

    describe('simulateProtanopia()', () => {
      it('should transform red to appear as it would to protanopes', () => {
        const result = ColorSimulation.simulateProtanopia('#ff0000');
        // Red should become more yellow/brown
        const rgb = ColorSimulation.hexToRgb(result);
        expect(rgb.r).toBeLessThan(255);
        expect(rgb.g).toBeGreaterThan(0);
      });

      it('should leave blue relatively unchanged', () => {
        const result = ColorSimulation.simulateProtanopia('#0000ff');
        const rgb = ColorSimulation.hexToRgb(result);
        expect(rgb.b).toBeGreaterThan(100);
      });
    });

    describe('simulateDeuteranopia()', () => {
      it('should transform green to appear as it would to deuteranopes', () => {
        const result = ColorSimulation.simulateDeuteranopia('#00ff00');
        // Green should become more yellow
        const rgb = ColorSimulation.hexToRgb(result);
        expect(rgb.r).toBeGreaterThan(0);
      });
    });

    describe('simulateTritanopia()', () => {
      it('should transform blue to appear as it would to tritanopes', () => {
        const result = ColorSimulation.simulateTritanopia('#0000ff');
        // Blue should become more greenish
        const rgb = ColorSimulation.hexToRgb(result);
        expect(rgb.g).toBeGreaterThan(0);
      });
    });

    describe('simulate()', () => {
      it('should route to correct simulation', () => {
        const hex = '#ff0000';
        expect(ColorSimulation.simulate(hex, 'protanopia')).toBe(
          ColorSimulation.simulateProtanopia(hex),
        );
        expect(ColorSimulation.simulate(hex, 'deuteranopia')).toBe(
          ColorSimulation.simulateDeuteranopia(hex),
        );
        expect(ColorSimulation.simulate(hex, 'tritanopia')).toBe(
          ColorSimulation.simulateTritanopia(hex),
        );
      });

      it('should return original for off mode', () => {
        expect(ColorSimulation.simulate('#ff0000', 'off')).toBe('#ff0000');
      });
    });
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('constructor', () => {
    it('should initialize with off mode', () => {
      expect(colorblind.currentMode).toBe('off');
    });

    it('should have default palette', () => {
      expect(colorblind.palette.target).toBe(ExtendedPalettes.off.target);
    });
  });

  // ==========================================================================
  // setMode()
  // ==========================================================================
  describe('setMode()', () => {
    it('should change the current mode', () => {
      colorblind.setMode('protanopia');
      expect(colorblind.currentMode).toBe('protanopia');
    });

    it('should update the palette', () => {
      colorblind.setMode('protanopia');
      expect(colorblind.palette.target).toBe(ExtendedPalettes.protanopia.target);
    });

    it('should emit mode:changed event', () => {
      const callback = vi.fn();
      colorblind.on('mode:changed', callback);

      colorblind.setMode('deuteranopia');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].newMode).toBe('deuteranopia');
    });

    it('should ignore invalid modes', () => {
      colorblind.setMode('invalid');
      expect(colorblind.currentMode).toBe('off');
    });
  });

  // ==========================================================================
  // getColor()
  // ==========================================================================
  describe('getColor()', () => {
    it('should return color from current palette', () => {
      expect(colorblind.getColor('target')).toBe(ExtendedPalettes.off.target);
    });

    it('should return custom override if set', () => {
      colorblind.setCustomColor('target', '#123456');
      expect(colorblind.getColor('target')).toBe('#123456');
    });

    it('should return white for unknown color', () => {
      expect(colorblind.getColor('unknown')).toBe('#ffffff');
    });
  });

  // ==========================================================================
  // getTargetColor()
  // ==========================================================================
  describe('getTargetColor()', () => {
    it('should map target types to colors', () => {
      expect(colorblind.getTargetColor('standard')).toBe(ExtendedPalettes.off.target);
      expect(colorblind.getTargetColor('moving')).toBe(ExtendedPalettes.off.targetMoving);
      expect(colorblind.getTargetColor('bonus')).toBe(ExtendedPalettes.off.targetBonus);
      expect(colorblind.getTargetColor('armored')).toBe(ExtendedPalettes.off.targetArmored);
      expect(colorblind.getTargetColor('ghost')).toBe(ExtendedPalettes.off.targetGhost);
      expect(colorblind.getTargetColor('streak')).toBe(ExtendedPalettes.off.targetStreak);
    });

    it('should return default target for unknown type', () => {
      expect(colorblind.getTargetColor('unknown')).toBe(ExtendedPalettes.off.target);
    });

    it('should use current palette', () => {
      colorblind.setMode('protanopia');
      expect(colorblind.getTargetColor('standard')).toBe(ExtendedPalettes.protanopia.target);
    });
  });

  // ==========================================================================
  // Custom Overrides
  // ==========================================================================
  describe('custom color overrides', () => {
    describe('setCustomColor()', () => {
      it('should set a custom override', () => {
        colorblind.setCustomColor('target', '#aabbcc');
        expect(colorblind.getColor('target')).toBe('#aabbcc');
      });

      it('should emit color:overridden event', () => {
        const callback = vi.fn();
        colorblind.on('color:overridden', callback);

        colorblind.setCustomColor('target', '#aabbcc');

        expect(callback).toHaveBeenCalledWith({
          colorKey: 'target',
          color: '#aabbcc',
        });
      });
    });

    describe('clearCustomColor()', () => {
      it('should clear a custom override', () => {
        colorblind.setCustomColor('target', '#aabbcc');
        colorblind.clearCustomColor('target');

        expect(colorblind.getColor('target')).toBe(ExtendedPalettes.off.target);
      });

      it('should emit color:cleared event', () => {
        const callback = vi.fn();
        colorblind.on('color:cleared', callback);

        colorblind.setCustomColor('target', '#aabbcc');
        colorblind.clearCustomColor('target');

        expect(callback).toHaveBeenCalledWith({ colorKey: 'target' });
      });
    });

    describe('clearAllCustomColors()', () => {
      it('should clear all overrides', () => {
        colorblind.setCustomColor('target', '#111111');
        colorblind.setCustomColor('hit', '#222222');
        colorblind.clearAllCustomColors();

        expect(colorblind.getColor('target')).toBe(ExtendedPalettes.off.target);
        expect(colorblind.getColor('hit')).toBe(ExtendedPalettes.off.hit);
      });

      it('should emit colors:reset event', () => {
        const callback = vi.fn();
        colorblind.on('colors:reset', callback);

        colorblind.clearAllCustomColors();

        expect(callback).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // High Contrast
  // ==========================================================================
  describe('high contrast', () => {
    describe('isHighContrastEnabled()', () => {
      it('should return false by default', () => {
        expect(colorblind.isHighContrastEnabled()).toBe(false);
      });
    });

    describe('getHighContrastColors()', () => {
      it('should return original colors when disabled', () => {
        const result = colorblind.getHighContrastColors('#666666', '#888888');
        expect(result.foreground).toBe('#666666');
        expect(result.background).toBe('#888888');
      });
    });
  });

  // ==========================================================================
  // Preview & Simulation
  // ==========================================================================
  describe('previewMode()', () => {
    it('should return palette for given mode', () => {
      const preview = colorblind.previewMode('protanopia');
      expect(preview).toEqual(ExtendedPalettes.protanopia);
    });

    it('should return off palette for invalid mode', () => {
      const preview = colorblind.previewMode('invalid');
      expect(preview).toEqual(ExtendedPalettes.off);
    });
  });

  describe('simulateColor()', () => {
    it('should return simulations for all modes', () => {
      const result = colorblind.simulateColor('#ff0000');

      expect(result.original).toBe('#ff0000');
      expect(result.protanopia).toBeDefined();
      expect(result.deuteranopia).toBeDefined();
      expect(result.tritanopia).toBeDefined();
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================
  describe('static methods', () => {
    describe('getAvailableModes()', () => {
      it('should return all modes', () => {
        const modes = ColorblindSupport.getAvailableModes();
        expect(modes).toContain('off');
        expect(modes).toContain('protanopia');
        expect(modes).toContain('deuteranopia');
        expect(modes).toContain('tritanopia');
      });
    });

    describe('getModeInfo()', () => {
      it('should return info for each mode', () => {
        const offInfo = ColorblindSupport.getModeInfo('off');
        expect(offInfo.name).toBe('Normal');

        const protanopiaInfo = ColorblindSupport.getModeInfo('protanopia');
        expect(protanopiaInfo.name).toBe('Protanopia');
        expect(protanopiaInfo.description).toContain('Red');
        expect(protanopiaInfo.affectedColors.length).toBeGreaterThan(0);
      });

      it('should return off info for invalid mode', () => {
        const info = ColorblindSupport.getModeInfo('invalid');
        expect(info.name).toBe('Normal');
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetColorblindSupport();
    });

    it('should return same instance', () => {
      const instance1 = getColorblindSupport();
      const instance2 = getColorblindSupport();
      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getColorblindSupport();
      instance1.setMode('protanopia');

      resetColorblindSupport();
      // Also reset SettingsManager and clear localStorage to ensure clean state
      localStorageMock.clear();
      resetSettingsManager();

      const instance2 = getColorblindSupport();
      expect(instance2).not.toBe(instance1);
      expect(instance2.currentMode).toBe('off');
    });
  });
});
