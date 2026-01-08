/**
 * ScreenShake - Provides camera shake effects for impact feedback
 * Supports multiple shake types with configurable intensity and decay
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} ShakeConfig
 * @property {number} intensity - Shake intensity (displacement amount)
 * @property {number} duration - Shake duration in milliseconds
 * @property {number} frequency - Shake frequency (oscillations per second)
 * @property {'linear'|'exponential'|'easeOut'} decay - Decay type
 */

export const ShakePresets = {
  /** Light shake for minor impacts */
  LIGHT: {
    intensity: 0.02,
    duration: 100,
    frequency: 30,
    decay: 'exponential',
  },
  /** Medium shake for standard shots */
  MEDIUM: {
    intensity: 0.05,
    duration: 150,
    frequency: 25,
    decay: 'exponential',
  },
  /** Heavy shake for powerful weapons */
  HEAVY: {
    intensity: 0.1,
    duration: 200,
    frequency: 20,
    decay: 'exponential',
  },
  /** Recoil pattern - quick jolt */
  RECOIL: {
    intensity: 0.03,
    duration: 80,
    frequency: 40,
    decay: 'easeOut',
  },
  /** Explosion - sustained shake */
  EXPLOSION: {
    intensity: 0.15,
    duration: 400,
    frequency: 15,
    decay: 'linear',
  },
  /** Hit feedback - very brief */
  HIT: {
    intensity: 0.01,
    duration: 50,
    frequency: 50,
    decay: 'exponential',
  },
};

/**
 * Active shake instance
 */
class ActiveShake {
  /**
   * @param {ShakeConfig} config
   */
  constructor(config) {
    this.intensity = config.intensity;
    this.duration = config.duration;
    this.frequency = config.frequency;
    this.decay = config.decay;
    this.startTime = performance.now();
    this.elapsed = 0;
  }

  /**
   * Update shake and get current offset
   * @param {number} deltaTime - Time since last update in ms
   * @returns {{ x: number, y: number, done: boolean }}
   */
  update(deltaTime) {
    this.elapsed += deltaTime;

    if (this.elapsed >= this.duration) {
      return { x: 0, y: 0, done: true };
    }

    // Calculate progress (0 to 1)
    const progress = this.elapsed / this.duration;

    // Apply decay function
    let decayMultiplier;
    switch (this.decay) {
      case 'linear':
        decayMultiplier = 1 - progress;
        break;
      case 'exponential':
        decayMultiplier = Math.pow(1 - progress, 2);
        break;
      case 'easeOut':
        decayMultiplier = 1 - Math.pow(progress, 3);
        break;
      default:
        decayMultiplier = 1 - progress;
    }

    // Calculate oscillation based on frequency
    const time = this.elapsed / 1000; // Convert to seconds
    const angle = time * this.frequency * Math.PI * 2;

    // Create offset with some randomness for more organic feel
    const currentIntensity = this.intensity * decayMultiplier;
    const x = Math.sin(angle) * currentIntensity * (0.8 + Math.random() * 0.4);
    const y = Math.cos(angle * 1.3) * currentIntensity * (0.8 + Math.random() * 0.4);

    return { x, y, done: false };
  }

  /**
   * Check if shake is complete
   * @returns {boolean}
   */
  get isDone() {
    return this.elapsed >= this.duration;
  }

  /**
   * Get remaining duration
   * @returns {number}
   */
  get remaining() {
    return Math.max(0, this.duration - this.elapsed);
  }
}

