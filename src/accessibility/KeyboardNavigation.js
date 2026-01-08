/**
 * KeyboardNavigation - Provides keyboard-only navigation for menus
 * Implements WAI-ARIA best practices for accessible navigation
 */

import { EventEmitter } from '../utils/EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} FocusableElement
 * @property {HTMLElement} element - The DOM element
 * @property {string} id - Unique identifier
 * @property {string} group - Navigation group (e.g., 'menu', 'settings')
 * @property {number} order - Tab order within group
 */

/**
 * @typedef {Object} NavigationGroup
 * @property {string} id - Group identifier
 * @property {FocusableElement[]} elements - Elements in the group
 * @property {number} currentIndex - Currently focused index
 * @property {boolean} wrap - Whether navigation wraps around
 * @property {string} orientation - 'horizontal', 'vertical', or 'both'
 */

// ==========================================================================
// Navigation Keys
// ==========================================================================

export const NavigationKeys = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  HOME: 'Home',
  END: 'End',
};

// ==========================================================================
// Focus Styles
// ==========================================================================

export const FocusStyles = {
  DEFAULT: {
    outline: '2px solid #ff6b00',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(255, 107, 0, 0.3)',
  },
  HIGH_CONTRAST: {
    outline: '3px solid #ffffff',
    outlineOffset: '3px',
    boxShadow: '0 0 0 6px #000000',
  },
};

// ==========================================================================
// KeyboardNavigation Class
// ==========================================================================

export class KeyboardNavigation extends EventEmitter {
  constructor() {
    super();

    /** @type {Map<string, NavigationGroup>} */
    this._groups = new Map();

    /** @type {string|null} */
    this._activeGroup = null;

    /** @type {HTMLElement|null} */
    this._lastFocusedElement = null;

    /** @type {boolean} */
    this._enabled = true;

    /** @type {boolean} */
    this._trapFocus = false;

    /** @type {HTMLElement|null} */
    this._trapContainer = null;

    /** @type {Object} */
    this._focusStyle = FocusStyles.DEFAULT;

    /** @type {boolean} */
    this._initialized = false;

    /** @type {Function|null} */
    this._keydownHandler = null;

    /** @type {Function|null} */
    this._focusinHandler = null;
  }

  /**
   * Initialize keyboard navigation
   * @param {Object} [options]
   * @param {boolean} [options.autoRegister=true] - Auto-register focusable elements
   */
  init(options = {}) {
    if (this._initialized) {
      return;
    }

    const { autoRegister = true } = options;

    this._setupEventListeners();

    if (autoRegister && typeof document !== 'undefined') {
      this._autoRegisterElements();
    }

    this._initialized = true;
    this.emit('navigation:init');
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Enable or disable keyboard navigation
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    this.emit('navigation:enabled', { enabled });
  }

  /**
   * Check if enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  // ==========================================================================
  // Group Management
  // ==========================================================================

  /**
   * Create a navigation group
   * @param {string} groupId - Unique group identifier
   * @param {Object} [options]
   * @param {boolean} [options.wrap=true] - Wrap navigation at ends
   * @param {string} [options.orientation='vertical'] - Navigation orientation
   * @returns {NavigationGroup}
   */
  createGroup(groupId, options = {}) {
    const { wrap = true, orientation = 'vertical' } = options;

    const group = {
      id: groupId,
      elements: [],
      currentIndex: 0,
      wrap,
      orientation,
    };

    this._groups.set(groupId, group);
    this.emit('group:created', { groupId, options });

    return group;
  }

  /**
   * Get a navigation group
   * @param {string} groupId
   * @returns {NavigationGroup|null}
   */
  getGroup(groupId) {
    return this._groups.get(groupId) || null;
  }

  /**
   * Remove a navigation group
   * @param {string} groupId
   */
  removeGroup(groupId) {
    if (this._groups.has(groupId)) {
      const group = this._groups.get(groupId);
      // Remove ARIA attributes from elements
      group.elements.forEach((item) => {
        this._removeAriaAttributes(item.element);
      });
      this._groups.delete(groupId);

      if (this._activeGroup === groupId) {
        this._activeGroup = null;
      }

      this.emit('group:removed', { groupId });
    }
  }

  /**
   * Set the active navigation group
   * @param {string|null} groupId
   */
  setActiveGroup(groupId) {
    if (groupId && !this._groups.has(groupId)) {
      console.warn(`Navigation group "${groupId}" does not exist`);
      return;
    }

    const previousGroup = this._activeGroup;
    this._activeGroup = groupId;

    this.emit('group:activated', { groupId, previousGroup });
  }

  /**
   * Get the active group
   * @returns {string|null}
   */
  getActiveGroup() {
    return this._activeGroup;
  }

