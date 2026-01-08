/**
 * SettingsManager - Manages game settings and preferences
 * Handles sensitivity, volume, graphics quality, and UI options
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} GameSettings
 * @property {ControlSettings} controls
 * @property {AudioSettings} audio
 * @property {GraphicsSettings} graphics
 * @property {UISettings} ui
 * @property {AccessibilitySettings} accessibility
 */

/**
 * @typedef {Object} ControlSettings
 * @property {number} mouseSensitivity - Mouse sensitivity (0.1-5.0)
 * @property {number} aimSensitivity - ADS sensitivity multiplier (0.1-2.0)
 * @property {boolean} invertY - Invert Y-axis
 * @property {boolean} rawInput - Use raw mouse input
 * @property {Object} keybinds - Custom keybindings
 */

/**
 * @typedef {Object} AudioSettings
 * @property {number} masterVolume - Master volume (0-100)
 * @property {number} sfxVolume - Sound effects volume (0-100)
 * @property {number} musicVolume - Music volume (0-100)
 * @property {boolean} muteWhenUnfocused - Mute when window loses focus
 */

/**
 * @typedef {Object} GraphicsSettings
 * @property {string} quality - Graphics preset (low, medium, high, ultra)
 * @property {boolean} vsync - Enable VSync
 * @property {number} fpsLimit - FPS limit (0 = unlimited)
 * @property {boolean} particles - Enable particle effects
 * @property {boolean} shadows - Enable shadows
 * @property {boolean} antialiasing - Enable antialiasing
 * @property {number} renderScale - Render resolution scale (0.5-2.0)
 * @property {boolean} screenShake - Enable screen shake effects
 */

/**
 * @typedef {Object} UISettings
 * @property {string} crosshairStyle - Crosshair style (default, dot, cross, circle)
 * @property {string} crosshairColor - Crosshair color (hex)
 * @property {number} crosshairSize - Crosshair size (1-10)
 * @property {number} crosshairThickness - Crosshair thickness (1-5)
 * @property {number} crosshairOpacity - Crosshair opacity (0-100)
 * @property {boolean} hitMarkers - Show hit markers
 * @property {boolean} damageNumbers - Show damage numbers
 * @property {boolean} showFPS - Show FPS counter
 * @property {boolean} showPing - Show ping/latency
 */

/**
 * @typedef {Object} AccessibilitySettings
 * @property {string} colorblindMode - Colorblind mode (off, protanopia, deuteranopia, tritanopia)
 * @property {boolean} reduceMotion - Reduce motion effects
 * @property {boolean} highContrast - High contrast mode
 * @property {number} textScale - Text size scale (0.75-1.5)
 */

// ==========================================================================
// Default Settings
// ==========================================================================

export const DefaultSettings = {
  controls: {
    mouseSensitivity: 1.0,
    aimSensitivity: 0.8,
    invertY: false,
    rawInput: true,
    keybinds: {
      forward: 'KeyW',
      backward: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      jump: 'Space',
      crouch: 'ControlLeft',
      reload: 'KeyR',
      shoot: 'Mouse0',
      aim: 'Mouse1',
      pause: 'Escape',
      weapon1: 'Digit1',
      weapon2: 'Digit2',
      weapon3: 'Digit3',
      weapon4: 'Digit4',
      weapon5: 'Digit5',
    },
  },

  audio: {
    masterVolume: 80,
    sfxVolume: 100,
    musicVolume: 50,
    muteWhenUnfocused: true,
  },

  graphics: {
    quality: 'high',
    vsync: true,
    fpsLimit: 0,
    particles: true,
    shadows: true,
    antialiasing: true,
    renderScale: 1.0,
    screenShake: true,
  },

  ui: {
    crosshairStyle: 'cross',
    crosshairColor: '#00ff00',
    crosshairSize: 5,
    crosshairThickness: 2,
    crosshairOpacity: 80,
    hitMarkers: true,
    damageNumbers: true,
    showFPS: false,
    showPing: false,
  },

  accessibility: {
    colorblindMode: 'off',
    reduceMotion: false,
    highContrast: false,
    textScale: 1.0,
  },
};

