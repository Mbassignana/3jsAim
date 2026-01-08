/**
 * AchievementSystem - Tracks and unlocks achievements
 * Provides progress tracking, unlock conditions, and rewards
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} Achievement
 * @property {string} id - Unique achievement identifier
 * @property {string} name - Display name
 * @property {string} description - Achievement description
 * @property {string} icon - Achievement icon/emoji
 * @property {string} category - Achievement category
 * @property {string} rarity - common, uncommon, rare, epic, legendary
 * @property {Object} condition - Unlock condition
 * @property {string} condition.type - Condition type
 * @property {number} [condition.target] - Target value to reach
 * @property {Object} [condition.params] - Additional parameters
 * @property {boolean} [hidden] - Hidden until unlocked
 * @property {Object} [reward] - Reward for unlocking
 */

/**
 * @typedef {Object} AchievementProgress
 * @property {string} achievementId - Achievement ID
 * @property {number} current - Current progress value
 * @property {number} target - Target value to unlock
 * @property {boolean} unlocked - Whether achievement is unlocked
 * @property {number|null} unlockedAt - Unlock timestamp
 */

// ==========================================================================
// Achievement Categories
// ==========================================================================

export const AchievementCategories = {
  ACCURACY: 'accuracy',
  SPEED: 'speed',
  STREAKS: 'streaks',
  PROGRESSION: 'progression',
  MASTERY: 'mastery',
  SPECIAL: 'special',
};

export const AchievementRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

// ==========================================================================
// Condition Types
// ==========================================================================

export const ConditionTypes = {
  TOTAL_HITS: 'total_hits', // Cumulative hits across all games
  TOTAL_SCORE: 'total_score', // Cumulative score
  GAMES_PLAYED: 'games_played', // Number of games completed
  ACCURACY_SINGLE: 'accuracy_single', // Accuracy in a single game
  ACCURACY_LIFETIME: 'accuracy_lifetime', // Lifetime accuracy
  COMBO_MAX: 'combo_max', // Maximum combo achieved
  HITS_SINGLE: 'hits_single', // Hits in a single game
  SCORE_SINGLE: 'score_single', // Score in a single game
  STREAK_HITS: 'streak_hits', // Hit X targets without missing
  TIME_PLAYED: 'time_played', // Total time played (minutes)
  HEADSHOTS: 'headshots', // Precision hits
  WEAPON_KILLS: 'weapon_kills', // Kills with specific weapon
  MODE_WINS: 'mode_wins', // Wins in specific game mode
  PERFECT_GAME: 'perfect_game', // 100% accuracy game
  SPEED_KILL: 'speed_kill', // Kill target within X ms of spawn
  TUTORIAL_COMPLETE: 'tutorial_complete', // Complete tutorial
  FIRST_GAME: 'first_game', // Play first game
  MULTI_KILL: 'multi_kill', // Kill X targets in Y seconds
  NO_MISS: 'no_miss', // Win without missing
  CUSTOM: 'custom', // Custom validation function
};

// ==========================================================================
// Achievement Definitions
// ==========================================================================