  // ==========================================================================
  // Element Registration
  // ==========================================================================

  /**
   * Register a focusable element
   * @param {HTMLElement} element - DOM element
   * @param {string} groupId - Navigation group
   * @param {Object} [options]
   * @param {string} [options.id] - Element ID
   * @param {number} [options.order] - Tab order
   * @param {string} [options.label] - Accessible label
   * @returns {FocusableElement}
   */
  registerElement(element, groupId, options = {}) {
    if (!element) {
      throw new Error('Element is required');
    }

    // Create group if it doesn't exist
    if (!this._groups.has(groupId)) {
      this.createGroup(groupId);
    }

    const group = this._groups.get(groupId);
    const { id = `nav-${groupId}-${group.elements.length}`, order = group.elements.length, label } = options;

    const focusableElement = {
      element,
      id,
      group: groupId,
      order,
    };

    // Add to group, sorted by order
    group.elements.push(focusableElement);
    group.elements.sort((a, b) => a.order - b.order);

    // Set up ARIA attributes
    this._setupAriaAttributes(element, groupId, group.elements.length - 1, label);

    // Make element focusable if not already
    if (element.tabIndex < 0) {
      element.tabIndex = 0;
    }

    // Apply focus styles
    this._setupFocusStyles(element);

    this.emit('element:registered', { element: focusableElement, groupId });

    return focusableElement;
  }

  /**
   * Unregister a focusable element
   * @param {HTMLElement} element
   * @param {string} groupId
   */
  unregisterElement(element, groupId) {
    const group = this._groups.get(groupId);
    if (!group) return;

    const index = group.elements.findIndex((e) => e.element === element);
    if (index !== -1) {
      group.elements.splice(index, 1);
      this._removeAriaAttributes(element);
      this._removeFocusStyles(element);

      // Update indices
      if (group.currentIndex >= group.elements.length) {
        group.currentIndex = Math.max(0, group.elements.length - 1);
      }

      this.emit('element:unregistered', { element, groupId });
    }
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /**
   * Navigate to next element in group
   * @param {string} [groupId] - Group to navigate (default: active group)
   */
  navigateNext(groupId) {
    const gId = groupId || this._activeGroup;
    if (!gId) return;

    const group = this._groups.get(gId);
    if (!group || group.elements.length === 0) return;

    let newIndex = group.currentIndex + 1;

    if (newIndex >= group.elements.length) {
      newIndex = group.wrap ? 0 : group.elements.length - 1;
    }

    this._focusElement(group, newIndex);
  }

  /**
   * Navigate to previous element in group
   * @param {string} [groupId] - Group to navigate (default: active group)
   */
  navigatePrevious(groupId) {
    const gId = groupId || this._activeGroup;
    if (!gId) return;

    const group = this._groups.get(gId);
    if (!group || group.elements.length === 0) return;

    let newIndex = group.currentIndex - 1;

    if (newIndex < 0) {
      newIndex = group.wrap ? group.elements.length - 1 : 0;
    }

    this._focusElement(group, newIndex);
  }

  /**
   * Navigate to first element in group
   * @param {string} [groupId]
   */
  navigateFirst(groupId) {
    const gId = groupId || this._activeGroup;
    if (!gId) return;

    const group = this._groups.get(gId);
    if (!group || group.elements.length === 0) return;

    this._focusElement(group, 0);
  }

  /**
   * Navigate to last element in group
   * @param {string} [groupId]
   */
  navigateLast(groupId) {
    const gId = groupId || this._activeGroup;
    if (!gId) return;

    const group = this._groups.get(gId);
    if (!group || group.elements.length === 0) return;

    this._focusElement(group, group.elements.length - 1);
  }

  /**
   * Focus a specific element by index
   * @param {string} groupId
   * @param {number} index
   */
  focusIndex(groupId, index) {
    const group = this._groups.get(groupId);
    if (!group || index < 0 || index >= group.elements.length) return;

    this._focusElement(group, index);
  }

  /**
   * Focus a specific element by ID
   * @param {string} elementId
   */
  focusById(elementId) {
    for (const [groupId, group] of this._groups) {
      const index = group.elements.findIndex((e) => e.id === elementId);
      if (index !== -1) {
        this.setActiveGroup(groupId);
        this._focusElement(group, index);
        return;
      }
    }
  }

  /**
   * Get currently focused element
   * @returns {FocusableElement|null}
   */
  getCurrentFocusedElement() {
    if (!this._activeGroup) return null;

    const group = this._groups.get(this._activeGroup);
    if (!group || group.elements.length === 0) return null;

    return group.elements[group.currentIndex] || null;
  }

  /**
   * Activate the currently focused element (simulate click)
   */
  activateCurrent() {
    const current = this.getCurrentFocusedElement();
    if (!current) return;

    // Emit before event
    const event = { element: current, cancelled: false };
    this.emit('element:beforeActivate', event);

    if (event.cancelled) return;

    // Simulate click
    if (typeof current.element.click === 'function') {
      current.element.click();
    }

    this.emit('element:activated', { element: current });
  }

  // ==========================================================================
  // Focus Trap
  // ==========================================================================

  /**
   * Enable focus trap within a container
   * @param {HTMLElement} container
   */
  enableFocusTrap(container) {
    this._trapFocus = true;
    this._trapContainer = container;
    this._lastFocusedElement = typeof document !== 'undefined' ? document.activeElement : null;

    this.emit('focusTrap:enabled', { container });
  }

  /**
   * Disable focus trap
   */
  disableFocusTrap() {
    this._trapFocus = false;
    this._trapContainer = null;

    // Restore focus to last focused element
    if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function') {
      this._lastFocusedElement.focus();
    }

    this.emit('focusTrap:disabled');
  }

