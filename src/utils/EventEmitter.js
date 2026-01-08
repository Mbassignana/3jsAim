/**
 * EventEmitter - A simple event system for decoupled component communication
 * Allows game components to communicate without direct dependencies
 */

export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._onceListeners = new Map();
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {() => void} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {() => void} Unsubscribe function
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    this._onceListeners.get(event).add(callback);

    return () => {
      if (this._onceListeners.has(event)) {
        this._onceListeners.get(event).delete(callback);
      }
    };
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
    if (this._onceListeners.has(event)) {
      this._onceListeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event with optional data
   * @param {string} event - Event name
   * @param {*} [data] - Event data
   */
  emit(event, data) {
    // Call regular listeners
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }

    // Call once listeners and remove them
    if (this._onceListeners.has(event)) {
      const onceCallbacks = this._onceListeners.get(event);
      this._onceListeners.delete(event);
      onceCallbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in once listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event, or all listeners entirely
   * @param {string} [event] - Event name (optional)
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * Get the count of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const regular = this._listeners.has(event) ? this._listeners.get(event).size : 0;
    const once = this._onceListeners.has(event) ? this._onceListeners.get(event).size : 0;
    return regular + once;
  }

  /**
   * Check if an event has any listeners
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]}
   */
  eventNames() {
    const names = new Set([...this._listeners.keys(), ...this._onceListeners.keys()]);
    return Array.from(names);
  }
}

/**
 * Game-specific events for type safety and documentation
 */
export const GameEvents = {
  // Game state events
  GAME_START: 'game:start',
  GAME_END: 'game:end',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_RESTART: 'game:restart',

  // Score events
  SCORE_CHANGE: 'score:change',
  COMBO_INCREASE: 'combo:increase',
  COMBO_RESET: 'combo:reset',

  // Circle events
  CIRCLE_SPAWN: 'circle:spawn',
  CIRCLE_DESTROY: 'circle:destroy',
  CIRCLE_HIT: 'circle:hit',

  // NPC events
  NPC_SPAWN: 'npc:spawn',
  NPC_HIT: 'npc:hit',

  // Player events
  PLAYER_SHOOT: 'player:shoot',
  PLAYER_MOVE: 'player:move',
  PLAYER_JUMP: 'player:jump',

  // UI events
  UI_MESSAGE: 'ui:message',
  TIMER_UPDATE: 'timer:update',

  // Audio events
  AUDIO_PLAY: 'audio:play',
  AUDIO_STOP: 'audio:stop',
};

// Global game event bus singleton
let globalEventBus = null;

/**
 * Get the global event bus instance
 * @returns {EventEmitter}
 */
export function getEventBus() {
  if (!globalEventBus) {
    globalEventBus = new EventEmitter();
  }
  return globalEventBus;
}

/**
 * Reset the global event bus (useful for testing)
 */
export function resetEventBus() {
  if (globalEventBus) {
    globalEventBus.removeAllListeners();
  }
  globalEventBus = null;
}

export default EventEmitter;
