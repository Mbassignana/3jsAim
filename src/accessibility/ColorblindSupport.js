/**
 * ColorblindSupport - Applies colorblind-friendly color palettes
 * Transforms game colors for different types of color vision deficiency
 */

import { getSettingsManager } from '../ui/SettingsManager.js';
import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} ColorPalette
 * @property {string} target - Primary target color
 * @property {string} targetAlt - Secondary target color
 * @property {string} bonus - Bonus target color
 * @property {string} hit - Hit indicator color
 * @property {string} miss - Miss indicator color
 * @property {string} danger - Danger/warning color
 * @property {string} success - Success/positive color
 * @property {string} neutral - Neutral/background color
 */

// ==========================================================================
// Colorblind Mode Types
// ==========================================================================

export const ColorblindModes = {
  OFF: 'off',
  PROTANOPIA: 'protanopia', // Red-blind
  DEUTERANOPIA: 'deuteranopia', // Green-blind
  TRITANOPIA: 'tritanopia', // Blue-blind
};

// ==========================================================================
// Extended Color Palettes
// ==========================================================================

export const ExtendedPalettes = {
  off: {
    // Standard colors
    target: '#ff4444',
    targetAlt: '#44ff44',
    targetMoving: '#44aaff',
    targetBonus: '#ffff44',
    targetArmored: '#888888',
    targetGhost: '#aa88ff',
    targetStreak: '#ff44ff',
    targetShrinking: '#ff8844',

    // UI colors
    hit: '#00ff00',
    miss: '#ff0000',
    combo: '#ffaa00',
    critical: '#ff00ff',

    // Crosshair
    crosshairDefault: '#00ff00',
    crosshairHit: '#ff4444',

    // Health/UI
    health: '#00ff00',
    healthLow: '#ff4444',
    shield: '#4488ff',

    // Background/accents
    danger: '#ff0000',
    success: '#00ff00',
    warning: '#ffaa00',
    neutral: '#888888',
  },

  protanopia: {
    // Red-blind: Replace reds with blues, greens with yellows
    target: '#0066ff',
    targetAlt: '#ffcc00',
    targetMoving: '#00ccff',
    targetBonus: '#ff66ff',
    targetArmored: '#999999',
    targetGhost: '#66ccff',
    targetStreak: '#ff99ff',
    targetShrinking: '#ffaa00',

    hit: '#00ccff',
    miss: '#ff9900',
    combo: '#ffcc00',
    critical: '#ff66ff',

    crosshairDefault: '#00ccff',
    crosshairHit: '#ff9900',

    health: '#00ccff',
    healthLow: '#ff9900',
    shield: '#66ffff',

    danger: '#ff9900',
    success: '#00ccff',
    warning: '#ffcc00',
    neutral: '#999999',
  },

  deuteranopia: {
    // Green-blind: Similar to protanopia
    target: '#0066ff',
    targetAlt: '#ffcc00',
    targetMoving: '#00ccff',
    targetBonus: '#ff66ff',
    targetArmored: '#999999',
    targetGhost: '#66ccff',
    targetStreak: '#ff99ff',
    targetShrinking: '#ffaa00',

    hit: '#00ccff',
    miss: '#ff9900',
    combo: '#ffcc00',
    critical: '#ff66ff',

    crosshairDefault: '#00ccff',
    crosshairHit: '#ff9900',

    health: '#00ccff',
    healthLow: '#ff9900',
    shield: '#66ffff',

    danger: '#ff9900',
    success: '#00ccff',
    warning: '#ffcc00',
    neutral: '#999999',
  },

  tritanopia: {
    // Blue-blind: Replace blues with reds/magentas
    target: '#ff4444',
    targetAlt: '#00ffaa',
    targetMoving: '#ff66aa',
    targetBonus: '#ffff00',
    targetArmored: '#999999',
    targetGhost: '#ff99cc',
    targetStreak: '#ffaaff',
    targetShrinking: '#ff8844',

    hit: '#00ff88',
    miss: '#ff4444',
    combo: '#ffff00',
    critical: '#ff00aa',

    crosshairDefault: '#00ff88',
    crosshairHit: '#ff4444',

    health: '#00ff88',
    healthLow: '#ff4444',
    shield: '#ff66ff',

    danger: '#ff4444',
    success: '#00ff88',
    warning: '#ffff00',
    neutral: '#999999',
  },
};

// ==========================================================================
// Color Simulation (for preview)
// ==========================================================================

/**
 * Simulates how colors appear with different color vision deficiencies
 */
