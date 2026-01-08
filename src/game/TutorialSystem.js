/**
 * TutorialSystem - Guided tutorial and practice mode
 * Provides step-by-step instructions for new players
 */

import { EventEmitter, GameEvents, getEventBus } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} TutorialStep
 * @property {string} id - Unique step identifier
 * @property {string} title - Step title
 * @property {string} instruction - Main instruction text
 * @property {string} [hint] - Additional hint text
 * @property {string} action - Action type to complete step
 * @property {Object} [actionParams] - Parameters for action validation
 * @property {number} [timeout] - Auto-advance after timeout (ms)
 * @property {boolean} [pauseGame] - Whether to pause game during step
 * @property {Object} [highlight] - UI element to highlight
 * @property {Function} [onEnter] - Callback when entering step
 * @property {Function} [onComplete] - Callback when completing step
 */

/**
 * @typedef {Object} TutorialProgress
 * @property {string} tutorialId - Current tutorial ID
 * @property {number} currentStep - Current step index
 * @property {number} totalSteps - Total steps in tutorial
 * @property {boolean} isComplete - Whether tutorial is complete
 * @property {Object} stepStats - Stats per step (attempts, time)
 */

// ==========================================================================
// Tutorial Step Actions
// ==========================================================================

export const TutorialActions = {
  NONE: 'none', // No action required, advance manually or by timeout
  CLICK: 'click', // Click anywhere
  SHOOT: 'shoot', // Fire weapon
  HIT_TARGET: 'hit_target', // Hit a target
  MOVE: 'move', // Move player (WASD)
  LOOK: 'look', // Move mouse/look around
  RELOAD: 'reload', // Reload weapon
  SWITCH_WEAPON: 'switch_weapon', // Switch to different weapon
  PAUSE: 'pause', // Press pause key
  HIT_STREAK: 'hit_streak', // Hit multiple targets consecutively
  SCORE_POINTS: 'score_points', // Reach a score threshold
  CUSTOM: 'custom', // Custom validation function
};

// ==========================================================================
// Tutorial Definitions
// ==========================================================================

