/**
 * Unit tests for ErrorBoundary
 * Tests error handling, custom error classes, and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorBoundary,
  GameError,
  ValidationError,
  ResourceError,
  PhysicsError,
  AudioError,
  RenderError,
  ErrorSeverity,
  getErrorBoundary,
  resetErrorBoundary,
} from '@utils/ErrorBoundary.js';
import { GameEvents, getEventBus, resetEventBus } from '@utils/EventEmitter.js';

describe('ErrorBoundary', () => {
  let errorBoundary;

  beforeEach(() => {
    resetErrorBoundary();
    resetEventBus();
    errorBoundary = new ErrorBoundary({ logToConsole: false });
  });

  afterEach(() => {
    errorBoundary.destroy();
    errorBoundary = null;
  });

  // ==========================================================================
  // Custom Error Classes
  // ==========================================================================
  describe('GameError', () => {
    it('should create error with message', () => {
      const error = new GameError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('GameError');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const error = new GameError('Test');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include context', () => {
      const error = new GameError('Test', { key: 'value', count: 42 });
      expect(error.context).toEqual({ key: 'value', count: 42 });
    });

    it('should be recoverable by default', () => {
      const error = new GameError('Test');
      expect(error.recoverable).toBe(true);
    });

    it('should extend Error', () => {
      const error = new GameError('Test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should capture stack trace', () => {
      const error = new GameError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('GameError');
    });

    it('should serialize to JSON', () => {
      const error = new GameError('Test', { foo: 'bar' });
      const json = error.toJSON();

      expect(json.name).toBe('GameError');
      expect(json.message).toBe('Test');
      expect(json.context).toEqual({ foo: 'bar' });
      expect(json.timestamp).toBeDefined();
      expect(json.recoverable).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should have correct name', () => {
      const error = new ValidationError('Invalid input');
      expect(error.name).toBe('ValidationError');
    });

    it('should not be recoverable', () => {
      const error = new ValidationError('Invalid');
      expect(error.recoverable).toBe(false);
    });

    it('should extend GameError', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(GameError);
    });
  });

  describe('ResourceError', () => {
    it('should have correct name', () => {
      const error = new ResourceError('Failed to load');
      expect(error.name).toBe('ResourceError');
    });

    it('should be recoverable', () => {
      const error = new ResourceError('Failed');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('PhysicsError', () => {
    it('should have correct name', () => {
      const error = new PhysicsError('Collision failed');
      expect(error.name).toBe('PhysicsError');
    });

    it('should be recoverable', () => {
      const error = new PhysicsError('Failed');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('AudioError', () => {
    it('should have correct name', () => {
      const error = new AudioError('Sound failed');
      expect(error.name).toBe('AudioError');
    });

    it('should be recoverable', () => {
      const error = new AudioError('Failed');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('RenderError', () => {
    it('should have correct name', () => {
      const error = new RenderError('Render failed');
      expect(error.name).toBe('RenderError');
    });

    it('should not be recoverable', () => {
      const error = new RenderError('Failed');
      expect(error.recoverable).toBe(false);
    });
  });

  // ==========================================================================
  // ErrorBoundary Initialization
  // ==========================================================================
  describe('constructor', () => {
    it('should create with default config', () => {
      const eb = new ErrorBoundary();
      expect(eb.config.maxErrors).toBe(100);
      expect(eb.config.rateLimitMs).toBe(1000);
    });

    it('should accept custom config', () => {
      const eb = new ErrorBoundary({ maxErrors: 50, rateLimitMs: 500 });
      expect(eb.config.maxErrors).toBe(50);
      expect(eb.config.rateLimitMs).toBe(500);
    });

    it('should start with empty errors', () => {
      expect(errorBoundary.getErrors()).toEqual([]);
      expect(errorBoundary.getErrorCount()).toBe(0);
    });
  });

  describe('init', () => {
    it('should set initialized flag', () => {
      errorBoundary.init();
      expect(errorBoundary._initialized).toBe(true);
    });

    it('should not reinitialize', () => {
      errorBoundary.init();
      const initialCount = errorBoundary.getErrorCount();
      errorBoundary.init();
      expect(errorBoundary.getErrorCount()).toBe(initialCount);
    });

    it('should emit init event', () => {
      const callback = vi.fn();
      errorBoundary.on('errorBoundary:init', callback);
      errorBoundary.init();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe('handleError', () => {
    it('should store errors', () => {
      errorBoundary.handleError(new Error('Test error'));
      expect(errorBoundary.getErrorCount()).toBe(1);
    });

    it('should normalize string errors', () => {
      errorBoundary.handleError('String error');
      const errors = errorBoundary.getErrors();
      expect(errors[0].message).toBe('String error');
      expect(errors[0].name).toBe('GameError');
    });

    it('should normalize Error instances', () => {
      const originalError = new TypeError('Type error');
      errorBoundary.handleError(originalError);

      const errors = errorBoundary.getErrors();
      expect(errors[0].message).toBe('Type error');
      expect(errors[0].context.originalName).toBe('TypeError');
    });

    it('should preserve GameError instances', () => {
      const gameError = new ValidationError('Invalid');
      errorBoundary.handleError(gameError);

      const errors = errorBoundary.getErrors();
      expect(errors[0].name).toBe('ValidationError');
    });

    it('should add context', () => {
      errorBoundary.handleError(new Error('Test'), { action: 'shooting' });
      const errors = errorBoundary.getErrors();
      expect(errors[0].context.action).toBe('shooting');
    });

    it('should merge context with existing error context', () => {
      const error = new GameError('Test', { original: true });
      errorBoundary.handleError(error, { added: true });

      const errors = errorBoundary.getErrors();
      expect(errors[0].context.original).toBe(true);
      expect(errors[0].context.added).toBe(true);
    });

    it('should return recoverable status', () => {
      const recoverableResult = errorBoundary.handleError(new GameError('Recoverable'));
      expect(recoverableResult).toBe(true);

      const nonRecoverableResult = errorBoundary.handleError(new ValidationError('Not recoverable'));
      expect(nonRecoverableResult).toBe(false);
    });

    it('should emit error event', () => {
      errorBoundary.config.emitEvents = true;
      const callback = vi.fn();
      errorBoundary.on('error', callback);

      errorBoundary.handleError(new Error('Test'));
      expect(callback).toHaveBeenCalled();
    });

    it('should emit event on global event bus', () => {
      errorBoundary.config.emitEvents = true;
      const eventBus = getEventBus();
      const callback = vi.fn();
      eventBus.on(GameEvents.ERROR, callback);

      errorBoundary.handleError(new Error('Test'));
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should rate limit duplicate errors', () => {
      errorBoundary.config.rateLimitMs = 1000;

      errorBoundary.handleError(new GameError('Same error'));
      errorBoundary.handleError(new GameError('Same error'));
      errorBoundary.handleError(new GameError('Same error'));

      expect(errorBoundary.getErrorCount()).toBe(1);
    });

    it('should not rate limit different errors', () => {
      errorBoundary.config.rateLimitMs = 1000;

      errorBoundary.handleError(new GameError('Error 1'));
      errorBoundary.handleError(new GameError('Error 2'));
      errorBoundary.handleError(new GameError('Error 3'));

      expect(errorBoundary.getErrorCount()).toBe(3);
    });
  });

  describe('max errors limit', () => {
    it('should remove old errors when over limit', () => {
      errorBoundary.config.maxErrors = 3;

      errorBoundary.handleError(new GameError('Error 1'));
      errorBoundary.handleError(new GameError('Error 2'));
      errorBoundary.handleError(new GameError('Error 3'));
      errorBoundary.handleError(new GameError('Error 4'));

      expect(errorBoundary.getErrorCount()).toBe(3);
      const errors = errorBoundary.getErrors();
      expect(errors[0].message).toBe('Error 2');
    });
  });

  // ==========================================================================
  // Function Wrapping
  // ==========================================================================
  describe('wrap', () => {
    it('should wrap sync function', () => {
      const fn = () => 42;
      const wrapped = errorBoundary.wrap(fn);

      expect(wrapped()).toBe(42);
    });

    it('should catch errors from wrapped function', () => {
      const fn = () => {
        throw new Error('Test error');
      };
      const wrapped = errorBoundary.wrap(fn);

      expect(() => wrapped()).toThrow('Test error');
      expect(errorBoundary.getErrorCount()).toBe(1);
    });

    it('should add context to caught errors', () => {
      const fn = () => {
        throw new Error('Test');
      };
      const wrapped = errorBoundary.wrap(fn, { component: 'Player' });

      try {
        wrapped();
      } catch {
        // Expected
      }

      const errors = errorBoundary.getErrors();
      expect(errors[0].context.component).toBe('Player');
    });

    it('should handle async functions', async () => {
      const fn = async () => {
        throw new Error('Async error');
      };
      const wrapped = errorBoundary.wrap(fn);

      await expect(wrapped()).rejects.toThrow('Async error');
      expect(errorBoundary.getErrorCount()).toBe(1);
    });

    it('should return async results', async () => {
      const fn = async () => 'async result';
      const wrapped = errorBoundary.wrap(fn);

      const result = await wrapped();
      expect(result).toBe('async result');
    });
  });

  describe('wrapWithRecovery', () => {
    it('should call recovery function on error', () => {
      const fn = () => {
        throw new GameError('Recoverable');
      };
      const recovery = vi.fn(() => 'recovered');
      const wrapped = errorBoundary.wrapWithRecovery(fn, recovery);

      const result = wrapped();
      expect(result).toBe('recovered');
      expect(recovery).toHaveBeenCalled();
    });

    it('should pass error to recovery function', () => {
      const fn = () => {
        throw new GameError('Test');
      };
      const recovery = vi.fn((error) => error.message);
      const wrapped = errorBoundary.wrapWithRecovery(fn, recovery);

      const result = wrapped();
      expect(result).toBe('Test');
    });

    it('should not call recovery for non-recoverable errors', () => {
      const fn = () => {
        throw new ValidationError('Non-recoverable');
      };
      const recovery = vi.fn();
      const wrapped = errorBoundary.wrapWithRecovery(fn, recovery);

      expect(() => wrapped()).toThrow('Non-recoverable');
      expect(recovery).not.toHaveBeenCalled();
    });

    it('should work with async functions', async () => {
      const fn = async () => {
        throw new GameError('Async error');
      };
      const recovery = vi.fn(() => 'async recovered');
      const wrapped = errorBoundary.wrapWithRecovery(fn, recovery);

      const result = await wrapped();
      expect(result).toBe('async recovered');
    });
  });

  // ==========================================================================
  // Game Loop Safety
  // ==========================================================================
  describe('createSafeGameLoop', () => {
    it('should wrap update function', () => {
      const update = vi.fn(() => 'updated');
      const safeUpdate = errorBoundary.createSafeGameLoop(update);

      const result = safeUpdate(0.016);
      expect(result).toBe('updated');
      expect(update).toHaveBeenCalledWith(0.016);
    });

    it('should catch errors and continue', () => {
      let callCount = 0;
      const update = () => {
        callCount++;
        if (callCount === 1) throw new Error('First call fails');
        return 'success';
      };
      const safeUpdate = errorBoundary.createSafeGameLoop(update);

      // First call throws but returns true (continue)
      expect(safeUpdate()).toBe(true);
      expect(errorBoundary.getErrorCount()).toBe(1);

      // Second call succeeds
      expect(safeUpdate()).toBe('success');
    });

    it('should call onError callback', () => {
      const update = () => {
        throw new Error('Test');
      };
      const onError = vi.fn();
      const safeUpdate = errorBoundary.createSafeGameLoop(update, onError);

      safeUpdate();
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should halt after too many consecutive errors', () => {
      const update = () => {
        throw new Error('Always fails');
      };
      const safeUpdate = errorBoundary.createSafeGameLoop(update);

      expect(safeUpdate()).toBe(true); // Continue
      expect(safeUpdate()).toBe(true); // Continue
      expect(safeUpdate()).toBe(false); // Halt
    });

    it('should reset consecutive error count on success', () => {
      let shouldFail = true;
      const update = () => {
        if (shouldFail) throw new Error('Fail');
        return 'success';
      };
      const safeUpdate = errorBoundary.createSafeGameLoop(update);

      safeUpdate(); // Fail 1
      safeUpdate(); // Fail 2

      shouldFail = false;
      expect(safeUpdate()).toBe('success'); // Resets counter

      shouldFail = true;
      safeUpdate(); // Fail 1 (reset)
      safeUpdate(); // Fail 2
      expect(safeUpdate()).toBe(false); // Fail 3 - halts
    });
  });

  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  describe('tryOrDefault', () => {
    it('should return function result on success', () => {
      const result = errorBoundary.tryOrDefault(() => 42, 0);
      expect(result).toBe(42);
    });

    it('should return fallback on error', () => {
      const result = errorBoundary.tryOrDefault(
        () => {
          throw new Error('Failed');
        },
        'fallback'
      );
      expect(result).toBe('fallback');
    });

    it('should store error when using fallback', () => {
      errorBoundary.tryOrDefault(
        () => {
          throw new Error('Test');
        },
        null
      );
      expect(errorBoundary.getErrorCount()).toBe(1);
    });

    it('should include fallbackUsed in context', () => {
      errorBoundary.tryOrDefault(
        () => {
          throw new Error('Test');
        },
        null,
        { operation: 'load' }
      );

      const errors = errorBoundary.getErrors();
      expect(errors[0].context.fallbackUsed).toBe(true);
      expect(errors[0].context.operation).toBe('load');
    });
  });

  describe('retryAsync', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn(() => 'success');
      const result = await errorBoundary.retryAsync(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry');
        return 'success';
      };

      const result = await errorBoundary.retryAsync(fn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      // Disable rate limiting for this test
      errorBoundary.config.rateLimitMs = 0;

      const fn = () => {
        throw new Error('Always fails');
      };

      await expect(errorBoundary.retryAsync(fn, 3, 10)).rejects.toThrow('Always fails');
      expect(errorBoundary.getErrorCount()).toBe(3);
    });

    it('should store all retry errors', async () => {
      // Disable rate limiting for this test
      errorBoundary.config.rateLimitMs = 0;

      const fn = () => {
        throw new Error('Fail');
      };

      try {
        await errorBoundary.retryAsync(fn, 3, 10);
      } catch {
        // Expected
      }

      const errors = errorBoundary.getErrors();
      expect(errors.length).toBe(3);
      expect(errors[0].context.attempt).toBe(0);
      expect(errors[2].context.attempt).toBe(2);
    });
  });

  // ==========================================================================
  // Error Retrieval
  // ==========================================================================
  describe('getErrors', () => {
    it('should return all errors as JSON', () => {
      errorBoundary.handleError(new GameError('Error 1'));
      errorBoundary.handleError(new GameError('Error 2'));

      const errors = errorBoundary.getErrors();
      expect(errors.length).toBe(2);
      expect(errors[0].message).toBe('Error 1');
      expect(errors[1].message).toBe('Error 2');
    });
  });

  describe('getErrorsByType', () => {
    it('should filter errors by type', () => {
      errorBoundary.handleError(new GameError('Game 1'));
      errorBoundary.handleError(new ValidationError('Val 1'));
      errorBoundary.handleError(new GameError('Game 2'));
      errorBoundary.handleError(new ResourceError('Res 1'));

      const gameErrors = errorBoundary.getErrorsByType('GameError');
      expect(gameErrors.length).toBe(2);

      const validationErrors = errorBoundary.getErrorsByType('ValidationError');
      expect(validationErrors.length).toBe(1);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      errorBoundary.handleError(new GameError('Error 1'));
      errorBoundary.handleError(new GameError('Error 2'));

      errorBoundary.clearErrors();
      expect(errorBoundary.getErrorCount()).toBe(0);
    });

    it('should emit cleared event', () => {
      const callback = vi.fn();
      errorBoundary.on('errors:cleared', callback);

      errorBoundary.clearErrors();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('should return error summary', () => {
      errorBoundary.handleError(new GameError('G1'));
      errorBoundary.handleError(new ValidationError('V1'));
      errorBoundary.handleError(new GameError('G2'));
      errorBoundary.handleError(new ResourceError('R1'));

      const summary = errorBoundary.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.byType.GameError).toBe(2);
      expect(summary.byType.ValidationError).toBe(1);
      expect(summary.byType.ResourceError).toBe(1);
      expect(summary.recoverable).toBe(3);
      expect(summary.nonRecoverable).toBe(1);
    });
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================
  describe('getErrorBoundary', () => {
    beforeEach(() => {
      resetErrorBoundary();
    });

    it('should return singleton instance', () => {
      const eb1 = getErrorBoundary();
      const eb2 = getErrorBoundary();

      expect(eb1).toBe(eb2);
    });

    it('should reset singleton', () => {
      const eb1 = getErrorBoundary();
      resetErrorBoundary();
      const eb2 = getErrorBoundary();

      expect(eb1).not.toBe(eb2);
    });
  });

  // ==========================================================================
  // ErrorSeverity
  // ==========================================================================
  describe('ErrorSeverity', () => {
    it('should export severity levels', () => {
      expect(ErrorSeverity.DEBUG).toBe('debug');
      expect(ErrorSeverity.INFO).toBe('info');
      expect(ErrorSeverity.WARNING).toBe('warning');
      expect(ErrorSeverity.ERROR).toBe('error');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });
});