export const ColorSimulation = {
  /**
   * Convert hex color to RGB
   * @param {string} hex
   * @returns {{r: number, g: number, b: number}}
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  },

  /**
   * Convert RGB to hex
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string}
   */
  rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Simulate protanopia (red-blind)
   * @param {string} hex
   * @returns {string}
   */
  simulateProtanopia(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    // Simplified protanopia simulation matrix
    const newR = 0.567 * r + 0.433 * g + 0.0 * b;
    const newG = 0.558 * r + 0.442 * g + 0.0 * b;
    const newB = 0.0 * r + 0.242 * g + 0.758 * b;
    return this.rgbToHex(newR, newG, newB);
  },

  /**
   * Simulate deuteranopia (green-blind)
   * @param {string} hex
   * @returns {string}
   */
  simulateDeuteranopia(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    // Simplified deuteranopia simulation matrix
    const newR = 0.625 * r + 0.375 * g + 0.0 * b;
    const newG = 0.7 * r + 0.3 * g + 0.0 * b;
    const newB = 0.0 * r + 0.3 * g + 0.7 * b;
    return this.rgbToHex(newR, newG, newB);
  },

  /**
   * Simulate tritanopia (blue-blind)
   * @param {string} hex
   * @returns {string}
   */
  simulateTritanopia(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    // Simplified tritanopia simulation matrix
    const newR = 0.95 * r + 0.05 * g + 0.0 * b;
    const newG = 0.0 * r + 0.433 * g + 0.567 * b;
    const newB = 0.0 * r + 0.475 * g + 0.525 * b;
    return this.rgbToHex(newR, newG, newB);
  },

  /**
   * Simulate a color for given mode
   * @param {string} hex
   * @param {string} mode
   * @returns {string}
   */
  simulate(hex, mode) {
    switch (mode) {
    case 'protanopia':
      return this.simulateProtanopia(hex);
    case 'deuteranopia':
      return this.simulateDeuteranopia(hex);
    case 'tritanopia':
      return this.simulateTritanopia(hex);
    default:
      return hex;
    }
  },
};

// ==========================================================================
// ColorblindSupport Class
// ==========================================================================

export class ColorblindSupport extends EventEmitter {
  constructor() {
    super();

    /** @type {string} */
    this._currentMode = ColorblindModes.OFF;

    /** @type {ColorPalette} */
    this._activePalette = ExtendedPalettes.off;

    /** @type {Map<string, string>} */
    this._customOverrides = new Map();

    this._setupEventListeners();
    this._syncWithSettings();
  }

  /**
   * Get current colorblind mode
   * @returns {string}
   */
  get currentMode() {
    return this._currentMode;
  }

  /**
   * Get active color palette
   * @returns {ColorPalette}
   */
  get palette() {
    return { ...this._activePalette, ...Object.fromEntries(this._customOverrides) };
  }

  /**
   * Set colorblind mode
   * @param {string} mode
   */
  setMode(mode) {
    if (!ExtendedPalettes[mode]) {
      console.warn(`Unknown colorblind mode: ${mode}`);
      return;
    }

    const oldMode = this._currentMode;
    this._currentMode = mode;
    this._activePalette = ExtendedPalettes[mode];

    // Update settings manager
    const settings = getSettingsManager();
    settings.set('accessibility.colorblindMode', mode);

    this.emit('mode:changed', { oldMode, newMode: mode, palette: this.palette });
    getEventBus().emit(GameEvents.SETTINGS_CHANGED, {
      category: 'accessibility',
      setting: 'colorblindMode',
      value: mode,
    });
  }

  /**
   * Get a specific color from the palette
   * @param {string} colorKey
   * @returns {string}
   */
  getColor(colorKey) {
    if (this._customOverrides.has(colorKey)) {
      return this._customOverrides.get(colorKey);
    }
    return this._activePalette[colorKey] || ExtendedPalettes.off[colorKey] || '#ffffff';
  }

  /**
   * Get target color by target type
   * @param {string} targetType - standard, moving, bonus, etc.
   * @returns {string}
   */
  getTargetColor(targetType) {
    const colorMap = {
      standard: 'target',
      moving: 'targetMoving',
      shrinking: 'targetShrinking',
      bonus: 'targetBonus',
      split: 'targetAlt',
      armored: 'targetArmored',
      ghost: 'targetGhost',
      streak: 'targetStreak',
    };

    const colorKey = colorMap[targetType] || 'target';
    return this.getColor(colorKey);
  }

  /**
   * Set a custom color override
   * @param {string} colorKey
   * @param {string} color
   */
  setCustomColor(colorKey, color) {
    this._customOverrides.set(colorKey, color);
    this.emit('color:overridden', { colorKey, color });
  }

