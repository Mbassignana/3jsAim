/**
 * HitMarker - Provides visual feedback for hits and accuracy
 * Supports crosshair-based hit markers, kill confirms, and floating damage numbers
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { ObjectPool } from '../utils/ObjectPool.js';

/**
 * @typedef {Object} MarkerConfig
 * @property {'hit'|'headshot'|'kill'|'miss'|'critical'} type - Marker type
 * @property {string} [color] - Override color
 * @property {number} [scale] - Size multiplier
 * @property {number} [duration] - Display duration in ms
 */

export const MarkerTypes = {
  HIT: 'hit',
  HEADSHOT: 'headshot',
  KILL: 'kill',
  MISS: 'miss',
  CRITICAL: 'critical',
};

export const MarkerStyles = {
  hit: {
    color: '#ffffff',
    size: 20,
    thickness: 2,
    duration: 150,
    fadeStart: 0.7,
    sound: 'hit',
  },
  headshot: {
    color: '#ff4444',
    size: 24,
    thickness: 3,
    duration: 200,
    fadeStart: 0.6,
    sound: 'headshot',
  },
  kill: {
    color: '#ff0000',
    size: 28,
    thickness: 3,
    duration: 300,
    fadeStart: 0.5,
    sound: 'kill',
  },
  miss: {
    color: '#888888',
    size: 16,
    thickness: 1,
    duration: 100,
    fadeStart: 0.8,
    sound: null,
  },
  critical: {
    color: '#ffff00',
    size: 26,
    thickness: 3,
    duration: 250,
    fadeStart: 0.6,
    sound: 'critical',
  },
};

/**
 * Active hit marker instance
 */
class ActiveMarker {
  /**
   * @param {string} type
   * @param {Object} style
   * @param {Object} [options]
   */
  constructor(type, style, options = {}) {
    this.type = type;
    this.color = options.color ?? style.color;
    this.size = (options.scale ?? 1) * style.size;
    this.thickness = style.thickness;
    this.duration = options.duration ?? style.duration;
    this.fadeStart = style.fadeStart;
    this.elapsed = 0;
    this.opacity = 1;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
  }

  /**
   * Update marker state
   * @param {number} deltaTime - Time in ms
   * @returns {boolean} - Whether marker is still active
   */
  update(deltaTime) {
    this.elapsed += deltaTime;

    if (this.elapsed >= this.duration) {
      return false;
    }

    // Calculate opacity with fade
    const progress = this.elapsed / this.duration;
    if (progress >= this.fadeStart) {
      const fadeProgress = (progress - this.fadeStart) / (1 - this.fadeStart);
      this.opacity = 1 - fadeProgress;
    }

    return true;
  }

  /**
   * Check if marker is complete
   * @returns {boolean}
   */
  get isDone() {
    return this.elapsed >= this.duration;
  }
}

/**
 * Floating damage number
 */
class DamageNumber {
  /**
   * @param {number} damage
   * @param {Object} [options]
   */
  constructor(damage, options = {}) {
    this.damage = damage;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.color = options.color ?? '#ffffff';
    this.isCritical = options.critical ?? false;
    this.duration = options.duration ?? 800;
    this.elapsed = 0;
    this.opacity = 1;
    this.scale = 1;
    this.velocityY = options.velocityY ?? -2;
    this.offsetY = 0;
  }

  /**
   * Update damage number
   * @param {number} deltaTime
   * @returns {boolean}
   */
  update(deltaTime) {
    this.elapsed += deltaTime;

    if (this.elapsed >= this.duration) {
      return false;
    }

    // Float upward
    this.offsetY += this.velocityY * (deltaTime / 16);

    // Fade and scale
    const progress = this.elapsed / this.duration;
    if (progress > 0.5) {
      const fadeProgress = (progress - 0.5) / 0.5;
      this.opacity = 1 - fadeProgress;
    }

    // Pop effect for critical hits
    if (this.isCritical && this.elapsed < 100) {
      this.scale = 1 + (0.3 * (1 - this.elapsed / 100));
    } else {
      this.scale = 1;
    }

    return true;
  }

  /**
   * Get display text
   * @returns {string}
   */
  getText() {
    return this.isCritical ? `${this.damage}!` : String(this.damage);
  }
}

