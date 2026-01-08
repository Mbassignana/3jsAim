/**
 * Unit tests for math utilities
 */

import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  randomRange,
  randomInt,
  degToRad,
  radToDeg,
  distance2D,
  distance3D,
  normalizeAngle,
  smoothStep,
  smootherStep,
} from '@/utils/math';

describe('clamp', () => {
  it('should return value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, -5, 5)).toBe(0);
  });

  it('should return min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, -10, 10)).toBe(-10);
  });

  it('should return max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, -10, 10)).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(clamp(0, 0, 0)).toBe(0);
    expect(clamp(5, 5, 5)).toBe(5);
  });
});

describe('lerp', () => {
  it('should return start value when t is 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(-5, 5, 0)).toBe(-5);
  });

  it('should return end value when t is 1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(-5, 5, 1)).toBe(5);
  });

  it('should return middle value when t is 0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });

  it('should clamp t to valid range', () => {
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10, 2)).toBe(10);
  });
});

describe('randomRange', () => {
  it('should return values within range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
    }
  });

  it('should work with negative ranges', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(-10, -5);
      expect(result).toBeGreaterThanOrEqual(-10);
      expect(result).toBeLessThan(-5);
    }
  });
});

describe('randomInt', () => {
  it('should return integers within inclusive range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomInt(1, 6);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it('should return the same value when min equals max', () => {
    expect(randomInt(5, 5)).toBe(5);
  });
});

describe('degToRad', () => {
  it('should convert common angles correctly', () => {
    expect(degToRad(0)).toBe(0);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
  });

  it('should handle negative angles', () => {
    expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('radToDeg', () => {
  it('should convert common angles correctly', () => {
    expect(radToDeg(0)).toBe(0);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
    expect(radToDeg(Math.PI * 2)).toBeCloseTo(360);
  });

  it('should be inverse of degToRad', () => {
    const original = 45;
    expect(radToDeg(degToRad(original))).toBeCloseTo(original);
  });
});

describe('distance2D', () => {
  it('should calculate distance correctly', () => {
    expect(distance2D(0, 0, 3, 4)).toBe(5);
    expect(distance2D(0, 0, 0, 0)).toBe(0);
    expect(distance2D(1, 1, 4, 5)).toBe(5);
  });

  it('should be symmetric', () => {
    expect(distance2D(0, 0, 5, 5)).toBe(distance2D(5, 5, 0, 0));
  });
});

describe('distance3D', () => {
  it('should calculate distance correctly', () => {
    expect(distance3D(0, 0, 0, 0, 0, 0)).toBe(0);
    expect(distance3D(0, 0, 0, 1, 0, 0)).toBe(1);
    expect(distance3D(0, 0, 0, 3, 4, 0)).toBe(5);
  });

  it('should handle all three dimensions', () => {
    // 3-4-5 Pythagorean triple extended to 3D
    expect(distance3D(0, 0, 0, 2, 2, 1)).toBeCloseTo(3);
  });
});

describe('normalizeAngle', () => {
  it('should keep angles within -PI to PI', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI / 2)).toBe(Math.PI / 2);
    expect(normalizeAngle(-Math.PI / 2)).toBe(-Math.PI / 2);
  });

  it('should wrap angles greater than PI', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(Math.PI * 4)).toBeCloseTo(0);
  });

  it('should wrap angles less than -PI', () => {
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
  });
});

describe('smoothStep', () => {
  it('should return 0 at start and 1 at end', () => {
    expect(smoothStep(0)).toBe(0);
    expect(smoothStep(1)).toBe(1);
  });

  it('should return 0.5 at midpoint', () => {
    expect(smoothStep(0.5)).toBe(0.5);
  });

  it('should clamp input values', () => {
    expect(smoothStep(-1)).toBe(0);
    expect(smoothStep(2)).toBe(1);
  });
});

describe('smootherStep', () => {
  it('should return 0 at start and 1 at end', () => {
    expect(smootherStep(0)).toBe(0);
    expect(smootherStep(1)).toBe(1);
  });

  it('should return 0.5 at midpoint', () => {
    expect(smootherStep(0.5)).toBe(0.5);
  });

  it('should clamp input values', () => {
    expect(smootherStep(-1)).toBe(0);
    expect(smootherStep(2)).toBe(1);
  });
});