export const Achievements = {
  // Progression
  FIRST_BLOOD: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Hit your first target',
    icon: '🎯',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.COMMON,
    condition: { type: ConditionTypes.TOTAL_HITS, target: 1 },
  },

  GETTING_STARTED: {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete your first game',
    icon: '🏁',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.COMMON,
    condition: { type: ConditionTypes.GAMES_PLAYED, target: 1 },
  },

  DEDICATED: {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Play 10 games',
    icon: '💪',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.GAMES_PLAYED, target: 10 },
  },

  VETERAN: {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play 50 games',
    icon: '🎖️',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.GAMES_PLAYED, target: 50 },
  },

  CENTURION: {
    id: 'centurion',
    name: 'Centurion',
    description: 'Hit 100 targets total',
    icon: '💯',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.COMMON,
    condition: { type: ConditionTypes.TOTAL_HITS, target: 100 },
  },

  THOUSAND_KILLS: {
    id: 'thousand_kills',
    name: 'Thousand Kills',
    description: 'Hit 1000 targets total',
    icon: '🔥',
    category: AchievementCategories.PROGRESSION,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.TOTAL_HITS, target: 1000 },
  },

  // Accuracy
  SHARP_EYE: {
    id: 'sharp_eye',
    name: 'Sharp Eye',
    description: 'Achieve 80% accuracy in a game',
    icon: '👁️',
    category: AchievementCategories.ACCURACY,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.ACCURACY_SINGLE, target: 80 },
  },

  MARKSMAN: {
    id: 'marksman',
    name: 'Marksman',
    description: 'Achieve 90% accuracy in a game',
    icon: '🎯',
    category: AchievementCategories.ACCURACY,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.ACCURACY_SINGLE, target: 90 },
  },

  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% accuracy in a game (min 10 hits)',
    icon: '✨',
    category: AchievementCategories.ACCURACY,
    rarity: AchievementRarity.EPIC,
    condition: { type: ConditionTypes.PERFECT_GAME, target: 10 },
  },

  // Streaks
  HOT_STREAK: {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: 'Hit 5 targets in a row',
    icon: '🔥',
    category: AchievementCategories.STREAKS,
    rarity: AchievementRarity.COMMON,
    condition: { type: ConditionTypes.STREAK_HITS, target: 5 },
  },

  ON_FIRE: {
    id: 'on_fire',
    name: 'On Fire',
    description: 'Hit 10 targets in a row',
    icon: '🌟',
    category: AchievementCategories.STREAKS,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.STREAK_HITS, target: 10 },
  },

  UNSTOPPABLE: {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Hit 25 targets in a row',
    icon: '⚡',
    category: AchievementCategories.STREAKS,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.STREAK_HITS, target: 25 },
  },

  COMBO_MASTER: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Achieve a 10x combo multiplier',
    icon: '🏆',
    category: AchievementCategories.STREAKS,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.COMBO_MAX, target: 10 },
  },

  // Speed
  QUICK_DRAW: {
    id: 'quick_draw',
    name: 'Quick Draw',
    description: 'Hit a target within 0.5 seconds of it spawning',
    icon: '⚡',
    category: AchievementCategories.SPEED,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.SPEED_KILL, target: 500 },
  },

  LIGHTNING_REFLEXES: {
    id: 'lightning_reflexes',
    name: 'Lightning Reflexes',
    description: 'Hit a target within 0.25 seconds of it spawning',
    icon: '💨',
    category: AchievementCategories.SPEED,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.SPEED_KILL, target: 250 },
  },

  MULTI_KILL: {
    id: 'multi_kill',
    name: 'Multi-Kill',
    description: 'Hit 3 targets within 2 seconds',
    icon: '💥',
    category: AchievementCategories.SPEED,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.MULTI_KILL, target: 3, params: { timeWindow: 2000 } },
  },

  // Mastery
  SCORE_MASTER: {
    id: 'score_master',
    name: 'Score Master',
    description: 'Score 500 points in a single game',
    icon: '🏅',
    category: AchievementCategories.MASTERY,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.SCORE_SINGLE, target: 500 },
  },

  HIGH_SCORER: {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Score 1000 points in a single game',
    icon: '🥇',
    category: AchievementCategories.MASTERY,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.SCORE_SINGLE, target: 1000 },
  },

  LEGENDARY_SCORE: {
    id: 'legendary_score',
    name: 'Legendary Score',
    description: 'Score 2000 points in a single game',
    icon: '👑',
    category: AchievementCategories.MASTERY,
    rarity: AchievementRarity.LEGENDARY,
    condition: { type: ConditionTypes.SCORE_SINGLE, target: 2000 },
  },

  // Special
  STUDENT: {
    id: 'student',
    name: 'Student',
    description: 'Complete the basic tutorial',
    icon: '📚',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.COMMON,
    condition: {
      type: ConditionTypes.TUTORIAL_COMPLETE,
      target: 1,
      params: { tutorial: 'basics' },
    },
  },

  GRADUATE: {
    id: 'graduate',
    name: 'Graduate',
    description: 'Complete the advanced tutorial',
    icon: '🎓',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.UNCOMMON,
    condition: {
      type: ConditionTypes.TUTORIAL_COMPLETE,
      target: 1,
      params: { tutorial: 'advanced' },
    },
  },

  PRECISION_MASTER: {
    id: 'precision_master',
    name: 'Precision Master',
    description: 'Win a Precision mode game',
    icon: '🎯',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.MODE_WINS, target: 1, params: { mode: 'precision' } },
    hidden: true,
  },

  SURVIVOR: {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive for 5 minutes in Survival mode',
    icon: '❤️',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.TIME_PLAYED, target: 5, params: { mode: 'survival' } },
    hidden: true,
  },

  SHOTGUN_SPREE: {
    id: 'shotgun_spree',
    name: 'Shotgun Spree',
    description: 'Hit 50 targets with the shotgun',
    icon: '🔫',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.UNCOMMON,
    condition: { type: ConditionTypes.WEAPON_KILLS, target: 50, params: { weapon: 'shotgun' } },
  },

  SNIPER_ELITE: {
    id: 'sniper_elite',
    name: 'Sniper Elite',
    description: 'Hit 25 targets with the sniper rifle',
    icon: '🔭',
    category: AchievementCategories.SPECIAL,
    rarity: AchievementRarity.RARE,
    condition: { type: ConditionTypes.WEAPON_KILLS, target: 25, params: { weapon: 'sniper' } },
  },
};

