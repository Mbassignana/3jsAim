/**
 * Unit tests for PerformanceMonitor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  PerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor,
} from '@/utils/PerformanceMonitor.js';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    resetPerformanceMonitor();
    vi.useFakeTimers();
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(monitor._sampleSize).toBe(60);
      expect(monitor._updateInterval).toBe(500);
      expect(monitor._trackMemory).toBe(true);
      expect(monitor._fpsWarningThreshold).toBe(30);
    });

    it('should accept custom settings', () => {
      const custom = new PerformanceMonitor({
        sampleSize: 30,
        updateInterval: 1000,
        trackMemory: false,
        fpsWarningThreshold: 45,
      });
      expect(custom._sampleSize).toBe(30);
      expect(custom._updateInterval).toBe(1000);
      expect(custom._trackMemory).toBe(false);
      expect(custom._fpsWarningThreshold).toBe(45);
    });

    it('should not be running initially', () => {
      expect(monitor.isRunning).toBe(false);
    });

    it('should initialize stats to zero', () => {
      expect(monitor.fps).toBe(0);
      expect(monitor.avgFps).toBe(0);
      expect(monitor.frameTime).toBe(0);
    });
  });

  describe('start', () => {
    it('should start monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    it('should emit started event', () => {
      const callback = vi.fn();
      monitor.on('started', callback);
      monitor.start();
      expect(callback).toHaveBeenCalled();
    });

    it('should not restart if already running', () => {
      const callback = vi.fn();
      monitor.on('started', callback);
      monitor.start();
      monitor.start();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset frame times on start', () => {
      monitor._frameTimes = [16, 16, 16];
      monitor.start();
      expect(monitor._frameTimes).toEqual([]);
    });
  });

  describe('stop', () => {
    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });

    it('should emit stopped event', () => {
      monitor.start();
      const callback = vi.fn();
      monitor.on('stopped', callback);
      monitor.stop();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('beginFrame', () => {
    it('should auto-start if not running', () => {
      expect(monitor.isRunning).toBe(false);
      monitor.beginFrame();
      expect(monitor.isRunning).toBe(true);
    });

    it('should return delta time in seconds', () => {
      monitor.start();
      vi.advanceTimersByTime(16);
      const delta = monitor.beginFrame();
      expect(delta).toBeCloseTo(0.016, 2);
    });

    it('should track frame time in ms', () => {
      monitor.start();
      vi.advanceTimersByTime(16);
      monitor.beginFrame();
      expect(monitor.frameTime).toBeCloseTo(16, 0);
    });

    it('should calculate current FPS', () => {
      monitor.start();
      vi.advanceTimersByTime(16); // ~60 FPS frame time
      monitor.beginFrame();
      // 1000/16 ≈ 62.5, rounded could be 62 or 63
      expect(monitor.fps).toBeGreaterThanOrEqual(60);
      expect(monitor.fps).toBeLessThanOrEqual(65);
    });

    it('should accumulate frame times', () => {
      monitor.start();
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(16);
        monitor.beginFrame();
      }
      expect(monitor._frameTimes.length).toBe(5);
    });

    it('should limit frame times to sample size', () => {
      const custom = new PerformanceMonitor({ sampleSize: 3 });
      custom.start();
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(16);
        custom.beginFrame();
      }
      expect(custom._frameTimes.length).toBe(3);
    });
  });

  describe('endFrame', () => {
    it('should update render stats from object', () => {
      monitor.endFrame({ calls: 100, triangles: 5000 });
      expect(monitor._drawCalls).toBe(100);
      expect(monitor._triangles).toBe(5000);
    });

    it('should handle drawCalls property name', () => {
      monitor.endFrame({ drawCalls: 50, triangles: 2500 });
      expect(monitor._drawCalls).toBe(50);
    });

    it('should handle missing stats', () => {
      monitor.endFrame({});
      expect(monitor._drawCalls).toBe(0);
      expect(monitor._triangles).toBe(0);
    });
  });

  describe('_updateStats', () => {
    it('should calculate average frame time', () => {
      monitor._frameTimes = [16, 16, 16, 16, 16];
      monitor._updateStats();
      expect(monitor._avgFrameTime).toBe(16);
    });

    it('should calculate average FPS', () => {
      monitor._frameTimes = [16, 16, 16, 16, 16];
      monitor._updateStats();
      expect(monitor._avgFps).toBeCloseTo(62.5, 0);
    });

    it('should calculate min/max FPS', () => {
      monitor._frameTimes = [10, 20, 16]; // 100 FPS, 50 FPS, 62.5 FPS
      monitor._updateStats();
      expect(monitor._minFps).toBeCloseTo(50, 0);
      expect(monitor._maxFps).toBeCloseTo(100, 0);
    });

    it('should emit lowFps warning when below threshold', () => {
      const callback = vi.fn();
      monitor.on('lowFps', callback);
      monitor._frameTimes = [50, 50, 50]; // 20 FPS
      monitor._updateStats();
      expect(callback).toHaveBeenCalledWith({
        fps: expect.any(Number),
        threshold: 30,
      });
    });

    it('should emit update event with stats', () => {
      const callback = vi.fn();
      monitor.on('update', callback);
      monitor._frameTimes = [16, 16, 16];
      monitor._updateStats();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        fps: expect.any(Number),
        avgFps: expect.any(Number),
      }));
    });

    it('should handle empty frame times', () => {
      monitor._frameTimes = [];
      monitor._updateStats(); // Should not throw
      expect(monitor._avgFps).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      monitor._fps = 60;
      monitor._avgFps = 58;
      monitor._minFps = 45;
      monitor._maxFps = 62;
      monitor._frameTime = 16.5;
      monitor._avgFrameTime = 17.2;
      monitor._drawCalls = 100;
      monitor._triangles = 5000;
    });

    it('should return all stats', () => {
      const stats = monitor.getStats();
      expect(stats.fps).toBe(60);
      expect(stats.avgFps).toBe(58);
      expect(stats.minFps).toBe(45);
      expect(stats.maxFps).toBe(62);
      expect(stats.frameTime).toBe('16.50');
      expect(stats.avgFrameTime).toBe('17.20');
      expect(stats.drawCalls).toBe(100);
      expect(stats.triangles).toBe(5000);
    });

    it('should include custom metrics', () => {
      monitor.setMetric('customValue', 42);
      const stats = monitor.getStats();
      expect(stats.customValue).toBe(42);
    });

    it('should include memory if available', () => {
      // Mock performance.memory (Chrome only)
      const originalMemory = performance.memory;
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024,
        },
        configurable: true,
      });

      const stats = monitor.getStats();
      expect(stats.memory).toBe(50);
      expect(stats.memoryLimit).toBe(2048);

      // Restore
      if (originalMemory) {
        Object.defineProperty(performance, 'memory', {
          value: originalMemory,
          configurable: true,
        });
      } else {
        delete performance.memory;
      }
    });
  });

  describe('getFormattedStats', () => {
    it('should return formatted string', () => {
      monitor._fps = 60;
      monitor._avgFps = 58;
      monitor._frameTime = 16.5;
      const formatted = monitor.getFormattedStats();
      expect(formatted).toContain('FPS: 60');
      expect(formatted).toContain('avg: 58');
    });

    it('should include draw calls if present', () => {
      monitor._fps = 60;
      monitor._avgFps = 58;
      monitor._frameTime = 16;
      monitor._drawCalls = 100;
      const formatted = monitor.getFormattedStats();
      expect(formatted).toContain('Draw calls: 100');
    });

    it('should include triangles if present', () => {
      monitor._fps = 60;
      monitor._avgFps = 58;
      monitor._frameTime = 16;
      monitor._triangles = 5000;
      const formatted = monitor.getFormattedStats();
      expect(formatted).toContain('Triangles: 5,000');
    });
  });

  describe('custom metrics', () => {
    it('should set metric', () => {
      monitor.setMetric('testMetric', 123);
      expect(monitor.getMetric('testMetric')).toBe(123);
    });

    it('should get undefined for unset metric', () => {
      expect(monitor.getMetric('nonexistent')).toBeUndefined();
    });

    it('should clear all metrics', () => {
      monitor.setMetric('a', 1);
      monitor.setMetric('b', 2);
      monitor.clearMetrics();
      expect(monitor.getMetric('a')).toBeUndefined();
      expect(monitor.getMetric('b')).toBeUndefined();
    });
  });

  describe('render stats setters', () => {
    it('should set draw calls', () => {
      monitor.setDrawCalls(200);
      expect(monitor._drawCalls).toBe(200);
    });

    it('should set triangles', () => {
      monitor.setTriangles(10000);
      expect(monitor._triangles).toBe(10000);
    });
  });

  describe('reset', () => {
    it('should reset all stats', () => {
      monitor._fps = 60;
      monitor._avgFps = 58;
      monitor._frameTimes = [16, 16, 16];
      monitor._drawCalls = 100;
      monitor._triangles = 5000;
      monitor.setMetric('test', 42);

      monitor.reset();

      expect(monitor._fps).toBe(0);
      expect(monitor._avgFps).toBe(0);
      expect(monitor._frameTimes).toEqual([]);
      expect(monitor._drawCalls).toBe(0);
      expect(monitor._triangles).toBe(0);
      expect(monitor.getMetric('test')).toBeUndefined();
    });

    it('should reset min/max FPS', () => {
      monitor._minFps = 30;
      monitor._maxFps = 90;
      monitor.reset();
      expect(monitor._minFps).toBe(Infinity);
      expect(monitor._maxFps).toBe(0);
    });
  });

  describe('setWarningThreshold', () => {
    it('should update FPS warning threshold', () => {
      monitor.setWarningThreshold(45);
      expect(monitor._fpsWarningThreshold).toBe(45);
    });
  });

  describe('mark', () => {
    it('should create timing marker', () => {
      const marker = monitor.mark('testMark');
      expect(typeof marker.end).toBe('function');
    });

    it('should measure duration', () => {
      const marker = monitor.mark('testMark');
      vi.advanceTimersByTime(50);
      const duration = marker.end();
      expect(duration).toBeCloseTo(50, 0);
    });

    it('should set metric on end', () => {
      const marker = monitor.mark('testMark');
      vi.advanceTimersByTime(25);
      marker.end();
      expect(monitor.getMetric('testMark')).toBeCloseTo(25, 0);
    });
  });

  describe('measure', () => {
    it('should measure sync function execution', () => {
      const fn = vi.fn(() => {
        vi.advanceTimersByTime(10);
        return 'result';
      });

      const result = monitor.measure('testFn', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(monitor.getMetric('testFn')).toBeCloseTo(10, 0);
    });
  });

  describe('measureAsync', () => {
    it('should measure async function execution', async () => {
      vi.useRealTimers(); // Need real timers for async

      const fn = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'asyncResult';
      });

      const result = await monitor.measureAsync('asyncFn', fn);

      expect(result).toBe('asyncResult');
      expect(fn).toHaveBeenCalled();
      expect(monitor.getMetric('asyncFn')).toBeGreaterThan(0);
    });
  });

  describe('deltaTime getter', () => {
    it('should return delta time', () => {
      monitor._deltaTime = 0.016;
      expect(monitor.deltaTime).toBe(0.016);
    });
  });

  describe('fps getter', () => {
    it('should return rounded FPS', () => {
      monitor._fps = 59.7;
      expect(monitor.fps).toBe(60);
    });
  });

  describe('avgFps getter', () => {
    it('should return rounded average FPS', () => {
      monitor._avgFps = 58.3;
      expect(monitor.avgFps).toBe(58);
    });
  });

  describe('frameTime getter', () => {
    it('should return frame time in ms', () => {
      monitor._frameTime = 16.67;
      expect(monitor.frameTime).toBe(16.67);
    });
  });
});

describe('Global PerformanceMonitor', () => {
  beforeEach(() => {
    resetPerformanceMonitor();
  });

  it('should return same instance', () => {
    const p1 = getPerformanceMonitor();
    const p2 = getPerformanceMonitor();
    expect(p1).toBe(p2);
  });

  it('should reset properly', () => {
    const p1 = getPerformanceMonitor();
    resetPerformanceMonitor();
    const p2 = getPerformanceMonitor();
    expect(p2).not.toBe(p1);
  });

  it('should stop on reset', () => {
    const p1 = getPerformanceMonitor();
    p1.start();
    expect(p1.isRunning).toBe(true);
    resetPerformanceMonitor();
    expect(p1.isRunning).toBe(false);
  });
});
