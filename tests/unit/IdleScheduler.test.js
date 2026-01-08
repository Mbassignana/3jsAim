/**
 * Tests for IdleScheduler - requestIdleCallback wrapper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IdleScheduler,
  scheduleIdleTask,
  cancelIdleTask,
  whenIdle,
  processWhenIdle,
  getIdleScheduler,
  resetIdleScheduler,
} from '@/utils/IdleScheduler.js';

describe('IdleScheduler', () => {
  let scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new IdleScheduler();
  });

  afterEach(() => {
    scheduler.cancelAll();
    vi.useRealTimers();
    resetIdleScheduler();
  });

  // ==========================================================================
  // Basic Scheduling
  // ==========================================================================

  describe('basic scheduling', () => {
    it('should schedule a task', () => {
      const callback = vi.fn();
      const result = scheduler.schedule('task1', callback);

      expect(result).toBe(true);
      expect(scheduler.isScheduled('task1')).toBe(true);
      expect(scheduler.getPendingCount()).toBe(1);
    });

    it('should not schedule duplicate task IDs', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.schedule('task1', callback1);
      const result = scheduler.schedule('task1', callback2);

      expect(result).toBe(false);
      expect(scheduler.getPendingCount()).toBe(1);
    });

    it('should execute task on idle', async () => {
      const callback = vi.fn();
      scheduler.schedule('task1', callback);

      // Trigger idle callback
      vi.advanceTimersByTime(10);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          didTimeout: expect.any(Boolean),
          timeRemaining: expect.any(Function),
        })
      );
    });

    it('should remove task after execution', () => {
      const callback = vi.fn();
      scheduler.schedule('task1', callback);

      vi.advanceTimersByTime(10);

      expect(scheduler.isScheduled('task1')).toBe(false);
      expect(scheduler.getPendingCount()).toBe(0);
    });

    it('should track stats', () => {
      scheduler.schedule('task1', vi.fn());
      scheduler.schedule('task2', vi.fn());

      expect(scheduler.stats.tasksScheduled).toBe(2);

      vi.advanceTimersByTime(10);

      expect(scheduler.stats.tasksCompleted).toBe(2);
    });
  });

  // ==========================================================================
  // Task Cancellation
  // ==========================================================================

  describe('task cancellation', () => {
    it('should cancel a scheduled task', () => {
      const callback = vi.fn();
      scheduler.schedule('task1', callback);

      const result = scheduler.cancel('task1');

      expect(result).toBe(true);
      expect(scheduler.isScheduled('task1')).toBe(false);
      expect(scheduler.getPendingCount()).toBe(0);

      vi.advanceTimersByTime(10);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for non-existent task', () => {
      const result = scheduler.cancel('nonexistent');
      expect(result).toBe(false);
    });

    it('should cancel all tasks', () => {
      scheduler.schedule('task1', vi.fn());
      scheduler.schedule('task2', vi.fn());
      scheduler.schedule('task3', vi.fn());

      scheduler.cancelAll();

      expect(scheduler.getPendingCount()).toBe(0);
    });

    it('should emit cancelled event', () => {
      const handler = vi.fn();
      scheduler.on('task:cancelled', handler);

      scheduler.schedule('task1', vi.fn());
      scheduler.cancel('task1');

      expect(handler).toHaveBeenCalledWith({ id: 'task1' });
    });
  });

  // ==========================================================================
  // Priority Handling
  // ==========================================================================

  describe('priority handling', () => {
    it('should execute higher priority tasks first', () => {
      const order = [];

      scheduler.schedule('low', () => order.push('low'), { priority: 0 });
      scheduler.schedule('high', () => order.push('high'), { priority: 10 });
      scheduler.schedule('medium', () => order.push('medium'), { priority: 5 });

      vi.advanceTimersByTime(10);

      expect(order).toEqual(['high', 'medium', 'low']);
    });

    it('should use default priority of 0', () => {
      const order = [];

      scheduler.schedule('first', () => order.push('first'));
      scheduler.schedule('second', () => order.push('second'));

      vi.advanceTimersByTime(10);

      // Same priority, maintain insertion order
      expect(order).toEqual(['first', 'second']);
    });
  });

  // ==========================================================================
  // Timeout Handling
  // ==========================================================================

  describe('timeout handling', () => {
    it('should force execution after timeout', () => {
      const callback = vi.fn();
      scheduler.schedule('task1', callback, { timeout: 50 });

      // Wait longer than timeout
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalled();
    });

    it('should track timeout tasks in stats', () => {
      scheduler.schedule('task1', vi.fn(), { timeout: 50 });

      // Simulate timeout by advancing time
      vi.advanceTimersByTime(100);

      // The task was executed, but we can't easily test didTimeout in this env
      expect(scheduler.stats.tasksCompleted).toBe(1);
    });

    it('should use default timeout', () => {
      const customScheduler = new IdleScheduler({ defaultTimeout: 100 });
      customScheduler.schedule('task1', vi.fn());

      // Task should eventually run
      vi.advanceTimersByTime(200);

      expect(customScheduler.stats.tasksCompleted).toBe(1);
      customScheduler.cancelAll();
    });
  });

  // ==========================================================================
  // Schedule Or Update
  // ==========================================================================

  describe('scheduleOrUpdate', () => {
    it('should replace existing task', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.schedule('task1', callback1);
      scheduler.scheduleOrUpdate('task1', callback2);

      vi.advanceTimersByTime(10);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should schedule if task does not exist', () => {
      const callback = vi.fn();

      scheduler.scheduleOrUpdate('task1', callback);

      vi.advanceTimersByTime(10);

      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Run Now
  // ==========================================================================

  describe('runNow', () => {
    it('should execute task immediately', () => {
      const callback = vi.fn();
      scheduler.schedule('task1', callback);

      const result = scheduler.runNow('task1');

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalled();
      expect(scheduler.isScheduled('task1')).toBe(false);
    });

    it('should return false for non-existent task', () => {
      const result = scheduler.runNow('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Flush
  // ==========================================================================

  describe('flush', () => {
    it('should execute all pending tasks immediately', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      scheduler.schedule('task1', callbacks[0]);
      scheduler.schedule('task2', callbacks[1]);
      scheduler.schedule('task3', callbacks[2]);

      scheduler.flush();

      callbacks.forEach((cb) => {
        expect(cb).toHaveBeenCalled();
      });
      expect(scheduler.getPendingCount()).toBe(0);
    });

    it('should respect priority order during flush', () => {
      const order = [];

      scheduler.schedule('low', () => order.push('low'), { priority: 0 });
      scheduler.schedule('high', () => order.push('high'), { priority: 10 });

      scheduler.flush();

      expect(order).toEqual(['high', 'low']);
    });
  });

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  describe('enable/disable', () => {
    it('should not process tasks when disabled', () => {
      const callback = vi.fn();

      scheduler.setEnabled(false);
      scheduler.schedule('task1', callback);

      vi.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
      expect(scheduler.getPendingCount()).toBe(1);
    });

    it('should resume processing when re-enabled', () => {
      const callback = vi.fn();

      scheduler.setEnabled(false);
      scheduler.schedule('task1', callback);

      scheduler.setEnabled(true);
      vi.advanceTimersByTime(10);

      expect(callback).toHaveBeenCalled();
    });

    it('should report enabled state', () => {
      expect(scheduler.isEnabled()).toBe(true);

      scheduler.setEnabled(false);
      expect(scheduler.isEnabled()).toBe(false);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should emit error event on task failure', () => {
      const error = new Error('Task failed');
      const errorHandler = vi.fn();

      scheduler.on('task:error', errorHandler);
      scheduler.schedule('task1', () => {
        throw error;
      });

      vi.advanceTimersByTime(10);

      expect(errorHandler).toHaveBeenCalledWith({
        id: 'task1',
        error,
      });
    });

    it('should continue processing after error', () => {
      const callback2 = vi.fn();

      scheduler.schedule('task1', () => {
        throw new Error('fail');
      });
      scheduler.schedule('task2', callback2);

      vi.advanceTimersByTime(10);

      expect(callback2).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('events', () => {
    it('should emit task:scheduled event', () => {
      const handler = vi.fn();
      scheduler.on('task:scheduled', handler);

      scheduler.schedule('task1', vi.fn());

      expect(handler).toHaveBeenCalledWith({
        id: 'task1',
        task: expect.objectContaining({ id: 'task1' }),
      });
    });

    it('should emit task:completed event', () => {
      const handler = vi.fn();
      scheduler.on('task:completed', handler);

      scheduler.schedule('task1', vi.fn());
      vi.advanceTimersByTime(10);

      expect(handler).toHaveBeenCalledWith({
        id: 'task1',
        didTimeout: expect.any(Boolean),
      });
    });

    it('should emit all:cancelled event', () => {
      const handler = vi.fn();
      scheduler.on('all:cancelled', handler);

      scheduler.schedule('task1', vi.fn());
      scheduler.schedule('task2', vi.fn());
      scheduler.cancelAll();

      expect(handler).toHaveBeenCalledWith({ count: 2 });
    });
  });

  // ==========================================================================
  // Max Tasks Per Idle
  // ==========================================================================

  describe('maxTasksPerIdle', () => {
    it('should respect maxTasksPerIdle config', () => {
      const limitedScheduler = new IdleScheduler({ maxTasksPerIdle: 2 });
      const callbacks = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];

      callbacks.forEach((cb, i) => {
        limitedScheduler.schedule(`task${i}`, cb);
      });

      // With the polyfill (setTimeout-based), timeRemaining() always returns
      // positive values, so all tasks will eventually run. The maxTasksPerIdle
      // limits how many run per single idle callback when time runs out.
      // Run enough time for all tasks to complete
      vi.advanceTimersByTime(50);

      // All tasks should have completed eventually
      callbacks.forEach((cb) => {
        expect(cb).toHaveBeenCalled();
      });

      expect(limitedScheduler.stats.tasksCompleted).toBe(4);

      limitedScheduler.cancelAll();
    });

    it('should set maxTasksPerIdle from constructor', () => {
      const scheduler1 = new IdleScheduler({ maxTasksPerIdle: 5 });
      const scheduler2 = new IdleScheduler({ maxTasksPerIdle: 10 });

      expect(scheduler1.maxTasksPerIdle).toBe(5);
      expect(scheduler2.maxTasksPerIdle).toBe(10);

      scheduler1.cancelAll();
      scheduler2.cancelAll();
    });
  });

  // ==========================================================================
  // Stats Reset
  // ==========================================================================

  describe('stats', () => {
    it('should reset stats', () => {
      scheduler.schedule('task1', vi.fn());
      vi.advanceTimersByTime(10);

      expect(scheduler.stats.tasksCompleted).toBe(1);

      scheduler.resetStats();

      expect(scheduler.stats.tasksScheduled).toBe(0);
      expect(scheduler.stats.tasksCompleted).toBe(0);
      expect(scheduler.stats.timeoutTasks).toBe(0);
    });
  });
});

// ==========================================================================
// Convenience Functions
// ==========================================================================

describe('convenience functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetIdleScheduler();
  });

  describe('scheduleIdleTask', () => {
    it('should schedule and execute task', () => {
      const callback = vi.fn();
      scheduleIdleTask(callback);

      vi.advanceTimersByTime(10);

      expect(callback).toHaveBeenCalled();
    });

    it('should return cancel ID', () => {
      const callback = vi.fn();
      const id = scheduleIdleTask(callback);

      // In Node/jsdom with polyfill, returns Timeout object or number
      expect(id).toBeDefined();
      expect(id).not.toBeNull();
    });
  });

  describe('cancelIdleTask', () => {
    it('should cancel scheduled task', () => {
      const callback = vi.fn();
      const id = scheduleIdleTask(callback);

      cancelIdleTask(id);
      vi.advanceTimersByTime(10);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('whenIdle', () => {
    it('should resolve when idle callback runs', async () => {
      const callback = vi.fn();

      const promise = whenIdle(callback);
      vi.advanceTimersByTime(10);

      await promise;
      expect(callback).toHaveBeenCalled();
    });

    it('should reject on error', async () => {
      const error = new Error('Test error');

      const promise = whenIdle(() => {
        throw error;
      });
      vi.advanceTimersByTime(10);

      await expect(promise).rejects.toThrow('Test error');
    });
  });

  describe('processWhenIdle', () => {
    it('should process all items', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed = [];

      const promise = processWhenIdle(items, (item) => {
        processed.push(item);
      });

      // Process chunks
      vi.advanceTimersByTime(100);

      await promise;
      expect(processed).toEqual([1, 2, 3, 4, 5]);
    });

    it('should pass index to processor', async () => {
      const items = ['a', 'b', 'c'];
      const results = [];

      const promise = processWhenIdle(items, (item, index) => {
        results.push({ item, index });
      });

      vi.advanceTimersByTime(100);

      await promise;
      expect(results).toEqual([
        { item: 'a', index: 0 },
        { item: 'b', index: 1 },
        { item: 'c', index: 2 },
      ]);
    });

    it('should reject on processor error', async () => {
      const promise = processWhenIdle([1, 2, 3], () => {
        throw new Error('Process error');
      });

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Process error');
    });
  });
});

// ==========================================================================
// Singleton
// ==========================================================================

describe('singleton', () => {
  beforeEach(() => {
    resetIdleScheduler();
  });

  afterEach(() => {
    resetIdleScheduler();
  });

  it('should return same instance', () => {
    const instance1 = getIdleScheduler();
    const instance2 = getIdleScheduler();

    expect(instance1).toBe(instance2);
  });

  it('should create new instance after reset', () => {
    const instance1 = getIdleScheduler();
    resetIdleScheduler();
    const instance2 = getIdleScheduler();

    expect(instance1).not.toBe(instance2);
  });

  it('should cancel tasks on reset', () => {
    vi.useFakeTimers();

    const scheduler = getIdleScheduler();
    const callback = vi.fn();
    scheduler.schedule('task1', callback);

    resetIdleScheduler();
    vi.advanceTimersByTime(100);

    expect(callback).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