// ==========================================================================
// Unlockable Rewards
// ==========================================================================

export const UnlockableRewards = {
  WEAPON_GOLDEN_PISTOL: {
    id: 'weapon_golden_pistol',
    type: 'weapon_skin',
    name: 'Golden Pistol',
    description: 'A shiny golden pistol skin',
    unlockedBy: 'centurion',
  },

  CROSSHAIR_DIAMOND: {
    id: 'crosshair_diamond',
    type: 'crosshair',
    name: 'Diamond Crosshair',
    description: 'A diamond-shaped crosshair',
    unlockedBy: 'marksman',
  },

  TRAIL_FIRE: {
    id: 'trail_fire',
    type: 'bullet_trail',
    name: 'Fire Trail',
    description: 'Leave a fiery trail on your shots',
    unlockedBy: 'on_fire',
  },

  MODE_ENDURANCE: {
    id: 'mode_endurance',
    type: 'game_mode',
    name: 'Endurance Mode',
    description: 'Unlock Endurance game mode',
    unlockedBy: 'veteran',
  },

  TITLE_LEGENDARY: {
    id: 'title_legendary',
    type: 'title',
    name: 'The Legendary',
    description: 'A prestigious player title',
    unlockedBy: 'legendary_score',
  },
};

// ==========================================================================
// AchievementSystem Class
// ==========================================================================

export class AchievementSystem extends EventEmitter {
  constructor() {
    super();

    /** @type {Map<string, AchievementProgress>} */
    this._progress = new Map();

    /** @type {Object} */
    this._lifetimeStats = this._loadLifetimeStats();

    /** @type {Object} */
    this._sessionStats = this._createEmptySessionStats();

    /** @type {Array<{achievementId: string, timestamp: number}>} */
    this._recentUnlocks = [];

    /** @type {Set<string>} */
    this._unlockedRewards = new Set();

    this._loadProgress();
    this._setupEventListeners();
  }

  /**
   * Get all achievements
   * @returns {Achievement[]}
   */
  getAllAchievements() {
    return Object.values(Achievements);
  }

  /**
   * Get achievements by category
   * @param {string} category
   * @returns {Achievement[]}
   */
  getAchievementsByCategory(category) {
    return Object.values(Achievements).filter((a) => a.category === category);
  }

  /**
   * Get achievement progress
   * @param {string} achievementId
   * @returns {AchievementProgress|null}
   */
  getProgress(achievementId) {
    return this._progress.get(achievementId) || null;
  }

  /**
   * Get all progress
   * @returns {AchievementProgress[]}
   */
  getAllProgress() {
    return Array.from(this._progress.values());
  }

  /**
   * Check if achievement is unlocked
   * @param {string} achievementId
   * @returns {boolean}
   */
  isUnlocked(achievementId) {
    const progress = this._progress.get(achievementId);
    return progress?.unlocked ?? false;
  }

  /**
   * Get unlocked achievements
   * @returns {Achievement[]}
   */
  getUnlockedAchievements() {
    return Object.values(Achievements).filter((a) => this.isUnlocked(a.id));
  }

