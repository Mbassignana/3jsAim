/**
 * PerformanceMonitor - Tracks FPS, frame times, and performance metrics
 * Provides real-time performance data for optimization and debugging
 */

import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {Object} PerformanceStats
 * @property {number} fps - Current frames per second
 * @property {number} avgFps - Average FPS over sample window
 * @property {number} minFps - Minimum FPS in sample window
 * @property {number} maxFps - Maximum FPS in sample window
 * @property {number} frameTime - Current frame time in ms
 * @property {number} avgFrameTime - Average frame time in ms
 * @property {number} memory - JS heap size (if available)
 * @property {number} drawCalls - Draw calls (if tracked)
 * @property {number} triangles - Triangle count (if tracked)
 */

export class PerformanceMonitor extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.sampleSize=60] - Number of frames to sample
   * @param {number} [options.updateInterval=500] - Stats update interval in ms
   * @param {boolean} [options.trackMemory=true] - Track memory usage
   * @param {number} [options.fpsWarningThreshold=30] - FPS warning threshold
   */
  constructor(options = {}) {
    super();

    this._sampleSize = options.sampleSize ?? 60;
    this._updateInterval = options.updateInterval ?? 500;
    this._trackMemory = options.trackMemory ?? true;
    this._fpsWarningThreshold = options.fpsWarningThreshold ?? 30;

    // Frame timing
    this._frameTimes = [];
    this._lastFrameTime = 0;
    this._deltaTime = 0;

    // Stats
    this._fps = 0;
    this._avgFps = 0;
    this._minFps = Infinity;
    this._maxFps = 0;
    this._frameTime = 0;
    this._avgFrameTime = 0;

    // Custom metrics
    this._customMetrics = new Map();

    // Render stats (set externally)
    this._drawCalls = 0;
    this._triangles = 0;

    // Update timing
    this._lastUpdateTime = 0;
    this._frameCount = 0;

    // State
    this._running = false;
    this._animFrameId = null;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this._running) {
      return;
    }

    this._running = true;
    this._lastFrameTime = performance.now();
    this._lastUpdateTime = this._lastFrameTime;
    this._frameCount = 0;
    this._frameTimes = [];

    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    this._running = false;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this.emit('stopped');
  }

  /**
   * Call this at the beginning of each frame
   * @returns {number} Delta time in seconds
   */
  beginFrame() {
    if (!this._running) {
      this.start();
    }

    const now = performance.now();
    this._deltaTime = (now - this._lastFrameTime) / 1000;
    this._frameTime = now - this._lastFrameTime;
    this._lastFrameTime = now;

    // Track frame time
    this._frameTimes.push(this._frameTime);
    if (this._frameTimes.length > this._sampleSize) {
      this._frameTimes.shift();
    }

    // Calculate current FPS
    this._fps = this._frameTime > 0 ? 1000 / this._frameTime : 0;

    // Update stats periodically
    this._frameCount++;
    if (now - this._lastUpdateTime >= this._updateInterval) {
      this._updateStats();
      this._lastUpdateTime = now;
    }

    return this._deltaTime;
  }

  /**
   * Call this at the end of each frame (optional, for render stats)
   * @param {Object} [renderStats] - Render stats from renderer
   */
  endFrame(renderStats) {
    if (renderStats) {
      this._drawCalls = renderStats.calls ?? renderStats.drawCalls ?? 0;
      this._triangles = renderStats.triangles ?? 0;
    }
  }

  /**
   * Update calculated statistics
   */
  _updateStats() {
    if (this._frameTimes.length === 0) {
      return;
    }

    // Calculate averages
    const sum = this._frameTimes.reduce((a, b) => a + b, 0);
    this._avgFrameTime = sum / this._frameTimes.length;
    this._avgFps = this._avgFrameTime > 0 ? 1000 / this._avgFrameTime : 0;

    // Calculate min/max FPS
    const fpsValues = this._frameTimes.map((t) => (t > 0 ? 1000 / t : 0));
    this._minFps = Math.min(...fpsValues);
    this._maxFps = Math.max(...fpsValues);

    // Check for warnings
    if (this._avgFps < this._fpsWarningThreshold) {
      this.emit('lowFps', { fps: this._avgFps, threshold: this._fpsWarningThreshold });
    }

    // Emit update event
    this.emit('update', this.getStats());
  }

  /**
   * Get current delta time
   * @returns {number} Delta time in seconds
   */
  get deltaTime() {
    return this._deltaTime;
  }

  /**
   * Get current FPS
   * @returns {number}
   */
  get fps() {
    return Math.round(this._fps);
  }

  /**
   * Get average FPS
   * @returns {number}
   */
  get avgFps() {
    return Math.round(this._avgFps);
  }

  /**
   * Get current frame time in ms
   * @returns {number}
   */
  get frameTime() {
    return this._frameTime;
  }

  /**
   * Get all performance stats
   * @returns {PerformanceStats}
   */
  getStats() {
    const stats = {
      fps: Math.round(this._fps),
      avgFps: Math.round(this._avgFps),
      minFps: Math.round(this._minFps),
      maxFps: Math.round(this._maxFps),
      frameTime: this._frameTime.toFixed(2),
      avgFrameTime: this._avgFrameTime.toFixed(2),
      drawCalls: this._drawCalls,
      triangles: this._triangles,
    };

    // Add memory if available
    if (this._trackMemory && performance.memory) {
      stats.memory = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
      stats.memoryLimit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
    }

    // Add custom metrics
    this._customMetrics.forEach((value, key) => {
      stats[key] = value;
    });

    return stats;
  }

  /**
   * Get formatted stats string for display
   * @returns {string}
   */
  getFormattedStats() {
    const stats = this.getStats();
    let str = `FPS: ${stats.fps} (avg: ${stats.avgFps})`;
    str += `\nFrame: ${stats.frameTime}ms`;

    if (stats.drawCalls > 0) {
      str += `\nDraw calls: ${stats.drawCalls}`;
    }
    if (stats.triangles > 0) {
      str += `\nTriangles: ${stats.triangles.toLocaleString()}`;
    }
    if (stats.memory) {
      str += `\nMemory: ${stats.memory}MB / ${stats.memoryLimit}MB`;
    }

    return str;
  }

  /**
   * Set a custom metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  setMetric(name, value) {
    this._customMetrics.set(name, value);
  }

  /**
   * Get a custom metric
   * @param {string} name - Metric name
   * @returns {number|undefined}
   */
  getMetric(name) {
    return this._customMetrics.get(name);
  }

  /**
   * Clear custom metrics
   */
  clearMetrics() {
    this._customMetrics.clear();
  }

  /**
   * Set draw calls count
   * @param {number} count
   */
  setDrawCalls(count) {
    this._drawCalls = count;
  }

  /**
   * Set triangle count
   * @param {number} count
   */
  setTriangles(count) {
    this._triangles = count;
  }

  /**
   * Check if running
   * @returns {boolean}
   */
  get isRunning() {
    return this._running;
  }

  /**
   * Reset all stats
   */
  reset() {
    this._frameTimes = [];
    this._fps = 0;
    this._avgFps = 0;
    this._minFps = Infinity;
    this._maxFps = 0;
    this._frameTime = 0;
    this._avgFrameTime = 0;
    this._drawCalls = 0;
    this._triangles = 0;
    this._frameCount = 0;
    this._customMetrics.clear();
  }

  /**
   * Set FPS warning threshold
   * @param {number} threshold
   */
  setWarningThreshold(threshold) {
    this._fpsWarningThreshold = threshold;
  }

  /**
   * Create a timing marker for measuring specific operations
   * @param {string} name - Marker name
   * @returns {{end: () => number}} Object with end() method returning duration in ms
   */
  mark(name) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.setMetric(name, duration);
        return duration;
      },
    };
  }

  /**
   * Measure a function's execution time
   * @template T
   * @param {string} name - Metric name
   * @param {() => T} fn - Function to measure
   * @returns {T} Function result
   */
  measure(name, fn) {
    const marker = this.mark(name);
    const result = fn();
    marker.end();
    return result;
  }

  /**
   * Measure an async function's execution time
   * @template T
   * @param {string} name - Metric name
   * @param {() => Promise<T>} fn - Async function to measure
   * @returns {Promise<T>} Function result
   */
  async measureAsync(name, fn) {
    const marker = this.mark(name);
    const result = await fn();
    marker.end();
    return result;
  }
}

// Singleton instance
let performanceMonitorInstance = null;

/**
 * Get the global performance monitor instance
 * @returns {PerformanceMonitor}
 */
export function getPerformanceMonitor() {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

/**
 * Reset the global performance monitor
 */
export function resetPerformanceMonitor() {
  if (performanceMonitorInstance) {
    performanceMonitorInstance.stop();
    performanceMonitorInstance.removeAllListeners();
  }
  performanceMonitorInstance = null;
}

export default PerformanceMonitor;