export const Tutorials = {
  BASICS: {
    id: 'basics',
    name: 'Basic Training',
    description: 'Learn the fundamentals of aim training',
    estimatedTime: '2-3 minutes',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to 3jsAim!',
        instruction: 'This tutorial will teach you the basics of aim training.',
        hint: 'Click anywhere or press any key to continue.',
        action: TutorialActions.CLICK,
        pauseGame: true,
      },
      {
        id: 'look_around',
        title: 'Look Around',
        instruction: 'Move your mouse to look around the arena.',
        hint: 'Try looking left, right, up, and down.',
        action: TutorialActions.LOOK,
        actionParams: { minDistance: 100 }, // Minimum mouse movement
        pauseGame: false,
      },
      {
        id: 'movement',
        title: 'Movement',
        instruction: 'Use W, A, S, D keys to move around.',
        hint: 'W = Forward, S = Backward, A = Left, D = Right',
        action: TutorialActions.MOVE,
        actionParams: { minDistance: 5 }, // Minimum units moved
        pauseGame: false,
      },
      {
        id: 'first_shot',
        title: 'Fire Your Weapon',
        instruction: 'Click the left mouse button to shoot.',
        hint: "The crosshair in the center shows where you're aiming.",
        action: TutorialActions.SHOOT,
        pauseGame: false,
      },
      {
        id: 'hit_target',
        title: 'Hit a Target',
        instruction: 'Aim at a red target and click to hit it.',
        hint: 'Take your time - accuracy is more important than speed.',
        action: TutorialActions.HIT_TARGET,
        pauseGame: false,
      },
      {
        id: 'multiple_targets',
        title: 'Multiple Targets',
        instruction: 'Hit 3 more targets to continue.',
        hint: 'Try to hit them quickly while maintaining accuracy.',
        action: TutorialActions.HIT_STREAK,
        actionParams: { count: 3 },
        pauseGame: false,
      },
      {
        id: 'reload',
        title: 'Reloading',
        instruction: 'Press R to reload your weapon.',
        hint: "Reload when you have a moment - don't wait until empty!",
        action: TutorialActions.RELOAD,
        pauseGame: false,
      },
      {
        id: 'pause',
        title: 'Pause Menu',
        instruction: 'Press Escape to pause the game.',
        hint: 'You can access settings and quit from the pause menu.',
        action: TutorialActions.PAUSE,
        pauseGame: false,
      },
      {
        id: 'complete',
        title: 'Tutorial Complete!',
        instruction: "You've learned the basics. Ready to start training?",
        hint: 'Try Practice Mode to train at your own pace.',
        action: TutorialActions.CLICK,
        pauseGame: true,
      },
    ],
  },

  ADVANCED: {
    id: 'advanced',
    name: 'Advanced Techniques',
    description: 'Learn advanced aim training techniques',
    estimatedTime: '3-5 minutes',
    prerequisite: 'basics',
    steps: [
      {
        id: 'intro',
        title: 'Advanced Training',
        instruction: "Let's learn some advanced techniques.",
        hint: 'Click to continue.',
        action: TutorialActions.CLICK,
        pauseGame: true,
      },
      {
        id: 'tracking',
        title: 'Target Tracking',
        instruction: 'Moving targets require you to track their movement.',
        hint: 'Lead your shots slightly ahead of moving targets.',
        action: TutorialActions.HIT_TARGET,
        actionParams: { targetType: 'moving' },
        pauseGame: false,
      },
      {
        id: 'flicking',
        title: 'Flick Shots',
        instruction: 'Quickly snap to targets that appear at the edge of your view.',
        hint: 'This technique is called "flicking".',
        action: TutorialActions.HIT_STREAK,
        actionParams: { count: 3, maxTime: 3000 }, // 3 hits in 3 seconds
        pauseGame: false,
      },
      {
        id: 'weapons',
        title: 'Weapon Selection',
        instruction: 'Press 1-5 to switch between weapons.',
        hint: 'Each weapon has different characteristics.',
        action: TutorialActions.SWITCH_WEAPON,
        pauseGame: false,
      },
      {
        id: 'shotgun',
        title: 'Shotgun Spread',
        instruction: 'The shotgun fires multiple pellets in a spread pattern.',
        hint: 'Effective at close range against groups.',
        action: TutorialActions.HIT_TARGET,
        actionParams: { weaponType: 'shotgun' },
        pauseGame: false,
      },
      {
        id: 'sniper',
        title: 'Sniper Precision',
        instruction: 'The sniper rifle rewards precise headshots.',
        hint: 'High damage but slow fire rate.',
        action: TutorialActions.HIT_TARGET,
        actionParams: { weaponType: 'sniper' },
        pauseGame: false,
      },
      {
        id: 'combo',
        title: 'Combo System',
        instruction: 'Consecutive hits build a combo multiplier.',
        hint: 'Higher combos = more points!',
        action: TutorialActions.HIT_STREAK,
        actionParams: { count: 5 },
        pauseGame: false,
      },
      {
        id: 'complete',
        title: 'Advanced Training Complete!',
        instruction: "You're ready for competitive play.",
        hint: 'Try different game modes to test your skills.',
        action: TutorialActions.CLICK,
        pauseGame: true,
      },
    ],
  },
};

// ==========================================================================
// Practice Mode Configuration
// ==========================================================================

export const PracticeConfig = {
  infiniteTime: true,
  infiniteAmmo: true,
  noScoring: false, // Still track score but no pressure
  showStats: true,
  targetRespawn: true,
  respawnDelay: 500, // ms
  slowMotionAvailable: true,
  customSpawnRate: true,
  customDifficulty: true,
};

// ==========================================================================
// TutorialSystem Class
// ==========================================================================

export class TutorialSystem extends EventEmitter {
  constructor() {
    super();

    /** @type {Object|null} */
    this._currentTutorial = null;

    /** @type {number} */
    this._currentStepIndex = -1;

    /** @type {boolean} */
    this._isActive = false;

    /** @type {Object} */
    this._progress = this._loadProgress();

    /** @type {Object} */
    this._stepStats = {};

    /** @type {Object} */
    this._actionTracking = {
      mouseMovement: 0,
      playerMovement: 0,
      shotsFired: 0,
      targetsHit: 0,
      consecutiveHits: 0,
      lastHitTime: 0,
    };

    /** @type {number} */
    this._stepStartTime = 0;

    /** @type {boolean} */
    this._isPracticeMode = false;

    this._setupEventListeners();
  }