  /**
   * Get locked achievements (non-hidden)
   * @returns {Achievement[]}
   */
  getLockedAchievements() {
    return Object.values(Achievements).filter((a) => !this.isUnlocked(a.id) && !a.hidden);
  }

  /**
   * Get unlock percentage
   * @returns {number}
   */
  getUnlockPercentage() {
    const total = Object.keys(Achievements).length;
    const unlocked = this.getUnlockedAchievements().length;
    return (unlocked / total) * 100;
  }

  /**
   * Get recent unlocks
   * @param {number} [limit=5]
   * @returns {Array<{achievement: Achievement, timestamp: number}>}
   */
  getRecentUnlocks(limit = 5) {
    return this._recentUnlocks.slice(0, limit).map((r) => ({
      achievement: Achievements[r.achievementId.toUpperCase()],
      timestamp: r.timestamp,
    }));
  }

  /**
   * Get unlocked rewards
   * @returns {Object[]}
   */
  getUnlockedRewards() {
    return Object.values(UnlockableRewards).filter((r) => this._unlockedRewards.has(r.id));
  }

  /**
   * Check if a reward is unlocked
   * @param {string} rewardId
   * @returns {boolean}
   */
  isRewardUnlocked(rewardId) {
    return this._unlockedRewards.has(rewardId);
  }

  /**
   * Track a game event for achievement progress
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  trackEvent(eventType, data = {}) {
    // Update session stats
    this._updateSessionStats(eventType, data);

    // Check each achievement condition
    for (const achievement of Object.values(Achievements)) {
      if (this.isUnlocked(achievement.id)) continue;

      const progress = this._checkCondition(achievement, eventType, data);
      if (progress !== null) {
        this._updateProgress(achievement.id, progress);
      }
    }
  }

  /**
   * Called when a game ends - finalizes session stats
   * @param {Object} gameStats - Final game statistics
   */
  onGameEnd(gameStats) {
    // Update lifetime stats
    this._lifetimeStats.gamesPlayed++;
    this._lifetimeStats.totalHits += gameStats.hits || 0;
    this._lifetimeStats.totalMisses += gameStats.misses || 0;
    this._lifetimeStats.totalScore += gameStats.score || 0;
    this._lifetimeStats.totalTimePlayed += gameStats.duration || 0;

    if (gameStats.score > this._lifetimeStats.highScore) {
      this._lifetimeStats.highScore = gameStats.score;
    }

    if (gameStats.maxCombo > this._lifetimeStats.maxCombo) {
      this._lifetimeStats.maxCombo = gameStats.maxCombo;
    }

    if (gameStats.maxStreak > this._lifetimeStats.maxStreak) {
      this._lifetimeStats.maxStreak = gameStats.maxStreak;
    }

    this._saveLifetimeStats();

    // Track game completion for achievements
    this.trackEvent('game_complete', {
      ...gameStats,
      lifetimeStats: this._lifetimeStats,
    });

    // Reset session stats
    this._sessionStats = this._createEmptySessionStats();
  }

  /**
   * Reset all achievement progress
   */
  resetProgress() {
    this._progress.clear();
    this._lifetimeStats = this._createEmptyLifetimeStats();
    this._sessionStats = this._createEmptySessionStats();
    this._recentUnlocks = [];
    this._unlockedRewards.clear();

    this._saveProgress();
    this._saveLifetimeStats();

    this.emit('progress:reset');
  }

  /**
   * Get lifetime stats
   * @returns {Object}
   */
  getLifetimeStats() {
    return { ...this._lifetimeStats };
  }

