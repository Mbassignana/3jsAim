/**
 * StateMachine - Generic state machine implementation for game state management
 * Supports transitions, guards, entry/exit actions, and event emission
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} StateDefinition
 * @property {Function} [onEnter] - Called when entering this state
 * @property {Function} [onExit] - Called when exiting this state
 * @property {Function} [onUpdate] - Called every update tick while in this state
 * @property {Object.<string, TransitionDefinition>} [transitions] - Allowed transitions
 */

/**
 * @typedef {Object} TransitionDefinition
 * @property {string} target - Target state name
 * @property {Function} [guard] - Guard function, transition only if returns true
 * @property {Function} [action] - Action to perform during transition
 */

export class StateMachine extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.initialState - Initial state name
   * @param {Object.<string, StateDefinition>} config.states - State definitions
   * @param {Object} [config.context] - Shared context object passed to actions
   */
  constructor({ initialState, states, context = {} }) {
    super();

    if (!initialState) {
      throw new Error('StateMachine requires an initialState');
    }
    if (!states || Object.keys(states).length === 0) {
      throw new Error('StateMachine requires at least one state');
    }
    if (!states[initialState]) {
      throw new Error(`Initial state "${initialState}" not found in states`);
    }

    this._states = states;
    this._context = context;
    this._currentState = null;
    this._history = [];
    this._isTransitioning = false;

    // Enter initial state
    this._enterState(initialState);
  }

  /**
   * Get the current state name
   * @returns {string}
   */
  get currentState() {
    return this._currentState;
  }

  /**
   * Get the shared context
   * @returns {Object}
   */
  get context() {
    return this._context;
  }

  /**
   * Get state history
   * @returns {string[]}
   */
  get history() {
    return [...this._history];
  }

  /**
   * Check if currently in a specific state
   * @param {string} state - State name
   * @returns {boolean}
   */
  isInState(state) {
    return this._currentState === state;
  }

  /**
   * Check if a transition is possible
   * @param {string} event - Event/action name
   * @returns {boolean}
   */
  canTransition(event) {
    const stateConfig = this._states[this._currentState];
    if (!stateConfig?.transitions?.[event]) {
      return false;
    }

    const transition = stateConfig.transitions[event];
    if (transition.guard) {
      return transition.guard(this._context);
    }

    return true;
  }

  /**
   * Attempt to transition via an event
   * @param {string} event - Event/action name
   * @param {Object} [payload] - Data to pass to actions
   * @returns {boolean} True if transition occurred
   */
  transition(event, payload = {}) {
    if (this._isTransitioning) {
      console.warn('StateMachine: Cannot transition while already transitioning');
      return false;
    }

    const stateConfig = this._states[this._currentState];
    if (!stateConfig?.transitions?.[event]) {
      return false;
    }

    const transition = stateConfig.transitions[event];

    // Check guard
    if (transition.guard && !transition.guard(this._context, payload)) {
      return false;
    }

    this._isTransitioning = true;

    try {
      const fromState = this._currentState;
      const toState = transition.target;

      // Exit current state
      this._exitState(fromState, toState, payload);

      // Execute transition action
      if (transition.action) {
        transition.action(this._context, payload);
      }

      // Enter new state
      this._enterState(toState, fromState, payload);

      // Emit transition event
      this.emit('transition', {
        from: fromState,
        to: toState,
        event,
        payload,
      });

      return true;
    } finally {
      this._isTransitioning = false;
    }
  }

  /**
   * Enter a state
   * @param {string} state - State name
   * @param {string} [from] - Previous state
   * @param {Object} [payload] - Transition payload
   */
  _enterState(state, from = null, payload = {}) {
    this._currentState = state;
    this._history.push(state);

    // Keep history limited
    if (this._history.length > 100) {
      this._history.shift();
    }

    const stateConfig = this._states[state];
    if (stateConfig?.onEnter) {
      stateConfig.onEnter(this._context, { from, payload });
    }

    this.emit('enter', { state, from, payload });
  }

  /**
   * Exit a state
   * @param {string} state - State name
   * @param {string} [to] - Next state
   * @param {Object} [payload] - Transition payload
   */
  _exitState(state, to = null, payload = {}) {
    const stateConfig = this._states[state];
    if (stateConfig?.onExit) {
      stateConfig.onExit(this._context, { to, payload });
    }

    this.emit('exit', { state, to, payload });
  }

  /**
   * Update the current state
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    const stateConfig = this._states[this._currentState];
    if (stateConfig?.onUpdate) {
      stateConfig.onUpdate(this._context, deltaTime);
    }
  }

  /**
   * Get available transitions from current state
   * @returns {string[]} Array of event names
   */
  getAvailableTransitions() {
    const stateConfig = this._states[this._currentState];
    if (!stateConfig?.transitions) {
      return [];
    }
    return Object.keys(stateConfig.transitions);
  }

  /**
   * Reset to a specific state (for testing/debugging)
   * @param {string} state - State to reset to
   */
  reset(state = null) {
    const targetState = state || Object.keys(this._states)[0];
    if (!this._states[targetState]) {
      throw new Error(`State "${targetState}" not found`);
    }

    this._history = [];
    this._currentState = null;
    this._enterState(targetState);
  }
}

/**
 * Game-specific state machine for the FPS game
 */
export const GameStates = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
};

export const GameActions = {
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  END: 'end',
  RESTART: 'restart',
  TIMEOUT: 'timeout',
};

/**
 * Create a game state machine with default configuration
 * @param {Object} [context] - Game context (score, timer, etc.)
 * @returns {StateMachine}
 */
export function createGameStateMachine(context = {}) {
  // Default context
  const defaultContext = {
    score: 0,
    timeRemaining: 120,
    isRunning: false,
    ...context,
  };

  return new StateMachine({
    initialState: GameStates.MENU,
    context: defaultContext,
    states: {
      [GameStates.MENU]: {
        onEnter: (ctx) => {
          ctx.isRunning = false;
        },
        transitions: {
          [GameActions.START]: {
            target: GameStates.PLAYING,
            action: (ctx) => {
              ctx.score = 0;
              ctx.timeRemaining = 120;
              ctx.isRunning = true;
            },
          },
        },
      },

      [GameStates.PLAYING]: {
        onEnter: (ctx) => {
          ctx.isRunning = true;
        },
        onUpdate: (ctx, deltaTime) => {
          if (ctx.isRunning) {
            ctx.timeRemaining -= deltaTime;
          }
        },
        transitions: {
          [GameActions.PAUSE]: {
            target: GameStates.PAUSED,
          },
          [GameActions.END]: {
            target: GameStates.ENDED,
          },
          [GameActions.TIMEOUT]: {
            target: GameStates.ENDED,
            guard: (ctx) => ctx.timeRemaining <= 0,
          },
        },
      },

      [GameStates.PAUSED]: {
        onEnter: (ctx) => {
          ctx.isRunning = false;
        },
        transitions: {
          [GameActions.RESUME]: {
            target: GameStates.PLAYING,
          },
          [GameActions.END]: {
            target: GameStates.ENDED,
          },
          [GameActions.RESTART]: {
            target: GameStates.MENU,
          },
        },
      },

      [GameStates.ENDED]: {
        onEnter: (ctx) => {
          ctx.isRunning = false;
        },
        transitions: {
          [GameActions.RESTART]: {
            target: GameStates.MENU,
          },
        },
      },
    },
  });
}

export default StateMachine;