// ==========================================================================
// Graphics Quality Presets
// ==========================================================================

export const QualityPresets = {
  low: {
    particles: false,
    shadows: false,
    antialiasing: false,
    renderScale: 0.75,
  },
  medium: {
    particles: true,
    shadows: false,
    antialiasing: true,
    renderScale: 1.0,
  },
  high: {
    particles: true,
    shadows: true,
    antialiasing: true,
    renderScale: 1.0,
  },
  ultra: {
    particles: true,
    shadows: true,
    antialiasing: true,
    renderScale: 1.5,
  },
};

// ==========================================================================
// Colorblind Palettes
// ==========================================================================

export const ColorblindPalettes = {
  off: {
    target: '#ff4444',
    targetAlt: '#44ff44',
    bonus: '#ffff44',
    hit: '#00ff00',
    miss: '#ff0000',
  },
  protanopia: {
    target: '#0066ff',
    targetAlt: '#ffcc00',
    bonus: '#ff66ff',
    hit: '#00ccff',
    miss: '#ff9900',
  },
  deuteranopia: {
    target: '#0066ff',
    targetAlt: '#ffcc00',
    bonus: '#ff66ff',
    hit: '#00ccff',
    miss: '#ff9900',
  },
  tritanopia: {
    target: '#ff4444',
    targetAlt: '#00ffff',
    bonus: '#ff88ff',
    hit: '#00ff88',
    miss: '#ff4444',
  },
};

// ==========================================================================
// Setting Validators
// ==========================================================================

const Validators = {
  mouseSensitivity: (v) => Math.max(0.1, Math.min(5.0, v)),
  aimSensitivity: (v) => Math.max(0.1, Math.min(2.0, v)),
  masterVolume: (v) => Math.max(0, Math.min(100, Math.round(v))),
  sfxVolume: (v) => Math.max(0, Math.min(100, Math.round(v))),
  musicVolume: (v) => Math.max(0, Math.min(100, Math.round(v))),
  fpsLimit: (v) => Math.max(0, Math.min(300, Math.round(v))),
  renderScale: (v) => Math.max(0.5, Math.min(2.0, v)),
  crosshairSize: (v) => Math.max(1, Math.min(10, Math.round(v))),
  crosshairThickness: (v) => Math.max(1, Math.min(5, Math.round(v))),
  crosshairOpacity: (v) => Math.max(0, Math.min(100, Math.round(v))),
  textScale: (v) => Math.max(0.75, Math.min(1.5, v)),
  quality: (v) => ['low', 'medium', 'high', 'ultra'].includes(v) ? v : 'high',
  colorblindMode: (v) => ['off', 'protanopia', 'deuteranopia', 'tritanopia'].includes(v) ? v : 'off',
  crosshairStyle: (v) => ['default', 'dot', 'cross', 'circle'].includes(v) ? v : 'cross',
};

// ==========================================================================
// SettingsManager Class
// ==========================================================================

export class SettingsManager extends EventEmitter {
  constructor() {
    super();

    /** @type {GameSettings} */
    this._settings = this._loadSettings();

    /** @type {GameSettings} */
    this._pendingChanges = null;

    this._setupEventListeners();
  }

  /**
   * Get all settings
   * @returns {GameSettings}
   */
  getAll() {
    return JSON.parse(JSON.stringify(this._settings));
  }

  /**
   * Get a setting category
   * @param {string} category - controls, audio, graphics, ui, accessibility
   * @returns {Object}
   */
  getCategory(category) {
    return { ...this._settings[category] };
  }

  /**
   * Get a specific setting value
   * @param {string} path - Dot notation path (e.g., 'audio.masterVolume')
   * @returns {*}
   */
  get(path) {
    const parts = path.split('.');
    let value = this._settings;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    return value;
  }