  /**
   * Get whether tutorial is active
   * @returns {boolean}
   */
  get isActive() {
    return this._isActive;
  }

  /**
   * Get whether practice mode is active
   * @returns {boolean}
   */
  get isPracticeMode() {
    return this._isPracticeMode;
  }

  /**
   * Get current step
   * @returns {TutorialStep|null}
   */
  get currentStep() {
    if (!this._currentTutorial || this._currentStepIndex < 0) {
      return null;
    }
    return this._currentTutorial.steps[this._currentStepIndex] || null;
  }

  /**
   * Get current progress
   * @returns {TutorialProgress|null}
   */
  get progress() {
    if (!this._currentTutorial) return null;

    return {
      tutorialId: this._currentTutorial.id,
      currentStep: this._currentStepIndex,
      totalSteps: this._currentTutorial.steps.length,
      isComplete: this._currentStepIndex >= this._currentTutorial.steps.length,
      stepStats: { ...this._stepStats },
    };
  }

  /**
   * Get completed tutorials
   * @returns {string[]}
   */
  getCompletedTutorials() {
    return this._progress.completed || [];
  }

  /**
   * Check if a tutorial is available (prerequisites met)
   * @param {string} tutorialId
   * @returns {boolean}
   */
  isTutorialAvailable(tutorialId) {
    const tutorial = Tutorials[tutorialId.toUpperCase()];
    if (!tutorial) return false;

    if (tutorial.prerequisite) {
      return this._progress.completed?.includes(tutorial.prerequisite) ?? false;
    }

    return true;
  }

  /**
   * Start a tutorial
   * @param {string} tutorialId
   * @returns {boolean}
   */
  startTutorial(tutorialId) {
    const tutorial =
      Tutorials[tutorialId.toUpperCase()] ||
      Object.values(Tutorials).find((t) => t.id === tutorialId);

    if (!tutorial) {
      console.warn(`Tutorial not found: ${tutorialId}`);
      return false;
    }

    if (!this.isTutorialAvailable(tutorialId)) {
      console.warn(`Tutorial prerequisites not met: ${tutorialId}`);
      return false;
    }

    this._currentTutorial = tutorial;
    this._currentStepIndex = -1;
    this._isActive = true;
    this._stepStats = {};
    this._resetActionTracking();

    this.emit('tutorial:started', { tutorial });
    getEventBus().emit(GameEvents.GAME_START, { mode: 'tutorial', tutorialId });

    this.nextStep();
    return true;
  }

  /**
   * Advance to next step
   * @returns {boolean}
   */
  nextStep() {
    if (!this._isActive || !this._currentTutorial) {
      return false;
    }

    // Complete current step
    if (this._currentStepIndex >= 0) {
      const currentStep = this._currentTutorial.steps[this._currentStepIndex];
      const timeSpent = Date.now() - this._stepStartTime;

      this._stepStats[currentStep.id] = {
        timeSpent,
        attempts: this._actionTracking.shotsFired,
      };

      if (currentStep.onComplete) {
        currentStep.onComplete(this);
      }

      this.emit('step:completed', { step: currentStep, stats: this._stepStats[currentStep.id] });
    }

    // Advance
    this._currentStepIndex++;
    this._resetActionTracking();
    this._stepStartTime = Date.now();

    // Check if tutorial complete
    if (this._currentStepIndex >= this._currentTutorial.steps.length) {
      this._completeTutorial();
      return false;
    }

    const newStep = this._currentTutorial.steps[this._currentStepIndex];

    if (newStep.onEnter) {
      newStep.onEnter(this);
    }

    this.emit('step:started', { step: newStep, index: this._currentStepIndex });

    // Set up timeout if configured
    if (newStep.timeout) {
      setTimeout(() => {
        if (this.currentStep?.id === newStep.id) {
          this.nextStep();
        }
      }, newStep.timeout);
    }

    return true;
  }