  /**
   * Update achievement progress
   * @param {string} achievementId
   * @param {number} value
   * @private
   */
  _updateProgress(achievementId, value) {
    const achievement =
      Achievements[achievementId.toUpperCase()] ||
      Object.values(Achievements).find((a) => a.id === achievementId);

    if (!achievement) return;

    let progress = this._progress.get(achievementId);
    if (!progress) {
      progress = {
        achievementId,
        current: 0,
        target: achievement.condition.target,
        unlocked: false,
        unlockedAt: null,
      };
      this._progress.set(achievementId, progress);
    }

    const oldValue = progress.current;
    progress.current = Math.max(progress.current, value);

    // Check for unlock
    if (!progress.unlocked && progress.current >= progress.target) {
      progress.unlocked = true;
      progress.unlockedAt = Date.now();

      this._recentUnlocks.unshift({
        achievementId,
        timestamp: progress.unlockedAt,
      });

      // Check for reward unlock
      const reward = Object.values(UnlockableRewards).find((r) => r.unlockedBy === achievementId);
      if (reward && !this._unlockedRewards.has(reward.id)) {
        this._unlockedRewards.add(reward.id);
        this.emit('reward:unlocked', { reward, achievement });
      }

      this.emit('achievement:unlocked', { achievement, progress });
      getEventBus().emit(GameEvents.ACHIEVEMENT_UNLOCKED, { achievement });

      this._saveProgress();
    } else if (progress.current > oldValue) {
      this.emit('achievement:progress', { achievement, progress });
      this._saveProgress();
    }
  }

  /**
   * Check if an achievement condition is met
   * @param {Achievement} achievement
   * @param {string} eventType
   * @param {Object} data
   * @returns {number|null} - Progress value or null if not applicable
   * @private
   */
  _checkCondition(achievement, eventType, data) {
    const condition = achievement.condition;
    const params = condition.params || {};

    switch (condition.type) {
      case ConditionTypes.TOTAL_HITS:
        if (eventType === 'hit' || eventType === 'game_complete') {
          return this._lifetimeStats.totalHits + (this._sessionStats.hits || 0);
        }
        break;

      case ConditionTypes.TOTAL_SCORE:
        if (eventType === 'game_complete') {
          return data.lifetimeStats?.totalScore || 0;
        }
        break;

      case ConditionTypes.GAMES_PLAYED:
        if (eventType === 'game_complete') {
          return data.lifetimeStats?.gamesPlayed || 0;
        }
        break;

      case ConditionTypes.ACCURACY_SINGLE:
        if (eventType === 'game_complete' && data.hits > 0) {
          const accuracy = (data.hits / (data.hits + data.misses)) * 100;
          return accuracy;
        }
        break;

      case ConditionTypes.COMBO_MAX:
        if (eventType === 'combo' || eventType === 'game_complete') {
          return data.combo || data.maxCombo || 0;
        }
        break;

      case ConditionTypes.SCORE_SINGLE:
        if (eventType === 'game_complete') {
          return data.score || 0;
        }
        break;

      case ConditionTypes.STREAK_HITS:
        if (eventType === 'hit' || eventType === 'game_complete') {
          return Math.max(this._sessionStats.currentStreak, data.maxStreak || 0);
        }
        break;

      case ConditionTypes.SPEED_KILL:
        if (eventType === 'hit' && data.reactionTime !== undefined) {
          if (data.reactionTime <= condition.target) {
            return condition.target; // Completed
          }
        }
        break;

      case ConditionTypes.TUTORIAL_COMPLETE:
        if (eventType === 'tutorial_complete') {
          if (!params.tutorial || data.tutorialId === params.tutorial) {
            return 1;
          }
        }
        break;

      case ConditionTypes.MODE_WINS:
        if (eventType === 'game_complete' && data.won) {
          if (!params.mode || data.mode === params.mode) {
            return 1;
          }
        }
        break;

      case ConditionTypes.WEAPON_KILLS:
        if (eventType === 'hit') {
          if (!params.weapon || data.weapon === params.weapon) {
            const key = `weapon_${params.weapon || 'any'}`;
            return (this._sessionStats[key] || 0) + 1;
          }
        }
        break;

      case ConditionTypes.PERFECT_GAME:
        if (eventType === 'game_complete') {
          if (data.misses === 0 && data.hits >= condition.target) {
            return data.hits;
          }
        }
        break;

      case ConditionTypes.MULTI_KILL:
        if (eventType === 'multi_kill') {
          if (data.count >= condition.target && data.timeWindow <= params.timeWindow) {
            return condition.target;
          }
        }
        break;

      case ConditionTypes.TIME_PLAYED:
        if (eventType === 'game_complete') {
          if (!params.mode || data.mode === params.mode) {
            const minutes = (data.duration || 0) / 60;
            return minutes;
          }
        }
        break;
    }

    return null;
  }

