/**
 * GameModeSystem - Defines and manages different game modes
 * Each mode has unique rules, scoring, and win/loss conditions
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} GameModeConfig
 * @property {string} id - Unique mode identifier
 * @property {string} name - Display name
 * @property {string} description - Mode description
 * @property {string} icon - Mode icon/emoji
 * @property {Object} rules - Game rules
 * @property {number} [rules.timeLimit] - Time limit in seconds (0 = infinite)
 * @property {number} [rules.targetScore] - Score to reach for victory
 * @property {number} [rules.lives] - Starting lives (0 = infinite)
 * @property {number} [rules.missesToFail] - Misses before game over
 * @property {number} [rules.accuracyThreshold] - Min accuracy % to pass
 * @property {boolean} [rules.endOnMiss] - End game on any miss
 * @property {Object} scoring - Scoring configuration
 * @property {number} scoring.hitBase - Base points per hit
 * @property {number} scoring.missBase - Points per miss (usually negative)
 * @property {number} [scoring.accuracyBonus] - Bonus multiplier for accuracy
 * @property {number} [scoring.timeBonus] - Bonus per second remaining
 * @property {boolean} [scoring.comboEnabled] - Whether combo system applies
 */

/**
 * @typedef {Object} GameModeState
 * @property {string} modeId - Current mode ID
 * @property {number} score - Current score
 * @property {number} hits - Total hits
 * @property {number} misses - Total misses
 * @property {number} lives - Remaining lives
 * @property {number} timeRemaining - Time remaining (seconds)
 * @property {number} startTime - Game start timestamp
 * @property {boolean} isActive - Whether game is running
 * @property {string|null} endReason - Why game ended
 */

// ==========================================================================
// Game Mode Definitions
// ==========================================================================

export const GameModes = {
  TIME_ATTACK: {
    id: 'time_attack',
    name: 'Time Attack',
    description: 'Score as many points as possible within the time limit',
    icon: '⏱️',
    rules: {
      timeLimit: 120, // 2 minutes
      targetScore: 0, // No target, just maximize
      lives: 0, // Infinite lives
      missesToFail: 0, // No fail on miss
      accuracyThreshold: 0, // No accuracy requirement
      endOnMiss: false,
    },
    scoring: {
      hitBase: 10,
      missBase: 0, // No penalty in time attack
      accuracyBonus: 0,
      timeBonus: 0,
      comboEnabled: true,
    },
  },

  SURVIVAL: {
    id: 'survival',
    name: 'Survival',
    description: 'Survive as long as possible with limited lives',
    icon: '❤️',
    rules: {
      timeLimit: 0, // No time limit
      targetScore: 0, // No target score
      lives: 3, // 3 lives
      missesToFail: 0, // Lives system handles failure
      accuracyThreshold: 0,
      endOnMiss: false,
    },
    scoring: {
      hitBase: 10,
      missBase: 0, // Misses cost lives, not points
      accuracyBonus: 0.1, // 10% bonus per accuracy point
      timeBonus: 1, // 1 point per second survived
      comboEnabled: true,
    },
  },

  PRECISION: {
    id: 'precision',
    name: 'Precision',
    description: 'Hit targets accurately - game ends on miss',
    icon: '🎯',
    rules: {
      timeLimit: 0, // No time limit
      targetScore: 100, // Win at 100 points
      lives: 1, // One life only
      missesToFail: 1, // First miss ends game
      accuracyThreshold: 0,
      endOnMiss: true,
    },
    scoring: {
      hitBase: 10,
      missBase: 0, // Miss ends game
      accuracyBonus: 0.5, // High accuracy bonus
      timeBonus: 0,
      comboEnabled: false, // No combo in precision mode
    },
  },

  ENDURANCE: {
    id: 'endurance',
    name: 'Endurance',
    description: 'No time limit, but maintain minimum accuracy',
    icon: '💪',
    rules: {
      timeLimit: 0, // No time limit
      targetScore: 200, // Win at 200 points
      lives: 0, // No lives system
      missesToFail: 0,
      accuracyThreshold: 50, // Must maintain 50% accuracy
      endOnMiss: false,
    },
    scoring: {
      hitBase: 10,
      missBase: -5, // Misses cost points
      accuracyBonus: 0.2,
      timeBonus: 0,
      comboEnabled: true,
    },
  },

  BLITZ: {
    id: 'blitz',
    name: 'Blitz',
    description: 'Fast-paced 60-second scoring rush',
    icon: '⚡',
    rules: {
      timeLimit: 60, // 1 minute
      targetScore: 0,
      lives: 0,
      missesToFail: 0,
      accuracyThreshold: 0,
      endOnMiss: false,
    },
    scoring: {
      hitBase: 15, // Higher base score
      missBase: -2, // Small penalty
      accuracyBonus: 0,
      timeBonus: 5, // Bigger time bonus
      comboEnabled: true,
    },
  },
};

export const DEFAULT_MODE = GameModes.TIME_ATTACK;

// ==========================================================================
// GameModeSystem Class
// ==========================================================================