export class HitMarker extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.enabled=true]
   * @param {boolean} [options.showDamageNumbers=true]
   * @param {number} [options.maxMarkers=10]
   * @param {number} [options.maxDamageNumbers=20]
   */
  constructor(options = {}) {
    super();

    this._enabled = options.enabled ?? true;
    this._showDamageNumbers = options.showDamageNumbers ?? true;
    this._maxMarkers = options.maxMarkers ?? 10;
    this._maxDamageNumbers = options.maxDamageNumbers ?? 20;

    /** @type {ActiveMarker[]} */
    this._activeMarkers = [];

    /** @type {DamageNumber[]} */
    this._damageNumbers = [];

    // Object pools
    this._markerPool = new ObjectPool({
      factory: () => ({ type: '', color: '', size: 0, opacity: 1, elapsed: 0 }),
      reset: (m) => {
        m.elapsed = 0;
        m.opacity = 1;
      },
      initialSize: 5,
      maxSize: this._maxMarkers,
    });

    this._numberPool = new ObjectPool({
      factory: () => ({ damage: 0, x: 0, y: 0, opacity: 1, elapsed: 0, offsetY: 0 }),
      reset: (n) => {
        n.elapsed = 0;
        n.opacity = 1;
        n.offsetY = 0;
        n.scale = 1;
      },
      initialSize: 10,
      maxSize: this._maxDamageNumbers,
    });

    // Last update time
    this._lastTime = 0;
  }

  /**
   * Show a hit marker
   * @param {string|MarkerConfig} typeOrConfig
   * @param {Object} [options]
   * @returns {ActiveMarker|null}
   */
  show(typeOrConfig, options = {}) {
    if (!this._enabled) {
      return null;
    }

    let type, config;
    if (typeof typeOrConfig === 'string') {
      type = typeOrConfig.toLowerCase();
      config = options;
    } else {
      type = typeOrConfig.type?.toLowerCase() ?? 'hit';
      config = typeOrConfig;
    }

    const style = MarkerStyles[type];
    if (!style) {
      console.warn(`Unknown marker type: ${type}`);
      return null;
    }

    // Limit active markers
    if (this._activeMarkers.length >= this._maxMarkers) {
      this._activeMarkers.shift();
    }

    const marker = new ActiveMarker(type, style, config);
    this._activeMarkers.push(marker);

    this.emit('markerShow', { type, marker });

    return marker;
  }

  /**
   * Show a hit marker at screen center
   * @param {string} type
   * @returns {ActiveMarker|null}
   */
  showHit(type = 'hit') {
    return this.show(type);
  }

  /**
   * Show headshot marker
   * @returns {ActiveMarker|null}
   */
  showHeadshot() {
    return this.show('headshot');
  }

  /**
   * Show kill marker
   * @returns {ActiveMarker|null}
   */
  showKill() {
    return this.show('kill');
  }

  /**
   * Show miss marker
   * @returns {ActiveMarker|null}
   */
  showMiss() {
    return this.show('miss');
  }

  /**
   * Show damage number
   * @param {number} damage
   * @param {Object} [options]
   * @returns {DamageNumber|null}
   */
  showDamage(damage, options = {}) {
    if (!this._enabled || !this._showDamageNumbers) {
      return null;
    }

    // Limit damage numbers
    if (this._damageNumbers.length >= this._maxDamageNumbers) {
      this._damageNumbers.shift();
    }

    const number = new DamageNumber(damage, options);
    this._damageNumbers.push(number);

    this.emit('damageShow', { damage, number });

    return number;
  }

  /**
   * Update all markers and damage numbers
   * @param {number} [deltaTime]
   */
  update(deltaTime) {
    const now = performance.now();
    if (deltaTime === undefined) {
      deltaTime = this._lastTime > 0 ? now - this._lastTime : 16;
    }
    this._lastTime = now;

    // Update markers
    this._activeMarkers = this._activeMarkers.filter((marker) => {
      const active = marker.update(deltaTime);
      if (!active) {
        this.emit('markerEnd', { marker });
      }
      return active;
    });

    // Update damage numbers
    this._damageNumbers = this._damageNumbers.filter((number) => {
      const active = number.update(deltaTime);
      if (!active) {
        this.emit('damageEnd', { number });
      }
      return active;
    });
  }

  /**
   * Render markers to a canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   */
  render(ctx, centerX, centerY) {
    if (!this._enabled) {
      return;
    }

    // Render hit markers
    for (const marker of this._activeMarkers) {
      this._renderMarker(ctx, marker, centerX + marker.x, centerY + marker.y);
    }

    // Render damage numbers
    if (this._showDamageNumbers) {
      for (const number of this._damageNumbers) {
        this._renderDamageNumber(ctx, number);
      }
    }
  }

  /**
   * Render a single hit marker
   * @param {CanvasRenderingContext2D} ctx
   * @param {ActiveMarker} marker
   * @param {number} x
   * @param {number} y
   */
  _renderMarker(ctx, marker, x, y) {
    ctx.save();

    ctx.globalAlpha = marker.opacity;
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = marker.thickness;
    ctx.lineCap = 'round';

    const size = marker.size / 2;
    const gap = size * 0.3; // Gap in center

    // Draw X pattern for hit marker
    ctx.beginPath();

    // Top-left to center-gap
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x - gap, y - gap);

    // Top-right to center-gap
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x + gap, y - gap);

    // Bottom-left to center-gap
    ctx.moveTo(x - size, y + size);
    ctx.lineTo(x - gap, y + gap);

    // Bottom-right to center-gap
    ctx.moveTo(x + size, y + size);
    ctx.lineTo(x + gap, y + gap);

    ctx.stroke();

    // For kill/headshot, add outer ring
    if (marker.type === 'kill' || marker.type === 'headshot') {
      ctx.beginPath();
      ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render a damage number
   * @param {CanvasRenderingContext2D} ctx
   * @param {DamageNumber} number
   */
  _renderDamageNumber(ctx, number) {
    ctx.save();

    ctx.globalAlpha = number.opacity;
    ctx.fillStyle = number.color;

    const fontSize = (number.isCritical ? 24 : 18) * number.scale;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add shadow for visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const text = number.getText();
    ctx.fillText(text, number.x, number.y + number.offsetY);

    ctx.restore();
  }

  /**
   * Get active marker count
   * @returns {number}
   */
  get markerCount() {
    return this._activeMarkers.length;
  }

  /**
   * Get damage number count
   * @returns {number}
   */
  get damageNumberCount() {
    return this._damageNumbers.length;
  }

  /**
   * Check if any markers are active
   * @returns {boolean}
   */
  get hasActiveMarkers() {
    return this._activeMarkers.length > 0 || this._damageNumbers.length > 0;
  }

  /**
   * Get all active markers
   * @returns {ActiveMarker[]}
   */
  getMarkers() {
    return [...this._activeMarkers];
  }

  /**
   * Get all damage numbers
   * @returns {DamageNumber[]}
   */
  getDamageNumbers() {
    return [...this._damageNumbers];
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this._activeMarkers = [];
    this.emit('markersCleared');
  }

  /**
   * Clear all damage numbers
   */
  clearDamageNumbers() {
    this._damageNumbers = [];
    this.emit('damageCleared');
  }

  /**
   * Clear everything
   */
  clearAll() {
    this.clearMarkers();
    this.clearDamageNumbers();
  }

  /**
   * Enable hit markers
   */
  enable() {
    this._enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable hit markers
   */
  disable() {
    this._enabled = false;
    this.clearAll();
    this.emit('disabled');
  }

  /**
   * Check if enabled
   * @returns {boolean}
   */
  get isEnabled() {
    return this._enabled;
  }

  /**
   * Enable damage numbers
   */
  enableDamageNumbers() {
    this._showDamageNumbers = true;
  }

  /**
   * Disable damage numbers
   */
  disableDamageNumbers() {
    this._showDamageNumbers = false;
    this.clearDamageNumbers();
  }

  /**
   * Check if damage numbers enabled
   * @returns {boolean}
   */
  get showDamageNumbers() {
    return this._showDamageNumbers;
  }

  /**
   * Reset all state
   */
  reset() {
    this.clearAll();
    this._lastTime = 0;
  }
}

// Singleton instance
let hitMarkerInstance = null;

/**
 * Get the global hit marker instance
 * @returns {HitMarker}
 */
export function getHitMarker() {
  if (!hitMarkerInstance) {
    hitMarkerInstance = new HitMarker();
  }
  return hitMarkerInstance;
}

/**
 * Reset the global hit marker instance
 */
export function resetHitMarker() {
  if (hitMarkerInstance) {
    hitMarkerInstance.reset();
    hitMarkerInstance.removeAllListeners();
  }
  hitMarkerInstance = null;
}

export default HitMarker;