  /**
   * Go to previous step
   * @returns {boolean}
   */
  previousStep() {
    if (!this._isActive || this._currentStepIndex <= 0) {
      return false;
    }

    this._currentStepIndex--;
    this._resetActionTracking();
    this._stepStartTime = Date.now();

    const step = this._currentTutorial.steps[this._currentStepIndex];
    this.emit('step:started', { step, index: this._currentStepIndex });

    return true;
  }

  /**
   * Skip current step
   */
  skipStep() {
    if (!this._isActive) return;

    this.emit('step:skipped', { step: this.currentStep });
    this.nextStep();
  }

  /**
   * Skip entire tutorial
   */
  skipTutorial() {
    if (!this._isActive) return;

    this.emit('tutorial:skipped', { tutorial: this._currentTutorial });
    this._endTutorial();
  }

  /**
   * Register an action for step completion tracking
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  registerAction(action, data = {}) {
    // Track actions in both tutorial and practice modes
    if (!this._isActive && !this._isPracticeMode) return;

    // Update tracking (always happens in both modes)
    switch (action) {
      case TutorialActions.LOOK:
        this._actionTracking.mouseMovement += data.distance || 0;
        break;

      case TutorialActions.MOVE:
        this._actionTracking.playerMovement += data.distance || 0;
        break;

      case TutorialActions.SHOOT:
        this._actionTracking.shotsFired++;
        break;

      case TutorialActions.HIT_TARGET: {
        this._actionTracking.targetsHit++;
        const now = Date.now();
        if (now - this._actionTracking.lastHitTime < 2000) {
          this._actionTracking.consecutiveHits++;
        } else {
          this._actionTracking.consecutiveHits = 1;
        }
        this._actionTracking.lastHitTime = now;
        break;
      }
    }

    // Check if step action is completed (only in tutorial mode)
    if (this._isActive) {
      const step = this.currentStep;
      if (step && this._isStepActionComplete(step, action, data)) {
        this.nextStep();
      }
    }
  }

  /**
   * Start practice mode
   * @param {Object} [options] - Practice mode options
   */
  startPracticeMode(options = {}) {
    this._isPracticeMode = true;
    this._resetActionTracking();

    const config = {
      ...PracticeConfig,
      ...options,
    };

    this.emit('practice:started', { config });
    getEventBus().emit(GameEvents.GAME_START, { mode: 'practice', config });
  }

  /**
   * End practice mode
   */
  endPracticeMode() {
    if (!this._isPracticeMode) return;

    this._isPracticeMode = false;
    this.emit('practice:ended', { stats: { ...this._actionTracking } });
  }

  /**
   * Get practice mode stats
   * @returns {Object}
   */
  getPracticeStats() {
    return {
      shotsFired: this._actionTracking.shotsFired,
      targetsHit: this._actionTracking.targetsHit,
      accuracy:
        this._actionTracking.shotsFired > 0
          ? (this._actionTracking.targetsHit / this._actionTracking.shotsFired) * 100
          : 0,
      bestStreak: this._actionTracking.consecutiveHits,
    };
  }

