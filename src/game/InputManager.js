/**
 * InputManager - Handles keyboard, mouse, and gamepad input
 * Supports key bindings, input state tracking, and pause functionality
 */

import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * @typedef {Object} KeyBinding
 * @property {string} key - Key code
 * @property {string} action - Action name
 * @property {boolean} [repeatable=false] - Allow repeat while held
 */

export const InputActions = {
  MOVE_FORWARD: 'move_forward',
  MOVE_BACKWARD: 'move_backward',
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  JUMP: 'jump',
  SPRINT: 'sprint',
  SHOOT: 'shoot',
  RELOAD: 'reload',
  PAUSE: 'pause',
  MENU: 'menu',
};

export const DEFAULT_KEY_BINDINGS = {
  KeyW: InputActions.MOVE_FORWARD,
  KeyS: InputActions.MOVE_BACKWARD,
  KeyA: InputActions.MOVE_LEFT,
  KeyD: InputActions.MOVE_RIGHT,
  Space: InputActions.JUMP,
  ShiftLeft: InputActions.SPRINT,
  ShiftRight: InputActions.SPRINT,
  Escape: InputActions.PAUSE,
  KeyR: InputActions.RELOAD,
  // Arrow keys as alternatives
  ArrowUp: InputActions.MOVE_FORWARD,
  ArrowDown: InputActions.MOVE_BACKWARD,
  ArrowLeft: InputActions.MOVE_LEFT,
  ArrowRight: InputActions.MOVE_RIGHT,
};