  /**
   * Set a specific setting value
   * @param {string} path - Dot notation path
   * @param {*} value - New value
   * @param {boolean} [save=true] - Save to localStorage
   */
  set(path, value, save = true) {
    const parts = path.split('.');
    const key = parts.pop();
    let target = this._settings;

    for (const part of parts) {
      if (target[part] === undefined) {
        target[part] = {};
      }
      target = target[part];
    }

    // Validate if validator exists
    if (Validators[key]) {
      value = Validators[key](value);
    }

    const oldValue = target[key];
    target[key] = value;

    if (save) {
      this._saveSettings();
    }

    this.emit('setting:changed', { path, oldValue, newValue: value });
    this._applySettingChange(path, value);
  }

  /**
   * Set multiple settings at once
   * @param {Object} settings - Object with paths and values
   * @param {boolean} [save=true]
   */
  setMultiple(settings, save = true) {
    for (const [path, value] of Object.entries(settings)) {
      this.set(path, value, false);
    }
    if (save) {
      this._saveSettings();
    }
  }

  /**
   * Apply a graphics quality preset
   * @param {string} quality - low, medium, high, ultra
   */
  applyQualityPreset(quality) {
    const preset = QualityPresets[quality];
    if (!preset) return;

    this._settings.graphics.quality = quality;
    Object.assign(this._settings.graphics, preset);
    this._saveSettings();

    this.emit('quality:changed', { quality, settings: this._settings.graphics });
    this._applyGraphicsChanges();
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this._settings = JSON.parse(JSON.stringify(DefaultSettings));
    this._saveSettings();
    this.emit('settings:reset');
    this._applyAllSettings();
  }

  /**
   * Reset a category to defaults
   * @param {string} category
   */
  resetCategory(category) {
    if (DefaultSettings[category]) {
      this._settings[category] = JSON.parse(JSON.stringify(DefaultSettings[category]));
      this._saveSettings();
      this.emit('category:reset', { category });
    }
  }

  /**
   * Get the color palette based on colorblind mode
   * @returns {Object}
   */
  getColorPalette() {
    const mode = this._settings.accessibility.colorblindMode;
    return ColorblindPalettes[mode] || ColorblindPalettes.off;
  }

  /**
   * Get effective sensitivity (with multipliers applied)
   * @returns {number}
   */
  getEffectiveSensitivity() {
    return this._settings.controls.mouseSensitivity;
  }

  /**
   * Get effective aim sensitivity
   * @returns {number}
   */
  getEffectiveAimSensitivity() {
    return this._settings.controls.mouseSensitivity * this._settings.controls.aimSensitivity;
  }

  /**
   * Get effective volume (0-1 scale)
   * @param {string} type - 'sfx' or 'music'
   * @returns {number}
   */
  getEffectiveVolume(type) {
    const master = this._settings.audio.masterVolume / 100;
    const specific = type === 'sfx'
      ? this._settings.audio.sfxVolume / 100
      : this._settings.audio.musicVolume / 100;
    return master * specific;
  }

  /**
   * Check if an effect is enabled
   * @param {string} effect - particles, shadows, screenShake, etc.
   * @returns {boolean}
   */
  isEffectEnabled(effect) {
    // Check accessibility settings first
    if (this._settings.accessibility.reduceMotion) {
      if (['screenShake', 'particles'].includes(effect)) {
        return false;
      }
    }

    return this._settings.graphics[effect] ?? true;
  }

  /**
   * Export settings as JSON string
   * @returns {string}
   */
  export() {
    return JSON.stringify(this._settings, null, 2);
  }

  /**
   * Import settings from JSON string
   * @param {string} json
   * @returns {boolean}
   */
  import(json) {
    try {
      const imported = JSON.parse(json);
      this._settings = this._mergeWithDefaults(imported);
      this._saveSettings();
      this.emit('settings:imported');
      this._applyAllSettings();
      return true;
    } catch (e) {
      console.error('Failed to import settings:', e);
      return false;
    }
  }

