/**
 * DifficultyManager - Manages game difficulty levels and their parameters
 * Supports preset difficulties and custom configurations
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} DifficultySettings
 * @property {string} name - Display name
 * @property {number} spawnInterval - Seconds between spawns
 * @property {number} initialCircles - Starting circle count
 * @property {number} maxCircles - Maximum circles at once
 * @property {number} circleLifetime - Milliseconds before auto-despawn
 * @property {number} circleSpeed - Animation speed multiplier
 * @property {number} circleMinHeight - Minimum spawn height
 * @property {number} circleMaxHeight - Maximum spawn height
 * @property {number} npcCount - Number of NPCs
 * @property {number} npcSpeed - NPC movement speed
 * @property {number} gameDuration - Game length in seconds
 * @property {number} pointsPerHit - Points for hitting a circle
 * @property {number} npcPenalty - Points lost for hitting NPC
 * @property {number} scoreMultiplier - Score multiplier
 */

export const DifficultyLevel = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXTREME: 'extreme',
  CUSTOM: 'custom',
};

/** @type {Record<string, DifficultySettings>} */
export const DifficultyPresets = {
  [DifficultyLevel.EASY]: {
    name: 'Easy',
    spawnInterval: 40,
    initialCircles: 6,
    maxCircles: 10,
    circleLifetime: 90000,
    circleSpeed: 0.5,
    circleMinHeight: 2,
    circleMaxHeight: 5,
    npcCount: 3,
    npcSpeed: 1.5,
    gameDuration: 150,
    pointsPerHit: 10,
    npcPenalty: 0,
    scoreMultiplier: 1.0,
  },

  [DifficultyLevel.MEDIUM]: {
    name: 'Medium',
    spawnInterval: 30,
    initialCircles: 8,
    maxCircles: 12,
    circleLifetime: 60000,
    circleSpeed: 1.0,
    circleMinHeight: 1,
    circleMaxHeight: 8,
    npcCount: 5,
    npcSpeed: 2.0,
    gameDuration: 120,
    pointsPerHit: 10,
    npcPenalty: 1,
    scoreMultiplier: 1.5,
  },

  [DifficultyLevel.HARD]: {
    name: 'Hard',
    spawnInterval: 20,
    initialCircles: 10,
    maxCircles: 15,
    circleLifetime: 45000,
    circleSpeed: 1.5,
    circleMinHeight: 1,
    circleMaxHeight: 10,
    npcCount: 8,
    npcSpeed: 3.0,
    gameDuration: 90,
    pointsPerHit: 15,
    npcPenalty: 3,
    scoreMultiplier: 2.0,
  },

  [DifficultyLevel.EXTREME]: {
    name: 'Extreme',
    spawnInterval: 15,
    initialCircles: 12,
    maxCircles: 20,
    circleLifetime: 30000,
    circleSpeed: 2.0,
    circleMinHeight: 0.5,
    circleMaxHeight: 12,
    npcCount: 12,
    npcSpeed: 4.0,
    gameDuration: 60,
    pointsPerHit: 20,
    npcPenalty: 5,
    scoreMultiplier: 3.0,
  },
};

export class DifficultyManager extends EventEmitter {
  constructor() {
    super();
    this._currentLevel = DifficultyLevel.MEDIUM;
    this._currentSettings = { ...DifficultyPresets[this._currentLevel] };
    this._customSettings = null;
  }

  /**
   * Get the current difficulty level
   * @returns {string}
   */
  get level() {
    return this._currentLevel;
  }

  /**
   * Get the current difficulty settings
   * @returns {DifficultySettings}
   */
  get settings() {
    return { ...this._currentSettings };
  }

  /**
   * Get display name for current difficulty
   * @returns {string}
   */
  get displayName() {
    return this._currentSettings.name;
  }

