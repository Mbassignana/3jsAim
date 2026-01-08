/**
 * ComboSystem - Tracks consecutive hits and applies score multipliers
 * Rewards accurate, fast gameplay with increasing combo bonuses
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} ComboConfig
 * @property {number} maxCombo - Maximum combo count
 * @property {number} comboTimeout - Milliseconds before combo resets
 * @property {number[]} multiplierTiers - Combo thresholds for multiplier increases
 * @property {number[]} multiplierValues - Multiplier values for each tier
 */

/** @type {ComboConfig} */
export const DEFAULT_COMBO_CONFIG = {
  maxCombo: 100,
  comboTimeout: 3000, // 3 seconds to maintain combo
  multiplierTiers: [0, 5, 10, 20, 50], // Combo counts for tier changes
  multiplierValues: [1.0, 1.5, 2.0, 3.0, 5.0], // Multipliers for each tier
};

export class ComboSystem extends EventEmitter {
  /**
   * @param {Partial<ComboConfig>} [config] - Custom configuration
   */
  constructor(config = {}) {
    super();

    this._config = { ...DEFAULT_COMBO_CONFIG, ...config };
    this._combo = 0;
    this._maxComboReached = 0;
    this._lastHitTime = 0;
    this._timeoutId = null;
    this._totalHits = 0;
    this._totalMisses = 0;
  }

  /**
   * Get current combo count
   * @returns {number}
   */
  get combo() {
    return this._combo;
  }

  /**
   * Get the highest combo reached this session
   * @returns {number}
   */
  get maxComboReached() {
    return this._maxComboReached;
  }

  /**
   * Get current multiplier based on combo
   * @returns {number}
   */
  get multiplier() {
    return this._getMultiplierForCombo(this._combo);
  }

  /**
   * Get current multiplier tier (0-indexed)
   * @returns {number}
   */
  get tier() {
    return this._getTierForCombo(this._combo);
  }

  /**
   * Get total hits count
   * @returns {number}
   */
  get totalHits() {
    return this._totalHits;
  }

  /**
   * Get total misses count
   * @returns {number}
   */
  get totalMisses() {
    return this._totalMisses;
  }

  /**
   * Get accuracy percentage
   * @returns {number}
   */
  get accuracy() {
    const total = this._totalHits + this._totalMisses;
    if (total === 0) {
      return 0;
    }
    return (this._totalHits / total) * 100;
  }

  /**
   * Get time remaining before combo expires
   * @returns {number} Milliseconds remaining, or 0 if no combo
   */
  get timeRemaining() {
    if (this._combo === 0) {
      return 0;
    }
    const elapsed = Date.now() - this._lastHitTime;
    return Math.max(0, this._config.comboTimeout - elapsed);
  }

  /**
   * Get the combo progress (0-1) towards timeout
   * @returns {number}
   */
  get timeProgress() {
    if (this._combo === 0) {
      return 0;
    }
    return this.timeRemaining / this._config.comboTimeout;
  }

  /**
   * Register a hit - increments combo
   * @param {Object} [hitData] - Optional data about the hit
   * @returns {{points: number, multiplier: number, combo: number, tierUp: boolean}}
   */
  registerHit(_hitData = {}) {
    this._clearTimeout();
    this._totalHits++;

    const previousTier = this.tier;
    this._combo = Math.min(this._combo + 1, this._config.maxCombo);
    this._lastHitTime = Date.now();

    // Update max combo
    if (this._combo > this._maxComboReached) {
      this._maxComboReached = this._combo;
    }

    const currentTier = this.tier;
    const tierUp = currentTier > previousTier;

    // Start combo timeout
    this._startTimeout();

    const result = {
      combo: this._combo,
      multiplier: this.multiplier,
      tierUp,
      tier: currentTier,
    };

    // Emit events
    this.emit(GameEvents.COMBO_INCREASE, result);
    getEventBus().emit(GameEvents.COMBO_INCREASE, result);

    if (tierUp) {
      this.emit('tierUp', { tier: currentTier, multiplier: this.multiplier });
    }

    return result;
  }

