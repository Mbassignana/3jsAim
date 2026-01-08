/**
 * IdleScheduler - Schedules non-critical work during browser idle periods
 * Uses requestIdleCallback with fallback for unsupported browsers
 */

import { EventEmitter } from './EventEmitter.js';

// ==========================================================================
// Types
// ==========================================================================

/**
 * @typedef {Object} IdleTask
 * @property {string} id - Unique task identifier
 * @property {Function} callback - Task callback function
 * @property {number} priority - Task priority (higher = more important)
 * @property {number} [timeout] - Max time to wait before forcing execution (ms)
 * @property {number} [addedAt] - Timestamp when task was added
 */

/**
 * @typedef {Object} IdleDeadline
 * @property {Function} timeRemaining - Returns remaining idle time in ms
 * @property {boolean} didTimeout - Whether callback was invoked due to timeout
 */

// ==========================================================================
// Polyfill / Fallback
// ==========================================================================

/**
 * requestIdleCallback polyfill for browsers that don't support it
 * Uses setTimeout with a short delay as fallback
 */
const _requestIdleCallback =
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (callback, options = {}) => {
        const start = Date.now();
        return setTimeout(
          () => {
            callback({
              didTimeout: false,
              timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            });
          },
          options.timeout ? Math.min(options.timeout, 1) : 1
        );
      };

const _cancelIdleCallback =
  typeof cancelIdleCallback !== 'undefined'
    ? cancelIdleCallback
    : (id) => {
        clearTimeout(id);
      };

// ==========================================================================
// IdleScheduler Class
// ==========================================================================

/**
 * Scheduler for non-critical background tasks
 * Tasks are executed during browser idle periods
 */
export class IdleScheduler extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.defaultTimeout=1000] - Default timeout for tasks (ms)
   * @param {number} [options.maxTasksPerIdle=5] - Max tasks to process per idle callback
   * @param {boolean} [options.enabled=true] - Whether scheduling is enabled
   */
  constructor(options = {}) {
    super();

    /** @type {number} */
    this.defaultTimeout = options.defaultTimeout ?? 1000;

    /** @type {number} */
    this.maxTasksPerIdle = options.maxTasksPerIdle ?? 5;

    /** @type {boolean} */
    this._enabled = options.enabled ?? true;

    /** @type {Map<string, IdleTask>} */
    this._tasks = new Map();

    /** @type {IdleTask[]} */
    this._queue = [];

    /** @type {number|null} */
    this._idleCallbackId = null;

    /** @type {boolean} */
    this._processing = false;

    // Stats
    /** @type {{tasksScheduled: number, tasksCompleted: number, timeoutTasks: number}} */
    this.stats = {
      tasksScheduled: 0,
      tasksCompleted: 0,
      timeoutTasks: 0,
    };
  }

  /**
   * Schedule a task to run during idle time
   * @param {string} id - Unique task identifier
   * @param {Function} callback - Task callback
   * @param {Object} [options]
   * @param {number} [options.priority=0] - Higher priority runs first
   * @param {number} [options.timeout] - Override default timeout
   * @returns {boolean} True if scheduled (false if already exists)
   */
  schedule(id, callback, options = {}) {
    if (this._tasks.has(id)) {
      return false;
    }

    const task = {
      id,
      callback,
      priority: options.priority ?? 0,
      timeout: options.timeout ?? this.defaultTimeout,
      addedAt: Date.now(),
    };

    this._tasks.set(id, task);
    this._insertSorted(task);
    this.stats.tasksScheduled++;

    this.emit('task:scheduled', { id, task });

    // Start processing if not already
    this._scheduleIdleCallback();

    return true;
  }

  /**
   * Schedule a task, replacing existing if present
   * @param {string} id - Task identifier
   * @param {Function} callback - Task callback
   * @param {Object} [options] - Task options
   */
  scheduleOrUpdate(id, callback, options = {}) {
    this.cancel(id);
    this.schedule(id, callback, options);
  }

  /**
   * Cancel a scheduled task
   * @param {string} id - Task identifier
   * @returns {boolean} True if task was cancelled
   */
  cancel(id) {
    const task = this._tasks.get(id);
    if (!task) {
      return false;
    }

    this._tasks.delete(id);
    this._queue = this._queue.filter((t) => t.id !== id);

    this.emit('task:cancelled', { id });

    return true;
  }

  /**
   * Cancel all scheduled tasks
   */
  cancelAll() {
    const count = this._tasks.size;
    this._tasks.clear();
    this._queue = [];

    if (this._idleCallbackId !== null) {
      _cancelIdleCallback(this._idleCallbackId);
      this._idleCallbackId = null;
    }

    this.emit('all:cancelled', { count });
  }

  /**
   * Run a task immediately, bypassing idle scheduling
   * @param {string} id - Task identifier
   * @returns {boolean} True if task was found and executed
   */
  runNow(id) {
    const task = this._tasks.get(id);
    if (!task) {
      return false;
    }

    this._executeTask(task, { didTimeout: false, timeRemaining: () => Infinity });
    return true;
  }

  /**
   * Flush all pending tasks immediately
   */
  flush() {
    while (this._queue.length > 0) {
      const task = this._queue.shift();
      this._executeTask(task, { didTimeout: false, timeRemaining: () => Infinity });
    }
  }

  /**
   * Check if a task is scheduled
   * @param {string} id
   * @returns {boolean}
   */
  isScheduled(id) {
    return this._tasks.has(id);
  }

  /**
   * Get pending task count
   * @returns {number}
   */
  getPendingCount() {
    return this._queue.length;
  }

  /**
   * Enable/disable scheduling
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;

    if (!enabled && this._idleCallbackId !== null) {
      _cancelIdleCallback(this._idleCallbackId);
      this._idleCallbackId = null;
    } else if (enabled && this._queue.length > 0) {
      this._scheduleIdleCallback();
    }
  }

  /**
   * Check if scheduling is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Insert task into queue sorted by priority (descending)
   * @param {IdleTask} task
   * @private
   */
  _insertSorted(task) {
    // Find insertion point (higher priority first)
    let insertIndex = 0;
    for (let i = 0; i < this._queue.length; i++) {
      if (this._queue[i].priority < task.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this._queue.splice(insertIndex, 0, task);
  }

  /**
   * Schedule idle callback if not already scheduled
   * @private
   */
  _scheduleIdleCallback() {
    if (!this._enabled || this._idleCallbackId !== null || this._queue.length === 0) {
      return;
    }

    // Use shortest timeout among queued tasks
    let minTimeout = this.defaultTimeout;
    for (const task of this._queue) {
      if (task.timeout < minTimeout) {
        minTimeout = task.timeout;
      }
    }

    this._idleCallbackId = _requestIdleCallback((deadline) => this._processIdleTasks(deadline), {
      timeout: minTimeout,
    });
  }

  /**
   * Process tasks during idle period
   * @param {IdleDeadline} deadline
   * @private
   */
  _processIdleTasks(deadline) {
    this._idleCallbackId = null;
    this._processing = true;

    const now = Date.now();
    let tasksProcessed = 0;

    // Process tasks while we have time and tasks
    while (
      this._queue.length > 0 &&
      tasksProcessed < this.maxTasksPerIdle &&
      (deadline.timeRemaining() > 0 || this._isTaskTimedOut(this._queue[0], now))
    ) {
      const task = this._queue.shift();

      // Check if task timed out
      const timedOut = this._isTaskTimedOut(task, now);
      if (timedOut) {
        this.stats.timeoutTasks++;
      }

      this._executeTask(task, {
        didTimeout: timedOut,
        timeRemaining: deadline.timeRemaining.bind(deadline),
      });

      tasksProcessed++;
    }

    this._processing = false;

    // Schedule next callback if more tasks remain
    if (this._queue.length > 0) {
      this._scheduleIdleCallback();
    }
  }

  /**
   * Check if a task has timed out
   * @param {IdleTask} task
   * @param {number} now
   * @returns {boolean}
   * @private
   */
  _isTaskTimedOut(task, now) {
    return now - task.addedAt >= task.timeout;
  }

  /**
   * Execute a task
   * @param {IdleTask} task
   * @param {IdleDeadline} deadline
   * @private
   */
  _executeTask(task, deadline) {
    this._tasks.delete(task.id);

    try {
      task.callback(deadline);
      this.stats.tasksCompleted++;
      this.emit('task:completed', { id: task.id, didTimeout: deadline.didTimeout });
    } catch (error) {
      this.emit('task:error', { id: task.id, error });
    }
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      tasksScheduled: 0,
      tasksCompleted: 0,
      timeoutTasks: 0,
    };
  }
}