  /**
   * Check if focus trap is enabled
   * @returns {boolean}
   */
  isFocusTrapEnabled() {
    return this._trapFocus;
  }

  // ==========================================================================
  // Focus Styles
  // ==========================================================================

  /**
   * Set focus style
   * @param {'DEFAULT'|'HIGH_CONTRAST'} style
   */
  setFocusStyle(style) {
    this._focusStyle = FocusStyles[style] || FocusStyles.DEFAULT;

    // Update all registered elements
    for (const group of this._groups.values()) {
      for (const item of group.elements) {
        this._setupFocusStyles(item.element);
      }
    }

    this.emit('focusStyle:changed', { style });
  }

  /**
   * Get current focus style
   * @returns {Object}
   */
  getFocusStyle() {
    return { ...this._focusStyle };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    if (typeof document === 'undefined') return;

    this._keydownHandler = (e) => this._handleKeydown(e);
    this._focusinHandler = (e) => this._handleFocusIn(e);

    document.addEventListener('keydown', this._keydownHandler);
    document.addEventListener('focusin', this._focusinHandler);
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} e
   * @private
   */
  _handleKeydown(e) {
    if (!this._enabled) return;

    const group = this._activeGroup ? this._groups.get(this._activeGroup) : null;
    const orientation = group?.orientation || 'vertical';

    switch (e.key) {
    case NavigationKeys.UP:
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault();
        this.navigatePrevious();
      }
      break;

    case NavigationKeys.DOWN:
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault();
        this.navigateNext();
      }
      break;

