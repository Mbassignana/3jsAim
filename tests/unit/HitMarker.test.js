/**
 * Unit tests for HitMarker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  HitMarker,
  MarkerTypes,
  MarkerStyles,
  getHitMarker,
  resetHitMarker,
} from '@/effects/HitMarker.js';

describe('HitMarker', () => {
  let hitMarker;

  beforeEach(() => {
    resetHitMarker();
    vi.useFakeTimers();
    hitMarker = new HitMarker();
  });

  afterEach(() => {
    hitMarker.reset();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(hitMarker._enabled).toBe(true);
      expect(hitMarker._showDamageNumbers).toBe(true);
      expect(hitMarker._maxMarkers).toBe(10);
      expect(hitMarker._maxDamageNumbers).toBe(20);
    });

    it('should accept custom settings', () => {
      const custom = new HitMarker({
        enabled: false,
        showDamageNumbers: false,
        maxMarkers: 5,
        maxDamageNumbers: 10,
      });
      expect(custom._enabled).toBe(false);
      expect(custom._showDamageNumbers).toBe(false);
      expect(custom._maxMarkers).toBe(5);
      expect(custom._maxDamageNumbers).toBe(10);
    });

    it('should start with no active markers', () => {
      expect(hitMarker.markerCount).toBe(0);
      expect(hitMarker.damageNumberCount).toBe(0);
      expect(hitMarker.hasActiveMarkers).toBe(false);
    });
  });

  describe('MarkerTypes', () => {
    it('should have all marker types defined', () => {
      expect(MarkerTypes.HIT).toBe('hit');
      expect(MarkerTypes.HEADSHOT).toBe('headshot');
      expect(MarkerTypes.KILL).toBe('kill');
      expect(MarkerTypes.MISS).toBe('miss');
      expect(MarkerTypes.CRITICAL).toBe('critical');
    });
  });

  describe('MarkerStyles', () => {
    it('should have hit style', () => {
      expect(MarkerStyles.hit).toBeDefined();
      expect(MarkerStyles.hit.color).toBe('#ffffff');
      expect(MarkerStyles.hit.duration).toBe(150);
    });

    it('should have headshot style', () => {
      expect(MarkerStyles.headshot).toBeDefined();
      expect(MarkerStyles.headshot.color).toBe('#ff4444');
    });

    it('should have kill style', () => {
      expect(MarkerStyles.kill).toBeDefined();
      expect(MarkerStyles.kill.color).toBe('#ff0000');
    });

    it('should have miss style', () => {
      expect(MarkerStyles.miss).toBeDefined();
      expect(MarkerStyles.miss.color).toBe('#888888');
    });

    it('should have critical style', () => {
      expect(MarkerStyles.critical).toBeDefined();
      expect(MarkerStyles.critical.color).toBe('#ffff00');
    });
  });

  describe('show', () => {
    it('should show marker with type string', () => {
      const result = hitMarker.show('hit');
      expect(result).not.toBeNull();
      expect(hitMarker.markerCount).toBe(1);
    });

    it('should show marker with config object', () => {
      const result = hitMarker.show({ type: 'kill', scale: 1.5 });
      expect(result).not.toBeNull();
      expect(result.type).toBe('kill');
    });

    it('should handle uppercase type', () => {
      const result = hitMarker.show('HEADSHOT');
      expect(result).not.toBeNull();
      expect(result.type).toBe('headshot');
    });

    it('should return null for unknown type', () => {
      const result = hitMarker.show('unknown');
      expect(result).toBeNull();
    });

    it('should return null when disabled', () => {
      hitMarker.disable();
      const result = hitMarker.show('hit');
      expect(result).toBeNull();
    });

    it('should emit markerShow event', () => {
      const callback = vi.fn();
      hitMarker.on('markerShow', callback);
      hitMarker.show('hit');
      expect(callback).toHaveBeenCalled();
    });

    it('should apply custom color', () => {
      const result = hitMarker.show({ type: 'hit', color: '#00ff00' });
      expect(result.color).toBe('#00ff00');
    });

    it('should apply scale multiplier', () => {
      const result = hitMarker.show({ type: 'hit', scale: 2 });
      expect(result.size).toBe(MarkerStyles.hit.size * 2);
    });

    it('should limit to maxMarkers', () => {
      const limited = new HitMarker({ maxMarkers: 3 });
      for (let i = 0; i < 5; i++) {
        limited.show('hit');
      }
      expect(limited.markerCount).toBe(3);
    });
  });

  describe('showHit', () => {
    it('should show hit marker', () => {
      const result = hitMarker.showHit();
      expect(result).not.toBeNull();
      expect(result.type).toBe('hit');
    });

    it('should accept custom type', () => {
      const result = hitMarker.showHit('critical');
      expect(result.type).toBe('critical');
    });
  });

  describe('showHeadshot', () => {
    it('should show headshot marker', () => {
      const result = hitMarker.showHeadshot();
      expect(result).not.toBeNull();
      expect(result.type).toBe('headshot');
    });
  });

  describe('showKill', () => {
    it('should show kill marker', () => {
      const result = hitMarker.showKill();
      expect(result).not.toBeNull();
      expect(result.type).toBe('kill');
    });
  });

  describe('showMiss', () => {
    it('should show miss marker', () => {
      const result = hitMarker.showMiss();
      expect(result).not.toBeNull();
      expect(result.type).toBe('miss');
    });
  });

  describe('showDamage', () => {
    it('should show damage number', () => {
      const result = hitMarker.showDamage(100);
      expect(result).not.toBeNull();
      expect(result.damage).toBe(100);
    });

    it('should return null when disabled', () => {
      hitMarker.disable();
      const result = hitMarker.showDamage(50);
      expect(result).toBeNull();
    });

    it('should return null when damage numbers disabled', () => {
      hitMarker.disableDamageNumbers();
      const result = hitMarker.showDamage(50);
      expect(result).toBeNull();
    });

    it('should emit damageShow event', () => {
      const callback = vi.fn();
      hitMarker.on('damageShow', callback);
      hitMarker.showDamage(75);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ damage: 75 }));
    });

    it('should mark as critical', () => {
      const result = hitMarker.showDamage(200, { critical: true });
      expect(result.isCritical).toBe(true);
    });

    it('should limit to maxDamageNumbers', () => {
      const limited = new HitMarker({ maxDamageNumbers: 3 });
      for (let i = 0; i < 5; i++) {
        limited.showDamage(i * 10);
      }
      expect(limited.damageNumberCount).toBe(3);
    });
  });

  describe('update', () => {
    it('should update markers', () => {
      hitMarker.show('hit');
      hitMarker.update(50);
      expect(hitMarker.markerCount).toBe(1);
    });

    it('should remove expired markers', () => {
      hitMarker.show('hit'); // 150ms duration
      hitMarker.update(200);
      expect(hitMarker.markerCount).toBe(0);
    });

    it('should emit markerEnd when marker expires', () => {
      const callback = vi.fn();
      hitMarker.on('markerEnd', callback);

      hitMarker.show('hit');
      hitMarker.update(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should update damage numbers', () => {
      hitMarker.showDamage(50);
      hitMarker.update(50);
      expect(hitMarker.damageNumberCount).toBe(1);
    });

    it('should remove expired damage numbers', () => {
      hitMarker.showDamage(50); // 800ms duration
      hitMarker.update(900);
      expect(hitMarker.damageNumberCount).toBe(0);
    });

    it('should emit damageEnd when damage number expires', () => {
      const callback = vi.fn();
      hitMarker.on('damageEnd', callback);

      hitMarker.showDamage(50);
      hitMarker.update(900);

      expect(callback).toHaveBeenCalled();
    });

    it('should fade markers after fadeStart', () => {
      const marker = hitMarker.show('hit'); // fadeStart: 0.7
      hitMarker.update(120); // 80% progress, past fadeStart
      expect(marker.opacity).toBeLessThan(1);
    });
  });

  describe('render', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fillText: vi.fn(),
        globalAlpha: 1,
        strokeStyle: '',
        lineWidth: 0,
        lineCap: '',
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      };
    });

    it('should render markers', () => {
      hitMarker.show('hit');
      hitMarker.render(mockCtx, 400, 300);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should not render when disabled', () => {
      hitMarker.show('hit');
      hitMarker.disable();
      hitMarker.render(mockCtx, 400, 300);
      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });

    it('should render damage numbers', () => {
      hitMarker.showDamage(100, { x: 400, y: 300 });
      hitMarker.render(mockCtx, 400, 300);
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should add ring for kill markers', () => {
      hitMarker.show('kill');
      hitMarker.render(mockCtx, 400, 300);
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should add ring for headshot markers', () => {
      hitMarker.show('headshot');
      hitMarker.render(mockCtx, 400, 300);
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });

  describe('getMarkers', () => {
    it('should return copy of markers array', () => {
      hitMarker.show('hit');
      hitMarker.show('kill');
      const markers = hitMarker.getMarkers();
      expect(markers.length).toBe(2);
      expect(markers).not.toBe(hitMarker._activeMarkers);
    });
  });

  describe('getDamageNumbers', () => {
    it('should return copy of damage numbers array', () => {
      hitMarker.showDamage(50);
      hitMarker.showDamage(100);
      const numbers = hitMarker.getDamageNumbers();
      expect(numbers.length).toBe(2);
      expect(numbers).not.toBe(hitMarker._damageNumbers);
    });
  });

  describe('clearMarkers', () => {
    it('should clear all markers', () => {
      hitMarker.show('hit');
      hitMarker.show('kill');
      hitMarker.clearMarkers();
      expect(hitMarker.markerCount).toBe(0);
    });

    it('should emit markersCleared event', () => {
      const callback = vi.fn();
      hitMarker.on('markersCleared', callback);
      hitMarker.clearMarkers();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('clearDamageNumbers', () => {
    it('should clear all damage numbers', () => {
      hitMarker.showDamage(50);
      hitMarker.showDamage(100);
      hitMarker.clearDamageNumbers();
      expect(hitMarker.damageNumberCount).toBe(0);
    });

    it('should emit damageCleared event', () => {
      const callback = vi.fn();
      hitMarker.on('damageCleared', callback);
      hitMarker.clearDamageNumbers();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear markers and damage numbers', () => {
      hitMarker.show('hit');
      hitMarker.showDamage(100);
      hitMarker.clearAll();
      expect(hitMarker.markerCount).toBe(0);
      expect(hitMarker.damageNumberCount).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should enable hit markers', () => {
      hitMarker.disable();
      hitMarker.enable();
      expect(hitMarker.isEnabled).toBe(true);
    });

    it('should emit enabled event', () => {
      const callback = vi.fn();
      hitMarker.on('enabled', callback);
      hitMarker.disable();
      hitMarker.enable();
      expect(callback).toHaveBeenCalled();
    });

    it('should disable hit markers', () => {
      hitMarker.disable();
      expect(hitMarker.isEnabled).toBe(false);
    });

    it('should emit disabled event', () => {
      const callback = vi.fn();
      hitMarker.on('disabled', callback);
      hitMarker.disable();
      expect(callback).toHaveBeenCalled();
    });

    it('should clear all on disable', () => {
      hitMarker.show('hit');
      hitMarker.showDamage(100);
      hitMarker.disable();
      expect(hitMarker.markerCount).toBe(0);
      expect(hitMarker.damageNumberCount).toBe(0);
    });
  });

  describe('damage number settings', () => {
    it('should enable damage numbers', () => {
      hitMarker.disableDamageNumbers();
      hitMarker.enableDamageNumbers();
      expect(hitMarker.showDamageNumbers).toBe(true);
    });

    it('should disable damage numbers', () => {
      hitMarker.disableDamageNumbers();
      expect(hitMarker.showDamageNumbers).toBe(false);
    });

    it('should clear damage numbers on disable', () => {
      hitMarker.showDamage(50);
      hitMarker.disableDamageNumbers();
      expect(hitMarker.damageNumberCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      hitMarker.show('hit');
      hitMarker.showDamage(100);
      hitMarker._lastTime = 1000;

      hitMarker.reset();

      expect(hitMarker.markerCount).toBe(0);
      expect(hitMarker.damageNumberCount).toBe(0);
      expect(hitMarker._lastTime).toBe(0);
    });
  });

  describe('hasActiveMarkers', () => {
    it('should be true with markers', () => {
      hitMarker.show('hit');
      expect(hitMarker.hasActiveMarkers).toBe(true);
    });

    it('should be true with damage numbers', () => {
      hitMarker.showDamage(50);
      expect(hitMarker.hasActiveMarkers).toBe(true);
    });

    it('should be false when empty', () => {
      expect(hitMarker.hasActiveMarkers).toBe(false);
    });
  });
});

describe('DamageNumber', () => {
  let hitMarker;

  beforeEach(() => {
    resetHitMarker();
    hitMarker = new HitMarker();
  });

  it('should float upward over time', () => {
    const number = hitMarker.showDamage(50, { x: 100, y: 100 });
    hitMarker.update(100);
    expect(number.offsetY).toBeLessThan(0);
  });

  it('should fade after 50% progress', () => {
    const number = hitMarker.showDamage(50);
    hitMarker.update(500); // 62.5% of 800ms
    expect(number.opacity).toBeLessThan(1);
  });

  it('should scale up for critical hits initially', () => {
    const number = hitMarker.showDamage(100, { critical: true });
    hitMarker.update(50);
    expect(number.scale).toBeGreaterThan(1);
  });

  it('should return to normal scale after pop', () => {
    const number = hitMarker.showDamage(100, { critical: true });
    hitMarker.update(150);
    expect(number.scale).toBe(1);
  });

  it('should add exclamation for critical getText', () => {
    const number = hitMarker.showDamage(100, { critical: true });
    expect(number.getText()).toBe('100!');
  });

  it('should return plain number for non-critical getText', () => {
    const number = hitMarker.showDamage(50);
    expect(number.getText()).toBe('50');
  });
});

describe('Global HitMarker', () => {
  beforeEach(() => {
    resetHitMarker();
  });

  it('should return same instance', () => {
    const h1 = getHitMarker();
    const h2 = getHitMarker();
    expect(h1).toBe(h2);
  });

  it('should reset properly', () => {
    const h1 = getHitMarker();
    resetHitMarker();
    const h2 = getHitMarker();
    expect(h2).not.toBe(h1);
  });

  it('should clear markers on reset', () => {
    const h1 = getHitMarker();
    h1.show('hit');
    expect(h1.markerCount).toBe(1);
    resetHitMarker();
    expect(h1.markerCount).toBe(0);
  });
});
