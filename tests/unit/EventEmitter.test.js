/**
 * Unit tests for EventEmitter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EventEmitter,
  GameEvents,
  getEventBus,
  resetEventBus,
} from '@/utils/EventEmitter.js';

describe('EventEmitter', () => {
  let emitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on', () => {
    it('should register a listener', () => {
      const callback = vi.fn();
      emitter.on('test', callback);
      expect(emitter.listenerCount('test')).toBe(1);
    });

    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.on('test', callback);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(emitter.listenerCount('test')).toBe(0);
    });

    it('should allow multiple listeners for the same event', () => {
      emitter.on('test', vi.fn());
      emitter.on('test', vi.fn());
      emitter.on('test', vi.fn());
      expect(emitter.listenerCount('test')).toBe(3);
    });

    it('should throw if callback is not a function', () => {
      expect(() => emitter.on('test', 'not a function')).toThrow();
      expect(() => emitter.on('test', null)).toThrow();
    });
  });

  describe('once', () => {
    it('should register a one-time listener', () => {
      const callback = vi.fn();
      emitter.once('test', callback);
      expect(emitter.listenerCount('test')).toBe(1);
    });

    it('should remove listener after first emit', () => {
      const callback = vi.fn();
      emitter.once('test', callback);
      emitter.emit('test', 'data');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(emitter.listenerCount('test')).toBe(0);
    });

    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = emitter.once('test', callback);
      unsubscribe();
      emitter.emit('test');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should throw if callback is not a function', () => {
      expect(() => emitter.once('test', 123)).toThrow();
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      emitter.off('test', callback1);
      expect(emitter.listenerCount('test')).toBe(1);
    });

    it('should not throw when removing non-existent listener', () => {
      expect(() => emitter.off('nonexistent', vi.fn())).not.toThrow();
    });

    it('should remove once listeners too', () => {
      const callback = vi.fn();
      emitter.once('test', callback);
      emitter.off('test', callback);
      expect(emitter.listenerCount('test')).toBe(0);
    });
  });

  describe('emit', () => {
    it('should call all registered listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      emitter.emit('test');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should pass data to listeners', () => {
      const callback = vi.fn();
      const testData = { value: 42 };
      emitter.on('test', callback);
      emitter.emit('test', testData);
      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should not throw when emitting event with no listeners', () => {
      expect(() => emitter.emit('nonexistent')).not.toThrow();
    });

    it('should continue calling other listeners if one throws', () => {
      const callback1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback2 = vi.fn();
      emitter.on('test', callback1);
      emitter.on('test', callback2);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      emitter.emit('test');
      consoleSpy.mockRestore();

      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      emitter.on('test1', vi.fn());
      emitter.on('test1', vi.fn());
      emitter.on('test2', vi.fn());
      emitter.removeAllListeners('test1');
      expect(emitter.listenerCount('test1')).toBe(0);
      expect(emitter.listenerCount('test2')).toBe(1);
    });

    it('should remove all listeners when called without arguments', () => {
      emitter.on('test1', vi.fn());
      emitter.on('test2', vi.fn());
      emitter.once('test3', vi.fn());
      emitter.removeAllListeners();
      expect(emitter.listenerCount('test1')).toBe(0);
      expect(emitter.listenerCount('test2')).toBe(0);
      expect(emitter.listenerCount('test3')).toBe(0);
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for events with no listeners', () => {
      expect(emitter.listenerCount('nonexistent')).toBe(0);
    });

    it('should count both regular and once listeners', () => {
      emitter.on('test', vi.fn());
      emitter.once('test', vi.fn());
      expect(emitter.listenerCount('test')).toBe(2);
    });
  });

  describe('hasListeners', () => {
    it('should return false for events with no listeners', () => {
      expect(emitter.hasListeners('test')).toBe(false);
    });

    it('should return true for events with listeners', () => {
      emitter.on('test', vi.fn());
      expect(emitter.hasListeners('test')).toBe(true);
    });
  });

  describe('eventNames', () => {
    it('should return empty array when no listeners', () => {
      expect(emitter.eventNames()).toEqual([]);
    });

    it('should return all event names with listeners', () => {
      emitter.on('event1', vi.fn());
      emitter.on('event2', vi.fn());
      emitter.once('event3', vi.fn());
      const names = emitter.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
    });

    it('should not duplicate event names', () => {
      emitter.on('test', vi.fn());
      emitter.once('test', vi.fn());
      const names = emitter.eventNames();
      expect(names.filter((n) => n === 'test').length).toBe(1);
    });
  });
});

describe('GameEvents', () => {
  it('should have all expected game events defined', () => {
    expect(GameEvents.GAME_START).toBeDefined();
    expect(GameEvents.GAME_END).toBeDefined();
    expect(GameEvents.SCORE_CHANGE).toBeDefined();
    expect(GameEvents.CIRCLE_HIT).toBeDefined();
    expect(GameEvents.PLAYER_SHOOT).toBeDefined();
  });

  it('should have unique event names', () => {
    const values = Object.values(GameEvents);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('Global Event Bus', () => {
  beforeEach(() => {
    resetEventBus();
  });

  it('should return the same instance', () => {
    const bus1 = getEventBus();
    const bus2 = getEventBus();
    expect(bus1).toBe(bus2);
  });

  it('should reset properly', () => {
    const bus1 = getEventBus();
    bus1.on('test', vi.fn());
    resetEventBus();
    const bus2 = getEventBus();
    expect(bus2).not.toBe(bus1);
    expect(bus2.listenerCount('test')).toBe(0);
  });
});