export class ScreenShake extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxIntensity=0.2] - Maximum combined intensity
   * @param {boolean} [options.enabled=true] - Whether shake is enabled
   * @param {number} [options.intensityMultiplier=1.0] - Global intensity multiplier
   */
  constructor(options = {}) {
    super();

    this._maxIntensity = options.maxIntensity ?? 0.2;
    this._enabled = options.enabled ?? true;
    this._intensityMultiplier = options.intensityMultiplier ?? 1.0;

    /** @type {ActiveShake[]} */
    this._activeShakes = [];

    // Current offset
    this._offsetX = 0;
    this._offsetY = 0;

    // Last update time
    this._lastTime = 0;
  }

  /**
   * Add a new shake effect
   * @param {ShakeConfig|string} configOrPreset - Shake config or preset name
   * @returns {ActiveShake}
   */
  shake(configOrPreset) {
    if (!this._enabled) {
      return null;
    }

    let config;
    if (typeof configOrPreset === 'string') {
      config = ShakePresets[configOrPreset.toUpperCase()];
      if (!config) {
        console.warn(`Unknown shake preset: ${configOrPreset}`);
        return null;
      }
    } else {
      config = configOrPreset;
    }

    // Apply intensity multiplier
    const scaledConfig = {
      ...config,
      intensity: config.intensity * this._intensityMultiplier,
    };

    const activeShake = new ActiveShake(scaledConfig);
    this._activeShakes.push(activeShake);

    this.emit('shakeStart', { config: scaledConfig });

    return activeShake;
  }

  /**
   * Add a shake using a preset
   * @param {'light'|'medium'|'heavy'|'recoil'|'explosion'|'hit'} preset
   * @returns {ActiveShake}
   */
  addPreset(preset) {
    return this.shake(preset);
  }

  /**
   * Update all active shakes
   * @param {number} [deltaTime] - Delta time in ms (auto-calculated if not provided)
   * @returns {{ x: number, y: number }}
   */
  update(deltaTime) {
    const now = performance.now();
    if (deltaTime === undefined) {
      deltaTime = this._lastTime > 0 ? now - this._lastTime : 16;
    }
    this._lastTime = now;

    if (!this._enabled || this._activeShakes.length === 0) {
      this._offsetX = 0;
      this._offsetY = 0;
      return { x: 0, y: 0 };
    }

    // Accumulate offsets from all active shakes
    let totalX = 0;
    let totalY = 0;

    // Process shakes and remove completed ones
    this._activeShakes = this._activeShakes.filter((shake) => {
      const result = shake.update(deltaTime);
      if (!result.done) {
        totalX += result.x;
        totalY += result.y;
        return true;
      }
      this.emit('shakeEnd', { shake });
      return false;
    });

    // Clamp to max intensity
    const magnitude = Math.sqrt(totalX * totalX + totalY * totalY);
    if (magnitude > this._maxIntensity) {
      const scale = this._maxIntensity / magnitude;
      totalX *= scale;
      totalY *= scale;
    }

    this._offsetX = totalX;
    this._offsetY = totalY;

    return { x: this._offsetX, y: this._offsetY };
  }

  /**
   * Get current offset
   * @returns {{ x: number, y: number }}
   */
  getOffset() {
    return { x: this._offsetX, y: this._offsetY };
  }

  /**
   * Get current X offset
   * @returns {number}
   */
  get offsetX() {
    return this._offsetX;
  }

  /**
   * Get current Y offset
   * @returns {number}
   */
  get offsetY() {
    return this._offsetY;
  }

  /**
   * Check if any shakes are active
   * @returns {boolean}
   */
  get isShaking() {
    return this._activeShakes.length > 0;
  }

  /**
   * Get number of active shakes
   * @returns {number}
   */
  get activeCount() {
    return this._activeShakes.length;
  }

  /**
   * Stop all active shakes
   */
  stopAll() {
    this._activeShakes.forEach((shake) => {
      this.emit('shakeEnd', { shake });
    });
    this._activeShakes = [];
    this._offsetX = 0;
    this._offsetY = 0;
    this.emit('stopped');
  }

  /**
   * Enable shake effects
   */
  enable() {
    this._enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable shake effects
   */
  disable() {
    this._enabled = false;
    this.stopAll();
    this.emit('disabled');
  }

  /**
   * Check if enabled
   * @returns {boolean}
   */
  get isEnabled() {
    return this._enabled;
  }

  /**
   * Set intensity multiplier
   * @param {number} multiplier - 0.0 to 2.0
   */
  setIntensityMultiplier(multiplier) {
    this._intensityMultiplier = Math.max(0, Math.min(2, multiplier));
  }

  /**
   * Get intensity multiplier
   * @returns {number}
   */
  get intensityMultiplier() {
    return this._intensityMultiplier;
  }

  /**
   * Set max combined intensity
   * @param {number} max
   */
  setMaxIntensity(max) {
    this._maxIntensity = Math.max(0, max);
  }

  /**
   * Get max intensity
   * @returns {number}
   */
  get maxIntensity() {
    return this._maxIntensity;
  }

  /**
   * Apply offset to a camera or element
   * @param {Object} target - Object with rotation or style properties
   * @param {'rotation'|'position'|'transform'} [mode='rotation']
   */
  applyTo(target, mode = 'rotation') {
    if (!target) {
      return;
    }

    switch (mode) {
      case 'rotation':
        // For Three.js camera
        if (target.rotation) {
          target.rotation.x += this._offsetY;
          target.rotation.y += this._offsetX;
        }
        break;
      case 'position':
        // For Three.js objects
        if (target.position) {
          target.position.x += this._offsetX;
          target.position.y += this._offsetY;
        }
        break;
      case 'transform':
        // For DOM elements
        if (target.style) {
          const transformX = this._offsetX * 100; // Convert to pixels
          const transformY = this._offsetY * 100;
          target.style.transform = `translate(${transformX}px, ${transformY}px)`;
        }
        break;
    }
  }

  /**
   * Reset and clear all state
   */
  reset() {
    this.stopAll();
    this._lastTime = 0;
  }
}

// Singleton instance
let screenShakeInstance = null;

/**
 * Get the global screen shake instance
 * @returns {ScreenShake}
 */
export function getScreenShake() {
  if (!screenShakeInstance) {
    screenShakeInstance = new ScreenShake();
  }
  return screenShakeInstance;
}

/**
 * Reset the global screen shake instance
 */
export function resetScreenShake() {
  if (screenShakeInstance) {
    screenShakeInstance.reset();
    screenShakeInstance.removeAllListeners();
  }
  screenShakeInstance = null;
}

export default ScreenShake;