  /**
   * Get all available tutorials
   * @returns {Object[]}
   */
  static getAvailableTutorials() {
    return Object.values(Tutorials).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      estimatedTime: t.estimatedTime,
      stepCount: t.steps.length,
      prerequisite: t.prerequisite,
    }));
  }

  /**
   * Check if step action is complete
   * @param {TutorialStep} step
   * @param {string} action
   * @param {Object} data
   * @returns {boolean}
   * @private
   */
  _isStepActionComplete(step, action, data) {
    if (step.action !== action && step.action !== TutorialActions.NONE) {
      // Special case: HIT_TARGET completes HIT_STREAK partially
      if (step.action === TutorialActions.HIT_STREAK && action === TutorialActions.HIT_TARGET) {
        const required = step.actionParams?.count || 1;
        return this._actionTracking.consecutiveHits >= required;
      }
      return false;
    }

    const params = step.actionParams || {};

    switch (step.action) {
      case TutorialActions.NONE:
      case TutorialActions.CLICK:
        return action === TutorialActions.CLICK;

      case TutorialActions.LOOK:
        return this._actionTracking.mouseMovement >= (params.minDistance || 50);

      case TutorialActions.MOVE:
        return this._actionTracking.playerMovement >= (params.minDistance || 3);

      case TutorialActions.SHOOT:
        return this._actionTracking.shotsFired >= 1;

      case TutorialActions.HIT_TARGET:
        // Check for specific target/weapon type if required
        if (params.targetType && data.targetType !== params.targetType) {
          return false;
        }
        if (params.weaponType && data.weaponType !== params.weaponType) {
          return false;
        }
        return this._actionTracking.targetsHit >= 1;

      case TutorialActions.RELOAD:
        return action === TutorialActions.RELOAD;

      case TutorialActions.SWITCH_WEAPON:
        return action === TutorialActions.SWITCH_WEAPON;

      case TutorialActions.PAUSE:
        return action === TutorialActions.PAUSE;

      case TutorialActions.HIT_STREAK: {
        const required = params.count || 3;
        if (params.maxTime) {
          // Check if streak was achieved within time limit
          const timeSinceStart = Date.now() - this._stepStartTime;
          if (timeSinceStart > params.maxTime) {
            this._actionTracking.consecutiveHits = 0;
            return false;
          }
        }
        return this._actionTracking.consecutiveHits >= required;
      }

      case TutorialActions.SCORE_POINTS:
        return (data.score || 0) >= (params.threshold || 100);

      case TutorialActions.CUSTOM:
        return params.validator ? params.validator(this._actionTracking, data) : false;

      default:
        return false;
    }
  }

  /**
   * Complete the tutorial
   * @private
   */
  _completeTutorial() {
    if (!this._currentTutorial) return;

    const tutorialId = this._currentTutorial.id;

    // Save completion
    if (!this._progress.completed) {
      this._progress.completed = [];
    }
    if (!this._progress.completed.includes(tutorialId)) {
      this._progress.completed.push(tutorialId);
    }
    this._progress.lastCompleted = tutorialId;
    this._progress.lastCompletedAt = Date.now();
    this._saveProgress();

    this.emit('tutorial:completed', {
      tutorial: this._currentTutorial,
      stats: this._stepStats,
    });

    this._endTutorial();
  }

  /**
   * End the tutorial (complete or skipped)
   * @private
   */
  _endTutorial() {
    this._isActive = false;
    this._currentTutorial = null;
    this._currentStepIndex = -1;

    this.emit('tutorial:ended');
  }

  /**
   * Reset action tracking
   * @private
   */
  _resetActionTracking() {
    this._actionTracking = {
      mouseMovement: 0,
      playerMovement: 0,
      shotsFired: 0,
      targetsHit: 0,
      consecutiveHits: 0,
      lastHitTime: 0,
    };
  }

  /**
   * Set up event listeners for game events
   * @private
   */
  _setupEventListeners() {
    const eventBus = getEventBus();

    eventBus.on(GameEvents.TARGET_HIT, (data) => {
      this.registerAction(TutorialActions.HIT_TARGET, data);
    });

    eventBus.on(GameEvents.GAME_PAUSE, () => {
      if (this._isActive) {
        this.registerAction(TutorialActions.PAUSE);
      }
    });
  }

  /**
   * Load progress from localStorage
   * @returns {Object}
   * @private
   */
  _loadProgress() {
    try {
      const saved = localStorage.getItem('tutorial_progress');
      return saved ? JSON.parse(saved) : { completed: [] };
    } catch {
      return { completed: [] };
    }
  }

  /**
   * Save progress to localStorage
   * @private
   */
  _saveProgress() {
    try {
      localStorage.setItem('tutorial_progress', JSON.stringify(this._progress));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Reset all tutorial progress
   */
  resetProgress() {
    this._progress = { completed: [] };
    this._saveProgress();
    this.emit('progress:reset');
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let tutorialSystemInstance = null;

/**
 * Get the singleton tutorial system instance
 * @returns {TutorialSystem}
 */
export function getTutorialSystem() {
  if (!tutorialSystemInstance) {
    tutorialSystemInstance = new TutorialSystem();
  }
  return tutorialSystemInstance;
}

/**
 * Reset the tutorial system instance
 */
export function resetTutorialSystem() {
  if (tutorialSystemInstance) {
    tutorialSystemInstance.skipTutorial();
    tutorialSystemInstance.endPracticeMode();
    tutorialSystemInstance.removeAllListeners();
    tutorialSystemInstance = null;
  }
}

export default TutorialSystem;
