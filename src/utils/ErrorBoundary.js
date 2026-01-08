/**
 * ErrorBoundary - Centralized error handling for graceful failure recovery
 * Provides custom error classes, error boundaries, and structured logging
 */

import { EventEmitter, GameEvents, getEventBus } from './EventEmitter.js';

// ==========================================================================
// Custom Error Classes
// ==========================================================================

/**
 * Base game error class with additional context
 */
export class GameError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [context] - Additional context
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'GameError';
    this.timestamp = Date.now();
    this.context = context;
    this.recoverable = true;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get formatted error for logging
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

/**
 * Validation error for invalid parameters/state
 */
export class ValidationError extends GameError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'ValidationError';
    this.recoverable = false;
  }
}

/**
 * Resource loading error (textures, sounds, models)
 */
export class ResourceError extends GameError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'ResourceError';
    this.recoverable = true;
  }
}

/**
 * Physics error (collision, simulation)
 */
export class PhysicsError extends GameError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'PhysicsError';
    this.recoverable = true;
  }
}

/**
 * Audio error
 */
export class AudioError extends GameError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'AudioError';
    this.recoverable = true;
  }
}

/**
 * Render error
 */
export class RenderError extends GameError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'RenderError';
    this.recoverable = false;
  }
}

// ==========================================================================
// Error Severity Levels
// ==========================================================================

export const ErrorSeverity = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// ==========================================================================
// Error Handler Configuration
// ==========================================================================

const DEFAULT_CONFIG = {
  maxErrors: 100, // Max errors to store
  rateLimitMs: 1000, // Rate limit duplicate errors
  logToConsole: true, // Log errors to console
  captureStackTrace: true, // Include stack traces
  emitEvents: true, // Emit error events
};

// ==========================================================================
// ErrorBoundary Class
// ==========================================================================

/**
 * Central error boundary for catching and handling errors
 */
export class ErrorBoundary extends EventEmitter {
  /**
   * @param {Object} [config] - Configuration options
   */
  constructor(config = {}) {
    super();

    /** @type {Object} */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {Array<Object>} */
    this._errors = [];

    /** @type {Map<string, number>} */
    this._errorTimestamps = new Map();

    /** @type {boolean} */
    this._initialized = false;

    /** @type {Function|null} */
    this._originalOnError = null;

    /** @type {Function|null} */
    this._originalOnUnhandledRejection = null;
  }

  /**
   * Initialize error boundary and register global handlers
   */
  init() {
    if (this._initialized) {
      return;
    }

    // Register global error handler (browser)
    if (typeof window !== 'undefined') {
      this._originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        this.handleError(error || new Error(message), {
          source,
          lineno,
          colno,
          type: 'uncaught',
        });
        // Call original handler if it exists
        if (this._originalOnError) {
          return this._originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };

      // Register unhandled promise rejection handler
      this._originalOnUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = (event) => {
        this.handleError(event.reason, {
          type: 'unhandledRejection',
        });
        if (this._originalOnUnhandledRejection) {
          return this._originalOnUnhandledRejection(event);
        }
      };
    }

    this._initialized = true;
    this.emit('errorBoundary:init');
  }

  /**
   * Clean up global handlers
   */
  destroy() {
    if (typeof window !== 'undefined') {
      if (this._originalOnError !== null) {
        window.onerror = this._originalOnError;
      }
      if (this._originalOnUnhandledRejection !== null) {
        window.onunhandledrejection = this._originalOnUnhandledRejection;
      }
    }
    this._initialized = false;
  }

  /**
   * Handle an error
   * @param {Error|string} error - Error to handle
   * @param {Object} [context] - Additional context
   * @returns {boolean} Whether the error was handled
   */
  handleError(error, context = {}) {
    // Normalize error
    const normalizedError = this._normalizeError(error);

    // Add context
    if (normalizedError.context) {
      normalizedError.context = { ...normalizedError.context, ...context };
    } else {
      normalizedError.context = context;
    }

    // Rate limit duplicate errors
    if (this._isRateLimited(normalizedError)) {
      return false;
    }

    // Store error
    this._storeError(normalizedError);

    // Log to console
    if (this.config.logToConsole) {
      this._logError(normalizedError);
    }

    // Emit event
    if (this.config.emitEvents) {
      this.emit('error', normalizedError.toJSON());
      getEventBus().emit(GameEvents.ERROR, normalizedError.toJSON());
    }

    // Determine if error is recoverable
    return normalizedError.recoverable;
  }

  /**
   * Wrap a function with error boundary
   * @param {Function} fn - Function to wrap
   * @param {Object} [context] - Context for errors
   * @returns {Function} Wrapped function
   */
  wrap(fn, context = {}) {
    const self = this;

    return function wrappedFunction(...args) {
      try {
        const result = fn.apply(this, args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch((error) => {
            self.handleError(error, { ...context, async: true });
            throw error;
          });
        }

        return result;
      } catch (error) {
        self.handleError(error, context);
        throw error;
      }
    };
  }

  /**
   * Wrap a function with error boundary and recovery
   * @param {Function} fn - Function to wrap
   * @param {Function} [recovery] - Recovery function on error
   * @param {Object} [context] - Context for errors
   * @returns {Function} Wrapped function
   */
  wrapWithRecovery(fn, recovery = null, context = {}) {
    const self = this;

    return function wrappedFunction(...args) {
      try {
        const result = fn.apply(this, args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch((error) => {
            const isRecoverable = self.handleError(error, { ...context, async: true });
            if (isRecoverable && recovery) {
              return recovery.call(this, error, ...args);
            }
            throw error;
          });
        }

        return result;
      } catch (error) {
        const isRecoverable = self.handleError(error, context);
        if (isRecoverable && recovery) {
          return recovery.call(this, error, ...args);
        }
        throw error;
      }
    };
  }

