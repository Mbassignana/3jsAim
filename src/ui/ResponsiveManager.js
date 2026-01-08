/**
 * ResponsiveManager - Handles responsive design for different screen sizes
 * Manages breakpoints, viewport changes, and UI scaling
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Breakpoints
// ==========================================================================

export const Breakpoints = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE_DESKTOP: 1440,
  ULTRA_WIDE: 2560,
};

export const DeviceTypes = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  LARGE_DESKTOP: 'large_desktop',
  ULTRA_WIDE: 'ultra_wide',
};

export const Orientations = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
};

// ==========================================================================
// Scaling Presets
// ==========================================================================

export const ScalingPresets = {
  mobile: {
    uiScale: 0.8,
    crosshairSize: 16,
    fontSize: {
      small: 10,
      medium: 14,
      large: 18,
    },
    menuPadding: 20,
    buttonSize: { width: 120, height: 40 },
    minimapSize: 120,
    hudMargin: 10,
  },
  tablet: {
    uiScale: 0.9,
    crosshairSize: 18,
    fontSize: {
      small: 12,
      medium: 16,
      large: 22,
    },
    menuPadding: 30,
    buttonSize: { width: 150, height: 45 },
    minimapSize: 160,
    hudMargin: 15,
  },
  desktop: {
    uiScale: 1.0,
    crosshairSize: 20,
    fontSize: {
      small: 14,
      medium: 18,
      large: 24,
    },
    menuPadding: 40,
    buttonSize: { width: 180, height: 50 },
    minimapSize: 200,
    hudMargin: 20,
  },
  large_desktop: {
    uiScale: 1.1,
    crosshairSize: 22,
    fontSize: {
      small: 16,
      medium: 20,
      large: 28,
    },
    menuPadding: 50,
    buttonSize: { width: 200, height: 55 },
    minimapSize: 220,
    hudMargin: 25,
  },
  ultra_wide: {
    uiScale: 1.2,
    crosshairSize: 24,
    fontSize: {
      small: 18,
      medium: 22,
      large: 32,
    },
    menuPadding: 60,
    buttonSize: { width: 220, height: 60 },
    minimapSize: 250,
    hudMargin: 30,
  },
};

// ==========================================================================
// ResponsiveManager Class
// ==========================================================================

export class ResponsiveManager extends EventEmitter {
  constructor() {
    super();

    /** @type {number} */
    this._width = 1024;

    /** @type {number} */
    this._height = 768;

    /** @type {string} */
    this._deviceType = DeviceTypes.DESKTOP;

    /** @type {string} */
    this._orientation = Orientations.LANDSCAPE;

    /** @type {number} */
    this._devicePixelRatio = 1;

    /** @type {Object} */
    this._scalingPreset = ScalingPresets.desktop;

    /** @type {boolean} */
    this._initialized = false;

    /** @type {Function|null} */
    this._resizeHandler = null;

    /** @type {number|null} */
    this._resizeDebounceTimer = null;

    /** @type {number} */
    this._resizeDebounceDelay = 100;

    /** @type {Map<string, Object>} */
    this._customBreakpoints = new Map();
  }

  /**
   * Initialize the responsive manager
   * @param {Object} [options]
   * @param {number} [options.width] - Initial width (default: window.innerWidth)
   * @param {number} [options.height] - Initial height (default: window.innerHeight)
   * @param {number} [options.debounceDelay] - Resize debounce delay in ms
   */
  init(options = {}) {
    if (this._initialized) {
      return;
    }

    const {
      width = typeof window !== 'undefined' ? window.innerWidth : 1024,
      height = typeof window !== 'undefined' ? window.innerHeight : 768,
      debounceDelay = 100,
    } = options;

    this._resizeDebounceDelay = debounceDelay;
    this._devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this._updateDimensions(width, height);
    this._setupEventListeners();

    this._initialized = true;
    this.emit('responsive:init', this.getState());
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  /**
   * Get current viewport width
   * @returns {number}
   */
  get width() {
    return this._width;
  }

  /**
   * Get current viewport height
   * @returns {number}
   */
  get height() {
    return this._height;
  }

  /**
   * Get current device type
   * @returns {string}
   */
  get deviceType() {
    return this._deviceType;
  }

  /**
   * Get current orientation
   * @returns {string}
   */
  get orientation() {
    return this._orientation;
  }

  /**
   * Get device pixel ratio
   * @returns {number}
   */
  get devicePixelRatio() {
    return this._devicePixelRatio;
  }

  /**
   * Get current scaling preset
   * @returns {Object}
   */
  get scalingPreset() {
    return { ...this._scalingPreset };
  }

  /**
   * Get aspect ratio
   * @returns {number}
   */
  get aspectRatio() {
    return this._height > 0 ? this._width / this._height : 1;
  }

  // ==========================================================================
  // Viewport Methods
  // ==========================================================================

  /**
   * Manually update viewport dimensions
   * @param {number} width
   * @param {number} height
   */
  setDimensions(width, height) {
    this._updateDimensions(width, height);
  }

  /**
   * Get current viewport dimensions
   * @returns {{width: number, height: number}}
   */
  getDimensions() {
    return { width: this._width, height: this._height };
  }

  /**
   * Check if current viewport matches a breakpoint
   * @param {string} breakpoint - Breakpoint name (mobile, tablet, etc.)
   * @returns {boolean}
   */
  isBreakpoint(breakpoint) {
    return this._deviceType === breakpoint;
  }

  /**
   * Check if viewport is at least a certain breakpoint
   * @param {string} breakpoint
   * @returns {boolean}
   */
  isAtLeast(breakpoint) {
    const order = [
      DeviceTypes.MOBILE,
      DeviceTypes.TABLET,
      DeviceTypes.DESKTOP,
      DeviceTypes.LARGE_DESKTOP,
      DeviceTypes.ULTRA_WIDE,
    ];

    const currentIndex = order.indexOf(this._deviceType);
    const targetIndex = order.indexOf(breakpoint);

    return currentIndex >= targetIndex;
  }

  /**
   * Check if viewport is at most a certain breakpoint
   * @param {string} breakpoint
   * @returns {boolean}
   */
  isAtMost(breakpoint) {
    const order = [
      DeviceTypes.MOBILE,
      DeviceTypes.TABLET,
      DeviceTypes.DESKTOP,
      DeviceTypes.LARGE_DESKTOP,
      DeviceTypes.ULTRA_WIDE,
    ];

    const currentIndex = order.indexOf(this._deviceType);
    const targetIndex = order.indexOf(breakpoint);

    return currentIndex <= targetIndex;
  }

  // ==========================================================================
  // Device Detection
  // ==========================================================================

  /**
   * Check if device is mobile
   * @returns {boolean}
   */
  isMobile() {
    return this._deviceType === DeviceTypes.MOBILE;
  }

  /**
   * Check if device is tablet
   * @returns {boolean}
   */
  isTablet() {
    return this._deviceType === DeviceTypes.TABLET;
  }

  /**
   * Check if device is desktop (or larger)
   * @returns {boolean}
   */
  isDesktop() {
    return this.isAtLeast(DeviceTypes.DESKTOP);
  }

  /**
   * Check if orientation is portrait
   * @returns {boolean}
   */
  isPortrait() {
    return this._orientation === Orientations.PORTRAIT;
  }

  /**
   * Check if orientation is landscape
   * @returns {boolean}
   */
  isLandscape() {
    return this._orientation === Orientations.LANDSCAPE;
  }

  /**
   * Check if device has touch support
   * @returns {boolean}
   */
  hasTouch() {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // ==========================================================================
  // Scaling Methods
  // ==========================================================================

  /**
   * Get UI scale factor
   * @returns {number}
   */
  getUIScale() {
    return this._scalingPreset.uiScale;
  }

  /**
   * Get scaled value
   * @param {number} baseValue
   * @returns {number}
   */
  scale(baseValue) {
    return baseValue * this._scalingPreset.uiScale;
  }

  /**
   * Get font size for a given tier
   * @param {'small'|'medium'|'large'} tier
   * @returns {number}
   */
  getFontSize(tier = 'medium') {
    return this._scalingPreset.fontSize[tier] || this._scalingPreset.fontSize.medium;
  }

  /**
   * Get crosshair size
   * @returns {number}
   */
  getCrosshairSize() {
    return this._scalingPreset.crosshairSize;
  }

  /**
   * Get menu padding
   * @returns {number}
   */
  getMenuPadding() {
    return this._scalingPreset.menuPadding;
  }

  /**
   * Get button size
   * @returns {{width: number, height: number}}
   */
  getButtonSize() {
    return { ...this._scalingPreset.buttonSize };
  }

  /**
   * Get minimap size
   * @returns {number}
   */
  getMinimapSize() {
    return this._scalingPreset.minimapSize;
  }

  /**
   * Get HUD margin
   * @returns {number}
   */
  getHUDMargin() {
    return this._scalingPreset.hudMargin;
  }

  // ==========================================================================
  // Custom Breakpoints
  // ==========================================================================

  /**
   * Add a custom breakpoint
   * @param {string} name
   * @param {number} minWidth
   * @param {Object} scalingPreset
   */
  addCustomBreakpoint(name, minWidth, scalingPreset) {
    this._customBreakpoints.set(name, {
      minWidth,
      scalingPreset: { ...ScalingPresets.desktop, ...scalingPreset },
    });

    // Re-evaluate current device type
    this._updateDimensions(this._width, this._height);

    this.emit('breakpoint:added', { name, minWidth });
  }

  /**
   * Remove a custom breakpoint
   * @param {string} name
   */
  removeCustomBreakpoint(name) {
    if (this._customBreakpoints.has(name)) {
      this._customBreakpoints.delete(name);
      this._updateDimensions(this._width, this._height);
      this.emit('breakpoint:removed', { name });
    }
  }

  // ==========================================================================
  // Media Queries
  // ==========================================================================

  /**
   * Match a media query
   * @param {string} query - Media query string
   * @returns {boolean}
   */
  matchMedia(query) {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  }

  /**
   * Check for reduced motion preference
   * @returns {boolean}
   */
  prefersReducedMotion() {
    return this.matchMedia('(prefers-reduced-motion: reduce)');
  }

  /**
   * Check for dark mode preference
   * @returns {boolean}
   */
  prefersDarkMode() {
    return this.matchMedia('(prefers-color-scheme: dark)');
  }

  /**
   * Check for high contrast preference
   * @returns {boolean}
   */
  prefersHighContrast() {
    return this.matchMedia('(prefers-contrast: more)');
  }

  // ==========================================================================
  // State
  // ==========================================================================

  /**
   * Get complete responsive state
   * @returns {Object}
   */
  getState() {
    return {
      width: this._width,
      height: this._height,
      deviceType: this._deviceType,
      orientation: this._orientation,
      aspectRatio: this.aspectRatio,
      devicePixelRatio: this._devicePixelRatio,
      scalingPreset: this.scalingPreset,
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      isPortrait: this.isPortrait(),
      isLandscape: this.isLandscape(),
      hasTouch: this.hasTouch(),
    };
  }

  /**
   * Get CSS custom properties for current state
   * @returns {Object}
   */
  getCSSProperties() {
    return {
      '--ui-scale': this._scalingPreset.uiScale,
      '--crosshair-size': `${this._scalingPreset.crosshairSize}px`,
      '--font-size-small': `${this._scalingPreset.fontSize.small}px`,
      '--font-size-medium': `${this._scalingPreset.fontSize.medium}px`,
      '--font-size-large': `${this._scalingPreset.fontSize.large}px`,
      '--menu-padding': `${this._scalingPreset.menuPadding}px`,
      '--button-width': `${this._scalingPreset.buttonSize.width}px`,
      '--button-height': `${this._scalingPreset.buttonSize.height}px`,
      '--minimap-size': `${this._scalingPreset.minimapSize}px`,
      '--hud-margin': `${this._scalingPreset.hudMargin}px`,
    };
  }

  /**
   * Apply CSS custom properties to element
   * @param {HTMLElement} [element] - Element to apply to (default: document.documentElement)
   */
  applyCSSProperties(element) {
    const target = element || (typeof document !== 'undefined' ? document.documentElement : null);
    if (!target) return;

    const props = this.getCSSProperties();
    for (const [key, value] of Object.entries(props)) {
      target.style.setProperty(key, String(value));
    }

    this.emit('css:applied', { properties: props });
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Update dimensions and recalculate device type
   * @param {number} width
   * @param {number} height
   * @private
   */
  _updateDimensions(width, height) {
    const previousDeviceType = this._deviceType;
    const previousOrientation = this._orientation;

    this._width = width;
    this._height = height;
    this._orientation = width >= height ? Orientations.LANDSCAPE : Orientations.PORTRAIT;
    this._deviceType = this._getDeviceType(width);
    this._scalingPreset = this._getScalingPreset(this._deviceType);

    const deviceChanged = previousDeviceType !== this._deviceType;
    const orientationChanged = previousOrientation !== this._orientation;

    if (deviceChanged || orientationChanged) {
      this.emit('responsive:change', {
        width,
        height,
        deviceType: this._deviceType,
        orientation: this._orientation,
        deviceChanged,
        orientationChanged,
        previousDeviceType,
        previousOrientation,
      });

      getEventBus().emit(GameEvents.SETTINGS_CHANGED, {
        category: 'responsive',
        setting: 'viewport',
        value: { width, height, deviceType: this._deviceType },
      });
    }

    this.emit('viewport:resize', { width, height });
  }

  /**
   * Determine device type from width
   * @param {number} width
   * @returns {string}
   * @private
   */
  _getDeviceType(width) {
    if (width < Breakpoints.MOBILE) {
      return DeviceTypes.MOBILE;
    } else if (width < Breakpoints.TABLET) {
      return DeviceTypes.MOBILE;
    } else if (width < Breakpoints.DESKTOP) {
      return DeviceTypes.TABLET;
    } else if (width < Breakpoints.LARGE_DESKTOP) {
      return DeviceTypes.DESKTOP;
    } else if (width < Breakpoints.ULTRA_WIDE) {
      return DeviceTypes.LARGE_DESKTOP;
    } else {
      return DeviceTypes.ULTRA_WIDE;
    }
  }

  /**
   * Get scaling preset for device type
   * @param {string} deviceType
   * @returns {Object}
   * @private
   */
  _getScalingPreset(deviceType) {
    return ScalingPresets[deviceType] || ScalingPresets.desktop;
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    if (typeof window === 'undefined') return;

    this._resizeHandler = () => {
      if (this._resizeDebounceTimer) {
        clearTimeout(this._resizeDebounceTimer);
      }

      this._resizeDebounceTimer = setTimeout(() => {
        this._updateDimensions(window.innerWidth, window.innerHeight);
        this._resizeDebounceTimer = null;
      }, this._resizeDebounceDelay);
    };

    window.addEventListener('resize', this._resizeHandler);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (typeof window !== 'undefined' && this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    if (this._resizeDebounceTimer) {
      clearTimeout(this._resizeDebounceTimer);
    }

    this._customBreakpoints.clear();
    this._initialized = false;

    this.emit('responsive:destroyed');
  }

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  /**
   * Get all breakpoints
   * @returns {Object}
   */
  static getBreakpoints() {
    return { ...Breakpoints };
  }

  /**
   * Get all device types
   * @returns {Object}
   */
  static getDeviceTypes() {
    return { ...DeviceTypes };
  }

  /**
   * Get all orientations
   * @returns {Object}
   */
  static getOrientations() {
    return { ...Orientations };
  }

  /**
   * Get all scaling presets
   * @returns {Object}
   */
  static getScalingPresets() {
    return JSON.parse(JSON.stringify(ScalingPresets));
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let responsiveManagerInstance = null;

/**
 * Get the singleton responsive manager instance
 * @returns {ResponsiveManager}
 */
export function getResponsiveManager() {
  if (!responsiveManagerInstance) {
    responsiveManagerInstance = new ResponsiveManager();
  }
  return responsiveManagerInstance;
}

/**
 * Reset the responsive manager instance
 */
export function resetResponsiveManager() {
  if (responsiveManagerInstance) {
    responsiveManagerInstance.destroy();
    responsiveManagerInstance = null;
  }
}

export default ResponsiveManager;