  /**
   * Update session stats based on event
   * @param {string} eventType
   * @param {Object} data
   * @private
   */
  _updateSessionStats(eventType, data) {
    switch (eventType) {
      case 'hit':
        this._sessionStats.hits++;
        this._sessionStats.currentStreak++;
        if (this._sessionStats.currentStreak > this._sessionStats.maxStreak) {
          this._sessionStats.maxStreak = this._sessionStats.currentStreak;
        }

        // Track weapon-specific hits
        if (data.weapon) {
          const key = `weapon_${data.weapon}`;
          this._sessionStats[key] = (this._sessionStats[key] || 0) + 1;
        }

        // Track reaction times
        if (data.reactionTime !== undefined) {
          this._sessionStats.reactionTimes.push(data.reactionTime);
        }
        break;

      case 'miss':
        this._sessionStats.misses++;
        this._sessionStats.currentStreak = 0;
        break;

      case 'combo':
        if (data.combo > this._sessionStats.maxCombo) {
          this._sessionStats.maxCombo = data.combo;
        }
        break;
    }
  }

  /**
   * Create empty session stats
   * @returns {Object}
   * @private
   */
  _createEmptySessionStats() {
    return {
      hits: 0,
      misses: 0,
      currentStreak: 0,
      maxStreak: 0,
      maxCombo: 0,
      reactionTimes: [],
    };
  }

  /**
   * Create empty lifetime stats
   * @returns {Object}
   * @private
   */
  _createEmptyLifetimeStats() {
    return {
      gamesPlayed: 0,
      totalHits: 0,
      totalMisses: 0,
      totalScore: 0,
      totalTimePlayed: 0,
      highScore: 0,
      maxCombo: 0,
      maxStreak: 0,
    };
  }

  /**
   * Set up event listeners for game events
   * @private
   */
  _setupEventListeners() {
    const eventBus = getEventBus();

    eventBus.on(GameEvents.TARGET_HIT, (data) => {
      this.trackEvent('hit', data);
    });

    eventBus.on(GameEvents.TARGET_MISS, (data) => {
      this.trackEvent('miss', data);
    });

    eventBus.on(GameEvents.GAME_END, (data) => {
      this.onGameEnd(data);
    });

    eventBus.on(GameEvents.COMBO_UPDATE, (data) => {
      this.trackEvent('combo', data);
    });
  }

  /**
   * Load progress from localStorage
   * @private
   */
  _loadProgress() {
    try {
      const saved = localStorage.getItem('achievement_progress');
      if (saved) {
        const data = JSON.parse(saved);
        for (const [id, progress] of Object.entries(data.progress || {})) {
          this._progress.set(id, progress);
        }
        this._recentUnlocks = data.recentUnlocks || [];
        this._unlockedRewards = new Set(data.unlockedRewards || []);
      }
    } catch {
      // localStorage not available or invalid data
    }
  }

  /**
   * Save progress to localStorage
   * @private
   */
  _saveProgress() {
    try {
      const data = {
        progress: Object.fromEntries(this._progress),
        recentUnlocks: this._recentUnlocks.slice(0, 50),
        unlockedRewards: Array.from(this._unlockedRewards),
      };
      localStorage.setItem('achievement_progress', JSON.stringify(data));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Load lifetime stats from localStorage
   * @returns {Object}
   * @private
   */
  _loadLifetimeStats() {
    try {
      const saved = localStorage.getItem('lifetime_stats');
      return saved ? JSON.parse(saved) : this._createEmptyLifetimeStats();
    } catch {
      return this._createEmptyLifetimeStats();
    }
  }

  /**
   * Save lifetime stats to localStorage
   * @private
   */
  _saveLifetimeStats() {
    try {
      localStorage.setItem('lifetime_stats', JSON.stringify(this._lifetimeStats));
    } catch {
      // localStorage not available
    }
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let achievementSystemInstance = null;

/**
 * Get the singleton achievement system instance
 * @returns {AchievementSystem}
 */
export function getAchievementSystem() {
  if (!achievementSystemInstance) {
    achievementSystemInstance = new AchievementSystem();
  }
  return achievementSystemInstance;
}

/**
 * Reset the achievement system instance
 */
export function resetAchievementSystem() {
  if (achievementSystemInstance) {
    achievementSystemInstance.removeAllListeners();
    achievementSystemInstance = null;
  }
}

export default AchievementSystem;