  /**
   * Begin a batch of changes (for apply/cancel UI)
   */
  beginChanges() {
    this._pendingChanges = JSON.parse(JSON.stringify(this._settings));
  }

  /**
   * Apply pending changes
   */
  applyChanges() {
    if (this._pendingChanges) {
      this._pendingChanges = null;
      this._saveSettings();
      this._applyAllSettings();
      this.emit('settings:applied');
    }
  }

  /**
   * Cancel pending changes
   */
  cancelChanges() {
    if (this._pendingChanges) {
      this._settings = this._pendingChanges;
      this._pendingChanges = null;
      this.emit('settings:cancelled');
    }
  }

  /**
   * Load settings from localStorage
   * @returns {GameSettings}
   * @private
   */
  _loadSettings() {
    try {
      const saved = localStorage.getItem('game_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return this._mergeWithDefaults(parsed);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return JSON.parse(JSON.stringify(DefaultSettings));
  }

  /**
   * Save settings to localStorage
   * @private
   */
  _saveSettings() {
    try {
      localStorage.setItem('game_settings', JSON.stringify(this._settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  /**
   * Merge imported/loaded settings with defaults
   * @param {Object} loaded
   * @returns {GameSettings}
   * @private
   */
  _mergeWithDefaults(loaded) {
    const merged = JSON.parse(JSON.stringify(DefaultSettings));

    for (const category of Object.keys(DefaultSettings)) {
      if (loaded[category]) {
        for (const key of Object.keys(DefaultSettings[category])) {
          if (loaded[category][key] !== undefined) {
            // Validate if possible
            let value = loaded[category][key];
            if (Validators[key]) {
              value = Validators[key](value);
            }
            merged[category][key] = value;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Apply a single setting change
   * @param {string} path
   * @param {*} value
   * @private
   */
  _applySettingChange(path, value) {
    const eventBus = getEventBus();

    // Emit specific events for common settings
    if (path.startsWith('audio.')) {
      eventBus.emit(GameEvents.SETTINGS_CHANGED, {
        category: 'audio',
        setting: path.split('.')[1],
        value,
      });
    } else if (path.startsWith('graphics.')) {
      eventBus.emit(GameEvents.SETTINGS_CHANGED, {
        category: 'graphics',
        setting: path.split('.')[1],
        value,
      });
    } else if (path.startsWith('controls.')) {
      eventBus.emit(GameEvents.SETTINGS_CHANGED, {
        category: 'controls',
        setting: path.split('.')[1],
        value,
      });
    }
  }

  /**
   * Apply graphics changes
   * @private
   */
  _applyGraphicsChanges() {
    getEventBus().emit(GameEvents.SETTINGS_CHANGED, {
      category: 'graphics',
      settings: this._settings.graphics,
    });
  }

  /**
   * Apply all settings
   * @private
   */
  _applyAllSettings() {
    const eventBus = getEventBus();
    eventBus.emit(GameEvents.SETTINGS_CHANGED, {
      category: 'all',
      settings: this._settings,
    });
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Handle window focus for mute
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', () => {
        if (this._settings.audio.muteWhenUnfocused) {
          this.emit('window:blur');
        }
      });

      window.addEventListener('focus', () => {
        if (this._settings.audio.muteWhenUnfocused) {
          this.emit('window:focus');
        }
      });
    }
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let settingsManagerInstance = null;

/**
 * Get the singleton settings manager instance
 * @returns {SettingsManager}
 */
export function getSettingsManager() {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SettingsManager();
  }
  return settingsManagerInstance;
}

/**
 * Reset the settings manager instance
 */
export function resetSettingsManager() {
  if (settingsManagerInstance) {
    settingsManagerInstance.removeAllListeners();
    settingsManagerInstance = null;
  }
}

export default SettingsManager;