  /**
   * Set difficulty level
   * @param {string} level - Difficulty level from DifficultyLevel enum
   * @returns {boolean} True if successfully changed
   */
  setLevel(level) {
    if (level === DifficultyLevel.CUSTOM) {
      if (!this._customSettings) {
        return false;
      }
      this._currentLevel = level;
      this._currentSettings = { ...this._customSettings };
    } else if (DifficultyPresets[level]) {
      this._currentLevel = level;
      this._currentSettings = { ...DifficultyPresets[level] };
    } else {
      return false;
    }

    this.emit('difficultyChanged', {
      level: this._currentLevel,
      settings: this.settings,
    });

    return true;
  }

  /**
   * Set custom difficulty settings
   * @param {Partial<DifficultySettings>} settings - Custom settings
   */
  setCustomSettings(settings) {
    this._customSettings = {
      ...DifficultyPresets[DifficultyLevel.MEDIUM],
      ...settings,
      name: settings.name || 'Custom',
    };

    if (this._currentLevel === DifficultyLevel.CUSTOM) {
      this._currentSettings = { ...this._customSettings };
      this.emit('difficultyChanged', {
        level: DifficultyLevel.CUSTOM,
        settings: this.settings,
      });
    }
  }

  /**
   * Get all available difficulty levels
   * @returns {Array<{level: string, name: string}>}
   */
  getAvailableLevels() {
    const levels = Object.entries(DifficultyPresets).map(([level, settings]) => ({
      level,
      name: settings.name,
    }));

    if (this._customSettings) {
      levels.push({
        level: DifficultyLevel.CUSTOM,
        name: this._customSettings.name,
      });
    }

    return levels;
  }

  /**
   * Get settings for a specific level
   * @param {string} level - Difficulty level
   * @returns {DifficultySettings|null}
   */
  getSettingsForLevel(level) {
    if (level === DifficultyLevel.CUSTOM && this._customSettings) {
      return { ...this._customSettings };
    }
    if (DifficultyPresets[level]) {
      return { ...DifficultyPresets[level] };
    }
    return null;
  }

  /**
   * Calculate points for a hit based on current difficulty
   * @param {boolean} [isBonus=false] - Whether this is a bonus target
   * @returns {number}
   */
  calculateHitPoints(isBonus = false) {
    let points = this._currentSettings.pointsPerHit;
    if (isBonus) {
      points *= 2;
    }
    return Math.round(points * this._currentSettings.scoreMultiplier);
  }

  /**
   * Get NPC hit penalty for current difficulty
   * @returns {number}
   */
  getNpcPenalty() {
    return this._currentSettings.npcPenalty;
  }

  /**
   * Reset to default difficulty
   */
  reset() {
    this.setLevel(DifficultyLevel.MEDIUM);
  }

  /**
   * Create a modified settings object for dynamic difficulty adjustment
   * @param {number} performanceFactor - Player performance (0-1, where 1 is perfect)
   * @returns {DifficultySettings}
   */
  getAdaptiveSettings(performanceFactor) {
    const settings = { ...this._currentSettings };

    // Adjust based on performance (higher performance = harder game)
    const factor = Math.max(0, Math.min(1, performanceFactor));

    // Scale spawn interval (lower = harder)
    settings.spawnInterval = Math.max(
      10,
      settings.spawnInterval * (1 - factor * 0.3)
    );

    // Scale circle lifetime (lower = harder)
    settings.circleLifetime = Math.max(
      20000,
      settings.circleLifetime * (1 - factor * 0.2)
    );

    // Scale circle speed (higher = harder)
    settings.circleSpeed = settings.circleSpeed * (1 + factor * 0.3);

    return settings;
  }
}

// Singleton instance
let difficultyManagerInstance = null;

/**
 * Get the global difficulty manager instance
 * @returns {DifficultyManager}
 */
export function getDifficultyManager() {
  if (!difficultyManagerInstance) {
    difficultyManagerInstance = new DifficultyManager();
  }
  return difficultyManagerInstance;
}

/**
 * Reset the global difficulty manager
 */
export function resetDifficultyManager() {
  if (difficultyManagerInstance) {
    difficultyManagerInstance.removeAllListeners();
  }
  difficultyManagerInstance = null;
}

export default DifficultyManager;
