/**
 * UIManager - Handles UI state transitions, score display, timer, and visual feedback
 * Separates UI logic from DOM manipulation for testability
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} UIElements
 * @property {HTMLElement|null} menu - Menu container
 * @property {HTMLElement|null} crosshair - Crosshair element
 * @property {HTMLElement|null} score - Score display
 * @property {HTMLElement|null} timer - Timer display
 * @property {HTMLElement|null} endScreen - End screen container
 * @property {HTMLElement|null} finalScore - Final score display
 */

/**
 * UI state enumeration
 */
export const UIState = {
  MENU: 'menu',
  GAME: 'game',
  END: 'end',
  LOADING: 'loading',
};

/**
 * Crosshair target types
 */
export const CrosshairTarget = {
  NONE: null,
  CIRCLE: 'circle',
  NPC: 'npc',
};

/**
 * Performance tier thresholds for end-game messages
 */
export const PERFORMANCE_TIERS = [
  { minScore: 100, message: 'Exceptional! Sharpshooter!', emoji: '🏆' },
  { minScore: 80, message: 'Excellent! Great accuracy!', emoji: '🎯' },
  { minScore: 60, message: 'Good job! Keep practicing!', emoji: '👍' },
  { minScore: 40, message: 'Not bad, room for improvement', emoji: '😐' },
  { minScore: 20, message: 'Better luck next time!', emoji: '😅' },
  { minScore: 0, message: 'Practice makes perfect!', emoji: '🎮' },
  { minScore: -Infinity, message: 'Maybe avoid the animals next time?', emoji: '🐷' },
];

/**
 * Timer warning thresholds
 */
export const TIMER_THRESHOLDS = {
  warning: 30, // Yellow warning
  critical: 10, // Red critical + pulse
};

/**
 * UIManager - Core UI management class
 */