export class InputManager extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.keyBindings] - Custom key bindings
   * @param {number} [options.mouseSensitivity=1.0] - Mouse sensitivity multiplier
   * @param {boolean} [options.invertY=false] - Invert Y axis
   */
  constructor(options = {}) {
    super();

    this._keyBindings = { ...DEFAULT_KEY_BINDINGS, ...options.keyBindings };
    this._mouseSensitivity = options.mouseSensitivity ?? 1.0;
    this._invertY = options.invertY ?? false;

    // Current input state
    this._keysDown = new Set();
    this._actionsDown = new Set();
    this._mouseMovement = { x: 0, y: 0 };
    this._mouseButtons = new Set();

    // Pause state
    this._paused = false;
    this._pauseLocked = false; // Prevent pause toggling during certain states

    // Pointer lock state
    this._pointerLocked = false;

    // Bound handlers for cleanup
    this._boundHandlers = {};
  }

  /**
   * Initialize input handlers
   * @param {Document|Element} [target=document] - Event target
   */
  init(target = document) {
    this._target = target;

    this._boundHandlers.keydown = this._onKeyDown.bind(this);
    this._boundHandlers.keyup = this._onKeyUp.bind(this);
    this._boundHandlers.mousedown = this._onMouseDown.bind(this);
    this._boundHandlers.mouseup = this._onMouseUp.bind(this);
    this._boundHandlers.mousemove = this._onMouseMove.bind(this);
    this._boundHandlers.pointerlockchange = this._onPointerLockChange.bind(this);
    this._boundHandlers.pointerlockerror = this._onPointerLockError.bind(this);
    this._boundHandlers.blur = this._onBlur.bind(this);

    target.addEventListener('keydown', this._boundHandlers.keydown);
    target.addEventListener('keyup', this._boundHandlers.keyup);
    target.addEventListener('mousedown', this._boundHandlers.mousedown);
    target.addEventListener('mouseup', this._boundHandlers.mouseup);
    target.addEventListener('mousemove', this._boundHandlers.mousemove);
    document.addEventListener('pointerlockchange', this._boundHandlers.pointerlockchange);
    document.addEventListener('pointerlockerror', this._boundHandlers.pointerlockerror);
    window.addEventListener('blur', this._boundHandlers.blur);
  }

  /**
   * Cleanup input handlers
   */
  destroy() {
    if (!this._target) {
      return;
    }

    this._target.removeEventListener('keydown', this._boundHandlers.keydown);
    this._target.removeEventListener('keyup', this._boundHandlers.keyup);
    this._target.removeEventListener('mousedown', this._boundHandlers.mousedown);
    this._target.removeEventListener('mouseup', this._boundHandlers.mouseup);
    this._target.removeEventListener('mousemove', this._boundHandlers.mousemove);
    document.removeEventListener('pointerlockchange', this._boundHandlers.pointerlockchange);
    document.removeEventListener('pointerlockerror', this._boundHandlers.pointerlockerror);
    window.removeEventListener('blur', this._boundHandlers.blur);

    this._target = null;
    this._boundHandlers = {};
  }

  // Event handlers

  _onKeyDown(event) {
    // Don't process if typing in input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const code = event.code;

    // Check for pause (always allowed unless locked)
    if (this._keyBindings[code] === InputActions.PAUSE && !this._pauseLocked) {
      if (!event.repeat) {
        this.togglePause();
      }
      event.preventDefault();
      return;
    }

    // Don't process other keys while paused
    if (this._paused) {
      return;
    }

    if (!event.repeat || this._isRepeatableAction(code)) {
      this._keysDown.add(code);

      const action = this._keyBindings[code];
      if (action) {
        this._actionsDown.add(action);
        this.emit('actionDown', { action, key: code });
      }
    }

    // Prevent default for game keys
    if (this._keyBindings[code]) {
      event.preventDefault();
    }
  }

  _onKeyUp(event) {
    const code = event.code;
    this._keysDown.delete(code);

    const action = this._keyBindings[code];
    if (action) {
      // Only remove action if no other key is bound to it
      const stillDown = Array.from(this._keysDown).some((key) => this._keyBindings[key] === action);
      if (!stillDown) {
        this._actionsDown.delete(action);
        this.emit('actionUp', { action, key: code });
      }
    }
  }

  _onMouseDown(event) {
    if (this._paused) {
      return;
    }

    this._mouseButtons.add(event.button);

    if (event.button === 0) {
      this.emit('shoot');
    } else if (event.button === 2) {
      this.emit('altFire');
    }
  }

  _onMouseUp(event) {
    this._mouseButtons.delete(event.button);
  }

  _onMouseMove(event) {
    if (this._paused || !this._pointerLocked) {
      return;
    }

    const sensitivity = this._mouseSensitivity;
    this._mouseMovement.x += event.movementX * sensitivity;
    this._mouseMovement.y += event.movementY * sensitivity * (this._invertY ? -1 : 1);

    this.emit('mousemove', {
      movementX: event.movementX * sensitivity,
      movementY: event.movementY * sensitivity * (this._invertY ? -1 : 1),
    });
  }

  _onPointerLockChange() {
    const wasLocked = this._pointerLocked;
    this._pointerLocked = document.pointerLockElement !== null;

    if (wasLocked && !this._pointerLocked) {
      // Pointer lock was lost
      this.emit('pointerLockLost');
      // Auto-pause when losing pointer lock during gameplay
      if (!this._paused && !this._pauseLocked) {
        this.pause();
      }
    } else if (!wasLocked && this._pointerLocked) {
      this.emit('pointerLockAcquired');
    }
  }

  _onPointerLockError() {
    this.emit('pointerLockError');
  }

  _onBlur() {
    // Clear all inputs when window loses focus
    this._keysDown.clear();
    this._actionsDown.clear();
    this._mouseButtons.clear();
    this._mouseMovement = { x: 0, y: 0 };
  }

  // Public API

  /**
   * Check if an action is currently active
   * @param {string} action - Action name from InputActions
   * @returns {boolean}
   */
  isActionDown(action) {
    return this._actionsDown.has(action);
  }

  /**
   * Check if a specific key is down
   * @param {string} code - Key code
   * @returns {boolean}
   */
  isKeyDown(code) {
    return this._keysDown.has(code);
  }

  /**
   * Check if a mouse button is down
   * @param {number} button - Button number (0=left, 1=middle, 2=right)
   * @returns {boolean}
   */
  isMouseButtonDown(button) {
    return this._mouseButtons.has(button);
  }

  /**
   * Get accumulated mouse movement and reset it
   * @returns {{x: number, y: number}}
   */
  consumeMouseMovement() {
    const movement = { ...this._mouseMovement };
    this._mouseMovement = { x: 0, y: 0 };
    return movement;
  }

  /**
   * Get movement input as a vector
   * @returns {{x: number, z: number}}
   */
  getMovementInput() {
    let x = 0;
    let z = 0;

    if (this.isActionDown(InputActions.MOVE_FORWARD)) {
      z -= 1;
    }
    if (this.isActionDown(InputActions.MOVE_BACKWARD)) {
      z += 1;
    }
    if (this.isActionDown(InputActions.MOVE_LEFT)) {
      x -= 1;
    }
    if (this.isActionDown(InputActions.MOVE_RIGHT)) {
      x += 1;
    }

    // Normalize diagonal movement
    if (x !== 0 && z !== 0) {
      const len = Math.sqrt(x * x + z * z);
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  /**
   * Check if sprinting
   * @returns {boolean}
   */
  isSprinting() {
    return this.isActionDown(InputActions.SPRINT);
  }

  // Pause functionality

  /**
   * Check if game is paused
   * @returns {boolean}
   */
  get isPaused() {
    return this._paused;
  }

  /**
   * Pause the game
   */
  pause() {
    if (this._paused || this._pauseLocked) {
      return;
    }

    this._paused = true;
    this.emit('pause');

    // Release pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this._paused || this._pauseLocked) {
      return;
    }

    this._paused = false;
    this.emit('resume');
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this._paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Lock/unlock pause functionality
   * @param {boolean} locked - Whether to lock pause
   */
  setPauseLocked(locked) {
    this._pauseLocked = locked;
  }

  /**
   * Check if pointer is locked
   * @returns {boolean}
   */
  get isPointerLocked() {
    return this._pointerLocked;
  }

  /**
   * Request pointer lock
   * @param {Element} [element=document.body]
   */
  requestPointerLock(element = document.body) {
    if (element.requestPointerLock) {
      element.requestPointerLock();
    }
  }

  /**
   * Exit pointer lock
   */
  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  // Settings

  /**
   * Set mouse sensitivity
   * @param {number} sensitivity
   */
  setMouseSensitivity(sensitivity) {
    this._mouseSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  /**
   * Get mouse sensitivity
   * @returns {number}
   */
  get mouseSensitivity() {
    return this._mouseSensitivity;
  }

  /**
   * Set Y axis inversion
   * @param {boolean} invert
   */
  setInvertY(invert) {
    this._invertY = invert;
  }

  /**
   * Check if Y axis is inverted
   * @returns {boolean}
   */
  get invertY() {
    return this._invertY;
  }

  /**
   * Set a key binding
   * @param {string} code - Key code
   * @param {string} action - Action name
   */
  setKeyBinding(code, action) {
    this._keyBindings[code] = action;
  }

  /**
   * Get key binding for an action
   * @param {string} action - Action name
   * @returns {string[]} Key codes bound to this action
   */
  getKeysForAction(action) {
    return Object.entries(this._keyBindings)
      .filter(([_, a]) => a === action)
      .map(([code]) => code);
  }

  /**
   * Check if action is repeatable when held
   * @param {string} code - Key code
   * @returns {boolean}
   */
  _isRepeatableAction(code) {
    const action = this._keyBindings[code];
    return [
      InputActions.MOVE_FORWARD,
      InputActions.MOVE_BACKWARD,
      InputActions.MOVE_LEFT,
      InputActions.MOVE_RIGHT,
      InputActions.SPRINT,
    ].includes(action);
  }

  /**
   * Reset all input state
   */
  reset() {
    this._keysDown.clear();
    this._actionsDown.clear();
    this._mouseButtons.clear();
    this._mouseMovement = { x: 0, y: 0 };
    this._paused = false;
  }
}

// Singleton instance
let inputManagerInstance = null;

/**
 * Get the global input manager instance
 * @returns {InputManager}
 */
export function getInputManager() {
  if (!inputManagerInstance) {
    inputManagerInstance = new InputManager();
  }
  return inputManagerInstance;
}

/**
 * Reset the global input manager
 */
export function resetInputManager() {
  if (inputManagerInstance) {
    inputManagerInstance.destroy();
    inputManagerInstance.removeAllListeners();
  }
  inputManagerInstance = null;
}

export default InputManager;
