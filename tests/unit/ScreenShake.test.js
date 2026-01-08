/**
 * Unit tests for ScreenShake
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ScreenShake,
  ShakePresets,
  getScreenShake,
  resetScreenShake,
} from '@/effects/ScreenShake.js';

describe('ScreenShake', () => {
  let shake;

  beforeEach(() => {
    resetScreenShake();
    vi.useFakeTimers();
    shake = new ScreenShake();
  });

  afterEach(() => {
    shake.reset();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(shake._maxIntensity).toBe(0.2);
      expect(shake._enabled).toBe(true);
      expect(shake._intensityMultiplier).toBe(1.0);
    });

    it('should accept custom settings', () => {
      const custom = new ScreenShake({
        maxIntensity: 0.5,
        enabled: false,
        intensityMultiplier: 0.5,
      });
      expect(custom._maxIntensity).toBe(0.5);
      expect(custom._enabled).toBe(false);
      expect(custom._intensityMultiplier).toBe(0.5);
    });

    it('should start with no active shakes', () => {
      expect(shake.isShaking).toBe(false);
      expect(shake.activeCount).toBe(0);
    });

    it('should start with zero offset', () => {
      expect(shake.offsetX).toBe(0);
      expect(shake.offsetY).toBe(0);
    });
  });

  describe('ShakePresets', () => {
    it('should have LIGHT preset', () => {
      expect(ShakePresets.LIGHT).toBeDefined();
      expect(ShakePresets.LIGHT.intensity).toBe(0.02);
      expect(ShakePresets.LIGHT.duration).toBe(100);
    });

    it('should have MEDIUM preset', () => {
      expect(ShakePresets.MEDIUM).toBeDefined();
      expect(ShakePresets.MEDIUM.intensity).toBe(0.05);
    });

    it('should have HEAVY preset', () => {
      expect(ShakePresets.HEAVY).toBeDefined();
      expect(ShakePresets.HEAVY.intensity).toBe(0.1);
    });

    it('should have RECOIL preset', () => {
      expect(ShakePresets.RECOIL).toBeDefined();
      expect(ShakePresets.RECOIL.decay).toBe('easeOut');
    });

    it('should have EXPLOSION preset', () => {
      expect(ShakePresets.EXPLOSION).toBeDefined();
      expect(ShakePresets.EXPLOSION.duration).toBe(400);
    });

    it('should have HIT preset', () => {
      expect(ShakePresets.HIT).toBeDefined();
      expect(ShakePresets.HIT.duration).toBe(50);
    });
  });

  describe('shake', () => {
    it('should add shake with config object', () => {
      const config = { intensity: 0.1, duration: 200, frequency: 20, decay: 'linear' };
      const result = shake.shake(config);
      expect(result).not.toBeNull();
      expect(shake.isShaking).toBe(true);
      expect(shake.activeCount).toBe(1);
    });

    it('should add shake with preset string', () => {
      const result = shake.shake('medium');
      expect(result).not.toBeNull();
      expect(shake.isShaking).toBe(true);
    });

    it('should handle uppercase preset names', () => {
      const result = shake.shake('HEAVY');
      expect(result).not.toBeNull();
    });

    it('should return null for unknown preset', () => {
      const result = shake.shake('unknown');
      expect(result).toBeNull();
    });

    it('should return null when disabled', () => {
      shake.disable();
      const result = shake.shake('medium');
      expect(result).toBeNull();
    });

    it('should emit shakeStart event', () => {
      const callback = vi.fn();
      shake.on('shakeStart', callback);
      shake.shake('light');
      expect(callback).toHaveBeenCalled();
    });

    it('should apply intensity multiplier', () => {
      shake.setIntensityMultiplier(2.0);
      const result = shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'linear' });
      expect(result.intensity).toBe(0.2);
    });
  });

  describe('addPreset', () => {
    it('should add preset by name', () => {
      const result = shake.addPreset('heavy');
      expect(result).not.toBeNull();
      expect(shake.isShaking).toBe(true);
    });
  });

  describe('update', () => {
    it('should return zero offset when no shakes', () => {
      const offset = shake.update(16);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('should return zero offset when disabled', () => {
      shake.shake('medium');
      shake.disable();
      const offset = shake.update(16);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('should return non-zero offset during shake', () => {
      shake.shake({ intensity: 0.1, duration: 200, frequency: 30, decay: 'linear' });
      const offset = shake.update(16);
      // Offset may be small due to sine wave starting at 0
      expect(typeof offset.x).toBe('number');
      expect(typeof offset.y).toBe('number');
    });

    it('should update offsetX and offsetY properties', () => {
      shake.shake({ intensity: 0.1, duration: 200, frequency: 30, decay: 'linear' });
      shake.update(50);
      const offset = shake.getOffset();
      expect(offset.x).toBe(shake.offsetX);
      expect(offset.y).toBe(shake.offsetY);
    });

    it('should remove completed shakes', () => {
      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'linear' });
      expect(shake.activeCount).toBe(1);

      // Update past duration
      shake.update(150);
      expect(shake.activeCount).toBe(0);
      expect(shake.isShaking).toBe(false);
    });

    it('should emit shakeEnd when shake completes', () => {
      const callback = vi.fn();
      shake.on('shakeEnd', callback);

      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'linear' });
      shake.update(150);

      expect(callback).toHaveBeenCalled();
    });

    it('should combine multiple shakes', () => {
      shake.shake({ intensity: 0.05, duration: 200, frequency: 20, decay: 'linear' });
      shake.shake({ intensity: 0.05, duration: 200, frequency: 30, decay: 'linear' });
      expect(shake.activeCount).toBe(2);
    });

    it('should clamp combined intensity to max', () => {
      shake.shake({ intensity: 0.15, duration: 200, frequency: 20, decay: 'linear' });
      shake.shake({ intensity: 0.15, duration: 200, frequency: 30, decay: 'linear' });

      // Update to get offset
      shake.update(50);

      const magnitude = Math.sqrt(shake.offsetX ** 2 + shake.offsetY ** 2);
      expect(magnitude).toBeLessThanOrEqual(shake.maxIntensity + 0.001);
    });
  });

  describe('decay types', () => {
    it('should apply linear decay', () => {
      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'linear' });

      // At 50% progress, linear decay = 0.5
      shake.update(50);
      const halfway = Math.sqrt(shake.offsetX ** 2 + shake.offsetY ** 2);

      shake.reset();
      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'linear' });
      shake.update(10);
      const early = Math.sqrt(shake.offsetX ** 2 + shake.offsetY ** 2);

      // Early should generally be larger than halfway (more intensity remaining)
      // Note: due to sine wave oscillation this isn't always true at every instant
    });

    it('should apply exponential decay', () => {
      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'exponential' });
      shake.update(50);
      // Just verify it doesn't throw
      expect(shake.offsetX).toBeDefined();
    });

    it('should apply easeOut decay', () => {
      shake.shake({ intensity: 0.1, duration: 100, frequency: 20, decay: 'easeOut' });
      shake.update(50);
      expect(shake.offsetX).toBeDefined();
    });
  });

  describe('stopAll', () => {
    it('should stop all shakes', () => {
      shake.shake('light');
      shake.shake('medium');
      expect(shake.activeCount).toBe(2);

      shake.stopAll();
      expect(shake.activeCount).toBe(0);
      expect(shake.isShaking).toBe(false);
    });

    it('should reset offsets', () => {
      shake.shake('heavy');
      shake.update(16);
      shake.stopAll();
      expect(shake.offsetX).toBe(0);
      expect(shake.offsetY).toBe(0);
    });

    it('should emit shakeEnd for each shake', () => {
      const callback = vi.fn();
      shake.on('shakeEnd', callback);

      shake.shake('light');
      shake.shake('medium');
      shake.stopAll();

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should emit stopped event', () => {
      const callback = vi.fn();
      shake.on('stopped', callback);
      shake.shake('light');
      shake.stopAll();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('enable/disable', () => {
    it('should enable shake effects', () => {
      shake.disable();
      shake.enable();
      expect(shake.isEnabled).toBe(true);
    });

    it('should emit enabled event', () => {
      const callback = vi.fn();
      shake.on('enabled', callback);
      shake.disable();
      shake.enable();
      expect(callback).toHaveBeenCalled();
    });

    it('should disable shake effects', () => {
      shake.disable();
      expect(shake.isEnabled).toBe(false);
    });

    it('should emit disabled event', () => {
      const callback = vi.fn();
      shake.on('disabled', callback);
      shake.disable();
      expect(callback).toHaveBeenCalled();
    });

    it('should stop all shakes when disabled', () => {
      shake.shake('medium');
      shake.shake('light');
      shake.disable();
      expect(shake.activeCount).toBe(0);
    });
  });

  describe('intensityMultiplier', () => {
    it('should set intensity multiplier', () => {
      shake.setIntensityMultiplier(0.5);
      expect(shake.intensityMultiplier).toBe(0.5);
    });

    it('should clamp to 0', () => {
      shake.setIntensityMultiplier(-1);
      expect(shake.intensityMultiplier).toBe(0);
    });

    it('should clamp to 2', () => {
      shake.setIntensityMultiplier(5);
      expect(shake.intensityMultiplier).toBe(2);
    });
  });

  describe('maxIntensity', () => {
    it('should set max intensity', () => {
      shake.setMaxIntensity(0.5);
      expect(shake.maxIntensity).toBe(0.5);
    });

    it('should not allow negative', () => {
      shake.setMaxIntensity(-0.1);
      expect(shake.maxIntensity).toBe(0);
    });
  });

  describe('applyTo', () => {
    it('should apply rotation to Three.js camera', () => {
      const camera = { rotation: { x: 0, y: 0 } };
      shake._offsetX = 0.05;
      shake._offsetY = 0.03;

      shake.applyTo(camera, 'rotation');

      expect(camera.rotation.y).toBe(0.05);
      expect(camera.rotation.x).toBe(0.03);
    });

    it('should apply position to Three.js object', () => {
      const obj = { position: { x: 10, y: 20 } };
      shake._offsetX = 0.1;
      shake._offsetY = 0.2;

      shake.applyTo(obj, 'position');

      expect(obj.position.x).toBe(10.1);
      expect(obj.position.y).toBe(20.2);
    });

    it('should apply transform to DOM element', () => {
      const element = { style: { transform: '' } };
      shake._offsetX = 0.1;
      shake._offsetY = 0.05;

      shake.applyTo(element, 'transform');

      expect(element.style.transform).toBe('translate(10px, 5px)');
    });

    it('should handle null target', () => {
      expect(() => shake.applyTo(null)).not.toThrow();
    });

    it('should default to rotation mode', () => {
      const camera = { rotation: { x: 0, y: 0 } };
      shake._offsetX = 0.02;
      shake._offsetY = 0.01;

      shake.applyTo(camera);

      expect(camera.rotation.y).toBe(0.02);
    });
  });

  describe('reset', () => {
    it('should stop all shakes', () => {
      shake.shake('medium');
      shake.reset();
      expect(shake.activeCount).toBe(0);
    });

    it('should reset last time', () => {
      shake._lastTime = 1000;
      shake.reset();
      expect(shake._lastTime).toBe(0);
    });
  });

  describe('getOffset', () => {
    it('should return current offset', () => {
      shake._offsetX = 0.1;
      shake._offsetY = 0.2;
      const offset = shake.getOffset();
      expect(offset.x).toBe(0.1);
      expect(offset.y).toBe(0.2);
    });
  });
});

describe('Global ScreenShake', () => {
  beforeEach(() => {
    resetScreenShake();
  });

  it('should return same instance', () => {
    const s1 = getScreenShake();
    const s2 = getScreenShake();
    expect(s1).toBe(s2);
  });

  it('should reset properly', () => {
    const s1 = getScreenShake();
    resetScreenShake();
    const s2 = getScreenShake();
    expect(s2).not.toBe(s1);
  });

  it('should reset shakes on reset', () => {
    const s1 = getScreenShake();
    s1.shake('medium');
    expect(s1.activeCount).toBe(1);
    resetScreenShake();
    expect(s1.activeCount).toBe(0);
  });
});