export class UIManager extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {UIElements} [options.elements] - DOM elements (can be null for testing)
   * @param {number} [options.defaultTime] - Default game time
   */
  constructor(options = {}) {
    super();

    /** @type {UIElements} */
    this._elements = options.elements || {
      menu: null,
      crosshair: null,
      score: null,
      timer: null,
      endScreen: null,
      finalScore: null,
    };

    /** @type {string} */
    this._currentState = UIState.MENU;

    /** @type {number} */
    this._score = 0;

    /** @type {number} */
    this._time = options.defaultTime || 120;

    /** @type {string|null} */
    this._crosshairTarget = CrosshairTarget.NONE;

    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize UI manager
   */
  init() {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this.showMenu();

    this.emit('ui:init');
  }

  /**
   * Get current UI state
   * @returns {string}
   */
  get currentState() {
    return this._currentState;
  }

  /**
   * Get current score
   * @returns {number}
   */
  get score() {
    return this._score;
  }

  /**
   * Get current time
   * @returns {number}
   */
  get time() {
    return this._time;
  }

  /**
   * Check if UI is in a specific state
   * @param {string} state - State to check
   * @returns {boolean}
   */
  isInState(state) {
    return this._currentState === state;
  }

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  /**
   * Show the main menu
   */
  showMenu() {
    const previousState = this._currentState;
    this._currentState = UIState.MENU;

    // Update DOM elements if available
    this._hideAllScreens();

    if (this._elements.menu) {
      this._elements.menu.style.display = 'block';
    }

    this._hideGameUI();

    this.emit('ui:stateChange', { from: previousState, to: UIState.MENU });
    this.emit('ui:showMenu');
  }

  /**
   * Show the game UI
   */
  showGameUI() {
    const previousState = this._currentState;
    this._currentState = UIState.GAME;

    // Update DOM elements if available
    this._hideAllScreens();

    if (this._elements.crosshair) {
      this._elements.crosshair.classList.remove('hidden');
    }
    if (this._elements.score) {
      this._elements.score.classList.remove('hidden');
    }
    if (this._elements.timer) {
      this._elements.timer.classList.remove('hidden');
    }

    this.emit('ui:stateChange', { from: previousState, to: UIState.GAME });
    this.emit('ui:showGame');
  }

  /**
   * Show the end screen
   * @param {number} finalScore - Final game score
   */
  showEndScreen(finalScore) {
    const previousState = this._currentState;
    this._currentState = UIState.END;

    // Update DOM elements if available
    this._hideAllScreens();

    if (this._elements.endScreen) {
      this._elements.endScreen.style.display = 'block';
    }

    this._hideGameUI();

    // Update final score display using safe DOM manipulation
    if (this._elements.finalScore) {
      const message = this.getPerformanceMessage(finalScore);
      // Clear existing content
      this._elements.finalScore.textContent = '';
      // Create text nodes and elements safely
      this._elements.finalScore.appendChild(document.createTextNode(`Final Score: ${finalScore}`));
      const br = document.createElement('br');
      this._elements.finalScore.appendChild(br);
      const span = document.createElement('span');
      span.style.fontSize = '18px';
      span.style.color = '#ccc';
      span.textContent = `${message.emoji} ${message.text}`;
      this._elements.finalScore.appendChild(span);
    }

    this.emit('ui:stateChange', { from: previousState, to: UIState.END });
    this.emit('ui:showEnd', { finalScore });
  }

  /**
   * Hide all overlay screens
   * @private
   */
  _hideAllScreens() {
    if (this._elements.menu) {
      this._elements.menu.style.display = 'none';
    }
    if (this._elements.endScreen) {
      this._elements.endScreen.style.display = 'none';
    }
  }

  /**
   * Hide game UI elements
   * @private
   */
  _hideGameUI() {
    if (this._elements.crosshair) {
      this._elements.crosshair.classList.add('hidden');
    }
    if (this._elements.score) {
      this._elements.score.classList.add('hidden');
    }
    if (this._elements.timer) {
      this._elements.timer.classList.add('hidden');
    }
  }

  // ==========================================================================
  // Score Display
  // ==========================================================================

  /**
   * Update the score display
   * @param {number} score - New score value
   */
  updateScore(score) {
    const previousScore = this._score;
    this._score = score;

    // Update DOM element if available
    if (this._elements.score) {
      this._elements.score.textContent = `Score: ${score}`;
    }

    this.emit('ui:scoreUpdate', {
      previousScore,
      newScore: score,
      change: score - previousScore,
    });
  }

  /**
   * Add to current score
   * @param {number} points - Points to add (can be negative)
   */
  addScore(points) {
    this.updateScore(this._score + points);
  }

  /**
   * Reset score to zero
   */
  resetScore() {
    this.updateScore(0);
  }

  // ==========================================================================
  // Timer Display
  // ==========================================================================

  /**
   * Update the timer display
   * @param {number} timeInSeconds - Time remaining in seconds
   */
  updateTimer(timeInSeconds) {
    const previousTime = this._time;
    this._time = Math.max(0, timeInSeconds);

    // Format time
    const formatted = this.formatTime(this._time);

    // Update DOM element if available
    if (this._elements.timer) {
      this._elements.timer.textContent = `Time: ${formatted}`;

      // Apply warning styles
      const timerState = this.getTimerState(this._time);
      this._applyTimerStyle(timerState);
    }

    this.emit('ui:timerUpdate', {
      previousTime,
      newTime: this._time,
      formatted,
      state: this.getTimerState(this._time),
    });
  }

  /**
   * Format time as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string}
   */
  formatTime(seconds) {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get timer state based on time remaining
   * @param {number} seconds - Time in seconds
   * @returns {'normal'|'warning'|'critical'}
   */
  getTimerState(seconds) {
    if (seconds <= TIMER_THRESHOLDS.critical) {
      return 'critical';
    }
    if (seconds <= TIMER_THRESHOLDS.warning) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Apply timer visual style based on state
   * @param {'normal'|'warning'|'critical'} state
   * @private
   */
  _applyTimerStyle(state) {
    if (!this._elements.timer) return;

    switch (state) {
      case 'critical':
        this._elements.timer.style.color = '#ff4444';
        this._elements.timer.style.animation = 'pulse 1s infinite';
        break;
      case 'warning':
        this._elements.timer.style.color = '#ff4444';
        this._elements.timer.style.animation = 'none';
        break;
      default:
        this._elements.timer.style.color = '#fff';
        this._elements.timer.style.animation = 'none';
    }
  }

  // ==========================================================================
  // Performance Messages
  // ==========================================================================

  /**
   * Get performance message based on score
   * @param {number} score - Final score
   * @returns {{ text: string, emoji: string, tier: number }}
   */
  getPerformanceMessage(score) {
    for (let i = 0; i < PERFORMANCE_TIERS.length; i++) {
      const tier = PERFORMANCE_TIERS[i];
      if (score >= tier.minScore) {
        return {
          text: tier.message,
          emoji: tier.emoji,
          tier: i,
        };
      }
    }

    // Fallback (should never reach here)
    return { text: 'Game Over', emoji: '🎮', tier: PERFORMANCE_TIERS.length };
  }

  // ==========================================================================
  // Crosshair
  // ==========================================================================

  /**
   * Update crosshair style based on target
   * @param {string|null} targetType - Type of target being aimed at
   */
  updateCrosshair(targetType = null) {
    this._crosshairTarget = targetType;

    // Update DOM element if available
    if (!this._elements.crosshair) return;

    this._elements.crosshair.className = '';

    switch (targetType) {
      case CrosshairTarget.CIRCLE:
        this._elements.crosshair.style.borderColor = '#00ff00';
        this._elements.crosshair.style.boxShadow = '0 0 15px rgba(0,255,0,0.8)';
        break;
      case CrosshairTarget.NPC:
        this._elements.crosshair.style.borderColor = '#ff0000';
        this._elements.crosshair.style.boxShadow = '0 0 15px rgba(255,0,0,0.8)';
        break;
      default:
        this._elements.crosshair.style.borderColor = '#fff';
        this._elements.crosshair.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    }

    this.emit('ui:crosshairUpdate', { targetType });
  }

  /**
   * Get current crosshair target
   * @returns {string|null}
   */
  getCrosshairTarget() {
    return this._crosshairTarget;
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  /**
   * Show a temporary message
   * @param {string} text - Message text
   * @param {Object} [options]
   * @param {number} [options.duration=2000] - Display duration in ms
   * @param {string} [options.color='#fff'] - Text color
   */
  showMessage(text, options = {}) {
    const { duration = 2000, color = '#fff' } = options;

    this.emit('ui:showMessage', { text, duration, color });
  }

  /**
   * Show a hit indicator
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {boolean} isPositive - Whether it's a positive hit
   */
  showHitIndicator(x, y, isPositive = true) {
    this.emit('ui:showHitIndicator', {
      x,
      y,
      isPositive,
      text: isPositive ? '+10' : '-1',
    });
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get complete UI state snapshot
   * @returns {Object}
   */
  getState() {
    return {
      currentState: this._currentState,
      score: this._score,
      time: this._time,
      formattedTime: this.formatTime(this._time),
      timerState: this.getTimerState(this._time),
      crosshairTarget: this._crosshairTarget,
      initialized: this._initialized,
    };
  }

  /**
   * Reset UI to initial state
   */
  reset() {
    this._score = 0;
    this._time = 120;
    this._crosshairTarget = CrosshairTarget.NONE;

    if (this._elements.score) {
      this._elements.score.textContent = 'Score: 0';
    }

    this.updateTimer(120);
    this.showMenu();

    this.emit('ui:reset');
  }

  /**
   * Check if UI is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Set DOM elements (useful for late binding)
   * @param {UIElements} elements
   */
  setElements(elements) {
    this._elements = { ...this._elements, ...elements };
  }
}

export default UIManager;
