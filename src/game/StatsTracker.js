/**
 * StatsTracker - Tracks gameplay statistics for analysis and achievements
 * Persists statistics across sessions
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} GameStats
 * @property {number} totalHits - Total targets hit
 * @property {number} totalMisses - Total missed shots
 * @property {number} totalShots - Total shots fired
 * @property {number} totalScore - Cumulative score
 * @property {number} highScore - Best single-game score
 * @property {number} bestAccuracy - Best accuracy percentage
 * @property {number} bestCombo - Highest combo achieved
 * @property {number} totalPlayTime - Total play time in seconds
 * @property {number} gamesPlayed - Number of games completed
 * @property {number} circlesDestroyed - Total circles destroyed
 * @property {number} npcsHit - Total NPCs accidentally hit
 * @property {number[]} reactionTimes - Recent reaction times in ms
 * @property {Object} difficultyStats - Stats per difficulty level
 */

const STORAGE_KEY = '3jsaim_stats';
const MAX_REACTION_TIMES = 100;

export class StatsTracker extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Storage} [options.storage] - Storage backend
   */
  constructor(options = {}) {
    super();

    this._storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this._stats = this._load();
    this._sessionStats = this._createEmptyStats();
    this._lastShotTime = 0;
  }

  /**
   * Create empty stats object
   * @returns {GameStats}
   */
  _createEmptyStats() {
    return {
      totalHits: 0,
      totalMisses: 0,
      totalShots: 0,
      totalScore: 0,
      highScore: 0,
      bestAccuracy: 0,
      bestCombo: 0,
      totalPlayTime: 0,
      gamesPlayed: 0,
      circlesDestroyed: 0,
      npcsHit: 0,
      reactionTimes: [],
      difficultyStats: {},
    };
  }

  /**
   * Load stats from storage
   * @returns {GameStats}
   */
  _load() {
    if (!this._storage) {
      return this._createEmptyStats();
    }

    try {
      const data = this._storage.getItem(STORAGE_KEY);
      if (data) {
        return { ...this._createEmptyStats(), ...JSON.parse(data) };
      }
    } catch (error) {
      console.warn('Failed to load stats:', error);
    }

    return this._createEmptyStats();
  }

  /**
   * Save stats to storage
   */
  _save() {
    if (!this._storage) {
      return;
    }

    try {
      this._storage.setItem(STORAGE_KEY, JSON.stringify(this._stats));
    } catch (error) {
      console.warn('Failed to save stats:', error);
    }
  }

  /**
   * Record a shot being fired
   */
  recordShot() {
    this._stats.totalShots++;
    this._sessionStats.totalShots++;
    this._lastShotTime = Date.now();
    this.emit('shot');
  }

  /**
   * Record a successful hit
   * @param {Object} [data]
   * @param {string} [data.targetType='circle'] - Type of target hit
   * @param {number} [data.points=0] - Points earned
   * @param {number} [data.combo=0] - Current combo
   */
  recordHit({ targetType = 'circle', points = 0, combo = 0 } = {}) {
    const now = Date.now();
    const reactionTime = this._lastShotTime > 0 ? now - this._lastShotTime : 0;

    this._stats.totalHits++;
    this._sessionStats.totalHits++;

    if (targetType === 'circle') {
      this._stats.circlesDestroyed++;
      this._sessionStats.circlesDestroyed++;
    } else if (targetType === 'npc') {
      this._stats.npcsHit++;
      this._sessionStats.npcsHit++;
    }

    this._stats.totalScore += points;
    this._sessionStats.totalScore += points;

    // Track reaction times
    if (reactionTime > 0 && reactionTime < 10000) {
      this._stats.reactionTimes.push(reactionTime);
      this._sessionStats.reactionTimes.push(reactionTime);

      // Keep array size bounded
      if (this._stats.reactionTimes.length > MAX_REACTION_TIMES) {
        this._stats.reactionTimes.shift();
      }
    }

    // Update best combo
    if (combo > this._stats.bestCombo) {
      this._stats.bestCombo = combo;
    }
    if (combo > this._sessionStats.bestCombo) {
      this._sessionStats.bestCombo = combo;
    }

    this.emit('hit', { targetType, points, combo, reactionTime });
  }

  /**
   * Record a missed shot
   */
  recordMiss() {
    this._stats.totalMisses++;
    this._sessionStats.totalMisses++;
    this.emit('miss');
  }

  /**
   * Record game completion
   * @param {Object} params
   * @param {number} params.score - Final score
   * @param {number} params.playTime - Play time in seconds
   * @param {string} [params.difficulty='medium'] - Difficulty level
   * @param {string} [params.gameMode='default'] - Game mode
   */
  recordGameComplete({ score, playTime, difficulty = 'medium', gameMode = 'default' }) {
    this._stats.gamesPlayed++;
    this._stats.totalPlayTime += playTime;

    // Update high score
    if (score > this._stats.highScore) {
      this._stats.highScore = score;
      this.emit('newHighScore', { score });
    }

    // Calculate and update best accuracy
    const accuracy = this.getAccuracy();
    if (accuracy > this._stats.bestAccuracy) {
      this._stats.bestAccuracy = accuracy;
    }

    // Track per-difficulty stats
    if (!this._stats.difficultyStats[difficulty]) {
      this._stats.difficultyStats[difficulty] = {
        gamesPlayed: 0,
        highScore: 0,
        bestAccuracy: 0,
        totalPlayTime: 0,
      };
    }

    const diffStats = this._stats.difficultyStats[difficulty];
    diffStats.gamesPlayed++;
    diffStats.totalPlayTime += playTime;
    if (score > diffStats.highScore) {
      diffStats.highScore = score;
    }
    if (accuracy > diffStats.bestAccuracy) {
      diffStats.bestAccuracy = accuracy;
    }

    this._save();
    this.emit('gameComplete', { score, playTime, difficulty, gameMode });
  }

  /**
   * Start a new session (resets session stats)
   */
  startSession() {
    this._sessionStats = this._createEmptyStats();
    this._lastShotTime = 0;
    this.emit('sessionStart');
  }

  /**
   * Get current accuracy percentage
   * @param {boolean} [sessionOnly=false] - Only count session stats
   * @returns {number}
   */
  getAccuracy(sessionOnly = false) {
    const stats = sessionOnly ? this._sessionStats : this._stats;
    const total = stats.totalHits + stats.totalMisses;
    if (total === 0) {
      return 0;
    }
    return (stats.totalHits / total) * 100;
  }

  /**
   * Get average reaction time
   * @param {boolean} [sessionOnly=false]
   * @returns {number} Average in ms, or 0 if no data
   */
  getAverageReactionTime(sessionOnly = false) {
    const times = sessionOnly ? this._sessionStats.reactionTimes : this._stats.reactionTimes;
    if (times.length === 0) {
      return 0;
    }
    return times.reduce((sum, t) => sum + t, 0) / times.length;
  }

  /**
   * Get best (lowest) reaction time
   * @param {boolean} [sessionOnly=false]
   * @returns {number}
   */
  getBestReactionTime(sessionOnly = false) {
    const times = sessionOnly ? this._sessionStats.reactionTimes : this._stats.reactionTimes;
    if (times.length === 0) {
      return 0;
    }
    return Math.min(...times);
  }

  /**
   * Get all stats
   * @returns {GameStats}
   */
  getAllStats() {
    return { ...this._stats };
  }

  /**
   * Get session stats
   * @returns {GameStats}
   */
  getSessionStats() {
    return { ...this._sessionStats };
  }

  /**
   * Get stats for a specific difficulty
   * @param {string} difficulty
   * @returns {Object|null}
   */
  getDifficultyStats(difficulty) {
    return this._stats.difficultyStats[difficulty] || null;
  }

  /**
   * Get a summary of key statistics
   * @returns {Object}
   */
  getSummary() {
    return {
      gamesPlayed: this._stats.gamesPlayed,
      totalPlayTime: this._stats.totalPlayTime,
      highScore: this._stats.highScore,
      bestAccuracy: this._stats.bestAccuracy,
      bestCombo: this._stats.bestCombo,
      averageReactionTime: this.getAverageReactionTime(),
      totalCirclesDestroyed: this._stats.circlesDestroyed,
      overallAccuracy: this.getAccuracy(),
    };
  }

  /**
   * Get session summary
   * @returns {Object}
   */
  getSessionSummary() {
    return {
      shots: this._sessionStats.totalShots,
      hits: this._sessionStats.totalHits,
      misses: this._sessionStats.totalMisses,
      accuracy: this.getAccuracy(true),
      score: this._sessionStats.totalScore,
      bestCombo: this._sessionStats.bestCombo,
      averageReactionTime: this.getAverageReactionTime(true),
    };
  }

  /**
   * Reset all statistics
   */
  resetAll() {
    this._stats = this._createEmptyStats();
    this._sessionStats = this._createEmptyStats();
    this._save();
    this.emit('reset');
  }

  /**
   * Reset session stats only
   */
  resetSession() {
    this._sessionStats = this._createEmptyStats();
  }

  /**
   * Export stats as JSON
   * @returns {string}
   */
  export() {
    return JSON.stringify(this._stats, null, 2);
  }

  /**
   * Import stats from JSON
   * @param {string} jsonData
   * @returns {boolean}
   */
  import(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this._stats = { ...this._createEmptyStats(), ...data };
      this._save();
      this.emit('imported');
      return true;
    } catch (error) {
      console.warn('Failed to import stats:', error);
      return false;
    }
  }

  /**
   * Calculate hits per minute
   * @returns {number}
   */
  getHitsPerMinute() {
    if (this._stats.totalPlayTime === 0) {
      return 0;
    }
    return (this._stats.totalHits / this._stats.totalPlayTime) * 60;
  }

  /**
   * Get average score per game
   * @returns {number}
   */
  getAverageScore() {
    if (this._stats.gamesPlayed === 0) {
      return 0;
    }
    return this._stats.totalScore / this._stats.gamesPlayed;
  }
}

// Singleton instance
let statsTrackerInstance = null;

/**
 * Get the global stats tracker instance
 * @returns {StatsTracker}
 */
export function getStatsTracker() {
  if (!statsTrackerInstance) {
    statsTrackerInstance = new StatsTracker();
  }
  return statsTrackerInstance;
}

/**
 * Reset the global stats tracker instance
 */
export function resetStatsTracker() {
  if (statsTrackerInstance) {
    statsTrackerInstance.removeAllListeners();
  }
  statsTrackerInstance = null;
}

export default StatsTracker;