  /**
   * Create a safe game loop wrapper
   * @param {Function} updateFn - Update function
   * @param {Function} [onError] - Error callback
   * @returns {Function} Safe update function
   */
  createSafeGameLoop(updateFn, onError = null) {
    const self = this;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    return function safeUpdate(...args) {
      try {
        const result = updateFn.apply(this, args);
        consecutiveErrors = 0;
        return result;
      } catch (error) {
        consecutiveErrors++;
        self.handleError(error, { type: 'gameLoop', consecutiveErrors });

        if (onError) {
          onError(error, consecutiveErrors);
        }

        // If too many consecutive errors, stop the loop
        if (consecutiveErrors >= maxConsecutiveErrors) {
          self.handleError(
            new RenderError('Too many consecutive errors in game loop', {
              consecutiveErrors,
            }),
            { type: 'gameLoopHalt' }
          );
          return false; // Signal to stop loop
        }

        return true; // Continue loop
      }
    };
  }

  /**
   * Try to execute a function with fallback
   * @param {Function} fn - Function to try
   * @param {*} fallbackValue - Value to return on error
   * @param {Object} [context] - Error context
   * @returns {*} Result or fallback value
   */
  tryOrDefault(fn, fallbackValue, context = {}) {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, { ...context, fallbackUsed: true });
      return fallbackValue;
    }
  }

  /**
   * Execute with retry
   * @param {Function} fn - Function to execute
   * @param {number} [maxRetries=3] - Maximum retries
   * @param {number} [delayMs=100] - Delay between retries
   * @param {Object} [context] - Error context
   * @returns {Promise<*>} Result
   */
  async retryAsync(fn, maxRetries = 3, delayMs = 100, context = {}) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        this.handleError(error, { ...context, attempt, maxRetries });

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  // ==========================================================================
  // Error Storage and Retrieval
  // ==========================================================================

  /**
   * Get all stored errors
   * @returns {Array<Object>}
   */
  getErrors() {
    return this._errors.map((e) => e.toJSON());
  }

  /**
   * Get error count
   * @returns {number}
   */
  getErrorCount() {
    return this._errors.length;
  }

  /**
   * Get errors by type
   * @param {string} type - Error type name
   * @returns {Array<Object>}
   */
  getErrorsByType(type) {
    return this._errors.filter((e) => e.name === type).map((e) => e.toJSON());
  }

  /**
   * Clear stored errors
   */
  clearErrors() {
    this._errors = [];
    this._errorTimestamps.clear();
    this.emit('errors:cleared');
  }

  /**
   * Get error summary
   * @returns {Object}
   */
  getSummary() {
    const byType = {};
    this._errors.forEach((e) => {
      byType[e.name] = (byType[e.name] || 0) + 1;
    });

    return {
      total: this._errors.length,
      byType,
      recoverable: this._errors.filter((e) => e.recoverable).length,
      nonRecoverable: this._errors.filter((e) => !e.recoverable).length,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Normalize error to GameError
   * @param {Error|string} error
   * @returns {GameError}
   * @private
   */
  _normalizeError(error) {
    if (error instanceof GameError) {
      return error;
    }

    if (error instanceof Error) {
      const gameError = new GameError(error.message, {
        originalName: error.name,
      });
      gameError.stack = error.stack;
      return gameError;
    }

    return new GameError(String(error));
  }

  /**
   * Check if error is rate limited
   * @param {GameError} error
   * @returns {boolean}
   * @private
   */
  _isRateLimited(error) {
    const key = `${error.name}:${error.message}`;
    const lastTime = this._errorTimestamps.get(key);
    const now = Date.now();

    if (lastTime && now - lastTime < this.config.rateLimitMs) {
      return true;
    }

    this._errorTimestamps.set(key, now);
    return false;
  }

  /**
   * Store error
   * @param {GameError} error
   * @private
   */
  _storeError(error) {
    this._errors.push(error);

    // Remove old errors if over limit
    while (this._errors.length > this.config.maxErrors) {
      this._errors.shift();
    }
  }

  /**
   * Log error to console
   * @param {GameError} error
   * @private
   */
  _logError(error) {
    const prefix = `[${error.name}]`;
    const contextStr = Object.keys(error.context).length
      ? `Context: ${JSON.stringify(error.context)}`
      : '';

    if (error.recoverable) {
      console.warn(prefix, error.message, contextStr);
    } else {
      console.error(prefix, error.message, contextStr);
      if (this.config.captureStackTrace && error.stack) {
        console.error(error.stack);
      }
    }
  }
}

// ==========================================================================
// Singleton Instance
// ==========================================================================

let errorBoundaryInstance = null;

/**
 * Get the singleton error boundary instance
 * @returns {ErrorBoundary}
 */
export function getErrorBoundary() {
  if (!errorBoundaryInstance) {
    errorBoundaryInstance = new ErrorBoundary();
  }
  return errorBoundaryInstance;
}

/**
 * Reset the error boundary instance (for testing)
 */
export function resetErrorBoundary() {
  if (errorBoundaryInstance) {
    errorBoundaryInstance.destroy();
    errorBoundaryInstance = null;
  }
}

// ==========================================================================
// Add GameEvents constant
// ==========================================================================

GameEvents.ERROR = 'game:error';

export default ErrorBoundary;
