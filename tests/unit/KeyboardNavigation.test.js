/**
 * Unit tests for KeyboardNavigation
 * Tests keyboard-only navigation for menus and accessibility features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  KeyboardNavigation,
  NavigationKeys,
  FocusStyles,
  getKeyboardNavigation,
  resetKeyboardNavigation,
} from '../../src/accessibility/KeyboardNavigation.js';

// Mock DOM elements
function createMockButton(id = 'btn') {
  const btn = {
    id,
    tagName: 'BUTTON',
    tabIndex: 0,
    style: {},
    focus: vi.fn(),
    click: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    getAttribute: vi.fn(),
  };
  return btn;
}

function createMockDiv(id = 'div') {
  return {
    id,
    tagName: 'DIV',
    tabIndex: -1,
    style: {},
    focus: vi.fn(),
    click: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    getAttribute: vi.fn(),
  };
}

describe('KeyboardNavigation', () => {
  let nav;

  beforeEach(() => {
    resetKeyboardNavigation();
    nav = new KeyboardNavigation();
  });

  afterEach(() => {
    resetKeyboardNavigation();
  });

  // ==========================================================================
  // NavigationKeys
  // ==========================================================================
  describe('NavigationKeys', () => {
    it('should define all navigation keys', () => {
      expect(NavigationKeys.UP).toBe('ArrowUp');
      expect(NavigationKeys.DOWN).toBe('ArrowDown');
      expect(NavigationKeys.LEFT).toBe('ArrowLeft');
      expect(NavigationKeys.RIGHT).toBe('ArrowRight');
      expect(NavigationKeys.ENTER).toBe('Enter');
      expect(NavigationKeys.SPACE).toBe(' ');
      expect(NavigationKeys.TAB).toBe('Tab');
      expect(NavigationKeys.ESCAPE).toBe('Escape');
      expect(NavigationKeys.HOME).toBe('Home');
      expect(NavigationKeys.END).toBe('End');
    });
  });

  // ==========================================================================
  // FocusStyles
  // ==========================================================================
  describe('FocusStyles', () => {
    it('should define default focus style', () => {
      expect(FocusStyles.DEFAULT).toBeDefined();
      expect(FocusStyles.DEFAULT.outline).toContain('#ff6b00');
    });

    it('should define high contrast focus style', () => {
      expect(FocusStyles.HIGH_CONTRAST).toBeDefined();
      expect(FocusStyles.HIGH_CONTRAST.outline).toContain('#ffffff');
    });
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(nav.isInitialized()).toBe(false);
      expect(nav.isEnabled()).toBe(true);
      expect(nav.getActiveGroup()).toBeNull();
    });
  });

  // ==========================================================================
  // init()
  // ==========================================================================
  describe('init()', () => {
    it('should initialize navigation', () => {
      nav.init({ autoRegister: false });
      expect(nav.isInitialized()).toBe(true);
    });

    it('should emit navigation:init event', () => {
      const callback = vi.fn();
      nav.on('navigation:init', callback);

      nav.init({ autoRegister: false });

      expect(callback).toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', () => {
      const callback = vi.fn();
      nav.on('navigation:init', callback);

      nav.init({ autoRegister: false });
      nav.init({ autoRegister: false });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // setEnabled() / isEnabled()
  // ==========================================================================
  describe('setEnabled()', () => {
    it('should enable/disable navigation', () => {
      nav.setEnabled(false);
      expect(nav.isEnabled()).toBe(false);

      nav.setEnabled(true);
      expect(nav.isEnabled()).toBe(true);
    });

    it('should emit navigation:enabled event', () => {
      const callback = vi.fn();
      nav.on('navigation:enabled', callback);

      nav.setEnabled(false);

      expect(callback).toHaveBeenCalledWith({ enabled: false });
    });
  });

  // ==========================================================================
  // Group Management
  // ==========================================================================
  describe('createGroup()', () => {
    it('should create a navigation group', () => {
      const group = nav.createGroup('menu');

      expect(group).toBeDefined();
      expect(group.id).toBe('menu');
      expect(group.elements).toEqual([]);
      expect(group.currentIndex).toBe(0);
    });

    it('should respect wrap option', () => {
      const group = nav.createGroup('menu', { wrap: false });
      expect(group.wrap).toBe(false);
    });

    it('should respect orientation option', () => {
      const group = nav.createGroup('menu', { orientation: 'horizontal' });
      expect(group.orientation).toBe('horizontal');
    });

    it('should emit group:created event', () => {
      const callback = vi.fn();
      nav.on('group:created', callback);

      nav.createGroup('menu');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'menu',
        })
      );
    });
  });

  describe('getGroup()', () => {
    it('should return existing group', () => {
      nav.createGroup('menu');
      const group = nav.getGroup('menu');

      expect(group).toBeDefined();
      expect(group.id).toBe('menu');
    });

    it('should return null for non-existent group', () => {
      expect(nav.getGroup('unknown')).toBeNull();
    });
  });

  describe('removeGroup()', () => {
    it('should remove a group', () => {
      nav.createGroup('menu');
      nav.removeGroup('menu');

      expect(nav.getGroup('menu')).toBeNull();
    });

    it('should emit group:removed event', () => {
      const callback = vi.fn();
      nav.on('group:removed', callback);

      nav.createGroup('menu');
      nav.removeGroup('menu');

      expect(callback).toHaveBeenCalledWith({ groupId: 'menu' });
    });

    it('should clear active group if removed', () => {
      nav.createGroup('menu');
      nav.setActiveGroup('menu');
      nav.removeGroup('menu');

      expect(nav.getActiveGroup()).toBeNull();
    });
  });

  describe('setActiveGroup()', () => {
    it('should set active group', () => {
      nav.createGroup('menu');
      nav.setActiveGroup('menu');

      expect(nav.getActiveGroup()).toBe('menu');
    });

    it('should warn for non-existent group', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      nav.setActiveGroup('unknown');

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should emit group:activated event', () => {
      const callback = vi.fn();
      nav.on('group:activated', callback);

      nav.createGroup('menu');
      nav.setActiveGroup('menu');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'menu',
          previousGroup: null,
        })
      );
    });
  });

  // ==========================================================================
  // Element Registration
  // ==========================================================================
  describe('registerElement()', () => {
    it('should register an element to a group', () => {
      const btn = createMockButton('btn1');

      nav.createGroup('menu');
      const element = nav.registerElement(btn, 'menu');

      expect(element.element).toBe(btn);
      expect(element.group).toBe('menu');
    });

    it('should create group if it does not exist', () => {
      const btn = createMockButton('btn1');

      nav.registerElement(btn, 'newGroup');

      expect(nav.getGroup('newGroup')).not.toBeNull();
    });

    it('should throw error for null element', () => {
      expect(() => nav.registerElement(null, 'menu')).toThrow('Element is required');
    });

    it('should set up ARIA attributes', () => {
      const btn = createMockButton('btn1');

      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');

      expect(btn.setAttribute).toHaveBeenCalledWith('data-nav-group', 'menu');
    });

    it('should respect order option', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');
      const btn3 = createMockButton('btn3');

      nav.createGroup('menu');
      nav.registerElement(btn2, 'menu', { order: 1 });
      nav.registerElement(btn1, 'menu', { order: 0 });
      nav.registerElement(btn3, 'menu', { order: 2 });

      const group = nav.getGroup('menu');
      expect(group.elements[0].element).toBe(btn1);
      expect(group.elements[1].element).toBe(btn2);
      expect(group.elements[2].element).toBe(btn3);
    });

    it('should emit element:registered event', () => {
      const callback = vi.fn();
      nav.on('element:registered', callback);

      const btn = createMockButton('btn1');
      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'menu',
        })
      );
    });
  });

  describe('unregisterElement()', () => {
    it('should unregister an element', () => {
      const btn = createMockButton('btn1');

      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.unregisterElement(btn, 'menu');

      const group = nav.getGroup('menu');
      expect(group.elements.length).toBe(0);
    });

    it('should emit element:unregistered event', () => {
      const callback = vi.fn();
      nav.on('element:unregistered', callback);

      const btn = createMockButton('btn1');
      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.unregisterElement(btn, 'menu');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'menu',
        })
      );
    });
  });

  // ==========================================================================
  // Navigation
  // ==========================================================================
  describe('navigateNext()', () => {
    it('should move to next element', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');

      nav.navigateNext();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(1);
      expect(btn2.focus).toHaveBeenCalled();
    });

    it('should wrap to first element when at end', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu', { wrap: true });
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');
      nav.focusIndex('menu', 1);

      nav.navigateNext();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(0);
    });

    it('should not wrap if wrap is false', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu', { wrap: false });
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');
      nav.focusIndex('menu', 1);

      nav.navigateNext();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(1);
    });
  });

  describe('navigatePrevious()', () => {
    it('should move to previous element', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');
      nav.focusIndex('menu', 1);

      nav.navigatePrevious();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(0);
    });

    it('should wrap to last element when at start', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu', { wrap: true });
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');

      nav.navigatePrevious();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(1);
    });
  });

  describe('navigateFirst()', () => {
    it('should move to first element', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');
      const btn3 = createMockButton('btn3');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.registerElement(btn3, 'menu');
      nav.setActiveGroup('menu');
      nav.focusIndex('menu', 2);

      nav.navigateFirst();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(0);
    });
  });

  describe('navigateLast()', () => {
    it('should move to last element', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');
      const btn3 = createMockButton('btn3');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.registerElement(btn3, 'menu');
      nav.setActiveGroup('menu');

      nav.navigateLast();

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(2);
    });
  });

  describe('focusIndex()', () => {
    it('should focus element at specific index', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');
      const btn3 = createMockButton('btn3');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.registerElement(btn3, 'menu');

      nav.focusIndex('menu', 1);

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(1);
      expect(btn2.focus).toHaveBeenCalled();
    });

    it('should ignore invalid index', () => {
      const btn1 = createMockButton('btn1');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');

      nav.focusIndex('menu', 5);

      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(0);
    });
  });

  describe('focusById()', () => {
    it('should focus element by ID', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu', { id: 'first' });
      nav.registerElement(btn2, 'menu', { id: 'second' });

      nav.focusById('second');

      expect(nav.getActiveGroup()).toBe('menu');
      const group = nav.getGroup('menu');
      expect(group.currentIndex).toBe(1);
    });
  });

  describe('getCurrentFocusedElement()', () => {
    it('should return currently focused element', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu', { id: 'first' });
      nav.registerElement(btn2, 'menu', { id: 'second' });
      nav.setActiveGroup('menu');
      nav.focusIndex('menu', 1);

      const current = nav.getCurrentFocusedElement();

      expect(current.id).toBe('second');
    });

    it('should return null if no active group', () => {
      expect(nav.getCurrentFocusedElement()).toBeNull();
    });
  });

  describe('activateCurrent()', () => {
    it('should click the current element', () => {
      const btn = createMockButton('btn1');

      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.setActiveGroup('menu');

      nav.activateCurrent();

      expect(btn.click).toHaveBeenCalled();
    });

    it('should emit element:activated event', () => {
      const callback = vi.fn();
      nav.on('element:activated', callback);

      const btn = createMockButton('btn1');
      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.setActiveGroup('menu');

      nav.activateCurrent();

      expect(callback).toHaveBeenCalled();
    });

    it('should emit element:beforeActivate event', () => {
      const callback = vi.fn();
      nav.on('element:beforeActivate', callback);

      const btn = createMockButton('btn1');
      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.setActiveGroup('menu');

      nav.activateCurrent();

      expect(callback).toHaveBeenCalled();
    });

    it('should allow cancelling activation', () => {
      const btn = createMockButton('btn1');
      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.setActiveGroup('menu');

      nav.on('element:beforeActivate', (event) => {
        event.cancelled = true;
      });

      nav.activateCurrent();

      expect(btn.click).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Focus Trap
  // ==========================================================================
  describe('enableFocusTrap()', () => {
    it('should enable focus trap', () => {
      const container = createMockDiv('container');

      nav.enableFocusTrap(container);

      expect(nav.isFocusTrapEnabled()).toBe(true);
    });

    it('should emit focusTrap:enabled event', () => {
      const callback = vi.fn();
      nav.on('focusTrap:enabled', callback);

      const container = createMockDiv('container');
      nav.enableFocusTrap(container);

      expect(callback).toHaveBeenCalledWith({ container });
    });
  });

  describe('disableFocusTrap()', () => {
    it('should disable focus trap', () => {
      const container = createMockDiv('container');

      nav.enableFocusTrap(container);
      nav.disableFocusTrap();

      expect(nav.isFocusTrapEnabled()).toBe(false);
    });

    it('should emit focusTrap:disabled event', () => {
      const callback = vi.fn();
      nav.on('focusTrap:disabled', callback);

      const container = createMockDiv('container');
      nav.enableFocusTrap(container);
      nav.disableFocusTrap();

      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Focus Styles
  // ==========================================================================
  describe('setFocusStyle()', () => {
    it('should set focus style', () => {
      nav.setFocusStyle('HIGH_CONTRAST');

      const style = nav.getFocusStyle();
      expect(style.outline).toContain('#ffffff');
    });

    it('should fall back to default for invalid style', () => {
      nav.setFocusStyle('INVALID');

      const style = nav.getFocusStyle();
      expect(style.outline).toContain('#ff6b00');
    });

    it('should emit focusStyle:changed event', () => {
      const callback = vi.fn();
      nav.on('focusStyle:changed', callback);

      nav.setFocusStyle('HIGH_CONTRAST');

      expect(callback).toHaveBeenCalledWith({ style: 'HIGH_CONTRAST' });
    });
  });

  describe('getFocusStyle()', () => {
    it('should return current focus style', () => {
      const style = nav.getFocusStyle();

      expect(style).toHaveProperty('outline');
      expect(style).toHaveProperty('outlineOffset');
      expect(style).toHaveProperty('boxShadow');
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================
  describe('static methods', () => {
    describe('getNavigationKeys()', () => {
      it('should return all navigation keys', () => {
        const keys = KeyboardNavigation.getNavigationKeys();

        expect(keys.UP).toBe('ArrowUp');
        expect(keys.DOWN).toBe('ArrowDown');
        expect(keys.ENTER).toBe('Enter');
      });
    });

    describe('getFocusStyles()', () => {
      it('should return all focus styles', () => {
        const styles = KeyboardNavigation.getFocusStyles();

        expect(styles.DEFAULT).toBeDefined();
        expect(styles.HIGH_CONTRAST).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('singleton', () => {
    afterEach(() => {
      resetKeyboardNavigation();
    });

    it('should return same instance', () => {
      const instance1 = getKeyboardNavigation();
      const instance2 = getKeyboardNavigation();

      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      const instance1 = getKeyboardNavigation();
      instance1.createGroup('test');

      resetKeyboardNavigation();

      const instance2 = getKeyboardNavigation();
      expect(instance2).not.toBe(instance1);
      expect(instance2.getGroup('test')).toBeNull();
    });
  });

  // ==========================================================================
  // destroy()
  // ==========================================================================
  describe('destroy()', () => {
    it('should clean up resources', () => {
      const btn = createMockButton('btn1');

      nav.createGroup('menu');
      nav.registerElement(btn, 'menu');
      nav.destroy();

      expect(nav.isInitialized()).toBe(false);
      expect(nav.getGroup('menu')).toBeNull();
    });

    it('should emit navigation:destroyed event', () => {
      const callback = vi.fn();
      nav.on('navigation:destroyed', callback);

      nav.destroy();

      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Navigation Events
  // ==========================================================================
  describe('navigation:moved event', () => {
    it('should emit when navigating', () => {
      const callback = vi.fn();
      nav.on('navigation:moved', callback);

      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.setActiveGroup('menu');

      nav.navigateNext();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'menu',
          fromIndex: 0,
          toIndex: 1,
        })
      );
    });
  });

  // ==========================================================================
  // Roving Tabindex
  // ==========================================================================
  describe('roving tabindex', () => {
    it('should update tabIndex when navigating', () => {
      const btn1 = createMockButton('btn1');
      const btn2 = createMockButton('btn2');
      const btn3 = createMockButton('btn3');

      nav.createGroup('menu');
      nav.registerElement(btn1, 'menu');
      nav.registerElement(btn2, 'menu');
      nav.registerElement(btn3, 'menu');
      nav.setActiveGroup('menu');

      nav.focusIndex('menu', 1);

      // The focused element should have tabIndex 0, others -1
      expect(btn1.tabIndex).toBe(-1);
      expect(btn2.tabIndex).toBe(0);
      expect(btn3.tabIndex).toBe(-1);
    });
  });
});