  /**
   * Clear custom color override
   * @param {string} colorKey
   */
  clearCustomColor(colorKey) {
    this._customOverrides.delete(colorKey);
    this.emit('color:cleared', { colorKey });
  }

  /**
   * Clear all custom overrides
   */
  clearAllCustomColors() {
    this._customOverrides.clear();
    this.emit('colors:reset');
  }

  /**
   * Check if high contrast mode should be applied
   * @returns {boolean}
   */
  isHighContrastEnabled() {
    const settings = getSettingsManager();
    return settings.get('accessibility.highContrast') || false;
  }

  /**
   * Get colors adjusted for high contrast if enabled
   * @param {string} foreground
   * @param {string} background
   * @returns {{foreground: string, background: string}}
   */
  getHighContrastColors(foreground, background) {
    if (!this.isHighContrastEnabled()) {
      return { foreground, background };
    }

    // Enhance contrast
    const fg = ColorSimulation.hexToRgb(foreground);
    const bg = ColorSimulation.hexToRgb(background);

    // Calculate luminance
    const fgLum = (0.299 * fg.r + 0.587 * fg.g + 0.114 * fg.b) / 255;
    const bgLum = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255;

    // If contrast is low, adjust
    const contrast = Math.abs(fgLum - bgLum);
    if (contrast < 0.5) {
      if (bgLum > 0.5) {
        // Light background, make foreground darker
        return { foreground: '#000000', background };
      } else {
        // Dark background, make foreground brighter
        return { foreground: '#ffffff', background };
      }
    }

    return { foreground, background };
  }

  /**
   * Preview how colors would look in a different mode
   * @param {string} mode
   * @returns {ColorPalette}
   */
  previewMode(mode) {
    return ExtendedPalettes[mode] || ExtendedPalettes.off;
  }

  /**
   * Simulate how a custom color would appear
   * @param {string} hex
   * @returns {Object}
   */
  simulateColor(hex) {
    return {
      original: hex,
      protanopia: ColorSimulation.simulateProtanopia(hex),
      deuteranopia: ColorSimulation.simulateDeuteranopia(hex),
      tritanopia: ColorSimulation.simulateTritanopia(hex),
    };
  }

  /**
   * Get all available modes
   * @returns {string[]}
   */
  static getAvailableModes() {
    return Object.values(ColorblindModes);
  }

  /**
   * Get mode description
   * @param {string} mode
   * @returns {Object}
   */
  static getModeInfo(mode) {
    const info = {
      off: {
        name: 'Normal',
        description: 'Standard color scheme',
        affectedColors: [],
      },
      protanopia: {
        name: 'Protanopia',
        description: 'Red-blind (difficulty seeing reds)',
        affectedColors: ['red', 'orange', 'some greens'],
      },
      deuteranopia: {
        name: 'Deuteranopia',
        description: 'Green-blind (difficulty seeing greens)',
        affectedColors: ['green', 'yellow-green', 'some oranges'],
      },
      tritanopia: {
        name: 'Tritanopia',
        description: 'Blue-blind (difficulty seeing blues)',
        affectedColors: ['blue', 'purple', 'some greens'],
      },
    };

    return info[mode] || info.off;
  }

  /**
   * Sync with settings manager
   * @private
   */
  _syncWithSettings() {
    try {
      const settings = getSettingsManager();
      const mode = settings.get('accessibility.colorblindMode') || 'off';
      this._currentMode = mode;
      this._activePalette = ExtendedPalettes[mode] || ExtendedPalettes.off;
    } catch {
      // Settings manager not available yet
    }
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    const eventBus = getEventBus();

    eventBus.on(GameEvents.SETTINGS_CHANGED, (data) => {
      if (data.category === 'accessibility' && data.setting === 'colorblindMode') {
        if (data.value !== this._currentMode) {
          this._currentMode = data.value;
          this._activePalette = ExtendedPalettes[data.value] || ExtendedPalettes.off;
          this.emit('mode:changed', {
            oldMode: this._currentMode,
            newMode: data.value,
            palette: this.palette,
          });
        }
      }
    });
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let colorblindSupportInstance = null;

/**
 * Get the singleton colorblind support instance
 * @returns {ColorblindSupport}
 */
export function getColorblindSupport() {
  if (!colorblindSupportInstance) {
    colorblindSupportInstance = new ColorblindSupport();
  }
  return colorblindSupportInstance;
}

/**
 * Reset the colorblind support instance
 */
export function resetColorblindSupport() {
  if (colorblindSupportInstance) {
    colorblindSupportInstance.removeAllListeners();
    colorblindSupportInstance = null;
  }
}

export default ColorblindSupport;
