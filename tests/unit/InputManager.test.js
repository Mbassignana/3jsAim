/**
 * Unit tests for InputManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  InputManager,
  InputActions,
  DEFAULT_KEY_BINDINGS,
  getInputManager,
  resetInputManager,
} from '@/game/InputManager.js';

describe('InputManager', () => {
  let manager;
  let mockTarget;

  beforeEach(() => {
    resetInputManager();
    mockTarget = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    manager = new InputManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(manager.isPaused).toBe(false);
      expect(manager.mouseSensitivity).toBe(1.0);
      expect(manager.invertY).toBe(false);
    });

    it('should accept custom settings', () => {
      const custom = new InputManager({
        mouseSensitivity: 2.0,
        invertY: true,
      });
      expect(custom.mouseSensitivity).toBe(2.0);
      expect(custom.invertY).toBe(true);
    });

    it('should merge custom key bindings', () => {
      const custom = new InputManager({
        keyBindings: { KeyP: InputActions.PAUSE },
      });
      expect(custom._keyBindings.KeyP).toBe(InputActions.PAUSE);
      expect(custom._keyBindings.KeyW).toBe(InputActions.MOVE_FORWARD);
    });
  });

  describe('init', () => {
    it('should attach event listeners', () => {
      manager.init(mockTarget);
      expect(mockTarget.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      expect(mockTarget.addEventListener).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      );
      expect(mockTarget.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
    });
  });

  describe('destroy', () => {
    it('should remove event listeners', () => {
      manager.init(mockTarget);
      manager.destroy();
      expect(mockTarget.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('key events', () => {
    beforeEach(() => {
      manager.init(mockTarget);
    });

    it('should track key down', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];

      handler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });
      expect(manager.isKeyDown('KeyW')).toBe(true);
      expect(manager.isActionDown(InputActions.MOVE_FORWARD)).toBe(true);
    });

    it('should track key up', () => {
      const keydownHandler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      const keyupHandler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keyup'
      )[1];

      keydownHandler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });
      keyupHandler({ code: 'KeyW' });

      expect(manager.isKeyDown('KeyW')).toBe(false);
      expect(manager.isActionDown(InputActions.MOVE_FORWARD)).toBe(false);
    });

    it('should emit actionDown event', () => {
      const callback = vi.fn();
      manager.on('actionDown', callback);

      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      handler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });

      expect(callback).toHaveBeenCalledWith({
        action: InputActions.MOVE_FORWARD,
        key: 'KeyW',
      });
    });

    it('should ignore input from INPUT elements', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];

      handler({ code: 'KeyW', target: { tagName: 'INPUT' }, preventDefault: vi.fn() });
      expect(manager.isKeyDown('KeyW')).toBe(false);
    });

    it('should not process keys while paused (except pause key)', () => {
      manager.pause();

      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      handler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });

      expect(manager.isKeyDown('KeyW')).toBe(false);
    });
  });

  describe('getMovementInput', () => {
    beforeEach(() => {
      manager.init(mockTarget);
    });

    it('should return zero when no keys pressed', () => {
      const input = manager.getMovementInput();
      expect(input.x).toBe(0);
      expect(input.z).toBe(0);
    });

    it('should return forward movement', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      handler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });

      const input = manager.getMovementInput();
      expect(input.z).toBe(-1);
    });

    it('should normalize diagonal movement', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      handler({ code: 'KeyW', target: { tagName: 'DIV' }, preventDefault: vi.fn() });
      handler({ code: 'KeyD', target: { tagName: 'DIV' }, preventDefault: vi.fn() });

      const input = manager.getMovementInput();
      const length = Math.sqrt(input.x * input.x + input.z * input.z);
      expect(length).toBeCloseTo(1, 5);
    });
  });

  describe('pause functionality', () => {
    it('should pause', () => {
      const callback = vi.fn();
      manager.on('pause', callback);
      manager.pause();
      expect(manager.isPaused).toBe(true);
      expect(callback).toHaveBeenCalled();
    });

    it('should resume', () => {
      manager.pause();
      const callback = vi.fn();
      manager.on('resume', callback);
      manager.resume();
      expect(manager.isPaused).toBe(false);
      expect(callback).toHaveBeenCalled();
    });

    it('should toggle pause', () => {
      manager.togglePause();
      expect(manager.isPaused).toBe(true);
      manager.togglePause();
      expect(manager.isPaused).toBe(false);
    });

    it('should respect pause lock', () => {
      manager.setPauseLocked(true);
      manager.pause();
      expect(manager.isPaused).toBe(false);
    });

    it('should handle pause key', () => {
      manager.init(mockTarget);
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];

      handler({ code: 'Escape', target: { tagName: 'DIV' }, preventDefault: vi.fn() });
      expect(manager.isPaused).toBe(true);
    });
  });

  describe('mouse input', () => {
    beforeEach(() => {
      manager.init(mockTarget);
    });

    it('should track mouse buttons', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'mousedown'
      )[1];
      handler({ button: 0 });
      expect(manager.isMouseButtonDown(0)).toBe(true);
    });

    it('should emit shoot on left click', () => {
      const callback = vi.fn();
      manager.on('shoot', callback);

      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'mousedown'
      )[1];
      handler({ button: 0 });

      expect(callback).toHaveBeenCalled();
    });

    it('should not process mouse while paused', () => {
      manager.pause();
      const callback = vi.fn();
      manager.on('shoot', callback);

      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'mousedown'
      )[1];
      handler({ button: 0 });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('consumeMouseMovement', () => {
    it('should return accumulated movement and reset', () => {
      manager._mouseMovement = { x: 10, y: 20 };
      const movement = manager.consumeMouseMovement();
      expect(movement.x).toBe(10);
      expect(movement.y).toBe(20);
      expect(manager._mouseMovement.x).toBe(0);
    });
  });

  describe('settings', () => {
    it('should clamp mouse sensitivity', () => {
      manager.setMouseSensitivity(10);
      expect(manager.mouseSensitivity).toBe(5.0);
      manager.setMouseSensitivity(-1);
      expect(manager.mouseSensitivity).toBe(0.1);
    });

    it('should set invert Y', () => {
      manager.setInvertY(true);
      expect(manager.invertY).toBe(true);
    });

    it('should set key bindings', () => {
      manager.setKeyBinding('KeyP', InputActions.PAUSE);
      expect(manager._keyBindings.KeyP).toBe(InputActions.PAUSE);
    });

    it('should get keys for action', () => {
      const keys = manager.getKeysForAction(InputActions.MOVE_FORWARD);
      expect(keys).toContain('KeyW');
      expect(keys).toContain('ArrowUp');
    });
  });

  describe('isSprinting', () => {
    beforeEach(() => {
      manager.init(mockTarget);
    });

    it('should detect sprinting', () => {
      const handler = mockTarget.addEventListener.mock.calls.find(
        (c) => c[0] === 'keydown'
      )[1];
      handler({ code: 'ShiftLeft', target: { tagName: 'DIV' }, preventDefault: vi.fn() });
      expect(manager.isSprinting()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all input state', () => {
      manager._keysDown.add('KeyW');
      manager._actionsDown.add(InputActions.MOVE_FORWARD);
      manager._paused = true;

      manager.reset();

      expect(manager._keysDown.size).toBe(0);
      expect(manager._actionsDown.size).toBe(0);
      expect(manager._paused).toBe(false);
    });
  });
});

describe('DEFAULT_KEY_BINDINGS', () => {
  it('should have WASD keys', () => {
    expect(DEFAULT_KEY_BINDINGS.KeyW).toBe(InputActions.MOVE_FORWARD);
    expect(DEFAULT_KEY_BINDINGS.KeyA).toBe(InputActions.MOVE_LEFT);
    expect(DEFAULT_KEY_BINDINGS.KeyS).toBe(InputActions.MOVE_BACKWARD);
    expect(DEFAULT_KEY_BINDINGS.KeyD).toBe(InputActions.MOVE_RIGHT);
  });

  it('should have escape for pause', () => {
    expect(DEFAULT_KEY_BINDINGS.Escape).toBe(InputActions.PAUSE);
  });
});

describe('Global InputManager', () => {
  beforeEach(() => {
    resetInputManager();
  });

  it('should return same instance', () => {
    const i1 = getInputManager();
    const i2 = getInputManager();
    expect(i1).toBe(i2);
  });

  it('should reset properly', () => {
    const i1 = getInputManager();
    resetInputManager();
    const i2 = getInputManager();
    expect(i2).not.toBe(i1);
  });
});