  /**
   * Register a miss - resets combo
   * @param {Object} [missData] - Optional data about the miss
   * @returns {{lostCombo: number, hadCombo: boolean}}
   */
  registerMiss(_missData = {}) {
    this._clearTimeout();
    this._totalMisses++;

    const lostCombo = this._combo;
    const hadCombo = this._combo > 0;

    if (hadCombo) {
      this._resetCombo('miss');
    }

    return { lostCombo, hadCombo };
  }

  /**
   * Apply combo multiplier to a score
   * @param {number} baseScore - Base score before multiplier
   * @returns {number} Score with multiplier applied
   */
  applyMultiplier(baseScore) {
    return Math.round(baseScore * this.multiplier);
  }

  /**
   * Reset combo and statistics
   */
  reset() {
    this._clearTimeout();
    this._combo = 0;
    this._maxComboReached = 0;
    this._lastHitTime = 0;
    this._totalHits = 0;
    this._totalMisses = 0;
  }

  /**
   * Reset only the combo (not statistics)
   */
  resetCombo() {
    this._resetCombo('manual');
  }

  /**
   * Get statistics summary
   * @returns {{combo: number, maxCombo: number, hits: number, misses: number, accuracy: number, multiplier: number}}
   */
  getStats() {
    return {
      combo: this._combo,
      maxCombo: this._maxComboReached,
      hits: this._totalHits,
      misses: this._totalMisses,
      accuracy: this.accuracy,
      multiplier: this.multiplier,
    };
  }

  /**
   * Get the multiplier for a specific combo count
   * @param {number} combo - Combo count
   * @returns {number}
   */
  _getMultiplierForCombo(combo) {
    const tier = this._getTierForCombo(combo);
    return this._config.multiplierValues[tier] || 1.0;
  }

  /**
   * Get the tier for a specific combo count
   * @param {number} combo - Combo count
   * @returns {number}
   */
  _getTierForCombo(combo) {
    let tier = 0;
    for (let i = 0; i < this._config.multiplierTiers.length; i++) {
      if (combo >= this._config.multiplierTiers[i]) {
        tier = i;
      }
    }
    return tier;
  }

  /**
   * Start the combo timeout
   */
  _startTimeout() {
    this._timeoutId = setTimeout(() => {
      this._resetCombo('timeout');
    }, this._config.comboTimeout);
  }

  /**
   * Clear the combo timeout
   */
  _clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /**
   * Internal combo reset with reason
   * @param {string} reason - Reset reason ('miss', 'timeout', 'manual')
   */
  _resetCombo(reason) {
    const previousCombo = this._combo;
    this._combo = 0;
    this._clearTimeout();

    if (previousCombo > 0) {
      this.emit(GameEvents.COMBO_RESET, {
        previousCombo,
        reason,
      });
      getEventBus().emit(GameEvents.COMBO_RESET, {
        previousCombo,
        reason,
      });
    }
  }

  /**
   * Get info about next tier
   * @returns {{nextTier: number, comboNeeded: number, nextMultiplier: number}|null}
   */
  getNextTierInfo() {
    const currentTier = this.tier;
    if (currentTier >= this._config.multiplierTiers.length - 1) {
      return null; // Already at max tier
    }

    const nextTier = currentTier + 1;
    return {
      nextTier,
      comboNeeded: this._config.multiplierTiers[nextTier] - this._combo,
      nextMultiplier: this._config.multiplierValues[nextTier],
    };
  }
}

// Singleton instance
let comboSystemInstance = null;

/**
 * Get the global combo system instance
 * @returns {ComboSystem}
 */
export function getComboSystem() {
  if (!comboSystemInstance) {
    comboSystemInstance = new ComboSystem();
  }
  return comboSystemInstance;
}

/**
 * Reset the global combo system
 */
export function resetComboSystem() {
  if (comboSystemInstance) {
    comboSystemInstance.removeAllListeners();
  }
  comboSystemInstance = null;
}

export default ComboSystem;