export class GameModeSystem extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {GameModeConfig} [options.defaultMode] - Default game mode
   */
  constructor(options = {}) {
    super();

    /** @type {GameModeConfig} */
    this._currentMode = options.defaultMode ?? DEFAULT_MODE;

    /** @type {GameModeState} */
    this._state = this._createInitialState();

    /** @type {number|null} */
    this._timerInterval = null;

    /** @type {boolean} */
    this._paused = false;
  }

  /**
   * Get current game mode
   * @returns {GameModeConfig}
   */
  get currentMode() {
    return this._currentMode;
  }

  /**
   * Get current game state
   * @returns {GameModeState}
   */
  get state() {
    return { ...this._state };
  }

  /**
   * Get current score
   * @returns {number}
   */
  get score() {
    return this._state.score;
  }

  /**
   * Get current accuracy percentage
   * @returns {number}
   */
  get accuracy() {
    const total = this._state.hits + this._state.misses;
    if (total === 0) return 100;
    return (this._state.hits / total) * 100;
  }

  /**
   * Get time remaining (seconds)
   * @returns {number}
   */
  get timeRemaining() {
    return this._state.timeRemaining;
  }

  /**
   * Get remaining lives
   * @returns {number}
   */
  get lives() {
    return this._state.lives;
  }

  /**
   * Check if game is active
   * @returns {boolean}
   */
  get isActive() {
    return this._state.isActive;
  }

  /**
   * Set the game mode
   * @param {string|GameModeConfig} mode - Mode ID or config
   */
  setMode(mode) {
    if (typeof mode === 'string') {
      const foundMode = GameModes[mode.toUpperCase()] ||
        Object.values(GameModes).find((m) => m.id === mode);
      if (!foundMode) {
        throw new Error(`Unknown game mode: ${mode}`);
      }
      this._currentMode = foundMode;
    } else {
      this._currentMode = mode;
    }

    this.emit('mode:changed', { mode: this._currentMode });
  }

  /**
   * Start a new game
   */
  start() {
    this._state = this._createInitialState();
    this._state.isActive = true;
    this._state.startTime = Date.now();

    // Set up timer if mode has time limit
    if (this._currentMode.rules.timeLimit > 0) {
      this._state.timeRemaining = this._currentMode.rules.timeLimit;
      this._startTimer();
    }

    // Set lives if mode uses them
    if (this._currentMode.rules.lives > 0) {
      this._state.lives = this._currentMode.rules.lives;
    }

    this.emit('game:started', { mode: this._currentMode, state: this.state });
    getEventBus().emit(GameEvents.GAME_START, { mode: this._currentMode });
  }

  /**
   * Register a hit
   * @param {Object} [hitData] - Optional hit data
   * @returns {{points: number, newScore: number}}
   */
  registerHit(hitData = {}) {
    if (!this._state.isActive) {
      return { points: 0, newScore: this._state.score };
    }

    this._state.hits++;

    // Calculate points
    let points = this._currentMode.scoring.hitBase;

    // Apply accuracy bonus if configured
    if (this._currentMode.scoring.accuracyBonus > 0) {
      const accuracyMultiplier = 1 + (this.accuracy / 100) * this._currentMode.scoring.accuracyBonus;
      points = Math.round(points * accuracyMultiplier);
    }

    // Apply combo multiplier if enabled and provided
    if (this._currentMode.scoring.comboEnabled && hitData.comboMultiplier) {
      points = Math.round(points * hitData.comboMultiplier);
    }

    this._state.score += points;

    this.emit('hit', { points, score: this._state.score, hits: this._state.hits });

    // Check win condition (target score)
    if (this._currentMode.rules.targetScore > 0 &&
        this._state.score >= this._currentMode.rules.targetScore) {
      this._endGame('target_reached');
    }

    return { points, newScore: this._state.score };
  }

  /**
   * Register a miss
   * @param {Object} [missData] - Optional miss data
   * @returns {{points: number, newScore: number, gameOver: boolean}}
   */
  registerMiss(missData = {}) {
    if (!this._state.isActive) {
      return { points: 0, newScore: this._state.score, gameOver: false };
    }

    this._state.misses++;

    // Apply miss penalty
    const points = this._currentMode.scoring.missBase;
    this._state.score = Math.max(0, this._state.score + points);

    // Reduce lives if applicable
    if (this._currentMode.rules.lives > 0) {
      this._state.lives--;
      this.emit('life:lost', { livesRemaining: this._state.lives });

      if (this._state.lives <= 0) {
        this._endGame('no_lives');
        return { points, newScore: this._state.score, gameOver: true };
      }
    }

    // End on miss if configured
    if (this._currentMode.rules.endOnMiss) {
      this._endGame('miss');
      return { points, newScore: this._state.score, gameOver: true };
    }

    // Check accuracy threshold
    if (this._currentMode.rules.accuracyThreshold > 0 &&
        this.accuracy < this._currentMode.rules.accuracyThreshold &&
        this._state.hits + this._state.misses >= 10) { // Need minimum shots
      this._endGame('accuracy_too_low');
      return { points, newScore: this._state.score, gameOver: true };
    }

    this.emit('miss', { points, score: this._state.score, misses: this._state.misses });

    return { points, newScore: this._state.score, gameOver: false };
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this._state.isActive || this._paused) {
      return;
    }

    this._paused = true;
    this._stopTimer();
    this.emit('game:paused');
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this._state.isActive || !this._paused) {
      return;
    }

    this._paused = false;
    if (this._currentMode.rules.timeLimit > 0) {
      this._startTimer();
    }
    this.emit('game:resumed');
  }

  /**
   * Check if game is paused
   * @returns {boolean}
   */
  isPaused() {
    return this._paused;
  }

  /**
   * End the game manually
   * @param {string} [reason='manual']
   */
  end(reason = 'manual') {
    this._endGame(reason);
  }

  /**
   * Calculate final score with bonuses
   * @returns {{baseScore: number, timeBonus: number, accuracyBonus: number, finalScore: number}}
   */
  calculateFinalScore() {
    const baseScore = this._state.score;
    let timeBonus = 0;
    let accuracyBonus = 0;

    // Time bonus (for modes with time limits)
    if (this._currentMode.scoring.timeBonus > 0 && this._state.timeRemaining > 0) {
      timeBonus = Math.round(this._state.timeRemaining * this._currentMode.scoring.timeBonus);
    }

    // Accuracy bonus
    if (this._currentMode.scoring.accuracyBonus > 0) {
      accuracyBonus = Math.round(baseScore * (this.accuracy / 100) * this._currentMode.scoring.accuracyBonus);
    }

    const finalScore = baseScore + timeBonus + accuracyBonus;

    return { baseScore, timeBonus, accuracyBonus, finalScore };
  }

  /**
   * Get game statistics
   * @returns {Object}
   */
  getStats() {
    const elapsed = this._state.isActive
      ? (Date.now() - this._state.startTime) / 1000
      : (this._state.endTime - this._state.startTime) / 1000;

    return {
      mode: this._currentMode.id,
      score: this._state.score,
      hits: this._state.hits,
      misses: this._state.misses,
      accuracy: this.accuracy,
      timeElapsed: elapsed,
      timeRemaining: this._state.timeRemaining,
      lives: this._state.lives,
      endReason: this._state.endReason,
    };
  }

  /**
   * Get all available game modes
   * @returns {GameModeConfig[]}
   */
  static getAvailableModes() {
    return Object.values(GameModes);
  }

  /**
   * Get mode by ID
   * @param {string} id
   * @returns {GameModeConfig|null}
   */
  static getModeById(id) {
    return GameModes[id.toUpperCase()] ||
      Object.values(GameModes).find((m) => m.id === id) ||
      null;
  }

  /**
   * Create initial game state
   * @returns {GameModeState}
   * @private
   */
  _createInitialState() {
    return {
      modeId: this._currentMode.id,
      score: 0,
      hits: 0,
      misses: 0,
      lives: this._currentMode.rules.lives || 0,
      timeRemaining: this._currentMode.rules.timeLimit || 0,
      startTime: 0,
      endTime: 0,
      isActive: false,
      endReason: null,
    };
  }

  /**
   * Start the game timer
   * @private
   */
  _startTimer() {
    this._stopTimer();

    this._timerInterval = setInterval(() => {
      if (this._paused) {
        return;
      }

      this._state.timeRemaining--;
      this.emit('timer:tick', { timeRemaining: this._state.timeRemaining });

      if (this._state.timeRemaining <= 0) {
        this._endGame('time_up');
      }
    }, 1000);
  }

  /**
   * Stop the game timer
   * @private
   */
  _stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  /**
   * End the game
   * @param {string} reason
   * @private
   */
  _endGame(reason) {
    if (!this._state.isActive) {
      return;
    }

    this._state.isActive = false;
    this._state.endTime = Date.now();
    this._state.endReason = reason;
    this._paused = false;
    this._stopTimer();

    // Calculate time survival bonus for survival mode
    if (this._currentMode.id === 'survival' && this._currentMode.scoring.timeBonus > 0) {
      const elapsed = (this._state.endTime - this._state.startTime) / 1000;
      this._state.score += Math.round(elapsed * this._currentMode.scoring.timeBonus);
    }

    const finalScores = this.calculateFinalScore();

    this.emit('game:ended', {
      reason,
      stats: this.getStats(),
      finalScores,
    });
    getEventBus().emit(GameEvents.GAME_END, {
      mode: this._currentMode.id,
      reason,
      score: finalScores.finalScore,
    });
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let gameModeSystemInstance = null;

/**
 * Get the singleton game mode system instance
 * @returns {GameModeSystem}
 */
export function getGameModeSystem() {
  if (!gameModeSystemInstance) {
    gameModeSystemInstance = new GameModeSystem();
  }
  return gameModeSystemInstance;
}

/**
 * Reset the game mode system instance
 */
export function resetGameModeSystem() {
  if (gameModeSystemInstance) {
    gameModeSystemInstance.end();
    gameModeSystemInstance.removeAllListeners();
    gameModeSystemInstance = null;
  }
}

export default GameModeSystem;