// ==========================================================================
// Convenience Functions
// ==========================================================================

/**
 * Schedule a one-off task during idle time
 * @param {Function} callback - Task callback
 * @param {Object} [options]
 * @param {number} [options.timeout=1000] - Max wait time before forcing execution
 * @returns {number} Cancel ID (use cancelIdleCallback to cancel)
 */
export function scheduleIdleTask(callback, options = {}) {
  return _requestIdleCallback(callback, options);
}

/**
 * Cancel a scheduled idle task
 * @param {number} id - ID returned by scheduleIdleTask
 */
export function cancelIdleTask(id) {
  _cancelIdleCallback(id);
}

/**
 * Run callback when browser is idle, with deadline info
 * @param {Function} callback - Receives IdleDeadline argument
 * @param {number} [timeout=1000] - Max time to wait
 * @returns {Promise<void>}
 */
export function whenIdle(callback, timeout = 1000) {
  return new Promise((resolve, reject) => {
    _requestIdleCallback(
      (deadline) => {
        try {
          callback(deadline);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      { timeout }
    );
  });
}

/**
 * Defer work until idle, executing in chunks if needed
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {Object} [options]
 * @param {number} [options.chunkTime=10] - Max ms per chunk
 * @param {number} [options.timeout=5000] - Max total wait time
 * @returns {Promise<void>}
 */
export function processWhenIdle(items, processor, options = {}) {
  const { chunkTime = 10, timeout = 5000 } = options;

  return new Promise((resolve, reject) => {
    const itemsCopy = [...items];
    let index = 0;

    const processChunk = (deadline) => {
      try {
        while (index < itemsCopy.length && deadline.timeRemaining() > 0) {
          processor(itemsCopy[index], index);
          index++;
        }

        if (index < itemsCopy.length) {
          // More items to process
          _requestIdleCallback(processChunk, { timeout: chunkTime });
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    };

    _requestIdleCallback(processChunk, { timeout });
  });
}

// ==========================================================================
// Singleton Instance
// ==========================================================================

let schedulerInstance = null;

/**
 * Get the singleton idle scheduler instance
 * @returns {IdleScheduler}
 */
export function getIdleScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new IdleScheduler();
  }
  return schedulerInstance;
}

/**
 * Reset the idle scheduler instance (for testing)
 */
export function resetIdleScheduler() {
  if (schedulerInstance) {
    schedulerInstance.cancelAll();
    schedulerInstance = null;
  }
}

export default IdleScheduler;
