/**
 * Unit tests for UIManager
 * Tests state transitions, score display, timer, and UI feedback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  UIManager,
  UIState,
  CrosshairTarget,
  PERFORMANCE_TIERS,
  TIMER_THRESHOLDS,
} from '@/ui/UIManager.js';
import { resetEventBus } from '@/utils/EventEmitter.js';

// Create mock DOM elements
function createMockElements() {
  return {
    menu: {
      style: { display: 'none' },
    },
    crosshair: {
      style: { borderColor: '', boxShadow: '' },
      className: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    },
    score: {
      style: { color: '', transform: '' },
      textContent: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    },
    timer: {
      style: { color: '', animation: '' },
      textContent: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    },
    endScreen: {
      style: { display: 'none' },
    },
    finalScore: {
      textContent: '',
      appendChild: vi.fn(),
    },
  };
}

describe('UIManager', () => {
  let manager;
  let mockElements;

  beforeEach(() => {
    resetEventBus();
    mockElements = createMockElements();
    manager = new UIManager({ elements: mockElements });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(manager.currentState).toBe(UIState.MENU);
    });

    it('should initialize with zero score', () => {
      expect(manager.score).toBe(0);
    });

    it('should initialize with default time', () => {
      expect(manager.time).toBe(120);
    });

    it('should accept custom default time', () => {
      const customManager = new UIManager({ defaultTime: 60 });
      expect(customManager.time).toBe(60);
    });

    it('should work without DOM elements', () => {
      const noElementsManager = new UIManager();
      expect(noElementsManager.currentState).toBe(UIState.MENU);
    });

    it('should not be initialized until init() is called', () => {
      expect(manager.isInitialized()).toBe(false);
    });
  });

  describe('init', () => {
    it('should set initialized flag', () => {
      manager.init();
      expect(manager.isInitialized()).toBe(true);
    });

    it('should emit init event', () => {
      const callback = vi.fn();
      manager.on('ui:init', callback);
      manager.init();
      expect(callback).toHaveBeenCalled();
    });

    it('should show menu on init', () => {
      manager.init();
      expect(manager.currentState).toBe(UIState.MENU);
    });

    it('should not re-initialize', () => {
      const callback = vi.fn();
      manager.on('ui:init', callback);
      manager.init();
      manager.init();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================
  describe('state transitions', () => {
    describe('showMenu', () => {
      it('should set state to MENU', () => {
        manager._currentState = UIState.GAME;
        manager.showMenu();
        expect(manager.currentState).toBe(UIState.MENU);
      });

      it('should show menu element', () => {
        manager.showMenu();
        expect(mockElements.menu.style.display).toBe('block');
      });

      it('should hide end screen', () => {
        mockElements.endScreen.style.display = 'block';
        manager.showMenu();
        expect(mockElements.endScreen.style.display).toBe('none');
      });

      it('should hide game UI elements', () => {
        manager.showMenu();
        expect(mockElements.crosshair.classList.add).toHaveBeenCalledWith('hidden');
        expect(mockElements.score.classList.add).toHaveBeenCalledWith('hidden');
        expect(mockElements.timer.classList.add).toHaveBeenCalledWith('hidden');
      });

      it('should emit stateChange event', () => {
        const callback = vi.fn();
        manager.on('ui:stateChange', callback);
        manager._currentState = UIState.GAME;
        manager.showMenu();
        expect(callback).toHaveBeenCalledWith({
          from: UIState.GAME,
          to: UIState.MENU,
        });
      });

      it('should emit showMenu event', () => {
        const callback = vi.fn();
        manager.on('ui:showMenu', callback);
        manager.showMenu();
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('showGameUI', () => {
      it('should set state to GAME', () => {
        manager.showGameUI();
        expect(manager.currentState).toBe(UIState.GAME);
      });

      it('should hide menu element', () => {
        mockElements.menu.style.display = 'block';
        manager.showGameUI();
        expect(mockElements.menu.style.display).toBe('none');
      });

      it('should show crosshair', () => {
        manager.showGameUI();
        expect(mockElements.crosshair.classList.remove).toHaveBeenCalledWith('hidden');
      });

      it('should show score', () => {
        manager.showGameUI();
        expect(mockElements.score.classList.remove).toHaveBeenCalledWith('hidden');
      });

      it('should show timer', () => {
        manager.showGameUI();
        expect(mockElements.timer.classList.remove).toHaveBeenCalledWith('hidden');
      });

      it('should emit stateChange event', () => {
        const callback = vi.fn();
        manager.on('ui:stateChange', callback);
        manager.showGameUI();
        expect(callback).toHaveBeenCalledWith({
          from: UIState.MENU,
          to: UIState.GAME,
        });
      });

      it('should emit showGame event', () => {
        const callback = vi.fn();
        manager.on('ui:showGame', callback);
        manager.showGameUI();
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('showEndScreen', () => {
      it('should set state to END', () => {
        manager.showEndScreen(50);
        expect(manager.currentState).toBe(UIState.END);
      });

      it('should show end screen element', () => {
        manager.showEndScreen(50);
        expect(mockElements.endScreen.style.display).toBe('block');
      });

      it('should hide menu', () => {
        mockElements.menu.style.display = 'block';
        manager.showEndScreen(50);
        expect(mockElements.menu.style.display).toBe('none');
      });

      it('should hide game UI elements', () => {
        manager.showEndScreen(50);
        expect(mockElements.crosshair.classList.add).toHaveBeenCalledWith('hidden');
      });

      it('should emit stateChange event', () => {
        const callback = vi.fn();
        manager.on('ui:stateChange', callback);
        manager.showEndScreen(50);
        expect(callback).toHaveBeenCalledWith({
          from: UIState.MENU,
          to: UIState.END,
        });
      });

      it('should emit showEnd event with score', () => {
        const callback = vi.fn();
        manager.on('ui:showEnd', callback);
        manager.showEndScreen(75);
        expect(callback).toHaveBeenCalledWith({ finalScore: 75 });
      });
    });

    describe('isInState', () => {
      it('should return true for current state', () => {
        manager.showGameUI();
        expect(manager.isInState(UIState.GAME)).toBe(true);
      });

      it('should return false for non-current state', () => {
        manager.showMenu();
        expect(manager.isInState(UIState.GAME)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Score Display
  // ==========================================================================
  describe('score display', () => {
    describe('updateScore', () => {
      it('should update internal score', () => {
        manager.updateScore(50);
        expect(manager.score).toBe(50);
      });

      it('should update score element text', () => {
        manager.updateScore(50);
        expect(mockElements.score.textContent).toBe('Score: 50');
      });

      it('should emit scoreUpdate event', () => {
        const callback = vi.fn();
        manager.on('ui:scoreUpdate', callback);
        manager.updateScore(50);
        expect(callback).toHaveBeenCalledWith({
          previousScore: 0,
          newScore: 50,
          change: 50,
        });
      });

      it('should calculate correct change for decrease', () => {
        manager.updateScore(100);
        const callback = vi.fn();
        manager.on('ui:scoreUpdate', callback);
        manager.updateScore(80);
        expect(callback).toHaveBeenCalledWith({
          previousScore: 100,
          newScore: 80,
          change: -20,
        });
      });

      it('should handle negative scores', () => {
        manager.updateScore(-10);
        expect(manager.score).toBe(-10);
        expect(mockElements.score.textContent).toBe('Score: -10');
      });
    });

    describe('addScore', () => {
      it('should add positive points', () => {
        manager.addScore(10);
        expect(manager.score).toBe(10);
      });

      it('should add negative points', () => {
        manager.addScore(50);
        manager.addScore(-10);
        expect(manager.score).toBe(40);
      });

      it('should accumulate points', () => {
        manager.addScore(10);
        manager.addScore(20);
        manager.addScore(5);
        expect(manager.score).toBe(35);
      });
    });

    describe('resetScore', () => {
      it('should reset score to zero', () => {
        manager.addScore(100);
        manager.resetScore();
        expect(manager.score).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Timer Display
  // ==========================================================================
  describe('timer display', () => {
    describe('updateTimer', () => {
      it('should update internal time', () => {
        manager.updateTimer(60);
        expect(manager.time).toBe(60);
      });

      it('should update timer element text', () => {
        manager.updateTimer(65);
        expect(mockElements.timer.textContent).toBe('Time: 1:05');
      });

      it('should not allow negative time', () => {
        manager.updateTimer(-10);
        expect(manager.time).toBe(0);
      });

      it('should emit timerUpdate event', () => {
        const callback = vi.fn();
        manager.on('ui:timerUpdate', callback);
        manager.updateTimer(60);
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            newTime: 60,
            formatted: '1:00',
          })
        );
      });
    });

    describe('formatTime', () => {
      it('should format seconds correctly', () => {
        expect(manager.formatTime(0)).toBe('0:00');
        expect(manager.formatTime(5)).toBe('0:05');
        expect(manager.formatTime(30)).toBe('0:30');
        expect(manager.formatTime(60)).toBe('1:00');
        expect(manager.formatTime(65)).toBe('1:05');
        expect(manager.formatTime(120)).toBe('2:00');
        expect(manager.formatTime(125)).toBe('2:05');
      });

      it('should handle large times', () => {
        expect(manager.formatTime(3661)).toBe('61:01');
      });

      it('should handle negative times', () => {
        expect(manager.formatTime(-10)).toBe('0:00');
      });
    });

    describe('getTimerState', () => {
      it('should return normal for high time', () => {
        expect(manager.getTimerState(60)).toBe('normal');
      });

      it('should return warning at threshold', () => {
        expect(manager.getTimerState(TIMER_THRESHOLDS.warning)).toBe('warning');
      });

      it('should return warning below threshold', () => {
        expect(manager.getTimerState(25)).toBe('warning');
      });

      it('should return critical at critical threshold', () => {
        expect(manager.getTimerState(TIMER_THRESHOLDS.critical)).toBe('critical');
      });

      it('should return critical below critical threshold', () => {
        expect(manager.getTimerState(5)).toBe('critical');
      });
    });

    describe('timer styling', () => {
      it('should apply normal style for high time', () => {
        manager.updateTimer(60);
        expect(mockElements.timer.style.color).toBe('#fff');
        expect(mockElements.timer.style.animation).toBe('none');
      });

      it('should apply warning style', () => {
        manager.updateTimer(25);
        expect(mockElements.timer.style.color).toBe('#ff4444');
        expect(mockElements.timer.style.animation).toBe('none');
      });

      it('should apply critical style with animation', () => {
        manager.updateTimer(5);
        expect(mockElements.timer.style.color).toBe('#ff4444');
        expect(mockElements.timer.style.animation).toBe('pulse 1s infinite');
      });
    });
  });

  // ==========================================================================
  // Performance Messages
  // ==========================================================================
  describe('performance messages', () => {
    it('should return exceptional for score >= 100', () => {
      const message = manager.getPerformanceMessage(100);
      expect(message.tier).toBe(0);
      expect(message.emoji).toBe('🏆');
    });

    it('should return excellent for score >= 80', () => {
      const message = manager.getPerformanceMessage(85);
      expect(message.tier).toBe(1);
      expect(message.emoji).toBe('🎯');
    });

    it('should return good for score >= 60', () => {
      const message = manager.getPerformanceMessage(65);
      expect(message.tier).toBe(2);
      expect(message.emoji).toBe('👍');
    });

    it('should return not bad for score >= 40', () => {
      const message = manager.getPerformanceMessage(45);
      expect(message.tier).toBe(3);
      expect(message.emoji).toBe('😐');
    });

    it('should return better luck for score >= 20', () => {
      const message = manager.getPerformanceMessage(25);
      expect(message.tier).toBe(4);
      expect(message.emoji).toBe('😅');
    });

    it('should return practice for score >= 0', () => {
      const message = manager.getPerformanceMessage(10);
      expect(message.tier).toBe(5);
      expect(message.emoji).toBe('🎮');
    });

    it('should return animal message for negative score', () => {
      const message = manager.getPerformanceMessage(-5);
      expect(message.tier).toBe(6);
      expect(message.emoji).toBe('🐷');
    });

    it('should return message object with all properties', () => {
      const message = manager.getPerformanceMessage(50);
      expect(message.text).toBeDefined();
      expect(message.emoji).toBeDefined();
      expect(typeof message.tier).toBe('number');
    });
  });

  // ==========================================================================
  // Crosshair
  // ==========================================================================
  describe('crosshair', () => {
    describe('updateCrosshair', () => {
      it('should update crosshair target state', () => {
        manager.updateCrosshair(CrosshairTarget.CIRCLE);
        expect(manager.getCrosshairTarget()).toBe(CrosshairTarget.CIRCLE);
      });

      it('should apply green style for circle target', () => {
        manager.updateCrosshair(CrosshairTarget.CIRCLE);
        expect(mockElements.crosshair.style.borderColor).toBe('#00ff00');
      });

      it('should apply red style for NPC target', () => {
        manager.updateCrosshair(CrosshairTarget.NPC);
        expect(mockElements.crosshair.style.borderColor).toBe('#ff0000');
      });

      it('should apply white style for no target', () => {
        manager.updateCrosshair(null);
        expect(mockElements.crosshair.style.borderColor).toBe('#fff');
      });

      it('should reset className', () => {
        manager.updateCrosshair(CrosshairTarget.CIRCLE);
        expect(mockElements.crosshair.className).toBe('');
      });

      it('should emit crosshairUpdate event', () => {
        const callback = vi.fn();
        manager.on('ui:crosshairUpdate', callback);
        manager.updateCrosshair(CrosshairTarget.CIRCLE);
        expect(callback).toHaveBeenCalledWith({ targetType: CrosshairTarget.CIRCLE });
      });
    });

    describe('getCrosshairTarget', () => {
      it('should return current target', () => {
        manager.updateCrosshair(CrosshairTarget.NPC);
        expect(manager.getCrosshairTarget()).toBe(CrosshairTarget.NPC);
      });

      it('should return null for no target', () => {
        manager.updateCrosshair(null);
        expect(manager.getCrosshairTarget()).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Messages
  // ==========================================================================
  describe('messages', () => {
    describe('showMessage', () => {
      it('should emit showMessage event', () => {
        const callback = vi.fn();
        manager.on('ui:showMessage', callback);
        manager.showMessage('Test message');
        expect(callback).toHaveBeenCalledWith({
          text: 'Test message',
          duration: 2000,
          color: '#fff',
        });
      });

      it('should accept custom options', () => {
        const callback = vi.fn();
        manager.on('ui:showMessage', callback);
        manager.showMessage('Custom', { duration: 5000, color: '#ff0000' });
        expect(callback).toHaveBeenCalledWith({
          text: 'Custom',
          duration: 5000,
          color: '#ff0000',
        });
      });
    });

    describe('showHitIndicator', () => {
      it('should emit showHitIndicator event for positive hit', () => {
        const callback = vi.fn();
        manager.on('ui:showHitIndicator', callback);
        manager.showHitIndicator(100, 200, true);
        expect(callback).toHaveBeenCalledWith({
          x: 100,
          y: 200,
          isPositive: true,
          text: '+10',
        });
      });

      it('should emit showHitIndicator event for negative hit', () => {
        const callback = vi.fn();
        manager.on('ui:showHitIndicator', callback);
        manager.showHitIndicator(100, 200, false);
        expect(callback).toHaveBeenCalledWith({
          x: 100,
          y: 200,
          isPositive: false,
          text: '-1',
        });
      });
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================
  describe('getState', () => {
    it('should return complete state snapshot', () => {
      manager.updateScore(50);
      manager.updateTimer(60);
      manager.showGameUI();

      const state = manager.getState();
      expect(state.currentState).toBe(UIState.GAME);
      expect(state.score).toBe(50);
      expect(state.time).toBe(60);
      expect(state.formattedTime).toBe('1:00');
      expect(state.timerState).toBe('normal');
    });

    it('should include crosshair target', () => {
      manager.updateCrosshair(CrosshairTarget.CIRCLE);
      const state = manager.getState();
      expect(state.crosshairTarget).toBe(CrosshairTarget.CIRCLE);
    });

    it('should include initialized flag', () => {
      manager.init();
      const state = manager.getState();
      expect(state.initialized).toBe(true);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================
  describe('reset', () => {
    it('should reset score to zero', () => {
      manager.addScore(100);
      manager.reset();
      expect(manager.score).toBe(0);
    });

    it('should reset time to default', () => {
      manager.updateTimer(30);
      manager.reset();
      expect(manager.time).toBe(120);
    });

    it('should reset crosshair target', () => {
      manager.updateCrosshair(CrosshairTarget.CIRCLE);
      manager.reset();
      expect(manager.getCrosshairTarget()).toBeNull();
    });

    it('should show menu', () => {
      manager.showGameUI();
      manager.reset();
      expect(manager.currentState).toBe(UIState.MENU);
    });

    it('should update score element', () => {
      manager.addScore(100);
      manager.reset();
      expect(mockElements.score.textContent).toBe('Score: 0');
    });

    it('should emit reset event', () => {
      const callback = vi.fn();
      manager.on('ui:reset', callback);
      manager.reset();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Element Management
  // ==========================================================================
  describe('setElements', () => {
    it('should update elements', () => {
      const noElementsManager = new UIManager();
      const newElements = createMockElements();
      noElementsManager.setElements(newElements);

      noElementsManager.showMenu();
      expect(newElements.menu.style.display).toBe('block');
    });

    it('should merge with existing elements', () => {
      manager.setElements({ score: { textContent: '' } });
      manager.updateScore(100);
      // Original elements should still work
      expect(mockElements.menu).toBeDefined();
    });
  });

  // ==========================================================================
  // Without DOM Elements
  // ==========================================================================
  describe('without DOM elements', () => {
    it('should handle state changes without elements', () => {
      const noElementsManager = new UIManager();
      expect(() => noElementsManager.showMenu()).not.toThrow();
      expect(() => noElementsManager.showGameUI()).not.toThrow();
      expect(() => noElementsManager.showEndScreen(50)).not.toThrow();
    });

    it('should track state without elements', () => {
      const noElementsManager = new UIManager();
      noElementsManager.showGameUI();
      expect(noElementsManager.currentState).toBe(UIState.GAME);
    });

    it('should track score without elements', () => {
      const noElementsManager = new UIManager();
      noElementsManager.updateScore(100);
      expect(noElementsManager.score).toBe(100);
    });

    it('should track time without elements', () => {
      const noElementsManager = new UIManager();
      noElementsManager.updateTimer(60);
      expect(noElementsManager.time).toBe(60);
    });
  });
});

// ==========================================================================
// Exports Testing
// ==========================================================================
describe('module exports', () => {
  it('should export UIState enum', () => {
    expect(UIState.MENU).toBe('menu');
    expect(UIState.GAME).toBe('game');
    expect(UIState.END).toBe('end');
    expect(UIState.LOADING).toBe('loading');
  });

  it('should export CrosshairTarget enum', () => {
    expect(CrosshairTarget.NONE).toBeNull();
    expect(CrosshairTarget.CIRCLE).toBe('circle');
    expect(CrosshairTarget.NPC).toBe('npc');
  });

  it('should export PERFORMANCE_TIERS', () => {
    expect(Array.isArray(PERFORMANCE_TIERS)).toBe(true);
    expect(PERFORMANCE_TIERS.length).toBeGreaterThan(0);
  });

  it('should export TIMER_THRESHOLDS', () => {
    expect(TIMER_THRESHOLDS.warning).toBe(30);
    expect(TIMER_THRESHOLDS.critical).toBe(10);
  });
});
