/**
 * Leaderboard - Manages high scores with localStorage persistence
 * Supports multiple game modes and difficulty levels
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} name - Player name
 * @property {number} score - Final score
 * @property {number} accuracy - Accuracy percentage
 * @property {number} maxCombo - Highest combo achieved
 * @property {string} difficulty - Difficulty level
 * @property {string} gameMode - Game mode
 * @property {number} timestamp - Unix timestamp
 */

const STORAGE_KEY = '3jsaim_leaderboard';
const MAX_ENTRIES_PER_MODE = 10;

export class Leaderboard extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Storage} [options.storage] - Storage backend (defaults to localStorage)
   * @param {number} [options.maxEntriesPerMode] - Max entries per game mode
   */
  constructor(options = {}) {
    super();

    this._storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this._maxEntries = options.maxEntriesPerMode || MAX_ENTRIES_PER_MODE;
    this._entries = this._load();
  }

  /**
   * Load leaderboard from storage
   * @returns {Object.<string, LeaderboardEntry[]>}
   */
  _load() {
    if (!this._storage) {
      return {};
    }

    try {
      const data = this._storage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load leaderboard:', error);
    }

    return {};
  }

  /**
   * Save leaderboard to storage
   */
  _save() {
    if (!this._storage) {
      return;
    }

    try {
      this._storage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
    } catch (error) {
      console.warn('Failed to save leaderboard:', error);
    }
  }

  /**
   * Get the key for a specific mode/difficulty combination
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   * @returns {string}
   */
  _getKey(gameMode = 'default', difficulty = 'medium') {
    return `${gameMode}_${difficulty}`;
  }

  /**
   * Add a new score to the leaderboard
   * @param {Object} params
   * @param {string} params.name - Player name
   * @param {number} params.score - Final score
   * @param {number} [params.accuracy=0] - Accuracy percentage
   * @param {number} [params.maxCombo=0] - Highest combo
   * @param {string} [params.difficulty='medium'] - Difficulty level
   * @param {string} [params.gameMode='default'] - Game mode
   * @returns {{rank: number, isHighScore: boolean, entry: LeaderboardEntry}}
   */
  addScore({
    name,
    score,
    accuracy = 0,
    maxCombo = 0,
    difficulty = 'medium',
    gameMode = 'default',
  }) {
    const key = this._getKey(gameMode, difficulty);
    const entry = {
      name: name.substring(0, 20), // Limit name length
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      maxCombo,
      difficulty,
      gameMode,
      timestamp: Date.now(),
    };

    if (!this._entries[key]) {
      this._entries[key] = [];
    }

    const entries = this._entries[key];

    // Find insertion point (sorted by score descending)
    let rank = entries.findIndex((e) => score > e.score);
    if (rank === -1) {
      rank = entries.length;
    }

    // Insert entry
    entries.splice(rank, 0, entry);

    // Trim to max entries
    if (entries.length > this._maxEntries) {
      entries.pop();
    }

    const isHighScore = rank === 0;
    const actualRank = rank + 1;

    this._save();

    this.emit('scoreAdded', { entry, rank: actualRank, isHighScore, key });

    return {
      rank: actualRank,
      isHighScore,
      entry,
    };
  }

  /**
   * Get leaderboard entries for a specific mode
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   * @returns {LeaderboardEntry[]}
   */
  getScores(gameMode = 'default', difficulty = 'medium') {
    const key = this._getKey(gameMode, difficulty);
    return [...(this._entries[key] || [])];
  }

  /**
   * Get the high score for a mode
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   * @returns {LeaderboardEntry|null}
   */
  getHighScore(gameMode = 'default', difficulty = 'medium') {
    const scores = this.getScores(gameMode, difficulty);
    return scores[0] || null;
  }

  /**
   * Check if a score would make the leaderboard
   * @param {number} score
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   * @returns {boolean}
   */
  wouldMakeLeaderboard(score, gameMode = 'default', difficulty = 'medium') {
    const scores = this.getScores(gameMode, difficulty);
    if (scores.length < this._maxEntries) {
      return true;
    }
    return score > scores[scores.length - 1].score;
  }

  /**
   * Get the rank a score would achieve
   * @param {number} score
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   * @returns {number|null} Rank (1-indexed) or null if wouldn't make board
   */
  getPotentialRank(score, gameMode = 'default', difficulty = 'medium') {
    if (!this.wouldMakeLeaderboard(score, gameMode, difficulty)) {
      return null;
    }

    const scores = this.getScores(gameMode, difficulty);
    const rank = scores.findIndex((e) => score > e.score);
    return rank === -1 ? scores.length + 1 : rank + 1;
  }

  /**
   * Get all available game mode/difficulty combinations
   * @returns {Array<{gameMode: string, difficulty: string, count: number}>}
   */
  getAvailableModes() {
    return Object.entries(this._entries).map(([key, entries]) => {
      const [gameMode, difficulty] = key.split('_');
      return { gameMode, difficulty, count: entries.length };
    });
  }

  /**
   * Clear leaderboard for a specific mode
   * @param {string} [gameMode='default']
   * @param {string} [difficulty='medium']
   */
  clearMode(gameMode = 'default', difficulty = 'medium') {
    const key = this._getKey(gameMode, difficulty);
    delete this._entries[key];
    this._save();
    this.emit('cleared', { key, gameMode, difficulty });
  }

  /**
   * Clear entire leaderboard
   */
  clearAll() {
    this._entries = {};
    this._save();
    this.emit('clearedAll');
  }

  /**
   * Export leaderboard data as JSON
   * @returns {string}
   */
  export() {
    return JSON.stringify(this._entries, null, 2);
  }

  /**
   * Import leaderboard data from JSON
   * @param {string} jsonData
   * @returns {boolean} True if successful
   */
  import(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this._entries = data;
      this._save();
      this.emit('imported');
      return true;
    } catch (error) {
      console.warn('Failed to import leaderboard:', error);
      return false;
    }
  }

  /**
   * Get total number of entries across all modes
   * @returns {number}
   */
  getTotalEntries() {
    return Object.values(this._entries).reduce((sum, entries) => sum + entries.length, 0);
  }
}

// Singleton instance
let leaderboardInstance = null;

/**
 * Get the global leaderboard instance
 * @returns {Leaderboard}
 */
export function getLeaderboard() {
  if (!leaderboardInstance) {
    leaderboardInstance = new Leaderboard();
  }
  return leaderboardInstance;
}

/**
 * Reset the global leaderboard instance
 */
export function resetLeaderboard() {
  if (leaderboardInstance) {
    leaderboardInstance.removeAllListeners();
  }
  leaderboardInstance = null;
}

export default Leaderboard;