    case NavigationKeys.LEFT:
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault();
        this.navigatePrevious();
      }
      break;

    case NavigationKeys.RIGHT:
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault();
        this.navigateNext();
      }
      break;

    case NavigationKeys.HOME:
      e.preventDefault();
      this.navigateFirst();
      break;

    case NavigationKeys.END:
      e.preventDefault();
      this.navigateLast();
      break;

    case NavigationKeys.ENTER:
    case NavigationKeys.SPACE:
      if (this._activeGroup) {
        // Let the browser handle button clicks naturally, but activate for other elements
        const current = this.getCurrentFocusedElement();
        if (current && current.element.tagName !== 'BUTTON') {
          e.preventDefault();
          this.activateCurrent();
        }
      }
      break;

    case NavigationKeys.TAB:
      if (this._trapFocus) {
        e.preventDefault();
        if (e.shiftKey) {
          this.navigatePrevious();
        } else {
          this.navigateNext();
        }
      }
      break;

    case NavigationKeys.ESCAPE:
      if (this._trapFocus) {
        this.disableFocusTrap();
        this.emit('navigation:escape');
      }
      break;
    }
  }

  /**
   * Handle focus in events
   * @param {FocusEvent} e
   * @private
   */
  _handleFocusIn(e) {
    if (!this._enabled) return;

    const target = e.target;

    // Find which group this element belongs to
    for (const [groupId, group] of this._groups) {
      const index = group.elements.findIndex((item) => item.element === target);
      if (index !== -1) {
        this._activeGroup = groupId;
        group.currentIndex = index;
        this.emit('element:focused', { element: group.elements[index], groupId });
        return;
      }
    }
  }

  /**
   * Focus an element at index
   * @param {NavigationGroup} group
   * @param {number} index
   * @private
   */
  _focusElement(group, index) {
    if (index < 0 || index >= group.elements.length) return;

    const previousIndex = group.currentIndex;
    group.currentIndex = index;

    const element = group.elements[index].element;
    if (typeof element.focus === 'function') {
      element.focus();
    }

    // Update roving tabindex
    group.elements.forEach((item, i) => {
      item.element.tabIndex = i === index ? 0 : -1;
    });

    this.emit('navigation:moved', {
      groupId: group.id,
      fromIndex: previousIndex,
      toIndex: index,
      element: group.elements[index],
    });
  }

  /**
   * Set up ARIA attributes for an element
   * @param {HTMLElement} element
   * @param {string} groupId
   * @param {number} index
   * @param {string} [label]
   * @private
   */
  _setupAriaAttributes(element, groupId, index, label) {
    element.setAttribute('role', element.tagName === 'BUTTON' ? 'button' : 'menuitem');
    element.setAttribute('data-nav-group', groupId);
    element.setAttribute('data-nav-index', String(index));

    if (label) {
      element.setAttribute('aria-label', label);
    }
  }

  /**
   * Remove ARIA attributes from element
   * @param {HTMLElement} element
   * @private
   */
  _removeAriaAttributes(element) {
    element.removeAttribute('data-nav-group');
    element.removeAttribute('data-nav-index');
  }

  /**
   * Set up focus styles for element
   * @param {HTMLElement} element
   * @private
   */
  _setupFocusStyles(element) {
    const style = this._focusStyle;

    // Store original styles
    element._originalOutline = element.style.outline;
    element._originalOutlineOffset = element.style.outlineOffset;
    element._originalBoxShadow = element.style.boxShadow;

    // Add focus listener
    element._focusHandler = () => {
      element.style.outline = style.outline;
      element.style.outlineOffset = style.outlineOffset;
      element.style.boxShadow = style.boxShadow;
    };

    element._blurHandler = () => {
      element.style.outline = element._originalOutline || '';
      element.style.outlineOffset = element._originalOutlineOffset || '';
      element.style.boxShadow = element._originalBoxShadow || '';
    };

    element.addEventListener('focus', element._focusHandler);
    element.addEventListener('blur', element._blurHandler);
  }

  /**
   * Remove focus styles from element
   * @param {HTMLElement} element
   * @private
   */
  _removeFocusStyles(element) {
    if (element._focusHandler) {
      element.removeEventListener('focus', element._focusHandler);
    }
    if (element._blurHandler) {
      element.removeEventListener('blur', element._blurHandler);
    }

    // Restore original styles
    if (element._originalOutline !== undefined) {
      element.style.outline = element._originalOutline;
    }
    if (element._originalOutlineOffset !== undefined) {
      element.style.outlineOffset = element._originalOutlineOffset;
    }
    if (element._originalBoxShadow !== undefined) {
      element.style.boxShadow = element._originalBoxShadow;
    }
  }

  /**
   * Auto-register focusable elements in the DOM
   * @private
   */
  _autoRegisterElements() {
    // Find menu container
    const menu = document.getElementById('menu');
    if (menu) {
      this.createGroup('menu', { orientation: 'vertical' });
      const buttons = menu.querySelectorAll('button');
      buttons.forEach((btn, i) => {
        this.registerElement(btn, 'menu', { order: i });
      });
    }

    // Find end screen container
    const endScreen = document.getElementById('endScreen');
    if (endScreen) {
      this.createGroup('endScreen', { orientation: 'vertical' });
      const buttons = endScreen.querySelectorAll('button');
      buttons.forEach((btn, i) => {
        this.registerElement(btn, 'endScreen', { order: i });
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (typeof document !== 'undefined') {
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
      }
      if (this._focusinHandler) {
        document.removeEventListener('focusin', this._focusinHandler);
      }
    }

    // Clean up all groups
    for (const groupId of this._groups.keys()) {
      this.removeGroup(groupId);
    }

    this._groups.clear();
    this._activeGroup = null;
    this._initialized = false;

    this.emit('navigation:destroyed');
  }

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  /**
   * Get all navigation keys
   * @returns {Object}
   */
  static getNavigationKeys() {
    return { ...NavigationKeys };
  }

  /**
   * Get available focus styles
   * @returns {Object}
   */
  static getFocusStyles() {
    return { ...FocusStyles };
  }
}

// ==========================================================================
// Singleton
// ==========================================================================

let keyboardNavigationInstance = null;

/**
 * Get the singleton keyboard navigation instance
 * @returns {KeyboardNavigation}
 */
export function getKeyboardNavigation() {
  if (!keyboardNavigationInstance) {
    keyboardNavigationInstance = new KeyboardNavigation();
  }
  return keyboardNavigationInstance;
}

/**
 * Reset the keyboard navigation instance
 */
export function resetKeyboardNavigation() {
  if (keyboardNavigationInstance) {
    keyboardNavigationInstance.destroy();
    keyboardNavigationInstance = null;
  }
}

export default KeyboardNavigation;
